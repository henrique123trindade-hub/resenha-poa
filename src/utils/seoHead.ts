import { useEffect } from 'react';
import type { EventItem } from '../types/resenha';

export const DEFAULT_SITE_TITLE = 'ResenhaPOA — A noite de Porto Alegre tá on';
export const DEFAULT_SITE_DESCRIPTION =
  'Descubra festas, baladas, bares, shows e rolês culturais em Porto Alegre — RS.';

export function buildEventJsonLd(
  event: EventItem,
  pageUrl: string,
): Record<string, unknown> | null {
  if (event.isDemoExample || event.status !== 'published') {
    return null;
  }

  const startDate = `${event.dateISO}T${event.startTime}:00-03:00`;
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.subtitle || event.description.slice(0, 220),
    startDate,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    url: pageUrl,
    location: {
      '@type': 'Place',
      name: event.venueName,
      address: {
        '@type': 'PostalAddress',
        streetAddress: event.address,
        addressLocality: 'Porto Alegre',
        addressRegion: 'RS',
        addressCountry: 'BR',
      },
    },
    organizer: {
      '@type': 'Organization',
      name: event.organizerName,
    },
  };

  if (event.imageUrl && /^https?:\/\//i.test(event.imageUrl)) {
    jsonLd.image = [event.imageUrl];
  }

  if (event.priceType === 'free') {
    jsonLd.isAccessibleForFree = true;
    jsonLd.offers = {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'BRL',
      availability: 'https://schema.org/InStock',
      url: event.ticketUrl || pageUrl,
    };
  } else if (event.priceType === 'paid' && typeof event.priceMin === 'number') {
    jsonLd.offers = {
      '@type': 'Offer',
      price: String(event.priceMin),
      priceCurrency: 'BRL',
      url: event.ticketUrl || pageUrl,
    };
  }

  return jsonLd;
}

interface DocumentHeadOptions {
  title: string;
  description?: string;
  jsonLd?: Record<string, unknown> | null;
}

export function useDocumentHead({
  title,
  description = DEFAULT_SITE_DESCRIPTION,
  jsonLd = null,
}: DocumentHeadOptions): void {
  const serializedLd = jsonLd ? JSON.stringify(jsonLd) : '';

  useEffect(() => {
    if (typeof document === 'undefined') return;

    document.title = title;

    const setMeta = (selector: string, content: string) => {
      const el = document.querySelector<HTMLMetaElement>(selector);
      if (el) el.setAttribute('content', content);
    };

    setMeta('meta[name="description"]', description);
    setMeta('meta[property="og:title"]', title);
    setMeta('meta[property="og:description"]', description);

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-resenha-ld="dynamic"]',
    );

    if (serializedLd) {
      const scriptEl = existingScript ?? document.createElement('script');
      scriptEl.type = 'application/ld+json';
      scriptEl.setAttribute('data-resenha-ld', 'dynamic');
      scriptEl.textContent = serializedLd;
      if (!existingScript) {
        document.head.appendChild(scriptEl);
      }
    } else if (existingScript) {
      existingScript.remove();
    }

    return () => {
      const script = document.querySelector('script[data-resenha-ld="dynamic"]');
      if (script) script.remove();
    };
  }, [title, description, serializedLd]);
}
