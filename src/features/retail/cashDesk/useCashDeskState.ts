import { useEffect, useId, useRef, useState } from 'react';
import { retail, errorMessage } from '../api';
import { cashInSale } from '../payments';
import type { MovementReceiptData } from '../MovementReceipt';
import type { CashDenominationDraft } from '../../../services/cashDenominations';
import type { cashDeskProps } from './useCashDesk';

/** Tarea y actividad visibles, cierre, saldo esperado y desglose del efectivo. */
export function useCashDeskState(ctx: ReturnType<typeof cashDeskProps>) {
  const {
    shift, sales, movements, occupiedByOther, cashierMode, active, openFromSale, closeRequest,
    onCloseRequestHandled, allowIncome, allowWithdrawal,
  } = ctx;
  const taskId = useId();
  const [task, setTask] = useState<'movement' | 'close'>('movement');
  const currentTask = allowIncome || allowWithdrawal ? task : 'close';
  const [activity, setActivity] = useState('movements');
  const currentActivity = shift ? activity : 'history';
  const activityName = `${taskId}-activity`;
  const taskName = `${taskId}-task`;
  const taskPanel = useRef<HTMLDivElement>(null);
  const taskActions = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (active && closeRequest) {
      setTask('close');
      onCloseRequestHandled?.();
    }
  }, [active, closeRequest, onCloseRequestHandled]);
  useEffect(() => {
    if (active && !taskActions.current?.contains(document.activeElement))
      taskPanel.current?.querySelector<HTMLElement>('section:not([hidden]) h2')?.focus();
  }, [active, currentTask]);
  const openingRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (active && openFromSale && !shift && !occupiedByOther) openingRef.current?.focus();
  }, [active, openFromSale, shift, occupiedByOther]);
  const [counted, setCounted] = useState("");
  const countedRef = useRef<HTMLInputElement>(null);
  const [includeDenominations, setIncludeDenominations] = useState(false);
  const [denominationDraft, setDenominationDraft] = useState<CashDenominationDraft>({});
  const [closingError, setClosingError] = useState('');
  const [closeAsked, setCloseAsked] = useState(false);
  const [ticketCount, setTicketCount] = useState<number | null>(shift?.ticket_count ?? null);
  const availableTickets = new Set(sales.map(sale => sale.id)).size;
  const closingTickets = Math.max(ticketCount ?? 0, availableTickets);
  useEffect(() => {
    let current = true;
    setTicketCount(shift?.ticket_count ?? null);
    if (active && shift) void retail.shiftTicketCount(shift.id)
      .then(total => { if (current) setTicketCount(total); })
      .catch(() => { /* The available local sales remain visible; closing is not blocked. */ });
    return () => { current = false; };
  }, [active, shift?.id, shift?.ticket_count, sales]);
  const [historyShift, setHistoryShift] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const aiController = useRef<AbortController | null>(null);
  const [movementBusy, setMovementBusy] = useState(false);
  const [receipt, setReceipt] = useState<MovementReceiptData | null>(null);
  const [serverBalance, setServerBalance] = useState<number | null>(null);
  const [balanceError, setBalanceError] = useState('');
  useEffect(() => {
    let active = true;
    setServerBalance(null); setBalanceError('');
    if (cashierMode && shift) void retail.shiftBalance(shift.id)
      .then(value => { if (active) setServerBalance(value); })
      .catch(error => { if (active) setBalanceError(errorMessage(error)); });
    return () => { active = false; };
  }, [cashierMode, shift?.id, sales, movements]);

  // Reset analysis when shift changes
  useEffect(() => {
    aiController.current?.abort();
    setIsAiLoading(false);
    setAiAnalysis(null);
    setAiError(null);
    return () => aiController.current?.abort();
  }, [shift?.id]);

  const cash = sales
    .reduce((n, s) => n + cashInSale(s), 0);
  const electronic = sales
    .reduce((n, s) => n + s.total - cashInSale(s), 0);
  const expected = serverBalance ?? (
    Number(shift?.opening_cash || 0) +
    cash +
    movements.reduce(
      (n, m) => n + (m.type === "INGRESO" ? 1 : -1) * Number(m.amount),
      0,
    ));

  // Desglose de «Debería haber» para quien no cuenta a ciegas. Lo que el servidor suma aparte (cobros de fiado
  // en efectivo, devoluciones en efectivo) aparece como «Otros» para que la cuenta cierre.
  const cashIncome = movements.filter(m => m.type === 'INGRESO').reduce((n, m) => n + Number(m.amount), 0);
  const cashOut = movements.filter(m => m.type === 'RETIRO').reduce((n, m) => n + Number(m.amount), 0);
  const cashOther = Math.round((expected - (Number(shift?.opening_cash || 0) + cash + cashIncome - cashOut)) * 100) / 100;

  return { taskId, task, setTask, currentTask, activity, setActivity, currentActivity, activityName, taskName, taskPanel, taskActions, openingRef, counted, setCounted, countedRef, includeDenominations, setIncludeDenominations, denominationDraft, setDenominationDraft, closingError, setClosingError, closeAsked, setCloseAsked, ticketCount, setTicketCount, availableTickets, closingTickets, historyShift, setHistoryShift, aiAnalysis, setAiAnalysis, isAiLoading, setIsAiLoading, aiError, setAiError, aiController, movementBusy, setMovementBusy, receipt, setReceipt, serverBalance, setServerBalance, balanceError, setBalanceError, cash, electronic, expected, cashIncome, cashOut, cashOther };
}
