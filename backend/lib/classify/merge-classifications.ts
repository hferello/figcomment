import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { FlattenedComment } from "./pii-redact";
import type { ClassifiedRow } from "./schema";

const ai_row_schema = z.object({
  id: z.string().uuid(),
  type: z.enum(["Thoughts", "Suggestion", "Action", "Red flag", "Note"]),
  critique_lens: z.enum([
    "Low - Visual design",
    "Low - Interaction design",
    "Medium - Flow and information design",
    "High - Underlying model, business rules and logic",
    "High - User need/problem",
    "High - Business opportunity/problem",
  ]),
});

export const ai_response_schema = z.object({
  rows: z.array(ai_row_schema),
});

export type PromptCommentRow = {
  id: string;
  person: string;
  feedback: string;
};

export function attachPromptIds(
  comments: FlattenedComment[],
): PromptCommentRow[] {
  return comments.map((comment) => ({
    id: randomUUID(),
    person: comment.person,
    feedback: comment.feedback,
  }));
}

export function mergeRowsWithExactIdSet(
  prompt_rows: PromptCommentRow[],
  ai_rows: z.infer<typeof ai_row_schema>[],
): ClassifiedRow[] {
  const expected_ids = new Set(prompt_rows.map((row) => row.id));
  const seen_ids = new Set<string>();

  for (const row of ai_rows) {
    if (!expected_ids.has(row.id) || seen_ids.has(row.id)) {
      throw new Error("classification_failed");
    }
    seen_ids.add(row.id);
  }

  if (seen_ids.size !== expected_ids.size) {
    throw new Error("classification_failed");
  }

  const lookup = new Map(ai_rows.map((row) => [row.id, row]));
  return prompt_rows.map((prompt_row) => {
    const ai_row = lookup.get(prompt_row.id);
    if (!ai_row) {
      throw new Error("classification_failed");
    }
    return {
      person: prompt_row.person,
      feedback: prompt_row.feedback,
      type: ai_row.type,
      critique_lens: ai_row.critique_lens,
    };
  });
}
