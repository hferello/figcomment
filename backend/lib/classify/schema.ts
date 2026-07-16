import { z } from "zod";

// Purpose: single source of truth for request/response contracts used by route + plugin.
// Intent: fail fast on malformed data so UI rendering stays predictable.
export const feedback_type_schema = z.enum([
  "Thoughts",
  "Suggestion",
  "Action",
  "Idea",
]);

export const critique_lens_schema = z.enum([
  "Low - Visual design",
  "Low - Interaction design",
  "Medium - Flow and information design",
  "High - Underlying model, business rules and logic",
  "High - User need/problem",
  "High - Business opportunity/problem",
]);

export const classify_request_schema = z.object({
  file_key: z.string().min(1),
});

export const classified_row_schema = z.object({
  person: z.string().min(1),
  feedback: z.string().min(1),
  type: feedback_type_schema,
  critique_lens: critique_lens_schema,
});

export const classify_mode_schema = z.enum(["live", "mock", "fallback"]);

export const classify_response_schema = z.object({
  rows: z.array(classified_row_schema),
  meta: z.object({
    mode: classify_mode_schema,
    latency_ms: z.number().nonnegative(),
  }),
});

export type ClassifiedRow = z.infer<typeof classified_row_schema>;
export type ClassifyRequest = z.infer<typeof classify_request_schema>;
export type ClassifyResponse = z.infer<typeof classify_response_schema>;
export type ClassifyMode = z.infer<typeof classify_mode_schema>;
