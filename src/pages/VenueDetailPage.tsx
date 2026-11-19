import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  Clock,
  ExternalLink,
  Flag,
  Info,
  MapPin,
  Music,
  Star,
  Users,
} from 'lucide-react';
import { useCatalog } from '../contexts/CatalogContext';
import { useAuth } from '../contexts/AuthContext';
import { CAMPAIGN_PHOTOS } from '../data/seedCatalog';
import { isVenueOpenNow } from '../utils/datePoa';
import { getNightlifeSrcSet, isCampaignNightlifePhoto } from '../utils/responsiveImage';
import {
  fetchApprovedVenueReviews,
  submitReport,
  submitVenueReview,
  toggleFavoriteInFirestore,
} from '../services/firestoreService';
import type { VenueReviewItem } from '../types/resenha';
import { PoaMapView } from '../components/PoaMapView';
import { EventCard } from '../components/EventCard';
import { useToast } from '../components/Layout';

export const VenueDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { getVenueBySlug, events } = useCatalog();
  const { user, isFavorited, openAuthModal } = useAuth();
  const { notify } = useToast();

  const venue = slug ? getVenueBySlug(slug) : undefined;
  const [reviews, setReviews] = useState<VenueReviewItem[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');

  useEffect(() => {
    if (!venue) return;
    let active = true;
    setReviewsLoading(true);
    fetchApprovedVenueReviews(venue.id)
      .then((items) => {
        if (active) setReviews(items);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setReviewsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [venue]);

  if (!venue) {
    return (
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-5 text-[#F4F4F2]">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#858585]">
          Local não localizado
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold italic uppercase tracking-tight">
          Bar ou espaço não encontrado
        </h1>
        <Link
          to="/bares"
          className="inline-block px-6 py-3 rounded-md bg-[#F4F4F2] hover:bg-white text-[#080808] text-xs font-bold uppercase tracking-wider transition-colors"
        >
          Voltar para guia de bares
        </Link>
      </div>
    );
  }

  const saved = isFavorited('venue', venue.id);
  const openNow = isVenueOpenNow(venue.openingHours, venue.hoursVerified);
  const heroImg = venue.imageUrl || CAMPAIGN_PHOTOS.galpao;
  const applyBwTreatment = !venue.imageUrl || venue.isDemoExample || isCampaignNightlifePhoto(heroImg);

  const linkedEvents = events.filter(
    (e) =>
      e.status === 'published' &&
      (e.venueName.toLowerCase() === venue.name.toLowerCase() ||
        e.neighborhood === venue.neighborhood),
  );

  const handleSave = async () => {
    if (!user) {
      openAuthModal(`Entre para salvar "${venue.name}" nos seus favoritos.`);
      return;
    }
    try {
      const next = await toggleFavoriteInFirestore({
        userId: user.uid,
        targetType: 'venue',
        targetId: venue.id,
        title: venue.name,
        currentlySaved: saved,
      });
      notify(next ? 'Bar salvo na sua conta.' : 'Removido dos favoritos.');
    } catch {
      notify('Não foi possível atualizar seus favoritos.');
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('Entre com sua conta Google para enviar sua avaliação sobre este local.');
      return;
    }
    if (comment.trim().length < 8) {
      notify('Escreva um comentário com pelo menos 8 caracteres.');
      return;
    }
    setSubmittingReview(true);
    try {
      await submitVenueReview({
        venueId: venue.id,
        authorId: user.uid,
        authorName: user.displayName || 'Explorador POA',
        rating,
        comment,
      });
      setComment('');
      notify('Avaliação enviada para moderação. Ela aparecerá após revisão.');
    } catch {
      notify('Não foi possível enviar sua avaliação.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('Entre com sua conta Google para enviar um aviso.');
      return;
    }
    if (reportReason.trim().length < 5) {
      notify('Descreva o ajuste necessário.');
      return;
    }
    try {
      await submitReport({
        targetType: 'venue',
        targetId: venue.id,
        reason: reportReason,
        reporterId: user.uid,
      });
      setReportReason('');
      setReportOpen(false);
      notify('Aviso registrado para a equipe editorial.');
    } catch {
      notify('Erro ao enviar aviso.');
    }
  };

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 text-[#F4F4F2]">
      <Link
        to="/bares"
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#858585] hover:text-[#F4F4F2] mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar para bares
      </Link>

      {venue.isDemoExample && (
        <div className="mb-6 p-4 rounded-md bg-[#141414] border border-[#292929] flex items-center gap-3 text-xs sm:text-sm text-[#858585]">
          <Info className="w-4 h-4 text-[#F4F4F2] shrink-0" />
          <span>
            <strong className="text-[#F4F4F2]">Registro de demonstração:</strong> esta ficha de bar
            serve para demonstrar a experiência do guia. Horários e avaliações reais aparecem apenas
            em estabelecimentos verificados.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <div className="rounded-md border border-[#292929] bg-[#141414] overflow-hidden">
            <img
              src={heroImg}
              srcSet={getNightlifeSrcSet(heroImg)}
              sizes="(max-width: 1024px) 100vw, 66vw"
              alt={venue.name}
              referrerPolicy="no-referrer"
              className={`w-full h-[280px] sm:h-[400px] object-cover ${
                applyBwTreatment ? 'bw-editorial-photo' : ''
              }`}
            />
            <div className="p-6 sm:p-8 space-y-5">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#858585]">
                <span className="font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-[2px] bg-[#F4F4F2] text-[#080808]">
                  {venue.category}
                </span>
                <span>{venue.neighborhood}</span>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-[#F4F4F2]">Faixa {venue.priceRange}</span>
                {openNow !== null && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className={openNow ? 'text-[#F4F4F2] font-bold' : 'text-[#858585]'}>
                      {openNow ? '● Aberto agora' : 'Fechado agora'}
                    </span>
                  </>
                )}
              </div>

              <h1 className="font-display text-3xl sm:text-5xl font-extrabold italic uppercase tracking-tight text-[#F4F4F2]">
                {venue.name}
              </h1>

              <p className="text-sm sm:text-base text-[#F4F4F2]/90 leading-relaxed">
                {venue.description}
              </p>

              {venue.features && venue.features.length > 0 && (
                <div className="pt-4 border-t border-[#292929] flex flex-wrap gap-2 text-xs text-[#F4F4F2]">
                  {venue.features.map((feat) => (
                    <span
                      key={feat}
                      className="px-3 py-1 rounded-[2px] bg-[#080808] border border-[#292929] font-medium"
                    >
                      {feat}
                    </span>
                  ))}
                </div>
              )}

              <div className="pt-4 border-t border-[#292929] flex flex-wrap items-center justify-between gap-3 text-xs text-[#858585]">
                <span>
                  Origem dos dados: {venue.sourceName}
                  {venue.lastVerifiedAt ? ` · Atualizado em ${venue.lastVerifiedAt}` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => setReportOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 hover:text-[#F4F4F2] underline"
                >
                  <Flag className="w-3.5 h-3.5" /> Sugerir correção
                </button>
              </div>

              {reportOpen && (
                <form
                  onSubmit={handleReportSubmit}
                  className="p-4 rounded-md bg-[#080808] border border-[#292929] space-y-3"
                >
                  <textarea
                    rows={3}
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="Informe horário atualizado, endereço ou mudança de funcionamento..."
                    className="w-full rounded-md bg-[#141414] border border-[#292929] p-3 text-sm text-[#F4F4F2] focus:border-[#F4F4F2] focus:outline-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setReportOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-[#858585] hover:text-[#F4F4F2]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-md bg-[#F4F4F2] text-[#080808] text-xs font-bold uppercase tracking-wider"
                    >
                      Enviar correção
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {typeof venue.lat === 'number' && typeof venue.lng === 'number' && (
            <div className="space-y-3">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#858585]">
                Onde fica
              </h2>
              <PoaMapView
                center={{ lat: venue.lat, lng: venue.lng }}
                zoom={15}
                heightClass="h-[300px]"
                selectedId={venue.id}
                markers={[
                  {
                    id: venue.id,
                    type: 'venue',
                    title: venue.name,
                    subtitle: `${venue.category} · ${venue.address}`,
                    neighborhood: venue.neighborhood,
                    slug: venue.slug,
                    lat: venue.lat,
                    lng: venue.lng,
                  },
                ]}
              />
            </div>
          )}

          {/* Moderated Reviews */}
          <section className="bg-[#141414] border border-[#292929] rounded-md p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold italic uppercase text-[#F4F4F2]">
                Avaliações da comunidade
              </h2>
              <p className="text-xs text-[#858585] mt-1">
                Comentários publicados apenas após moderação para evitar avaliações falsas.
              </p>
            </div>

            {reviewsLoading ? (
              <p className="text-xs text-[#858585]">Carregando avaliações...</p>
            ) : reviews.length === 0 ? (
              <p className="text-sm text-[#858585] py-4 border-y border-[#292929]">
                Ainda não há avaliações aprovadas para este local. Compartilhe sua experiência abaixo.
              </p>
            ) : (
              <div className="space-y-3">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-md bg-[#080808] border border-[#292929] space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#F4F4F2]">{rev.authorName}</span>
                      <span className="inline-flex items-center gap-1 text-[#F4F4F2] font-bold tabular-nums">
                        <Star className="w-3.5 h-3.5 fill-current" /> {rev.rating}/5
                      </span>
                    </div>
                    <p className="text-sm text-[#858585]">{rev.comment}</p>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleReviewSubmit} className="space-y-3 pt-2">
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-xs font-bold uppercase tracking-wider text-[#F4F4F2]">
                  Sua nota:
                </label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      aria-label={`Nota ${n}`}
                      className={`w-9 h-9 rounded-md border text-xs font-bold transition-colors ${
                        rating >= n
                          ? 'bg-[#F4F4F2] border-[#F4F4F2] text-[#080808]'
                          : 'bg-[#080808] border-[#292929] text-[#858585] hover:border-[#F4F4F2]'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Como foi o som, atendimento e clima do lugar?"
                className="w-full rounded-md bg-[#080808] border border-[#292929] focus:border-[#F4F4F2] p-3 text-sm text-[#F4F4F2] placeholder:text-[#858585] focus:outline-none"
              />
              <button
                type="submit"
                disabled={submittingReview}
                className="px-5 py-3 rounded-md bg-[#F4F4F2] hover:bg-white disabled:opacity-60 text-[#080808] text-xs font-bold uppercase tracking-wider transition-colors"
              >
                {submittingReview ? 'Enviando...' : 'Enviar avaliação para moderação'}
              </button>
            </form>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-4 space-y-5">
          <div className="bg-[#141414] border border-[#292929] rounded-md p-6 space-y-5 sticky top-24">
            <div className="space-y-4 pb-5 border-b border-[#292929]">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#F4F4F2] shrink-0 mt-1" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#858585]">
                    Endereço
                  </p>
                  <p className="text-sm text-[#F4F4F2]">{venue.address}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-[#F4F4F2] shrink-0 mt-1" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#858585]">
                    Horários
                  </p>
                  <p className="text-sm text-[#F4F4F2]">
                    {venue.hoursVerified && venue.hoursSummary
                      ? venue.hoursSummary
                      : 'Horário não confirmado oficialmente'}
                  </p>
                </div>
              </div>

              {venue.musicStyle && (
                <div className="flex items-start gap-3">
                  <Music className="w-4 h-4 text-[#F4F4F2] shrink-0 mt-1" />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#858585]">
                      Som
                    </p>
                    <p className="text-sm text-[#F4F4F2]">{venue.musicStyle}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2.5">
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
                <span>{saved ? 'Bar salvo' : 'Salvar bar'}</span>
              </button>

              <Link
                to={`/bora-junto?addVenue=${encodeURIComponent(venue.id)}`}
                className="w-full py-3 px-4 rounded-md border border-[#292929] hover:border-[#F4F4F2] text-[#F4F4F2] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
              >
                <Users className="w-4 h-4" />
                <span>Incluir no Bora Junto</span>
              </Link>

              {venue.websiteUrl && (
                <a
                  href={venue.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-md bg-[#F4F4F2] hover:bg-white text-[#080808] font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <span>Canal oficial</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </aside>
      </div>

      {linkedEvents.length > 0 && (
        <section className="mt-16 pt-10 border-t border-[#292929]">
          <h2 className="font-display text-3xl font-extrabold italic uppercase tracking-tight text-[#F4F4F2] mb-6">
            Eventos vinculados ou na região
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {linkedEvents.slice(0, 3).map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
