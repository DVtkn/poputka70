import type { Metadata, Viewport } from "next";
import { Unbounded, Golos_Text, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { PushProvider } from "@/components/PushProvider";

const unbounded = Unbounded({
  subsets: ["cyrillic", "latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-unbounded",
  display: "swap",
});

const golosText = Golos_Text({
  subsets: ["cyrillic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-golos",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["cyrillic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Попутка70 — Едешь за 15 минут, не ждёшь 40",
  description: "Карпулинг в Томске. Сосед подвозит соседа.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FAFAF7",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${unbounded.variable} ${golosText.variable} ${jetbrainsMono.variable}`}>
      <body className="font-body antialiased">
        <PushProvider>
          {children}
        </PushProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(console.error);
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}