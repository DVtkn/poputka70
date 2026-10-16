"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, XCircle } from "lucide-react";
import { apiError } from "@/lib/api-client";

export default function BookingActions({
  bookingId,
  canCancel,
  canReview,
}: {
  bookingId: string;
  canCancel: boolean;
  canReview: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    if (!window.confirm("Снять заявку? Водитель увидит, что место освободилось.")) return;
    return run(async () => {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, { method: "POST" });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setError(apiError(data, "Не получилось снять заявку").message);
        return;
      }
      router.refresh();
    });
  };

  const submitReview = () =>
    run(async () => {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, rating, comment }),
      });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setError(apiError(data, "Не получилось отправить отзыв").message);
        return;
      }
      setReviewOpen(false);
      router.refresh();
    });

  if (!canCancel && !canReview) return null;

  return (
    <div className="mt-4 pt-4 border-t border-fog/60">
      {error && (
        <p className="text-sm text-ember mb-3" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {canReview && !reviewOpen && (
          <button type="button" onClick={() => setReviewOpen(true)} className="btn-secondary px-4 py-2.5 text-sm">
            <Star className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
            Оставить отзыв
          </button>
        )}
        {canCancel && (
          <button
            type="button"
            onClick={() => void cancel()}
            disabled={busy}
            aria-busy={busy}
            className="btn-secondary px-4 py-2.5 text-sm text-frost-dark"
          >
            <XCircle className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
            Снять заявку
          </button>
        )}
      </div>

      {canReview && reviewOpen && (
        <div className="mt-4 rounded-xl border border-fog bg-snow p-4">
          <div className="flex items-center gap-1 mb-3" role="radiogroup" aria-label="Оценка поездки">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={rating === value}
                aria-label={`${value} из 5`}
                onClick={() => setRating(value)}
                className="p-1"
              >
                <Star
                  className={`w-6 h-6 ${value <= rating ? "text-birch fill-birch" : "text-fog fill-fog"}`}
                  strokeWidth={value <= rating ? 0 : 1.5}
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Как прошла поездка? (необязательно)"
            className="input w-full resize-none"
            aria-label="Комментарий к отзыву"
          />
          <div className="flex gap-2 mt-3">
            <button type="button" onClick={() => void submitReview()} disabled={busy} className="btn-primary px-4 py-2.5 text-sm">
              Отправить отзыв
            </button>
            <button type="button" onClick={() => setReviewOpen(false)} className="btn-secondary px-4 py-2.5 text-sm">
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
