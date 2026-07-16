// Purpose: Figma plugin runtime that requests classified comments and renders a canvas table.
// Context: UI sends run command -> plugin fetches backend rows -> plugin draws auto-layout table.
// Intent: keep plugin logic explicit so demo behavior is easy to narrate and debug live.
type CritiqueLens =
  | "Low - Visual design"
  | "Low - Interaction design"
  | "Medium - Flow and information design"
  | "High - Underlying model, business rules and logic"
  | "High - User need/problem"
  | "High - Business opportunity/problem";

type FeedbackType = "Comment" | "Suggestion" | "Action" | "Idea";

type ClassifiedRow = {
  person: string;
  feedback: string;
  type: FeedbackType;
  critique_lens: CritiqueLens;
};

type ClassifyResponse = {
  rows: ClassifiedRow[];
  meta: {
    mode: "live" | "mock" | "fallback";
    latency_ms: number;
  };
};

type UiRunMessage = {
  type: "run_analysis";
};

const DEFAULT_BACKEND_URL = "http://localhost:3000/api/classify";
const FONT_REGULAR: FontName = { family: "Inter", style: "Regular" };
const FONT_BOLD: FontName = { family: "Inter", style: "Bold" };

figma.showUI(__html__, { width: 360, height: 220 });

// Accepts validated UI commands and triggers the full analysis/render pipeline.
figma.ui.onmessage = async (message: unknown) => {
  if (!isUiRunMessage(message)) {
    return;
  }

  await runAnalysis();
};

// Coordinates file lookup, backend classification, and canvas rendering.
async function runAnalysis(): Promise<void> {
  try {
    postStatus("Checking active file context...");

    const file_key = figma.fileKey;
    if (!file_key) {
      throw new Error(
        "File key is unavailable. Use a private plugin with enablePrivatePluginApi enabled.",
      );
    }

    const configured_backend_url = await figma.clientStorage.getAsync(
      "backend_url",
    );
    const backend_url =
      typeof configured_backend_url === "string" && configured_backend_url.length > 0
        ? configured_backend_url
        : DEFAULT_BACKEND_URL;

    // Fetch first so we only mutate canvas if we have valid rows to render.
    postStatus("Fetching and classifying comments...");
    const classify_response = await fetchClassification(backend_url, file_key);

    if (classify_response.rows.length === 0) {
      throw new Error("No comments were returned for this file.");
    }

    postStatus("Drawing table in Figma...");
    const table_node = await drawTable(classify_response.rows);

    figma.currentPage.selection = [table_node];
    figma.viewport.scrollAndZoomIntoView([table_node]);

    postComplete(
      `Done. Rendered ${classify_response.rows.length} rows (${classify_response.meta.mode} mode).`,
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    figma.ui.postMessage({ type: "error", message });
  }
}

// Calls backend classifier endpoint and validates payload shape at runtime.
async function fetchClassification(
  backend_url: string,
  file_key: string,
): Promise<ClassifyResponse> {
  const response = await fetch(backend_url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_key }),
  });

  if (!response.ok) {
    const body_text = await response.text();
    throw new Error(`Backend request failed (${response.status}): ${body_text}`);
  }

  const payload: unknown = await response.json();
  if (!isClassifyResponse(payload)) {
    throw new Error("Backend response shape is invalid.");
  }

  return payload;
}

// Builds the parent table frame and appends header/body rows.
async function drawTable(rows: ClassifiedRow[]): Promise<FrameNode> {
  await figma.loadFontAsync(FONT_REGULAR);
  await figma.loadFontAsync(FONT_BOLD);

  const table_frame = figma.createFrame();
  table_frame.name = "Comment Intelligence Table";
  table_frame.layoutMode = "VERTICAL";
  table_frame.primaryAxisSizingMode = "AUTO";
  table_frame.counterAxisSizingMode = "AUTO";
  table_frame.itemSpacing = 0;
  table_frame.paddingLeft = 0;
  table_frame.paddingRight = 0;
  table_frame.paddingTop = 0;
  table_frame.paddingBottom = 0;
  table_frame.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
  table_frame.strokes = [{ type: "SOLID", color: { r: 0.86, g: 0.88, b: 0.91 } }];
  table_frame.strokeWeight = 1;
  table_frame.cornerRadius = 8;

  const header_row = createRow(
    ["Person", "Feedback", "Type", "Critique Lens"],
    true,
  );
  table_frame.appendChild(header_row);

  for (const row of rows) {
    const row_node = createRow(
      [row.person, row.feedback, row.type, row.critique_lens],
      false,
    );
    table_frame.appendChild(row_node);
  }

  const center = figma.viewport.center;
  table_frame.x = center.x - table_frame.width / 2;
  table_frame.y = center.y - table_frame.height / 2;

  figma.currentPage.appendChild(table_frame);
  return table_frame;
}

// Creates one row with fixed-width cells so output is readable in recordings.
function createRow(values: string[], is_header: boolean): FrameNode {
  const row_frame = figma.createFrame();
  row_frame.layoutMode = "HORIZONTAL";
  row_frame.primaryAxisSizingMode = "AUTO";
  row_frame.counterAxisSizingMode = "AUTO";
  row_frame.itemSpacing = 0;
  row_frame.fills = [
    {
      type: "SOLID",
      color: is_header
        ? { r: 0.95, g: 0.97, b: 1 }
        : {
            r: 1,
            g: 1,
            b: 1,
          },
    },
  ];
  row_frame.strokes = [{ type: "SOLID", color: { r: 0.9, g: 0.91, b: 0.94 } }];
  row_frame.strokeTopWeight = 0;
  row_frame.strokeRightWeight = 0;
  row_frame.strokeLeftWeight = 0;
  row_frame.strokeBottomWeight = 1;

  const cell_widths = [140, 400, 120, 320];
  values.forEach((value, index) => {
    const cell = figma.createFrame();
    cell.layoutMode = "VERTICAL";
    cell.primaryAxisSizingMode = "FIXED";
    cell.counterAxisSizingMode = "FIXED";
    cell.resize(cell_widths[index] ?? 120, 54);
    cell.paddingLeft = 10;
    cell.paddingRight = 10;
    cell.paddingTop = 8;
    cell.paddingBottom = 8;
    cell.fills = [];
    cell.strokes = [{ type: "SOLID", color: { r: 0.9, g: 0.91, b: 0.94 } }];
    cell.strokeTopWeight = 0;
    cell.strokeBottomWeight = 0;
    cell.strokeLeftWeight = 0;
    cell.strokeRightWeight = index === values.length - 1 ? 0 : 1;

    const text_node = figma.createText();
    text_node.fontName = is_header ? FONT_BOLD : FONT_REGULAR;
    text_node.fontSize = is_header ? 12 : 11;
    text_node.characters = value;
    text_node.textAutoResize = "WIDTH_AND_HEIGHT";
    text_node.fills = [{ type: "SOLID", color: { r: 0.13, g: 0.16, b: 0.2 } }];

    cell.appendChild(text_node);
    row_frame.appendChild(cell);
  });

  return row_frame;
}

// Sends progress updates to UI for clear demo narration.
function postStatus(message: string): void {
  figma.ui.postMessage({ type: "status", message });
}

// Sends completion updates to UI after table render succeeds.
function postComplete(message: string): void {
  figma.ui.postMessage({ type: "complete", message });
}

// Guards plugin message handling to known command shapes.
function isUiRunMessage(value: unknown): value is UiRunMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (!("type" in value)) {
    return false;
  }

  return (value as Record<string, unknown>).type === "run_analysis";
}

// Minimal response guard to avoid rendering malformed backend payloads.
function isClassifyResponse(value: unknown): value is ClassifyResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const maybe_response = value as Record<string, unknown>;
  if (!Array.isArray(maybe_response.rows)) {
    return false;
  }

  if (typeof maybe_response.meta !== "object" || maybe_response.meta === null) {
    return false;
  }

  return true;
}
