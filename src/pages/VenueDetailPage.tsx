import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  Flag,
  Heart,
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
import { getNightlifeSrcSet } from '../utils/responsiveImage';
import { useDocumentHead } from '../utils/seoHead';
import {
  fetchApprovedVenueReviews,
  submitReport,
  submitVenueReview,
  toggleFavoriteInFirestore,
} from '../services/firestoreService';
import type { VenueReviewItem } from '../types/resenha';
import { PoaMapView } from '../components/PoaMapView';
import { EventCard } from '../components/EventCard';
import { SectionKicker } from '../components/BrandMark';
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

  useDocumentHead({
    title: venue ? `${venue.name} · ${venue.neighborhood} — ResenhaPOA` : 'Bar não encontrado — ResenhaPOA',
    description: venue
      ? `${venue.name} (${venue.category}) em ${venue.neighborhood}, Porto Alegre. ${venue.description.slice(0, 140)}`
      : 'Guia de bares e espaços culturais em Porto Alegre.',
  });

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
      <div className="max-w-[1320px] mx-auto px-5 sm:px-6 lg:px-8 py-20 text-center space-y-5 text-[#F7F7F5]">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#98989F]">
          Local não localizado
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold italic uppercase tracking-tight">
          Bar ou espaço não encontrado
        </h1>
        <Link
          to="/bares"
          className="inline-block px-6 py-3 rounded-xl bg-[#FF5A36] hover:bg-[#FF6F4F] text-[#101012] text-xs font-extrabold uppercase tracking-wider transition-colors"
        >
          Voltar para guia de bares
        </Link>
      </div>
    );
  }

  const saved = isFavorited('venue', venue.id);
  const openNow = isVenueOpenNow(venue.openingHours, venue.hoursVerified);
  const heroImg = venue.imageUrl || CAMPAIGN_PHOTOS.warmBar;

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
    if (venue.isDemoExample) {
      notify('Este é um bar demonstrativo. Avaliações funcionam em bares reais cadastrados.');
      return;
    }
    if (comment.trim().length < 10) {
      notify('Escreva um comentário com pelo menos 10 caracteres.');
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
    <div className="max-w-[1320px] mx-auto px-5 sm:px-6 lg:px-8 py-8 sm:py-12 text-[#F7F7F5]">
      <Link
        to="/bares"
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#98989F] hover:text-[#F7F7F5] mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar para bares
      </Link>

      {venue.isDemoExample && (
        <div className="mb-6 p-4 rounded-xl bg-[#1C1C20] border border-[#28282E] flex items-center gap-3 text-xs sm:text-sm text-[#98989F]">
          <Info className="w-4 h-4 text-[#FF5A36] shrink-0" />
          <span>
            <strong className="text-[#F7F7F5]">Registro de demonstração:</strong> esta ficha de bar
            serve para demonstrar a experiência do guia. Horários e avaliações reais aparecem apenas
            em estabelecimentos verificados.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <div className="rounded-2xl border border-[#28282E] bg-[#1C1C20] overflow-hidden">
            <div className="relative overflow-hidden">
              <img
                src={heroImg}
                srcSet={getNightlifeSrcSet(heroImg)}
                sizes="(max-width: 1024px) 100vw, 66vw"
                alt={venue.name}
                referrerPolicy="no-referrer"
                className="w-full h-[280px] sm:h-[420px] object-cover nightlife-color-photo"
              />
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#1C1C20] via-[#1C1C20]/35 to-transparent"
              />
              <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[#101012]/80 backdrop-blur-sm border border-white/15 text-[#F7F7F5]">
                  {venue.category}
                </span>
                {openNow === true && (
                  <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[#101012]/85 border border-[#34D399]/50 text-[#34D399] inline-flex items-center gap-1.5">
                    <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
                    Aberto agora
                  </span>
                )}
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-5">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#98989F]">
                <span className="text-[#F7F7F5] font-semibold">{venue.neighborhood}</span>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-[#F7F7F5]">Faixa {venue.priceRange}</span>
                {openNow !== null && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className={openNow ? 'text-[#34D399] font-semibold' : 'text-[#98989F]'}>
                      {openNow ? 'Aberto agora' : 'Fechado agora'}
                    </span>
                  </>
                )}
              </div>

              <h1 className="font-display text-3xl sm:text-5xl font-extrabold italic uppercase tracking-tight text-[#F7F7F5]">
                {venue.name}
              </h1>

              <p className="text-sm sm:text-base text-[#F7F7F5]/90 leading-relaxed">
                {venue.description}
              </p>

              {venue.features && venue.features.length > 0 && (
                <div className="pt-4 border-t border-[#28282E] flex flex-wrap gap-2 text-xs text-[#F7F7F5]">
                  {venue.features.map((feat) => (
                    <span
                      key={feat}
                      className="px-3 py-1.5 rounded-full bg-[#101012] border border-[#28282E] font-medium"
                    >
                      {feat}
                    </span>
                  ))}
                </div>
              )}

              <div className="pt-4 border-t border-[#28282E] flex flex-wrap items-center justify-between gap-3 text-xs text-[#98989F]">
                <span>
                  Origem dos dados: {venue.sourceName}
                  {venue.lastVerifiedAt ? ` · Atualizado em ${venue.lastVerifiedAt}` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => setReportOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 hover:text-[#F7F7F5] underline"
                >
                  <Flag className="w-3.5 h-3.5" /> Sugerir correção
                </button>
              </div>

              {reportOpen && (
                <form
                  onSubmit={handleReportSubmit}
                  className="p-4 rounded-xl bg-[#101012] border border-[#28282E] space-y-3"
                >
                  <textarea
                    rows={3}
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="Informe horário atualizado, endereço ou mudança de funcionamento..."
                    className="w-full rounded-xl bg-[#1C1C20] border border-[#28282E] p-3 text-sm text-[#F7F7F5] placeholder:text-[#98989F] focus:border-[#FF5A36] focus:outline-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setReportOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-[#98989F] hover:text-[#F7F7F5]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#FF5A36] hover:bg-[#FF6F4F] text-[#101012] text-xs font-extrabold uppercase tracking-wider transition-colors"
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
              <SectionKicker label="Onde fica" accentColor="#5265FF" />
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
          <section className="bg-[#1C1C20] border border-[#28282E] rounded-2xl p-6 sm:p-8 space-y-6">
            <div>
              <SectionKicker label="Comunidade" className="mb-2" />
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold italic uppercase text-[#F7F7F5]">
                Avaliações da comunidade
              </h2>
              <p className="text-xs text-[#98989F] mt-1">
                Comentários publicados apenas após moderação para evitar avaliações falsas.
              </p>
            </div>

            {reviewsLoading ? (
              <p className="text-xs text-[#98989F]">Carregando avaliações...</p>
            ) : reviews.length === 0 ? (
              <p className="text-sm text-[#98989F] py-4 border-y border-[#28282E]">
                Ainda não há avaliações aprovadas para este local. Compartilhe sua experiência abaixo.
              </p>
            ) : (
              <div className="space-y-3">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-xl bg-[#101012] border border-[#28282E] space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#F7F7F5]">{rev.authorName}</span>
                      <span className="inline-flex items-center gap-1 text-[#FF5A36] font-bold tabular-nums">
                        <Star className="w-3.5 h-3.5 fill-current" /> {rev.rating}/5
                      </span>
                    </div>
                    <p className="text-sm text-[#98989F]">{rev.comment}</p>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleReviewSubmit} className="space-y-3 pt-2">
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-xs font-bold uppercase tracking-wider text-[#F7F7F5]">
                  Sua nota:
                </label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      aria-label={`Nota ${n}`}
                      className={`w-9 h-9 rounded-xl border text-xs font-extrabold transition-colors ${
                        rating >= n
                          ? 'bg-[#FF5A36] border-[#FF5A36] text-[#101012]'
                          : 'bg-[#101012] border-[#28282E] text-[#98989F] hover:border-[#F7F7F5]/60'
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
                className="w-full rounded-xl bg-[#101012] border border-[#28282E] focus:border-[#FF5A36] p-3 text-sm text-[#F7F7F5] placeholder:text-[#98989F] focus:outline-none"
              />
              <button
                type="submit"
                disabled={submittingReview}
                className="px-5 py-3 rounded-xl bg-[#FF5A36] hover:bg-[#FF6F4F] disabled:opacity-60 text-[#101012] text-xs font-extrabold uppercase tracking-wider transition-colors"
              >
                {submittingReview ? 'Enviando...' : 'Enviar avaliação para moderação'}
              </button>
            </form>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-4 space-y-5">
          <div className="bg-[#1C1C20] border border-[#28282E] rounded-2xl p-6 space-y-5 sticky top-24">
            <div className="space-y-4 pb-5 border-b border-[#28282E]">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#5265FF] shrink-0 mt-1" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#98989F]">
                    Endereço
                  </p>
                  <p className="text-sm text-[#F7F7F5]">{venue.address}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-[#FF5A36] shrink-0 mt-1" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#98989F]">
                    Horários
                  </p>
                  <p className="text-sm text-[#F7F7F5]">
                    {venue.hoursVerified && venue.hoursSummary
                      ? venue.hoursSummary
                      : 'Horário não confirmado oficialmente'}
                  </p>
                </div>
              </div>

              {venue.musicStyle && (
                <div className="flex items-start gap-3">
                  <Music className="w-4 h-4 text-[#FF5A36] shrink-0 mt-1" />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#98989F]">
                      Som
                    </p>
                    <p className="text-sm text-[#F7F7F5]">{venue.musicStyle}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2.5">
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
                <span>{saved ? 'Bar salvo' : 'Salvar bar'}</span>
              </button>

              <Link
                to={`/bora-junto?addVenue=${encodeURIComponent(venue.id)}`}
                className="w-full py-3 px-4 rounded-xl border border-[#28282E] bg-[#101012] hover:border-[#F7F7F5]/60 text-[#F7F7F5] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
              >
                <Users className="w-4 h-4" />
                <span>Incluir no Bora Junto</span>
              </Link>

              {venue.websiteUrl && (
                <a
                  href={venue.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-[#FF5A36] hover:bg-[#FF6F4F] text-[#101012] font-extrabold uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-colors"
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
        <section className="mt-16 pt-10 border-t border-[#28282E]">
          <SectionKicker label="Programação na região" className="mb-2" />
          <h2 className="font-display text-3xl font-extrabold italic uppercase tracking-tight text-[#F7F7F5] mb-6">
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
