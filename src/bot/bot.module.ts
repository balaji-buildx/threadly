import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NecordModule } from 'necord';
import { IntentsBitField } from 'discord.js';
import { BotGateway } from './bot.gateway.js';
import { BotCommands } from './bot.commands.js';
import { ThreadService } from './services/thread.service.js';
import { AIService } from './services/ai.service.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  imports: [
    DatabaseModule,
    NecordModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const token = config.get<string>('discord.token');
        const devGuildId = config.get<string>('discord.devGuildId') || '';
        if (!token) {
          throw new Error('Discord bot token is required');
        }
        return {
          token,
          intents: [
            IntentsBitField.Flags.Guilds,
            IntentsBitField.Flags.GuildMessages,
            IntentsBitField.Flags.DirectMessages,
            IntentsBitField.Flags.GuildWebhooks,
            IntentsBitField.Flags.MessageContent,
            IntentsBitField.Flags.GuildMessageReactions,
          ],
          development: devGuildId ? [devGuildId] : [],
          skipRegistration: false,
        };
      },
    }),
  ],
  providers: [BotGateway, BotCommands, ThreadService, AIService],
})
export class BotModule {}
