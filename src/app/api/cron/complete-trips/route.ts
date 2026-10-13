import { isAuthorizedCron, unauthorizedCron } from "@/lib/cron-auth";
import { ok, serverError } from "@/lib/http";
import { completeTrips } from "@/lib/cron";

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) return unauthorizedCron();

  try {
    const result = await completeTrips();
    return ok(result);
  } catch (error) {
    return serverError("cron.complete-trips", error);
  }
}
