export interface GeoPoint {
  lat: number;
  lng: number;
}

export const POA_DEFAULT_CENTER: GeoPoint = {
  lat: -30.0346,
  lng: -51.2177,
};

/**
 * Validates that coordinates are finite geographic numbers within valid WGS84 ranges.
 */
export function isValidCoordinate(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Computes great-circle distance in kilometers between two coordinates using Haversine formula.
 */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * Resolves the effective map center prioritizing an explicit valid center,
 * then the selected marker, then the first valid marker, and finally Porto Alegre default center.
 */
export function resolveMapCenter<T extends { id: string; lat: number; lng: number }>(
  markers: T[],
  options?: { center?: GeoPoint; selectedId?: string | null },
): GeoPoint {
  if (options?.center && isValidCoordinate(options.center.lat, options.center.lng)) {
    return options.center;
  }

  if (options?.selectedId) {
    const selected = markers.find((m) => m.id === options.selectedId);
    if (selected && isValidCoordinate(selected.lat, selected.lng)) {
      return { lat: selected.lat, lng: selected.lng };
    }
  }

  const firstValid = markers.find((m) => isValidCoordinate(m.lat, m.lng));
  if (firstValid) {
    return { lat: firstValid.lat, lng: firstValid.lng };
  }

  return POA_DEFAULT_CENTER;
}

/**
 * Builds an external directions URL opening the destination directly on OpenStreetMap / Google Maps.
 */
export function buildDirectionsUrl(lat: number, lng: number, label?: string): string {
  const query = label ? `${lat},${lng} (${label})` : `${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
