# Next.js 16.2.0 Bun Runtime Regression Repro

Minimal reproduction for [vercel/next.js#91691](https://github.com/vercel/next.js/issues/91691).

## The Problem

When deploying to Vercel with `bunVersion: "1.x"` in `vercel.json`, upgrading from Next.js 16.1.6 to 16.2.0 causes serverless functions to be detected as **Node.js 22.x** instead of **Bun 1.x**, resulting in `ReferenceError: Bun is not defined` on cold start.

## Root Cause

PR [#87216](https://github.com/vercel/next.js/pull/87216) enabled `turbopackInferModuleSideEffects: true` by default in 16.2.0 (it was canary-only in 16.1.x). This causes turbopack's AST analyzer to detect top-level call expressions as side effects, forcing modules into serverless bundles even when only unrelated exports from the same barrel are consumed.

## Structure

```
packages/
  shared/           # Workspace package with a barrel export
    src/
      client.ts     # Has `export const redis = getRedisClient()` (top-level Bun.redis call)
      factory.ts    # Imports `redis` from client, uses it inside closures only
      index.ts      # Barrel: re-exports from both client and factory
  app-16-1/         # Next.js 16.1.6 — works correctly
  app-16-2/         # Next.js 16.2.0 — regression
```

Both apps are identical except for the `next` version. Both have:
- `bundlePagesRouterDependencies: true`
- `transpilePackages: ["@repro/shared"]`
- `bunVersion: "1.x"` in `vercel.json`

The page and API route only import `createRedisClient` from the barrel — they never import `redis` directly.

## Expected

All routes should build as **Bun 1.x** since `bunVersion: "1.x"` is configured.

## Actual (16.2.0)

Routes whose Lambda bundle includes the barrel are detected as **Node.js 22.x** because turbopack now bundles `client.ts` (due to side-effect inference), and the top-level `Bun.redis` call crashes during module evaluation in the Node.js context.

## Local Verification

```bash
bun install

# 16.1.6 — builds successfully
cd packages/app-16-1 && bun --bun next build --turbopack

# 16.2.0 — includes client.ts in bundle, Bun.redis evaluated at build time
cd packages/app-16-2 && bun --bun next build --turbopack
```

## Workaround

Set in `next.config.js`:
```js
experimental: {
  turbopackInferModuleSideEffects: false,
}
```
