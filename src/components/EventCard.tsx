import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Heart, MapPin, ShieldCheck } from 'lucide-react';
import type { EventItem } from '../types/resenha';
import { formatEventDatePtBr } from '../utils/datePoa';
import { CATEGORIES, CAMPAIGN_PHOTOS } from '../data/seedCatalog';
import { getNightlifeSrcSet } from '../utils/responsiveImage';
import { useAuth } from '../contexts/AuthContext';
import { toggleFavoriteInFirestore } from '../services/firestoreService';
import { useToast } from './Layout';

interface EventCardProps {
  event: EventItem;
  layout?: 'poster' | 'grid' | 'list' | 'feature';
  surface?: 'dark' | 'light';
  reasonLabel?: string;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  layout = 'poster',
  surface = 'dark',
  reasonLabel,
}) => {
  const { user, isFavorited, openAuthModal } = useAuth();
  const { notify } = useToast();
  const saved = isFavorited('event', event.id);

  const catMeta = CATEGORIES.find((c) => c.id === event.category);
  const catLabel = catMeta?.label || event.category;
  const dateLabel = formatEventDatePtBr(event.dateISO);
  const isFree = event.priceType === 'free';

  const priceText = isFree
    ? 'Grátis'
    : event.priceType === 'paid' && typeof event.priceMin === 'number'
      ? `R$ ${event.priceMin}`
      : event.priceType === 'unconfirmed'
        ? 'A confirmar'
        : event.priceLabel && event.priceLabel.length <= 16
          ? event.priceLabel
          : 'A confirmar';

  const fallbackPhoto =
    event.category === 'eletronica'
      ? CAMPAIGN_PHOTOS.cobaltDj
      : event.category === 'funk' || event.category === 'pagode-samba'
        ? CAMPAIGN_PHOTOS.crimsonBaile
        : event.category === 'bares'
          ? CAMPAIGN_PHOTOS.warmBar
          : event.category === 'gratuitos' || event.category === 'cultura'
            ? CAMPAIGN_PHOTOS.orla
            : CAMPAIGN_PHOTOS.amberCrowd;

  const imgSrc = event.imageUrl || fallbackPhoto;
  const imgSrcSet = getNightlifeSrcSet(imgSrc);
  const imgLoading = imgSrc.startsWith('/assets/') ? 'eager' : 'lazy';

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      openAuthModal(`Entre com sua conta Google para salvar "${event.title}" nos seus favoritos.`);
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
      notify(next ? 'Evento salvo nos seus favoritos.' : 'Removido dos seus favoritos.');
    } catch {
      notify('Não foi possível atualizar seus favoritos.');
    }
  };

  if (layout === 'list') {
    const isLight = surface === 'light';
    return (
      <article
        className={`card-lift border rounded-xl flex flex-col sm:flex-row overflow-hidden group ${
          isLight
            ? 'bg-white border-[#E2E2DE] hover:border-[#101012] text-[#101012]'
            : 'bg-[#1C1C20] border-[#28282E] hover:border-[#F7F7F5]/60 text-[#F7F7F5]'
        }`}
      >
        <Link
          to={`/eventos/${event.slug}`}
          className="sm:w-52 md:w-56 shrink-0 aspect-[16/10] sm:aspect-auto relative bg-[#101012] overflow-hidden"
        >
          <img
            src={imgSrc}
            srcSet={imgSrcSet}
            sizes="(max-width: 640px) 100vw, 224px"
            alt={event.title}
            loading={imgLoading}
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover nightlife-color-photo group-hover:scale-[1.04] transition-transform duration-300"
          />
        </Link>

        <div className="flex-1 p-5 flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <div
                className={`flex flex-wrap items-center gap-2 text-xs ${
                  isLight ? 'text-[#52525B]' : 'text-[#98989F]'
                }`}
              >
                <span className="font-bold uppercase tracking-wider text-[#FF5A36]">
                  {catLabel}
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums font-medium">
                  {dateLabel} · {event.startTime}
                </span>
                {event.isSponsored && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>Patrocinado</span>
                  </>
                )}
                {event.isDemoExample && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>Exemplo</span>
                  </>
                )}
                {event.status === 'cancelled' && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-bold uppercase text-red-500">Cancelado</span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={handleSave}
                aria-label={saved ? `Remover ${event.title} dos favoritos` : `Salvar ${event.title}`}
                aria-pressed={saved}
                className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center border transition-colors ${
                  saved
                    ? 'bg-[#FF5A36] border-[#FF5A36] text-[#101012]'
                    : isLight
                      ? 'border-[#E2E2DE] text-[#101012] hover:border-[#FF5A36] hover:text-[#FF5A36]'
                      : 'border-[#28282E] text-[#F7F7F5] hover:border-[#FF5A36] hover:text-[#FF5A36]'
                }`}
              >
                <Heart className="w-4 h-4" fill={saved ? 'currentColor' : 'none'} />
              </button>
            </div>

            <Link to={`/eventos/${event.slug}`}>
              <h3 className="font-display text-2xl font-extrabold uppercase tracking-tight leading-tight group-hover:text-[#FF5A36] transition-colors">
                {event.title}
              </h3>
            </Link>
            {event.subtitle && (
              <p
                className={`text-sm mt-1 line-clamp-2 ${
                  isLight ? 'text-[#52525B]' : 'text-[#98989F]'
                }`}
              >
                {event.subtitle}
              </p>
            )}
          </div>

          <div
            className={`pt-3 border-t flex flex-wrap items-center justify-between gap-3 text-xs ${
              isLight ? 'border-[#E8E8E6]' : 'border-[#28282E]'
            }`}
          >
            <div
              className={`flex flex-wrap items-center gap-2 ${
                isLight ? 'text-[#52525B]' : 'text-[#98989F]'
              }`}
            >
              <span
                className={`inline-flex items-center gap-1 font-semibold ${
                  isLight ? 'text-[#101012]' : 'text-[#F7F7F5]'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-[#FF5A36]" />
                {event.neighborhood}
              </span>
              <span aria-hidden="true">·</span>
              <span>{event.venueName}</span>
              <span aria-hidden="true">·</span>
              <span
                className={`tabular-nums font-bold ${
                  isFree
                    ? isLight
                      ? 'bg-[#101012] text-[#F7F7F5] px-2 py-0.5 rounded'
                      : 'bg-[#F7F7F5] text-[#101012] px-2 py-0.5 rounded'
                    : isLight
                      ? 'text-[#101012]'
                      : 'text-[#F7F7F5]'
                }`}
              >
                {priceText}
              </span>
              <span aria-hidden="true">·</span>
              <span>{event.ageRating}</span>
            </div>

            <Link
              to={`/eventos/${event.slug}`}
              className={`font-bold uppercase tracking-wider hover:text-[#FF5A36] whitespace-nowrap transition-colors ${
                isLight ? 'text-[#101012]' : 'text-[#F7F7F5]'
              }`}
            >
              Ver rolê →
            </Link>
          </div>
        </div>
      </article>
    );
  }

  // Asymmetric Spotlight Feature Card (for special featured slot)
  if (layout === 'feature') {
    return (
      <article className="card-lift relative rounded-2xl overflow-hidden bg-[#101012] border border-[#28282E] hover:border-[#FF5A36]/80 group h-full min-h-[340px] flex flex-col justify-end">
        <Link to={`/eventos/${event.slug}`} className="absolute inset-0">
          <img
            src={imgSrc}
            srcSet={imgSrcSet}
            sizes="(max-width: 1024px) 100vw, 50vw"
            alt={event.title}
            loading={imgLoading}
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover nightlife-color-photo group-hover:scale-[1.04] transition-transform duration-500"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-[#101012] via-[#101012]/65 to-black/15"
          />
        </Link>

        <div className="relative z-10 p-5 sm:p-6 flex flex-col justify-between h-full pointer-events-none">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
              <span className="bg-[#101012]/85 backdrop-blur-xs text-[#F7F7F5] border border-white/10 px-2.5 py-1 rounded-md">
                {catLabel}
              </span>
              {event.isDemoExample && (
                <span className="bg-[#101012]/80 text-[#98989F] border border-white/10 px-2 py-1 rounded-md">
                  Exemplo
                </span>
              )}
              {reasonLabel && (
                <span className="bg-[#5265FF] text-[#F7F7F5] px-2.5 py-1 rounded-md">
                  {reasonLabel}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleSave}
              aria-label={saved ? `Remover ${event.title} dos favoritos` : `Salvar ${event.title}`}
              aria-pressed={saved}
              className={`pointer-events-auto w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-xs transition-all active:scale-90 ${
                saved
                  ? 'bg-[#FF5A36] text-[#101012]'
                  : 'bg-[#101012]/75 text-[#F7F7F5] hover:bg-[#FF5A36] hover:text-[#101012]'
              }`}
            >
              <Heart className="w-4 h-4" fill={saved ? 'currentColor' : 'none'} />
            </button>
          </div>

          <Link
            to={`/eventos/${event.slug}`}
            className="pointer-events-auto mt-auto pt-16 space-y-2.5 text-[#F7F7F5]"
          >
            <h3 className="font-display text-3xl sm:text-4xl font-extrabold italic uppercase leading-[0.98] tracking-tight group-hover:text-[#FF5A36] transition-colors">
              {event.title}
            </h3>
            {event.subtitle && (
              <p className="text-xs sm:text-sm text-[#E8E8E6]/85 line-clamp-2 max-w-lg">
                {event.subtitle}
              </p>
            )}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
              <div className="flex flex-wrap items-center gap-3 text-[#E8E8E6]/90">
                <span className="inline-flex items-center gap-1.5 tabular-nums">
                  <Calendar className="w-3.5 h-3.5 text-[#FF5A36]" />
                  {dateLabel} · {event.startTime}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#FF5A36]" />
                  {event.neighborhood}
                </span>
              </div>
              <span
                className={`font-extrabold tabular-nums ${
                  isFree
                    ? 'text-xs uppercase tracking-wider bg-[#F7F7F5] text-[#101012] px-2.5 py-1 rounded-md'
                    : 'text-base text-[#F7F7F5]'
                }`}
              >
                {priceText}
              </span>
            </div>
          </Link>
        </div>
      </article>
    );
  }

  // Default ResenhaPOA Editorial Poster Card (clear 6-level hierarchy, strong legibility scrim)
  return (
    <article
      className={`card-lift relative rounded-2xl overflow-hidden bg-[#101012] group flex flex-col h-full shadow-lg ${
        surface === 'light'
          ? 'ring-1 ring-[#101012]/12 hover:ring-[#101012]/30'
          : 'border border-[#28282E] hover:border-[#F7F7F5]/45'
      }`}
    >
      <div className="relative aspect-[4/3.85] w-full bg-[#101012] overflow-hidden flex-1">
        <Link to={`/eventos/${event.slug}`} className="block w-full h-full">
          <img
            src={imgSrc}
            srcSet={imgSrcSet}
            sizes="(max-width: 640px) 82vw, (max-width: 1024px) 46vw, 24vw"
            alt={event.title}
            loading={imgLoading}
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover nightlife-color-photo group-hover:scale-[1.04] transition-transform duration-300"
          />
          {/* Deep bottom-weighted scrim ensuring crisp 4.5:1+ legibility even over bright stage lights */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-[#101012] via-[#101012]/72 via-45% to-black/15"
          />
        </Link>

        {/* Top-Left Category & Transparency Labels */}
        <div className="absolute top-3.5 left-3.5 right-14 pointer-events-none flex flex-wrap items-center gap-1.5">
          <span className="bg-[#101012]/82 backdrop-blur-xs border border-white/10 text-[#F7F7F5] text-[11px] font-semibold px-2.5 py-1 rounded-md">
            {catLabel}
          </span>
          {event.status === 'cancelled' && (
            <span className="bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md">
              Cancelado
            </span>
          )}
          {event.isDemoExample && (
            <span className="bg-[#101012]/78 border border-white/10 text-[#E8E8E6]/80 text-[10px] font-semibold px-2 py-1 rounded-md">
              Exemplo
            </span>
          )}
          {event.isVerified && !event.isDemoExample && (
            <span className="bg-[#101012]/82 border border-white/10 text-[#34D399] text-[10px] font-semibold px-2 py-1 rounded-md inline-flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Verificado
            </span>
          )}
        </div>

        {/* Top-Right Heart Favorite Button */}
        <button
          type="button"
          onClick={handleSave}
          aria-label={saved ? `Remover ${event.title} dos favoritos` : `Salvar ${event.title}`}
          aria-pressed={saved}
          className={`absolute top-3.5 right-3.5 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-xs transition-all active:scale-90 ${
            saved
              ? 'bg-[#FF5A36] text-[#101012]'
              : 'bg-[#101012]/72 border border-white/10 text-[#F7F7F5] hover:bg-[#FF5A36] hover:border-[#FF5A36] hover:text-[#101012]'
          }`}
        >
          <Heart className="w-4 h-4" fill={saved ? 'currentColor' : 'none'} />
        </button>

        {/* Bottom Editorial Copy */}
        <Link
          to={`/eventos/${event.slug}`}
          className="absolute inset-x-0 bottom-0 p-4 sm:p-5 flex flex-col gap-2 text-[#F7F7F5]"
        >
          {reasonLabel && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF5A36]">
              {reasonLabel}
            </span>
          )}

          <h3 className="font-display text-[22px] sm:text-2xl font-extrabold uppercase leading-[1.03] tracking-tight text-[#F7F7F5] line-clamp-2 group-hover:text-[#FF5A36] transition-colors">
            {event.title}
          </h3>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-[#E8E8E6]/90 tabular-nums">
              <Calendar className="w-3.5 h-3.5 text-[#FF5A36] shrink-0" />
              <span className="truncate">
                {dateLabel} · {event.startTime}
              </span>
            </div>

            <div className="pt-0.5 flex items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-1 text-[#E8E8E6]/85 truncate min-w-0">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-[#98989F]" />
                <span className="truncate">{event.neighborhood}</span>
              </span>
              <span
                className={`font-extrabold tabular-nums shrink-0 ${
                  isFree
                    ? 'text-[11px] uppercase tracking-wider bg-[#F7F7F5] text-[#101012] px-2 py-0.5 rounded'
                    : 'text-sm text-[#F7F7F5]'
                }`}
              >
                {priceText}
              </span>
            </div>
          </div>
        </Link>
      </div>
    </article>
  );
};
