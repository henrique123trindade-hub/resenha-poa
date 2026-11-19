import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  collection,
  getDocs,
  getDocsFromServer,
  onSnapshot,
  query,
  where,
  type Query,
  type QuerySnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import { buildDemoEvents, CATEGORIES, DEMO_VENUES, NEIGHBORHOODS } from '../data/seedCatalog';
import type { CategoryMeta, EventItem, NeighborhoodMeta, VenueItem } from '../types/resenha';

export interface CatalogRefreshResult {
  ok: boolean;
  eventsCount: number;
  updatedAt: Date;
  usedFallback: boolean;
}

interface CatalogContextValue {
  events: EventItem[];
  venues: VenueItem[];
  categories: CategoryMeta[];
  neighborhoods: NeighborhoodMeta[];
  loading: boolean;
  isRefreshing: boolean;
  lastRefreshedAt: Date | null;
  hasRealEvents: boolean;
  hasRealVenues: boolean;
  includeDemoData: boolean;
  setIncludeDemoData: (val: boolean) => void;
  refreshCatalog: () => Promise<CatalogRefreshResult>;
  getEventBySlug: (slug: string) => EventItem | undefined;
  getVenueBySlug: (slug: string) => VenueItem | undefined;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

async function fetchQueryFresh(q: Query): Promise<{ snap: QuerySnapshot; fromFallback: boolean }> {
  try {
    const snap = await getDocsFromServer(q);
    return { snap, fromFallback: false };
  } catch {
    const snap = await getDocs(q);
    return { snap, fromFallback: true };
  }
}

export const CatalogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firestoreEvents, setFirestoreEvents] = useState<EventItem[]>([]);
  const [firestoreVenues, setFirestoreVenues] = useState<VenueItem[]>([]);
  const [firestoreCategories, setFirestoreCategories] = useState<CategoryMeta[]>([]);
  const [firestoreNeighborhoods, setFirestoreNeighborhoods] = useState<NeighborhoodMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [demoRefreshTick, setDemoRefreshTick] = useState(0);
  const [includeDemoData, setIncludeDemoData] = useState(true);

  const refreshPromiseRef = useRef<Promise<CatalogRefreshResult> | null>(null);

  useEffect(() => {
    const eventsQ = query(
      collection(db, 'events'),
      where('status', 'in', ['published', 'cancelled']),
    );
    const unsubEvents = onSnapshot(
      eventsQ,
      (snap) => {
        setFirestoreEvents(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<EventItem, 'id'>) })),
        );
        setLoading(false);
      },
      (err) => {
        console.warn('Leitura pública de eventos em fallback demonstrativo:', err);
        setLoading(false);
      },
    );

    const venuesQ = query(collection(db, 'venues'), where('status', '==', 'published'));
    const unsubVenues = onSnapshot(
      venuesQ,
      (snap) => {
        setFirestoreVenues(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<VenueItem, 'id'>) })),
        );
      },
      (err) => {
        console.warn('Leitura pública de bares em fallback demonstrativo:', err);
      },
    );

    const unsubCats = onSnapshot(
      query(collection(db, 'categories'), where('active', '==', true)),
      (snap) => {
        if (!snap.empty) {
          setFirestoreCategories(snap.docs.map((d) => d.data() as CategoryMeta));
        }
      },
      () => {},
    );

    const unsubNeis = onSnapshot(
      query(collection(db, 'neighborhoods'), where('active', '==', true)),
      (snap) => {
        if (!snap.empty) {
          setFirestoreNeighborhoods(snap.docs.map((d) => d.data() as NeighborhoodMeta));
        }
      },
      () => {},
    );

    return () => {
      unsubEvents();
      unsubVenues();
      unsubCats();
      unsubNeis();
    };
  }, []);

  const demoEvents = useMemo(() => {
    void demoRefreshTick;
    return buildDemoEvents();
  }, [demoRefreshTick]);

  const events = useMemo(() => {
    const realIds = new Set(firestoreEvents.map((e) => e.id));
    if (!includeDemoData && firestoreEvents.length > 0) {
      return firestoreEvents;
    }
    if (firestoreEvents.length > 0 && !includeDemoData) {
      return firestoreEvents;
    }
    const merged = [
      ...firestoreEvents,
      ...(includeDemoData ? demoEvents.filter((d) => !realIds.has(d.id)) : []),
    ];
    return merged;
  }, [firestoreEvents, demoEvents, includeDemoData]);

  const venues = useMemo(() => {
    const realIds = new Set(firestoreVenues.map((v) => v.id));
    if (!includeDemoData && firestoreVenues.length > 0) {
      return firestoreVenues;
    }
    return [
      ...firestoreVenues,
      ...(includeDemoData ? DEMO_VENUES.filter((d) => !realIds.has(d.id)) : []),
    ];
  }, [firestoreVenues, includeDemoData]);

  const categories = useMemo(() => {
    if (firestoreCategories.length === 0) return CATEGORIES;
    const map = new Map(CATEGORIES.map((c) => [c.id, c]));
    for (const fc of firestoreCategories) {
      map.set(fc.id, { ...map.get(fc.id), ...fc, accentHex: map.get(fc.id)?.accentHex ?? '#F4F4F2' });
    }
    return Array.from(map.values()).filter((c) => c.active);
  }, [firestoreCategories]);

  const neighborhoods = useMemo(() => {
    if (firestoreNeighborhoods.length === 0) return NEIGHBORHOODS;
    const map = new Map(NEIGHBORHOODS.map((n) => [n.id, n]));
    for (const fn of firestoreNeighborhoods) {
      const base = map.get(fn.id);
      map.set(fn.id, {
        ...base,
        ...fn,
        center: base?.center ?? { lat: -30.0346, lng: -51.2177 },
      });
    }
    return Array.from(map.values()).filter((n) => n.active);
  }, [firestoreNeighborhoods]);

  const refreshCatalog = useCallback(async (): Promise<CatalogRefreshResult> => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const run = (async (): Promise<CatalogRefreshResult> => {
      setIsRefreshing(true);
      const startedAt = Date.now();
      let usedFallback = false;
      let latestEventsCount = events.length;

      try {
        const eventsQ = query(
          collection(db, 'events'),
          where('status', 'in', ['published', 'cancelled']),
        );
        const venuesQ = query(collection(db, 'venues'), where('status', '==', 'published'));
        const catsQ = query(collection(db, 'categories'), where('active', '==', true));
        const neisQ = query(collection(db, 'neighborhoods'), where('active', '==', true));

        const [evRes, venueRes, catRes, neiRes] = await Promise.allSettled([
          fetchQueryFresh(eventsQ),
          fetchQueryFresh(venuesQ),
          fetchQueryFresh(catsQ),
          fetchQueryFresh(neisQ),
        ]);

        if (evRes.status === 'fulfilled') {
          const freshEvents = evRes.value.snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<EventItem, 'id'>),
          }));
          setFirestoreEvents(freshEvents);
          if (evRes.value.fromFallback) usedFallback = true;
          const realIds = new Set(freshEvents.map((e) => e.id));
          latestEventsCount =
            !includeDemoData && freshEvents.length > 0
              ? freshEvents.length
              : freshEvents.length +
                (includeDemoData ? demoEvents.filter((d) => !realIds.has(d.id)).length : 0);
        } else {
          usedFallback = true;
        }

        if (venueRes.status === 'fulfilled') {
          setFirestoreVenues(
            venueRes.value.snap.docs.map((d) => ({
              id: d.id,
              ...(d.data() as Omit<VenueItem, 'id'>),
            })),
          );
          if (venueRes.value.fromFallback) usedFallback = true;
        }

        if (catRes.status === 'fulfilled' && !catRes.value.snap.empty) {
          setFirestoreCategories(catRes.value.snap.docs.map((d) => d.data() as CategoryMeta));
        }

        if (neiRes.status === 'fulfilled' && !neiRes.value.snap.empty) {
          setFirestoreNeighborhoods(
            neiRes.value.snap.docs.map((d) => d.data() as NeighborhoodMeta),
          );
        }

        setDemoRefreshTick((t) => t + 1);
      } catch (err) {
        console.warn('Falha ao atualizar catálogo sob demanda:', err);
        usedFallback = true;
      } finally {
        const elapsed = Date.now() - startedAt;
        const minVisualMs = 420;
        if (elapsed < minVisualMs) {
          await new Promise((resolve) => window.setTimeout(resolve, minVisualMs - elapsed));
        }
        const updatedAt = new Date();
        setLastRefreshedAt(updatedAt);
        setIsRefreshing(false);
        refreshPromiseRef.current = null;
      }

      return {
        ok: true,
        eventsCount: latestEventsCount,
        updatedAt: new Date(),
        usedFallback,
      };
    })();

    refreshPromiseRef.current = run;
    return run;
  }, [demoEvents, events.length, includeDemoData]);

  const getEventBySlug = useCallback(
    (slug: string) => events.find((e) => e.slug === slug || e.id === slug),
    [events],
  );

  const getVenueBySlug = useCallback(
    (slug: string) => venues.find((v) => v.slug === slug || v.id === slug),
    [venues],
  );

  return (
    <CatalogContext.Provider
      value={{
        events,
        venues,
        categories,
        neighborhoods,
        loading,
        isRefreshing,
        lastRefreshedAt,
        hasRealEvents: firestoreEvents.length > 0,
        hasRealVenues: firestoreVenues.length > 0,
        includeDemoData,
        setIncludeDemoData,
        refreshCatalog,
        getEventBySlug,
        getVenueBySlug,
      }}
    >
      {children}
    </CatalogContext.Provider>
  );
};

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) {
    throw new Error('useCatalog must be used inside CatalogProvider');
  }
  return ctx;
}
