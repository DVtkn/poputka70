import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import ProfileSettings from "@/components/ProfileSettings";

export const dynamic = "force-dynamic";

export default async function ProfileEditPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/?callbackUrl=/profile/edit");

  const [user, reviewsTotal, driverReviews, passengerReviews] = await Promise.all([
    prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        login: true,
        firstName: true,
        lastName: true,
        phone: true,
        bio: true,
        ratingAsDriver: true,
        ratingAsPassenger: true,
      },
    }),
    prisma.review.count({ where: { revieweeId: sessionUser.id } }),
    prisma.review.count({
      where: {
        revieweeId: sessionUser.id,
        booking: { trip: { OR: [{ driverId: sessionUser.id }, { routeTemplate: { driverId: sessionUser.id } }] } },
      },
    }),
    prisma.review.count({ where: { revieweeId: sessionUser.id, booking: { passengerId: sessionUser.id } } }),
  ]);

  if (!user) redirect("/");

  return (
    <AppShell backHref="/profile" backLabel="В профиль">
      <h1 className="text-h2 mb-2">Настройки профиля</h1>
      <p className="text-frost-dark text-sm mb-6">Данные, безопасность и уведомления</p>
      <ProfileSettings
        initial={{
          userId: user.id,
          login: user.login ?? "",
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          bio: user.bio,
          ratingAsDriver: user.ratingAsDriver,
          ratingAsPassenger: user.ratingAsPassenger,
          reviewsTotal,
          driverReviews,
          passengerReviews,
        }}
      />
    </AppShell>
  );
}
