import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEventJsonLd } from './seoHead';
import type { EventItem } from '../types/resenha';

const BASE_EVENT: EventItem = {
  id: 'e-real-1',
  slug: 'baile-real',
  title: 'Noite na Cidade Baixa',
  description: 'Festa confirmada em Porto Alegre.',
  category: 'funk',
  dateISO: '2026-11-21',
  startTime: '23:00',
  neighborhood: 'Cidade Baixa',
  venueName: 'Casa CB',
  address: 'Rua Lima e Silva, 500',
  priceType: 'paid',
  priceMin: 40,
  ageRating: '18+',
  sourceName: 'Produtora Oficial',
  isVerified: true,
  isDemoExample: false,
  isSponsored: false,
  isFeatured: true,
  status: 'published',
  organizerId: 'org-1',
  organizerName: 'Casa CB',
};

test('buildEventJsonLd suppresses structured data for demo examples', () => {
  const demo = { ...BASE_EVENT, isDemoExample: true };
  assert.equal(buildEventJsonLd(demo, 'https://resenhapoa.app/eventos/baile-real'), null);
});

test('buildEventJsonLd suppresses structured data for cancelled events', () => {
  const cancelled = { ...BASE_EVENT, status: 'cancelled' as const };
  assert.equal(buildEventJsonLd(cancelled, 'https://resenhapoa.app/eventos/baile-real'), null);
});

test('buildEventJsonLd emits valid Schema.org Event for real published events', () => {
  const ld = buildEventJsonLd(BASE_EVENT, 'https://resenhapoa.app/eventos/baile-real');
  assert.ok(ld);
  assert.equal(ld['@type'], 'Event');
  assert.equal(ld.name, 'Noite na Cidade Baixa');
  assert.equal(ld.startDate, '2026-11-21T23:00:00-03:00');
  assert.deepEqual(ld.offers, {
    '@type': 'Offer',
    price: '40',
    priceCurrency: 'BRL',
    url: 'https://resenhapoa.app/eventos/baile-real',
  });
});
