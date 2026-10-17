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

  const { fromStopId, toStopId, date, timeWindow, seats } = parsed.data;

  if (fromStopId === toStopId) {
    return errors.badRequest("Точки отправления и назначения должны отличаться");
  }

  const limited = rateLimitByUser("demand:create", sessionUser.id, 5, 24 * 60 * 60 * 1000);
  if (!limited.allowed) return errors.rateLimited(limited.retryAfterSec);

  try {
    const [origin, dest] = await Promise.all([
      prisma.stop.findUnique({ where: { id: fromStopId }, select: { id: true } }),
      prisma.stop.findUnique({ where: { id: toStopId }, select: { id: true } }),
    ]);
    if (!origin || !dest) return errors.badRequest("Точки не найдены");

    const demandDate = new Date(`${date}T00:00:00.000Z`);

    // Дедупликация: такая же заявка за последние сутки уже есть
    const recent = await prisma.demandRequest.findFirst({
      where: {
        passengerId: sessionUser.id,
        fromStopId,
        toStopId,
        date: demandDate,
        status: "OPEN",
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      select: { id: true },
    });
    if (recent) {
      return ok({ demand: recent, duplicate: true });
    }

    const demand = await prisma.demandRequest.create({
      data: {
        passengerId: sessionUser.id,
        fromStopId,
        toStopId,
        date: demandDate,
        timeWindow: timeWindow || null,
        seats,
        status: "OPEN",
      },
      select: { id: true, fromStopId: true, toStopId: true, date: true, status: true },
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
      where: { passengerId: sessionUser.id, status: "OPEN" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        fromStopId: true,
        toStopId: true,
        date: true,
        timeWindow: true,
        seats: true,
        status: true,
        createdAt: true,
      },
    });

    return ok({ demands });
  } catch (error) {
    return serverError("demand.list", error);
  }
}
