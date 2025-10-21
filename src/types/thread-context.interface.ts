export interface ThreadMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ThreadContext {
  threadId: string;
  userId: string;
  channelId: string;
  guildId: string;
  messages: ThreadMessage[];
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
  messageCount: number;
}
