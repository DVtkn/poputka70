import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { errors, ok, serverError } from "@/lib/http";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return errors.authRequired();

  try {
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        login: true,
        firstName: true,
        lastName: true,
        role: true,
        maxVerifiedAt: true,
        driverProfile: {
          select: {
            carModel: true,
            carNumber: true,
            carColor: true,
            verificationStatus: true,
          },
        },
      },
    });

    if (!user) return errors.notFound("Пользователь не найден");

    return ok({
      user: {
        id: user.id,
        login: user.login,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        maxVerified: Boolean(user.maxVerifiedAt),
        driverProfile: user.driverProfile
          ? {
              carModel: user.driverProfile.carModel,
              carNumber: user.driverProfile.carNumber,
              carColor: user.driverProfile.carColor,
              verificationStatus: user.driverProfile.verificationStatus,
            }
          : null,
      },
      isNewUser: user.role === "PASSENGER" && !user.driverProfile,
    });
  } catch (error) {
    return serverError("auth.me", error);
  }
}
