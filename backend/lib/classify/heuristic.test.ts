import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyHeuristically,
  guessLens,
  guessType,
} from "./heuristic.ts";

test("guessType identifies red flags", () => {
  assert.equal(guessType("this is a blocker"), "Red flag");
});

test("guessLens identifies interaction feedback", () => {
  assert.equal(guessLens("click target is too small"), "Low - Interaction design");
});

test("classifyHeuristically keeps person and feedback", () => {
  const rows = classifyHeuristically([{ person: "Alex", feedback: "maybe add filters" }]);
  assert.equal(rows[0]?.person, "Alex");
  assert.equal(rows[0]?.feedback, "maybe add filters");
  assert.equal(rows[0]?.type, "Suggestion");
});
