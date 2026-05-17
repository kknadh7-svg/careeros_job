import { logger } from "@/lib/logger";

const redisConfigured =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

let _redis: import("@upstash/redis").Redis | null = null;

export async function getRedis(): Promise<import("@upstash/redis").Redis | null> {
  if (!redisConfigured) return null;
  if (!_redis) {
    const { Redis } = await import("@upstash/redis");
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return _redis;
}

// Rate limiters — only active when Redis is configured
async function makeRateLimiter(limit: number, prefix: string) {
  if (!redisConfigured) return null;
  const { Ratelimit } = await import("@upstash/ratelimit");
  const { Redis } = await import("@upstash/redis");
  return new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(limit, "1 m"),
    analytics: true,
    prefix,
  });
}

export const getRateLimiters = async () => ({
  free: await makeRateLimiter(60, "rl:free"),
  pro: await makeRateLimiter(300, "rl:pro"),
  enterprise: await makeRateLimiter(1000, "rl:enterprise"),
  ai: await makeRateLimiter(10, "rl:ai"),
});

// TTL constants (seconds)
export const TTL = {
  USER_PROFILE: 300,          // 5 min
  JOB_LISTINGS: 900,          // 15 min
  ATS_SCORE: 3600,            // 1 hour
  JOB_RECOMMENDATIONS: 3600,  // 1 hour
  AI_CONTENT: 86400,          // 24 hours
  SESSION: 1800,              // 30 min (browser automation)
} as const;

/**
 * Generic cache helper. Falls back to calling fn() directly when Redis is not configured.
 */
export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttl: number
): Promise<T> {
  const redis = await getRedis();

  if (!redis) {
    return fn();
  }

  try {
    const cached = await redis.get<T>(key);
    if (cached !== null) {
      logger.debug({ msg: "Cache hit", key });
      return cached;
    }
  } catch (err) {
    logger.warn({ msg: "Cache get failed", key, error: String(err) });
  }

  const result = await fn();

  try {
    await redis.setex(key, ttl, result as Parameters<typeof redis.set>[1]);
    logger.debug({ msg: "Cache set", key, ttl });
  } catch (err) {
    logger.warn({ msg: "Cache set failed", key, error: String(err) });
  }

  return result;
}

export function cacheKey(...parts: string[]): string {
  return parts.join(":");
}
