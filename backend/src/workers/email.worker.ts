import { Worker, Job } from 'bullmq';
import { prisma } from '../utils/prisma';
import { redis, createBullMQConnection } from '../utils/redis';
import { getMailer, getPreviewUrl } from '../utils/mailer';
import { getEmailQueue, EMAIL_QUEUE_NAME } from '../queues/email.queue';
import { RateLimitService } from '../services/rateLimit.service';
import { EmailJobData } from '../types';
import { env } from '../config/env';

const rateLimitService = new RateLimitService(redis);

/**
 * Email Worker — BullMQ processor for the email queue.
 *
 * Processing pipeline per job:
 *   1. Rate limit check (atomic Lua script against Redis)
 *      → If blocked: re-queue with deterministic ID + delay to next hour window
 *      → If allowed: continue
 *   2. Personalize email content ({{name}} substitution)
 *   3. Send via Nodemailer/Ethereal SMTP
 *   4. Update EmailJob status in MySQL (SENT / FAILED)
 *   5. Increment campaign sentCount / failedCount
 *
 * Idempotency:
 *   - Each EmailJob has a UUID pre-generated before DB insert.
 *   - BullMQ job ID = `email-job:{emailJobId}` (deterministic).
 *   - On server restart, BullMQ resumes from Redis state (no re-scanning DB).
 *   - If worker crashes mid-send: job remains "active" and is re-picked up
 *     after stalledInterval (30s). DB status is only written after SMTP success.
 *
 * Stall recovery:
 *   - stalledInterval: 30_000ms — check for stalled jobs every 30s
 *   - maxStalledCount: 2 — mark as failed after 2 stalls without progress
 *   - lockDuration: 60_000ms — worker must renew lock within 60s
 */
export function startEmailWorker(): Worker<EmailJobData> {
  const worker = new Worker<EmailJobData>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      const {
        emailJobId,
        campaignId,
        recipientEmail,
        recipientName,
        subject,
        body,
        senderEmail,
        hourlyLimit,
      } = job.data;

      console.log(
        `📤 [Job ${job.id}] Processing → ${recipientEmail} (campaign: ${campaignId})`
      );

      // ──────────────────────────────────────────────────────────────────────
      // STEP 1: Rate limit check
      // ──────────────────────────────────────────────────────────────────────
      const rateLimit = await rateLimitService.checkAndIncrement(
        senderEmail,
        hourlyLimit
      );

      if (!rateLimit.allowed) {
        const retryMs = rateLimit.retryAfterMs + 1_000; // 1s buffer
        console.warn(
          `⏸️  [Job ${job.id}] Rate limit hit for "${senderEmail}" ` +
            `(${rateLimit.currentCount}/${hourlyLimit}). ` +
            `Rescheduling in ${Math.round(retryMs / 1000)}s → next hour window.`
        );

        // Re-queue with a deterministic ID so it's idempotent across restarts.
        // Key: same emailJobId + same hourKey = same ID within this hour window.
        const retryJobId = `rate-limited-${emailJobId}-${rateLimit.hourKey}`;
        const queue = getEmailQueue();

        try {
          await queue.add('send-email', job.data, {
            jobId: retryJobId,
            delay: retryMs,
            attempts: 3,
            backoff: { type: 'exponential', delay: 5_000 },
            removeOnComplete: { count: 5_000, age: 7 * 24 * 60 * 60 },
            removeOnFail: false,
          });
        } catch (err) {
          // If job ID already exists (idempotent re-queue), ignore the error.
          const msg = (err as { message?: string }).message ?? '';
          if (!msg.includes('already exists') && !msg.includes('Duplicate')) {
            console.error(`Failed to re-queue rate-limited job ${emailJobId}:`, err);
          }
        }

        // Return without throwing — marks the ORIGINAL job as "completed"
        // so BullMQ doesn't count it as a failure or retry it again.
        return { rateLimited: true, retryJobId };
      }

      // ──────────────────────────────────────────────────────────────────────
      // STEP 2: Personalise content
      // ──────────────────────────────────────────────────────────────────────
      const displayName = recipientName?.trim() || 'there';
      const personalizedSubject = subject.replace(/\{\{name\}\}/gi, displayName);
      const personalizedBody = body.replace(/\{\{name\}\}/gi, displayName);

      // ──────────────────────────────────────────────────────────────────────
      // STEP 3: Send email via SMTP
      // ──────────────────────────────────────────────────────────────────────
      try {
        const mailer = await getMailer();
        const info = await mailer.sendMail({
          from: `"ReachInbox" <${senderEmail}>`,
          to: recipientEmail,
          subject: personalizedSubject,
          html: personalizedBody,
          headers: {
            // Helps Ethereal thread emails by campaign
            'X-Campaign-Id': campaignId,
            'X-Email-Job-Id': emailJobId,
          },
        });

        const previewUrl = getPreviewUrl(info);
        console.log(
          `✅ [Job ${job.id}] Sent to ${recipientEmail}` +
            (previewUrl ? ` — preview: ${previewUrl}` : '')
        );

        // ────────────────────────────────────────────────────────────────────
        // STEP 4: Update DB — SENT
        // ────────────────────────────────────────────────────────────────────
        await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            previewUrl: typeof previewUrl === 'string' ? previewUrl : null,
            errorMessage: null,
          },
        });

        await prisma.campaign.update({
          where: { id: campaignId },
          data: { sentCount: { increment: 1 } },
        });

        return { sent: true, previewUrl: previewUrl || null };
      } catch (smtpError) {
        const errorMessage =
          smtpError instanceof Error ? smtpError.message : 'Unknown SMTP error';

        console.error(
          `❌ [Job ${job.id}] SMTP failed for ${recipientEmail}: ${errorMessage}`
        );

        // ────────────────────────────────────────────────────────────────────
        // STEP 5: Update DB — FAILED
        // Only on the LAST attempt (job.attemptsMade === job.opts.attempts)
        // BullMQ will retry before giving up, so we only mark FAILED on the
        // final attempt to avoid premature failure state in the dashboard.
        // ────────────────────────────────────────────────────────────────────
        const maxAttempts = job.opts.attempts ?? 3;
        const isLastAttempt = job.attemptsMade >= maxAttempts - 1;

        if (isLastAttempt) {
          await prisma.emailJob.update({
            where: { id: emailJobId },
            data: {
              status: 'FAILED',
              errorMessage: errorMessage.substring(0, 500), // cap length
            },
          });

          await prisma.campaign.update({
            where: { id: campaignId },
            data: { failedCount: { increment: 1 } },
          });
        }

        // Re-throw so BullMQ handles retries / marks job as failed
        throw new Error(errorMessage);
      }
    },
    {
      connection: createBullMQConnection(),
      concurrency: parseInt(env.WORKER_CONCURRENCY, 10),
      stalledInterval: 30_000,  // Stall detection interval: 30s
      maxStalledCount: 2,        // After 2 stalls → mark job as failed
      lockDuration: 60_000,      // Job lock expires after 60s (worker must renew)
    }
  );

  // ─── Worker Event Handlers ─────────────────────────────────────────────────

  worker.on('completed', (job, result) => {
    if (!result?.rateLimited) {
      console.log(`✅ Worker: Job ${job.id} completed`);
    }
  });

  worker.on('failed', (job, err) => {
    console.error(
      `❌ Worker: Job ${job?.id} permanently failed after ${job?.attemptsMade} attempts — ${err.message}`
    );
  });

  worker.on('stalled', (jobId) => {
    console.warn(
      `⚠️  Worker: Job ${jobId} stalled — will be re-queued automatically`
    );
  });

  worker.on('error', (err) => {
    console.error('Worker encountered an error:', err);
  });

  console.log(
    `🚀 Email worker started (concurrency: ${env.WORKER_CONCURRENCY}, queue: ${EMAIL_QUEUE_NAME})`
  );

  // Sync any orphaned PENDING jobs in MySQL that are missing from Redis
  syncPendingJobsToQueue().catch((err) =>
    console.error('Error syncing pending jobs on worker start:', err)
  );

  return worker;
}

/**
 * Scans MySQL for any PENDING EmailJobs that are missing from BullMQ (e.g. after Redis restart or flush),
 * and enqueues them back into the BullMQ delayed queue.
 */
export async function syncPendingJobsToQueue(): Promise<number> {
  try {
    const pendingJobs = await prisma.emailJob.findMany({
      where: { status: 'PENDING' },
      include: { campaign: true },
    });

    if (pendingJobs.length === 0) return 0;

    const queue = getEmailQueue();
    const now = Date.now();
    let reEnqueuedCount = 0;

    for (const emailJob of pendingJobs) {
      const jobId = `email-job-${emailJob.id}`;
      const existingJob = await queue.getJob(jobId);

      if (!existingJob) {
        const delay = Math.max(0, emailJob.scheduledAt.getTime() - now);
        await queue.add(
          'send-email',
          {
            emailJobId: emailJob.id,
            campaignId: emailJob.campaignId,
            recipientEmail: emailJob.recipientEmail,
            recipientName: emailJob.recipientName,
            subject: emailJob.campaign.subject,
            body: emailJob.campaign.body,
            senderEmail: emailJob.campaign.senderEmail,
            hourlyLimit: emailJob.campaign.hourlyLimit,
          },
          {
            jobId,
            delay,
            attempts: 3,
            backoff: { type: 'exponential', delay: 5_000 },
            removeOnComplete: { count: 5_000, age: 7 * 24 * 60 * 60 },
            removeOnFail: false,
          }
        );
        reEnqueuedCount++;
      }
    }

    if (reEnqueuedCount > 0) {
      console.log(`🔄 Recovered ${reEnqueuedCount} missing PENDING jobs back into BullMQ queue`);
    }

    return reEnqueuedCount;
  } catch (err) {
    console.error('Failed to sync pending jobs to queue:', err);
    return 0;
  }
}

