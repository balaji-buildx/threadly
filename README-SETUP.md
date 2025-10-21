# Discord AI Bot Setup Guide

This Discord bot creates threads when mentioned, maintains persistent conversation context using SQLite storage, and provides AI-powered responses using Google Vertex AI.

## Prerequisites

1. **Discord Bot Setup**
   - Create a Discord application at https://discord.com/developers/applications
   - Create a bot and copy the bot token
   - Enable "Message Content Intent" in the bot settings
   - Invite the bot to your server with permissions:
     - Send Messages
     - Create Public Threads
     - Send Messages in Threads
     - Read Message History

2. **Google Cloud Setup**
   - Create a Google Cloud project
   - Enable the Vertex AI API
   - Create a service account with Vertex AI User role
   - Download the service account JSON key file

## Environment Configuration

Create a `.env` file in the project root:

```env
# Discord Configuration
DISCORD_BOT_TOKEN=your_discord_bot_token_here
DEV_GUILD_ID=your_dev_guild_id_here

# Google Cloud / Vertex AI Configuration
GCP_PROJECT_ID=your_gcp_project_id
GCP_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json

# Vertex AI Model Configuration
VERTEX_AI_MODEL=gemini-1.5-pro

# Database Configuration
DATABASE_PATH=data/threads.db

# Application Configuration
NODE_ENV=development
PORT=3000
```

## Installation & Running

1. Install dependencies:

   ```bash
   npm install
   ```

2. Build the project:

   ```bash
   npm run build
   ```

3. Start the bot:

   ```bash
   npm run start:prod
   ```

   For development:

   ```bash
   npm run start:dev
   ```

## Usage

1. **Start a conversation**: Mention the bot (@BotName) in any channel where the bot has access
2. **Continue conversation**: Reply in the created thread to maintain context
3. **Use slash commands**:
   - `/close-thread` - Close and archive the current thread
   - `/context-size` - View conversation context information
   - `/bot-stats` - View bot statistics
   - `/cleanup-threads` - Clean up old threads (Admin only)

## How Bot Mentions Work

The bot will only create threads when **both** conditions are met:

- The bot is directly mentioned with `@BotName`
- The bot's user ID appears in the message content

This dual-check ensures intentional bot interaction while preventing accidental triggers.

## Features

- ✅ Mention-based thread creation (works in any channel)
- ✅ Persistent conversation context with SQLite storage
- ✅ Real-time streaming AI responses
- ✅ Multi-user concurrent thread support
- ✅ Comprehensive error handling and logging
- ✅ Slash commands for thread management
- ✅ Performance monitoring
- ✅ Database persistence across bot restarts
- ✅ Load-on-demand context retrieval

## Troubleshooting

- Ensure the bot has proper permissions in your Discord server
- Verify the Google Cloud service account has Vertex AI access
- Make sure to mention the bot properly (both @mention and ID in content)
- Check that the `data/` directory is writable for SQLite database
- Review logs for detailed error information

## Database

The bot uses SQLite for persistent storage of thread contexts. The database file is created automatically at `data/threads.db` (or the path specified in `DATABASE_PATH` environment variable). Thread contexts are loaded on-demand and persist across bot restarts.
