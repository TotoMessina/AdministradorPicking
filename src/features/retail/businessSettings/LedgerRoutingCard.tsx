import { Check, Receipt, Banknote, QrCode, CreditCard, ArrowRightLeft, SlidersHorizontal, Info, Coins } from 'lucide-react';
import { retail } from '../api';
import { ledgerPaymentMethods } from '../ledgerRouting';
import type { LedgerSettingsState } from './useLedgerSettings';

/** A qué registro va cada medio de pago. */
export function LedgerRoutingCard({ state }: { state: LedgerSettingsState }) {
  const { storeId, ledgers, run, busy } = state;
  return (
    <>
      {/* Tarjeta 2: Ruteo por medio de pago */}
      <div className="store-settings-card">
        <div className="store-settings-header">
          <div className="store-settings-header-icon">
            <SlidersHorizontal size={22} />
          </div>
          <div className="store-settings-header-text">
            <h3>Ruteo por medio de pago</h3>
            <p>Configurá a qué registro se imputa automáticamente cada cobro al realizar una venta.</p>
          </div>
        </div>

        <div className="location-card-body">
          <form
            className="routing-form"
            onSubmit={async (event) => {
              event.preventDefault();
              const fields = new FormData(event.currentTarget);
              const rules = Object.fromEntries(
                ledgerPaymentMethods
                  .map((method) => [method.id, String(fields.get(method.id) || '')])
                  .filter(([, value]) => value)
              );
              await run(
                () => retail.saveLedgerRouting(storeId, String(fields.get('default')), rules),
                'Reglas de ruteo guardadas correctamente'
              );
            }}
          >
            {/* Registro Principal */}
            <div className="routing-default-section">
              <label className="store-field-label" htmlFor="default-ledger-select">
                Registro principal predeterminado
              </label>
              <div className="routing-default-row">
                <select
                  id="default-ledger-select"
                  name="default"
                  required
                  defaultValue={ledgers.find((l) => l.is_default)?.id || ''}
                  disabled={busy}
                  className="store-select-field routing-default-select"
                >
                  <option value="" disabled>Elegí un registro principal</option>
                  {ledgers.filter((l) => l.active).map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="routing-helper-text">
                Si un medio de pago no tiene una regla específica definida abajo, se utilizará este registro.
              </p>
            </div>

            <hr className="account-divider" />

            {/* Lista de reglas por medio de pago */}
            <div className="routing-methods-list">
              <span className="store-field-label">Reglas individuales por medio de pago</span>
              {ledgerPaymentMethods.map((method) => {
                const currentTarget = ledgers.find(
                  (l) => l.active && l.payment_methods?.includes(method.id)
                )?.id || '';

                const methodIcon = {
                  Efectivo: <Banknote size={16} />,
                  QR: <QrCode size={16} />,
                  Transferencia: <ArrowRightLeft size={16} />,
                  Link: <ArrowRightLeft size={16} />,
                  Debito: <CreditCard size={16} />,
                  Credito: <CreditCard size={16} />,
                  Fiado: <CreditCard size={16} />,
                  Mixto: <Receipt size={16} />,
                }[method.id] || <Coins size={16} />;

                return (
                  <div key={method.id} className="routing-method-row">
                    <div className="routing-method-info">
                      <div className="routing-method-icon">
                        {methodIcon}
                      </div>
                      <strong className="routing-method-label">{method.label}</strong>
                    </div>
                    <div className="routing-method-target">
                      <select
                        name={method.id}
                        disabled={busy}
                        defaultValue={currentTarget}
                        className="store-select-field routing-method-select"
                        aria-label={`Registro para ${method.label}`}
                      >
                        <option value="">Usar registro principal</option>
                        {ledgers.filter((l) => l.active).map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Aviso sobre Pago mixto */}
            <div className="ledger-info-box">
              <Info size={15} />
              <span>
                En <strong>Pago mixto</strong> se envía la venta completa al registro asignado, sin dividir el ticket. Siempre podés cambiar el registro manualmente al cobrar en <strong>Vender</strong>.
              </span>
            </div>

            <button className="primary-button routing-save-btn" disabled={busy}>
              <Check size={16} /> Guardar reglas de cobro
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
