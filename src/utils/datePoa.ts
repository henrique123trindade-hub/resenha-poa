import type { QuickDateFilter, WeeklyOpeningHours } from '../types/resenha';

export const POA_TIMEZONE = 'America/Sao_Paulo';

export interface PoaDateParts {
  dateISO: string; // YYYY-MM-DD
  year: number;
  month: number;
  day: number;
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 5 = Friday, 6 = Saturday
  hour: number;
  minute: number;
}

const WEEKDAY_MAP: Record<string, 0 | 1 | 2 | 3 | 4 | 5 | 6> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function getPoaNowParts(now: Date = new Date()): PoaDateParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: POA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const lookup: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      lookup[part.type] = part.value;
    }
  }

  const year = Number(lookup.year);
  const month = Number(lookup.month);
  const day = Number(lookup.day);
  const rawHour = Number(lookup.hour);
  const hour = rawHour === 24 ? 0 : rawHour;
  const minute = Number(lookup.minute);
  const weekday = WEEKDAY_MAP[lookup.weekday] ?? 0;

  const dateISO = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return { dateISO, year, month, day, weekday, hour, minute };
}

export function addDaysISO(dateISO: string, offsetDays: number): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + offsetDays));
  const yy = utc.getUTCFullYear();
  const mm = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(utc.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function getUpcomingWeekdayISO(
  targetWeekday: 0 | 1 | 2 | 3 | 4 | 5 | 6,
  now: Date = new Date(),
): string {
  const parts = getPoaNowParts(now);
  const delta = (targetWeekday - parts.weekday + 7) % 7;
  return addDaysISO(parts.dateISO, delta);
}

/**
 * Returns the Friday, Saturday, and Sunday ISO dates for the current or upcoming weekend
 * in America/Sao_Paulo. If today is Sunday, Friday/Saturday still map to the current weekend
 * or next? For "O que rola neste fim de semana?", if today is Sun, we show Sun + upcoming Fri/Sat
 * OR if Mon-Fri we show this Fri-Sun; if Sat we show Fri (yesterday) / Sat (today) / Sun (tomorrow).
 */
export function getWeekendDatesISO(now: Date = new Date()): {
  friday: string;
  saturday: string;
  sunday: string;
} {
  const parts = getPoaNowParts(now);
  if (parts.weekday === 6) {
    // Saturday -> yesterday was Fri, today is Sat, tomorrow is Sun
    return {
      friday: addDaysISO(parts.dateISO, -1),
      saturday: parts.dateISO,
      sunday: addDaysISO(parts.dateISO, 1),
    };
  }
  if (parts.weekday === 0) {
    // Sunday -> upcoming Fri, upcoming Sat, today Sun
    return {
      friday: addDaysISO(parts.dateISO, 5),
      saturday: addDaysISO(parts.dateISO, 6),
      sunday: parts.dateISO,
    };
  }
  // Monday (1) .. Friday (5)
  const daysToFriday = 5 - parts.weekday;
  return {
    friday: addDaysISO(parts.dateISO, daysToFriday),
    saturday: addDaysISO(parts.dateISO, daysToFriday + 1),
    sunday: addDaysISO(parts.dateISO, daysToFriday + 2),
  };
}

export function resolveQuickDateISO(
  filter: QuickDateFilter,
  now: Date = new Date(),
): string | null {
  const parts = getPoaNowParts(now);
  switch (filter) {
    case 'all':
    case 'weekend':
      return null;
    case 'today':
      return parts.dateISO;
    case 'tomorrow':
      return addDaysISO(parts.dateISO, 1);
    case 'friday':
      return getUpcomingWeekdayISO(5, now);
    case 'saturday':
      return getUpcomingWeekdayISO(6, now);
    case 'sunday':
      return getUpcomingWeekdayISO(0, now);
  }
}

export function isEventPast(
  dateISO: string,
  endTime?: string,
  now: Date = new Date(),
): boolean {
  const parts = getPoaNowParts(now);
  if (dateISO < parts.dateISO) {
    return true;
  }
  if (dateISO > parts.dateISO) {
    return false;
  }
  if (!endTime || !/^\d{2}:\d{2}$/.test(endTime)) {
    return false;
  }
  const [endH, endM] = endTime.split(':').map(Number);
  // Events ending after midnight (e.g. 04:00) belong to the night of dateISO, not ended at 04:00 AM of dateISO start
  if (endH < 9) {
    return false;
  }
  const nowMinutes = parts.hour * 60 + parts.minute;
  const endMinutes = endH * 60 + endM;
  return nowMinutes > endMinutes;
}

export function formatEventDatePtBr(dateISO: string, now: Date = new Date()): string {
  const parts = getPoaNowParts(now);
  if (dateISO === parts.dateISO) {
    return 'Hoje';
  }
  if (dateISO === addDaysISO(parts.dateISO, 1)) {
    return 'Amanhã';
  }
  const [y, m, d] = dateISO.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const weekday = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    timeZone: 'UTC',
  })
    .format(utc)
    .replace('.', '');
  const dayMonth = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} · ${dayMonth}`;
}

export function formatIsoDateFullPtBr(dateISO: string): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(utc);
}

/**
 * Computes whether a venue is currently open in America/Sao_Paulo.
 * Strictly returns null if hoursVerified is false or structured openingHours are absent,
 * preventing fabricated "Aberto agora" claims.
 */
export function isVenueOpenNow(
  openingHours: WeeklyOpeningHours | undefined,
  hoursVerified: boolean,
  now: Date = new Date(),
): boolean | null {
  if (!hoursVerified || !openingHours) {
    return null;
  }

  const parts = getPoaNowParts(now);
  const nowMinutes = parts.hour * 60 + parts.minute;

  // Check if yesterday's overnight shift extends into early morning today
  const prevWeekday = ((parts.weekday + 6) % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const prevSlot = openingHours[prevWeekday];
  if (prevSlot) {
    const [pOpenH, pOpenM] = prevSlot.open.split(':').map(Number);
    const [pCloseH, pCloseM] = prevSlot.close.split(':').map(Number);
    const pOpenMin = pOpenH * 60 + pOpenM;
    const pCloseMin = pCloseH * 60 + pCloseM;
    if (pCloseMin <= pOpenMin && nowMinutes < pCloseMin) {
      return true;
    }
  }

  const todaySlot = openingHours[parts.weekday];
  if (!todaySlot) {
    return false;
  }

  const [openH, openM] = todaySlot.open.split(':').map(Number);
  const [closeH, closeM] = todaySlot.close.split(':').map(Number);
  const openMin = openH * 60 + openM;
  const closeMin = closeH * 60 + closeM;

  if (closeMin <= openMin) {
    // Overnight closing after midnight
    return nowMinutes >= openMin;
  }
  return nowMinutes >= openMin && nowMinutes <= closeMin;
}
