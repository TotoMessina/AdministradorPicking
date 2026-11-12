import { Copy, Check, User } from 'lucide-react';
import { AiIcon } from '../AiIcon';
import { AiMarkdownRenderer } from '../AiMarkdownRenderer';
import type { AiAssistantState } from './useAiAssistant';
import { AiAssistantWelcome } from './AiAssistantWelcome';

/** Conversación: mensajes y respuestas. */
export function AiAssistantMessages({ state }: { state: AiAssistantState }) {
  const { messages, isStreaming, copiedIdx, messagesEndRef, copyResponse } = state;
  return (
    <>
      {/* Messages Area */}
      <div className="ai-messages-area">
        {messages.length === 0 ? (
          <AiAssistantWelcome state={state} />
        ) : (
          messages.map((msg, idx) => {
            const isUser = msg.role === "user";
            const isLastMessage = idx === messages.length - 1;
            const isAssistantStreaming = !isUser && isStreaming && isLastMessage;

            return (
              <div
                key={idx}
                className={`ai-message-row ${isUser ? "user" : "assistant"}`}
              >
                {!isUser && (
                  <div className="ai-bubble-avatar assistant">
                    <AiIcon size={18} />
                  </div>
                )}

                <div className="ai-bubble-content-box">
                  <span className="ai-bubble-author">
                    {isUser ? "Vos" : "Socio de Negocio IA"}
                  </span>
                  <div className={`ai-bubble ${isUser ? "user" : "assistant"}`}>
                    {isUser ? (
                      msg.content
                    ) : (
                      <AiMarkdownRenderer
                        content={msg.content}
                        isStreaming={isAssistantStreaming}
                      />
                    )}
                  </div>

                  {!isUser && msg.content && !isAssistantStreaming && (
                    <div className="ai-bubble-footer">
                      <button
                        type="button"
                        className="ai-copy-btn"
                        onClick={() => copyResponse(msg.content, idx)}
                        title="Copiar respuesta"
                      >
                        {copiedIdx === idx ? (
                          <>
                            <Check size={12} color="var(--tone-accent)" />
                            <span style={{ color: "var(--tone-accent)" }}>Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="ai-bubble-avatar user">
                    <User size={18} />
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
    </>
  );
}
