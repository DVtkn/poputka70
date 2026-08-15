export const PRICING_CONFIG = {
  baseRatePerKm: 8,
  minPrice: 50,
  timeMultipliers: {
    peakMorning: 1.2,
    peakEvening: 1.3,
    night: 1.5,
    normal: 1.0,
  },
  serviceFeePercent: 15,
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

export async function getDistanceKm(originLat: number, originLng: number, destLat: number, destLng: number): Promise<number> {
  const routingProvider = process.env.ROUTING_PROVIDER || "osrm";

  if (routingProvider === "osrm") {
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=false`,
        { headers: { "User-Agent": "Poputka70/1.0" } }
      );
      const data = await response.json();
      if (data.code === "Ok" && data.routes?.[0]?.distance) {
        return Math.round(data.routes[0].distance / 1000 * 10) / 10;
      }
    } catch (e) {
      console.error("OSRM error:", e);
    }
  }

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

export function getPricingVersion(): string {
  return "v1.0";
}