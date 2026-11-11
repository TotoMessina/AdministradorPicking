import { askConfirm } from '../../../components/ConfirmHost';
import { useEffect, useRef } from 'react';
import type { KioscoSale } from '../../../types/kiosco';
import { retail, errorMessage } from '../api';
import type { Run } from '../Management';
import { authorizeSaleInvoice, holdSaleBilling, processPendingSales } from '../../../services/billingService';
import { hasComposition } from '../../../services/productComposition';
import { readPushIntent } from '../push';
import { reportTechnicalFailure } from '../../../lib/errorReporting';
import type { WorkspaceProps } from './useWorkspace';
import type { useWorkspaceState } from './useWorkspaceState';
import type { useWorkspaceAccess } from './useWorkspaceAccess';
import type { useWorkspaceData } from './useWorkspaceData';

/** Acciones: ejecutar con aviso, cobrar, facturar pendientes y abrir avisos push. */
export function useWorkspaceSale(ctx: WorkspaceProps & ReturnType<typeof useWorkspaceState> & ReturnType<typeof useWorkspaceAccess> & ReturnType<typeof useWorkspaceData>) {
  const {
    store, onStores, notify, pushEntry, tab, setTab, setCashView, setCatalogView, setSettingsView,
    guiding, products, ledgers, sales, setSales, setLastSale, allStoreSales, setAllStoreSales, cart,
    setTicket, setIsAiOpen, busy, setBusy, setError, checkoutRequest, running, shift, manager, can,
    loadCustomers, pendingRemitos, branchPricing, priceListId, ledgerForPayment, canOperate, refresh,
    refreshLedger,
  } = ctx;
  const run: Run = async (action, message) => {
    if (running.current) return false;
    running.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
      if (message) notify("success", message);
      try {
        await Promise.all([refresh(), onStores()]);
        await refreshLedger();
      } catch (err) {
        setError(
          "El cambio se guardó, pero no se pudo actualizar la pantalla. " +
            errorMessage(err),
        );
      }
      return true;
    } catch (err) {
      reportTechnicalFailure(err, tab);
      setError(errorMessage(err));
      notify("error", errorMessage(err));
      return false;
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  const confirmLeave = async () => !cart.length || askConfirm("¿Descartar la venta sin cobrar y continuar?");
  const showTicket = (sale: KioscoSale) =>
    setTicket({
      ...sale,
      storeName: store.name,
      storeAddress: store.address,
      storePhone: store.phone,
      receiptMessage: store.receipt_message,
    });
  const handleSaleLedgerChange = (saved: KioscoSale) => {
    const update = (sale: KioscoSale) => sale.id === saved.id ? { ...sale, ledgerId: saved.ledgerId, ledgerName: saved.ledgerName } : sale;
    setLastSale(previous => previous ? update(previous) : previous);
    setSales(previous => previous.map(update));
    setAllStoreSales(previous => previous.map(update));
    setTicket(previous => previous ? update(previous) : previous);
  };
  const completeSale = async (sale: KioscoSale) => {
    if (!can('sell')) throw new Error('Tu perfil no permite vender. Pedile a administración que revise tus permisos.');
    if (branchPricing.loading || branchPricing.error) throw new Error(branchPricing.error || 'Esperá a que se apliquen los precios de la sucursal.');
    const destination = ledgerForPayment(sale.paymentMethod);
    if (!destination || !ledgers.some(l => l.id === destination.id && l.active)) throw new Error('El registro asignado ya no está activo. Pedile al administrador que lo reactive o revisá el registro antes de volver a cargar la venta.');
    if (!shift || !canOperate || running.current)
      throw new Error("Abrí la caja antes de vender.");
    running.current = true;
    setBusy(true);
    try {
      const signature = JSON.stringify([
        shift.id,
        sale.items,
        sale.paymentMethod,
        sale.customerId,
        sale.amountPaid,
        sale.payments,
        priceListId,
        destination.id,
      ]);
      if (checkoutRequest.current.signature !== signature)
        checkoutRequest.current = { signature, id: sale.id };
      const request = { ...sale, priceListId: priceListId || null, ledgerId: destination.id, id: checkoutRequest.current.id };
      // El fiado va directo al servidor: necesita el saldo y el límite del cliente en ese momento.
      const onCredit = !!sale.payments?.some(part => part.method === 'Fiado');
      const saved = onCredit ? await retail.checkoutOnCredit(shift.id, request) : await retail.checkout(store.id, shift.id, request);
      if (onCredit) void loadCustomers();
      checkoutRequest.current = { signature: "", id: "" };
      setLastSale(saved);
      if (store.billing_enabled) {
        // Factura a nombre de un cliente en una venta que no es fiada: se fija antes de pedir el CAE.
        if (!onCredit && sale.invoiceCustomerId) holdSaleBilling(saved.id);
        const receptor = !onCredit && sale.invoiceCustomerId
          ? retail.setSaleReceptor(store.id, saved.id, sale.invoiceCustomerId).catch(err => setError('La factura sale a consumidor final: ' + errorMessage(err)))
          : Promise.resolve();
        void receptor.then(() => authorizeSaleInvoice(store, saved)).then(authResult => {
          if (authResult) {
            const updateWithAuth = (s: KioscoSale) => s.id === saved.id ? { ...s, ...authResult } : s;
            setLastSale(prev => prev ? updateWithAuth(prev) : prev);
            setSales(prev => prev.map(updateWithAuth));
            setAllStoreSales(prev => prev.map(updateWithAuth));
            setTicket(prev => prev ? updateWithAuth(prev) : prev);
          }
        });
      }
      void Promise.all([refresh(), refreshLedger()]).catch(err => {
        setError(
          "La venta se guardó. Actualizá los datos antes de seguir: " +
            errorMessage(err),
        );
      });
    } catch (err) {
      reportTechnicalFailure(err, 'cobro');
      throw new Error(errorMessage(err));
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  const refreshAll = () => { branchPricing.reload(); void run(async () => { await pendingRemitos.refresh(); }, "Datos actualizados"); };
  const pendingBillingProcessing = useRef(false);
  useEffect(() => {
    if (!store?.billing_enabled || pendingBillingProcessing.current) return;
    const candidates = sales.length > 0 ? sales : allStoreSales;
    const pendingSales = candidates.filter(
      (s) => (s.billingStatus === 'pending' || s.billingStatus === 'retry') && s.syncStatus !== 'pending',
    );
    if (pendingSales.length === 0) return;

    pendingBillingProcessing.current = true;
    void processPendingSales(store, pendingSales, (saleId, authResult) => {
      const updateWithAuth = (s: KioscoSale) => (s.id === saleId ? { ...s, ...authResult } : s);
      setLastSale((prev) => (prev ? updateWithAuth(prev) : prev));
      setSales((prev) => prev.map(updateWithAuth));
      setAllStoreSales((prev) => prev.map(updateWithAuth));
      setTicket((prev) => (prev ? updateWithAuth(prev) : prev));
    }).finally(() => {
      pendingBillingProcessing.current = false;
    });
  }, [store, sales, allStoreSales]);
  useEffect(() => {
    if (pushEntry) window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }, [pushEntry]);
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const openNotice = (event: MessageEvent) => {
      if (event.data?.type !== 'retail-push-open') return;
      const intent = readPushIntent(event.data);
      if (!intent) return;
      if (intent.storeId !== store.id) {
        notify('info', 'El aviso corresponde a otro comercio. Seleccionalo desde el menú para revisarlo.');
        return;
      }
      if (!manager || busy || cart.length || guiding) {
        notify('info', 'Tenés un aviso del comercio. Podés revisarlo cuando termines la operación actual.');
        return;
      }
      if (intent.view === 'cash') setCashView('overview');
      if (intent.view === 'settings') setSettingsView('app');
      if (intent.view === 'transfers') {
        setCatalogView('transfers');
        setIsAiOpen(false);
        setTab('catalog');
        return;
      }
      if (intent.view === 'catalog') {
        setCatalogView('products');
        const low = products.filter((p) => p.active && !hasComposition(p) && p.stock <= p.minStock);
        if (low.length > 0) {
          const list = low
            .slice(0, 3)
            .map((p) => `"${p.name}" (${p.stock} u.)`)
            .join(', ');
          notify(
            'warning',
            `⚠️ Revisá el stock (${low.length} en nivel crítico): ${list}${low.length > 3 ? '…' : ''}`,
          );
        }
      }
      setIsAiOpen(false);
      setTab(intent.view);
    };
    navigator.serviceWorker.addEventListener('message', openNotice);
    return () => navigator.serviceWorker.removeEventListener('message', openNotice);
  }, [store.id, manager, busy, cart.length, guiding, notify, products]);
  return { run, confirmLeave, showTicket, handleSaleLedgerChange, completeSale, refreshAll, pendingBillingProcessing };
}
