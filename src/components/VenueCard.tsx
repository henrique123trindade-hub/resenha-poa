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
  const { user, isFavorited, requireVerifiedAccount } = useAuth();
  const { notify } = useToast();
  const saved = isFavorited('venue', venue.id);
  const openNow = isVenueOpenNow(venue.openingHours, venue.hoursVerified);
  const isLight = surface === 'light';

  const imgSrc = venue.imageUrl || CAMPAIGN_PHOTOS.warmBar;
  const imgSrcSet = getNightlifeSrcSet(imgSrc);

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!requireVerifiedAccount(`Entre ou crie uma conta para salvar "${venue.name}" nos seus favoritos.`) || !user) {
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
      className={`card-lift rounded-2xl border flex flex-col h-full overflow-hidden group ${
        isLight
          ? 'bg-white border-[#E2E2DE] hover:border-[#101012] text-[#101012]'
          : 'bg-[#1C1C20] border-[#28282E] hover:border-[#F7F7F5]/45 text-[#F7F7F5]'
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
            className="w-full h-full object-cover nightlife-color-photo group-hover:scale-[1.04] transition-transform duration-300"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-[#101012]/90 via-[#101012]/25 to-black/10"
          />
        </Link>

        {/* Top-left Venue Type */}
        <div className="absolute top-3 left-3 right-14 pointer-events-none flex items-center gap-1.5">
          <span className="bg-[#101012]/82 backdrop-blur-xs border border-white/10 text-[#F7F7F5] text-[11px] font-semibold px-2.5 py-1 rounded-md">
            {venue.category}
          </span>
          {venue.isDemoExample && (
            <span className="bg-[#101012]/78 border border-white/10 text-[#E8E8E6]/80 text-[10px] font-semibold px-2 py-1 rounded-md">
              Exemplo
            </span>
          )}
        </div>

        {/* Bottom-left Neighborhood & Price Tier overlaid on image for rapid bar scanning */}
        <div className="absolute inset-x-3 bottom-3 pointer-events-none flex items-center justify-between gap-2 text-xs">
          <span className="inline-flex items-center gap-1 font-semibold text-[#F7F7F5] truncate">
            <MapPin className="w-3.5 h-3.5 text-[#FF5A36] shrink-0" />
            <span className="truncate">{venue.neighborhood}</span>
          </span>
          {venue.priceRange !== 'Não informado' && (
            <span className="px-2 py-0.5 rounded bg-[#101012]/80 border border-white/10 text-[#F7F7F5] text-[11px] font-bold tabular-nums shrink-0">
              {venue.priceRange}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleSave}
          aria-label={saved ? `Remover ${venue.name} dos favoritos` : `Salvar ${venue.name}`}
          aria-pressed={saved}
          className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-xs transition-all active:scale-90 ${
            saved
              ? 'bg-[#FF5A36] text-[#101012]'
              : 'bg-[#101012]/70 border border-white/10 text-[#F7F7F5] hover:bg-[#FF5A36] hover:border-[#FF5A36] hover:text-[#101012]'
          }`}
        >
          <Heart className="w-4 h-4" fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-4">
        <div className="space-y-2.5">
          <div>
            <Link to={`/bares/${venue.slug}`}>
              <h3 className="font-display text-[23px] font-extrabold uppercase tracking-tight leading-[1.03] group-hover:text-[#FF5A36] transition-colors line-clamp-2">
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
          </div>

          {/* Dedicated Bar Atmosphere & Sound Strip */}
          <div
            className={`pt-2.5 border-t space-y-1.5 text-xs ${
              isLight ? 'border-[#E8E8E6] text-[#52525B]' : 'border-[#28282E] text-[#98989F]'
            }`}
          >
            <p className="flex items-center justify-between gap-2">
              <span className="text-[11px] uppercase tracking-wider font-semibold opacity-80">
                Clima
              </span>
              <span className={`font-medium truncate ${isLight ? 'text-[#101012]' : 'text-[#E8E8E6]'}`}>
                {venue.environmentType}
              </span>
            </p>
            {venue.musicStyle && (
              <p className="flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-[#5265FF] shrink-0" />
                <span className="truncate">{venue.musicStyle}</span>
              </p>
            )}
          </div>
        </div>

        <div
          className={`pt-3 border-t flex items-center justify-between gap-2 text-xs ${
            isLight ? 'border-[#E8E8E6]' : 'border-[#28282E]'
          }`}
        >
          {openNow !== null ? (
            <span
              className={`inline-flex items-center gap-1.5 font-semibold ${
                openNow ? 'text-[#34D399]' : 'text-[#98989F]'
              }`}
            >
              <span
                aria-hidden="true"
                className={`w-1.5 h-1.5 rounded-full ${openNow ? 'bg-[#34D399]' : 'bg-[#98989F]'}`}
              />
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
            Ver bar →
          </Link>
        </div>
      </div>
    </article>
  );
};
