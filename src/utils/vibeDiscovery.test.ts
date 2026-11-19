import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHeroSearchSuggestions, matchVibeDiscovery } from './vibeDiscovery';
import type { EventItem, NeighborhoodMeta, VenueItem } from '../types/resenha';

const NOW = new Date('2026-11-20T15:00:00-03:00'); // Friday

const SAMPLE_EVENTS: EventItem[] = [
  {
    id: 'ev-1',
    slug: 'baile-cb',
    title: 'Baile da Cidade Baixa',
    description: 'Funk e brasilidades.',
    category: 'funk',
    dateISO: '2026-11-20',
    startTime: '22:00',
    neighborhood: 'Cidade Baixa',
    venueName: 'Galpão CB',
    address: 'Rua Lima e Silva, 400',
    priceType: 'paid',
    priceMin: 30,
    ageRating: '18+',
    sourceName: 'Produtora',
    isVerified: true,
    isDemoExample: false,
    isSponsored: false,
    isFeatured: true,
    status: 'published',
    organizerId: 'org-1',
    organizerName: 'Coletivo CB',
  },
  {
    id: 'ev-2',
    slug: 'sunset-orla',
    title: 'Sunset Gratuito na Orla',
    description: 'Som ao ar livre.',
    category: 'eletronica',
    dateISO: '2026-11-21',
    startTime: '17:00',
    neighborhood: 'Centro Histórico',
    venueName: 'Orla do Guaíba',
    address: 'Av. Edvaldo Pereira Paiva',
    priceType: 'free',
    ageRating: 'Livre',
    sourceName: 'Agenda Pública',
    isVerified: true,
    isDemoExample: false,
    isSponsored: false,
    isFeatured: true,
    status: 'published',
    organizerId: 'org-2',
    organizerName: 'Coletivo Orla',
  },
  {
    id: 'ev-3',
    slug: 'festival-vip',
    title: 'Festival Eletrônico Quarto Distrito',
    description: 'House e techno.',
    category: 'eletronica',
    dateISO: '2026-11-21',
    startTime: '23:00',
    neighborhood: 'Quarto Distrito',
    venueName: 'Galpão 4D',
    address: 'Av. São Pedro, 800',
    priceType: 'paid',
    priceMin: 95,
    ageRating: '18+',
    sourceName: 'Produtora',
    isVerified: true,
    isDemoExample: false,
    isSponsored: false,
    isFeatured: false,
    status: 'published',
    organizerId: 'org-3',
    organizerName: '4D Club',
  },
];

const SAMPLE_VENUES: VenueItem[] = [
  {
    id: 'v-1',
    slug: 'bar-da-esquina',
    name: 'Bar da Esquina CB',
    category: 'Bar de rua',
    environmentType: 'Calçada',
    neighborhood: 'Cidade Baixa',
    address: 'Rua João Alfredo, 120',
    priceRange: '$',
    musicStyle: 'Samba e MPB',
    hoursVerified: false,
    description: 'Bar descontraído na Cidade Baixa.',
    sourceName: 'Guia',
    isDemoExample: false,
    status: 'published',
  },
];

const SAMPLE_NEIGHBORHOODS: NeighborhoodMeta[] = [
  {
    id: 'cidade-baixa',
    name: 'Cidade Baixa',
    vibeTag: 'Boemia e pista',
    editorialSummary: 'Coração boêmio.',
    center: { lat: -30.04, lng: -51.22 },
    active: true,
  },
];

test('matchVibeDiscovery filters by budget up-to-40 including free and excluding > 40', () => {
  const result = matchVibeDiscovery({
    events: SAMPLE_EVENTS,
    venues: SAMPLE_VENUES,
    vibe: 'todos',
    day: 'weekend',
    neighborhood: 'todos',
    budget: 'up-to-40',
    now: NOW,
  });

  assert.deepEqual(
    result.events.map((e) => e.id),
    ['ev-1', 'ev-2'],
  );
  assert.equal(result.targetUrl, '/eventos?data=weekend&max=40');
});

test('matchVibeDiscovery returns matching bars when bares vibe is selected and no bar events exist', () => {
  const result = matchVibeDiscovery({
    events: SAMPLE_EVENTS,
    venues: SAMPLE_VENUES,
    vibe: 'bares',
    day: 'all',
    neighborhood: 'Cidade Baixa',
    budget: 'up-to-40',
    now: NOW,
  });

  assert.equal(result.isBarMode, true);
  assert.equal(result.venues.length, 1);
  assert.equal(result.venues[0].slug, 'bar-da-esquina');
  assert.equal(result.targetUrl, '/bares?bairro=Cidade+Baixa&faixa=%24');
});

test('buildHeroSearchSuggestions matches neighborhoods, events, and venues accent-insensitively', () => {
  const res = buildHeroSearchSuggestions('cidade baixa', SAMPLE_EVENTS, SAMPLE_VENUES, SAMPLE_NEIGHBORHOODS);
  assert.equal(res.length, 3);
  assert.deepEqual(
    res.map((r) => r.type),
    ['neighborhood', 'event', 'venue'],
  );
});

test('buildHeroSearchSuggestions ignores 1-character queries', () => {
  assert.deepEqual(
    buildHeroSearchSuggestions('a', SAMPLE_EVENTS, SAMPLE_VENUES, SAMPLE_NEIGHBORHOODS),
    [],
  );
});
