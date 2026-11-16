"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Car } from "lucide-react";
import AuthModal from "@/components/AuthModal";

/**
 * Тонкая страница-обёртка для входа по прямому адресу (/login, /register).
 */
export default function AuthPage({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  const handleClose = useCallback(() => {
    setOpen(false);
    router.push("/");
  }, [router]);

  return (
    <div className="min-h-screen bg-snow flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl bg-river-light text-river flex items-center justify-center mx-auto mb-4">
          <Car className="w-6 h-6" strokeWidth={1.75} aria-hidden="true" />
        </div>
        <h1 className="font-display text-3xl font-bold text-taiga mb-2">Попутка70</h1>
        <p className="text-frost-dark text-sm">
          {mode === "login" ? "Вход в аккаунт" : "Создание аккаунта"}
        </p>
        <button onClick={() => setOpen(true)} className="btn-primary mt-5 px-6">
          {mode === "login" ? "Войти" : "Зарегистрироваться"}
        </button>
      </div>
      <AuthModal
        isOpen={open}
        onClose={handleClose}
        initialTab={mode}
        onSuccess={() => {
          /* редирект обработает callbackUrl внутри модалки */
        }}
      />
    </div>
  );
}
