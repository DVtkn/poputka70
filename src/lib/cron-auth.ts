import { NextResponse } from "next/server";

const CRON_SECRET = process.env.CRON_SECRET;

export function isAuthorizedCron(request: Request): boolean {
  if (!CRON_SECRET) {
    return process.env.NODE_ENV !== "production";
  }
  const auth = request.headers.get("authorization");
  const url = new URL(request.url);
  const query = url.searchParams.get("secret");
  return auth === `Bearer ${CRON_SECRET}` || request.headers.get("x-cron-secret") === CRON_SECRET || query === CRON_SECRET;
}

export function unauthorizedCron(): NextResponse {
  return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
}