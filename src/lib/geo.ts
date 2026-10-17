export interface GeoPoint {
  lat: number;
  lng: number;
}

const KM_PER_DEG_LAT = 111.32;

function kmPerDegLng(lat: number): number {
  return KM_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}

/** Длина отрезка A→B в километрах (плоская аппроксимация, точность достаточна для города). */
export function segmentLengthKm(a: GeoPoint, b: GeoPoint): number {
  const dx = (b.lng - a.lng) * kmPerDegLng((a.lat + b.lat) / 2);
  const dy = (b.lat - a.lat) * KM_PER_DEG_LAT;
  return Math.hypot(dx, dy);
}

/**
 * Проекция точки на отрезок A→B: расстояние до отрезка (км)
 * и доля пути (0 — у точки A, 1 — у точки B).
 */
export function projectOnSegment(point: GeoPoint, a: GeoPoint, b: GeoPoint): { distanceKm: number; fraction: number } {
  const px = (point.lng - a.lng) * kmPerDegLng((a.lat + b.lat) / 2);
  const py = (point.lat - a.lat) * KM_PER_DEG_LAT;
  const bx = (b.lng - a.lng) * kmPerDegLng((a.lat + b.lat) / 2);
  const by = (b.lat - a.lat) * KM_PER_DEG_LAT;

  const lengthSq = bx * bx + by * by;
  if (lengthSq === 0) {
    return { distanceKm: Math.hypot(px, py), fraction: 0 };
  }

  const t = Math.max(0, Math.min(1, (px * bx + py * by) / lengthSq));
  const dx = px - t * bx;
  const dy = py - t * by;
  return { distanceKm: Math.hypot(dx, dy), fraction: t };
}

/** Приблизительное расстояние между координатами (км), формула haversine. */
export function approxDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
