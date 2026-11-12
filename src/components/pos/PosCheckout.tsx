import { NumberInput } from '../NumberInput';
import { createPortal } from 'react-dom';
import { X, ArrowRight, Check, AlertCircle, Wallet, UserRound } from 'lucide-react';
import { cents } from '../../features/retail/payments';
import { money, methods } from './posHelpers';
import type { PosTabState } from './usePosTab';

/** Total, medios de pago y cobro. */
export function PosCheckout({ state }: { state: PosTabState }) {
  const {
    cart, isLoading, saleLedgerLabel, customers, billingEnabled, method, setMethod, cash, setCash,
    splitAmount, setSplitAmount, splitFirst, setSplitFirst, splitSecond, setSplitSecond,
    setConfirmedPayment, busy, checkoutError, total, count, received, paymentSignature, splitValue,
    splitValid, confirmed, setCreditOverOk, setCustomerModal, paymentOpen, setPaymentOpen,
    paymentMethods, creditCustomer, creditInMixed, creditReady, balanceLabel, creditDetails,
    paymentReady, checkout,
  } = state;
  return (
    <>
      <section className="checkout" aria-label="Total y cobro">
        <div className="total-line">
          <span>
            Total a cobrar
            <small>
              {count} {count === 1 ? "unidad" : "unidades"}
            </small>
          </span>
          <strong>{money(total)}</strong>
        </div>
        <button
          type="button"
          className="primary-button checkout-button"
          disabled={busy || isLoading || !cart.length || total <= 0}
          onClick={() => setPaymentOpen(true)}
        >
          {busy ? "Registrando venta…" : <><Check size={19} /> Cobrar {money(total)} <ArrowRight size={18} /></>}
        </button>
        {cart.length > 0 && <p className="checkout-hint">Atajos: F1 efectivo · F2 QR · F3 transferencia · F4 mixto</p>}
        {checkoutError && !paymentOpen && <div role="alert" className="error-banner checkout-error"><AlertCircle size={18} /><span>{checkoutError}</span></div>}
        {paymentOpen && createPortal(<div className="pos-payment-backdrop" onClick={() => { if (!busy) setPaymentOpen(false); }}>
        <div role="dialog" aria-modal="true" aria-labelledby="pos-payment-title" data-pos-payment className="pos-payment-modal" onClick={e => e.stopPropagation()}>
        <div className="pos-payment-header">
          <div><h3 id="pos-payment-title">Cobrar</h3><small>{count} {count === 1 ? "unidad" : "unidades"}</small></div>
          <strong>{money(total)}</strong>
          <button type="button" className="icon-button" aria-label="Cerrar cobro" disabled={busy} onClick={() => setPaymentOpen(false)}><X size={18} /></button>
        </div>
        <fieldset disabled={busy || !cart.length}>
          <legend>¿Cómo te pagan?</legend>
          {customers && <div className="sale-customer">
            {creditCustomer ? <>
              <span className="sale-customer-name">Cliente: <strong>{creditCustomer.name}</strong></span>
              <span className={`sale-customer-balance ${creditCustomer.balance > 0 ? 'is-debt' : creditCustomer.balance < 0 ? 'is-credit' : ''}`}>{creditCustomer.balance < 0 ? `Tiene a favor ${money(-creditCustomer.balance)}` : balanceLabel(creditCustomer.balance)}</span>
              <button type="button" className="text-button" onClick={() => setCustomerModal(true)}>Cambiar</button>
            </> : <button type="button" className="text-button sale-customer-add" onClick={() => setCustomerModal(true)}><UserRound size={15} aria-hidden="true" /> {method === 'Fiado' || creditInMixed ? 'Elegir cliente' : 'Elegir cliente (opcional)'}</button>}
            {creditCustomer && method !== 'Fiado' && !creditInMixed && <small>{billingEnabled ? (creditCustomer.tax_id ? 'La factura sale a su nombre. ' : 'No tiene CUIT ni DNI cargado: la factura sale a consumidor final. ') : ''}Para usar su cuenta, elegí Fiado o Mixto con el resto fiado.</small>}
          </div>}
          <div className="payment-methods">
            {paymentMethods.map(({ id, label, icon: Icon }) => (
              <button
                type="button"
                key={id}
                aria-pressed={method === id}
                className={method === id ? "selected" : ""}
                onClick={() => { setMethod(id); if (id === 'Fiado' && !creditCustomer && customers) setCustomerModal(true); }}
              >
                <Icon size={19} />
                {label}
              </button>
            ))}
          </div>
          {method === 'Mixto' && <div className="mixed-payment">
            <label>Primer medio<select value={splitFirst} onChange={e => { const next = e.target.value as typeof splitFirst; if (next === splitSecond) setSplitSecond(splitFirst); setSplitFirst(next); }}>{methods.filter(m => m.id !== 'Mixto').map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
            <label>Importe del primer medio<NumberInput id="mixed-amount" type="number" min="0.01" step="0.01" value={splitAmount} onValueChange={e => setSplitAmount(e)} /></label>
            <label>Resto del pago<select value={splitSecond} onChange={e => { const next = e.target.value as typeof splitSecond; setSplitSecond(next); setCreditOverOk(false); if (next === 'Fiado' && !creditCustomer) setCustomerModal(true); }}>{[...methods, ...(customers ? [{ id: 'Fiado' as const, label: 'Fiado (a la cuenta del cliente)' }] : [])].filter(m => m.id !== 'Mixto' && m.id !== splitFirst).map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
            <strong>Restante: {money(Math.max(0, (cents(total) - cents(splitValue || 0)) / 100))}</strong>
            <small>Ingresá lo recibido por el primer medio. Enter o F4 confirma ambos pagos. El importe debe ser menor al total.{customers ? ' Para dejar el resto fiado, elegí Fiado en «Resto del pago».' : ''}</small>
            {creditInMixed && <div className="credit-customer">{creditDetails}</div>}
          </div>}
          {method === "Efectivo" ? (
            <>
              <label className="cash-label" htmlFor="cash-received">
                Recibís en efectivo
                <button
                  type="button"
                  className="text-button"
                  disabled={!total}
                  onClick={() => setCash(String(total))}
                >
                  Monto exacto
                </button>
              </label>
              <div className="cash-input">
                <span>$</span>
                <NumberInput
                  id="cash-received"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={cash}
                  onValueChange={(e) => setCash(e)}
                />
              </div>
              <div className="quick-bills">
                {[...new Set([500, 1000, 5000, 10000].map(step => Math.ceil((total + 0.01) / step) * step))].map((n) => (
                  <button
                    type="button"
                    key={n}
                    onClick={() => setCash(String(n))}
                  >
                    {money(n)}
                  </button>
                ))}
              </div>
              <div
                className={`change-line ${total > 0 && received >= total ? "ready" : ""}`}
                aria-live="polite"
              >
                <span>
                  {cash && received < total
                    ? "Falta recibir"
                    : "Vuelto a entregar"}
                </span>
                <strong>
                  {money(
                    cash && received < total
                      ? total - received
                      : Math.max(0, received - total),
                  )}
                </strong>
              </div>
            </>
          ) : method === 'Fiado' ? (
            <div className="credit-customer">{creditDetails}</div>
          ) : (
            <label className="payment-confirm">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) =>
                  setConfirmedPayment(
                    e.target.checked ? paymentSignature : "",
                  )
                }
              />
              <span>
                Confirmé el pago de {money(creditInMixed ? splitValue : total)} en{" "}
                {method === "QR"
                  ? "la billetera virtual"
                  : method === 'Transferencia' ? 'la cuenta bancaria' : method === 'Link' ? 'el link de pago' : method === 'Mixto' ? (creditInMixed ? 'el primer medio' : 'ambos medios') : "la terminal de tarjetas"}
                .<small>Esta web registra el pago; no lo procesa.</small>
              </span>
            </label>
          )}
        </fieldset>
        {checkoutError && <div role="alert" className="error-banner checkout-error"><AlertCircle size={18} /><span>{checkoutError}</span></div>}
        {saleLedgerLabel && (
          <div className="checkout-ledger-target">
            <Wallet size={13} className="checkout-ledger-icon" aria-hidden="true" />
            <span>
              Se guardará en: <strong>{saleLedgerLabel(method)}</strong>
            </span>
          </div>
        )}
        <button
          className="primary-button checkout-button"
          disabled={
            busy || isLoading ||
            !cart.length ||
            total <= 0 ||
            (method === "Efectivo"
              ? !Number.isFinite(received) || received < total
              : !paymentReady || (method === 'Mixto' && !splitValid))
          }
          onClick={() => void checkout()}
        >
          {busy ? (
            "Registrando venta…"
          ) : (
            <>
              <Check size={19} /> {method === 'Fiado' ? 'Confirmar fiado' : 'Confirmar cobro'} {money(total)}
              <ArrowRight size={18} />
            </>
          )}
        </button>
        {cart.length > 0 && (
          <p className="checkout-hint">
            {method === "Efectivo" && received < total
              ? "Ingresá cuánto recibiste para continuar"
              : (method === 'Fiado' || creditInMixed) && !creditReady
                ? creditCustomer ? 'Supera el límite: confirmá «Fiar igual» o cobrá con otro medio' : 'Elegí a quién le fiás'
              : method !== 'Efectivo' && !confirmed
                ? 'Confirmá el pago recibido para habilitar el cobro'
                : "Al cobrar, se genera el ticket de la venta"}
          </p>
        )}
        </div>
        </div>, document.body)}
      </section>
    </>
  );
}
