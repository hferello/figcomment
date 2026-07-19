import { existsSync } from "node:fs";
import {
  cleanup_stale_plugin_zips,
  get_plugin_download_output_path,
  read_plugin_version_for_build,
  write_plugin_version_json,
} from "./plugin-download-paths.mjs";

const is_vercel = process.env.VERCEL === "1";
const plugin_version = read_plugin_version_for_build(is_vercel);
const output_path = get_plugin_download_output_path(undefined, plugin_version);

if (is_vercel) {
  if (!existsSync(output_path)) {
    console.error(
      `[prebuild] Missing ${output_path}. Run npm run build locally and commit the zip.`,
    );
    process.exit(1);
  }

  console.log(`[prebuild] found ${output_path}`);
} else {
  write_plugin_version_json(plugin_version);

  const { writePluginZip } = await import(
    "../lib/plugin-download/create-plugin-zip.ts"
  );

  writePluginZip(output_path);
  cleanup_stale_plugin_zips(undefined, plugin_version);
  console.log(`[prebuild] wrote ${output_path}`);
}
