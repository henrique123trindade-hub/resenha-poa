import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LocateFixed, MapPin } from 'lucide-react';
import { useCatalog } from '../contexts/CatalogContext';
import { PoaMapView, type MapMarkerItem } from '../components/PoaMapView';
import { SectionKicker } from '../components/BrandMark';
import { filterAndSortEvents } from '../utils/eventFilters';
import { formatEventDatePtBr } from '../utils/datePoa';
import { haversineKm } from '../utils/mapHelpers';
import type { EventCategoryId, QuickDateFilter } from '../types/resenha';

export const MapPage: React.FC = () => {
  const { events, venues, categories } = useCatalog();
  const [searchParams] = useSearchParams();
  const [kindFilter, setKindFilter] = useState<'all' | 'event' | 'venue'>('all');
  const [category, setCategory] = useState<EventCategoryId | 'todos'>('todos');
  const [quickDate, setQuickDate] = useState<QuickDateFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);

  const handleRequestLocation = () => {
    if (!('geolocation' in navigator)) {
      setGeoStatus('Seu navegador não suporta geolocalização.');
      return;
    }
    setGeoStatus('Obtendo localização aproximada...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus('Ordenado pelos pontos mais próximos de você.');
      },
      () => {
        setGeoStatus('Localização não autorizada. Exibindo centro de Porto Alegre.');
      },
      { timeout: 6000 },
    );
  };

  useEffect(() => {
    if (searchParams.get('perto') === '1' && !userPos) {
      setGeoStatus('Clique em "Perto de ti" para ordenar pelos pontos mais próximos da tua localização.');
    }
  }, [searchParams, userPos]);

  const filteredEvents = useMemo(
    () =>
      filterAndSortEvents(events, {
        category,
        quickDate,
        includeCancelled: false,
      }),
    [events, category, quickDate],
  );

  const markers: MapMarkerItem[] = useMemo(() => {
    const evList: MapMarkerItem[] =
      kindFilter === 'venue'
        ? []
        : filteredEvents
            .filter((e) => typeof e.lat === 'number' && typeof e.lng === 'number')
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

    const vList: MapMarkerItem[] =
      kindFilter === 'event'
        ? []
        : venues
            .filter(
              (v) =>
                v.status === 'published' &&
                typeof v.lat === 'number' &&
                typeof v.lng === 'number',
            )
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

    const combined = [...evList, ...vList];
    if (userPos) {
      combined.sort(
        (a, b) =>
          haversineKm(userPos, { lat: a.lat, lng: a.lng }) -
          haversineKm(userPos, { lat: b.lat, lng: b.lng }),
      );
    }
    return combined;
  }, [filteredEvents, venues, kindFilter, userPos]);

  const mapCenter = useMemo(() => {
    const selected = markers.find((m) => m.id === selectedId);
    if (selected) return { lat: selected.lat, lng: selected.lng };
    if (userPos) return userPos;
    return { lat: -30.0346, lng: -51.2177 };
  }, [markers, selectedId, userPos]);

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 text-[#F7F7F5]">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-[#28282E] mb-6">
        <div>
          <SectionKicker
            label="Geolocalização · Porto Alegre"
            tone="on-dark"
            accentClass="bg-[#5265FF]"
          />
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold italic uppercase tracking-tight">
            Mapa interativo de rolês
          </h1>
        </div>
        <button
          type="button"
          onClick={handleRequestLocation}
          className="px-5 py-2.5 rounded-full bg-[#5265FF] hover:bg-[#6475ff] text-[#F7F7F5] text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 self-start lg:self-auto transition-colors"
        >
          <LocateFixed className="w-4 h-4" />
          <span>Perto de ti</span>
        </button>
      </div>

      {geoStatus && <p className="text-xs font-medium text-[#D5FF52] mb-4">{geoStatus}</p>}

      {/* Map Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#1C1C20] border border-[#28282E] rounded-2xl p-4 sm:p-5 mb-6">
        <div>
          <label
            htmlFor="map-kind"
            className="block text-[11px] font-bold uppercase tracking-wider text-[#98989F] mb-1.5"
          >
            Exibir no mapa
          </label>
          <select
            id="map-kind"
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as 'all' | 'event' | 'venue')}
            className="w-full h-10 px-3 bg-[#101012] border border-[#28282E] focus:border-[#FF5A36] rounded-xl text-xs font-medium text-[#F7F7F5] focus:outline-none"
          >
            <option value="all">Eventos e bares</option>
            <option value="event">Somente eventos</option>
            <option value="venue">Somente bares</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="map-cat"
            className="block text-[11px] font-bold uppercase tracking-wider text-[#98989F] mb-1.5"
          >
            Categoria de evento
          </label>
          <select
            id="map-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value as EventCategoryId | 'todos')}
            className="w-full h-10 px-3 bg-[#101012] border border-[#28282E] focus:border-[#FF5A36] rounded-xl text-xs font-medium text-[#F7F7F5] focus:outline-none"
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
            htmlFor="map-date"
            className="block text-[11px] font-bold uppercase tracking-wider text-[#98989F] mb-1.5"
          >
            Data dos eventos
          </label>
          <select
            id="map-date"
            value={quickDate}
            onChange={(e) => setQuickDate(e.target.value as QuickDateFilter)}
            className="w-full h-10 px-3 bg-[#101012] border border-[#28282E] focus:border-[#FF5A36] rounded-xl text-xs font-medium text-[#F7F7F5] focus:outline-none"
          >
            <option value="all">Todas as datas</option>
            <option value="today">Hoje</option>
            <option value="tomorrow">Amanhã</option>
            <option value="weekend">Fim de semana</option>
            <option value="friday">Sexta</option>
            <option value="saturday">Sábado</option>
            <option value="sunday">Domingo</option>
          </select>
        </div>
      </div>

      {/* Synced Map + List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <PoaMapView
            markers={markers}
            center={mapCenter}
            zoom={selectedId ? 15 : 13}
            selectedId={selectedId}
            onSelectMarker={setSelectedId}
            heightClass="h-[520px]"
          />
        </div>

        <div className="lg:col-span-4 bg-[#1C1C20] border border-[#28282E] rounded-2xl p-4 flex flex-col max-h-[520px]">
          <div className="pb-3 border-b border-[#28282E] flex items-center justify-between gap-2 text-xs">
            <span className="font-bold uppercase tracking-wider text-[#F7F7F5]">
              Pontos mapeados ({markers.length})
            </span>
            <span className="text-[11px] text-[#98989F]">
              <span className="text-[#FF5A36] font-semibold">Laranja</span>: eventos ·{' '}
              <span className="text-[#5265FF] font-semibold">Azul</span>: bares
            </span>
          </div>

          <div className="overflow-y-auto divide-y divide-[#28282E] flex-1">
            {markers.map((m) => {
              const active = selectedId === m.id;
              return (
                <div
                  key={m.id}
                  className={`p-3.5 transition-colors rounded-lg ${
                    active ? 'bg-[#25252B]' : 'hover:bg-[#101012]/60'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(m.id)}
                    className="w-full text-left space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
                      <span className={m.type === 'event' ? 'text-[#FF5A36]' : 'text-[#5265FF]'}>
                        {m.type === 'event' ? 'Evento' : 'Bar'} ·{' '}
                        <span className="text-[#98989F]">{m.neighborhood}</span>
                      </span>
                      {userPos && (
                        <span className="tabular-nums text-[#D5FF52]">
                          {haversineKm(userPos, { lat: m.lat, lng: m.lng }).toFixed(1)} km
                        </span>
                      )}
                    </div>
                    <p className="font-display font-bold uppercase text-base text-[#F7F7F5] flex items-center gap-1.5">
                      <MapPin
                        className={`w-3.5 h-3.5 shrink-0 ${
                          m.type === 'event' ? 'text-[#FF5A36]' : 'text-[#5265FF]'
                        }`}
                      />
                      <span>{m.title}</span>
                    </p>
                    <p className="text-xs text-[#98989F]">{m.subtitle}</p>
                  </button>
                  <Link
                    to={m.type === 'event' ? `/eventos/${m.slug}` : `/bares/${m.slug}`}
                    className="inline-block mt-2 text-xs font-bold uppercase tracking-wider text-[#F7F7F5] hover:text-[#FF5A36] transition-colors"
                  >
                    Ver ficha completa →
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
