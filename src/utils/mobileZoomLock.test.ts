import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldBlockTouchZoom } from './mobileZoomLock';

test('shouldBlockTouchZoom blocks multi-touch pinch outside map', () => {
  assert.equal(shouldBlockTouchZoom({ touchCount: 2, isInsideMap: false }), true);
  assert.equal(shouldBlockTouchZoom({ touchCount: 3, isInsideMap: false }), true);
});

test('shouldBlockTouchZoom blocks Safari non-1 scale pinch outside map', () => {
  assert.equal(shouldBlockTouchZoom({ touchCount: 1, scale: 1.25, isInsideMap: false }), true);
  assert.equal(shouldBlockTouchZoom({ touchCount: 1, scale: 0.85, isInsideMap: false }), true);
});

test('shouldBlockTouchZoom allows normal single-finger scroll and tap', () => {
  assert.equal(shouldBlockTouchZoom({ touchCount: 1, scale: 1, isInsideMap: false }), false);
  assert.equal(shouldBlockTouchZoom({ touchCount: 1, isInsideMap: false }), false);
});

test('shouldBlockTouchZoom does not hijack touch gestures inside interactive map', () => {
  assert.equal(shouldBlockTouchZoom({ touchCount: 2, scale: 1.4, isInsideMap: true }), false);
});
