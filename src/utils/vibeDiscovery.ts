import type {
  EventCategoryId,
  EventItem,
  NeighborhoodMeta,
  QuickDateFilter,
  VenueItem,
} from '../types/resenha';
import { filterAndSortEvents, filterVenues, normalizePtBr } from './eventFilters';
import { formatEventDatePtBr } from './datePoa';

export type VibeBudgetOption = 'all' | 'free' | 'up-to-40';

export interface VibeDiscoveryInput {
  events: EventItem[];
  venues: VenueItem[];
  vibe: EventCategoryId | 'todos';
  day: QuickDateFilter;
  neighborhood: string;
  budget: VibeBudgetOption;
  now?: Date;
}

export interface VibeDiscoveryResult {
  events: EventItem[];
  venues: VenueItem[];
  totalCount: number;
  targetUrl: string;
  isBarMode: boolean;
}

export function matchVibeDiscovery(input: VibeDiscoveryInput): VibeDiscoveryResult {
  const { events, venues, vibe, day, neighborhood, budget, now = new Date() } = input;

  const isBarMode = vibe === 'bares';

  const matchedEvents = filterAndSortEvents(
    events,
    {
      category: vibe,
      quickDate: day,
      neighborhood,
      onlyFree: budget === 'free',
      maxPrice: budget === 'up-to-40' ? 40 : undefined,
      includeCancelled: false,
    },
    now,
  );

  const matchedVenues = isBarMode
    ? filterVenues(venues, {
        neighborhood,
      }).filter((v) => {
        if (budget === 'up-to-40') {
          return v.priceRange === '$' || v.priceRange === '$$';
        }
        return true;
      })
    : [];

  if (isBarMode && matchedEvents.length === 0) {
    const barParams = new URLSearchParams();
    if (neighborhood && neighborhood !== 'todos') barParams.set('bairro', neighborhood);
    if (budget === 'up-to-40') barParams.set('faixa', '$');
    const qs = barParams.toString();
    return {
      events: [],
      venues: matchedVenues,
      totalCount: matchedVenues.length,
      targetUrl: qs ? `/bares?${qs}` : '/bares',
      isBarMode: true,
    };
  }

  const params = new URLSearchParams();
  if (vibe !== 'todos') params.set('categoria', vibe);
  if (day !== 'all') params.set('data', day);
  if (neighborhood && neighborhood !== 'todos') params.set('bairro', neighborhood);
  if (budget === 'free') params.set('gratis', '1');
  if (budget === 'up-to-40') params.set('max', '40');
  const qs = params.toString();

  return {
    events: matchedEvents,
    venues: matchedVenues,
    totalCount: matchedEvents.length + (isBarMode ? matchedVenues.length : 0),
    targetUrl: qs ? `/eventos?${qs}` : '/eventos',
    isBarMode,
  };
}

export interface HeroSearchSuggestion {
  type: 'event' | 'venue' | 'neighborhood';
  id: string;
  label: string;
  sublabel: string;
  to: string;
}

export function buildHeroSearchSuggestions(
  query: string,
  events: EventItem[],
  venues: VenueItem[],
  neighborhoods: NeighborhoodMeta[],
  limit = 6,
): HeroSearchSuggestion[] {
  const q = normalizePtBr(query);
  if (q.length < 2) return [];

  const results: HeroSearchSuggestion[] = [];

  for (const nei of neighborhoods) {
    const hay = normalizePtBr(`${nei.name} ${nei.vibeTag}`);
    if (hay.includes(q)) {
      results.push({
        type: 'neighborhood',
        id: `nei-${nei.id}`,
        label: nei.name,
        sublabel: `Bairro · ${nei.vibeTag}`,
        to: `/eventos?bairro=${encodeURIComponent(nei.name)}`,
      });
    }
  }

  for (const ev of events) {
    if (ev.status !== 'published') continue;
    const hay = normalizePtBr(
      [ev.title, ev.subtitle ?? '', ev.neighborhood, ev.venueName, ev.category, ...(ev.lineup ?? [])].join(' '),
    );
    if (hay.includes(q)) {
      results.push({
        type: 'event',
        id: `ev-${ev.id}`,
        label: ev.title,
        sublabel: `${formatEventDatePtBr(ev.dateISO)} · ${ev.startTime} · ${ev.neighborhood}`,
        to: `/eventos/${ev.slug}`,
      });
    }
  }

  for (const v of venues) {
    if (v.status !== 'published') continue;
    const hay = normalizePtBr([v.name, v.neighborhood, v.category, v.musicStyle ?? ''].join(' '));
    if (hay.includes(q)) {
      results.push({
        type: 'venue',
        id: `venue-${v.id}`,
        label: v.name,
        sublabel: `Bar · ${v.category} · ${v.neighborhood}`,
        to: `/bares/${v.slug}`,
      });
    }
  }

  return results.slice(0, limit);
}
