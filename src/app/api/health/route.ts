import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  let dbStatus = "disconnected";
  let count = 0;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected";
    count = await prisma.cityPoint.count();
  } catch (error) {
    dbStatus = "error";
  }

  return NextResponse.json({
    status: dbStatus === "connected" ? "ok" : "degraded",
    service: "Попутка70 API",
    database: { status: dbStatus, cityPoints: count },
    timestamp: new Date().toISOString(),
    version: "0.1.0",
  });
}
