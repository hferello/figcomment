import { existsSync } from "node:fs";
import {
  cleanup_stale_plugin_zips,
  get_plugin_download_output_path,
} from "./plugin-download-paths.mjs";

const output_path = get_plugin_download_output_path();
const is_vercel = process.env.VERCEL === "1";

if (is_vercel) {
  if (!existsSync(output_path)) {
    console.error(
      `[prebuild] Missing ${output_path}. Run npm run build locally and commit the zip.`,
    );
    process.exit(1);
  }

  console.log(`[prebuild] found ${output_path}`);
} else {
  const { writePluginZip } = await import(
    "../lib/plugin-download/create-plugin-zip.ts"
  );

  writePluginZip(output_path);
  cleanup_stale_plugin_zips();
  console.log(`[prebuild] wrote ${output_path}`);
}
