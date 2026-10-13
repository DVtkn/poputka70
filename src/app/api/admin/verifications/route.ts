import { prisma } from "@/lib/prisma";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { errors, ok, serverError } from "@/lib/http";

const profileSelect = {
  id: true,
  carModel: true,
  carNumber: true,
  carColor: true,
  verificationStatus: true,
  verificationComment: true,
  verifiedAt: true,
  createdAt: true,
  totalRides: true,
  user: {
    select: { id: true, login: true, firstName: true, lastName: true, phone: true, createdAt: true },
  },
};

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return errors.authRequired();
  if (!isAdmin(sessionUser)) return errors.forbidden();

  try {
    const [pending, approved, rejected] = await Promise.all([
      prisma.driverProfile.findMany({
        where: { verificationStatus: "PENDING" },
        select: profileSelect,
        orderBy: { createdAt: "asc" },
        take: 100,
      }),
      prisma.driverProfile.findMany({
        where: { verificationStatus: "APPROVED" },
        select: profileSelect,
        orderBy: { verifiedAt: "desc" },
        take: 50,
      }),
      prisma.driverProfile.findMany({
        where: { verificationStatus: "REJECTED" },
        select: profileSelect,
        orderBy: { verifiedAt: "desc" },
        take: 50,
      }),
    ]);

    return ok({ pending, approved, rejected });
  } catch (error) {
    return serverError("admin.verifications.list", error);
  }
}
