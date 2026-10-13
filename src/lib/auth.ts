import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Role, UserStatus } from "@prisma/client";

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error("JWT_SECRET не задан. Добавь переменную окружения JWT_SECRET.");
}

const SECRET = new TextEncoder().encode(jwtSecret);

export const SESSION_COOKIE = "session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 дней

export interface SessionUser {
  id: string;
  login: string;
  firstName: string;
  lastName?: string;
  role: Role;
  status: UserStatus;
  referralCode?: string;
  referredBy?: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * В токене — только идентификатор пользователя (sub).
 * Роль и статус всегда читаются из БД, поэтому бан и смена роли
 * действуют сразу, а не через 7 дней.
 */
export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(SECRET);
}

async function readTokenSubject(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return typeof payload.sub === "string" && payload.sub.length > 0 ? payload.sub : null;
  } catch {
    return null;
  }
}

// Кэш сессии: короткий TTL (5 сек) — бан и смена роли действуют быстро,
// но БД не нагружается на каждый запрос.
const SESSION_CACHE_TTL_MS = 5_000;
const sessionCache = new Map<string, { user: SessionUser; expiresAt: number }>();
const MAX_CACHE_ENTRIES = 1000;

function getCachedSession(userId: string): SessionUser | null {
  const cached = sessionCache.get(userId);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    sessionCache.delete(userId);
    return null;
  }
  return cached.user;
}

function setCachedSession(userId: string, user: SessionUser): void {
  if (sessionCache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = sessionCache.keys().next().value;
    if (firstKey) sessionCache.delete(firstKey);
  }
  sessionCache.set(userId, { user, expiresAt: Date.now() + SESSION_CACHE_TTL_MS });
}

export function invalidateSessionCache(userId: string): void {
  sessionCache.delete(userId);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const userId = await readTokenSubject(token);
  if (!userId) return null;

  const cached = getCachedSession(userId);
  if (cached) return cached;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      login: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      referralCode: true,
      referredBy: true,
    },
  });

  if (!user || user.status !== "ACTIVE") return null;

  const sessionUser: SessionUser = {
    id: user.id,
    login: user.login ?? "",
    firstName: user.firstName,
    lastName: user.lastName ?? undefined,
    role: user.role,
    status: user.status,
    referralCode: user.referralCode ?? undefined,
    referredBy: user.referredBy ?? undefined,
  };

  setCachedSession(userId, sessionUser);
  return sessionUser;
}

export function isAdmin(session: SessionUser | null): boolean {
  return session?.role === "ADMIN";
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
