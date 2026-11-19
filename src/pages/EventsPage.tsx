import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutGrid, List, Search, Sparkles, X } from 'lucide-react';
import { useCatalog } from '../contexts/CatalogContext';
import { EventCard } from '../components/EventCard';
import { filterAndSortEvents } from '../utils/eventFilters';
import type { AgeRating, EventCategoryId, PriceType, QuickDateFilter } from '../types/resenha';

export const EventsPage: React.FC = () => {
  const { events, categories, neighborhoods, hasRealEvents } = useCatalog();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Smart intent helper (calls server-side gemini-3.1-flash-lite)
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);

  const queryText = searchParams.get('q') || '';
  const category = (searchParams.get('categoria') || 'todos') as EventCategoryId | 'todos';
  const neighborhood = searchParams.get('bairro') || 'todos';
  const quickDate = (searchParams.get('data') || 'all') as QuickDateFilter;
  const onlyFree = searchParams.get('gratis') === '1';
  const ageRating = (searchParams.get('idade') || 'all') as AgeRating | 'all' | 'under18_safe';
  const priceType: PriceType | 'all' = onlyFree ? 'free' : 'all';

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
        ageRating,
        includeCancelled: true,
      }),
    [events, queryText, category, neighborhood, quickDate, priceType, onlyFree, ageRating],
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
    ageRating !== 'all';

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 text-[#F4F4F2]">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-[#292929] mb-8">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#858585] mb-2">
            Agenda Porto Alegre
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold italic uppercase tracking-tight text-[#F4F4F2]">
            Eventos e rolês em POA
          </h1>
          <p className="text-sm sm:text-base text-[#858585] mt-2 max-w-2xl">
            {hasRealEvents
              ? 'Programação em ordem cronológica, com origem transparente e filtros por bairro e faixa etária.'
              : 'Exibindo catálogo de demonstração enquanto organizadores publicam a agenda local.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            aria-label="Visualização em grade"
            aria-pressed={viewMode === 'grid'}
            className={`px-4 py-2 rounded-md border text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors ${
              viewMode === 'grid'
                ? 'bg-[#F4F4F2] border-[#F4F4F2] text-[#080808]'
                : 'bg-[#141414] border-[#292929] text-[#858585] hover:border-[#F4F4F2] hover:text-[#F4F4F2]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Grade
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            aria-label="Visualização em lista"
            aria-pressed={viewMode === 'list'}
            className={`px-4 py-2 rounded-md border text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors ${
              viewMode === 'list'
                ? 'bg-[#F4F4F2] border-[#F4F4F2] text-[#080808]'
                : 'bg-[#141414] border-[#292929] text-[#858585] hover:border-[#F4F4F2] hover:text-[#F4F4F2]'
            }`}
          >
            <List className="w-3.5 h-3.5" /> Lista
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <section
        aria-label="Filtros de eventos"
        className="bg-[#141414] border border-[#292929] rounded-md p-5 sm:p-6 mb-8 space-y-4"
      >
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-[#858585] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={queryText}
              onChange={(e) => updateParam('q', e.target.value || null)}
              placeholder="Buscar por festa, show, bar, bairro ou frase (ex: samba grátis na Cidade Baixa sexta)..."
              aria-label="Buscar eventos"
              className="w-full h-11 pl-10 pr-4 bg-[#080808] border border-[#292929] focus:border-[#F4F4F2] rounded-md text-sm text-[#F4F4F2] placeholder:text-[#858585] focus:outline-none"
            />
          </div>
          <button
            type="button"
            disabled={aiLoading || !queryText.trim()}
            onClick={handleSmartInterpret}
            className="h-11 px-5 bg-[#F4F4F2] hover:bg-white disabled:opacity-45 text-[#080808] rounded-md text-xs font-bold uppercase tracking-wider inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{aiLoading ? 'Interpretando...' : 'Aplicar busca inteligente'}</span>
          </button>
        </div>

        {aiNote && (
          <p className="text-xs font-medium text-[#F4F4F2]">
            Interpretação aplicada: {aiNote}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label
              htmlFor="filter-date"
              className="block text-[11px] font-bold uppercase tracking-wider text-[#858585] mb-1.5"
            >
              Data
            </label>
            <select
              id="filter-date"
              value={quickDate}
              onChange={(e) => updateParam('data', e.target.value)}
              className="w-full h-10 px-3 bg-[#080808] border border-[#292929] focus:border-[#F4F4F2] rounded-md text-xs font-medium text-[#F4F4F2] focus:outline-none"
            >
              <option value="all">Todas as próximas datas</option>
              <option value="today">Hoje</option>
              <option value="tomorrow">Amanhã</option>
              <option value="weekend">Fim de semana</option>
              <option value="friday">Sexta-feira</option>
              <option value="saturday">Sábado</option>
              <option value="sunday">Domingo</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-category"
              className="block text-[11px] font-bold uppercase tracking-wider text-[#858585] mb-1.5"
            >
              Categoria
            </label>
            <select
              id="filter-category"
              value={category}
              onChange={(e) => updateParam('categoria', e.target.value)}
              className="w-full h-10 px-3 bg-[#080808] border border-[#292929] focus:border-[#F4F4F2] rounded-md text-xs font-medium text-[#F4F4F2] focus:outline-none"
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
              className="block text-[11px] font-bold uppercase tracking-wider text-[#858585] mb-1.5"
            >
              Bairro
            </label>
            <select
              id="filter-neighborhood"
              value={neighborhood}
              onChange={(e) => updateParam('bairro', e.target.value)}
              className="w-full h-10 px-3 bg-[#080808] border border-[#292929] focus:border-[#F4F4F2] rounded-md text-xs font-medium text-[#F4F4F2] focus:outline-none"
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
              className="block text-[11px] font-bold uppercase tracking-wider text-[#858585] mb-1.5"
            >
              Classificação etária
            </label>
            <select
              id="filter-age"
              value={ageRating}
              onChange={(e) => updateParam('idade', e.target.value)}
              className="w-full h-10 px-3 bg-[#080808] border border-[#292929] focus:border-[#F4F4F2] rounded-md text-xs font-medium text-[#F4F4F2] focus:outline-none"
            >
              <option value="all">Todas as faixas</option>
              <option value="under18_safe">Adequado para menores (Livre / 16+)</option>
              <option value="Livre">Somente Livre</option>
              <option value="16+">16+</option>
              <option value="18+">18+</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => updateParam('gratis', onlyFree ? null : '1')}
              aria-pressed={onlyFree}
              className={`flex-1 h-10 px-4 rounded-md border text-xs font-bold uppercase tracking-wider transition-colors ${
                onlyFree
                  ? 'bg-[#F4F4F2] border-[#F4F4F2] text-[#080808]'
                  : 'bg-[#080808] border-[#292929] text-[#F4F4F2] hover:border-[#F4F4F2]'
              }`}
            >
              Somente grátis
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                aria-label="Limpar todos os filtros"
                className="h-10 w-10 rounded-md border border-[#292929] hover:border-[#F4F4F2] text-[#858585] hover:text-[#F4F4F2] flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-[#858585] mb-5">
        <span className="font-medium tabular-nums">
          {filteredEvents.length} {filteredEvents.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}
        </span>
      </div>

      {/* Results Grid / List */}
      {filteredEvents.length === 0 ? (
        <div className="bg-[#141414] border border-[#292929] rounded-md p-10 text-center space-y-4">
          <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase text-[#F4F4F2]">
            Nenhum evento corresponde aos filtros selecionados
          </h2>
          <p className="text-sm text-[#858585] max-w-md mx-auto">
            Experimente limpar os filtros ou ampliar para todos os bairros de Porto Alegre.
          </p>
          <button
            type="button"
            onClick={clearAllFilters}
            className="px-6 py-3 rounded-md bg-[#F4F4F2] hover:bg-white text-[#080808] text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Limpar filtros
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEvents.map((ev) => (
            <EventCard key={ev.id} event={ev} layout="poster" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((ev) => (
            <EventCard key={ev.id} event={ev} layout="list" surface="dark" />
          ))}
        </div>
      )}
    </div>
  );
};
