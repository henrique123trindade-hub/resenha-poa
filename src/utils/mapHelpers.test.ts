import test from 'node:test';
import assert from 'node:assert/strict';
import {
  POA_DEFAULT_CENTER,
  buildDirectionsUrl,
  haversineKm,
  isValidCoordinate,
  resolveMapCenter,
} from './mapHelpers';

test('isValidCoordinate accepts valid Porto Alegre coordinates and rejects invalid inputs', () => {
  assert.equal(isValidCoordinate(-30.0346, -51.2177), true);
  assert.equal(isValidCoordinate(95, -51.2), false);
  assert.equal(isValidCoordinate(-30, 190), false);
  assert.equal(isValidCoordinate(Number.NaN, -51.2), false);
  assert.equal(isValidCoordinate(undefined, -51.2), false);
});

test('haversineKm returns ~0 for identical points and reasonable POA neighborhood distance', () => {
  assert.equal(haversineKm(POA_DEFAULT_CENTER, POA_DEFAULT_CENTER), 0);
  // Cidade Baixa (-30.0398, -51.2225) to Moinhos de Vento (-30.0255, -51.2016) is roughly 2.5 km
  const dist = haversineKm(
    { lat: -30.0398, lng: -51.2225 },
    { lat: -30.0255, lng: -51.2016 },
  );
  assert.ok(dist > 2.0 && dist < 3.2, `Expected ~2.5km, got ${dist}`);
});

test('resolveMapCenter prioritizes explicit center, then selectedId, then first marker, then POA default', () => {
  const markers = [
    { id: 'm1', lat: -30.039, lng: -51.222 },
    { id: 'm2', lat: -30.025, lng: -51.201 },
  ];

  assert.deepEqual(
    resolveMapCenter(markers, { center: { lat: -30.01, lng: -51.19 }, selectedId: 'm2' }),
    { lat: -30.01, lng: -51.19 },
  );

  assert.deepEqual(resolveMapCenter(markers, { selectedId: 'm2' }), {
    lat: -30.025,
    lng: -51.201,
  });

  assert.deepEqual(resolveMapCenter(markers), {
    lat: -30.039,
    lng: -51.222,
  });

  assert.deepEqual(resolveMapCenter([]), POA_DEFAULT_CENTER);
});

test('buildDirectionsUrl encodes coordinates cleanly', () => {
  const url = buildDirectionsUrl(-30.0346, -51.2177, 'Noite Infra');
  assert.ok(url.startsWith('https://www.google.com/maps/search/?api=1&query='));
  assert.ok(url.includes('-30.0346'));
  assert.ok(url.includes('Noite%20Infra'));
});
