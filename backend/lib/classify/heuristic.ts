import type { ClassifiedRow } from "./schema";

export function guessType(normalized_feedback: string): ClassifiedRow["type"] {
  if (
    normalized_feedback.includes("red flag") ||
    normalized_feedback.includes("blocker") ||
    normalized_feedback.includes("blocked") ||
    normalized_feedback.includes("blocking") ||
    normalized_feedback.includes("serious risk") ||
    normalized_feedback.includes("will break") ||
    normalized_feedback.includes("cannot ship") ||
    normalized_feedback.includes("can't ship")
  ) {
    return "Red flag";
  }

  if (
    normalized_feedback.startsWith("note:") ||
    normalized_feedback.includes("remember that") ||
    normalized_feedback.includes("keep in mind") ||
    normalized_feedback.includes("for reference") ||
    normalized_feedback.includes("heads up") ||
    normalized_feedback.includes("fyi")
  ) {
    return "Note";
  }

  if (
    normalized_feedback.startsWith("move ") ||
    normalized_feedback.startsWith("add ")
  ) {
    return "Action";
  }

  if (
    normalized_feedback.includes("what if") ||
    normalized_feedback.includes("could") ||
    normalized_feedback.includes("maybe") ||
    normalized_feedback.includes("can we")
  ) {
    return "Suggestion";
  }

  return "Thoughts";
}

export function guessLens(
  normalized_feedback: string,
): ClassifiedRow["critique_lens"] {
  if (
    normalized_feedback.includes("business") ||
    normalized_feedback.includes("team") ||
    normalized_feedback.includes("volume")
  ) {
    return "High - Business opportunity/problem";
  }

  if (
    normalized_feedback.includes("not clear") ||
    normalized_feedback.includes("logic") ||
    normalized_feedback.includes("rule") ||
    normalized_feedback.includes("sync")
  ) {
    return "High - Underlying model, business rules and logic";
  }

  if (
    normalized_feedback.includes("user") ||
    normalized_feedback.includes("snooze") ||
    normalized_feedback.includes("need") ||
    normalized_feedback.includes("problem")
  ) {
    return "High - User need/problem";
  }

  if (
    normalized_feedback.includes("flow") ||
    normalized_feedback.includes("batch") ||
    normalized_feedback.includes("inside slack")
  ) {
    return "Medium - Flow and information design";
  }

  if (
    normalized_feedback.includes("hover") ||
    normalized_feedback.includes("click") ||
    normalized_feedback.includes("unread state") ||
    normalized_feedback.includes("interaction")
  ) {
    return "Low - Interaction design";
  }

  return "Low - Visual design";
}

export function classifyHeuristically(
  comments: Array<{ person: string; feedback: string }>,
): ClassifiedRow[] {
  return comments.map((comment) => {
    const normalized_feedback = comment.feedback.toLowerCase();
    return {
      person: comment.person || "Unknown",
      feedback: comment.feedback,
      type: guessType(normalized_feedback),
      critique_lens: guessLens(normalized_feedback),
    };
  });
}
