import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { prisma } from './db';
import { fail } from './http';

export const COOKIE = 'jolof_session';
const MAX_AGE = 60 * 60 * 24 * 14; // 14 days

const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (!s && process.env.NODE_ENV === 'production') throw new Error('AUTH_SECRET is not set');
  return new TextEncoder().encode(s || 'dev-only-insecure-secret');
};

export const hashPassword = (pw) => bcrypt.hash(pw, 10);
export const checkPassword = (pw, hash) => bcrypt.compare(pw, hash);

export async function startSession(userId) {
  const token = await new SignJWT({ sub: userId }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime(`${MAX_AGE}s`).sign(secret());
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: MAX_AGE });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

/** Signed-in user (with addresses) or null. Suspended users are treated as signed out. */
export async function getUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const u = await prisma.user.findUnique({ where: { id: String(payload.sub) }, include: { addresses: true } });
    return u && u.status !== 'suspended' ? u : null;
  } catch {
    return null;
  }
}

/** Require a signed-in user, optionally with one of `roles`. */
export async function requireUser(...roles) {
  const u = await getUser();
  if (!u) fail(401, 'Please sign in.');
  if (roles.length && !roles.includes(u.role)) fail(403, 'You do not have access to this.');
  return u;
}
export const requireAdmin = () => requireUser('admin');

/** Supplier that is approved (pending suppliers can set up warehouses/products but get no orders). */
export async function requireVendor({ active = false } = {}) {
  const u = await requireUser('vendor', 'admin');
  if (active && u.role === 'vendor' && u.status !== 'active') fail(403, 'Your supplier account is awaiting approval.');
  return u;
}

export const actorName = (u) => (u ? (u.role === 'vendor' ? u.company || u.name : u.name) : 'System');
