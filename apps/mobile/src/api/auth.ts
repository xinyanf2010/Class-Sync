/**
 * Token storage for the student app. Module-level (not persisted across app
 * restarts) — matches the single-socket lifecycle already used by api/socket.ts.
 */
import type { AuthResponse, AuthUser } from '@classsync/common';
import { SERVER_URL } from '../config';

let token: string | null = null;
let currentUser: AuthUser | null = null;

export function getToken(): string | null {
  return token;
}

export function getCurrentUser(): AuthUser | null {
  return currentUser;
}

export function signOut(): void {
  token = null;
  currentUser = null;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${SERVER_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'Login failed');
  }
  const data: AuthResponse = await res.json();
  token = data.token;
  currentUser = data.user;
  return data.user;
}
