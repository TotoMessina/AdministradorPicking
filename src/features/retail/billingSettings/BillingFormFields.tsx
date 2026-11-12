import { Check, X } from 'lucide-react';
import { CONDICION_IVA_OPTIONS, formatCuit, type CondicionIva } from '../billing';
import type { BillingSettingsState } from './useBillingSettings';

/** Campos de los datos fiscales. */
export function BillingFormFields({ state }: { state: BillingSettingsState }) {
  const {
    busy, cuit, setCuit, razonSocial, setRazonSocial, condicionIva, setCondicionIva, puntoVenta,
    setPuntoVenta, iibb, setIibb, inicioActividades, setInicioActividades, setIsDirty, setError,
    cuitDigits, isCuitValid, isCuitTouched, expectedDigit,
  } = state;
  return (
    <>
      <div className="billing-form-grid">
        <div className="billing-field">
          <label htmlFor="billing-cuit">
            CUIT del titular / comercio
            {isCuitTouched && (
              <small
                style={{
                  color: isCuitValid
                    ? '#16a34a'
                    : cuitDigits.length < 11
                    ? 'var(--tone-muted)'
                    : '#dc2626',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>
                  {isCuitValid
                    ? 'CUIT válido'
                    : cuitDigits.length < 11
                    ? `${cuitDigits.length}/11 dígitos`
                    : 'Dígito verificador incorrecto'}
                </span>
                {!isCuitValid && cuitDigits.length === 11 && expectedDigit !== null && (
                  <button
                    type="button"
                    className="text-button"
                    style={{
                      padding: 0,
                      fontSize: '12px',
                      textDecoration: 'underline',
                      color: 'var(--tone-accent, #2563eb)',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      const corrected = formatCuit(cuitDigits.slice(0, 10) + expectedDigit);
                      setCuit(corrected);
                      setIsDirty(true);
                      setError('');
                    }}
                    title={`Corregir último dígito a ${expectedDigit}`}
                  >
                    (Corregir a {expectedDigit})
                  </button>
                )}
              </small>
            )}
          </label>
          <div className="billing-cuit-input-wrap">
            <input
              id="billing-cuit"
              type="text"
              inputMode="numeric"
              placeholder="20-12345678-6"
              maxLength={13}
              value={cuit}
              disabled={busy}
              onChange={(e) => {
                const formatted = formatCuit(e.target.value);
                setCuit(formatted);
                setIsDirty(true);
              }}
            />
            {isCuitTouched && (
              <span
                className={`billing-cuit-status ${
                  isCuitValid ? 'billing-cuit-valid' : 'billing-cuit-invalid'
                }`}
              >
                {isCuitValid ? <Check size={16} /> : <X size={16} />}
              </span>
            )}
          </div>
        </div>

        <div className="billing-field">
          <label htmlFor="billing-razon-social">
            Razón Social / Titular
            <small>(Según constancia de inscripción AFIP)</small>
          </label>
          <input
            id="billing-razon-social"
            type="text"
            placeholder="Ej: Kiosco Central S.R.L. o Pérez Juan"
            value={razonSocial}
            disabled={busy}
            maxLength={100}
            onChange={(e) => {
              setRazonSocial(e.target.value);
              setIsDirty(true);
            }}
          />
        </div>

        <div className="billing-field">
          <label htmlFor="billing-condicion-iva">
            Condición frente al IVA
            <small>Define si emite Factura B o Factura C</small>
          </label>
          <select
            id="billing-condicion-iva"
            value={condicionIva}
            disabled={busy}
            onChange={(e) => {
              setCondicionIva(e.target.value as CondicionIva);
              setIsDirty(true);
            }}
          >
            {CONDICION_IVA_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="billing-field">
          <label htmlFor="billing-pto-vta">
            Punto de venta fiscal en ARCA
            <small>(Debe ser de tipo "Web Services", no "Comprobantes en Línea")</small>
          </label>
          <input
            id="billing-pto-vta"
            type="number"
            min={1}
            max={99998}
            placeholder="1"
            value={puntoVenta}
            disabled={busy}
            onChange={(e) => {
              setPuntoVenta(e.target.value);
              setIsDirty(true);
            }}
          />
        </div>

        <div className="billing-field">
          <label htmlFor="billing-iibb">
            Ingresos Brutos (IIBB)
            <small>(Opcional, según tu jurisdicción)</small>
          </label>
          <input
            id="billing-iibb"
            type="text"
            placeholder="Ej: 901-123456-7 o Convenio Multilateral"
            value={iibb}
            disabled={busy}
            maxLength={30}
            onChange={(e) => {
              setIibb(e.target.value);
              setIsDirty(true);
            }}
          />
        </div>

        <div className="billing-field">
          <label htmlFor="billing-inicio-actividades">
            Inicio de actividades
            <small>(Opcional)</small>
          </label>
          <input
            id="billing-inicio-actividades"
            type="date"
            value={inicioActividades}
            disabled={busy}
            onChange={(e) => {
              setInicioActividades(e.target.value);
              setIsDirty(true);
            }}
          />
        </div>
      </div>
    </>
  );
}
