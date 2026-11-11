import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Store as StoreIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { retail, errorMessage, type Store } from './api';
import { disconnectPushOnLogout, initialPushIntent } from './push';
import { configureOffline, stopOffline, backgroundAuth } from './offline';
import { PlatformAnnouncements } from './PlatformAnnouncements';
import { installDropdownMenus } from '../../components/dropdownMenus';
import { type SuspendedStore, suspendedStores } from './suspendedStores';
import { Workspace } from './workspace/Workspace';

export function RetailApp({ session }: { session: Session }) {
  useEffect(() => { if (session.access_token) void backgroundAuth(session).catch(() => {}); }, [session.access_token]);
  // Desplegables: uno por vez, por encima de las barras fijas y dentro de la pantalla.
  useEffect(() => installDropdownMenus(), []);
  const [stores, setStores] = useState<Store[]>([]);
  const [suspended, setSuspended] = useState<SuspendedStore[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const creatingRequest = useRef(false);
  const [busy, setBusy] = useState(false);
  const [pushWelcomeDone, setPushWelcomeDone] = useState(false);
  const finishPushWelcome = useCallback(() => setPushWelcomeDone(true), []);
  const load = useCallback(async () => {
    configureOffline(session.user.id);
    setLoading(true);
    setError("");
    try {
      await retail.acceptInvitations();
      const rows = await retail.stores();
      const blocked = await suspendedStores();
      if (blocked) setSuspended(blocked);
      setStores(rows);
      setSelected((prev) =>
        rows.some((s) => s.id === prev) ? prev : rows.find(s => s.id === initialPushIntent()?.storeId)?.id || rows[0]?.id || "",
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [session.user.id]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    // Una suspensión hecha con la app abierta se aplica en el próximo control, sin esperar a recargar.
    const timer = window.setInterval(() => void suspendedStores().then(blocked => {
      if (!blocked) return;
      setSuspended(blocked);
      if (!blocked.length) return;
      setStores(previous => {
        const remaining = previous.filter(item => !blocked.some(entry => entry.id === item.id));
        if (remaining.length === previous.length) return previous;
        setSelected(current => remaining.some(item => item.id === current) ? current : remaining[0]?.id || '');
        return remaining;
      });
    }), 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);
  const signOut = async () => {
    // Logging out also disconnects notifications on shared shop devices.
    try { await disconnectPushOnLogout(); } catch { /* Logout must remain available. */ }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    await stopOffline();
  };
  const store = stores.find((s) => s.id === selected);
  const accentColor = store?.accent_color;
  useEffect(() => {
    // Notifications rendered outside the workspace share the active palette.
    const root = document.documentElement;
    const previous = root.style.getPropertyValue("--store-accent");
    if (accentColor) root.style.setProperty("--store-accent", accentColor);
    return () => {
      if (previous) root.style.setProperty("--store-accent", previous);
      else root.style.removeProperty("--store-accent");
    };
  }, [accentColor]);
  if (store && !creating)
    return (
      <Workspace
        key={session.user.id + store.id}
        session={session}
        store={store}
        stores={stores}
        setSelected={setSelected}
        onCreate={() => setCreating(true)}
        onStores={async () => {
          const rows = await retail.stores();
          setStores(rows);
        }}
        onSignOut={signOut}
        pushWelcomeDone={pushWelcomeDone}
        onPushWelcomeDone={finishPushWelcome}
      />
    );
  return (
    <div className="auth-page">
      <section className="auth-card">
        <span className="brand-mark">
          <StoreIcon />
        </span>
        <h1>{creating ? "Sumá otro comercio" : suspended.length && !loading ? "Acceso suspendido" : "Tu negocio empieza acá"}</h1>
        <p>{session.user.email}</p>
        {!loading && <PlatformAnnouncements selling={false} />}
        {loading ? (
          <p role="status">Buscando tus comercios…</p>
        ) : error ? (
          <>
            <div role="alert" className="error-banner">
              {error}
            </div>
            <button className="secondary-button" onClick={() => void load()}>
              Reintentar conexión
            </button>
          </>
        ) : suspended.length && !creating ? (
          <div className="suspended-stores" role="alert">
            <h2>{suspended.length === 1 ? 'Comercio suspendido' : 'Comercios suspendidos'}</h2>
            <ul>{suspended.map(item => <li key={item.id}>
              <strong>{item.name}</strong>
              <span>Desde el {new Date(item.suspended_at).toLocaleDateString('es-AR')}. Motivo: {item.reason}</span>
            </li>)}</ul>
            <p>El proveedor del servicio suspendió el acceso. Los datos se conservan y vuelven a estar disponibles al reactivarlo. Las operaciones guardadas sin conexión en este dispositivo quedan pendientes y se envían solas al reactivarse.</p>
          </div>
        ) : (
          <>
            <p>
              Creá un comercio con su propia caja y catálogo. Si te autorizaron
              a uno existente, actualizá los accesos.
            </p>
            <form
              className="retail-form"
              onSubmit={async (e) => {
                e.preventDefault();
                if (creatingRequest.current) return;
                creatingRequest.current = true;
                const name = String(new FormData(e.currentTarget).get("name"));
                setBusy(true);
                try {
                  const id = await retail.createStore(name);
                  await load();
                  setSelected(id);
                  setCreating(false);
                } catch (err) {
                  setError(errorMessage(err));
                } finally {
                  creatingRequest.current = false;
                  setBusy(false);
                }
              }}
            >
              <label>
                Nombre del comercio
                <input
                  name="name"
                  required
                  maxLength={100}
                  placeholder="Ej. Almacén del barrio"
                />
              </label>
              <button disabled={busy} className="primary-button">
                {busy ? "Creando…" : "Crear comercio"}
              </button>
            </form>
          </>
        )}
        <div className="auth-links">
          <button disabled={busy} onClick={() => void load()}>
            Actualizar accesos
          </button>
          {creating && (
            <button onClick={() => setCreating(false)}>Volver</button>
          )}
          <button
            disabled={busy}
            onClick={() =>
              void signOut().catch((e) => setError(errorMessage(e)))
            }
          >
            Cerrar sesión
          </button>
        </div>
      </section>
    </div>
  );
}
