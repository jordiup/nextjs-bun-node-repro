import type { NextApiRequest, NextApiResponse } from "next"
import { createRedisClient } from "@repro/shared"

/**
 * API route that imports only `createRedisClient` from the barrel.
 * Should build as Bun runtime since bunVersion: "1.x" is configured.
 *
 * In 16.1.6: turbopack tree-shakes client.ts, route builds as Bun 1.x
 * In 16.2.0: turbopack includes client.ts (side effect), route falls back to Node.js 22.x
 */
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  const _client = createRedisClient
  res.status(200).json({ runtime: typeof Bun !== "undefined" ? "bun" : "node" })
}
