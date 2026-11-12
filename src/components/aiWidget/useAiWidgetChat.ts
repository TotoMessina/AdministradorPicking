import { useEffect, useRef, useState } from 'react';
import type { aiAssistantWidgetProps } from './useAiAssistantWidget';

/** Respuesta, errores y consultas sugeridas según la sección. */
export function useAiWidgetChat(ctx: ReturnType<typeof aiAssistantWidgetProps>) {
  const { currentTab, isOpen } = ctx;
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [lastQuery, setLastQuery] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const responseAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (responseAreaRef.current) {
      responseAreaRef.current.scrollTop = responseAreaRef.current.scrollHeight;
    }
  }, [aiResponse]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    return () => {
      abortControllerRef.current?.abort();
      setIsAiLoading(false);
      if (previous?.isConnected && !previous.closest('[hidden]')) previous.focus();
    };
  }, [isOpen]);

  // Dynamic preset chips based on current section
  const getPresets = () => {
    switch (currentTab) {
      case "pos":
        return [
          "¿Qué producto rinde más?",
          "¿Algo con stock bajo en el carrito?",
          "Sugería combo",
          "¿Cuánto ganamos en esta venta?",
        ];
      case "cash":
        return [
          "Resumen de la caja abierta",
          "¿Cómo vienen los cobros en efectivo vs QR?",
          "¿Hay diferencias de caja?",
          "Análisis de movimientos del día",
        ];
      case "catalog":
        return [
          "¿Qué productos reponer urgente?",
          "Productos con margen bajo",
          "Ideas para reorganizar categorías",
          "Productos sin stock",
        ];
      case "settings":
      default:
        return [
          "Recomendaciones para mi comercio",
          "Sugerencias de combos para vender más",
          "Análisis de márgenes promedio",
        ];
    }
  };

  return { aiPrompt, setAiPrompt, aiResponse, setAiResponse, isAiLoading, setIsAiLoading, aiError, setAiError, lastQuery, setLastQuery, abortControllerRef, responseAreaRef, inputRef, getPresets };
}
