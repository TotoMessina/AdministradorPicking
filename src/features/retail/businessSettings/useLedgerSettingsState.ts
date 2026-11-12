import { useState } from 'react';
import { ledgerPaymentMethods } from '../ledgerRouting';
import type { LedgerSettingsProps } from './useLedgerSettings';

/** Registro en edición y resumen de registros activos. */
export function useLedgerSettingsState(ctx: LedgerSettingsProps) {
  const { ledgers } = ctx;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const hasGeneral = ledgers.some((l) => l.name === 'General' && l.active);
  const hasPruebas = ledgers.some((l) => l.name === 'Pruebas' && l.active);
  const activeCount = ledgers.filter((l) => l.active).length;
  const defaultLedger = ledgers.find((l) => l.is_default) || ledgers.find((l) => l.active);

  const getAssignedMethodsCount = (ledgerId: string) => {
    return ledgerPaymentMethods.filter((method) => {
      const explicit = ledgers.find((l) => l.active && l.payment_methods?.includes(method.id));
      if (explicit) return explicit.id === ledgerId;
      return defaultLedger?.id === ledgerId;
    }).length;
  };

  return { editingId, setEditingId, isAdding, setIsAdding, hasGeneral, hasPruebas, activeCount, defaultLedger, getAssignedMethodsCount };
}
