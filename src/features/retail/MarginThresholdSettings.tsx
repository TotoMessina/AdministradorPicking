import { NumberInput } from '../../components/NumberInput';
import { useEffect, useRef, useState } from 'react';
import { retail, errorMessage, type Store } from './api';
import { lowMarginThreshold } from '../../services/productMarginService';
import type { Run } from './Management';
import './product-margin.css';

export function MarginThresholdSettings({ store, busy, run }: { store: Store; busy: boolean; run: Run }) {
  const current = lowMarginThreshold(store.low_margin_threshold);
  const [value, setValue] = useState(String(current));
  const [expected, setExpected] = useState(current);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const saving = useRef(false);
  useEffect(() => {
    if (!dirty) { setValue(String(current)); setExpected(current); }
  }, [current, dirty]);
  return <details className="margin-threshold-settings">
    <summary>Bajo margen · Menor al {current.toLocaleString('es-AR')}%</summary>
    <form className="retail-form" onSubmit={async event => {
      event.preventDefault();
      if (busy || saving.current || !value.trim() || !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 100) return;
      saving.current = true; setError('');
      try {
        const ok = await run(async () => {
          try { await retail.saveMarginThreshold(store.id, Number(value), expected); }
          catch (e) { setError(errorMessage(e)); throw e; }
        }, 'Límite guardado. Se actualizó la clasificación de los productos.');
        if (ok) { setExpected(Number(value)); setDirty(false); }
      } finally { saving.current = false; }
    }}>
      <label>Marcar como bajo margen si es menor a (%)<NumberInput type="number" required min="0" max="100" step="0.01" value={value} disabled={busy} onValueChange={event => { setValue(event); setDirty(true); }} /></label>
      <p>Margen = (precio − costo) ÷ precio × 100. Al guardar se reclasifican los productos actuales; no cambia precios ni importes/grupos ya guardados en ventas. Requiere conexión.</p>
      {error && <p role="alert">{error}</p>}
      <div className="button-row">
        <button className="primary-button" disabled={busy || !dirty || Number(value) === current}>Guardar límite</button>
        <button type="button" className="text-button" disabled={busy} onClick={() => { setDirty(false); setValue(String(current)); setExpected(current); setError(''); }}>Cancelar</button>
      </div>
    </form>
  </details>;
}
