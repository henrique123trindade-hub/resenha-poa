import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Check,
  Copy,
  ExternalLink,
  Flag,
  Heart,
  Info,
  MapPin,
  Share2,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { useCatalog } from '../contexts/CatalogContext';
import { useAuth } from '../contexts/AuthContext';
import { CAMPAIGN_PHOTOS, CATEGORIES } from '../data/seedCatalog';
import { formatEventDatePtBr, formatIsoDateFullPtBr } from '../utils/datePoa';
import { getNightlifeSrcSet } from '../utils/responsiveImage';
import { buildEventJsonLd, useDocumentHead } from '../utils/seoHead';
import {
  buildEventSharePayload,
  buildSocialShareLinks,
  shareEventWithWebShare,
} from '../utils/eventShare';
import { toggleFavoriteInFirestore, submitReport } from '../services/firestoreService';
import { PoaMapView } from '../components/PoaMapView';
import { EventCard } from '../components/EventCard';
import { SectionKicker } from '../components/BrandMark';
import { useToast } from '../components/Layout';

export const EventDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { getEventBySlug, events } = useCatalog();
  const { user, isFavorited, requireVerifiedAccount } = useAuth();
  const { notify } = useToast();

  const event = slug ? getEventBySlug(slug) : undefined;
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareTrayOpen, setShareTrayOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    setShareTrayOpen(false);
    setCopiedLink(false);
  }, [slug]);

  useEffect(() => {
    if (!shareTrayOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShareTrayOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [shareTrayOpen]);

  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
  useDocumentHead({
    title: event ? `${event.title} · ${event.neighborhood} — ResenhaPOA` : 'Evento não encontrado — ResenhaPOA',
    description: event
      ? `${event.title} em ${event.venueName} (${event.neighborhood}, Porto Alegre) · ${formatEventDatePtBr(event.dateISO)} às ${event.startTime}.`
      : 'Agenda de festas, shows e eventos em Porto Alegre.',
    jsonLd: event ? buildEventJsonLd(event, pageUrl) : null,
  });

  if (!event) {
    return (
      <div className="max-w-[1320px] mx-auto px-5 sm:px-6 lg:px-8 py-20 text-center space-y-5 text-[#F7F7F5]">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#98989F]">
          Evento não localizado
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold italic uppercase tracking-tight">
          Este rolê não está disponível
        </h1>
        <p className="text-sm text-[#98989F] max-w-md mx-auto">
          O evento pode ter sido encerrado, removido ou o link está incorreto.
        </p>
        <Link
          to="/eventos"
          className="inline-block px-6 py-3 rounded-xl bg-[#FF5A36] hover:bg-[#FF6F4F] text-[#101012] text-xs font-extrabold uppercase tracking-wider transition-colors"
        >
          Explorar agenda de Porto Alegre
        </Link>
      </div>
    );
  }

  const saved = isFavorited('event', event.id);
  const catMeta = CATEGORIES.find((c) => c.id === event.category);
  const catLabel = catMeta?.label || event.category;
  const isFree = event.priceType === 'free';
  const priceText = isFree
    ? 'Gratuito'
    : event.priceType === 'paid' && typeof event.priceMin === 'number'
      ? `A partir de R$ ${event.priceMin}`
      : event.priceLabel || 'Valor a confirmar com o organizador';

  const heroImg = event.imageUrl || CAMPAIGN_PHOTOS.amberCrowd;

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const sharePayload = buildEventSharePayload(event, shareUrl);
  const socialShareLinks = buildSocialShareLinks(sharePayload);

  const handleSave = async () => {
    if (!requireVerifiedAccount(`Entre ou crie uma conta para salvar "${event.title}" na sua lista.`) || !user) {
      return;
    }
    try {
      const next = await toggleFavoriteInFirestore({
        userId: user.uid,
        targetType: 'event',
        targetId: event.id,
        title: event.title,
        currentlySaved: saved,
      });
      notify(next ? 'Salvo nos seus favoritos.' : 'Removido dos favoritos.');
    } catch {
      notify('Não foi possível atualizar os favoritos.');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      notify('Link copiado para compartilhar.');
      window.setTimeout(() => setCopiedLink(false), 2400);
    } catch {
      notify('Copie o endereço da barra do navegador.');
    }
  };

  const handleNativeShare = async () => {
    if (shareBusy) return;
    setShareBusy(true);
    try {
      const outcome = await shareEventWithWebShare(
        sharePayload,
        typeof navigator !== 'undefined' ? navigator : null,
      );
      if (outcome === 'shared') {
        setShareTrayOpen(false);
        notify('Evento compartilhado.');
      } else if (outcome === 'fallback') {
        setShareTrayOpen((open) => !open);
      }
    } finally {
      setShareBusy(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireVerifiedAccount('Entre ou crie uma conta para enviar um aviso ou denúncia.') || !user) {
      return;
    }
    if (reportReason.trim().length < 5) {
      notify('Descreva o motivo com pelo menos 5 caracteres.');
      return;
    }
    setReportBusy(true);
    try {
      await submitReport({
        targetType: 'event',
        targetId: event.id,
        reason: reportReason,
        reporterId: user.uid,
      });
      notify('Aviso registrado para revisão da equipe.');
      setReportReason('');
      setReportOpen(false);
    } catch {
      notify('Não foi possível enviar o aviso agora.');
    } finally {
      setReportBusy(false);
    }
  };

  const relatedEvents = events
    .filter(
      (e) =>
        e.id !== event.id &&
        e.status === 'published' &&
        (e.neighborhood === event.neighborhood || e.category === event.category),
    )
    .slice(0, 3);

  return (
    <div className="max-w-[1320px] mx-auto px-5 sm:px-6 lg:px-8 py-8 sm:py-12 text-[#F7F7F5]">
      <Link
        to="/eventos"
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#98989F] hover:text-[#F7F7F5] mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar para agenda
      </Link>

      {/* Status / Transparency Banners */}
      <div className="space-y-3 mb-6">
        {event.status === 'cancelled' && (
          <div className="p-4 rounded-xl bg-[#1C1C20] border border-red-400/50 flex items-center gap-3 text-sm text-[#F7F7F5]">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <span>
              <strong>Evento cancelado:</strong> o organizador informou o cancelamento desta edição.
            </span>
          </div>
        )}
        {event.isDemoExample && (
          <div className="p-4 rounded-xl bg-[#1C1C20] border border-[#28282E] flex items-center gap-3 text-xs sm:text-sm text-[#98989F]">
            <Info className="w-4 h-4 text-[#FF5A36] shrink-0" />
            <span>
              <strong className="text-[#F7F7F5]">Registro de demonstração:</strong> esta ficha
              ilustra o formato de eventos no ResenhaPOA. Não representa uma atração comercial real.
            </span>
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Editorial Content */}
        <div className="lg:col-span-8 space-y-8">
          <div className="rounded-2xl border border-[#28282E] bg-[#1C1C20] overflow-hidden">
            <div className="relative overflow-hidden">
              <img
                src={heroImg}
                srcSet={getNightlifeSrcSet(heroImg)}
                sizes="(max-width: 1024px) 100vw, 66vw"
                alt={event.title}
                referrerPolicy="no-referrer"
                className="w-full h-[300px] sm:h-[440px] object-cover nightlife-color-photo"
              />
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#1C1C20] via-[#1C1C20]/40 to-transparent"
              />
              <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[#101012]/80 backdrop-blur-sm border border-white/15 text-[#F7F7F5]">
                  {catLabel}
                </span>
                {isFree && (
                  <span className="text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-[#F7F7F5] text-[#101012]">
                    Grátis
                  </span>
                )}
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-5">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#98989F]">
                <span className="text-[#F7F7F5] font-semibold">{event.neighborhood}</span>
                <span aria-hidden="true">·</span>
                <span className="text-[#F7F7F5] font-semibold">Classificação: {event.ageRating}</span>
                {event.isSponsored && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#FF5A36] font-semibold">Conteúdo patrocinado</span>
                  </>
                )}
                {event.isVerified && !event.isDemoExample && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 text-[#34D399] font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" /> Fonte verificada
                    </span>
                  </>
                )}
              </div>

              <h1 className="font-display text-3xl sm:text-5xl font-extrabold italic uppercase tracking-tight leading-[0.98] text-[#F7F7F5]">
                {event.title}
              </h1>

              {event.subtitle && (
                <p className="text-base sm:text-lg text-[#98989F] leading-relaxed">
                  {event.subtitle}
                </p>
              )}

              <div className="pt-5 border-t border-[#28282E] space-y-3">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#98989F]">
                  Sobre a programação
                </h2>
                <p className="text-sm sm:text-base text-[#F7F7F5]/90 whitespace-pre-line leading-relaxed">
                  {event.description}
                </p>
              </div>

              {event.lineup && event.lineup.length > 0 && (
                <div className="pt-5 border-t border-[#28282E]">
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#98989F] mb-3">
                    Atrações / Line-up informado
                  </h2>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {event.lineup.map((artist, idx) => (
                      <li
                        key={`${artist}-${idx}`}
                        className="px-4 py-3 rounded-xl bg-[#101012] border border-[#28282E] text-sm font-medium text-[#F7F7F5]"
                      >
                        {artist}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Source & Verification Transparency */}
              <div className="pt-5 border-t border-[#28282E] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#98989F]">
                <span>
                  Organização: <strong className="text-[#F7F7F5]">{event.organizerName}</strong> ·
                  Origem: {event.sourceName}
                  {event.lastVerifiedAt ? ` · Conferido em ${event.lastVerifiedAt}` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => setReportOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-[#98989F] hover:text-[#F7F7F5] underline self-start sm:self-auto"
                >
                  <Flag className="w-3.5 h-3.5" /> Reportar informação incorreta
                </button>
              </div>

              {reportOpen && (
                <form
                  onSubmit={handleReportSubmit}
                  className="p-4 rounded-xl bg-[#101012] border border-[#28282E] space-y-3"
                >
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#F7F7F5]">
                    O que precisa de correção nesta ficha?
                  </label>
                  <textarea
                    rows={3}
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="Ex: horário alterado, valor incorreto, evento cancelado..."
                    className="w-full min-w-0 rounded-xl bg-[#1C1C20] border border-[#28282E] p-3.5 text-base sm:text-sm text-[#F7F7F5] placeholder:text-[#98989F] focus:border-[#FF5A36] focus:outline-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setReportOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-[#98989F] hover:text-[#F7F7F5]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={reportBusy}
                      className="px-4 py-2 rounded-xl bg-[#FF5A36] hover:bg-[#FF6F4F] text-[#101012] text-xs font-extrabold uppercase tracking-wider transition-colors"
                    >
                      {reportBusy ? 'Enviando...' : 'Enviar aviso'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Map Section */}
          {typeof event.lat === 'number' && typeof event.lng === 'number' && (
            <div className="space-y-3">
              <SectionKicker label="Localização em Porto Alegre" accentColor="#5265FF" />
              <PoaMapView
                center={{ lat: event.lat, lng: event.lng }}
                zoom={15}
                heightClass="h-[320px]"
                selectedId={event.id}
                markers={[
                  {
                    id: event.id,
                    type: 'event',
                    title: event.title,
                    subtitle: `${event.venueName} · ${event.address}`,
                    neighborhood: event.neighborhood,
                    slug: event.slug,
                    lat: event.lat,
                    lng: event.lng,
                  },
                ]}
              />
            </div>
          )}
        </div>

        {/* Right: Action Sidebar */}
        <aside className="lg:col-span-4 space-y-5">
          <div className="bg-[#1C1C20] border border-[#28282E] rounded-2xl p-6 space-y-5 sticky top-24">
            <div className="space-y-4 pb-5 border-b border-[#28282E]">
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-[#FF5A36] shrink-0 mt-1" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#98989F]">
                    Data e horário
                  </p>
                  <p className="text-sm font-semibold text-[#F7F7F5] capitalize">
                    {formatIsoDateFullPtBr(event.dateISO)}
                  </p>
                  <p className="text-xs text-[#98989F] mt-0.5 tabular-nums">
                    Início às {event.startTime}
                    {event.endTime ? ` · Previsão de término ${event.endTime}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#5265FF] shrink-0 mt-1" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#98989F]">
                    Local e endereço
                  </p>
                  <p className="text-sm font-semibold text-[#F7F7F5]">{event.venueName}</p>
                  <p className="text-xs text-[#98989F] mt-0.5">{event.address}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#98989F] mb-1">
                Valor de entrada
              </p>
              <p
                className={`font-display text-3xl font-extrabold italic uppercase tabular-nums ${
                  isFree ? 'text-[#FF5A36]' : 'text-[#F7F7F5]'
                }`}
              >
                {priceText}
              </p>
              <p className="text-xs text-[#98989F] mt-1">
                Classificação etária: <strong className="text-[#F7F7F5]">{event.ageRating}</strong>
              </p>
            </div>

            <div className="space-y-2.5">
              {event.ticketUrl ? (
                <a
                  href={event.ticketUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-5 rounded-xl bg-[#FF5A36] hover:bg-[#FF6F4F] text-[#101012] font-extrabold uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <span>Garantir ingresso (site oficial)</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              ) : (
                <div className="p-3.5 rounded-xl bg-[#101012] border border-[#28282E] text-xs text-[#98989F]">
                  {event.priceType === 'free'
                    ? 'Evento gratuito sem venda antecipada registrada.'
                    : 'Link externo de ingressos não informado para este registro.'}
                </div>
              )}

              <button
                type="button"
                onClick={handleSave}
                className={`w-full py-3 px-4 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
                  saved
                    ? 'border-[#FF5A36] bg-[#FF5A36]/15 text-[#FF5A36]'
                    : 'border-[#28282E] bg-[#101012] hover:border-[#F7F7F5]/60 text-[#F7F7F5]'
                }`}
              >
                <Heart className="w-4 h-4" fill={saved ? 'currentColor' : 'none'} />
                <span>{saved ? 'Salvo nos favoritos' : 'Salvar evento'}</span>
              </button>

              <Link
                to={`/bora-junto?add=${encodeURIComponent(event.id)}`}
                className="w-full py-3 px-4 rounded-xl border border-[#28282E] bg-[#101012] hover:border-[#F7F7F5]/60 text-[#F7F7F5] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
              >
                <Users className="w-4 h-4" />
                <span>Incluir no Bora Junto</span>
              </Link>

              <button
                type="button"
                onClick={handleNativeShare}
                disabled={shareBusy}
                aria-expanded={shareTrayOpen}
                aria-controls="event-share-panel"
                className={`w-full py-3 px-4 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60 ${
                  shareTrayOpen
                    ? 'border-[#FF5A36] bg-[#FF5A36]/12 text-[#FF5A36]'
                    : 'border-[#28282E] bg-[#101012] hover:border-[#F7F7F5]/60 text-[#F7F7F5]'
                }`}
              >
                <Share2 className="w-4 h-4" />
                <span>{shareBusy ? 'Abrindo compartilhamento...' : 'Compartilhar evento'}</span>
              </button>

              {shareTrayOpen && (
                <div
                  id="event-share-panel"
                  role="region"
                  aria-label="Opções de compartilhamento nas redes sociais"
                  className="motion-safe:animate-menu-in p-4 rounded-xl bg-[#101012] border border-[#28282E] space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#98989F]">
                      Compartilhar nas redes
                    </p>
                    <button
                      type="button"
                      onClick={() => setShareTrayOpen(false)}
                      aria-label="Fechar opções de compartilhamento"
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[#98989F] hover:text-[#F7F7F5] hover:bg-[#1C1C20] transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={socialShareLinks.whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 rounded-lg bg-[#1C1C20] border border-[#28282E] hover:border-[#FF5A36]/60 text-xs font-semibold text-[#F7F7F5] flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>WhatsApp</span>
                      <ExternalLink className="w-3 h-3 text-[#98989F]" />
                    </a>
                    <a
                      href={socialShareLinks.x}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 rounded-lg bg-[#1C1C20] border border-[#28282E] hover:border-[#FF5A36]/60 text-xs font-semibold text-[#F7F7F5] flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>X (Twitter)</span>
                      <ExternalLink className="w-3 h-3 text-[#98989F]" />
                    </a>
                    <a
                      href={socialShareLinks.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 rounded-lg bg-[#1C1C20] border border-[#28282E] hover:border-[#FF5A36]/60 text-xs font-semibold text-[#F7F7F5] flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>Facebook</span>
                      <ExternalLink className="w-3 h-3 text-[#98989F]" />
                    </a>
                    <a
                      href={socialShareLinks.telegram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 rounded-lg bg-[#1C1C20] border border-[#28282E] hover:border-[#FF5A36]/60 text-xs font-semibold text-[#F7F7F5] flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>Telegram</span>
                      <ExternalLink className="w-3 h-3 text-[#98989F]" />
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="w-full py-2.5 px-3 rounded-lg bg-[#1C1C20] border border-[#28282E] hover:border-[#F7F7F5]/60 text-xs font-semibold text-[#F7F7F5] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#34D399]" />
                        <span>Link copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar link do evento</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {!shareTrayOpen && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <a
                    href={socialShareLinks.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3 rounded-xl bg-[#101012] border border-[#28282E] hover:border-[#F7F7F5]/60 text-xs font-semibold text-[#F7F7F5] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="py-2.5 px-3 rounded-xl bg-[#101012] border border-[#28282E] hover:border-[#F7F7F5]/60 text-xs font-semibold text-[#F7F7F5] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#34D399]" />
                        <span>Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar link</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Related Events */}
      {relatedEvents.length > 0 && (
        <section className="mt-16 pt-10 border-t border-[#28282E]">
          <SectionKicker label="Continue explorando" className="mb-2" />
          <h2 className="font-display text-3xl font-extrabold italic uppercase tracking-tight text-[#F7F7F5] mb-6">
            Outros rolês pela região ou estilo
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {relatedEvents.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
