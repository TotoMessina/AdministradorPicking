import { Check, Loader2, RefreshCw, X } from 'lucide-react';
import { DataTable } from '../DataTable';
import { MovementReceipt, receiptNumber } from '../MovementReceipt';
import { money, statuses } from './transferHelpers';
import type { LocationTransfersState } from './useLocationTransfers';

/** Historial de transferencias. */
export function TransferHistory({ state }: { state: LocationTransfersState }) {
  const {
    store, mode, composing, selectedNode, receipt, setReceipt, stockError, fundError, actionError,
    loading, filter, setFilter, stockMore, fundMore, visible, setVisible, disabled, placeName, load,
    review, shownStock, shownFunds, more,
  } = state;
  return (
    <div hidden={composing}>
    <div className="section-heading location-transfer-history-heading"><div><h3>Historial {selectedNode ? `· ${placeName(selectedNode)}` : ''}</h3><small>Recorridos del historial cargado. Los registros anteriores no modificaron inventario.</small></div>
      <button type="button" className="secondary-button" disabled={disabled || loading} onClick={() => void load()}><RefreshCw size={15} /> Actualizar</button></div>
    {mode === 'stock' && <label className="stock-transfer-filter">Estado<select value={filter} onChange={event => { setFilter(event.target.value as typeof filter); setVisible(25); }}><option value="all">Todos</option><option value="pending">Pendientes</option><option value="confirmed">Confirmadas</option><option value="cancelled">Canceladas</option></select></label>}
    {loading && <p role="status"><Loader2 size={15} className="spin" /> Actualizando historial…</p>}
    {(mode === 'stock' ? stockError : fundError) && <p role="alert" className="error-banner">{mode === 'stock' ? stockError : fundError}</p>}
    {actionError && <p role="alert" className="error-banner">{actionError}</p>}
    {mode === 'stock' ? <DataTable label="Historial de traslados de mercadería" rows={shownStock.slice(0, visible)} rowKey={row => row.id} detailLabel="Productos"
      empty={loading ? 'Cargando…' : 'Sin movimientos para esta selección.'} rowClass={row => row.status === 'cancelled' ? 'is-muted' : undefined}
      columns={[
        { id: 'date', label: 'Fecha', cell: row => <time dateTime={row.created_at}>{new Date(row.created_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</time> },
        { id: 'status', label: 'Estado', cell: row => <><span className={`pill ${row.status === 'pending' ? 'is-pending' : row.status === 'cancelled' ? 'is-warning' : 'is-ok'}`}>{statuses[row.status]}</span>{row.legacy && <small>Registro anterior</small>}</> },
        { id: 'from', label: 'Desde', cell: row => placeName(row.from_location) },
        { id: 'to', label: 'Hacia', cell: row => placeName(row.to_location) },
        { id: 'units', label: 'Unidades', num: true, cell: row => <>{row.items.reduce((sum, item) => sum + item.qty, 0).toLocaleString('es-AR')}<small>{row.items.length} {row.items.length === 1 ? 'producto' : 'productos'}</small></> },
        { id: 'notes', label: 'Notas', cell: row => row.notes || '—' },
        { id: 'actor', label: 'Quién', cell: row => <>{row.actor_email ? <span title={row.actor_email}>{row.actor_email.split('@')[0]}</span> : '—'}{row.reviewed_at && <small>Revisada {new Date(row.reviewed_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</small>}</> },
      ]}
      actions={row => row.status === 'pending' ? <>
        <button type="button" className="primary-button" disabled={disabled} onClick={() => review(row, true)}><Check size={14} /> {row.legacy ? 'Confirmar registro' : 'Confirmar'}</button>
        <button type="button" className="secondary-button" disabled={disabled} onClick={() => review(row, false)}><X size={14} /> Cancelar</button></> : null}
      detail={row => <ul className="location-transfer-items">{row.items.map(item => <li key={item.product_id}>{item.product_name} × {item.qty.toLocaleString('es-AR')}</li>)}</ul>} />
    : <DataTable label="Historial de movimientos de plata" rows={shownFunds.slice(0, visible)} rowKey={row => row.id}
      empty={loading ? 'Cargando…' : 'Sin movimientos para esta selección.'} rowClass={row => row.status === 'returned' ? 'is-muted' : undefined}
      columns={[
        { id: 'date', label: 'Fecha', cell: row => <time dateTime={row.created_at}>{new Date(row.created_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</time> },
        { id: 'kind', label: 'Movimiento', cell: row => <><span className={`pill ${row.status === 'in_transit' ? 'is-pending' : row.status === 'returned' ? 'is-warning' : 'is-ok'}`}>
          {row.shift_id ? 'Cierre de caja' : row.from_location === null ? 'Ingreso' : row.to_location === null ? 'Salida' : row.status === 'in_transit' ? 'En camino' : row.status === 'received' ? 'Pase recibido' : row.status === 'returned' ? 'Volvió al origen' : 'Pase'}</span>
          {row.received_at && <small>{row.status === 'returned' ? 'Devuelta' : 'Recibida'} {new Date(row.received_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}{row.received_email ? ` · ${row.received_email}` : ''}{row.review_note ? ` · ${row.review_note}` : ''}</small>}</> },
        { id: 'from', label: 'Sale de', cell: row => row.from_location === null ? <span className="product-sheet-muted">{row.shift_id ? 'Ventas de la caja' : 'Exterior'}</span> : placeName(row.from_location) },
        { id: 'to', label: 'Va a', cell: row => row.to_location === null ? <span className="product-sheet-muted">{row.shift_id ? 'Faltante de la caja' : 'Exterior'}</span> : placeName(row.to_location) },
        { id: 'amount', label: 'Importe', num: true, cell: row => <span className={row.from_location === null ? 'is-credit' : row.to_location === null ? 'is-debt' : undefined}>{money(row.amount)}
          {row.status === 'received' && row.received_amount != null && row.received_amount < row.amount && <small className="funds-in-transit-late">Llegaron {money(row.received_amount)}</small>}</span> },
        { id: 'note', label: 'Motivo', cell: row => row.note },
        { id: 'actor', label: 'Quién', cell: row => row.actor_email ? <span title={row.actor_email}>{row.actor_email.split('@')[0]}</span> : '—' },
      ]}
      actions={row => !row.shift_id && row.status !== 'returned' ? <button type="button" className="text-button" onClick={() => setReceipt({ series: row.from_location === null ? 'income' : row.to_location === null ? 'payment' : 'transfer',
        number: row.receipt_number, amount: row.amount, at: row.created_at, concept: row.note,
        source: row.from_location === null ? null : placeName(row.from_location), destination: row.to_location === null ? null : placeName(row.to_location), actor: row.actor_email })}>
        {row.receipt_number ? `${row.from_location && row.to_location ? 'Constancia' : 'Recibo'} N° ${receiptNumber(row.receipt_number)}` : 'Recibo'}</button> : null} />}
    {(mode === 'stock' ? shownStock.length : shownFunds.length) > visible && <button type="button" className="secondary-button" onClick={() => setVisible(previous => previous + 25)}>Mostrar más movimientos</button>}
    {receipt && <MovementReceipt store={store} receipt={receipt} onClose={() => setReceipt(null)} />}
    {(mode === 'stock' ? stockMore : fundMore) && <button type="button" className="secondary-button" disabled={disabled || loading} onClick={() => void more()}>Cargar historial anterior</button>}
    </div>
  );
}
