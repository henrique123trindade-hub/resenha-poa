import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDaysISO,
  getPoaNowParts,
  getWeekendDatesISO,
  isEventPast,
  isVenueOpenNow,
  resolveQuickDateISO,
} from './datePoa';
import type { WeeklyOpeningHours } from '../types/resenha';

test('getPoaNowParts converts UTC timestamp accurately to America/Sao_Paulo (-03:00)', () => {
  // 2026-11-21 01:30 UTC is 2026-11-20 22:30 in Porto Alegre (Friday)
  const utcDate = new Date('2026-11-21T01:30:00Z');
  const parts = getPoaNowParts(utcDate);
  assert.equal(parts.dateISO, '2026-11-20');
  assert.equal(parts.hour, 22);
  assert.equal(parts.minute, 30);
  assert.equal(parts.weekday, 5); // Friday
});

test('resolveQuickDateISO calculates today, tomorrow, friday, saturday, sunday in POA', () => {
  // Tuesday 2026-11-17 15:00 BRT -> 18:00 UTC
  const tuesday = new Date('2026-11-17T18:00:00Z');
  assert.equal(resolveQuickDateISO('today', tuesday), '2026-11-17');
  assert.equal(resolveQuickDateISO('tomorrow', tuesday), '2026-11-18');
  assert.equal(resolveQuickDateISO('friday', tuesday), '2026-11-20');
  assert.equal(resolveQuickDateISO('saturday', tuesday), '2026-11-21');
  assert.equal(resolveQuickDateISO('sunday', tuesday), '2026-11-22');
});

test('getWeekendDatesISO handles mid-week and Saturday correctly', () => {
  const tuesday = new Date('2026-11-17T18:00:00Z');
  assert.deepEqual(getWeekendDatesISO(tuesday), {
    friday: '2026-11-20',
    saturday: '2026-11-21',
    sunday: '2026-11-22',
  });

  const saturday = new Date('2026-11-21T18:00:00Z');
  assert.deepEqual(getWeekendDatesISO(saturday), {
    friday: '2026-11-20',
    saturday: '2026-11-21',
    sunday: '2026-11-22',
  });
});

test('isEventPast filters past days without hiding overnight events starting today', () => {
  const now = new Date('2026-11-20T22:00:00-03:00');
  assert.equal(isEventPast('2026-11-19', '23:00', now), true);
  assert.equal(isEventPast('2026-11-20', '04:00', now), false);
  assert.equal(isEventPast('2026-11-21', '20:00', now), false);
});

test('isVenueOpenNow returns null when hoursVerified is false and evaluates overnight shifts when true', () => {
  const hours: WeeklyOpeningHours = {
    5: { open: '18:00', close: '02:00' }, // Friday 18h -> Saturday 02h
    6: { open: '18:00', close: '03:00' },
  };
  assert.equal(isVenueOpenNow(hours, false), null);

  // Saturday 01:15 BRT (04:15 UTC) should still be open from Friday's shift
  const satEarly = new Date('2026-11-21T04:15:00Z');
  assert.equal(isVenueOpenNow(hours, true, satEarly), true);

  // Saturday 14:00 BRT (17:00 UTC) should be closed
  const satAfternoon = new Date('2026-11-21T17:00:00Z');
  assert.equal(isVenueOpenNow(hours, true, satAfternoon), false);
  assert.equal(addDaysISO('2026-11-30', 1), '2026-12-01');
});
