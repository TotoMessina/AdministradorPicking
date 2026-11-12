import { ArrowDown, ArrowRight, ArrowUp, ArrowUpDown, Loader2, X } from 'lucide-react';
import { NumberInput } from '../../../components/NumberInput';
import { StockBadge } from '../StockBadge';
import { money, sheetColumns, sheetLimit } from './transferHelpers';
import type { LocationTransfersState } from './useLocationTransfers';

/** Armar una transferencia de mercadería o plata. */
export function TransferComposer({ state }: { state: LocationTransfersState }) {
  const {
    store, mode, composing, setComposing, stockFrom, setStockFrom, stockTo, setStockTo, items, setItems,
    notes, setNotes, query, setQuery, setPickView, sheetSort, pickCategory, setPickCategory, fundFrom,
    setFundFrom, fundTo, setFundTo, fundKind, setFundKind, amount, setAmount, fundNote, setFundNote,
    fundsLoaded, formError, setFormError, saving, search, form, disabled, moneyPlaces, placeName,
    catalog, byId, searchText, atLocation, inOrigin, missing, categories, quantityOf, shownView, needAt,
    matches, units, add, setQuantity, sortBy, moveCell, addMissing, submit, fundPreview, locationSelect,
  } = state;
  return (
    <>
      {composing && <form ref={form} className="location-transfer-composer retail-form" onSubmit={event => { event.preventDefault(); void submit(); }}>
        <div className="location-transfer-composer-heading"><h3>{mode === 'stock' ? 'Transferir productos' : 'Mover dinero'}</h3><button type="button" className="text-button" disabled={!!saving} onClick={() => setComposing(false)}><X size={15} /> Cerrar y conservar</button></div>
        <fieldset disabled={disabled || (mode === 'stock' && !store.branch_inventory_enabled)}>
          {mode === 'stock' ? <>
            <div className="location-transfer-route">{locationSelect('Origen', stockFrom, setStockFrom)}<ArrowRight size={18} aria-hidden="true" />{locationSelect('Destino', stockTo, setStockTo, stockFrom)}</div>
            {stockTo && missing.length > 0 && <div className="location-transfer-suggestion">
              <span>Faltan <strong>{missing.length}</strong> {missing.length === 1 ? 'producto' : 'productos'} en {placeName(stockTo)} según su stock mínimo.</span>
              <button type="button" className="secondary-button" onClick={addMissing}>Agregar lo que falta</button>
            </div>}
            <div className="location-transfer-picker-tools">
              <label>Buscar o escanear<input ref={search} value={query} placeholder="Nombre o código" onChange={event => setQuery(event.target.value)} onKeyDown={event => {
                if (event.key !== 'Enter') return; event.preventDefault();
                const product = catalog.find(row => row.code.trim() === query.trim()) || (searchText && matches.length === 1 ? matches[0] : undefined); if (product) add(product);
              }} /></label>
              {categories.length > 1 && <label>Categoría<select value={pickCategory} onChange={event => setPickCategory(event.target.value)}><option value="">Todas</option>{categories.map(category => <option key={category} value={category}>{category}</option>)}</select></label>}
            </div>
            {!searchText && <div className="location-transfer-tabs purchase-view-tabs" role="group" aria-label="Qué productos ver">
              <button type="button" className="secondary-button" aria-pressed={shownView === 'missing'} disabled={!missing.length} onClick={() => setPickView('missing')}>Faltan en destino ({missing.length})</button>
              <button type="button" className="secondary-button" aria-pressed={shownView === 'all'} onClick={() => setPickView('all')}>Todos ({inOrigin.length})</button>
              <button type="button" className="secondary-button" aria-pressed={shownView === 'chosen'} disabled={!items.length} onClick={() => setPickView('chosen')}>Elegidos ({items.length})</button>
            </div>}
            <div className="location-transfer-sheet" role="region" aria-label="Productos para transferir" tabIndex={0}>
              <table>
                <caption className="sr-only">Productos con stock de origen y destino. Los encabezados ordenan la lista.</caption>
                <thead><tr>{sheetColumns.map(column => {
                  const sorted = sheetSort.key === column.key;
                  return <th key={column.key} scope="col" className={column.numeric ? 'is-number' : undefined} aria-sort={sorted ? (sheetSort.descending ? 'descending' : 'ascending') : 'none'}>
                    <button type="button" onClick={() => sortBy(column.key, column.numeric)}>{column.label}{sorted ? (sheetSort.descending ? <ArrowDown size={12} aria-hidden="true" /> : <ArrowUp size={12} aria-hidden="true" />) : <ArrowUpDown size={12} aria-hidden="true" />}</button>
                  </th>;
                })}</tr></thead>
                <tbody>{matches.slice(0, sheetLimit).map(product => {
                  const chosen = quantityOf.get(product.id), origin = atLocation(product, stockFrom);
                  return <tr key={product.id} className={chosen ? chosen > origin ? 'is-over' : 'is-chosen' : undefined}>
                    <th scope="row"><span aria-hidden="true">{product.emoji || '📦'}</span> {product.name}</th>
                    <td>{product.code}</td>
                    <td>{product.category}</td>
                    <td className="is-number">{origin.toLocaleString('es-AR')}</td>
                    <td className="is-number">{stockTo ? <StockBadge units={atLocation(product, stockTo)} min={product.minStock} /> : '—'}</td>
                    <td className="is-number">{product.minStock.toLocaleString('es-AR')}</td>
                    <td className="is-number">{needAt(product) ? needAt(product).toLocaleString('es-AR') : '—'}</td>
                    <td className="location-transfer-qty">
                      <NumberInput min={0} max={Math.max(origin, chosen || 0)} value={chosen ?? ''} placeholder="0" disabled={!origin} aria-label={`Unidades de ${product.name}`} onFocus={event => event.currentTarget.select()} onKeyDown={moveCell} onValueChange={value => setQuantity(product, value)} />
                      <button type="button" disabled={!origin || chosen === origin} aria-label={`Llevar todo ${product.name}`} onClick={() => setQuantity(product, String(origin))}>Todo</button>
                    </td>
                  </tr>;
                })}</tbody>
              </table>
              {!matches.length && <p>{searchText ? 'Sin coincidencias. Los combos se trasladan por sus componentes.' : `No hay productos con stock en ${placeName(stockFrom)}.`}</p>}
            </div>
            {matches.length > sheetLimit && <small>Mostrando {sheetLimit} de {matches.length}. Buscá o elegí una categoría para ver el resto.</small>}
            {items.length > 0 && <div className="location-transfer-sheet-total">
              <strong>En esta transferencia: {items.length} {items.length === 1 ? 'producto' : 'productos'}, {units.toLocaleString('es-AR')} u.</strong>
              {items.some(item => { const product = byId.get(item.product_id); return !product || item.qty > atLocation(product, stockFrom); }) && <span role="alert">Hay cantidades que superan lo disponible en origen.</span>}
              {items.some(item => !byId.has(item.product_id)) && <button type="button" className="text-button" onClick={() => setItems(previous => previous.filter(item => byId.has(item.product_id)))}>Quitar los no disponibles</button>}
              <button type="button" className="text-button" onClick={() => { setItems([]); setFormError(''); }}>Vaciar</button>
            </div>}
            <label>Nota (opcional)<textarea value={notes} maxLength={2000} rows={2} onChange={event => setNotes(event.target.value)} /></label>
            <p>«Transferir ahora» mueve el stock en el momento. «Dejar pendiente» espera una confirmación y no reserva unidades.</p>
          </> : <>
            <label>Movimiento<select value={fundKind} onChange={event => setFundKind(event.target.value as typeof fundKind)}><option value="transfer">Enviar a otra ubicación</option><option value="income">Ingreso externo</option><option value="withdrawal">Salida externa</option></select></label>
            <div className="location-transfer-route">
              {fundKind !== 'income' && locationSelect('Desde', fundFrom, setFundFrom, undefined, moneyPlaces)}
              {fundKind === 'transfer' && <ArrowRight size={18} aria-hidden="true" />}
              {fundKind !== 'withdrawal' && locationSelect('Hacia', fundTo, setFundTo, fundKind === 'transfer' ? fundFrom : undefined, moneyPlaces)}
            </div>
            <label>Importe ($)<NumberInput min={0.01} max={999999999999.99} step={0.01} required value={amount} onValueChange={setAmount} /></label>
            {fundsLoaded && Number(amount) > 0 && fundPreview.length > 0 && <ul className="location-fund-preview" aria-label="Cómo queda después">{fundPreview.map(row => <li key={row.id}><span>{placeName(row.id)}</span><span>{money(row.before)} <ArrowRight size={13} aria-hidden="true" /> <strong className={row.after < 0 ? 'is-negative' : undefined}>{money(row.after)}</strong></span></li>)}</ul>}
            <label>Motivo<textarea required value={fundNote} maxLength={1000} rows={2} onChange={event => setFundNote(event.target.value)} /></label>
            {fundKind === 'transfer' && <p>La plata sale ahora del origen y queda «en camino». Entra al destino cuando alguien confirma cuánto llegó.</p>}
            <p>Al cerrar una caja, su sucursal suma lo que se generó: plata contada menos plata con la que abrió. Las cuentas suman solas lo cobrado por sus medios de pago.</p>
          </>}
        </fieldset>
        {formError && <p role="alert" className="error-banner">{formError}</p>}
        <div className="location-transfer-actions">
          <button className="primary-button" disabled={disabled || (mode === 'stock' && !store.branch_inventory_enabled)}>{saving && <Loader2 size={15} className="spin" />}{mode === 'stock' ? 'Transferir ahora' : 'Guardar movimiento de dinero'}</button>
          {mode === 'stock' && <button type="button" className="secondary-button" disabled={disabled || !store.branch_inventory_enabled} onClick={() => void submit(false)}>Dejar pendiente</button>}
        </div>
      </form>}
    </>
  );
}
