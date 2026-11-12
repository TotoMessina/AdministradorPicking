import { useCallback, useId, useMemo, useState } from 'react';
import { useDialogFocus } from '../useDialogFocus';
import type { BranchSettingsProps } from './useBranchSettings';

/** Sucursal abierta en el editor y borrador de alta. */
export function useBranchSettingsState(ctx: BranchSettingsProps) {
  const { branches, registers, busy } = ctx;
  const [openId, setOpenId] = useState<string | null | undefined>(undefined);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAdding, setIsAdding] = useState(branches.length === 0);
  const titleId = useId();
  const close = () => {
    if (busy) return;
    setOpenId(undefined);
    setIsEditing(false);
    setIsDeleting(false);
  };
  const dialog = useDialogFocus(openId !== undefined, close);

  const active = registers.filter((r) => r.active);
  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    for (const r of registers) if (r.active) result[r.branch_id] = (result[r.branch_id] || 0) + 1;
    return result;
  }, [registers]);
  const countFor = (branchId: string) => counts[branchId] || 0;
  const openMap = useCallback((id: string) => setOpenId(id), []);
  const orphanCount = active.filter((r) => !branches.some((b) => b.id === r.branch_id)).length;
  const openBranch = openId ? branches.find((b) => b.id === openId) : undefined;

  return { openId, setOpenId, isEditing, setIsEditing, isDeleting, setIsDeleting, isAdding, setIsAdding, titleId, close, dialog, active, counts, countFor, openMap, orphanCount, openBranch };
}
