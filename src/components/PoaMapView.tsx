import React, { useEffect, useState } from 'react';
import {
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
  useApiLoadingStatus,
  APILoadingStatus,
} from '@vis.gl/react-google-maps';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';

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

const POA_DEFAULT_CENTER = { lat: -30.0346, lng: -51.2177 };

const SingleMarker: React.FC<{
  item: MapMarkerItem;
  isOpen: boolean;
  onSelect: (id: string) => void;
  onClose: () => void;
}> = ({ item, isOpen, onSelect, onClose }) => {
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: item.lat, lng: item.lng }}
        title={item.title}
        onClick={() => onSelect(item.id)}
      >
        <Pin
          background={item.type === 'event' ? '#F4F4F2' : '#858585'}
          borderColor="#080808"
          glyphColor="#080808"
          scale={isOpen ? 1.25 : 1}
        />
      </AdvancedMarker>

      {isOpen && marker && (
        <InfoWindow anchor={marker} onCloseClick={onClose} maxWidth={260}>
          <div className="bg-[#141414] text-[#F4F4F2] p-3 -m-1 min-w-[210px] rounded">
            <p className="font-label text-[10px] font-bold uppercase tracking-wider text-[#858585] mb-1">
              {item.type === 'event' ? 'Evento' : 'Bar'} · {item.neighborhood}
            </p>
            <p className="font-display font-extrabold uppercase text-base leading-snug mb-1">
              {item.title}
            </p>
            <p className="text-xs text-[#858585] mb-2">{item.subtitle}</p>
            <Link
              to={item.type === 'event' ? `/eventos/${item.slug}` : `/bares/${item.slug}`}
              className="inline-block text-xs font-bold uppercase tracking-wider text-[#F4F4F2] underline"
            >
              Abrir página →
            </Link>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

const InnerMapStatusWrapper: React.FC<
  PoaMapViewProps & { apiKey: string }
> = ({ markers, center, zoom, selectedId, onSelectMarker, heightClass }) => {
  const status = useApiLoadingStatus();
  const [activeId, setActiveId] = useState<string | null>(selectedId ?? null);

  useEffect(() => {
    if (selectedId !== undefined) {
      setActiveId(selectedId);
    }
  }, [selectedId]);

  if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) {
    return (
      <MapFallbackList
        markers={markers}
        reason="Não foi possível carregar o mapa interativo nesta sessão. Veja os locais cadastrados em Porto Alegre:"
      />
    );
  }

  return (
    <div
      className={`relative w-full ${heightClass || 'h-[480px]'} rounded-md overflow-hidden border border-[#292929] bg-[#141414]`}
    >
      <GoogleMap
        mapId="DEMO_MAP_ID"
        defaultCenter={center || POA_DEFAULT_CENTER}
        center={center}
        defaultZoom={zoom ?? 13}
        gestureHandling="greedy"
        colorScheme="DARK"
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        style={{ width: '100%', height: '100%' }}
      >
        {markers.map((item) => (
          <SingleMarker
            key={item.id}
            item={item}
            isOpen={activeId === item.id}
            onSelect={(id) => {
              setActiveId(id);
              onSelectMarker?.(id);
            }}
            onClose={() => setActiveId(null)}
          />
        ))}
      </GoogleMap>
    </div>
  );
};

const MapFallbackList: React.FC<{ markers: MapMarkerItem[]; reason: string }> = ({
  markers,
  reason,
}) => (
  <div className="rounded-md border border-[#292929] bg-[#141414] text-[#F4F4F2] p-6 space-y-4">
    <div className="flex items-start gap-3 pb-4 border-b border-[#292929]">
      <MapPin className="w-5 h-5 text-[#F4F4F2] shrink-0 mt-0.5" />
      <div>
        <p className="font-label text-xs font-bold uppercase tracking-wider text-[#F4F4F2]">
          Pontos em Porto Alegre
        </p>
        <p className="text-sm text-[#858585] mt-1">{reason}</p>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
      {markers.map((m) => (
        <Link
          key={m.id}
          to={m.type === 'event' ? `/eventos/${m.slug}` : `/bares/${m.slug}`}
          className="p-4 rounded bg-[#080808] border border-[#292929] hover:border-[#F4F4F2] transition-colors flex flex-col justify-between gap-1.5"
        >
          <span className="font-label text-[11px] font-bold uppercase tracking-wider text-[#858585]">
            {m.type === 'event' ? 'Evento' : 'Bar'} · {m.neighborhood}
          </span>
          <p className="font-display font-extrabold uppercase text-lg text-[#F4F4F2]">{m.title}</p>
          <p className="text-xs text-[#858585]">{m.subtitle}</p>
        </Link>
      ))}
    </div>
  </div>
);

export const PoaMapView: React.FC<PoaMapViewProps> = (props) => {
  const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const [apiKey, setApiKey] = useState<string>(
    envKey && envKey !== 'MY_GOOGLE_MAPS_API_KEY' ? envKey : '',
  );
  const [checkedServer, setCheckedServer] = useState(Boolean(apiKey));

  useEffect(() => {
    if (apiKey) return;
    let active = true;
    fetch('/api/maps-config')
      .then((res) => res.json())
      .then((data: { configured?: boolean; apiKey?: string }) => {
        if (active && data?.configured && data.apiKey) {
          setApiKey(data.apiKey);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setCheckedServer(true);
      });
    return () => {
      active = false;
    };
  }, [apiKey]);

  if (!checkedServer) {
    return (
      <div
        className={`w-full ${props.heightClass || 'h-[480px]'} rounded-md border border-[#292929] bg-[#141414] flex items-center justify-center text-sm text-[#858585]`}
      >
        Carregando mapa de Porto Alegre...
      </div>
    );
  }

  if (!apiKey) {
    return (
      <MapFallbackList
        markers={props.markers}
        reason="Chave do Google Maps Platform não detectada neste ambiente. Os locais cadastrados seguem disponíveis na lista abaixo."
      />
    );
  }

  return (
    <APIProvider apiKey={apiKey} libraries={['marker']} language="pt-BR" region="BR">
      <InnerMapStatusWrapper {...props} apiKey={apiKey} />
    </APIProvider>
  );
};
