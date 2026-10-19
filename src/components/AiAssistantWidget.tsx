import React, { useEffect, useRef, useState } from "react";
import { Sparkles, X, Send, Trash2, AlertCircle, ShoppingBag, Wallet, Package, Settings2 } from "lucide-react";
import { groqStream } from "../services/groqService";
import type { GroqMessage } from "../types/ai";
import { AiMarkdownRenderer } from "./AiMarkdownRenderer";
import type { KioscoCartItem, KioscoProduct, KioscoSale, PaymentMethod } from "../types/kiosco";
import type { Movement, Shift } from "../features/retail/api";
import { summarizeMargins, marginPrompt } from '../features/retail/marginAnalytics';

interface Props {
  storeName?: string;
  currentTab?: "pos" | "cash" | "catalog" | "settings" | "remito" | "ai";
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
  onOpenFull?: () => void;
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
  onOpenFull,
}: Props) {
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
    if (!q || !isOpen || isAiLoading) return;
    setLastQuery(q);

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

    try {
      await groqStream(messages, chunk => {
        if (!controller.signal.aborted) setAiResponse(previous => previous + chunk);
      }, { signal: controller.signal, maxTokens: 1000 });
    } catch (err) {
      if (!controller.signal.aborted) {
        setAiResponse('');
        setAiError(err instanceof Error ? err.message : 'No se pudo completar la consulta. Reintentá cuando haya conexión.');
      }
    } finally {
      if (!controller.signal.aborted) setIsAiLoading(false);
    }
  };

  const clearChat = () => {
    abortControllerRef.current?.abort();
    setIsAiLoading(false);
    setAiResponse("");
    setAiError("");
  };

  const tabLabels: Record<string, { label: string; icon: typeof ShoppingBag }> = {
    pos: { label: "Vender", icon: ShoppingBag },
    cash: { label: "Caja", icon: Wallet },
    catalog: { label: "Catálogo", icon: Package },
    settings: { label: "Mi comercio", icon: Settings2 },
    remito: { label: "Remitos", icon: Package },
    ai: { label: "Análisis del comercio", icon: Sparkles },
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

      {/* Floating Copilot Window / Drawer */}
      {isOpen && (
        <aside
          className="ai-omni-drawer"
          aria-label="Panel del asistente IA"
          role="dialog"
          aria-modal="true"
          onKeyDown={e => {
            e.stopPropagation();
            if (e.key === 'Escape') { e.preventDefault(); onToggle(false); }
            if (e.key === 'Tab') {
              const controls = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href], [tabindex="0"]'));
              const first = controls[0]; const last = controls[controls.length - 1];
              if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
              else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
            }
          }}
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
          <div className="ai-omni-chips-bar">
            <small>Ayuda opcional generada con IA. Revisá la respuesta antes de tomar decisiones.</small>
            {onOpenFull && <button type="button" className="text-button" onClick={onOpenFull}>Abrir análisis completo del comercio</button>}
          </div>
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
                  <button type="button" className="secondary-button" disabled={isAiLoading} onClick={() => void handleSendQuery(lastQuery)}>Reintentar consulta</button>
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
              readOnly={isAiLoading}
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
