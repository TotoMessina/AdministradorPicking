import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { Store, LogIn, Eye, EyeOff, ShoppingBag, Package, Wallet } from "lucide-react";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import { errorMessage } from "./api";
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
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      setLoading(false);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (event === "SIGNED_OUT") setRecovery(false);
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
      <aside className="auth-intro" aria-label="Mi negocio">
        <div className="auth-brand"><Store size={25} /><span>mi negocio<span>GESTIÓN SIMPLE</span></span></div>
        <div><span className="auth-intro-kicker">DEL MOSTRADOR A CADA SUCURSAL</span><h2>Tu comercio,<br />en orden.</h2><p>Lo que necesitás para vender y administrar, en un mismo lugar.</p></div>
        <div className="auth-features">
          <div><ShoppingBag size={20} /><span><strong>Ventas sin vueltas</strong><small>Productos, cobros y tickets.</small></span></div>
          <div><Package size={20} /><span><strong>Precios y stock claros</strong><small>Un catálogo para todo tu comercio.</small></span></div>
          <div><Wallet size={20} /><span><strong>Cada caja, bajo control</strong><small>Turnos, sucursales y ventas reunidas.</small></span></div>
        </div>
        <span className="auth-intro-footer">Para el kiosco de todos los días y el comercio que crece.</span>
      </aside>
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
                : "Qué bueno verte"}
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
