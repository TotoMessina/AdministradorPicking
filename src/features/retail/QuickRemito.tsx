import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Loader2, Send, Sparkles } from 'lucide-react';
import { errorMessage, retail, type Branch, type Product, type PendingReplenishmentItem } from './api';
import { remitoExtension, validRemitoQuantity } from './remitos';
import { RemitoItems } from './RemitoItems';
import { processQuickRemito } from '../../services/quickRemitoService';
import type { Run } from './Management';

export function QuickRemito({ store, branches, branchId, products, run, busy }: {
  store: string; branches: Branch[]; branchId: string; products: Product[]; run: Run; busy: boolean;
}) {
  const [branch, setBranch] = useState(branchId || branches[0]?.id || '');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [previewError, setPreviewError] = useState(false);
  const [text, setText] = useState('');
  const [items, setItems] = useState<PendingReplenishmentItem[]>([]);
  const [notes, setNotes] = useState('');
  const [stage, setStage] = useState<'' | 'processing' | 'sending'>('');
  const [review, setReview] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const working = useRef(false);
  const upload = useRef<{ file: File; url: string } | null>(null);
  const disabled = busy || !!stage;
  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file);
    setPreview(url); setPreviewError(false);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    if (!file && !done && !branches.some(candidate => candidate.id === branch)) setBranch(branches.some(candidate => candidate.id === branchId) ? branchId : branches[0]?.id || '');
  }, [branchId, branches, branch, file, done]);
  const reset = () => {
    setFile(null); setItems([]); setText(''); setNotes(''); setReview(false); setDone(false); setError(''); upload.current = null;
    if (input.current) input.current.value = '';
  };
  const process = async () => {
    if (!file || working.current || busy) return;
    working.current = true; setStage('processing'); setError('');
    try {
      const result = await processQuickRemito(store, file, products, setProgress, setText);
      setText(result.text); setItems(result.items); setReview(true);
    } catch (err) {
      setError(`${errorMessage(err)} Podés tomar otra foto o enviarla para revisión manual.`);
    } finally { working.current = false; setStage(''); }
  };
  const send = async () => {
    if (!file || working.current || busy) return;
    if (items.some(item => !validRemitoQuantity(item.quantity))) { setError('Revisá las cantidades: deben ser enteros positivos de hasta 1.000.000 de unidades.'); return; }
    if (branches.length && !branches.some(candidate => candidate.id === branch)) { setError('Elegí la sucursal del remito.'); return; }
    working.current = true; setStage('sending'); setError('');
    let failure: unknown;
    try {
      const saved = await run(async () => {
        try {
          if (navigator.onLine === false) throw new Error('Necesitás conexión para enviar el remito. La foto y el borrador siguen en esta pantalla.');
          setProgress('Subiendo foto del remito…');
          if (upload.current?.file !== file) upload.current = { file, url: await retail.uploadRemito(store, file) };
          setProgress('Enviando para aprobación…');
          await retail.submitPendingReplenishment(store, branch || null, upload.current.url, text, items, notes);
        } catch (err) { failure = err; throw err; }
      }, 'Remito enviado para aprobación');
      if (saved) { setDone(true); heading.current?.focus(); }
      else setError(failure ? errorMessage(failure) : 'No se pudo enviar. Reintentá cuando termine la operación actual.');
    } catch (err) { setError(errorMessage(err)); }
    finally { working.current = false; setStage(''); }
  };
  return <section className="retail-panel quick-remito" aria-labelledby="quick-remito-title">
    <h2 id="quick-remito-title" ref={heading} tabIndex={-1}>{done ? 'Remito enviado' : 'Cargar remito'}</h2>
    {done ? <div className="remito-sent" role="status"><CheckCircle2 size={42} /><p>✅ Remito enviado. El encargado lo revisará y aprobará el ingreso al stock.</p><span className="remito-status">Pendiente de validación</span><button type="button" className="primary-button" onClick={reset}>Fotografiar otro remito</button></div> : <>
      <p>Fotografiá, revisá las cantidades y enviá. El stock se modifica cuando el encargado aprueba el remito.</p>
      <label>Sucursal<select value={branch} disabled={disabled || branches.length === 1} onChange={event => setBranch(event.target.value)}>
        {!branches.length && <option value="">Sin sucursal</option>}{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
      </select></label>
      <input ref={input} type="file" accept="image/*" capture="environment" tabIndex={-1} className="remito-camera-input" aria-label="Foto del remito" disabled={disabled} onChange={event => {
        const selected = event.target.files?.[0]; if (!selected) return;
        try { remitoExtension(selected); setFile(selected); setItems([]); setText(''); setReview(false); setError(''); upload.current = null; }
        catch (err) { event.target.value = ''; setError(errorMessage(err)); }
      }} />
      <button type="button" className="primary-button remito-camera-button" disabled={disabled} onClick={() => input.current?.click()}><Camera size={28} /> {file ? 'Tomar otra foto' : '📷 Fotografiar remito'}</button>
      {file && <>
        <div className="quick-remito-preview">{preview && !previewError ? <img src={preview} alt="Foto del remito seleccionado" onError={() => setPreviewError(true)} /> : <p>La vista previa no está disponible. Podés adjuntar la foto igualmente.</p>}<small>{file.name} · Hasta 10 MB</small></div>
        {!review && <div className="remito-quick-actions"><button type="button" className="primary-button" disabled={disabled} onClick={() => void process()}><Sparkles size={18} /> Procesar con IA</button><button type="button" className="secondary-button" disabled={disabled} onClick={() => { setReview(true); setItems([]); setError(''); }}>Enviar solo foto para revisión manual</button></div>}
      </>}
      {stage && <p className="remito-progress" role="status"><Loader2 size={18} className="spin" /> {progress}</p>}
      {review && <>
        <h3>Artículos detectados</h3><p>Las cantidades son unidades individuales. El encargado confirmará la vinculación con el catálogo.</p>
        <RemitoItems items={items} products={products} onChange={setItems} disabled={disabled} />
        <label>Notas (opcional)<textarea maxLength={2000} rows={3} placeholder="Ej. Faltó una caja o hay productos dañados" value={notes} disabled={disabled} onChange={event => setNotes(event.target.value)} /></label>
        <button type="button" className="primary-button" disabled={disabled} onClick={() => void send()}><Send size={18} /> {stage === 'sending' ? 'Enviando…' : 'Enviar para aprobación'}</button>
      </>}
      {error && <p className="remito-error" role="alert">{error}</p>}
      <small>La foto guardada solo puede consultarla la administración. Conservá esta pantalla abierta si todavía no enviaste el borrador.</small>
    </>}
  </section>;
}
