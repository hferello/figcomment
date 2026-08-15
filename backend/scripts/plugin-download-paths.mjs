import {
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scripts_dir = path.dirname(fileURLToPath(import.meta.url));
const backend_root = path.join(scripts_dir, "..");
const plugin_root = path.join(backend_root, "..", "plugin");
const plugin_download_public_dir = "files";
let current_plugin_safe_title = "comment-sort";
let legacy_plugin_safe_titles = ["figcomment", current_plugin_safe_title];
const plugin_version_json_path = path.join(
  backend_root,
  "lib/plugin-download/plugin-version.json",
);

try {
  const { app_constants } = await import("../data/constants.ts");
  const configured_safe_title = app_constants?.backend?.safe_title;
  const configured_legacy_safe_titles = app_constants?.backend?.legacy_safe_titles;

  if (typeof configured_safe_title === "string" && configured_safe_title.length > 0) {
    current_plugin_safe_title = configured_safe_title;
  }

  if (
    Array.isArray(configured_legacy_safe_titles) &&
    configured_legacy_safe_titles.every(
      (value) => typeof value === "string" && value.length > 0,
    )
  ) {
    legacy_plugin_safe_titles = configured_legacy_safe_titles;
  } else {
    legacy_plugin_safe_titles = ["figcomment", current_plugin_safe_title];
  }
} catch {
  // Fallback keeps this script runnable in plain Node without strip-types.
}

function read_plugin_version_from_source() {
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

export function read_plugin_version_from_json() {
  const version_json = JSON.parse(readFileSync(plugin_version_json_path, "utf8"));

  if (
    typeof version_json !== "object" ||
    version_json === null ||
    typeof version_json.version !== "string"
  ) {
    throw new Error("lib/plugin-download/plugin-version.json is invalid.");
  }

  return version_json.version;
}

export function write_plugin_version_json(version) {
  writeFileSync(
    plugin_version_json_path,
    `${JSON.stringify({ version }, null, 2)}\n`,
  );
}

export function read_plugin_version_for_build(is_vercel) {
  return is_vercel
    ? read_plugin_version_from_json()
    : read_plugin_version_from_source();
}

export function get_plugin_download_filename(version) {
  return `${current_plugin_safe_title}-plugin-${version}.zip`;
}

function get_plugin_zip_prefixes() {
  return legacy_plugin_safe_titles.map((safe_title) => `${safe_title}-plugin-`);
}

export function get_plugin_download_output_path(
  backend_root_path = backend_root,
  version,
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
  version,
) {
  const files_dir = path.join(
    backend_root_path,
    "public",
    plugin_download_public_dir,
  );
  const keep_filename = get_plugin_download_filename(version);
  const plugin_zip_prefixes = get_plugin_zip_prefixes();

  for (const file_name of readdirSync(files_dir)) {
    if (
      plugin_zip_prefixes.some((prefix) => file_name.startsWith(prefix)) &&
      file_name.endsWith(".zip") &&
      file_name !== keep_filename
    ) {
      unlinkSync(path.join(files_dir, file_name));
      console.log(`[prebuild] removed stale ${file_name}`);
    }
  }
}
