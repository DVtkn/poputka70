"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

interface TripShareButtonProps {
  origin: string;
  dest: string;
  dateStr: string;
  timeStr: string;
  availableSeats: number;
  price: number;
}

export default function TripShareButton({
  origin,
  dest,
  dateStr,
  timeStr,
  availableSeats,
  price,
}: TripShareButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "fallback">("idle");

  const getShareText = () => {
    const url = typeof window !== "undefined" ? window.location.href : "https://poputka70.vercel.app";
    return `Попутка в Томске: ${origin} → ${dest}\n${dateStr} в ${timeStr}\nМест: ${availableSeats} · от ${price} ₽\nБронь без комиссии:\n${url}`;
  };

  const handleShare = async () => {
    const shareText = getShareText();
    const url = typeof window !== "undefined" ? window.location.href : "https://poputka70.vercel.app";

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Попутка ${origin} → ${dest}`,
          text: shareText,
          url,
        });
        return;
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setStatus("copied");
      setTimeout(() => setStatus("idle"), 2500);
    } catch {
      setStatus("fallback");
      setTimeout(() => setStatus("idle"), 3500);
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
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
