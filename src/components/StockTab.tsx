import React, { useState } from "react";
import { AlertTriangle, Search, Sparkles, CheckCircle2 } from "lucide-react";
import type { KioscoProduct } from "../types/kiosco";
import { playScannerBeep, playTapTone } from "../utils/audio";
import { useToast } from "../context/ToastContext";

interface StockTabProps {
  products: KioscoProduct[];
  setProducts: React.Dispatch<React.SetStateAction<KioscoProduct[]>>;
  onTriggerChecklist: (key: string) => void;
  onUpdateStock?: (productId: string, newStock: number) => void;
}

export const StockTab: React.FC<StockTabProps> = ({
  products,
  setProducts,
  onTriggerChecklist,
  onUpdateStock,
}) => {
  const { notify } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("TODOS");

  // Adjust stock by delta
  const handleStockAdjust = (productId: string, delta: number) => {
    playTapTone();
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const finalStock = Math.max(0, product.stock + delta);
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: finalStock } : p)),
    );
    onUpdateStock?.(productId, finalStock);
    onTriggerChecklist("stock");
  };

  // Bulk supplier replenishment simulation
  const handleSupplierRestock = () => {
    playScannerBeep();
    const targets = products.filter((p) => p.stock <= p.minStock);
    const countReplenished = targets.length;
    if (!countReplenished) {
      notify("info", "No hay productos que necesiten reposición.");
      return;
    }
    if (
      !window.confirm(
        `Se sumarán 12 unidades a cada uno de los ${countReplenished} productos con stock bajo. ¿Recibiste esa mercadería?`,
      )
    )
      return;
    setProducts((prev) =>
      prev.map((p) =>
        p.stock <= p.minStock ? { ...p, stock: p.stock + 12 } : p,
      ),
    );
    targets.forEach((p) => onUpdateStock?.(p.id, p.stock + 12));

    onTriggerChecklist("stock");
    if (countReplenished > 0) {
      notify(
        "success",
        `¡Reposición de proveedor aplicada! +12 unidades añadidas a ${countReplenished} productos críticos.`,
      );
    } else {
      notify("info", "Todos los productos tienen niveles de stock saludables.");
    }
  };

  // Critical stock items
  const criticalProducts = products.filter((p) => p.stock <= p.minStock);

  const filteredProducts = products.filter((p) => {
    const matchesCat =
      categoryFilter === "TODOS" || p.category === categoryFilter;
    const matchesQuery =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.includes(searchQuery.trim());
    return matchesCat && matchesQuery;
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        height: "100%",
        overflowY: "auto",
      }}
    >
      {/* Top Banner & Fast Actions */}
      <div
        style={{
          background: criticalProducts.length > 0 ? "#fffbeb" : "#ecfdf5",
          border: `1.5px solid ${criticalProducts.length > 0 ? "#fde68a" : "#a7f3d0"}`,
          borderRadius: "1rem",
          padding: "1rem 1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "0.75rem",
              background:
                criticalProducts.length > 0
                  ? "rgba(245, 158, 11, 0.2)"
                  : "rgba(16, 185, 129, 0.2)",
              color: criticalProducts.length > 0 ? "#d97706" : "#059669",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {criticalProducts.length > 0 ? (
              <AlertTriangle size={22} />
            ) : (
              <CheckCircle2 size={22} />
            )}
          </div>
          <div>
            <div
              style={{
                fontSize: "0.9375rem",
                fontWeight: 800,
                color: "var(--text-main, #0f172a)",
              }}
            >
              {criticalProducts.length > 0
                ? `Atención: ${criticalProducts.length} producto(s) en nivel crítico de reposición`
                : "Inventario de mostrador al día — Sin faltantes críticos"}
            </div>
            <div
              style={{
                fontSize: "0.78125rem",
                color: "var(--text-muted, #64748b)",
              }}
            >
              {criticalProducts.length > 0
                ? "Artículos con stock igual o menor a su umbral mínimo de reposición urgente."
                : "Todos los productos cuentan con unidades suficientes para la rotación del turno."}
            </div>
          </div>
        </div>

        <button
          onClick={handleSupplierRestock}
          style={{
            padding: "0.625rem 1.15rem",
            borderRadius: "0.75rem",
            border: "none",
            background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
            color: "#ffffff",
            fontWeight: 800,
            fontSize: "0.8125rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            whiteSpace: "nowrap",
            boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)",
          }}
        >
          <Sparkles size={16} /> Reponer stock bajo (+12)
        </button>
      </div>

      {/* Filters Bar */}
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search
            size={18}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#64748b",
            }}
          />
          <input
            type="text"
            placeholder="Buscar por nombre o código de barras..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "0.625rem 1rem 0.625rem 2.4rem",
              borderRadius: "0.625rem",
              border: "1px solid var(--border-light, #cbd5e1)",
              fontSize: "0.875rem",
              outline: "none",
              background: "var(--bg-surface, #ffffff)",
            }}
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{
            padding: "0.625rem 1rem",
            borderRadius: "0.625rem",
            border: "1px solid var(--border-light, #cbd5e1)",
            fontSize: "0.8125rem",
            fontWeight: 700,
            background: "var(--bg-surface, #ffffff)",
            color: "var(--text-main, #0f172a)",
          }}
        >
          <option value="TODOS">Todos los Rubros</option>
          <option value="Golosinas">🍬 Golosinas</option>
          <option value="Bebidas">🥤 Bebidas</option>
          <option value="Cigarrillos">🚬 Cigarrillos</option>
          <option value="Snacks">🍪 Snacks</option>
          <option value="Varios">⚡ Varios</option>
        </select>
      </div>

      {/* Products Table */}
      <div
        style={{
          background: "var(--bg-surface, #ffffff)",
          border: "1px solid var(--border-light, #e2e8f0)",
          borderRadius: "1rem",
          overflow: "hidden",
          flex: 1,
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.8125rem",
          }}
        >
          <thead>
            <tr
              style={{
                background: "var(--bg-surface-elevated, #f8fafc)",
                borderBottom: "1px solid var(--border-light, #e2e8f0)",
                color: "var(--text-muted, #64748b)",
                textAlign: "left",
              }}
            >
              <th style={{ padding: "0.75rem 1rem" }}>ARTÍCULO</th>
              <th style={{ padding: "0.75rem 1rem" }}>CÓDIGO</th>
              <th style={{ padding: "0.75rem 1rem" }}>RUBRO</th>
              <th style={{ padding: "0.75rem 1rem" }}>PRECIO</th>
              <th style={{ padding: "0.75rem 1rem" }}>ESTADO</th>
              <th style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                STOCK ACTUAL
              </th>
              <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                AJUSTE RÁPIDO DE MOSTRADOR
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => {
              const isLow = product.stock <= product.minStock;
              return (
                <tr
                  key={product.id}
                  style={{
                    borderBottom: "1px solid var(--border-light, #f1f5f9)",
                    background: isLow ? "#fffdf7" : "transparent",
                  }}
                >
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <span style={{ fontSize: "1.25rem" }}>
                        {product.emoji || "📦"}
                      </span>
                      <span
                        style={{
                          fontWeight: 700,
                          color: "var(--text-main, #0f172a)",
                        }}
                      >
                        {product.name}
                      </span>
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "0.75rem 1rem",
                      fontFamily: "monospace",
                      color: "#64748b",
                    }}
                  >
                    {product.code}
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "9999px",
                        fontSize: "0.6875rem",
                        fontWeight: 700,
                        background: "#f1f5f9",
                        color: "#475569",
                      }}
                    >
                      {product.category}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "0.75rem 1rem",
                      fontWeight: 800,
                      color: "#0f172a",
                    }}
                  >
                    ${product.price.toLocaleString("es-AR")}
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    {isLow ? (
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: "9999px",
                          fontSize: "0.6875rem",
                          fontWeight: 800,
                          background: "#fef2f2",
                          color: "#dc2626",
                          border: "1px solid #fecaca",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                        }}
                      >
                        <AlertTriangle size={11} /> REPONER
                      </span>
                    ) : (
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: "9999px",
                          fontSize: "0.6875rem",
                          fontWeight: 700,
                          background: "#ecfdf5",
                          color: "#059669",
                        }}
                      >
                        OK
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                    <span
                      style={{
                        fontSize: "1rem",
                        fontWeight: 900,
                        color: isLow ? "#dc2626" : "#0f172a",
                      }}
                    >
                      {product.stock} un.
                    </span>
                    <div style={{ fontSize: "0.6875rem", color: "#94a3b8" }}>
                      mín: {product.minStock}
                    </div>
                  </td>
                  <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem",
                      }}
                    >
                      <button
                        onClick={() => handleStockAdjust(product.id, -1)}
                        style={{
                          padding: "0.3rem 0.5rem",
                          borderRadius: "0.375rem",
                          border: "1px solid #cbd5e1",
                          background: "#ffffff",
                          cursor: "pointer",
                          fontWeight: 700,
                          fontSize: "0.71875rem",
                        }}
                        title="Merma / rotura (-1)"
                      >
                        -1
                      </button>
                      <button
                        onClick={() => handleStockAdjust(product.id, 1)}
                        style={{
                          padding: "0.3rem 0.5rem",
                          borderRadius: "0.375rem",
                          border: "1px solid #cbd5e1",
                          background: "#ffffff",
                          cursor: "pointer",
                          fontWeight: 700,
                          fontSize: "0.71875rem",
                        }}
                        title="Ajuste unitario (+1)"
                      >
                        +1
                      </button>
                      <button
                        onClick={() => handleStockAdjust(product.id, 6)}
                        style={{
                          padding: "0.3rem 0.65rem",
                          borderRadius: "0.375rem",
                          border: "1px solid #bfdbfe",
                          background: "#eff6ff",
                          color: "#1d4ed8",
                          cursor: "pointer",
                          fontWeight: 800,
                          fontSize: "0.71875rem",
                        }}
                        title="Apertura pack de distribuidor (+6)"
                      >
                        +6 Pack
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
