import { Fragment, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, Plus } from 'lucide-react';
import { NumberInput } from './NumberInput';
import { AiIcon } from './AiIcon';
import type { InvoiceItem } from './InvoiceAnalyzer';
import type { Category, Product } from '../features/retail/api';
import { rankCatalogMatches } from '../services/invoiceMatchingService';
import { normalizeSupplierText } from '../services/supplierMappingService';
import { invoiceCostIncrease } from '../services/invoicePricingService';
import type { InvoiceCatalogCandidate } from '../services/invoiceCatalogService';

export interface InvoiceReviewAttention {
  index: number;
  column: 'qty' | 'pack' | 'cost' | 'action' | 'name' | 'code' | 'minimum';
  sequence: number;
}

interface Props {
  rows: { it: InvoiceItem; originalIndex: number }[];
  filterKey: string;
  products: Product[];
  categories: Category[];
  supplier: string;
  /** Descuento global del proveedor para esta factura; el costo ingresado es el facturado. */
  discountPercent: number;
  /** Costo final por unidad (descuento, IVA e internos) para la fila y el costo facturado dados. */
  finalCost: (index: number, unitCost: number) => number;
  /** Qué se aplicó para llegar al costo final, por ejemplo "+IVA 21% · +internos". */
  finalCostNote: string;
  mappingBusy: boolean;
  expandedItems: Set<number>;
  productSearch: Record<number, string>;
  attention: InvoiceReviewAttention | null;
  catalogSuggestions: { index: number; loading: boolean; candidates: InvoiceCatalogCandidate[]; notice: string } | null;
  onSearchCatalog: (index: number) => void;
  onUseCatalogCandidate: (index: number, candidateId: string) => void;
  onAddRow: () => void;
  isValidCode: (code: string) => boolean;
  onToggleDetails: (index: number) => void;
  onUpdate: (index: number, patch: Partial<InvoiceItem>) => void;
  onPackChange: (index: number, size: number) => void;
  onSelectProduct: (index: number, productId: string) => void;
  onConfirmMapping: (index: number) => void;
  onSearchProduct: (index: number, query: string) => void;
  onCodeChange: (index: number, code: string) => void;
  onGenerateCode: (index: number) => void;
  onFindCode: (index: number) => void;
  onFindCategory: (index: number) => void;
}

const PAGE_SIZE = 50;
const money = (value: number) => `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function InvoiceReviewTable(props: Props) {
  const { rows, filterKey, categories, expandedItems, attention, onUpdate } = props;
  const [navigation, setNavigation] = useState<{ key: string; page: number; attention: InvoiceReviewAttention | null }>({ key: filterKey, page: 0, attention: null });
  const table = useRef<HTMLTableElement>(null);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const requestedIndex = attention ? rows.findIndex(row => row.originalIndex === attention.index) : -1;
  const needsAttention = attention !== navigation.attention && requestedIndex >= 0;
  const page = needsAttention ? Math.floor(requestedIndex / PAGE_SIZE)
    : Math.min(navigation.key === filterKey ? navigation.page : 0, pageCount - 1);
  const start = page * PAGE_SIZE;

  // An import error reveals its page before focusing; all drafts live in the parent.
  useLayoutEffect(() => {
    if (!needsAttention || !attention) return;
    setNavigation({ key: filterKey, page, attention });
    table.current?.querySelector<HTMLInputElement>(`[data-invoice-row="${attention.index}"] [data-column="${attention.column}"]`)?.focus();
  }, [needsAttention, attention, filterKey, page]);

  const moveInColumn = (event: KeyboardEvent<HTMLTableElement>) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
    const field = event.target;
    if (!(field instanceof HTMLInputElement) || !field.dataset.column) return;
    event.preventDefault();
    const fields = Array.from(event.currentTarget.querySelectorAll<HTMLInputElement>(`tbody > tr[data-invoice-row] input[data-column="${field.dataset.column}"]:not(:disabled)`));
    const next = fields[fields.indexOf(field) + (event.shiftKey ? -1 : 1)];
    if (next) { next.focus(); next.select(); }
  };

  const changeCost = (index: number, item: InvoiceItem, value: string) => {
    const cost = value === '' ? NaN : item.matchedProduct ? Number(value) : Math.max(0, Number(value));
    onUpdate(index, {
      unitCost: cost,
      ...(!item.matchedProduct && !item.isManualPrice && Number.isFinite(cost)
        ? { newPrice: Math.max(1, Math.round(props.finalCost(index, cost) * (1 + (item.customMargin ?? 40) / 100))) } : {}),
    });
  };

  return <section className="invoice-sheet" aria-label="Revisión de productos de la factura">
    <div className="invoice-sheet-toolbar">
      <span id="invoice-sheet-help">Tab: siguiente celda · Enter / Mayús+Enter: bajar / subir</span>
      <span>{rows.length.toLocaleString('es-AR')} filas</span>
      <button type="button" className="secondary-button invoice-sheet-add" onClick={props.onAddRow}><Plus size={14} /> Agregar producto manual</button>
    </div>
    <div className="invoice-sheet-scroll" role="region" aria-label="Tabla editable de productos" aria-describedby="invoice-sheet-help" tabIndex={0}>
      <table className="invoice-sheet-table" ref={table} onKeyDown={moveInColumn}>
        <caption className="sr-only">Revisá los productos antes de aplicar la reposición. Aplicar reposición incluye las filas de todas las páginas, también las ocultas por filtros.</caption>
        <thead><tr>
          <th scope="col" className="invoice-sheet-product" data-group="product">Producto</th>
          <th scope="col" className="invoice-sheet-category" data-group="product">Categoría</th>
          <th scope="col" className="invoice-sheet-code" data-group="product">EAN / código *</th>
          <th scope="col" data-group="stock">Cant. factura</th>
          <th scope="col" data-group="stock">U. / bulto</th>
          <th scope="col" data-group="stock">Ingresan (u.)</th>
          <th scope="col" data-group="stock" title="Mínimo de unidades a mantener en stock">Stock mínimo</th>
          <th scope="col" className="invoice-sheet-money" data-group="price">{props.finalCostNote ? 'Costo factura / u. ($)' : 'Costo / u. ($)'}</th>
          <th scope="col" data-group="price">Aumento (%)</th>
          <th scope="col" className="invoice-sheet-money" data-group="price">Venta / u. ($)</th>
          <th scope="col" className="invoice-sheet-action">Acción</th>
        </tr></thead>
        <tbody>
          {!rows.length && <tr><td colSpan={11} className="invoice-sheet-empty">No hay productos para este filtro.</td></tr>}
          {rows.slice(start, start + PAGE_SIZE).map(({ it, originalIndex: index }) => {
            const product = it.matchedProduct;
            const isNew = !product && it.action === 'create_new';
            const skipped = it.action === 'skip';
            const linking = !product && !isNew && !skipped;
            const open = expandedItems.has(index);
            const name = product?.name || it.newName || it.rawName;
            const label = `Fila ${index + 1}, ${name}`;
            const costRequired = !skipped && it.action !== 'add_stock';
            const badCost = !skipped && (it.unitCost < 0 || (costRequired && (!it.costKnown || (product?.sale_markup != null && it.unitCost <= 0))));
            const badQuantity = !skipped && (!Number.isSafeInteger(it.qty) || it.qty <= 0 || it.qty > 1000000);
            const badCode = isNew && !props.isValidCode(it.newCode);
            const badMinimum = isNew && (!Number.isSafeInteger(it.newMinStock) || it.newMinStock < 0 || it.newMinStock > 2147483647);
            const addsStock = !skipped && (isNew || (product && it.action !== 'update_cost'));
            const net = props.finalCost(index, it.unitCost);
            const increase = product && it.costKnown ? invoiceCostIncrease(product.cost, net) : null;
            return <Fragment key={index}>
              <tr data-invoice-row={index} data-state={skipped ? 'skipped' : isNew ? 'new' : product && it.linkStatus !== 'pending' ? 'linked' : 'pending'} className={skipped ? 'invoice-sheet-skipped' : ''}>
                <th scope="row" className="invoice-sheet-product">
                  <div className="invoice-sheet-name">
                    <span className="invoice-sheet-number">{index + 1}</span>
                    {isNew ? <input aria-label={`${label}: nombre`} data-column="name" value={it.newName} required aria-invalid={!it.newName.trim() || undefined}
                      placeholder="Nombre del producto" onChange={event => onUpdate(index, { newName: event.target.value })} />
                      : <strong title={name}>{name}</strong>}
                  </div>
                  <div className="invoice-sheet-state">
                    {isNew ? <span>{!it.manual && <AiIcon size={12} />} {it.manual ? 'Manual' : 'Nuevo'}</span> : skipped ? <span>Omitido</span>
                      : product ? <span className={it.linkStatus === 'pending' ? 'invoice-sheet-warning' : ''} title={it.linkReason}>
                        {it.linkStatus === 'pending' ? 'Revisar vínculo' : it.linkStatus === 'auto' ? 'Vínculo automático' : 'Confirmado'}
                      </span> : <span>Elegir producto</span>}
                    {(it.mapping?.times_used ?? 0) >= 2 && <span title="Usos del alias; no equivale a cantidad de facturas únicas.">🔗 {it.mapping!.times_used} usos</span>}
                    {!product && !skipped && <button type="button" className="ai-action invoice-sheet-ai" disabled={
                      (props.catalogSuggestions?.index === index && props.catalogSuggestions.loading)
                      || ((it.newName || (it.manual ? '' : it.rawName)).trim().length < 2 && !/^\d{8,14}$/.test(it.newCode.trim()))}
                      aria-label={`${label}: buscar con IA en tu catálogo y el catálogo compartido`}
                      onClick={() => props.onSearchCatalog(index)}><AiIcon size={12} />
                      {props.catalogSuggestions?.index === index && props.catalogSuggestions.loading ? 'Buscando…' : 'Buscar IA'}
                    </button>}
                  </div>
                </th>
                <td>{isNew ? <select aria-label={`${label}: categoría`} value={it.newCategoryId}
                  onChange={event => onUpdate(index, { newCategoryId: event.target.value, categorySource: 'manual' })}>
                  {!it.newCategoryId && <option value="">Elegir categoría</option>}
                  {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select> : <span>{product?.category || '—'}</span>}</td>
                <td>{isNew ? <><input aria-label={`${label}: EAN obligatorio o código interno generado`} data-column="code" value={it.newCode}
                  required aria-invalid={badCode || undefined} placeholder="Escanear EAN" onChange={event => props.onCodeChange(index, event.target.value)} />
                  <div className="invoice-sheet-code-actions">
                    {badCode ? <small className="invoice-sheet-warning">Completar código</small> : /^INT-/i.test(it.newCode) ? <small>Interno</small> : null}
                    {badCode && <button type="button" aria-label={`${label}: generar código interno si no conseguís el EAN`}
                      onClick={() => props.onGenerateCode(index)}>Generar interno</button>}
                  </div></>
                  : <span className="invoice-sheet-code-text">{product?.code || it.rawCode || '—'}</span>}</td>
                <td><NumberInput aria-label={`${label}: cantidad facturada, en ${it.isPack ? 'bultos' : 'unidades'}`} data-column="qty"
                  min={0.001} max={1000000} step="any" value={it.rawQty} disabled={skipped}
                  aria-invalid={badQuantity || undefined} onValueChange={value => onUpdate(index, { qty: Number(value) * it.unitsPerPack })} />
                  {badQuantity && <small className="invoice-sheet-warning">Revisar cantidad</small>}</td>
                <td><NumberInput aria-label={`${label}: unidades por bulto`} data-column="pack" min={1} max={999}
                  value={it.unitsPerPack} disabled={skipped} onValueChange={value => props.onPackChange(index, Number(value))} /></td>
                <td className="invoice-sheet-total"><strong>{addsStock ? it.qty.toLocaleString('es-AR') : '0'}</strong>
                  {product && <small title="Stock actual → stock tras aplicar la acción elegida">
                    {product.stock.toLocaleString('es-AR')}{addsStock ? ` → ${(product.stock + it.qty).toLocaleString('es-AR')}` : ' actual'}
                  </small>}</td>
                <td>{isNew ? <><NumberInput aria-label={`${label}: stock mínimo en unidades`} data-column="minimum" min={0} max={2147483647}
                  required value={Number.isFinite(it.newMinStock) ? it.newMinStock : ''} aria-invalid={badMinimum || undefined}
                  onValueChange={value => onUpdate(index, { newMinStock: value === '' ? NaN : Number(value) })} />
                  {badMinimum && <small className="invoice-sheet-warning">Entero desde 0</small>}</> : <span>{product?.minStock.toLocaleString('es-AR') ?? '—'}</span>}</td>
                <td><NumberInput aria-label={`${label}: costo unitario en pesos`} data-column="cost" min={0} step={0.01}
                  value={it.costKnown ? it.unitCost : ''} placeholder="Completar" disabled={skipped} aria-invalid={badCost || undefined}
                  onValueChange={value => changeCost(index, it, value)} />
                  {it.costKnown && net !== it.unitCost && <small className="invoice-sheet-net" title="Costo final que se guarda: descuento del proveedor, IVA e impuestos internos">
                    Final {money(net)}{props.finalCostNote ? ` · ${props.finalCostNote}` : ''}</small>}
                  {increase && <small className="invoice-sheet-cost-change" title={`Costo anterior: ${money(product!.cost)}`}>
                    {increase.percent === null ? 'Antes sin costo' : `Subió ${increase.percent.toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`}
                  </small>}
                  {badCost && <small className="invoice-sheet-warning">Revisar costo</small>}</td>
                <td>{isNew ? <>
                  <NumberInput aria-label={`${label}: aumento sobre costo, editar vuelve al cálculo por porcentaje`} data-column="markup"
                    min={0} max={1000} value={it.customMargin ?? 40} onValueChange={value => {
                      const margin = Math.max(0, Number(value));
                      onUpdate(index, { customMargin: margin, isManualPrice: false, newPrice: Math.max(1, Math.round(net * (1 + margin / 100))) });
                    }} />
                  <small>Sobre costo</small>
                </> : <span title="Los precios de productos existentes se revisan en la propuesta posterior">—</span>}</td>
                <td className={isNew ? 'invoice-sheet-sale-price' : undefined}>{isNew ? <><NumberInput aria-label={`${label}: precio de venta unitario en pesos, editar fija precio manual`} data-column="price"
                  min={1} step={0.01} value={it.newPrice} onValueChange={value => {
                    const price = Math.max(1, Number(value));
                    onUpdate(index, { newPrice: price, isManualPrice: true, customMargin: net > 0 ? Math.round(((price - net) / net) * 100) : 0 });
                  }} /><small>{it.isManualPrice ? 'Manual' : 'Calculado'}</small></> : <><strong>{money(product?.price ?? it.newPrice)}</strong>{product && <small>Actual</small>}</>}</td>
                <td>
                  <select aria-label={`${label}: acción al aplicar`} data-column="action" data-action={product ? it.action : isNew ? 'create_new' : skipped ? 'skip' : 'link'} value={product ? it.action : isNew ? 'create_new' : skipped ? 'skip' : 'link'}
                    onChange={event => {
                      onUpdate(index, event.target.value === 'link'
                        ? { action: 'both', linkStatus: 'pending' } : { action: event.target.value as InvoiceItem['action'] });
                      if (event.target.value === 'link' && !open) props.onToggleDetails(index);
                    }}>
                    {product ? <><option value="both">Stock + costo</option><option value="add_stock">Solo stock</option><option value="update_cost">Solo costo</option></>
                      : <><option value="create_new">Crear nuevo</option><option value="link">Vincular</option></>}
                    <option value="skip">Omitir</option>
                  </select>
                  <div className="invoice-sheet-row-actions">
                    {product && !skipped && it.linkStatus === 'pending' && <button type="button" className="invoice-sheet-confirm" disabled={props.mappingBusy}
                      aria-label={`${label}: confirmar vínculo${normalizeSupplierText(props.supplier) ? ' y recordar para este proveedor' : ''}`}
                      onClick={() => props.onConfirmMapping(index)}>Confirmar</button>}
                    <button type="button" aria-expanded={open} aria-controls={`invoice-details-${index}`}
                      aria-label={`${label}: ${open ? 'cerrar' : 'ver'} detalles`} onClick={() => props.onToggleDetails(index)}>
                      Detalles {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  </div>
                </td>
              </tr>
              {open && <tr className="invoice-sheet-details-row"><td colSpan={11}>
                <div id={`invoice-details-${index}`} className="invoice-sheet-details">
                  {props.catalogSuggestions?.index === index && <div className="invoice-sheet-catalog" aria-label="Coincidencias del catálogo">
                    <p role="status">{props.catalogSuggestions.loading ? 'Buscando en tu catálogo y en el compartido…' : props.catalogSuggestions.notice}</p>
                    {props.catalogSuggestions.candidates.length > 0 && <ul>
                      {props.catalogSuggestions.candidates.map(candidate => <li key={candidate.id}>
                        <div><strong>{candidate.name}</strong><span>{candidate.code} · {candidate.category || 'Sin categoría'} · {candidate.source === 'store' ? 'Tu catálogo' : 'Catálogo compartido'}</span></div>
                        <button type="button" onClick={() => props.onUseCatalogCandidate(index, candidate.id)}>{candidate.productId ? 'Vincular' : 'Usar datos'}</button>
                      </li>)}
                    </ul>}
                    {!props.catalogSuggestions.loading && <button type="button" className="ai-action" onClick={() => props.onSearchCatalog(index)}><AiIcon size={14} /> Volver a buscar</button>}
                  </div>}
                  <p><strong>Factura:</strong> {it.invoiceLine}</p>
                  <p>{it.isPack ? `${it.rawQty.toLocaleString('es-AR')} bultos × ${it.unitsPerPack} u. = ${it.qty.toLocaleString('es-AR')} unidades. Costo por bulto: ${money(it.rawCost)} ÷ ${it.unitsPerPack}.`
                    : 'Unidad suelta: el costo no se divide.'}
                    {it.divisionReason && <span> Explicación de IA: {it.divisionReason}</span>}</p>
                  {isNew && <>
                    <div className="invoice-sheet-detail-actions">
                      {it.suggestedName && <button type="button" className="ai-action" onClick={() => onUpdate(index, { newName: it.suggestedName })}><AiIcon size={14} /> Restaurar nombre sugerido</button>}
                      <button type="button" onClick={() => props.onFindCategory(index)}>Buscar categoría en catálogo</button>
                      <button type="button" onClick={() => props.onFindCode(index)}>Buscar código en catálogo</button>
                      <button type="button" onClick={() => props.onGenerateCode(index)}>Generar código interno</button>
                      {it.isManualPrice && <button type="button" onClick={() => onUpdate(index, {
                        isManualPrice: false, newPrice: Math.max(1, Math.round(net * (1 + (it.customMargin ?? 40) / 100))),
                      })}>Usar porcentaje</button>}
                    </div>
                    <p>Categoría: {it.categorySource === 'ai' ? 'sugerida por IA' : it.categorySource === 'catalog' ? 'del catálogo' : 'selección actual'} · Código: {it.codeSource === 'invoice' ? 'detectado en factura' : it.codeSource === 'catalog' ? 'del catálogo' : it.newCode ? 'manual / interno' : 'pendiente, obligatorio'}.</p>
                  </>}
                  {!skipped && <div className="invoice-sheet-detail-actions"><span>U. / bulto:</span>
                    {(product ? [1, 6, 12, 18, 20, 24, 32, 36] : [1, 6, 10, 12, 18, 20, 24, 25, 30, 36]).map(size =>
                      <button type="button" key={size} aria-pressed={it.unitsPerPack === size} onClick={() => props.onPackChange(index, size)}>{size === 1 ? 'Suelto' : `×${size}`}</button>)}
                    {isNew && <><span>Aumento:</span>{[30, 40, 50, 70, 100].map(margin => <button type="button" key={margin}
                      aria-pressed={!it.isManualPrice && (it.customMargin ?? 40) === margin} onClick={() => onUpdate(index, {
                        customMargin: margin, isManualPrice: false, newPrice: Math.max(1, Math.round(net * (1 + margin / 100))),
                      })}>+{margin}%</button>)}</>}
                  </div>}
                  {product && !skipped && <p>{it.linkReason} {it.linkStatus === 'pending' && `Confianza: ${Math.round(it.matchConfidence * 100)}%.`}</p>}
                  {((product && !skipped) || linking) && <InvoiceLinkFields {...props} index={index} item={it} />}
                  {skipped && <p>Este renglón no se aplica. Cambiá su acción para incluirlo.</p>}
                </div>
              </td></tr>}
            </Fragment>;
          })}
        </tbody>
      </table>
    </div>
    {rows.length > PAGE_SIZE && <nav className="invoice-sheet-pages" aria-label="Páginas de productos">
      <span role="status">Filas {start + 1}–{Math.min(start + PAGE_SIZE, rows.length)} de {rows.length} · Página {page + 1}/{pageCount}</span>
      <button type="button" disabled={page === 0} onClick={() => setNavigation({ key: filterKey, page: page - 1, attention })}>Anterior</button>
      <button type="button" disabled={page === pageCount - 1} onClick={() => setNavigation({ key: filterKey, page: page + 1, attention })}>Siguiente</button>
    </nav>}
  </section>;
}

function InvoiceLinkFields(props: Props & { index: number; item: InvoiceItem }) {
  const { index, item, products, productSearch, onUpdate } = props;
  const pending = item.linkStatus === 'pending' || !item.matchedProduct;
  const query = normalizeSupplierText(productSearch[index] || '');
  const matches = pending ? (query ? products.filter(product => normalizeSupplierText(`${product.name} ${product.code}`).includes(query)).slice(0, 60) : products.slice(0, 60)) : [];
  const options = [...new Map([...(item.matchedProduct ? [item.matchedProduct] : []), ...matches,
    ...(pending && query ? rankCatalogMatches(query, query, products, 6).map(match => match.product) : []),
  ].map(product => [product.id, product])).values()];
  return <div className="invoice-sheet-link">
    {pending ? <>
      <div className="invoice-link-fields">
        <label>Buscar en catálogo<input value={productSearch[index] || ''} placeholder="Nombre o código"
          onChange={event => props.onSearchProduct(index, event.target.value)} /></label>
        <label>Producto del catálogo<select value={item.matchedProduct?.id || ''} onChange={event => props.onSelectProduct(index, event.target.value)}>
          <option value="">Elegir producto</option>
          {options.map(product => <option value={product.id} key={product.id}>{product.name}{product.code ? ` · ${product.code}` : ''}</option>)}
        </select></label>
      </div>
      <div className="invoice-sheet-detail-actions">
        <button type="button" className="primary-button" disabled={props.mappingBusy || !item.matchedProduct}
          onClick={() => props.onConfirmMapping(index)}><CheckCircle2 size={14} />{normalizeSupplierText(props.supplier) ? 'Confirmar y recordar' : 'Confirmar vínculo'}</button>
        <button type="button" onClick={() => onUpdate(index, { matchedProduct: null, action: 'create_new' })}>Crear como nuevo</button>
      </div>
    </> : <div className="invoice-sheet-detail-actions">
      <button type="button" onClick={() => onUpdate(index, { linkStatus: 'pending' })}>Cambiar vínculo</button>
      <button type="button" onClick={() => onUpdate(index, { matchedProduct: null, action: 'create_new' })}>Desvincular y crear como nuevo</button>
    </div>}
  </div>;
}
