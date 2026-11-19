import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, MapPin, Music } from 'lucide-react';
import type { VenueItem } from '../types/resenha';
import { isVenueOpenNow } from '../utils/datePoa';
import { CAMPAIGN_PHOTOS } from '../data/seedCatalog';
import { getNightlifeSrcSet } from '../utils/responsiveImage';
import { useAuth } from '../contexts/AuthContext';
import { toggleFavoriteInFirestore } from '../services/firestoreService';
import { useToast } from './Layout';

export const VenueCard: React.FC<{ venue: VenueItem; surface?: 'dark' | 'light' }> = ({
  venue,
  surface = 'dark',
}) => {
  const { user, isFavorited, openAuthModal } = useAuth();
  const { notify } = useToast();
  const saved = isFavorited('venue', venue.id);
  const openNow = isVenueOpenNow(venue.openingHours, venue.hoursVerified);
  const isLight = surface === 'light';

  const imgSrc = venue.imageUrl || CAMPAIGN_PHOTOS.warmBar;
  const imgSrcSet = getNightlifeSrcSet(imgSrc);

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      openAuthModal(`Entre com sua conta Google para salvar "${venue.name}" nos seus favoritos.`);
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
      notify(next ? 'Bar salvo na sua conta.' : 'Bar removido dos favoritos.');
    } catch {
      notify('Não foi possível atualizar seus favoritos.');
    }
  };

  return (
    <article
      className={`card-lift rounded-2xl border flex flex-col overflow-hidden group ${
        isLight
          ? 'bg-white border-[#E2E2DE] hover:border-[#101012] text-[#101012]'
          : 'bg-[#1C1C20] border-[#28282E] hover:border-[#F7F7F5]/60 text-[#F7F7F5]'
      }`}
    >
      <div className="relative aspect-[16/10] bg-[#101012] overflow-hidden">
        <Link to={`/bares/${venue.slug}`} className="block w-full h-full">
          <img
            src={imgSrc}
            srcSet={imgSrcSet}
            sizes="(max-width: 768px) 92vw, (max-width: 1024px) 46vw, 24vw"
            alt={venue.name}
            loading={imgSrc.startsWith('/assets/') ? 'eager' : 'lazy'}
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover nightlife-color-photo group-hover:scale-[1.05] transition-transform duration-300"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-[#101012]/80 via-transparent to-transparent"
          />
        </Link>

        <div className="absolute top-3 left-3 pointer-events-none">
          <span className="bg-[#101012]/80 backdrop-blur-xs text-[#F7F7F5] text-[11px] font-semibold px-2.5 py-1 rounded-md">
            {venue.category}
          </span>
        </div>

        <button
          type="button"
          onClick={handleSave}
          aria-label={saved ? `Remover ${venue.name} dos favoritos` : `Salvar ${venue.name}`}
          aria-pressed={saved}
          className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-xs transition-colors ${
            saved
              ? 'bg-[#FF5A36] text-[#101012]'
              : 'bg-[#101012]/65 text-[#F7F7F5] hover:bg-[#FF5A36] hover:text-[#101012]'
          }`}
        >
          <Heart className="w-4 h-4" fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-4">
        <div>
          <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
            <span
              className={`inline-flex items-center gap-1 font-semibold ${
                isLight ? 'text-[#101012]' : 'text-[#F7F7F5]'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-[#FF5A36]" />
              {venue.neighborhood}
            </span>
            <span
              className={`font-bold tabular-nums ${
                isLight ? 'text-[#52525B]' : 'text-[#98989F]'
              }`}
            >
              {venue.priceRange}
            </span>
          </div>

          <Link to={`/bares/${venue.slug}`}>
            <h3 className="font-display text-2xl font-extrabold uppercase tracking-tight leading-tight group-hover:text-[#FF5A36] transition-colors">
              {venue.name}
            </h3>
          </Link>

          <p
            className={`text-xs mt-1 line-clamp-1 ${
              isLight ? 'text-[#52525B]' : 'text-[#98989F]'
            }`}
          >
            {venue.address}
          </p>

          {venue.musicStyle && (
            <p
              className={`text-xs mt-2 inline-flex items-center gap-1.5 ${
                isLight ? 'text-[#52525B]' : 'text-[#98989F]'
              }`}
            >
              <Music className="w-3.5 h-3.5 text-[#5265FF] shrink-0" />
              <span className="line-clamp-1">{venue.musicStyle}</span>
            </p>
          )}
        </div>

        <div
          className={`pt-3 border-t flex items-center justify-between gap-2 text-xs ${
            isLight ? 'border-[#E8E8E6]' : 'border-[#28282E]'
          }`}
        >
          {openNow !== null ? (
            <span
              className={
                openNow
                  ? isLight
                    ? 'bg-[#101012] text-[#D5FF52] px-2 py-0.5 rounded font-bold'
                    : 'text-[#D5FF52] font-bold'
                  : 'text-[#98989F]'
              }
            >
              {openNow ? 'Aberto agora' : 'Fechado agora'}
            </span>
          ) : (
            <span className="text-[#98989F] truncate">
              {venue.hoursVerified && venue.hoursSummary
                ? venue.hoursSummary
                : 'Horário a confirmar'}
            </span>
          )}
          <Link
            to={`/bares/${venue.slug}`}
            className={`font-bold uppercase tracking-wider hover:text-[#FF5A36] whitespace-nowrap shrink-0 transition-colors ${
              isLight ? 'text-[#101012]' : 'text-[#F7F7F5]'
            }`}
          >
            Conhecer →
          </Link>
        </div>
      </div>
    </article>
  );
};
