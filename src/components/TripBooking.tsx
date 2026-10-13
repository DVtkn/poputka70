"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Info } from "lucide-react";
import PriceBreakdown from "@/components/ui/PriceBreakdown";
import AuthModal from "@/components/AuthModal";
import { apiError } from "@/lib/api-client";

export default function TripBooking({
  tripId,
  compensation,
  serviceFee,
  availableSeats,
}: {
  tripId: string;
  compensation: number;
  serviceFee: number;
  availableSeats: number;
}) {
  const [offerAccepted, setOfferAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [notice, setNotice] = useState("");
  const [showAuth, setShowAuth] = useState(false);

  const book = async () => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId }),
      });
      const data = (await res.json().catch(() => null)) as
        | { success?: boolean; booking?: { id: string } }
        | null;

      if (res.status === 401) {
        setShowAuth(true);
        return;
      }

      if (!res.ok || !data?.success) {
        setError(apiError(data, "Не удалось забронировать. Попробуй ещё раз.").message);
        return;
      }

      const bookingId = data.booking?.id;

      if (serviceFee > 0 && bookingId) {
        const payRes = await fetch("/api/payments/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId }),
        });
        const payData = (await payRes.json().catch(() => null)) as
          | { success?: boolean; paymentUrl?: string | null }
          | null;

        if (payRes.ok && payData?.success && payData.paymentUrl) {
          window.location.href = payData.paymentUrl;
          return;
        }

        // Бронь создана, но онлайн-оплата недоступна/не удалась — не теряем бронь
        setNotice(apiError(payData, "Онлайн-оплата сейчас недоступна.").message);
      }

      setSuccess(true);
    } catch {
      setError("Ошибка соединения. Проверь интернет и попробуй снова.");
    } finally {
      setLoading(false);
    }
  };

  const handleBook = () => {
    if (!offerAccepted) {
      setError("Необходимо принять условия оферты");
      return;
    }
    void book();
  };

  if (success) {
    return (
      <div className="card p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-birch/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-7 h-7 text-birch" strokeWidth={2} aria-hidden="true" />
        </div>
        <h3 className="font-display text-xl font-bold mb-2">Заявка отправлена</h3>
        <p className="text-frost text-sm mb-4">
          Ожидаем подтверждения водителя. Обычно это занимает до 60 минут.
        </p>
        {notice && (
          <p className="flex items-start gap-2 text-left text-sm text-frost bg-river-light rounded-xl p-3 mb-4">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-river" strokeWidth={2} aria-hidden="true" />
            {notice}
          </p>
        )}
        <div className="bg-snow rounded-xl p-4 text-left">
          <PriceBreakdown compensation={compensation} serviceFee={serviceFee} />
        </div>
        <Link href="/profile/bookings" className="btn-secondary inline-block px-6 py-3 mt-5">
          Мои бронирования
        </Link>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h2 className="font-display text-xl font-bold mb-4">Забронировать место</h2>
      <div className="flex items-center justify-between mb-4">
        <span className="text-frost">Доступно мест</span>
        <span className="font-utility font-bold text-lg">{availableSeats}</span>
      </div>
      <PriceBreakdown compensation={compensation} serviceFee={serviceFee} />
      {error && (
        <div className="bg-ember/10 border border-ember/20 rounded-xl p-3 text-ember text-sm mt-4" role="alert">
          {error}
        </div>
      )}
      <label className="flex items-start gap-3 mt-6 cursor-pointer">
        <input
          type="checkbox"
          checked={offerAccepted}
          onChange={(e) => setOfferAccepted(e.target.checked)}
          className="mt-1 w-4 h-4 rounded border-fog text-river focus:ring-river"
        />
        <span className="text-sm text-frost">
          Я принимаю{" "}
          <Link href="/legal/terms" target="_blank" className="text-river underline">
            условия оферты
          </Link>{" "}
          и понимаю, что это добровольное разделение расходов, а не заказ такси
        </span>
      </label>
      <button
        onClick={handleBook}
        disabled={loading || !offerAccepted}
        aria-busy={loading}
        className="btn-primary w-full py-4 mt-6 text-base min-h-[56px]"
      >
        {loading ? "Бронируем..." : `Забронировать за ${compensation + serviceFee} ₽`}
      </button>
      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={() => {
          setShowAuth(false);
          void book();
        }}
      />
    </div>
  );
}
