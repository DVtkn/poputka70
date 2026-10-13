/** Текущее время в миллисекундах — вынесено из компонентов (правила чистоты React). */
export function nowMs(): number {
  return Date.now();
}

/** Томск — постоянный UTC+7 без перехода на летнее время. */
export const TOMSK_OFFSET_MS = 7 * 60 * 60 * 1000;

export interface TomskParts {
  year: number;
  month: number; // 0-11
  day: number;
  hours: number;
  minutes: number;
  dayOfWeek: number; // 1 (Пн) - 7 (Вс)
}

/** Календарные части «сейчас» по часам Томска. */
export function tomskParts(date: Date = new Date()): TomskParts {
  const shifted = new Date(date.getTime() + TOMSK_OFFSET_MS);
  const dow = shifted.getUTCDay();
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
    dayOfWeek: dow === 0 ? 7 : dow,
  };
}

/** UTC-полночь календарной даты Томска — формат колонок @db.Date. */
export function tomskTodayUtc(date: Date = new Date()): Date {
  const p = tomskParts(date);
  return new Date(Date.UTC(p.year, p.month, p.day));
}

export function addDaysUtc(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function dayOfWeekUtc(date: Date): number {
  const dow = date.getUTCDay();
  return dow === 0 ? 7 : dow;
}

export function isoDateUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Истинный UTC-инстант для пары (календарная дата Томска, местное время «ЧЧ:ММ»). */
export function instantFromTomsk(dateUtcMidnight: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const wallClockAsUtc = Date.UTC(
    dateUtcMidnight.getUTCFullYear(),
    dateUtcMidnight.getUTCMonth(),
    dateUtcMidnight.getUTCDate(),
    hours || 0,
    minutes || 0
  );
  return new Date(wallClockAsUtc - TOMSK_OFFSET_MS);
}

export function isSameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

export function formatTomskTime(date: Date, options?: Intl.DateTimeFormatOptions): string {
  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tomsk",
    ...options,
  });
}
