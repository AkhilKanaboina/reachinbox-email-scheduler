import { randomUUID } from 'crypto';
import { prisma } from '../utils/prisma';
import { getEmailQueue } from '../queues/email.queue';
import { ScheduleCampaignInput } from '../types';

export class CampaignService {
  /**
   * Schedules a new email campaign:
   *   1. Creates a Campaign record in MySQL.
   *   2. Pre-generates UUIDs and batch-inserts all EmailJob records.
   *   3. Enqueues all BullMQ delayed jobs with staggered delays.
   *
   * Performance: Uses prisma.emailJob.createMany() (single SQL INSERT) and
   * queue.addBulk() (single Redis pipeline) for efficient 1000+ job batches.
   *
   * Idempotency: Each BullMQ job ID = `email-job:{uuid}` — calling addBulk
   * with duplicate IDs is a no-op in BullMQ (job already exists in Redis).
   */
  async scheduleCampaign(
    input: ScheduleCampaignInput,
    userId: string
  ): Promise<{ campaignId: string; emailCount: number; scheduledAt: Date }> {
    const {
      subject,
      body,
      leads,
      senderEmail,
      hourlyLimit,
      delaySeconds,
      startTime,
    } = input;

    // ── 1. Create Campaign record ─────────────────────────────────────────────
    const campaign = await prisma.campaign.create({
      data: {
        userId,
        subject,
        body,
        senderEmail,
        hourlyLimit,
        delaySeconds,
        scheduledAt: startTime,
        totalCount: leads.length,
      },
    });

    // ── 2. Pre-generate EmailJob IDs (UUID v4 via Node.js crypto) ─────────────
    // Pre-generating IDs is essential: we need the ID before DB insert
    // so we can use it as the BullMQ job ID for idempotency.
    const emailJobsData = leads.map((lead, index) => ({
      id: randomUUID(),
      campaignId: campaign.id,
      recipientEmail: lead.email.trim().toLowerCase(),
      recipientName: lead.name?.trim() || null,
      status: 'PENDING' as const,
      scheduledAt: new Date(startTime.getTime() + index * delaySeconds * 1_000),
    }));

    // ── 3. Batch-insert EmailJobs (single SQL statement) ──────────────────────
    await prisma.emailJob.createMany({
      data: emailJobsData,
      skipDuplicates: true, // MySQL: ignore duplicate id (idempotent)
    });

    // ── 4. Enqueue BullMQ delayed jobs ────────────────────────────────────────
    const now = Date.now();
    const startDelay = Math.max(0, startTime.getTime() - now);

    const bullJobsBatch = emailJobsData.map((emailJob, index) => ({
      name: 'send-email',
      data: {
        emailJobId: emailJob.id,
        campaignId: campaign.id,
        recipientEmail: emailJob.recipientEmail,
        recipientName: emailJob.recipientName,
        subject,
        body,
        senderEmail,
        hourlyLimit,
      },
      opts: {
        // Deterministic ID — re-adding the same job ID is a safe no-op
        jobId: `email-job-${emailJob.id}`,
        delay: startDelay + index * delaySeconds * 1_000,
        attempts: 3,
        backoff: {
          type: 'exponential' as const,
          delay: 5_000,
        },
        removeOnComplete: { count: 5_000, age: 7 * 24 * 60 * 60 },
        removeOnFail: false as const,
      },
    }));

    const queue = getEmailQueue();
    await queue.addBulk(bullJobsBatch);

    console.log(
      `📅 Campaign ${campaign.id} scheduled: ${leads.length} emails, ` +
        `start in ${Math.round(startDelay / 1000)}s, ` +
        `${delaySeconds}s between sends, ` +
        `hourly limit: ${hourlyLimit}`
    );

    return {
      campaignId: campaign.id,
      emailCount: leads.length,
      scheduledAt: startTime,
    };
  }

  /**
   * Returns all campaigns for a given user, ordered newest first.
   */
  async getCampaigns(userId: string) {
    return prisma.campaign.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const campaignService = new CampaignService();
