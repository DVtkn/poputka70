import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Нет доступа" }, { status: 403 });
    }

    const pending = await prisma.driverProfile.findMany({
      where: { verificationStatus: "PENDING" },
      include: {
        user: {
          select: { id: true, login: true, firstName: true, lastName: true, phone: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const approved = await prisma.driverProfile.findMany({
      where: { verificationStatus: "APPROVED" },
      include: {
        user: {
          select: { id: true, login: true, firstName: true, lastName: true },
        },
      },
      orderBy: { verifiedAt: "desc" },
      take: 50,
    });

    const rejected = await prisma.driverProfile.findMany({
      where: { verificationStatus: "REJECTED" },
      include: {
        user: {
          select: { id: true, login: true, firstName: true, lastName: true },
        },
      },
      orderBy: { verifiedAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ success: true, pending, approved, rejected });
  } catch (error) {
    console.error("Admin verifications error:", error);
    return NextResponse.json({ success: false, error: "Ошибка" }, { status: 500 });
  }
}