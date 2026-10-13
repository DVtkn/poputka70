export interface YooKassaConfig {
  shopId: string;
  secretKey: string;
  isTest: boolean;
}

export interface PaymentRequest {
  amount: { value: string; currency: "RUB" };
  confirmation: { type: "redirect"; return_url: string };
  capture: boolean;
  description: string;
  metadata: Record<string, string>;
  receipt?: {
    customer: { email?: string; phone?: string };
    items: Array<{
      description: string;
      quantity: string;
      amount: { value: string; currency: "RUB" };
      vat_code: 1;
      payment_mode: "full_payment";
      payment_subject: "service";
    }>;
  };
}

export type PaymentStatus = "pending" | "waiting_for_capture" | "succeeded" | "canceled";

export interface YooKassaPayment {
  id: string;
  status: PaymentStatus;
  amount: { value: string; currency: "RUB" };
  confirmation?: { type: "redirect"; confirmation_url: string };
  created_at: string;
  metadata: Record<string, string>;
}

export interface YooKassaRefund {
  id: string;
  status: "pending" | "succeeded" | "canceled";
  payment_id: string;
  amount: { value: string; currency: "RUB" };
}

const REQUEST_TIMEOUT_MS = 10_000;

const config: YooKassaConfig = {
  shopId: process.env.YOOKASSA_SHOP_ID || "",
  secretKey: process.env.YOOKASSA_SECRET_KEY || "",
  isTest: process.env.YOOKASSA_TEST_MODE === "true",
};

export function getYooKassaConfig(): YooKassaConfig {
  return config;
}

export function isYooKassaConfigured(): boolean {
  return Boolean(config.shopId && config.secretKey);
}

function authHeader(): string {
  return `Basic ${Buffer.from(`${config.shopId}:${config.secretKey}`).toString("base64")}`;
}

async function request<T>(
  path: string,
  init: RequestInit & { idempotenceKey?: string }
): Promise<T> {
  const { idempotenceKey, headers, ...rest } = init;
  const response = await fetch(`https://api.yookassa.ru/v3${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
      ...(idempotenceKey ? { "Idempotence-Key": idempotenceKey } : {}),
      ...(headers ?? {}),
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`YooKassa ${path}: HTTP ${response.status} ${text.slice(0, 300)}`);
  }

  return (await response.json()) as T;
}

export async function createPayment(
  payment: PaymentRequest,
  idempotenceKey: string
): Promise<YooKassaPayment> {
  return request<YooKassaPayment>("/payments", {
    method: "POST",
    body: JSON.stringify(payment),
    idempotenceKey,
  });
}

export async function getPayment(paymentId: string): Promise<YooKassaPayment> {
  return request<YooKassaPayment>(`/payments/${encodeURIComponent(paymentId)}`, {});
}

/** Закрывает незавершённую платёжную сессию (например, когда бронь снята до оплаты). */
export async function cancelPayment(paymentId: string): Promise<YooKassaPayment> {
  return request<YooKassaPayment>(`/payments/${encodeURIComponent(paymentId)}/cancel`, {
    method: "POST",
    idempotenceKey: `cancel-${paymentId}`,
  });
}

export async function refundPayment(
  paymentId: string,
  amount: { value: string; currency: "RUB" },
  idempotenceKey: string
): Promise<YooKassaRefund> {
  return request<YooKassaRefund>("/refunds", {
    method: "POST",
    body: JSON.stringify({ payment_id: paymentId, amount }),
    idempotenceKey,
  });
}
