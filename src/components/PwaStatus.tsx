import { useEffect, useState } from 'react';
import { Download, WifiOff, X } from 'lucide-react';

const dismissalKey = 'kiosco.install-banner.dismissed';

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaStatus({ settings = false }: { settings?: boolean }) {
  const [online, setOnline] = useState(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [installing, setInstalling] = useState(false);
  const [message, setMessage] = useState('');
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(dismissalKey) === 'true'; } catch { return false; }
  });
  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(dismissalKey, 'true'); } catch { /* Still dismiss for this visit. */ }
  };
  const [standalone, setStandalone] = useState(
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone),
  );
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  useEffect(() => {
    const connectionChanged = () => setOnline(navigator.onLine);
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    const installed = () => { setStandalone(true); setInstallPrompt(null); };
    window.addEventListener('online', connectionChanged);
    window.addEventListener('offline', connectionChanged);
    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', installed);
    return () => {
      window.removeEventListener('online', connectionChanged);
      window.removeEventListener('offline', connectionChanged);
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  async function install() {
    if (!installPrompt || installing) return;
    setInstalling(true);
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      dismiss();
    } catch {
      setMessage('Podés instalar la app desde el menú de tu navegador.');
    } finally {
      setInstallPrompt(null);
      setInstalling(false);
    }
  }

  if (!settings && online && (dismissed || standalone || (!installPrompt && !isIos && !message))) return null;
  return (
    <aside className="pwa-status" aria-label="Estado de la aplicación">
      {!online && <p role="status"><WifiOff size={18} aria-hidden="true" />
        Sin conexión. Las cajas preparadas guardan las operaciones en este dispositivo hasta reconectar.
      </p>}
      {settings && standalone && <p>La app ya está instalada en este dispositivo.</p>}
      {online && !standalone && (settings || !dismissed) && <>
        <span>Kiosco Express, a un toque en tu pantalla de inicio.</span>
        {installPrompt ? <button className="secondary-button" disabled={installing} onClick={() => void install()}>
          <Download size={16} aria-hidden="true" /> {installing ? 'Instalando…' : 'Instalar app'}
        </button> : <p>{message || (isIos ? 'En Safari: Compartir → Agregar a pantalla de inicio.' : 'En el menú del navegador, buscá «Instalar app» o «Agregar a pantalla de inicio».')}</p>}
        {!settings && <button type="button" className="icon-button pwa-dismiss" aria-label="Cerrar aviso de instalación" onClick={dismiss}><X size={18} aria-hidden="true" /></button>}
      </>}
    </aside>
  );
}
