import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Check, Copy, Lock, Share2, Unlock, Users, Vote } from 'lucide-react';
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
  const [creating, setCreating] = useState(false);
  const [myLists, setMyLists] = useState<PollListItem[]>([]);

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

  const toggleCatalogOption = (opt: PollOption) => {
    setSelectedOptions((prev) => {
      const exists = prev.some((o) => o.targetId === opt.targetId && o.targetType === opt.targetType);
      if (exists) return prev.filter((o) => !(o.targetId === opt.targetId && o.targetType === opt.targetType));
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
        <div className="max-w-[960px] mx-auto px-4 py-20 text-center text-sm text-[#858585]">
          Carregando enquete Bora Junto...
        </div>
      );
    }

    if (!poll) {
      return (
        <div className="max-w-[960px] mx-auto px-4 py-20 text-center space-y-4 text-[#F4F4F2]">
          <h1 className="font-display text-4xl font-extrabold italic uppercase tracking-tight">
            Lista não encontrada
          </h1>
          <p className="text-sm text-[#858585]">
            Este link pode estar incorreto ou a lista foi removida.
          </p>
          <Link
            to="/bora-junto"
            className="inline-block px-5 py-3 rounded-md bg-[#F4F4F2] hover:bg-white text-[#080808] text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Criar nova lista Bora Junto
          </Link>
        </div>
      );
    }

    const totalVotes = votes.length;

    return (
      <div className="max-w-[960px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8 text-[#F4F4F2]">
        <div className="bg-[#141414] border border-[#292929] rounded-md p-6 sm:p-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#858585] inline-flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#F4F4F2]" /> Bora Junto · Criado por {poll.creatorName}
            </span>
            <span
              className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-[2px] border ${
                poll.isOpen
                  ? 'border-[#F4F4F2] bg-[#F4F4F2] text-[#080808]'
                  : 'border-[#292929] bg-[#080808] text-[#858585]'
              }`}
            >
              {poll.isOpen ? 'Votação aberta' : 'Votação encerrada'}
            </span>
          </div>

          <h1 className="font-display text-3xl sm:text-5xl font-extrabold italic uppercase tracking-tight">
            {poll.title}
          </h1>
          {poll.description && <p className="text-sm sm:text-base text-[#858585]">{poll.description}</p>}

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={copyShareUrl}
              className="px-5 py-2.5 rounded-md bg-[#F4F4F2] hover:bg-white text-[#080808] text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" /> Copiar link para o grupo
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `Bora decidir o rolê em POA! Vota aí na lista "${poll.title}": ${window.location.href}`,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-md border border-[#292929] hover:border-[#F4F4F2] text-[#F4F4F2] text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" /> Enviar no WhatsApp
            </a>
            {user?.uid === poll.creatorId && (
              <button
                type="button"
                onClick={handleTogglePollOpen}
                className="px-5 py-2.5 rounded-md border border-[#292929] hover:border-[#F4F4F2] text-[#F4F4F2] text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 transition-colors"
              >
                {poll.isOpen ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                <span>{poll.isOpen ? 'Encerrar votação' : 'Reabrir votação'}</span>
              </button>
            )}
          </div>
        </div>

        {!user && poll.isOpen && (
          <div className="bg-[#141414] border border-[#292929] rounded-md p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
            <label
              htmlFor="guest-voter-name"
              className="text-xs font-bold uppercase tracking-wider text-[#858585] shrink-0"
            >
              Seu nome no voto (sem login):
            </label>
            <input
              id="guest-voter-name"
              type="text"
              value={voterName}
              onChange={(e) => setVoterName(e.target.value)}
              placeholder="Ex: Marina"
              className="flex-1 h-10 px-4 bg-[#080808] border border-[#292929] focus:border-[#F4F4F2] rounded-md text-sm text-[#F4F4F2] focus:outline-none"
            />
          </div>
        )}

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#858585]">
            <span className="font-medium tabular-nums">
              {totalVotes} {totalVotes === 1 ? 'voto registrado' : 'votos registrados'}
            </span>
            <span>Cada participante conta 1 voto (pode trocar enquanto aberta)</span>
          </div>

          {poll.options.map((opt) => {
            const optVotes = votes.filter((v) => v.optionId === opt.id);
            const pct = totalVotes > 0 ? Math.round((optVotes.length / totalVotes) * 100) : 0;
            const isMine = myCurrentVote?.optionId === opt.id;

            return (
              <div
                key={opt.id}
                className={`bg-[#141414] border rounded-md p-5 sm:p-6 space-y-3 transition-colors ${
                  isMine ? 'border-[#F4F4F2]' : 'border-[#292929]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#858585]">
                      {opt.targetType === 'event' ? 'Evento' : 'Bar'} · {opt.neighborhood}
                    </p>
                    <Link
                      to={opt.targetType === 'event' ? `/eventos/${opt.slug}` : `/bares/${opt.slug}`}
                      className="font-display text-2xl font-extrabold italic uppercase text-[#F4F4F2] hover:underline"
                    >
                      {opt.title}
                    </Link>
                    <p className="text-xs text-[#858585] mt-0.5">{opt.subtitle}</p>
                  </div>

                  <button
                    type="button"
                    disabled={!poll.isOpen || votingBusy}
                    onClick={() => handleCastVote(opt.id)}
                    className={`px-5 py-2.5 rounded-md text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 shrink-0 transition-colors ${
                      isMine
                        ? 'bg-[#F4F4F2] text-[#080808]'
                        : 'bg-[#080808] border border-[#292929] hover:border-[#F4F4F2] text-[#F4F4F2]'
                    }`}
                  >
                    {isMine ? <Check className="w-4 h-4" /> : <Vote className="w-4 h-4" />}
                    <span>{isMine ? 'Seu voto' : 'Votar neste'}</span>
                  </button>
                </div>

                {/* Result bar */}
                <div className="space-y-1.5">
                  <div className="h-2 rounded-sm bg-[#292929] overflow-hidden">
                    <div
                      className="h-full bg-[#F4F4F2] transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between text-xs text-[#858585]">
                    <span className="tabular-nums font-medium text-[#F4F4F2]">
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
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10 text-[#F4F4F2]">
      <div className="pb-6 border-b border-[#292929]">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#858585] mb-2">
          Decisão em grupo · Sem burocracia
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold italic uppercase tracking-tight">
          Bora Junto
        </h1>
        <p className="text-sm sm:text-base text-[#858585] mt-2 max-w-2xl">
          Monte uma lista com opções de rolês e bares de Porto Alegre e mande o link para o grupo.
          Seus amigos votam direto pelo link, sem precisar criar conta.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <form
          onSubmit={handleCreatePoll}
          className="lg:col-span-5 bg-[#141414] border border-[#292929] rounded-md p-6 space-y-5 h-fit"
        >
          <h2 className="font-display text-2xl font-extrabold italic uppercase text-[#F4F4F2]">
            Nova lista de votação
          </h2>

          <div>
            <label
              htmlFor="poll-title"
              className="block text-[11px] font-bold uppercase tracking-wider text-[#858585] mb-1.5"
            >
              Título do rolê
            </label>
            <input
              id="poll-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Sexta da galera na Cidade Baixa"
              className="w-full h-11 px-3.5 bg-[#080808] border border-[#292929] focus:border-[#F4F4F2] rounded-md text-sm text-[#F4F4F2] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="poll-desc"
              className="block text-[11px] font-bold uppercase tracking-wider text-[#858585] mb-1.5"
            >
              Recado pro grupo (opcional)
            </label>
            <input
              id="poll-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Votação fecha sexta às 18h"
              className="w-full h-11 px-3.5 bg-[#080808] border border-[#292929] focus:border-[#F4F4F2] rounded-md text-sm text-[#F4F4F2] focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-[#292929]">
            <p className="text-xs font-bold uppercase tracking-wider text-[#F4F4F2] mb-2">
              Opções selecionadas ({selectedOptions.length}/6)
            </p>
            {selectedOptions.length === 0 ? (
              <p className="text-xs text-[#858585]">
                Selecione ao lado pelo menos 2 eventos ou bares do catálogo.
              </p>
            ) : (
              <ul className="space-y-2">
                {selectedOptions.map((opt) => (
                  <li
                    key={`${opt.targetType}-${opt.targetId}`}
                    className="p-2.5 rounded-md bg-[#080808] border border-[#292929] flex items-center justify-between gap-2 text-xs text-[#F4F4F2]"
                  >
                    <span className="truncate font-semibold">{opt.title}</span>
                    <button
                      type="button"
                      onClick={() => toggleCatalogOption(opt)}
                      className="text-[#858585] hover:text-[#F4F4F2] shrink-0 font-medium underline"
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
            className="w-full py-3.5 rounded-md bg-[#F4F4F2] hover:bg-white disabled:opacity-60 text-[#080808] font-bold uppercase tracking-wider text-xs transition-colors"
          >
            {creating
              ? 'Criando lista...'
              : user
                ? 'Criar e gerar link compartilhável'
                : 'Entrar para criar lista'}
          </button>

          {myLists.length > 0 && (
            <div className="pt-4 border-t border-[#292929] space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#858585]">
                Suas listas criadas
              </p>
              {myLists.map((l) => (
                <Link
                  key={l.id}
                  to={`/bora-junto/${l.id}`}
                  className="block p-3 rounded-md bg-[#080808] border border-[#292929] hover:border-[#F4F4F2] text-xs font-semibold text-[#F4F4F2]"
                >
                  {l.title} ({l.options.length} opções) →
                </Link>
              ))}
            </div>
          )}
        </form>

        {/* Selector Grid */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[#858585] mb-3">
              Eventos do catálogo
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {events
                .filter((e) => e.status === 'published')
                .slice(0, 8)
                .map((ev) => {
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
                      className={`p-4 rounded-md text-left border transition-colors ${
                        isSelected
                          ? 'bg-[#F4F4F2] border-[#F4F4F2] text-[#080808]'
                          : 'bg-[#141414] border-[#292929] hover:border-[#F4F4F2] text-[#F4F4F2]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider mb-1">
                        <span className={isSelected ? 'text-[#525252]' : 'text-[#858585]'}>
                          {ev.neighborhood}
                        </span>
                        <span className={isSelected ? 'text-[#080808]' : 'text-[#F4F4F2]'}>
                          {isSelected ? 'Selecionado ✓' : '+ Adicionar'}
                        </span>
                      </div>
                      <p className="font-display font-bold uppercase text-lg line-clamp-1">
                        {ev.title}
                      </p>
                      <p className={`text-xs mt-1 ${isSelected ? 'text-[#525252]' : 'text-[#858585]'}`}>
                        {formatEventDatePtBr(ev.dateISO)} · {ev.startTime}
                      </p>
                    </button>
                  );
                })}
            </div>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[#858585] mb-3">
              Bares e pontos de encontro
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {venues.slice(0, 6).map((v) => {
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
                    className={`p-4 rounded-md text-left border transition-colors ${
                      isSelected
                        ? 'bg-[#F4F4F2] border-[#F4F4F2] text-[#080808]'
                        : 'bg-[#141414] border-[#292929] hover:border-[#F4F4F2] text-[#F4F4F2]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider mb-1">
                      <span className={isSelected ? 'text-[#525252]' : 'text-[#858585]'}>
                        {v.neighborhood}
                      </span>
                      <span className={isSelected ? 'text-[#080808]' : 'text-[#F4F4F2]'}>
                        {isSelected ? 'Selecionado ✓' : '+ Adicionar'}
                      </span>
                    </div>
                    <p className="font-display font-bold uppercase text-lg line-clamp-1">
                      {v.name}
                    </p>
                    <p className={`text-xs mt-1 ${isSelected ? 'text-[#525252]' : 'text-[#858585]'}`}>
                      {v.category}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
