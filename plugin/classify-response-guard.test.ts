import test from "node:test";
import assert from "node:assert/strict";
import { isClassifyResponse } from "./classify-response-guard.ts";

test("isClassifyResponse accepts valid payload", () => {
  const payload = {
    rows: [
      {
        person: "A",
        feedback: "B",
        type: "Suggestion",
        critique_lens: "Low - Visual design",
      },
    ],
    meta: {
      mode: "live",
      sort_method: "heuristic",
      provider: null,
      latency_ms: 12,
    },
  };
  assert.equal(isClassifyResponse(payload), true);
});

test("isClassifyResponse rejects invalid rows", () => {
  const payload = {
    rows: [{ person: "A", feedback: "B", type: "bad", critique_lens: "bad" }],
    meta: {
      mode: "live",
      sort_method: "heuristic",
      provider: null,
      latency_ms: 12,
    },
  };
  assert.equal(isClassifyResponse(payload), false);
});
