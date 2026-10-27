import { useEffect, useRef, useState, type CSSProperties, type Ref } from 'react';
import { ArrowRight, CircleHelp, GitBranch, LockKeyhole, Pencil, Plus, Trash2, X } from 'lucide-react';
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
  const matches = products.filter(p => p.sellable !== false && `${p.name} ${p.code}`.toLowerCase().includes(query.toLowerCase()));
  const visible = matches.slice(0, 50);
  const priced = selected === 'cost' ? visible.map(p => ({ ...p, price: Number(p.cost), pricingError: p.cost > 0 ? undefined : 'Costo sin cargar' })) : productsForList(visible, list, overrides, lists);
  const start = (source: string, existing?: PriceList, percentage = false) => {
    if (!existing && primary && ['cost', 'catalog'].includes(source)) source = primary.id;
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
    setSelected(id); setActive('');
    if (active) focusPreview.current = true;
    else if (!preview.current?.closest('[hidden]')) preview.current?.focus();
  };
  const seen = new Set<string>();
  const nodes = (source: string, depth = 0): { list: PriceList; depth: number }[] => {
    if (depth >= 12) return [];
    return lists.filter(l => origin(l) === source && !seen.has(l.id)).flatMap(l => { seen.add(l.id); return [{ list: l, depth }, ...nodes(l.id, depth + 1)]; });
  };
  const costNodes = nodes('cost'); const catalogNodes = nodes('catalog');
  const orphanNodes = lists.filter(l => !seen.has(l.id)).map(list => ({ list, depth: 0 }));
  const renderNodes = (items: typeof costNodes) => <ol className="price-flow-list">{items.map(({ list: l, depth }) => <li key={l.id} style={{ '--price-depth': Math.min(depth, 3) } as CSSProperties}>
    <article className={`price-flow-node${selected === l.id ? ' selected' : ''}`}>
      <div className="price-flow-main"><button type="button" className="price-flow-name" onClick={() => inspect(l.id)} aria-pressed={selected === l.id} aria-label={`Ver precios de ${l.name}`}>
        <strong>{l.name}</strong><span>{l.is_primary ? 'Costo + porcentaje de cada producto' : `Desde ${sourceName(origin(l), lists)}`}</span>
      </button>{l.is_primary ? <span className="price-origin-badge">Principal</span> : <button type="button" className="price-percent" disabled={busy} onClick={() => start(origin(l), l, true)} aria-label={`Editar porcentaje de ${l.name}: ${percent(l.adjustment)}`}><Pencil size={12} aria-hidden="true" /> {percent(l.adjustment)}</button>}</div>
      {(!!l.pricing_rules?.length || l.branch_id || !l.active) && <div className="price-flow-badges">
        {!!l.pricing_rules?.length && <span>{l.pricing_rules.length} ajustes</span>}
        {l.branch_id && <span>{branches.find(b => b.id === l.branch_id)?.name || 'Sucursal asignada'}</span>}
        {!l.active && <span>Inactiva</span>}
      </div>}
      <div className="price-flow-actions">
        <button type="button" className="text-button" disabled={busy} onClick={() => start(origin(l), l)} aria-label={`Editar ${l.name}`}><Pencil size={14} aria-hidden="true" /> {sessions.some(s => s.key === l.id) ? 'Continuar' : 'Editar'}</button>
        <button type="button" className="text-button" disabled={busy} onClick={() => start(l.id)} aria-label={`Crear lista desde ${l.name}`}><Plus size={14} aria-hidden="true" /> Lista</button>
      </div>
    </article>
  </li>)}</ol>;
  return <section className="retail-panel price-list-settings" aria-label="Listas de precios">
    <div className="price-lists-heading"><h3 ref={heading} tabIndex={-1}>Listas de precios</h3>
      <button type="button" className="primary-button" disabled={busy || !primary} onClick={() => start(primary!.id)}><Plus size={16} aria-hidden="true" /> Crear lista</button>
    </div>
    <div className={`price-lists-layout${active ? ' editing' : ''}`}>
      <div className="price-flow" aria-label="Orígenes y listas derivadas">
        <div className={`price-flow-root${selected === 'cost' ? ' selected' : ''}`}><button type="button" className="price-flow-name" aria-pressed={selected === 'cost'} onClick={() => inspect('cost')}><strong><GitBranch size={17} aria-hidden="true" /> Costo</strong></button><span className="price-origin-badge"><LockKeyhole size={12} aria-hidden="true" /> Solo consulta</span></div>
        {!!costNodes.length && renderNodes(costNodes)}
        {primary ? renderNodes(catalogNodes) : <details className="price-catalog-origin" open={!costNodes.length && catalogNodes.length ? true : undefined}><summary>Catálogo{catalogNodes.length ? ` · ${catalogNodes.length} listas` : ''}</summary>
          <div className="price-flow-root"><button type="button" className="price-flow-name" aria-pressed={selected === 'catalog'} onClick={() => inspect('catalog')}><strong>Precios del catálogo</strong></button><button type="button" className="text-button" disabled={busy} onClick={() => start('catalog')} aria-label="Crear lista desde el catálogo"><Plus size={14} aria-hidden="true" /> Lista</button></div>
          {renderNodes(catalogNodes)}
        </details>}
        {!primary && <p role="status">Instalá la actualización de lista principal para crear nuevas listas.</p>}
        {!!orphanNodes.length && <div><p role="status">Estas listas necesitan revisar su origen.</p>{renderNodes(orphanNodes)}</div>}
      </div>
      <div hidden={!active} className="price-list-workspace">{sessions.map(s => <div key={s.key} hidden={active !== s.key}>
        <PriceListEditor session={s} active={active === s.key} percentageFocus={percentageTarget.key === s.key ? percentageTarget.request : 0} lists={lists} overrides={overrides} products={products} categories={categories} branches={branches} run={run} busy={busy} onCancel={() => close(s.key)} onSaved={() => { setSelected(s.draft.id); close(s.key); }} onDeleted={() => { setSelected(prev => prev === s.draft.id ? 'cost' : prev); close(s.key); }} onEditDerived={l => start(origin(l), l)} />
      </div>)}</div>
    <section className="price-list-preview" aria-label="Consulta de precios" hidden={!!active}>
      <div className="price-preview-heading"><h3 ref={preview} tabIndex={-1}>{sourceName(selected, lists)}</h3>{list && !list.is_primary && <button type="button" className="price-percent" disabled={busy} onClick={() => start(origin(list), list, true)} aria-label={`Editar porcentaje de ${list.name}: ${percent(list.adjustment)}`}><Pencil size={12} aria-hidden="true" /> {percent(list.adjustment)}</button>}</div>
      <label className="price-preview-search">Buscar producto<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Nombre o código" /></label>
      <SettingsEditorGroup><div className="table-scroll"><table><thead><tr><th>Producto</th><th>Costo</th>{selected !== 'cost' && <th>Precio</th>}{list && !list.is_primary && <th>Precio fijo</th>}</tr></thead><tbody>{priced.map(p => {
        const fixed = overrides.find(o => o.list_id === selected && o.product_id === p.id);
        return <tr key={p.id}><th scope="row">{p.name}<small>{p.code}</small></th><td>{p.cost > 0 ? money(p.cost) : 'Sin cargar'}</td>{selected !== 'cost' && <td>{p.pricingError || money(p.price)}</td>}{list && !list.is_primary && <td><div role="group" aria-label={`Precio fijo de ${p.name}`}><SettingsEditor key={selected + p.id} busy={busy} label={fixed ? 'Editar' : 'Fijar'} summary={fixed ? money(Number(fixed.price)) : undefined}>{closeFixed => <form className="inline-form" onSubmit={async e => {
          e.preventDefault(); const value = String(new FormData(e.currentTarget).get('price'));
          if (await run(() => retail.savePriceOverride(storeId, list.id, p.id, value === '' ? null : Number(value)), value === '' ? 'Se aplican las reglas de la lista' : 'Precio fijo guardado')) closeFixed();
        }}><label>Precio fijo ($)<NumberInput name="price" min="0.01" max="999999999999.99" step="0.01" defaultValue={fixed?.price} placeholder="Usar reglas" /></label><button className="secondary-button" disabled={busy}>Guardar</button></form>}</SettingsEditor></div></td>}</tr>;
      })}</tbody></table></div></SettingsEditorGroup>
      {!matches.length && <p className="price-flow-empty">No hay productos para mostrar.</p>}
      <small className="price-list-count">{priced.length} de {matches.length} productos</small>
    </section>
    </div>
    <details className="price-list-guide"><summary><CircleHelp size={14} aria-hidden="true" /> Cómo se calcula</summary>
      <p>Los ajustes se aplican en cadena: general → categoría → marca → producto. $100 +50% −10% = $135, redondeando a centavos en cada paso.</p>
      <p>Un precio fijo reemplaza los ajustes de esa lista. Dejalo vacío para volver al cálculo. Las derivadas parten del resultado de su origen.</p>
      <p>Costo es solo consulta. La principal usa el costo y porcentaje del producto; los precios manuales anteriores se conservan. Las demás listas heredan su precio. Una lista activa de sucursal tiene prioridad allí; en otro caso se usa la principal. No se modifican tickets ni carritos iniciados.</p>
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
      {!draft.is_primary && <><div className="price-list-fields"><label>Desde<select value={source} onChange={e => update({ base_kind: e.target.value === 'cost' ? 'cost' : e.target.value === 'catalog' ? 'catalog' : 'list', parent_id: ['cost', 'catalog'].includes(e.target.value) ? null : e.target.value })}>{!lists.some(l => l.is_primary) && <><option value="cost">Costo</option><option value="catalog">Catálogo</option></>}{draft.base_kind === 'list' && !lists.some(l => l.id === source && !unavailableParents.has(l.id)) && <option value={source} disabled>Origen no disponible · elegí otro</option>}{lists.filter(l => !unavailableParents.has(l.id)).map(l => <option key={l.id} value={l.id}>{l.name}{l.active ? '' : ' (inactiva)'}</option>)}</select></label>
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
