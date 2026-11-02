import { useState } from 'react';
import { Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { monitoringEnabled, sendTestAlert } from '../../lib/errorReporting';

export function FailureAlertTest({ storeId }: { storeId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function test() {
    setBusy(true); setError(''); setMessage('');
    const app = await sendTestAlert().catch(() => false);
    const { data, error: functionError } = await supabase.functions.invoke('push-dispatch', { body: { monitoringTest: true, storeId } });
    const functions = !functionError && data?.sent === true;
    if (app && functions) setMessage('Prueba enviada desde la app y desde las funciones. Tiene que llegarte un correo por cada una en unos minutos.');
    else setError(app ? 'La app envió la prueba, pero las funciones no. Revisá SENTRY_DSN en Supabase y publicá la función de nuevo.' : 'La prueba de la app no salió. Revisá la conexión y VITE_SENTRY_DSN.');
    setBusy(false);
  }

  return <section className="retail-panel">
    <h2>Aviso de fallas</h2>
    <p>Te avisamos por correo cuando la app falla en un comercio. No se envían ventas, datos de clientes ni contraseñas.</p>
    {monitoringEnabled
      ? <div className="push-actions"><button className="secondary-button" disabled={busy} onClick={() => void test()}><Send size={16} /> {busy ? 'Enviando…' : 'Probar aviso de fallas'}</button></div>
      : <div className="info-banner">El aviso de fallas todavía no está configurado en esta versión.</div>}
    {error && <div className="error-banner" role="alert">{error}</div>}
    {message && <div className="info-banner" role="status">{message}</div>}
  </section>;
}
