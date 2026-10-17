"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Plus, Search, Ticket, User } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Лента", icon: Home },
  { href: "/search", label: "Поиск", icon: Search },
  { href: "/driver", label: "Поездка", icon: Plus, primary: true },
  { href: "/profile/bookings", label: "Заявки", icon: Ticket },
  { href: "/profile", label: "Профиль", icon: User },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-xl border-t border-fog pb-[env(safe-area-inset-bottom)]"
      aria-label="Основная навигация"
    >
      <div className="flex items-end justify-around px-2">
        {ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          if (item.primary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label="Опубликовать поездку"
                className="flex flex-col items-center justify-end gap-1 flex-1 pb-2.5 min-h-[60px]"
              >
                <span className="-mt-4 w-12 h-12 rounded-2xl bg-river text-white flex items-center justify-center shadow-riverSm">
                  <Icon className="w-6 h-6" strokeWidth={2.25} aria-hidden="true" />
                </span>
                <span className="text-[11px] font-medium text-frost-dark leading-none">Поездка</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 py-2.5 min-h-[60px] transition-colors",
                active ? "text-river" : "text-frost-dark"
              )}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.1 : 1.7} aria-hidden="true" />
              <span className="text-[11px] font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
