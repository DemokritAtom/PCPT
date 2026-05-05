// PWA Dashboard screen — matches the UIUX design exactly

import { useState, useMemo, useRef, useCallback } from 'react';
import { Icons } from './icons';
import { Pill, PwaCard, Sparkline, CardThumb, TopBar, SectionLabel } from './ui';
import { fmtMoney, fmtMoneySigned, fmtPct, type PwaRow } from './utils';
import type { TranslationFn } from './types';

interface DashboardProps {
  rows: PwaRow[];
  currency: string;
  t: TranslationFn;
  onRowClick: (row: PwaRow) => void;
  onTotalClick: () => void;
}

export function PwaDashboard({ rows, currency, t, onRowClick, onTotalClick }: DashboardProps) {
  const [scrolled, setScrolled] = useState(false);

  const total        = rows.reduce((s, r) => s + r.value, 0);
  const totalCost    = rows.reduce((s, r) => s + r.cost, 0);
  const change24h    = rows.reduce((s, r) => s + r.price.change24h * r.uc.quantity, 0);
  const cardCount    = rows.reduce((s, r) => s + r.uc.quantity, 0);
  const allTimePnl   = total - totalCost;
  const allTimePct   = totalCost > 0 ? (allTimePnl / totalCost) * 100 : 0;

  // 30-day total history
  const totalHistory = useMemo(() => {
    const len = 31;
    const series = Array<number>(len).fill(0);
    rows.forEach(r => {
      r.history.forEach((p, i) => { if (i < len) series[i] = (series[i] ?? 0) + p * r.uc.quantity; });
    });
    return series;
  }, [rows]);

  const sortedByCh = [...rows].sort((a, b) => b.price.change24h - a.price.change24h);
  const cotd     = sortedByCh[0] ?? null;
  const cotdPct  = cotd ? (cotd.price.change24h / (cotd.price.trend || 1)) * 100 : 0;
  const gainers  = [...rows].filter(r => r.price.change24h > 0).sort((a, b) => b.price.change24h - a.price.change24h).slice(0, 3);
  const losers   = [...rows].filter(r => r.price.change24h < 0).sort((a, b) => a.price.change24h - b.price.change24h).slice(0, 3);
  const topCards = [...rows].sort((a, b) => b.value - a.value).slice(0, 4);

  return (
    <div
      onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 8)}
      style={{ height: '100%', overflow: 'auto' }}
    >
      <TopBar title={t('pwa.dashboard')} scrolled={scrolled}/>

      <div style={{ padding: '4px 16px 24px' }}>
        {/* Hero total */}
        <HeroTotal
          total={total} change24h={change24h} pnl={allTimePnl}
          pct={allTimePct} cardCount={cardCount}
          totalHistory={totalHistory} currency={currency} t={t}
          onClick={onTotalClick}
        />

        {/* Card of the day */}
        {cotd && (
          <CardOfDay row={cotd} pct={cotdPct} currency={currency} t={t} onClick={() => onRowClick(cotd)}/>
        )}

        {/* Today's movers */}
        <SectionLabel>{t('pwa.todayMovers')}</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <MoverCard label={t('pwa.gainers')} rows={gainers} up currency={currency} onClick={onRowClick}/>
          <MoverCard label={t('pwa.losers')} rows={losers} currency={currency} onClick={onRowClick}/>
        </div>

        {/* Most valuable */}
        <SectionLabel style={{ marginTop: 22 }}>{t('pwa.mostValuable')}</SectionLabel>
        {topCards.length > 0 && (
          <PwaCard padding={6} style={{ overflow: 'hidden' }}>
            {topCards.map((r, i) => (
              <ValueRow
                key={r.uc.id} row={r} rank={i + 1} currency={currency}
                onClick={() => onRowClick(r)} last={i === topCards.length - 1}
              />
            ))}
          </PwaCard>
        )}

        {/* Activity ticker */}
        <SectionLabel style={{ marginTop: 22 }}>{t('pwa.activity')}</SectionLabel>
        <PwaCard padding={14}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ActivityRow
              icon={<Icons.TrendingUp size={14}/>} tone="up"
              text="Daily price sync completed"
              time="6h ago"
            />
            <ActivityRow
              icon={<Icons.Spark size={14}/>} tone="accent"
              text={`${cardCount} ${t('pwa.cards')} in portfolio`}
              time="now"
            />
          </div>
        </PwaCard>
      </div>
    </div>
  );
}

// ── Hero Total ─────────────────────────────────────────────────────────────────

function HeroTotal({
  total, change24h, pnl, pct, cardCount, totalHistory, currency, t, onClick,
}: {
  total: number; change24h: number; pnl: number; pct: number;
  cardCount: number; totalHistory: number[]; currency: string; t: TranslationFn; onClick: () => void;
}) {
  const up = change24h >= 0;
  return (
    <div onClick={onClick} style={{
      borderRadius: 22, padding: 20, marginBottom: 16,
      background: 'var(--accent-grad)',
      color: 'white', position: 'relative', overflow: 'hidden',
      boxShadow: '0 12px 32px var(--accent-shadow)',
      cursor: 'pointer',
    }}>
      {/* Decorative blob */}
      <div style={{
        position: 'absolute', right: -40, top: -40, width: 180, height: 180,
        borderRadius: 999, background: 'rgba(255,255,255,0.12)', filter: 'blur(20px)',
      }}/>
      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.85, letterSpacing: 0.3, textTransform: 'uppercase' }}>
          {t('pwa.totalValue')}
        </div>
        <div style={{ fontSize: 38, fontWeight: 800, marginTop: 4, letterSpacing: -0.8, lineHeight: 1 }}>
          {fmtMoney(total, currency)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 13, fontWeight: 600 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            background: 'rgba(255,255,255,0.22)', padding: '3px 8px', borderRadius: 999,
          }}>
            {up ? <Icons.ArrowUp size={12} stroke={2.5}/> : <Icons.ArrowDown size={12} stroke={2.5}/>}
            {fmtMoneySigned(change24h, currency)}
          </span>
          <span style={{ opacity: 0.85 }}>{t('pwa.today')}</span>
          <span style={{ marginLeft: 'auto', opacity: 0.85, fontSize: 12 }}>
            {cardCount} {t('pwa.cards')}
          </span>
        </div>

        {/* Sparkline */}
        <div style={{ marginTop: 14, marginLeft: -4, marginRight: -4 }}>
          <Sparkline
            data={totalHistory} w={342} h={56}
            color="rgba(255,255,255,0.95)"
            fillFrom="rgba(255,255,255,0.5)"
            fillTo="rgba(255,255,255,0)"
            dot={false}
          />
        </div>

        {/* Footer stats */}
        <div style={{
          marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.18)',
          display: 'flex', gap: 24, fontSize: 12,
        }}>
          <div>
            <div style={{ opacity: 0.75 }}>{t('pwa.allTime')}</div>
            <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>
              {fmtMoneySigned(pnl, currency)} <span style={{ opacity: 0.85 }}>({fmtPct(pct)})</span>
            </div>
          </div>
          <div>
            <div style={{ opacity: 0.75 }}>{t('pwa.range30d')}</div>
            <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>
              {fmtMoney(Math.min(...totalHistory.filter(v => v > 0), total), currency)} –{' '}
              {fmtMoney(Math.max(...totalHistory, total), currency)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Card of the Day ────────────────────────────────────────────────────────────

function CardOfDay({ row, pct, currency, t, onClick }: {
  row: PwaRow; pct: number; currency: string; t: TranslationFn; onClick: () => void;
}) {
  return (
    <PwaCard onClick={onClick} padding={14} style={{ marginBottom: 22, position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 88% 35%, var(--accent-soft), transparent 60%)',
        pointerEvents: 'none',
      }}/>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icons.Sparkle size={14} style={{ color: 'var(--accent-solid)' }}/>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: 'var(--accent-solid)' }}>
            {t('pwa.cardOfDay')}
          </div>
        </div>
        <Pill tone="up">▲ {pct.toFixed(1)}%</Pill>
      </div>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', position: 'relative' }}>
        <CardThumb img={row.card.img} name={row.card.name} w={72} radius={8} glow/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)', letterSpacing: -0.2 }}>
            {row.card.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>
            {row.card.set} · #{row.card.number}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--fg)', letterSpacing: -0.5 }}>
              {fmtMoney(row.price.trend, currency)}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--up)' }}>
              {fmtMoneySigned(row.price.change24h, currency)}
            </div>
          </div>
        </div>
      </div>
    </PwaCard>
  );
}

// ── Mover Card ─────────────────────────────────────────────────────────────────

function MoverCard({ label, rows, up, currency, onClick }: {
  label: string; rows: PwaRow[]; up?: boolean; currency: string; onClick: (r: PwaRow) => void;
}) {
  return (
    <PwaCard padding={12} style={{ minHeight: 158 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        {up
          ? <Icons.TrendingUp size={13} style={{ color: 'var(--up)' }}/>
          : <Icons.TrendingDown size={13} style={{ color: 'var(--down)' }}/>
        }
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg)' }}>{label}</div>
      </div>
      {rows.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>—</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map(r => (
            <div
              key={r.uc.id}
              onClick={() => onClick(r)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
            >
              <CardThumb img={r.card.img} name={r.card.name} w={28} radius={4}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12, fontWeight: 600, color: 'var(--fg)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{r.card.name}</div>
                <div style={{ fontSize: 10, color: r.price.change24h >= 0 ? 'var(--up)' : 'var(--down)', fontWeight: 700 }}>
                  {fmtMoneySigned(r.price.change24h, currency)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PwaCard>
  );
}

// ── Value Row ──────────────────────────────────────────────────────────────────

function ValueRow({ row, rank, currency, onClick, last }: {
  row: PwaRow; rank: number; currency: string; onClick: () => void; last: boolean;
}) {
  const up = row.pnl >= 0;
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 10px',
        borderBottom: last ? 'none' : '1px solid var(--card-border)',
        cursor: 'pointer',
      }}
    >
      <div style={{
        width: 22, height: 22, borderRadius: 7, fontSize: 11, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--pill-bg)', color: 'var(--fg-muted)',
      }}>{rank}</div>
      <CardThumb img={row.card.img} name={row.card.name} w={36} radius={5}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {row.card.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 1 }}>
          {row.card.set} · {row.uc.condition} · ×{row.uc.quantity}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>{fmtMoney(row.value, currency)}</div>
        <div style={{ fontSize: 11, color: up ? 'var(--up)' : 'var(--down)', fontWeight: 600 }}>{fmtPct(row.pnlPct)}</div>
      </div>
    </div>
  );
}

// ── Activity Row ───────────────────────────────────────────────────────────────

type ActivityTone = 'up' | 'down' | 'accent' | 'default';

function ActivityRow({ icon, tone, text, time }: { icon: React.ReactNode; tone: ActivityTone; text: string; time: string }) {
  const tones: Record<ActivityTone, { bg: string; fg: string }> = {
    up:      { bg: 'rgba(34,197,94,0.16)',  fg: 'var(--up)' },
    down:    { bg: 'rgba(239,68,68,0.16)',  fg: 'var(--down)' },
    accent:  { bg: 'var(--accent-soft)',    fg: 'var(--accent-solid)' },
    default: { bg: 'var(--pill-bg)',        fg: 'var(--fg-muted)' },
  };
  const t = tones[tone];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 9, flexShrink: 0,
        background: t.bg, color: t.fg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{icon}</div>
      <div style={{ flex: 1, fontSize: 13, color: 'var(--fg)' }}>{text}</div>
      <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{time}</div>
    </div>
  );
}

// ── Total Chart Screen (fullscreen, exported for PwaApp) ───────────────────────

type ChartRange = '1W' | '1M' | '3M' | 'MAX';
const CHART_RANGES: ChartRange[] = ['1W', '1M', '3M', 'MAX'];

/** Simple linear forecast: last N points → linear regression → next M days */
function linearForecast(data: number[], forecastDays = 30): number[] {
  const n = Math.min(data.length, 30);
  const slice = data.slice(-n);
  if (slice.length < 2) return Array(forecastDays + 1).fill(data[data.length - 1] ?? 0);
  const xMean = (n - 1) / 2;
  const yMean = slice.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  slice.forEach((y, i) => { num += (i - xMean) * (y - yMean); den += (i - xMean) ** 2; });
  const slope = den === 0 ? 0 : num / den;
  const last = data[data.length - 1] ?? 0;
  return Array.from({ length: forecastDays + 1 }, (_, i) => Math.max(0, last + slope * i));
}

/** Format date relative to today */
function fmtDateLabel(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')}.${String(d.getFullYear()).slice(2)}`;
}

export interface TotalChartData {
  totalHistory: number[];
  total: number;
  pnl: number;
  pct: number;
}

export function TotalChartScreen({
  totalHistory, total, pnl, pct, currency, onClose,
}: TotalChartData & { currency: string; t: TranslationFn; onClose: () => void }) {
  const [chartRange, setChartRange] = useState<ChartRange>('1M');
  const [hoverIdx, setHoverIdx]     = useState<number | null>(null);
  const [showForecast, setShowForecast] = useState(true);
  const svgRef  = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const getSlice = useCallback((r: ChartRange): number[] => {
    switch (r) {
      case '1W': return totalHistory.slice(-7);
      case '1M': return totalHistory.slice(-31);
      case '3M': return totalHistory.slice(-90);
      default:   return totalHistory;
    }
  }, [totalHistory]);

  const histData = useMemo(() => {
    const raw = getSlice(chartRange);
    const d = raw.length > 0 ? raw : [total];
    return d.length < 2 ? [...d, total] : d;
  }, [chartRange, getSlice, total]);

  const forecast = useMemo(() => linearForecast(histData, 30), [histData]);

  const allVals = showForecast ? [...histData, ...forecast] : histData;
  const rawMin = Math.min(...allVals);
  const rawMax = Math.max(...allVals);
  const pad  = (rawMax - rawMin) * 0.12 || rawMax * 0.05 || 1;
  const minV = rawMin - pad;
  const maxV = rawMax + pad;
  const span = maxV - minV || 1;

  // SVG coordinate space — no left padding; Y-labels are HTML
  const W = 500, H = 220;
  function toY(v: number) { return H - ((v - minV) / span) * (H - 8) - 4; }
  function toX(i: number, n: number) { return (i / (n - 1)) * W; }

  const histPts: [number, number][] = histData.map((v, i) => [toX(i, histData.length), toY(v)]);
  const histPath = histPts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const histArea = `${histPath} L${W} ${H} L0 ${H} Z`;

  const fStartX = toX(histData.length - 1, histData.length);
  const forecastPts: [number, number][] = forecast.map((v, i) => [
    fStartX + (i / (forecast.length - 1)) * (W - fStartX),
    toY(v),
  ]);
  const forecastPath = forecastPts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const forecastArea = `${forecastPath} L${W} ${H} L${fStartX.toFixed(1)} ${H} Z`;

  const hoverPt  = hoverIdx !== null ? (histPts[hoverIdx] ?? null) : null;
  const hoverVal = hoverIdx !== null ? (histData[hoverIdx] ?? null) : null;
  const daysAgo  = hoverIdx !== null ? histData.length - 1 - hoverIdx : 0;
  const up = pnl >= 0;

  function getIdxFromX(clientX: number): number {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return histData.length - 1;
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(frac * (histData.length - 1));
  }

  // Y-axis ticks (5 levels, top→bottom)
  const yTicks = Array.from({ length: 5 }, (_, i) => maxV - (span * i) / 4);

  // X-axis date labels — 5 evenly spaced
  const totalDays = histData.length - 1;
  const X_COUNT = Math.min(5, histData.length);
  const xLabels = Array.from({ length: X_COUNT }, (_, i) => {
    const idx = Math.round((i / (X_COUNT - 1)) * (histData.length - 1));
    return { pct: idx / (histData.length - 1) * 100, label: fmtDateLabel(totalDays - idx) };
  });

  const forecastEnd   = forecast[forecast.length - 1] ?? total;
  const forecastDelta = forecastEnd - total;
  const forecastUp    = forecastDelta >= 0;

  // Tooltip position (HTML overlay)
  const tooltipLeft = hoverPt
    ? `${Math.max(5, Math.min(85, (hoverPt[0] / W) * 100 - 8))}%`
    : '0';
  const tooltipTop = hoverPt
    ? `${Math.max(4, (hoverPt[1] / H) * 100 - 14)}%`
    : '0';

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 90,
      background: 'var(--bg)', display: 'flex', flexDirection: 'column',
      animation: 'slideUp 0.22s cubic-bezier(0.2,0.9,0.3,1)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 20px 12px',
        paddingTop: 'calc(14px + env(safe-area-inset-top, 0px))',
        borderBottom: '1px solid var(--card-border)',
        background: 'var(--bg)',
        flexShrink: 0,
      }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: 999, border: 'none',
          background: 'var(--pill-bg)', color: 'var(--fg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          flexShrink: 0,
        }}><Icons.ChevronLeft size={18}/></button>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--fg)', letterSpacing: -0.3 }}>
            Portfolio-Wert
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
            Historische Entwicklung &amp; Prognose
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 16px 32px' }}>

        {/* Big value */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 40, fontWeight: 900, color: 'var(--fg)', letterSpacing: -1, lineHeight: 1 }}>
            {fmtMoney(hoverVal ?? total, currency)}
          </div>
          {hoverIdx !== null ? (
            <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 5, fontWeight: 600 }}>
              {daysAgo === 0 ? 'Heute' : `${fmtDateLabel(daysAgo)} (vor ${daysAgo} Tag${daysAgo === 1 ? '' : 'en'})`}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: 999, fontSize: 13, fontWeight: 700,
                background: up ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                color: up ? 'var(--up)' : 'var(--down)',
              }}>
                {up ? <Icons.ArrowUp size={13} stroke={2.5}/> : <Icons.ArrowDown size={13} stroke={2.5}/>}
                {fmtMoneySigned(pnl, currency)} ({fmtPct(pct)})
              </span>
              <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Gesamt (all-time)</span>
            </div>
          )}
        </div>

        {/* Range + forecast toggle */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {CHART_RANGES.map(r => (
            <button key={r} onClick={() => { setChartRange(r); setHoverIdx(null); }} style={{
              padding: '7px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: chartRange === r ? 'var(--accent-grad)' : 'var(--pill-bg)',
              color: chartRange === r ? 'white' : 'var(--fg-muted)',
              border: 'none', cursor: 'pointer',
              boxShadow: chartRange === r ? '0 4px 12px var(--accent-shadow)' : 'none',
            }}>{r}</button>
          ))}
          <div style={{ flex: 1 }}/>
          <button onClick={() => setShowForecast(f => !f)} style={{
            padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700,
            background: showForecast ? 'rgba(251,146,60,0.18)' : 'var(--pill-bg)',
            color: showForecast ? '#FB923C' : 'var(--fg-muted)',
            border: showForecast ? '1px solid rgba(251,146,60,0.4)' : '1px solid var(--card-border)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <Icons.TrendingUp size={13}/>
            Prognose
          </button>
        </div>

        {/* Main chart card */}
        <div style={{
          background: 'var(--card-bg)', borderRadius: 20,
          border: '1px solid var(--card-border)',
          padding: '14px 12px 6px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
          marginBottom: 14,
        }}>
          {/* Chart body: Y-labels + SVG side by side */}
          <div style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>

            {/* Y-axis labels column (HTML — never distorted) */}
            <div style={{
              width: 56, flexShrink: 0, display: 'flex', flexDirection: 'column',
              justifyContent: 'space-between', paddingBottom: 2,
            }}>
              {yTicks.map((v, i) => (
                <div key={i} style={{
                  fontSize: 10, fontWeight: 600,
                  color: 'var(--fg-muted)', textAlign: 'right', paddingRight: 8,
                  lineHeight: 1,
                }}>
                  {fmtMoney(v, currency).replace(/\s/g, '')}
                </div>
              ))}
            </div>

            {/* SVG — only paths + grid lines + hover dot, NO text */}
            <div ref={wrapRef} style={{ flex: 1, position: 'relative' }}>
              <svg
                ref={svgRef}
                viewBox={`0 0 ${W} ${H}`}
                preserveAspectRatio="none"
                style={{ width: '100%', height: 220, display: 'block', touchAction: 'none', cursor: 'crosshair' }}
                onMouseMove={(e) => setHoverIdx(getIdxFromX(e.clientX))}
                onMouseLeave={() => setHoverIdx(null)}
                onTouchMove={(e) => { e.preventDefault(); const t0 = e.touches[0]; if (t0) setHoverIdx(getIdxFromX(t0.clientX)); }}
                onTouchEnd={() => setHoverIdx(null)}
              >
                <defs>
                  <linearGradient id="hist-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-solid)" stopOpacity="0.38"/>
                    <stop offset="100%" stopColor="var(--accent-solid)" stopOpacity="0.02"/>
                  </linearGradient>
                  <linearGradient id="fore-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FB923C" stopOpacity="0.22"/>
                    <stop offset="100%" stopColor="#FB923C" stopOpacity="0.02"/>
                  </linearGradient>
                </defs>

                {/* Horizontal grid lines at Y-ticks */}
                {yTicks.map((v, i) => (
                  <line key={i} x1={0} y1={toY(v)} x2={W} y2={toY(v)}
                    stroke="var(--card-border)" strokeWidth="1"
                    strokeDasharray={i === yTicks.length - 1 ? '0' : '4 3'}/>
                ))}

                {/* Forecast */}
                {showForecast && <>
                  <path d={forecastArea} fill="url(#fore-fill)"/>
                  <path d={forecastPath} fill="none" stroke="#FB923C" strokeWidth="2"
                    strokeDasharray="6 4" strokeLinecap="round" strokeLinejoin="round" opacity="0.85"/>
                </>}

                {/* "Heute" divider */}
                {showForecast && (
                  <line x1={fStartX} y1={0} x2={fStartX} y2={H}
                    stroke="var(--fg-muted)" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.45"/>
                )}

                {/* History */}
                <path d={histArea} fill="url(#hist-fill)"/>
                <path d={histPath} fill="none" stroke="var(--accent-solid)" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round"/>

                {/* Hover crosshair + dot */}
                {hoverPt && <>
                  <line x1={hoverPt[0]} y1={0} x2={hoverPt[0]} y2={H}
                    stroke="var(--accent-solid)" strokeWidth="1" strokeDasharray="4 3" opacity="0.55"/>
                  <circle cx={hoverPt[0]} cy={hoverPt[1]} r="5.5" fill="var(--accent-solid)" stroke="var(--bg)" strokeWidth="2.5"/>
                </>}
              </svg>

              {/* Hover tooltip — HTML overlay (no SVG text distortion) */}
              {hoverPt && hoverVal !== null && (
                <div style={{
                  position: 'absolute', top: tooltipTop, left: tooltipLeft,
                  background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                  borderRadius: 10, padding: '5px 10px',
                  fontSize: 12, fontWeight: 700, color: 'var(--fg)',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
                  pointerEvents: 'none', whiteSpace: 'nowrap',
                }}>
                  {fmtMoney(hoverVal, currency)}
                </div>
              )}

              {/* "Heute" label */}
              {showForecast && (
                <div style={{
                  position: 'absolute', top: 6, fontSize: 10, fontWeight: 700,
                  color: 'var(--fg-muted)', pointerEvents: 'none',
                  left: `${(fStartX / W) * 100 + 0.5}%`,
                }}>
                  Heute
                </div>
              )}
            </div>
          </div>

          {/* X-axis date labels (HTML — always crisp) */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            paddingLeft: 56, paddingTop: 8, paddingBottom: 4,
          }}>
            {xLabels.map(({ label }, i) => (
              <div key={i} style={{
                fontSize: 10, fontWeight: 600, color: 'var(--fg-muted)',
                textAlign: i === 0 ? 'left' : i === xLabels.length - 1 ? 'right' : 'center',
                flex: 1,
              }}>
                {label}
              </div>
            ))}
          </div>

          {/* Forecast date label */}
          {showForecast && (
            <div style={{ paddingLeft: 56, paddingBottom: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 10, color: '#FB923C', fontWeight: 600 }}>
                +30 Tage: {fmtDateLabel(-30)}
              </div>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
          {[
            { label: 'Min', value: fmtMoney(Math.min(...histData), currency) },
            { label: 'Max', value: fmtMoney(Math.max(...histData), currency) },
            { label: 'Ø Ø-Wert', value: fmtMoney(histData.reduce((a, b) => a + b, 0) / histData.length, currency) },
          ].map(({ label, value }) => (
            <div key={label} style={{
              background: 'var(--card-bg)', borderRadius: 14, padding: '12px 12px',
              border: '1px solid var(--card-border)', textAlign: 'center',
            }}>
              <div style={{ fontSize: 10, color: 'var(--fg-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                {label}
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--fg)', marginTop: 3 }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Forecast explanation card */}
        {showForecast && (
          <div style={{
            background: 'var(--card-bg)', borderRadius: 18, padding: '16px 16px',
            border: '1px solid rgba(251,146,60,0.3)',
            boxShadow: '0 4px 16px rgba(251,146,60,0.08)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 10,
                background: 'rgba(251,146,60,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icons.TrendingUp size={15} style={{ color: '#FB923C' }}/>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>30-Tage Prognose</div>
                <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                  Lineare Trendfortschreibung · nicht verbindlich
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#FB923C', letterSpacing: -0.5 }}>
                {fmtMoney(forecastEnd, currency)}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: forecastUp ? 'var(--up)' : 'var(--down)' }}>
                {forecastUp ? '+' : ''}{fmtMoney(forecastDelta, currency)}{' '}
                ({forecastUp ? '+' : ''}{((forecastDelta / (total || 1)) * 100).toFixed(1)}%)
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 8, lineHeight: 1.5 }}>
              Basiert auf dem linearen Trend der letzten 30 Tage. Keine Anlageberatung.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

