import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage, retail, type PendingReplenishment } from './api';

export function usePendingReplenishments(store: string, manager: boolean) {
  const [state, setState] = useState<{ store: string; rows: PendingReplenishment[]; error: string }>({ store: '', rows: [], error: '' });
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    if (!manager) return;
    const turn = ++generation.current;
    try {
      const rows = await retail.pendingReplenishments(store);
      if (turn === generation.current) setState({ store, rows, error: '' });
    } catch (error) {
      if (turn === generation.current) setState(previous => ({ store, rows: previous.store === store ? previous.rows : [], error: errorMessage(error) }));
    }
  }, [store, manager]);
  useEffect(() => {
    if (!manager) return;
    void refresh();
    const onFocus = () => { if (document.visibilityState !== 'hidden') void refresh(); };
    const timer = setInterval(onFocus, 30000);
    window.addEventListener('focus', onFocus); window.addEventListener('online', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => { generation.current++; clearInterval(timer); window.removeEventListener('focus', onFocus); window.removeEventListener('online', onFocus); document.removeEventListener('visibilitychange', onFocus); };
  }, [manager, refresh]);
  return {
    records: manager && state.store === store ? state.rows : [],
    error: manager && state.store === store ? state.error : '',
    refresh,
    reviewed: (id: string) => {
      setState(previous => ({ ...previous, rows: previous.rows.filter(row => row.id !== id) }));
      void refresh();
    },
  };
}
