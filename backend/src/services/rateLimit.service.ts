import { Redis } from 'ioredis';
import { RateLimitResult } from '../types';

/**
 * Atomic Lua script for rate-limit check-and-increment.
 *
 * Strategy:
 *   1. Read the current counter for the hour window.
 *   2. If already at or above the limit → return 0 (blocked).
 *   3. Otherwise → INCR, set/refresh TTL to 3600s, return 1 (allowed).
 *
 * Atomicity guarantee: Redis executes Lua scripts as a single transaction.
 * No race conditions exist even with many concurrent workers.
 *
 * Key pattern: rate_limit:{senderEmail}:{YYYY-MM-DD-HH} (UTC hour)
 */
const CHECK_AND_INCREMENT_SCRIPT = `
local key    = KEYS[1]
local limit  = tonumber(ARGV[1])
local current = tonumber(redis.call('GET', key) or '0')

if current >= limit then
  return {0, current}
end

local new_count = redis.call('INCR', key)
redis.call('EXPIRE', key, 3600)
return {1, new_count}
`;

export class RateLimitService {
  constructor(private readonly redis: Redis) {}

  /**
   * Builds the Redis key and returns a human-readable hour label.
   * Uses UTC time to ensure consistency across server timezones.
   */
  private buildKey(senderEmail: string): { key: string; hourLabel: string } {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const d = String(now.getUTCDate()).padStart(2, '0');
    const h = String(now.getUTCHours()).padStart(2, '0');
    const hourLabel = `${y}-${m}-${d}-${h}`;
    return {
      key: `rate_limit:${senderEmail}:${hourLabel}`,
      hourLabel,
    };
  }

  /**
   * Returns the milliseconds from now until the start of the next UTC hour.
   * Used to compute the delay for overflow jobs.
   */
  private msUntilNextHour(): number {
    const now = new Date();
    const next = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        now.getUTCHours() + 1,
        0,
        0,
        0
      )
    );
    return Math.max(next.getTime() - now.getTime(), 1_000);
  }

  /**
   * Atomically checks the hourly rate limit and increments if allowed.
   *
   * @param senderEmail  The from-address (used as rate-limit namespace)
   * @param hourlyLimit  Max emails per hour for this sender
   * @returns            RateLimitResult with allowed flag and retry delay
   */
  async checkAndIncrement(
    senderEmail: string,
    hourlyLimit: number
  ): Promise<RateLimitResult> {
    const { key, hourLabel } = this.buildKey(senderEmail);

    const result = (await this.redis.eval(
      CHECK_AND_INCREMENT_SCRIPT,
      1,
      key,
      String(hourlyLimit)
    )) as [number, number];

    const [allowed, count] = result;

    if (allowed === 0) {
      return {
        allowed: false,
        retryAfterMs: this.msUntilNextHour(),
        currentCount: count,
        hourKey: hourLabel,
      };
    }

    return {
      allowed: true,
      retryAfterMs: 0,
      currentCount: count,
      hourKey: hourLabel,
    };
  }

  /** Returns the current send count for a sender in the active hour window. */
  async getCurrentCount(senderEmail: string): Promise<number> {
    const { key } = this.buildKey(senderEmail);
    const val = await this.redis.get(key);
    return parseInt(val ?? '0', 10);
  }

  /** Resets the counter — useful for testing. */
  async reset(senderEmail: string): Promise<void> {
    const { key } = this.buildKey(senderEmail);
    await this.redis.del(key);
    console.log(`🔄 Rate limit counter reset for ${senderEmail}`);
  }
}
