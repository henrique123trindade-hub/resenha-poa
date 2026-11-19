import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BORA_JUNTO_LIMITS,
  validateParticipantName,
  validatePollTitle,
} from './boraJuntoForm.ts';

test('validateParticipantName rejects empty and 1-char names and normalizes valid names', () => {
  const empty = validateParticipantName('   ');
  assert.equal(empty.valid, false);
  assert.ok(empty.error);

  const tooShort = validateParticipantName('A');
  assert.equal(tooShort.valid, false);
  assert.match(tooShort.error || '', /2 caracteres/);

  const valid = validateParticipantName('  Marina   Silva  ');
  assert.equal(valid.valid, true);
  assert.equal(valid.normalized, 'Marina Silva');
  assert.equal(valid.error, null);
});

test('validateParticipantName enforces maximum length cleanly', () => {
  const overLimit = 'A'.repeat(BORA_JUNTO_LIMITS.PARTICIPANT_NAME_MAX + 5);
  const result = validateParticipantName(overLimit);
  assert.equal(result.valid, false);
  assert.equal(result.normalized.length, BORA_JUNTO_LIMITS.PARTICIPANT_NAME_MAX);
});

test('validatePollTitle enforces min/max bounds and trims whitespace', () => {
  assert.equal(validatePollTitle('').valid, false);
  assert.equal(validatePollTitle('CB').valid, false);

  const ok = validatePollTitle('  Rolê de sábado na CB  ');
  assert.equal(ok.valid, true);
  assert.equal(ok.normalized, 'Rolê de sábado na CB');
  assert.equal(ok.error, null);

  const tooLong = validatePollTitle('X'.repeat(BORA_JUNTO_LIMITS.POLL_TITLE_MAX + 3));
  assert.equal(tooLong.valid, false);
});
