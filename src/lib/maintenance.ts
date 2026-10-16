import { completeTrips, processConfirmationDeadlines, startConfirmedTrips } from "@/lib/cron";

let lastSweepAt = 0;
const SWEEP_INTERVAL_MS = 60_000;

/**
 * Ленивый досчёт статусов поездок: «подтверждена → в пути → завершена».
 * Вызывается на страницах и в ленте, поэтому корректная механика работает
 * даже при суточном кроне (тариф Vercel Hobby). Идемпотентно, батчами, с троттлингом.
 */
export async function sweepTripStatuses(): Promise<void> {
  const now = Date.now();
  if (now - lastSweepAt < SWEEP_INTERVAL_MS) return;
  lastSweepAt = now;

  try {
    await processConfirmationDeadlines();
    await startConfirmedTrips();
    await completeTrips();
  } catch (error) {
    console.error("[maintenance] досчёт статусов не удался:", error);
  }
}
