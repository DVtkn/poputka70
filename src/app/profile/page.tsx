import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import Link from "next/link";
import { CalendarDays, Car, ChevronRight, Plus, Settings2, ShieldCheck, Ticket } from "lucide-react";
import AppShell from "@/components/AppShell";
import RatingDisplay from "@/components/ui/RatingDisplay";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/?callbackUrl=/profile");

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: {
      driverProfile: true,
      bookings: { select: { id: true, status: true } },
      routeTemplates: { where: { active: true }, select: { id: true } },
    },
  });
  if (!user) redirect("/");

  const activeBookings = user.bookings.filter((booking) => ["PENDING", "CONFIRMED"].includes(booking.status)).length;

  const tiles = [
    {
      href: "/profile/bookings",
      icon: Ticket,
      title: "Мои заявки",
      subtitle: activeBookings ? `${activeBookings} активных` : "Пока пусто",
    },
    ...(user.role === "DRIVER" && user.driverProfile
      ? [
          {
            href: "/profile/trips",
            icon: CalendarDays,
            title: "Мои поездки",
            subtitle: "Заявки пассажиров",
          },
          {
            href: "/profile/verify",
            icon: ShieldCheck,
            title: "Верификация",
            subtitle:
              user.driverProfile.verificationStatus === "APPROVED"
                ? "Проверен"
                : user.driverProfile.verificationStatus === "PENDING"
                  ? "На проверке"
                  : "Не пройдена",
          },
          {
            href: "/driver",
            icon: Car,
            title: "Опубликовать поездку",
            subtitle: "Новая поездка в ленту",
          },
        ]
      : []),
    ...(user.role === "ADMIN"
      ? [{ href: "/admin/verifications", icon: Settings2, title: "Админка", subtitle: "Модерация" }]
      : []),
  ];

  return (
    <AppShell>
      <div className="card p-5 md:p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="avatar avatar-xl">{user.firstName.charAt(0)}</div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-bold truncate">
              {user.firstName} {user.lastName || ""}
            </h1>
            <p className="text-sm text-frost-dark">@{user.login}</p>
            <div className="mt-2">
              <RatingDisplay ratingAsDriver={user.ratingAsDriver} ratingAsPassenger={user.ratingAsPassenger} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {tiles.map((tile) => (
          <Link key={tile.href} href={tile.href} className="card card-hover p-4 flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg bg-river-light text-river flex items-center justify-center flex-shrink-0">
              <tile.icon className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold leading-tight">{tile.title}</div>
              <div className="text-sm text-frost-dark truncate">{tile.subtitle}</div>
            </div>
            <ChevronRight
              className="w-4.5 h-4.5 text-fog group-hover:text-river transition-colors flex-shrink-0"
              strokeWidth={2}
              aria-hidden="true"
            />
          </Link>
        ))}
      </div>

      {user.role !== "DRIVER" && user.role !== "ADMIN" && (
        <Link href="/driver" className="btn-primary w-full mt-6">
          <Plus className="w-4.5 h-4.5" strokeWidth={2} aria-hidden="true" />
          Стать водителем
        </Link>
      )}
    </AppShell>
  );
}
