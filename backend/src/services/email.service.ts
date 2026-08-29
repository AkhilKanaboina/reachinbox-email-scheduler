import { JobStatus } from '@prisma/client';
import { prisma } from '../utils/prisma';

type StatusFilter = 'scheduled' | 'sent' | 'failed' | 'all';

/**
 * Maps the frontend status parameter to Prisma's JobStatus enum.
 * 'scheduled' maps to PENDING (jobs that haven't been sent yet).
 */
const STATUS_MAP: Record<StatusFilter, JobStatus | undefined> = {
  scheduled: 'PENDING',
  sent: 'SENT',
  failed: 'FAILED',
  all: undefined,
};

export class EmailService {
  /**
   * Returns paginated email jobs for a user with optional status filter.
   *
   * Uses a composite index on (status, scheduledAt) for fast filtered queries.
   * Both items and count are fetched in a single Promise.all for performance.
   */
  async getEmails({
    status,
    userId,
    page = 1,
    limit = 20,
  }: {
    status: StatusFilter;
    userId: string;
    page?: number;
    limit?: number;
  }) {
    const skip = (page - 1) * limit;
    const dbStatus = STATUS_MAP[status];

    const where = {
      campaign: { userId },
      ...(dbStatus !== undefined ? { status: dbStatus } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.emailJob.findMany({
        where,
        include: {
          campaign: {
            select: {
              id: true,
              subject: true,
              body: true,
              senderEmail: true,
            },
          },
        },
        orderBy: [
          { scheduledAt: 'asc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.emailJob.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }
}

export const emailService = new EmailService();
