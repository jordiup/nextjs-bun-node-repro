// Barrel export — re-exports from both client and factory.
// Consumers only import `createRedisClient` from this barrel,
// but the re-export of `redis` from ./client causes turbopack 16.2
// to include client.ts (and its top-level side effect) in every bundle.
export { redis, getRedisClient } from "./client"
export { createRedisClient } from "./factory"
