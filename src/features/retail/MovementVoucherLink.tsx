import { useRef, useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { errorMessage, retail } from './api';

export function MovementVoucherLink({ store, shift, reference }: { store: string; shift: string; reference: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fallbackUrl, setFallbackUrl] = useState('');
  const opening = useRef(false);
  const expires = useRef(0);
  const open = async () => {
    if (opening.current) return;
    opening.current = true;
    setLoading(true);
    setError('');
    setFallbackUrl('');
    // Open on the user's click; waiting for a signed URL first triggers popup blockers.
    let tab: Window | null = null;
    try {
      tab = window.open('about:blank', '_blank');
      if (tab) { tab.opener = null; tab.document.title = 'Cargando comprobante…'; }
      const url = await retail.getVoucherUrl(store, shift, reference);
      if (tab && !tab.closed) tab.location.replace(url);
      else { expires.current = Date.now() + 50000; setFallbackUrl(url); }
    } catch (err) {
      tab?.close();
      setError(errorMessage(err));
    } finally { opening.current = false; setLoading(false); }
  };
  return <span className="movement-voucher-link">
    <button type="button" className="secondary-button" disabled={loading} onClick={() => void open()}>
      {loading ? <Loader2 size={14} className="spin" /> : <ExternalLink size={14} />} {loading ? 'Abriendo comprobante…' : 'Ver comprobante'}
    </button>
    {fallbackUrl && <a href={fallbackUrl} target="_blank" rel="noopener noreferrer" onClick={event => { if (Date.now() >= expires.current) { event.preventDefault(); void open(); } }}>Abrir comprobante en nueva pestaña</a>}
    {error && <small className="movement-error" role="alert">{error} Tocá «Ver comprobante» para reintentar.</small>}
  </span>;
}
