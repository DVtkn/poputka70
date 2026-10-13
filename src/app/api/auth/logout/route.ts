import { clearSessionCookie } from "@/lib/auth";
import { ok, serverError } from "@/lib/http";

export async function POST() {
  try {
    await clearSessionCookie();
    return ok();
  } catch (error) {
    return serverError("auth.logout", error);
  }
}
