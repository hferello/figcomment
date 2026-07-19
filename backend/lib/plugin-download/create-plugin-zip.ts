import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { zipSync } from "fflate";

const PLUGIN_RUNTIME_FILES = [
  "manifest.json",
  "ui.html",
  "code.js",
  "figcomment-logo.svg",
] as const;

const module_dir = path.dirname(fileURLToPath(import.meta.url));

function resolvePluginRoot(): string {
  const backend_root = path.join(module_dir, "../..");
  return path.join(backend_root, "..", "plugin");
}

/**
 * Build code.js from the plugin package when source is available.
 */
function ensurePluginBuilt(plugin_root: string): void {
  if (!existsSync(plugin_root)) {
    throw new Error("Plugin source directory not found.");
  }

  const esbuild_bin = path.join(
    plugin_root,
    "node_modules",
    ".bin",
    "esbuild",
  );
  if (!existsSync(esbuild_bin)) {
    execSync("npm ci --include=dev", { cwd: plugin_root, stdio: "inherit" });
  }

  execSync("npm run build", {
    cwd: plugin_root,
    stdio: "pipe",
    env: { ...process.env, NODE_ENV: "development" },
  });
}

/**
 * Bundle the Figma import files into a zip archive buffer.
 */
function createPluginZipBuffer(): Buffer {
  const plugin_root = resolvePluginRoot();

  ensurePluginBuilt(plugin_root);

  const zip_entries: Record<string, Uint8Array> = {};

  for (const file_name of PLUGIN_RUNTIME_FILES) {
    const file_path = path.join(plugin_root, file_name);
    if (!existsSync(file_path)) {
      throw new Error(`Missing plugin file: ${file_name}`);
    }

    zip_entries[file_name] = readFileSync(file_path);
  }

  return Buffer.from(zipSync(zip_entries));
}

/**
 * Write the plugin zip to disk (used during production builds).
 */
export function writePluginZip(output_path: string): void {
  const archive = createPluginZipBuffer();
  mkdirSync(path.dirname(output_path), { recursive: true });
  writeFileSync(output_path, archive);
}
