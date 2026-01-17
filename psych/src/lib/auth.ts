import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getDb, generateId } from './db';
import type { User, UserPublic, JWTPayload } from './types';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'development-secret-change-in-production'
);

const COOKIE_NAME = 'auth_token';
const TOKEN_EXPIRY = '7d'; // 7 days

// Hash a password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Verify a password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Create a JWT token
export async function createToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

// Verify a JWT token
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

// Set auth cookie
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

// Clear auth cookie
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Get current user from cookie
export async function getCurrentUser(): Promise<UserPublic | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const db = getDb();
  const result = await db.execute({
    sql: `
      SELECT id, email, name, created_at
      FROM users
      WHERE id = ?
    `,
    args: [payload.userId],
  });

  if (result.rows.length === 0) return null;
  return result.rows[0] as unknown as UserPublic;
}

// Register a new user
export async function registerUser(
  email: string,
  password: string,
  name?: string
): Promise<{ success: true; user: UserPublic } | { success: false; error: string }> {
  const db = getDb();

  // Check if email already exists
  const existingResult = await db.execute({
    sql: 'SELECT id FROM users WHERE email = ?',
    args: [email],
  });

  if (existingResult.rows.length > 0) {
    return { success: false, error: 'Email already registered' };
  }

  // Hash password and create user
  const passwordHash = await hashPassword(password);
  const id = generateId();
  const now = new Date().toISOString();

  try {
    await db.execute({
      sql: `
        INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [id, email, passwordHash, name || null, now, now],
    });

    return {
      success: true,
      user: { id, email, name: name || null, created_at: now },
    };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: 'Failed to create user' };
  }
}

// Login user
export async function loginUser(
  email: string,
  password: string
): Promise<{ success: true; user: UserPublic; token: string } | { success: false; error: string }> {
  const db = getDb();

  const result = await db.execute({
    sql: `
      SELECT id, email, password_hash, name, created_at
      FROM users
      WHERE email = ?
    `,
    args: [email],
  });

  if (result.rows.length === 0) {
    return { success: false, error: 'Invalid email or password' };
  }

  const user = result.rows[0] as unknown as User;

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return { success: false, error: 'Invalid email or password' };
  }

  const token = await createToken(user.id, user.email);

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      created_at: user.created_at,
    },
    token,
  };
}

// Get user by ID
export async function getUserById(id: string): Promise<UserPublic | null> {
  const db = getDb();
  const result = await db.execute({
    sql: `
      SELECT id, email, name, created_at
      FROM users
      WHERE id = ?
    `,
    args: [id],
  });

  if (result.rows.length === 0) return null;
  return result.rows[0] as unknown as UserPublic;
}
