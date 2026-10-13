export interface ApiErrorPayload {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
}

/** Разбирает конверт ошибки API: { success:false, error:{code,message} }. */
export function apiError(data: unknown, fallback: string): { code: string | null; message: string } {
  const error = (data as { error?: unknown } | null | undefined)?.error;
  if (typeof error === "string") return { code: null, message: error };
  if (error && typeof error === "object") {
    const payload = error as Partial<ApiErrorPayload>;
    const message = typeof payload.message === "string" && payload.message.length > 0 ? payload.message : fallback;
    return { code: typeof payload.code === "string" ? payload.code : null, message };
  }
  return { code: null, message: fallback };
}
