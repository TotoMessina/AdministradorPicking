import React from 'react';
import { groqStream, isRateLimitError, getRetryDelay, DEFAULT_MODEL, FALLBACK_FAST_MODEL } from '../../services/groqService';
import type { GroqMessage } from '../../types/ai';
import type { AIAssistantProps } from './aiAssistantProps';
import type { useAiAssistantState } from './useAiAssistantState';
import type { useAiSystemPrompt } from './useAiSystemPrompt';

/** Enviar, cortar y reiniciar la conversación; escritura y copia de respuestas. */
export function useAiAssistantChat(ctx: AIAssistantProps & ReturnType<typeof useAiAssistantState> & ReturnType<typeof useAiSystemPrompt>) {
  const {
    messages, setMessages, input, setInput, isStreaming, setIsStreaming, setCopiedIdx,
    abortControllerRef, textareaRef, buildSystemPrompt,
  } = ctx;
  const handleSend = async (textToSend?: string) => {
    const promptText = (textToSend !== undefined ? textToSend : input).trim();
    if (!promptText || isStreaming) return;

    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const userMessage: GroqMessage = { role: "user", content: promptText };
    // Optimistically add user message and placeholder for assistant
    setMessages((prev) => [...prev, userMessage, { role: "assistant", content: "" }]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const dynamicSystemPrompt = buildSystemPrompt();
    // Keep conversation window bounded to prevent ballooning input tokens
    const recentHistory = messages
      .filter((m) => m.role !== "system" && m.content && !m.content.startsWith("⏳ *Aviso del Asistente"))
      .slice(-4);
    const apiMessages: GroqMessage[] = [
      { role: "system", content: dynamicSystemPrompt },
      ...recentHistory,
      userMessage,
    ];

    const MAX_RETRIES = 3;
    let attempt = 0;
    let chosenModel: string | undefined = undefined;

    try {
      while (attempt <= MAX_RETRIES) {
        if (controller.signal.aborted) return;
        let currentResponse = "";

        try {
          await groqStream(
            apiMessages,
            (delta: string) => {
              if (controller.signal.aborted) return;
              currentResponse += delta;
              setMessages((prev) => {
                if (prev.length === 0) return prev;
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: currentResponse,
                };
                return updated;
              });
            },
            {
              signal: controller.signal,
              temperature: 0.3,
              maxTokens: 1200,
              model: chosenModel,
            },
          );
          // Completed successfully
          break;
        } catch (err: unknown) {
          if (controller.signal.aborted) return;

          const isRateLimit = isRateLimitError(err);
          if (!isRateLimit || attempt >= MAX_RETRIES) {
            let errorMsg =
              err instanceof Error
                ? err.message
                : "No se pudo completar la respuesta con Groq.";

            if (isRateLimit) {
              errorMsg =
                "Se alcanzó temporalmente el límite de velocidad por minuto del proveedor Groq en todos los intentos. Aguardá unos segundos y volvé a consultar.";
            }

            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === "assistant" && !last.content) {
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: `⏳ *Aviso del Asistente:* ${errorMsg}`,
                };
              }
              return updated;
            });
            break;
          }

          // Rate limit detected: wait and retry with countdown
          attempt++;
          const waitSecs = getRetryDelay(err, attempt === 1 ? 3 : attempt === 2 ? 5 : 7);

          // Fallback to high-TPM lightweight model on attempt >= 2 if rate limit continues
          if (attempt >= 2 && !chosenModel && DEFAULT_MODEL !== FALLBACK_FAST_MODEL) {
            chosenModel = FALLBACK_FAST_MODEL;
          }

          const modelNote = chosenModel === FALLBACK_FAST_MODEL ? " (optimizando con modelo rápido)" : "";

          // Progressive countdown timer while waiting
          for (let s = waitSecs; s > 0; s--) {
            if (controller.signal.aborted) return;
            setMessages((prev) => {
              if (prev.length === 0) return prev;
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: "assistant",
                content: `⏳ *Aguardando disponibilidad de tokens gratuitos de Groq (${s}s)... intento ${attempt} de ${MAX_RETRIES}${modelNote}*`,
              };
              return updated;
            });

            await new Promise<void>((resolve) => {
              const timer = setTimeout(() => {
                controller.signal.removeEventListener("abort", onAbort);
                resolve();
              }, 1000);
              function onAbort() {
                clearTimeout(timer);
                resolve();
              }
              controller.signal.addEventListener("abort", onAbort);
            });
          }

          if (controller.signal.aborted) return;

          setMessages((prev) => {
            if (prev.length === 0) return prev;
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: `🔄 *Reintentando respuesta con tokens disponibles...*`,
            };
            return updated;
          });
        }
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  const handleNewConversation = () => {
    handleStopStreaming();
    setMessages([]);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const copyResponse = (content: string, index: number) => {
    void navigator.clipboard.writeText(content);
    setCopiedIdx(index);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return { handleSend, handleStopStreaming, handleNewConversation, handleKeyDown, handleTextareaChange, copyResponse };
}
