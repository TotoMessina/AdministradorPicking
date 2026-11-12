import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AlertCircle, UserRound } from 'lucide-react';
import type { PaymentMethod } from '../../types/kiosco';
import { useToast } from '../../context/ToastContext';
import { cents } from '../../features/retail/payments';
import { money, hasVisibleDialog, normalize, methods } from './posHelpers';
import type { posTabProps } from './usePosTab';

/** Estado de la venta: medio de pago, montos, cliente fiado y vista en el celular. */
export function usePosState(ctx: ReturnType<typeof posTabProps>) {
  const { active, cart, onOpenAi, controlledMobileView, onMobilePosViewChange, customers, canOverLimit } = ctx;
  const { notify } = useToast();
  const [query, setQuery] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("Efectivo");
  const [cash, setCash] = useState("");
  const [splitAmount, setSplitAmount] = useState('');
  const [splitFirst, setSplitFirst] = useState<Exclude<PaymentMethod, 'Mixto'>>('Efectivo');
  const [splitSecond, setSplitSecond] = useState<Exclude<PaymentMethod, 'Mixto'>>('QR');
  const [confirmedPayment, setConfirmedPayment] = useState("");
  const [busy, setBusy] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualAmount, setManualAmount] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [clearPending, setClearPending] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [internalMobileView, setInternalMobileView] = useState<"catalog" | "checkout">("catalog");
  const mobilePosView = controlledMobileView ?? internalMobileView;
  const setMobilePosView = (view: "catalog" | "checkout") => {
    setInternalMobileView(view);
    onMobilePosViewChange?.(view);
  };
  const [internalAiOpen, setInternalAiOpen] = useState(false);
  const handleOpenAi = onOpenAi || (() => setInternalAiOpen(true));
  const searchRef = useRef<HTMLInputElement>(null);
  const cartItemsRef = useRef<HTMLDivElement>(null);
  const shouldScrollToBottom = useRef(true);
  const prevCartLength = useRef(cart.length);
  const submitting = useRef(false);
  const activeRef = useRef(active);
  activeRef.current = active;
  const request = useRef({ signature: "", id: "" });
  const total = cents(cart.reduce((sum, i) => sum + i.subtotal, 0)) / 100;
  const count = cart.reduce((sum, i) => sum + i.qty, 0);
  const received = Number(cash);
  const paymentSignature = JSON.stringify([method, cart, splitAmount, splitFirst, splitSecond]);
  const splitValue = cents(Number(splitAmount)) / 100;
  const splitValid = Number.isFinite(splitValue) && splitValue > 0 && cents(splitValue) < cents(total) && splitFirst !== splitSecond;
  const confirmed = confirmedPayment === paymentSignature;
  const [creditCustomerId, setCreditCustomerId] = useState('');
  const [creditQuery, setCreditQuery] = useState('');
  const [creditOverOk, setCreditOverOk] = useState(false);
  const [customerModal, setCustomerModal] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const paymentMethods = customers ? [...methods, { id: 'Fiado' as const, label: 'Fiado', icon: UserRound }] : methods;
  const activeCustomers = (customers || []).filter(customer => customer.active).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const creditMatches = creditQuery.trim() ? activeCustomers.filter(customer => normalize(customer.name).includes(normalize(creditQuery))) : activeCustomers;
  const creditCustomer = activeCustomers.find(customer => customer.id === creditCustomerId);
  // Fiado completo o la parte fiada de un pago mixto («el resto»).
  const creditInMixed = method === 'Mixto' && splitSecond === 'Fiado';
  const creditPart = method === 'Fiado' ? total : creditInMixed ? Math.max(0, (cents(total) - cents(splitValue || 0)) / 100) : 0;
  const creditAfter = creditCustomer ? (cents(creditCustomer.balance) + cents(creditPart)) / 100 : 0;
  const creditOverLimit = !!creditCustomer && creditPart > 0 && creditCustomer.credit_limit !== null && creditAfter > creditCustomer.credit_limit;
  // El límite se controla también en el servidor; acá se avisa antes de cobrar.
  const creditReady = !!creditCustomer && (!creditOverLimit || (canOverLimit && creditOverOk));
  const balanceLabel = (balance: number) => balance > 0 ? `Debe ${money(balance)}` : balance < 0 ? `A favor ${money(-balance)}` : 'Al día';
  const creditDetails = <>
    {!creditCustomer ? <button type="button" className="secondary-button credit-customer-pick" onClick={() => setCustomerModal(true)}><UserRound size={16} aria-hidden="true" /> Elegir a quién le fiás</button>
      : <p className="credit-customer-summary">Fiás <strong>{money(creditPart)}</strong>{creditCustomer.balance < 0 ? ' (sale de su saldo a favor)' : ''}. Con esta venta {creditAfter < 0 ? <>le quedan <strong>{money(-creditAfter)} a favor</strong></> : creditAfter > 0 ? <>queda debiendo <strong>{money(creditAfter)}</strong></> : <strong>queda al día</strong>}.</p>}
    {creditOverLimit && creditCustomer && <div className="credit-customer-alert" role="alert">
      <AlertCircle size={16} aria-hidden="true" />
      <span>Supera el límite de {money(creditCustomer.credit_limit || 0)}.{canOverLimit ? '' : ' Pedile a administración que autorice o cobrá con otro medio.'}</span>
      {canOverLimit && <label className="credit-customer-override"><input type="checkbox" checked={creditOverOk} onChange={e => setCreditOverOk(e.target.checked)} /> Fiar igual</label>}
    </div>}
  </>;
  useEffect(() => {
    if (!paymentOpen) return;
    const frame = requestAnimationFrame(() => {
      const target = method === 'Efectivo' ? document.getElementById('cash-received') : method === 'Mixto' ? document.getElementById('mixed-amount') : null;
      (target || document.querySelector<HTMLElement>('.pos-payment-modal .payment-methods button[aria-pressed="true"]'))?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [paymentOpen, method]);
  useEffect(() => { if (!cart.length) setPaymentOpen(false); }, [cart.length]);
  const paymentReady = method === 'Fiado' ? creditReady : creditInMixed ? confirmed && creditReady : confirmed;

  useLayoutEffect(() => {
    const isNewItem = cart.length > prevCartLength.current;
    prevCartLength.current = cart.length;

    if ((shouldScrollToBottom.current || isNewItem) && cart.length > 0 && cartItemsRef.current) {
      cartItemsRef.current.scrollTop = cartItemsRef.current.scrollHeight;
      const raf = requestAnimationFrame(() => {
        if (cartItemsRef.current) {
          cartItemsRef.current.scrollTop = cartItemsRef.current.scrollHeight;
        }
      });
      shouldScrollToBottom.current = false;
      return () => cancelAnimationFrame(raf);
    }
  }, [cart]);

  useEffect(() => {
    if (!active) return;
    const focus = (e: KeyboardEvent) => {
      if (!hasVisibleDialog() && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focus);
    return () => window.removeEventListener("keydown", focus);
  }, [active]);
  return { notify, query, setQuery, method, setMethod, cash, setCash, splitAmount, setSplitAmount, splitFirst, setSplitFirst, splitSecond, setSplitSecond, confirmedPayment, setConfirmedPayment, busy, setBusy, manualModalOpen, setManualModalOpen, manualAmount, setManualAmount, manualDescription, setManualDescription, clearPending, setClearPending, checkoutError, setCheckoutError, internalMobileView, setInternalMobileView, mobilePosView, setMobilePosView, internalAiOpen, setInternalAiOpen, handleOpenAi, searchRef, cartItemsRef, shouldScrollToBottom, prevCartLength, submitting, activeRef, request, total, count, received, paymentSignature, splitValue, splitValid, confirmed, creditCustomerId, setCreditCustomerId, creditQuery, setCreditQuery, creditOverOk, setCreditOverOk, customerModal, setCustomerModal, paymentOpen, setPaymentOpen, paymentMethods, activeCustomers, creditMatches, creditCustomer, creditInMixed, creditPart, creditAfter, creditOverLimit, creditReady, balanceLabel, creditDetails, paymentReady };
}
