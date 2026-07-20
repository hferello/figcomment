import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";

const next_config: NextConfig = {
  reactStrictMode: true,
  // Enables Partial Prerendering: static shells + Suspense for runtime data.
  cacheComponents: true,
  // Next.js 16.2+ logs Server Function args in dev by default. Auth actions
  // receive passwords — never print those to the terminal.
  logging: {
    serverFunctions: false,
  },
};

// withBotId adds proxy rewrites so the BotID challenge script is served
// first-party (ad-blockers can't strip it) and classification headers flow through.
export default withBotId(next_config);
