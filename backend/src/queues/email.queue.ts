import { Queue } from 'bullmq';
import { createBullMQConnection } from '../utils/redis';
import { EmailJobData } from '../types';

export const EMAIL_QUEUE_NAME = 'reachinbox-email-queue';

let emailQueueInstance: Queue<EmailJobData> | null = null;

/**
 * Returns a singleton BullMQ Queue instance.
 *
 * Singleton pattern is critical: creating multiple Queue instances to the
 * same queue name causes duplicate event emissions and connection waste.
 */
export function getEmailQueue(): Queue<EmailJobData> {
  if (emailQueueInstance) return emailQueueInstance;

  emailQueueInstance = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
    connection: createBullMQConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5_000, // 5s → 25s → 125s
      },
      // Keep completed jobs for 7 days (for observability), max 5000 entries
      removeOnComplete: { count: 5_000, age: 7 * 24 * 60 * 60 },
      // Never auto-remove failed jobs (we want to inspect them)
      removeOnFail: false,
    },
  });

  console.log(`📋 BullMQ queue "${EMAIL_QUEUE_NAME}" initialized`);
  return emailQueueInstance;
}
