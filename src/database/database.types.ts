export interface ThreadContextRow {
  thread_id: string;
  user_id: string;
  channel_id: string;
  guild_id: string;
  messages: string; // JSON string
  created_at: string;
  last_activity: string;
  is_active: number; // SQLite boolean as number
  message_count: number;
}

export interface CountRow {
  count: number;
}

export interface ActiveRow {
  is_active: number;
}
