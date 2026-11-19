import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useCatalog } from '../contexts/CatalogContext';
import { VenueCard } from '../components/VenueCard';
import { filterVenues } from '../utils/eventFilters';

export const VenuesPage: React.FC = () => {
  const { venues, neighborhoods, hasRealVenues } = useCatalog();
  const [searchParams, setSearchParams] = useSearchParams();

  const queryText = searchParams.get('q') || '';
  const neighborhood = searchParams.get('bairro') || 'todos';
  const environmentType = searchParams.get('ambiente') || 'todos';
  const priceRange = searchParams.get('faixa') || 'todos';
  const category = searchParams.get('categoria') || 'todos';

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'todos') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    setSearchParams({}, { replace: true });
  };

  const uniqueCategories = useMemo(
    () => Array.from(new Set(venues.map((v) => v.category).filter(Boolean))).sort(),
    [venues],
  );
  const uniqueEnvironments = useMemo(
    () => Array.from(new Set(venues.map((v) => v.environmentType).filter(Boolean))).sort(),
    [venues],
  );

  const filteredVenues = useMemo(
    () =>
      filterVenues(venues, {
        query: queryText,
        neighborhood,
        environmentType,
        priceRange,
        category,
      }),
    [venues, queryText, neighborhood, environmentType, priceRange, category],
  );

  const hasFilters =
    Boolean(queryText) ||
    neighborhood !== 'todos' ||
    environmentType !== 'todos' ||
    priceRange !== 'todos' ||
    category !== 'todos';

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 text-[#F4F4F2]">
      <div className="pb-6 border-b border-[#292929] mb-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#858585] mb-2">
          Encontros & balcão · Porto Alegre
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold italic uppercase tracking-tight">
          Bares e espaços culturais
        </h1>
        <p className="text-sm sm:text-base text-[#858585] mt-2 max-w-2xl">
          {hasRealVenues
            ? 'Guia de bares, pubs, cervejarias e casas noturnas. Só exibimos "Aberto agora" quando os horários foram verificados.'
            : 'Fichas demonstrativas para navegação. Estabelecimentos reais podem ser cadastrados pelo painel administrativo.'}
        </p>
      </div>

      {/* Filter Bar */}
      <section
        aria-label="Filtros de bares"
        className="bg-[#141414] border border-[#292929] rounded-md p-5 sm:p-6 mb-8 space-y-4"
      >
        <div className="relative">
          <Search className="w-4 h-4 text-[#858585] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={queryText}
            onChange={(e) => updateParam('q', e.target.value || null)}
            placeholder="Buscar bar, estilo de som, ambiente ou bairro..."
            aria-label="Buscar bares"
            className="w-full h-11 pl-10 pr-4 bg-[#080808] border border-[#292929] focus:border-[#F4F4F2] rounded-md text-sm text-[#F4F4F2] placeholder:text-[#858585] focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label
              htmlFor="bar-bairro"
              className="block text-[11px] font-bold uppercase tracking-wider text-[#858585] mb-1.5"
            >
              Bairro
            </label>
            <select
              id="bar-bairro"
              value={neighborhood}
              onChange={(e) => updateParam('bairro', e.target.value)}
              className="w-full h-10 px-3 bg-[#080808] border border-[#292929] focus:border-[#F4F4F2] rounded-md text-xs font-medium text-[#F4F4F2] focus:outline-none"
            >
              <option value="todos">Todos os bairros</option>
              {neighborhoods.map((n) => (
                <option key={n.id} value={n.name}>
                  {n.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="bar-categoria"
              className="block text-[11px] font-bold uppercase tracking-wider text-[#858585] mb-1.5"
            >
              Categoria
            </label>
            <select
              id="bar-categoria"
              value={category}
              onChange={(e) => updateParam('categoria', e.target.value)}
              className="w-full h-10 px-3 bg-[#080808] border border-[#292929] focus:border-[#F4F4F2] rounded-md text-xs font-medium text-[#F4F4F2] focus:outline-none"
            >
              <option value="todos">Todas</option>
              {uniqueCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="bar-ambiente"
              className="block text-[11px] font-bold uppercase tracking-wider text-[#858585] mb-1.5"
            >
              Ambiente
            </label>
            <select
              id="bar-ambiente"
              value={environmentType}
              onChange={(e) => updateParam('ambiente', e.target.value)}
              className="w-full h-10 px-3 bg-[#080808] border border-[#292929] focus:border-[#F4F4F2] rounded-md text-xs font-medium text-[#F4F4F2] focus:outline-none"
            >
              <option value="todos">Todos os ambientes</option>
              {uniqueEnvironments.map((env) => (
                <option key={env} value={env}>
                  {env}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="bar-faixa"
              className="block text-[11px] font-bold uppercase tracking-wider text-[#858585] mb-1.5"
            >
              Faixa de gasto
            </label>
            <select
              id="bar-faixa"
              value={priceRange}
              onChange={(e) => updateParam('faixa', e.target.value)}
              className="w-full h-10 px-3 bg-[#080808] border border-[#292929] focus:border-[#F4F4F2] rounded-md text-xs font-medium text-[#F4F4F2] focus:outline-none"
            >
              <option value="todos">Qualquer faixa</option>
              <option value="$">$ (Econômico)</option>
              <option value="$$">$$ (Moderado)</option>
              <option value="$$$">$$$ (Especial / Autoral)</option>
            </select>
          </div>

          <div className="flex items-end">
            {hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="w-full h-10 px-3 rounded-md border border-[#292929] hover:border-[#F4F4F2] text-xs font-bold uppercase tracking-wider text-[#F4F4F2] inline-flex items-center justify-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" /> Limpar filtros
              </button>
            ) : (
              <div className="w-full h-10 px-3 rounded-md border border-[#292929] bg-[#080808] flex items-center justify-center text-xs font-medium text-[#858585] tabular-nums">
                {filteredVenues.length} locais
              </div>
            )}
          </div>
        </div>
      </section>

      {filteredVenues.length === 0 ? (
        <div className="bg-[#141414] border border-[#292929] rounded-md p-10 text-center space-y-4">
          <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase text-[#F4F4F2]">
            Nenhum bar encontrado com essa combinação
          </h2>
          <button
            type="button"
            onClick={clearFilters}
            className="px-6 py-3 rounded-md bg-[#F4F4F2] hover:bg-white text-[#080808] text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Mostrar todos os bares
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredVenues.map((venue) => (
            <VenueCard key={venue.id} venue={venue} />
          ))}
        </div>
      )}
    </div>
  );
};
