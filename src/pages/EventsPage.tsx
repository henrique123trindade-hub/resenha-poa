import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutGrid, List, RefreshCw, Search, Sparkles, X } from 'lucide-react';
import { useCatalog } from '../contexts/CatalogContext';
import { useToast } from '../components/Layout';
import { EventCard } from '../components/EventCard';
import { PullToRefresh } from '../components/PullToRefresh';
import { SectionKicker } from '../components/BrandMark';
import { filterAndSortEvents } from '../utils/eventFilters';
import { useDocumentHead } from '../utils/seoHead';
import type { AgeRating, EventCategoryId, PriceType, QuickDateFilter } from '../types/resenha';

export const EventsPage: React.FC = () => {
  const { events, categories, neighborhoods, hasRealEvents, isRefreshing, refreshCatalog } =
    useCatalog();
  const { notify } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const handleManualRefresh = async () => {
    const res = await refreshCatalog();
    notify(
      res.usedFallback
        ? 'Agenda sincronizada com os dados disponíveis.'
        : 'Agenda de eventos atualizada.',
    );
  };

  // Smart intent helper (calls server-side gemini-3.1-flash-lite)
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);

  const queryText = searchParams.get('q') || '';
  const category = (searchParams.get('categoria') || 'todos') as EventCategoryId | 'todos';
  const neighborhood = searchParams.get('bairro') || 'todos';
  const quickDate = (searchParams.get('data') || 'all') as QuickDateFilter;
  const onlyFree = searchParams.get('gratis') === '1';
  const maxRaw = searchParams.get('max');
  const maxPrice = maxRaw && !Number.isNaN(Number(maxRaw)) && Number(maxRaw) >= 0 ? Number(maxRaw) : undefined;
  const ageRating = (searchParams.get('idade') || 'all') as AgeRating | 'all' | 'under18_safe';
  const priceType: PriceType | 'all' = onlyFree ? 'free' : 'all';

  useDocumentHead({
    title:
      neighborhood !== 'todos'
        ? `Eventos em ${neighborhood} · ResenhaPOA`
        : onlyFree
          ? 'Rolês gratuitos (0800) em Porto Alegre · ResenhaPOA'
          : 'Agenda de Eventos e Festas em Porto Alegre · ResenhaPOA',
    description:
      'Confira festas, baladas, shows e eventos culturais em Porto Alegre filtrados por bairro, dia, estilo musical e orçamento.',
  });

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'todos' || value === 'all') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  };

  const clearAllFilters = () => {
    setSearchParams({}, { replace: true });
    setAiNote(null);
  };

  const filteredEvents = useMemo(
    () =>
      filterAndSortEvents(events, {
        query: queryText,
        category,
        neighborhood,
        quickDate,
        priceType,
        onlyFree,
        maxPrice,
        ageRating,
        includeCancelled: true,
      }),
    [events, queryText, category, neighborhood, quickDate, priceType, onlyFree, maxPrice, ageRating],
  );

  const handleSmartInterpret = async () => {
    if (!queryText.trim()) return;
    setAiLoading(true);
    setAiNote(null);
    try {
      const res = await fetch('/api/ai/quick-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText }),
      });
      if (!res.ok) throw new Error('Falha ao interpretar busca');
      const data = (await res.json()) as {
        category?: string | null;
        neighborhood?: string | null;
        quickDate?: string | null;
        onlyFree?: boolean;
        keywords?: string;
        summary?: string;
      };
      const next = new URLSearchParams();
      if (data.keywords) next.set('q', data.keywords);
      if (data.category) next.set('categoria', data.category);
      if (data.neighborhood) next.set('bairro', data.neighborhood);
      if (
        data.quickDate &&
        ['today', 'tomorrow', 'weekend', 'friday', 'saturday', 'sunday'].includes(data.quickDate)
      ) {
        next.set('data', data.quickDate);
      }
      if (data.onlyFree) next.set('gratis', '1');
      setSearchParams(next, { replace: true });
      if (data.summary) setAiNote(data.summary);
    } catch {
      setAiNote('Busca aplicada diretamente nos títulos, locais e bairros.');
    } finally {
      setAiLoading(false);
    }
  };

  const hasActiveFilters =
    Boolean(queryText) ||
    category !== 'todos' ||
    neighborhood !== 'todos' ||
    quickDate !== 'all' ||
    onlyFree ||
    typeof maxPrice === 'number' ||
    ageRating !== 'all';

  return (
    <PullToRefresh onRefresh={refreshCatalog} isRefreshing={isRefreshing}>
      <div className="max-w-[1320px] mx-auto px-5 sm:px-6 lg:px-8 py-10 sm:py-14 text-[#F7F7F5]">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-[#28282E] mb-8">
          <div>
            <SectionKicker label="Agenda Porto Alegre" tone="on-dark" />
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold italic uppercase tracking-tight text-[#F7F7F5]">
              Eventos e rolês em POA
            </h1>
            <p className="text-sm sm:text-base text-[#98989F] mt-2 max-w-2xl">
              {hasRealEvents
                ? 'Programação em ordem cronológica, com origem transparente e filtros por bairro, estilo e faixa etária.'
                : 'Exibindo catálogo de demonstração enquanto organizadores publicam a agenda local.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void handleManualRefresh()}
              disabled={isRefreshing}
              aria-label="Atualizar catálogo de eventos"
              className="px-4 py-2 rounded-full border bg-[#1C1C20] border-[#28282E] text-[#F7F7F5] hover:border-[#FF5A36] disabled:opacity-60 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? 'motion-safe:animate-spin text-[#FF5A36]' : ''}`}
              />
              <span>{isRefreshing ? 'Atualizando...' : 'Atualizar'}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Visualização em grade"
              aria-pressed={viewMode === 'grid'}
              className={`px-4 py-2 rounded-full border text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[#FF5A36] border-[#FF5A36] text-[#101012]'
                  : 'bg-[#1C1C20] border-[#28282E] text-[#98989F] hover:border-[#F7F7F5] hover:text-[#F7F7F5]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Grade
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="Visualização em lista"
              aria-pressed={viewMode === 'list'}
              className={`px-4 py-2 rounded-full border text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors ${
                viewMode === 'list'
                  ? 'bg-[#FF5A36] border-[#FF5A36] text-[#101012]'
                  : 'bg-[#1C1C20] border-[#28282E] text-[#98989F] hover:border-[#F7F7F5] hover:text-[#F7F7F5]'
              }`}
            >
              <List className="w-3.5 h-3.5" /> Lista
            </button>
          </div>
        </div>

      {/* Quick Date Strip */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-4 -mx-1 px-1">
        {(
          [
            { id: 'all', label: 'Todas as datas' },
            { id: 'today', label: 'Hoje' },
            { id: 'tomorrow', label: 'Amanhã' },
            { id: 'friday', label: 'Sexta' },
            { id: 'saturday', label: 'Sábado' },
            { id: 'sunday', label: 'Domingo' },
            { id: 'weekend', label: 'Fim de semana' },
          ] as const
        ).map((item) => {
          const active = quickDate === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => updateParam('data', item.id)}
              className={`px-4 py-2 rounded-full border text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                active
                  ? 'bg-[#FF5A36] border-[#FF5A36] text-[#101012]'
                  : 'bg-[#1C1C20] border-[#28282E] text-[#F7F7F5] hover:border-[#FF5A36]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => updateParam('gratis', onlyFree ? null : '1')}
          aria-pressed={onlyFree}
          className={`px-4 py-2 rounded-full border text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
            onlyFree
              ? 'bg-[#F7F7F5] border-[#F7F7F5] text-[#101012]'
              : 'bg-[#1C1C20] border-[#28282E] text-[#F7F7F5] hover:border-[#F7F7F5]'
          }`}
        >
          Grátis (0800)
        </button>
        <button
          type="button"
          onClick={() => updateParam('max', maxPrice === 40 ? null : '40')}
          aria-pressed={maxPrice === 40}
          className={`px-4 py-2 rounded-full border text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
            maxPrice === 40
              ? 'bg-[#F7F7F5] border-[#F7F7F5] text-[#101012]'
              : 'bg-[#1C1C20] border-[#28282E] text-[#F7F7F5] hover:border-[#F7F7F5]'
          }`}
        >
          Até R$ 40
        </button>
      </div>

      {/* Filter Toolbar */}
      <section
        aria-label="Filtros de eventos"
        className="bg-[#1C1C20] border border-[#28282E] rounded-2xl p-5 sm:p-6 mb-8 space-y-4"
      >
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-[#98989F] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={queryText}
              onChange={(e) => updateParam('q', e.target.value || null)}
              placeholder="Buscar por festa, show, bar, bairro ou frase (ex: samba grátis na Cidade Baixa sexta)..."
              aria-label="Buscar eventos"
              enterKeyHint="search"
              className="w-full min-w-0 h-12 sm:h-11 pl-10 pr-4 bg-[#101012] border border-[#28282E] focus:border-[#FF5A36] rounded-xl text-base sm:text-sm text-[#F7F7F5] placeholder:text-[#98989F] focus:outline-none"
            />
          </div>
          <button
            type="button"
            disabled={aiLoading || !queryText.trim()}
            onClick={handleSmartInterpret}
            className="h-11 px-5 bg-[#5265FF] hover:bg-[#6475ff] disabled:opacity-75 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold uppercase tracking-wider inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{aiLoading ? 'Interpretando...' : 'Aplicar busca inteligente'}</span>
          </button>
        </div>

        {aiNote && <p className="text-xs font-medium text-[#FF5A36]">Interpretação aplicada: {aiNote}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label
              htmlFor="filter-category"
              className="block text-[11px] font-bold uppercase tracking-wider text-[#98989F] mb-1.5"
            >
              Estilo / Categoria
            </label>
            <select
              id="filter-category"
              value={category}
              onChange={(e) => updateParam('categoria', e.target.value)}
              className="w-full min-w-0 h-11 sm:h-10 px-3.5 sm:px-3 bg-[#101012] border border-[#28282E] focus:border-[#FF5A36] rounded-xl text-base sm:text-xs font-medium text-[#F7F7F5] focus:outline-none"
            >
              <option value="todos">Todas as categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-neighborhood"
              className="block text-[11px] font-bold uppercase tracking-wider text-[#98989F] mb-1.5"
            >
              Bairro
            </label>
            <select
              id="filter-neighborhood"
              value={neighborhood}
              onChange={(e) => updateParam('bairro', e.target.value)}
              className="w-full min-w-0 h-11 sm:h-10 px-3.5 sm:px-3 bg-[#101012] border border-[#28282E] focus:border-[#FF5A36] rounded-xl text-base sm:text-xs font-medium text-[#F7F7F5] focus:outline-none"
            >
              <option value="todos">Todos os bairros de POA</option>
              {neighborhoods.map((n) => (
                <option key={n.id} value={n.name}>
                  {n.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-age"
              className="block text-[11px] font-bold uppercase tracking-wider text-[#98989F] mb-1.5"
            >
              Classificação etária
            </label>
            <select
              id="filter-age"
              value={ageRating}
              onChange={(e) => updateParam('idade', e.target.value)}
              className="w-full min-w-0 h-11 sm:h-10 px-3.5 sm:px-3 bg-[#101012] border border-[#28282E] focus:border-[#FF5A36] rounded-xl text-base sm:text-xs font-medium text-[#F7F7F5] focus:outline-none"
            >
              <option value="all">Todas as faixas</option>
              <option value="under18_safe">Adequado para menores (Livre / 16+)</option>
              <option value="Livre">Somente Livre</option>
              <option value="16+">16+</option>
              <option value="18+">18+</option>
            </select>
          </div>

          <div className="flex items-end">
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearAllFilters}
                className="w-full h-10 px-4 rounded-xl border border-[#28282E] hover:border-[#FF5A36] text-xs font-bold uppercase tracking-wider text-[#F7F7F5] inline-flex items-center justify-center gap-1.5 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Limpar filtros
              </button>
            ) : (
              <div className="w-full h-10 px-4 rounded-xl border border-[#28282E] bg-[#101012] flex items-center justify-center text-xs font-medium text-[#98989F] tabular-nums">
                {filteredEvents.length} {filteredEvents.length === 1 ? 'rolê' : 'rolês'}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-[#98989F] mb-5">
        <span className="font-medium tabular-nums">
          {filteredEvents.length}{' '}
          {filteredEvents.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}
        </span>
      </div>

      {/* Results Grid (Asymmetric Lead Feature Card + 3-Col Posters) or List */}
      {filteredEvents.length === 0 ? (
        <div className="bg-[#1C1C20] border border-[#28282E] rounded-2xl p-10 text-center space-y-4">
          <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase text-[#F7F7F5]">
            Nenhum evento corresponde aos filtros selecionados
          </h2>
          <p className="text-sm text-[#98989F] max-w-md mx-auto">
            Experimente limpar os filtros ou ampliar para todos os bairros de Porto Alegre.
          </p>
          <button
            type="button"
            onClick={clearAllFilters}
            className="px-6 py-3 rounded-full bg-[#FF5A36] hover:bg-[#FF6F4F] text-[#101012] text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Limpar filtros
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="space-y-6">
          {filteredEvents.length >= 3 && !hasActiveFilters ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                <div className="lg:col-span-7">
                  <EventCard event={filteredEvents[0]} layout="feature" />
                </div>
                <div className="lg:col-span-5 flex flex-col gap-5">
                  <EventCard event={filteredEvents[1]} layout="poster" />
                  <EventCard event={filteredEvents[2]} layout="poster" />
                </div>
              </div>
              {filteredEvents.length > 3 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredEvents.slice(3).map((ev) => (
                    <EventCard key={ev.id} event={ev} layout="poster" />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredEvents.map((ev) => (
                <EventCard key={ev.id} event={ev} layout="poster" />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((ev) => (
            <EventCard key={ev.id} event={ev} layout="list" surface="dark" />
          ))}
        </div>
      )}
      </div>
    </PullToRefresh>
  );
};
