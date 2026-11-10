import { NumberInput } from '../../components/NumberInput';
import { useEffect, useRef, useState } from 'react';
import { askConfirm } from '../../components/ConfirmHost';
import { useToast } from '../../context/ToastContext';
import { priceRoundingSteps, priceFromMarkup, roundingLabel } from '../../services/productSalePrice';
import { retail, errorMessage, type Store } from './api';
import type { Run } from './Management';
import './product-margin.css';

/** Ganancia por defecto y redondeo de los precios por costo del comercio. */
export function PriceRoundingSettings({ store, busy, run }: { store: Store; busy: boolean; run: Run }) {
  const { notify } = useToast();
  const currentStep = store.price_rounding ?? 0;
  const currentMarkup = store.default_markup ?? 30;
  const [step, setStep] = useState(currentStep);
  const [markup, setMarkup] = useState(String(currentMarkup));
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const saving = useRef(false);
  useEffect(() => { if (!dirty) { setStep(currentStep); setMarkup(String(currentMarkup)); } }, [currentStep, currentMarkup, dirty]);
  if (store.price_rounding === undefined) return null;
  const markupValue = Number(markup);
  const valid = markup.trim() !== '' && Number.isFinite(markupValue) && markupValue >= 0 && markupValue <= 10000;
  let example = '';
  try { if (valid) example = `Costo $87 + ${markupValue.toLocaleString('es-AR')}% = $${priceFromMarkup(87, markupValue, step).toLocaleString('es-AR')}`; } catch { example = ''; }
  return <details className="margin-threshold-settings">
    <summary>Precio por costo · {currentMarkup.toLocaleString('es-AR')}% · {roundingLabel(currentStep).toLowerCase()}</summary>
    <form className="retail-form" onSubmit={async event => {
      event.preventDefault();
      if (busy || saving.current || !valid) return;
      if (step !== currentStep && !await askConfirm(`¿Cambiar el redondeo a «${roundingLabel(step).toLowerCase()}»? Se recalculan los precios por costo que usan el redondeo del comercio. Los precios manuales y los productos con redondeo propio no cambian. Las ventas ya hechas no cambian.`)) return;
      saving.current = true; setError('');
      let repriced = 0;
      try {
        const ok = await run(async () => {
          try { repriced = await retail.setStorePricing(store.id, step, markupValue); }
          catch (e) { setError(errorMessage(e)); throw e; }
        });
        if (ok) { setDirty(false); notify('success', step !== currentStep ? `Guardado. Se recalcularon ${repriced.toLocaleString('es-AR')} precios.` : 'Guardado.'); }
      } finally { saving.current = false; }
    }}>
      <label>Ganancia por defecto sobre costo (%)<NumberInput type="number" required min="0" max="10000" step="0.01" value={markup} disabled={busy}
        onValueChange={value => { setMarkup(value); setDirty(true); }} /></label>
      <small>Se precarga en productos nuevos, combos y altas desde el catálogo global. Cada producto puede tener otra.</small>
      <label>Redondeo de precios<select value={step} disabled={busy} onChange={event => { setStep(Number(event.target.value)); setDirty(true); }}>
        {priceRoundingSteps.map(option => <option key={option} value={option}>{roundingLabel(option)}{option > 0 ? ', hacia arriba' : ''}</option>)}
      </select></label>
      {example && <p role="status">{example}</p>}
      <p>Solo se redondean los precios calculados por costo. Un producto puede elegir otro redondeo en su ficha. Requiere conexión.</p>
      {error && <p role="alert">{error}</p>}
      <div className="button-row">
        <button className="primary-button" disabled={busy || !dirty || (step === currentStep && markupValue === currentMarkup)}>Guardar</button>
        <button type="button" className="text-button" disabled={busy} onClick={() => { setDirty(false); setStep(currentStep); setMarkup(String(currentMarkup)); setError(''); }}>Cancelar</button>
      </div>
    </form>
  </details>;
}
