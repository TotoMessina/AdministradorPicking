import type { CatalogEditorState } from '../useCatalogEditor';

/** Vista previa de los productos con su precio nuevo. */
export function BulkPricePreview({ s }: { s: CatalogEditorState }) {
  const { costBulk, bulkMatchedProducts, bulkPlan, calculateNewPrice } = s;
  return (
    <>
      {/* 4. PREVISUALIZACIÓN DE PRODUCTOS */}
      <div className="bulk-preview-wrap">
        <div className="bulk-preview-header">
          <h4>Previsualización de Cambios</h4>
          <span className="preview-counter-badge">
            {bulkMatchedProducts.length} productos seleccionados
          </span>
        </div>

        {bulkMatchedProducts.length === 0 ? (
          <div className="bulk-preview-empty">
            <p>Ningún producto coincide con los filtros seleccionados.</p>
          </div>
        ) : (
          <div className="bulk-preview-table-scroll">
            <table className="bulk-preview-table">
              <thead>
                <tr>
                  <th>Emoji</th>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th>Marca</th>
                  <th>Distribuidor</th>
                  {costBulk && <th>Ganancia</th>}
                  <th>Precio actual</th>
                  <th>Precio nuevo</th>
                  <th>Delta</th>
                </tr>
              </thead>
              <tbody>
                {bulkMatchedProducts.map((p) => {
                  const newPrice = calculateNewPrice(p);
                  const delta = newPrice - p.price;
                  const plan = costBulk ? bulkPlan(p) : null;
                  return (
                    <tr key={p.id}>
                      <td className="center-cell">{p.emoji || "📦"}</td>
                      <td>
                        <strong>{p.name}</strong>
                        <small className="code-sub">{p.code}</small>
                      </td>
                      <td>{p.category}</td>
                      <td>{p.brand || <span className="muted-dash">-</span>}</td>
                      <td>{p.supplier || <span className="muted-dash">-</span>}</td>
                      {costBulk && <td>{plan
                        ? <>{p.sale_markup != null ? `${p.sale_markup.toLocaleString('es-AR')}%` : 'Manual'} → <strong>{plan.markup.toLocaleString('es-AR')}%</strong></>
                        : <span className="muted-dash">{p.cost > 0 ? 'Revisá el valor' : 'Sin costo: no cambia'}</span>}</td>}
                      <td className="price-cell">
                        ${p.price.toLocaleString("es-AR")}
                      </td>
                      <td className="new-price-cell">
                        <strong>${newPrice.toLocaleString("es-AR")}</strong>
                      </td>
                      <td className="delta-cell">
                        <span
                          className={`table-delta ${delta >= 0 ? "plus" : "minus"}`}
                        >
                          {delta >= 0 ? "+" : ""}
                          ${delta.toLocaleString("es-AR")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
