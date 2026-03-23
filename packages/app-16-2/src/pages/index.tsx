import type { GetServerSideProps } from "next"

// This import only uses `createRedisClient` from the barrel.
// In 16.1.6, turbopack tree-shakes `client.ts` out of the bundle.
// In 16.2.0, turbopack includes it because it detects the top-level side effect.
import { createRedisClient } from "@repro/shared"

export const getServerSideProps: GetServerSideProps = async () => {
  // We reference createRedisClient to ensure the import isn't eliminated
  const _client = createRedisClient
  return { props: { timestamp: Date.now() } }
}

export default function Home({ timestamp }: { timestamp: number }) {
  return (
    <div>
      <h1>Next.js Bun Runtime Repro</h1>
      <p>Rendered at: {timestamp}</p>
    </div>
  )
}
