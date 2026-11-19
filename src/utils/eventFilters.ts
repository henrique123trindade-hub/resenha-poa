import type {
  AgeRating,
  EventCategoryId,
  EventItem,
  PriceType,
  QuickDateFilter,
  VenueItem,
} from '../types/resenha';
import { getWeekendDatesISO, isEventPast, resolveQuickDateISO } from './datePoa';

export interface EventFilterCriteria {
  query?: string;
  category?: EventCategoryId | 'todos';
  neighborhood?: string; // 'todos' or exact name
  quickDate?: QuickDateFilter;
  exactDateISO?: string;
  priceType?: PriceType | 'all';
  onlyFree?: boolean;
  maxPrice?: number;
  ageRating?: AgeRating | 'all' | 'under18_safe';
  includeCancelled?: boolean;
  includePast?: boolean;
}

export interface VenueFilterCriteria {
  query?: string;
  neighborhood?: string;
  environmentType?: string;
  priceRange?: string;
  category?: string;
}

export function normalizePtBr(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function slugify(text: string): string {
  return normalizePtBr(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

export function filterAndSortEvents(
  events: EventItem[],
  criteria: EventFilterCriteria,
  now: Date = new Date(),
): EventItem[] {
  const q = normalizePtBr(criteria.query ?? '');
  const weekendDates = criteria.quickDate === 'weekend' ? getWeekendDatesISO(now) : null;
  const targetDateISO =
    criteria.exactDateISO ||
    (criteria.quickDate && criteria.quickDate !== 'all' && criteria.quickDate !== 'weekend'
      ? resolveQuickDateISO(criteria.quickDate, now)
      : null);

  return events
    .filter((ev) => {
      // Only public catalog items (published, or cancelled when allowed)
      if (ev.status === 'draft' || ev.status === 'pending' || ev.status === 'rejected' || ev.status === 'ended') {
        return false;
      }
      if (ev.status === 'cancelled' && criteria.includeCancelled === false) {
        return false;
      }
      if (!criteria.includePast && isEventPast(ev.dateISO, ev.endTime, now)) {
        return false;
      }

      if (criteria.category && criteria.category !== 'todos') {
        if (criteria.category === 'gratuitos') {
          if (ev.priceType !== 'free' && ev.category !== 'gratuitos') {
            return false;
          }
        } else if (ev.category !== criteria.category) {
          return false;
        }
      }

      if (criteria.neighborhood && criteria.neighborhood !== 'todos') {
        if (normalizePtBr(ev.neighborhood) !== normalizePtBr(criteria.neighborhood)) {
          return false;
        }
      }

      if (weekendDates) {
        if (
          ev.dateISO !== weekendDates.friday &&
          ev.dateISO !== weekendDates.saturday &&
          ev.dateISO !== weekendDates.sunday
        ) {
          return false;
        }
      } else if (targetDateISO && ev.dateISO !== targetDateISO) {
        return false;
      }

      if (criteria.onlyFree && ev.priceType !== 'free') {
        return false;
      }

      if (typeof criteria.maxPrice === 'number' && criteria.maxPrice >= 0) {
        const withinBudget =
          ev.priceType === 'free' ||
          (ev.priceType === 'paid' && typeof ev.priceMin === 'number' && ev.priceMin <= criteria.maxPrice);
        if (!withinBudget) {
          return false;
        }
      }

      if (criteria.priceType && criteria.priceType !== 'all' && ev.priceType !== criteria.priceType) {
        return false;
      }

      if (criteria.ageRating && criteria.ageRating !== 'all') {
        if (criteria.ageRating === 'under18_safe') {
          if (ev.ageRating === '18+' || ev.ageRating === 'Não informado') {
            return false;
          }
        } else if (ev.ageRating !== criteria.ageRating) {
          return false;
        }
      }

      if (q) {
        const haystack = normalizePtBr(
          [
            ev.title,
            ev.subtitle ?? '',
            ev.neighborhood,
            ev.venueName,
            ev.category,
            ev.description,
            ...(ev.lineup ?? []),
          ].join(' '),
        );
        if (!haystack.includes(q)) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      const dateCmp = a.dateISO.localeCompare(b.dateISO);
      if (dateCmp !== 0) return dateCmp;
      return a.startTime.localeCompare(b.startTime);
    });
}

export function filterVenues(venues: VenueItem[], criteria: VenueFilterCriteria): VenueItem[] {
  const q = normalizePtBr(criteria.query ?? '');
  return venues
    .filter((venue) => {
      if (venue.status !== 'published') return false;
      if (criteria.neighborhood && criteria.neighborhood !== 'todos') {
        if (normalizePtBr(venue.neighborhood) !== normalizePtBr(criteria.neighborhood)) {
          return false;
        }
      }
      if (criteria.environmentType && criteria.environmentType !== 'todos') {
        if (normalizePtBr(venue.environmentType) !== normalizePtBr(criteria.environmentType)) {
          return false;
        }
      }
      if (criteria.priceRange && criteria.priceRange !== 'todos') {
        if (venue.priceRange !== criteria.priceRange) {
          return false;
        }
      }
      if (criteria.category && criteria.category !== 'todos') {
        if (normalizePtBr(venue.category) !== normalizePtBr(criteria.category)) {
          return false;
        }
      }
      if (q) {
        const haystack = normalizePtBr(
          [venue.name, venue.neighborhood, venue.category, venue.environmentType, venue.musicStyle ?? '', venue.description].join(' '),
        );
        if (!haystack.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export function detectDuplicateEvent(
  candidate: Pick<EventItem, 'title' | 'dateISO' | 'neighborhood' | 'venueName'>,
  existingEvents: EventItem[],
): EventItem | null {
  const cTitle = normalizePtBr(candidate.title);
  const cVenue = normalizePtBr(candidate.venueName);
  const cNeigh = normalizePtBr(candidate.neighborhood);

  for (const ev of existingEvents) {
    if (ev.dateISO !== candidate.dateISO) continue;
    const eTitle = normalizePtBr(ev.title);
    const eVenue = normalizePtBr(ev.venueName);
    const eNeigh = normalizePtBr(ev.neighborhood);
    if (eTitle === cTitle && (eVenue === cVenue || eNeigh === cNeigh)) {
      return ev;
    }
  }
  return null;
}

export interface CsvParseResult {
  validRows: Array<{
    title: string;
    category: EventCategoryId;
    dateISO: string;
    startTime: string;
    neighborhood: string;
    venueName: string;
    address: string;
    priceType: PriceType;
    priceMin?: number;
    priceLabel?: string;
    ageRating: AgeRating;
    description: string;
    sourceName: string;
    sourceUrl?: string;
    ticketUrl?: string;
  }>;
  errors: Array<{ row: number; message: string }>;
}

const VALID_CATEGORIES = new Set<EventCategoryId>([
  'funk',
  'eletronica',
  'pagode-samba',
  'sertanejo',
  'rock-indie',
  'hip-hop',
  'pop',
  'bares',
  'shows',
  'cultura',
  'gratuitos',
]);

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseEventsCsv(csvText: string): CsvParseResult {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return {
      validRows: [],
      errors: [{ row: 1, message: 'CSV precisa conter cabeçalho e ao menos uma linha de evento.' }],
    };
  }

  const headers = splitCsvLine(lines[0]).map((h) => normalizePtBr(h));
  const idx = (name: string) => headers.indexOf(normalizePtBr(name));

  const requiredCols = ['title', 'category', 'dateISO', 'startTime', 'neighborhood', 'venueName', 'address'];
  const missingCols = requiredCols.filter((c) => idx(c) === -1);
  if (missingCols.length > 0) {
    return {
      validRows: [],
      errors: [{ row: 1, message: `Colunas obrigatórias ausentes: ${missingCols.join(', ')}` }],
    };
  }

  const validRows: CsvParseResult['validRows'] = [];
  const errors: CsvParseResult['errors'] = [];

  for (let r = 1; r < lines.length; r++) {
    const cols = splitCsvLine(lines[r]);
    const get = (name: string) => {
      const i = idx(name);
      return i >= 0 ? (cols[i] ?? '').trim() : '';
    };

    const title = get('title');
    const category = get('category') as EventCategoryId;
    const dateISO = get('dateISO');
    const startTime = get('startTime');
    const neighborhood = get('neighborhood');
    const venueName = get('venueName');
    const address = get('address');
    const priceTypeRaw = (get('priceType') || 'unconfirmed') as PriceType;
    const priceMinRaw = get('priceMin');
    const priceLabel = get('priceLabel');
    const ageRatingRaw = (get('ageRating') || 'Não informado') as AgeRating;
    const description = get('description') || `${title} em ${venueName}, ${neighborhood}.`;
    const sourceName = get('sourceName') || 'Importação CSV verificada';
    const sourceUrl = get('sourceUrl') || undefined;
    const ticketUrl = get('ticketUrl') || undefined;

    if (title.length < 3) {
      errors.push({ row: r + 1, message: 'Título inválido (mínimo 3 caracteres).' });
      continue;
    }
    if (!VALID_CATEGORIES.has(category)) {
      errors.push({ row: r + 1, message: `Categoria inválida: "${category}".` });
      continue;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
      errors.push({ row: r + 1, message: `Data inválida (use YYYY-MM-DD): "${dateISO}".` });
      continue;
    }
    if (!/^\d{2}:\d{2}$/.test(startTime)) {
      errors.push({ row: r + 1, message: `Horário inválido (use HH:MM): "${startTime}".` });
      continue;
    }
    if (!neighborhood || !venueName || address.length < 4) {
      errors.push({ row: r + 1, message: 'Bairro, local ou endereço incompleto.' });
      continue;
    }

    const priceType: PriceType = ['free', 'paid', 'unconfirmed'].includes(priceTypeRaw)
      ? priceTypeRaw
      : 'unconfirmed';
    const priceMin = priceMinRaw && !Number.isNaN(Number(priceMinRaw)) ? Number(priceMinRaw) : undefined;
    const ageRating: AgeRating = ['Livre', '16+', '18+', 'Não informado'].includes(ageRatingRaw)
      ? ageRatingRaw
      : 'Não informado';

    validRows.push({
      title,
      category,
      dateISO,
      startTime,
      neighborhood,
      venueName,
      address,
      priceType,
      priceMin,
      priceLabel: priceLabel || undefined,
      ageRating,
      description,
      sourceName,
      sourceUrl,
      ticketUrl,
    });
  }

  return { validRows, errors };
}
