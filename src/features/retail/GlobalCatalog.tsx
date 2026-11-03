import { useCallback, useEffect, useRef, useState } from 'react';
import { BadgeCheck, Download, Loader2, Pencil, Plus, RefreshCw, Trash2, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { askConfirm } from '../../components/ConfirmHost';
import { errorMessage } from './api';
import type { Run } from './Management';
import { applyCatalogImport, catalogFields as fields, downloadCatalog, isVerified, previewCatalogFile, type CatalogRow, type ImportPreview } from './globalCatalogExcel';
import './global-catalog.css';

interface Draft { ean_code: string; name: string; brand: string; category_suggestion: string; emoji: string; description: string; verified: boolean }

const pageSize = 50;
const sources: Record<string, string> = { verified: 'Verificado', community: 'Comunitario', ai: 'Sugerido por IA' };
const missingMigration = (message: string) => /retail_admin_import_catalog/.test(message) ? 'Falta aplicar la actualización 202611030005 en Supabase.'
  : /retail_admin_save_catalog|retail_admin_delete_catalog|schema cache/.test(message) ? 'Falta aplicar la actualización 202611030004 en Supabase.' : message;
const count = (value: number) => value.toLocaleString('es-AR');
const fieldNames: Record<string, string> = { name: 'Nombre', brand: 'Marca', category: 'Categoría', emoji: 'Emoji', description: 'Descripción', verified: 'Verificado' };

/**
 * Catálogo global compartido por todos los comercios. Solo para administradores de plataforma:
 * la base vuelve a validar el permiso en cada cambio.
 */
export function GlobalCatalog({ run, busy, active }: { run: Run; busy: boolean; active: boolean }) {
  const [filter, setFilter] = useState<'pending' | 'verified' | 'all'>('pending');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editing, setEditing] = useState(false);
  const [formError, setFormError] = useState('');
  const editorTitle = useRef<HTMLHeadingElement>(null);
  const editorTrigger = useRef<HTMLButtonElement | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadButton = useRef<HTMLButtonElement>(null);
  const importTitle = useRef<HTMLHeadingElement>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [excelWork, setExcelWork] = useState('');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async (offset = 0) => {
    setLoading(true);
    try {
      let request = supabase.from('retail_global_catalog').select(fields);
      if (/^\d{4,20}$/.test(search)) request = request.eq('ean_code', search);
      else if (search) request = request.ilike('name', `%${search.replace(/[\\%_]/g, '\\$&')}%`);
      if (filter === 'pending') request = request.neq('source', 'verified').lt('confidence_score', 0.9);
      if (filter === 'verified') request = request.or('source.eq.verified,confidence_score.gte.0.9');
      const { data, error: queryError } = await request.order('contributor_count', { ascending: false }).order('name')
        .range(offset, offset + pageSize);
      if (queryError) throw queryError;
      const page = (data || []) as CatalogRow[];
      setRows(previous => offset ? [...previous, ...page.slice(0, pageSize)] : page.slice(0, pageSize));
      setHasMore(page.length > pageSize); setError('');
    } catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, [filter, search]);
  useEffect(() => { if (active) void load(); }, [active, load]);

  const open = (trigger: HTMLButtonElement, row?: CatalogRow) => {
    editorTrigger.current = trigger;
    setEditing(Boolean(row)); setFormError('');
    setDraft(row ? { ean_code: row.ean_code, name: row.name, brand: row.brand || '', category_suggestion: row.category_suggestion || '', emoji: row.emoji || '📦', description: row.description || '', verified: isVerified(row) }
      : { ean_code: /^\d{4,20}$/.test(search) ? search : '', name: '', brand: '', category_suggestion: '', emoji: '📦', description: '', verified: true });
    requestAnimationFrame(() => editorTitle.current?.focus());
  };
  const close = () => {
    setDraft(null);
    requestAnimationFrame(() => { if (editorTrigger.current?.isConnected) editorTrigger.current.focus(); });
  };
  const save = async () => {
    if (!draft) return;
    const code = draft.ean_code.trim();
    if (code.length < 4 || code.length > 20) { setFormError('El código debe tener entre 4 y 20 caracteres.'); document.getElementById('catalog-code')?.focus(); return; }
    if (!draft.name.trim()) { setFormError('Escribí el nombre del producto.'); document.getElementById('catalog-name')?.focus(); return; }
    setFormError('');
    const ok = await run(async () => {
      const { error: rpcError } = await supabase.rpc('retail_admin_save_catalog', { p_code: code, p_name: draft.name.trim(), p_brand: draft.brand.trim() || null,
        p_category: draft.category_suggestion.trim() || null, p_emoji: draft.emoji.trim() || null, p_description: draft.description.trim() || null, p_verified: draft.verified });
      if (rpcError) throw new Error(missingMigration(errorMessage(rpcError)));
    }, editing ? 'Producto actualizado en el catálogo global' : 'Producto agregado al catálogo global');
    if (ok) { close(); await load(); }
  };
  const remove = async (row: CatalogRow) => {
    if (!await askConfirm(`¿Eliminar ${row.name} (${row.ean_code}) del catálogo global? Los productos que los comercios ya cargaron no cambian.`)) return;
    const ok = await run(async () => {
      const { error: rpcError } = await supabase.rpc('retail_admin_delete_catalog', { p_code: row.ean_code });
      if (rpcError) throw new Error(missingMigration(errorMessage(rpcError)));
    }, 'Producto eliminado del catálogo global');
    if (ok) { if (draft?.ean_code === row.ean_code) close(); await load(); }
  };
  const download = async () => {
    setExcelWork('Armando el Excel…'); setNotice('');
    await run(async () => { try { await downloadCatalog(); } finally { setExcelWork(''); } }, 'Excel descargado');
  };
  const readFile = async (file: File | undefined) => {
    if (fileInput.current) fileInput.current.value = '';
    if (!file) return;
    setExcelWork('Leyendo la planilla…'); setNotice('');
    try { setPreview(await previewCatalogFile(file)); setError(''); requestAnimationFrame(() => importTitle.current?.focus()); }
    catch (e) { setError(errorMessage(e)); }
    finally { setExcelWork(''); }
  };
  const closeImport = () => {
    setPreview(null); setProgress(null);
    requestAnimationFrame(() => uploadButton.current?.focus());
  };
  const pending = preview?.changes.filter(change => change.status !== 'unchanged') ?? [];
  const applyImport = async () => {
    if (!pending.length) return;
    const rowsToSend = pending.map(change => change.row);
    setProgress({ done: 0, total: rowsToSend.length });
    let summary = '';
    const ok = await run(async () => {
      try {
        const result = await applyCatalogImport(rowsToSend, done => setProgress({ done, total: rowsToSend.length }));
        summary = `Se guardaron ${count(result.inserted)} nuevos y ${count(result.updated)} actualizados.`;
      } catch (e) {
        const applied = (e as { applied?: number }).applied ?? 0;
        throw new Error(`${missingMigration(errorMessage(e))}${applied ? ` Se guardaron las primeras ${count(applied)} filas; volvé a subir el archivo para seguir: lo ya guardado no se duplica.` : ''}`);
      }
    }, 'Planilla guardada en el catálogo global');
    setProgress(null);
    if (ok) { setPreview(null); setNotice(summary); requestAnimationFrame(() => uploadButton.current?.focus()); }
    await load();
  };
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft(previous => previous && { ...previous, [key]: value });

  return <section className="retail-panel global-catalog" aria-labelledby="global-catalog-title">
    <div className="section-heading"><div><h2 id="global-catalog-title">Catálogo global</h2>
      <p>Datos por código de barras que comparten todos los comercios. Los verificados no pueden cambiarlos los comercios.</p></div>
      <div className="global-catalog-actions">
        <button type="button" className="secondary-button" disabled={loading || !active} onClick={() => void load()}><RefreshCw size={15} /> Actualizar</button>
        <button type="button" className="secondary-button" disabled={busy || Boolean(excelWork)} onClick={() => void download()}><Download size={15} /> Descargar Excel</button>
        <button type="button" ref={uploadButton} className="secondary-button" disabled={busy || Boolean(excelWork) || Boolean(draft) || Boolean(preview)} onClick={() => fileInput.current?.click()}><Upload size={15} /> Subir Excel</button>
        <input ref={fileInput} type="file" hidden tabIndex={-1} accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={event => void readFile(event.target.files?.[0])} />
        <button type="button" className="primary-button" disabled={busy || Boolean(draft) || Boolean(preview)} onClick={event => open(event.currentTarget)}><Plus size={15} /> Agregar producto</button>
      </div>
    </div>

    {excelWork && <p role="status"><Loader2 size={15} className="spin" /> {excelWork}</p>}
    {notice && <p role="status" className="global-catalog-notice">{notice}</p>}
    {preview && <section className="global-catalog-editor global-catalog-import" aria-labelledby="global-catalog-import-title">
      <h3 id="global-catalog-import-title" ref={importTitle} tabIndex={-1}>Revisar «{preview.fileName}»</h3>
      <p className="global-catalog-hint">Todavía no se guardó nada. Se actualizan: {preview.columns.filter(field => field !== 'code').map(field => fieldNames[field]).join(', ')}. Lo que no está en la planilla no cambia.</p>
      <ul className="global-catalog-summary">
        <li><strong>{count(preview.changes.filter(change => change.status === 'new').length)}</strong> nuevos</li>
        <li><strong>{count(preview.changes.filter(change => change.status === 'changed').length)}</strong> con cambios</li>
        <li><strong>{count(preview.changes.filter(change => change.status === 'unchanged').length)}</strong> sin cambios</li>
        {preview.errors.length > 0 && <li className="has-errors"><strong>{count(preview.errors.length)}</strong> con error</li>}
      </ul>
      {preview.errors.length > 0 && <div role="alert" className="global-catalog-errors">
        <p>Estas filas no se van a guardar. Corregilas en el Excel y volvé a subirlo, o seguí sin ellas.</p>
        <ul>{preview.errors.slice(0, 30).map(item => <li key={item.row}>Fila {item.row}: {item.message}</li>)}</ul>
        {preview.errors.length > 30 && <small>Y {count(preview.errors.length - 30)} filas más con error.</small>}
      </div>}
      {preview.changes.some(change => change.status === 'changed') && <details className="global-catalog-changes"><summary>Ver qué cambia</summary>
        <ul>{preview.changes.filter(change => change.status === 'changed').slice(0, 50).map(change => <li key={change.row.code}>Fila {change.row.row} · {change.row.code}{change.row.name ? ` · ${change.row.name}` : ''}: {change.fields.join(', ')}</li>)}</ul>
      </details>}
      {progress && <p role="status"><Loader2 size={15} className="spin" /> Guardando {count(progress.done)} de {count(progress.total)}…</p>}
      <div className="global-catalog-form-actions">
        <button type="button" className="secondary-button" disabled={Boolean(progress)} onClick={closeImport}>Cancelar</button>
        <button type="button" className="primary-button" disabled={busy || Boolean(progress) || !pending.length} onClick={() => void applyImport()}>
          {pending.length ? `Guardar ${count(pending.length)} ${pending.length === 1 ? 'producto' : 'productos'}` : 'No hay cambios para guardar'}</button>
      </div>
    </section>}

    {draft && <form className="global-catalog-editor" aria-labelledby="global-catalog-editor-title" noValidate onSubmit={event => { event.preventDefault(); void save(); }}>
      <h3 id="global-catalog-editor-title" ref={editorTitle} tabIndex={-1}>{editing ? `Editar ${draft.ean_code}` : 'Agregar producto al catálogo global'}</h3>
      <div className="global-catalog-fields">
        <label>Código de barras<input id="catalog-code" value={draft.ean_code} readOnly={editing} inputMode="numeric" maxLength={20} autoComplete="off"
          aria-invalid={formError.startsWith('El código') || undefined} onChange={event => set('ean_code', event.target.value)} /></label>
        <label className="global-catalog-wide">Nombre<input id="catalog-name" value={draft.name} maxLength={160} autoComplete="off"
          aria-invalid={formError.startsWith('Escribí') || undefined} onChange={event => set('name', event.target.value)} /></label>
        <label>Marca<input value={draft.brand} maxLength={80} autoComplete="off" onChange={event => set('brand', event.target.value)} /></label>
        <label>Categoría sugerida<input value={draft.category_suggestion} maxLength={80} autoComplete="off" onChange={event => set('category_suggestion', event.target.value)} /></label>
        <label className="global-catalog-emoji">Emoji<input value={draft.emoji} maxLength={8} autoComplete="off" onChange={event => set('emoji', event.target.value)} /></label>
        <label className="global-catalog-wide">Descripción<textarea value={draft.description} rows={2} maxLength={500} onChange={event => set('description', event.target.value)} /></label>
      </div>
      <label className="global-catalog-check"><input type="checkbox" checked={draft.verified} onChange={event => set('verified', event.target.checked)} />
        <span><strong>Verificado</strong><small>Los comercios ya no pueden cambiar estos datos. Sin marcar, vuelve a ser comunitario.</small></span></label>
      {formError && <p role="alert" className="error-banner">{formError}</p>}
      <div className="global-catalog-form-actions">
        {editing && <button type="button" className="danger-button" disabled={busy} onClick={() => { const row = rows.find(item => item.ean_code === draft.ean_code); if (row) void remove(row); }}><Trash2 size={15} /> Eliminar</button>}
        <button type="button" className="secondary-button" disabled={busy} onClick={close}>Cancelar</button>
        <button type="submit" className="primary-button" disabled={busy}>Guardar</button>
      </div>
    </form>}

    <form className="global-catalog-filters" onSubmit={event => { event.preventDefault(); setSearch(query.trim()); }}>
      <label>Mostrar<select value={filter} onChange={event => setFilter(event.target.value as typeof filter)}>
        <option value="pending">Sin verificar</option><option value="verified">Verificados</option><option value="all">Todos</option>
      </select></label>
      <label className="global-catalog-search">Buscar<span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Código de barras o nombre" />
        <button className="secondary-button" disabled={loading}>Buscar</button></span></label>
    </form>

    {error && <p role="alert" className="error-banner">{error}</p>}
    {!loading && !rows.length && !error && <p className="global-catalog-empty">No hay productos con estos filtros.</p>}
    <ul className="global-catalog-list">{rows.map(row => <li key={row.ean_code}>
      <span className="global-catalog-emoji-cell" aria-hidden="true">{row.emoji || '📦'}</span>
      <div className="global-catalog-info">
        <strong>{row.name}</strong>
        <small>{row.ean_code}{row.brand ? ` · ${row.brand}` : ''}{row.category_suggestion ? ` · ${row.category_suggestion}` : ''}</small>
        <small>
          <span className={`global-catalog-source${isVerified(row) ? ' is-verified' : ''}`}>{isVerified(row) && <BadgeCheck size={12} aria-hidden="true" />}{isVerified(row) ? 'Verificado' : sources[row.source] || row.source}</span>
          {' '}{row.contributor_count} {row.contributor_count === 1 ? 'aporte' : 'aportes'} · confianza {Math.round(Number(row.confidence_score) * 100)}%
        </small>
      </div>
      <button type="button" className="secondary-button" disabled={busy || Boolean(draft) || Boolean(preview)} aria-label={`Editar ${row.name}`} onClick={event => open(event.currentTarget, row)}><Pencil size={15} /> Editar</button>
    </li>)}</ul>
    {loading && <p role="status"><Loader2 size={15} className="spin" /> Cargando…</p>}
    {hasMore && !loading && <button type="button" className="secondary-button" onClick={() => void load(rows.length)}>Ver más</button>}
  </section>;
}
