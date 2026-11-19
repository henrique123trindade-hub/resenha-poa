import assert from 'node:assert/strict';
import test from 'node:test';
import { formatFirebaseAuthError } from './authError.ts';

test('formatFirebaseAuthError explains unauthorized-domain with current hostname', () => {
  const msg = formatFirebaseAuthError(
    { code: 'auth/unauthorized-domain', message: 'Firebase: Error (auth/unauthorized-domain).' },
    'resenhapoa.com.br',
  );
  assert.match(msg, /resenhapoa\.com\.br/);
  assert.match(msg, /Authorized domains/i);
});

test('formatFirebaseAuthError handles popup-blocked and popup-closed gracefully', () => {
  const blocked = formatFirebaseAuthError(new Error('Firebase: Error (auth/popup-blocked).'));
  assert.match(blocked, /bloqueou/i);

  const closed = formatFirebaseAuthError({ code: 'auth/popup-closed-by-user' });
  assert.match(closed, /fechada/i);
});

test('formatFirebaseAuthError returns clean fallback for unknown errors', () => {
  const fallback = formatFirebaseAuthError(new Error('unexpected failure'));
  assert.match(fallback, /Não foi possível entrar com o Google/i);
});
