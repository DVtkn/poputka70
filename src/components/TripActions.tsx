"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";

export default function TripActions({
  tripId,
  cancelOnly = false,
}: {
  tripId: string;
  cancelOnly?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const run = (path: string) => {
    startTransition(async () => {
      await fetch(path, { method: "POST" });
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      {!cancelOnly && (
        <button
          type="button"
          onClick={() => run(`/api/trips/${tripId}/confirm-today`)}
          disabled={isPending}
          className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2 disabled:opacity-50"
        >
          <CheckCircle2 className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
          Подтвердить поездку
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          if (confirm("Отменить поездку? Пассажиры будут уведомлены.")) run(`/api/trips/${tripId}/cancel`);
        }}
        disabled={isPending}
        className="btn-secondary px-4 py-2 text-sm inline-flex items-center gap-2 disabled:opacity-50"
      >
        <XCircle className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
        Отменить
      </button>
    </div>
  );
}