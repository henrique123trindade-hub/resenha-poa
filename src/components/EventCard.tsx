import React from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, MapPin, ShieldCheck } from 'lucide-react';
import type { EventItem } from '../types/resenha';
import { formatEventDatePtBr } from '../utils/datePoa';
import { CATEGORIES, CAMPAIGN_PHOTOS } from '../data/seedCatalog';
import { getNightlifeSrcSet, isCampaignNightlifePhoto } from '../utils/responsiveImage';
import { useAuth } from '../contexts/AuthContext';
import { toggleFavoriteInFirestore } from '../services/firestoreService';
import { useToast } from './Layout';

interface EventCardProps {
  event: EventItem;
  layout?: 'poster' | 'grid' | 'list' | 'feature';
  surface?: 'dark' | 'light';
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  layout = 'poster',
  surface = 'dark',
}) => {
  const { user, isFavorited, openAuthModal } = useAuth();
  const { notify } = useToast();
  const saved = isFavorited('event', event.id);

  const catLabel = CATEGORIES.find((c) => c.id === event.category)?.label || event.category;
  const dateLabel = formatEventDatePtBr(event.dateISO);
  const priceText =
    event.priceType === 'free'
      ? 'GRÁTIS'
      : event.priceType === 'paid' && typeof event.priceMin === 'number'
        ? `R$ ${event.priceMin}`
        : event.priceLabel || 'A confirmar';

  const fallbackPhoto =
    event.category === 'bares'
      ? CAMPAIGN_PHOTOS.galpao
      : event.category === 'gratuitos' || event.category === 'cultura'
        ? CAMPAIGN_PHOTOS.orla
        : CAMPAIGN_PHOTOS.djPista;

  const imgSrc = event.imageUrl || fallbackPhoto;
  const imgSrcSet = getNightlifeSrcSet(imgSrc);
  const applyBwTreatment = !event.imageUrl || event.isDemoExample || isCampaignNightlifePhoto(imgSrc);

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
      notify(next ? 'Evento salvo na sua conta.' : 'Removido dos seus favoritos.');
    } catch {
      notify('Não foi possível atualizar seus favoritos.');
    }
  };

  if (layout === 'list') {
    const isLight = surface === 'light';
    return (
      <article
        className={`border rounded-md transition-colors flex flex-col sm:flex-row overflow-hidden group ${
          isLight
            ? 'bg-white border-[#D8D8D4] hover:border-[#080808] text-[#080808]'
            : 'bg-[#141414] border-[#292929] hover:border-[#F4F4F2]/70 text-[#F4F4F2]'
        }`}
      >
        <Link
          to={`/eventos/${event.slug}`}
          className="sm:w-52 md:w-60 shrink-0 aspect-[16/10] sm:aspect-auto relative bg-[#080808] overflow-hidden"
        >
          <img
            src={imgSrc}
            srcSet={imgSrcSet}
            sizes="(max-width: 640px) 100vw, 240px"
            alt={event.title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className={`w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300 ${
              applyBwTreatment ? 'bw-editorial-photo' : ''
            }`}
          />
        </Link>

        <div className="flex-1 p-5 flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <div
                className={`flex flex-wrap items-center gap-2 text-xs ${
                  isLight ? 'text-[#525252]' : 'text-[#858585]'
                }`}
              >
                <span
                  className={`font-bold uppercase tracking-wider ${
                    isLight ? 'text-[#080808]' : 'text-[#F4F4F2]'
                  }`}
                >
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
                    <span className="font-bold uppercase underline">Cancelado</span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={handleSave}
                aria-label={saved ? `Remover ${event.title} dos favoritos` : `Salvar ${event.title}`}
                aria-pressed={saved}
                className={`w-9 h-9 shrink-0 rounded-md flex items-center justify-center border transition-colors ${
                  saved
                    ? isLight
                      ? 'bg-[#080808] border-[#080808] text-[#F4F4F2]'
                      : 'bg-[#F4F4F2] border-[#F4F4F2] text-[#080808]'
                    : isLight
                      ? 'border-[#D8D8D4] text-[#080808] hover:border-[#080808]'
                      : 'border-[#292929] text-[#F4F4F2] hover:border-[#F4F4F2]'
                }`}
              >
                <Bookmark className="w-4 h-4" fill={saved ? 'currentColor' : 'none'} />
              </button>
            </div>

            <Link to={`/eventos/${event.slug}`}>
              <h3 className="font-display text-2xl font-extrabold uppercase tracking-tight leading-tight group-hover:underline">
                {event.title}
              </h3>
            </Link>
            {event.subtitle && (
              <p
                className={`text-sm mt-1 line-clamp-2 ${
                  isLight ? 'text-[#525252]' : 'text-[#858585]'
                }`}
              >
                {event.subtitle}
              </p>
            )}
          </div>

          <div
            className={`pt-3 border-t flex flex-wrap items-center justify-between gap-3 text-xs ${
              isLight ? 'border-[#E5E5E1]' : 'border-[#292929]'
            }`}
          >
            <div
              className={`flex flex-wrap items-center gap-2 ${
                isLight ? 'text-[#525252]' : 'text-[#858585]'
              }`}
            >
              <span
                className={`inline-flex items-center gap-1 font-semibold ${
                  isLight ? 'text-[#080808]' : 'text-[#F4F4F2]'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                {event.neighborhood}
              </span>
              <span aria-hidden="true">·</span>
              <span>{event.venueName}</span>
              <span aria-hidden="true">·</span>
              <span
                className={`tabular-nums font-bold ${
                  isLight ? 'text-[#080808]' : 'text-[#F4F4F2]'
                }`}
              >
                {priceText}
              </span>
              <span aria-hidden="true">·</span>
              <span>{event.ageRating}</span>
            </div>

            <Link
              to={`/eventos/${event.slug}`}
              className={`font-bold uppercase tracking-wider hover:underline whitespace-nowrap ${
                isLight ? 'text-[#080808]' : 'text-[#F4F4F2]'
              }`}
            >
              Ver rolê →
            </Link>
          </div>
        </div>
      </article>
    );
  }

  // Default Nightlife Poster Card (matches reference "EM ALTA NA CIDADE" — photo-first, high contrast B&W)
  return (
    <article className="relative bg-[#141414] border border-[#292929] hover:border-[#F4F4F2]/75 rounded-md overflow-hidden group transition-colors flex flex-col">
      <div className="relative aspect-[4/3.6] bg-[#080808] overflow-hidden">
        <Link to={`/eventos/${event.slug}`} className="block w-full h-full">
          <img
            src={imgSrc}
            srcSet={imgSrcSet}
            sizes="(max-width: 640px) 82vw, (max-width: 1024px) 46vw, 24vw"
            alt={event.title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className={`w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300 ${
              applyBwTreatment ? 'bw-editorial-photo' : ''
            }`}
          />
          {/* Controlled contrast scrim for legibility without crushing upper stage lighting */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/60 to-transparent"
          />
        </Link>

        {/* Quiet Editorial Flags Only When Needed */}
        {(event.status === 'cancelled' || event.isDemoExample || event.isVerified) && (
          <div className="absolute top-3 left-3 pointer-events-none flex items-center gap-1.5">
            {event.status === 'cancelled' ? (
              <span className="bg-[#F4F4F2] text-[#080808] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[2px]">
                Cancelado
              </span>
            ) : event.isVerified ? (
              <span className="bg-[#080808]/85 border border-[#F4F4F2]/30 text-[#F4F4F2] text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-[2px] inline-flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Verificado
              </span>
            ) : (
              <span className="bg-[#080808]/80 border border-[#292929] text-[#F4F4F2]/85 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-[2px]">
                Exemplo
              </span>
            )}
          </div>
        )}

        {/* Bookmark Button */}
        <button
          type="button"
          onClick={handleSave}
          aria-label={saved ? `Remover ${event.title} dos favoritos` : `Salvar ${event.title}`}
          aria-pressed={saved}
          className={`absolute top-3 right-3 w-8 h-8 rounded-[4px] flex items-center justify-center border transition-colors ${
            saved
              ? 'bg-[#F4F4F2] border-[#F4F4F2] text-[#080808]'
              : 'bg-[#080808]/75 border-[#F4F4F2]/25 text-[#F4F4F2] hover:bg-[#F4F4F2] hover:text-[#080808]'
          }`}
        >
          <Bookmark className="w-4 h-4" fill={saved ? 'currentColor' : 'none'} />
        </button>

        {/* Overlay Event Copy (Reference Structure) */}
        <Link
          to={`/eventos/${event.slug}`}
          className="absolute inset-x-0 bottom-0 p-4 flex flex-col gap-1.5 text-[#F4F4F2]"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#F4F4F2]/80 tabular-nums">
            <span>{dateLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{event.startTime}</span>
            <span aria-hidden="true">·</span>
            <span className="uppercase tracking-wider">{catLabel}</span>
          </div>

          <h3 className="font-display text-[22px] sm:text-2xl font-extrabold uppercase italic leading-[0.98] tracking-tight text-[#F4F4F2] line-clamp-2 group-hover:underline">
            {event.title}
          </h3>

          <div className="pt-1.5 flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1 text-[#F4F4F2]/90 truncate">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-[#858585]" />
              <span className="truncate">{event.neighborhood}</span>
            </span>
            <span className="font-bold tabular-nums text-[#F4F4F2] shrink-0">{priceText}</span>
          </div>
        </Link>
      </div>
    </article>
  );
};
