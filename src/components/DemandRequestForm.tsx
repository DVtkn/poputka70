"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import AuthModal from "@/components/AuthModal";
import { apiError } from "@/lib/api-client";

type CityPoint = { id: string; name: string; type: "ORIGIN" | "DESTINATION" | "BOTH" };

export default function DemandRequestForm({
  defaultFromName,
  defaultToName,
}: {
  defaultFromName?: string;
  defaultToName?: string;
}) {
  const [points, setPoints] = useState<CityPoint[]>([]);
  const [originId, setOriginId] = useState("");
  const [destId, setDestId] = useState("");
  const [desiredTime, setDesiredTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    const url = new URL("/api/city-points", window.location.origin);
    fetch(url.toString())
      .then((res) => res.json())
      .then((data: { success?: boolean; points?: CityPoint[] }) => {
        if (!data.success || !data.points) return;
        setPoints(data.points);
        if (defaultFromName) {
          const match = data.points.find((p) => defaultFromName.includes(p.name));
          if (match) setOriginId(match.id);
        }
        if (defaultToName) {
          const match = data.points.find((p) => defaultToName.includes(p.name));
          if (match) setDestId(match.id);
        }
      })
      .catch(() => {
        /* селекты просто останутся пустыми — форма мягко деградирует */
      });
  }, [defaultFromName, defaultToName]);

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/demand-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originId, destId, desiredTime }),
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
      setSuccess(true);
    } catch {
      setError("Ошибка сети. Попробуй ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-2xl border border-river/20 bg-river-light/50 p-5 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-river mt-0.5 flex-shrink-0" strokeWidth={2} aria-hidden="true" />
        <div className="text-sm">
          <div className="font-semibold text-taiga">Заявка принята</div>
          <p className="text-frost-dark mt-0.5">
            Как только водитель появится на этом направлении, мы сообщим тебе.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-fog bg-white p-5">
      <h3 className="font-semibold mb-1">Не нашёл попутку?</h3>
      <p className="text-sm text-frost-dark mb-4">Оставь заявку — водители увидят, куда нужно ездить, и опубликуют поездку.</p>

      {error && (
        <div className="mb-3 rounded-xl bg-ember/10 border border-ember/20 p-3 text-ember text-sm" role="alert">
          {error}
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-3">
        <select
          value={originId}
          onChange={(e) => setOriginId(e.target.value)}
          className="select-native"
          aria-label="Откуда"
        >
          <option value="">Откуда</option>
          {points
            .filter((p) => p.type !== "DESTINATION")
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>

        <select
          value={destId}
          onChange={(e) => setDestId(e.target.value)}
          className="select-native"
          aria-label="Куда"
        >
          <option value="">Куда</option>
          {points
            .filter((p) => p.type !== "ORIGIN")
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>

        <input
          type="time"
          value={desiredTime}
          onChange={(e) => setDesiredTime(e.target.value)}
          className="input font-utility"
          aria-label="Желаемое время"
        />
      </div>

      <button
        type="button"
        onClick={() => void submit()}
        disabled={loading || !originId || !destId || originId === destId}
        aria-busy={loading}
        className="btn-secondary w-full sm:w-auto mt-4 px-6"
      >
        <Send className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
        {loading ? "Отправляем..." : "Оставить заявку"}
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
