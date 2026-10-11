/** Backend REST base URL. Override with NEXT_PUBLIC_SERVER_URL in production. */
import type { AuthResponse } from '@classsync/common';

export const SERVER_URL =
  process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';

const TOKEN_KEY = 'classsync_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function authHeader(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Fetch wrapper: attaches auth, and bounces to /login on 401/403. */
async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(input, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...authHeader(), ...(init.headers ?? {}) },
  });
  if (res.status === 401 || res.status === 403) {
    setToken(null);
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new Error(res.status === 401 ? 'Not signed in' : 'Not authorized for this resource');
  }
  return res;
}

// ------------------------------------------------------------------- auth

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${SERVER_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'Login failed');
  }
  return res.json();
}

export async function register(input: {
  email: string;
  password: string;
  name: string;
  role: 'TEACHER' | 'STUDENT';
}): Promise<AuthResponse> {
  const res = await fetch(`${SERVER_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'Registration failed');
  }
  return res.json();
}

// -------------------------------------------------------------- classrooms

export async function createClassroom(name: string) {
  const res = await authedFetch(`${SERVER_URL}/api/classrooms`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Failed to create classroom');
  return res.json();
}

export async function getClassroom(id: string) {
  const res = await authedFetch(`${SERVER_URL}/api/classrooms/${id}`);
  if (!res.ok) throw new Error('Classroom not found');
  return res.json();
}

/** Teacher-only: create a student account and enroll them in a classroom. */
export async function registerStudent(
  classId: string,
  input: { email: string; password: string; name: string },
) {
  const res = await authedFetch(`${SERVER_URL}/api/classrooms/${classId}/students`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'Failed to register student');
  }
  return res.json();
}

export async function listClassrooms(): Promise<Classroom[]> {
  const res = await authedFetch(`${SERVER_URL}/api/classrooms`);
  if (!res.ok) throw new Error('Failed to load classes');
  return res.json();
}

export async function deleteClassroom(id: string) {
  const res = await authedFetch(`${SERVER_URL}/api/classrooms/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete class');
  return res.json();
}

/** Teacher-only: remove a student from a class (unenroll + drop from live session). */
export async function removeStudent(classId: string, studentId: string) {
  const res = await authedFetch(
    `${SERVER_URL}/api/classrooms/${classId}/students/${studentId}`,
    { method: 'DELETE' },
  );
  if (!res.ok) throw new Error('Failed to remove student');
  return res.json();
}
