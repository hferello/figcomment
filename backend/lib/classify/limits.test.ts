import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_COMMENT_CHARS_FOR_CLASSIFICATION,
  enforceCommentCountLimit,
  splitIntoBatches,
  truncateForClassification,
} from "./limits.ts";

test("truncateForClassification enforces max length", () => {
  const input = "x".repeat(MAX_COMMENT_CHARS_FOR_CLASSIFICATION + 25);
  const output = truncateForClassification(input);
  assert.equal(output.length, MAX_COMMENT_CHARS_FOR_CLASSIFICATION);
});

test("enforceCommentCountLimit throws when list is too long", () => {
  const comments = Array.from({ length: 37 }).map((_, index) => ({
    person: `P${index}`,
    feedback: "x",
  }));
  assert.throws(() => enforceCommentCountLimit(comments));
});

test("splitIntoBatches creates bounded buckets", () => {
  const items = Array.from({ length: 10 }).map((_, index) => index);
  const batches = splitIntoBatches(items, 3);
  assert.equal(batches.length, 3);
  assert.equal(batches.flat().length, 10);
});
