import type { Metadata } from "next";
import StickyHeader from "@/components/StickyHeader";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import BotBrandStudio from "@/components/BotBrandStudio";

export const metadata: Metadata = {
  title: "Оформление Telegram-бота",
  description:
    "3D-аватарки, обложка описания и интерактивный предпросмотр Telegram-бота Попутка70.",
};

export default function BotDesignPage() {
  return (
    <div className="flex flex-col min-h-screen bg-snow text-taiga pb-24 md:pb-0">
      <StickyHeader />
      <main id="main" className="flex-1">
        <BotBrandStudio />
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
