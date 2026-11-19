import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRouteScrollAction } from './scrollNavigation';

test('resolveRouteScrollAction returns instant-top when pathname changes via PUSH, REPLACE, or POP', () => {
  assert.equal(
    resolveRouteScrollAction({
      pathname: '/eventos',
      hash: '',
      prevPathname: '/',
      navigationType: 'PUSH',
    }),
    'instant-top',
  );

  assert.equal(
    resolveRouteScrollAction({
      pathname: '/bares',
      hash: '',
      prevPathname: '/eventos',
      navigationType: 'POP',
    }),
    'instant-top',
  );

  assert.equal(
    resolveRouteScrollAction({
      pathname: '/mapa',
      hash: '',
      prevPathname: '/bares',
      navigationType: 'REPLACE',
    }),
    'instant-top',
  );
});

test('resolveRouteScrollAction returns instant-top when tapping the currently active route via PUSH', () => {
  assert.equal(
    resolveRouteScrollAction({
      pathname: '/eventos',
      hash: '',
      prevPathname: '/eventos',
      navigationType: 'PUSH',
    }),
    'instant-top',
  );
});

test('resolveRouteScrollAction preserves scroll when filtering in-place via REPLACE on same pathname', () => {
  assert.equal(
    resolveRouteScrollAction({
      pathname: '/eventos',
      hash: '',
      prevPathname: '/eventos',
      navigationType: 'REPLACE',
    }),
    'none',
  );
});

test('resolveRouteScrollAction handles #top and named section hashes cleanly', () => {
  assert.equal(
    resolveRouteScrollAction({
      pathname: '/',
      hash: '#top',
      prevPathname: '/',
      navigationType: 'REPLACE',
    }),
    'instant-top',
  );

  assert.equal(
    resolveRouteScrollAction({
      pathname: '/sobre',
      hash: '#contato',
      prevPathname: '/',
      navigationType: 'PUSH',
    }),
    'hash-target',
  );
});

test('resolveRouteScrollAction does not jump on initial mount without hash', () => {
  assert.equal(
    resolveRouteScrollAction({
      pathname: '/',
      hash: '',
      prevPathname: null,
      navigationType: 'POP',
    }),
    'none',
  );
});
