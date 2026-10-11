/**
 * Socket.io contract for ClassSync, shared between server and both clients.
 * Every event name lives here so no side drifts out of sync with the others.
 */

export const EVENTS = {
  // Client -> Server (student app)
  CLIENT_JOIN_SESSION: 'client:join_session',
  CLIENT_STATE_CHANGE: 'client:state_change',
  STUDENT_HEARTBEAT: 'student:heartbeat',

  // Teacher -> Server (web dashboard)
  TEACHER_JOIN_CLASSROOM: 'teacher:join_classroom',
  TEACHER_START_SESSION: 'teacher:start_session',
  TEACHER_END_SESSION: 'teacher:end_session',
  TEACHER_SET_MODE: 'teacher:set_mode',
  TEACHER_PING_STUDENT: 'teacher:ping_student',
  TEACHER_UNLOCK_STUDENT: 'teacher:unlock_student',

  // Server -> Student app
  SERVER_SESSION_STATE: 'server:session_state',
  SERVER_MODE_CHANGED: 'server:mode_changed',
  SERVER_PING: 'server:ping',
  SERVER_SESSION_ENDED: 'server:session_ended',
  // The student's own authoritative status/score, pushed so the app mirrors
  // the server instead of computing a local score that can drift.
  SERVER_STUDENT_STATE: 'server:student_state',

  // Server -> Teacher dashboard
  SERVER_GRID_STATE: 'server:grid_state',
  SERVER_BREACH_ALERT: 'server:breach_alert',
} as const;

/**
 * Grace window (ms) a student may be backgrounded before the leave is
 * confirmed (banner pops, penalty applied). One penalty per confirmed
 * leave — iOS freezes the student app's JS while backgrounded, so neither
 * side can count further windows.
 */
export const GRACE_WINDOW_MS = 30_000;

/** Focus score penalty applied once per confirmed leave or breach. */
export const FOCUS_PENALTY_PER_INFRACTION = 10;

/** Min heartbeat interval (ms) the student app sends liveness pings. */
export const HEARTBEAT_INTERVAL_MS = 5_000;

/** How long (ms) without a heartbeat before a student is marked OFFLINE. */
export const OFFLINE_THRESHOLD_MS = 15_000;

/** Backoff parameters for the socket.io client reconnection. */
export const RECONNECT = {
  INITIAL_DELAY_MS: 500,
  MAX_DELAY_MS: 10_000,
  FACTOR: 2,
  MAX_ATTEMPTS: Infinity,
} as const;

/** Room scoping helpers: teachers bind to classroom rooms, students to session rooms. */
export const ROOM = {
  classroom: (classroomId: string) => `classroom:${classroomId}`,
  session: (sessionId: string) => `session:${sessionId}`,
} as const;