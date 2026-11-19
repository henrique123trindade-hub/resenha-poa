import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';
import { Compass, Minus, Navigation, Plus, X } from 'lucide-react';
import {
  POA_DEFAULT_CENTER,
  buildDirectionsUrl,
  isValidCoordinate,
  resolveMapCenter,
} from '../utils/mapHelpers';

export interface MapMarkerItem {
  id: string;
  type: 'event' | 'venue';
  title: string;
  subtitle: string;
  neighborhood: string;
  slug: string;
  lat: number;
  lng: number;
  isDemoExample?: boolean;
}

interface PoaMapViewProps {
  markers: MapMarkerItem[];
  center?: { lat: number; lng: number };
  zoom?: number;
  selectedId?: string | null;
  onSelectMarker?: (id: string) => void;
  heightClass?: string;
}

const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

function createMonochromePinIcon(type: 'event' | 'venue', isSelected: boolean): L.DivIcon {
  const fill = type === 'event' ? '#F4F4F2' : '#858585';
  const innerDot = '#080808';
  const size = isSelected ? 36 : 28;
  const height = isSelected ? 44 : 34;

  const halo = isSelected
    ? `<circle cx="18" cy="17" r="15" fill="rgba(244,244,242,0.22)" />`
    : '';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${height}" viewBox="0 0 36 44" fill="none" aria-hidden="true">
      ${halo}
      <path d="M18 3C10.82 3 5 8.82 5 16C5 25.5 18 41 18 41C18 41 31 25.5 31 16C31 8.82 25.18 3 18 3Z"
        fill="${fill}"
        stroke="#080808"
        stroke-width="2.5"
        stroke-linejoin="round"
      />
      <circle cx="18" cy="15.5" r="4.5" fill="${innerDot}" />
    </svg>
  `;

  return L.divIcon({
    className: 'resenha-pin-icon',
    html: svg,
    iconSize: [size, height],
    iconAnchor: [size / 2, height - 2],
    tooltipAnchor: [0, -(height - 4)],
  });
}

export const PoaMapView: React.FC<PoaMapViewProps> = ({
  markers,
  center,
  zoom = 13,
  selectedId,
  onSelectMarker,
  heightClass,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelectMarker);
  onSelectRef.current = onSelectMarker;

  const [activeId, setActiveId] = useState<string | null>(selectedId ?? null);

  useEffect(() => {
    if (selectedId !== undefined) {
      setActiveId(selectedId);
    }
  }, [selectedId]);

  const validMarkers = useMemo(
    () => markers.filter((m) => isValidCoordinate(m.lat, m.lng)),
    [markers],
  );

  const activeMarker = useMemo(
    () => validMarkers.find((m) => m.id === activeId) ?? null,
    [validMarkers, activeId],
  );

  // Initialize Leaflet map once
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const initialCenter = resolveMapCenter(validMarkers, { center, selectedId });
    const map = L.map(el, {
      center: [initialCenter.lat, initialCenter.lng],
      zoom,
      zoomControl: false,
      scrollWheelZoom: true,
      attributionControl: true,
    });

    map.attributionControl.setPrefix(false);

    L.tileLayer(OSM_TILE_URL, {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
    }).addTo(map);

    const group = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerGroupRef.current = group;

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    resizeObserver.observe(el);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
    // Mount once; updates are synced via dedicated effects below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reconcile markers whenever marker list or active selection changes
  useEffect(() => {
    const group = layerGroupRef.current;
    if (!group) return;

    group.clearLayers();

    validMarkers.forEach((item) => {
      const isSelected = activeId === item.id;
      const marker = L.marker([item.lat, item.lng], {
        icon: createMonochromePinIcon(item.type, isSelected),
        title: item.title,
        alt: `${item.type === 'event' ? 'Evento' : 'Bar'}: ${item.title} (${item.neighborhood})`,
        zIndexOffset: isSelected ? 1000 : item.type === 'event' ? 200 : 100,
      });

      marker.bindTooltip(item.title, {
        direction: 'top',
        offset: [0, -2],
        className: 'resenha-map-tooltip',
      });

      marker.on('click', () => {
        setActiveId(item.id);
        onSelectRef.current?.(item.id);
      });

      marker.addTo(group);
    });
  }, [validMarkers, activeId]);

  // Smoothly pan/zoom when explicit center, zoom, or active marker changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let target: { lat: number; lng: number } | null = null;
    let targetZoom = zoom;

    if (center && isValidCoordinate(center.lat, center.lng)) {
      target = center;
    } else if (activeMarker) {
      target = { lat: activeMarker.lat, lng: activeMarker.lng };
      targetZoom = Math.max(map.getZoom(), 14);
    }

    if (!target) return;

    const current = map.getCenter();
    const moved =
      Math.abs(current.lat - target.lat) > 0.0001 ||
      Math.abs(current.lng - target.lng) > 0.0001 ||
      map.getZoom() !== targetZoom;

    if (moved) {
      map.setView([target.lat, target.lng], targetZoom, {
        animate: !prefersReducedMotion,
        duration: 0.45,
      });
    }
  }, [center?.lat, center?.lng, zoom, activeMarker?.id]);

  const handleZoomIn = () => {
    mapRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapRef.current?.zoomOut();
  };

  const handleRecenter = () => {
    const map = mapRef.current;
    if (!map) return;

    if (validMarkers.length > 1) {
      const bounds = L.latLngBounds(validMarkers.map((m) => [m.lat, m.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
    } else if (validMarkers.length === 1) {
      map.setView([validMarkers[0].lat, validMarkers[0].lng], 15, { animate: true });
    } else {
      map.setView([POA_DEFAULT_CENTER.lat, POA_DEFAULT_CENTER.lng], 13, { animate: true });
    }
  };

  return (
    <div
      data-testid="poa-interactive-map"
      className={`relative isolate w-full ${heightClass || 'h-[480px]'} rounded-md overflow-hidden border border-[#292929] bg-[#080808]`}
    >
      {/* Leaflet mount surface */}
      <div
        ref={containerRef}
        className="resenha-leaflet-map w-full h-full z-0"
        aria-label="Mapa interativo de Porto Alegre"
      />

      {/* Custom monochrome map controls */}
      <div className="absolute top-3 right-3 z-[450] flex flex-col gap-1.5">
        <button
          type="button"
          onClick={handleZoomIn}
          aria-label="Aproximar mapa"
          className="w-9 h-9 rounded bg-[#080808]/90 hover:bg-[#1E1E1E] border border-[#292929] hover:border-[#F4F4F2] text-[#F4F4F2] flex items-center justify-center transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          aria-label="Afastar mapa"
          className="w-9 h-9 rounded bg-[#080808]/90 hover:bg-[#1E1E1E] border border-[#292929] hover:border-[#F4F4F2] text-[#F4F4F2] flex items-center justify-center transition-colors"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleRecenter}
          aria-label="Enquadrar pontos em Porto Alegre"
          title="Enquadrar pontos em Porto Alegre"
          className="w-9 h-9 rounded bg-[#080808]/90 hover:bg-[#1E1E1E] border border-[#292929] hover:border-[#F4F4F2] text-[#F4F4F2] flex items-center justify-center transition-colors"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>

      {/* Empty-filter notice */}
      {validMarkers.length === 0 && (
        <div className="absolute top-3 left-3 z-[450] max-w-xs rounded bg-[#141414]/95 border border-[#292929] px-3.5 py-2.5 text-xs text-[#858585]">
          Nenhum ponto encontrado com os filtros atuais em Porto Alegre.
        </div>
      )}

      {/* Selected point floating detail card */}
      {activeMarker && (
        <div
          role="region"
          aria-label={`Detalhes de ${activeMarker.title}`}
          className="absolute left-3 right-3 sm:right-auto sm:w-[320px] bottom-3 z-[450] rounded-md bg-[#141414]/95 border border-[#292929] p-4 shadow-2xl"
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="font-label text-[10px] font-bold uppercase tracking-[0.14em] text-[#858585]">
              {activeMarker.type === 'event' ? 'Evento' : 'Bar'} · {activeMarker.neighborhood}
            </p>
            <button
              type="button"
              onClick={() => setActiveId(null)}
              aria-label={`Fechar detalhes de ${activeMarker.title}`}
              className="text-[#858585] hover:text-[#F4F4F2] transition-colors p-0.5 -mt-0.5 -mr-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="font-display font-extrabold uppercase text-xl leading-tight text-[#F4F4F2] mb-1">
            {activeMarker.title}
          </p>
          <p className="text-xs text-[#A3A3A3] mb-3.5 line-clamp-2">{activeMarker.subtitle}</p>

          <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-[#292929]">
            <Link
              to={
                activeMarker.type === 'event'
                  ? `/eventos/${activeMarker.slug}`
                  : `/bares/${activeMarker.slug}`
              }
              className="text-xs font-bold uppercase tracking-wider text-[#F4F4F2] hover:underline"
            >
              Abrir página →
            </Link>
            <a
              href={buildDirectionsUrl(activeMarker.lat, activeMarker.lng, activeMarker.title)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#858585] hover:text-[#F4F4F2] transition-colors"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Como chegar</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
