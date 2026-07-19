import { readFileSync, readdirSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scripts_dir = path.dirname(fileURLToPath(import.meta.url));
const backend_root = path.join(scripts_dir, "..");
const plugin_root = path.join(backend_root, "..", "plugin");
const plugin_download_public_dir = "files";

function read_plugin_version() {
  const package_json = JSON.parse(
    readFileSync(path.join(plugin_root, "package.json"), "utf8"),
  );

  if (
    typeof package_json !== "object" ||
    package_json === null ||
    typeof package_json.version !== "string"
  ) {
    throw new Error("plugin/package.json is missing a version string.");
  }

  return package_json.version;
}

export function get_plugin_download_filename(version = read_plugin_version()) {
  return `figcomment-plugin-${version}.zip`;
}

export function get_plugin_download_output_path(
  backend_root_path = backend_root,
  version = read_plugin_version(),
) {
  return path.join(
    backend_root_path,
    "public",
    plugin_download_public_dir,
    get_plugin_download_filename(version),
  );
}

/** Drop older plugin zips so git only tracks the current release. */
export function cleanup_stale_plugin_zips(
  backend_root_path = backend_root,
  version = read_plugin_version(),
) {
  const files_dir = path.join(
    backend_root_path,
    "public",
    plugin_download_public_dir,
  );
  const keep_filename = get_plugin_download_filename(version);

  for (const file_name of readdirSync(files_dir)) {
    if (
      file_name.startsWith("figcomment-plugin-") &&
      file_name.endsWith(".zip") &&
      file_name !== keep_filename
    ) {
      unlinkSync(path.join(files_dir, file_name));
      console.log(`[prebuild] removed stale ${file_name}`);
    }
  }
}
