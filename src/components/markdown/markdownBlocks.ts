// Bloques del texto: títulos, listas, tablas, citas y código.
type TableAlign = "left" | "center" | "right";

type Block =
  | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: "codeblock"; lang: string; code: string }
  | { type: "blockquote"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | {
      type: "table";
      headers: string[];
      alignments: TableAlign[];
      rows: string[][];
    }
  | { type: "paragraph"; text: string };

function parseCells(row: string): string[] {
  let trimmed = row.trim();
  if (trimmed.startsWith("|")) trimmed = trimmed.slice(1);
  if (trimmed.endsWith("|")) trimmed = trimmed.slice(0, -1);
  return trimmed.split("|").map((cell) => cell.trim());
}

function isDelimiterRow(row: string): boolean {
  const trimmed = row.trim();
  if (!trimmed.includes("-") || !trimmed.includes("|")) return false;
  const cells = parseCells(trimmed);
  if (cells.length === 0) return false;
  return cells.every((c) => /^:?-+:?$/.test(c));
}

function parseAlignment(cell: string): TableAlign {
  const trimmed = cell.trim();
  const starts = trimmed.startsWith(":");
  const ends = trimmed.endsWith(":");
  if (starts && ends) return "center";
  if (ends) return "right";
  return "left";
}

export function parseBlocks(markdown: string): Block[] {
  // Pre-split lines: if a single line contains multiple table rows joined by `| |`, split them so each row is a line
  const rawLines = markdown.split(/\r?\n/);
  const lines: string[] = [];
  for (const rawLine of rawLines) {
    if (rawLine.includes("|") && /(?<=\|)\s+(?=\|)/.test(rawLine)) {
      lines.push(...rawLine.split(/(?<=\|)\s+(?=\|)/));
    } else {
      lines.push(rawLine);
    }
  }

  const blocks: Block[] = [];
  let inCodeBlock = false;
  let codeBlockLang = "";
  let codeBlockContent: string[] = [];
  let currentList: { type: "ul" | "ol"; items: string[] } | null = null;
  let currentParagraph: string[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      blocks.push({
        type: "paragraph",
        text: currentParagraph.join(" ").trim(),
      });
      currentParagraph = [];
    }
  };

  const flushList = () => {
    if (currentList) {
      blocks.push(currentList);
      currentList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Check code blocks ```
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        blocks.push({
          type: "codeblock",
          lang: codeBlockLang,
          code: codeBlockContent.join("\n"),
        });
        inCodeBlock = false;
        codeBlockLang = "";
        codeBlockContent = [];
      } else {
        flushParagraph();
        flushList();
        inCodeBlock = true;
        codeBlockLang = trimmed.slice(3).trim();
        codeBlockContent = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(rawLine);
      continue;
    }

    // Blank line
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    // Table: A line containing pipes followed by a markdown delimiter row
    if (
      trimmed.includes("|") &&
      i + 1 < lines.length &&
      isDelimiterRow(lines[i + 1])
    ) {
      flushParagraph();
      flushList();

      const headers = parseCells(trimmed);
      const delimiterCells = parseCells(lines[i + 1]);
      const alignments = delimiterCells.map(parseAlignment);
      while (alignments.length < headers.length) {
        alignments.push("left");
      }

      const rows: string[][] = [];
      i += 2; // Advance past header and delimiter lines

      while (i < lines.length) {
        const nextTrimmed = lines[i].trim();
        if (
          !nextTrimmed ||
          !nextTrimmed.includes("|") ||
          nextTrimmed.startsWith("```") ||
          nextTrimmed.startsWith("#")
        ) {
          break;
        }

        if (isDelimiterRow(nextTrimmed)) {
          i++;
          continue;
        }

        const rowCells = parseCells(nextTrimmed);
        while (rowCells.length < headers.length) {
          rowCells.push("");
        }
        rows.push(rowCells.slice(0, headers.length));
        i++;
      }

      i--; // Decrement since for-loop increments i

      blocks.push({
        type: "table",
        headers,
        alignments,
        rows,
      });
      continue;
    }

    // Heading (# to ######)
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = Math.min(6, headingMatch[1].length) as 1 | 2 | 3 | 4 | 5 | 6;
      blocks.push({
        type: "heading",
        level,
        text: headingMatch[2],
      });
      continue;
    }

    // Blockquote (> ...)
    if (trimmed.startsWith(">")) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "blockquote",
        text: trimmed.replace(/^>\s*/, ""),
      });
      continue;
    }

    // Unordered list (- , * , • )
    const ulMatch = trimmed.match(/^[-*•]\s+(.+)$/);
    if (ulMatch) {
      flushParagraph();
      if (currentList && currentList.type !== "ul") {
        flushList();
      }
      if (!currentList) {
        currentList = { type: "ul", items: [] };
      }
      currentList.items.push(ulMatch[1]);
      continue;
    }

    // Ordered list (1. 2. etc.)
    const olMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (olMatch) {
      flushParagraph();
      if (currentList && currentList.type !== "ol") {
        flushList();
      }
      if (!currentList) {
        currentList = { type: "ol", items: [] };
      }
      currentList.items.push(olMatch[1]);
      continue;
    }

    // Regular line in paragraph
    flushList();
    currentParagraph.push(trimmed);
  }

  // Final flushes
  if (inCodeBlock) {
    blocks.push({
      type: "codeblock",
      lang: codeBlockLang,
      code: codeBlockContent.join("\n"),
    });
  }
  flushParagraph();
  flushList();

  return blocks;
}
