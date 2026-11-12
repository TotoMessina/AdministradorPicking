import type { ReceiptView } from './receiptDetails';

/** Productos vendidos. */
export function ReceiptItems({ view }: { view: ReceiptView }) {
  const { sale } = view;
  return (
    <>
      {/* Items */}
      <div style={{ marginBottom: "0.75rem" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.75rem",
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: "1px solid #e2e8f0",
                color: "#64748b",
                fontSize: "0.6875rem",
              }}
            >
              <th style={{ textAlign: "left", paddingBottom: "4px" }}>
                CANT
              </th>
              <th style={{ textAlign: "left", paddingBottom: "4px" }}>
                ARTICULO
              </th>
              <th style={{ textAlign: "right", paddingBottom: "4px" }}>
                SUBTOTAL
              </th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item, idx) => (
              <tr
                key={idx}
                style={{ borderBottom: "1px dotted #f1f5f9" }}
              >
                <td style={{ fontWeight: 800, padding: "3px 0" }}>
                  {item.qty}x
                </td>
                <td style={{ padding: "3px 4px" }}>{item.name}</td>
                <td
                  style={{
                    textAlign: "right",
                    fontWeight: 700,
                    padding: "3px 0",
                  }}
                >
                  ${item.subtotal.toLocaleString("es-AR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
