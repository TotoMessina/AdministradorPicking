import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { Store, LogIn, Eye, EyeOff } from "lucide-react";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import { errorMessage } from "./api";
import { stopOffline } from './offline';
export function AuthGate({
  children,
}: {
  children: (session: Session) => ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(
    window.location.hash.includes("type=recovery"),
  );
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const running = useRef(false);
  useEffect(() => {
    if (navigator.onLine === false) {
      try {
        const user = JSON.parse(localStorage.getItem('retail.offline-user') || 'null');
        if (user?.id && user?.email) { setSession({ user, access_token: '', refresh_token: '', token_type: 'bearer', expires_in: 0 }); setLoading(false); }
      } catch { /* A new account must sign in online before using offline data. */ }
    }
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      if (!next && navigator.onLine === false && event !== 'SIGNED_OUT') return;
      try {
        if (next?.user) localStorage.setItem('retail.offline-user', JSON.stringify({ id: next.user.id, email: next.user.email }));
        if (event === 'SIGNED_OUT') localStorage.removeItem('retail.offline-user');
      } catch { /* Storage failure is handled by the operational database. */ }
      setSession(next);
      setLoading(false);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (event === "SIGNED_OUT") setRecovery(false);
      if (event === 'SIGNED_OUT') void stopOffline();
    });
    return () => subscription.unsubscribe();
  }, []);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (recovery) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setRecovery(false);
        setPassword("");
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        setPassword("");
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session)
          setMessage("Revisá tu email y confirmá la cuenta para ingresar.");
        setPassword("");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo: window.location.origin },
        );
        if (error) throw error;
        setMessage(
          "Si existe una cuenta con ese email, recibirás un enlace para cambiar la contraseña.",
        );
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  if (!isSupabaseConfigured)
    return (
      <div className="auth-page">
        <section className="auth-card">
          <h1>Configurá la conexión</h1>
          <p>
            Completá VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.local y
            reiniciá la app.
          </p>
        </section>
      </div>
    );
  if (loading)
    return (
      <div className="auth-page" role="status">
        Preparando tu sesión…
      </div>
    );
  if (session && !recovery) return <>{children(session)}</>;
  return (
    <div className="auth-page auth-layout">
      <div className="auth-brand"><Store size={24} aria-hidden="true" /><span>Mi negocio</span></div>
      <section className="auth-card">
        <span className="brand-mark">
          <Store />
        </span>
        <span className="eyebrow">TU NEGOCIO, EN UN SOLO LUGAR</span>
        <h1>
          {recovery
            ? "Elegí una nueva contraseña"
            : mode === "signup"
              ? "Creá tu cuenta"
              : mode === "reset"
                ? "Recuperá tu acceso"
              : "Ingresá a tu comercio"}
        </h1>
        <p>{recovery ? 'Guardá una contraseña nueva para volver a ingresar.' : mode === 'reset' ? 'Ingresá tu email para recibir un enlace de recuperación.' : mode === 'signup' ? 'Creá tu acceso. Después podés configurar tu comercio.' : 'Ingresá a tu cuenta para empezar a trabajar.'}</p>
        <form onSubmit={submit} className="retail-form">
          {!recovery && (
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                placeholder="vos@ejemplo.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          )}
          {(recovery || mode !== "reset") && (
            <div className="password-field">
              <label htmlFor="auth-password">Contraseña</label>
              <div className="password-input">
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Tu contraseña"
                autoComplete={
                  mode === "login" && !recovery
                    ? "current-password"
                    : "new-password"
                }
                minLength={mode === "signup" || recovery ? 8 : 1}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" className="icon-button" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button>
              </div>
              {(mode === "signup" || recovery) && (
                <small>Usá al menos 8 caracteres.</small>
              )}
            </div>
          )}
          {error && (
            <div role="alert" className="error-banner">
              {error}
            </div>
          )}
          {message && (
            <div role="status" className="info-banner">
              {message}
            </div>
          )}
          <button className="primary-button" disabled={busy}>
            <LogIn size={17} />
            {busy
              ? "Un momento…"
              : recovery
                ? "Guardar contraseña"
                : mode === "signup"
                  ? "Crear cuenta"
                  : mode === "reset"
                    ? "Enviar enlace"
                    : "Ingresar"}
          </button>
        </form>
        {!recovery && (
          <div className="auth-links">
            <button
              onClick={() => {
                setMode(mode === "signup" ? "login" : "signup");
                setError("");
                setMessage("");
              }}
            >
              {mode === "signup" ? "Ya tengo una cuenta" : "Crear una cuenta"}
            </button>
            <button
              onClick={() => {
                setMode(mode === "reset" ? "login" : "reset");
                setError("");
                setMessage("");
              }}
            >
              {mode === "reset" ? "Volver al ingreso" : "Olvidé mi contraseña"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
