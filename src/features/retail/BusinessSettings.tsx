import { useState } from 'react';
import { retail, type Branch, type PriceList, type PriceOverride, type Product, type SalesLedger } from './api';
import type { Run } from './Management';
import { productsForList } from './pricing';

export function BranchSettings({ storeId, branches, run, busy }: { storeId: string; branches: Branch[]; run: Run; busy: boolean }) {
  return <section className="retail-panel">
    <h2>Sucursales</h2><p>Locales de un mismo comercio. Cada uno tiene sus cajas; el catálogo y el stock son compartidos.</p>
    {[...branches, null].map(b => <form className="retail-form business-edit-row" key={b ? b.id + b.name + b.address : 'new'} onSubmit={async e => {
      e.preventDefault(); const form = e.currentTarget; const f = new FormData(form);
      if (await run(() => retail.saveBranch(storeId, String(f.get('name')), String(f.get('address')), b?.id), b ? 'Sucursal actualizada' : 'Sucursal creada')) form.reset();
    }}>
      <label>{b ? 'Sucursal' : 'Nueva sucursal'}<input name="name" required maxLength={80} defaultValue={b?.name} placeholder="Ej. Centro" /></label>
      <label>Dirección<input name="address" maxLength={300} defaultValue={b?.address} /></label>
      <button className="secondary-button" disabled={busy}>{b ? 'Guardar sucursal' : 'Crear sucursal'}</button>
    </form>)}
  </section>;
}

export function LedgerSettings({ storeId, ledgers, run, busy }: { storeId: string; ledgers: SalesLedger[]; run: Run; busy: boolean }) {
  return <section className="retail-panel"><h2>Registros de ventas</h2>
    <p>Separá las ventas por el uso que necesites. Estos registros no son cajas de atención ni determinan si hay factura. Todos integran los totales del comercio.</p>
    {[...ledgers, null].map(l => <form className="inline-form business-edit-row" key={l ? l.id + l.name + l.active : 'new'} onSubmit={async e => {
      e.preventDefault(); const form = e.currentTarget; const f = new FormData(form);
      if (await run(() => retail.saveLedger(storeId, String(f.get('name')), l?.id, l?.active ?? true), 'Registro guardado')) form.reset();
    }}>
      <input aria-label={l ? `Nombre del registro ${l.name}` : 'Nuevo registro'} name="name" required maxLength={80} defaultValue={l?.name} placeholder="Ej. Ventas mayoristas" />
      <button className="secondary-button" disabled={busy}>{l ? 'Guardar' : 'Agregar registro'}</button>
      {l && !l.is_default && <button type="button" className="text-button" disabled={busy} onClick={() => void run(() => retail.saveLedger(storeId, l.name, l.id, !l.active), 'Registro actualizado')}>{l.active ? 'Desactivar' : 'Reactivar'}</button>}
    </form>)}
  </section>;
}

export function PriceListSettings({ storeId, lists, overrides, products, branches = [], run, busy, expanded = false }: { storeId: string; lists: PriceList[]; overrides: PriceOverride[]; products: Product[]; branches?: Branch[]; run: Run; busy: boolean; expanded?: boolean }) {
  const [selected, setSelected] = useState('');
  const [query, setQuery] = useState('');
  const list = lists.find(l => l.id === selected);
  const priced = productsForList(products, list, overrides);
  return <section className="retail-panel price-list-settings"><details open={expanded || undefined}><summary>Listas de precios · Ver y administrar</summary>
    <p>La <strong>Lista madre</strong> usa los precios del catálogo. Las demás se calculan con un porcentaje: −10 descuenta 10%; 15 suma 15%. Un precio fijo reemplaza ese cálculo para un producto.</p>
    <h3>Crear o modificar listas</h3>
    <p>Una lista global puede usarse en todas las sucursales. Una lista de sucursal se aplica solo en ese local y se selecciona por defecto al vender. Cada sucursal puede tener una lista exclusiva activa; sin ella, usa la lista madre.</p>
    <div className="table-scroll"><table aria-label="Listas de precios por sucursal"><thead><tr><th>Lista</th><th>Ajuste</th><th>Sucursal</th><th>Estado</th></tr></thead><tbody>{lists.map(l => <tr key={l.id}><td>{l.name}</td><td>{Number(l.adjustment)}%</td><td>{l.branch_id ? <span className="branch-price-badge">{branches.find(b => b.id === l.branch_id)?.name || 'Sucursal asignada'}</span> : 'Global'}</td><td>{l.active ? 'Activa' : 'Inactiva'}</td></tr>)}</tbody></table></div>
      {[...lists, null].map(l => <form className="inline-form business-edit-row" key={l ? `${l.id}:${l.name}:${l.adjustment}:${l.branch_id}:${l.active}` : 'new'} onSubmit={async e => {
        e.preventDefault(); const form = e.currentTarget; const f = new FormData(form);
        if (await run(() => retail.savePriceList(storeId, String(f.get('name')), Number(f.get('adjustment')), l?.id, l?.active ?? true, String(f.get('branch')) || null), 'Lista guardada')) form.reset();
      }}>
        <label>{l ? 'Lista' : 'Nueva lista'}<input name="name" required maxLength={80} defaultValue={l?.name} placeholder="Ej. Mayorista" /></label>
        <label>Ajuste %<input name="adjustment" type="number" required step="0.01" min="-99.99" max="10000" defaultValue={l?.adjustment ?? 0} /></label>
        <label>Sucursal<select name="branch" aria-label={l ? `Sucursal de la lista ${l.name}` : 'Sucursal de la nueva lista'} defaultValue={l?.branch_id || ''}><option value="">Todas las sucursales</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        <button className="secondary-button" disabled={busy}>{l ? 'Guardar' : 'Crear lista'}</button>
        {l && <button type="button" className="text-button" disabled={busy} onClick={() => void run(() => retail.savePriceList(storeId, l.name, Number(l.adjustment), l.id, !l.active, l.branch_id || null), 'Lista actualizada')}>{l.active ? 'Desactivar' : 'Reactivar'}</button>}
      </form>)}
    <div className="business-controls">
      <label>Consultar lista<select value={selected} onChange={e => setSelected(e.target.value)}><option value="">Lista madre</option>{lists.map(l => <option key={l.id} value={l.id}>{l.name}{l.active ? '' : ' (inactiva)'}</option>)}</select></label>
      <label>Buscar producto<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Nombre o código" /></label>
    </div>
    <div className="table-scroll"><table><thead><tr><th>Producto</th><th>Lista madre</th><th>Precio de la lista</th>{list && <th>Precio fijo opcional</th>}</tr></thead><tbody>
      {priced.filter(p => `${p.name} ${p.code}`.toLowerCase().includes(query.toLowerCase())).slice(0, 50).map(p => {
        const fixed = overrides.find(o => o.list_id === selected && o.product_id === p.id);
        return <tr key={p.id}><td>{p.name}<small>{p.code}</small></td><td>${products.find(base => base.id === p.id)?.price.toLocaleString('es-AR')}</td><td>${p.price.toLocaleString('es-AR')}</td>{list && <td><form className="inline-form" key={selected + p.id + fixed?.price} onSubmit={e => {
          e.preventDefault(); const value = String(new FormData(e.currentTarget).get('price'));
          void run(() => retail.savePriceOverride(storeId, list.id, p.id, value === '' ? null : Number(value)), value === '' ? 'Vuelve al cálculo de la lista' : 'Precio fijo guardado');
        }}><input aria-label={`Precio fijo de ${p.name}`} name="price" type="number" min="0.01" max="999999999999.99" step="0.01" defaultValue={fixed?.price} placeholder="Usar porcentaje" /><button className="secondary-button" disabled={busy}>Guardar</button></form></td>}</tr>;
      })}
    </tbody></table></div><p>Se muestran hasta 50 coincidencias. Para quitar un precio fijo, dejá su campo vacío y guardá.</p>
  </details></section>;
}
