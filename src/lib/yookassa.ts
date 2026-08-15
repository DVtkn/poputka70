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

export interface YooKassaPayment {
  id: string;
  status: "pending" | "waiting_for_capture" | "succeeded" | "canceled";
  amount: { value: string; currency: "RUB" };
  confirmation: { type: "redirect"; confirmation_url: string };
  created_at: string;
  metadata: Record<string, string>;
}

const config: YooKassaConfig = {
  shopId: process.env.YOOKASSA_SHOP_ID || "",
  secretKey: process.env.YOOKASSA_SECRET_KEY || "",
  isTest: process.env.YOOKASSA_TEST_MODE === "true",
};

export function getYooKassaConfig(): YooKassaConfig {
  return config;
}

export async function createPayment(payment: PaymentRequest): Promise<YooKassaPayment> {
  const auth = Buffer.from(`${config.shopId}:${config.secretKey}`).toString("base64");
  const idempotenceKey = `poputka70-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const response = await fetch("https://api.yookassa.ru/v3/payments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${auth}`,
      "Idempotence-Key": idempotenceKey,
    },
    body: JSON.stringify(payment),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`YooKassa error: ${JSON.stringify(error)}`);
  }

  return response.json();
}

export async function getPayment(paymentId: string): Promise<YooKassaPayment> {
  const auth = Buffer.from(`${config.shopId}:${config.secretKey}`).toString("base64");

  const response = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
    headers: { "Authorization": `Basic ${auth}` },
  });

  if (!response.ok) {
    throw new Error("Payment not found");
  }

  return response.json();
}

export async function capturePayment(paymentId: string, amount: { value: string; currency: "RUB" }): Promise<YooKassaPayment> {
  const auth = Buffer.from(`${config.shopId}:${config.secretKey}`).toString("base64");

  const response = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}/capture`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${auth}`,
    },
    body: JSON.stringify({ amount }),
  });

  return response.json();
}

export async function cancelPayment(paymentId: string): Promise<YooKassaPayment> {
  const auth = Buffer.from(`${config.shopId}:${config.secretKey}`).toString("base64");

  const response = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}/cancel`, {
    method: "POST",
    headers: { "Authorization": `Basic ${auth}` },
  });

  return response.json();
}

export function verifyWebhookSignature(body: string, signature: string): boolean {
  const crypto = require("crypto");
  const expected = crypto.createHmac("sha256", config.secretKey).update(body).digest("base64");
  return expected === signature;
}