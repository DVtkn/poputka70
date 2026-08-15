import { NextResponse } from "next/server";
import { isAuthorizedCron, unauthorizedCron } from "@/lib/cron-auth";
import { sendConfirmationReminders } from "@/lib/cron";

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) return unauthorizedCron();
  try {
    const result = await sendConfirmationReminders();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Cron reminders error:", error);
    return NextResponse.json({ success: false, error: "Ошибка" }, { status: 500 });
  }
}