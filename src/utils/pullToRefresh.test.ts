import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyPullResistance,
  computePullProgress,
  getPullStatusLabel,
  PULL_MAX_DISTANCE,
  PULL_TRIGGER_THRESHOLD,
  resolvePullPhase,
  shouldStartPullGesture,
} from './pullToRefresh';

test('applyPullResistance clamps non-positive values and asymptotically approaches maxDistance', () => {
  assert.equal(applyPullResistance(0), 0);
  assert.equal(applyPullResistance(-40), 0);
  const small = applyPullResistance(30);
  const medium = applyPullResistance(120);
  const huge = applyPullResistance(1200);
  assert.ok(small > 0 && small < 30);
  assert.ok(medium > small && medium < PULL_MAX_DISTANCE);
  assert.ok(huge <= PULL_MAX_DISTANCE && huge > PULL_MAX_DISTANCE * 0.95);
});

test('computePullProgress clamps between 0 and 1 relative to threshold', () => {
  assert.equal(computePullProgress(-5), 0);
  assert.equal(computePullProgress(0), 0);
  assert.equal(computePullProgress(PULL_TRIGGER_THRESHOLD / 2), 0.5);
  assert.equal(computePullProgress(PULL_TRIGGER_THRESHOLD), 1);
  assert.equal(computePullProgress(PULL_TRIGGER_THRESHOLD * 3), 1);
});

test('shouldStartPullGesture protects scrolled pages, horizontal carousels, and excluded targets', () => {
  assert.equal(
    shouldStartPullGesture({ scrollTop: 0, deltaY: 24, deltaX: 2 }),
    true,
  );
  // Already scrolled down
  assert.equal(
    shouldStartPullGesture({ scrollTop: 12, deltaY: 32, deltaX: 0 }),
    false,
  );
  // Upward drag
  assert.equal(
    shouldStartPullGesture({ scrollTop: 0, deltaY: -20, deltaX: 0 }),
    false,
  );
  // Below slop threshold
  assert.equal(
    shouldStartPullGesture({ scrollTop: 0, deltaY: 8, deltaX: 0 }),
    false,
  );
  // Horizontal carousel swipe
  assert.equal(
    shouldStartPullGesture({ scrollTop: 0, deltaY: 18, deltaX: 25 }),
    false,
  );
  // Excluded interactive target (e.g. map or input)
  assert.equal(
    shouldStartPullGesture({ scrollTop: 0, deltaY: 40, deltaX: 0, isExcludedTarget: true }),
    false,
  );
  // Disabled state (e.g. already refreshing)
  assert.equal(
    shouldStartPullGesture({ scrollTop: 0, deltaY: 40, deltaX: 0, isDisabled: true }),
    false,
  );
});

test('resolvePullPhase and getPullStatusLabel cover all lifecycle states', () => {
  assert.equal(
    resolvePullPhase({ pullDistance: 0, isRefreshing: false, justCompleted: false }),
    'idle',
  );
  assert.equal(
    resolvePullPhase({ pullDistance: 35, isRefreshing: false, justCompleted: false }),
    'pulling',
  );
  assert.equal(
    resolvePullPhase({
      pullDistance: PULL_TRIGGER_THRESHOLD,
      isRefreshing: false,
      justCompleted: false,
    }),
    'armed',
  );
  assert.equal(
    resolvePullPhase({ pullDistance: 56, isRefreshing: true, justCompleted: false }),
    'refreshing',
  );
  assert.equal(
    resolvePullPhase({ pullDistance: 0, isRefreshing: false, justCompleted: true }),
    'complete',
  );

  assert.equal(getPullStatusLabel('idle'), '');
  assert.equal(getPullStatusLabel('pulling'), 'Puxe para atualizar os rolês');
  assert.equal(getPullStatusLabel('armed'), 'Solte para atualizar');
  assert.equal(getPullStatusLabel('refreshing'), 'Atualizando rolês de POA...');
  assert.equal(getPullStatusLabel('complete'), 'Catálogo atualizado');
});
