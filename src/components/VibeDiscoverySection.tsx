import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, RotateCcw, SlidersHorizontal } from 'lucide-react';
import type {
  EventCategoryId,
  EventItem,
  NeighborhoodMeta,
  QuickDateFilter,
  VenueItem,
} from '../types/resenha';
import { matchVibeDiscovery, type VibeBudgetOption } from '../utils/vibeDiscovery';
import { EventCard } from './EventCard';
import { VenueCard } from './VenueCard';
import { SectionKicker } from './BrandMark';

interface VibeDiscoverySectionProps {
  events: EventItem[];
  venues: VenueItem[];
  neighborhoods: NeighborhoodMeta[];
}

const VIBE_OPTIONS: Array<{ id: EventCategoryId | 'todos'; label: string }> = [
  { id: 'todos', label: 'Qualquer som' },
  { id: 'funk', label: 'Funk' },
  { id: 'eletronica', label: 'Eletrônica' },
  { id: 'pagode-samba', label: 'Pagode & Samba' },
  { id: 'rock-indie', label: 'Rock / Indie' },
  { id: 'hip-hop', label: 'Hip-Hop' },
  { id: 'shows', label: 'Shows' },
  { id: 'bares', label: 'Bares & Esquenta' },
  { id: 'cultura', label: 'Cultura' },
];

const DAY_OPTIONS: Array<{ id: QuickDateFilter; label: string }> = [
  { id: 'all', label: 'Qualquer dia' },
  { id: 'today', label: 'Hoje' },
  { id: 'tomorrow', label: 'Amanhã' },
  { id: 'weekend', label: 'Fim de semana' },
];

const BUDGET_OPTIONS: Array<{ id: VibeBudgetOption; label: string }> = [
  { id: 'all', label: 'Qualquer valor' },
  { id: 'free', label: 'Grátis (0800)' },
  { id: 'up-to-40', label: 'Até R$ 40' },
];

export const VibeDiscoverySection: React.FC<VibeDiscoverySectionProps> = ({
  events,
  venues,
  neighborhoods,
}) => {
  const [vibe, setVibe] = useState<EventCategoryId | 'todos'>('todos');
  const [day, setDay] = useState<QuickDateFilter>('all');
  const [neighborhood, setNeighborhood] = useState<string>('todos');
  const [budget, setBudget] = useState<VibeBudgetOption>('all');

  const isFiltered =
    vibe !== 'todos' || day !== 'all' || neighborhood !== 'todos' || budget !== 'all';

  const result = useMemo(
    () =>
      matchVibeDiscovery({
        events,
        venues,
        vibe,
        day,
        neighborhood,
        budget,
      }),
    [events, venues, vibe, day, neighborhood, budget],
  );

  const resetAll = () => {
    setVibe('todos');
    setDay('all');
    setNeighborhood('todos');
    setBudget('all');
  };

  const previewEvents = result.events.slice(0, 4);
  const previewVenues = result.isBarMode && previewEvents.length === 0 ? result.venues.slice(0, 4) : [];

  return (
    <section
      id="qual-e-a-tua-vibe"
      aria-labelledby="vibe-discovery-heading"
      className="bg-[#101012] text-[#F7F7F5] py-10 sm:py-14 border-t border-[#28282E]"
    >
      <div className="max-w-[1320px] mx-auto px-5 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-[#1C1C20] border border-[#28282E] p-5 sm:p-8 lg:p-9 space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-[#28282E]">
            <div>
              <SectionKicker label="Descoberta rápida · Porto Alegre" tone="on-dark" />
              <h2
                id="vibe-discovery-heading"
                className="font-display text-3xl sm:text-[42px] font-extrabold italic uppercase leading-[0.94] tracking-tight text-[#F7F7F5]"
              >
                Qual é a tua vibe hoje?
              </h2>
              <p className="text-xs sm:text-sm text-[#98989F] mt-2 max-w-xl">
                Combina estilo, dia, bairro e bolso pra filtrar o catálogo real na hora — sem
                formulário longo.
              </p>
            </div>

            <div className="flex items-center gap-3 self-start md:self-end">
              {isFiltered && (
                <button
                  type="button"
                  onClick={resetAll}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[#28282E] bg-[#101012] hover:border-[#F7F7F5]/50 text-xs font-semibold text-[#98989F] hover:text-[#F7F7F5] transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Resetar</span>
                </button>
              )}
              <Link
                to={result.targetUrl}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#F7F7F5] hover:bg-[#FF5A36] text-[#101012] text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap"
              >
                <span>
                  Ver {result.totalCount}{' '}
                  {result.isBarMode && previewEvents.length === 0
                    ? result.totalCount === 1
                      ? 'bar'
                      : 'bares'
                    : result.totalCount === 1
                      ? 'rolê'
                      : 'rolês'}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Interactive Selector Matrix */}
          <div className="space-y-4">
            {/* Row 1: Vibe / Musical Style */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#98989F] flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#FF5A36]" />
                <span>Som & clima</span>
              </p>
              <div
                role="group"
                aria-label="Selecionar estilo ou clima"
                className="flex flex-wrap gap-2"
              >
                {VIBE_OPTIONS.map((item) => {
                  const active = vibe === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setVibe(item.id)}
                      aria-pressed={active}
                      className={`px-3.5 py-2 min-h-[38px] rounded-full border text-xs font-semibold transition-all active:scale-[0.97] ${
                        active
                          ? 'bg-[#FF5A36] border-[#FF5A36] text-[#101012]'
                          : 'bg-[#101012] border-[#28282E] text-[#F7F7F5] hover:border-[#FF5A36]/70'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 2: Day, Budget & Neighborhood */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-1">
              <div className="lg:col-span-4 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#98989F]">
                  Quando
                </p>
                <div role="group" aria-label="Selecionar dia" className="flex flex-wrap gap-1.5">
                  {DAY_OPTIONS.map((item) => {
                    const active = day === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setDay(item.id)}
                        aria-pressed={active}
                        className={`px-3 py-1.5 min-h-[36px] rounded-full border text-xs font-semibold transition-colors ${
                          active
                            ? 'bg-[#F7F7F5] border-[#F7F7F5] text-[#101012]'
                            : 'bg-[#101012] border-[#28282E] text-[#E8E8E6] hover:border-[#F7F7F5]/50'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-3 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#98989F]">
                  Bolso
                </p>
                <div role="group" aria-label="Selecionar orçamento" className="flex flex-wrap gap-1.5">
                  {BUDGET_OPTIONS.map((item) => {
                    const active = budget === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setBudget(item.id)}
                        aria-pressed={active}
                        className={`px-3 py-1.5 min-h-[36px] rounded-full border text-xs font-semibold transition-colors ${
                          active
                            ? 'bg-[#F7F7F5] border-[#F7F7F5] text-[#101012]'
                            : 'bg-[#101012] border-[#28282E] text-[#E8E8E6] hover:border-[#F7F7F5]/50'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-5 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#98989F]">
                  Bairro
                </p>
                <div
                  role="group"
                  aria-label="Selecionar bairro"
                  className="flex flex-wrap gap-1.5"
                >
                  <button
                    type="button"
                    onClick={() => setNeighborhood('todos')}
                    aria-pressed={neighborhood === 'todos'}
                    className={`px-3 py-1.5 min-h-[36px] rounded-full border text-xs font-semibold transition-colors ${
                      neighborhood === 'todos'
                        ? 'bg-[#5265FF] border-[#5265FF] text-white'
                        : 'bg-[#101012] border-[#28282E] text-[#E8E8E6] hover:border-[#5265FF]/70'
                    }`}
                  >
                    Toda POA
                  </button>
                  {neighborhoods.slice(0, 5).map((nei) => {
                    const active = neighborhood === nei.name;
                    return (
                      <button
                        key={nei.id}
                        type="button"
                        onClick={() => setNeighborhood(active ? 'todos' : nei.name)}
                        aria-pressed={active}
                        className={`px-3 py-1.5 min-h-[36px] rounded-full border text-xs font-semibold transition-colors ${
                          active
                            ? 'bg-[#5265FF] border-[#5265FF] text-white'
                            : 'bg-[#101012] border-[#28282E] text-[#E8E8E6] hover:border-[#5265FF]/70'
                        }`}
                      >
                        {nei.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Live Matching Results */}
          <div className="pt-4 border-t border-[#28282E]">
            {previewEvents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {previewEvents.map((ev) => (
                  <EventCard key={ev.id} event={ev} layout="poster" surface="dark" />
                ))}
              </div>
            ) : previewVenues.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {previewVenues.map((v) => (
                  <VenueCard key={v.id} venue={v} surface="dark" />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl bg-[#101012] border border-[#28282E] p-7 text-center space-y-3">
                <p className="font-display text-2xl font-extrabold uppercase text-[#F7F7F5]">
                  Nenhum rolê fechou exatamente com essa combinação agora.
                </p>
                <p className="text-xs sm:text-sm text-[#98989F] max-w-md mx-auto">
                  Experimenta abrir para toda Porto Alegre ou trocar o dia — só mostramos opções
                  reais presentes no catálogo.
                </p>
                <button
                  type="button"
                  onClick={resetAll}
                  className="px-5 py-2.5 rounded-full bg-[#FF5A36] hover:bg-[#FF6F4F] text-[#101012] text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Ampliar para toda POA
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
