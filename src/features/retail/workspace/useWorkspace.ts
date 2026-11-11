import type { Session } from '@supabase/supabase-js';
import type { Store } from '../api';
import { useWorkspaceState } from './useWorkspaceState';
import { useWorkspaceAccess } from './useWorkspaceAccess';
import { useWorkspaceData } from './useWorkspaceData';
import { useWorkspaceSale } from './useWorkspaceSale';

export type WorkspaceProps = {
  session: Session;
  store: Store;
  stores: Store[];
  setSelected: (id: string) => void;
  onCreate: () => void;
  onStores: () => Promise<void>;
  onSignOut: () => Promise<void>;
  pushWelcomeDone: boolean;
  onPushWelcomeDone: () => void;
};

/** Todo el estado y las acciones de Workspace, armado en partes. */
export function useWorkspace(props: WorkspaceProps) {
  const s1 = useWorkspaceState(props);
  const s2 = useWorkspaceAccess({ ...props, ...s1 });
  const s3 = useWorkspaceData({ ...props, ...s1, ...s2 });
  const s4 = useWorkspaceSale({ ...props, ...s1, ...s2, ...s3 });
  return { ...props, ...s1, ...s2, ...s3, ...s4 };
}

export type WorkspaceState = ReturnType<typeof useWorkspace>;
