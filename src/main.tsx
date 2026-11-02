import { ConfirmHost } from './components/ConfirmHost'
import './utils/uuid';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client'
import App from './App'
import { initErrorReporting, uncaughtRenderError } from './lib/errorReporting';

initErrorReporting();

// Opt-in development worker supports push without caching Vite or hot reload.
if ((import.meta.env.PROD || import.meta.env.VITE_ENABLE_DEV_PWA === 'true') && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
      .catch((error: unknown) => console.warn('No se pudo activar la PWA:', error));
  });
}

createRoot(document.getElementById('root')!, { onUncaughtError: uncaughtRenderError }).render(
  <StrictMode>
    <App />
    <ConfirmHost />
  </StrictMode>,
)
