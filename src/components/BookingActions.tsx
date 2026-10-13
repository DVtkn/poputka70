"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Star, XCircle } from "lucide-react";
import { apiError } from "@/lib/api-client";

export default function BookingActions({
  bookingId,
  canCancel,
  canPay,
  canReview,
}: {
  bookingId: string;
  canCancel: boolean;
  canPay: boolean;
  canReview: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
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

  const pay = () =>
    run(async () => {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const data = (await res.json().catch(() => null)) as
        | { success?: boolean; paymentUrl?: string | null }
        | null;

      if (res.ok && data?.success && data.paymentUrl) {
        window.location.href = data.paymentUrl;
        return;
      }

      const parsed = apiError(data, "Онлайн-оплата сейчас недоступна.");
      if (parsed.code === "PAYMENT_REQUIRED") {
        setNotice(parsed.message);
      } else {
        setError(parsed.message);
      }
    });

  const cancel = () => {
    if (!window.confirm("Отменить бронь? Место вернётся в общий доступ.")) return;
    return run(async () => {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, { method: "POST" });
      const data = (await res.json().catch(() => null)) as { success?: boolean; refunded?: boolean } | null;

      if (!res.ok || !data?.success) {
        setError(apiError(data, "Не получилось отменить бронь").message);
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
      const data = (await res.json().catch(() => null)) as { success?: boolean } | null;

      if (!res.ok || !data?.success) {
        setError(apiError(data, "Не получилось отправить отзыв").message);
        return;
      }
      setReviewOpen(false);
      router.refresh();
    });

  const hasActions = canCancel || canPay || canReview;
  if (!hasActions && !notice && !error) return null;

  return (
    <div className="mt-4 pt-4 border-t border-fog/60">
      {notice && <p className="text-sm text-frost-dark mb-3">{notice}</p>}
      {error && (
        <p className="text-sm text-ember mb-3" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {canPay && (
          <button type="button" onClick={() => void pay()} disabled={busy} className="btn-primary px-4 py-2.5 text-sm">
            <CreditCard className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
            Оплатить сервисный сбор
          </button>
        )}
        {canReview && !reviewOpen && (
          <button
            type="button"
            onClick={() => setReviewOpen(true)}
            className="btn-secondary px-4 py-2.5 text-sm"
          >
            <Star className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
            Оставить отзыв
          </button>
        )}
        {canCancel && (
          <button
            type="button"
            onClick={() => void cancel()}
            disabled={busy}
            className="btn-secondary px-4 py-2.5 text-sm text-frost-dark"
          >
            <XCircle className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
            Отменить бронь
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
            onChange={(e) => setComment(e.target.value)}
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
            <button
              type="button"
              onClick={() => setReviewOpen(false)}
              className="btn-secondary px-4 py-2.5 text-sm"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
