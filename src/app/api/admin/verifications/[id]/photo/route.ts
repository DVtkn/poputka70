import { prisma } from "@/lib/prisma";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { errors, serverError } from "@/lib/http";

const DATA_URL_RE = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/;

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return errors.authRequired();
  if (!isAdmin(sessionUser)) return errors.forbidden();

  const { id } = await context.params;
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") === "car" ? "car" : "license";

  try {
    const profile = await prisma.driverProfile.findUnique({
      where: { id },
      select: { licensePhotoUrl: true, carPhotoUrl: true },
    });
    if (!profile) return errors.notFound("Профиль не найден");

    const dataUrl = kind === "car" ? profile.carPhotoUrl : profile.licensePhotoUrl;
    const match = dataUrl?.match(DATA_URL_RE);
    if (!match) return errors.notFound("Фото не найдено");

    const [, mime, base64] = match;
    const bytes = Buffer.from(base64, "base64");

    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "private, max-age=60",
        "Content-Length": String(bytes.byteLength),
      },
    });
  } catch (error) {
    return serverError("admin.verifications.photo", error);
  }
}
