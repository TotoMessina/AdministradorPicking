import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { errorMessage, retail } from './api';

export function RemitoPhoto({ store, reference }: { store: string; reference: string }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const opening = useRef(false);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try { const signed = await retail.getRemitoUrl(store, reference); if (active) { setUrl(signed); setError(''); } }
      catch (err) { if (active) setError(errorMessage(err)); }
    };
    void load();
    const timer = setInterval(() => { if (document.visibilityState !== 'hidden') void load(); }, 240000);
    return () => { active = false; clearInterval(timer); };
  }, [store, reference]);
  const open = async () => {
    if (opening.current) return;
    opening.current = true; setLoading(true); setError('');
    let tab: Window | null = null;
    try {
      tab = window.open('about:blank', '_blank');
      if (tab) { tab.opener = null; tab.document.title = 'Cargando remito…'; }
      const signed = await retail.getRemitoUrl(store, reference);
      setUrl(signed);
      if (tab && !tab.closed) tab.location.replace(signed);
      else setError('El navegador bloqueó la pestaña. Tocá la imagen para abrirla.');
    } catch (err) { tab?.close(); setError(errorMessage(err)); }
    finally { opening.current = false; setLoading(false); }
  };
  return <div className="remito-photo">
    {url ? <a href={url} target="_blank" rel="noopener noreferrer"><img src={url} loading="lazy" decoding="async" alt="Foto del remito enviado" onError={() => setError('No se pudo cargar la vista previa. Tocá «Ver foto completa» para reintentar.')} /></a> : <span>Vista previa privada</span>}
    <button type="button" className="secondary-button" disabled={loading} onClick={() => void open()}>{loading ? <Loader2 size={14} className="spin" /> : <ExternalLink size={14} />} Ver foto completa</button>
    {error && <small className="remito-error" role="status">{error}</small>}
  </div>;
}
