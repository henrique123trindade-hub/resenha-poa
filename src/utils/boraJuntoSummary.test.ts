import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWhatsAppResultMessage,
  computePollRanking,
  filterPollCatalogItems,
} from './boraJuntoSummary';
import type { PollOption, PollVoteItem } from '../types/resenha';

const OPTIONS: PollOption[] = [
  {
    id: 'opt-1',
    targetType: 'event',
    targetId: 'e1',
    title: 'Baile da CB',
    subtitle: 'Sex · 23:00',
    neighborhood: 'Cidade Baixa',
    slug: 'baile-cb',
  },
  {
    id: 'opt-2',
    targetType: 'venue',
    targetId: 'v1',
    title: 'Bar do 4D',
    subtitle: 'Cervejaria',
    neighborhood: 'Quarto Distrito',
    slug: 'bar-4d',
  },
];

test('computePollRanking identifies single leader and percentages accurately', () => {
  const votes: PollVoteItem[] = [
    { voterId: 'u1', voterLabel: 'Ana', optionId: 'opt-2' },
    { voterId: 'u2', voterLabel: 'Pedro', optionId: 'opt-2' },
    { voterId: 'u3', voterLabel: 'Lia', optionId: 'opt-1' },
  ];

  const summary = computePollRanking(OPTIONS, votes);
  assert.equal(summary.totalVotes, 3);
  assert.equal(summary.isTie, false);
  assert.equal(summary.leaders.length, 1);
  assert.equal(summary.leaders[0].option.id, 'opt-2');
  assert.equal(summary.leaders[0].percentage, 67);
  assert.equal(summary.ranked[0].option.id, 'opt-2');
});

test('computePollRanking detects ties without picking an arbitrary sole winner', () => {
  const votes: PollVoteItem[] = [
    { voterId: 'u1', voterLabel: 'Ana', optionId: 'opt-1' },
    { voterId: 'u2', voterLabel: 'Pedro', optionId: 'opt-2' },
  ];

  const summary = computePollRanking(OPTIONS, votes);
  assert.equal(summary.isTie, true);
  assert.equal(summary.leaders.length, 2);

  const msg = buildWhatsAppResultMessage({
    title: 'Sexta em POA',
    summary,
    shareUrl: 'https://resenhapoa.app/bora-junto/123',
    isOpen: true,
  });
  assert.match(msg, /empate entre Baile da CB × Bar do 4D/i);
});

test('buildWhatsAppResultMessage summarizes clear leader when poll is closed', () => {
  const votes: PollVoteItem[] = [
    { voterId: 'u1', voterLabel: 'Ana', optionId: 'opt-1' },
    { voterId: 'u2', voterLabel: 'Pedro', optionId: 'opt-1' },
  ];
  const summary = computePollRanking(OPTIONS, votes);
  const msg = buildWhatsAppResultMessage({
    title: 'Sexta em POA',
    summary,
    shareUrl: 'https://resenhapoa.app/bora-junto/123',
    isOpen: false,
  });
  assert.match(msg, /Rolê definido/i);
  assert.match(msg, /Baile da CB/);
  assert.match(msg, /100%/);
});

test('filterPollCatalogItems searches accent-insensitively by title or neighborhood', () => {
  const found = filterPollCatalogItems(OPTIONS, 'quarto', (o) => o.title);
  assert.equal(found.length, 1);
  assert.equal(found[0].id, 'opt-2');
});
