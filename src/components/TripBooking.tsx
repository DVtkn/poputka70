"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import PriceBreakdown from "@/components/ui/PriceBreakdown";
import AuthModal from "@/components/AuthModal";

export default function TripBooking({ tripId, compensation, serviceFee, availableSeats }: { tripId: string; compensation: number; serviceFee: number; availableSeats: number }) {
  const [offerAccepted, setOfferAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const handleBook = async () => {
    if (!offerAccepted) { setError("Необходимо принять условия оферты"); return; }
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tripId }) });
      const data = await res.json();
      if (data.success) {
        if (serviceFee > 0) {
          await initiatePayment(data.booking.id);
        } else {
          setSuccess(true);
        }
      } else if (data.error && (data.error.includes("войди") || data.error.includes("авторизован"))) {
        setShowAuth(true);
      } else {
        setError(data.error || "Не удалось забронировать");
      }
    } catch { setError("Ошибка соединения"); } finally { setLoading(false); }
  };

  const initiatePayment = async (bookingId: string) => {
    try {
      const res = await fetch("/api/payments/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId }) });
      const data = await res.json();
      if (data.success && data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        setError(data.error || "Ошибка оплаты");
      }
    } catch { setError("Ошибка оплаты"); }
  };

  if (success) {
    return (
      <div className="card p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-birch/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-7 h-7 text-birch" strokeWidth={2} aria-hidden="true" />
        </div>
        <h3 className="font-display text-xl font-bold mb-2">Заявка отправлена</h3>
        <p className="text-frost text-sm mb-4">Ожидаем подтверждения водителя. Обычно это занимает до 60 минут.</p>
        <div className="bg-snow rounded-xl p-4 text-left"><PriceBreakdown compensation={compensation} serviceFee={serviceFee} /></div>
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
      {error && <div className="bg-ember/10 border border-ember/20 rounded-xl p-3 text-ember text-sm mt-4">{error}</div>}
      <label className="flex items-start gap-3 mt-6 cursor-pointer">
        <input type="checkbox" checked={offerAccepted} onChange={(e) => setOfferAccepted(e.target.checked)} className="mt-1 w-4 h-4 rounded border-fog text-river focus:ring-river" />
        <span className="text-sm text-frost">Я принимаю <a href="/legal/terms" target="_blank" className="text-river underline">условия оферты</a> и понимаю, что это добровольное разделение расходов, а не заказ такси</span>
      </label>
      <button onClick={handleBook} disabled={loading || !offerAccepted} className="btn-primary w-full py-4 mt-6 text-base">
        {loading ? "Бронируем..." : `Забронировать за ${compensation + serviceFee} ₽`}
      </button>
      <AuthModal isOpen={showAuth} onClose={() => { setShowAuth(false); handleBook(); }} />
    </div>
  );
}
