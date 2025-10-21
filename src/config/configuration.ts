export default () => ({
  discord: {
    token: process.env.DISCORD_BOT_TOKEN,
    devGuildId: process.env.DEV_GUILD_ID,
  },
  vertexAI: {
    projectId: process.env.GCP_PROJECT_ID,
    location: process.env.GCP_LOCATION || 'us-central1',
    model: process.env.VERTEX_AI_MODEL || 'gemini-1.5-pro',
    credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  },
  database: {
    path: process.env.DATABASE_PATH || 'data/threads.db',
  },
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
  },
});
