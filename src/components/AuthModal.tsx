"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
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
    setFormData({ login: "", password: "", firstName: "", lastName: "", confirmPassword: "" });
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
          <Label htmlFor="login">Логин</Label>
          <Input
            id="login"
            name="login"
            type="text"
            value={formData.login}
            onChange={handleChange}
            placeholder="Введите логин"
            required
            autoComplete="username"
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Пароль</Label>
          <Input
            id="password"
            name="password"
            type="password"
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
                <Label htmlFor="firstName">Имя</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Иван"
                  required
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Фамилия</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Иванов"
                  autoComplete="family-name"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Подтвердите пароль</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Повторите пароль"
                required
                autoComplete="new-password"
                error={passwordMismatch ? "Пароли не совпадают" : undefined}
              />
              {passwordMismatch && (
                <p id="confirmPassword-error" className="text-xs text-ember" role="alert">
                  Пароли не совпадают
                </p>
              )}
            </div>
          </>
        )}

        <Button type="submit" className="w-full" size="lg" loading={loading} disabled={passwordMismatch}>
          {tab === "login" ? "Войти" : "Зарегистрироваться"}
        </Button>

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
