/**
 * Data store for the ClassSync first draft.
 *
 * User accounts, classrooms and enrollments are persisted to JSON files on
 * disk — `apps/server/data/*.json` — so they survive server restarts. Every
 * write goes straight through to disk. Live sessions remain in memory.
 * Swapping this for Postgres/Prisma later only touches this file — nothing
 * above it changes.
 */

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type {
  Classroom,
  Enrollment,
  Role,
  Session,
  User,
} from '@classsync/common';

/** Internal user record: the public User plus password material. */
export interface StoredUser extends User {
  passwordHash: string;
  salt: string;
}

// ------------------------------------------------------------------- state

const users = new Map<string, StoredUser>();
const classrooms = new Map<string, Classroom>();
const enrollments = new Map<string, Enrollment>(); // key: enrollment id
const sessions = new Map<string, Session>();

// ------------------------------------------------------------- persistence

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');

/** Load a persisted collection from its JSON file into `map`. */
function load<T extends { id: string }>(file: string, map: Map<string, T>): void {
  const path = join(DATA_DIR, file);
  if (!existsSync(path)) return;
  try {
    const rows = JSON.parse(readFileSync(path, 'utf8')) as T[];
    for (const row of rows) map.set(row.id, row);
    console.log(`[store] loaded ${rows.length} record(s) from ${path}`);
  } catch (err) {
    console.error(`[store] failed to load ${file}, starting empty:`, err);
  }
}

/** Write a whole collection to disk atomically (temp file + rename). */
function save<T>(file: string, map: Map<string, T>): void {
  mkdirSync(DATA_DIR, { recursive: true });
  const path = join(DATA_DIR, file);
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify([...map.values()], null, 2));
  renameSync(tmp, path);
}

const loadUsers = () => load<StoredUser>('users.json', users);
const saveUsers = () => save('users.json', users);
const saveClassrooms = () => save('classrooms.json', classrooms);
const saveEnrollments = () => save('enrollments.json', enrollments);

loadUsers();
load<Classroom>('classrooms.json', classrooms);
load<Enrollment>('enrollments.json', enrollments);

// ---------------------------------------------------------------- utilities

function randId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function generateJoinCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

// ------------------------------------------------------------------- users

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 32).toString('hex');
}

/** Strip password material before a user leaves the store. */
function publicUser(user: StoredUser): User {
  const { passwordHash: _ph, salt: _s, ...rest } = user;
  return rest;
}

export function getUser(id: string): User | undefined {
  const user = users.get(id);
  return user ? publicUser(user) : undefined;
}

export function getUserByEmail(email: string): User | undefined {
  const user = [...users.values()].find(
    (u) => u.email.toLowerCase() === email.toLowerCase(),
  );
  return user ? publicUser(user) : undefined;
}

export function createUser(input: {
  email: string;
  name: string;
  role: Role;
  password: string;
}): User {
  // Emails are the login identity — never allow two accounts with one.
  const dupe = [...users.values()].find(
    (u) => u.email.toLowerCase() === input.email.toLowerCase(),
  );
  if (dupe) throw new Error(`account with email ${input.email} already exists`);
  const salt = randomBytes(16).toString('hex');
  const user: StoredUser = {
    id: randId('user'),
    email: input.email,
    name: input.name,
    role: input.role,
    salt,
    passwordHash: hashPassword(input.password, salt),
  };
  users.set(user.id, user);
  saveUsers();
  return publicUser(user);
}

/** Returns the user when email + password match, otherwise null. */
export function verifyUserPassword(
  email: string,
  password: string,
): User | null {
  const user = [...users.values()].find(
    (u) => u.email.toLowerCase() === email.toLowerCase(),
  );
  if (!user) return null;
  const candidate = hashPassword(password, user.salt);
  const a = Buffer.from(candidate, 'hex');
  const b = Buffer.from(user.passwordHash, 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return publicUser(user);
}

/** Seed helper: create or update a user with a fixed id and password. */
export function upsertUser(user: User, password?: string): User {
  const existing = users.get(user.id);
  const salt = existing?.salt ?? randomBytes(16).toString('hex');
  const stored: StoredUser = {
    ...user,
    salt,
    passwordHash: password
      ? hashPassword(password, salt)
      : (existing?.passwordHash ?? hashPassword(randId('pw'), salt)),
  };
  users.set(user.id, stored);
  saveUsers();
  return publicUser(stored);
}

// ----------------------------------------------------------------- classes

export function createClassroom(
  name: string,
  teacherId: string,
  code = generateJoinCode(),
): Classroom {
  const classroom: Classroom = {
    id: randId('class'),
    code,
    teacherId,
    name,
  };
  classrooms.set(classroom.id, classroom);
  saveClassrooms();
  return classroom;
}

export function getClassroom(id: string): Classroom | undefined {
  return classrooms.get(id);
}

export function getClassroomByCode(code: string): Classroom | undefined {
  for (const classroom of classrooms.values()) {
    if (classroom.code === code) return classroom;
  }
  return undefined;
}

export function getClassroomsByTeacher(teacherId: string): Classroom[] {
  return [...classrooms.values()].filter((c) => c.teacherId === teacherId);
}

/** Delete a classroom and all of its enrollments. */
export function deleteClassroom(id: string): boolean {
  if (!classrooms.delete(id)) return false;
  for (const [enrollId, e] of enrollments) {
    if (e.classroomId === id) enrollments.delete(enrollId);
  }
  saveClassrooms();
  saveEnrollments();
  return true;
}

// ----------------------------------------------------------------- enroll

export function enrollStudent(classroomId: string, studentId: string): Enrollment {
  const existing = [...enrollments.values()].find(
    (e) => e.classroomId === classroomId && e.studentId === studentId,
  );
  if (existing) return existing;

  const enrollment: Enrollment = {
    id: randId('enroll'),
    classroomId,
    studentId,
  };
  enrollments.set(enrollment.id, enrollment);
  saveEnrollments();
  return enrollment;
}

/** Remove a student from a classroom. */
export function unenrollStudent(classroomId: string, studentId: string): boolean {
  const existing = [...enrollments.values()].find(
    (e) => e.classroomId === classroomId && e.studentId === studentId,
  );
  if (!existing) return false;
  enrollments.delete(existing.id);
  saveEnrollments();
  return true;
}

/** All classrooms a student is enrolled in, with their codes. */
export function getClassroomsForStudent(studentId: string): Classroom[] {
  return [...enrollments.values()]
    .filter((e) => e.studentId === studentId)
    .map((e) => classrooms.get(e.classroomId))
    .filter((c): c is Classroom => Boolean(c));
}

export function getEnrolledStudentIds(classroomId: string): string[] {
  return [...enrollments.values()]
    .filter((e) => e.classroomId === classroomId)
    .map((e) => e.studentId);
}

export function getEnrolledStudents(
  classroomId: string,
): { studentId: string; name: string }[] {
  return getEnrolledStudentIds(classroomId).map((studentId) => ({
    studentId,
    name: getUser(studentId)?.name ?? studentId,
  }));
}

// ----------------------------------------------------------------- sessions

export function saveSession(session: Session): Session {
  sessions.set(session.id, session);
  return session;
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id);
}

export function getActiveSessionForClassroom(
  classroomId: string,
): Session | undefined {
  for (const session of sessions.values()) {
    if (session.classroomId === classroomId && session.state !== 'ENDED') {
      return session;
    }
  }
  return undefined;
}

// ------------------------------------------------------------------- seed

/** Demo data so the app is runnable immediately with zero manual setup. */
export function seed(): void {
  const teacher: User = {
    id: 'teacher-1',
    email: 'teacher@classsync.demo',
    name: 'Ms. Demo Teacher',
    role: 'TEACHER',
  };
  upsertUser(teacher, 'demo1234');

  const classroom =
    getClassroomByCode('123456') ??
    createClassroom('Period 3 - Biology', teacher.id, '123456');

  // Pre-enrolled students so the teacher dashboard shows a populated roster
  // before any real device connects. They render OFFLINE until their app
  // actually joins a live session.
  const demoStudents: { id: string; name: string }[] = [
    { id: 'student-john', name: 'John Doe' },
    { id: 'student-alice', name: 'Alice Chen' },
    { id: 'student-bob', name: 'Bob Martinez' },
    { id: 'student-charlie', name: 'Charlie Okafor' },
    { id: 'student-dana', name: 'Dana Kim' },
    { id: 'student-eli', name: 'Eli Nguyen' },
  ];
  for (const s of demoStudents) {
    if (!getUser(s.id)) {
      upsertUser(
        {
          id: s.id,
          email: `${s.id.replace('student-', '')}@classsync.demo`,
          name: s.name,
          role: 'STUDENT',
        },
        'demo1234',
      );
    }
    enrollStudent(classroom.id, s.id);
  }
}