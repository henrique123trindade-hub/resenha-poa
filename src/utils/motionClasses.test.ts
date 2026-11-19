import test from 'node:test';
import assert from 'node:assert/strict';
import { getEventCardDelayClass, getEventCardRevealClasses } from './motionClasses';

test('getEventCardDelayClass maps indices cleanly and clamps out-of-range values', () => {
  assert.equal(getEventCardDelayClass(-3), 'motion-safe:[animation-delay:0ms]');
  assert.equal(getEventCardDelayClass(0), 'motion-safe:[animation-delay:0ms]');
  assert.equal(getEventCardDelayClass(1), 'motion-safe:[animation-delay:65ms]');
  assert.equal(getEventCardDelayClass(5), 'motion-safe:[animation-delay:325ms]');
  assert.equal(getEventCardDelayClass(12), 'motion-safe:[animation-delay:325ms]');
  assert.equal(getEventCardDelayClass(Number.NaN), 'motion-safe:[animation-delay:0ms]');
});

test('getEventCardRevealClasses uses motion-safe fade-in and motion-reduce safeguards when visible', () => {
  const classes = getEventCardRevealClasses({
    isVisible: true,
    index: 2,
    prefersReducedMotion: false,
  });

  assert.match(classes, /\bmotion-safe:animate-event-fade-in\b/);
  assert.match(classes, /motion-safe:\[animation-delay:130ms\]/);
  assert.match(classes, /\bmotion-reduce:animate-none\b/);
  assert.match(classes, /\bmotion-reduce:opacity-100\b/);
  assert.match(classes, /\bmotion-reduce:translate-y-0\b/);
});

test('getEventCardRevealClasses only hides pre-scroll cards under motion-safe', () => {
  const classes = getEventCardRevealClasses({
    isVisible: false,
    index: 0,
    prefersReducedMotion: false,
  });

  assert.match(classes, /\bmotion-safe:opacity-0\b/);
  assert.match(classes, /\bmotion-safe:translate-y-3\b/);
  assert.match(classes, /\bmotion-reduce:opacity-100\b/);
  assert.match(classes, /\bmotion-reduce:translate-y-0\b/);
  assert.doesNotMatch(classes, /\banimate-event-fade-in\b/);
});

test('getEventCardRevealClasses disables animation completely when prefersReducedMotion is true', () => {
  const hiddenState = getEventCardRevealClasses({
    isVisible: false,
    index: 3,
    prefersReducedMotion: true,
  });
  const visibleState = getEventCardRevealClasses({
    isVisible: true,
    index: 3,
    prefersReducedMotion: true,
  });

  for (const classes of [hiddenState, visibleState]) {
    assert.match(classes, /\bopacity-100\b/);
    assert.match(classes, /\btranslate-y-0\b/);
    assert.match(classes, /\bmotion-reduce:animate-none\b/);
    assert.doesNotMatch(classes, /animate-event-fade-in/);
    assert.doesNotMatch(classes, /opacity-0/);
  }
});
