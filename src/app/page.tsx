import StickyHeader from "@/components/StickyHeader";
import Hero, { type HeroStats, type HeroTrip } from "@/components/Hero";
import RouteList from "@/components/RouteList";
import HowItWorks from "@/components/HowItWorks";
import WhyItWorks from "@/components/WhyItWorks";
import DriverCTA from "@/components/DriverCTA";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import { prisma } from "@/lib/prisma";
import { tripRoute, tripRouteSelect } from "@/lib/trips";
import { formatTomskTime } from "@/lib/time";

export const revalidate = 60;

const DAY_FMT = new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Tomsk", day: "numeric", month: "long" });
const KEY_FMT = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tomsk" });

function dayLabel(date: Date): string {
  const key = KEY_FMT.format(date);
  const now = new Date();
  if (key === KEY_FMT.format(now)) return "сегодня";
  if (key === KEY_FMT.format(new Date(now.getTime() + 24 * 60 * 60 * 1000))) return "завтра";
  return DAY_FMT.format(date);
}

async function loadLanding(): Promise<{ stats: HeroStats; nextTrip: HeroTrip | null }> {
  const fallback: HeroStats = { trips: 0, drivers: 0, stops: 0 };

  try {
    const now = new Date();
    const [trips, drivers, stops, nextTripRow] = await Promise.all([
      prisma.trip.count({
        where: {
          departureTime: { gt: now },
          status: { in: ["CONFIRMED", "SCHEDULED"] },
        },
      }),
      prisma.driverProfile.count(),
      prisma.stop.count(),
      prisma.trip.findFirst({
        where: {
          departureTime: { gt: now },
          status: { in: ["CONFIRMED", "SCHEDULED"] },
          availableSeats: { gt: 0 },
        },
        orderBy: { departureTime: "asc" },
        select: {
          id: true,
          date: true,
          departureTime: true,
          availableSeats: true,
          ...tripRouteSelect,
          driver: {
            select: {
              firstName: true,
              lastName: true,
              maxVerifiedAt: true,
              ratingAsDriver: true,
              driverProfile: { select: { carModel: true } },
            },
          },
        },
      }),
    ]);

    let nextTrip: HeroTrip | null = null;
    if (nextTripRow) {
      const route = tripRoute(nextTripRow);
      if (route && nextTripRow.driver) {
        nextTrip = {
          id: nextTripRow.id,
          timeLabel: formatTomskTime(nextTripRow.departureTime),
          dayLabel: dayLabel(nextTripRow.date),
          originName: route.originName,
          destName: route.destName,
          price: route.price,
          seatsLeft: nextTripRow.availableSeats,
          seatsTotal: route.seatsTotal,
          driverName: `${nextTripRow.driver.firstName} ${nextTripRow.driver.lastName || ""}`.trim(),
          driverVerified: Boolean(nextTripRow.driver.maxVerifiedAt),
          rating: nextTripRow.driver.ratingAsDriver ?? 5,
          carModel: nextTripRow.driver.driverProfile?.carModel ?? null,
        };
      }
    }

    return { stats: { trips, drivers, stops }, nextTrip };
  } catch (error) {
    console.error("[landing] данные недоступны:", error);
    return { stats: fallback, nextTrip: null };
  }
}

export default async function Home() {
  const { stats, nextTrip } = await loadLanding();

  return (
    <div className="flex flex-col min-h-screen bg-snow text-taiga pb-24 md:pb-0">
      <StickyHeader />
      <main id="main" className="flex-1">
        <Hero stats={stats} nextTrip={nextTrip} />
        <RouteList />
        <HowItWorks />
        <WhyItWorks />
        <DriverCTA />
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
