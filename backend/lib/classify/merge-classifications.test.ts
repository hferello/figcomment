import test from "node:test";
import assert from "node:assert/strict";
import {
  mergeRowsWithExactIdSet,
  type PromptCommentRow,
} from "./merge-classifications.ts";

const prompt_rows: PromptCommentRow[] = [
  { id: "11111111-1111-4111-8111-111111111111", person: "A", feedback: "a" },
  { id: "22222222-2222-4222-8222-222222222222", person: "B", feedback: "b" },
];

test("mergeRowsWithExactIdSet preserves order from prompt rows", () => {
  const rows = mergeRowsWithExactIdSet(prompt_rows, [
    {
      id: "22222222-2222-4222-8222-222222222222",
      type: "Action",
      critique_lens: "High - User need/problem",
    },
    {
      id: "11111111-1111-4111-8111-111111111111",
      type: "Thoughts",
      critique_lens: "Low - Visual design",
    },
  ]);

  assert.equal(rows[0]?.person, "A");
  assert.equal(rows[1]?.person, "B");
});

test("mergeRowsWithExactIdSet rejects duplicate ids", () => {
  assert.throws(() =>
    mergeRowsWithExactIdSet(prompt_rows, [
      {
        id: "11111111-1111-4111-8111-111111111111",
        type: "Action",
        critique_lens: "High - User need/problem",
      },
      {
        id: "11111111-1111-4111-8111-111111111111",
        type: "Thoughts",
        critique_lens: "Low - Visual design",
      },
    ]),
  );
});
