import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { errors, ok, parseBody, serverError } from "@/lib/http";
import { demandRequestSchema } from "@/lib/schemas";
import { rateLimitByUser } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return errors.authRequired();

  const parsed = await parseBody(request, demandRequestSchema);
  if (!parsed.ok) return parsed.response;

  const { originId, destId, desiredTime, daysOfWeek } = parsed.data;

  if (originId === destId) {
    return errors.badRequest("Точки отправления и назначения должны отличаться");
  }

  const limited = rateLimitByUser("demand:create", sessionUser.id, 5, 24 * 60 * 60 * 1000);
  if (!limited.allowed) return errors.rateLimited(limited.retryAfterSec);

  try {
    const [origin, dest] = await Promise.all([
      prisma.cityPoint.findUnique({ where: { id: originId }, select: { id: true } }),
      prisma.cityPoint.findUnique({ where: { id: destId }, select: { id: true } }),
    ]);
    if (!origin || !dest) return errors.badRequest("Точки не найдены");

    // Дедупликация: такая же заявка за последние сутки уже есть
    const recent = await prisma.demandRequest.findFirst({
      where: {
        userId: sessionUser.id,
        originId,
        destId,
        desiredTime: desiredTime || null,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      select: { id: true },
    });
    if (recent) {
      return ok({ demand: recent, duplicate: true });
    }

    const demand = await prisma.demandRequest.create({
      data: {
        userId: sessionUser.id,
        originId,
        destId,
        desiredTime: desiredTime || null,
        daysOfWeek,
      },
      select: { id: true },
    });

    return ok({ demand });
  } catch (error) {
    return serverError("demand.create", error);
  }
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return errors.authRequired();

  try {
    const demands = await prisma.demandRequest.findMany({
      where: { userId: sessionUser.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        originId: true,
        destId: true,
        desiredTime: true,
        daysOfWeek: true,
        fulfilled: true,
        createdAt: true,
      },
    });

    return ok({ demands });
  } catch (error) {
    return serverError("demand.list", error);
  }
}
