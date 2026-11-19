import React, { useState } from 'react';
import { ExternalLink, Globe, MapPin, Send, Sparkles, Zap } from 'lucide-react';
import { useCatalog } from '../contexts/CatalogContext';

type AiMode = 'search' | 'places' | 'roteiro';

interface SearchSource {
  uri: string;
  title: string;
}

interface PlaceLink {
  title: string;
  uri: string;
  reviewUris?: string[];
}

export const AiCuratorPanel: React.FC = () => {
  const { events } = useCatalog();
  const [mode, setMode] = useState<AiMode>('search');
  const [prompt, setPrompt] = useState('');
  const [neighborhood, setNeighborhood] = useState('Cidade Baixa');
  const [budget, setBudget] = useState('Até R$ 50');
  const [ageGroup, setAgeGroup] = useState<'18+' | 'menor'>('18+');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchResult, setSearchResult] = useState<{ text: string; sources: SearchSource[] } | null>(null);
  const [placesResult, setPlacesResult] = useState<{ text: string; places: PlaceLink[] } | null>(null);
  const [roteiroResult, setRoteiroResult] = useState<string | null>(null);

  const runAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);

    try {
      if (mode === 'search') {
        const res = await fetch('/api/ai/discover-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: prompt }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro na busca web.');
        setSearchResult(data);
      } else if (mode === 'places') {
        let coords: { lat?: number; lng?: number } = {};
        if ('geolocation' in navigator) {
          try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 }),
            );
            coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          } catch {
            // Optional geolocation declined
          }
        }
        const res = await fetch('/api/ai/discover-places', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: prompt, ...coords }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao buscar lugares.');
        setPlacesResult(data);
      } else {
        const catalogContext = events.slice(0, 8).map((ev) => ({
          title: ev.title,
          category: ev.category,
          neighborhood: ev.neighborhood,
          dateISO: ev.dateISO,
          startTime: ev.startTime,
          ageRating: ev.ageRating,
          priceLabel: ev.priceLabel || ev.priceType,
          isDemoExample: ev.isDemoExample,
        }));
        const res = await fetch('/api/ai/plan-roteiro', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mood: prompt,
            neighborhood,
            budget,
            ageGroup,
            catalogContext,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao gerar roteiro.');
        setRoteiroResult(data.plan);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao consultar curadoria.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-[#1C1C20] text-[#F7F7F5] border border-[#28282E] rounded-2xl p-6 sm:p-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-[#28282E]">
        <div>
          <p className="font-label text-xs font-bold uppercase tracking-[0.14em] text-[#5265FF] mb-1.5 inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Curadoria em Porto Alegre
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold italic uppercase tracking-tight">
            Descubra programação real e monte seu roteiro
          </h2>
        </div>

        <div className="flex flex-wrap gap-1.5 bg-[#101012] p-1.5 rounded-xl border border-[#28282E]">
          <button
            type="button"
            onClick={() => setMode('search')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
              mode === 'search'
                ? 'bg-[#5265FF] text-white'
                : 'text-[#98989F] hover:text-[#F7F7F5]'
            }`}
          >
            <Globe className="w-3.5 h-3.5" /> Agenda Web
          </button>
          <button
            type="button"
            onClick={() => setMode('places')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
              mode === 'places'
                ? 'bg-[#5265FF] text-white'
                : 'text-[#98989F] hover:text-[#F7F7F5]'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" /> Lugares no Mapa
          </button>
          <button
            type="button"
            onClick={() => setMode('roteiro')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
              mode === 'roteiro'
                ? 'bg-[#FF5A36] text-[#101012]'
                : 'text-[#98989F] hover:text-[#F7F7F5]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" /> Roteiro da Noite
          </button>
        </div>
      </div>

      <form onSubmit={runAction} className="mt-6 space-y-4">
        {mode === 'roteiro' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#98989F] mb-1.5">
                Região preferida
              </label>
              <select
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="w-full h-11 rounded-xl bg-[#101012] border border-[#28282E] px-3 text-sm text-[#F7F7F5] focus:border-[#FF5A36] focus:outline-none"
              >
                <option value="Cidade Baixa">Cidade Baixa</option>
                <option value="Moinhos de Vento">Moinhos de Vento</option>
                <option value="Bom Fim">Bom Fim</option>
                <option value="Quarto Distrito">Quarto Distrito</option>
                <option value="Centro Histórico">Centro Histórico</option>
                <option value="Orla do Guaíba">Orla do Guaíba</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#98989F] mb-1.5">
                Orçamento
              </label>
              <select
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full h-11 rounded-xl bg-[#101012] border border-[#28282E] px-3 text-sm text-[#F7F7F5] focus:border-[#FF5A36] focus:outline-none"
              >
                <option value="Gratuito / Rolê 0800">Gratuito / Rolê 0800</option>
                <option value="Até R$ 50">Até R$ 50</option>
                <option value="Entre R$ 50 e R$ 120">Entre R$ 50 e R$ 120</option>
                <option value="Sem limite definido">Flexível</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#98989F] mb-1.5">
                Faixa etária
              </label>
              <select
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value as '18+' | 'menor')}
                className="w-full h-11 rounded-xl bg-[#101012] border border-[#28282E] px-3 text-sm text-[#F7F7F5] focus:border-[#FF5A36] focus:outline-none"
              >
                <option value="18+">Adultos (18+)</option>
                <option value="menor">Inclui menores de 18 anos (Livre / 16+)</option>
              </select>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              mode === 'search'
                ? 'Ex: agenda cultural gratuita em Porto Alegre neste fim de semana'
                : mode === 'places'
                  ? 'Ex: bares com música ao vivo ou pátio aberto no Bom Fim e Cidade Baixa'
                  : 'Ex: sexta à noite com amigos, primeiro bar tranquilo depois pista eletrônica'
            }
            aria-label="Consulta de curadoria em Porto Alegre"
            className="flex-1 h-12 rounded-xl bg-[#101012] border border-[#28282E] focus:border-[#5265FF] px-4 text-sm text-[#F7F7F5] placeholder:text-[#98989F] focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="h-12 rounded-xl bg-[#FF5A36] hover:bg-[#FF6F4F] disabled:opacity-60 text-[#101012] font-extrabold text-xs uppercase tracking-wider px-6 inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 transition-colors"
          >
            <Send className="w-4 h-4" />
            <span>{loading ? 'Consultando...' : 'Consultar'}</span>
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-5 p-4 rounded-xl border border-red-400/50 bg-[#101012] text-sm text-[#F7F7F5]">
          {error}
        </div>
      )}

      {mode === 'search' && searchResult && (
        <div className="mt-6 pt-6 border-t border-[#28282E] space-y-4">
          <div className="text-sm text-[#F7F7F5] whitespace-pre-line leading-relaxed">
            {searchResult.text}
          </div>
          {searchResult.sources.length > 0 && (
            <div>
              <p className="font-label text-xs font-bold uppercase tracking-wider text-[#98989F] mb-2">
                Fontes consultadas
              </p>
              <ul className="space-y-1.5">
                {searchResult.sources.map((src, idx) => (
                  <li key={`${src.uri}-${idx}`}>
                    <a
                      href={src.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#98989F] hover:text-[#FF5A36] inline-flex items-center gap-1.5 underline"
                    >
                      <span>{src.title}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {mode === 'places' && placesResult && (
        <div className="mt-6 pt-6 border-t border-[#28282E] space-y-4">
          <div className="text-sm text-[#F7F7F5] whitespace-pre-line leading-relaxed">
            {placesResult.text}
          </div>
          {placesResult.places.length > 0 && (
            <div>
              <p className="font-label text-xs font-bold uppercase tracking-wider text-[#98989F] mb-2">
                Locais encontrados no mapa
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {placesResult.places.map((p, idx) => (
                  <div
                    key={`${p.title}-${idx}`}
                    className="p-3.5 rounded-xl bg-[#101012] border border-[#28282E] flex items-center justify-between gap-3"
                  >
                    <span className="text-xs font-semibold text-[#F7F7F5] truncate">
                      {p.title}
                    </span>
                    {p.uri && (
                      <a
                        href={p.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold uppercase tracking-wider text-[#5265FF] inline-flex items-center gap-1 shrink-0 hover:underline"
                      >
                        Maps <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {mode === 'roteiro' && roteiroResult && (
        <div className="mt-6 pt-6 border-t border-[#28282E]">
          <p className="font-label text-xs font-bold uppercase tracking-wider text-[#FF5A36] mb-2">
            Roteiro sugerido (respeitando classificação etária)
          </p>
          <div className="text-sm text-[#F7F7F5] whitespace-pre-line leading-relaxed">
            {roteiroResult}
          </div>
        </div>
      )}
    </section>
  );
};
