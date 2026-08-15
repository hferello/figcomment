type Meta = {
  mode: "live" | "mock" | "fallback";
  sort_method: "heuristic" | "ai";
  provider: "openai" | "gemini" | "anthropic" | null;
  latency_ms: number;
};

export type ClassifiedRow = {
  person: string;
  feedback: string;
  type: "Thoughts" | "Suggestion" | "Action" | "Red flag" | "Note";
  critique_lens:
    | "Low - Visual design"
    | "Low - Interaction design"
    | "Medium - Flow and information design"
    | "High - Underlying model, business rules and logic"
    | "High - User need/problem"
    | "High - Business opportunity/problem";
};

export type ClassifyResponse = {
  rows: ClassifiedRow[];
  meta: Meta;
};

export function isClassifyResponse(value: unknown): value is ClassifyResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.rows) || typeof record.meta !== "object" || record.meta === null) {
    return false;
  }

  const meta = record.meta as Record<string, unknown>;
  if (
    (meta.mode !== "live" && meta.mode !== "mock" && meta.mode !== "fallback") ||
    (meta.sort_method !== "heuristic" && meta.sort_method !== "ai") ||
    (meta.provider !== null &&
      meta.provider !== "openai" &&
      meta.provider !== "gemini" &&
      meta.provider !== "anthropic") ||
    typeof meta.latency_ms !== "number"
  ) {
    return false;
  }

  return record.rows.every((row) => isRow(row));
}

function isRow(value: unknown): value is ClassifiedRow {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const row = value as Record<string, unknown>;
  return (
    typeof row.person === "string" &&
    typeof row.feedback === "string" &&
    (row.type === "Thoughts" ||
      row.type === "Suggestion" ||
      row.type === "Action" ||
      row.type === "Red flag" ||
      row.type === "Note") &&
    (row.critique_lens === "Low - Visual design" ||
      row.critique_lens === "Low - Interaction design" ||
      row.critique_lens === "Medium - Flow and information design" ||
      row.critique_lens === "High - Underlying model, business rules and logic" ||
      row.critique_lens === "High - User need/problem" ||
      row.critique_lens === "High - Business opportunity/problem")
  );
}
