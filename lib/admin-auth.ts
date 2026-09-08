import "server-only";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { sql } from "@/lib/db";

const COOKIE_NAME = "admin_session";
const SESSION_DAYS = 7;

export type AdminUser = {
  id: string;
  username: string;
};

type AdminRow = {
  id: string;
  username: string;
  password_hash: string;
};

function requireSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("Thiếu ADMIN_SESSION_SECRET (tối thiểu 16 ký tự) trong .env");
  }
  return secret;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export function verifyPassword(password: string, packed: string) {
  const [scheme, saltB64, hashB64] = packed.split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const salt = Buffer.from(saltB64, "base64url");
  const expected = Buffer.from(hashB64, "base64url");
  const actual = scryptSync(password, salt, expected.length);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

function signPayload(payload: string) {
  return createHmac("sha256", requireSessionSecret())
    .update(payload)
    .digest("base64url");
}

function encodeSession(admin: AdminUser, exp: number) {
  const payload = Buffer.from(
    JSON.stringify({ sub: admin.id, username: admin.username, exp }),
    "utf8",
  ).toString("base64url");
  return `${payload}.${signPayload(payload)}`;
}

function decodeSession(token: string): AdminUser | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = signPayload(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { sub?: string; username?: string; exp?: number };
    if (!data.sub || !data.username || !data.exp) return null;
    if (Date.now() > data.exp) return null;
    return { id: data.sub, username: data.username };
  } catch {
    return null;
  }
}

export async function ensureBootstrapAdmin() {
  const rows = await sql<{ count: number }[]>`
    select count(*)::int as count from admins
  `;
  if ((rows[0]?.count ?? 0) > 0) return;

  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) return;

  await sql`
    insert into admins (username, password_hash)
    values (${username}, ${hashPassword(password)})
    on conflict (username) do nothing
  `;
}

export async function findAdminByUsername(username: string) {
  const rows = await sql<AdminRow[]>`
    select id, username, password_hash
    from admins
    where lower(username) = lower(${username.trim()})
    limit 1
  `;
  return rows[0] ?? null;
}

export async function authenticateAdmin(username: string, password: string) {
  await ensureBootstrapAdmin();
  const admin = await findAdminByUsername(username);
  if (!admin) return null;
  if (!verifyPassword(password, admin.password_hash)) return null;
  return { id: admin.id, username: admin.username } satisfies AdminUser;
}

export async function createAdminSession(admin: AdminUser) {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const token = encodeSession(admin, exp);
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(exp),
  });
}

export async function clearAdminSession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getAdminSession(): Promise<AdminUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return decodeSession(token);
}

export async function changeAdminPassword(
  adminId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const rows = await sql<AdminRow[]>`
    select id, username, password_hash
    from admins
    where id = ${adminId}::uuid
    limit 1
  `;
  const admin = rows[0];
  if (!admin) {
    return { ok: false, error: "Không tìm thấy tài khoản." };
  }
  if (!verifyPassword(currentPassword, admin.password_hash)) {
    return { ok: false, error: "Mật khẩu hiện tại không đúng." };
  }

  await sql`
    update admins
    set
      password_hash = ${hashPassword(newPassword)},
      updated_at = now()
    where id = ${adminId}::uuid
  `;

  return { ok: true };
}
