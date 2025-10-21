# AI Discord Bot

A sophisticated Discord bot that creates threaded conversations with AI-powered responses using Google Vertex AI. The bot maintains persistent conversation context using SQLite storage and responds to mentions across any channel.

## 🚀 Features

- **Mention-Based Activation**: Bot responds when properly mentioned in any channel
- **Persistent Thread Context**: SQLite database stores conversation history across bot restarts
- **Real-Time Streaming**: AI responses stream in real-time with live message updates
- **Multi-User Support**: Concurrent thread handling for multiple users
- **Slash Commands**: Built-in commands for thread and bot management
- **Comprehensive Logging**: Detailed logging for monitoring and debugging
- **Error Handling**: Robust error handling with user-friendly messages

## 🏗️ Architecture

### Core Components

```
src/
├── bot/                    # Discord bot implementation
│   ├── bot.gateway.ts     # Main message handler and event listener
│   ├── bot.commands.ts    # Slash commands implementation
│   ├── bot.module.ts      # NestJS module configuration
│   └── services/
│       ├── ai.service.ts      # Google Vertex AI integration
│       └── thread.service.ts  # Thread context management
├── database/              # SQLite database layer
│   ├── database.service.ts    # Database operations and queries
│   └── database.module.ts     # Database module configuration
├── config/                # Application configuration
│   └── configuration.ts       # Environment variable mapping
└── types/                 # TypeScript interfaces
    └── thread-context.interface.ts  # Thread context data structures
```

### Key Services

#### BotGateway

- Handles Discord message events
- Implements mention detection logic
- Manages thread creation and message routing
- Provides error handling and logging

#### ThreadService

- Manages thread context lifecycle
- Interfaces with database for persistence
- Handles context updates and retrieval
- Provides thread management utilities

#### AIService

- Integrates with Google Vertex AI
- Implements streaming response functionality
- Manages conversation context for AI model
- Handles AI response processing

#### DatabaseService

- SQLite database operations
- Thread context CRUD operations
- Database initialization and migrations
- Connection management and error handling

## 🗄️ Database Schema

The bot uses SQLite with the following schema:

```sql
CREATE TABLE thread_contexts (
  thread_id TEXT PRIMARY KEY,        -- Discord thread ID
  user_id TEXT NOT NULL,            -- Discord user ID who started thread
  channel_id TEXT NOT NULL,         -- Discord channel ID where thread was created
  guild_id TEXT NOT NULL,           -- Discord guild (server) ID
  messages TEXT NOT NULL,           -- JSON array of conversation messages
  created_at DATETIME NOT NULL,     -- Thread creation timestamp
  last_activity DATETIME NOT NULL,  -- Last message timestamp
  is_active BOOLEAN NOT NULL,       -- Whether thread is active
  message_count INTEGER NOT NULL    -- Total number of messages in thread
);
```

### Data Flow

1. **Message Reception**: BotGateway receives Discord message events
2. **Mention Detection**: Checks for proper bot mentions (both @mention and ID in content)
3. **Thread Management**: ThreadService creates or retrieves thread context
4. **Database Operations**: DatabaseService handles persistent storage
5. **AI Processing**: AIService generates responses using Vertex AI
6. **Response Streaming**: Real-time message updates during AI generation
7. **Context Updates**: Thread context updated with new messages

## 🎯 Usage Guide

### Starting a Conversation

To interact with the bot, you must mention it properly in any channel:

```
@BotName Hello, can you help me with something?
```

**Important**: The bot requires both:

- Direct mention (`@BotName`)
- Bot's user ID in message content

This dual-check prevents accidental activations while ensuring intentional interactions.

### Thread Conversations

Once a thread is created:

1. All replies in the thread are automatically processed
2. Conversation context is maintained throughout the thread
3. Multiple users can participate in the same thread
4. Context persists across bot restarts

### Available Commands

| Command            | Description                      | Permissions         |
| ------------------ | -------------------------------- | ------------------- |
| `/close-thread`    | Close and archive current thread | Thread participants |
| `/context-size`    | View conversation context info   | Anyone              |
| `/bot-stats`       | Display bot statistics           | Anyone              |
| `/cleanup-threads` | Clean up old inactive threads    | Admin only          |

## ⚙️ Configuration

### Environment Variables

| Variable                         | Description                      | Required | Default           |
| -------------------------------- | -------------------------------- | -------- | ----------------- |
| `DISCORD_BOT_TOKEN`              | Discord bot token                | ✅       | -                 |
| `DEV_GUILD_ID`                   | Development server ID            | ❌       | -                 |
| `GCP_PROJECT_ID`                 | Google Cloud project ID          | ✅       | -                 |
| `GCP_LOCATION`                   | Vertex AI region                 | ❌       | `us-central1`     |
| `VERTEX_AI_MODEL`                | AI model to use                  | ❌       | `gemini-1.5-pro`  |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to GCP service account JSON | ✅       | -                 |
| `DATABASE_PATH`                  | SQLite database file path        | ❌       | `data/threads.db` |
| `NODE_ENV`                       | Environment mode                 | ❌       | `development`     |
| `PORT`                           | HTTP server port                 | ❌       | `3000`            |

### Discord Permissions

The bot requires the following Discord permissions:

- **Send Messages**: Reply to users
- **Create Public Threads**: Start new conversation threads
- **Send Messages in Threads**: Participate in thread conversations
- **Read Message History**: Access conversation context
- **Use Slash Commands**: Execute bot commands

### Google Cloud Setup

1. Create a Google Cloud project
2. Enable the Vertex AI API
3. Create a service account with "Vertex AI User" role
4. Download the service account JSON key
5. Set `GOOGLE_APPLICATION_CREDENTIALS` to the key file path

## 🚀 Installation & Deployment

### Prerequisites

- Node.js 18+
- npm or yarn
- Google Cloud account with Vertex AI access
- Discord application and bot token

### Local Development

1. **Clone and install**:

   ```bash
   git clone <repository-url>
   cd ai-discord-bot
   npm install
   ```

2. **Configure environment**:

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run development server**:
   ```bash
   npm run start:dev
   ```

### Production Deployment

1. **Build the application**:

   ```bash
   npm run build
   ```

2. **Start production server**:
   ```bash
   npm run start:prod
   ```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
```

## 🔧 Development

### Project Structure

- **NestJS Framework**: Modular architecture with dependency injection
- **TypeScript**: Full type safety and modern JavaScript features
- **SQLite**: Lightweight, serverless database for persistence
- **Discord.js**: Comprehensive Discord API integration
- **Necord**: NestJS Discord bot framework

### Code Quality

- **ESLint**: Code linting and style enforcement
- **Prettier**: Automatic code formatting
- **TypeScript**: Compile-time type checking
- **Jest**: Unit and integration testing

### Available Scripts

```bash
npm run build          # Build for production
npm run start          # Start production server
npm run start:dev      # Start development server with watch mode
npm run start:debug    # Start with debugging enabled
npm run lint           # Run ESLint
npm run format         # Format code with Prettier
npm run test           # Run tests
npm run test:watch     # Run tests in watch mode
npm run test:cov       # Run tests with coverage
```

## 🐛 Troubleshooting

### Common Issues

**Bot doesn't respond to mentions**:

- Verify both @mention and user ID are in the message
- Check bot permissions in the channel
- Review bot logs for error messages

**Database errors**:

- Ensure `data/` directory is writable
- Check SQLite file permissions
- Verify disk space availability

**AI response failures**:

- Validate Google Cloud credentials
- Check Vertex AI API quota and limits
- Verify project ID and region settings

**Thread context lost**:

- Check database connectivity
- Review thread cleanup settings
- Verify thread ID consistency

### Logging

The bot provides comprehensive logging at multiple levels:

- **Error**: Critical failures and exceptions
- **Warn**: Non-critical issues and warnings
- **Log**: General operational information
- **Debug**: Detailed debugging information

Logs include contextual information like user IDs, thread IDs, and performance metrics.

## 📊 Monitoring

### Performance Metrics

The bot tracks various performance metrics:

- Response times for AI generation
- Database query performance
- Active thread counts
- Message processing rates
- Error rates and types

### Health Checks

- Database connectivity
- Discord API status
- Vertex AI availability
- Memory and CPU usage

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Ensure code quality (lint, format, test)
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:

- Check the troubleshooting section
- Review bot logs for error details
- Create an issue with detailed information
- Include relevant configuration (without secrets)

---

Built with ❤️ using NestJS, Necord, Discord.js, and Google Vertex AI
