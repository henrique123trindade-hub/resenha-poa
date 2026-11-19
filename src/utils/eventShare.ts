import type { EventItem } from '../types/resenha';
import { formatEventDatePtBr } from './datePoa';

export interface EventSharePayload {
  title: string;
  text: string;
  url: string;
}

export interface SocialShareLinks {
  whatsapp: string;
  x: string;
  facebook: string;
  telegram: string;
}

export interface ShareCapableNavigator {
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data?: ShareData) => boolean;
}

export type WebShareOutcome = 'shared' | 'cancelled' | 'fallback';

/**
 * Builds a clean Web Share API payload containing the event title, contextual summary, and URL.
 */
export function buildEventSharePayload(
  event: Pick<EventItem, 'title' | 'dateISO' | 'startTime' | 'neighborhood' | 'venueName'>,
  url: string,
): EventSharePayload {
  const cleanUrl = url.trim();
  const dateLabel = formatEventDatePtBr(event.dateISO);
  const where = event.venueName
    ? `${event.venueName} (${event.neighborhood}, Porto Alegre)`
    : `${event.neighborhood}, Porto Alegre`;

  return {
    title: `${event.title} · ResenhaPOA`,
    text: `${event.title} — ${dateLabel} às ${event.startTime} em ${where}`,
    url: cleanUrl,
  };
}

/**
 * Builds encoded social media share URLs for fallback when Web Share API is unavailable.
 */
export function buildSocialShareLinks(payload: EventSharePayload): SocialShareLinks {
  const combinedText = `${payload.text} ${payload.url}`.trim();
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(combinedText)}`,
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(payload.text)}&url=${encodeURIComponent(payload.url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(payload.url)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(payload.url)}&text=${encodeURIComponent(payload.text)}`,
  };
}

/**
 * Attempts to share via the browser Web Share API (`navigator.share`).
 * Returns:
 * - 'shared' when the native share sheet resolves
 * - 'cancelled' when the user dismisses the native share sheet (AbortError)
 * - 'fallback' when Web Share API is unsupported or blocked (e.g., desktop or iframe permissions)
 */
export async function shareEventWithWebShare(
  payload: EventSharePayload,
  nav?: ShareCapableNavigator | null,
): Promise<WebShareOutcome> {
  if (!nav || typeof nav.share !== 'function') {
    return 'fallback';
  }

  if (typeof nav.canShare === 'function') {
    try {
      if (!nav.canShare(payload)) {
        return 'fallback';
      }
    } catch {
      return 'fallback';
    }
  }

  try {
    await nav.share(payload);
    return 'shared';
  } catch (err) {
    const errName =
      typeof err === 'object' && err !== null && 'name' in err
        ? String((err as { name?: unknown }).name ?? '')
        : '';
    if (errName === 'AbortError') {
      return 'cancelled';
    }
    return 'fallback';
  }
}
