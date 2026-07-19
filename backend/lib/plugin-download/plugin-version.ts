import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type PluginVersionJson = {
  version: string;
};

const module_dir = path.dirname(fileURLToPath(import.meta.url));
const plugin_version_json_path = path.join(module_dir, "plugin-version.json");

/**
 * Read the plugin release version baked in at local build time.
 * Vercel only deploys /backend, so this must not read ../plugin at runtime.
 */
export function readPluginVersion(): string {
  const version_json = JSON.parse(
    readFileSync(plugin_version_json_path, "utf8"),
  ) as PluginVersionJson;

  return version_json.version;
}

/** Static assets folder for downloadable plugin archives. */
export const plugin_download_public_dir = "files";

/**
 * Build the versioned zip filename served from public/files.
 */
export function getPluginDownloadFilename(version = readPluginVersion()): string {
  return `figcomment-plugin-${version}.zip`;
}

/**
 * Absolute path where the local build writes the plugin zip.
 */
export function getPluginDownloadOutputPath(
  backend_root: string,
  version = readPluginVersion(),
): string {
  return path.join(
    backend_root,
    "public",
    plugin_download_public_dir,
    getPluginDownloadFilename(version),
  );
}

/**
 * Public URL for the built plugin download archive.
 */
export function getPluginDownloadHref(version = readPluginVersion()): string {
  return `/${plugin_download_public_dir}/${getPluginDownloadFilename(version)}`;
}
