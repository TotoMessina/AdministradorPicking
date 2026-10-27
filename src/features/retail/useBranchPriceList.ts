import { useEffect, useState } from 'react';
import { retail, errorMessage, type PriceList } from './api';

export function useBranchPriceList(store: string, branch: string, lists: PriceList[], manager: boolean, locked = false) {
  const signature = JSON.stringify(lists.map(l => [l.id, l.active, l.branch_id || null, !!l.is_primary]));
  const scope = JSON.stringify([store, branch, signature, manager]);
  const [retry, setRetry] = useState(0);
  const [selection, setSelection] = useState({ scope: '', branch: '', id: '', manual: false, ready: false, error: '' });
  useEffect(() => {
    let active = true;
    if (!branch) return;
    // Keep the sale's chosen list while its cart is in progress.
    if (locked) return;
    setSelection(previous => ({ ...previous, scope, branch, manual: previous.branch === branch && previous.manual, ready: false, error: '' }));
    void retail.branchPriceRule(store, branch).then(rule => {
      if (!active) return;
      if (rule && !lists.some(l => l.id === rule && l.active && (l.branch_id === branch || (l.is_primary && !l.branch_id)))) throw new Error('La lista asignada cambió. Actualizá los datos antes de vender.');
      setSelection(previous => {
        const keepManual = manager && previous.branch === branch && previous.manual && (!previous.id || lists.some(l => l.id === previous.id && l.active && (!l.branch_id || l.branch_id === branch)));
        return { scope, branch, id: keepManual ? previous.id : rule || '', manual: keepManual, ready: true, error: '' };
      });
    }).catch(error => { if (active) setSelection({ scope, branch, id: '', manual: false, ready: false, error: errorMessage(error) }); });
    return () => { active = false; };
    // Changes to list availability/assignment invalidate the rule; percentage/name edits do not.
  }, [store, branch, signature, manager, retry, locked]);
  const current = selection.scope === scope || (locked && selection.branch === branch && selection.ready);
  const unavailable = locked && selection.id && !lists.some(l => l.id === selection.id && l.active && (!l.branch_id || l.branch_id === branch));
  return {
    priceListId: current ? selection.id : '',
    loading: !!branch && (!current || (!selection.ready && !selection.error)),
    error: unavailable ? 'La lista de esta venta ya no está disponible. Vaciá la venta para aplicar la lista vigente y volver a cargarla.' : current ? selection.error : '',
    select: (id: string) => {
      if (!locked && manager && current && selection.ready && (!id || lists.some(l => l.id === id && l.active && (!l.branch_id || l.branch_id === branch)))) setSelection(previous => ({ ...previous, id, manual: true }));
    },
    reload: () => setRetry(value => value + 1),
  };
}
