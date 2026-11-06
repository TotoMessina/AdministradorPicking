import { useCallback, useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import './platform-announcements.css';

interface Announcement { id: string; title: string; body: string; level: 'info' | 'importante' | 'urgente'; starts_at: string }

/**
 * Avisos del proveedor del servicio. Se muestran en línea, sin tapar acciones; en Vender solo los urgentes.
 * Sin conexión o sin la actualización de la base no muestra nada.
 */
export function PlatformAnnouncements({ selling }: { selling: boolean }) {
  const [items, setItems] = useState<Announcement[]>([]);
  const load = useCallback(() => {
    if (navigator.onLine === false) return;
    void supabase.rpc('retail_my_announcements').then(({ data, error }) => { if (!error) setItems((data || []) as Announcement[]); });
  }, []);
  useEffect(() => {
    load();
    const timer = window.setInterval(load, 10 * 60 * 1000);
    window.addEventListener('online', load);
    return () => { window.clearInterval(timer); window.removeEventListener('online', load); };
  }, [load]);
  const dismiss = (id: string) => {
    setItems(previous => previous.filter(item => item.id !== id));
    // Si falla, vuelve a aparecer en la próxima consulta: no se pierde.
    void supabase.rpc('retail_dismiss_announcement', { p_announcement: id }).then(() => undefined, () => undefined);
  };
  const visible = items.filter(item => !selling || item.level === 'urgente');
  if (!visible.length) return null;
  return <div className="platform-announcements">
    {visible.map(item => <section key={item.id} className={`platform-announcement is-${item.level}`} aria-labelledby={`announcement-${item.id}`}>
      <Megaphone size={16} aria-hidden="true" />
      <div>
        <h2 id={`announcement-${item.id}`}>{item.title}</h2>
        <p>{item.body}</p>
      </div>
      <button type="button" className="secondary-button" onClick={() => dismiss(item.id)} aria-label={`Marcar como leído: ${item.title}`}>Entendido</button>
    </section>)}
  </div>;
}
