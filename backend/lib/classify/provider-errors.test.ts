import test from "node:test";
import assert from "node:assert/strict";
import {
  isProviderCredentialError,
  isProviderRateLimitError,
  isProviderUnavailableError,
} from "./provider-errors.ts";

test("provider error mappings classify auth errors", () => {
  assert.equal(isProviderCredentialError({ status: 401 }), true);
});

test("provider error mappings classify rate limits", () => {
  assert.equal(isProviderRateLimitError({ statusCode: 429 }), true);
});

test("provider error mappings classify availability failures", () => {
  assert.equal(isProviderUnavailableError({ status: 503 }), true);
});
