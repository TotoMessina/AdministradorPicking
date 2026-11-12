import { useMemo } from 'react';
import { renderInlineTokens, parseInline } from './markdown/markdownInline';
import { parseBlocks } from './markdown/markdownBlocks';

interface Props {
  content: string;
  isStreaming?: boolean;
  className?: string;
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
          case "table": {
            return (
              <div
                key={key}
                className="ai-table-wrapper"
                tabIndex={0}
                role="region"
                aria-label="Tabla de datos"
              >
                <table className="ai-table">
                  <thead>
                    <tr>
                      {block.headers.map((header, hIdx) => (
                        <th
                          key={`${key}-th-${hIdx}`}
                          style={{ textAlign: block.alignments[hIdx] || "left" }}
                        >
                          {renderInlineTokens(parseInline(header), `${key}-th-${hIdx}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rIdx) => (
                      <tr key={`${key}-tr-${rIdx}`}>
                        {row.map((cell, cIdx) => (
                          <td
                            key={`${key}-td-${rIdx}-${cIdx}`}
                            style={{ textAlign: block.alignments[cIdx] || "left" }}
                          >
                            {renderInlineTokens(parseInline(cell), `${key}-td-${rIdx}-${cIdx}`)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }
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
