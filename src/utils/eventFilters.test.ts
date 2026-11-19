import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectDuplicateEvent,
  filterAndSortEvents,
  filterVenues,
  parseEventsCsv,
} from './eventFilters';
import type { EventItem, VenueItem } from '../types/resenha';

const NOW = new Date('2026-11-17T18:00:00-03:00'); // Tuesday

const SAMPLE_EVENTS: EventItem[] = [
  {
    id: 'ev1',
    slug: 'baile-cb',
    title: 'Baile da CB',
    description: 'Festa de funk e brasilidades na Cidade Baixa.',
    category: 'funk',
    dateISO: '2026-11-20',
    startTime: '23:00',
    neighborhood: 'Cidade Baixa',
    venueName: 'Casa Demo',
    address: 'Rua João Alfredo, 100',
    priceType: 'paid',
    priceMin: 30,
    ageRating: '18+',
    sourceName: 'Demo',
    isVerified: false,
    isDemoExample: true,
    isSponsored: false,
    isFeatured: true,
    status: 'published',
    organizerId: 'org1',
    organizerName: 'Coletivo Demo',
  },
  {
    id: 'ev2',
    slug: 'orla-livre',
    title: 'Roda Cultural na Orla',
    description: 'Encontro cultural gratuito na Orla do Guaíba.',
    category: 'cultura',
    dateISO: '2026-11-17',
    startTime: '18:30',
    neighborhood: 'Orla do Guaíba',
    venueName: 'Trecho 1',
    address: 'Av. Edvaldo Pereira Paiva',
    priceType: 'free',
    ageRating: 'Livre',
    sourceName: 'Demo',
    isVerified: true,
    isDemoExample: true,
    isSponsored: false,
    isFeatured: true,
    status: 'published',
    organizerId: 'org2',
    organizerName: 'Projeto Orla',
  },
  {
    id: 'ev3',
    slug: 'pendente-oculto',
    title: 'Evento Pendente',
    description: 'Não deve aparecer no catálogo público.',
    category: 'shows',
    dateISO: '2026-11-21',
    startTime: '21:00',
    neighborhood: 'Bom Fim',
    venueName: 'Teatro',
    address: 'Av. Osvaldo Aranha',
    priceType: 'free',
    ageRating: 'Livre',
    sourceName: 'Org',
    isVerified: false,
    isDemoExample: false,
    isSponsored: false,
    isFeatured: false,
    status: 'pending',
    organizerId: 'org3',
    organizerName: 'Produtora',
  },
];

test('filterAndSortEvents excludes pending events, sorts chronologically, and respects underage safety filter', () => {
  const allPublic = filterAndSortEvents(SAMPLE_EVENTS, {}, NOW);
  assert.equal(allPublic.length, 2);
  assert.equal(allPublic[0].id, 'ev2'); // 2026-11-17 before 2026-11-20

  const safeForMinors = filterAndSortEvents(SAMPLE_EVENTS, { ageRating: 'under18_safe' }, NOW);
  assert.equal(safeForMinors.length, 1);
  assert.equal(safeForMinors[0].id, 'ev2');

  const cbOnly = filterAndSortEvents(SAMPLE_EVENTS, { neighborhood: 'Cidade Baixa' }, NOW);
  assert.equal(cbOnly.length, 1);
  assert.equal(cbOnly[0].id, 'ev1');

  const weekendOnly = filterAndSortEvents(SAMPLE_EVENTS, { quickDate: 'weekend' }, NOW);
  assert.equal(weekendOnly.length, 1);
  assert.equal(weekendOnly[0].id, 'ev1');
});

test('detectDuplicateEvent catches matching title + date + neighborhood', () => {
  const dup = detectDuplicateEvent(
    {
      title: 'baile da cb',
      dateISO: '2026-11-20',
      neighborhood: 'Cidade Baixa',
      venueName: 'Outro Nome',
    },
    SAMPLE_EVENTS,
  );
  assert.ok(dup);
  assert.equal(dup?.id, 'ev1');
});

test('parseEventsCsv parses valid rows and reports malformed rows cleanly', () => {
  const csv = [
    'title,category,dateISO,startTime,neighborhood,venueName,address,priceType,priceMin,ageRating',
    '"Samba na Redenção",pagode-samba,2026-11-22,16:00,Bom Fim,Parque Farroupilha,"Av. José Bonifácio",free,0,Livre',
    '"Linha Quebrada",invalida,2026-11-22,20:00,Centro Histórico,Local,"Rua X",paid,20,18+',
  ].join('\n');

  const parsed = parseEventsCsv(csv);
  assert.equal(parsed.validRows.length, 1);
  assert.equal(parsed.validRows[0].title, 'Samba na Redenção');
  assert.equal(parsed.errors.length, 1);
  assert.equal(parsed.errors[0].row, 3);
});

test('filterVenues respects neighborhood and priceRange', () => {
  const venues: VenueItem[] = [
    {
      id: 'v1',
      slug: 'bar-1',
      name: 'Bar da Esquina',
      category: 'Bar & Drinks',
      environmentType: 'Calçada e salão',
      neighborhood: 'Cidade Baixa',
      address: 'Rua Lima e Silva, 400',
      priceRange: '$$',
      hoursVerified: false,
      description: 'Bar de exemplo na Cidade Baixa.',
      sourceName: 'Demo',
      isDemoExample: true,
      status: 'published',
    },
  ];
  assert.equal(filterVenues(venues, { neighborhood: 'Cidade Baixa', priceRange: '$$' }).length, 1);
  assert.equal(filterVenues(venues, { neighborhood: 'Moinhos de Vento' }).length, 0);
});
