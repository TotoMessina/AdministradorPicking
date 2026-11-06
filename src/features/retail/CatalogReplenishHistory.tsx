import { History, PackageCheck, X } from "lucide-react";
import type { CatalogEditorState } from './useCatalogEditor';

/** Historial de reposiciones. Vista extraída de la planilla; el estado vive en useCatalogEditor. */
export function CatalogReplenishHistory({ s }: { s: CatalogEditorState }) {
  const { products, role, isHistoryModalOpen, setIsHistoryModalOpen, historyList, expandedRecordId, setExpandedRecordId } = s;
  return (
    <>
      {/* Modal 3: Historial de Reposiciones de Stock */}
      {isHistoryModalOpen && (
        <div
          className="ai-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="history-modal-title"
        >
          <div className="ai-modal-card history-modal-card">
            <div className="ai-modal-header">
              <div className="ai-modal-title" id="history-modal-title">
                <History size={20} className="ai-brand-icon" />
                <h3>Historial de Reposiciones de Stock</h3>
              </div>
              <button
                type="button"
                className="ai-modal-close"
                onClick={() => setIsHistoryModalOpen(false)}
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="history-modal-body">
              {historyList.length === 0 ? (
                <div className="history-empty-state">
                  <PackageCheck size={36} className="empty-icon" />
                  <h4>No hay reposiciones registradas todavía</h4>
                  <p>
                    Cada vez que repongas stock de forma unitaria o mediante
                    planilla CSV, el ingreso quedará registrado acá para tu
                    control y auditoría.
                  </p>
                </div>
              ) : (
                <div className="history-timeline">
                  {historyList.map((record) => {
                    const isExpanded = expandedRecordId === record.id;
                    const dateFormatted = new Date(
                      record.createdAt,
                    ).toLocaleString("es-AR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    });

                    return (
                      <div key={record.id} className="history-item-card">
                        <div
                          className="history-item-header"
                          onClick={() =>
                            setExpandedRecordId(isExpanded ? null : record.id)
                          }
                        >
                          <div className="history-header-left">
                            <span
                              className={`replenish-type-badge ${record.type}`}
                            >
                              {record.type === "csv"
                                ? "Planilla CSV"
                                : "Unitaria"}
                            </span>
                            <span className="history-date">
                              {dateFormatted}
                            </span>
                          </div>

                          <div className="history-header-right">
                            <span className="history-units-badge">
                              +{record.totalUnits} u.
                            </span>
                            <span className="history-products-count">
                              ({record.itemsCount}{" "}
                              {record.itemsCount === 1
                                ? "producto"
                                : "productos"}
                              )
                            </span>
                          </div>
                        </div>

                        {(record.supplier || record.notes) && (
                          <div className="history-meta-row">
                            {record.supplier && (
                              <span className="history-supplier">
                                <strong>Proveedor:</strong> {record.supplier}
                              </span>
                            )}
                            {record.notes && (
                              <span className="history-notes">
                                <strong>Nota / Remito:</strong> {record.notes}
                              </span>
                            )}
                          </div>
                        )}

                        {isExpanded && (
                          <div className="history-expanded-items">
                            <table className="history-items-table">
                              <thead>
                                <tr>
                                  <th>Producto</th>
                                  <th>Stock previo</th>
                                  <th>Ingreso</th>
                                  <th>Stock resultante</th>
                                  <th>Costo</th>
                                </tr>
                              </thead>
                              <tbody>
                                {record.items.map((item, idx) => (
                                  <tr key={idx}>
                                    <td>
                                      <strong>{item.name}</strong>
                                      <small>{item.code}</small>
                                    </td>
                                    <td>{item.previousStock} u.</td>
                                    <td>
                                      <strong className="text-success">
                                        +{item.quantityAdded} u.
                                      </strong>
                                    </td>
                                    <td>
                                      <strong>{item.newStock} u.</strong>
                                    </td>
                                    <td>
                                      {item.cost
                                        ? `$${item.cost.toLocaleString("es-AR")}`
                                        : "-"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="ai-modal-footer">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setIsHistoryModalOpen(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
