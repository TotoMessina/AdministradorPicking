import { useState, useRef, useEffect, useMemo } from 'react';
import type { GroqMessage } from '../../types/ai';
import { retail } from '../../features/retail/api';
import type { KioscoSale } from '../../types/kiosco';
import { hasComposition } from '../../services/productComposition';
import type { AIAssistantProps } from './aiAssistantProps';
import { extractDate, isSaleToday, computeMetrics } from './aiAssistantMetrics';

/** Mensajes, ventas a analizar y métricas por período. */
export function useAiAssistantState(ctx: AIAssistantProps) {
  const { store, products, shifts, sales, movements, role } = ctx;
  const [messages, setMessages] = useState<GroqMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [localSales, setLocalSales] = useState<KioscoSale[]>(sales);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync or fetch sales if manager and sales array is empty
  useEffect(() => {
    if (sales && sales.length > 0) {
      setLocalSales(sales);
    } else if (store?.id && (role === "owner" || role === "admin")) {
      retail
        .allSales(store.id)
        .then((data) => {
          if (data && data.length > 0) setLocalSales(data);
        })
        .catch(() => {});
    }
  }, [sales, store?.id, role]);

  const activeSales = localSales.length > 0 ? localSales : sales;
  const activeMovements = movements;

  // Compute comprehensive analytical metrics across multiple time periods
  const analytics = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const startOf7Days = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const salesToday: KioscoSale[] = [];
    const sales7Days: KioscoSale[] = [];
    const salesMonth: KioscoSale[] = [];
    const salesLastMonth: KioscoSale[] = [];

    for (const s of activeSales) {
      const d = extractDate(s);
      if (d) {
        if (d >= startOfToday && d <= endOfToday) salesToday.push(s);
        if (d >= startOf7Days && d <= endOfToday) sales7Days.push(s);
        if (d >= startOfMonth && d <= endOfToday) salesMonth.push(s);
        if (d >= startOfLastMonth && d <= endOfLastMonth) salesLastMonth.push(s);
      } else if (isSaleToday(s, now)) {
        salesToday.push(s);
        sales7Days.push(s);
        salesMonth.push(s);
      }
    }

    const hoy = computeMetrics(salesToday, products);
    const estaSemana = computeMetrics(sales7Days, products);
    const esteMes = computeMetrics(salesMonth, products);
    const mesAnterior = computeMetrics(salesLastMonth, products);
    const historico = computeMetrics(activeSales, products);

    const criticalStock = products.filter((p) => !hasComposition(p) && p.stock <= p.minStock).length;
    const activeShift = shifts.find((s) => !s.closed_at);

    return {
      hoy,
      estaSemana,
      esteMes,
      mesAnterior,
      historico,
      criticalStock,
      activeShift: !!activeShift,
      totalProductos: products.length,
    };
  }, [products, activeSales, shifts]);

  // Autoscroll when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [messages, isStreaming]);

  // Clean up streaming on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return { messages, setMessages, input, setInput, isStreaming, setIsStreaming, copiedIdx, setCopiedIdx, localSales, setLocalSales, abortControllerRef, messagesEndRef, textareaRef, activeSales, activeMovements, analytics };
}
