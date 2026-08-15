import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

const MIME_TYPE_MAP: Record<string, string> = {
  "image/jpeg": "data:image/jpeg;base64,",
  "image/png": "data:image/png;base64,",
  "image/webp": "data:image/webp;base64,",
};

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: "Не авторизован" }, { status: 401 });
    }

    const formData = await request.formData();
    const licenseFile = formData.get("licensePhoto") as File | null;
    const carFile = formData.get("carPhoto") as File | null;

    if (!licenseFile || !carFile) {
      return NextResponse.json({ success: false, error: "Нужны оба фото: ВУ и автомобиля" }, { status: 400 });
    }

    const maxSize = 5 * 1024 * 1024;
    if (licenseFile.size > maxSize || carFile.size > maxSize) {
      return NextResponse.json({ success: false, error: "Файл не должен превышать 5 МБ" }, { status: 400 });
    }

    const licensePrefix = MIME_TYPE_MAP[licenseFile.type];
    const carPrefix = MIME_TYPE_MAP[carFile.type];
    if (!licensePrefix || !carPrefix) {
      return NextResponse.json({ success: false, error: "Только JPEG, PNG или WebP" }, { status: 400 });
    }

    // Храним фото как base64 data URL прямо в БД: не теряются при редеплое
    // (в отличие от public/uploads) и доступны админу в панели модерации.
    const licenseDataUrl = licensePrefix + Buffer.from(await licenseFile.arrayBuffer()).toString("base64");
    const carDataUrl = carPrefix + Buffer.from(await carFile.arrayBuffer()).toString("base64");

    const driverProfile = await prisma.driverProfile.findUnique({
      where: { userId: sessionUser.id },
    });

    if (!driverProfile) {
      return NextResponse.json({ success: false, error: "Профиль водителя не найден" }, { status: 404 });
    }

    await prisma.driverProfile.update({
      where: { userId: sessionUser.id },
      data: {
        licensePhotoUrl: licenseDataUrl,
        carPhotoUrl: carDataUrl,
        verificationStatus: "PENDING",
      },
    });

    return NextResponse.json({ success: true, message: "Документы отправлены на проверку" });
  } catch (error) {
    console.error("Driver verify error:", error);
    return NextResponse.json({ success: false, error: "Ошибка загрузки" }, { status: 500 });
  }
}