import React from 'react';

// Formato dentro de un renglón: negrita, cursiva, código y enlaces.
type InlineToken =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  | { type: "italic"; text: string }
  | { type: "bolditalic"; text: string }
  | { type: "code"; text: string };

export function renderInlineTokens(tokens: InlineToken[], keyPrefix: string): React.ReactNode[] {
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

export function parseInline(text: string): InlineToken[] {
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
