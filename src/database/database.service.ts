/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sqlite3 from 'sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import {
  ThreadContext,
  ThreadMessage,
} from '../types/thread-context.interface.js';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);
  private db!: sqlite3.Database;
  private readonly databasePath: string;

  constructor(private readonly configService: ConfigService) {
    this.databasePath =
      this.configService.get<string>('database.path') || 'data/threads.db';
  }

  async onModuleInit() {
    await this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      // Ensure data directory exists
      const dir = path.dirname(this.databasePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.logger.log(`Created database directory: ${dir}`);
      }

      // Initialize SQLite database
      const Database = (sqlite3 as any).verbose().Database;
      this.db = new Database(this.databasePath, (err: Error | null) => {
        if (err) {
          this.logger.error(`Failed to open database: ${err.message}`);
          throw err;
        }
        this.logger.log(`Database connected: ${this.databasePath}`);
      });

      // Create table if it doesn't exist
      await this.createTable();
    } catch (error) {
      this.logger.error(
        `Database initialization failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  private async createTable(): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `
        CREATE TABLE IF NOT EXISTS thread_contexts (
          thread_id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          channel_id TEXT NOT NULL,
          guild_id TEXT NOT NULL,
          messages TEXT NOT NULL,
          created_at DATETIME NOT NULL,
          last_activity DATETIME NOT NULL,
          is_active BOOLEAN NOT NULL,
          message_count INTEGER NOT NULL
        )
      `;

      (this.db as any).run(sql, (err: Error | null) => {
        if (err) {
          this.logger.error(`Failed to create table: ${err.message}`);
          reject(err);
        } else {
          this.logger.log('Thread contexts table ready');
          resolve();
        }
      });
    });
  }

  async insertThreadContext(context: ThreadContext): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO thread_contexts (
          thread_id, user_id, channel_id, guild_id, messages,
          created_at, last_activity, is_active, message_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        context.threadId,
        context.userId,
        context.channelId,
        context.guildId,
        JSON.stringify(context.messages),
        context.createdAt.toISOString(),
        context.lastActivity.toISOString(),
        context.isActive ? 1 : 0,
        context.messageCount,
      ];

      (this.db as any).run(sql, params, (err: Error | null) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async getThreadContext(threadId: string): Promise<ThreadContext | null> {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM thread_contexts WHERE thread_id = ?`;

      (this.db as any).get(sql, [threadId], (err: Error | null, row: any) => {
        if (err) {
          reject(err);
        } else if (!row) {
          resolve(null);
        } else {
          try {
            const context: ThreadContext = {
              threadId: (row as any).thread_id,
              userId: (row as any).user_id,
              channelId: (row as any).channel_id,
              guildId: (row as any).guild_id,
              messages: JSON.parse((row as any).messages) as ThreadMessage[],
              createdAt: new Date((row as any).created_at),
              lastActivity: new Date((row as any).last_activity),
              isActive: Boolean((row as any).is_active),
              messageCount: (row as any).message_count,
            };
            resolve(context);
          } catch (parseError) {
            reject(
              new Error(
                `Failed to parse thread context: ${
                  parseError instanceof Error
                    ? parseError.message
                    : 'Unknown error'
                }`,
              ),
            );
          }
        }
      });
    });
  }

  async updateThreadContext(
    threadId: string,
    messages: ThreadMessage[],
    lastActivity: Date,
    messageCount: number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE thread_contexts 
        SET messages = ?, last_activity = ?, message_count = ?
        WHERE thread_id = ?
      `;

      const params = [
        JSON.stringify(messages),
        lastActivity.toISOString(),
        messageCount,
        threadId,
      ];

      (this.db as any).run(sql, params, (err: Error | null) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async isThreadActive(threadId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const sql = `SELECT is_active FROM thread_contexts WHERE thread_id = ?`;

      (this.db as any).get(sql, [threadId], (err: Error | null, row: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? Boolean((row as any).is_active) : false);
        }
      });
    });
  }

  async archiveThread(threadId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE thread_contexts SET is_active = 0 WHERE thread_id = ?`;

      (this.db as any).run(sql, [threadId], (err: Error | null) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async deleteThread(threadId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM thread_contexts WHERE thread_id = ?`;

      (this.db as any).run(sql, [threadId], function (err: Error | null) {
        if (err) {
          reject(err);
        } else {
          resolve((this as any).changes > 0);
        }
      });
    });
  }

  async getActiveThreadCount(): Promise<number> {
    return new Promise((resolve, reject) => {
      const sql = `SELECT COUNT(*) as count FROM thread_contexts WHERE is_active = 1`;

      (this.db as any).get(sql, [], (err: Error | null, row: any) => {
        if (err) {
          reject(err);
        } else {
          resolve((row as any)?.count || 0);
        }
      });
    });
  }

  async getUserThreads(userId: string): Promise<ThreadContext[]> {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM thread_contexts WHERE user_id = ?`;

      (this.db as any).all(sql, [userId], (err: Error | null, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          try {
            const contexts = rows.map((row) => ({
              threadId: (row as any).thread_id,
              userId: (row as any).user_id,
              channelId: (row as any).channel_id,
              guildId: (row as any).guild_id,
              messages: JSON.parse((row as any).messages) as ThreadMessage[],
              createdAt: new Date((row as any).created_at),
              lastActivity: new Date((row as any).last_activity),
              isActive: Boolean((row as any).is_active),
              messageCount: (row as any).message_count,
            }));
            resolve(contexts);
          } catch (parseError) {
            reject(
              new Error(
                `Failed to parse user threads: ${
                  parseError instanceof Error
                    ? parseError.message
                    : 'Unknown error'
                }`,
              ),
            );
          }
        }
      });
    });
  }

  async cleanupOldThreads(maxAgeHours: number = 24): Promise<number> {
    return new Promise((resolve, reject) => {
      const cutoffTime = new Date(
        Date.now() - maxAgeHours * 60 * 60 * 1000,
      ).toISOString();

      const sql = `DELETE FROM thread_contexts WHERE last_activity < ?`;

      (this.db as any).run(sql, [cutoffTime], function (err: Error | null) {
        if (err) {
          reject(err);
        } else {
          resolve((this as any).changes);
        }
      });
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        (this.db as any).close((err: Error | null) => {
          if (err) {
            this.logger.error(`Error closing database: ${err.message}`);
            reject(err);
          } else {
            this.logger.log('Database connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}
