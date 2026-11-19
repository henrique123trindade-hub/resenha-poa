import test from 'node:test';
import assert from 'node:assert/strict';
import { getRecommendedEvents } from './recommendations';
import { buildDemoEvents } from '../data/seedCatalog';

test('getRecommendedEvents returns empty array when user has no preferences or favorites', () => {
  const now = new Date('2026-11-18T18:00:00Z');
  const events = buildDemoEvents(now);
  const recs = getRecommendedEvents(
    events,
    { favoriteCategories: [], favoriteNeighborhoods: [], savedFavorites: [] },
    now,
  );
  assert.equal(recs.length, 0);
});

test('getRecommendedEvents prioritizes events matching both preferred category and neighborhood', () => {
  const now = new Date('2026-11-18T18:00:00Z');
  const events = buildDemoEvents(now);
  const recs = getRecommendedEvents(
    events,
    {
      favoriteCategories: ['eletronica'],
      favoriteNeighborhoods: ['Cidade Baixa'],
      savedFavorites: [],
    },
    now,
  );
  assert.ok(recs.length > 0);
  assert.equal(recs[0].event.id, 'demo-noite-de-pista-cb');
  assert.ok(recs[0].score >= 5);
  assert.ok(recs[0].reasons.includes('Combina com teu estilo'));
  assert.ok(recs[0].reasons.includes('Em Cidade Baixa'));
});

test('getRecommendedEvents excludes already-favorited events and uses them to infer taste', () => {
  const now = new Date('2026-11-18T18:00:00Z');
  const events = buildDemoEvents(now);
  const recs = getRecommendedEvents(
    events,
    {
      favoriteCategories: [],
      favoriteNeighborhoods: [],
      savedFavorites: [
        {
          id: 'fav-1',
          userId: 'u1',
          targetType: 'event',
          targetId: 'demo-noite-de-pista-cb',
          title: 'Noite de Pista',
        },
      ],
    },
    now,
  );
  assert.ok(recs.every((r) => r.event.id !== 'demo-noite-de-pista-cb'));
  // Should recommend other Cidade Baixa event (demo-funk-hiphop-cb)
  assert.ok(recs.some((r) => r.event.id === 'demo-funk-hiphop-cb'));
});
