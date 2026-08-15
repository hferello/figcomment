// Purpose: Figma plugin runtime that requests classified comments and renders canvas outputs.
// Context: UI sends run command -> plugin fetches backend rows -> plugin draws table/notes/CSV.
// Intent: keep plugin logic explicit so demo behavior is easy to narrate and debug live.
import dayjs from "dayjs";
import {
  type ClassifiedRow,
  type ClassifyResponse,
  isClassifyResponse,
} from "./classify-response-guard";
import { parseFigmaFileUrl } from "./figma-file-url";

type CritiqueLens =
  | "Low - Visual design"
  | "Low - Interaction design"
  | "Medium - Flow and information design"
  | "High - Underlying model, business rules and logic"
  | "High - User need/problem"
  | "High - Business opportunity/problem";

type RgbColor = { r: number; g: number; b: number };

// Official FigJam sticky palette — hex/255 keeps exact palette color values.
function figjamStickyColor(red: number, green: number, blue: number): RgbColor {
  return { r: red / 255, g: green / 255, b: blue / 255 };
}

const FIGJAM_STICKY = {
  yellow: figjamStickyColor(0xff, 0xe2, 0x99),
  blue: figjamStickyColor(0xa8, 0xda, 0xff),
  green: figjamStickyColor(0xb3, 0xef, 0xbd),
  teal: figjamStickyColor(0xb3, 0xf4, 0xef),
  violet: figjamStickyColor(0xd3, 0xbd, 0xff),
  pink: figjamStickyColor(0xff, 0xa8, 0xdb),
  red: figjamStickyColor(0xff, 0xb8, 0xa8),
  orange: figjamStickyColor(0xff, 0xd3, 0xa8),
};

type ThemeStyle = {
  section_bg: RgbColor;
  header_accent: RgbColor;
  note_fill: RgbColor;
};

const LENS_DISPLAY_ORDER: CritiqueLens[] = [
  "Low - Visual design",
  "Low - Interaction design",
  "Medium - Flow and information design",
  "High - Underlying model, business rules and logic",
  "High - User need/problem",
  "High - Business opportunity/problem",
];

const THEME_STYLES: Record<CritiqueLens, ThemeStyle> = {
  "Low - Visual design": {
    section_bg: { r: 0.98, g: 0.96, b: 0.88 },
    header_accent: { r: 0.95, g: 0.78, b: 0.2 },
    note_fill: FIGJAM_STICKY.yellow,
  },
  "Low - Interaction design": {
    section_bg: { r: 0.93, g: 0.96, b: 1 },
    header_accent: { r: 0.22, g: 0.56, b: 0.96 },
    note_fill: FIGJAM_STICKY.blue,
  },
  "Medium - Flow and information design": {
    section_bg: { r: 0.93, g: 0.98, b: 0.94 },
    header_accent: { r: 0.18, g: 0.66, b: 0.45 },
    note_fill: FIGJAM_STICKY.green,
  },
  "High - Underlying model, business rules and logic": {
    section_bg: { r: 0.96, g: 0.93, b: 0.99 },
    header_accent: { r: 0.58, g: 0.33, b: 0.84 },
    note_fill: FIGJAM_STICKY.violet,
  },
  "High - User need/problem": {
    section_bg: { r: 0.99, g: 0.94, b: 0.94 },
    header_accent: { r: 0.86, g: 0.3, b: 0.33 },
    note_fill: FIGJAM_STICKY.red,
  },
  "High - Business opportunity/problem": {
    section_bg: { r: 0.98, g: 0.94, b: 0.9 },
    header_accent: { r: 0.86, g: 0.55, b: 0.18 },
    note_fill: FIGJAM_STICKY.orange,
  },
};

const DEFAULT_THEME_STYLE: ThemeStyle = {
  section_bg: { r: 0.97, g: 0.97, b: 0.97 },
  header_accent: { r: 0.45, g: 0.45, b: 0.45 },
  note_fill: FIGJAM_STICKY.yellow,
};

type FeedbackType =
  | "Thoughts"
  | "Suggestion"
  | "Action"
  | "Red flag"
  | "Note";

const FEEDBACK_TYPE_EMOJI: Record<FeedbackType, string> = {
  Thoughts: "💭",
  Suggestion: "💡",
  Action: "✅",
  "Red flag": "🚩",
  Note: "📝",
};

// Matches FigJam sticky depth: soft blur, high vertical offset, square corners.
const FIGJAM_STICKY_DROP_SHADOW: DropShadowEffect = {
  type: "DROP_SHADOW",
  color: { r: 0, g: 0, b: 0, a: 0.06 },
  offset: { x: 0, y: 3 },
  radius: 12,
  spread: 0,
  visible: true,
  blendMode: "NORMAL",
};

type OutputFormat = "table" | "sticky_notes" | "csv";
type SortMethod = "heuristic" | "ai";

type UiRunMessage = {
  type: "run_analysis";
  output_format: OutputFormat;
};

type UiSaveSettingsMessage = {
  type: "save_settings";
  file_url: string;
  sort_method: SortMethod;
};

type UiSaveTokenMessage = {
  type: "save_token";
  plugin_token: string;
};

type UiClearTokenMessage = {
  type: "clear_token";
};

type UiResizeMessage = {
  type: "resize_ui";
  height: number;
};

type UiOpenExternalMessage = {
  type: "open_external";
  href: string;
};

type UiMessage =
  | UiRunMessage
  | UiSaveSettingsMessage
  | UiSaveTokenMessage
  | UiClearTokenMessage
  | UiResizeMessage
  | UiOpenExternalMessage;

const CLASSIFY_API_URL = "https://comment-sort.vercel.app/api/classify";
const PLUGIN_TOKEN_STORAGE_KEY = "plugin_token";
const FILE_URL_STORAGE_KEY = "file_url";
const SORT_METHOD_STORAGE_KEY = "sort_method";
const FONT_REGULAR: FontName = { family: "Inter", style: "Regular" };
const FONT_BOLD: FontName = { family: "Inter", style: "Bold" };

const PLUGIN_UI_WIDTH = 360;
const PLUGIN_UI_CONNECT_HEIGHT = 330;

figma.showUI(__html__, {
  width: PLUGIN_UI_WIDTH,
  height: PLUGIN_UI_CONNECT_HEIGHT,
});

void bootstrapAuthState();

// Routes UI commands to token setup or the existing analysis pipeline.
figma.ui.onmessage = async (message: unknown) => {
  if (!isUiMessage(message)) {
    return;
  }

  if (message.type === "save_token") {
    await savePluginToken(message.plugin_token);
    return;
  }

  if (message.type === "save_settings") {
    await savePluginSettings(message.file_url, message.sort_method);
    return;
  }

  if (message.type === "clear_token") {
    await clearPluginToken();
    return;
  }

  if (message.type === "open_external") {
    openExternal(message.href);
    return;
  }

  if (message.type === "resize_ui") {
    figma.ui.resize(PLUGIN_UI_WIDTH, message.height);
    return;
  }

  await runAnalysis(message.output_format);
};

// Coordinates file lookup, backend classification, and canvas rendering.
async function runAnalysis(output_format: OutputFormat): Promise<void> {
  let current_step = "initializing";
  try {
    current_step = "checking_file_context";
    postStatus("🔍 Parsing file URL...");

    const file_url = await getStoredFileUrl();
    if (!file_url) {
      throw new Error("Paste a Figma file URL before running analysis.");
    }

    const { file_key } = parseFigmaFileUrl(file_url);
    const sort_method = await getStoredSortMethod();

    const plugin_token = await getStoredPluginToken();

    if (!plugin_token) {
      throw new Error(
        "Connect your plugin token first. Paste it from your web profile.",
      );
    }

    // Fetch first so we only mutate canvas if we have valid rows to render.
    current_step = "requesting_classification";
    postStatus("🤠 Herding comments...");
    const classify_response = await fetchClassification(
      file_key,
      plugin_token,
      sort_method,
    );

    if (classify_response.rows.length === 0) {
      throw new Error("🦗 Crickets. This file has no comments to classify.");
    }

    current_step = "drawing_output";
    postStatus(`🔧 Assembling your ${output_format.replace("_", " ")} like IKEA furniture...`);

    if (output_format === "csv") {
      exportCsv(classify_response.rows);
      postComplete(
        `🎉 Boom! ${classify_response.rows.length} rows wrangled into a CSV.`,
      );
      return;
    }

    const output_node =
      output_format === "sticky_notes"
        ? await drawStickyNotes(classify_response.rows)
        : await drawTable(classify_response.rows);

    figma.currentPage.selection = [output_node];
    figma.viewport.scrollAndZoomIntoView([output_node]);

    const output_label =
      output_format === "sticky_notes" ? "sticky note sections" : "table rows";

    postComplete(
      `🎉 Boom! ${classify_response.rows.length} ${output_label} served up.`,
    );
  } catch (error: unknown) {
    const message = formatUnknownError(error);
    console.error("[runAnalysis] error", {
      current_step,
      error,
    });
    figma.ui.postMessage({ type: "error", message });
  }
}

// Calls backend classifier endpoint and validates payload shape at runtime.
async function fetchClassification(
  file_key: string,
  plugin_token: string,
  sort_method: SortMethod,
): Promise<ClassifyResponse> {
  let response: FetchResponse;
  try {
    response = await fetch(CLASSIFY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${plugin_token}`,
      },
      body: JSON.stringify({ file_key, sort_method }),
    });
  } catch {
    throw new Error(
      "Could not reach Comment Sort. Check your connection and try again.",
    );
  }

  if (!response.ok) {
    const body_text = await response.text();
    const backend_message = formatBackendErrorMessage(body_text, response.status);
    throw new Error(backend_message);
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

  const table_frame = createLayoutFrame();
  table_frame.name = "Comment Sort Table";
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
      [row.person, row.feedback, formatFeedbackType(row.type), formatCritiqueLens(row.critique_lens)],
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

// Groups classified rows into themed sections and renders sticky-note clusters.
async function drawStickyNotes(rows: ClassifiedRow[]): Promise<FrameNode> {
  await figma.loadFontAsync(FONT_REGULAR);
  await figma.loadFontAsync(FONT_BOLD);

  const board_frame = createLayoutFrame();
  board_frame.name = "Comment Sort Sticky Notes";
  const grouped_rows = groupRowsByLens(rows);
  const board_width = getStickyNotesBoardWidth(
    getMaxCommentsPerSection(grouped_rows),
  );
  board_frame.layoutMode = "VERTICAL";
  board_frame.resize(board_width, 1);
  board_frame.primaryAxisSizingMode = "AUTO";
  board_frame.counterAxisSizingMode = "FIXED";
  board_frame.itemSpacing = 24;
  board_frame.paddingLeft = 24;
  board_frame.paddingRight = 24;
  board_frame.paddingTop = 24;
  board_frame.paddingBottom = 24;
  board_frame.fills = [{ type: "SOLID", color: { r: 0.98, g: 0.99, b: 1 } }];
  board_frame.cornerRadius = 12;

  for (const lens of LENS_DISPLAY_ORDER) {
    const section_rows = grouped_rows.get(lens);
    if (!section_rows || section_rows.length === 0) {
      continue;
    }

    const theme_style = getThemeStyle(lens);
    const theme_label = formatCritiqueLens(lens);
    const section_frame = createLayoutFrame();
    section_frame.name = `Theme: ${theme_label}`;
    section_frame.layoutMode = "VERTICAL";
    section_frame.primaryAxisSizingMode = "AUTO";
    section_frame.counterAxisSizingMode = "FIXED";
    section_frame.itemSpacing = 16;
    section_frame.paddingLeft = 16;
    section_frame.paddingRight = 16;
    section_frame.paddingTop = 16;
    section_frame.paddingBottom = 16;
    section_frame.fills = [
      { type: "SOLID", color: theme_style.section_bg },
    ];
    section_frame.cornerRadius = 10;

    const header_frame = createLayoutFrame();
    header_frame.name = "Theme header";
    header_frame.layoutMode = "VERTICAL";
    header_frame.primaryAxisSizingMode = "AUTO";
    header_frame.counterAxisSizingMode = "AUTO";
    header_frame.itemSpacing = 6;
    header_frame.paddingLeft = 0;
    header_frame.paddingRight = 0;
    header_frame.paddingTop = 12;
    header_frame.paddingBottom = 12;
    header_frame.fills = [];
    header_frame.cornerRadius = 8;

    const title_node = createTextNode(theme_label, FONT_BOLD, 14, {
      r: 0.13,
      g: 0.16,
      b: 0.2,
    });
    const summary_node = createTextNode(
      summarizeTheme(theme_label, section_rows),
      FONT_REGULAR,
      11,
      { r: 0.2, g: 0.24, b: 0.3 },
    );
    header_frame.appendChild(title_node);
    header_frame.appendChild(summary_node);
    summary_node.layoutSizingHorizontal = "FILL";
    section_frame.appendChild(header_frame);
    header_frame.layoutSizingHorizontal = "FILL";

    const comments_frame = createLayoutFrame();
    comments_frame.name = "Comments";
    comments_frame.layoutMode = "HORIZONTAL";
    comments_frame.primaryAxisSizingMode = "FIXED";
    comments_frame.counterAxisSizingMode = "AUTO";
    comments_frame.layoutWrap = "WRAP";
    comments_frame.itemSpacing = 16;
    comments_frame.counterAxisSpacing = 16;
    comments_frame.resize(board_width - 80, 1);
    comments_frame.fills = [];

    for (const row of section_rows) {
      const comment_card = createCommentCard(row, theme_style.note_fill);
      comments_frame.appendChild(comment_card);
      comment_card.layoutSizingVertical = "HUG";
    }

    section_frame.appendChild(comments_frame);
    comments_frame.layoutSizingHorizontal = "FILL";
    board_frame.appendChild(section_frame);
    section_frame.layoutSizingHorizontal = "FILL";
  }

  appendUnmappedLensSections(board_frame, grouped_rows);

  const center = figma.viewport.center;
  board_frame.x = center.x - board_frame.width / 2;
  board_frame.y = center.y - board_frame.height / 2;

  figma.currentPage.appendChild(board_frame);
  return board_frame;
}

// Creates one comment card for a classified row inside a themed section.
function createCommentCard(row: ClassifiedRow, card_fill: RgbColor): FrameNode {
  const comment_frame = createLayoutFrame();
  comment_frame.name = "Comment";
  comment_frame.layoutMode = "VERTICAL";
  comment_frame.resize(150, 1);
  comment_frame.primaryAxisSizingMode = "AUTO";
  comment_frame.counterAxisSizingMode = "FIXED";
  comment_frame.itemSpacing = 6;
  comment_frame.paddingLeft = 12;
  comment_frame.paddingRight = 12;
  comment_frame.paddingTop = 12;
  comment_frame.paddingBottom = 12;
  comment_frame.fills = [{ type: "SOLID", color: card_fill }];
  comment_frame.cornerRadius = 0;
  comment_frame.effects = [FIGJAM_STICKY_DROP_SHADOW];

  const text_color = { r: 0.13, g: 0.16, b: 0.2 };

  const author_node = createTextNode(
    `${row.person} said`,
    FONT_BOLD,
    11,
    text_color,
  );
  const feedback_node = createTextNode(row.feedback, FONT_REGULAR, 11, text_color);

  comment_frame.appendChild(author_node);
  comment_frame.appendChild(feedback_node);
  feedback_node.layoutSizingHorizontal = "FILL";
  return comment_frame;
}

// Serializes classified rows and asks the plugin UI to download a CSV file.
function exportCsv(rows: ClassifiedRow[]): void {
  const csv_content = rowsToCsv(rows);
  const export_date = dayjs().format("YYYY-MM-DD");

  figma.ui.postMessage({
    type: "download_csv",
    csv: csv_content,
    filename: `comment-sort-export-${export_date}.csv`,
  });
}

// Converts classified rows into RFC4180-style CSV content.
function rowsToCsv(rows: ClassifiedRow[]): string {
  const headers = ["Person", "Feedback", "Type", "Critique Lens"];
  const lines = rows.map((row) =>
    [
      escapeCsvField(row.person),
      escapeCsvField(row.feedback),
      escapeCsvField(row.type),
      escapeCsvField(formatCritiqueLens(row.critique_lens)),
    ].join(","),
  );

  return [headers.join(","), ...lines].join("\n");
}

// Escapes CSV values that contain commas, quotes, or line breaks.
function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

// Groups rows by critique lens so themed sections can be rendered together.
function groupRowsByLens(rows: ClassifiedRow[]): Map<string, ClassifiedRow[]> {
  const grouped_rows = new Map<string, ClassifiedRow[]>();

  for (const row of rows) {
    const existing_rows = grouped_rows.get(row.critique_lens) ?? [];
    existing_rows.push(row);
    grouped_rows.set(row.critique_lens, existing_rows);
  }

  return grouped_rows;
}

// Adds any unexpected critique lens values that were not in the display order list.
function appendUnmappedLensSections(
  board_frame: FrameNode,
  grouped_rows: Map<string, ClassifiedRow[]>,
): void {
  const known_lenses = new Set<string>(LENS_DISPLAY_ORDER);

  for (const [lens, section_rows] of grouped_rows.entries()) {
    if (known_lenses.has(lens) || section_rows.length === 0) {
      continue;
    }

    const theme_style = getThemeStyle(lens);
    const theme_label = formatCritiqueLens(lens);
    const section_frame = createLayoutFrame();
    section_frame.name = `Theme: ${theme_label}`;
    section_frame.layoutMode = "VERTICAL";
    section_frame.primaryAxisSizingMode = "AUTO";
    section_frame.counterAxisSizingMode = "FIXED";
    section_frame.itemSpacing = 16;
    section_frame.paddingLeft = 16;
    section_frame.paddingRight = 16;
    section_frame.paddingTop = 16;
    section_frame.paddingBottom = 16;
    section_frame.fills = [
      { type: "SOLID", color: theme_style.section_bg },
    ];
    section_frame.cornerRadius = 10;

    const header_frame = createLayoutFrame();
    header_frame.layoutMode = "VERTICAL";
    header_frame.primaryAxisSizingMode = "AUTO";
    header_frame.counterAxisSizingMode = "AUTO";
    header_frame.itemSpacing = 6;
    header_frame.paddingLeft = 0;
    header_frame.paddingRight = 0;
    header_frame.paddingTop = 12;
    header_frame.paddingBottom = 12;
    header_frame.fills = [];
    header_frame.cornerRadius = 8;
    header_frame.appendChild(
      createTextNode(theme_label, FONT_BOLD, 14, { r: 0.13, g: 0.16, b: 0.2 }),
    );
    const summary_node = createTextNode(
      summarizeTheme(theme_label, section_rows),
      FONT_REGULAR,
      11,
      { r: 0.2, g: 0.24, b: 0.3 },
    );
    header_frame.appendChild(summary_node);
    summary_node.layoutSizingHorizontal = "FILL";
    section_frame.appendChild(header_frame);
    header_frame.layoutSizingHorizontal = "FILL";

    const comments_frame = createLayoutFrame();
    comments_frame.name = "Comments";
    comments_frame.layoutMode = "HORIZONTAL";
    comments_frame.primaryAxisSizingMode = "FIXED";
    comments_frame.counterAxisSizingMode = "AUTO";
    comments_frame.layoutWrap = "WRAP";
    comments_frame.itemSpacing = 16;
    comments_frame.counterAxisSpacing = 16;
    comments_frame.resize(board_frame.width - 80, 1);
    comments_frame.fills = [];

    for (const row of section_rows) {
      const comment_card = createCommentCard(row, theme_style.note_fill);
      comments_frame.appendChild(comment_card);
      comment_card.layoutSizingVertical = "HUG";
    }

    section_frame.appendChild(comments_frame);
    comments_frame.layoutSizingHorizontal = "FILL";
    board_frame.appendChild(section_frame);
    section_frame.layoutSizingHorizontal = "FILL";
  }
}

// Returns the largest number of comments in any single themed section.
function getMaxCommentsPerSection(
  grouped_rows: Map<string, ClassifiedRow[]>,
): number {
  let max_comments = 0;

  for (const section_rows of grouped_rows.values()) {
    max_comments = Math.max(max_comments, section_rows.length);
  }

  return max_comments;
}

// Picks a fixed board width based on how many comments fit per section.
function getStickyNotesBoardWidth(max_comments_per_section: number): number {
  if (max_comments_per_section > 4) {
    return 750;
  }

  return 500;
}

// Builds a short section summary from grouped comment metadata.
function summarizeTheme(theme_label: string, rows: ClassifiedRow[]): string {
  const contributors = [...new Set(rows.map((row) => row.person))];
  const type_counts = rows.reduce<Record<string, number>>((counts, row) => {
    const type_label = formatFeedbackType(row.type);
    counts[type_label] = (counts[type_label] ?? 0) + 1;
    return counts;
  }, {});

  const type_summary = Object.entries(type_counts)
    .map(([type_label, count]) => `${count} ${type_label}`)
    .join(", ");

  const contributor_summary =
    contributors.length === 1
      ? contributors[0]
      : `${contributors.length} people (${contributors.slice(0, 3).join(", ")}${
          contributors.length > 3 ? ", ..." : ""
        })`;

  return `${rows.length} comment${
    rows.length === 1 ? "" : "s"
  } on ${theme_label.toLowerCase()} from ${contributor_summary}. Includes ${type_summary}.`;
}

// Strips altitude prefixes so section titles read cleanly on canvas.
function formatCritiqueLens(lens: string): string {
  return lens.replace(/^(Low|Medium|High) - /, "");
}

// Resolves section colors for a critique lens with a neutral fallback.
function getThemeStyle(lens: string): ThemeStyle {
  if (lens in THEME_STYLES) {
    return THEME_STYLES[lens as CritiqueLens];
  }

  return DEFAULT_THEME_STYLE;
}

// Creates a frame that does not clip child content such as drop shadows.
function createLayoutFrame(): FrameNode {
  const frame = figma.createFrame();
  frame.clipsContent = false;
  return frame;
}

// Creates a reusable text node with explicit font and color styling.
function createTextNode(
  value: string,
  font: FontName,
  font_size: number,
  color: RgbColor,
): TextNode {
  const text_node = figma.createText();
  text_node.fontName = font;
  text_node.fontSize = font_size;
  text_node.characters = value;
  text_node.textAutoResize = "HEIGHT";
  text_node.fills = [{ type: "SOLID", color }];
  return text_node;
}

// Creates one row with fixed-width cells so output is readable in recordings.
function createRow(values: string[], is_header: boolean): FrameNode {
  const row_frame = createLayoutFrame();
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
    const cell = createLayoutFrame();
    cell.layoutMode = "VERTICAL";
    cell.resize(cell_widths[index] ?? 120, 54);
    cell.primaryAxisSizingMode = "AUTO";
    cell.counterAxisSizingMode = "FIXED";
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
    text_node.textAutoResize = "HEIGHT";
    text_node.fills = [{ type: "SOLID", color: { r: 0.13, g: 0.16, b: 0.2 } }];

    cell.appendChild(text_node);
    text_node.layoutSizingHorizontal = "FILL";
    row_frame.appendChild(cell);
    cell.layoutSizingVertical = "FILL";
  });

  return row_frame;
}

// Prefixes each feedback type with a visual cue for quicker table scanning.
function formatFeedbackType(type: FeedbackType): string {
  return `${FEEDBACK_TYPE_EMOJI[type]} ${type}`;
}

// Sends progress updates to UI for clear demo narration.
function postStatus(message: string): void {
  figma.ui.postMessage({ type: "status", message });
}

// Sends completion updates to UI after table render succeeds.
function postComplete(message: string): void {
  figma.ui.postMessage({ type: "complete", message });
}

// Loads stored auth state on boot so the UI can show Connect or Analyse.
async function bootstrapAuthState(): Promise<void> {
  await figma.clientStorage.deleteAsync("backend_url");
  const plugin_token = await getStoredPluginToken();
  const file_url = await getStoredFileUrl();
  const sort_method = await getStoredSortMethod();
  postAuthState(Boolean(plugin_token), file_url, sort_method);
}

// Verifies and persists the plugin token before unlocking analysis actions.
async function savePluginToken(plugin_token: string): Promise<void> {
  const trimmed_token = plugin_token.trim();

  if (!trimmed_token.startsWith("fc_")) {
    figma.ui.postMessage({
      type: "connect_error",
      message:
        "Token must start with fc_. Copy your plugin token from your web profile.",
    });
    return;
  }

  const verify_url = deriveVerifyUrl(CLASSIFY_API_URL);

  let response: FetchResponse;
  try {
    response = await fetch(verify_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${trimmed_token}`,
      },
    });
  } catch {
    figma.ui.postMessage({
      type: "connect_error",
      message: "Could not reach Comment Sort. Check your connection and try again.",
    });
    return;
  }

  if (!response.ok) {
    const body_text = await response.text();
    figma.ui.postMessage({
      type: "connect_error",
      message: formatBackendErrorMessage(body_text, response.status),
    });
    return;
  }

  const payload: unknown = await response.json();
  const prefix = extractVerifyPrefix(payload);

  await figma.clientStorage.setAsync(PLUGIN_TOKEN_STORAGE_KEY, trimmed_token);

  const file_url = await getStoredFileUrl();
  const sort_method = await getStoredSortMethod();
  postAuthState(true, file_url, sort_method);
  figma.ui.postMessage({
    type: "connect_success",
    prefix,
  });
}

// Clears stored token and returns the UI to the Connect screen.
async function clearPluginToken(): Promise<void> {
  await figma.clientStorage.deleteAsync(PLUGIN_TOKEN_STORAGE_KEY);
  const file_url = await getStoredFileUrl();
  const sort_method = await getStoredSortMethod();
  postAuthState(false, file_url, sort_method);
}

async function savePluginSettings(
  file_url: string,
  sort_method: SortMethod,
): Promise<void> {
  await figma.clientStorage.setAsync(FILE_URL_STORAGE_KEY, file_url.trim());
  await figma.clientStorage.setAsync(SORT_METHOD_STORAGE_KEY, sort_method);
}

async function getStoredPluginToken(): Promise<string | null> {
  const stored_token = await figma.clientStorage.getAsync(
    PLUGIN_TOKEN_STORAGE_KEY,
  );

  if (typeof stored_token !== "string" || stored_token.trim().length === 0) {
    return null;
  }

  return stored_token.trim();
}

function deriveVerifyUrl(classify_url: string): string {
  if (classify_url.endsWith("/api/classify")) {
    return classify_url.replace(/\/api\/classify$/, "/api/plugin/verify");
  }

  return classify_url.replace(/\/api\/classify\/?$/, "/api/plugin/verify");
}

async function getStoredFileUrl(): Promise<string | null> {
  const stored = await figma.clientStorage.getAsync(FILE_URL_STORAGE_KEY);
  if (typeof stored !== "string" || stored.trim().length === 0) {
    return null;
  }
  return stored.trim();
}

async function getStoredSortMethod(): Promise<SortMethod> {
  const stored = await figma.clientStorage.getAsync(SORT_METHOD_STORAGE_KEY);
  if (stored === "ai" || stored === "heuristic") {
    return stored;
  }
  return "heuristic";
}

function postAuthState(
  connected: boolean,
  file_url: string | null,
  sort_method: SortMethod,
): void {
  figma.ui.postMessage({
    type: "auth_state",
    connected,
    file_url,
    sort_method,
  });
}

function extractVerifyPrefix(payload: unknown): string {
  if (typeof payload !== "object" || payload === null) {
    return "fc_";
  }

  const record = payload as Record<string, unknown>;
  if (typeof record.prefix === "string" && record.prefix.length > 0) {
    return record.prefix;
  }

  return "fc_";
}

function formatBackendErrorMessage(
  raw_error_body: string,
  status: number,
): string {
  const code = extractBackendErrorCode(raw_error_body);
  const backend_message = extractBackendErrorMessage(raw_error_body);

  if (status === 401 || code === "unauthorized") {
    return "Your plugin token is missing, invalid, or revoked. Copy a new one from your web profile.";
  }

  if (status === 403 || code === "email_not_confirmed") {
    return "Confirm your email on the web app, then try again.";
  }

  if (code === "missing_figma_token" || code === "missing_llm_key") {
    return "Save your credentials on your web profile before running analysis.";
  }

  if (code === "invalid_figma_token") {
    return "Your Figma token was rejected. Update your personal access token on your web profile.";
  }

  if (code === "invalid_credentials") {
    return "Your model API key was rejected. Update it on your web profile.";
  }

  if (code === "rate_limited" || code === "provider_rate_limited") {
    return "Too many requests. Wait a moment and try again.";
  }

  if (code === "provider_unavailable") {
    return "AI provider is unavailable right now. Try again, or switch to keyword sort.";
  }

  if (backend_message.length > 0) {
    return backend_message;
  }

  return `Backend request failed (${status}).`;
}

function extractBackendErrorCode(raw_error_body: string): string | null {
  try {
    const parsed = JSON.parse(raw_error_body) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "error" in parsed &&
      typeof (parsed as Record<string, unknown>).error === "object"
    ) {
      const error_field = (parsed as Record<string, unknown>).error as
        | Record<string, unknown>
        | null;
      if (error_field && typeof error_field.code === "string") {
        return error_field.code;
      }
    }
  } catch {
    return null;
  }

  return null;
}

// Guards plugin message handling to known command shapes.
function isUiMessage(value: unknown): value is UiMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (!("type" in value)) {
    return false;
  }

  const record = value as Record<string, unknown>;

  if (record.type === "save_token") {
    return typeof record.plugin_token === "string";
  }

  if (record.type === "save_settings") {
    return (
      typeof record.file_url === "string" &&
      (record.sort_method === "heuristic" || record.sort_method === "ai")
    );
  }

  if (record.type === "clear_token") {
    return true;
  }

  if (record.type === "resize_ui") {
    return typeof record.height === "number";
  }

  if (record.type === "open_external") {
    return typeof record.href === "string";
  }

  if (record.type !== "run_analysis") {
    return false;
  }

  return (
    record.output_format === "table" ||
    record.output_format === "sticky_notes" ||
    record.output_format === "csv"
  );
}

function openExternal(href: string): void {
  const parsed = safeParseHttpsUrl(href);
  if (!parsed) {
    return;
  }
  const host_allowed =
    parsed.hostname === "comment-sort.vercel.app" ||
    parsed.hostname === "figcomment.vercel.app";
  const path_allowed =
    parsed.pathname === "/" ||
    parsed.pathname === "/profile" ||
    parsed.pathname === "/privacy";
  if (!host_allowed || !path_allowed) {
    return;
  }
  figma.openExternal(parsed.href);
}

function safeParseHttpsUrl(
  value: string,
): { href: string; hostname: string; pathname: string } | null {
  const trimmed = value.trim();
  const match = trimmed.match(/^https:\/\/([^/?#]+)(\/[^?#]*)?/i);
  if (!match) {
    return null;
  }
  return {
    href: trimmed,
    hostname: (match[1] ?? "").toLowerCase(),
    pathname: match[2] ?? "/",
  };
}

function formatUnknownError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as Record<string, unknown>).message === "string"
  ) {
    return (error as Record<string, string>).message;
  }

  try {
    return `Unexpected error payload: ${JSON.stringify(error)}`;
  } catch {
    return "Unexpected error payload (non-serializable).";
  }
}

function extractBackendErrorMessage(raw_error_body: string): string {
  try {
    const parsed = JSON.parse(raw_error_body) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "error" in parsed &&
      typeof (parsed as Record<string, unknown>).error === "object"
    ) {
      const error_field = (parsed as Record<string, unknown>).error as
        | Record<string, unknown>
        | null;
      if (error_field && typeof error_field.message === "string") {
        return error_field.message;
      }
    }
  } catch {
    // If backend didn't return JSON, fall back to raw body.
  }

  return raw_error_body;
}
