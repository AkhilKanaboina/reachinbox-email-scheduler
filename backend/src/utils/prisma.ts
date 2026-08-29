import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

/**
 * Prisma singleton pattern — prevents connection pool exhaustion in
 * development (tsx watch re-evaluates modules on each file change).
 *
 * In production there is only one PrismaClient instance per process.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
