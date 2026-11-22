import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export interface StoredUserRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  phoneVerified: boolean;
  role: string;
  deskId: string;
  passwordHash?: string; // scrypt "salt:derivedKeyHex"
  createdAt: string;
}

export interface PublicUserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  phoneVerified: boolean;
  role: string;
  deskId: string;
  createdAt: string;
}

export const SESSION_COOKIE_NAME = 'mi007_session';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

// Ephemeral fallback avoids any hardcoded predictable secret if SESSION_SECRET is unset
const EPHEMERAL_FALLBACK_SECRET = crypto.randomBytes(32).toString('hex');

function getSessionSecret(): string {
  return process.env.SESSION_SECRET || process.env.OTP_SECRET || EPHEMERAL_FALLBACK_SECRET;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(keyHex, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export function toPublicUser(record: StoredUserRecord): PublicUserProfile {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    phone: record.phone,
    phoneVerified: record.phoneVerified,
    role: record.role,
    deskId: record.deskId,
    createdAt: record.createdAt,
  };
}

// ── Lightweight File + Memory User Store ─────────────────────────────────────
const USERS_FILE_PATH = path.join(process.cwd(), 'data', 'users.json');
let inMemoryUsers: StoredUserRecord[] | null = null;

function loadUsers(): StoredUserRecord[] {
  if (inMemoryUsers !== null) return inMemoryUsers;
  try {
    if (fs.existsSync(USERS_FILE_PATH)) {
      const raw = fs.readFileSync(USERS_FILE_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        inMemoryUsers = parsed;
        return inMemoryUsers;
      }
    }
  } catch {
    // Ignore read errors on read-only environments
  }
  inMemoryUsers = [];
  return inMemoryUsers;
}

function saveUsers(users: StoredUserRecord[]): void {
  inMemoryUsers = users;
  try {
    const dir = path.dirname(USERS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(users, null, 2), { encoding: 'utf8', mode: 0o600 });
  } catch {
    // Serverless read-only filesystem fallback: stays in memory
  }
}

export function findUserByEmail(email: string): StoredUserRecord | undefined {
  const normalized = email.trim().toLowerCase();
  return loadUsers().find((u) => u.email.toLowerCase() === normalized);
}

export function findUserByPhone(phone: string): StoredUserRecord | undefined {
  const digits = phone.replace(/[\s+()\-]/g, '');
  return loadUsers().find((u) => u.phone.replace(/[\s+()\-]/g, '') === digits);
}

export function upsertUser(record: StoredUserRecord): StoredUserRecord {
  const users = loadUsers();
  const idx = users.findIndex((u) => u.id === record.id || u.email.toLowerCase() === record.email.toLowerCase());
  if (idx !== -1) {
    users[idx] = record;
  } else {
    users.push(record);
  }
  saveUsers(users);
  return record;
}

// ── Signed Session Tokens (HMAC-SHA256) ──────────────────────────────────────
export function createSessionToken(user: PublicUserProfile): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      role: user.role,
      exp,
    }),
    'utf8'
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function attachSessionCookie(res: NextResponse, user: PublicUserProfile): void {
  const token = createSessionToken(user);
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}
