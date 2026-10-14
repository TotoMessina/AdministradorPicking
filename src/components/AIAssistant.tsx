import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Sparkles,
  Send,
  Square,
  RotateCcw,
  TrendingUp,
  AlertTriangle,
  Trophy,
  LayoutGrid,
  ShoppingCart,
  Copy,
  Check,
  User,
  Bot,
} from "lucide-react";
import { groqStream } from "../services/groqService";
import type { GroqMessage } from "../types/ai";
import { AiMarkdownRenderer } from "./AiMarkdownRenderer";
import type { Store, Product, Shift, Movement, Role } from "../features/retail/api";
import type { KioscoSale } from "../types/kiosco";
import "./AIAssistant.css";

export interface AIAssistantProps {
  store: Store;
  products: Product[];
  shifts: Shift[];
  sales: KioscoSale[];
  movements: Movement[];
  role: Role;
  ownerEmail?: string;
}

const INITIAL_CAPABILITY_CHIPS = [
  { label: "¿Cómo va el negocio esta semana?", icon: TrendingUp },
  { label: "¿Qué distribuidor me deja más margen?", icon: TrendingUp },
  { label: "Analizá mis productos sin movimiento", icon: AlertTriangle },
  { label: "¿Cuándo fue mi mejor turno del mes?", icon: Trophy },
  { label: "Sugerí categorías para reorganizar el catálogo", icon: LayoutGrid },
  { label: "¿Qué debería comprar esta semana?", icon: ShoppingCart },
];

function isSaleToday(s: KioscoSale, now: Date): boolean {
  const todayIso = now.toISOString().split("T")[0];
  const todayAr = now.toLocaleDateString("es-AR");
  if (s.date === todayIso || s.date === todayAr) return true;
  if (s.date) {
    if (s.date.includes("-")) {
      const d = new Date(s.date);
      if (!isNaN(d.getTime())) return d.toDateString() === now.toDateString();
    }
    if (s.date.includes("/")) {
      const parts = s.date.split("/");
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          const d = new Date(year, month, day);
          return d.toDateString() === now.toDateString();
        }
      }
    }
  }
  if (s.timestamp && (s.timestamp.startsWith(todayIso) || s.timestamp.includes(todayIso))) {
    return true;
  }
  return false;
}

export function AIAssistant({
  store,
  products,
  shifts,
  sales,
  movements,
  role: _role,
  ownerEmail,
}: AIAssistantProps) {
  const [messages, setMessages] = useState<GroqMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Compute summary stats for display and context
  const summaryStats = useMemo(() => {
    const now = new Date();
    const todaySales = sales.filter((s) => isSaleToday(s, now));
    const recaudacionHoy = todaySales.reduce(
      (acc, s) => acc + (Number(s.total) || 0),
      0,
    );
    const criticalStock = products.filter((p) => p.stock <= p.minStock).length;
    const activeShift = shifts.find((s) => !s.closed_at);

    return {
      productos: products.length,
      productosConStockCritico: criticalStock,
      ventasHoy: todaySales.length,
      recaudacionHoy,
      turnoActivo: !!activeShift,
    };
  }, [products, sales, shifts]);

  // Autoscroll when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  // Clean up streaming on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const buildSystemPrompt = () => {
    const now = new Date();
    const formattedDate = now.toLocaleDateString("es-AR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Prioritize critical stock items first, then popular/active products
    const criticalProducts = products
      .filter((p) => p.stock <= p.minStock)
      .slice(0, 15)
      .map((p) => ({
        nombre: p.name,
        codigo: p.code,
        categoria: p.category,
        ...(p.brand ? { brand: p.brand } : {}),
        ...(p.supplier ? { supplier: p.supplier } : {}),
        precio: p.price,
        costo: p.cost,
        stock: p.stock,
        minimo: p.minStock,
        estado: "STOCK_CRITICO",
      }));

    const otherProducts = products
      .filter((p) => p.stock > p.minStock)
      .slice(0, 20)
      .map((p) => ({
        nombre: p.name,
        codigo: p.code,
        categoria: p.category,
        ...(p.brand ? { brand: p.brand } : {}),
        ...(p.supplier ? { supplier: p.supplier } : {}),
        precio: p.price,
        costo: p.cost,
        stock: p.stock,
        minimo: p.minStock,
      }));

    const contextPayload = {
      resumen: {
        productos: summaryStats.productos,
        productosConStockCritico: summaryStats.productosConStockCritico,
        ventasHoy: summaryStats.ventasHoy,
        recaudacionHoy: summaryStats.recaudacionHoy,
        turnoActivo: summaryStats.turnoActivo,
      },
      catalogoMuestra: [...criticalProducts, ...otherProducts],
      ultimasVentas: sales.slice(0, 15).map((s) => ({
        ticket: s.ticketNumber,
        total: s.total,
        medio: s.paymentMethod,
        items: s.items?.map((i) => `${i.qty}x ${i.name}`).join(", ") || "",
      })),
      movimientosCaja: movements.slice(0, 10).map((m) => ({
        tipo: m.type,
        monto: m.amount,
        motivo: m.reason,
      })),
    };

    return `Sos el asistente personal de ${ownerEmail || "el propietario"} para su comercio '${store.name}'. Tenés acceso completo a los datos del negocio: catálogo de ${products.length} productos, últimas ${sales.length} ventas y movimientos de caja.
Respondé como un socio de negocio inteligente: con datos reales, análisis concreto y recomendaciones accionables. Hablá en español rioplatense, sé amigable pero profesional. Hoy es ${formattedDate}.

CONTEXTO DEL NEGOCIO (DATOS EN TIEMPO REAL):
${JSON.stringify(contextPayload, null, 2)}`;
  };

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
    const recentHistory = messages.filter((m) => m.role !== "system").slice(-6);
    const apiMessages: GroqMessage[] = [
      { role: "system", content: dynamicSystemPrompt },
      ...recentHistory,
      userMessage,
    ];

    let currentResponse = "";

    try {
      await groqStream(
        apiMessages,
        (delta: string) => {
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
          maxTokens: 500,
        },
      );
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        return;
      }
      let errorMsg =
        err instanceof Error
          ? err.message
          : "No se pudo completar la respuesta con Groq.";

      if (
        errorMsg.includes("tokens per minute") ||
        errorMsg.includes("Request too large") ||
        errorMsg.includes("rate_limit_exceeded") ||
        errorMsg.includes("OTPM") ||
        errorMsg.includes("ITPM")
      ) {
        errorMsg =
          "Se alcanzó temporalmente el límite de velocidad por minuto del proveedor Groq. Aguardá unos segundos y volvé a consultar.";
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

  return (
    <div className="ai-assistant-container">
      {/* Header */}
      <header className="ai-assistant-header">
        <div className="ai-header-left">
          <div className="ai-header-icon-badge">
            <Sparkles size={22} />
          </div>
          <div className="ai-header-title-box">
            <div className="ai-header-title">
              <span>Asistente IA · Socio de Negocio</span>
              <span className="ai-header-badge">Online</span>
            </div>
            <span className="ai-header-subtitle">
              {store.name} · Memoria en sesión con datos en tiempo real
            </span>
          </div>
        </div>

        <div className="ai-header-right">
          <button
            type="button"
            className="ai-new-chat-btn"
            onClick={handleNewConversation}
            title="Iniciar nueva conversación y limpiar historial"
          >
            <RotateCcw size={14} />
            <span>Nueva conversación</span>
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <div className="ai-messages-area">
        {messages.length === 0 ? (
          <div className="ai-welcome-card">
            <div className="ai-welcome-avatar">
              <Sparkles size={28} />
            </div>
            <h2 className="ai-welcome-title">
              ¡Hola! Soy tu asistente de negocio para {store.name}
            </h2>
            <p className="ai-welcome-description">
              Tengo acceso a tu catálogo, últimas ventas y movimientos de caja
              para brindarte análisis estratégico, sugerencias de compras y
              respuestas inmediatas sobre tu comercio.
            </p>

            {/* Quick Metrics Row */}
            <div className="ai-welcome-stats-row">
              <div className="ai-welcome-stat-pill">
                <span className="ai-welcome-stat-value">
                  {summaryStats.productos}
                </span>
                <span className="ai-welcome-stat-label">Productos</span>
              </div>
              <div className="ai-welcome-stat-pill">
                <span
                  className="ai-welcome-stat-value"
                  style={{
                    color:
                      summaryStats.productosConStockCritico > 0
                        ? "var(--tone-danger)"
                        : "var(--tone-accent)",
                  }}
                >
                  {summaryStats.productosConStockCritico}
                </span>
                <span className="ai-welcome-stat-label">Stock crítico</span>
              </div>
              <div className="ai-welcome-stat-pill">
                <span className="ai-welcome-stat-value">
                  {summaryStats.ventasHoy}
                </span>
                <span className="ai-welcome-stat-label">Ventas hoy</span>
              </div>
              <div className="ai-welcome-stat-pill">
                <span className="ai-welcome-stat-value">
                  ${summaryStats.recaudacionHoy.toLocaleString("es-AR")}
                </span>
                <span className="ai-welcome-stat-label">Facturado hoy</span>
              </div>
            </div>

            {/* Capability Chips */}
            <div className="ai-chips-section">
              <span className="ai-chips-title">Consultas rápidas sugeridas:</span>
              <div className="ai-chips-grid">
                {INITIAL_CAPABILITY_CHIPS.map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    type="button"
                    className="ai-chip-btn"
                    onClick={() => handleSend(label)}
                    disabled={isStreaming}
                  >
                    <Icon size={14} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
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
                    <Bot size={18} />
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

      {/* Bottom Input Bar */}
      <div className="ai-input-bar-container">
        <form
          className="ai-input-form"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
        >
          <textarea
            ref={textareaRef}
            className="ai-textarea"
            rows={1}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Preguntale a tu socio IA sobre ventas, stock, compras, turnos..."
            disabled={isStreaming}
          />

          {isStreaming ? (
            <button
              type="button"
              className="ai-stop-btn"
              onClick={handleStopStreaming}
              title="Detener respuesta"
            >
              <Square size={16} />
            </button>
          ) : (
            <button
              type="submit"
              className="ai-send-btn"
              disabled={!input.trim()}
              title="Enviar mensaje (Enter)"
            >
              <Send size={16} />
            </button>
          )}
        </form>
        <span className="ai-input-hints">
          Presioná Enter para enviar · Shift+Enter para nueva línea · Conectado en
          tiempo real a tus datos
        </span>
      </div>
    </div>
  );
}
