import { useEffect, useRef, useState, type CSSProperties, type Ref } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CircleHelp,
  Coins,
  CornerDownRight,
  Eye,
  GitBranch,
  LockKeyhole,
  Pencil,
  Plus,
  SlidersHorizontal,
  Store,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
import { NumberInput } from '../../components/NumberInput';
import { randomUUID } from '../../utils/uuid';
import { retail, errorMessage, type Branch, type Category, type PriceList, type PriceOverride, type PriceRule, type Product } from './api';
import type { Run } from './Management';
import { productsForList } from './pricing';
import { SettingsEditor, SettingsEditorGroup } from './SettingsEditor';
import './permission-profiles.css';
import './price-lists.css';

type Props = { storeId: string; lists: PriceList[]; overrides: PriceOverride[]; products: Product[]; categories?: Category[]; branches?: Branch[]; run: Run; busy: boolean; expanded?: boolean };
type Session = { key: string; draft: PriceList; existing: boolean };
const money = (value: number) => value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
const percent = (value: number) => `${value > 0 ? '+' : ''}${Number(value).toLocaleString('es-AR')}%`;
const PAGE_SIZE = 20;
const ruleLabels = { category: 'Categoría', brand: 'Marca', product: 'Producto' } as const;
// Own changes of a list: its fixed price or a specific rule reaching the product.
// Principal has neither; its own change is the product percentage over cost.
function ownChanges(product: Product, list: PriceList, fixed: PriceOverride | undefined): string[] {
  if (fixed) return ['Precio fijo'];
  const brand = (product.brand || '').trim().toLowerCase();
  const rules = (list.pricing_rules || []).filter(r => r.target === (r.scope === 'category' ? product.categoryId : r.scope === 'product' ? product.id : brand))
    .map(r => `${ruleLabels[r.scope]} ${percent(r.adjustment)}`);
  if (list.is_primary) {
    const markup = product.sale_markup == null ? [] : [`${percent(product.sale_markup)} sobre costo`];
    return [...markup, ...rules];
  }
  const generalAdjustment = Number(list.adjustment || 0);
  const general = generalAdjustment !== 0
    ? [list.base_kind === 'cost' ? `${percent(generalAdjustment)} sobre costo` : `General ${percent(generalAdjustment)}`]
    : [];
  return [...general, ...rules];
}
const origin = (list: PriceList) => list.base_kind === 'list' ? list.parent_id || 'missing' : list.base_kind || 'catalog';
const sourceName = (source: string, lists: PriceList[]) => source === 'cost' ? 'Costo' : source === 'catalog' ? 'Catálogo' : lists.find(l => l.id === source)?.name || 'Origen no disponible';

function descendants(id: string, lists: PriceList[]): Set<string> {
  const found = new Set([id]);
  let changed = true;
  while (changed) { changed = false; for (const l of lists) if (l.parent_id && found.has(l.parent_id) && !found.has(l.id)) { found.add(l.id); changed = true; } }
  return found;
}

export function PriceListSettings({ storeId, lists, overrides, products, categories = [], branches = [], run, busy, expanded = false }: Props) {
  const primary = lists.find(l => l.is_primary);
  const [selected, setSelected] = useState('cost');
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState(0);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [active, setActive] = useState('');
  const [percentageTarget, setPercentageTarget] = useState({ key: '', request: 0 });
  const heading = useRef<HTMLHeadingElement>(null);
  const preview = useRef<HTMLHeadingElement>(null);
  const focusPreview = useRef(false);
  useEffect(() => {
    if (focusPreview.current && !active && !preview.current?.closest('[hidden]')) {
      preview.current?.focus(); focusPreview.current = false;
    }
  }, [active, selected]);
  const list = lists.find(l => l.id === selected);
  const fixedFor = (productId: string) => overrides.find(o => o.list_id === selected && o.product_id === productId);
  const changesFor = (p: Product) => list ? ownChanges(p, list, fixedFor(p.id)) : [];
  const onlyChanged = !!list && !showAll;
  const matches = products.filter(p => p.sellable !== false && `${p.name} ${p.code}`.toLowerCase().includes(query.toLowerCase())
    && (!onlyChanged || changesFor(p).length > 0));
  const pageCount = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = matches.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const priced = selected === 'cost' ? visible.map(p => ({ ...p, price: Number(p.cost), pricingError: p.cost > 0 ? undefined : 'Costo sin cargar' })) : productsForList(visible, list, overrides, lists);
  const start = (source: string, existing?: PriceList, percentage = false) => {
    // Costo stays a valid root; a second catalog root would duplicate Principal.
    if (!existing && primary && source === 'catalog') source = primary.id;
    const key = existing ? existing.id : `new:${source}`;
    if (!sessions.some(s => s.key === key)) {
      const parent = lists.find(l => l.id === source);
      const draft: PriceList = existing ? structuredClone(existing) : {
        id: randomUUID(), store_id: storeId, name: '', adjustment: 0, active: true,
        branch_id: parent?.branch_id || null, base_kind: source === 'cost' ? 'cost' : source === 'catalog' ? 'catalog' : 'list',
        parent_id: parent?.id || null, pricing_rules: [], revision: 0,
      };
      setSessions(prev => [...prev, { key, draft, existing: !!existing }]);
    }
    setActive(key);
    if (percentage) setPercentageTarget(prev => ({ key, request: prev.request + 1 }));
  };
  const close = (key: string) => {
    setSessions(prev => prev.filter(s => s.key !== key)); setActive('');
    if (!heading.current?.closest('[hidden]')) heading.current?.focus();
  };
  const inspect = (id: string) => {
    setSelected(id); setActive(''); setPage(0);
    if (active) focusPreview.current = true;
    else if (!preview.current?.closest('[hidden]')) preview.current?.focus();
  };

  interface TreeNode {
    list: PriceList;
    children: TreeNode[];
  }

  const visited = new Set<string>();
  const buildTree = (sourceId: string, depth = 0): TreeNode[] => {
    if (depth >= 12) return [];
    return lists
      .filter(l => origin(l) === sourceId && !visited.has(l.id))
      .map(l => {
        visited.add(l.id);
        return {
          list: l,
          children: buildTree(l.id, depth + 1),
        };
      });
  };

  const costTree = buildTree('cost');
  const catalogTree = buildTree('catalog');
  const orphanNodes: TreeNode[] = lists
    .filter(l => !visited.has(l.id))
    .map(list => ({ list, children: [] }));

  const renderTree = (items: TreeNode[], depth = 0) => {
    if (!items.length) return null;
    return (
      <ol className={`price-tree-list depth-${depth}`}>
        {items.map(({ list: l, children }) => {
          const isSelected = selected === l.id;
          const branchName = l.branch_id ? branches.find(b => b.id === l.branch_id)?.name : null;
          const parentName = sourceName(origin(l), lists);
          const rulesCount = l.pricing_rules?.length || 0;
          const isEditing = sessions.some(s => s.key === l.id);

          return (
            <li key={l.id} className="price-tree-item">
              <article className={`price-flow-node ${l.is_primary ? 'is-primary' : ''} ${isSelected ? 'selected' : ''}`}>
                <div className="price-flow-main">
                  <button
                    type="button"
                    className="price-flow-name"
                    onClick={() => inspect(l.id)}
                    aria-pressed={isSelected}
                    aria-label={`Ver precios de ${l.name}`}
                  >
                    <div className="price-node-title-row">
                      <span className="price-node-icon" aria-hidden="true">
                        {l.is_primary ? <Store size={15} /> : <TrendingUp size={14} />}
                      </span>
                      <strong className="price-node-name">{l.name}</strong>
                      {l.is_primary && (
                        <span className="price-primary-pill">Principal</span>
                      )}
                    </div>
                    <span className="price-node-origin">
                      {l.is_primary ? (
                        'Costo base + margen individual de cada producto'
                      ) : (
                        <>
                          <CornerDownRight size={11} aria-hidden="true" />
                          <span>Deriva de <strong>{parentName}</strong></span>
                        </>
                      )}
                    </span>
                  </button>

                  {!l.is_primary && (
                    <button
                      type="button"
                      className={`price-percent ${l.adjustment > 0 ? 'is-markup' : l.adjustment < 0 ? 'is-discount' : 'is-neutral'}`}
                      disabled={busy}
                      onClick={() => start(origin(l), l, true)}
                      aria-label={`Editar porcentaje de ${l.name}: ${percent(l.adjustment)}`}
                      title="Clic para editar porcentaje general"
                    >
                      <Pencil size={11} aria-hidden="true" />
                      <span>{percent(l.adjustment)}</span>
                    </button>
                  )}
                </div>

                {(rulesCount > 0 || branchName || !l.active) && (
                  <div className="price-flow-badges">
                    {rulesCount > 0 && (
                      <span className="price-badge-item" title="Reglas por categoría o marca">
                        <SlidersHorizontal size={11} aria-hidden="true" />
                        <span>{rulesCount} {rulesCount === 1 ? 'regla' : 'reglas'}</span>
                      </span>
                    )}
                    {branchName && (
                      <span className="price-badge-item" title="Exclusiva para esta sucursal">
                        <Building2 size={11} aria-hidden="true" />
                        <span>{branchName}</span>
                      </span>
                    )}
                    {!l.active && (
                      <span className="price-badge-item is-inactive">
                        <AlertCircle size={11} aria-hidden="true" />
                        <span>Inactiva</span>
                      </span>
                    )}
                  </div>
                )}

                <div className="price-flow-actions">
                  <button
                    type="button"
                    className={`price-action-link ${isSelected ? 'active-view' : ''}`}
                    onClick={() => inspect(l.id)}
                    aria-label={`Ver precios de ${l.name}`}
                  >
                    <Eye size={13} aria-hidden="true" />
                    <span>{isSelected ? 'Viendo precios' : 'Ver precios'}</span>
                  </button>
                  <button
                    type="button"
                    className="price-action-link"
                    disabled={busy}
                    onClick={() => start(origin(l), l)}
                    aria-label={`Editar ${l.name}`}
                  >
                    <Pencil size={13} aria-hidden="true" />
                    <span>{isEditing ? 'Continuar' : 'Editar'}</span>
                  </button>
                  <button
                    type="button"
                    className="price-action-link price-action-add"
                    disabled={busy}
                    onClick={() => start(l.id)}
                    aria-label={`Crear lista derivada desde ${l.name}`}
                    title={`Crear una lista derivada con base en ${l.name}`}
                  >
                    <Plus size={13} aria-hidden="true" />
                    <span>Derivar lista</span>
                  </button>
                </div>
              </article>

              {children.length > 0 && renderTree(children, depth + 1)}
            </li>
          );
        })}
      </ol>
    );
  };

  return <section className="retail-panel price-list-settings" aria-label="Listas de precios">
    <div className="price-lists-heading"><h3 ref={heading} tabIndex={-1}>Listas de precios</h3>
      <button type="button" className="primary-button" disabled={busy || !primary} onClick={() => start(primary!.id)}><Plus size={16} aria-hidden="true" /> Crear lista</button>
    </div>
    <div className={`price-lists-layout${active ? ' editing' : ''}`}>
      <div className="price-flow" aria-label="Orígenes y listas derivadas">
        <div className="price-flow-tree-header">
          <span className="price-flow-tree-title">Estructura jerárquica de listas</span>
          <span className="price-flow-tree-subtitle">Elegí cualquier lista para consultar o fijar sus precios</span>
        </div>

        {/* Nodo Raíz: Costo */}
        <div className={`price-flow-root ${selected === 'cost' ? 'selected' : ''}`}>
          <button
            type="button"
            className="price-flow-name"
            aria-pressed={selected === 'cost'}
            onClick={() => inspect('cost')}
          >
            <div className="price-node-title-row">
              <span className="price-node-icon price-root-icon" aria-hidden="true">
                <Coins size={16} />
              </span>
              <div className="price-root-text">
                <strong className="price-node-name">Costo de reposición</strong>
                <span className="price-node-origin">Base de compra sin recargos</span>
              </div>
            </div>
          </button>
          <div className="price-root-meta">
            <span className="price-origin-badge">
              <LockKeyhole size={12} aria-hidden="true" /> Solo consulta
            </span>
            {selected === 'cost' && (
              <span className="price-viewing-badge">Viendo costos</span>
            )}
            {primary && (
              <button type="button" className="price-action-link price-action-add" disabled={busy} onClick={() => start('cost')} aria-label="Crear lista derivada desde Costo" title="Crear una lista con un porcentaje sobre el costo">
                <Plus size={13} aria-hidden="true" />
                <span>Derivar lista</span>
              </button>
            )}
          </div>
        </div>

        {!!costTree.length && renderTree(costTree, 0)}

        {primary ? (
          catalogTree.length > 0 && renderTree(catalogTree, 0)
        ) : (
          <details className="price-catalog-origin" open={!costTree.length && catalogTree.length ? true : undefined}>
            <summary>Catálogo legado{catalogTree.length ? ` · ${catalogTree.length} listas` : ''}</summary>
            <div className="price-flow-root">
              <button type="button" className="price-flow-name" aria-pressed={selected === 'catalog'} onClick={() => inspect('catalog')}>
                <strong>Precios del catálogo</strong>
              </button>
              <button type="button" className="text-button" disabled={busy} onClick={() => start('catalog')} aria-label="Crear lista desde el catálogo">
                <Plus size={14} aria-hidden="true" /> Derivar lista
              </button>
            </div>
            {renderTree(catalogTree, 0)}
          </details>
        )}

        {!primary && <p role="status">Instalá la actualización de lista principal para crear nuevas listas.</p>}
        {!!orphanNodes.length && (
          <div className="price-orphan-block">
            <p role="status">Listas con origen a revisar:</p>
            {renderTree(orphanNodes, 0)}
          </div>
        )}
      </div>
      <div hidden={!active} className="price-list-workspace">{sessions.map(s => <div key={s.key} hidden={active !== s.key}>
        <PriceListEditor session={s} active={active === s.key} percentageFocus={percentageTarget.key === s.key ? percentageTarget.request : 0} lists={lists} overrides={overrides} products={products} categories={categories} branches={branches} run={run} busy={busy} onCancel={() => close(s.key)} onSaved={() => { setSelected(s.draft.id); close(s.key); }} onDeleted={() => { setSelected(prev => prev === s.draft.id ? 'cost' : prev); close(s.key); }} onEditDerived={l => start(origin(l), l)} />
      </div>)}</div>
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
    </div>
    <details className="price-list-guide"><summary><CircleHelp size={14} aria-hidden="true" /> Cómo se calcula</summary>
      <p>Los ajustes se aplican en cadena: general → categoría → marca → producto. $100 +50% −10% = $135, redondeando a centavos en cada paso.</p>
      <p>Un precio fijo reemplaza los ajustes de esa lista. Dejalo vacío para volver al cálculo. Las derivadas parten del resultado de su origen.</p>
      <p>Costo es solo consulta, pero podés derivar listas desde él: Costo +30% sobre $100 da $130 y se recalcula al cambiar el costo. La principal usa el costo y porcentaje del producto; los precios manuales anteriores se conservan. Las demás listas heredan el precio de su origen. Una lista activa de sucursal tiene prioridad allí; en otro caso se usa la principal. No se modifican tickets ni carritos iniciados.</p>
    </details>
  </section>;
}

function PriceListEditor({ session, active, percentageFocus, lists, overrides, products, categories, branches, run, busy, onCancel, onSaved, onDeleted, onEditDerived }: {
  session: Session; active: boolean; percentageFocus: number; lists: PriceList[]; overrides: PriceOverride[]; products: Product[]; categories: Category[]; branches: Branch[]; run: Run; busy: boolean; onCancel: () => void; onSaved: () => void; onDeleted: () => void; onEditDerived: (list: PriceList) => void;
}) {
  const [draft, setDraft] = useState(session.draft);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [sampleQuery, setSampleQuery] = useState('');
  const [ruleKeys, setRuleKeys] = useState(() => (session.draft.pricing_rules || []).map(() => randomUUID()));
  const pending = useRef(false);
  const title = useRef<HTMLHeadingElement>(null);
  const generalInput = useRef<HTMLInputElement>(null);
  const lastPercentageFocus = useRef(0);
  const deleteTitle = useRef<HTMLHeadingElement>(null);
  const deleteButton = useRef<HTMLButtonElement>(null);
  const restoreDeleteFocus = useRef(false);
  const branchInput = useRef<HTMLSelectElement>(null);
  const focusBranch = useRef(false);
  useEffect(() => { if (active && !title.current?.closest('[hidden]')) title.current?.focus(); }, [active]);
  useEffect(() => {
    if (!active || !percentageFocus || percentageFocus === lastPercentageFocus.current) return;
    if (deleteOpen) { setDeleteOpen(false); return; }
    if (!busy && !saving && !generalInput.current?.closest('[hidden]')) {
      generalInput.current?.focus(); generalInput.current?.select(); lastPercentageFocus.current = percentageFocus;
    }
  }, [active, percentageFocus, deleteOpen, busy, saving]);
  useEffect(() => {
    if (!active) return;
    if (deleteOpen && !deleteTitle.current?.closest('[hidden]')) deleteTitle.current?.focus();
    else if (restoreDeleteFocus.current && !deleteButton.current?.closest('[hidden]')) { deleteButton.current?.focus(); restoreDeleteFocus.current = false; }
  }, [deleteOpen, active]);
  useEffect(() => {
    if (focusBranch.current && optionsOpen && active && !busy && !saving && !branchInput.current?.closest('[hidden]')) {
      branchInput.current?.focus(); focusBranch.current = false;
    }
  }, [optionsOpen, active, busy, saving, error]);
  const unavailableParents = descendants(draft.id, lists);
  const source = origin(draft);
  const update = (patch: Partial<PriceList>) => { setDraft(prev => ({ ...prev, ...patch })); setError(''); };
  const rules = draft.pricing_rules || [];
  const setRule = (index: number, rule: PriceRule) => update({ pricing_rules: rules.map((r, i) => i === index ? rule : r) });
  const previewLists = [...lists.filter(l => l.id !== draft.id), draft];
  const sample = productsForList(products.filter(p => p.sellable !== false && `${p.name} ${p.code}`.toLowerCase().includes(sampleQuery.toLowerCase())).slice(0, 3), draft, overrides, previewLists);
  const branchError = (message: string) => { setError(message); focusBranch.current = true; setOptionsOpen(true); };
  const children = lists.filter(l => l.parent_id === session.draft.id);
  const deleteList = async () => {
    if (busy || pending.current || !active || !deleteOpen || !session.existing || draft.is_primary || children.length) return;
    pending.current = true; setDeleting(true); setDeleteError('');
    try {
      if (await run(async () => {
        try { await retail.deletePriceList(session.draft.store_id, session.draft.id, session.draft.revision ?? 0); }
        catch (err) { setDeleteError(errorMessage(err)); throw err; }
      }, 'Lista eliminada. Las ventas guardadas se conservan.')) onDeleted();
    } finally { pending.current = false; setDeleting(false); }
  };
  return <form className="retail-form price-list-editor" onSubmit={async e => {
    e.preventDefault(); if (busy || pending.current || !active || deleteOpen) return;
    const parent = lists.find(l => l.id === draft.parent_id);
    if (draft.base_kind === 'list' && (!parent || unavailableParents.has(parent.id))) { setError('Elegí un origen disponible que no dependa de esta lista.'); return; }
    if (parent?.branch_id && parent.branch_id !== draft.branch_id) { branchError('Elegí la misma sucursal que la lista de origen.'); return; }
    if (new Set(rules.map(r => `${r.scope}:${r.target}`)).size !== rules.length) { setError('Hay reglas repetidas para el mismo destino. Combiná o quitá la repetida.'); return; }
    pending.current = true; setSaving(true);
    try { if (await run(async () => {
      try { await retail.savePriceListTree(draft.store_id, draft); }
      catch (err) {
        const message = errorMessage(err);
        if (/sucursal|local|branch/i.test(message)) branchError(message); else setError(message);
        throw err;
      }
    }, session.existing ? 'Lista actualizada; sus derivadas usan las nuevas reglas' : 'Lista creada')) onSaved(); }
    finally { pending.current = false; setSaving(false); }
  }}>
    <div className="price-editor-heading"><h3 ref={title} tabIndex={-1}>{session.existing ? `Editar ${session.draft.name}` : 'Nueva lista'}</h3>{session.existing && !draft.is_primary && <button ref={deleteButton} type="button" className="text-button danger-text" disabled={busy || saving || deleting || !active || deleteOpen} onClick={() => { setDeleteError(''); setDeleteOpen(true); }}><Trash2 size={14} aria-hidden="true" /> Eliminar</button>}</div>
    <section className="price-list-delete-confirm" hidden={!deleteOpen} aria-label={`Eliminar ${session.draft.name}`}>
      <h4 ref={deleteTitle} tabIndex={-1}>¿Eliminar «{session.draft.name}»?</h4>
      {children.length ? <><p>Cambiá primero el origen de estas listas:</p><ul>{children.map(child => <li key={child.id}><button type="button" className="text-button" disabled={busy || deleting || !active} onClick={() => onEditDerived(child)}><Pencil size={13} aria-hidden="true" /> {child.name}</button></li>)}</ul></> : <>
        <p>Las ventas guardadas se conservan. Se descarta esta edición.</p>
        {session.draft.active && session.draft.branch_id && <p className="price-delete-impact">En {branches.find(b => b.id === session.draft.branch_id)?.name || 'la sucursal asignada'}, las nuevas ventas usarán la lista principal.</p>}
      </>}
      {deleteError && <p className="error-banner" role="alert">{deleteError}</p>}
      <div className="price-list-form-actions"><button type="button" className="secondary-button" disabled={busy || deleting || !active} onClick={() => { restoreDeleteFocus.current = true; setDeleteOpen(false); }}>Cancelar</button>{!children.length && <button type="button" className="danger-button" disabled={busy || deleting || !active} onClick={() => void deleteList()}>{deleting ? 'Eliminando…' : 'Eliminar lista'}</button>}</div>
    </section>
    <div hidden={deleteOpen}><fieldset disabled={busy || saving || !active || deleteOpen}>
      <label>Nombre<input required maxLength={80} value={draft.name} onChange={e => update({ name: e.target.value })} placeholder="Base, Mayorista, Empleados…" /></label>
      {!draft.is_primary && <><div className="price-list-fields"><label>Desde<select value={source} onChange={e => update({ base_kind: e.target.value === 'cost' ? 'cost' : e.target.value === 'catalog' ? 'catalog' : 'list', parent_id: ['cost', 'catalog'].includes(e.target.value) ? null : e.target.value })}><option value="cost">Costo</option>{(!lists.some(l => l.is_primary) || source === 'catalog') && <option value="catalog">Catálogo</option>}{draft.base_kind === 'list' && !lists.some(l => l.id === source && !unavailableParents.has(l.id)) && <option value={source} disabled>Origen no disponible · elegí otro</option>}{lists.filter(l => !unavailableParents.has(l.id)).map(l => <option key={l.id} value={l.id}>{l.name}{l.active ? '' : ' (inactiva)'}</option>)}</select></label>
        <AdjustmentField label="Ajuste general" value={draft.adjustment} onChange={adjustment => update({ adjustment })} fieldRef={generalInput} />
      </div>
      <div className="price-rule-heading"><h4>Ajustes específicos{rules.length ? ` · ${rules.length}` : ''}</h4><button type="button" className="secondary-button" disabled={rules.length >= 300} onClick={() => {
        setRuleKeys(prev => [...prev, randomUUID()]); update({ pricing_rules: [...rules, { scope: 'category', target: '', adjustment: 0 }] });
      }}><Plus size={14} aria-hidden="true" /> Agregar ajuste</button></div>
      {!!rules.length && <div className="price-adjustment-order" aria-label="Orden de aplicación: general, categoría, marca y producto"><span>General</span><ArrowRight size={12} aria-hidden="true" /><span>Categoría</span><ArrowRight size={12} aria-hidden="true" /><span>Marca</span><ArrowRight size={12} aria-hidden="true" /><span>Producto</span></div>}
      {rules.map((rule, index) => <RuleFields key={ruleKeys[index]} rule={rule} index={index} products={products} categories={categories} onChange={r => setRule(index, r)} onRemove={() => {
        setRuleKeys(prev => prev.filter((_, i) => i !== index)); update({ pricing_rules: rules.filter((_, i) => i !== index) });
      }} />)}
      </>}
      {draft.is_primary && <p>El porcentaje se define en cada producto.</p>}
      <section className="price-draft-preview" aria-label="Vista previa sin guardar">
        <div className="price-preview-heading"><h4>Vista previa</h4><span className="price-origin-badge">Sin guardar</span></div>
        <input aria-label="Buscar producto para la vista previa" value={sampleQuery} onChange={e => setSampleQuery(e.target.value)} placeholder="Buscar producto…" />
        <ul>{sample.map(p => <li key={p.id}><span>{p.name}{overrides.some(o => o.list_id === draft.id && o.product_id === p.id) && <small className="price-fixed-badge">Fijo</small>}</span><strong>{p.pricingError || money(p.price)}</strong></li>)}</ul>
        {!sample.length && <small>No hay productos para mostrar.</small>}
      </section>
      {!draft.is_primary && <details className="price-list-options" open={optionsOpen} onToggle={e => setOptionsOpen(e.currentTarget.open)}>
        <summary>Más opciones <small>{draft.branch_id ? branches.find(b => b.id === draft.branch_id)?.name || 'Sucursal asignada' : 'Todas las sucursales'} · {draft.active ? 'Activa' : 'Inactiva'}</small></summary>
        <fieldset disabled={!optionsOpen}>
          <label>Sucursal<select ref={branchInput} value={draft.branch_id || ''} onChange={e => update({ branch_id: e.target.value || null })}><option value="">Todas las sucursales</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
          <div className="permission-form"><label className="permission-switch"><span className="permission-switch-label">Disponible para vender</span><span className="permission-switch-control"><input type="checkbox" role="switch" checked={draft.active} onChange={e => update({ active: e.target.checked })} /><span className="permission-switch-track" aria-hidden="true" /></span></label></div>
        </fieldset>
      </details>}
      {error && <p className="error-banner" role="alert">{error}</p>}
      {unavailableParents.size > 1 && <small className="price-save-impact">También actualiza {unavailableParents.size - 1} listas derivadas.</small>}
      <div className="price-list-form-actions"><button className="primary-button">{saving ? 'Guardando…' : 'Guardar lista'}</button><button type="button" className="secondary-button" onClick={onCancel}>Cancelar</button></div>
    </fieldset></div>
  </form>;
}

function RuleFields({ rule, index, products, categories, onChange, onRemove }: { rule: PriceRule; index: number; products: Product[]; categories: Category[]; onChange: (rule: PriceRule) => void; onRemove: () => void }) {
  const [query, setQuery] = useState('');
  const categoryOptions = categories.length ? categories.map(c => ({ id: c.id, name: c.name })) : [...new Map(products.map(p => [p.categoryId, { id: p.categoryId, name: p.category }])).values()];
  const options = rule.scope === 'category' ? categoryOptions : rule.scope === 'brand' ? [...new Map(products.filter(p => p.brand?.trim()).map(p => [p.brand!.trim().toLowerCase(), { id: p.brand!.trim().toLowerCase(), name: p.brand!.trim() }])).values()] : products.map(p => ({ id: p.id, name: `${p.name} · ${p.code}` }));
  const filtered = options.filter(o => o.name.toLowerCase().includes(query.toLowerCase())).slice(0, 100);
  const current = options.find(o => o.id === rule.target);
  if (current && !filtered.some(o => o.id === current.id)) filtered.unshift(current);
  return <div className="price-rule" role="group" aria-label={`Ajuste específico ${index + 1}`}><label>Aplicar a<select value={rule.scope} onChange={e => { onChange({ ...rule, scope: e.target.value as PriceRule['scope'], target: '' }); setQuery(''); }}><option value="category">Categoría</option><option value="brand">Marca</option><option value="product">Producto</option></select></label>
    <div className="price-rule-target">{options.length > 100 && <input aria-label={`Buscar destino del ajuste ${index + 1}`} value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar…" />}<label>Destino<select required value={rule.target} onChange={e => onChange({ ...rule, target: e.target.value })}><option value="">Elegí {rule.scope === 'category' ? 'una categoría' : rule.scope === 'brand' ? 'una marca' : 'un producto'}</option>{!!rule.target && !current && <option value={rule.target}>Destino guardado no disponible</option>}{filtered.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label></div>
    <AdjustmentField label="Ajuste" value={rule.adjustment} onChange={adjustment => onChange({ ...rule, adjustment })} />
    <button type="button" className="text-button" onClick={onRemove} aria-label={`Quitar ajuste ${index + 1}`}><X size={16} aria-hidden="true" /></button>
  </div>;
}

function AdjustmentField({ label, value, onChange, fieldRef }: { label: string; value: number; onChange: (value: number) => void; fieldRef?: Ref<HTMLInputElement> }) {
  const [direction, setDirection] = useState(value < 0 ? -1 : 1);
  useEffect(() => { if (value < 0) setDirection(-1); else if (value > 0) setDirection(1); }, [value]);
  return <fieldset className="price-adjustment"><legend>{label}</legend><div>
    <select aria-label={`${label}: aumentar o descontar`} value={direction} onChange={e => { const next = Number(e.target.value); setDirection(next); onChange(next * Math.abs(value)); }}><option value={1}>Aumentar</option><option value={-1}>Descontar</option></select>
    <NumberInput ref={fieldRef} aria-label={`${label} (%)`} required min="0" max={direction < 0 ? '99.99' : '10000'} step="0.01" value={Math.abs(value)} onValueChange={raw => onChange(raw === '' ? NaN : direction * Math.abs(Number(raw)))} /><span aria-hidden="true">%</span>
  </div></fieldset>;
}
