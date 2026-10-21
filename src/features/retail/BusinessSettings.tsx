import { useState } from 'react';
import { retail, type Branch, type PriceList, type PriceOverride, type Product, type SalesLedger } from './api';
import type { Run } from './Management';
import { productsForList } from './pricing';
import { SettingsEditor, SettingsEditorGroup } from './SettingsEditor';
import { ledgerPaymentMethods, resolveSaleLedger } from './ledgerRouting';

export function BranchSettings({ storeId, branches, run, busy }: { storeId: string; branches: Branch[]; run: Run; busy: boolean }) {
  return <section className="retail-panel">
    <h2>Sucursales</h2><p>Locales de un mismo comercio. Cada uno tiene sus cajas; el catálogo y el stock son compartidos.</p>
    <SettingsEditorGroup>{[...branches, null].map(b => <SettingsEditor key={b?.id || 'new'} busy={busy}
      label={b ? `Editar ${b.name}` : 'Agregar sucursal'} summary={b && <><strong>{b.name}</strong><small>{b.address || 'Sin dirección'}</small></>}>
      {close => <form className="retail-form business-edit-row" onSubmit={async e => {
      e.preventDefault(); const form = e.currentTarget; const f = new FormData(form);
      if (await run(() => retail.saveBranch(storeId, String(f.get('name')), String(f.get('address')), b?.id), b ? 'Sucursal actualizada' : 'Sucursal creada')) close();
    }}>
      <label>{b ? 'Sucursal' : 'Nueva sucursal'}<input name="name" required maxLength={80} defaultValue={b?.name} placeholder="Ej. Centro" /></label>
      <label>Dirección<input name="address" maxLength={300} defaultValue={b?.address} /></label>
      <button className="secondary-button" disabled={busy}>{b ? 'Guardar sucursal' : 'Crear sucursal'}</button>
    </form>}</SettingsEditor>)}</SettingsEditorGroup>
  </section>;
}

export function LedgerSettings({ storeId, ledgers, run, busy }: { storeId: string; ledgers: SalesLedger[]; run: Run; busy: boolean }) {
  return <section className="retail-panel"><h2>Registros de ventas</h2>
    <p>Un registro de ventas es una agrupación que elegís para organizar las ventas. No es una caja de cobro ni determina si hay factura. Todos integran los totales del comercio.</p>
    <p>General y Pruebas organizan ventas reales: ambos afectan stock y caja. Pruebas no es un entorno de simulación.</p>
    {(!ledgers.some(l => l.name === 'General' && l.active) || !ledgers.some(l => l.name === 'Pruebas' && l.active)) && <div>
      <button type="button" className="secondary-button" disabled={busy} onClick={() => void run(() => retail.prepareSalesLedgers(storeId), 'Registros preparados. General es el principal.')}>
        Preparar General y Pruebas
      </button><p>Crea o reactiva los que falten y define General como principal. Conserva los otros registros, sus reglas y las ventas anteriores.</p>
    </div>}
    <SettingsEditorGroup>
      <SettingsEditor label="Configurar selección por medio de pago" busy={busy}
        summary={<><strong>Principal: {ledgers.find(l => l.is_default)?.name || 'Sin definir'}</strong>
          <small>{ledgerPaymentMethods.map(method => `${method.label}: ${resolveSaleLedger(ledgers, method.id)?.name || 'Sin registro'}`).join(' · ')}</small></>}>
        {close => <form className="retail-form" onSubmit={async event => {
          event.preventDefault(); const fields = new FormData(event.currentTarget);
          const rules = Object.fromEntries(ledgerPaymentMethods.map(method => [method.id, String(fields.get(method.id) || '')]).filter(([, value]) => value));
          if (await run(() => retail.saveLedgerRouting(storeId, String(fields.get('default')), rules), 'Reglas de esta tienda guardadas')) close();
        }}>
          <label>Registro principal<select name="default" required defaultValue={ledgers.find(l => l.is_default)?.id || ''} disabled={busy}>
            <option value="" disabled>Elegí un registro</option>{ledgers.filter(l => l.active).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select></label>
          <p>Si un medio no tiene regla, se usa el principal. Pago mixto envía la venta completa a su registro, sin dividir el ticket. Podés elegir otro registro manualmente en Vender.</p>
          {ledgerPaymentMethods.map(method => <label key={method.id}>{method.label}
            <select name={method.id} disabled={busy} defaultValue={ledgers.find(l => l.active && l.payment_methods?.includes(method.id))?.id || ''}>
              <option value="">Usar el principal</option>{ledgers.filter(l => l.active).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>)}
          <button className="primary-button" disabled={busy}>Guardar reglas</button>
        </form>}
      </SettingsEditor>
      {[...ledgers, null].map(l => <SettingsEditor key={l?.id || 'new'} busy={busy}
      label={l ? `Editar ${l.name}` : 'Agregar registro'} summary={l && <><strong>{l.name}{l.is_default ? ' · Principal' : ''}</strong><small>{l.active ? 'Activo' : 'Inactivo'}</small></>}>
      {close => <form className="inline-form business-edit-row" onSubmit={async e => {
      e.preventDefault(); const form = e.currentTarget; const f = new FormData(form);
      if (await run(() => retail.saveLedger(storeId, String(f.get('name')), l?.id, l?.active ?? true), 'Registro guardado')) close();
    }}>
      <label>Nombre del registro<input name="name" required maxLength={80} defaultValue={l?.name} placeholder="Ej. Ventas mayoristas" /></label>
      <button className="secondary-button" disabled={busy}>{l ? 'Guardar' : 'Agregar registro'}</button>
      {l && !l.is_default && <button type="button" className="text-button" disabled={busy} onClick={() => void run(() => retail.saveLedger(storeId, l.name, l.id, !l.active), 'Registro actualizado')}>{l.active ? 'Desactivar' : 'Reactivar'}</button>}
    </form>}</SettingsEditor>)}</SettingsEditorGroup>
  </section>;
}

export function PriceListSettings({ storeId, lists, overrides, products, branches = [], run, busy, expanded = false }: { storeId: string; lists: PriceList[]; overrides: PriceOverride[]; products: Product[]; branches?: Branch[]; run: Run; busy: boolean; expanded?: boolean }) {
  const [selected, setSelected] = useState('');
  const [query, setQuery] = useState('');
  const list = lists.find(l => l.id === selected);
  const priced = productsForList(products, list, overrides);
  return <section className="retail-panel price-list-settings"><details open={expanded || undefined}><summary>Listas de precios · Ver y administrar</summary>
    <p><strong>Precio del catálogo</strong> (lista madre) usa los precios base de los productos. Las demás listas se calculan con un porcentaje: −10 descuenta 10%; 15 suma 15%. Un precio fijo reemplaza ese cálculo para un producto.</p>
    <h3>Listas del comercio</h3>
    <p>Una lista global puede usarse en todas las sucursales. Una lista de sucursal se aplica solo en ese local y se selecciona por defecto al vender. Cada sucursal puede tener una lista exclusiva activa; sin ella, usa el precio del catálogo.</p>
    {!lists.length && <p>Usás los precios del catálogo. Podés crear una lista para otra sucursal o forma de venta.</p>}
    <SettingsEditorGroup>{[...lists, null].map(l => <SettingsEditor key={l?.id || 'new'} busy={busy}
      label={l ? `Editar ${l.name}` : 'Crear lista'} summary={l && <><strong>{l.name}</strong><small>{Number(l.adjustment)}% · {l.branch_id ? branches.find(b => b.id === l.branch_id)?.name || 'Sucursal asignada' : 'Todas las sucursales'} · {l.active ? 'Activa' : 'Inactiva'}</small></>}>
      {close => <form className="inline-form business-edit-row" onSubmit={async e => {
        e.preventDefault(); const form = e.currentTarget; const f = new FormData(form);
        if (await run(() => retail.savePriceList(storeId, String(f.get('name')), Number(f.get('adjustment')), l?.id, l?.active ?? true, String(f.get('branch')) || null), 'Lista guardada')) close();
      }}>
        <label>{l ? 'Lista' : 'Nueva lista'}<input name="name" required maxLength={80} defaultValue={l?.name} placeholder="Ej. Mayorista" /></label>
        <label>Ajuste %<input name="adjustment" type="number" required step="0.01" min="-99.99" max="10000" defaultValue={l?.adjustment ?? 0} /></label>
        <label>Sucursal<select name="branch" aria-label={l ? `Sucursal de la lista ${l.name}` : 'Sucursal de la nueva lista'} defaultValue={l?.branch_id || ''}><option value="">Todas las sucursales</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        <button className="secondary-button" disabled={busy}>{l ? 'Guardar' : 'Crear lista'}</button>
        {l && <button type="button" className="text-button" disabled={busy} onClick={() => void run(() => retail.savePriceList(storeId, l.name, Number(l.adjustment), l.id, !l.active, l.branch_id || null), 'Lista actualizada')}>{l.active ? 'Desactivar' : 'Reactivar'}</button>}
      </form>}</SettingsEditor>)}</SettingsEditorGroup>
    <details><summary>Consultar precios y editar precios fijos</summary>
    <div className="business-controls">
      <label>Consultar lista<select value={selected} onChange={e => setSelected(e.target.value)}><option value="">Precio del catálogo</option>{lists.map(l => <option key={l.id} value={l.id}>{l.name}{l.active ? '' : ' (inactiva)'}</option>)}</select></label>
      <label>Buscar producto<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Nombre o código" /></label>
    </div>
    <SettingsEditorGroup><div className="table-scroll"><table><thead><tr><th>Producto</th><th>Precio del catálogo</th><th>Precio de la lista</th>{list && <th>Precio fijo opcional</th>}</tr></thead><tbody>
      {priced.filter(p => `${p.name} ${p.code}`.toLowerCase().includes(query.toLowerCase())).slice(0, 50).map(p => {
        const fixed = overrides.find(o => o.list_id === selected && o.product_id === p.id);
        return <tr key={p.id}><td>{p.name}<small>{p.code}</small></td><td>${products.find(base => base.id === p.id)?.price.toLocaleString('es-AR')}</td><td>${p.price.toLocaleString('es-AR')}</td>{list && <td><SettingsEditor key={selected + p.id} busy={busy} label={`Editar precio de ${p.name}`} summary={fixed ? `$${Number(fixed.price).toLocaleString('es-AR')}` : 'Usa el porcentaje de la lista'}>{close => <form className="inline-form" onSubmit={async e => {
          e.preventDefault(); const value = String(new FormData(e.currentTarget).get('price'));
          if (await run(() => retail.savePriceOverride(storeId, list.id, p.id, value === '' ? null : Number(value)), value === '' ? 'Vuelve al cálculo de la lista' : 'Precio fijo guardado')) close();
        }}><label>Precio fijo ($)<input name="price" type="number" min="0.01" max="999999999999.99" step="0.01" defaultValue={fixed?.price} placeholder="Usar porcentaje" /></label><button className="secondary-button" disabled={busy}>Guardar</button></form>}</SettingsEditor></td>}</tr>;
      })}
    </tbody></table></div></SettingsEditorGroup><p>Se muestran hasta 50 coincidencias. Para quitar un precio fijo, dejá su campo vacío y guardá.</p>
    </details>
  </details></section>;
}
