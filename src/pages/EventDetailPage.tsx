import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Bookmark,
  Calendar,
  Copy,
  ExternalLink,
  Flag,
  Info,
  MapPin,
  Share2,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useCatalog } from '../contexts/CatalogContext';
import { useAuth } from '../contexts/AuthContext';
import { CAMPAIGN_PHOTOS, CATEGORIES } from '../data/seedCatalog';
import { formatEventDatePtBr, formatIsoDateFullPtBr } from '../utils/datePoa';
import { getNightlifeSrcSet, isCampaignNightlifePhoto } from '../utils/responsiveImage';
import { toggleFavoriteInFirestore, submitReport } from '../services/firestoreService';
import { PoaMapView } from '../components/PoaMapView';
import { EventCard } from '../components/EventCard';
import { useToast } from '../components/Layout';

export const EventDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { getEventBySlug, events } = useCatalog();
  const { user, isFavorited, openAuthModal } = useAuth();
  const { notify } = useToast();

  const event = slug ? getEventBySlug(slug) : undefined;
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportBusy, setReportBusy] = useState(false);

  if (!event) {
    return (
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-5 text-[#F4F4F2]">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#858585]">
          Evento não localizado
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold italic uppercase tracking-tight">
          Este rolê não está disponível
        </h1>
        <p className="text-sm text-[#858585] max-w-md mx-auto">
          O evento pode ter sido encerrado, removido ou o link está incorreto.
        </p>
        <Link
          to="/eventos"
          className="inline-block px-6 py-3 rounded-md bg-[#F4F4F2] hover:bg-white text-[#080808] text-xs font-bold uppercase tracking-wider transition-colors"
        >
          Explorar agenda de Porto Alegre
        </Link>
      </div>
    );
  }

  const saved = isFavorited('event', event.id);
  const catLabel = CATEGORIES.find((c) => c.id === event.category)?.label || event.category;
  const priceText =
    event.priceType === 'free'
      ? 'Gratuito'
      : event.priceType === 'paid' && typeof event.priceMin === 'number'
        ? `A partir de R$ ${event.priceMin}`
        : event.priceLabel || 'Valor a confirmar com o organizador';

  const heroImg = event.imageUrl || CAMPAIGN_PHOTOS.pista;
  const applyBwTreatment = !event.imageUrl || event.isDemoExample || isCampaignNightlifePhoto(heroImg);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
    `${event.title} · ${formatEventDatePtBr(event.dateISO)} às ${event.startTime} em ${event.neighborhood}, Porto Alegre — ${shareUrl}`,
  )}`;

  const handleSave = async () => {
    if (!user) {
      openAuthModal(`Entre para salvar "${event.title}" na sua lista.`);
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
      notify('Link copiado para compartilhar.');
    } catch {
      notify('Copie o endereço da barra do navegador.');
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('Entre com sua conta Google para enviar um aviso ou denúncia.');
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
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 text-[#F4F4F2]">
      <Link
        to="/eventos"
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#858585] hover:text-[#F4F4F2] mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar para agenda
      </Link>

      {/* Status / Transparency Banners */}
      <div className="space-y-3 mb-6">
        {event.status === 'cancelled' && (
          <div className="p-4 rounded-md bg-[#141414] border border-red-400/50 flex items-center gap-3 text-sm text-[#F4F4F2]">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <span>
              <strong>Evento cancelado:</strong> o organizador informou o cancelamento desta edição.
            </span>
          </div>
        )}
        {event.isDemoExample && (
          <div className="p-4 rounded-md bg-[#141414] border border-[#292929] flex items-center gap-3 text-xs sm:text-sm text-[#858585]">
            <Info className="w-4 h-4 text-[#F4F4F2] shrink-0" />
            <span>
              <strong className="text-[#F4F4F2]">Registro de demonstração:</strong> esta ficha
              ilustra o formato de eventos no ResenhaPOA. Não representa uma atração comercial real.
            </span>
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Editorial Content */}
        <div className="lg:col-span-8 space-y-8">
          <div className="rounded-md border border-[#292929] bg-[#141414] overflow-hidden">
            <img
              src={heroImg}
              srcSet={getNightlifeSrcSet(heroImg)}
              sizes="(max-width: 1024px) 100vw, 66vw"
              alt={event.title}
              referrerPolicy="no-referrer"
              className={`w-full h-[300px] sm:h-[420px] object-cover ${
                applyBwTreatment ? 'bw-editorial-photo' : ''
              }`}
            />
            <div className="p-6 sm:p-8 space-y-5">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#858585]">
                <span className="font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-[2px] bg-[#F4F4F2] text-[#080808]">
                  {catLabel}
                </span>
                <span>{event.neighborhood}</span>
                <span aria-hidden="true">·</span>
                <span className="text-[#F4F4F2] font-semibold">Classificação: {event.ageRating}</span>
                {event.isSponsored && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#F4F4F2] font-medium">Conteúdo patrocinado</span>
                  </>
                )}
                {event.isVerified && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 text-[#F4F4F2] font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" /> Fonte verificada
                    </span>
                  </>
                )}
              </div>

              <h1 className="font-display text-3xl sm:text-5xl font-extrabold italic uppercase tracking-tight leading-[0.98] text-[#F4F4F2]">
                {event.title}
              </h1>

              {event.subtitle && (
                <p className="text-base sm:text-lg text-[#858585] leading-relaxed">
                  {event.subtitle}
                </p>
              )}

              <div className="pt-5 border-t border-[#292929] space-y-3">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#858585]">
                  Sobre a programação
                </h2>
                <p className="text-sm sm:text-base text-[#F4F4F2]/90 whitespace-pre-line leading-relaxed">
                  {event.description}
                </p>
              </div>

              {event.lineup && event.lineup.length > 0 && (
                <div className="pt-5 border-t border-[#292929]">
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#858585] mb-3">
                    Atrações / Line-up informado
                  </h2>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {event.lineup.map((artist, idx) => (
                      <li
                        key={`${artist}-${idx}`}
                        className="px-4 py-2.5 rounded-md bg-[#080808] border border-[#292929] text-sm font-medium text-[#F4F4F2]"
                      >
                        {artist}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Source & Verification Transparency */}
              <div className="pt-5 border-t border-[#292929] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#858585]">
                <span>
                  Organização: <strong className="text-[#F4F4F2]">{event.organizerName}</strong> ·
                  Origem: {event.sourceName}
                  {event.lastVerifiedAt ? ` · Conferido em ${event.lastVerifiedAt}` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => setReportOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-[#858585] hover:text-[#F4F4F2] underline self-start sm:self-auto"
                >
                  <Flag className="w-3.5 h-3.5" /> Reportar informação incorreta
                </button>
              </div>

              {reportOpen && (
                <form
                  onSubmit={handleReportSubmit}
                  className="p-4 rounded-md bg-[#080808] border border-[#292929] space-y-3"
                >
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#F4F4F2]">
                    O que precisa de correção nesta ficha?
                  </label>
                  <textarea
                    rows={3}
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="Ex: horário alterado, valor incorreto, evento cancelado..."
                    className="w-full rounded-md bg-[#141414] border border-[#292929] p-3 text-sm text-[#F4F4F2] focus:border-[#F4F4F2] focus:outline-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setReportOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-[#858585] hover:text-[#F4F4F2]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={reportBusy}
                      className="px-4 py-2 rounded-md bg-[#F4F4F2] text-[#080808] text-xs font-bold uppercase tracking-wider"
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
              <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#858585]">
                Localização em Porto Alegre
              </h2>
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
          <div className="bg-[#141414] border border-[#292929] rounded-md p-6 space-y-5 sticky top-24">
            <div className="space-y-4 pb-5 border-b border-[#292929]">
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-[#F4F4F2] shrink-0 mt-1" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#858585]">
                    Data e horário
                  </p>
                  <p className="text-sm font-semibold text-[#F4F4F2] capitalize">
                    {formatIsoDateFullPtBr(event.dateISO)}
                  </p>
                  <p className="text-xs text-[#858585] mt-0.5 tabular-nums">
                    Início às {event.startTime}
                    {event.endTime ? ` · Previsão de término ${event.endTime}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#F4F4F2] shrink-0 mt-1" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#858585]">
                    Local e endereço
                  </p>
                  <p className="text-sm font-semibold text-[#F4F4F2]">{event.venueName}</p>
                  <p className="text-xs text-[#858585] mt-0.5">{event.address}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#858585] mb-1">
                Valor de entrada
              </p>
              <p className="font-display text-3xl font-extrabold italic uppercase text-[#F4F4F2] tabular-nums">
                {priceText}
              </p>
              <p className="text-xs text-[#858585] mt-1">
                Classificação etária: <strong className="text-[#F4F4F2]">{event.ageRating}</strong>
              </p>
            </div>

            <div className="space-y-2.5">
              {event.ticketUrl ? (
                <a
                  href={event.ticketUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-5 rounded-md bg-[#F4F4F2] hover:bg-white text-[#080808] font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <span>Garantir ingresso (site oficial)</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              ) : (
                <div className="p-3.5 rounded-md bg-[#080808] border border-[#292929] text-xs text-[#858585]">
                  {event.priceType === 'free'
                    ? 'Evento gratuito sem venda antecipada registrada.'
                    : 'Link externo de ingressos não informado para este registro.'}
                </div>
              )}

              <button
                type="button"
                onClick={handleSave}
                className={`w-full py-3 px-4 rounded-md border text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
                  saved
                    ? 'border-[#F4F4F2] bg-[#F4F4F2] text-[#080808]'
                    : 'border-[#292929] hover:border-[#F4F4F2] text-[#F4F4F2]'
                }`}
              >
                <Bookmark className="w-4 h-4" fill={saved ? 'currentColor' : 'none'} />
                <span>{saved ? 'Salvo nos favoritos' : 'Salvar evento'}</span>
              </button>

              <Link
                to={`/bora-junto?add=${encodeURIComponent(event.id)}`}
                className="w-full py-3 px-4 rounded-md border border-[#292929] hover:border-[#F4F4F2] text-[#F4F4F2] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
              >
                <Users className="w-4 h-4" />
                <span>Incluir no Bora Junto</span>
              </Link>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3 rounded-md bg-[#080808] border border-[#292929] hover:border-[#F4F4F2] text-xs font-semibold text-[#F4F4F2] flex items-center justify-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="py-2.5 px-3 rounded-md bg-[#080808] border border-[#292929] hover:border-[#F4F4F2] text-xs font-semibold text-[#F4F4F2] flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar link</span>
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Related Events */}
      {relatedEvents.length > 0 && (
        <section className="mt-16 pt-10 border-t border-[#292929]">
          <h2 className="font-display text-3xl font-extrabold italic uppercase tracking-tight text-[#F4F4F2] mb-6">
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
