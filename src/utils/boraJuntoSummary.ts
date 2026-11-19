import type { PollOption, PollVoteItem } from '../types/resenha';
import { normalizePtBr } from './eventFilters';

export interface RankedPollOption {
  option: PollOption;
  votes: PollVoteItem[];
  voteCount: number;
  percentage: number;
  isLeader: boolean;
}

export interface PollRankingSummary {
  totalVotes: number;
  ranked: RankedPollOption[];
  leaders: RankedPollOption[];
  isTie: boolean;
}

export function computePollRanking(
  options: PollOption[],
  votes: PollVoteItem[],
): PollRankingSummary {
  const totalVotes = votes.length;
  const withCounts = options.map((option, originalIndex) => {
    const optVotes = votes.filter((v) => v.optionId === option.id);
    const voteCount = optVotes.length;
    const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
    return {
      option,
      votes: optVotes,
      voteCount,
      percentage,
      originalIndex,
    };
  });

  const maxVotes = withCounts.reduce((max, item) => Math.max(max, item.voteCount), 0);

  const ranked: RankedPollOption[] = withCounts
    .sort((a, b) => {
      if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
      return a.originalIndex - b.originalIndex;
    })
    .map(({ option, votes: optVotes, voteCount, percentage }) => ({
      option,
      votes: optVotes,
      voteCount,
      percentage,
      isLeader: maxVotes > 0 && voteCount === maxVotes,
    }));

  const leaders = ranked.filter((item) => item.isLeader);

  return {
    totalVotes,
    ranked,
    leaders,
    isTie: leaders.length > 1,
  };
}

export function buildWhatsAppResultMessage(params: {
  title: string;
  summary: PollRankingSummary;
  shareUrl: string;
  isOpen: boolean;
}): string {
  const { title, summary, shareUrl, isOpen } = params;
  if (summary.totalVotes === 0 || summary.leaders.length === 0) {
    return `Bora decidir o rolê em POA! Vota aí na lista "${title}": ${shareUrl}`;
  }

  const statusLine = isOpen ? 'Resultado parcial' : 'Rolê definido';

  if (summary.isTie) {
    const tiedNames = summary.leaders.map((l) => l.option.title).join(' × ');
    return `${statusLine} no Bora Junto "${title}": empate entre ${tiedNames} (${summary.leaders[0].voteCount} ${
      summary.leaders[0].voteCount === 1 ? 'voto' : 'votos'
    } cada, de ${summary.totalVotes}). Vem desempatar: ${shareUrl}`;
  }

  const top = summary.leaders[0];
  return `${statusLine} no Bora Junto "${title}": "${top.option.title}" (${top.option.neighborhood}) tá na frente com ${top.voteCount}/${summary.totalVotes} votos (${top.percentage}%). Confere e vota: ${shareUrl}`;
}

export function filterPollCatalogItems<T extends { neighborhood: string }>(
  items: T[],
  query: string,
  getText: (item: T) => string,
): T[] {
  const q = normalizePtBr(query);
  if (!q) return items;
  return items.filter((item) => normalizePtBr(`${getText(item)} ${item.neighborhood}`).includes(q));
}
