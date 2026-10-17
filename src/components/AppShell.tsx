import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import StickyHeader from "./StickyHeader";
import MobileBottomNav from "./MobileBottomNav";

export default function AppShell({
  children,
  backHref,
  backLabel,
}: {
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="min-h-screen bg-snow text-taiga pb-24 md:pb-0">
      <StickyHeader />

      <main id="main" className="mx-auto w-full max-w-3xl px-4 py-6 md:py-10">
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-sm font-medium text-frost-dark hover:text-river transition-colors rounded-lg px-2 py-1.5 -ml-2 mb-4"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
            {backLabel ?? "Назад"}
          </Link>
        )}
        {children}
      </main>

      <MobileBottomNav />
    </div>
  );
}
