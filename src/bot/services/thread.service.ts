import { Injectable, Logger } from '@nestjs/common';
import { Message } from 'discord.js';
import {
  ThreadContext,
  ThreadMessage,
} from '../../types/thread-context.interface.js';
import { DatabaseService } from '../../database/database.service.js';

@Injectable()
export class ThreadService {
  private readonly logger = new Logger(ThreadService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async createThread(message: Message, question: string) {
    try {
      this.logger.log(
        `Creating new thread for user ${message.author.id} in channel ${message.channelId}`,
      );

      const thread = await message.startThread({
        name: `Query: ${question.substring(0, 50)}${question.length > 50 ? '...' : ''}`,
        autoArchiveDuration: 60,
        reason: 'User query thread',
      });

      const context: ThreadContext = {
        threadId: thread.id,
        userId: message.author.id,
        channelId: message.channelId,
        guildId: message.guildId || '',
        messages: [],
        createdAt: new Date(),
        lastActivity: new Date(),
        isActive: true,
        messageCount: 0,
      };

      await this.databaseService.insertThreadContext(context);

      this.logger.log(`Thread created successfully with ID: ${thread.id}`);
      return thread;
    } catch (error) {
      this.logger.error(
        `Failed to create thread: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async getThreadContext(threadId: string): Promise<ThreadContext | null> {
    try {
      return await this.databaseService.getThreadContext(threadId);
    } catch (error) {
      this.logger.error(
        `Failed to get thread context ${threadId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  async isThreadActive(threadId: string): Promise<boolean> {
    try {
      return await this.databaseService.isThreadActive(threadId);
    } catch (error) {
      this.logger.error(
        `Failed to check thread active status ${threadId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return false;
    }
  }

  async updateThreadContext(
    threadId: string,
    userMessage: string,
    aiResponse: string,
  ): Promise<void> {
    try {
      const context = await this.databaseService.getThreadContext(threadId);
      if (context) {
        const userMsg: ThreadMessage = {
          role: 'user',
          content: userMessage,
          timestamp: new Date(),
        };

        const aiMsg: ThreadMessage = {
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date(),
        };

        const updatedMessages = [...context.messages, userMsg, aiMsg];
        const lastActivity = new Date();
        const messageCount = context.messageCount + 2;

        await this.databaseService.updateThreadContext(
          threadId,
          updatedMessages,
          lastActivity,
          messageCount,
        );

        this.logger.debug(
          `Updated thread context ${threadId}. Message count: ${messageCount}`,
        );
      } else {
        this.logger.warn(
          `Attempted to update non-existent thread context: ${threadId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to update thread context ${threadId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async archiveThread(threadId: string): Promise<void> {
    try {
      await this.databaseService.archiveThread(threadId);
      this.logger.log(`Thread ${threadId} archived`);
    } catch (error) {
      this.logger.error(
        `Failed to archive thread ${threadId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async deleteThread(threadId: string): Promise<void> {
    try {
      const deleted = await this.databaseService.deleteThread(threadId);
      if (deleted) {
        this.logger.log(`Thread context ${threadId} deleted`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to delete thread ${threadId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getActiveThreadCount(): Promise<number> {
    try {
      return await this.databaseService.getActiveThreadCount();
    } catch (error) {
      this.logger.error(
        `Failed to get active thread count: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return 0;
    }
  }

  async getUserThreads(userId: string): Promise<ThreadContext[]> {
    try {
      return await this.databaseService.getUserThreads(userId);
    } catch (error) {
      this.logger.error(
        `Failed to get user threads for ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return [];
    }
  }

  async cleanupOldThreads(maxAgeHours: number = 24): Promise<number> {
    try {
      const cleanedCount =
        await this.databaseService.cleanupOldThreads(maxAgeHours);
      if (cleanedCount > 0) {
        this.logger.log(`Cleaned up ${cleanedCount} old thread contexts`);
      }
      return cleanedCount;
    } catch (error) {
      this.logger.error(
        `Failed to cleanup old threads: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return 0;
    }
  }
}
