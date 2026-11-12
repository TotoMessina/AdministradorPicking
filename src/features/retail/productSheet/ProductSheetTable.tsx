import { Fragment } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Layers, Loader2, Trash2 } from 'lucide-react';
import { PresentationChain } from '../PresentationChain';
import { NumberInput } from '../../../components/NumberInput';
import { askConfirm } from '../../../components/ConfirmHost';
import { describe, presentationCodeWarning, presentationLabels, sizesError, type Presentation } from '../../../services/productPresentation';
import { hasComposition } from '../../../services/productComposition';
import { ProductRoundingField } from '../ProductMarkupField';
import { AiIcon } from '../../../components/AiIcon';
import { money, unitTypes } from './productSheetHelpers';
import type { ProductSheetState } from './useProductSheet';

/** Tabla editable de productos. */
export function ProductSheetTable({ state }: { state: ProductSheetState }) {
  const {
    mode, store, categories, onEditComposition, storeStep, isCombo, rows, setRows, aiRow, aiNotes,
    suggest, table, update, remove, calc, codesReady, changed, requestManual, useCost, lookup,
    moveInColumn, codeKey, disabled,
  } = state;
  return (
    <div className="product-sheet-scroll" role="region" aria-label="Planilla de productos" tabIndex={-1}>
      <table ref={table}>
        <thead><tr>
          <th scope="col" className="col-n">#</th>
          <th scope="col">Código</th>
          <th scope="col" className="col-name">Nombre</th>
          <th scope="col">Categoría</th>
          <th scope="col" title="La cantidad y el costo de la fila se escriben por esta presentación">Compro por</th>
          <th scope="col" title="Cuántas unidades trae">Trae</th>
          {mode === 'new' && <th scope="col" className="num">Cantidad</th>}
          <th scope="col" className="num">Costo</th>
          <th scope="col" className="num">Costo x u.</th>
          {mode === 'new' && <th scope="col" className="num">Stock (u.)</th>}
          <th scope="col" className="num">Ganancia %</th>
          <th scope="col" className="num">Precio</th>
          <th scope="col" className="num">Mínimo</th>
          <th scope="col"><span className="visually-hidden">Acciones</span></th>
        </tr></thead>
        <tbody>{rows.map((row, index) => {
          const { units, perUnit, price, stock } = calc(row);
          const label = row.name || row.code || `fila ${index + 1}`;
          const presentationName = presentationLabels[row.presentation].toLowerCase();
          return <Fragment key={row.key}>
            <tr data-key={row.key} className={`${row.error ? 'has-error' : ''} ${row.original && changed(row) ? 'is-changed' : ''}`}>
              <td className="col-n">{row.error ? <AlertTriangle size={14} aria-label="Con error" /> : index + 1}</td>
              <td data-col="code"><input value={row.code} maxLength={100} inputMode="numeric" autoComplete="off" aria-label={`Código de ${label}`} disabled={disabled}
                onChange={event => update(row.key, { code: event.target.value })} onBlur={() => void lookup(row)} onKeyDown={event => codeKey(event, row)} /></td>
              <td data-col="name" className="col-name"><input value={row.name} maxLength={160} autoComplete="off" aria-label={`Nombre de ${label}`} disabled={disabled}
                onChange={event => update(row.key, { name: event.target.value })} onKeyDown={moveInColumn} /></td>
              <td data-col="category"><select value={row.categoryId} aria-label={`Categoría de ${label}`} disabled={disabled} onKeyDown={moveInColumn}
                onChange={event => update(row.key, { categoryId: event.target.value })}>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></td>
              <td data-col="presentation"><select value={row.presentation} aria-label={`Cómo comprás ${label}`} disabled={disabled || isCombo(row)} onKeyDown={moveInColumn}
                onChange={event => update(row.key, { presentation: event.target.value as Presentation })}>
                {(Object.keys(presentationLabels) as Presentation[]).map(option => <option key={option} value={option}>{option === 'unit' ? 'Unidad suelta' : presentationLabels[option]}</option>)}</select></td>
              <td data-col="content" className="col-content">
                {isCombo(row) ? <span className="product-sheet-muted">Combo</span> : row.presentation === 'unit' ? <span className="product-sheet-muted">1 u.</span> : <span className="product-sheet-content">
                  <NumberInput min={1} step={1} value={row.presentation === 'pack' ? row.packUnits : row.displayUnits} placeholder="u." disabled={disabled}
                    aria-label={`Unidades que trae cada ${presentationName} de ${label}`} onKeyDown={moveInColumn}
                    onValueChange={value => update(row.key, row.presentation === 'pack' ? { packUnits: value } : { displayUnits: value })} />
                  <small>u.</small>
                </span>}
              </td>
              {mode === 'new' && <td data-col="qty" className="num"><NumberInput min={0} step={1} value={row.qty} placeholder="0" disabled={disabled} aria-label={`Cantidad en ${presentationName} de ${label}`}
                onKeyDown={moveInColumn} onValueChange={value => update(row.key, { qty: value })} /></td>}
              <td data-col="cost" className="num"><NumberInput min={0} step={0.01} value={row.cost} placeholder={`por ${presentationName}`} disabled={disabled || (!!row.original && hasComposition(row.original))}
                aria-label={`Costo por ${presentationName} de ${label}`} onKeyDown={moveInColumn} onValueChange={value => update(row.key, { cost: value })} /></td>
              <td data-col="unitcost" className="num calc">{perUnit === null ? '—' : money(perUnit)}</td>
              {mode === 'new' && <td data-col="stock" className="num calc">{stock === null ? '—' : stock.toLocaleString('es-AR')}</td>}
              <td data-col="markup" className="num">{!row.sellable ? <span className="product-sheet-muted">Insumo</span> : row.manual
                ? <button type="button" className="text-button" disabled={disabled} onClick={() => useCost(row)}>Calcular por costo</button>
                : <NumberInput min={-99.99} max={10000} step={0.01} value={row.markup} disabled={disabled} aria-label={`Ganancia de ${label}`} onKeyDown={moveInColumn} onValueChange={value => update(row.key, { markup: value })} />}</td>
              <td data-col="price" className={`num ${row.manual ? '' : 'calc'}`}>{!row.sellable ? '—' : row.manual
                ? <NumberInput min={0.01} step={0.01} value={row.price} disabled={disabled} aria-label={`Precio manual de ${label}`} onKeyDown={moveInColumn} onValueChange={value => update(row.key, { price: value })} />
                : price === null ? <span className="product-sheet-muted">—</span> : <strong>{money(price)}</strong>}</td>
              <td data-col="min" className="num"><NumberInput min={0} step={1} value={row.minStock} disabled={disabled} aria-label={`Mínimo de ${label}`} onKeyDown={moveInColumn} onValueChange={value => update(row.key, { minStock: value })} /></td>
              <td className="col-actions">
                <button type="button" className="icon-button" aria-expanded={row.open} aria-label={`Más datos de ${label}`} title="Más datos" disabled={disabled}
                  onClick={() => setRows(previous => previous.map(item => item.key === row.key ? { ...item, open: !item.open } : item))}>{row.open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</button>
                {isCombo(row) && onEditComposition && <button type="button" className="icon-button" aria-label={`Componentes de ${label}`} title="Componentes del combo (de ahí sale el costo)" disabled={disabled}
                  onClick={async () => { if (!changed(row) || await askConfirm('Hay cambios sin guardar en la planilla. ¿Abrir los componentes y descartarlos?')) onEditComposition(row.original!); }}><Layers size={15} /></button>}
                {mode === 'new' && <button type="button" className="icon-button" aria-label={`Quitar ${label}`} title="Quitar fila" disabled={disabled} onClick={() => remove(row.key)}><Trash2 size={15} /></button>}
              </td>
            </tr>
            {row.error && <tr className="product-sheet-error-row"><td /><td colSpan={mode === 'new' ? 13 : 11} role="alert">{row.error}</td></tr>}
            {row.open && <tr className="product-sheet-more"><td /><td colSpan={mode === 'new' ? 13 : 11}>
              {!isCombo(row) && <div className="product-sheet-presentations" role="group" aria-label={`Presentaciones de ${label}`}>
                <strong>Presentaciones</strong>
                <PresentationChain displayUnits={row.displayUnits} packUnits={row.packUnits} palletPacks={row.palletPacks} buying={row.presentation} />
                <label>Unidades por display<NumberInput min={1} step={1} value={row.displayUnits} placeholder="No tiene" disabled={disabled} onValueChange={value => update(row.key, { displayUnits: value })} /></label>
                {codesReady && <label>Código del display (EAN-13)<input value={row.displayCode} maxLength={40} inputMode="numeric" autoComplete="off" placeholder="Opcional" disabled={disabled}
                  onChange={event => update(row.key, { displayCode: event.target.value.replace(/\s/g, '') })} />
                  {presentationCodeWarning(row.displayCode, 'display') && <small role="status">{presentationCodeWarning(row.displayCode, 'display')}</small>}</label>}
                <label>Unidades por bulto<NumberInput min={1} step={1} value={row.packUnits} placeholder="No tiene" disabled={disabled} onValueChange={value => update(row.key, { packUnits: value })} />
                  {describe({ ...row, presentation: 'pack' }) && <small>{describe({ ...row, presentation: 'pack' })}</small>}</label>
                {codesReady && <label>Código del bulto (DUN-14)<input value={row.packCode} maxLength={40} inputMode="numeric" autoComplete="off" placeholder="Opcional" disabled={disabled}
                  onChange={event => update(row.key, { packCode: event.target.value.replace(/\s/g, '') })} />
                  {presentationCodeWarning(row.packCode, 'pack') && <small role="status">{presentationCodeWarning(row.packCode, 'pack')}</small>}</label>}
                {codesReady && <label>Bultos por pallet<NumberInput value={row.palletPacks} min="1" max="100000" step="1" placeholder="Opcional" disabled={disabled}
                  onValueChange={value => update(row.key, { palletPacks: value })} />
                  {Number(row.palletPacks) > 0 && Number(row.packUnits) > 0 && <small>Pallet = {(Number(row.palletPacks) * Number(row.packUnits)).toLocaleString('es-AR')} u.</small>}</label>}
                {sizesError(row) && <small role="alert">{sizesError(row)}</small>}
              </div>}
              <div className="product-sheet-ai">
                <button type="button" className="secondary-button ai-action" disabled={disabled || aiRow === row.key} onClick={() => void suggest(row)}>
                  {aiRow === row.key ? <Loader2 size={15} className="spin" /> : <AiIcon />} Completar con IA</button>
                <small>{aiNotes[row.key] ?? 'Sugiere marca, proveedor, categoría, ícono y etiquetas que falten. No cambia precios ni costos.'}</small>
              </div>
              <div className="product-sheet-more-grid">
                <label>Etiquetas<input value={row.tags} maxLength={400} placeholder="Ej. sin TACC, importado" disabled={disabled} onChange={event => update(row.key, { tags: event.target.value })} /></label>
                <label>Marca<input value={row.brand} maxLength={120} disabled={disabled} onChange={event => update(row.key, { brand: event.target.value })} /></label>
                <label>Proveedor<input value={row.supplier} maxLength={120} disabled={disabled} onChange={event => update(row.key, { supplier: event.target.value })} /></label>
                <label>Código del proveedor<input value={row.supplierCode} maxLength={120} disabled={disabled} onChange={event => update(row.key, { supplierCode: event.target.value })} /></label>
                <label>Vencimiento<input type="date" value={row.expiry} disabled={disabled} onChange={event => update(row.key, { expiry: event.target.value })} /></label>
                <label>Uso<select value={row.sellable ? 'sale' : 'ingredient'} disabled={disabled} onChange={event => update(row.key, { sellable: event.target.value === 'sale' })}>
                  <option value="sale">Para vender</option><option value="ingredient">Solo insumo</option></select></label>
                <label>Se vende por<select value={row.unitType} disabled={disabled} onChange={event => update(row.key, { unitType: event.target.value })}>
                  {Object.entries(unitTypes).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
                <label>Emoji<input value={row.emoji} maxLength={8} disabled={disabled} onChange={event => update(row.key, { emoji: event.target.value })} /></label>
                {row.sellable && !row.manual && store.price_rounding !== undefined && <ProductRoundingField value={row.rounding} storeStep={storeStep} disabled={disabled} onChange={rounding => update(row.key, { rounding })} />}
              </div>
              {row.sellable && <div className="price-mode-row">
                {row.manual ? <small>Precio manual: no sigue al costo ni se redondea.</small> : <small>El precio sigue al costo{describe(row) ? ` (${describe(row)})` : ''}.</small>}
                {!row.manual && <button type="button" className="text-button" disabled={disabled} onClick={() => void requestManual(row)}>Poner precio manual</button>}
              </div>}
            </td></tr>}
          </Fragment>;
        })}</tbody>
      </table>
    </div>
  );
}
