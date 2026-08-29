import IORedis from 'ioredis';
import { env } from '../config/env';

/**
 * Primary Redis connection used for:
 * - Rate limiting (Lua script EVAL)
 * - General key-value operations
 *
 * NOTE: BullMQ requires its own separate connections (see createBullMQConnection).
 * A single ioredis connection cannot be shared between BullMQ and application code.
 */
const createConnection = (name: string) => {
  const connection = new IORedis(env.REDIS_URL, {
    // BullMQ requirement: must be null (disables automatic retry limit)
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
    reconnectOnError(err) {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
      return targetErrors.some((e) => err.message.includes(e));
    },
  });

  connection.on('connect', () => console.log(`✅ Redis [${name}] connected`));
  connection.on('ready', () => console.log(`✅ Redis [${name}] ready`));
  connection.on('error', (err) =>
    console.error(`❌ Redis [${name}] error:`, err.message)
  );
  connection.on('close', () =>
    console.warn(`⚠️  Redis [${name}] connection closed`)
  );
  connection.on('reconnecting', () =>
    console.log(`🔄 Redis [${name}] reconnecting...`)
  );

  return connection;
};

/** Main app Redis connection (rate limiting, general queries) */
export const redis = createConnection('main');

/**
 * Factory — creates a fresh Redis connection for BullMQ.
 * BullMQ Queue, Worker, and QueueEvents each need their own connection.
 */
export const createBullMQConnection = () => createConnection('bullmq');
