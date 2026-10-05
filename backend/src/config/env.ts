import 'dotenv/config';

export const env = {
  GROQ_API_KEY: process.env.GROQ_API_KEY as string,
  DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY as string,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/live-interview-bot',
  PORT: process.env.PORT || 5000,
  JWT_SECRET: process.env.JWT_SECRET || 'intervue-secure-jwt-secret-key-prod-2025',
  GROQ_MODEL: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
};

// Validate required keys
const requiredKeys = ['GROQ_API_KEY'];
for (const key of requiredKeys) {
  if (!env[key as keyof typeof env]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

