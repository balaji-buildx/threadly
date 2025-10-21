import { Injectable, Logger } from '@nestjs/common';
import { SlashCommand, Context, Options, StringOption } from 'necord';
import type { SlashCommandContext } from 'necord';
import { ThreadService } from './services/thread.service.js';

class CloseThreadDto {
  @StringOption({
    name: 'reason',
    description: 'Reason for closing the thread',
    required: false,
  })
  reason?: string;
}

@Injectable()
export class BotCommands {
  private readonly logger = new Logger(BotCommands.name);

  constructor(private readonly threadService: ThreadService) {}

  @SlashCommand({
    name: 'close-thread',
    description: 'Closes the current thread and archives the conversation',
  })
  async closeThread(
    @Context() [interaction]: SlashCommandContext,
    @Options() { reason }: CloseThreadDto,
  ) {
    try {
      const channel = interaction.channel;

      if (!channel?.isThread()) {
        await interaction.reply({
          content: '❌ This command can only be used in threads.',
          ephemeral: true,
        });
        return;
      }

      // Archive the thread context
      await this.threadService.archiveThread(channel.id);

      // Archive the Discord thread
      await interaction.reply({
        content: `✅ Thread closed${reason ? ` (Reason: ${reason})` : ''}.`,
        ephemeral: true,
      });

      await channel.setArchived(
        true,
        reason || 'Thread closed by user command',
      );

      this.logger.log(
        `Thread ${channel.id} closed by user ${interaction.user.id}${reason ? ` with reason: ${reason}` : ''}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to close thread: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      await interaction.reply({
        content: '❌ Failed to close thread. Please try again.',
        ephemeral: true,
      });
    }
  }

  @SlashCommand({
    name: 'new-thread',
    description: 'Force create a new thread for a fresh conversation',
  })
  async newThread(@Context() [interaction]: SlashCommandContext) {
    try {
      const channel = interaction.channel;

      if (channel?.isThread()) {
        await interaction.reply({
          content:
            '❌ You are already in a thread. Use this command in the main channel to create a new thread.',
          ephemeral: true,
        });
        return;
      }

      await interaction.reply({
        content:
          "💡 To start a new conversation, simply send a message in this channel and I'll create a new thread for you!",
        ephemeral: true,
      });
    } catch (error) {
      this.logger.error(
        `Failed to handle new-thread command: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      await interaction.reply({
        content: '❌ Failed to process command. Please try again.',
        ephemeral: true,
      });
    }
  }

  @SlashCommand({
    name: 'context-size',
    description: 'Show the current conversation context size',
  })
  async contextSize(@Context() [interaction]: SlashCommandContext) {
    try {
      const channel = interaction.channel;

      if (!channel?.isThread()) {
        await interaction.reply({
          content: '❌ This command can only be used in threads.',
          ephemeral: true,
        });
        return;
      }

      const context = await this.threadService.getThreadContext(channel.id);

      if (!context) {
        await interaction.reply({
          content: '⚠️ No context found for this thread.',
          ephemeral: true,
        });
        return;
      }

      const totalCharacters = context.messages.reduce(
        (sum, msg) => sum + msg.content.length,
        0,
      );
      const estimatedTokens = Math.ceil(totalCharacters / 4);

      await interaction.reply({
        content: [
          '📊 **Thread Context Information**',
          `• Messages: ${context.messageCount}`,
          `• Total characters: ${totalCharacters.toLocaleString()}`,
          `• Estimated tokens: ${estimatedTokens.toLocaleString()}`,
          `• Created: <t:${Math.floor(context.createdAt.getTime() / 1000)}:R>`,
          `• Last activity: <t:${Math.floor(context.lastActivity.getTime() / 1000)}:R>`,
          `• Status: ${context.isActive ? '🟢 Active' : '🔴 Inactive'}`,
        ].join('\n'),
        ephemeral: true,
      });

      this.logger.log(
        `Context size requested for thread ${channel.id} by user ${interaction.user.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to get context size: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      await interaction.reply({
        content: '❌ Failed to retrieve context information. Please try again.',
        ephemeral: true,
      });
    }
  }

  @SlashCommand({
    name: 'bot-stats',
    description: 'Show bot statistics and active threads',
  })
  async botStats(@Context() [interaction]: SlashCommandContext) {
    try {
      const activeThreads = await this.threadService.getActiveThreadCount();
      const userThreads = await this.threadService.getUserThreads(
        interaction.user.id,
      );

      await interaction.reply({
        content: [
          '🤖 **Bot Statistics**',
          `• Active threads: ${activeThreads}`,
          `• Your threads: ${userThreads.length}`,
          `• Your active threads: ${userThreads.filter((t) => t.isActive).length}`,
        ].join('\n'),
        ephemeral: true,
      });

      this.logger.log(`Bot stats requested by user ${interaction.user.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to get bot stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      await interaction.reply({
        content: '❌ Failed to retrieve bot statistics. Please try again.',
        ephemeral: true,
      });
    }
  }

  @SlashCommand({
    name: 'cleanup-threads',
    description: 'Clean up old inactive threads (Admin only)',
  })
  async cleanupThreads(@Context() [interaction]: SlashCommandContext) {
    try {
      // Basic permission check - you might want to implement proper role checking
      if (!interaction.memberPermissions?.has('Administrator')) {
        await interaction.reply({
          content: '❌ You need Administrator permissions to use this command.',
          ephemeral: true,
        });
        return;
      }

      const cleanedCount = await this.threadService.cleanupOldThreads(24); // Clean threads older than 24 hours

      await interaction.reply({
        content: `✅ Cleaned up ${cleanedCount} old thread contexts.`,
        ephemeral: true,
      });

      this.logger.log(
        `Thread cleanup performed by ${interaction.user.id}, cleaned ${cleanedCount} threads`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to cleanup threads: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      await interaction.reply({
        content: '❌ Failed to cleanup threads. Please try again.',
        ephemeral: true,
      });
    }
  }
}
