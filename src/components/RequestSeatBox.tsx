"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Info } from "lucide-react";
import AuthModal from "@/components/AuthModal";
import { apiError } from "@/lib/api-client";

interface CorridorStopOption {
  id: string;
  name: string;
}

export default function RequestSeatBox({
  tripId,
  originName,
  destName,
  priceFull,
  seatsLeft,
  corridor,
}: {
  tripId: string;
  originName: string;
  destName: string;
  priceFull: number;
  seatsLeft: number;
  corridor: CorridorStopOption[];
}) {
  const [pickupId, setPickupId] = useState("");
  const [dropoffId, setDropoffId] = useState("");
  const [quoteAmount, setQuoteAmount] = useState<number | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setQuoteLoading(true);
        const res = await fetch(`/api/trips/${tripId}/quote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pickupStopId: pickupId || null,
            dropoffStopId: dropoffId || null,
          }),
          signal: controller.signal,
        });
        const data = (await res.json().catch(() => null)) as
          | { success?: boolean; quote?: { amount: number } }
          | null;
        if (!active) return;
        if (data?.success && data.quote) setQuoteAmount(data.quote.amount);
        else setQuoteAmount(null);
      } catch {
        /* отменено */
      } finally {
        if (active) setQuoteLoading(false);
      }
    }, 150);

    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [tripId, pickupId, dropoffId]);

  const submit = async () => {
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId,
          pickupStopId: pickupId || null,
          dropoffStopId: dropoffId || null,
        }),
      });
      const data = (await res.json().catch(() => null)) as { success?: boolean } | null;

      if (res.status === 401) {
        setShowAuth(true);
        return;
      }
      if (!res.ok || !data?.success) {
        setError(apiError(data, "Не получилось отправить заявку").message);
        return;
      }
      setDone(true);
    } catch {
      setError("Ошибка сети. Попробуй ещё раз.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="card p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-river-light flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-7 h-7 text-river" strokeWidth={2} aria-hidden="true" />
        </div>
        <h2 className="font-display text-xl font-bold mb-2">Заявка у водителя</h2>
        <p className="text-frost-dark text-sm">
          Как только водитель примет тебя — придёт уведомление. Оплата — водителю на месте.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="font-display text-lg font-bold">Запросить место</h2>
        <span className="text-sm text-frost-dark">
          Свободно: <span className="font-utility font-semibold text-taiga">{seatsLeft}</span>
        </span>
      </div>

      {error && (
        <div className="bg-ember/10 border border-ember/20 rounded-xl p-3 text-ember text-sm mb-4" role="alert">
          {error}
        </div>
      )}

      <div className="space-y-3 mb-4">
        <div>
          <label htmlFor="pickup" className="block text-xs text-frost-dark mb-1.5">
            Где сядешь
          </label>
          <select
            id="pickup"
            value={pickupId}
            onChange={(event) => setPickupId(event.target.value)}
            className="select-native"
          >
            <option value="">Начало маршрута — {originName}</option>
            {corridor
              .filter((stop) => stop.name !== originName)
              .map((stop) => (
                <option key={stop.id} value={stop.id}>
                  {stop.name}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label htmlFor="dropoff" className="block text-xs text-frost-dark mb-1.5">
            Где выйдешь
          </label>
          <select
            id="dropoff"
            value={dropoffId}
            onChange={(event) => setDropoffId(event.target.value)}
            className="select-native"
          >
            <option value="">Конец маршрута — {destName}</option>
            {corridor
              .filter((stop) => stop.name !== destName)
              .map((stop) => (
                <option key={stop.id} value={stop.id}>
                  {stop.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl bg-snow border border-fog/60 px-4 py-3 mb-4">
        <span className="text-sm text-frost-dark">Компенсация водителю</span>
        <span className="font-utility font-bold text-xl">
          {quoteLoading ? "…" : quoteAmount !== null ? `${quoteAmount} ₽` : `${priceFull} ₽`}
        </span>
      </div>

      <p className="flex items-start gap-2 text-xs text-frost-dark mb-4">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-river" strokeWidth={2} aria-hidden="true" />
        Попутка70 бесплатна: платишь водителю напрямую — наличными или переводом.
      </p>

      <button
        type="button"
        onClick={() => void submit()}
        disabled={submitting}
        aria-busy={submitting}
        className="btn-primary w-full py-4 text-base min-h-[56px]"
      >
        {submitting ? "Отправляем…" : "Запросить место"}
      </button>

      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={() => {
          setShowAuth(false);
          void submit();
        }}
      />
    </div>
  );
}
