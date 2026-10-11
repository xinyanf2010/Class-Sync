/**
 * Shared domain types for ClassSync.
 *
 * These types are consumed by the mobile app, the teacher web dashboard, and the
 * backend server. Keep them free of any platform-specific imports so they can
 * compile everywhere.
 */

export type Role = 'STUDENT' | 'TEACHER' | 'PARENT' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface Classroom {
  id: string;
  /** 6-digit student join code. */
  code: string;
  teacherId: string;
  name: string;
}

export interface Enrollment {
  id: string;
  classroomId: string;
  studentId: string;
}

/**
 * Session lifecycle. A session starts IDLE and transitions through the three
 * focus modes before being ENDED. `mode` and lifecycle `state` are modeled as a
 * single enum to match the spec (the mode IS the current state of a live
 * session).
 */
export type SessionState =
  | 'IDLE'
  | 'ACTIVE_LEARNING'
  | 'QUIET_STUDY'
  | 'ASSESSMENT_LOCK'
  | 'ENDED';

/** The mode that a live (non-IDLE/non-ENDED) session is in. */
export type SessionMode = Exclude<SessionState, 'IDLE' | 'ENDED'>;

/** Persisted record of a session (live state lives in the SessionManager). */
export interface Session {
  id: string;
  classroomId: string;
  state: SessionState;
  startedAt: string;
}

/**
 * Status of a single student as shown on a teacher's card.
 *   FOCUSED    -> green badge
 *   DISTRACTED -> yellow badge (away from the app with the screen still on)
 *   BREACHED   -> red badge (left app during ASSESSMENT_LOCK)
 *   OFFLINE    -> screen off (device locked) / not connected
 */
export type StudentStatus = 'FOCUSED' | 'DISTRACTED' | 'BREACHED' | 'OFFLINE';

/** Discrete focus events emitted from the student app. */
export type FocusEventType =
  | 'APP_BACKGROUNDED'
  | 'APP_FOREGROUNDED'
  // Reported by the native screen-state module so the server can tell a
  // locked phone (screen off -> OFFLINE) from an app switch with the screen
  // still on (-> DISTRACTED) even though heartbeats freeze in both cases.
  | 'SCREEN_ON'
  | 'SCREEN_OFF'
  | 'FOCUS_REESTABLISHED'
  | 'ASSESSMENT_BREACH'
  | 'JOINED'
  | 'LEFT';

export interface TelemetryPayload {
  studentId: string;
  sessionId: string;
  event: FocusEventType;
  timestamp: string;
}

/** Snapshot of a single student in a session, sent to the teacher grid. */
export interface StudentRosterEntry {
  studentId: string;
  name: string;
  status: StudentStatus;
  /** 0-100, degrades while backgrounded outside the grace window. */
  focusScore: number;
  lastHeartbeat: string;
  /** ISO timestamp of when the student backgrounded, if currently DISTRACTED. */
  backgroundedSince?: string;
}

/** Full state pushed to a teacher for a single live session. */
export interface SessionSnapshot {
  sessionId: string;
  classroomId: string;
  state: SessionState;
  startedAt: string;
  students: StudentRosterEntry[];
}

/** Safe-to-share user record returned by the auth endpoints (no hashes). */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

/** Response of POST /api/auth/login and /api/auth/register. */
export interface AuthResponse {
  token: string;
  user: AuthUser;
}

/** Payload a student receives when a teacher sends a focus ping/nudge. */
export interface PingPayload {
  sessionId: string;
  timestamp: string;
}

/**
 * The student's own authoritative status/score, pushed to their app so it
 * displays the server's number instead of a local mirror — keeping the
 * student app and the teacher dashboard in sync.
 */
export interface StudentStatePayload {
  sessionId: string;
  status: StudentStatus;
  focusScore: number;
}

/** Payload broadcast when a mode change happens. */
export interface ModeChangePayload {
  sessionId: string;
  mode: SessionMode;
  timestamp: string;
}