import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Compass,
  Disc3,
  Headphones,
  MapPin,
  Mic2,
  Music,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  Users,
  Volume2,
  Wine,
} from 'lucide-react';
import { useCatalog } from '../contexts/CatalogContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Layout';
import { CAMPAIGN_PHOTOS } from '../data/seedCatalog';
import { EventCard } from '../components/EventCard';
import { EventCardReveal } from '../components/EventCardReveal';
import { PullToRefresh } from '../components/PullToRefresh';
import { VenueCard } from '../components/VenueCard';
import { VibeDiscoverySection } from '../components/VibeDiscoverySection';
import { PoaMapView, type MapMarkerItem } from '../components/PoaMapView';
import {
  BrushUnderline,
  PoaCrownMark,
  ScribbleAccent,
  SectionKicker,
} from '../components/BrandMark';
import { filterAndSortEvents } from '../utils/eventFilters';
import { formatEventDatePtBr, getWeekendDatesISO } from '../utils/datePoa';
import { getRecommendedEvents } from '../utils/recommendations';
import { getNightlifeSrcSet } from '../utils/responsiveImage';
import { buildHeroSearchSuggestions } from '../utils/vibeDiscovery';
import { DEFAULT_SITE_DESCRIPTION, DEFAULT_SITE_TITLE, useDocumentHead } from '../utils/seoHead';
import type { EventCategoryId, QuickDateFilter } from '../types/resenha';

interface VibeTile {
  id: string;
  label: string;
  categoryId: EventCategoryId;
  photo: string;
  alt: string;
  tintClass: string;
  icon: React.FC<{ className?: string }>;
  isBw?: boolean;
}

const VIBE_TILES: VibeTile[] = [
  {
    id: 'funk',
    label: 'Funk',
    categoryId: 'funk',
    photo: CAMPAIGN_PHOTOS.crimsonBaile,
    alt: 'Pista de funk iluminada em vermelho e magenta em Porto Alegre',
    tintClass: 'from-[#101012] via-[#101012]/45 to-transparent',
    icon: Volume2,
  },
  {
    id: 'eletronica',
    label: 'Eletrônica',
    categoryId: 'eletronica',
    photo: CAMPAIGN_PHOTOS.cobaltDj,
    alt: 'DJ tocando música eletrônica sob luzes azul cobalto em galpão',
    tintClass: 'from-[#101012] via-[#5265FF]/25 to-transparent',
    icon: Activity,
  },
  {
    id: 'hip-hop',
    label: 'Hip-Hop',
    categoryId: 'hip-hop',
    photo: CAMPAIGN_PHOTOS.ruaEntrada,
    alt: 'Cena urbana noturna de hip-hop em Porto Alegre',
    tintClass: 'from-[#101012] via-[#101012]/50 to-transparent',
    icon: Headphones,
    isBw: true,
  },
  {
    id: 'pagode',
    label: 'Pagode',
    categoryId: 'pagode-samba',
    photo: CAMPAIGN_PHOTOS.amberCrowd,
    alt: 'Roda de pagode e samba iluminada em tons âmbar',
    tintClass: 'from-[#101012] via-[#FF5A36]/22 to-transparent',
    icon: Music,
  },
  {
    id: 'rock',
    label: 'Rock',
    categoryId: 'rock-indie',
    photo: CAMPAIGN_PHOTOS.crowdFlash,
    alt: 'Público em show de rock independente em Porto Alegre',
    tintClass: 'from-[#101012] via-[#101012]/50 to-transparent',
    icon: Disc3,
    isBw: true,
  },
  {
    id: 'pop',
    label: 'Pop',
    categoryId: 'pop',
    photo: CAMPAIGN_PHOTOS.pista,
    alt: 'Festa pop noturna com iluminação vibrante de pista',
    tintClass: 'from-[#101012] via-[#101012]/45 to-transparent',
    icon: Sparkles,
  },
  {
    id: 'shows',
    label: 'Shows',
    categoryId: 'shows',
    photo: CAMPAIGN_PHOTOS.heroDisco,
    alt: 'Show ao vivo com luzes de palco em Porto Alegre',
    tintClass: 'from-[#101012] via-[#5265FF]/22 to-transparent',
    icon: Mic2,
  },
  {
    id: 'bares',
    label: 'Bares',
    categoryId: 'bares',
    photo: CAMPAIGN_PHOTOS.warmBar,
    alt: 'Bar urbano com mesas na calçada à noite em Porto Alegre',
    tintClass: 'from-[#101012] via-[#FF5A36]/22 to-transparent',
    icon: Wine,
  },
];

export const HomePage: React.FC = () => {
  useDocumentHead({
    title: DEFAULT_SITE_TITLE,
    description: DEFAULT_SITE_DESCRIPTION,
  });

  const { events, venues, neighborhoods, hasRealEvents, isRefreshing, refreshCatalog } =
    useCatalog();
  const { profile, favorites } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();

  const handleManualRefresh = async () => {
    const res = await refreshCatalog();
    notify(
      res.usedFallback
        ? 'Catálogo sincronizado com os dados disponíveis.'
        : 'Catálogo de rolês atualizado.',
    );
  };

  const [heroQuery, setHeroQuery] = useState('');
  const [heroSearchFocused, setHeroSearchFocused] = useState(false);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(-1);
  const [heroQuickDate, setHeroQuickDate] = useState<QuickDateFilter>('all');
  const [heroOnlyFree, setHeroOnlyFree] = useState(false);

  const weekendDates = useMemo(() => getWeekendDatesISO(), []);
  const [weekendTab, setWeekendTab] = useState<'friday' | 'saturday' | 'sunday'>('friday');

  const heroSearchContainerRef = useRef<HTMLDivElement | null>(null);
  const highlightsTrackRef = useRef<HTMLDivElement | null>(null);
  const neighborhoodTrackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (
        heroSearchContainerRef.current &&
        !heroSearchContainerRef.current.contains(e.target as Node)
      ) {
        setHeroSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const heroSuggestions = useMemo(
    () => buildHeroSearchSuggestions(heroQuery, events, venues, neighborhoods, 6),
    [heroQuery, events, venues, neighborhoods],
  );

  const showSuggestions = heroSearchFocused && heroSuggestions.length > 0;

  const publicEvents = useMemo(
    () =>
      filterAndSortEvents(events, {
        quickDate: heroQuickDate,
        onlyFree: heroOnlyFree,
        includeCancelled: false,
      }),
    [events, heroQuickDate, heroOnlyFree],
  );

  const featuredEvents = useMemo(() => publicEvents.slice(0, 6), [publicEvents]);

  const recommendedEvents = useMemo(
    () =>
      getRecommendedEvents(events, {
        favoriteCategories: profile?.favoriteCategories || [],
        favoriteNeighborhoods: profile?.favoriteNeighborhoods || [],
        savedFavorites: favorites,
      }),
    [events, profile?.favoriteCategories, profile?.favoriteNeighborhoods, favorites],
  );

  const weekendEvents = useMemo(() => {
    const targetISO = weekendDates[weekendTab];
    return filterAndSortEvents(events, {
      exactDateISO: targetISO,
      includeCancelled: false,
    }).slice(0, 4);
  }, [events, weekendDates, weekendTab]);

  const freeEvents = useMemo(
    () =>
      filterAndSortEvents(events, {
        onlyFree: true,
        includeCancelled: false,
      }).slice(0, 3),
    [events],
  );

  const vibeCounts = useMemo(() => {
    const counts = new Map<EventCategoryId, number>();
    const activeEvents = filterAndSortEvents(events, { includeCancelled: false });
    for (const ev of activeEvents) {
      counts.set(ev.category, (counts.get(ev.category) ?? 0) + 1);
    }
    const publishedVenuesCount = venues.filter((v) => v.status === 'published').length;
    if ((counts.get('bares') ?? 0) === 0 && publishedVenuesCount > 0) {
      counts.set('bares', publishedVenuesCount);
    }
    return counts;
  }, [events, venues]);

  const neighborhoodCounts = useMemo(() => {
    const map = new Map<string, { events: number; venues: number }>();
    neighborhoods.forEach((n) => map.set(n.name, { events: 0, venues: 0 }));
    events
      .filter((e) => e.status === 'published')
      .forEach((e) => {
        const curr = map.get(e.neighborhood);
        if (curr) curr.events += 1;
      });
    venues
      .filter((v) => v.status === 'published')
      .forEach((v) => {
        const curr = map.get(v.neighborhood);
        if (curr) curr.venues += 1;
      });
    return map;
  }, [neighborhoods, events, venues]);

  const mapMarkers: MapMarkerItem[] = useMemo(() => {
    const evMarkers: MapMarkerItem[] = events
      .filter(
        (e) => e.status === 'published' && typeof e.lat === 'number' && typeof e.lng === 'number',
      )
      .slice(0, 8)
      .map((e) => ({
        id: e.id,
        type: 'event',
        title: e.title,
        subtitle: `${formatEventDatePtBr(e.dateISO)} · ${e.startTime} · ${e.venueName}`,
        neighborhood: e.neighborhood,
        slug: e.slug,
        lat: e.lat!,
        lng: e.lng!,
        isDemoExample: e.isDemoExample,
      }));
    const vMarkers: MapMarkerItem[] = venues
      .filter(
        (v) => v.status === 'published' && typeof v.lat === 'number' && typeof v.lng === 'number',
      )
      .slice(0, 6)
      .map((v) => ({
        id: v.id,
        type: 'venue',
        title: v.name,
        subtitle: `${v.category} · ${v.address}`,
        neighborhood: v.neighborhood,
        slug: v.slug,
        lat: v.lat!,
        lng: v.lng!,
        isDemoExample: v.isDemoExample,
      }));
    return [...evMarkers, ...vMarkers];
  }, [events, venues]);

  const handleHeroSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (showSuggestions && activeSuggestionIdx >= 0 && heroSuggestions[activeSuggestionIdx]) {
      setHeroSearchFocused(false);
      navigate(heroSuggestions[activeSuggestionIdx].to);
      return;
    }
    setHeroSearchFocused(false);
    const params = new URLSearchParams();
    if (heroQuery.trim()) params.set('q', heroQuery.trim());
    if (heroQuickDate !== 'all') params.set('data', heroQuickDate);
    if (heroOnlyFree) params.set('gratis', '1');
    const qs = params.toString();
    navigate(qs ? `/eventos?${qs}` : '/eventos');
  };

  const handleHeroInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIdx((prev) => (prev + 1) % heroSuggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIdx((prev) => (prev <= 0 ? heroSuggestions.length - 1 : prev - 1));
    } else if (e.key === 'Escape') {
      setHeroSearchFocused(false);
      setActiveSuggestionIdx(-1);
    }
  };

  const handleQuickFilterClick = (filter: QuickDateFilter, freeOnly = false) => {
    if (freeOnly) {
      setHeroOnlyFree((prev) => !prev);
      return;
    }
    setHeroQuickDate((prev) => (prev === filter ? 'all' : filter));
  };

  const scrollTrack = (
    ref: React.RefObject<HTMLDivElement | null>,
    direction: 'prev' | 'next',
  ) => {
    const el = ref.current;
    if (!el) return;
    const step = Math.max(260, Math.round(el.clientWidth * 0.72));
    el.scrollBy({
      left: direction === 'next' ? step : -step,
      behavior: 'smooth',
    });
  };

  const getNeighborhoodPhoto = (id: string) => {
    if (id === 'cidade-baixa') return CAMPAIGN_PHOTOS.warmBar;
    if (id === 'quarto-distrito') return CAMPAIGN_PHOTOS.cobaltDj;
    if (id === 'moinhos-de-vento') return CAMPAIGN_PHOTOS.galpao;
    if (id === 'bom-fim') return CAMPAIGN_PHOTOS.ruaEntrada;
    if (id === 'centro-historico') return CAMPAIGN_PHOTOS.orla;
    return CAMPAIGN_PHOTOS.amberCrowd;
  };

  return (
    <PullToRefresh
      onRefresh={refreshCatalog}
      isRefreshing={isRefreshing}
      className="bg-[#101012] text-[#F7F7F5]"
    >
      {/* HERO: Nightlife Photography + Expressive Display Type + Live Search & Quick Filters */}
      <section className="relative z-30 bg-[#101012] film-grain">
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
          <img
            src={CAMPAIGN_PHOTOS.heroParty}
            srcSet={getNightlifeSrcSet(CAMPAIGN_PHOTOS.heroParty)}
            sizes="100vw"
            alt=""
            loading="eager"
            fetchPriority="high"
            decoding="sync"
            className="w-full h-full object-cover object-right sm:object-[72%_center] opacity-80 sm:opacity-95"
          />
          {/* Measured gradient scrim guaranteeing razor-sharp legibility on the left while preserving vivid right-side stage energy */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#101012]/80 via-[#101012]/68 to-[#101012] lg:bg-gradient-to-r lg:from-[#101012] lg:via-[#101012]/82 lg:to-[#101012]/18" />
        </div>

        <div className="relative z-10 max-w-[1320px] mx-auto px-5 sm:px-6 lg:px-8 pt-10 pb-14 sm:pt-12 sm:pb-16 lg:pt-16 lg:pb-22">
          <div className="max-w-2xl space-y-5">
            <h1 className="motion-safe:animate-hero-reveal font-display font-extrabold italic uppercase text-[#F7F7F5] tracking-[-0.02em] leading-[0.9] text-[clamp(2.85rem,6.4vw,4.85rem)] text-balance max-w-xl">
              <span className="block">TEU PRÓXIMO</span>
              <span className="relative inline-block">
                ROLÊ TÁ AQUI.
                <BrushUnderline className="mt-1 text-[#FF5A36]" />
              </span>
            </h1>

            <p
              className="motion-safe:animate-hero-reveal text-sm sm:text-base text-[#E8E8E6]/92 max-w-md leading-relaxed"
              style={{ animationDelay: '70ms' }}
            >
              Descobre festas, shows, bares e experiências em Porto Alegre — tudo reunido por
              bairro, estilo e dia.
            </p>

            {/* High-Contrast Search Bar with Live Instant Suggestions + Electric Orange Submit */}
            <form
              onSubmit={handleHeroSubmit}
              className="motion-safe:animate-hero-reveal space-y-4 pt-1"
              style={{ animationDelay: '130ms' }}
            >
              <div ref={heroSearchContainerRef} className="relative max-w-[580px] z-30">
                <div className="flex items-center bg-[#F7F7F5] text-[#101012] rounded-xl p-1.5 pl-4 shadow-2xl ring-1 ring-white/25 focus-within:ring-2 focus-within:ring-[#FF5A36] transition-shadow">
                  <Search className="w-4 h-4 text-[#52525B] shrink-0" />
                  <input
                    type="search"
                    value={heroQuery}
                    onFocus={() => setHeroSearchFocused(true)}
                    onChange={(e) => {
                      setHeroQuery(e.target.value);
                      setActiveSuggestionIdx(-1);
                      setHeroSearchFocused(true);
                    }}
                    onKeyDown={handleHeroInputKeyDown}
                    placeholder="Buscar eventos, bares, artistas ou bairros..."
                    aria-label="Buscar eventos, bares, artistas ou bairros em Porto Alegre"
                    aria-autocomplete="list"
                    aria-expanded={showSuggestions}
                    aria-controls="hero-search-suggestions"
                    enterKeyHint="search"
                    className="flex-1 h-11 sm:h-10 bg-transparent px-3 text-base sm:text-sm text-[#101012] placeholder:text-[#6B6B73] focus:outline-none focus-visible:outline-none min-w-0"
                  />
                  <button
                    type="submit"
                    aria-label="Buscar rolê"
                    className="w-10 h-10 rounded-lg bg-[#FF5A36] hover:bg-[#FF6F4F] active:scale-95 text-[#101012] inline-flex items-center justify-center shrink-0 transition-all"
                  >
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>

                {/* Live Search Suggestions Dropdown */}
                {showSuggestions && (
                  <div
                    id="hero-search-suggestions"
                    role="listbox"
                    className="motion-safe:animate-menu-in absolute left-0 right-0 top-full mt-2 bg-[#1C1C20] border border-[#28282E] rounded-2xl shadow-2xl overflow-hidden z-50"
                  >
                    <ul className="divide-y divide-[#28282E]">
                      {heroSuggestions.map((item, idx) => {
                        const isActive = idx === activeSuggestionIdx;
                        return (
                          <li key={item.id} role="option" aria-selected={isActive}>
                            <Link
                              to={item.to}
                              onClick={() => setHeroSearchFocused(false)}
                              className={`flex items-center justify-between gap-3 px-4 py-3 transition-colors ${
                                isActive ? 'bg-[#25252B]' : 'hover:bg-[#25252B]'
                              }`}
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-[#F7F7F5] truncate">
                                  {item.label}
                                </p>
                                <p className="text-xs text-[#98989F] truncate">{item.sublabel}</p>
                              </div>
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#101012] border border-[#28282E] text-[#98989F] shrink-0">
                                {item.type === 'event'
                                  ? 'Evento'
                                  : item.type === 'venue'
                                    ? 'Bar'
                                    : 'Bairro'}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>

              {/* Quick Discovery Filters */}
              <div
                className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-5 px-5 scroll-px-5 sm:mx-0 sm:px-0 sm:scroll-px-0"
                role="group"
                aria-label="Filtros rápidos de descoberta"
              >
                {(
                  [
                    { id: 'today', label: 'Hoje', showIcon: true },
                    { id: 'tomorrow', label: 'Amanhã' },
                    { id: 'friday', label: 'Sexta' },
                    { id: 'saturday', label: 'Sábado' },
                    { id: 'sunday', label: 'Domingo' },
                  ] as const
                ).map((item) => {
                  const active = heroQuickDate === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleQuickFilterClick(item.id)}
                      aria-pressed={active}
                      className={`px-3.5 py-2 min-h-[38px] rounded-full text-xs font-semibold border transition-all active:scale-[0.97] whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 ${
                        active
                          ? 'bg-[#FF5A36] border-[#FF5A36] text-[#101012]'
                          : 'bg-[#101012]/75 backdrop-blur-xs border-[#F7F7F5]/25 text-[#F7F7F5] hover:border-[#FF5A36]'
                      }`}
                    >
                      {'showIcon' in item && item.showIcon && <Calendar className="w-3.5 h-3.5" />}
                      <span>{item.label}</span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => handleQuickFilterClick('all', true)}
                  aria-pressed={heroOnlyFree}
                  className={`px-3.5 py-2 min-h-[38px] rounded-full text-xs font-semibold border transition-all active:scale-[0.97] whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 ${
                    heroOnlyFree
                      ? 'bg-[#F7F7F5] border-[#F7F7F5] text-[#101012]'
                      : 'bg-[#101012]/75 backdrop-blur-xs border-[#F7F7F5]/25 text-[#F7F7F5] hover:border-[#F7F7F5]'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Grátis</span>
                </button>

                <Link
                  to="/mapa?perto=1"
                  className="px-3.5 py-2 min-h-[38px] rounded-full text-xs font-semibold border bg-[#101012]/75 backdrop-blur-xs border-[#F7F7F5]/25 text-[#F7F7F5] hover:border-[#5265FF] transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#5265FF]" />
                  <span>Perto de mim</span>
                </Link>
              </div>
            </form>
          </div>

          <PoaCrownMark className="hidden lg:flex absolute right-8 bottom-12" />
        </div>
      </section>

      {/* BAND 1 (LIGHT SHEET): EM ALTA NA CIDADE — Immediate vibrant event discovery */}
      <section className="relative z-20 -mt-6 bg-[#F7F7F5] text-[#101012] rounded-t-[28px] sm:rounded-t-[36px] py-10 sm:py-12">
        <div className="max-w-[1320px] mx-auto px-5 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-stretch">
            {/* Left Editorial Header & Carousel Controls */}
            <div className="lg:w-[232px] shrink-0 flex flex-row lg:flex-col justify-between items-end lg:items-start gap-4">
              <div>
                <SectionKicker label="Destaques da semana" tone="on-light" />
                <h2 className="font-display text-4xl sm:text-[42px] font-extrabold italic uppercase leading-[0.92] tracking-tight text-[#101012]">
                  EM ALTA
                  <br className="hidden lg:inline" /> NA CIDADE
                </h2>
                {!hasRealEvents && (
                  <p className="text-[11px] text-[#52525B] mt-3 leading-relaxed hidden lg:block">
                    Exemplos ilustrativos enquanto produtores publicam novos rolês.{' '}
                    <Link to="/organizador" className="font-semibold text-[#101012] underline">
                      Divulgar evento
                    </Link>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => void handleManualRefresh()}
                  disabled={isRefreshing}
                  aria-label="Atualizar catálogo de eventos"
                  title="Atualizar catálogo"
                  className="w-10 h-10 rounded-full bg-white border border-[#E2E2DE] hover:border-[#101012] active:scale-95 disabled:opacity-60 text-[#101012] flex items-center justify-center transition-all"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${isRefreshing ? 'motion-safe:animate-spin text-[#FF5A36]' : ''}`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => scrollTrack(highlightsTrackRef, 'prev')}
                  aria-label="Ver destaques anteriores"
                  className="w-10 h-10 rounded-full bg-white border border-[#E2E2DE] hover:border-[#101012] active:scale-95 text-[#101012] flex items-center justify-center transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollTrack(highlightsTrackRef, 'next')}
                  aria-label="Ver próximos destaques"
                  className="w-10 h-10 rounded-full bg-[#101012] hover:bg-[#FF5A36] active:scale-95 text-[#F7F7F5] hover:text-[#101012] flex items-center justify-center transition-all"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
                <Link
                  to="/eventos"
                  className="hidden sm:inline-flex lg:hidden items-center gap-1 text-xs font-bold uppercase tracking-wider text-[#101012] hover:text-[#FF5A36] ml-2 whitespace-nowrap"
                >
                  Ver todos <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Right Vibrant Event Carousel */}
            <div className="flex-1 min-w-0">
              {(heroQuickDate !== 'all' || heroOnlyFree) && (
                <div className="flex items-center justify-between gap-3 mb-3 text-xs text-[#52525B]">
                  <span>
                    Mostrando <strong className="text-[#101012]">{featuredEvents.length}</strong>{' '}
                    rolê(s) com o filtro selecionado
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setHeroQuickDate('all');
                      setHeroOnlyFree(false);
                    }}
                    className="font-bold text-[#FF5A36] hover:underline"
                  >
                    Limpar filtros
                  </button>
                </div>
              )}

              {featuredEvents.length === 0 ? (
                <div className="bg-white border border-[#E2E2DE] rounded-2xl p-8 text-center space-y-3">
                  <p className="font-display text-2xl font-bold uppercase text-[#101012]">
                    Nenhum rolê encontrado com este filtro agora.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setHeroQuickDate('all');
                      setHeroOnlyFree(false);
                    }}
                    className="px-5 py-2.5 rounded-full bg-[#101012] hover:bg-[#FF5A36] text-[#F7F7F5] hover:text-[#101012] text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    Mostrar todos os rolês
                  </button>
                </div>
              ) : (
                <div
                  ref={highlightsTrackRef}
                  tabIndex={0}
                  aria-label="Carrossel de eventos em alta na cidade"
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowRight') scrollTrack(highlightsTrackRef, 'next');
                    if (e.key === 'ArrowLeft') scrollTrack(highlightsTrackRef, 'prev');
                  }}
                  className="flex items-stretch gap-4 overflow-x-auto snap-x snap-mandatory scroll-px-5 sm:scroll-px-6 lg:scroll-px-0 no-scrollbar -mx-5 px-5 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 pb-2 focus:outline-none"
                >
                  {featuredEvents.map((ev, index) => (
                    <EventCardReveal
                      key={`${heroQuickDate}-${heroOnlyFree}-${ev.id}`}
                      index={index}
                      immediate
                      className="w-[76vw] max-w-[300px] sm:w-[44vw] sm:max-w-none lg:w-[252px] xl:w-[262px] shrink-0 snap-start"
                    >
                      <EventCard event={ev} layout="poster" surface="light" />
                    </EventCardReveal>
                  ))}
                  <div aria-hidden="true" className="w-1 shrink-0 lg:hidden" />
                </div>
              )}

              <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between lg:justify-end gap-2.5 sm:gap-4">
                {!hasRealEvents && (
                  <p className="text-[11px] text-[#52525B] lg:hidden">
                    Exemplos ilustrativos ·{' '}
                    <Link to="/organizador" className="font-semibold text-[#101012] underline">
                      Divulgar evento
                    </Link>
                  </p>
                )}
                <Link
                  to="/eventos"
                  className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-[#101012] hover:text-[#FF5A36] transition-colors whitespace-nowrap"
                >
                  <span>Explorar agenda completa</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BAND 2 (DARK): BORA JUNTO? SPLIT + DESCOBRE POR VIBE */}
      <section className="bg-[#101012] text-[#F7F7F5] py-10 sm:py-14">
        <div className="max-w-[1320px] mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
            {/* Left: Bora Junto? Editorial Photo Card */}
            <div className="lg:col-span-5 relative rounded-2xl overflow-hidden border border-[#28282E] bg-[#1C1C20] min-h-[256px] flex flex-col justify-between p-6 sm:p-7 group">
              <img
                src={CAMPAIGN_PHOTOS.crowdFlash}
                srcSet={getNightlifeSrcSet(CAMPAIGN_PHOTOS.crowdFlash)}
                sizes="(max-width: 1024px) 100vw, 40vw"
                alt="Galera curtindo pista de festa em Porto Alegre"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover bw-editorial-photo opacity-65 group-hover:scale-[1.03] transition-transform duration-500"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-r from-[#101012]/96 via-[#101012]/76 to-[#101012]/28"
              />

              <div className="relative z-10 flex items-start justify-between gap-4">
                <h2 className="font-display text-4xl sm:text-5xl font-extrabold italic uppercase leading-[0.88] tracking-tight text-[#F7F7F5]">
                  BORA
                  <br />
                  JUNTO?
                </h2>
                <ScribbleAccent className="text-[#FF5A36] shrink-0" />
              </div>

              <div className="relative z-10 mt-6 space-y-4 max-w-xs">
                <p className="text-xs sm:text-sm text-[#E8E8E6]/92 leading-relaxed">
                  Escolhe os rolês, manda no WhatsApp e decide com a galera pra onde ir — com
                  votação aberta e resultado ao vivo.
                </p>
                <Link
                  to="/bora-junto"
                  className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[40px] rounded-full bg-[#F7F7F5] hover:bg-[#FF5A36] active:scale-[0.98] text-[#101012] text-xs font-bold tracking-wide transition-all"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Criar votação do rolê</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Right: Descobre por Vibe (Colorful Portrait Tiles with real counts) */}
            <div className="lg:col-span-7 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-4 mb-4">
                <SectionKicker label="Descobre por vibe" tone="on-dark" />
                <Link
                  to="/eventos"
                  className="text-xs font-semibold text-[#98989F] hover:text-[#F7F7F5] transition-colors"
                >
                  Ver todas →
                </Link>
              </div>

              <div className="flex gap-3.5 overflow-x-auto snap-x snap-mandatory scroll-px-5 sm:scroll-px-6 lg:scroll-px-0 no-scrollbar -mx-5 px-5 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 pb-2">
                {VIBE_TILES.map((vibe) => {
                  const Icon = vibe.icon;
                  const count = vibeCounts.get(vibe.categoryId) ?? 0;
                  const targetHref =
                    vibe.categoryId === 'bares'
                      ? '/bares'
                      : `/eventos?categoria=${vibe.categoryId}`;
                  const countText =
                    count > 0
                      ? vibe.categoryId === 'bares'
                        ? `${count} ${count === 1 ? 'bar' : 'bares'}`
                        : `${count} ${count === 1 ? 'rolê' : 'rolês'}`
                      : 'Explorar';

                  return (
                    <Link
                      key={vibe.id}
                      to={targetHref}
                      className="card-lift group relative w-[132px] sm:w-[140px] h-[186px] shrink-0 snap-start rounded-2xl overflow-hidden border border-[#28282E] hover:border-[#FF5A36] bg-[#1C1C20]"
                    >
                      <img
                        src={vibe.photo}
                        srcSet={getNightlifeSrcSet(vibe.photo)}
                        sizes="144px"
                        alt={vibe.alt}
                        decoding="async"
                        className={`w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-300 ${
                          vibe.isBw ? 'bw-editorial-photo' : 'nightlife-color-photo'
                        }`}
                      />
                      <div
                        aria-hidden="true"
                        className={`absolute inset-0 bg-gradient-to-t ${vibe.tintClass}`}
                      />
                      <div className="absolute inset-x-0 bottom-0 p-3.5 flex flex-col gap-0.5 text-[#F7F7F5]">
                        <Icon className="w-4 h-4 mb-0.5 text-[#F7F7F5]/90 group-hover:text-[#FF5A36] transition-colors" />
                        <span className="font-label text-sm font-bold tracking-tight leading-tight">
                          {vibe.label}
                        </span>
                        <span className="text-[11px] text-[#E8E8E6]/75 tabular-nums">
                          {countText}
                        </span>
                      </div>
                    </Link>
                  );
                })}

                <Link
                  to="/eventos"
                  className="w-[112px] h-[186px] shrink-0 snap-start rounded-2xl border border-[#28282E] hover:border-[#F7F7F5] bg-[#1C1C20] flex flex-col items-center justify-center gap-2 text-xs font-semibold text-[#98989F] hover:text-[#F7F7F5] transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Ver todas</span>
                </Link>
                <div aria-hidden="true" className="w-1 shrink-0 lg:hidden" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE SMART DISCOVERY: QUAL É A TUA VIBE HOJE? */}
      <VibeDiscoverySection events={events} venues={venues} neighborhoods={neighborhoods} />

      {/* CONDITIONAL PERSONALIZED BAND (Only rendered when real user preferences or favorites exist) */}
      {recommendedEvents.length > 0 && (
        <section className="bg-[#101012] border-t border-[#28282E] py-10 sm:py-12">
          <div className="max-w-[1320px] mx-auto px-5 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <SectionKicker
                  label="Baseado nos teus gostos e salvos"
                  tone="on-dark"
                  accentClass="bg-[#5265FF]"
                />
                <h2 className="font-display text-3xl sm:text-4xl font-extrabold italic uppercase tracking-tight text-[#F7F7F5]">
                  Selecionado pra tua vibe
                </h2>
              </div>
              <Link
                to="/perfil"
                className="text-xs font-bold uppercase tracking-wider text-[#98989F] hover:text-[#F7F7F5] transition-colors"
              >
                Ajustar preferências →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {recommendedEvents.map(({ event, reasons }, index) => (
                <EventCardReveal key={event.id} index={index}>
                  <EventCard event={event} layout="poster" reasonLabel={reasons[0]} />
                </EventCardReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* BAND 3 (LIGHT SHEET): EXPLORE A CIDADE — ROLÊS POR BAIRRO */}
      <section className="bg-[#F7F7F5] text-[#101012] rounded-3xl sm:rounded-[36px] py-10 sm:py-12 mx-0">
        <div className="max-w-[1320px] mx-auto px-5 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start lg:items-center">
            {/* Left Heading & Controls */}
            <div className="lg:w-[232px] shrink-0 w-full flex flex-row lg:flex-col justify-between items-end lg:items-start gap-4">
              <div>
                <SectionKicker label="Explore a cidade" tone="on-light" />
                <h2 className="font-display text-4xl sm:text-[42px] font-extrabold italic uppercase leading-[0.92] tracking-tight text-[#101012]">
                  ROLÊS POR
                  <br className="hidden lg:inline" /> BAIRRO
                </h2>
                <p className="text-xs text-[#52525B] mt-2.5 leading-relaxed max-w-[240px]">
                  Cada região de Porto Alegre tem seu próprio ritmo na noite.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => scrollTrack(neighborhoodTrackRef, 'prev')}
                  aria-label="Ver bairros anteriores"
                  className="w-9 h-9 rounded-full bg-white border border-[#E2E2DE] hover:border-[#101012] active:scale-95 text-[#101012] flex items-center justify-center transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollTrack(neighborhoodTrackRef, 'next')}
                  aria-label="Ver próximos bairros"
                  className="w-9 h-9 rounded-full bg-[#101012] hover:bg-[#FF5A36] active:scale-95 text-[#F7F7F5] hover:text-[#101012] flex items-center justify-center transition-all"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right Horizontal Neighborhood Photo Strip */}
            <div className="flex-1 min-w-0 w-full">
              <div
                ref={neighborhoodTrackRef}
                tabIndex={0}
                aria-label="Carrossel de bairros de Porto Alegre"
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight') scrollTrack(neighborhoodTrackRef, 'next');
                  if (e.key === 'ArrowLeft') scrollTrack(neighborhoodTrackRef, 'prev');
                }}
                className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-px-5 sm:scroll-px-6 lg:scroll-px-0 no-scrollbar -mx-5 px-5 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 pb-2 focus:outline-none"
              >
                {neighborhoods.map((nei) => {
                  const counts = neighborhoodCounts.get(nei.name) || { events: 0, venues: 0 };
                  const summaryLabel =
                    counts.events > 0 || counts.venues > 0
                      ? [
                          counts.events > 0
                            ? `${counts.events} ${counts.events === 1 ? 'rolê' : 'rolês'}`
                            : null,
                          counts.venues > 0
                            ? `${counts.venues} ${counts.venues === 1 ? 'bar' : 'bares'}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')
                      : 'Explorar região';

                  return (
                    <Link
                      key={nei.id}
                      to={`/eventos?bairro=${encodeURIComponent(nei.name)}`}
                      className="card-lift group relative w-[216px] sm:w-[228px] h-[156px] shrink-0 snap-start rounded-2xl overflow-hidden bg-[#101012] ring-1 ring-[#101012]/12"
                    >
                      <img
                        src={getNeighborhoodPhoto(nei.id)}
                        srcSet={getNightlifeSrcSet(getNeighborhoodPhoto(nei.id))}
                        sizes="230px"
                        alt={`Cena noturna no bairro ${nei.name}`}
                        decoding="async"
                        className="w-full h-full object-cover nightlife-color-photo group-hover:scale-[1.05] transition-transform duration-300"
                      />
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-gradient-to-t from-[#101012]/94 via-[#101012]/42 to-black/10"
                      />
                      <div className="absolute inset-x-0 bottom-0 p-4 text-[#F7F7F5]">
                        <p className="font-label text-base font-bold leading-tight group-hover:text-[#FF5A36] transition-colors">
                          {nei.name}
                        </p>
                        <p className="text-[11px] text-[#E8E8E6]/82 mt-1 tabular-nums">
                          {summaryLabel}
                        </p>
                      </div>
                    </Link>
                  );
                })}

                <Link
                  to="/mapa"
                  className="w-[148px] h-[156px] shrink-0 snap-start rounded-2xl bg-[#101012] hover:bg-[#1C1C20] text-[#F7F7F5] flex flex-col items-center justify-center gap-2 text-center px-4 text-xs font-bold transition-colors"
                >
                  <MapPin className="w-4 h-4 text-[#5265FF]" />
                  <span>Ver todos no mapa</span>
                </Link>
                <div aria-hidden="true" className="w-1 shrink-0 lg:hidden" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BAND 4 (DARK): AGENDA DO FIM DE SEMANA + ROLÊS GRATUITOS (COHESIVE BRAND PALETTE) */}
      <section className="max-w-[1320px] mx-auto px-5 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Weekend Schedule */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#28282E]">
              <div>
                <SectionKicker label="Programação por dia" tone="on-dark" />
                <h2 className="font-display text-3xl sm:text-4xl font-extrabold italic uppercase tracking-tight text-[#F7F7F5]">
                  Agenda do fim de semana
                </h2>
              </div>

              <div
                className="flex flex-wrap gap-2"
                role="tablist"
                aria-label="Dias do fim de semana"
              >
                {(
                  [
                    { id: 'friday', label: 'Sexta', date: weekendDates.friday },
                    { id: 'saturday', label: 'Sábado', date: weekendDates.saturday },
                    { id: 'sunday', label: 'Domingo', date: weekendDates.sunday },
                  ] as const
                ).map((day) => {
                  const active = weekendTab === day.id;
                  return (
                    <button
                      key={day.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setWeekendTab(day.id)}
                      className={`px-3.5 py-2 min-h-[38px] rounded-full border text-xs font-semibold transition-all active:scale-[0.97] whitespace-nowrap ${
                        active
                          ? 'bg-[#FF5A36] border-[#FF5A36] text-[#101012]'
                          : 'bg-[#1C1C20] border-[#28282E] text-[#F7F7F5] hover:border-[#F7F7F5]/60'
                      }`}
                    >
                      <span className="uppercase tracking-wider mr-1.5 font-bold">{day.label}</span>
                      <span className={active ? 'text-[#101012]/80' : 'text-[#98989F]'}>
                        {formatEventDatePtBr(day.date)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {weekendEvents.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#1C1C20] border border-[#28282E] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="font-display text-xl font-bold uppercase text-[#F7F7F5]">
                    Sem eventos confirmados para este dia por enquanto.
                  </p>
                  <p className="text-xs text-[#98989F] mt-1">
                    Organiza uma festa ou show em Porto Alegre? Envie para a curadoria.
                  </p>
                </div>
                <Link
                  to="/organizador"
                  className="px-4 py-2.5 rounded-full bg-[#FF5A36] hover:bg-[#FF6F4F] text-[#101012] text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors"
                >
                  Divulgar evento
                </Link>
              </div>
            ) : (
              <div className="space-y-3.5">
                {weekendEvents.map((ev, index) => (
                  <EventCardReveal key={`${weekendTab}-${ev.id}`} index={index}>
                    <EventCard event={ev} layout="list" surface="dark" />
                  </EventCardReveal>
                ))}
              </div>
            )}
          </div>

          {/* Right: Free Events Highlight Box — Unified Off-White & Electric Orange Cohesion */}
          <aside className="lg:col-span-4 bg-[#1C1C20] text-[#F7F7F5] rounded-2xl overflow-hidden border border-[#28282E]">
            <div className="relative h-44 overflow-hidden">
              <img
                src={CAMPAIGN_PHOTOS.orla}
                srcSet={getNightlifeSrcSet(CAMPAIGN_PHOTOS.orla)}
                sizes="(max-width: 1024px) 100vw, 32vw"
                alt="Encontro gratuito ao entardecer na Orla do Guaíba"
                decoding="async"
                className="w-full h-full object-cover nightlife-color-photo"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-[#1C1C20] via-[#1C1C20]/25 to-black/15"
              />
              <span className="absolute top-3.5 left-3.5 bg-[#F7F7F5] text-[#101012] text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-md">
                Entrada 0800
              </span>
            </div>

            <div className="p-5 sm:p-6 space-y-5">
              <div>
                <h3 className="font-display text-3xl font-extrabold italic uppercase tracking-tight text-[#F7F7F5]">
                  Rolês gratuitos
                </h3>
                <p className="text-xs text-[#98989F] mt-1 leading-relaxed">
                  Praças, orla, feiras e ocupações culturais sem pagar entrada em Porto Alegre.
                </p>
              </div>

              {freeEvents.length === 0 ? (
                <p className="text-xs text-[#98989F]">
                  Confira os encontros gratuitos abertos em praças, orla e centros culturais.
                </p>
              ) : (
                <ul className="divide-y divide-[#28282E]">
                  {freeEvents.map((ev) => (
                    <li key={ev.id} className="py-3 first:pt-0 last:pb-0">
                      <Link
                        to={`/eventos/${ev.slug}`}
                        className="group flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="font-display text-lg font-bold uppercase tracking-tight text-[#F7F7F5] group-hover:text-[#FF5A36] transition-colors truncate">
                            {ev.title}
                          </p>
                          <p className="text-xs text-[#98989F] mt-0.5 flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-[#FF5A36] shrink-0" />
                            <span className="truncate">
                              {formatEventDatePtBr(ev.dateISO)} · {ev.neighborhood}
                            </span>
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#98989F] group-hover:text-[#FF5A36] group-hover:translate-x-0.5 shrink-0 transition-all" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              <Link
                to="/eventos?gratis=1"
                className="inline-flex items-center justify-center gap-2 w-full py-3 min-h-[44px] rounded-xl bg-[#F7F7F5] hover:bg-[#FF5A36] active:scale-[0.98] text-[#101012] text-xs font-extrabold uppercase tracking-wider transition-all"
              >
                <span>Ver todos os gratuitos</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </aside>
        </div>
      </section>

      {/* BAND 5 (DARK ELEVATED): BARES EM DESTAQUE */}
      <section className="max-w-[1320px] mx-auto px-5 sm:px-6 lg:px-8 py-8 sm:py-12 border-t border-[#28282E]">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div className="flex-1">
            <SectionKicker label="Esquenta e balcão" tone="on-dark" />
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold italic uppercase tracking-tight text-[#F7F7F5]">
              Bares em destaque
            </h2>
            <p className="text-sm text-[#98989F] mt-1">
              Calçadas movimentadas, coquetelaria autoral e galpões para começar ou esticar a noite.
            </p>
          </div>
          <Link
            to="/bares"
            className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.1em] text-[#F7F7F5] hover:text-[#FF5A36] transition-colors whitespace-nowrap"
          >
            <span>Ver todos os bares</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
          {venues.slice(0, 4).map((venue) => (
            <VenueCard key={venue.id} venue={venue} />
          ))}
        </div>
      </section>

      {/* BAND 6 (DARK): MAPA INTERATIVO & DIVULGUE SEU EVENTO */}
      <section className="max-w-[1320px] mx-auto px-5 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-14 border-t border-[#28282E]">
        <div>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-7">
            <div>
              <SectionKicker
                label="Mapa ao vivo · Porto Alegre"
                tone="on-dark"
                accentClass="bg-[#5265FF]"
              />
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold italic uppercase tracking-tight text-[#F7F7F5]">
                Perto de ti no mapa
              </h2>
              <p className="text-sm text-[#98989F] mt-1">
                Laranja marca eventos · Azul marca bares. Clique em qualquer pino para ver detalhes
                e rota.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/mapa"
                className="px-5 py-2.5 rounded-full bg-[#F7F7F5] hover:bg-white text-[#101012] text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 transition-colors"
              >
                <Compass className="w-4 h-4" />
                <span>Abrir mapa completo</span>
              </Link>
              <Link
                to="/curadoria"
                className="px-5 py-2.5 rounded-full border border-[#28282E] hover:border-[#5265FF] text-[#F7F7F5] text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 transition-colors"
              >
                <Sparkles className="w-4 h-4 text-[#5265FF]" />
                <span>Curadoria inteligente</span>
              </Link>
            </div>
          </div>

          <PoaMapView markers={mapMarkers} heightClass="h-[380px]" zoom={13} />
        </div>

        {/* High-Contrast Organizer Banner */}
        <div className="bg-[#1C1C20] border border-[#28282E] rounded-2xl p-7 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-2.5">
            <SectionKicker label="Para produtores, casas noturnas e coletivos" tone="on-dark" />
            <h2 className="font-display text-3xl sm:text-5xl font-extrabold italic uppercase tracking-tight leading-[0.94] text-[#F7F7F5]">
              Teu evento merece pista cheia.
            </h2>
            <p className="text-sm text-[#98989F] max-w-2xl leading-relaxed">
              Divulgue sua festa, show ou noite temática em Porto Alegre com revisão editorial
              transparente e alcance quem está procurando o próximo rolê.
            </p>
          </div>
          <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3">
            <Link
              to="/organizador"
              className="px-6 py-3.5 rounded-full bg-[#FF5A36] hover:bg-[#FF6F4F] text-[#101012] font-bold uppercase tracking-wider text-xs text-center inline-flex items-center justify-center gap-2 transition-colors"
            >
              <span>Divulgar meu evento</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
            <Link
              to="/bora-junto"
              className="px-6 py-3.5 rounded-full border border-[#28282E] hover:border-[#F7F7F5] text-[#F7F7F5] font-bold uppercase tracking-wider text-xs text-center transition-colors"
            >
              Combinar com amigos (Bora Junto)
            </Link>
          </div>
        </div>
      </section>
    </PullToRefresh>
  );
};
