import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { campaignRoutes } from './routes/campaign.routes';
import { emailRoutes } from './routes/email.routes';
import { authRoutes } from './routes/auth.routes';
import { startEmailWorker } from './workers/email.worker';
import { redis } from './utils/redis';
import { getMailer } from './utils/mailer';
import { prisma } from './utils/prisma';

const app = express();

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
// 10 MB limit supports large CSV payloads (~1000 leads ≈ ~100 KB as JSON)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  let dbStatus = 'unknown';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'healthy';
  } catch {
    dbStatus = 'unhealthy';
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      redis: redis.status === 'ready' ? 'healthy' : redis.status,
      database: dbStatus,
    },
    version: '1.0.0',
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/emails', emailRoutes);

// ─── 404 Fallback ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} does not exist`,
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
// Must have 4 parameters to be recognized as error middleware by Express
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err.stack ?? err.message);

  const status = (err as { status?: number }).status ?? 500;

  res.status(status).json({
    error: status === 500 ? 'Internal Server Error' : err.message,
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────
async function bootstrap() {
  console.log('');
  console.log('🏗️  Starting ReachInbox Email Scheduler Backend...');
  console.log(`   Environment : ${env.NODE_ENV}`);
  console.log(`   Port        : ${env.PORT}`);
  console.log('');

  try {
    // 1. Test database connection
    await prisma.$connect();
    console.log('✅ MySQL database connected');

    // 2. Initialize mailer (creates Ethereal account if needed)
    await getMailer();

    // 3. Start BullMQ email worker
    startEmailWorker();

    // 4. Start HTTP server
    const port = parseInt(env.PORT, 10);
    app.listen(port, () => {
      console.log('');
      console.log(`🚀 Backend running at http://localhost:${port}`);
      console.log(`   Health check : http://localhost:${port}/api/health`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start backend:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const shutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal} — shutting down gracefully...`);
  await prisma.$disconnect();
  redis.disconnect();
  console.log('✅ Shutdown complete');
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});

bootstrap();
