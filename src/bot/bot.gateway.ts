import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { On, Once, Context } from 'necord';
import type { ContextOf } from 'necord';
import { Message } from 'discord.js';
import { ThreadService } from './services/thread.service.js';
import { AIService } from './services/ai.service.js';

@Injectable()
export class BotGateway {
  private readonly logger = new Logger(BotGateway.name);

  constructor(
    private readonly threadService: ThreadService,
    private readonly aiService: AIService,
    private readonly configService: ConfigService,
  ) {}

  @Once('clientReady')
  onReady(@Context() [client]: ContextOf<'clientReady'>) {
    this.logger.log(`Bot logged in as ${client.user?.tag}`);
    this.logger.log(`Bot ready - will respond to mentions in any channel`);
  }

  @On('messageCreate')
  async onMessage(@Context() [message]: ContextOf<'messageCreate'>) {
    const client = message.client;
    try {
      this.logger.log(
        `Message received: "${message.content}" from ${message.author.username} in channel ${message.channelId} (isThread: ${message.channel.isThread()})`,
      );

      // Validate: Is it from a bot?
      if (message.author.bot) {
        this.logger.log(
          `Message ignored - from bot: ${message.author.username}`,
        );
        return;
      }

      // Check if message is in a thread
      if (message.channel.isThread()) {
        await this.handleThreadMessage(message);
        return;
      }

      // For non-thread messages, check if bot is mentioned
      const isBotMentioned = message.mentions.users.has(client.user?.id || '');
      const containsBotId = message.content.includes(client.user?.id || '');

      if (!isBotMentioned || !containsBotId) {
        this.logger.log(
          `Message ignored - bot not properly mentioned. Direct mention: ${isBotMentioned}, Contains ID: ${containsBotId}`,
        );
        return;
      }

      this.logger.log(
        `Processing new query from ${message.author.username} (${message.author.id}) - bot mentioned`,
      );

      await this.handleNewQuery(message);
    } catch (error) {
      this.logger.error(
        `Error handling message from ${message.author.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      try {
        await message.reply(
          '❌ An error occurred while processing your message. Please try again.',
        );
      } catch (replyError) {
        this.logger.error(
          `Failed to send error message: ${replyError instanceof Error ? replyError.message : 'Unknown error'}`,
        );
      }
    }
  }

  private async handleNewQuery(message: Message) {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Handling new query from ${message.author.id}: "${message.content.substring(0, 100)}..."`,
      );

      // 1. Create thread
      const thread = await this.threadService.createThread(
        message,
        message.content,
      );

      // 2. Send initial placeholder message
      const botMessage = await thread.send('🤔 Thinking...');

      // 3. Stream AI response with real-time updates
      let fullResponse = '';
      const initialContext = await this.threadService.getThreadContext(
        thread.id,
      );
      if (!initialContext) {
        throw new Error('Failed to retrieve created thread context');
      }

      const response = await this.aiService.streamResponse(
        initialContext,
        message.content,
        async (chunk: string) => {
          fullResponse += chunk;

          // Update Discord message periodically (not every chunk)
          try {
            const truncatedResponse =
              fullResponse.length > 1900
                ? fullResponse.substring(0, 1900) + '... ⏳'
                : fullResponse + ' ⏳';

            await botMessage.edit(truncatedResponse);
          } catch (editError) {
            this.logger.warn(
              `Failed to update streaming message: ${editError instanceof Error ? editError.message : 'Unknown error'}`,
            );
          }
        },
      );

      // 4. Final update with complete response
      const finalResponse =
        response.length > 2000 ? response.substring(0, 1997) + '...' : response;

      await botMessage.edit(finalResponse);

      // 5. Update context
      await this.threadService.updateThreadContext(
        thread.id,
        message.content,
        response,
      );

      const duration = Date.now() - startTime;
      this.logger.log(
        `New query handled successfully - Thread: ${thread.id}, Duration: ${duration}ms, Response length: ${response.length}`,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Failed to handle new query from ${message.author.id} - Duration: ${duration}ms, Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      try {
        await message.reply(
          '❌ Failed to create thread and process your query. Please try again.',
        );
      } catch (replyError) {
        this.logger.error(
          `Failed to send error reply: ${replyError instanceof Error ? replyError.message : 'Unknown error'}`,
        );
      }
    }
  }

  private async handleThreadMessage(message: Message) {
    const threadId = message.channelId;
    const startTime = Date.now();

    try {
      this.logger.log(
        `Handling thread message from ${message.author.id} in thread ${threadId}`,
      );

      // 1. Check if thread context exists
      if (!(await this.threadService.isThreadActive(threadId))) {
        this.logger.warn(`Thread context not found for ${threadId}`);
        await message.reply(
          '⚠️ Thread context not found. Please start a new query by mentioning the bot.',
        );
        return;
      }

      // 2. Get existing context
      const context = await this.threadService.getThreadContext(threadId);
      if (!context) {
        this.logger.warn(`Failed to retrieve thread context for ${threadId}`);
        await message.reply(
          '⚠️ Failed to retrieve thread context. Please start a new query by mentioning the bot.',
        );
        return;
      }

      // 3. Send thinking message
      const botMessage = await message.reply('🤔 Processing...');

      // 4. Stream response with real-time updates
      let fullResponse = '';
      let lastUpdate = Date.now();
      const UPDATE_INTERVAL = 50;

      const response = await this.aiService.streamResponse(
        context,
        message.content,
        async (chunk: string) => {
          fullResponse += chunk;

          const now = Date.now();
          if (now - lastUpdate > UPDATE_INTERVAL) {
            try {
              const truncatedResponse =
                fullResponse.length > 1900
                  ? fullResponse.substring(0, 1900) + '... ⏳'
                  : fullResponse + ' ⏳';

              await botMessage.edit(truncatedResponse);
              lastUpdate = now;
            } catch (editError) {
              this.logger.warn(
                `Failed to update streaming message: ${editError instanceof Error ? editError.message : 'Unknown error'}`,
              );
            }
          }
        },
      );

      // 5. Final update
      const finalResponse =
        response.length > 2000 ? response.substring(0, 1997) + '...' : response;

      await botMessage.edit(finalResponse);

      // 6. Update context
      await this.threadService.updateThreadContext(
        threadId,
        message.content,
        response,
      );

      const duration = Date.now() - startTime;
      this.logger.log(
        `Thread message handled successfully - Thread: ${threadId}, Duration: ${duration}ms, Message count: ${context.messageCount + 2}`,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Failed to handle thread message from ${message.author.id} in ${threadId} - Duration: ${duration}ms, Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      try {
        await message.reply(
          '❌ Failed to process your message. Please try again.',
        );
      } catch (replyError) {
        this.logger.error(
          `Failed to send error reply: ${replyError instanceof Error ? replyError.message : 'Unknown error'}`,
        );
      }
    }
  }
}
