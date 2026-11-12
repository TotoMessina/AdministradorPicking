import { ArrowDown, ArrowUp, ArrowUpDown, Check, Loader2, Upload, X } from 'lucide-react';
import { NumberInput } from '../../../components/NumberInput';
import { countReasons, type CountReason } from '../stockCountApi';
import { money, sheetLimit } from './stockCountHelpers';
import type { StockCountState } from './useStockCount';

/** Planilla del conteo abierto. */
export function StockCountSheet({ state }: { state: StockCountState }) {
  const {
    canConfirm, current, setCurrent, drafts, saving, saveError, query, setQuery, view, setView, sort,
    setSort, sheetText, setSheetText, sheetMessage, searchRef, disabled, placeName, sectionName, scope,
    flush, valueOf, reasonOf, noteOf, expectedOf, differenceOf, change, setCounted, counted, different,
    loss, searchText, shown, columns, scan, importSheet, moveCell, confirm, cancel,
  } = state;
  return (
    <>
      {current && <div className="location-transfer-composer retail-form stock-count-sheet">
        <div className="location-transfer-composer-heading">
          <h3>Contando {placeName(current.location)} · {sectionName(current)}</h3>
          <button type="button" className="text-button" onClick={() => { if (drafts.size) void flush(drafts); setCurrent(null); }}><X size={15} /> Cerrar y seguir después</button>
        </div>
        <div className="location-transfer-picker-tools">
          <label>Buscar o escanear<input ref={searchRef} value={query} placeholder="Nombre o código" disabled={disabled}
            onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); scan(); } }} /></label>
          <label className="stock-count-file secondary-button"><Upload size={15} aria-hidden="true" /> Cargar planilla (.csv)
            <input type="file" accept=".csv,.txt,text/csv,text/plain" disabled={disabled} onChange={event => {
              const file = event.target.files?.[0]; event.target.value = '';
              if (file) void file.text().then(importSheet);
            }} /></label>
        </div>
        <details className="stock-count-paste"><summary>Pegar desde una planilla</summary>
          <label>Una fila por producto: código y cantidad, separados por punto y coma o tabulación<textarea rows={4} value={sheetText} onChange={event => setSheetText(event.target.value)} placeholder={'7790001;12\n7790002;0'} /></label>
          <button type="button" className="secondary-button" disabled={disabled || !sheetText.trim()} onClick={() => importSheet(sheetText)}>Cargar lo pegado</button>
        </details>
        {sheetMessage && <p role="status" className="stock-count-message">{sheetMessage}</p>}
        {!searchText && <div className="location-transfer-tabs purchase-view-tabs" role="group" aria-label="Qué productos ver">
          <button type="button" className="secondary-button" aria-pressed={view === 'pending'} onClick={() => setView('pending')}>Sin contar ({scope.length - counted.length})</button>
          <button type="button" className="secondary-button" aria-pressed={view === 'counted'} onClick={() => setView('counted')}>Contados ({counted.length})</button>
          {canConfirm && <button type="button" className="secondary-button" aria-pressed={view === 'different'} onClick={() => setView('different')}>Con diferencia ({different.length})</button>}
        </div>}
        <div className="location-transfer-sheet" role="region" aria-label="Productos para contar" tabIndex={0}>
          <table>
            <caption className="sr-only">Productos del conteo. Los encabezados ordenan la lista.</caption>
            <thead><tr>{columns.map(column => {
              const sorted = sort.key === column.key;
              return <th key={column.key} scope="col" className={column.numeric ? 'is-number' : column.key === 'code' || column.key === 'category' ? 'stock-count-meta' : undefined} aria-sort={sorted ? (sort.descending ? 'descending' : 'ascending') : 'none'}>
                <button type="button" onClick={() => setSort(previous => ({ key: column.key, descending: previous.key === column.key ? !previous.descending : !!column.numeric }))}>
                  {column.label}{sorted ? (sort.descending ? <ArrowDown size={12} aria-hidden="true" /> : <ArrowUp size={12} aria-hidden="true" />) : <ArrowUpDown size={12} aria-hidden="true" />}
                </button>
              </th>;
            })}{canConfirm && <th scope="col"><span className="stock-count-head">Motivo</span></th>}</tr></thead>
            <tbody>{shown.slice(0, sheetLimit).map(product => {
              const value = valueOf(product.id), difference = differenceOf(product);
              return <tr key={product.id} className={value === null ? undefined : difference && canConfirm ? 'is-over' : 'is-chosen'}>
                <th scope="row"><span aria-hidden="true">{product.emoji || '📦'}</span> {product.name}<small className="stock-count-product-meta">{[product.code, product.category].filter(Boolean).join(' · ')}</small></th>
                <td className="stock-count-meta">{product.code}</td>
                <td className="stock-count-meta">{product.category}</td>
                {canConfirm && <td className="is-number">{expectedOf(product).toLocaleString('es-AR')}</td>}
                <td className="location-transfer-qty">
                  <NumberInput min={0} step={1} value={value ?? ''} placeholder="—" disabled={disabled} aria-label={`Unidades contadas de ${product.name}`}
                    onFocus={event => event.currentTarget.select()} onKeyDown={moveCell} onValueChange={next => setCounted(product, next)} />
                </td>
                {canConfirm && <td className={`is-number${difference < 0 ? ' stock-count-loss' : ''}`}>{value === null ? '—' : difference > 0 ? `+${difference}` : difference}</td>}
                {canConfirm && <td className="stock-count-reason">{value !== null && difference !== 0 && <>
                  <select aria-label={`Motivo de la diferencia de ${product.name}`} value={reasonOf(product.id) || ''} disabled={disabled} onChange={event => change(product, { reason: (event.target.value || null) as CountReason | null })}>
                    <option value="">Elegí motivo</option>{(Object.keys(countReasons) as CountReason[]).map(key => <option key={key} value={key}>{countReasons[key]}</option>)}
                  </select>
                  {reasonOf(product.id) === 'otro' && <input aria-label={`Detalle de la diferencia de ${product.name}`} maxLength={300} value={noteOf(product.id)} disabled={disabled} onChange={event => change(product, { note: event.target.value })} placeholder="Detalle" />}
                </>}</td>}
              </tr>;
            })}</tbody>
          </table>
          {!shown.length && <p>{searchText ? 'Sin coincidencias. Los combos se cuentan por sus componentes.' : view === 'pending' ? 'Ya contaste todos los productos de este conteo.' : 'Todavía no hay productos en esta vista.'}</p>}
        </div>
        {shown.length > sheetLimit && <small>Mostrando {sheetLimit} de {shown.length}. Buscá para ver el resto.</small>}
        <div className="location-transfer-sheet-total">
          <strong>Contados {counted.length} de {scope.length}{canConfirm ? ` · ${different.length} con diferencia${loss ? ` · pérdida ${money(loss)}` : ''}` : ''}</strong>
          <span role="status">{saving ? <><Loader2 size={14} className="spin" /> Guardando…</> : drafts.size ? 'Cambios sin guardar' : 'Todo guardado'}</span>
        </div>
        {saveError && <p role="alert" className="error-banner">{saveError} <button type="button" className="text-button" disabled={saving || !drafts.size} onClick={() => void flush(drafts)}>Reintentar</button></p>}
        <p>Lo que cargás se guarda solo. Los productos sin contar no se ajustan.{canConfirm ? '' : ' Un encargado revisa las diferencias y confirma los ajustes.'}</p>
        <div className="location-transfer-actions">
          {canConfirm && <button type="button" className="primary-button" disabled={disabled || saving || !counted.length} onClick={() => void confirm()}><Check size={15} /> Confirmar ajustes</button>}
          <button type="button" className="secondary-button" disabled={disabled || saving} onClick={() => void cancel()}>Cancelar conteo</button>
        </div>
      </div>}
    </>
  );
}
