import { errorMessage, retail } from './api';
import { formatCuit } from './billing';
import { useBillingSettings, type BillingSettingsProps } from './billingSettings/useBillingSettings';
import { BillingSettingsHeader } from './billingSettings/BillingSettingsHeader';
import { BillingChecklist } from './billingSettings/BillingChecklist';
import { BillingGuide } from './billingSettings/BillingGuide';
import { BillingFiscalStats } from './billingSettings/BillingFiscalStats';
import { BillingCredentials } from './billingSettings/BillingCredentials';
import { BillingFormFields } from './billingSettings/BillingFormFields';
import { BillingFormFooter } from './billingSettings/BillingFormFooter';

/** Facturación electrónica: datos fiscales, certificados de ARCA y guía de habilitación. */
export function BillingSettings(props: BillingSettingsProps) {
  const state = useBillingSettings(props);
  const {
    store, busy, run, active, razonSocial, condicionIva, iibb, inicioActividades, billingEnabled,
    setIsDirty, setError, saving, cuitDigits, isCuitValid, expectedDigit, ptoVtaNum, canEnable,
  } = state;
  return (
    <div className="store-settings-card billing-settings-card">
      <BillingSettingsHeader state={state} />

      <div className="location-card-body">
        <BillingChecklist state={state} />

        <BillingGuide state={state} />

        <BillingFiscalStats state={state} />

        <BillingCredentials state={state} />

        {/* Formulario Principal de Datos Fiscales */}
        <form
          className="retail-form permission-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy || saving.current || !active) return;

            if (billingEnabled && !canEnable) {
              setError('Para activar la facturación electrónica es obligatorio ingresar CUIT válido, Razón Social, Condición IVA y Punto de Venta.');
              return;
            }

            if (cuitDigits.length > 0 && !isCuitValid) {
              if (cuitDigits.length < 11) {
                setError(`El CUIT debe tener 11 dígitos numéricos (ingresaste ${cuitDigits.length}).`);
              } else if (expectedDigit !== null) {
                setError(`El dígito verificador es incorrecto: para ${formatCuit(cuitDigits.slice(0, 10))} el último número debe ser ${expectedDigit}.`);
              } else {
                setError('El CUIT ingresado no es válido según el algoritmo oficial de ARCA.');
              }
              return;
            }

            saving.current = true;
            setError('');

            try {
              const success = await run(
                async () => {
                  try {
                    await retail.saveBillingSettings(store.id, {
                      cuit: cuitDigits || '',
                      razon_social: razonSocial.trim(),
                      condicion_iva: condicionIva,
                      punto_venta_afip: ptoVtaNum || 1,
                      iibb: iibb.trim() || null,
                      inicio_actividades: inicioActividades || null,
                      billing_enabled: billingEnabled,
                    });
                  } catch (err) {
                    setError(errorMessage(err));
                    throw err;
                  }
                },
                billingEnabled
                  ? 'Configuración fiscal guardada. Facturación electrónica activada.'
                  : 'Datos fiscales guardados.',
              );

              if (success) {
                setIsDirty(false);
              }
            } finally {
              saving.current = false;
            }
          }}
        >
          <BillingFormFields state={state} />

          <BillingFormFooter state={state} />
        </form>
      </div>
    </div>
  );
}
