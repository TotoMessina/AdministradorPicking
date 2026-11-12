import { Pencil } from 'lucide-react';
import { NumberInput } from '../../../components/NumberInput';
import { retail } from '../api';
import { SettingsEditor, SettingsEditorGroup } from '../SettingsEditor';
import { money, percent, PAGE_SIZE, origin, sourceName } from './priceListHelpers';
import type { PriceListSettingsState } from './usePriceListSettings';

/** Consulta de precios de la lista elegida. */
export function PriceListPreview({ state }: { state: PriceListSettingsState }) {
  const {
    storeId, lists, run, busy, selected, query, setQuery, showAll, setShowAll, setPage, active, preview,
    list, fixedFor, changesFor, onlyChanged, matches, pageCount, currentPage, visible, priced, start,
  } = state;
  return (
    <section className="price-list-preview" aria-label="Consulta de precios" hidden={!!active}>
      <div className="price-preview-heading"><h3 ref={preview} tabIndex={-1}>{sourceName(selected, lists)}</h3>{list && !list.is_primary && <button type="button" className="price-percent" disabled={busy} onClick={() => start(origin(list), list, true)} aria-label={`Editar porcentaje de ${list.name}: ${percent(list.adjustment)}`}><Pencil size={12} aria-hidden="true" /> {percent(list.adjustment)}</button>}</div>
      <div className="price-preview-filters">
        <label className="price-preview-search">Buscar producto<input value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} placeholder="Nombre o código" /></label>
        {list && <label className="price-preview-search">Mostrar<select value={showAll ? 'all' : 'changed'} onChange={e => { setShowAll(e.target.value === 'all'); setPage(0); }}><option value="changed">Con cambios en esta lista</option><option value="all">Todos los productos</option></select></label>}
      </div>
      <SettingsEditorGroup><div className="table-scroll"><table><thead><tr><th>Producto</th><th>Costo</th>{selected !== 'cost' && <th>Precio en la lista</th>}{list && !list.is_primary && <th>Precio fijo</th>}</tr></thead><tbody>{priced.map(p => {
        const fixed = fixedFor(p.id);
        const changes = changesFor(p);
        return <tr key={p.id}><th scope="row">{p.name}<small>{p.code}</small></th><td>{p.cost > 0 ? money(p.cost) : 'Sin cargar'}</td>{selected !== 'cost' && <td>{p.pricingError || money(p.price)}{!!changes.length && <small className="price-change-note">{changes.join(' · ')}</small>}</td>}{list && !list.is_primary && <td><div role="group" aria-label={`Precio fijo de ${p.name}`}><SettingsEditor key={selected + p.id} busy={busy} label={fixed ? 'Editar' : 'Fijar'} summary={fixed ? money(Number(fixed.price)) : undefined}>{closeFixed => <form className="inline-form" onSubmit={async e => {
          e.preventDefault(); const value = String(new FormData(e.currentTarget).get('price'));
          if (await run(() => retail.savePriceOverride(storeId, list.id, p.id, value === '' ? null : Number(value)), value === '' ? 'Se aplican las reglas de la lista' : 'Precio fijo guardado')) closeFixed();
        }}><label>Precio fijo ($)<NumberInput name="price" min="0.01" max="999999999999.99" step="0.01" defaultValue={fixed?.price} placeholder="Usar reglas" /></label><button className="secondary-button" disabled={busy}>Guardar</button></form>}</SettingsEditor></div></td>}</tr>;
      })}</tbody></table></div></SettingsEditorGroup>
      {!matches.length && <p className="price-flow-empty" role="status">{onlyChanged && !query ? (list?.is_primary ? 'Ningún producto tiene porcentaje sobre costo. Se usa su precio de catálogo.' : 'Esta lista no tiene ajustes ni precios fijos propios: mantiene los precios de su origen. Elegí Mostrar → Todos los productos para ver los precios o fijar excepciones.') : 'No hay productos para mostrar.'}</p>}
      {!!matches.length && <nav className="price-list-pages" aria-label="Páginas de productos">
        <button type="button" className="secondary-button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Anterior</button>
        <span role="status">Página {currentPage + 1} de {pageCount} · {currentPage * PAGE_SIZE + 1}–{currentPage * PAGE_SIZE + visible.length} de {matches.length} productos{onlyChanged ? ' con cambios' : ''}</span>
        <button type="button" className="secondary-button" disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)}>Siguiente</button>
      </nav>}
    </section>
  );
}
