"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Save, ShieldCheck, Star } from "lucide-react";
import InstallPrompt from "@/components/InstallPrompt";
import { apiError } from "@/lib/api-client";
import { plural } from "@/lib/utils";

interface InitialProfile {
  userId: string;
  login: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  bio: string | null;
  ratingAsDriver: number;
  ratingAsPassenger: number;
  reviewsTotal: number;
  driverReviews: number;
  passengerReviews: number;
}

export default function ProfileSettings({ initial }: { initial: InitialProfile }) {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: initial.firstName,
    lastName: initial.lastName ?? "",
    phone: initial.phone ?? "",
    bio: initial.bio ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdSaved, setPwdSaved] = useState(false);

  const change = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
    setSaved(false);
    if (error) setError("");
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setError(apiError(data, "Не удалось сохранить").message);
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Ошибка сети. Попробуй ещё раз.");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPwdSaving(true);
    setPwdError("");
    setPwdSaved(false);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwords),
      });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setPwdError(apiError(data, "Не удалось сменить пароль").message);
        return;
      }
      setPwdSaved(true);
      setPasswords({ currentPassword: "", newPassword: "" });
    } catch {
      setPwdError("Ошибка сети. Попробуй ещё раз.");
    } finally {
      setPwdSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={saveProfile} className="card p-5 space-y-4">
        <h2 className="text-h3">Личные данные</h2>

        {error && (
          <div className="rounded-xl bg-ember/10 border border-ember/20 p-3 text-sm text-ember" role="alert">
            {error}
          </div>
        )}
        {saved && (
          <div className="rounded-xl bg-river-light border border-river/20 p-3 text-sm text-river" role="status">
            Сохранено
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="firstName" className="label">Имя</label>
            <input id="firstName" value={form.firstName} onChange={change("firstName")} className="input" required maxLength={60} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="lastName" className="label">Фамилия</label>
            <input id="lastName" value={form.lastName} onChange={change("lastName")} className="input" maxLength={60} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="phone" className="label">Телефон</label>
          <input
            id="phone"
            value={form.phone}
            onChange={change("phone")}
            placeholder="+7 999 123-45-67"
            className="input font-utility"
            inputMode="tel"
            maxLength={20}
          />
          <p className="text-xs text-frost-dark">Виден только водителю после того, как он принял твою заявку.</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="bio" className="label">О себе</label>
          <textarea
            id="bio"
            value={form.bio}
            onChange={change("bio")}
            rows={3}
            maxLength={500}
            placeholder="Например: езжу на учёбу каждое утро, люблю тишину в машине"
            className="input resize-none"
          />
          <p className="text-xs text-frost-dark">{form.bio.length}/500</p>
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto">
          <Save className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
          {saving ? "Сохраняем…" : "Сохранить"}
        </button>
      </form>

      <div className="card p-5">
        <h2 className="text-h3 mb-3">Рейтинг и доверие</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-frost-dark inline-flex items-center gap-1.5">
              <Star className="w-4 h-4 text-birch fill-birch" strokeWidth={0} aria-hidden="true" />
              Как водителя
            </span>
            <span className="font-utility font-semibold">
              {initial.ratingAsDriver.toFixed(1)} · {initial.driverReviews} {plural(initial.driverReviews, ["отзыв", "отзыва", "отзывов"])}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-frost-dark inline-flex items-center gap-1.5">
              <Star className="w-4 h-4 text-birch fill-birch" strokeWidth={0} aria-hidden="true" />
              Как пассажира
            </span>
            <span className="font-utility font-semibold">
              {initial.ratingAsPassenger.toFixed(1)} · {initial.passengerReviews} {plural(initial.passengerReviews, ["отзыв", "отзыва", "отзывов"])}
            </span>
          </div>
        </div>
        <p className="text-xs text-frost-dark mt-3">
          Рейтинг складывается из отзывов после завершённых поездок. {initial.reviewsTotal > 0 ? `Всего отзывов: ${initial.reviewsTotal}.` : "Отзывов пока нет."}
        </p>
        <Link href={`/users/${initial.userId}`} className="text-sm text-river font-medium hover:underline inline-block mt-3">
          Посмотреть мой публичный профиль
        </Link>
      </div>

      <form onSubmit={changePassword} className="card p-5 space-y-3">
        <h2 className="text-h3">Безопасность</h2>
        <p className="text-sm text-frost-dark flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-river" strokeWidth={1.75} aria-hidden="true" />
          Пароль хранится в зашифрованном виде и никому не передаётся.
        </p>
        {pwdError && (
          <div className="rounded-xl bg-ember/10 border border-ember/20 p-3 text-sm text-ember" role="alert">
            {pwdError}
          </div>
        )}
        {pwdSaved && (
          <div className="rounded-xl bg-river-light border border-river/20 p-3 text-sm text-river" role="status">
            Пароль обновлён
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="currentPassword" className="label">Текущий пароль</label>
            <input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              value={passwords.currentPassword}
              onChange={(event) => setPasswords((prev) => ({ ...prev, currentPassword: event.target.value }))}
              className="input"
              required
              minLength={6}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="newPassword" className="label">Новый пароль</label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              value={passwords.newPassword}
              onChange={(event) => setPasswords((prev) => ({ ...prev, newPassword: event.target.value }))}
              className="input"
              required
              minLength={6}
            />
          </div>
        </div>
        <button type="submit" disabled={pwdSaving} className="btn-secondary w-full sm:w-auto">
          {pwdSaving ? "Меняем…" : "Сменить пароль"}
        </button>
      </form>

      <InstallPrompt />
    </div>
  );
}
