"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { apiError } from "@/lib/api-client";

/** Решение водителя по заявке: «Принять» или «Отклонить». */
export default function BookingDecision({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const run = (action: "accept" | "decline") => {
    if (action === "decline" && !window.confirm("Отклонить заявку? Пассажиру придёт вежливое уведомление.")) {
      return;
    }

    startTransition(async () => {
      setError("");
      try {
        const res = await fetch(`/api/bookings/${bookingId}/${action}`, { method: "POST" });
        const data: unknown = await res.json().catch(() => null);
        if (!res.ok) {
          setError(apiError(data, "Не получилось. Попробуй ещё раз.").message);
          return;
        }
        router.refresh();
      } catch {
        setError("Ошибка сети. Попробуй ещё раз.");
      }
    });
  };

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => run("accept")}
          disabled={isPending}
          aria-busy={isPending}
          className="btn-primary px-4 py-2 text-sm min-h-[40px]"
        >
          <Check className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
          Принять
        </button>
        <button
          type="button"
          onClick={() => run("decline")}
          disabled={isPending}
          className="btn-secondary px-4 py-2 text-sm min-h-[40px]"
        >
          <X className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
          Отклонить
        </button>
      </div>
      {error && (
        <p className="text-xs text-ember" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
