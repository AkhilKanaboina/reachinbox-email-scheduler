import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from the backend root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.string().default('4000'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // JWT — must match NEXTAUTH_SECRET / JWT_SECRET in the frontend
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters for security'),

  // Ethereal SMTP (optional — auto-generated if omitted)
  ETHEREAL_USER: z.string().optional(),
  ETHEREAL_PASS: z.string().optional(),
  ETHEREAL_HOST: z.string().default('smtp.ethereal.email'),
  ETHEREAL_PORT: z.string().default('587'),

  // CORS
  FRONTEND_URL: z.string().default('http://localhost:3000'),

  // BullMQ worker concurrency
  WORKER_CONCURRENCY: z.string().default('5'),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables — please check your .env file:');
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
