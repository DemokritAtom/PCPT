import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { PwaApp } from './PwaApp';
import { I18nProvider } from './lib/i18n';
import './styles/globals.css';

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .catch((err) => console.warn('SW registration failed:', err));
  });

  // When a new SW takes control (after skipWaiting + clients.claim),
  // reload so the page always runs the latest JS/CSS — fixes the
  // "need to force-reload after reopening PWA" issue.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');

// Detect standalone PWA mode (installed on home screen)
const isPwa =
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

createRoot(rootEl).render(
  <StrictMode>
    <I18nProvider>
      {isPwa ? <PwaApp /> : <App />}
    </I18nProvider>
  </StrictMode>,
);
