"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Ticket, User, Bell } from "lucide-react";

const items = [
  { href: "/", label: "Главная", icon: Home },
  { href: "/search", label: "Поиск", icon: Search },
  { href: "/profile/bookings", label: "Брони", icon: Ticket },
  { href: "/notifications", label: "Уведомления", icon: Bell },
  { href: "/profile", label: "Профиль", icon: User },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/90 backdrop-blur-xl border-t border-fog pb-[env(safe-area-inset-bottom)]"
      aria-label="Основная навигация"
    >
      <div className="flex items-stretch">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-1 flex-1 py-2.5 min-h-[60px] transition-colors ${
                active ? "text-river" : "text-frost-dark hover:text-taiga"
              }`}
            >
              <item.icon className="w-5 h-5" strokeWidth={active ? 2 : 1.5} aria-hidden="true" />
              <span className="text-[11px] font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}