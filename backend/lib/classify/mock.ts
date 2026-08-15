import { createHash } from "node:crypto";
import { classifyHeuristically } from "./heuristic";
import type { ClassifiedRow } from "./schema";

// Purpose: deterministic classification data + heuristic fallback for demo reliability.
// Context: used by DEMO_MODE=mock and DEMO_MODE=fallback error paths.
const seeded_rows: ClassifiedRow[] = [
  {
    person: "Priya",
    feedback:
      "The notification card feels cramped on mobile, especially with three action buttons stacked vertically.",
    type: "Thoughts",
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
    type: "Thoughts",
    critique_lens: "High - Underlying model, business rules and logic",
  },
  {
    person: "Priya",
    feedback:
      "What if clicking the assignee's avatar opened a quick preview of their other open tickets?",
    type: "Suggestion",
    critique_lens: "High - User need/problem",
  },
  {
    person: "Sam",
    feedback:
      'Color contrast on the "Resolved" tag fails WCAG AA against this background - worth checking the palette.',
    type: "Thoughts",
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
    type: "Suggestion",
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

  return classifyHeuristically(comments);
}

// Normalizes comment arrays into a deterministic hash for seeded fixture matching.
function hash_comments(comment_feedback_list: string[]): string {
  return createHash("sha256")
    .update(JSON.stringify(comment_feedback_list.map((item) => item.trim())))
    .digest("hex");
}
