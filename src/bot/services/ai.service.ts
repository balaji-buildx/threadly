import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { streamText } from 'ai';
import { createVertex, vertex } from '@ai-sdk/google-vertex';
import { ThreadContext } from '../../types/thread-context.interface.js';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private model: ReturnType<typeof vertex>;

  constructor(private configService: ConfigService) {
    this.initializeModel();
  }

  private initializeModel() {
    try {
      const projectId = this.configService.get<string>('vertexAI.projectId');
      const location = this.configService.get<string>('vertexAI.location');
      const modelName = this.configService.get<string>('vertexAI.model');

      if (!projectId || !location) {
        throw new Error('Missing required Vertex AI configuration');
      }

      const vertex = createVertex({ project: projectId, location });

      this.model = vertex(modelName || 'gemini-1.5-pro');

      this.logger.log(
        `Vertex AI model initialized: ${modelName} in ${location}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to initialize Vertex AI model: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async streamResponse(
    threadContext: ThreadContext,
    newQuestion: string,
    onChunk: (text: string) => Promise<void>,
  ): Promise<string> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Starting Vertex AI stream for thread ${threadContext.threadId} with ${threadContext.messages.length} previous messages`,
      );

      const messages = [
        ...threadContext.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        { role: 'user' as const, content: newQuestion },
      ];

      const { textStream } = streamText({
        model: this.model,
        messages,
        temperature: 0.7,
        maxOutputTokens: 400,
        tools: {
          url_context: vertex.tools.urlContext({}),
          google_search: vertex.tools.googleSearch({}),
        },
        toolChoice: 'auto',
      });

      let fullResponse = '';
      let chunkCount = 0;

      for await (const chunk of textStream) {
        fullResponse += chunk;
        chunkCount++;
        void onChunk(chunk);

        // Log progress every 10 chunks for monitoring
        if (chunkCount % 10 === 0) {
          this.logger.debug(
            `Streaming progress - Thread: ${threadContext.threadId}, Chunks: ${chunkCount}, Length: ${fullResponse.length}`,
          );
        }
      }

      const duration = Date.now() - startTime;

      this.logger.log(
        `Stream completed - Thread: ${threadContext.threadId}, Duration: ${duration}ms, Response length: ${fullResponse.length}, Chunks: ${chunkCount}`,
      );

      return fullResponse;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error(
        `Vertex AI stream failed - Thread: ${threadContext.threadId}, Duration: ${duration}ms, Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Handle specific error types
      const errorCode =
        error && typeof error === 'object' && 'code' in error
          ? (error as { code: string }).code
          : null;
      if (errorCode === 'RESOURCE_EXHAUSTED') {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      } else if (errorCode === 'PERMISSION_DENIED') {
        throw new Error(
          'Vertex AI permission denied. Check service account configuration.',
        );
      } else if (errorCode === 'INVALID_ARGUMENT') {
        throw new Error('Invalid request to Vertex AI. Check message format.');
      }

      throw new Error('Failed to generate AI response. Please try again.');
    }
  }

  formatContextForAI(
    messages: ThreadContext['messages'],
  ): Array<{ role: string; content: string }> {
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  calculateTokenUsage(messages: Array<{ content: string }>): number {
    // Rough estimation: 1 token ≈ 4 characters
    return messages.reduce(
      (total, msg) => total + Math.ceil(msg.content.length / 4),
      0,
    );
  }

  async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }

        const delay = baseDelay * Math.pow(2, attempt - 1);
        this.logger.warn(
          `Attempt ${attempt} failed, retrying in ${delay}ms: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error('Max retries exceeded');
  }
}
