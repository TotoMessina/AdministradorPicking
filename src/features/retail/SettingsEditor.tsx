import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';

const EditorContext = createContext<{ selected: string; select: (id: string) => void } | null>(null);

export function SettingsEditorGroup({ children }: { children: ReactNode }) {
  const [selected, select] = useState('');
  return <EditorContext.Provider value={{ selected, select }}>{children}</EditorContext.Provider>;
}

// Changing editors keeps drafts mounted. Cancel discards only this editor's draft.
export function SettingsEditor({ label, summary, busy, children, onClose }: {
  label: string; summary?: ReactNode; busy: boolean;
  children: (close: () => void) => ReactNode;
  onClose?: () => void;
}) {
  const group = useContext(EditorContext);
  const id = useId();
  const [started, setStarted] = useState(false);
  const [localOpen, setLocalOpen] = useState(false);
  const open = group ? group.selected === id : localOpen;
  const trigger = useRef<HTMLButtonElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef(false);
  useEffect(() => {
    if (open && !body.current?.closest('[hidden]')) body.current?.querySelector<HTMLElement>('input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])')?.focus();
  }, [open]);
  useEffect(() => {
    if (restoreFocus.current && !open && !busy) {
      restoreFocus.current = false;
      if (!trigger.current?.closest('[hidden]')) trigger.current?.focus();
    }
  }, [open, busy]);
  const close = () => {
    restoreFocus.current = true;
    setStarted(false);
    if (group) group.select(''); else setLocalOpen(false);
    onClose?.();
  };
  return <div className={`settings-editor${open ? ' settings-editor-open' : ''}`}>
    <div className="team-row">
      {summary && <div>{summary}</div>}
      <button ref={trigger} type="button" className="secondary-button" disabled={busy}
        aria-expanded={open} aria-controls={id} onClick={() => {
          setStarted(true);
          if (group) group.select(id); else setLocalOpen(true);
        }}>{started && !open ? `Continuar: ${label}` : label}</button>
    </div>
    <div id={id} ref={body} hidden={!open}>
      {started && children(close)}
      <button type="button" className="text-button" disabled={busy} onClick={close}>Cancelar</button>
    </div>
  </div>;
}
