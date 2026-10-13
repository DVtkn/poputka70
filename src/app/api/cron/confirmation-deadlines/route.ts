import { isAuthorizedCron, unauthorizedCron } from "@/lib/cron-auth";
import { ok, serverError } from "@/lib/http";
import { processConfirmationDeadlines } from "@/lib/cron";

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) return unauthorizedCron();

  try {
    const result = await processConfirmationDeadlines();
    return ok(result);
  } catch (error) {
    return serverError("cron.confirmation-deadlines", error);
  }
}
