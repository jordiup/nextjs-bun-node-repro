import { redis } from "./client"

/**
 * Typed Redis client factory.
 * Only uses `redis` inside closures — never at module evaluation time.
 */
export function createRedisClient() {
  return {
    get: async (key: string) => redis.get(key),
    set: async (key: string, value: string) => redis.set(key, value),
    del: async (key: string) => redis.del(key),
  }
}
