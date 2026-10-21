import { useEffect, useRef, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { errorMessage, retail } from './api';
import type { Run } from './Management';
import { movementDetails, voucherExtension, voucherMimeType } from './vouchers';
import { randomUUID } from '../../utils/uuid';

export function CashMovementForm({ store, shift, busy, run, onBusyChange }: {
  store: string; shift: string; busy: boolean; run: Run; onBusyChange: (busy: boolean) => void;
}) {
  const [type, setType] = useState('INGRESO');
  const [category, setCategory] = useState('general');
  const [supplier, setSupplier] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [previewUnavailable, setPreviewUnavailable] = useState(false);
  const [error, setError] = useState('');
  const [stage, setStage] = useState<'' | 'uploading' | 'saving'>('');
  const fileInput = useRef<HTMLInputElement>(null);
  const request = useRef({ signature: '', id: '' });
  const uploaded = useRef<{ file: File; url: string } | null>(null);
  const saving = useRef(false);
  const supplierPayment = type === 'RETIRO' && category === 'supplier_payment';

  useEffect(() => {
    setPreviewUnavailable(false);
    if (!file || !voucherMimeType(file).startsWith('image/')) { setPreview(''); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const clearVoucher = () => {
    setFile(null);
    uploaded.current = null;
    if (fileInput.current) fileInput.current.value = '';
  };

  return <form className="retail-form" onSubmit={async event => {
    event.preventDefault();
    if (saving.current || busy) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const amount = Number(fields.get('amount'));
    const reason = String(fields.get('reason') || '').trim();
    if (supplierPayment && !file) { setError('Adjuntá el comprobante para pagos a proveedores'); return; }
    if (!Number.isFinite(amount) || amount <= 0 || !reason) { setError('Completá el importe y el motivo del movimiento.'); return; }
    if (supplierPayment && !supplier.trim()) { setError('Ingresá el nombre del proveedor.'); return; }
    saving.current = true;
    onBusyChange(true);
    setError('');
    setStage(supplierPayment && uploaded.current?.file !== file ? 'uploading' : 'saving');
    try {
      let writeError: unknown;
      const saved = await run(async () => {
        try {
          let voucherUrl: string | null = null;
          if (supplierPayment && file) {
            voucherExtension(file);
            if (uploaded.current?.file === file) voucherUrl = uploaded.current.url;
            else {
              voucherUrl = await retail.uploadVoucher(store, shift, file);
              uploaded.current = { file, url: voucherUrl };
            }
          }
          const details = movementDetails(type, type === 'RETIRO' ? category : 'general', voucherUrl, supplier);
          const signature = JSON.stringify([shift, type, amount, reason, details]);
          if (request.current.signature !== signature) request.current = { signature, id: randomUUID() };
          setStage('saving');
          await retail.addMovement(shift, type, amount, reason, request.current.id, details.category, details.voucherUrl, details.supplierName);
        }
        catch (err) { writeError = err; throw err; }
      }, 'Movimiento registrado');
      if (saved) {
        form.reset();
        setType('INGRESO'); setCategory('general'); setSupplier(''); clearVoucher();
        request.current = { signature: '', id: '' };
      } else setError(writeError ? errorMessage(writeError) : 'No se pudo guardar el movimiento. Reintentá cuando termine la operación en curso.');
    } catch (err) { setError(errorMessage(err)); }
    finally { saving.current = false; setStage(''); onBusyChange(false); }
  }}>
    <fieldset disabled={busy || !!stage} className="cash-movement-fields">
      <label>Tipo
        <select name="type" value={type} onChange={event => { setType(event.target.value); setCategory('general'); setSupplier(''); clearVoucher(); setError(''); }}>
          <option value="INGRESO">Ingreso de efectivo</option><option value="RETIRO">Retiro de efectivo</option>
        </select>
      </label>
      <label>Importe ($)<input name="amount" type="number" min="0.01" max="999999999999.99" step="0.01" required /></label>
      <label>Motivo<input name="reason" required maxLength={300} placeholder="Ej. Pago a proveedor" /></label>
      {type === 'RETIRO' && <label>Categoría
        <select name="category" value={category} onChange={event => { setCategory(event.target.value); setSupplier(''); clearVoucher(); setError(''); }}>
          <option value="general">General</option><option value="supplier_payment">Pago a proveedor</option><option value="other">Otro</option>
        </select>
      </label>}
      {supplierPayment && <>
        <label>Nombre del proveedor<input name="supplier" value={supplier} onChange={event => setSupplier(event.target.value)} required maxLength={160} placeholder="Ej. Distribuidora del Centro" /></label>
        <label>Foto o PDF del comprobante
          <input ref={fileInput} type="file" accept="image/*,application/pdf" aria-required="true" onChange={event => {
            const selected = event.target.files?.[0] || null;
            uploaded.current = null;
            if (!selected) { setFile(null); return; }
            try { voucherExtension(selected); setFile(selected); setError(''); }
            catch (err) { event.target.value = ''; setFile(null); setError(errorMessage(err)); }
          }} />
          <small>Obligatorio para pagos a proveedores. Hasta 10 MB. El archivo guardado solo puede consultarlo la administración.</small>
        </label>
        {file && <div className="movement-voucher-preview">
          {preview && !previewUnavailable ? <img src={preview} alt="Vista previa del comprobante seleccionado" onError={() => setPreviewUnavailable(true)} /> : <FileText size={26} />}
          <span>{file.name}<small>{(file.size / 1024 / 1024).toLocaleString('es-AR', { maximumFractionDigits: 2 })} MB{previewUnavailable ? ' · Vista previa no disponible; el archivo se adjuntará igualmente.' : ''}</small></span>
          <button type="button" className="secondary-button" onClick={clearVoucher}>Quitar</button>
        </div>}
      </>}
    </fieldset>
    {error && <p className="movement-error" role="alert">{error}</p>}
    <button className="primary-button" disabled={busy || !!stage}>
      {stage && <Loader2 size={16} className="spin" />}
      {stage === 'uploading' ? 'Subiendo comprobante…' : stage === 'saving' ? 'Guardando movimiento…' : error ? 'Reintentar guardar movimiento' : 'Guardar movimiento'}
    </button>
  </form>;
}
