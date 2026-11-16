import type { Metadata, Viewport } from "next";
import { Manrope, Golos_Text, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { PushProvider } from "@/components/PushProvider";
import { TelegramInit } from "@/components/TelegramInit";
import TelegramHomeScreenBanner from "@/components/TelegramHomeScreenBanner";

const manrope = Manrope({
  subsets: ["cyrillic", "latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
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
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains",
  display: "swap",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://poputka70.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Попутка70 — поездки по Томску",
    template: "%s — Попутка70",
  },
  description: "Поиск и публикация поездок по Томску и пригороду без комиссии.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/icon-180.png",
    other: [{ rel: "mask-icon", url: "/icons/icon-192.png" }],
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: APP_URL,
    siteName: "Попутка70",
    title: "Попутка70 — поездки по Томску",
    description: "Поиск и публикация поездок по Томску и пригороду без комиссии.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Попутка70 — поездки по Томску",
    description: "Поиск и публикация поездок по Томску и пригороду без комиссии.",
  },
  applicationName: "Попутка70",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Попутка70",
  },
  keywords: ["поездки", "Томск", "попутка", "маршруты", "попутчики"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FAFAF7",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ru"
      className={`${manrope.variable} ${golosText.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-body antialiased">
        <a href="#main" className="skip-link">
          Перейти к содержимому
        </a>
        <TelegramInit />
        <TelegramHomeScreenBanner />
        <PushProvider>{children}</PushProvider>
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
