"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Car, LogOut, PlusCircle } from "lucide-react";
import AuthModal from "./AuthModal";

interface HeaderUser {
  id: string;
  firstName: string;
  lastName?: string | null;
}

export default function StickyHeader() {
  const [user, setUser] = useState<HeaderUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    let active = true;

    const loadUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = (await res.json()) as { success?: boolean; user?: HeaderUser };
        if (active) setUser(data.success && data.user ? data.user : null);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadUser();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let rafId = 0;
    const handleScroll = () => {
      const y = window.scrollY;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        // прячем только при заметном скролле вниз, показываем при первом движении вверх
        setHidden((prev) => {
          if (y > lastY.current && y > 160) return true;
          if (y < lastY.current) return false;
          return prev;
        });
        lastY.current = y;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* всё равно сбрасываем локально */
    }
    setUser(null);
  };

  const reloadUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = (await res.json()) as { success?: boolean; user?: HeaderUser };
      setUser(data.success && data.user ? data.user : null);
    } catch {
      /* noop */
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 h-16 bg-snow/80 backdrop-blur-xl border-b border-fog/50 transition-transform duration-300 ease-out ${
        hidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="container h-full flex items-center justify-between gap-3">
        <Link
          href="/"
          className="font-display text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-r from-river to-taiga bg-clip-text text-transparent hover:tracking-wide transition-all duration-200 whitespace-nowrap"
          aria-label="Попутка70 — главная"
        >
          Попутка70
        </Link>

        {loading ? (
          <div className="flex items-center gap-3" aria-hidden="true">
            <div className="skeleton w-10 h-10 rounded-xl" />
            <div className="skeleton w-24 h-11 rounded-xl" />
          </div>
        ) : (
          <div className="flex items-center gap-2 md:gap-3">
            {user ? (
              <>
                <Link
                  href="/notifications"
                  className="p-2.5 rounded-xl text-frost hover:text-river hover:bg-fog/50 transition-colors"
                  aria-label="Уведомления"
                >
                  <Bell className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
                </Link>

                <Link
                  href="/driver"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-river hover:bg-river-light transition-colors min-h-[44px]"
                  aria-label="Создать поездку"
                >
                  <PlusCircle className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
                  <span className="hidden lg:inline">Поездка</span>
                </Link>

                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-white/80 backdrop-blur-sm border border-fog hover:border-river/40 transition-colors min-h-[44px]"
                  aria-label="Профиль"
                >
                  <span className="avatar avatar-sm">{user.firstName.charAt(0)}</span>
                  <span className="text-sm font-semibold hidden md:block">{user.firstName}</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="p-2.5 rounded-xl text-frost hover:text-ember hover:bg-ember/5 transition-colors"
                  aria-label="Выйти"
                >
                  <LogOut className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/driver"
                  className="hidden sm:inline-flex btn-secondary px-4 py-2 min-h-[44px] text-sm"
                >
                  <Car className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
                  Стать водителем
                </Link>
                <button
                  onClick={() => setShowAuth(true)}
                  className="btn-primary px-5 py-2.5 min-h-[44px] text-sm"
                >
                  Войти
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {showAuth && (
        <AuthModal
          isOpen
          onClose={() => setShowAuth(false)}
          onSuccess={() => {
            setShowAuth(false);
            void reloadUser();
          }}
        />
      )}
    </header>
  );
}
