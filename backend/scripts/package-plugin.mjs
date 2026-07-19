import {
  getPluginDownloadOutputPath,
  resolvePluginPaths,
} from "../lib/plugin-download/plugin-version.ts";
import { writePluginZip } from "../lib/plugin-download/create-plugin-zip.ts";

const { backend_root } = resolvePluginPaths();
const output_path = getPluginDownloadOutputPath(backend_root);

writePluginZip(output_path);

console.log(`[package-plugin] wrote ${output_path}`);
