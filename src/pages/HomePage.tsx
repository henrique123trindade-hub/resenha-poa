import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Compass,
  Search,
  Sparkles,
} from 'lucide-react';
import { useCatalog } from '../contexts/CatalogContext';
import { CAMPAIGN_PHOTOS } from '../data/seedCatalog';
import { EventCard } from '../components/EventCard';
import { VenueCard } from '../components/VenueCard';
import { PoaMapView, type MapMarkerItem } from '../components/PoaMapView';
import { BrushUnderline, PaperTearDivider } from '../components/BrandMark';
import { filterAndSortEvents } from '../utils/eventFilters';
import { formatEventDatePtBr, getWeekendDatesISO } from '../utils/datePoa';
import { getNightlifeSrcSet } from '../utils/responsiveImage';
import type { EventCategoryId, QuickDateFilter } from '../types/resenha';

interface VibeTile {
  id: string;
  label: string;
  categoryId: EventCategoryId;
  photo: string;
  alt: string;
}

const VIBE_TILES: VibeTile[] = [
  {
    id: 'eletronica',
    label: 'Eletrônica',
    categoryId: 'eletronica',
    photo: CAMPAIGN_PHOTOS.djPista,
    alt: 'DJ tocando música eletrônica em pista escura em Porto Alegre',
  },
  {
    id: 'funk',
    label: 'Funk',
    categoryId: 'funk',
    photo: CAMPAIGN_PHOTOS.pistaGlobo,
    alt: 'Pista de dança com globo espelhado e público em festa de funk',
  },
  {
    id: 'hip-hop',
    label: 'Hip-hop',
    categoryId: 'hip-hop',
    photo: CAMPAIGN_PHOTOS.ruaEntrada,
    alt: 'Cena noturna urbana em rua movimentada de Porto Alegre',
  },
  {
    id: 'rock',
    label: 'Rock',
    categoryId: 'rock-indie',
    photo: CAMPAIGN_PHOTOS.crowdFlash,
    alt: 'Público com energia alta em show noturno',
  },
  {
    id: 'pagode',
    label: 'Pagode',
    categoryId: 'pagode-samba',
    photo: CAMPAIGN_PHOTOS.galpao,
    alt: 'Encontro noturno em galpão cultural e bar de Porto Alegre',
  },
  {
    id: 'sertanejo',
    label: 'Sertanejo',
    categoryId: 'sertanejo',
    photo: CAMPAIGN_PHOTOS.pista,
    alt: 'Casa noturna iluminada com público em pista de show',
  },
  {
    id: 'pop',
    label: 'Pop',
    categoryId: 'pop',
    photo: CAMPAIGN_PHOTOS.heroDisco,
    alt: 'Globo espelhado e luzes de pista em festa pop noturna',
  },
  {
    id: 'alternativo',
    label: 'Alternativo',
    categoryId: 'cultura',
    photo: CAMPAIGN_PHOTOS.orla,
    alt: 'Ocupação cultural aberta no entardecer da Orla do Guaíba',
  },
];

export const HomePage: React.FC = () => {
  const { events, venues, neighborhoods, hasRealEvents } = useCatalog();
  const navigate = useNavigate();

  const [heroQuery, setHeroQuery] = useState('');
  const [heroQuickDate, setHeroQuickDate] = useState<QuickDateFilter>('all');
  const [heroOnlyFree, setHeroOnlyFree] = useState(false);

  const weekendDates = useMemo(() => getWeekendDatesISO(), []);
  const [weekendTab, setWeekendTab] = useState<'friday' | 'saturday' | 'sunday'>('friday');
  const [activeNeighborhoodId, setActiveNeighborhoodId] = useState<string>(
    neighborhoods[0]?.id || 'cidade-baixa',
  );

  const publicEvents = useMemo(
    () =>
      filterAndSortEvents(events, {
        quickDate: heroQuickDate,
        onlyFree: heroOnlyFree,
        includeCancelled: false,
      }),
    [events, heroQuickDate, heroOnlyFree],
  );

  const featuredEvents = useMemo(() => publicEvents.slice(0, 4), [publicEvents]);

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

  const activeNeighborhood = useMemo(
    () => neighborhoods.find((n) => n.id === activeNeighborhoodId) || neighborhoods[0],
    [neighborhoods, activeNeighborhoodId],
  );

  const mapMarkers: MapMarkerItem[] = useMemo(() => {
    const evMarkers: MapMarkerItem[] = events
      .filter((e) => e.status === 'published' && typeof e.lat === 'number' && typeof e.lng === 'number')
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
      .filter((v) => v.status === 'published' && typeof v.lat === 'number' && typeof v.lng === 'number')
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
    const params = new URLSearchParams();
    if (heroQuery.trim()) params.set('q', heroQuery.trim());
    if (heroQuickDate !== 'all') params.set('data', heroQuickDate);
    if (heroOnlyFree) params.set('gratis', '1');
    const qs = params.toString();
    navigate(qs ? `/eventos?${qs}` : '/eventos');
  };

  const handleQuickFilterClick = (filter: QuickDateFilter, freeOnly = false) => {
    if (freeOnly) {
      setHeroOnlyFree((prev) => !prev);
      return;
    }
    setHeroQuickDate((prev) => (prev === filter ? 'all' : filter));
  };

  const getNeighborhoodPhoto = (id: string) => {
    if (id === 'orla-do-guaiba' || id === 'centro-historico') return CAMPAIGN_PHOTOS.orla;
    if (id === 'quarto-distrito') return CAMPAIGN_PHOTOS.djPista;
    if (id === 'cidade-baixa') return CAMPAIGN_PHOTOS.ruaEntrada;
    if (id === 'moinhos-de-vento') return CAMPAIGN_PHOTOS.pistaGlobo;
    return CAMPAIGN_PHOTOS.galpao;
  };

  return (
    <div className="bg-[#080808] text-[#F4F4F2]">
      {/* HERO: Full-Bleed B&W Club Photography + Left Condensed Impact Headline */}
      <section className="relative overflow-hidden bg-[#080808] film-grain border-b border-[#292929]">
        <img
          src={CAMPAIGN_PHOTOS.heroDisco}
          srcSet={getNightlifeSrcSet(CAMPAIGN_PHOTOS.heroDisco)}
          sizes="100vw"
          alt="Pista de festa lotada sob globo espelhado e raios de luz em Porto Alegre"
          loading="eager"
          fetchPriority="high"
          decoding="sync"
          className="absolute inset-0 w-full h-full object-cover object-center bw-editorial-photo opacity-75 sm:opacity-90"
        />
        {/* Controlled Scrim: Deep black behind left typography, preserving stage lights & disco ball on right */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-[#080808]/75 via-[#080808]/65 to-[#080808] lg:bg-gradient-to-r lg:from-[#080808] lg:via-[#080808]/75 lg:to-transparent"
        />

        <div className="relative z-10 max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 pt-7 pb-8 sm:pt-12 sm:pb-12 lg:pt-14 lg:pb-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#858585] mb-4 sm:mb-6">
            [ FESTAS · BALADAS · CULTURA · POA ]
          </p>

          <div className="flex flex-col md:flex-row md:items-start gap-6 md:gap-10">
            {/* Condensed High-Impact Title */}
            <div className="shrink-0">
              <h1 className="font-display font-extrabold italic uppercase text-[#F4F4F2] tracking-[-0.02em] leading-[0.88] text-[clamp(3.15rem,7vw,5.4rem)]">
                <span className="block">A NOITE</span>
                <span className="block">DE POA</span>
                <span className="relative inline-block">
                  TÁ ON
                  <BrushUnderline className="mt-1 text-[#F4F4F2]" />
                </span>
              </h1>
            </div>

            {/* Thin Vertical Hairline Separator (desktop) */}
            <div aria-hidden="true" className="hidden md:block w-px self-stretch bg-[#F4F4F2]/25" />

            {/* Right-of-Headline Subtitle, Search & Quick Filters */}
            <div className="flex-1 max-w-md space-y-4 sm:space-y-5 pt-1">
              <p className="text-xs sm:text-sm uppercase tracking-[0.06em] font-medium text-[#F4F4F2]/90 leading-relaxed">
                Descubra festas, baladas, bares e rolês em Porto Alegre.
              </p>

              <form onSubmit={handleHeroSubmit} className="space-y-3">
                <div className="flex items-center bg-[#080808]/85 border border-[#F4F4F2]/30 focus-within:border-[#F4F4F2] rounded-md px-3 transition-colors">
                  <Search className="w-4 h-4 text-[#858585] shrink-0" />
                  <input
                    type="search"
                    value={heroQuery}
                    onChange={(e) => setHeroQuery(e.target.value)}
                    placeholder="Buscar evento, bar ou bairro..."
                    aria-label="Buscar eventos e bares em Porto Alegre"
                    className="flex-1 h-10 bg-transparent px-2.5 text-sm text-[#F4F4F2] placeholder:text-[#858585] focus:outline-none min-w-0"
                  />
                  <button
                    type="submit"
                    aria-label="Buscar rolê"
                    className="w-8 h-8 rounded-[4px] text-[#F4F4F2] hover:bg-[#F4F4F2] hover:text-[#080808] inline-flex items-center justify-center shrink-0 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div
                  className="flex flex-wrap items-center gap-2"
                  role="group"
                  aria-label="Filtros rápidos por data"
                >
                  {(
                    [
                      { id: 'today', label: 'Hoje' },
                      { id: 'tomorrow', label: 'Amanhã' },
                      { id: 'weekend', label: 'Fim de semana' },
                    ] as const
                  ).map((item) => {
                    const active = heroQuickDate === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleQuickFilterClick(item.id)}
                        aria-pressed={active}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                          active
                            ? 'bg-[#F4F4F2] border-[#F4F4F2] text-[#080808]'
                            : 'bg-[#080808]/75 border-[#F4F4F2]/30 text-[#F4F4F2] hover:border-[#F4F4F2]'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => handleQuickFilterClick('all', true)}
                    aria-pressed={heroOnlyFree}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      heroOnlyFree
                        ? 'bg-[#F4F4F2] border-[#F4F4F2] text-[#080808]'
                        : 'bg-[#080808]/75 border-[#F4F4F2]/30 text-[#F4F4F2] hover:border-[#F4F4F2]'
                    }`}
                  >
                    Grátis
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="hidden sm:flex items-center justify-end mt-6 text-[10px] font-medium uppercase tracking-[0.16em] text-[#858585] tabular-nums">
            Porto Alegre — RS · 30.0346° S, 51.2177° W
          </div>
        </div>
      </section>

      {/* SECTION 1: EM ALTA NA CIDADE (Starts immediately below hero — 4-col desktop, snap scroll mobile) */}
      <section className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 sm:pt-10 sm:pb-14">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold italic uppercase tracking-tight text-[#F4F4F2] shrink-0">
              Em alta na cidade
            </h2>
            <div aria-hidden="true" className="hidden sm:block h-px flex-1 bg-[#292929]" />
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {(heroQuickDate !== 'all' || heroOnlyFree) && (
              <button
                type="button"
                onClick={() => {
                  setHeroQuickDate('all');
                  setHeroOnlyFree(false);
                }}
                className="text-xs font-semibold text-[#858585] hover:text-[#F4F4F2] underline"
              >
                Limpar filtros
              </button>
            )}
            <Link
              to="/eventos"
              className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.1em] text-[#F4F4F2] hover:underline whitespace-nowrap"
            >
              <span>Ver todos</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {!hasRealEvents && (
          <p className="text-xs text-[#858585] mb-5">
            Registros sinalizados como Exemplo ilustram a programação enquanto organizadores publicam
            novos eventos reais.{' '}
            <Link to="/organizador" className="text-[#F4F4F2] font-semibold underline">
              Divulgar um evento
            </Link>
          </p>
        )}

        {featuredEvents.length === 0 ? (
          <div className="bg-[#141414] border border-[#292929] rounded-md p-8 text-center space-y-3">
            <p className="font-display text-2xl font-bold uppercase text-[#F4F4F2]">
              Nenhum rolê encontrado com este filtro agora.
            </p>
            <button
              type="button"
              onClick={() => {
                setHeroQuickDate('all');
                setHeroOnlyFree(false);
              }}
              className="px-5 py-2.5 rounded-md bg-[#F4F4F2] text-[#080808] text-xs font-bold uppercase tracking-wider"
            >
              Mostrar todos os rolês
            </button>
          </div>
        ) : (
          <div className="flex lg:grid lg:grid-cols-4 gap-4 overflow-x-auto lg:overflow-visible snap-x snap-mandatory no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0">
            {featuredEvents.map((ev) => (
              <div
                key={ev.id}
                className="w-[78vw] sm:w-[46vw] lg:w-auto shrink-0 snap-start"
              >
                <EventCard event={ev} layout="poster" />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 2: EXPLORE POR VIBE (8 Thematic Nightlife Photography Tiles) */}
      <section className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 pb-14 sm:pb-16">
        <div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-8">
          <div className="lg:w-56 shrink-0 flex lg:flex-col justify-between items-baseline lg:items-start gap-3">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold italic uppercase leading-[0.95] tracking-tight text-[#F4F4F2]">
                Explore por vibe
              </h2>
              <p className="text-xs text-[#858585] mt-2 leading-relaxed hidden lg:block">
                Escolha o som ou a cena da noite e vá direto para a programação filtrada.
              </p>
            </div>
            <Link
              to="/eventos"
              className="text-xs font-bold uppercase tracking-[0.1em] text-[#F4F4F2] hover:underline whitespace-nowrap"
            >
              Agenda completa →
            </Link>
          </div>

          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {VIBE_TILES.map((vibe) => (
              <Link
                key={vibe.id}
                to={`/eventos?categoria=${vibe.categoryId}`}
                className="group relative aspect-[16/10] bg-[#141414] border border-[#292929] hover:border-[#F4F4F2] rounded-md overflow-hidden transition-colors"
              >
                <img
                  src={vibe.photo}
                  srcSet={getNightlifeSrcSet(vibe.photo)}
                  sizes="(max-width: 640px) 46vw, 20vw"
                  alt={vibe.alt}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover bw-editorial-photo group-hover:scale-[1.06] transition-transform duration-300"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/45 to-transparent"
                />
                <div className="absolute inset-x-0 bottom-0 p-3 flex items-center justify-between gap-2 text-[#F4F4F2]">
                  <span className="font-display text-lg sm:text-xl font-extrabold italic uppercase tracking-tight">
                    {vibe.label}
                  </span>
                  <ArrowRight className="w-4 h-4 text-[#858585] group-hover:text-[#F4F4F2] group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* PAPER TEAR TRANSITION INTO CRISP WHITE CONTRAST BAND */}
      <PaperTearDivider fill="#F4F4F2" />

      {/* SECTION 3: ROLÊS DO FIM DE SEMANA & GRATUITOS (White Contrast Surface #F4F4F2) */}
      <section className="bg-[#F4F4F2] text-[#080808] py-12 sm:py-16">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Left: Weekend Schedule with Day Tabs */}
            <div className="lg:col-span-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#D8D8D4] pb-4">
                <div>
                  <h2 className="font-display text-3xl sm:text-4xl font-extrabold italic uppercase tracking-tight text-[#080808]">
                    Agenda do fim de semana
                  </h2>
                  <p className="text-xs sm:text-sm text-[#525252] mt-1">
                    Programação por dia no horário oficial de Porto Alegre.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2" role="tablist" aria-label="Dias do fim de semana">
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
                        className={`px-3.5 py-1.5 rounded-md border text-xs font-semibold transition-colors ${
                          active
                            ? 'bg-[#080808] border-[#080808] text-[#F4F4F2]'
                            : 'bg-white border-[#D8D8D4] text-[#080808] hover:border-[#080808]'
                        }`}
                      >
                        <span className="uppercase tracking-wider mr-1.5">{day.label}</span>
                        <span className={active ? 'text-[#A3A3A3]' : 'text-[#525252]'}>
                          {formatEventDatePtBr(day.date)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {weekendEvents.length === 0 ? (
                <div className="p-6 rounded-md bg-white border border-[#D8D8D4] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <p className="font-display text-xl font-bold uppercase text-[#080808]">
                      Sem eventos confirmados para este dia por enquanto.
                    </p>
                    <p className="text-xs text-[#525252] mt-1">
                      Organiza uma festa ou show em Porto Alegre? Envie para a curadoria.
                    </p>
                  </div>
                  <Link
                    to="/organizador"
                    className="px-4 py-2.5 rounded-md bg-[#080808] text-[#F4F4F2] text-xs font-bold uppercase tracking-wider whitespace-nowrap"
                  >
                    Divulgar evento
                  </Link>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {weekendEvents.map((ev) => (
                    <EventCard key={ev.id} event={ev} layout="list" surface="light" />
                  ))}
                </div>
              )}
            </div>

            {/* Right: Free Events Highlight Box (Dark Ink Block on Light Surface) */}
            <aside className="lg:col-span-4 bg-[#080808] text-[#F4F4F2] rounded-md overflow-hidden border border-[#292929]">
              <img
                src={CAMPAIGN_PHOTOS.orla}
                srcSet={getNightlifeSrcSet(CAMPAIGN_PHOTOS.orla)}
                sizes="(max-width: 1024px) 100vw, 32vw"
                alt="Encontro gratuito ao entardecer na Orla do Guaíba"
                loading="lazy"
                decoding="async"
                className="w-full h-44 object-cover bw-editorial-photo"
              />
              <div className="p-5 sm:p-6 space-y-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#858585]">
                    Entrada 0800
                  </p>
                  <h3 className="font-display text-2xl sm:text-3xl font-extrabold italic uppercase tracking-tight mt-0.5">
                    Rolês gratuitos
                  </h3>
                </div>

                {freeEvents.length === 0 ? (
                  <p className="text-xs text-[#858585]">
                    Confira os encontros gratuitos abertos em praças, orla e centros culturais.
                  </p>
                ) : (
                  <ul className="divide-y divide-[#292929]">
                    {freeEvents.map((ev) => (
                      <li key={ev.id} className="py-3 first:pt-0 last:pb-0">
                        <Link
                          to={`/eventos/${ev.slug}`}
                          className="group flex items-center justify-between gap-3"
                        >
                          <div>
                            <p className="font-display text-lg font-bold uppercase tracking-tight text-[#F4F4F2] group-hover:underline">
                              {ev.title}
                            </p>
                            <p className="text-xs text-[#858585] mt-0.5 flex items-center gap-1.5">
                              <Calendar className="w-3 h-3" />
                              {formatEventDatePtBr(ev.dateISO)} · {ev.neighborhood}
                            </p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-[#858585] group-hover:text-[#F4F4F2] shrink-0" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}

                <Link
                  to="/eventos?gratis=1"
                  className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-md bg-[#F4F4F2] hover:bg-white text-[#080808] text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  <span>Ver todos os gratuitos</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <PaperTearDivider fill="#080808" />

      {/* SECTION 4: BARES EM DESTAQUE (Dark Band) */}
      <section className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div className="flex-1">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold italic uppercase tracking-tight text-[#F4F4F2]">
              Bares em destaque
            </h2>
            <p className="text-sm text-[#858585] mt-1">
              Balcões, calçadas, coquetelaria e casas culturais para começar ou esticar a noite.
            </p>
          </div>
          <Link
            to="/bares"
            className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.1em] text-[#F4F4F2] hover:underline whitespace-nowrap"
          >
            <span>Ver todos os bares</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {venues.slice(0, 4).map((venue) => (
            <VenueCard key={venue.id} venue={venue} />
          ))}
        </div>
      </section>

      <PaperTearDivider fill="#F4F4F2" />

      {/* SECTION 5: EXPLORE POR BAIRRO (White Contrast Surface #F4F4F2) */}
      <section className="bg-[#F4F4F2] text-[#080808] py-12 sm:py-16">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold italic uppercase tracking-tight">
              Explore Porto Alegre por bairro
            </h2>
            <p className="text-sm text-[#525252] mt-1">
              Da Cidade Baixa ao Quarto Distrito, cada região tem sua própria cena noturna.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {activeNeighborhood && (
              <div className="lg:col-span-7 bg-white rounded-md overflow-hidden border border-[#D8D8D4] flex flex-col justify-between">
                <img
                  src={getNeighborhoodPhoto(activeNeighborhood.id)}
                  srcSet={getNightlifeSrcSet(getNeighborhoodPhoto(activeNeighborhood.id))}
                  sizes="(max-width: 1024px) 100vw, 56vw"
                  alt={`Cena noturna no bairro ${activeNeighborhood.name}`}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-60 sm:h-72 object-cover bw-editorial-photo"
                />
                <div className="p-6 sm:p-7 space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#525252]">
                    {activeNeighborhood.vibeTag}
                  </p>
                  <h3 className="font-display text-3xl sm:text-4xl font-extrabold italic uppercase tracking-tight text-[#080808]">
                    {activeNeighborhood.name}
                  </h3>
                  <p className="text-sm text-[#525252] leading-relaxed">
                    {activeNeighborhood.editorialSummary}
                  </p>
                  <div className="pt-2 flex flex-wrap gap-3">
                    <Link
                      to={`/eventos?bairro=${encodeURIComponent(activeNeighborhood.name)}`}
                      className="px-4 py-2.5 rounded-md bg-[#080808] hover:bg-[#292929] text-[#F4F4F2] text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 transition-colors"
                    >
                      <span>Eventos em {activeNeighborhood.name}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      to={`/bares?bairro=${encodeURIComponent(activeNeighborhood.name)}`}
                      className="px-4 py-2.5 rounded-md border border-[#D8D8D4] hover:border-[#080808] text-[#080808] text-xs font-bold uppercase tracking-wider transition-colors"
                    >
                      Bares da região
                    </Link>
                  </div>
                </div>
              </div>
            )}

            <div className="lg:col-span-5 flex flex-col justify-between gap-2.5">
              {neighborhoods.map((nei) => {
                const isSelected = activeNeighborhood?.id === nei.id;
                return (
                  <button
                    key={nei.id}
                    type="button"
                    onClick={() => setActiveNeighborhoodId(nei.id)}
                    className={`p-4 rounded-md text-left flex items-center justify-between gap-4 border transition-colors ${
                      isSelected
                        ? 'bg-[#080808] border-[#080808] text-[#F4F4F2]'
                        : 'bg-white border-[#D8D8D4] hover:border-[#080808] text-[#080808]'
                    }`}
                  >
                    <div>
                      <span className="font-display text-xl font-extrabold italic uppercase block">
                        {nei.name}
                      </span>
                      <span className={`text-xs ${isSelected ? 'text-[#A3A3A3]' : 'text-[#525252]'}`}>
                        {nei.vibeTag}
                      </span>
                    </div>
                    <ArrowRight
                      className={`w-4 h-4 shrink-0 ${
                        isSelected ? 'text-[#F4F4F2]' : 'text-[#525252]'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <PaperTearDivider fill="#080808" />

      {/* SECTION 6: MAPA INTERATIVO & DIVULGUE / BORA JUNTO */}
      <section className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-14">
        <div>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold italic uppercase tracking-tight text-[#F4F4F2]">
                Perto de ti no mapa
              </h2>
              <p className="text-sm text-[#858585] mt-1">
                Localize festas, casas noturnas e bares espalhados por Porto Alegre.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/mapa"
                className="px-4 py-2.5 rounded-md bg-[#F4F4F2] hover:bg-white text-[#080808] text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 transition-colors"
              >
                <Compass className="w-4 h-4" />
                <span>Abrir mapa completo</span>
              </Link>
              <Link
                to="/curadoria"
                className="px-4 py-2.5 rounded-md border border-[#292929] hover:border-[#F4F4F2] text-[#F4F4F2] text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>Curadoria inteligente</span>
              </Link>
            </div>
          </div>

          <PoaMapView markers={mapMarkers} heightClass="h-[380px]" zoom={13} />
        </div>

        {/* High-Contrast Split Banner: Divulgar Evento & Bora Junto */}
        <div className="bg-[#141414] border border-[#292929] rounded-md p-7 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-2.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#858585]">
              Para produtores, casas noturnas e grupos
            </p>
            <h2 className="font-display text-3xl sm:text-5xl font-extrabold italic uppercase tracking-tight leading-[0.95] text-[#F4F4F2]">
              Teu evento merece pista cheia.
            </h2>
            <p className="text-sm text-[#858585] max-w-2xl leading-relaxed">
              Divulgue sua festa, show ou noite temática com revisão editorial, ou monte uma lista
              Bora Junto para o grupo votar no próximo rolê sem burocracia.
            </p>
          </div>
          <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3">
            <Link
              to="/organizador"
              className="px-5 py-3.5 rounded-md bg-[#F4F4F2] hover:bg-white text-[#080808] font-bold uppercase tracking-wider text-xs text-center inline-flex items-center justify-center gap-2 transition-colors"
            >
              <span>Divulgar meu evento</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
            <Link
              to="/bora-junto"
              className="px-5 py-3.5 rounded-md border border-[#292929] hover:border-[#F4F4F2] text-[#F4F4F2] font-bold uppercase tracking-wider text-xs text-center transition-colors"
            >
              Combinar com amigos (Bora Junto)
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
