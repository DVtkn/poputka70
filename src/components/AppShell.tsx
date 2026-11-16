import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import StickyHeader from "./StickyHeader";
import Footer from "./Footer";
import MobileBottomNav from "./MobileBottomNav";

export default function AppShell({
  children,
  backHref,
  backLabel,
  wide = false,
}: {
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  wide?: boolean;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-snow text-taiga pb-24 md:pb-0">
      <StickyHeader />

      <main
        id="main"
        className={`flex-1 mx-auto w-full px-4 sm:px-6 py-6 md:py-10 ${wide ? "max-w-6xl" : "max-w-4xl"}`}
      >
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-frost-dark hover:text-river transition-colors mb-5"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
            {backLabel ?? "Назад"}
          </Link>
        )}
        {children}
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
