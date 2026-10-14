import React, { useMemo } from "react";

interface Props {
  content: string;
  isStreaming?: boolean;
  className?: string;
}

type InlineToken =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  | { type: "italic"; text: string }
  | { type: "bolditalic"; text: string }
  | { type: "code"; text: string };

function renderInlineTokens(tokens: InlineToken[], keyPrefix: string): React.ReactNode[] {
  return tokens.map((token, idx) => {
    const key = `${keyPrefix}-${idx}`;
    switch (token.type) {
      case "bolditalic":
        return (
          <strong key={key} className="ai-bold">
            <em className="ai-italic">{token.text}</em>
          </strong>
        );
      case "bold":
        return (
          <strong key={key} className="ai-bold">
            {token.text}
          </strong>
        );
      case "italic":
        return (
          <em key={key} className="ai-italic">
            {token.text}
          </em>
        );
      case "code":
        return (
          <code key={key} className="ai-inline-code">
            {token.text}
          </code>
        );
      case "text":
      default:
        return <React.Fragment key={key}>{token.text}</React.Fragment>;
    }
  });
}

function parseInline(text: string): InlineToken[] {
  if (!text) return [];

  // Match: ***...***, **...**, __...__, *...*, _..._, `...`
  const tokenRegex = /(\*\*\*[\s\S]+?\*\*\*|\*\*[\s\S]+?\*\*|__[\s\S]+?__|(?<!\*)\*[^*]+?\*(?!\*)|(?<!_)_[^_]+?_(?!_)|`[^`]+?`)/g;
  const tokens: InlineToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: "text", text: text.slice(lastIndex, match.index) });
    }
    const raw = match[0];
    if (raw.startsWith("***") && raw.endsWith("***") && raw.length >= 6) {
      tokens.push({ type: "bolditalic", text: raw.slice(3, -3) });
    } else if (
      ((raw.startsWith("**") && raw.endsWith("**")) ||
        (raw.startsWith("__") && raw.endsWith("__"))) &&
      raw.length >= 4
    ) {
      tokens.push({ type: "bold", text: raw.slice(2, -2) });
    } else if (
      ((raw.startsWith("*") && raw.endsWith("*")) ||
        (raw.startsWith("_") && raw.endsWith("_"))) &&
      raw.length >= 2
    ) {
      tokens.push({ type: "italic", text: raw.slice(1, -1) });
    } else if (raw.startsWith("`") && raw.endsWith("`") && raw.length >= 2) {
      tokens.push({ type: "code", text: raw.slice(1, -1) });
    } else {
      tokens.push({ type: "text", text: raw });
    }
    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex);
    // If stream cut off midway through a bold marker (e.g. "**palabra")
    if (remaining.startsWith("**") && !remaining.slice(2).includes("**")) {
      tokens.push({ type: "bold", text: remaining.slice(2) });
    } else if (remaining.startsWith("*") && !remaining.slice(1).includes("*")) {
      tokens.push({ type: "italic", text: remaining.slice(1) });
    } else {
      tokens.push({ type: "text", text: remaining });
    }
  }

  return tokens;
}

type Block =
  | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: "codeblock"; lang: string; code: string }
  | { type: "blockquote"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "paragraph"; text: string };

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.split(/\r?\n/);
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

export function AiMarkdownRenderer({
  content,
  isStreaming = false,
  className = "",
}: Props) {
  const blocks = useMemo(() => parseBlocks(content), [content]);

  return (
    <div className={`ai-markdown-root ${className}`}>
      {blocks.map((block, idx) => {
        const isLastBlock = idx === blocks.length - 1;
        const key = `block-${idx}`;

        switch (block.type) {
          case "heading": {
            const inlineNodes = renderInlineTokens(parseInline(block.text), key);
            if (block.level === 1) {
              return (
                <h3 key={key} className="ai-heading ai-h1">
                  {inlineNodes}
                </h3>
              );
            }
            if (block.level === 2) {
              return (
                <h4 key={key} className="ai-heading ai-h2">
                  {inlineNodes}
                </h4>
              );
            }
            return (
              <h5 key={key} className="ai-heading ai-h3">
                {inlineNodes}
              </h5>
            );
          }
          case "blockquote":
            return (
              <blockquote key={key} className="ai-blockquote">
                {renderInlineTokens(parseInline(block.text), key)}
              </blockquote>
            );
          case "ul":
            return (
              <ul key={key} className="ai-list ai-ul">
                {block.items.map((item, itemIdx) => (
                  <li key={`${key}-item-${itemIdx}`}>
                    {renderInlineTokens(parseInline(item), `${key}-${itemIdx}`)}
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={key} className="ai-list ai-ol">
                {block.items.map((item, itemIdx) => (
                  <li key={`${key}-item-${itemIdx}`}>
                    {renderInlineTokens(parseInline(item), `${key}-${itemIdx}`)}
                  </li>
                ))}
              </ol>
            );
          case "codeblock":
            return (
              <pre key={key} className="ai-codeblock">
                {block.lang && (
                  <span className="ai-codeblock-lang">{block.lang}</span>
                )}
                <code>{block.code}</code>
              </pre>
            );
          case "paragraph":
          default:
            return (
              <p key={key} className="ai-paragraph">
                {renderInlineTokens(parseInline(block.text), key)}
                {isStreaming && isLastBlock && (
                  <span className="ai-streaming-cursor" aria-hidden="true">
                    ▍
                  </span>
                )}
              </p>
            );
        }
      })}
      {isStreaming && blocks.length === 0 && (
        <span className="ai-streaming-cursor" aria-hidden="true">
          ▍
        </span>
      )}
    </div>
  );
}
