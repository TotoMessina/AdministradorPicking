import { useState, useEffect, useRef } from 'react';
import { usePermissionProfiles } from '../PermissionProfiles';
import { supabase } from '../../../lib/supabase';
import type { storeSettingsProps } from './useStoreSettings';

/** Sección visible, edición de personas e invitaciones, y acceso a la plataforma. */
export function useStoreSettingsState(ctx: ReturnType<typeof storeSettingsProps>) {
  const { store, role, userId, requestedView, onViewChange } = ctx;
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  useEffect(() => {
    let current = true;
    // Solo decide si se muestra el panel de plataforma; cada cambio vuelve a validar el permiso en la base.
    void supabase.rpc('retail_is_platform_admin').then(({ data, error }) => { if (current) setIsPlatformAdmin(!error && data === true); });
    return () => { current = false; };
  }, [userId]);
  // «Registros de ventas» ahora vive en Ventas y precios: los enlaces viejos llevan ahí.
  const view = requestedView === 'ledgers' ? 'config' : ['general', 'config', 'locations', 'team', 'activity', 'more', 'app', ...(isPlatformAdmin ? ['platform'] : [])].includes(requestedView) ? requestedView : 'general';
  const setView = onViewChange;
  const staffProfiles = usePermissionProfiles(store.id, view === 'team' && (role === 'owner' || role === 'admin'));
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingInviteId, setEditingInviteId] = useState<string | null>(null);
  const morePanelRef = useRef<HTMLDivElement>(null);
  const moreTriggerRef = useRef<HTMLButtonElement | null>(null);
  const openMoreSection = (next: 'app' | 'ledgers' | 'platform', trigger: HTMLButtonElement) => {
    moreTriggerRef.current = trigger;
    setView(next);
    requestAnimationFrame(() => {
      const region = morePanelRef.current?.querySelector<HTMLElement>(`[data-settings-view="${next}"]`);
      if (region?.getClientRects().length) region.focus();
    });
  };
  const returnToMore = () => {
    setView('more');
    requestAnimationFrame(() => {
      if (!morePanelRef.current?.getClientRects().length) return;
      if (moreTriggerRef.current?.getClientRects().length) moreTriggerRef.current.focus();
      else morePanelRef.current.querySelector<HTMLButtonElement>('section:not([hidden]) button')?.focus();
    });
  };
  const [appVisited, setAppVisited] = useState(view === 'app');
  useEffect(() => { if (view === 'app') setAppVisited(true); }, [view]);
  const isDirectPrimary = ['general', 'config', 'locations', 'team', 'activity'].includes(view);
  const isMoreSub = ['more', 'app', 'ledgers', 'platform'].includes(view);
  const primaryView = isDirectPrimary ? view : (isMoreSub ? 'more' : '');
  return { isPlatformAdmin, setIsPlatformAdmin, view, setView, staffProfiles, editingMemberId, setEditingMemberId, editingInviteId, setEditingInviteId, morePanelRef, moreTriggerRef, openMoreSection, returnToMore, appVisited, setAppVisited, isDirectPrimary, isMoreSub, primaryView };
}
