import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { randomUUID } from '../../../utils/uuid';
import { retail, errorMessage, type Branch, type Category, type PriceList, type PriceOverride, type PriceRule, type Product } from '../api';
import type { Run } from '../Management';
import { productsForList } from '../pricing';
import { type Session, money, origin, descendants } from './priceListHelpers';
import { RuleFields, AdjustmentField } from './PriceRuleFields';

/** Editor de una lista: base, ajuste y reglas. */
export function PriceListEditor({ session, active, percentageFocus, lists, overrides, products, categories, branches, run, busy, onCancel, onSaved, onDeleted, onEditDerived }: {
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
    }, session.existing ? 'Lista actualizada; las listas que salen de ella también se actualizaron' : 'Lista creada')) onSaved(); }
    finally { pending.current = false; setSaving(false); }
  }}>
    <div className="price-editor-heading"><h3 ref={title} tabIndex={-1}>{session.existing ? `Editar ${session.draft.name}` : 'Nueva lista'}</h3>{session.existing && !draft.is_primary && <button ref={deleteButton} type="button" className="text-button danger-text" disabled={busy || saving || deleting || !active || deleteOpen} onClick={() => { setDeleteError(''); setDeleteOpen(true); }}><Trash2 size={14} aria-hidden="true" /> Eliminar</button>}</div>
    <section className="price-list-delete-confirm" hidden={!deleteOpen} aria-label={`Eliminar ${session.draft.name}`}>
      <h4 ref={deleteTitle} tabIndex={-1}>¿Eliminar «{session.draft.name}»?</h4>
      {children.length ? <><p>Estas listas salen de la que querés borrar. Primero hacé que salgan de otra:</p><ul>{children.map(child => <li key={child.id}><button type="button" className="text-button" disabled={busy || deleting || !active} onClick={() => onEditDerived(child)}><Pencil size={13} aria-hidden="true" /> {child.name}</button></li>)}</ul></> : <>
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
      {unavailableParents.size > 1 && <small className="price-save-impact">También actualiza {unavailableParents.size - 1} listas que salen de esta.</small>}
      <div className="price-list-form-actions"><button className="primary-button">{saving ? 'Guardando…' : 'Guardar lista'}</button><button type="button" className="secondary-button" onClick={onCancel}>Cancelar</button></div>
    </fieldset></div>
  </form>;
}
