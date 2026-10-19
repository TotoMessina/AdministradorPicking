import React, { useEffect, useRef, useState } from "react";
import { Sparkles, X, Send, Trash2, AlertCircle, ShoppingBag, Wallet, Package, Settings2 } from "lucide-react";
import { groqStream, isRateLimitError, getRetryDelay, DEFAULT_MODEL, FALLBACK_FAST_MODEL } from "../services/groqService";
import type { GroqMessage } from "../types/ai";
import { AiMarkdownRenderer } from "./AiMarkdownRenderer";
import type { KioscoCartItem, KioscoProduct, KioscoSale, PaymentMethod } from "../types/kiosco";
import type { Movement, Shift } from "../features/retail/api";
import { summarizeMargins, marginPrompt } from '../features/retail/marginAnalytics';

interface Props {
  storeName?: string;
  currentTab?: "pos" | "cash" | "catalog" | "settings";
  products: KioscoProduct[];
  cart: KioscoCartItem[];
  total: number;
  paymentMethod?: PaymentMethod;
  shifts?: Shift[];
  sales?: KioscoSale[];
  movements?: Movement[];
  role?: string;
  isOpen: boolean;
  onToggle: (open: boolean) => void;
}

export function AiAssistantWidget({
  storeName = "tu comercio",
  currentTab = "pos",
  products,
  cart,
  total,
  paymentMethod = "Efectivo",
  shifts = [],
  sales = [],
  movements = [],
  role = "cajero",
  isOpen,
  onToggle,
}: Props) {
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onToggle(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onToggle]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 60);
    }
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
          "Resumen del turno actual",
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

  const handleSendQuery = async (queryText: string) => {
    const q = queryText.trim();
    if (!q || isAiLoading) return;

    setAiPrompt("");
    setAiError("");
    setAiResponse("");
    setIsAiLoading(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const isManager = role === "owner" || role === "admin";
    const baseSystemPrompt = isManager
      ? `Sos el asistente inteligente de gestión de ${storeName}. Asesorás al ${role === "owner" ? "dueño" : "administrador"} en tiempo real sobre ventas, costos, rentabilidad, stock y caja.
Respondé en español rioplatense, de forma concisa, analítica y útil.
Tenés acceso a los datos actuales del negocio.`
      : `Sos el asistente de kiosco de ${storeName}. Ayudás al cajero en tiempo real. Tenés acceso al catálogo y al carrito actual.
Respondé en español rioplatense, de forma concisa y útil.
Nunca inventes precios ni datos que no estén en el contexto.`;

    const contextPayload: Record<string, unknown> = {
      seccionActual: currentTab,
      rolUsuario: role,
      catalogo: products.map((p) => ({
        codigo: p.code,
        nombre: p.name,
        categoria: p.category,
        precio: p.price,
        costo: p.cost,
        grupoMargen: p.margin_group ?? 'standard',
        stock: p.stock,
        stockMinimo: p.minStock,
      })),
      carrito: cart.map((i) => ({
        nombre: i.product.name,
        cantidad: i.qty,
        precioUnitario: i.product.price,
        costoUnitario: i.product.cost,
        grupoMargen: i.product.margin_group ?? 'standard',
        stockDisponible: i.product.stock,
        subtotal: i.subtotal,
      })),
      totalActual: total,
      metodoPagoSeleccionado: paymentMethod,
    };

    if (sales.length > 0) {
      const separation = summarizeMargins(sales, products);
      contextPayload.resumenVentas = {
        totalVentasRegistradas: sales.length,
        facturacionPrincipal: separation.standard.revenue,
        facturacionTotalRegistrada: separation.totalRevenue,
        separacionDeMargen: separation,
        ultimosTickets: sales.slice(0, 10).map((s) => ({
          ticket: s.ticketNumber,
          total: s.total,
          medio: s.paymentMethod,
          fecha: s.date || (s.created_at ? new Date(s.created_at).toLocaleDateString("es-AR") : undefined),
        })),
      };
    }

    if (currentTab === "cash") {
      const activeShift = shifts.find((s) => !s.closed_at);
      contextPayload.caja = {
        turnoAbierto: !!activeShift,
        apertura: activeShift?.opening_cash || 0,
        ventasRegistradas: sales.length,
        movimientosEfectivo: movements.map((m) => ({
          tipo: m.type,
          monto: m.amount,
          motivo: m.reason,
        })),
      };
    }

    const systemMessageContent = `${baseSystemPrompt}\n\n${marginPrompt(summarizeMargins(sales, products))}\n\nDATOS ACTUALES DEL NEGOCIO (JSON):\n${JSON.stringify(contextPayload)}`;

    const messages: GroqMessage[] = [
      { role: "system", content: systemMessageContent },
      { role: "user", content: q },
    ];

    const MAX_RETRIES = 3;
    let attempt = 0;
    let chosenModel: string | undefined = undefined;

    try {
      while (attempt <= MAX_RETRIES) {
        if (controller.signal.aborted) return;

        try {
          await groqStream(
            messages,
            (chunk) => {
              setAiResponse((prev) => prev + chunk);
            },
            { signal: controller.signal, maxTokens: 1000, model: chosenModel }
          );
          // Succeeded
          break;
        } catch (err) {
          if (controller.signal.aborted) return;

          const isRateLimit = isRateLimitError(err);
          if (!isRateLimit || attempt >= MAX_RETRIES) {
            const msg =
              isRateLimit
                ? "Se alcanzó temporalmente el límite por minuto de Groq en todos los intentos. Aguardá unos segundos y volvé a consultar."
                : err instanceof Error
                ? err.message
                : "No se pudo consultar al asistente de Groq.";
            setAiError(msg);
            break;
          }

          attempt++;
          const waitSecs = getRetryDelay(err, attempt === 1 ? 3 : attempt === 2 ? 5 : 7);

          if (attempt >= 2 && !chosenModel && DEFAULT_MODEL !== FALLBACK_FAST_MODEL) {
            chosenModel = FALLBACK_FAST_MODEL;
          }

          const modelNote = chosenModel === FALLBACK_FAST_MODEL ? " (probando modelo alternativo)" : "";

          for (let s = waitSecs; s > 0; s--) {
            if (controller.signal.aborted) return;
            setAiResponse(
              `⏳ Aguardando disponibilidad de tokens gratuitos (${s}s)... intento ${attempt} de ${MAX_RETRIES}${modelNote}`
            );
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
          setAiResponse("🔄 Reintentando con tokens disponibles...");
        }
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsAiLoading(false);
      }
    }
  };

  const clearChat = () => {
    abortControllerRef.current?.abort();
    setIsAiLoading(false);
    setAiResponse("");
    setAiError("");
  };

  const tabLabels: Record<string, { label: string; icon: typeof ShoppingBag }> = {
    pos: { label: "Mostrador", icon: ShoppingBag },
    cash: { label: "Cajas y turnos", icon: Wallet },
    catalog: { label: "Catálogo", icon: Package },
    settings: { label: "Mi comercio", icon: Settings2 },
  };

  const currentTabInfo = tabLabels[currentTab] || tabLabels.pos;
  const TabIcon = currentTabInfo.icon;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="ai-omni-backdrop"
          onClick={() => onToggle(false)}
          aria-hidden="true"
        />
      )}

      {/* Floating Action Button - Omnipresent across all dimensions */}
      <button
        type="button"
        className={`ai-omni-fab ${isOpen ? "is-active is-open" : ""} tab-${currentTab}`}
        onClick={() => onToggle(!isOpen)}
        aria-label={isOpen ? "Cerrar asistente IA" : "Abrir asistente IA"}
        title={isOpen ? "Cerrar asistente IA" : "Abrir asistente IA"}
      >
        <span className="ai-omni-fab-glow" aria-hidden="true" />
        <Sparkles size={18} className="ai-omni-fab-icon" />
        <span className="ai-omni-fab-text">✨ IA</span>
      </button>

      {/* Floating Copilot Window / Drawer */}
      {isOpen && (
        <aside
          className="ai-omni-drawer"
          aria-label="Panel del asistente IA"
          role="complementary"
        >
          <div className="ai-omni-drag-handle" aria-hidden="true" />
          {/* Header */}
          <div className="ai-omni-header">
            <div className="ai-omni-header-info">
              <div className="ai-omni-badge">
                <Sparkles size={13} />
                <span>Asistente IA</span>
              </div>
              <div className="ai-omni-context-pill">
                <TabIcon size={12} />
                <span>{currentTabInfo.label}</span>
              </div>
            </div>

            <div className="ai-omni-header-actions">
              {aiResponse && (
                <button
                  type="button"
                  className="ai-omni-icon-btn"
                  onClick={clearChat}
                  aria-label="Limpiar respuesta"
                  title="Limpiar respuesta"
                  disabled={isAiLoading}
                >
                  <Trash2 size={15} />
                </button>
              )}
              <button
                type="button"
                className="ai-omni-icon-btn ai-omni-close-btn"
                onClick={() => {
                  abortControllerRef.current?.abort();
                  setIsAiLoading(false);
                  onToggle(false);
                }}
                aria-label="Cerrar asistente"
                title="Cerrar"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Quick Preset Chips */}
          <div className="ai-omni-chips-bar" aria-label="Consultas rápidas">
            <span className="ai-omni-chips-title">Consultas rápidas</span>
            <div className="ai-omni-chips-wrap">
              {getPresets().map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className="ai-omni-chip"
                  disabled={isAiLoading}
                  onClick={() => void handleSendQuery(preset)}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Response / Chat Body */}
          <div
            className="ai-omni-body"
            ref={responseAreaRef}
            tabIndex={0}
            role="region"
            aria-label="Contenido del asistente"
          >
            {aiError ? (
              <div className="ai-omni-error" role="alert">
                <AlertCircle size={16} />
                <div>
                  <strong>No se pudo completar la consulta</strong>
                  <p>{aiError}</p>
                </div>
              </div>
            ) : aiResponse ? (
              <div className="ai-omni-response-card">
                <AiMarkdownRenderer
                  content={aiResponse}
                  isStreaming={isAiLoading}
                />
              </div>
            ) : isAiLoading ? (
              <div className="ai-omni-loading">
                <Sparkles size={20} className="ai-spin-icon" />
                <span>Analizando datos en tiempo real…</span>
              </div>
            ) : (
              <div className="ai-omni-empty">
                <div className="ai-omni-empty-icon">
                  <Sparkles size={26} />
                </div>
                <h4>¿En qué puedo ayudarte?</h4>
                <p>
                  Elegí una consulta rápida arriba o escribí lo que necesites
                  saber sobre precios, márgenes, combos o stock.
                </p>
              </div>
            )}
          </div>

          {/* Footer Input */}
          <form
            className="ai-omni-footer"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSendQuery(aiPrompt);
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Preguntale al asistente..."
              disabled={isAiLoading}
              aria-label="Pregunta para el asistente IA"
            />
            <button
              type="submit"
              className="primary-button ai-omni-send-btn"
              disabled={isAiLoading || !aiPrompt.trim()}
              aria-label="Enviar pregunta"
              title="Enviar"
            >
              <Send size={14} />
              <span>Enviar</span>
            </button>
          </form>
        </aside>
      )}
    </>
  );
}
