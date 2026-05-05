// PWA Add Card screen — live API search (all pokemontcg.io cards) + clean form

import { useState, useEffect, useRef } from 'react';
import { Icons } from './icons';
import {
  CardThumb, TopBar, GradientButton, Section, inputStyle,
} from './ui';
import { fmtMoney, getCardPrice } from './utils';
import { searchCardsApi } from '@/lib/pokemon-api';
import type { TranslationFn } from './types';
import type { Card, UserCard, Condition, CardVariant } from '@/lib/types';

interface AddCardProps {
  cards?: Card[];  // not used anymore, kept for compat
  currency: string;
  t: TranslationFn;
  prefilledCard?: Card | null;
  editCard?: UserCard | null;
  onSave: (card: UserCard) => void;
  onCancel: () => void;
}

const CONDITIONS: { k: Condition; l: string }[] = [
  { k: 'NM',  l: 'Near Mint' },
  { k: 'LP',  l: 'Light Play' },
  { k: 'MP',  l: 'Moderate' },
  { k: 'HP',  l: 'Heavy' },
  { k: 'DMG', l: 'Beschädigt' },
];

const VARIANTS: { k: CardVariant; l: string }[] = [
  { k: 'normal',        l: 'Normal' },
  { k: 'holofoil',      l: 'Holo' },
  { k: 'reverseHolofoil', l: 'Reverse' },
];

export function PwaAddCard({ currency, t, prefilledCard, editCard, onSave, onCancel }: AddCardProps) {
  const [scrolled, setScrolled]     = useState(false);
  const [query, setQuery]           = useState('');
  const [selected, setSelected]     = useState<Card | null>(prefilledCard ?? null);
  const [results, setResults]       = useState<Card[]>([]);
  const [loading, setLoading]       = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState({
    quantity:      editCard?.quantity ?? 1,
    condition:     (editCard?.condition ?? 'NM') as Condition,
    variant:       (editCard?.variant ?? 'holofoil') as CardVariant,
    owner:         editCard?.owner ?? '',
    purchasePrice: editCard?.purchasePrice?.toString() ?? '',
    purchaseDate:  editCard?.purchaseDate ?? new Date().toISOString().slice(0, 10),
  });

  // Live API search with debounce
  useEffect(() => {
    if (selected) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const { cards, totalCount } = await searchCardsApi(query.trim(), 20);
        // Sort alphabetically by name, then by set name
        const sorted = [...cards].sort((a, b) =>
          a.name.localeCompare(b.name, 'de') || a.set.name.localeCompare(b.set.name, 'de')
        );
        setResults(sorted);
        setTotalCount(totalCount);
      } catch {
        setResults([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, selected]);

  function pickCard(c: Card) {
    setSelected(c);
    setQuery('');
    setResults([]);
  }

  function handleSave() {
    if (!selected) return;
    const card: UserCard = {
      id:            editCard?.id ?? crypto.randomUUID(),
      cardId:        selected.id,
      owner:         form.owner,
      condition:     form.condition,
      variant:       form.variant,
      quantity:      form.quantity,
      purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice) : undefined,
      purchaseDate:  form.purchaseDate || undefined,
      addedAt:       editCard?.addedAt ?? new Date().toISOString(),
    };
    onSave(card);
  }

  const canSave = !!selected && form.quantity > 0;

  return (
    <div
      onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 8)}
      style={{ height: '100%', overflow: 'auto', position: 'relative' }}
    >
      <TopBar title={t('pwa.add')} scrolled={scrolled} leading={
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', padding: 4 }}>
          <Icons.Close size={18}/>
        </button>
      }/>

      <div style={{ padding: '6px 16px 180px' }}>
        {/* Card picker */}
        {!selected ? (
          <>
            <div style={{ position: 'relative' }}>
              <Icons.Search size={16} style={{
                position: 'absolute', left: 14, top: 15,
                color: 'var(--fg-muted)', pointerEvents: 'none',
              }}/>
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name, Set, Nummer… z.B. Pikachu, base1-58"
                style={{ ...inputStyle, paddingLeft: 38, paddingTop: 14, paddingBottom: 14, borderRadius: 14, fontSize: 15 }}
              />
              {loading && (
                <div style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  width: 16, height: 16, borderRadius: 999,
                  border: '2px solid var(--accent-soft)',
                  borderTopColor: 'var(--accent-solid)',
                  animation: 'spin 0.7s linear infinite',
                }}/>
              )}
            </div>

            {/* Results */}
            {query.trim() && (
              <div style={{
                marginTop: 10, borderRadius: 14,
                background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                overflow: 'hidden',
              }}>
                {loading && results.length === 0 ? (
                  [0, 1, 2].map(i => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                      borderBottom: i < 2 ? '1px solid var(--card-border)' : 'none',
                    }}>
                      <div className="skel" style={{ width: 36, height: 50, borderRadius: 5 }}/>
                      <div style={{ flex: 1 }}>
                        <div className="skel" style={{ height: 12, width: '60%', borderRadius: 4, marginBottom: 6 }}/>
                        <div className="skel" style={{ height: 10, width: '40%', borderRadius: 4 }}/>
                      </div>
                    </div>
                  ))
                ) : results.length === 0 ? (
                  <div style={{ padding: 28, textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>
                    {t('pwa.noResults')}
                  </div>
                ) : (
                  <>
                    {totalCount > results.length && (
                      <div style={{ fontSize: 11, color: 'var(--fg-muted)', padding: '8px 14px 4px', textAlign: 'center' }}>
                        Top {results.length} von {totalCount.toLocaleString('de')} Treffern · Suche verfeinern für mehr
                      </div>
                    )}
                    {results.map((c, i) => {
                      const price = getCardPrice(c);
                      return (
                        <button key={c.id} onClick={() => pickCard(c)} style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: 10, width: '100%',
                          borderBottom: i < results.length - 1 ? '1px solid var(--card-border)' : 'none',
                          background: 'transparent', border: 'none', textAlign: 'left',
                          cursor: 'pointer', color: 'var(--fg)',
                        }}>
                          <CardThumb img={c.images.small} name={c.name} w={36} radius={5}/>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {c.name}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>
                              {c.set.name} · {c.set.ptcgoCode ?? c.set.id} #{c.number}
                              {c.rarity ? ` · ${c.rarity}` : ''}
                            </div>
                          </div>
                          {price !== null && (
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-solid)', flexShrink: 0 }}>
                              {fmtMoney(price, currency)}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            )}

            {!query && (
              <div style={{
                marginTop: 28, padding: 24, borderRadius: 14,
                border: '1px dashed var(--card-border)',
                textAlign: 'center', color: 'var(--fg-muted)',
              }}>
                <Icons.Search size={26} style={{ opacity: 0.5, marginBottom: 8 }}/>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{t('pwa.searchCard')}</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>{t('pwa.searchHint')}</div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Selected card preview */}
            <div style={{
              display: 'flex', gap: 14, alignItems: 'center',
              padding: 14, borderRadius: 16,
              background: 'var(--accent-soft)', border: '1px solid var(--accent-solid)',
              marginBottom: 22,
            }}>
              <CardThumb img={selected.images.small} name={selected.name} w={64} radius={6} glow/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-solid)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 }}>
                  {t('pwa.matchFound')}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selected.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>
                  {selected.set.name} · {selected.set.ptcgoCode ?? selected.set.id} {selected.number}
                </div>
                {getCardPrice(selected) !== null && (
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', marginTop: 4 }}>
                    {fmtMoney(getCardPrice(selected)!, currency)}
                  </div>
                )}
              </div>
              <button onClick={() => setSelected(null)} aria-label="Change" style={{
                background: 'transparent', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', padding: 6,
              }}><Icons.Close size={18}/></button>
            </div>

            {/* Quantity */}
            <Section label={t('pwa.quantity')}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 6px' }}>
                <button
                  onClick={() => setForm({ ...form, quantity: Math.max(1, form.quantity - 1) })}
                  disabled={form.quantity <= 1}
                  style={qtyBtn}
                >−</button>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--fg)' }}>{form.quantity}</div>
                <button onClick={() => setForm({ ...form, quantity: form.quantity + 1 })} style={qtyBtn}>+</button>
              </div>
            </Section>

            {/* Condition */}
            <Section label={t('pwa.condition')}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                {CONDITIONS.map(c => {
                  const active = form.condition === c.k;
                  return (
                    <button key={c.k} onClick={() => setForm({ ...form, condition: c.k })} title={c.l} style={{
                      padding: '10px 0', borderRadius: 10, fontSize: 12, fontWeight: 700,
                      background: active ? 'var(--accent-solid)' : 'var(--pill-bg)',
                      color: active ? 'white' : 'var(--fg)',
                      border: 'none', cursor: 'pointer',
                    }}>{c.k}</button>
                  );
                })}
              </div>
              <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 6, textAlign: 'center' }}>
                {CONDITIONS.find(c => c.k === form.condition)?.l}
              </div>
            </Section>

            {/* Variant */}
            <Section label={t('pwa.variant')}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {VARIANTS.map(v => {
                  const active = form.variant === v.k;
                  return (
                    <button key={v.k} onClick={() => setForm({ ...form, variant: v.k })} style={{
                      padding: '11px 6px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                      background: active ? 'var(--accent-solid)' : 'var(--pill-bg)',
                      color: active ? 'white' : 'var(--fg)',
                      border: 'none', cursor: 'pointer',
                    }}>{v.l}</button>
                  );
                })}
              </div>
            </Section>

            {/* Owner */}
            <Section label={t('pwa.owner')}>
              <input
                value={form.owner}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
                placeholder="Name…"
                style={inputStyle}
              />
            </Section>

            {/* Purchase info */}
            <div style={{ display: 'flex', gap: 10 }}>
              <Section label={t('pwa.purchasePrice')} style={{ flex: 1 }}>
                <input
                  type="number"
                  placeholder="0.00"
                  value={form.purchasePrice}
                  onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                  style={inputStyle}
                />
              </Section>
              <Section label={t('pwa.purchaseDate')} style={{ flex: 1 }}>
                <input
                  type="date"
                  value={form.purchaseDate}
                  onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                  style={inputStyle}
                />
              </Section>
            </div>
          </>
        )}
      </div>

      {/* Sticky save button */}
      {selected && (
        <div style={{
          position: 'sticky', left: 0, right: 0, bottom: 0,
          padding: '14px 16px 16px',
          background: 'linear-gradient(to top, var(--bg) 65%, transparent)',
          pointerEvents: 'none',
        }}>
          <div style={{ pointerEvents: 'auto' }}>
            <GradientButton full onClick={handleSave} disabled={!canSave}>
              <Icons.Plus size={18} stroke={2.5}/>{t('pwa.addToPortfolio')}
            </GradientButton>
          </div>
        </div>
      )}
    </div>
  );
}

const qtyBtn: React.CSSProperties = {
  width: 44, height: 44, borderRadius: 12, fontSize: 22, fontWeight: 700,
  background: 'var(--pill-bg)', color: 'var(--fg)',
  border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
