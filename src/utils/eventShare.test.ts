import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildEventSharePayload,
  buildSocialShareLinks,
  shareEventWithWebShare,
} from './eventShare.ts';

const sampleEvent = {
  title: 'Noite de Pista: Eletro & Baile',
  dateISO: '2026-11-20',
  startTime: '23:00',
  neighborhood: 'Cidade Baixa',
  venueName: 'Club CB',
};

test('buildEventSharePayload formats title, Porto Alegre location, and URL cleanly', () => {
  const payload = buildEventSharePayload(
    sampleEvent,
    'https://resenhapoa.app/eventos/noite-de-pista',
  );
  assert.equal(payload.title, 'Noite de Pista: Eletro & Baile · ResenhaPOA');
  assert.match(payload.text, /Noite de Pista: Eletro & Baile/);
  assert.match(payload.text, /23:00/);
  assert.match(payload.text, /Club CB \(Cidade Baixa, Porto Alegre\)/);
  assert.equal(payload.url, 'https://resenhapoa.app/eventos/noite-de-pista');
});

test('buildSocialShareLinks produces properly encoded social platform intent URLs', () => {
  const payload = buildEventSharePayload(
    sampleEvent,
    'https://resenhapoa.app/eventos/noite-de-pista',
  );
  const links = buildSocialShareLinks(payload);

  assert.ok(links.whatsapp.startsWith('https://wa.me/?text='));
  assert.ok(links.x.startsWith('https://twitter.com/intent/tweet?text='));
  assert.ok(links.facebook.startsWith('https://www.facebook.com/sharer/sharer.php?u='));
  assert.ok(links.telegram.startsWith('https://t.me/share/url?url='));
  assert.ok(links.x.includes(encodeURIComponent(payload.url)));
});

test('shareEventWithWebShare invokes navigator.share and reports shared', async () => {
  let received: ShareData | undefined;
  const payload = buildEventSharePayload(sampleEvent, 'https://resenhapoa.app/eventos/teste');
  const outcome = await shareEventWithWebShare(payload, {
    canShare: () => true,
    share: async (data) => {
      received = data;
    },
  });

  assert.equal(outcome, 'shared');
  assert.deepEqual(received, payload);
});

test('shareEventWithWebShare treats AbortError as cancelled without triggering fallback', async () => {
  const payload = buildEventSharePayload(sampleEvent, 'https://resenhapoa.app/eventos/teste');
  const outcome = await shareEventWithWebShare(payload, {
    share: async () => {
      const abortErr = new Error('User cancelled share');
      abortErr.name = 'AbortError';
      throw abortErr;
    },
  });

  assert.equal(outcome, 'cancelled');
});

test('shareEventWithWebShare falls back cleanly when Web Share API is unsupported or denied', async () => {
  const payload = buildEventSharePayload(sampleEvent, 'https://resenhapoa.app/eventos/teste');

  const unsupported = await shareEventWithWebShare(payload, {});
  assert.equal(unsupported, 'fallback');

  const denied = await shareEventWithWebShare(payload, {
    share: async () => {
      const err = new Error('Not allowed');
      err.name = 'NotAllowedError';
      throw err;
    },
  });
  assert.equal(denied, 'fallback');
});
