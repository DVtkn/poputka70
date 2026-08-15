"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { LogOut, User, Car, Bus, ChevronDown, Bell, PlusCircle } from "lucide-react";
import AuthModal from "./AuthModal";

export default function StickyHeader() {
  const [user, setUser] = useState<{ id: string; firstName: string; lastName?: string; role?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<"passenger" | "driver" | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch("/api/auth/me");
        const d = await r.json();
        if (d.success) setUser(d.user);
      } catch {
        /* noop */
      } finally {
        setLoading(false);
      }
    };
    load();
    try {
      setUserRole(localStorage.getItem("userRole") as "passenger" | "driver" | null);
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    let rafId = 0;
    const handleScroll = () => {
      const y = window.scrollY;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setHidden(y > 140 && y > lastY.current);
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
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  const switchRole = (role: "passenger" | "driver") => {
    try {
      localStorage.setItem("userRole", role);
    } catch {
      /* noop */
    }
    setUserRole(role);
    setRoleMenuOpen(false);
  };

  if (loading) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-snow/80 backdrop-blur-xl border-b border-fog/50">
        <div className="container h-full flex items-center justify-between">
          <div className="skeleton w-32 h-8 rounded-xl" />
          <div className="flex items-center gap-3">
            <div className="skeleton w-24 h-10 rounded-xl" />
          </div>
        </div>
      </header>
    );
  }

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

        <div className="flex items-center gap-2 md:gap-3">
          {user ? (
            <>
              <Link
                href="/notifications"
                className="p-2.5 rounded-xl text-frost hover:text-river hover:bg-fog/50 transition-colors"
                aria-label="Уведомления"
              >
                <Bell className="w-5 h-5" strokeWidth={1.5} />
              </Link>

              <Link
                href="/driver"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-river hover:bg-river-light transition-colors"
                aria-label="Создать поездку"
              >
                <PlusCircle className="w-4 h-4" strokeWidth={1.5} />
                <span className="hidden lg:inline">Поездка</span>
              </Link>

              <Link
                href="/profile"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-white/80 backdrop-blur-sm border border-fog hover:border-river/40 transition-colors"
                aria-label="Профиль"
              >
                <div className="avatar avatar-sm">{user.firstName.charAt(0)}</div>
                <span className="text-sm font-semibold hidden md:block">{user.firstName}</span>
              </Link>

              <button
                onClick={handleLogout}
                className="p-2.5 rounded-xl text-frost hover:text-ember hover:bg-ember/5 transition-colors"
                aria-label="Выйти"
              >
                <LogOut className="w-4 h-4" strokeWidth={2} />
              </button>
            </>
          ) : (
            <>
              <Link
                href="/driver"
                className="hidden sm:inline-flex btn-secondary px-4 py-2 min-h-[40px] text-sm"
              >
                <Car className="w-4 h-4" strokeWidth={1.5} />
                Стать водителем
              </Link>
              <button onClick={() => setShowAuth(true)} className="btn-primary px-5 py-2.5 min-h-[44px] text-sm">
                Войти
              </button>
            </>
          )}
        </div>
      </div>

      <AuthModal
        isOpen={showAuth}
        onClose={() => {
          setShowAuth(false);
          const load = async () => {
            try {
              const r = await fetch("/api/auth/me");
              const d = await r.json();
              if (d.success) setUser(d.user);
            } catch {
              /* noop */
            }
          };
          load();
        }}
      />
    </header>
  );
}