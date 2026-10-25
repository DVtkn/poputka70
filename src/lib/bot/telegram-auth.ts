import crypto from "node:crypto";

export interface TelegramAuthUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

export interface VerifyInitDataResult {
  valid: boolean;
  user?: TelegramAuthUser;
  authDate?: number;
  error?: string;
}

export interface TelegramWidgetData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

/**
 * Валидация Telegram WebApp initData по алгоритму Telegram:
 * 1. secret_key = HMAC_SHA256("WebAppData", botToken)
 * 2. data_check_string = отсортированные key=value без hash, соединенные \n
 * 3. hash === HMAC_SHA256(secret_key, data_check_string)
 */
export function verifyTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 86400 // 24 часа
): VerifyInitDataResult {
  if (!initData || !botToken) {
    return { valid: false, error: "Missing initData or botToken" };
  }

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) {
      return { valid: false, error: "Missing hash parameter" };
    }

    params.delete("hash");

    // Сортировка ключей
    const pairs: string[] = [];
    params.forEach((value, key) => {
      pairs.push(`${key}=${value}`);
    });
    pairs.sort();
    const dataCheckString = pairs.join("\n");

    // 1. secret_key = HMAC_SHA256("WebAppData", botToken)
    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    // 2. calculated_hash = HMAC_SHA256(secretKey, dataCheckString)
    const calculatedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    if (calculatedHash !== hash) {
      return { valid: false, error: "Invalid hash signature" };
    }

    const authDateStr = params.get("auth_date");
    const authDate = authDateStr ? parseInt(authDateStr, 10) : 0;
    const nowSec = Math.floor(Date.now() / 1000);

    if (authDate > 0 && nowSec - authDate > maxAgeSeconds) {
      return { valid: false, error: "initData expired" };
    }

    const userJson = params.get("user");
    let user: TelegramAuthUser | undefined;
    if (userJson) {
      user = JSON.parse(userJson) as TelegramAuthUser;
    }

    return { valid: true, user, authDate };
  } catch (err) {
    return { valid: false, error: String(err) };
  }
}

/**
 * Валидация данных Telegram Login Widget:
 * 1. secret_key = SHA256(botToken)
 * 2. data_check_string = отсортированные key=value без hash
 * 3. hash === HMAC_SHA256(secret_key, data_check_string)
 */
export function verifyTelegramWidgetData(
  data: Record<string, unknown>,
  botToken: string,
  maxAgeSeconds = 86400
): VerifyInitDataResult {
  if (!data || !botToken) {
    return { valid: false, error: "Missing data or botToken" };
  }

  const hash = typeof data.hash === "string" ? data.hash : null;
  if (!hash) {
    return { valid: false, error: "Missing hash" };
  }

  const pairs: string[] = [];
  for (const [key, val] of Object.entries(data)) {
    if (key === "hash" || val === undefined || val === null) continue;
    pairs.push(`${key}=${String(val)}`);
  }
  pairs.sort();
  const dataCheckString = pairs.join("\n");

  const secretKey = crypto.createHash("sha256").update(botToken).digest();
  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (calculatedHash !== hash) {
    return { valid: false, error: "Invalid hash signature" };
  }

  const authDate = typeof data.auth_date === "number" ? data.auth_date : 0;
  const nowSec = Math.floor(Date.now() / 1000);
  if (authDate > 0 && nowSec - authDate > maxAgeSeconds) {
    return { valid: false, error: "Auth data expired" };
  }

  const user: TelegramAuthUser = {
    id: Number(data.id),
    first_name: String(data.first_name || ""),
    last_name: typeof data.last_name === "string" ? data.last_name : undefined,
    username: typeof data.username === "string" ? data.username : undefined,
    photo_url: typeof data.photo_url === "string" ? data.photo_url : undefined,
  };

  return { valid: true, user, authDate };
}
