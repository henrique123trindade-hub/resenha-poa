import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Ban, CheckCircle2, Edit3, Plus, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCatalog } from '../contexts/CatalogContext';
import {
  createEventInFirestore,
  fetchOrganizerEvents,
  updateEventAsOrganizer,
  upsertOrganizerProfile,
} from '../services/firestoreService';
import { detectDuplicateEvent } from '../utils/eventFilters';
import type { AgeRating, EventCategoryId, EventItem, EventStatus, PriceType } from '../types/resenha';
import { useToast } from '../components/Layout';

const STATUS_LABEL: Record<EventStatus, string> = {
  draft: 'Rascunho',
  pending: 'Em revisão',
  published: 'Publicado',
  rejected: 'Recusado',
  cancelled: 'Cancelado',
  ended: 'Encerrado',
};

export const OrganizerPage: React.FC = () => {
  const { user, organizerProfile, openAuthModal } = useAuth();
  const { events, categories, neighborhoods } = useCatalog();
  const { notify } = useToast();

  // Organizer profile form
  const [orgName, setOrgName] = useState(organizerProfile?.orgName || '');
  const [orgEmail, setOrgEmail] = useState(organizerProfile?.contactEmail || user?.email || '');
  const [orgInsta, setOrgInsta] = useState(organizerProfile?.instagram || '');
  const [orgWebsite, setOrgWebsite] = useState(organizerProfile?.website || '');
  const [orgBio, setOrgBio] = useState(organizerProfile?.bio || '');
  const [savingOrg, setSavingOrg] = useState(false);

  // Own events list
  const [myEvents, setMyEvents] = useState<EventItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Event submission / editing form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState<EventCategoryId>('shows');
  const [dateISO, setDateISO] = useState('');
  const [startTime, setStartTime] = useState('22:00');
  const [endTime, setEndTime] = useState('');
  const [neighborhood, setNeighborhood] = useState('Cidade Baixa');
  const [venueName, setVenueName] = useState('');
  const [address, setAddress] = useState('');
  const [priceType, setPriceType] = useState<PriceType>('paid');
  const [priceMin, setPriceMin] = useState('');
  const [priceLabel, setPriceLabel] = useState('');
  const [ageRating, setAgeRating] = useState<AgeRating>('18+');
  const [ticketUrl, setTicketUrl] = useState('');
  const [sourceName, setSourceName] = useState('Enviado pelo organizador');
  const [description, setDescription] = useState('');
  const [lineupRaw, setLineupRaw] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<EventItem | null>(null);
  const [submittingEvent, setSubmittingEvent] = useState(false);

  useEffect(() => {
    if (organizerProfile) {
      setOrgName(organizerProfile.orgName);
      setOrgEmail(organizerProfile.contactEmail);
      setOrgInsta(organizerProfile.instagram || '');
      setOrgWebsite(organizerProfile.website || '');
      setOrgBio(organizerProfile.bio || '');
    } else if (user?.email && !orgEmail) {
      setOrgEmail(user.email);
    }
  }, [organizerProfile, user, orgEmail]);

  const loadMyEvents = async (uid: string) => {
    setLoadingEvents(true);
    try {
      const items = await fetchOrganizerEvents(uid);
      setMyEvents(items);
    } catch {
      // handled in service
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    if (user) {
      void loadMyEvents(user.uid);
    }
  }, [user]);

  const resetEventForm = () => {
    setEditingId(null);
    setTitle('');
    setSubtitle('');
    setCategory('shows');
    setDateISO('');
    setStartTime('22:00');
    setEndTime('');
    setNeighborhood('Cidade Baixa');
    setVenueName('');
    setAddress('');
    setPriceType('paid');
    setPriceMin('');
    setPriceLabel('');
    setAgeRating('18+');
    setTicketUrl('');
    setSourceName('Enviado pelo organizador');
    setDescription('');
    setLineupRaw('');
    setDuplicateWarning(null);
  };

  const startEditing = (ev: EventItem) => {
    setEditingId(ev.id);
    setTitle(ev.title);
    setSubtitle(ev.subtitle || '');
    setCategory(ev.category);
    setDateISO(ev.dateISO);
    setStartTime(ev.startTime);
    setEndTime(ev.endTime || '');
    setNeighborhood(ev.neighborhood);
    setVenueName(ev.venueName);
    setAddress(ev.address);
    setPriceType(ev.priceType);
    setPriceMin(typeof ev.priceMin === 'number' ? String(ev.priceMin) : '');
    setPriceLabel(ev.priceLabel || '');
    setAgeRating(ev.ageRating);
    setTicketUrl(ev.ticketUrl || '');
    setSourceName(ev.sourceName);
    setDescription(ev.description);
    setLineupRaw((ev.lineup || []).join(', '));
    setDuplicateWarning(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('Entre com sua conta Google para cadastrar seu perfil de organizador.');
      return;
    }
    if (orgName.trim().length < 2 || !orgEmail.trim()) {
      notify('Preencha o nome do coletivo/organizador e o e-mail de contato.');
      return;
    }
    setSavingOrg(true);
    try {
      await upsertOrganizerProfile(
        user.uid,
        {
          orgName,
          contactEmail: orgEmail,
          instagram: orgInsta,
          website: orgWebsite,
          bio: orgBio,
        },
        Boolean(organizerProfile),
      );
      notify('Perfil de organizador salvo.');
    } catch {
      notify('Não foi possível salvar o perfil de organizador.');
    } finally {
      setSavingOrg(false);
    }
  };

  const handleSubmitEvent = async (targetStatus: 'draft' | 'pending') => {
    if (!user) {
      openAuthModal('Entre com sua conta Google para enviar um evento.');
      return;
    }
    if (title.trim().length < 3 || !dateISO || !startTime || !venueName.trim() || !address.trim()) {
      notify('Preencha título, data, horário, nome do local e endereço.');
      return;
    }
    if (description.trim().length < 15) {
      notify('Descreva o evento com pelo menos 15 caracteres.');
      return;
    }

    if (!editingId) {
      const dup = detectDuplicateEvent(
        { title, dateISO, neighborhood, venueName },
        [...events, ...myEvents],
      );
      if (dup && !duplicateWarning) {
        setDuplicateWarning(dup);
        notify('Encontramos um evento muito parecido nesta data. Confira antes de reenviar.');
        return;
      }
    }

    setSubmittingEvent(true);
    try {
      const parsedMin = priceMin && !Number.isNaN(Number(priceMin)) ? Number(priceMin) : undefined;
      const lineup = lineupRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      if (editingId) {
        await updateEventAsOrganizer(
          editingId,
          {
            title,
            subtitle,
            category,
            dateISO,
            startTime,
            endTime,
            neighborhood,
            venueName,
            address,
            priceType,
            priceMin: parsedMin,
            priceLabel,
            ageRating,
            ticketUrl,
            description,
            organizerName: organizerProfile?.orgName || orgName || user.displayName || 'Organizador',
          },
          targetStatus,
        );
        notify(
          targetStatus === 'draft'
            ? 'Rascunho atualizado.'
            : 'Evento atualizado e enviado para revisão.',
        );
      } else {
        await createEventInFirestore({
          title,
          subtitle,
          description,
          category,
          dateISO,
          startTime,
          endTime: endTime || undefined,
          neighborhood,
          venueName,
          address,
          priceType,
          priceMin: parsedMin,
          priceLabel: priceLabel || undefined,
          ageRating,
          ticketUrl: ticketUrl || undefined,
          lineup,
          sourceName: sourceName || 'Enviado pelo organizador',
          isVerified: false,
          isDemoExample: false,
          isSponsored: false,
          isFeatured: false,
          status: targetStatus,
          organizerId: user.uid,
          organizerName: organizerProfile?.orgName || orgName || user.displayName || 'Organizador',
        });
        notify(
          targetStatus === 'draft'
            ? 'Rascunho salvo na sua conta.'
            : 'Evento enviado para fila de aprovação da curadoria.',
        );
      }
      resetEventForm();
      await loadMyEvents(user.uid);
    } catch {
      notify('Não foi possível salvar o evento.');
    } finally {
      setSubmittingEvent(false);
    }
  };

  const handleCancelEvent = async (ev: EventItem) => {
    try {
      await updateEventAsOrganizer(ev.id, {}, 'cancelled');
      notify(`"${ev.title}" marcado como cancelado.`);
      if (user) await loadMyEvents(user.uid);
    } catch {
      notify('Erro ao cancelar evento.');
    }
  };

  if (!user) {
    return (
      <div className="max-w-[820px] mx-auto px-4 py-20 text-center space-y-5 text-[#F7F7F5]">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#FF5A36]">
          Para produtores, bares e coletivos
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold italic uppercase tracking-tight">
          Divulgue seu evento no ResenhaPOA
        </h1>
        <p className="text-sm sm:text-base text-[#98989F] max-w-lg mx-auto leading-relaxed">
          Entre com sua conta Google para cadastrar seu perfil de organizador, enviar festas, shows
          e eventos culturais em Porto Alegre e acompanhar a moderação antes de ir ao ar.
        </p>
        <button
          type="button"
          onClick={() => openAuthModal('Entre com Google para divulgar eventos no ResenhaPOA.')}
          className="px-6 py-3.5 rounded-xl bg-[#FF5A36] hover:bg-[#FF6F4F] text-[#101012] text-xs font-extrabold uppercase tracking-wider transition-colors"
        >
          Entrar com Google
        </button>
      </div>
    );
  }

  const inputClass =
    'w-full min-w-0 h-12 sm:h-11 px-4 sm:px-3.5 bg-[#101012] border border-[#28282E] focus:border-[#FF5A36] rounded-xl text-base sm:text-sm text-[#F7F7F5] placeholder:text-[#98989F] focus:outline-none';
  const labelClass =
    'block text-[11px] font-bold uppercase tracking-wider text-[#98989F] mb-1.5';

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-12 text-[#F7F7F5]">
      <div className="pb-6 border-b border-[#28282E] flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#FF5A36] mb-2">
            Área do organizador · Moderação transparente
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold italic uppercase tracking-tight">
            Enviar e gerenciar eventos
          </h1>
          <p className="text-sm text-[#98989F] mt-2">
            Submissões entram em rascunho ou fila de revisão editorial — nenhum evento vai ao ar sem
            checagem de dados e faixa etária.
          </p>
        </div>
        {organizerProfile && (
          <div className="px-4 py-2 rounded-xl bg-[#1C1C20] border border-[#28282E] text-xs inline-flex items-center gap-2 text-[#F7F7F5]">
            <ShieldCheck className="w-4 h-4 text-[#D5FF52]" />
            <span>
              Status:{' '}
              <strong className="font-semibold">
                {organizerProfile.verificationStatus === 'verified'
                  ? 'Verificado'
                  : organizerProfile.verificationStatus === 'rejected'
                    ? 'Não aprovado'
                    : 'Em verificação'}
              </strong>
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Event Submission Form */}
        <section className="lg:col-span-8 bg-[#1C1C20] border border-[#28282E] rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-[#28282E] pb-4">
            <h2 className="font-display text-2xl font-extrabold italic uppercase flex items-center gap-2 text-[#F7F7F5]">
              <Plus className="w-5 h-5 text-[#FF5A36]" />
              <span>{editingId ? 'Editar evento' : 'Submeter novo evento'}</span>
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetEventForm}
                className="text-xs font-semibold text-[#98989F] hover:text-[#F7F7F5] underline"
              >
                Cancelar edição
              </button>
            )}
          </div>

          {duplicateWarning && (
            <div className="p-4 rounded-xl bg-[#101012] border border-[#FF5A36]/60 text-xs space-y-1.5">
              <p className="font-bold text-[#FF5A36] flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> Possível evento duplicado detectado
              </p>
              <p className="text-[#98989F]">
                Já existe &quot;{duplicateWarning.title}&quot; em {duplicateWarning.dateISO} (
                {duplicateWarning.venueName}). Clique novamente no botão para confirmar se deseja
                enviar mesmo assim.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelClass}>Nome do evento *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Baile da Ladeira — Edição Cidade Baixa"
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>Subtítulo curto (opcional)</label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Ex: 2 pistas de funk e eletrônica com DJs locais"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Categoria *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as EventCategoryId)}
                className={inputClass}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Classificação etária *</label>
              <select
                value={ageRating}
                onChange={(e) => setAgeRating(e.target.value as AgeRating)}
                className={inputClass}
              >
                <option value="18+">18+</option>
                <option value="16+">16+</option>
                <option value="Livre">Livre</option>
                <option value="Não informado">Não informado</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Data (YYYY-MM-DD) *</label>
              <input
                type="date"
                value={dateISO}
                onChange={(e) => setDateISO(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Início *</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Término</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Bairro *</label>
              <select
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className={inputClass}
              >
                {neighborhoods.map((n) => (
                  <option key={n.id} value={n.name}>
                    {n.name}
                  </option>
                ))}
                <option value="Outro bairro de Porto Alegre">Outro bairro de Porto Alegre</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Nome do local / casa *</label>
              <input
                type="text"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="Ex: Bar Opinião / Casa de Cultura"
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>Endereço completo *</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Rua, número e referência em Porto Alegre"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Entrada</label>
              <select
                value={priceType}
                onChange={(e) => setPriceType(e.target.value as PriceType)}
                className={inputClass}
              >
                <option value="free">Gratuito</option>
                <option value="paid">Pago / Antecipado</option>
                <option value="unconfirmed">Valor a confirmar</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Valor mínimo (R$) ou descrição</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={0}
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  placeholder="Ex: 30"
                  disabled={priceType !== 'paid'}
                  className={`${inputClass} disabled:opacity-40`}
                />
                <input
                  type="text"
                  value={priceLabel}
                  onChange={(e) => setPriceLabel(e.target.value)}
                  placeholder="Ex: 1º lote"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Link oficial de ingressos (se houver)</label>
              <input
                type="url"
                value={ticketUrl}
                onChange={(e) => setTicketUrl(e.target.value)}
                placeholder="https://..."
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Atrações (separadas por vírgula)</label>
              <input
                type="text"
                value={lineupRaw}
                onChange={(e) => setLineupRaw(e.target.value)}
                placeholder="Ex: DJ X, Banda Y"
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>Descrição completa *</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Conte o estilo do evento, regras da casa, horário de abertura e informações úteis..."
                className="w-full min-w-0 p-4 sm:p-3.5 bg-[#101012] border border-[#28282E] focus:border-[#FF5A36] rounded-xl text-base sm:text-sm text-[#F7F7F5] placeholder:text-[#98989F] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              disabled={submittingEvent}
              onClick={() => handleSubmitEvent('pending')}
              className="px-6 py-3.5 rounded-xl bg-[#FF5A36] hover:bg-[#FF6F4F] disabled:opacity-60 text-[#101012] text-xs font-extrabold uppercase tracking-wider transition-colors"
            >
              {submittingEvent ? 'Enviando...' : 'Enviar para aprovação'}
            </button>
            <button
              type="button"
              disabled={submittingEvent}
              onClick={() => handleSubmitEvent('draft')}
              className="px-5 py-3.5 rounded-xl border border-[#28282E] bg-[#101012] hover:border-[#F7F7F5]/60 text-[#F7F7F5] text-xs font-bold uppercase tracking-wider transition-colors"
            >
              Salvar como rascunho
            </button>
          </div>
        </section>

        {/* Right: Organizer Profile */}
        <aside className="lg:col-span-4 space-y-6">
          <form
            onSubmit={handleSaveOrg}
            className="bg-[#1C1C20] border border-[#28282E] rounded-2xl p-6 space-y-4"
          >
            <h2 className="font-display text-2xl font-extrabold italic uppercase text-[#F7F7F5]">
              Perfil do produtor / casa
            </h2>
            <div>
              <label className={labelClass}>Nome da produtora / bar *</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>E-mail de contato *</label>
              <input
                type="email"
                value={orgEmail}
                onChange={(e) => setOrgEmail(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Instagram (@...)</label>
              <input
                type="text"
                value={orgInsta}
                onChange={(e) => setOrgInsta(e.target.value)}
                placeholder="@coletivopoa"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Site ou link oficial</label>
              <input
                type="url"
                value={orgWebsite}
                onChange={(e) => setOrgWebsite(e.target.value)}
                placeholder="https://..."
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Bio curta</label>
              <textarea
                rows={3}
                value={orgBio}
                onChange={(e) => setOrgBio(e.target.value)}
                className="w-full min-w-0 p-3.5 bg-[#101012] border border-[#28282E] focus:border-[#FF5A36] rounded-xl text-base sm:text-sm text-[#F7F7F5] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={savingOrg}
              className="w-full py-3 rounded-xl bg-[#F7F7F5] hover:bg-white text-[#101012] text-xs font-extrabold uppercase tracking-wider transition-colors"
            >
              {savingOrg ? 'Salvando...' : 'Salvar perfil'}
            </button>
          </form>
        </aside>
      </div>

      {/* Organizer's Submitted Events */}
      <section className="space-y-4">
        <h2 className="font-display text-3xl font-extrabold italic uppercase tracking-tight">
          Seus eventos enviados ({myEvents.length})
        </h2>

        {loadingEvents ? (
          <p className="text-sm text-[#98989F]">Carregando suas submissões...</p>
        ) : myEvents.length === 0 ? (
          <div className="bg-[#1C1C20] border border-[#28282E] rounded-2xl p-6 text-sm text-[#98989F]">
            Você ainda não enviou eventos com esta conta.
          </div>
        ) : (
          <div className="space-y-3">
            {myEvents.map((ev) => (
              <div
                key={ev.id}
                className="bg-[#1C1C20] border border-[#28282E] rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider">
                    <span
                      className={
                        ev.status === 'published'
                          ? 'text-[#D5FF52]'
                          : ev.status === 'cancelled' || ev.status === 'rejected'
                            ? 'text-red-400'
                            : 'text-[#FF5A36]'
                      }
                    >
                      {ev.status === 'published' && (
                        <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                      )}
                      {STATUS_LABEL[ev.status]}
                    </span>
                    <span className="text-[#98989F]">·</span>
                    <span className="tabular-nums text-[#98989F]">
                      {ev.dateISO} {ev.startTime}
                    </span>
                    <span className="text-[#98989F]">·</span>
                    <span className="text-[#98989F]">{ev.neighborhood}</span>
                  </div>
                  <h3 className="font-display text-2xl font-bold uppercase text-[#F7F7F5]">{ev.title}</h3>
                  <p className="text-xs text-[#98989F]">{ev.venueName}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {ev.status === 'published' && (
                    <Link
                      to={`/eventos/${ev.slug}`}
                      className="px-4 py-2 rounded-xl border border-[#28282E] bg-[#101012] hover:border-[#F7F7F5]/60 text-xs font-bold uppercase tracking-wider text-[#F7F7F5]"
                    >
                      Ver página →
                    </Link>
                  )}
                  {(ev.status === 'draft' || ev.status === 'pending' || ev.status === 'rejected') && (
                    <button
                      type="button"
                      onClick={() => startEditing(ev)}
                      className="px-4 py-2 rounded-xl border border-[#28282E] bg-[#101012] hover:border-[#F7F7F5]/60 text-xs font-bold uppercase tracking-wider text-[#F7F7F5] inline-flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Editar
                    </button>
                  )}
                  {(ev.status === 'published' || ev.status === 'pending') && (
                    <button
                      type="button"
                      onClick={() => handleCancelEvent(ev)}
                      className="px-4 py-2 rounded-xl border border-red-400/50 text-red-400 text-xs font-bold uppercase tracking-wider hover:bg-red-950/30 inline-flex items-center gap-1"
                    >
                      <Ban className="w-3.5 h-3.5" /> Cancelar evento
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
