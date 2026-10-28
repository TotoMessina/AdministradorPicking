import { useCallback, useEffect, useRef, useState } from 'react';
import { retail, errorMessage, type Product, type ProductDeletionRecord } from './api';
import type { Run } from './Management';
import { randomUUID } from '../../utils/uuid';

type Common = { storeId: string; active: boolean; busy: boolean; run: Run; onClose: () => void };

export function ProductDeletionEditor({ storeId, product, active, busy, run, onClose }: Common & { product: Product }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [permanent, setPermanent] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const saving = useRef(false);
  const request = useRef({ reason: '', id: randomUUID() });
  useEffect(() => { if (active && !permanent) input.current?.focus(); }, [active, permanent]);
  return <form className="retail-form product-editor" onSubmit={async event => {
    event.preventDefault();
    if (!active || busy || saving.current) return;
    saving.current = true; setError('');
    if (permanent) {
      if (!window.confirm(`¿Eliminar definitivamente ${product.name}? Se borrará del catálogo y de la botonera. Esta acción no se puede deshacer.`)) {
        saving.current = false;
        return;
      }
      try {
        const ok = await run(async () => {
          try { await retail.deleteProductPermanently(storeId, product.id); }
          catch (e) { setError(errorMessage(e)); throw e; }
        }, 'Producto eliminado definitivamente del catálogo.');
        if (ok) {
          window.dispatchEvent(new CustomEvent('retail-quick-products-changed', { detail: { store: storeId } }));
          onClose();
        }
      } finally { saving.current = false; }
      return;
    }
    if (request.current.reason !== reason.trim()) request.current = { reason: reason.trim(), id: randomUUID() };
    try {
      const ok = await run(async () => {
        try { await retail.archiveProduct(storeId, product.id, { ...request.current, product }); }
        catch (e) { setError(errorMessage(e)); throw e; }
      }, 'Producto eliminado del catálogo. Quedó registrado en Productos eliminados.');
      if (ok) {
        window.dispatchEvent(new CustomEvent('retail-quick-products-changed', { detail: { store: storeId } }));
        onClose();
      }
    } finally { saving.current = false; }
  }}>
    <h3>Eliminar {product.name}</h3>
    <p>Código: {product.code}.</p>
    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={permanent}
        disabled={busy}
        onChange={e => setPermanent(e.target.checked)}
      />
      <span>Eliminar definitivamente (borrado permanente, no se podrá restaurar)</span>
    </label>
    {permanent ? (
      <p style={{ color: 'var(--color-danger, #dc2626)' }}>
        Se borrará definitivamente del catálogo y de la botonera. Esta acción es irreversible.
      </p>
    ) : (
      <>
        <p>Dejará de aparecer en Productos y Vender. Se conservan sus datos, stock, ventas y movimientos. Podés restaurarlo desde Productos eliminados.</p>
        <label>Motivo (opcional)<textarea ref={input} maxLength={500} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} /></label>
      </>
    )}
    <p>Necesitás conexión.{!permanent && ' Se registrarán la fecha y tu usuario.'}</p>
    {error && <p role="alert">{error}</p>}
    <div className="button-row product-editor-actions">
      <button type="submit" className="danger-button" disabled={busy}>
        {permanent ? 'Eliminar definitivamente' : 'Eliminar producto'}
      </button>
      <button type="button" className="secondary-button" disabled={busy} onClick={onClose}>Cancelar</button>
    </div>
  </form>;
}

export function DeletedProducts({ storeId, active, busy, run, onClose }: Common) {
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [rows, setRows] = useState<ProductDeletionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [more, setMore] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  const restoring = useRef(false);
  const requests = useRef(new Map<string, string>());
  const load = useCallback(async (query: string, cursor?: ProductDeletionRecord) => {
    const current = ++generation.current;
    setLoading(true); setError('');
    try {
      const page = await retail.productDeletionHistory(storeId, query, cursor);
      if (current !== generation.current) return;
      setRows(previous => cursor ? [...previous, ...page] : page);
      setMore(page.length === 50);
      setAppliedSearch(query);
    } catch (e) { if (current === generation.current) setError(errorMessage(e)); }
    finally { if (current === generation.current) setLoading(false); }
  }, [storeId]);
  useEffect(() => {
    if (!active) return;
    input.current?.focus();
    void load(appliedSearch);
    return () => { generation.current++; };
    // Reload when returning to this screen; keep the search draft intact.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, load]);
  return <section className="retail-form product-editor" aria-label="Productos eliminados">
    <h3>Productos eliminados</h3>
    <p>Historial de eliminaciones y restauraciones del comercio. Requiere conexión. Restaurar recupera el producto con los datos que conserva, sin duplicarlo ni reponer stock.</p>
    <form className="button-row" onSubmit={event => { event.preventDefault(); if (active && !loading && !busy) void load(search); }}>
      <label>Buscar por nombre o código<input ref={input} value={search} onChange={event => setSearch(event.target.value)} disabled={busy} /></label>
      <button className="secondary-button" disabled={loading || busy}>Buscar</button>
      <button type="button" className="text-button" disabled={loading || busy} onClick={() => void load(appliedSearch)}>Actualizar</button>
      <button type="button" className="secondary-button" disabled={busy} onClick={onClose}>Volver a productos</button>
    </form>
    {error && <p role="alert">{error} Podés volver a intentar con Actualizar.</p>}
    {loading && <p role="status">Cargando historial…</p>}
    {!loading && !error && !rows.length && <p>No hay registros para esta búsqueda.</p>}
    <div className="table-scroll"><table>
      <thead><tr><th>Producto</th><th>Acción y fecha</th><th>Usuario y motivo</th><th>Acciones</th></tr></thead>
      <tbody>{rows.map((row, index) => <tr key={row.id}>
        <td><strong>{row.product_name}</strong><small>{row.product_code}</small></td>
        <td>{row.event_type === 'restored' ? 'Restaurado' : row.event_type === 'prior' ? 'Eliminado antes del historial' : 'Eliminado'}<small>{row.occurred_at ? new Date(row.occurred_at).toLocaleString('es-AR') : 'Fecha anterior no disponible'}</small></td>
        <td>{row.actor_email || (row.event_type === 'prior' ? 'Usuario no disponible' : 'Sistema / usuario no disponible')}<small>{row.reason || 'Sin motivo registrado'}</small></td>
        <td>{row.currentActive === true ? 'En catálogo' : row.currentActive === null ? 'No disponible' : rows.findIndex(item => item.product_id === row.product_id) === index && (
          <div className="button-row" style={{ gap: '0.4rem', flexWrap: 'wrap' }}>
            <button type="button" className="secondary-button" disabled={busy || loading} onClick={async () => {
              if (!active || busy || restoring.current || !window.confirm(`¿Restaurar ${row.product_name} al catálogo? Se conservarán sus datos y stock actuales.`)) return;
              restoring.current = true; setError('');
              const request = requests.current.get(row.product_id) || randomUUID();
              requests.current.set(row.product_id, request);
              try {
                const ok = await run(async () => {
                  try { await retail.restoreProduct(storeId, row.product_id, request); }
                  catch (e) { setError(errorMessage(e)); throw e; }
                }, 'Producto restaurado. La acción quedó registrada.');
                if (ok) {
                  requests.current.delete(row.product_id);
                  window.dispatchEvent(new CustomEvent('retail-quick-products-changed', { detail: { store: storeId } }));
                  await load(appliedSearch);
                }
              } finally { restoring.current = false; }
            }} aria-label={`Restaurar ${row.product_name}`}>Restaurar</button>
            <button type="button" className="danger-button" disabled={busy || loading} onClick={async () => {
              if (!active || busy || !window.confirm(`¿Eliminar definitivamente ${row.product_name}? Se borrará del catálogo y de la botonera. Esta acción no se puede deshacer.`)) return;
              setError('');
              try {
                const ok = await run(async () => {
                  try { await retail.deleteProductPermanently(storeId, row.product_id); }
                  catch (e) { setError(errorMessage(e)); throw e; }
                }, 'Producto eliminado definitivamente.');
                if (ok) {
                  window.dispatchEvent(new CustomEvent('retail-quick-products-changed', { detail: { store: storeId } }));
                  await load(appliedSearch);
                }
              } catch (e) { setError(errorMessage(e)); }
            }} aria-label={`Eliminar definitivamente ${row.product_name}`}>Eliminar definitivamente</button>
          </div>
        )}</td>
      </tr>)}</tbody>
    </table></div>
    {more && <button type="button" className="secondary-button" disabled={loading || busy} onClick={() => void load(appliedSearch, rows[rows.length - 1])}>Ver más registros</button>}
  </section>;
}
