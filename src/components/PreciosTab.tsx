import React, { useState } from "react";
import {
  Percent,
  Plus,
  Zap,
  TrendingUp,
  Search,
  Trash2,
  Edit2,
  Check,
} from "lucide-react";
import type { KioscoProduct, KioscoCategory } from "../types/kiosco";
import { playScannerBeep, playTapTone } from "../utils/audio";
import { useToast } from "../context/ToastContext";

interface PreciosTabProps {
  products: KioscoProduct[];
  setProducts: React.Dispatch<React.SetStateAction<KioscoProduct[]>>;
  onCreateProduct?: (product: KioscoProduct) => Promise<void>;
  onUpdatePrice?: (productId: string, newPrice: number) => Promise<void>;
  onDeleteProduct?: (productId: string) => Promise<void>;
}

export const PreciosTab: React.FC<PreciosTabProps> = ({
  products,
  setProducts,
  onCreateProduct,
  onUpdatePrice,
  onDeleteProduct,
}) => {
  const { notify } = useToast();

  // Create Product Form
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState<KioscoCategory>("Golosinas");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [stock, setStock] = useState("20");

  // Mass price increase form
  const [targetCategory, setTargetCategory] = useState<string>("TODOS");
  const [increasePercentage, setIncreasePercentage] = useState<number>(10);

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPriceInput, setEditPriceInput] = useState("");

  // Search in table
  const [searchTable, setSearchTable] = useState("");

  // Generate random Argentine EAN-13 barcode
  const handleGenerateBarcode = () => {
    playTapTone();
    const randomSuffix = Math.floor(1000000000 + Math.random() * 9000000000);
    setCode(`779${randomSuffix}`);
  };

  // Create fast product
  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price) {
      notify("warning", "Completá al menos el nombre y el precio de venta");
      return;
    }

    const pr = parseFloat(price);
    const co = cost.trim() ? Number(cost) : 0;
    const st = stock.trim() ? Number(stock) : 0;
    if (
      !Number.isFinite(pr) ||
      pr <= 0 ||
      !Number.isFinite(co) ||
      co < 0 ||
      !Number.isInteger(st) ||
      st < 0
    ) {
      notify(
        "warning",
        "Usá un precio mayor a cero, un costo válido y una cantidad de stock sin decimales.",
      );
      return;
    }
    const cd =
      code.trim() ||
      `779${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    if (products.some((p) => p.code === cd)) {
      notify(
        "warning",
        "Ya existe un producto con ese código. Buscalo en la lista para editarlo.",
      );
      return;
    }

    const emojiMap: Record<KioscoCategory, string> = {
      Golosinas: "🍬",
      Bebidas: "🥤",
      Cigarrillos: "🚬",
      Snacks: "🍪",
      Varios: "⚡",
    };

    const newProd: KioscoProduct = {
      id: `p_${Date.now()}`,
      code: cd,
      name: name.trim(),
      category,
      price: pr,
      cost: co,
      stock: st,
      minStock: 4,
      emoji: emojiMap[category],
    };

    setProducts((prev) => [newProd, ...prev]);
    if (onCreateProduct) {
      onCreateProduct(newProd);
    }
    setName("");
    setCode("");
    setPrice("");
    setCost("");
    setStock("20");
    playScannerBeep();
    notify(
      "success",
      `Producto "${newProd.name}" cargado con precio $${newProd.price.toLocaleString("es-AR")}`,
    );
  };

  // Mass price adjustment with round to multiple of $50
  const handleApplyMassIncrease = () => {
    if (!increasePercentage || increasePercentage <= 0) {
      notify("warning", "Ingresá un porcentaje de aumento mayor a 0%");
      return;
    }

    const affectedCount = products.filter(
      (p) => targetCategory === "TODOS" || p.category === targetCategory,
    ).length;
    if (!affectedCount) {
      notify("info", "No hay productos en esta categoría.");
      return;
    }
    if (
      !window.confirm(
        `Vas a aumentar ${increasePercentage}% el precio de ${affectedCount} productos, con redondeo a $50. ¿Aplicar el cambio?`,
      )
    )
      return;

    setProducts((prev) =>
      prev.map((p) => {
        if (targetCategory === "TODOS" || p.category === targetCategory) {
          const rawPrice = p.price * (1 + increasePercentage / 100);
          // Regla Kiosquera: Redondeo al múltiplo de $50 más cercano
          const roundedPrice = Math.round(rawPrice / 50) * 50;
          const finalPrice = Math.max(50, roundedPrice);
          if (onUpdatePrice) {
            onUpdatePrice(p.id, finalPrice);
          }
          return {
            ...p,
            price: finalPrice,
          };
        }
        return p;
      }),
    );

    playScannerBeep();
    notify(
      "success",
      `¡Aumento del +${increasePercentage}% aplicado a ${affectedCount} producto(s)! (Redondeo a múltiplos de $50)`,
    );
  };

  // Inline price update
  const handleSaveInlinePrice = (productId: string) => {
    const val = parseFloat(editPriceInput);
    if (!isNaN(val) && val > 0) {
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, price: val } : p)),
      );
      if (onUpdatePrice) {
        onUpdatePrice(productId, val);
      }
      setEditingId(null);
      notify("success", "Precio actualizado en base de datos");
    }
  };

  // Delete product
  const handleDeleteProduct = (productId: string, productName: string) => {
    if (
      !window.confirm(
        `¿Eliminar "${productName}" del catálogo? Esta acción no se puede deshacer.`,
      )
    )
      return;
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    if (onDeleteProduct) {
      onDeleteProduct(productId);
    }
    notify("info", `Producto "${productName}" eliminado de base de datos`);
  };

  const filteredProducts = products.filter(
    (p) =>
      !searchTable.trim() ||
      p.name.toLowerCase().includes(searchTable.toLowerCase()) ||
      p.code.includes(searchTable.trim()),
  );

  return (
    <div
      className="management-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "1.25rem",
        height: "100%",
        overflowY: "auto",
      }}
    >
      {/* Left Column: Formulario Minimalista & Aumentos Masivos */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* Fast Product Creation Card */}
        <div
          style={{
            background: "var(--bg-surface, #ffffff)",
            border: "1px solid var(--border-light, #e2e8f0)",
            borderRadius: "1.25rem",
            padding: "1.25rem",
            boxShadow: "var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.04))",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "0.5rem",
                background: "rgba(79, 70, 229, 0.1)",
                color: "#4f46e5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Plus size={18} />
            </div>
            <div>
              <div
                style={{
                  fontSize: "0.9375rem",
                  fontWeight: 900,
                  color: "var(--text-main, #0f172a)",
                }}
              >
                Alta Rápida de Artículo (Modo Kiosquero)
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted, #64748b)",
                }}
              >
                Carga en 4 campos esenciales sin burocracia
              </div>
            </div>
          </div>

          <form
            onSubmit={handleCreateProduct}
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            <div>
              <label
                htmlFor="product-field-1"
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#475569",
                }}
              >
                Descripción Comercial *
              </label>
              <input
                id="product-field-1"
                type="text"
                placeholder="Ej: Alfajor Milka Blanco Triple 70g"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.6rem 0.75rem",
                  borderRadius: "0.5rem",
                  border: "1px solid var(--border-light, #cbd5e1)",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  outline: "none",
                  marginTop: "3px",
                }}
              />
            </div>

            <div>
              <label
                htmlFor="product-field-2"
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#475569",
                }}
              >
                Código de barras o código interno
              </label>
              <div
                style={{ display: "flex", gap: "0.35rem", marginTop: "3px" }}
              >
                <input
                  id="product-field-2"
                  type="text"
                  placeholder="Escaneá con la pistola o generá uno..."
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "0.6rem 0.75rem",
                    borderRadius: "0.5rem",
                    border: "1px solid var(--border-light, #cbd5e1)",
                    fontSize: "0.8125rem",
                    fontFamily: "monospace",
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={handleGenerateBarcode}
                  style={{
                    padding: "0.6rem 0.85rem",
                    borderRadius: "0.5rem",
                    border: "1px solid #cbd5e1",
                    background: "#f8fafc",
                    color: "#4f46e5",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Zap size={14} /> Generar código
                </button>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1fr",
                gap: "0.5rem",
              }}
            >
              <div>
                <label
                  htmlFor="product-field-3"
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "#475569",
                  }}
                >
                  Rubro
                </label>
                <select
                  id="product-field-3"
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as KioscoCategory)
                  }
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.75rem",
                    borderRadius: "0.5rem",
                    border: "1px solid var(--border-light, #cbd5e1)",
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    marginTop: "3px",
                  }}
                >
                  <option value="Golosinas">🍬 Golosinas</option>
                  <option value="Bebidas">🥤 Bebidas</option>
                  <option value="Cigarrillos">🚬 Cigarrillos</option>
                  <option value="Snacks">🍪 Snacks</option>
                  <option value="Varios">⚡ Varios</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="product-field-4"
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "#475569",
                  }}
                >
                  Precio Venta ($) *
                </label>
                <input
                  id="product-field-4"
                  type="number"
                  placeholder="Ej: 1500"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.75rem",
                    borderRadius: "0.5rem",
                    border: "1px solid #4f46e5",
                    fontSize: "0.875rem",
                    fontWeight: 800,
                    color: "#4f46e5",
                    outline: "none",
                    marginTop: "3px",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.5rem",
              }}
            >
              <div>
                <label
                  htmlFor="product-field-5"
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "#475569",
                  }}
                >
                  Costo Compra ($)
                </label>
                <input
                  id="product-field-5"
                  type="number"
                  placeholder="Opcional..."
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.65rem",
                    borderRadius: "0.5rem",
                    border: "1px solid var(--border-light, #cbd5e1)",
                    fontSize: "0.8125rem",
                    marginTop: "3px",
                  }}
                />
              </div>
              <div>
                <label
                  htmlFor="product-field-6"
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "#475569",
                  }}
                >
                  Stock Inicial
                </label>
                <input
                  id="product-field-6"
                  type="number"
                  placeholder="20"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.65rem",
                    borderRadius: "0.5rem",
                    border: "1px solid var(--border-light, #cbd5e1)",
                    fontSize: "0.8125rem",
                    marginTop: "3px",
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              style={{
                marginTop: "0.5rem",
                padding: "0.75rem",
                borderRadius: "0.625rem",
                border: "none",
                background: "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: "0.875rem",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(79, 70, 229, 0.25)",
              }}
            >
              Agregar producto
            </button>
          </form>
        </div>

        {/* Mass Price Update (Inflación & Aumentos) */}
        <div
          style={{
            background: "var(--bg-surface, #ffffff)",
            border: "1px solid var(--border-light, #e2e8f0)",
            borderRadius: "1.25rem",
            padding: "1.25rem",
            boxShadow: "var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.04))",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.75rem",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "0.5rem",
                background: "rgba(245, 158, 11, 0.15)",
                color: "#d97706",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <TrendingUp size={18} />
            </div>
            <div>
              <div
                style={{
                  fontSize: "0.9375rem",
                  fontWeight: 900,
                  color: "var(--text-main, #0f172a)",
                }}
              >
                Actualizar precios por categoría
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted, #64748b)",
                }}
              >
                Regla obligatoria de kiosco: redondeo automático a múltiplos de
                $50
              </div>
            </div>
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1fr",
                gap: "0.5rem",
              }}
            >
              <div>
                <label
                  htmlFor="product-field-7"
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "#475569",
                  }}
                >
                  Categoría
                </label>
                <select
                  id="product-field-7"
                  value={targetCategory}
                  onChange={(e) => setTargetCategory(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.75rem",
                    borderRadius: "0.5rem",
                    border: "1px solid var(--border-light, #cbd5e1)",
                    fontSize: "0.8125rem",
                    fontWeight: 700,
                    marginTop: "3px",
                  }}
                >
                  <option value="TODOS">Todos los Artículos</option>
                  <option value="Golosinas">🍬 Golosinas</option>
                  <option value="Bebidas">🥤 Bebidas</option>
                  <option value="Cigarrillos">🚬 Cigarrillos</option>
                  <option value="Snacks">🍪 Snacks</option>
                  <option value="Varios">⚡ Varios</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="product-field-8"
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "#475569",
                  }}
                >
                  Porcentaje %
                </label>
                <input
                  id="product-field-8"
                  type="number"
                  value={increasePercentage}
                  onChange={(e) =>
                    setIncreasePercentage(parseFloat(e.target.value) || 0)
                  }
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.75rem",
                    borderRadius: "0.5rem",
                    border: "1px solid var(--border-light, #cbd5e1)",
                    fontSize: "0.875rem",
                    fontWeight: 800,
                    outline: "none",
                    marginTop: "3px",
                  }}
                />
              </div>
            </div>

            {/* Quick % Buttons */}
            <div style={{ display: "flex", gap: "0.35rem" }}>
              {[5, 10, 15, 20].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setIncreasePercentage(pct)}
                  style={{
                    flex: 1,
                    padding: "0.35rem 0.5rem",
                    borderRadius: "0.375rem",
                    border:
                      increasePercentage === pct
                        ? "2px solid #f59e0b"
                        : "1px solid #cbd5e1",
                    background:
                      increasePercentage === pct ? "#fef3c7" : "#ffffff",
                    color: increasePercentage === pct ? "#92400e" : "#475569",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  +{pct}%
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleApplyMassIncrease}
              style={{
                padding: "0.75rem",
                borderRadius: "0.625rem",
                border: "none",
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: "0.875rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
                boxShadow: "0 4px 12px rgba(245, 158, 11, 0.25)",
              }}
            >
              <Percent size={16} /> Aplicar +{increasePercentage}% a{" "}
              {targetCategory}
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Precios Actuales & Inline Editor */}
      <div
        style={{
          background: "var(--bg-surface, #ffffff)",
          border: "1px solid var(--border-light, #e2e8f0)",
          borderRadius: "1.25rem",
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          boxShadow: "var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.04))",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.9375rem",
                fontWeight: 900,
                color: "var(--text-main, #0f172a)",
              }}
            >
              Lista de Precios ({products.length} artículos)
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted, #64748b)",
              }}
            >
              Tocá el lápiz o el precio para editarlo en 1 click
            </div>
          </div>

          <div style={{ position: "relative", width: "180px" }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
              }}
            />
            <input
              type="text"
              aria-label="Buscar en la lista de precios"
              placeholder="Nombre o código..."
              value={searchTable}
              onChange={(e) => setSearchTable(e.target.value)}
              style={{
                width: "100%",
                padding: "0.35rem 0.5rem 0.35rem 1.6rem",
                borderRadius: "0.375rem",
                border: "1px solid #cbd5e1",
                fontSize: "0.75rem",
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: "auto" }}>
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
                  borderBottom: "1px solid #e2e8f0",
                  color: "#64748b",
                  textAlign: "left",
                }}
              >
                <th style={{ padding: "0.5rem 0.5rem" }}>PRODUCTO</th>
                <th style={{ padding: "0.5rem 0.5rem" }}>RUBRO</th>
                <th style={{ padding: "0.5rem 0.5rem", textAlign: "right" }}>
                  PRECIO VENTA
                </th>
                <th style={{ padding: "0.5rem 0.5rem", textAlign: "right" }}>
                  ACCIONES
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={4} className="table-empty">
                    {products.length
                      ? "No hay coincidencias. Probá con otro nombre o código."
                      : "Tu catálogo está vacío. Completá el formulario para agregar tu primer producto."}
                  </td>
                </tr>
              )}
              {filteredProducts.map((p) => {
                const isEditing = editingId === p.id;
                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "0.5rem 0.5rem" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.4rem",
                        }}
                      >
                        <span>{p.emoji || "📦"}</span>
                        <div>
                          <div style={{ fontWeight: 700, color: "#0f172a" }}>
                            {p.name}
                          </div>
                          <div
                            style={{
                              fontSize: "0.6875rem",
                              color: "#94a3b8",
                              fontFamily: "monospace",
                            }}
                          >
                            {p.code}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "0.5rem 0.5rem",
                        fontSize: "0.75rem",
                        color: "#64748b",
                      }}
                    >
                      {p.category}
                    </td>
                    <td
                      style={{ padding: "0.5rem 0.5rem", textAlign: "right" }}
                    >
                      {isEditing ? (
                        <div
                          style={{
                            display: "inline-flex",
                            gap: "2px",
                            alignItems: "center",
                          }}
                        >
                          <input
                            type="number"
                            value={editPriceInput}
                            onChange={(e) => setEditPriceInput(e.target.value)}
                            style={{
                              width: "75px",
                              padding: "2px 4px",
                              borderRadius: "4px",
                              border: "1px solid #6366f1",
                              fontWeight: 800,
                              fontSize: "0.8125rem",
                              textAlign: "right",
                            }}
                          />
                          <button
                            onClick={() => handleSaveInlinePrice(p.id)}
                            style={{
                              padding: "2px 4px",
                              borderRadius: "4px",
                              border: "none",
                              background: "#10b981",
                              color: "#fff",
                              cursor: "pointer",
                            }}
                          >
                            <Check size={12} aria-label="Guardar precio" />
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => {
                            setEditingId(p.id);
                            setEditPriceInput(String(p.price));
                          }}
                          style={{
                            fontWeight: 800,
                            color: "#4f46e5",
                            cursor: "pointer",
                            padding: "2px 4px",
                            borderRadius: "4px",
                          }}
                          title="Click para editar precio"
                        >
                          ${p.price.toLocaleString("es-AR")}
                        </span>
                      )}
                    </td>
                    <td
                      style={{ padding: "0.5rem 0.5rem", textAlign: "right" }}
                    >
                      <div style={{ display: "inline-flex", gap: "0.35rem" }}>
                        <button
                          onClick={() => {
                            setEditingId(p.id);
                            setEditPriceInput(String(p.price));
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#64748b",
                            cursor: "pointer",
                            padding: "2px",
                          }}
                          title="Editar precio"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#ef4444",
                            cursor: "pointer",
                            padding: "2px",
                          }}
                          title="Eliminar producto"
                        >
                          <Trash2 size={13} />
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
    </div>
  );
};
