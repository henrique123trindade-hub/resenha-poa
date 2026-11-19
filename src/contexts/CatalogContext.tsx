import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { buildDemoEvents, CATEGORIES, DEMO_VENUES, NEIGHBORHOODS } from '../data/seedCatalog';
import type { CategoryMeta, EventItem, NeighborhoodMeta, VenueItem } from '../types/resenha';

interface CatalogContextValue {
  events: EventItem[];
  venues: VenueItem[];
  categories: CategoryMeta[];
  neighborhoods: NeighborhoodMeta[];
  loading: boolean;
  hasRealEvents: boolean;
  hasRealVenues: boolean;
  includeDemoData: boolean;
  setIncludeDemoData: (val: boolean) => void;
  getEventBySlug: (slug: string) => EventItem | undefined;
  getVenueBySlug: (slug: string) => VenueItem | undefined;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

export const CatalogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firestoreEvents, setFirestoreEvents] = useState<EventItem[]>([]);
  const [firestoreVenues, setFirestoreVenues] = useState<VenueItem[]>([]);
  const [firestoreCategories, setFirestoreCategories] = useState<CategoryMeta[]>([]);
  const [firestoreNeighborhoods, setFirestoreNeighborhoods] = useState<NeighborhoodMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeDemoData, setIncludeDemoData] = useState(true);

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

  const demoEvents = useMemo(() => buildDemoEvents(), []);

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
        hasRealEvents: firestoreEvents.length > 0,
        hasRealVenues: firestoreVenues.length > 0,
        includeDemoData,
        setIncludeDemoData,
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
