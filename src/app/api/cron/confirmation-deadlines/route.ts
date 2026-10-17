import { isAuthorizedCron, unauthorizedCron } from "@/lib/cron-auth";
import { ok } from "@/lib/http";

/** Concept 2.1: endpoint удалён — подтверждение рейса больше не требуется. */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) return unauthorizedCron();
  return ok({ removed: true, message: "confirmation-deadlines отключён в Concept 2.1" });
}
