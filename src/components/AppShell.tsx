"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import MobileBottomNav from "./MobileBottomNav";

export default function AppShell({
  children,
  backHref = "/",
  backLabel = "На главную",
}: {
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}) {

  return (
    <div className="min-h-screen bg-snow text-taiga pb-20 md:pb-0">
      <header className="sticky top-0 z-30 h-14 bg-snow/85 backdrop-blur-xl border-b border-fog/50 flex items-center gap-3 px-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm font-medium text-frost hover:text-river transition-colors rounded-lg px-2 py-1.5 -ml-2"
          aria-label={backLabel}
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={2} aria-hidden="true" />
          <span className="hidden sm:inline">{backLabel}</span>
        </Link>
        <Link
          href="/"
          className="font-display text-lg font-bold tracking-tight bg-gradient-to-r from-river to-taiga bg-clip-text text-transparent ml-auto"
          aria-label="Попутка70 — главная"
        >
          Попутка70
        </Link>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-8">{children}</main>

      <MobileBottomNav />
    </div>
  );
}