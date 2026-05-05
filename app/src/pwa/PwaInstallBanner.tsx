// iOS install banner — shows only on iOS Safari when not already installed as PWA

import { useState } from 'react';
import { Icons } from './icons';

const DISMISSED_KEY = 'pwa-install-banner-dismissed';

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function PwaInstallBanner() {
  const [dismissed, setDismissed] = useState(
    () => !!localStorage.getItem(DISMISSED_KEY)
  );

  // Only show on iOS Safari, not already installed
  if (!isIOS() || isStandalone() || dismissed) return null;

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  }

  return (
    <>
      {/* Backdrop dimming */}
      <div
        onClick={dismiss}
        style={{
          position: 'fixed', inset: 0, zIndex: 998,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          animation: 'fadeIn 0.25s',
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 999,
        background: 'var(--card-bg)',
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: '0 20px 36px',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.4)',
        animation: 'slideUp 0.3s cubic-bezier(0.2,0.9,0.3,1)',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: 'var(--card-border)' }}/>
        </div>

        {/* App icon + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, marginTop: 4 }}>
          <img
            src="./apple-touch-icon.png"
            alt="App Icon"
            style={{ width: 56, height: 56, borderRadius: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
          />
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--fg)', letterSpacing: -0.3 }}>
              PokéTracker
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>
              Als App auf dem Home-Bildschirm installieren
            </div>
          </div>
        </div>

        {/* Steps */}
        <div style={{
          background: 'var(--pill-bg)', borderRadius: 16, padding: '6px 0',
          marginBottom: 16, border: '1px solid var(--card-border)',
        }}>
          {[
            {
              icon: (
                // iOS Share icon (box with arrow)
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                  <polyline points="16 6 12 2 8 6"/>
                  <line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
              ),
              step: '1',
              text: 'Tippe unten auf das',
              highlight: 'Teilen-Symbol',
              sub: '(Quadrat mit Pfeil nach oben)',
            },
            {
              icon: <Icons.Plus size={20}/>,
              step: '2',
              text: 'Wähle',
              highlight: '„Zum Home-Bildschirm"',
              sub: 'im Menü nach unten scrollen',
            },
            {
              icon: <Icons.Check size={20}/>,
              step: '3',
              text: 'Tippe auf',
              highlight: '„Hinzufügen"',
              sub: 'oben rechts – fertig!',
            },
          ].map((item, i, arr) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px',
              borderBottom: i < arr.length - 1 ? '1px solid var(--card-border)' : 'none',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 12, flexShrink: 0,
                background: 'var(--accent-grad)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: 15, fontWeight: 700,
              }}>
                {item.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: 'var(--fg)', lineHeight: 1.4 }}>
                  {item.text}{' '}
                  <span style={{ fontWeight: 700, color: 'var(--accent-solid)' }}>{item.highlight}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>{item.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Arrow hint — points at Safari bottom bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 6, marginBottom: 16,
          fontSize: 12, color: 'var(--accent-solid)', fontWeight: 600,
        }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
          </svg>
          Das Teilen-Symbol befindet sich in der Mitte der Safari-Leiste unten
        </div>

        <button
          onClick={dismiss}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
            background: 'var(--ghost-bg)', color: 'var(--fg-muted)',
            fontSize: 15, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Später
        </button>
      </div>
    </>
  );
}
