import type { NextConfig } from "next";

const next_config: NextConfig = {
  reactStrictMode: true,
  // Enables Partial Prerendering: static shells + Suspense for runtime data.
  cacheComponents: true,
};

export default next_config;
