import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { CardTable } from '@/components/CardTable';
import { Dashboard } from '@/components/Dashboard';
import { CardForm } from '@/components/CardForm';
import { CardDetail } from '@/components/CardDetail';
import { PwaInstallBanner } from '@/pwa/PwaInstallBanner';
import { formatCurrency, totalPortfolioValue } from '@/lib/price-utils';
import { addUserCard, updateUserCard, deleteUserCard } from '@/lib/card-store';
import { useI18n } from '@/lib/i18n';
import type { UserCard, Card, PortfolioRow } from '@/lib/types';
import {
  LayoutDashboard,
  BookOpen,
  Plus,
  ScanLine,
  Settings,
  AlertTriangle,
} from 'lucide-react';

type Tab = 'dashboard' | 'portfolio' | 'add' | 'scan' | 'settings';

const ExcelImport = lazy(() =>
  import('@/components/ExcelImport').then((mod) => ({ default: mod.ExcelImport })),
);

const OcrScanner = lazy(() =>
  import('@/components/OcrScanner').then((mod) => ({ default: mod.OcrScanner })),
);

// CSS vars – applied on mount (synchronous copy already set in main.tsx)
const DARK_VARS: Record<string, string> = {
  '--bg': '#0B0816',
  '--fg': '#F5F3FF',
  '--fg-muted': 'rgba(232,228,255,0.55)',
  '--card-bg': '#15102A',
  '--card-border': 'rgba(255,255,255,0.07)',
  '--card-shadow': '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.3)',
  '--input-bg': '#1A142F',
  '--pill-bg': 'rgba(255,255,255,0.06)',
  '--pill-fg': 'rgba(232,228,255,0.7)',
  '--ghost-bg': 'rgba(255,255,255,0.04)',
  '--topbar-scrolled': 'rgba(11,8,22,0.78)',
  '--up': '#34D399',
  '--down': '#F87171',
  '--tabbar-bg': 'rgba(11,8,22,0.85)',
  '--sidebar-bg': 'rgba(13,9,24,0.6)',
  '--accent-from': '#6366F1',
  '--accent-to': '#A855F7',
  '--accent-solid': '#7C5CFF',
  '--accent-soft': 'rgba(124,92,255,0.15)',
  '--accent-grad': 'linear-gradient(135deg, #6366F1 0%, #A855F7 100%)',
  '--accent-shadow': 'rgba(124,92,255,0.35)',
};

const NAV_ITEMS: Array<{ id: Tab; labelKey: string; Icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }> = [
  { id: 'dashboard', labelKey: 'tab.dashboard', Icon: LayoutDashboard },
  { id: 'portfolio', labelKey: 'tab.portfolio', Icon: BookOpen },
  { id: 'add',       labelKey: 'tab.add',       Icon: Plus },
  { id: 'scan',      labelKey: 'tab.scan',      Icon: ScanLine },
];

// ─── Sidebar button ───────────────────────────────────────────────────────────
function SidebarBtn({
  active, onClick, icon, label, showDot,
}: {
  active: boolean; onClick: () => void; icon: React.ReactNode;
  label: string; showDot?: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
        textAlign: 'left', fontSize: 13.5, fontWeight: 600, width: '100%',
        background: active ? 'var(--accent-soft)' : hov ? 'var(--pill-bg)' : 'transparent',
        color: active ? 'var(--accent-solid)' : 'var(--fg)',
        transition: 'background 0.12s',
      }}
    >
      {icon}
      <span style={{ flex: 1 }}>{label}</span>
      {showDot && <span style={{ width: 5, height: 5, borderRadius: 999, background: 'var(--accent-solid)', flexShrink: 0 }} />}
    </button>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ tab, onChange, total, currency, cardCount }: {
  tab: Tab; onChange: (t: Tab) => void;
  total: number; currency: string; cardCount: number;
}) {
  const { t } = useI18n();
  const profileName = localStorage.getItem('pwa-profile-name') || 'Christoph';
  return (
    <aside style={{
      width: 260, flexShrink: 0,
      background: 'var(--sidebar-bg)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      display: 'flex', flexDirection: 'column', padding: '22px 16px', gap: 6,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px 18px' }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10, background: 'var(--accent-grad)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 800, fontSize: 14, letterSpacing: -0.4,
          boxShadow: '0 4px 14px var(--accent-shadow)',
        }}>P</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)', letterSpacing: -0.2 }}>PCPT</div>
          <div style={{ fontSize: 10, color: 'var(--fg-muted)', fontWeight: 500 }}>Card Portfolio</div>
        </div>
      </div>
      {/* Value card */}
      <div style={{
        padding: 14, borderRadius: 14, marginBottom: 10,
        background: 'var(--accent-grad)', color: 'white',
        boxShadow: '0 8px 24px var(--accent-shadow)',
      }}>
        <div style={{ fontSize: 10, opacity: 0.85, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>
          Gesamtwert
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2, letterSpacing: -0.4 }}>
          {formatCurrency(total, currency)}
        </div>
        <div style={{ fontSize: 10.5, opacity: 0.85, marginTop: 4 }}>
          {cardCount} {t('app.cards')}
        </div>
      </div>
      {/* Nav items */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_ITEMS.map(({ id, labelKey, Icon }) => {
          const active = tab === id;
          return (
            <SidebarBtn
              key={id} active={active} onClick={() => onChange(id)} showDot={active}
              icon={<Icon size={17} strokeWidth={active ? 2.4 : 1.9} />}
              label={t(labelKey as Parameters<typeof t>[0])}
            />
          );
        })}
      </nav>
      <div style={{ flex: 1 }} />
      {/* Settings */}
      <SidebarBtn
        active={tab === 'settings'} onClick={() => onChange('settings')}
        icon={<Settings size={17} strokeWidth={tab === 'settings' ? 2.4 : 1.9} />}
        label={t('pwa.settings')}
      />
      {/* Profile */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', marginTop: 6,
        borderTop: '1px solid var(--card-border)',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 999, background: 'var(--accent-grad)',
          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 12,
        }}>{profileName.charAt(0).toUpperCase()}</div>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--fg)' }}>{profileName}</div>
          <div style={{ fontSize: 10.5, color: 'var(--fg-muted)' }}>Personal</div>
        </div>
      </div>
    </aside>
  );
}

// ─── Page header (sticky, blurs on scroll) ────────────────────────────────────
function PageHeader({ title, subtitle, scrolled }: { title: string; subtitle?: string; scrolled: boolean }) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 10,
      padding: '20px 32px 16px',
      background: scrolled ? 'var(--topbar-scrolled)' : 'var(--bg)',
      backdropFilter: scrolled ? 'blur(18px) saturate(140%)' : 'none',
      WebkitBackdropFilter: scrolled ? 'blur(18px) saturate(140%)' : 'none',
      borderBottom: `1px solid ${scrolled ? 'var(--card-border)' : 'transparent'}`,
      transition: 'all 0.2s',
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--fg)', letterSpacing: -0.5 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 3 }}>{subtitle}</div>}
    </div>
  );
}

// ─── Mobile tab bar ───────────────────────────────────────────────────────────
function MobileTabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const { t } = useI18n();
  const allTabs: Array<{ id: Tab; labelKey: string; Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>; primary?: boolean }> = [
    { id: 'dashboard', labelKey: 'tab.dashboard', Icon: LayoutDashboard },
    { id: 'portfolio', labelKey: 'tab.portfolio', Icon: BookOpen },
    { id: 'add',       labelKey: 'tab.add',       Icon: Plus, primary: true },
    { id: 'scan',      labelKey: 'tab.scan',      Icon: ScanLine },
    { id: 'settings',  labelKey: 'pwa.settings',  Icon: Settings },
  ];
  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0,
      paddingBottom: 16, paddingTop: 6, paddingLeft: 8, paddingRight: 8,
      background: 'var(--tabbar-bg)', backdropFilter: 'blur(20px) saturate(160%)',
      WebkitBackdropFilter: 'blur(20px) saturate(160%)',
      borderTop: '1px solid var(--card-border)', zIndex: 70,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around',
    }}>
      {allTabs.map(({ id, labelKey, Icon, primary }) => {
        const active = tab === id;
        const lbl = t(labelKey as Parameters<typeof t>[0]);
        if (primary) return (
          <button key={id} onClick={() => onChange(id)} aria-label={lbl} style={{
            width: 52, height: 52, borderRadius: 18, background: 'var(--accent-grad)',
            border: 'none', cursor: 'pointer', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 20px var(--accent-shadow)', marginTop: -10,
          }}><Icon size={22} strokeWidth={2.4} /></button>
        );
        return (
          <button key={id} onClick={() => onChange(id)} aria-label={lbl} style={{
            flex: 1, padding: '6px 4px', background: 'transparent', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            color: active ? 'var(--accent-solid)' : 'var(--fg-muted)',
          }}>
            <Icon size={20} strokeWidth={active ? 2.4 : 1.9} />
            <span style={{ fontSize: 9.5, fontWeight: 600 }}>{lbl}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '40px 0', color: 'var(--fg-muted)', fontSize: 13 }}>
      <div style={{
        width: 20, height: 20, borderRadius: 999,
        border: '2px solid var(--accent-soft)', borderTopColor: 'var(--accent-solid)',
        animation: 'spin 0.8s linear infinite',
      }} />
      {label}
    </div>
  );
}

// ─── Settings panel ───────────────────────────────────────────────────────────
function SegmentedControl({ options, value, onChange }: {
  options: { value: string; label: string }[];
  value: string; onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 4, background: 'var(--pill-bg)', borderRadius: 10, padding: 3 }}>
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)} style={{
          padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
          fontSize: 12, fontWeight: 700,
          background: value === o.value ? 'var(--card-bg)' : 'transparent',
          color: value === o.value ? 'var(--fg)' : 'var(--fg-muted)',
          boxShadow: value === o.value ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
        }}>{o.label}</button>
      ))}
    </div>
  );
}

function SettingsPanel({ lastSynced, userCards, cards, onImport }: {
  lastSynced: string | null;
  userCards: UserCard[]; cards: Card[]; onImport: (c: UserCard[]) => void;
}) {
  const { t, locale, setLocale } = useI18n();
  return (
    <div style={{ maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 16, padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', marginBottom: 14 }}>{t('pwa.settings')}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid var(--card-border)' }}>
          <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Sprache / Language</span>
          <SegmentedControl
            options={[{ value: 'de', label: 'DE' }, { value: 'en', label: 'EN' }]}
            value={locale}
            onChange={(v) => setLocale(v as 'de' | 'en')}
          />
        </div>
        {lastSynced && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{t('app.synced')}</span>
            <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
              {new Date(lastSynced).toLocaleString(locale === 'de' ? 'de-DE' : 'en-US')}
            </span>
          </div>
        )}
      </div>
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 16, padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', marginBottom: 14 }}>Import / Export</div>
        <Suspense fallback={<Spinner label={t('loading')} />}>
          <ExcelImport onImport={onImport} userCards={userCards} cards={cards} />
        </Suspense>
      </div>
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 16, padding: 20 }}>
        <div style={{ fontSize: 11, color: 'var(--fg-muted)', lineHeight: 1.7 }}>{t('footer')}</div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export function App() {
  const { rows, cards, userCards, loading, error, lastSynced, setUserCards } = usePortfolioData();
  const { t, locale } = useI18n();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [detailRow, setDetailRow] = useState<PortfolioRow | null>(null);
  const [editCard, setEditCard] = useState<UserCard | null>(null);
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 900);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    Object.entries(DARK_VARS).forEach(([k, v]) => root.style.setProperty(k, v));
  }, []);

  useEffect(() => {
    const fn = () => setIsDesktop(window.innerWidth >= 900);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  const total = totalPortfolioValue(rows);
  const currency = rows[0]?.currency ?? 'EUR';
  const cardCount = rows.reduce((s, r) => s + r.userCard.quantity, 0);

  const handleAddCard = useCallback((card: UserCard) => {
    setUserCards(addUserCard(userCards, card));
    setTab('portfolio');
  }, [userCards, setUserCards]);

  const handleUpdateCard = useCallback((card: UserCard) => {
    setUserCards(updateUserCard(userCards, card));
    setEditCard(null); setDetailRow(null); setTab('portfolio');
  }, [userCards, setUserCards]);

  const handleDeleteCard = useCallback((id: string) => {
    setUserCards(deleteUserCard(userCards, id));
    setDetailRow(null);
  }, [userCards, setUserCards]);

  const handleImport = useCallback((imported: UserCard[]) => {
    let updated = [...userCards];
    for (const card of imported) updated = addUserCard(updated, card);
    setUserCards(updated);
  }, [userCards, setUserCards]);

  const handleScanDetected = useCallback((card: Card) => {
    setEditCard({ id: '', cardId: card.id, owner: '', condition: 'NM', variant: 'holofoil', quantity: 1, addedAt: new Date().toISOString() });
    setTab('add');
  }, []);

  const pageTitle = useMemo(() => {
    switch (tab) {
      case 'dashboard': return t('tab.dashboard');
      case 'portfolio': return t('tab.portfolio');
      case 'add': return editCard?.id ? t('form.editTitle') : t('form.addTitle');
      case 'scan': return t('tab.scan');
      case 'settings': return t('pwa.settings');
    }
  }, [tab, editCard, t]);

  const pageSubtitle = useMemo(() => {
    if (tab === 'portfolio')
      return `${rows.length} ${t('app.cards')}${lastSynced ? ` · ${t('app.synced')} ${new Date(lastSynced).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US')}` : ''}`;
    return undefined;
  }, [tab, rows.length, lastSynced, locale, t]);

  const padX = isDesktop ? '0 32px 64px' : '0 16px 96px';

  const screenContent = (
    <div
      style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden' }}
      onScroll={(e) => setScrolled((e.currentTarget as HTMLDivElement).scrollTop > 8)}
    >
      <PageHeader title={pageTitle} subtitle={pageSubtitle} scrolled={scrolled} />
      <div style={{ padding: padX }}>
        {loading && <Spinner label={t('loading')} />}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 14, padding: '12px 16px', color: '#FCA5A5', fontSize: 13, marginBottom: 16,
          }}>
            <AlertTriangle size={15} style={{ marginTop: 1, flexShrink: 0 }} />
            {error}
          </div>
        )}
        {!loading && !error && (
          <>
            {tab === 'dashboard' && <Dashboard rows={rows} />}
            {tab === 'portfolio' && (
              rows.length > 0
                ? <CardTable rows={rows} onRowClick={setDetailRow} />
                : (
                  <div style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--fg-muted)' }}>
                    <BookOpen size={44} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                    <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>{t('empty.title')}</p>
                    <button onClick={() => setTab('add')} style={{
                      padding: '10px 22px', borderRadius: 12, border: 'none', cursor: 'pointer',
                      background: 'var(--accent-grad)', color: 'white', fontWeight: 700, fontSize: 14,
                    }}>{t('empty.addCard')}</button>
                  </div>
                )
            )}
            {tab === 'add' && (
              <div style={{ maxWidth: 640 }}>
                <CardForm
                  cards={cards}
                  onSubmit={editCard?.id ? handleUpdateCard : handleAddCard}
                  onCancel={() => { setEditCard(null); setTab('portfolio'); }}
                  editCard={editCard}
                />
              </div>
            )}
            {tab === 'scan' && (
              <div style={{ maxWidth: 560 }}>
                <Suspense fallback={<Spinner label={t('loading')} />}>
                  <OcrScanner cards={cards} onCardDetected={handleScanDetected} />
                </Suspense>
              </div>
            )}
            {tab === 'settings' && (
              <SettingsPanel
                lastSynced={lastSynced}
                userCards={userCards} cards={cards} onImport={handleImport}
              />
            )}
          </>
        )}
      </div>
    </div>
  );

  const modals = (
    <>
      {detailRow && (
        <CardDetail
          row={detailRow}
          onClose={() => setDetailRow(null)}
          onEdit={() => { setEditCard(detailRow.userCard); setDetailRow(null); setTab('add'); }}
          onDelete={() => handleDeleteCard(detailRow.userCard.id)}
        />
      )}
      <PwaInstallBanner />
    </>
  );

  if (isDesktop) {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', background: 'var(--bg)', color: 'var(--fg)', overflow: 'hidden' }}>
        <Sidebar tab={tab} onChange={setTab} total={total} currency={currency} cardCount={cardCount} />
        <main style={{ flex: 1, position: 'relative', overflow: 'hidden', borderLeft: '1px solid var(--card-border)' }}>
          {screenContent}
        </main>
        {modals}
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', width: '100vw', background: 'var(--bg)', color: 'var(--fg)', position: 'relative', overflow: 'hidden' }}>
      {screenContent}
      <MobileTabBar tab={tab} onChange={setTab} />
      {modals}
    </div>
  );
}
