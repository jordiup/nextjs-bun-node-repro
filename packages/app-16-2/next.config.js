/** @type {import("next").NextConfig} */
const config = {
  transpilePackages: ["@repro/shared"],
  bundlePagesRouterDependencies: true,
  typescript: { ignoreBuildErrors: true },
}

export default config
