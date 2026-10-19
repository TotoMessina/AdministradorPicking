import { useRef, useState } from 'react';
import { Check, ChevronDown, RefreshCw, X } from 'lucide-react';
import { errorMessage, retail, type Branch, type Product, type PendingReplenishment } from './api';
import type { Run } from './Management';
import { RemitoItems } from './RemitoItems';
import { RemitoPhoto } from './RemitoPhoto';
import { validRemitoQuantity } from './remitos';

function PendingRemitoCard({ record, store, products, branches, run, busy, onReviewed }: {
  record: PendingReplenishment; store: string; products: Product[]; branches: Branch[]; run: Run; busy: boolean; onReviewed: (id: string) => void;
}) {
  const [items, setItems] = useState(record.items);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const working = useRef(false);
  const totals = new Map<string, number>();
  for (const item of items) if (item.product_id) totals.set(item.product_id, (totals.get(item.product_id) || 0) + item.quantity);
  const valid = items.length > 0 && items.every(item => validRemitoQuantity(item.quantity) && products.some(product => product.id === item.product_id && product.active !== false))
    && [...totals.values()].every(quantity => quantity <= 1000000);
  const review = async (approve: boolean) => {
    if (working.current || busy) return;
    if (approve && !valid) { setError('Vinculá todos los artículos y revisá las cantidades antes de aprobar.'); return; }
    if (!approve && !reason.trim()) { setError('Ingresá el motivo del rechazo.'); return; }
    working.current = true; setError('');
    let failure: unknown;
    try {
      const saved = await run(async () => {
        try {
          if (navigator.onLine === false) throw new Error('Necesitás conexión para validar este remito.');
          if (approve) await retail.approvePendingReplenishment(store, record.id, items);
          else await retail.rejectPendingReplenishment(store, record.id, reason);
        } catch (err) { failure = err; throw err; }
      }, approve ? 'Remito aprobado. Stock actualizado.' : 'Remito rechazado. El stock no se modificó.');
      if (saved) onReviewed(record.id);
      else setError(failure ? errorMessage(failure) : 'No se pudo completar la revisión. Reintentá.');
    } finally { working.current = false; }
  };
  return <article className="pending-remito-card">
    <header><div><h3>{branches.find(branch => branch.id === record.branch_id)?.name || (record.branch_id ? 'Sucursal asignada' : 'Sin sucursal')}</h3>
      <small>Enviado el {new Date(record.submitted_at).toLocaleString('es-AR')} · {record.items.length} artículos detectados</small></div><span className="remito-status">Pendiente de validación</span></header>
    <div className="pending-remito-content"><RemitoPhoto store={store} reference={record.image_url} /><div>
      {record.notes && <p className="remito-notes"><strong>Notas del empleado:</strong> {record.notes}</p>}
      {record.extracted_text && <details className="remito-ocr"><summary>Ver texto extraído</summary><pre>{record.extracted_text}</pre></details>}
      <RemitoItems items={items} products={products} onChange={setItems} linking disabled={busy} />
    </div></div>
    {!valid && <p className="remito-warning">Para aprobar, vinculá cada artículo y completá cantidades enteras positivas. Máximo 1.000.000 de unidades por producto.</p>}
    <div className="pending-remito-actions"><button type="button" className="primary-button" disabled={busy || !valid || rejecting} onClick={() => void review(true)}><Check size={16} /> Aprobar e ingresar {items.reduce((sum, item) => sum + (Number.isFinite(item.quantity) ? item.quantity : 0), 0).toLocaleString('es-AR')} unidades</button>
      <button type="button" className="secondary-button" disabled={busy} onClick={() => { setRejecting(previous => !previous); setError(''); }}><X size={16} /> {rejecting ? 'Cancelar rechazo' : 'Rechazar'}</button></div>
    {rejecting && <div className="remito-rejection"><label>Motivo del rechazo<textarea rows={2} maxLength={1000} required value={reason} disabled={busy} onChange={event => setReason(event.target.value)} /></label><button type="button" className="secondary-button" disabled={busy || !reason.trim()} onClick={() => void review(false)}>Confirmar rechazo</button></div>}
    {error && <p className="remito-error" role="alert">{error}</p>}
  </article>;
}

export function PendingReplenishments({ store, records, error, branches, products, run, busy, onRefresh, onReviewed }: {
  store: string; records: PendingReplenishment[]; error: string; branches: Branch[]; products: Product[]; run: Run; busy: boolean;
  onRefresh: () => void; onReviewed: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [visible, setVisible] = useState(10);
  return <section className="pending-remitos-panel" aria-label="Remitos pendientes">
    <div className="section-heading"><button type="button" className="remito-panel-toggle" aria-expanded={open} aria-controls="pending-remitos-list" onClick={() => setOpen(previous => !previous)}><ChevronDown size={16} /><strong>Remitos pendientes</strong><span className="remito-count">{records.length}</span></button>
      <button type="button" className="secondary-button" disabled={busy} onClick={onRefresh}><RefreshCw size={15} /> Actualizar remitos</button></div>
    {error && <p className="remito-error" role="alert">No se pudieron actualizar los remitos. {error}</p>}
    <div id="pending-remitos-list" hidden={!open}>
      <p>Revisá la foto, los productos y las cantidades. Aprobar ingresa las unidades al stock compartido del comercio.</p>
      {!records.length && !error && <p>No hay remitos pendientes de validación.</p>}
      {records.slice(0, visible).map(record => <PendingRemitoCard key={record.id} store={store} record={record} products={products} branches={branches} run={run} busy={busy} onReviewed={onReviewed} />)}
      {records.length > visible && <button type="button" className="secondary-button" onClick={() => setVisible(previous => previous + 10)}>Mostrar más remitos</button>}
    </div>
  </section>;
}
