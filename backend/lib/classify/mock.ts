import { createHash } from "node:crypto";
import type { ClassifiedRow } from "./schema";

// Purpose: deterministic classification data + heuristic fallback for demo reliability.
// Context: used by DEMO_MODE=mock and DEMO_MODE=fallback error paths.
const seeded_rows: ClassifiedRow[] = [
  {
    person: "Priya",
    feedback:
      "The notification card feels cramped on mobile, especially with three action buttons stacked vertically.",
    type: "Comment",
    critique_lens: "Low - Visual design",
  },
  {
    person: "Marcus",
    feedback:
      "Can we add a way to snooze a notification instead of only dismissing it?",
    type: "Suggestion",
    critique_lens: "High - User need/problem",
  },
  {
    person: "Elena",
    feedback:
      "Move the Jira issue key to the top of the card so it's the first thing people see.",
    type: "Action",
    critique_lens: "Low - Visual design",
  },
  {
    person: "Devon",
    feedback:
      'Not clear what "Sync" actually does here - is it pulling new comments or pushing our reply back to Jira?',
    type: "Comment",
    critique_lens: "High - Underlying model, business rules and logic",
  },
  {
    person: "Priya",
    feedback:
      "What if clicking the assignee's avatar opened a quick preview of their other open tickets?",
    type: "Idea",
    critique_lens: "High - User need/problem",
  },
  {
    person: "Sam",
    feedback:
      'Color contrast on the "Resolved" tag fails WCAG AA against this background - worth checking the palette.',
    type: "Comment",
    critique_lens: "Low - Visual design",
  },
  {
    person: "Marcus",
    feedback:
      "Add an unread state so people can tell which threads they haven't looked at yet.",
    type: "Action",
    critique_lens: "Low - Interaction design",
  },
  {
    person: "Elena",
    feedback:
      "For teams with high ticket volume this could get noisy fast - maybe batch notifications per project?",
    type: "Suggestion",
    critique_lens: "High - Business opportunity/problem",
  },
  {
    person: "Devon",
    feedback:
      "Would be great to react with emoji directly on the Jira comment from inside Slack.",
    type: "Idea",
    critique_lens: "Medium - Flow and information design",
  },
  {
    person: "Sam",
    feedback:
      'Button labels are inconsistent - "View Issue" vs "Open Ticket," pick one and standardize.',
    type: "Action",
    critique_lens: "Low - Visual design",
  },
];

const seeded_hash = hash_comments(seeded_rows.map((row) => row.feedback));

// Returns stable seeded output for known demo comments, otherwise heuristic mapping.
export function mock_rows_for_comments(
  comments: Array<{ person: string; feedback: string }>,
): ClassifiedRow[] {
  const input_hash = hash_comments(comments.map((comment) => comment.feedback));
  if (input_hash === seeded_hash && comments.length === seeded_rows.length) {
    return seeded_rows;
  }

  return comments.map((comment) => {
    const normalized_feedback = comment.feedback.toLowerCase();
    return {
      person: comment.person || "Unknown",
      feedback: comment.feedback,
      type: guess_type(normalized_feedback),
      critique_lens: guess_lens(normalized_feedback),
    };
  });
}

// Infers feedback type using lightweight phrase rules for non-seeded comments.
function guess_type(normalized_feedback: string): ClassifiedRow["type"] {
  if (
    normalized_feedback.startsWith("move ") ||
    normalized_feedback.startsWith("add ")
  ) {
    return "Action";
  }

  if (normalized_feedback.includes("what if")) {
    return "Idea";
  }

  if (
    normalized_feedback.includes("could") ||
    normalized_feedback.includes("maybe") ||
    normalized_feedback.includes("can we")
  ) {
    return "Suggestion";
  }

  return "Comment";
}

// Maps feedback text into the merged critique lens taxonomy.
function guess_lens(normalized_feedback: string): ClassifiedRow["critique_lens"] {
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

// Normalizes comment arrays into a deterministic hash for seeded fixture matching.
function hash_comments(comment_feedback_list: string[]): string {
  return createHash("sha256")
    .update(JSON.stringify(comment_feedback_list.map((item) => item.trim())))
    .digest("hex");
}
