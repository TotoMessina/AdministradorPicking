import { useState, useMemo } from 'react';
import { hasComposition } from '../../../services/productComposition';
import { groqChat } from '../../../services/groqService';
import type { CatalogEditorProps } from './catalogEditorProps';
import type { useCatalogEditorState } from './useCatalogEditorState';
import type { useCatalogBulkPrice } from './useCatalogBulkPrice';
import type { useCatalogReplenish } from './useCatalogReplenish';

/** Análisis de stock crítico con IA, filtro y paginación de la lista. */
export function useCatalogStockAi(ctx: CatalogEditorProps & ReturnType<typeof useCatalogEditorState> & ReturnType<typeof useCatalogBulkPrice> & ReturnType<typeof useCatalogReplenish>) {
  const {
    store, products, allSales, operationBranch, unitsHere, query, page, pageSize, stockFilter,
    lowMarginFilter,
  } = ctx;
  // Feature: AI Stock Analysis states and handlers
  const criticalProducts = useMemo(
    () => products.filter((p) => !hasComposition(p) && (operationBranch ? unitsHere(p) : p.stock) <= p.minStock),
    [products, operationBranch, unitsHere],
  );
  const [isAnalyzingStock, setIsAnalyzingStock] = useState(false);
  const [stockAiAnalysis, setStockAiAnalysis] = useState<string | null>(null);
  const [stockAiError, setStockAiError] = useState<string | null>(null);
  const [copiedOrder, setCopiedOrder] = useState(false);

  const handleAnalyzeCriticalStock = async () => {
    if (criticalProducts.length === 0 || isAnalyzingStock) return;

    setIsAnalyzingStock(true);
    setStockAiError(null);

    try {
      // Rotation calculation if allSales is available
      const rotationMap = new Map<string, number>();
      if (allSales && allSales.length > 0) {
        for (const s of allSales) {
          for (const item of s.items || []) {
            const idKey = item.productId || "";
            const nameKey = (item.name || "").toLowerCase().trim();
            const qty = item.qty || 0;
            if (idKey) rotationMap.set(idKey, (rotationMap.get(idKey) || 0) + qty);
            rotationMap.set(nameKey, (rotationMap.get(nameKey) || 0) + qty);
          }
        }
      }

      const criticalPayload = criticalProducts.map((p) => {
        const recentSold =
          rotationMap.get(p.id) ??
          rotationMap.get(p.name.toLowerCase().trim()) ??
          0;
        return {
          producto: p.name,
          codigo: p.code,
          categoria: p.category,
          stockActual: p.stock,
          stockMinimo: p.minStock,
          costoUnitario: p.cost || 0,
          precioVenta: p.price,
          unidadesVendidasRecientemente: recentSold,
        };
      });

      const systemPrompt =
        "Sos un asistente de compras para kiosco argentino. Dado el inventario " +
        "crítico, priorizás la reposición según urgencia y retorno de inversión. " +
        "Respondé con una lista ordenada, clara y accionable. Incluí el costo " +
        "estimado de reposición usando los costos provistos.\n\n" +
        "Formato de salida esperado de Groq:\n" +
        "1. [URGENTE] Nombre producto — Stock: X / Mínimo: Y — Pedir: Z unidades — Inversión: $NNN\n" +
        "2. [MODERADO] ...\n" +
        "...\n" +
        "INVERSIÓN TOTAL ESTIMADA: $NNN";

      const userPrompt = `Comercio: ${store.name}
Total de productos en estado crítico: ${criticalProducts.length}

LISTA DE PRODUCTOS CON STOCK CRÍTICO (stock <= stockMinimo):
${JSON.stringify(criticalPayload, null, 2)}

Por favor, analizá y priorizá la compra de estos productos críticos según su urgencia, rotación y costo.
Respetá estrictamente el formato de salida solicitado con la etiqueta de urgencia ([URGENTE], [MODERADO], etc.), unidades a pedir, inversión por ítem y al final la INVERSIÓN TOTAL ESTIMADA.`;

      const response = await groqChat(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        { temperature: 0.2 },
      );

      setStockAiAnalysis(response);
    } catch (err: unknown) {
      setStockAiError(
        err instanceof Error
          ? err.message
          : "No se pudo completar el análisis de reposición con IA.",
      );
    } finally {
      setIsAnalyzingStock(false);
    }
  };

  const handleCopyOrder = async () => {
    if (!stockAiAnalysis) return;
    try {
      await navigator.clipboard.writeText(
        `📦 ORDEN DE COMPRA SUGERIDA - ${store.name}\n` +
          `Fecha: ${new Date().toLocaleDateString("es-AR")}\n\n` +
          stockAiAnalysis,
      );
      setCopiedOrder(true);
      setTimeout(() => setCopiedOrder(false), 2200);
    } catch {
      setCopiedOrder(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => (!stockFilter || unitsHere(p) <= p.minStock) && (!lowMarginFilter || p.margin_group === 'low_margin') &&
      (!q || (p.name + " " + p.code + " " + p.category + " " + (p.display_code || "") + " " + (p.pack_code || "")).toLowerCase().includes(q)),
    );
  }, [products, stockFilter, lowMarginFilter, query, unitsHere]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filtered.length);
  const paginatedProducts = filtered.slice(startIndex, endIndex);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
  }, [currentPage, totalPages]);
  return { criticalProducts, isAnalyzingStock, setIsAnalyzingStock, stockAiAnalysis, setStockAiAnalysis, stockAiError, setStockAiError, copiedOrder, setCopiedOrder, handleAnalyzeCriticalStock, handleCopyOrder, filtered, totalPages, currentPage, startIndex, endIndex, paginatedProducts, pageNumbers };
}
