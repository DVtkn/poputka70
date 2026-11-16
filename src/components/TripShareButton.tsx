"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { tgHaptics } from "@/lib/telegram-haptics";

export interface TripShareButtonProps {
  tripId?: string;
  origin: string;
  dest: string;
  dateStr: string;
  timeStr: string;
  availableSeats: number;
  price: number;
}

export function buildTripTmaUrl(tripId?: string, botUsername?: string): string {
  const bot = botUsername || process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "poputka70_tomsk_bot";
  if (!tripId) {
    return `https://t.me/${bot}/app`;
  }
  return `https://t.me/${bot}/app?startapp=trip_${tripId}`;
}

export function buildTripShareText(params: {
  origin: string;
  dest: string;
  dateStr: string;
  timeStr: string;
  availableSeats: number;
  price: number;
  url: string;
}): string {
  const { origin, dest, dateStr, timeStr, availableSeats, price, url } = params;
  return `Попутка в Томске: ${origin} → ${dest}\n${dateStr} в ${timeStr}\nМест: ${availableSeats} · от ${price} ₽\nБронь без комиссии:\n${url}`;
}

export function buildTelegramShareUrl(url: string, text: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

export default function TripShareButton({
  tripId,
  origin,
  dest,
  dateStr,
  timeStr,
  availableSeats,
  price,
}: TripShareButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "fallback">("idle");

  const handleShare = async () => {
    tgHaptics.selection();

    const tmaUrl = buildTripTmaUrl(tripId);
    const fallbackUrl =
      typeof window !== "undefined" && window.location.href
        ? window.location.href
        : `https://poputka70.vercel.app/trips/${tripId ?? ""}`;

    const shareUrlToUse = tripId ? tmaUrl : fallbackUrl;
    const shareText = buildTripShareText({
      origin,
      dest,
      dateStr,
      timeStr,
      availableSeats,
      price,
      url: shareUrlToUse,
    });

    // 1. Если внутри Telegram Mini App — открываем нативный диалог пересылки Telegram
    if (typeof window !== "undefined" && window.Telegram?.WebApp?.openTelegramLink) {
      const tgShareUrl = buildTelegramShareUrl(shareUrlToUse, shareText);
      try {
        window.Telegram.WebApp.openTelegramLink(tgShareUrl);
        return;
      } catch {
        // Fallback на стандартный шеринг
      }
    }

    // 2. Системный Web Share API (мобильные браузеры)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Попутка ${origin} → ${dest}`,
          text: shareText,
          url: shareUrlToUse,
        });
        return;
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
      }
    }

    // 3. Fallback в буфер обмена
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        setStatus("copied");
        setTimeout(() => setStatus("idle"), 2500);
      } else {
        setStatus("fallback");
        setTimeout(() => setStatus("idle"), 3500);
      }
    } catch {
      setStatus("fallback");
      setTimeout(() => setStatus("idle"), 3500);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleShare()}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-fog bg-snow hover:bg-fog/50 text-xs font-medium text-taiga transition-colors"
      title="Поделиться поездкой"
      aria-label="Поделиться поездкой"
    >
      {status === "copied" ? (
        <>
          <Check className="w-3.5 h-3.5 text-river" strokeWidth={2} aria-hidden="true" />
          <span className="text-river font-semibold">Скопировано</span>
        </>
      ) : status === "fallback" ? (
        <span className="text-frost-dark">Скопируйте ссылку из адресной строки</span>
      ) : (
        <>
          <Share2 className="w-3.5 h-3.5 text-river" strokeWidth={2} aria-hidden="true" />
          <span>Поделиться</span>
        </>
      )}
    </button>
  );
}
