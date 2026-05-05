import { useState, useEffect, useCallback, useRef } from 'react';
import type { Card, UserCard, PriceSnapshot, PortfolioRow } from '@/lib/types';
import {
  loadUserCards,
  loadLatestPrices,
} from '@/lib/data-loader';
import { loadUserCardsLocal, saveUserCardsLocal, isFirstLaunch, seedDemoPortfolio } from '@/lib/card-store';
import { fetchCardsByIds } from '@/lib/pokemon-api';
import { buildPortfolioRows } from '@/lib/price-utils';

interface PortfolioData {
  rows: PortfolioRow[];
  cards: Card[];
  userCards: UserCard[];
  setUserCards: (cards: UserCard[]) => void;
  latestPrices: PriceSnapshot | null;
  loading: boolean;
  error: string | null;
  lastSynced: string | null;
}

export function usePortfolioData(): PortfolioData {
  const [cards, setCards] = useState<Card[]>([]);
  const [userCards, setUserCardsState] = useState<UserCard[]>([]);
  const [latestPrices, setLatestPrices] = useState<PriceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep a ref so setUserCards closure always sees latest cards
  const cardsRef = useRef<Card[]>([]);
  cardsRef.current = cards;

  useEffect(() => {
    async function load() {
      try {
        const latestData = await loadLatestPrices();

        // Always prefer localStorage; seed demo on first launch
        const localCards = loadUserCardsLocal();
        let resolvedUserCards: UserCard[];
        if (localCards !== null) {
          resolvedUserCards = localCards;
        } else if (isFirstLaunch()) {
          resolvedUserCards = seedDemoPortfolio();
        } else {
          resolvedUserCards = await loadUserCards();
        }
        setUserCardsState(resolvedUserCards);
        setLatestPrices(latestData);

        const uniqueCardIds = [...new Set(resolvedUserCards.map((uc) => uc.cardId))];
        if (uniqueCardIds.length > 0) {
          const cardsData = await fetchCardsByIds(uniqueCardIds);
          setCards(cardsData);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  /**
   * Public setter — persists to localStorage and fetches API metadata
   * for any card IDs not yet loaded into the cards state.
   */
  const setUserCards = useCallback((newUserCards: UserCard[]) => {
    setUserCardsState(newUserCards);
    // Persist on-device (addUserCard/updateUserCard already call this,
    // but calling again here is safe and ensures the hook always saves)
    saveUserCardsLocal(newUserCards);

    // Fetch metadata for newly added card IDs not yet in cards state
    const existingIds = new Set(cardsRef.current.map((c) => c.id));
    const missingIds = [...new Set(newUserCards.map((uc) => uc.cardId))].filter(
      (id) => !existingIds.has(id),
    );
    if (missingIds.length > 0) {
      fetchCardsByIds(missingIds)
        .then((fetched) => setCards((prev) => [...prev, ...fetched]))
        .catch(() => {/* ignore – card will just show without price data */});
    }
  }, []);

  const rows = buildPortfolioRows(userCards, cards, latestPrices);

  return {
    rows,
    cards,
    userCards,
    setUserCards,
    latestPrices,
    loading,
    error,
    lastSynced: latestPrices?.syncedAt ?? null,
  };
}
