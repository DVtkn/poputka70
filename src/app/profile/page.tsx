import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import Link from "next/link";
import { Ticket, Car, ShieldCheck, CalendarDays, ChevronRight, Settings2 } from "lucide-react";
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
      bookings: { select: { id: true } },
      routeTemplates: { where: { active: true }, select: { id: true } },
    },
  });
  if (!user) redirect("/");

  const menuItems = [
    {
      href: "/profile/bookings",
      icon: Ticket,
      title: "Мои бронирования",
      subtitle: user.bookings.length
        ? `${user.bookings.length} ${user.bookings.length === 1 ? "поездка" : "поездок"}`
        : "Нет бронирований",
    },
    ...(user.role === "DRIVER" && user.driverProfile
      ? [
          {
            href: "/driver",
            icon: Car,
            title: "Кабинет водителя",
            subtitle: user.routeTemplates.length
              ? `${user.routeTemplates.length} активных маршрутов`
              : "Создай первый маршрут",
          },
          {
            href: "/profile/trips",
            icon: CalendarDays,
            title: "Мои поездки",
            subtitle: "Пассажиры и подтверждения",
          },
          {
            href: "/profile/verify",
            icon: ShieldCheck,
            title: "Верификация водителя",
            subtitle:
              user.driverProfile.verificationStatus === "APPROVED"
                ? "Проверен"
                : user.driverProfile.verificationStatus === "PENDING"
                  ? "Документы на проверке"
                  : "Не пройдена",
          },
        ]
      : []),
    ...(user.role === "ADMIN"
      ? [
          {
            href: "/admin/verifications",
            icon: Settings2,
            title: "Админка",
            subtitle: "Модерация верификаций водителей",
          },
        ]
      : []),
  ];

  return (
    <AppShell backHref="/" backLabel="На главную">
      <header className="mb-8">
        <h1 className="text-h2 mb-6">Мой профиль</h1>

        <div className="card p-6">
          <div className="flex items-center gap-4 mb-5">
            <div className="avatar w-16 h-16 text-2xl">{user.firstName.charAt(0)}</div>
            <div className="min-w-0">
              <h2 className="font-display text-xl font-bold">
                {user.firstName} {user.lastName || ""}
              </h2>
              <p className="text-frost-dark text-sm">@{user.login}</p>
            </div>
          </div>
          <RatingDisplay ratingAsDriver={user.ratingAsDriver} ratingAsPassenger={user.ratingAsPassenger} />
        </div>
      </header>

      <div className="space-y-3">
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href} className="card card-interactive p-5 flex items-center gap-4 group">
            <div className="w-11 h-11 rounded-xl bg-river-light flex items-center justify-center flex-shrink-0">
              <item.icon className="w-5 h-5 text-river" strokeWidth={1.5} aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-sm text-frost-dark truncate">{item.subtitle}</p>
            </div>
            <ChevronRight
              className="w-5 h-5 text-frost group-hover:text-river group-hover:translate-x-0.5 transition-all flex-shrink-0"
              strokeWidth={2}
              aria-hidden="true"
            />
          </Link>
        ))}
      </div>

      {user.role !== "DRIVER" && user.role !== "ADMIN" && (
        <Link href="/driver" className="btn-primary w-full inline-flex justify-center px-6 py-3 mt-6">
          <Car className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
          Стать водителем
        </Link>
      )}
    </AppShell>
  );
}
