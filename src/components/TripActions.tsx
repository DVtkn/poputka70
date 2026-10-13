"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { apiError } from "@/lib/api-client";

export default function TripActions({
  tripId,
  cancelOnly = false,
}: {
  tripId: string;
  cancelOnly?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const run = (path: string, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;

    startTransition(async () => {
      setError("");
      try {
        const response = await fetch(path, { method: "POST" });
        const data: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          setError(apiError(data, "Не получилось выполнить действие. Попробуй ещё раз.").message);
          return;
        }
        router.refresh();
      } catch {
        setError("Ошибка сети. Проверь соединение и попробуй снова.");
      }
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {!cancelOnly && (
          <button
            type="button"
            onClick={() => run(`/api/trips/${tripId}/confirm-today`)}
            disabled={isPending}
            aria-busy={isPending}
            className="btn-primary px-4 py-2.5 text-sm inline-flex items-center gap-2 disabled:opacity-50 min-h-[44px]"
          >
            <CheckCircle2 className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
            Подтвердить поездку
          </button>
        )}
        <button
          type="button"
          onClick={() =>
            run(
              `/api/trips/${tripId}/cancel`,
              "Отменить поездку? Пассажиры получат уведомление, а сервисный сбор вернётся."
            )
          }
          disabled={isPending}
          aria-busy={isPending}
          className="btn-secondary px-4 py-2.5 text-sm inline-flex items-center gap-2 disabled:opacity-50 min-h-[44px]"
        >
          <XCircle className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
          Отменить
        </button>
      </div>
      {error && (
        <p className="text-sm text-ember" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
