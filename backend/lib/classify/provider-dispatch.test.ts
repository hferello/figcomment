import test from "node:test";
import assert from "node:assert/strict";
import { resolveProvider } from "./provider-dispatch.ts";

test("resolveProvider keeps valid providers", () => {
  assert.equal(resolveProvider("openai"), "openai");
  assert.equal(resolveProvider("gemini"), "gemini");
  assert.equal(resolveProvider("anthropic"), "anthropic");
});

test("resolveProvider defaults to anthropic when missing", () => {
  assert.equal(resolveProvider(null), "anthropic");
});
