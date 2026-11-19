import React from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, MapPin, Music } from 'lucide-react';
import type { VenueItem } from '../types/resenha';
import { isVenueOpenNow } from '../utils/datePoa';
import { CAMPAIGN_PHOTOS } from '../data/seedCatalog';
import { getNightlifeSrcSet, isCampaignNightlifePhoto } from '../utils/responsiveImage';
import { useAuth } from '../contexts/AuthContext';
import { toggleFavoriteInFirestore } from '../services/firestoreService';
import { useToast } from './Layout';

export const VenueCard: React.FC<{ venue: VenueItem }> = ({ venue }) => {
  const { user, isFavorited, openAuthModal } = useAuth();
  const { notify } = useToast();
  const saved = isFavorited('venue', venue.id);
  const openNow = isVenueOpenNow(venue.openingHours, venue.hoursVerified);

  const imgSrc = venue.imageUrl || CAMPAIGN_PHOTOS.galpao;
  const imgSrcSet = getNightlifeSrcSet(imgSrc);
  const applyBwTreatment = !venue.imageUrl || venue.isDemoExample || isCampaignNightlifePhoto(imgSrc);

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
    <article className="bg-[#141414] border border-[#292929] hover:border-[#F4F4F2]/75 rounded-md transition-colors flex flex-col overflow-hidden group">
      <div className="relative aspect-[16/10] bg-[#080808] overflow-hidden">
        <Link to={`/bares/${venue.slug}`} className="block w-full h-full">
          <img
            src={imgSrc}
            srcSet={imgSrcSet}
            sizes="(max-width: 768px) 92vw, (max-width: 1024px) 46vw, 24vw"
            alt={venue.name}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className={`w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300 ${
              applyBwTreatment ? 'bw-editorial-photo' : ''
            }`}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-[#080808]/80 via-transparent to-transparent"
          />
        </Link>

        <div className="absolute top-3 left-3 pointer-events-none">
          <span className="bg-[#080808]/85 border border-[#292929] text-[#F4F4F2] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[2px]">
            {venue.category}
          </span>
        </div>

        <button
          type="button"
          onClick={handleSave}
          aria-label={saved ? `Remover ${venue.name} dos favoritos` : `Salvar ${venue.name}`}
          aria-pressed={saved}
          className={`absolute top-3 right-3 w-8 h-8 rounded-[4px] flex items-center justify-center border transition-colors ${
            saved
              ? 'bg-[#F4F4F2] border-[#F4F4F2] text-[#080808]'
              : 'bg-[#080808]/75 border-[#F4F4F2]/25 text-[#F4F4F2] hover:bg-[#F4F4F2] hover:text-[#080808]'
          }`}
        >
          <Bookmark className="w-4 h-4" fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-4">
        <div>
          <div className="flex items-center justify-between gap-2 text-xs text-[#858585] mb-1.5">
            <span className="inline-flex items-center gap-1 font-semibold text-[#F4F4F2]">
              <MapPin className="w-3.5 h-3.5 text-[#858585]" />
              {venue.neighborhood}
            </span>
            <span className="font-bold text-[#F4F4F2] tabular-nums">{venue.priceRange}</span>
          </div>

          <Link to={`/bares/${venue.slug}`}>
            <h3 className="font-display text-2xl font-extrabold uppercase tracking-tight leading-tight text-[#F4F4F2] group-hover:underline">
              {venue.name}
            </h3>
          </Link>

          <p className="text-xs text-[#858585] mt-1 line-clamp-1">{venue.address}</p>

          {venue.musicStyle && (
            <p className="text-xs text-[#858585] mt-2 inline-flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-[#F4F4F2]" />
              <span>{venue.musicStyle}</span>
            </p>
          )}
        </div>

        <div className="pt-3 border-t border-[#292929] flex items-center justify-between gap-2 text-xs">
          {openNow !== null ? (
            <span className={openNow ? 'text-[#F4F4F2] font-bold' : 'text-[#858585]'}>
              {openNow ? '● Aberto agora' : 'Fechado agora'}
            </span>
          ) : (
            <span className="text-[#858585] truncate">
              {venue.hoursVerified && venue.hoursSummary
                ? venue.hoursSummary
                : 'Horário a confirmar'}
            </span>
          )}
          <Link
            to={`/bares/${venue.slug}`}
            className="font-bold uppercase tracking-wider text-[#F4F4F2] hover:underline whitespace-nowrap shrink-0"
          >
            Conhecer →
          </Link>
        </div>
      </div>
    </article>
  );
};
