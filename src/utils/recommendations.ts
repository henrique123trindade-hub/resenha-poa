import type { EventItem, FavoriteItem } from '../types/resenha';
import { isEventPast } from './datePoa';

export interface RecommendationInput {
  favoriteCategories: string[];
  favoriteNeighborhoods: string[];
  savedFavorites: FavoriteItem[];
}

export interface RecommendedEventResult {
  event: EventItem;
  reasons: string[];
  score: number;
}

/**
 * Computes transparent personalized event recommendations strictly when real user
 * preferences or saved favorites exist. Returns empty array if insufficient signal.
 */
export function getRecommendedEvents(
  events: EventItem[],
  prefs: RecommendationInput,
  now: Date = new Date(),
  limit = 4,
): RecommendedEventResult[] {
  const savedEventIds = new Set(
    prefs.savedFavorites.filter((f) => f.targetType === 'event').map((f) => f.targetId),
  );

  // Infer additional signals from already-saved events
  const inferredCategories = new Set<string>(prefs.favoriteCategories);
  const inferredNeighborhoods = new Set<string>(prefs.favoriteNeighborhoods);

  events.forEach((ev) => {
    if (savedEventIds.has(ev.id)) {
      inferredCategories.add(ev.category);
      inferredNeighborhoods.add(ev.neighborhood);
    }
  });

  if (inferredCategories.size === 0 && inferredNeighborhoods.size === 0) {
    return [];
  }

  const scored: RecommendedEventResult[] = [];

  for (const ev of events) {
    if (ev.status !== 'published') continue;
    if (isEventPast(ev.dateISO, ev.endTime, now)) continue;
    if (savedEventIds.has(ev.id)) continue;

    let score = 0;
    const reasons: string[] = [];

    if (inferredCategories.has(ev.category)) {
      score += 3;
      reasons.push('Combina com teu estilo');
    }
    if (inferredNeighborhoods.has(ev.neighborhood)) {
      score += 2;
      reasons.push(`Em ${ev.neighborhood}`);
    }
    if (ev.isFeatured) {
      score += 0.5;
    }

    if (score >= 2) {
      scored.push({ event: ev, reasons, score });
    }
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return `${a.event.dateISO}T${a.event.startTime}`.localeCompare(
      `${b.event.dateISO}T${b.event.startTime}`,
    );
  });

  return scored.slice(0, limit);
}
