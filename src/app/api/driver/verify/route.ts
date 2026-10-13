import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { errors, ok, serverError } from "@/lib/http";

const MAX_FILE_SIZE = 1.5 * 1024 * 1024; // 1.5 МБ на файл
const MAX_TOTAL_SIZE = 3 * 1024 * 1024; // 3 МБ на оба фото: умещается в лимит тела запроса Vercel (4.5 МБ)

const MIME_PREFIX: Record<string, string> = {
  "image/jpeg": "data:image/jpeg;base64,",
  "image/png": "data:image/png;base64,",
  "image/webp": "data:image/webp;base64,",
};

/** Проверяем тип файла по сигнатуре, а не по клиентскому MIME-заголовку. */
function sniffMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

async function readImage(file: File, field: string): Promise<{ dataUrl: string } | { error: string }> {
  if (file.size > MAX_FILE_SIZE) {
    return { error: `${field}: файл больше 1.5 МБ — сожми фото и попробуй снова` };
  }
  const buffer = new Uint8Array(await file.arrayBuffer());
  const mime = sniffMime(buffer);
  if (!mime || !MIME_PREFIX[mime]) {
    return { error: `${field}: поддерживаются только JPEG, PNG и WebP` };
  }
  const base64 = Buffer.from(buffer).toString("base64");
  return { dataUrl: MIME_PREFIX[mime] + base64 };
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return errors.authRequired();

  try {
    const formData = await request.formData();
    const licenseFile = formData.get("licensePhoto");
    const carFile = formData.get("carPhoto");

    if (!(licenseFile instanceof File) || !(carFile instanceof File)) {
      return errors.badRequest("Нужны оба фото: водительское удостоверение и автомобиль");
    }

    if (licenseFile.size + carFile.size > MAX_TOTAL_SIZE) {
      return errors.badRequest("Суммарный размер фото — до 3 МБ. Сожми снимки и попробуй снова");
    }

    const license = await readImage(licenseFile, "Водительское удостоверение");
    if ("error" in license) return errors.badRequest(license.error);

    const car = await readImage(carFile, "Фото автомобиля");
    if ("error" in car) return errors.badRequest(car.error);

    const driverProfile = await prisma.driverProfile.findUnique({
      where: { userId: sessionUser.id },
      select: { id: true },
    });
    if (!driverProfile) {
      return errors.notFound("Сначала зарегистрируйся как водитель");
    }

    // Храним фото как base64 в БД (переезд на приватный Blob — отдельная задача)
    await prisma.driverProfile.update({
      where: { userId: sessionUser.id },
      data: {
        licensePhotoUrl: license.dataUrl,
        carPhotoUrl: car.dataUrl,
        verificationStatus: "PENDING",
        verificationComment: null,
        verifiedAt: null,
      },
    });

    return ok({ message: "Документы отправлены на проверку" });
  } catch (error) {
    return serverError("driver.verify", error);
  }
}
