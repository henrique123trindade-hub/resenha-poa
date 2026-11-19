import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Check,
  Copy,
  Lock,
  Search,
  Share2,
  Trophy,
  Unlock,
  Users,
  Vote,
} from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useCatalog } from '../contexts/CatalogContext';
import { useAuth } from '../contexts/AuthContext';
import {
  castPollVote,
  createPollListInFirestore,
  fetchPollListById,
  fetchPollVotes,
  fetchUserPollLists,
} from '../services/firestoreService';
import type { PollListItem, PollOption, PollVoteItem } from '../types/resenha';
import { formatEventDatePtBr } from '../utils/datePoa';
import {
  buildWhatsAppResultMessage,
  computePollRanking,
  filterPollCatalogItems,
} from '../utils/boraJuntoSummary';
import { useDocumentHead } from '../utils/seoHead';
import { SectionKicker } from '../components/BrandMark';
import { useToast } from '../components/Layout';

const GUEST_VOTER_KEY = 'resenhapoa_guest_voter_id';

function getOrCreateGuestVoterId(): string {
  const existing = localStorage.getItem(GUEST_VOTER_KEY);
  if (existing && /^[a-zA-Z0-9_-]{6,64}$/.test(existing)) return existing;
  const created = `guest_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  localStorage.setItem(GUEST_VOTER_KEY, created);
  return created;
}

export const BoraJuntoPage: React.FC = () => {
  const { listId } = useParams<{ listId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { events, venues } = useCatalog();
  const { user, openAuthModal } = useAuth();
  const { notify } = useToast();

  // Mode 1: Viewing & Voting on an existing shared list
  const [poll, setPoll] = useState<PollListItem | null>(null);
  const [votes, setVotes] = useState<PollVoteItem[]>([]);
  const [loadingPoll, setLoadingPoll] = useState(Boolean(listId));
  const [voterName, setVoterName] = useState('');
  const [votingBusy, setVotingBusy] = useState(false);

  // Mode 2: Creating a new list
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<PollOption[]>([]);
  const [catalogQuery, setCatalogQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [myLists, setMyLists] = useState<PollListItem[]>([]);

  useDocumentHead({
    title: poll ? `${poll.title} · Bora Junto — ResenhaPOA` : 'Bora Junto · Decida o rolê com a galera — ResenhaPOA',
    description:
      poll?.description ||
      'Monte uma lista com festas e bares de Porto Alegre, compartilhe no WhatsApp e vote com a galera.',
  });

  // Pre-seed from ?add=eventId or ?addVenue=venueId
  useEffect(() => {
    const addEventId = searchParams.get('add');
    const addVenueId = searchParams.get('addVenue');
    if (addEventId) {
      const ev = events.find((e) => e.id === addEventId);
      if (ev) {
        setSelectedOptions((prev) =>
          prev.some((o) => o.targetId === ev.id)
            ? prev
            : [
                ...prev,
                {
                  id: `opt-${ev.id}`,
                  targetType: 'event',
                  targetId: ev.id,
                  title: ev.title,
                  subtitle: `${formatEventDatePtBr(ev.dateISO)} · ${ev.startTime} · ${ev.venueName}`,
                  neighborhood: ev.neighborhood,
                  slug: ev.slug,
                },
              ],
        );
      }
    }
    if (addVenueId) {
      const v = venues.find((item) => item.id === addVenueId);
      if (v) {
        setSelectedOptions((prev) =>
          prev.some((o) => o.targetId === v.id)
            ? prev
            : [
                ...prev,
                {
                  id: `opt-${v.id}`,
                  targetType: 'venue',
                  targetId: v.id,
                  title: v.name,
                  subtitle: `${v.category} · ${v.address}`,
                  neighborhood: v.neighborhood,
                  slug: v.slug,
                },
              ],
        );
      }
    }
  }, [searchParams, events, venues]);

  // Load user's lists when signed in on creation page
  useEffect(() => {
    if (listId || !user) return;
    fetchUserPollLists(user.uid)
      .then(setMyLists)
      .catch(() => {});
  }, [listId, user]);

  // Load shared poll list when listId is present
  useEffect(() => {
    if (!listId) return;
    let active = true;
    setLoadingPoll(true);
    Promise.all([fetchPollListById(listId), fetchPollVotes(listId)])
      .then(([loadedPoll, loadedVotes]) => {
        if (!active) return;
        setPoll(loadedPoll);
        setVotes(loadedVotes);
      })
      .catch(() => {
        if (active) setPoll(null);
      })
      .finally(() => {
        if (active) setLoadingPoll(false);
      });
    return () => {
      active = false;
    };
  }, [listId]);

  const currentVoterId = useMemo(
    () => (user ? `uid_${user.uid}` : getOrCreateGuestVoterId()),
    [user],
  );

  const myCurrentVote = useMemo(
    () => votes.find((v) => v.voterId === currentVoterId),
    [votes, currentVoterId],
  );

  const publishedEvents = useMemo(
    () => events.filter((e) => e.status === 'published'),
    [events],
  );

  const filteredCatalogEvents = useMemo(
    () =>
      filterPollCatalogItems(
        publishedEvents,
        catalogQuery,
        (ev) => `${ev.title} ${ev.venueName} ${ev.category}`,
      ),
    [publishedEvents, catalogQuery],
  );

  const filteredCatalogVenues = useMemo(
    () =>
      filterPollCatalogItems(
        venues.filter((v) => v.status === 'published'),
        catalogQuery,
        (v) => `${v.name} ${v.category} ${v.musicStyle ?? ''}`,
      ),
    [venues, catalogQuery],
  );

  const toggleCatalogOption = (opt: PollOption) => {
    setSelectedOptions((prev) => {
      const exists = prev.some(
        (o) => o.targetId === opt.targetId && o.targetType === opt.targetType,
      );
      if (exists) {
        return prev.filter((o) => !(o.targetId === opt.targetId && o.targetType === opt.targetType));
      }
      if (prev.length >= 6) {
        notify('Limite de 6 opções por enquete.');
        return prev;
      }
      return [...prev, opt];
    });
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('Entre com sua conta Google para criar e compartilhar uma lista Bora Junto.');
      return;
    }
    if (title.trim().length < 3) {
      notify('Dê um nome para a lista (mínimo 3 caracteres).');
      return;
    }
    if (selectedOptions.length < 2) {
      notify('Escolha pelo menos 2 opções de rolê ou bar para o grupo votar.');
      return;
    }
    setCreating(true);
    try {
      const created = await createPollListInFirestore({
        title,
        description,
        creatorId: user.uid,
        creatorName: user.displayName || 'Organizador do rolê',
        options: selectedOptions,
      });
      notify('Lista Bora Junto criada! Compartilhe o link com o grupo.');
      navigate(`/bora-junto/${created.id}`);
    } catch {
      notify('Não foi possível criar a lista agora.');
    } finally {
      setCreating(false);
    }
  };

  const handleCastVote = async (optionId: string) => {
    if (!poll || !poll.isOpen) return;
    setVotingBusy(true);
    const label = user?.displayName || voterName.trim() || 'Convidado(a)';
    try {
      await castPollVote({
        listId: poll.id,
        voterId: currentVoterId,
        voterLabel: label,
        optionId,
      });
      const updated = await fetchPollVotes(poll.id);
      setVotes(updated);
      notify('Voto registrado na enquete.');
    } catch {
      notify('Não foi possível registrar o voto.');
    } finally {
      setVotingBusy(false);
    }
  };

  const handleTogglePollOpen = async () => {
    if (!poll || !user || poll.creatorId !== user.uid) return;
    const path = `pollLists/${poll.id}`;
    try {
      await updateDoc(doc(db, 'pollLists', poll.id), {
        isOpen: !poll.isOpen,
        updatedAt: serverTimestamp(),
      });
      setPoll({ ...poll, isOpen: !poll.isOpen });
      notify(poll.isOpen ? 'Votação encerrada.' : 'Votação reaberta.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      notify('Link do Bora Junto copiado!');
    } catch {
      notify('Copie a URL do navegador para compartilhar.');
    }
  };

  // --- Shared Poll View ---
  if (listId) {
    if (loadingPoll) {
      return (
        <div className="max-w-[960px] mx-auto px-5 py-20 text-center text-sm text-[#98989F]">
          Carregando enquete Bora Junto...
        </div>
      );
    }

    if (!poll) {
      return (
        <div className="max-w-[960px] mx-auto px-5 py-20 text-center space-y-4 text-[#F7F7F5]">
          <h1 className="font-display text-4xl font-extrabold italic uppercase tracking-tight">
            Lista não encontrada
          </h1>
          <p className="text-sm text-[#98989F]">
            Este link pode estar incorreto ou a lista foi removida.
          </p>
          <Link
            to="/bora-junto"
            className="inline-block px-5 py-3 rounded-xl bg-[#FF5A36] hover:bg-[#FF6F4F] text-[#101012] text-xs font-extrabold uppercase tracking-wider transition-colors"
          >
            Criar nova lista Bora Junto
          </Link>
        </div>
      );
    }

    const ranking = computePollRanking(poll.options, votes);
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
    const inviteWhatsAppHref = `https://wa.me/?text=${encodeURIComponent(
      `Bora decidir o rolê em POA! Vota aí na lista "${poll.title}": ${currentUrl}`,
    )}`;
    const resultWhatsAppHref = `https://wa.me/?text=${encodeURIComponent(
      buildWhatsAppResultMessage({
        title: poll.title,
        summary: ranking,
        shareUrl: currentUrl,
        isOpen: poll.isOpen,
      }),
    )}`;

    return (
      <div className="max-w-[960px] mx-auto px-5 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-7 text-[#F7F7F5]">
        <div className="bg-[#1C1C20] border border-[#28282E] rounded-2xl p-6 sm:p-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#98989F] inline-flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#FF5A36]" /> Bora Junto · Criado por{' '}
              {poll.creatorName}
            </span>
            <span
              className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full inline-flex items-center gap-1.5 ${
                poll.isOpen
                  ? 'bg-[#F7F7F5] text-[#101012]'
                  : 'border border-[#28282E] bg-[#101012] text-[#98989F]'
              }`}
            >
              {poll.isOpen && (
                <span aria-hidden="true" className="w-2 h-2 rounded-full bg-[#34D399]" />
              )}
              {poll.isOpen ? 'Votação aberta' : 'Votação encerrada'}
            </span>
          </div>

          <h1 className="font-display text-3xl sm:text-5xl font-extrabold italic uppercase tracking-tight">
            {poll.title}
          </h1>
          {poll.description && (
            <p className="text-sm sm:text-base text-[#98989F]">{poll.description}</p>
          )}

          <div className="pt-2 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={copyShareUrl}
              className="px-5 py-2.5 min-h-[42px] rounded-xl bg-[#FF5A36] hover:bg-[#FF6F4F] active:scale-[0.98] text-[#101012] text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-2 transition-all"
            >
              <Copy className="w-3.5 h-3.5" /> Copiar link
            </button>
            <a
              href={inviteWhatsAppHref}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 min-h-[42px] rounded-xl border border-[#28282E] bg-[#101012] hover:border-[#F7F7F5]/60 text-[#F7F7F5] text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" /> Convidar no WhatsApp
            </a>
            {ranking.totalVotes > 0 && (
              <a
                href={resultWhatsAppHref}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 min-h-[42px] rounded-xl bg-[#F7F7F5] hover:bg-[#E8E8E6] text-[#101012] text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-2 transition-colors"
              >
                <Trophy className="w-3.5 h-3.5 text-[#FF5A36]" /> Compartilhar resultado
              </a>
            )}
            {user?.uid === poll.creatorId && (
              <button
                type="button"
                onClick={handleTogglePollOpen}
                className="px-4 py-2.5 min-h-[42px] rounded-xl border border-[#28282E] bg-[#101012] hover:border-[#F7F7F5]/60 text-[#F7F7F5] text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 transition-colors"
              >
                {poll.isOpen ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                <span>{poll.isOpen ? 'Encerrar votação' : 'Reabrir votação'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Leading / Most-Voted Highlight Banner */}
        {ranking.totalVotes > 0 && ranking.leaders.length > 0 && (
          <div className="rounded-2xl bg-[#1C1C20] border border-[#FF5A36]/50 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#FF5A36] inline-flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" />
                {ranking.isTie
                  ? 'Empate na liderança'
                  : poll.isOpen
                    ? 'Mais votado pela galera até agora'
                    : 'Rolê vencedor da votação'}
              </p>
              {ranking.isTie ? (
                <p className="font-display text-2xl sm:text-3xl font-extrabold italic uppercase text-[#F7F7F5]">
                  {ranking.leaders.map((l) => l.option.title).join(' × ')}
                </p>
              ) : (
                <p className="font-display text-2xl sm:text-3xl font-extrabold italic uppercase text-[#F7F7F5]">
                  {ranking.leaders[0].option.title}
                </p>
              )}
              <p className="text-xs text-[#98989F] tabular-nums">
                {ranking.leaders[0].voteCount}{' '}
                {ranking.leaders[0].voteCount === 1 ? 'voto' : 'votos'} (
                {ranking.leaders[0].percentage}% de {ranking.totalVotes})
                {!ranking.isTie ? ` · ${ranking.leaders[0].option.neighborhood}` : ''}
              </p>
            </div>

            {!ranking.isTie && (
              <Link
                to={
                  ranking.leaders[0].option.targetType === 'event'
                    ? `/eventos/${ranking.leaders[0].option.slug}`
                    : `/bares/${ranking.leaders[0].option.slug}`
                }
                className="px-4 py-2.5 rounded-xl bg-[#F7F7F5] hover:bg-[#FF5A36] text-[#101012] text-xs font-extrabold uppercase tracking-wider inline-flex items-center justify-center gap-1.5 shrink-0 transition-colors"
              >
                <span>Ver detalhes</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        )}

        {!user && poll.isOpen && (
          <div className="bg-[#1C1C20] border border-[#28282E] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
            <label
              htmlFor="guest-voter-name"
              className="text-xs font-bold uppercase tracking-wider text-[#98989F] shrink-0"
            >
              Seu nome no voto (sem login):
            </label>
            <input
              id="guest-voter-name"
              type="text"
              value={voterName}
              onChange={(e) => setVoterName(e.target.value)}
              placeholder="Ex: Marina"
              className="flex-1 h-10 px-4 bg-[#101012] border border-[#28282E] focus:border-[#FF5A36] rounded-xl text-sm text-[#F7F7F5] placeholder:text-[#98989F] focus:outline-none"
            />
          </div>
        )}

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#98989F]">
            <span className="font-medium tabular-nums text-[#F7F7F5]">
              {ranking.totalVotes}{' '}
              {ranking.totalVotes === 1 ? 'voto registrado' : 'votos registrados'}
            </span>
            <span>Cada participante conta 1 voto (pode trocar enquanto aberta)</span>
          </div>

          {ranking.ranked.map(({ option: opt, votes: optVotes, percentage: pct, isLeader }) => {
            const isMine = myCurrentVote?.optionId === opt.id;

            return (
              <div
                key={opt.id}
                className={`bg-[#1C1C20] border rounded-2xl p-5 sm:p-6 space-y-3 transition-colors ${
                  isMine
                    ? 'border-[#FF5A36]'
                    : isLeader
                      ? 'border-[#F7F7F5]/45'
                      : 'border-[#28282E]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#98989F]">
                      <span>
                        {opt.targetType === 'event' ? 'Evento' : 'Bar'} · {opt.neighborhood}
                      </span>
                      {isLeader && (
                        <span className="px-2 py-0.5 rounded bg-[#F7F7F5] text-[#101012] text-[10px]">
                          {ranking.isTie ? 'Empatado na liderança' : 'Na liderança'}
                        </span>
                      )}
                    </div>
                    <Link
                      to={opt.targetType === 'event' ? `/eventos/${opt.slug}` : `/bares/${opt.slug}`}
                      className="font-display text-2xl font-extrabold italic uppercase text-[#F7F7F5] hover:text-[#FF5A36] transition-colors inline-block mt-0.5"
                    >
                      {opt.title}
                    </Link>
                    <p className="text-xs text-[#98989F] mt-0.5">{opt.subtitle}</p>
                  </div>

                  <button
                    type="button"
                    disabled={!poll.isOpen || votingBusy}
                    onClick={() => handleCastVote(opt.id)}
                    className={`px-5 py-2.5 min-h-[42px] rounded-xl text-xs font-extrabold uppercase tracking-wider inline-flex items-center justify-center gap-2 shrink-0 transition-all active:scale-[0.97] ${
                      isMine
                        ? 'bg-[#FF5A36] text-[#101012]'
                        : 'bg-[#101012] border border-[#28282E] hover:border-[#F7F7F5]/60 text-[#F7F7F5]'
                    }`}
                  >
                    {isMine ? <Check className="w-4 h-4" /> : <Vote className="w-4 h-4" />}
                    <span>{isMine ? 'Seu voto' : 'Votar neste'}</span>
                  </button>
                </div>

                {/* Result bar */}
                <div className="space-y-1.5">
                  <div className="h-2.5 rounded-full bg-[#101012] overflow-hidden border border-[#28282E]">
                    <div
                      className={`h-full motion-safe:transition-all motion-safe:duration-300 rounded-full ${
                        isMine ? 'bg-[#FF5A36]' : isLeader ? 'bg-[#F7F7F5]' : 'bg-[#5265FF]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between text-xs text-[#98989F]">
                    <span className="tabular-nums font-semibold text-[#F7F7F5]">
                      {optVotes.length} {optVotes.length === 1 ? 'voto' : 'votos'} ({pct}%)
                    </span>
                    {optVotes.length > 0 && (
                      <span>{optVotes.map((v) => v.voterLabel).join(', ')}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // --- Create New Bora Junto Poll View ---
  return (
    <div className="max-w-[1320px] mx-auto px-5 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10 text-[#F7F7F5]">
      <div className="pb-6 border-b border-[#28282E]">
        <SectionKicker label="Decisão em grupo · Sem burocracia" className="mb-2" />
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold italic uppercase tracking-tight">
          Bora Junto
        </h1>
        <p className="text-sm sm:text-base text-[#98989F] mt-2 max-w-2xl">
          Monte uma lista com opções de rolês e bares de Porto Alegre e mande o link no WhatsApp.
          Seus amigos votam direto pelo link, sem precisar criar conta.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <form
          onSubmit={handleCreatePoll}
          className="lg:col-span-5 bg-[#1C1C20] border border-[#28282E] rounded-2xl p-6 space-y-5 h-fit lg:sticky lg:top-24"
        >
          <h2 className="font-display text-2xl font-extrabold italic uppercase text-[#F7F7F5]">
            Nova lista de votação
          </h2>

          <div>
            <label
              htmlFor="poll-title"
              className="block text-[11px] font-bold uppercase tracking-wider text-[#98989F] mb-1.5"
            >
              Título do rolê
            </label>
            <input
              id="poll-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Sexta da galera na Cidade Baixa"
              className="w-full h-11 px-3.5 bg-[#101012] border border-[#28282E] focus:border-[#FF5A36] rounded-xl text-sm text-[#F7F7F5] placeholder:text-[#98989F] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="poll-desc"
              className="block text-[11px] font-bold uppercase tracking-wider text-[#98989F] mb-1.5"
            >
              Recado pro grupo (opcional)
            </label>
            <input
              id="poll-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Votação fecha sexta às 18h"
              className="w-full h-11 px-3.5 bg-[#101012] border border-[#28282E] focus:border-[#FF5A36] rounded-xl text-sm text-[#F7F7F5] placeholder:text-[#98989F] focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-[#28282E]">
            <p className="text-xs font-bold uppercase tracking-wider text-[#F7F7F5] mb-2">
              Opções selecionadas ({selectedOptions.length}/6)
            </p>
            {selectedOptions.length === 0 ? (
              <p className="text-xs text-[#98989F]">
                Selecione ao lado pelo menos 2 eventos ou bares do catálogo.
              </p>
            ) : (
              <ul className="space-y-2">
                {selectedOptions.map((opt) => (
                  <li
                    key={`${opt.targetType}-${opt.targetId}`}
                    className="p-2.5 rounded-xl bg-[#101012] border border-[#28282E] flex items-center justify-between gap-2 text-xs text-[#F7F7F5]"
                  >
                    <span className="truncate font-semibold">{opt.title}</span>
                    <button
                      type="button"
                      onClick={() => toggleCatalogOption(opt)}
                      className="text-[#98989F] hover:text-[#FF5A36] shrink-0 font-medium underline"
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="submit"
            disabled={creating}
            className="w-full py-3.5 rounded-xl bg-[#FF5A36] hover:bg-[#FF6F4F] active:scale-[0.98] disabled:opacity-60 text-[#101012] font-extrabold uppercase tracking-wider text-xs transition-all"
          >
            {creating
              ? 'Criando lista...'
              : user
                ? 'Criar e gerar link compartilhável'
                : 'Entrar para criar lista'}
          </button>

          {myLists.length > 0 && (
            <div className="pt-4 border-t border-[#28282E] space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#98989F]">
                Suas listas criadas
              </p>
              {myLists.map((l) => (
                <Link
                  key={l.id}
                  to={`/bora-junto/${l.id}`}
                  className="block p-3 rounded-xl bg-[#101012] border border-[#28282E] hover:border-[#FF5A36] text-xs font-semibold text-[#F7F7F5] transition-colors"
                >
                  {l.title} ({l.options.length} opções) →
                </Link>
              ))}
            </div>
          )}
        </form>

        {/* Selector Grid with Real-Time Catalog Filter */}
        <div className="lg:col-span-7 space-y-6">
          <div className="relative">
            <Search className="w-4 h-4 text-[#98989F] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={catalogQuery}
              onChange={(e) => setCatalogQuery(e.target.value)}
              placeholder="Filtrar eventos ou bares por nome, estilo ou bairro..."
              aria-label="Filtrar catálogo para enquete Bora Junto"
              className="w-full h-11 pl-10 pr-4 bg-[#1C1C20] border border-[#28282E] focus:border-[#FF5A36] focus:ring-2 focus:ring-[#FF5A36]/30 rounded-xl text-sm text-[#F7F7F5] placeholder:text-[#98989F] focus:outline-none focus-visible:outline-none transition-shadow"
            />
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[#98989F] mb-3">
              Eventos do catálogo ({filteredCatalogEvents.length})
            </h2>
            {filteredCatalogEvents.length === 0 ? (
              <p className="text-xs text-[#98989F] p-4 rounded-xl bg-[#1C1C20] border border-[#28282E]">
                Nenhum evento encontrado para "{catalogQuery}".
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredCatalogEvents.slice(0, 12).map((ev) => {
                  const isSelected = selectedOptions.some(
                    (o) => o.targetType === 'event' && o.targetId === ev.id,
                  );
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() =>
                        toggleCatalogOption({
                          id: `opt-${ev.id}`,
                          targetType: 'event',
                          targetId: ev.id,
                          title: ev.title,
                          subtitle: `${formatEventDatePtBr(ev.dateISO)} · ${ev.startTime} · ${ev.venueName}`,
                          neighborhood: ev.neighborhood,
                          slug: ev.slug,
                        })
                      }
                      className={`p-4 rounded-2xl text-left border transition-all active:scale-[0.98] ${
                        isSelected
                          ? 'bg-[#FF5A36]/15 border-[#FF5A36] text-[#F7F7F5]'
                          : 'bg-[#1C1C20] border-[#28282E] hover:border-[#F7F7F5]/50 text-[#F7F7F5]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider mb-1">
                        <span className="text-[#98989F]">{ev.neighborhood}</span>
                        <span className={isSelected ? 'text-[#FF5A36]' : 'text-[#F7F7F5]'}>
                          {isSelected ? 'Selecionado ✓' : '+ Adicionar'}
                        </span>
                      </div>
                      <p className="font-display font-bold uppercase text-lg line-clamp-1">
                        {ev.title}
                      </p>
                      <p className="text-xs mt-1 text-[#98989F] tabular-nums">
                        {formatEventDatePtBr(ev.dateISO)} · {ev.startTime}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[#98989F] mb-3">
              Bares e pontos de encontro ({filteredCatalogVenues.length})
            </h2>
            {filteredCatalogVenues.length === 0 ? (
              <p className="text-xs text-[#98989F] p-4 rounded-xl bg-[#1C1C20] border border-[#28282E]">
                Nenhum bar encontrado para "{catalogQuery}".
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredCatalogVenues.slice(0, 12).map((v) => {
                  const isSelected = selectedOptions.some(
                    (o) => o.targetType === 'venue' && o.targetId === v.id,
                  );
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() =>
                        toggleCatalogOption({
                          id: `opt-${v.id}`,
                          targetType: 'venue',
                          targetId: v.id,
                          title: v.name,
                          subtitle: `${v.category} · ${v.address}`,
                          neighborhood: v.neighborhood,
                          slug: v.slug,
                        })
                      }
                      className={`p-4 rounded-2xl text-left border transition-all active:scale-[0.98] ${
                        isSelected
                          ? 'bg-[#5265FF]/15 border-[#5265FF] text-[#F7F7F5]'
                          : 'bg-[#1C1C20] border-[#28282E] hover:border-[#F7F7F5]/50 text-[#F7F7F5]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider mb-1">
                        <span className="text-[#98989F]">{v.neighborhood}</span>
                        <span className={isSelected ? 'text-[#5265FF]' : 'text-[#F7F7F5]'}>
                          {isSelected ? 'Selecionado ✓' : '+ Adicionar'}
                        </span>
                      </div>
                      <p className="font-display font-bold uppercase text-lg line-clamp-1">
                        {v.name}
                      </p>
                      <p className="text-xs mt-1 text-[#98989F]">{v.category}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
