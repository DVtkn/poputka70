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
  const [copied, setCopied] = useState(false);

  const getShareText = () => {
    const url = typeof window !== "undefined" ? window.location.href : "https://poputka70.vercel.app";
    return `🚗 Попутка в Томске: ${origin} → ${dest}\n📅 ${dateStr} в ${timeStr}\n💺 Мест: ${availableSeats} · от ${price} ₽\nБронь без комиссии:\n${url}`;
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
        // Fallback to clipboard if user dismissed or native share unsupported
        if ((err as Error)?.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      alert("Скопируй ссылку из браузера");
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-fog bg-snow hover:bg-cloud text-xs font-medium text-taiga transition-colors"
      title="Поделиться поездкой в чате ЖК или соцсетях"
      aria-label="Поделиться поездкой"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-birch" strokeWidth={2} aria-hidden="true" />
          <span className="text-birch font-semibold">Скопировано!</span>
        </>
      ) : (
        <>
          <Share2 className="w-3.5 h-3.5 text-river" strokeWidth={2} aria-hidden="true" />
          <span>Поделиться</span>
        </>
      )}
    </button>
  );
}
