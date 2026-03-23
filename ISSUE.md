### Verify canance / related

Follows up on #91691 (closed for lack of repro). This issue provides a minimal public reproduction.

### Summary

Upgrading from Next.js 16.1.6 to 16.2.0 causes Vercel to **switch all serverless functions from Bun 1.x to Node.js 24.x**, despite `bunVersion: "1.x"` being set in `vercel.json`. The deployment builds successfully but every route returns `500 Internal Server Error` at runtime because Bun globals (`Bun.redis`) are evaluated in a Node.js context where `Bun` is not defined.

The only change between the two deployments is the `next` version. Same code, same config, same `vercel.json`.

| | Next.js 16.1.6 | Next.js 16.2.0 |
|---|---|---|
| **Runtime detected** | Bun 1.x | Node.js 24.x |
| **Bundle size** | 506-733 kB | 715 kB |
| **Status** | 200 OK | 500 Internal Server Error |
| **Functions count** | 2 (Page + API) | 4 (Page + API + _error + data) |

### Link to the code that reproduces this issue

https://github.com/jordiup/nextjs-bun-node-repro

### To Reproduce

1. Clone the repo — it's a bun monorepo with two identical Next.js Pages Router apps (`app-16-1` on 16.1.6, `app-16-2` on 16.2.0) and a shared workspace package
2. Both apps have `bunVersion: "1.x"` in `vercel.json` and `bundlePagesRouterDependencies: true` in `next.config.js`
3. The shared package has a barrel export (`index.ts`) that re-exports from two files:
   - `client.ts` — has a top-level call `export const redis = getRedisClient()` which accesses `Bun.redis`
   - `factory.ts` — imports `redis` from client but only uses it inside closures
4. Both apps only import `createRedisClient` from the barrel — they never import `redis` directly
5. Deploy both apps to Vercel

### Current vs. Expected behavior

**16.1.6 — All functions detected as Bun 1.x (correct):**

![16.1.6 deployment — all routes Bun 1.x](https://raw.githubusercontent.com/jordiup/nextjs-bun-node-repro/main/scrnsht-16-1-success.png)

```
/                              Bun 1.x   506.7 kB  iad1
/api/this-should-build-as-bun  Bun 1.x   733.7 kB  iad1
```

**16.2.0 — All functions fall back to Node.js 24.x, site returns 500:**

![16.2.0 deployment — all routes Node.js 24.x, 500 error](https://raw.githubusercontent.com/jordiup/nextjs-bun-node-repro/main/scrnsht-16-2-fail.png)

```
/                              Node.js 24.x  715.2 kB  iad1
/_error                        Node.js 24.x  715.2 kB  iad1
/api/this-should-build-as-bun  Node.js 24.x  715.2 kB  iad1
/_next/data/.../index.json     Node.js 24.x  715.2 kB  iad1
```

The site returns `500 Internal Server Error` because `Bun.redis` is evaluated at module load in a Node.js context where `Bun` is not defined.

**Expected:** All routes should be `Bun 1.x` since `bunVersion: "1.x"` is configured in `vercel.json`. The `client.ts` module should be tree-shaken from the bundle since only `createRedisClient` (from `factory.ts`) is consumed.

### Root Cause

PR #87216 changed `turbopackInferModuleSideEffects` from `!isStableBuild()` (canary-only) to `true` (all builds) in 16.2.0. This causes turbopack's AST analyzer to detect the top-level `getRedisClient()` call in `client.ts` as a side effect, forcing the module into every Lambda bundle that imports anything from the barrel — even when `redis` itself is not consumed.

The inclusion of `Bun.redis` in the bundled output then causes Vercel's runtime detection to assign `Node.js 24.x` instead of `Bun 1.x` to those functions, and the deployment fails with `ReferenceError: Bun is not defined` on cold start.

In 16.1.6, with `turbopackInferModuleSideEffects: false`, turbopack tree-shook `client.ts` out of the bundle entirely since only `createRedisClient` was consumed. No Bun globals in the bundle meant Vercel correctly detected all routes as `Bun 1.x`.

### Provide environment information

```
Operating System:
  Platform: darwin
  Arch: arm64
Next.js: 16.2.0 (regression from 16.1.6)
Bundler: Turbopack
Deployment: Vercel with bunVersion: "1.x"
Router: Pages Router
Config: bundlePagesRouterDependencies: true, workspace package in transpilePackages
```

### Which area(s) are affected? (Select all that apply)

Turbopack, Module Resolution, Deployment

### Which stage(s) are affected? (Select all that apply)

next build (Production), Vercel deployment

### Additional context

- PR #87216 — enabled `turbopackInferModuleSideEffects: true` for stable builds
- PR #87215 — previously gated it to canary-only for 16.1
- PR #86398 — original feature implementation
- Issue #75220 — prior Turbopack/Bun compatibility issue (closed)

**Workaround:** Set `experimental: { turbopackInferModuleSideEffects: false }` in `next.config.js`, or revert to 16.1.6.
