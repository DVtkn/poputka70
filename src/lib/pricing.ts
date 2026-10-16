export const PRICING_CONFIG = {
  baseRatePerKm: 8,
  minPrice: 50,
  timeMultipliers: {
    peakMorning: 1.2,
    peakEvening: 1.3,
    night: 1.5,
    normal: 1.0,
  },
  // Сервисный сбор платформы: 0 на старте — Попутка70 бесплатна. Включается одной правкой, когда решишь монетизировать.
  serviceFeePercent: 0,
};

export function calculateCompensation(distanceKm: number, departureTime: string): number {
  const [hours] = departureTime.split(":").map(Number);
  let multiplier = PRICING_CONFIG.timeMultipliers.normal;

  if (hours >= 7 && hours <= 9) multiplier = PRICING_CONFIG.timeMultipliers.peakMorning;
  else if (hours >= 17 && hours <= 19) multiplier = PRICING_CONFIG.timeMultipliers.peakEvening;
  else if (hours >= 22 || hours <= 6) multiplier = PRICING_CONFIG.timeMultipliers.night;

  const base = distanceKm * PRICING_CONFIG.baseRatePerKm * multiplier;
  return Math.max(Math.round(base / 10) * 10, PRICING_CONFIG.minPrice);
}

export function calculateServiceFee(compensation: number): number {
  return Math.round(compensation * (PRICING_CONFIG.serviceFeePercent / 100));
}

export function calculateTotal(compensation: number): number {
  return compensation + calculateServiceFee(compensation);
}

export function getPricingVersion(): string {
  return "v1.0";
}

interface OsrmResponse {
  code?: string;
  routes?: Array<{ distance?: number }>;
}

const DISTANCE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const DISTANCE_CACHE_MAX = 1000;
const OSRM_TIMEOUT_MS = 4000;

const distanceCache = new Map<string, { km: number; expiresAt: number }>();

function cacheKey(originLat: number, originLng: number, destLat: number, destLng: number): string {
  return `${originLat.toFixed(4)},${originLng.toFixed(4)};${destLat.toFixed(4)},${destLng.toFixed(4)}`;
}

function haversineKm(originLat: number, originLng: number, destLat: number, destLng: number): number {
  const R = 6371;
  const dLat = ((destLat - originLat) * Math.PI) / 180;
  const dLng = ((destLng - originLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((originLat * Math.PI) / 180) *
      Math.cos((destLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 1.3 * 10) / 10;
}

async function computeDistanceKm(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<number> {
  const routingProvider = process.env.ROUTING_PROVIDER || "osrm";

  if (routingProvider === "osrm") {
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=false`,
        {
          headers: { "User-Agent": "Poputka70/1.0" },
          signal: AbortSignal.timeout(OSRM_TIMEOUT_MS),
        }
      );
      if (response.ok) {
        const data = (await response.json()) as OsrmResponse;
        const meters = data.routes?.[0]?.distance;
        if (data.code === "Ok" && typeof meters === "number") {
          return Math.round((meters / 1000) * 10) / 10;
        }
      }
    } catch (error) {
      console.error("OSRM error:", error);
    }
  }

  return haversineKm(originLat, originLng, destLat, destLng);
}

/** Дистанция с кэшем и таймаутом: внешние вызовы не должны тормозить транзакции. */
export async function getDistanceKm(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<number> {
  const key = cacheKey(originLat, originLng, destLat, destLng);
  const cached = distanceCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.km;

  const km = await computeDistanceKm(originLat, originLng, destLat, destLng);

  if (distanceCache.size >= DISTANCE_CACHE_MAX) distanceCache.clear();
  distanceCache.set(key, { km, expiresAt: Date.now() + DISTANCE_CACHE_TTL_MS });
  return km;
}
