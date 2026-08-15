import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET должен быть задан в production");
}

const SECRET = new TextEncoder().encode(jwtSecret || "poputka70-dev-secret");

export interface SessionUser {
  id: string;
  login: string;
  firstName: string;
  lastName?: string;
  role: string;
  referralCode?: string;
  referredBy?: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ 
    id: user.id, 
    login: user.login,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    referralCode: user.referralCode,
    referredBy: user.referredBy,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  
  if (!token) return null;
  
  return verifySessionToken(token);
}
