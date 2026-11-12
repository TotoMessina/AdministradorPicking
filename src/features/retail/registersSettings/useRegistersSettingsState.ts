import { useState } from 'react';
import type { RegistersSettingsProps } from './useRegistersSettings';

/** Caja en edición y borrador de alta. */
export function useRegistersSettingsState(ctx: RegistersSettingsProps) {
  const { registers, branches, branchId } = ctx;
  const [editingRegisterId, setEditingRegisterId] = useState<string | null>(null);
  const [deletingRegisterId, setDeletingRegisterId] = useState<string | null>(null);
  const scoped = branchId !== undefined;
  const activeRegisters = registers.filter((r) => r.active && (!scoped
    || (branchId ? r.branch_id === branchId : !branches.some((b) => b.id === r.branch_id))));
  const addBranches = branchId ? branches.filter((b) => b.id === branchId) : branches;

  return { editingRegisterId, setEditingRegisterId, deletingRegisterId, setDeletingRegisterId, scoped, activeRegisters, addBranches };
}
