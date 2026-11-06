import { NumberInput } from '../../components/NumberInput';
import { useEffect, useRef, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { errorMessage, retail } from './api';
import type { Run } from './Management';
import { movementDetails, voucherExtension, voucherMimeType } from './vouchers';
import { randomUUID } from '../../utils/uuid';
import { locationTransfers, type MoneyAccount } from './locationTransferApi';

export function CashMovementForm({ store, shift, busy, run, onBusyChange, allowIncome = true, allowWithdrawal = true, active = true, canUseAccounts = false }: {
  store: string; shift: string; busy: boolean; run: Run; onBusyChange: (busy: boolean) => void;
  allowIncome?: boolean; allowWithdrawal?: boolean;
  /** Con «Ver y mover la plata», el retiro puede salir de una cuenta de banco o billetera en vez del efectivo de la caja. */
  canUseAccounts?: boolean;
  active?: boolean;
}) {
  const [requestedType, setType] = useState('INGRESO');
  const type = requestedType === 'INGRESO' ? (allowIncome ? 'INGRESO' : 'RETIRO') : (allowWithdrawal ? 'RETIRO' : 'INGRESO');
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
  const [accounts, setAccounts] = useState<MoneyAccount[]>([]);
  const [source, setSource] = useState('cash');
  const fromAccount = type === 'RETIRO' && source !== 'cash' ? accounts.find(account => account.id === source) : undefined;
  const supplierPayment = type === 'RETIRO' && category === 'supplier_payment';
  useEffect(() => {
    if (!canUseAccounts || !active) return;
    let current = true;
    // Sin conexión o sin la actualización de cuentas, el retiro sigue siendo de efectivo.
    void locationTransfers.accounts(store).then(rows => { if (current) setAccounts(rows ?? []); }).catch(() => { if (current) setAccounts([]); });
    return () => { current = false; };
  }, [canUseAccounts, active, store]);

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

  const changeType = (next: string) => {
    if (next === type) { setType(next); return; }
    setType(next); setCategory('general'); setSupplier(''); setSource('cash'); clearVoucher(); setError('');
  };
  return <form className="retail-form" onSubmit={async event => {
    event.preventDefault();
    if (!active || saving.current || busy) return;
    if ((!allowIncome && !allowWithdrawal) || (type === 'INGRESO' && !allowIncome) || (type === 'RETIRO' && !allowWithdrawal)) { setError('Tu perfil no permite este movimiento. Pedile a administración que revise tus permisos.'); return; }
    const form = event.currentTarget;
    const fields = new FormData(form);
    const amount = Number(fields.get('amount'));
    const reason = String(fields.get('reason') || '').trim();
    if (supplierPayment && !file && !fromAccount) { setError('Adjuntá el comprobante para pagos a proveedores'); return; }
    if (fromAccount && amount > fromAccount.balance) { setError(`${fromAccount.name} tiene ${fromAccount.balance.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}. Elegí otro origen o un importe menor.`); return; }
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
          if (fromAccount) {
            // Sale de la cuenta, no de la caja: el efectivo esperado del turno no cambia y queda en Plata y en Conciliación.
            const note = [supplierPayment ? `Pago a ${supplier.trim()}` : category === 'other' ? 'Otro retiro' : 'Retiro', reason].join(' · ');
            const signature = JSON.stringify(['account', fromAccount.id, amount, note]);
            if (request.current.signature !== signature) request.current = { signature, id: randomUUID() };
            setStage('saving');
            await locationTransfers.moveFunds(store, fromAccount.id, null, amount, note, request.current.id);
            return;
          }
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
      }, fromAccount ? `Retiro registrado desde ${fromAccount.name}` : 'Movimiento registrado');
      if (saved) {
        form.reset();
        setType('INGRESO'); setCategory('general'); setSupplier(''); setSource('cash'); clearVoucher();
        if (fromAccount) void locationTransfers.accounts(store).then(rows => setAccounts(rows ?? [])).catch(() => {});
        request.current = { signature: '', id: '' };
      } else setError(writeError ? errorMessage(writeError) : 'No se pudo guardar el movimiento. Reintentá cuando termine la operación en curso.');
    } catch (err) { setError(errorMessage(err)); }
    finally { saving.current = false; setStage(''); onBusyChange(false); }
  }}>
    <fieldset disabled={!active || busy || !!stage || (!allowIncome && !allowWithdrawal)} className="cash-movement-fields">
      <div className="cash-movement-kind" role="group" aria-label="Tipo de movimiento">
        {allowIncome && <button type="button" aria-pressed={type === 'INGRESO'} onClick={() => changeType('INGRESO')}>Ingreso</button>}
        {allowWithdrawal && <button type="button" aria-pressed={type === 'RETIRO'} onClick={() => changeType('RETIRO')}>Retiro</button>}
      </div>
      <label>Importe ($)<NumberInput name="amount" type="number" min="0.01" max="999999999999.99" step="0.01" required /></label>
      <label>Motivo<input name="reason" required maxLength={300} placeholder="Ej. Pago a proveedor" /></label>
      {type === 'RETIRO' && accounts.length > 0 && <label>Sale de
        <select value={source} onChange={event => { setSource(event.target.value); setError(''); }}>
          <option value="cash">Efectivo de esta caja</option>
          {accounts.map(account => <option key={account.id} value={account.id}>{account.name} · saldo {account.balance.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</option>)}
        </select>
        <small>{fromAccount ? 'Sale de la cuenta: no cambia el efectivo de la caja. Queda en Plata y en Conciliación.' : 'Sale del efectivo de la caja: al cerrarla, se espera esa plata de menos.'}</small>
      </label>}
      {type === 'RETIRO' && <label>Categoría
        <select name="category" value={category} onChange={event => { setCategory(event.target.value); setSupplier(''); clearVoucher(); setError(''); }}>
          <option value="general">General</option><option value="supplier_payment">Pago a proveedor</option><option value="other">Otro</option>
        </select>
      </label>}
      {supplierPayment && fromAccount && <label>Nombre del proveedor<input name="supplier" value={supplier} onChange={event => setSupplier(event.target.value)} required maxLength={160} placeholder="Ej. Distribuidora del Centro" />
        <small>Desde una cuenta no se adjunta el comprobante: anotá el número de operación en el motivo.</small></label>}
      {supplierPayment && !fromAccount && <>
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
    <button className="primary-button" disabled={!active || busy || !!stage || (!allowIncome && !allowWithdrawal)}>
      {stage && <Loader2 size={16} className="spin" />}
      {stage === 'uploading' ? 'Subiendo comprobante…' : stage === 'saving' ? 'Guardando movimiento…' : error ? 'Reintentar guardar movimiento' : 'Guardar movimiento'}
    </button>
  </form>;
}
