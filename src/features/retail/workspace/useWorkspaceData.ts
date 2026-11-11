import { useCallback, useEffect, useRef } from 'react';
import { retail, errorMessage } from '../api';
import { hasComposition } from '../../../services/productComposition';
import type { WorkspaceProps } from './useWorkspace';
import type { useWorkspaceState } from './useWorkspaceState';
import type { useWorkspaceAccess } from './useWorkspaceAccess';

/** Carga y actualización de datos del comercio, del turno y avisos de stock bajo. */
export function useWorkspaceData(ctx: WorkspaceProps & ReturnType<typeof useWorkspaceState> & ReturnType<typeof useWorkspaceAccess>) {
  const {
    session, store, notify, setRole, setPermissions, setCategories, products, setProducts, setRegisters,
    setAvailability, setBranches, setBranchId, branchSelection, setPriceLists, setPriceOverrides,
    setLedgers, setLedgerId, setRevision, setRegisterId, setShifts, setSales, setAllStoreSales,
    setMovements, setMembers, setInvitations, saleInProgress, setLoading, setError, setLedgerLoading,
    generation, alive, shift, setManagementLocations, setManagementLocationError,
  } = ctx;
  const refresh = useCallback(async () => {
    const turn = ++generation.current;
    const [nextRole, cats, regs, nextShifts, nextBranches, lists, overrides, nextLedgers, nextAvailability, nextPermissions] = await Promise.all([
      retail.role(store.id, session.user.id),
      retail.categories(store.id),
      retail.registers(store.id),
      retail.shifts(store.id),
      retail.branches(store.id),
      retail.priceLists(store.id),
      retail.priceOverrides(store.id),
      retail.ledgers(store.id),
      retail.registerAvailability(store.id),
      retail.permissions(store.id),
    ]);
    const [prods, team, pending, storeSales, metadata] = await Promise.all([
      retail.products(store.id, cats),
      nextRole === 'owner' || nextRole === 'admin' || nextPermissions.includes('manage_staff') ? retail.members(store.id) : Promise.resolve([]),
      nextRole === 'owner' || nextRole === 'admin' || nextPermissions.includes('manage_staff') ? retail.invitations(store.id) : Promise.resolve([]),
      nextRole === 'owner' || nextRole === 'admin' || nextPermissions.includes('view_sales') || nextPermissions.includes('use_ai') ? retail.allSales(store.id).catch(() => []) : Promise.resolve([]),
      nextRole !== 'owner' && nextRole !== 'admin' && nextPermissions.some(action => ['manage_locations', 'manage_staff', 'manage_transfers', 'manage_funds', 'manage_price_lists', 'review_remitos'].includes(action))
        ? retail.managementLocations(store.id).then(value => ({ value, error: '' })).catch(e => ({ value: null, error: errorMessage(e) }))
        : Promise.resolve({ value: null, error: '' }),
    ]);
    if (!alive.current || turn !== generation.current) return;
    setRole(nextRole);
    setManagementLocations(metadata.value);
    setManagementLocationError(metadata.error);
    setPermissions(nextPermissions);
    setCategories(cats);
    setRegisters(regs);
    setAvailability(nextAvailability);
    setBranches(nextBranches);
    setPriceLists(lists);
    setPriceOverrides(overrides);
    setLedgers(nextLedgers);
    setLedgerId(prev => prev || nextLedgers.find(l => l.active && l.is_default)?.id || nextLedgers.find(l => l.active)?.id || '');
    const ownOpenRegister = regs.find(r => r.active && nextShifts.some(s => s.register_id === r.id && !s.closed_at && s.opened_by === session.user.id));
    const nextBranch = saleInProgress.current || nextBranches.some(b => b.id === branchSelection.current) ? branchSelection.current : ownOpenRegister?.branch_id || nextBranches[0]?.id || '';
    setBranchId(nextBranch);
    branchSelection.current = nextBranch;
    setRevision(n => n + 1);
    setShifts(nextShifts);
    setProducts(prods);
    setMembers(team);
    setInvitations(pending);
    setAllStoreSales(storeSales);
    setRegisterId((prev) =>
      saleInProgress.current || regs.some((r) => r.id === prev && r.active && r.branch_id === nextBranch)
        ? prev
        : (ownOpenRegister?.branch_id === nextBranch ? ownOpenRegister.id : '')
          || regs.find(r => r.active && r.branch_id === nextBranch && !nextAvailability.some(a => a.register_id === r.id && a.occupied))?.id
          || regs.find((r) => r.active && r.branch_id === nextBranch)?.id || "",
    );
    setError("");
  }, [store.id, session.user.id]);
  useEffect(() => {
    alive.current = true;
    void refresh()
      .catch((e) => {
        if (alive.current) setError(errorMessage(e));
      })
      .finally(() => {
        if (alive.current) setLoading(false);
      });
    return () => {
      alive.current = false;
      generation.current++;
    };
  }, [refresh]);

  // Detección en tiempo real de productos que caen en bajo stock tras ventas o ajustes
  const prevLowStockIdsRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!products.length) return;
    const currentLowStock = products.filter((p) => p.active && !hasComposition(p) && p.stock <= p.minStock);

    if (prevLowStockIdsRef.current === null) {
      // Inicialización silenciosa al cargar el comercio
      prevLowStockIdsRef.current = new Set(currentLowStock.map((p) => p.id));
      return;
    }

    // Identificar productos que entraron a bajo stock en esta actualización
    const newlyEntered = currentLowStock.filter(
      (p) => !prevLowStockIdsRef.current!.has(p.id),
    );

    if (newlyEntered.length > 0) {
      if (newlyEntered.length === 1) {
        notify(
          "warning",
          `⚠️ Revisá el stock: "${newlyEntered[0].name}" llegó al nivel mínimo (quedan ${newlyEntered[0].stock} u., mín. ${newlyEntered[0].minStock}).`,
        );
      } else if (newlyEntered.length <= 3) {
        const list = newlyEntered
          .map((p) => `"${p.name}" (${p.stock} u.)`)
          .join(", ");
        notify("warning", `⚠️ Entraron a bajo stock: ${list}.`);
      } else {
        const sample = newlyEntered
          .slice(0, 2)
          .map((p) => `"${p.name}" (${p.stock} u.)`)
          .join(", ");
        notify(
          "warning",
          `⚠️ ${newlyEntered.length} nuevos productos entraron a bajo stock: ${sample} y más.`,
        );
      }
    }

    prevLowStockIdsRef.current = new Set(currentLowStock.map((p) => p.id));
  }, [products, notify]);
  const activeShiftId = shift?.id;
  const currentShiftId = useRef(activeShiftId);
  currentShiftId.current = activeShiftId;
  const refreshLedger = useCallback(async () => {
    if (currentShiftId.current !== activeShiftId) return;
    if (!activeShiftId) {
      setSales([]);
      setMovements([]);
      return;
    }
    const [nextSales, nextMovements] = await Promise.all([
      retail.sales(store.id, activeShiftId!),
      retail.movements(store.id, activeShiftId!),
      retail.shiftBalance(activeShiftId!),
    ]);
    if (alive.current && currentShiftId.current === activeShiftId) {
      setSales(nextSales);
      setMovements(nextMovements);
    }
  }, [store.id, activeShiftId]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const update = () => { clearTimeout(timer); timer = setTimeout(() => { void Promise.all([refresh(), refreshLedger()]).catch(() => {}); }, 200); };
    window.addEventListener('retail-local-change', update);
    return () => { clearTimeout(timer); window.removeEventListener('retail-local-change', update); };
  }, [refresh, refreshLedger]);
  useEffect(() => {
    let active = true;
    setSales([]);
    setMovements([]);
    if (!activeShiftId) {
      setLedgerLoading(false);
      return;
    }
    setLedgerLoading(true);
    Promise.all([
      retail.sales(store.id, activeShiftId!),
      retail.movements(store.id, activeShiftId!),
      retail.shiftBalance(activeShiftId!),
    ])
      .then(([ss, mm]) => {
        if (active) {
          setSales(ss);
          setMovements(mm);
        }
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      })
      .finally(() => {
        if (active) setLedgerLoading(false);
      });
    return () => {
      active = false;
    };
  }, [store.id, activeShiftId]);
  return { refresh, prevLowStockIdsRef, activeShiftId, currentShiftId, refreshLedger };
}
