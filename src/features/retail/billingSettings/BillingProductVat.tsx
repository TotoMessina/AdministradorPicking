import { useEffect, useMemo, useState } from 'react';
import { askConfirm } from '../../../components/ConfirmHost';
import { supabase } from '../../../lib/supabase';
import { errorMessage, retail } from '../api';
import type { ProductVatRow } from '../api/billing';
import { IVA_RATE_OPTIONS, type IvaRate } from '../billing';
import type { BillingSettingsState } from './useBillingSettings';

const rateLabel = (rate: IvaRate) => IVA_RATE_OPTIONS.find(o => o.id === rate)?.label || `${rate}%`;

/**
 * IVA de cada producto. La factura informa el IVA por alícuota según los productos vendidos:
 * por defecto todos van al 21% y acá se marcan los que llevan otra alícuota o son exentos.
 */
export function BillingProductVat({ state }: { state: BillingSettingsState }) {
  const { store, active, busy, run } = state;
  const [rows, setRows] = useState<ProductVatRow[] | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [rate, setRate] = useState<IvaRate>('10.5');

  useEffect(() => {
    if (!active || store.condicion_iva !== 'RI') return;
    let live = true;
    setLoadError('');
    Promise.all([
      retail.productVatRows(store.id),
      supabase.from('retail_categories').select('id,name').eq('store_id', store.id).order('name'),
    ]).then(([products, cats]) => {
      if (!live) return;
      if (cats.error) throw cats.error;
      setRows(products);
      setCategories((cats.data || []) as { id: string; name: string }[]);
    }).catch(err => { if (live) setLoadError(`No se pudo cargar el IVA de los productos. ${errorMessage(err)}`); });
    return () => { live = false; };
  }, [active, store.id, store.condicion_iva, reload]);

  const counts = useMemo(() => {
    const map = new Map<IvaRate, number>();
    for (const row of rows || []) map.set(row.iva_rate, (map.get(row.iva_rate) || 0) + 1);
    return map;
  }, [rows]);
  const exceptions = useMemo(() => (rows || []).filter(r => r.iva_rate !== '21'), [rows]);
  const matches = useMemo(() => {
    const text = search.trim().toLowerCase();
    if (text.length < 2) return [];
    return (rows || []).filter(r => r.name.toLowerCase().includes(text) || (r.code || '').includes(text)).slice(0, 12);
  }, [rows, search]);

  // Monotributo emite Factura C: no discrimina IVA.
  if (store.condicion_iva !== 'RI') return null;

  const apply = async (ids: string[], newRate: IvaRate, label: string) => {
    if (!ids.length) return;
    await run(async () => {
      await retail.setProductsIva(store.id, ids, newRate);
      setReload(v => v + 1);
    }, `IVA ${rateLabel(newRate)} aplicado a ${label}.`);
  };

  const applyCategory = async () => {
    const ids = (rows || []).filter(r => r.category_id === categoryId).map(r => r.id);
    const name = categories.find(c => c.id === categoryId)?.name || 'la categoría';
    if (!ids.length) return;
    if (!await askConfirm(`¿Poner IVA ${rateLabel(rate)} a los ${ids.length} productos de «${name}»?`)) return;
    await apply(ids, rate, `${ids.length} productos de ${name}`);
  };

  return (
    <div className="billing-credentials-box">
      <h4>IVA de los productos</h4>
      <p style={{ marginTop: 0, fontSize: 13, color: 'var(--tone-muted)' }}>
        La factura informa el IVA de cada alícuota según lo vendido. Los productos van al 21% salvo los que marques acá.
        Confirmá las alícuotas con tu contador.
      </p>
      {loadError && <p role="alert">{loadError}</p>}
      {!rows && !loadError && <p role="status">Cargando productos…</p>}
      {rows && (
        <>
          <p style={{ fontSize: 13 }}>
            {IVA_RATE_OPTIONS.filter(o => counts.get(o.id)).map(o => `${rateLabel(o.id)}: ${counts.get(o.id)}`).join(' · ') || 'Sin productos'}
          </p>

          <div className="billing-form-grid">
            <div className="billing-field">
              <label htmlFor="vat-rate">Alícuota a aplicar</label>
              <select id="vat-rate" value={rate} disabled={busy} onChange={e => setRate(e.target.value as IvaRate)}>
                {IVA_RATE_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>
            <div className="billing-field">
              <label htmlFor="vat-category">A toda una categoría</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select id="vat-category" value={categoryId} disabled={busy} onChange={e => setCategoryId(e.target.value)} style={{ flex: 1 }}>
                  <option value="">Elegí una categoría</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button type="button" className="secondary-button" disabled={busy || !categoryId} onClick={applyCategory}>Aplicar</button>
              </div>
            </div>
            <div className="billing-field">
              <label htmlFor="vat-search">A un producto</label>
              <input id="vat-search" type="search" placeholder="Nombre o código" value={search} disabled={busy}
                onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {matches.length > 0 && (
            <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0' }}>
              {matches.map(r => (
                <li key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                  <span>{r.name} <small style={{ color: 'var(--tone-muted)' }}>· {rateLabel(r.iva_rate)}</small></span>
                  <button type="button" className="text-button" disabled={busy || r.iva_rate === rate}
                    onClick={() => apply([r.id], rate, r.name)}>
                    Poner {rateLabel(rate)}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {exceptions.length > 0 && (
            <details style={{ marginTop: 8 }}>
              <summary>Productos que no van al 21% ({exceptions.length})</summary>
              <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0' }}>
                {exceptions.map(r => (
                  <li key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                    <span>{r.name} <small style={{ color: 'var(--tone-muted)' }}>· {rateLabel(r.iva_rate)}</small></span>
                    <button type="button" className="text-button" disabled={busy} onClick={() => apply([r.id], '21', r.name)}>
                      Volver a 21%
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}
