"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Plus } from "lucide-react";
import AuthModal from "./AuthModal";
import { cn } from "@/lib/utils";

interface HeaderUser {
  id: string;
  firstName: string;
  lastName?: string | null;
}

const NAV = [
  { href: "/", label: "Лента" },
  { href: "/search", label: "Поиск" },
  { href: "/profile/bookings", label: "Мои заявки" },
  { href: "/profile/trips", label: "Мои поездки" },
  { href: "/profile", label: "Профиль" },
];

let cachedUser: HeaderUser | null | undefined = undefined;

export default function StickyHeader() {
  const pathname = usePathname();
  const [user, setUser] = useState<HeaderUser | null>(() => (cachedUser !== undefined ? cachedUser : null));
  const [loading, setLoading] = useState(() => cachedUser === undefined);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    let active = true;

    const loadUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = (await res.json()) as { success?: boolean; user?: HeaderUser };
        const nextUser = data.success && data.user ? data.user : null;
        cachedUser = nextUser;
        if (active) setUser(nextUser);
      } catch {
        if (active) {
          cachedUser = null;
          setUser(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadUser();
    return () => {
      active = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* noop */
    }
    cachedUser = null;
    setUser(null);
  };

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 bg-snow/95 backdrop-blur-xl border-b border-fog/70 pt-[env(safe-area-inset-top,0px)]">
      <div className="container h-14 sm:h-16 flex items-center justify-between lg:justify-start gap-4 sm:gap-6">
        <Link
          href="/"
          className="group flex items-center gap-2 font-display text-[18px] sm:text-[19px] font-extrabold tracking-tight text-taiga whitespace-nowrap"
          aria-label="Poputka70 — главная страница"
        >
          <span
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-river text-white flex items-center justify-center text-xs font-bold font-utility shadow-xs group-hover:bg-river-dark transition-colors"
            aria-hidden="true"
          >
            70
          </span>
          <span className="flex items-baseline gap-1.5">
            <span>Poputka<span className="text-river">70</span></span>
            <span className="hidden sm:inline-block text-[10px] font-semibold text-frost uppercase tracking-wider font-utility">Томск</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1" aria-label="Основная навигация">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn("nav-pill", isActive(item.href) && "nav-pill-active")}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/driver" className="btn-primary px-4 py-2 text-sm min-h-[40px] hidden md:inline-flex">
            <Plus className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
            <span>Опубликовать</span>
          </Link>

          {loading ? (
            <div className="w-9 h-9 rounded-full skeleton" aria-hidden="true" />
          ) : user ? (
            <>
              <Link
                href="/notifications"
                className="p-2.5 rounded-lg text-frost-dark hover:text-taiga hover:bg-fog/60 transition-colors"
                aria-label="Уведомления"
              >
                <Bell className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
              </Link>
              <Link href="/profile" className="avatar h-9 w-9 text-sm" aria-label="Профиль">
                {user.firstName.charAt(0)}
              </Link>
              <button
                onClick={handleLogout}
                className="hidden md:inline-flex p-2.5 rounded-lg text-frost-dark hover:text-ember hover:bg-ember/10 transition-colors text-xs font-medium"
              >
                Выйти
              </button>
            </>
          ) : (
            <button onClick={() => setShowAuth(true)} className="btn-secondary px-4 py-2 text-sm min-h-[40px]">
              Войти
            </button>
          )}
        </div>
      </div>

      {showAuth && (
        <AuthModal
          isOpen
          onClose={() => setShowAuth(false)}
          onSuccess={() => {
            setShowAuth(false);
            window.location.reload();
          }}
        />
      )}
    </header>
  );
}
