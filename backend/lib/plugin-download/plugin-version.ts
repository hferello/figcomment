import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type PluginPackageJson = {
  version: string;
};

const module_dir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Resolve monorepo paths from backend to the Figma plugin source folder.
 */
export function resolvePluginPaths() {
  const backend_root = path.join(module_dir, "../..");
  const plugin_root = path.join(backend_root, "..", "plugin");

  return { backend_root, plugin_root };
}

/**
 * Read the plugin release version from plugin/package.json.
 */
export function readPluginVersion(): string {
  const { plugin_root } = resolvePluginPaths();
  const package_json = JSON.parse(
    readFileSync(path.join(plugin_root, "package.json"), "utf8"),
  ) as PluginPackageJson;

  return package_json.version;
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
 * Absolute path where the build script writes the plugin zip.
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
