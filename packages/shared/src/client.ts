/**
 * Singleton Redis client using Bun's native implementation.
 * The top-level `getRedisClient()` call is the side effect that
 * turbopack 16.2's `inferModuleSideEffects` forces into every bundle.
 */

type BunRedis = typeof Bun.redis

const globalForRedis = globalThis as unknown as {
  redis: BunRedis | undefined
}

export const getRedisClient = (): BunRedis => {
  if (!globalForRedis.redis) {
    globalForRedis.redis = Bun.redis
  }
  return globalForRedis.redis
}

// Top-level call expression — flagged as SideEffectful by turbopack AST analyzer
export const redis = getRedisClient()
