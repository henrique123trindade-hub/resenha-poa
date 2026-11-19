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

  const signupFallback = formatFirebaseAuthError(new Error('unexpected'), '', 'signup');
  assert.match(signupFallback, /criar sua conta/i);
});

test('formatFirebaseAuthError maps email/password errors cleanly without enumerating login accounts', () => {
  const invalidCred = formatFirebaseAuthError({ code: 'auth/invalid-credential' }, '', 'login');
  const wrongPass = formatFirebaseAuthError({ code: 'auth/wrong-password' }, '', 'login');
  const notFound = formatFirebaseAuthError({ code: 'auth/user-not-found' }, '', 'login');
  assert.equal(invalidCred, wrongPass);
  assert.equal(wrongPass, notFound);
  assert.match(invalidCred, /E-mail ou senha incorretos/i);

  const inUse = formatFirebaseAuthError({ code: 'auth/email-already-in-use' }, '', 'signup');
  assert.match(inUse, /Já existe uma conta/i);

  const weak = formatFirebaseAuthError({ code: 'auth/weak-password' }, '', 'signup');
  assert.match(weak, /senha mais forte/i);

  const tooMany = formatFirebaseAuthError({ code: 'auth/too-many-requests' }, '', 'login');
  assert.match(tooMany, /Muitas tentativas/i);

  const disabledProvider = formatFirebaseAuthError(
    { code: 'auth/operation-not-allowed' },
    '',
    'signup',
  );
  assert.match(disabledProvider, /Sign-in method/i);
});
