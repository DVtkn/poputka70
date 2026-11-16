import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: Pool;
};

function createPool(connectionString: string): Pool {
  return new Pool({
    connectionString,
    // Neon отдаёт валидные публичные сертификаты — проверяем цепочку.
    ssl: { rejectUnauthorized: true },
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

function createMockPrisma(): PrismaClient {
  console.warn("[AI Studio] Database not connected — using mock");
  const modelProxy = new Proxy(
    {},
    {
      get: (_target, method) => {
        switch (method) {
          case "findMany":
          case "groupBy":
            return async () => [];
          case "findFirst":
          case "findUnique":
            return async () => null;
          case "findFirstOrThrow":
          case "findUniqueOrThrow":
            return async () => {
              throw new Error("Database not connected");
            };
          case "count":
            return async () => 0;
          case "create":
            return async (d?: { data?: Record<string, unknown> }) => d?.data ?? {};
          case "createMany":
          case "updateMany":
          case "deleteMany":
            return async () => ({ count: 0 });
          case "update":
            return async (d?: { data?: Record<string, unknown> }) => d?.data ?? {};
          case "upsert":
            return async (d?: { create?: Record<string, unknown>; update?: Record<string, unknown> }) =>
              d?.create ?? d?.update ?? {};
          case "delete":
            return async () => ({});
          case "aggregate":
            return async () => ({ _count: 0, _avg: {}, _sum: {}, _min: {}, _max: {} });
          default:
            return async () => null;
        }
      },
    }
  );

  const clientProxy: unknown = new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === "$queryRaw" || prop === "$queryRawUnsafe") {
          return async () => [];
        }
        if (prop === "$executeRaw" || prop === "$executeRawUnsafe") {
          return async () => 0;
        }
        if (prop === "$transaction") {
          return async (arg: unknown) => {
            if (typeof arg === "function") {
              return (arg as (tx: unknown) => Promise<unknown>)(clientProxy);
            }
            if (Array.isArray(arg)) {
              return Promise.all(arg);
            }
            return [];
          };
        }
        if (prop === "$connect" || prop === "$disconnect") {
          return async () => undefined;
        }
        if (prop === "then") {
          return undefined;
        }
        return modelProxy;
      },
    }
  );

  return clientProxy as PrismaClient;
}

function isPlaceholderDatabaseUrl(connectionString: string): boolean {
  try {
    const parsed = new URL(connectionString);
    return parsed.hostname === "host" || parsed.hostname === "";
  } catch {
    return false;
  }
}

function isConnectionError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("EAI_AGAIN") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("ENOTFOUND") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("Can't reach database server") ||
    msg.includes("Connection terminated")
  );
}

function wrapWithFallback(real: PrismaClient): PrismaClient {
  let useMock = false;
  let mock: PrismaClient | null = null;
  const getMock = () => (mock ??= createMockPrisma());

  const wrapModel = (model: Record<string | symbol, unknown>, prop: string | symbol) =>
    new Proxy(model, {
      get: (target, method) => {
        if (useMock) {
          return (getMock() as unknown as Record<string | symbol, Record<string | symbol, unknown>>)[prop][method];
        }
        const fn = target[method];
        if (typeof fn !== "function") return fn;
        return async (...args: unknown[]) => {
          if (useMock) {
            const mockMethod = (
              getMock() as unknown as Record<string | symbol, Record<string | symbol, (...a: unknown[]) => Promise<unknown>>>
            )[prop][method];
            return mockMethod(...args);
          }
          try {
            return await (fn as (...a: unknown[]) => Promise<unknown>).apply(target, args);
          } catch (err) {
            if (isConnectionError(err)) {
              useMock = true;
              const mockMethod = (
                getMock() as unknown as Record<string | symbol, Record<string | symbol, (...a: unknown[]) => Promise<unknown>>>
              )[prop][method];
              return mockMethod(...args);
            }
            throw err;
          }
        };
      },
    });

  return new Proxy(real, {
    get: (target, prop) => {
      if (useMock) {
        return (getMock() as unknown as Record<string | symbol, unknown>)[prop];
      }
      const value = (target as unknown as Record<string | symbol, unknown>)[prop];
      if (typeof value === "function") {
        return async (...args: unknown[]) => {
          if (useMock) {
            const mockFn = (getMock() as unknown as Record<string | symbol, (...a: unknown[]) => Promise<unknown>>)[prop];
            return mockFn(...args);
          }
          try {
            return await (value as (...a: unknown[]) => Promise<unknown>).apply(target, args);
          } catch (err) {
            if (isConnectionError(err)) {
              useMock = true;
              const mockFn = (getMock() as unknown as Record<string | symbol, (...a: unknown[]) => Promise<unknown>>)[prop];
              return mockFn(...args);
            }
            throw err;
          }
        };
      }
      if (value && typeof value === "object" && typeof prop === "string" && !prop.startsWith("$") && !prop.startsWith("_")) {
        return wrapModel(value as Record<string | symbol, unknown>, prop);
      }
      return value;
    },
  });
}

function createPrismaClient(): PrismaClient {
  try {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString || isPlaceholderDatabaseUrl(connectionString)) {
      return createMockPrisma();
    }

    const pool = createPool(connectionString);
    globalForPrisma.pgPool = pool;
    const adapter = new PrismaPg(pool);
    const client = new PrismaClient({ adapter });
    return wrapWithFallback(client);
  } catch {
    return createMockPrisma();
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Кэшируем клиент и в production: serverless-инстансы переиспользуются,
// иначе каждый запрос создаёт новый пул соединений.
globalForPrisma.prisma = prisma;
