type ParsedFigmaFileUrl = {
  file_key: string;
};

const FIGMA_HOSTS = new Set(["figma.com", "www.figma.com"]);

export function parseFigmaFileUrl(input: string): ParsedFigmaFileUrl {
  const parsed = parseHttpsUrl(input.trim());
  if (!parsed) {
    throw new Error("Paste a valid Figma file URL.");
  }

  if (!FIGMA_HOSTS.has(parsed.hostname)) {
    throw new Error("URL must use figma.com.");
  }

  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts.length < 2) {
    throw new Error("Paste a Figma design file URL.");
  }

  if (parts[0] === "design" && parts[2] === "branch" && parts[3]) {
    return { file_key: parts[3] };
  }

  if (parts[0] === "design" && parts[1]) {
    return { file_key: parts[1] };
  }

  if (parts[0] === "file" && parts[1]) {
    return { file_key: parts[1] };
  }

  if (parts[0] === "proto" && parts[1]) {
    return { file_key: parts[1] };
  }

  const branch_index = parts.indexOf("branch");
  if (branch_index >= 0 && parts[branch_index + 1]) {
    return { file_key: parts[branch_index + 1] };
  }

  throw new Error("Could not extract the file key from this URL.");
}

function parseHttpsUrl(
  value: string,
): { hostname: string; pathname: string } | null {
  const match = value.match(/^https:\/\/([^/?#]+)(\/[^?#]*)?/i);
  if (!match) {
    return null;
  }
  const hostname = match[1]?.toLowerCase() ?? "";
  const pathname = match[2] ?? "/";
  return { hostname, pathname };
}
