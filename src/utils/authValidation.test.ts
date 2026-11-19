import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getDisplayInitials,
  resolveBoraJuntoInitialName,
  validateDisplayName,
  validateEmail,
  validateLoginPassword,
  validatePasswordConfirmation,
  validatePasswordForSignup,
} from './authValidation';

test('validateDisplayName trims spaces and enforces min/max length', () => {
  assert.equal(validateDisplayName('   ').valid, false);
  assert.equal(validateDisplayName('A').valid, false);

  const ok = validateDisplayName('  Lucas   Silva  ');
  assert.equal(ok.valid, true);
  assert.equal(ok.normalized, 'Lucas Silva');
  assert.equal(ok.error, null);

  assert.equal(validateDisplayName('x'.repeat(81)).valid, false);
});

test('validateEmail normalizes case and rejects malformed emails', () => {
  assert.equal(validateEmail('').valid, false);
  assert.equal(validateEmail('sem-arroba').valid, false);
  assert.equal(validateEmail('user@dominio').valid, false);

  const ok = validateEmail('  Maria.POA@Gmail.com  ');
  assert.equal(ok.valid, true);
  assert.equal(ok.normalized, 'maria.poa@gmail.com');
  assert.equal(ok.error, null);
});

test('validatePasswordForSignup enforces >=8 chars, letter, and number', () => {
  const empty = validatePasswordForSignup('');
  assert.equal(empty.valid, false);

  const short = validatePasswordForSignup('abc123');
  assert.equal(short.valid, false);
  assert.equal(short.checks.minLength, false);

  const noNumber = validatePasswordForSignup('resenhapoa');
  assert.equal(noNumber.valid, false);
  assert.equal(noNumber.checks.hasLetter, true);
  assert.equal(noNumber.checks.hasNumber, false);

  const noLetter = validatePasswordForSignup('12345678');
  assert.equal(noLetter.valid, false);
  assert.equal(noLetter.checks.hasLetter, false);
  assert.equal(noLetter.checks.hasNumber, true);

  const valid = validatePasswordForSignup('Resenha2026');
  assert.equal(valid.valid, true);
  assert.equal(valid.error, null);
  assert.equal(valid.checks.minLength, true);
  assert.equal(valid.checks.hasLetter, true);
  assert.equal(valid.checks.hasNumber, true);
});

test('validatePasswordConfirmation checks equality without leaking details', () => {
  assert.equal(validatePasswordConfirmation('Resenha2026', '').valid, false);
  assert.equal(validatePasswordConfirmation('Resenha2026', 'Resenha2025').valid, false);
  assert.equal(validatePasswordConfirmation('Resenha2026', 'Resenha2026').valid, true);
});

test('validateLoginPassword rejects empty passwords and accepts non-empty ones', () => {
  assert.equal(validateLoginPassword('').valid, false);
  assert.equal(validateLoginPassword('qualquer1').valid, true);
});

test('getDisplayInitials extracts monogram from name or email', () => {
  assert.equal(getDisplayInitials('Camila Duarte', 'camila@poa.br'), 'CD');
  assert.equal(getDisplayInitials('Rafa', null), 'RA');
  assert.equal(getDisplayInitials('', 'henrique@gmail.com'), 'HE');
  assert.equal(getDisplayInitials('', ''), 'RP');
});

test('resolveBoraJuntoInitialName preserves existing group vote label and suggests profile name otherwise', () => {
  // Never overwrite an already chosen name in the current group
  assert.equal(
    resolveBoraJuntoInitialName({
      existingVoteLabel: 'Lu da CB',
      profileName: 'Lucas Trindade',
      userDisplayName: 'Lucas',
      savedGuestName: 'Convidado',
      isSignedIn: true,
    }),
    'Lu da CB',
  );

  // Suggests profile displayName when signed in without an existing vote
  assert.equal(
    resolveBoraJuntoInitialName({
      existingVoteLabel: null,
      profileName: 'Ana Paula',
      userDisplayName: 'Ana',
      savedGuestName: 'Visitante antigo',
      isSignedIn: true,
    }),
    'Ana Paula',
  );

  // Falls back to saved guest name when logged out
  assert.equal(
    resolveBoraJuntoInitialName({
      existingVoteLabel: null,
      profileName: null,
      userDisplayName: null,
      savedGuestName: 'Beto',
      isSignedIn: false,
    }),
    'Beto',
  );
});
