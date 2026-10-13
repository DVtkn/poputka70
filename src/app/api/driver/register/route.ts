import { prisma } from "@/lib/prisma";
import { getSessionUser, invalidateSessionCache } from "@/lib/auth";
import { errors, ok, parseBody, serverError } from "@/lib/http";
import { driverRegisterSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return errors.authRequired();

  const parsed = await parseBody(request, driverRegisterSchema);
  if (!parsed.ok) return parsed.response;

  const { carModel, carNumber, carColor } = parsed.data;

  try {
    const driverProfile = await prisma.$transaction(async (tx) => {
      if (sessionUser.role === "PASSENGER") {
        await tx.user.update({
          where: { id: sessionUser.id },
          data: { role: "DRIVER" },
        });
        invalidateSessionCache(sessionUser.id);
      }

      return tx.driverProfile.upsert({
        where: { userId: sessionUser.id },
        update: { carModel, carNumber, carColor: carColor || null },
        create: {
          userId: sessionUser.id,
          carModel,
          carNumber,
          carColor: carColor || null,
        },
        select: { id: true, carModel: true, carNumber: true },
      });
    });

    return ok({ driverProfile });
  } catch (error) {
    return serverError("driver.register", error);
  }
}
