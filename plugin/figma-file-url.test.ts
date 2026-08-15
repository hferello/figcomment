import test from "node:test";
import assert from "node:assert/strict";
import { parseFigmaFileUrl } from "./figma-file-url.ts";

test("parseFigmaFileUrl parses design file url", () => {
  const parsed = parseFigmaFileUrl(
    "https://www.figma.com/design/abc123/My-File?node-id=1-2",
  );
  assert.equal(parsed.file_key, "abc123");
});

test("parseFigmaFileUrl returns branch key for branch urls", () => {
  const parsed = parseFigmaFileUrl(
    "https://www.figma.com/design/abc123/branch/brn987/My-Branch",
  );
  assert.equal(parsed.file_key, "brn987");
});

test("parseFigmaFileUrl rejects non-figma host", () => {
  assert.throws(
    () => parseFigmaFileUrl("https://example.com/design/abc123/Test"),
    /figma\.com/,
  );
});
