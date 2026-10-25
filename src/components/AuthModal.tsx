"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { apiError } from "@/lib/api-client";

type AuthTab = "login" | "register";

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  initialTab = "login",
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialTab?: AuthTab;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const explicitCallback = searchParams.get("callbackUrl");
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    login: "",
    password: "",
    firstName: "",
    lastName: "",
    confirmPassword: "",
    hpWebsite: "",
  });

  const passwordMismatch =
    tab === "register" &&
    formData.confirmPassword.length > 0 &&
    formData.confirmPassword !== formData.password;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordMismatch) {
      setError("Пароли не совпадают");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const endpoint = tab === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        tab === "login"
          ? { login: formData.login, password: formData.password }
          : {
              login: formData.login,
              password: formData.password,
              firstName: formData.firstName,
              lastName: formData.lastName,
              hpWebsite: formData.hpWebsite || undefined,
            };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        setError(apiError(data, "Произошла ошибка. Попробуй ещё раз.").message);
        return;
      }

      if (onSuccess) {
        onSuccess();
      } else {
        onClose();
      }

      if (explicitCallback) router.push(explicitCallback);
      router.refresh();
    } catch {
      setError("Ошибка сети. Попробуй ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (newTab: AuthTab) => {
    setTab(newTab);
    setError("");
    setFormData({ login: "", password: "", firstName: "", lastName: "", confirmPassword: "", hpWebsite: "" });
  };

  const handleTelegramAuth = async () => {
    setError("");
    setLoading(true);

    try {
      if (typeof window !== "undefined" && window.Telegram?.WebApp?.initData) {
        const initData = window.Telegram.WebApp.initData;
        const res = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData }),
        });

        if (res.ok) {
          if (onSuccess) {
            onSuccess();
          } else {
            const dest = explicitCallback || "/";
            router.push(dest);
            router.refresh();
          }
          onClose();
          return;
        } else {
          const err = await res.json().catch(() => null);
          setError(err?.error?.message || "Не удалось войти через Telegram");
        }
      } else {
        // Вне Telegram Webview перенаправляем на запуск бота
        window.open("https://t.me/poputka70_tomsk_bot", "_blank");
      }
    } catch {
      setError("Ошибка сети при входе через Telegram");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={tab === "login" ? "Вход в Попутка70" : "Регистрация"}
      description={tab === "login" ? "Войди, чтобы бронировать поездки" : "Создай аккаунт за минуту"}
      size="sm"
      closeOnOverlayClick={false}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="flex gap-1 mb-2" role="tablist" aria-label="Выбор режима">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "login"}
            onClick={() => switchTab("login")}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
              tab === "login" ? "bg-river text-white" : "text-frost hover:text-taiga hover:bg-fog"
            }`}
          >
            Вход
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "register"}
            onClick={() => switchTab("register")}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
              tab === "register" ? "bg-river text-white" : "text-frost hover:text-taiga hover:bg-fog"
            }`}
          >
            Регистрация
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-ember/10 text-ember text-sm" role="alert">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="label" htmlFor="login">Логин</label>
          <input
            id="login"
            name="login"
            type="text"
            className="input"
            value={formData.login}
            onChange={handleChange}
            placeholder="Введите логин"
            required
            autoComplete="username"
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <label className="label" htmlFor="password">Пароль</label>
          <input
            id="password"
            name="password"
            type="password"
            className="input"
            value={formData.password}
            onChange={handleChange}
            placeholder="Введите пароль"
            required
            autoComplete={tab === "login" ? "current-password" : "new-password"}
          />
        </div>

        {tab === "register" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="label" htmlFor="firstName">Имя</label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  className="input"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Иван"
                  required
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-1.5">
                <label className="label" htmlFor="lastName">Фамилия</label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  className="input"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Иванов"
                  autoComplete="family-name"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="label" htmlFor="confirmPassword">Подтвердите пароль</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                className={`input ${passwordMismatch ? "input-error" : ""}`}
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Повторите пароль"
                required
                autoComplete="new-password"
                aria-invalid={passwordMismatch}
                aria-describedby={passwordMismatch ? "confirmPassword-error" : undefined}
              />
              {passwordMismatch && (
                <p id="confirmPassword-error" className="text-xs text-ember" role="alert">
                  Пароли не совпадают
                </p>
              )}
            </div>
          </>
        )}

        {tab === "register" && (
          <>
            {/* Скрытая ловушка для спам-ботов */}
            <div className="sr-only" aria-hidden="true">
              <input
                type="text"
                name="hpWebsite"
                id="hpWebsite"
                tabIndex={-1}
                autoComplete="off"
                value={formData.hpWebsite}
                onChange={handleChange}
              />
            </div>
            <p className="text-xs text-frost-dark leading-relaxed">
              Аккаунт один: езди пассажиром и подвози сам. Водителем станешь, когда добавишь автомобиль.
            </p>
          </>
        )}

        <Button type="submit" className="w-full" size="lg" loading={loading} disabled={passwordMismatch}>
          {tab === "login" ? "Войти" : "Зарегистрироваться"}
        </Button>

        <div className="relative my-3">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-fog" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-frost font-medium">или</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleTelegramAuth}
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-xl border border-[#2AABEE]/30 bg-[#2AABEE]/10 hover:bg-[#2AABEE]/20 text-[#229ED9] font-medium text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] min-h-[44px]"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
          </svg>
          Войти через Telegram
        </button>

        <p className="text-center text-sm text-frost">
          {tab === "login" ? (
            <>
              Нет аккаунта?{" "}
              <button
                type="button"
                onClick={() => switchTab("register")}
                className="text-river hover:underline font-medium ml-1"
              >
                Зарегистрироваться
              </button>
            </>
          ) : (
            <>
              Уже есть аккаунт?{" "}
              <button
                type="button"
                onClick={() => switchTab("login")}
                className="text-river hover:underline font-medium ml-1"
              >
                Войти
              </button>
            </>
          )}
        </p>
      </form>
    </Modal>
  );
}
