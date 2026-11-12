import React from 'react';
import { ShoppingBag, Wallet, Package, Settings2 } from 'lucide-react';
import { AiIcon } from '../AiIcon';
import { groqStream } from '../../services/groqService';
import type { GroqMessage } from '../../types/ai';
import { summarizeMargins, marginPrompt } from '../../features/retail/marginAnalytics';
import type { aiAssistantWidgetProps } from './useAiAssistantWidget';
import type { useAiWidgetChat } from './useAiWidgetChat';

/** Enviar una consulta con el contexto de la sección y nombre de la pestaña. */
export function useAiWidgetQuery(ctx: ReturnType<typeof aiAssistantWidgetProps> & ReturnType<typeof useAiWidgetChat>) {
  const {
    storeName, currentTab, products, cart, total, paymentMethod, shifts, sales, movements, role, isOpen,
    setAiPrompt, setAiResponse, isAiLoading, setIsAiLoading, setAiError, setLastQuery,
    abortControllerRef,
  } = ctx;
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

  const tabLabels: Record<string, { label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
    pos: { label: "Vender", icon: ShoppingBag },
    cash: { label: "Caja", icon: Wallet },
    catalog: { label: "Catálogo", icon: Package },
    settings: { label: "Mi comercio", icon: Settings2 },
    remito: { label: "Remitos", icon: Package },
    ai: { label: "Análisis del comercio", icon: AiIcon },
  };

  const currentTabInfo = tabLabels[currentTab] || tabLabels.pos;
  const TabIcon = currentTabInfo.icon;

  return { handleSendQuery, clearChat, tabLabels, currentTabInfo, TabIcon };
}
