import { createServer } from 'node:http';
import cors from 'cors';
import express from 'express';
import { Server, type Socket } from 'socket.io';

import {
  EVENTS,
  ROOM,
  type FocusEventType,
  type SessionMode,
} from '@classsync/common';

import { requireRole, signToken, socketUser } from './auth.js';
import { SessionManager } from './session-manager.js';
import {
  createClassroom,
  createUser,
  deleteClassroom,
  enrollStudent,
  getActiveSessionForClassroom,
  getClassroom,
  getClassroomByCode,
  getClassroomsByTeacher,
  getClassroomsForStudent,
  getEnrolledStudentIds,
  getEnrolledStudents,
  getUser,
  getUserByEmail,
  seed,
  saveSession,
  unenrollStudent,
  verifyUserPassword,
} from './store.js';

seed();

const PORT = Number(process.env.PORT ?? 4000);
const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

// socketId -> metadata about who/what the socket represents
interface SocketMeta {
  role: 'STUDENT' | 'TEACHER';
  userId: string;
  classroomId?: string;
  sessionId?: string;
}

const metaBySocket = new Map<string, SocketMeta>();
const socketByStudent = new Map<string, string>(); // studentId -> socketId

const sessionManager = new SessionManager({
  roomEmit: (room, event, payload) => io.to(room).emit(event, payload),
  studentEmit: (studentId, event, payload) => {
    const socketId = socketByStudent.get(studentId);
    if (socketId) io.to(socketId).emit(event, payload);
  },
});

// Seed a session's enrolled students so the teacher grid shows the full roster
// up front — each OFFLINE until their real app connects (then they go FOCUSED).
function loadEnrolledRoster(sessionId: string, classroomId: string): void {
  for (const s of getEnrolledStudents(classroomId)) {
    sessionManager.seedStudent(sessionId, classroomId, s.studentId, s.name);
  }
}

// Pre-seed the demo classroom (code `123456`) with a live session + roster so
// the teacher dashboard is populated on first open, before any device joins.
function seedDemoSession(): void {
  const classroom = getClassroomByCode('123456');
  if (!classroom) return;
  if (getActiveSessionForClassroom(classroom.id)) return;

  const sessionId = 'session-demo';
  const session = saveSession({
    id: sessionId,
    classroomId: classroom.id,
    state: 'ACTIVE_LEARNING',
    startedAt: new Date().toISOString(),
  });
  sessionManager.startSession(sessionId, classroom.id, session.startedAt);
  loadEnrolledRoster(sessionId, classroom.id);
}

seedDemoSession();

// --------------------------------------------------------------- REST api

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// ------------------------------------------------------------------- auth

// Register a new account. Roles are limited to TEACHER/STUDENT — PARENT and
// ADMIN accounts are provisioned out of band, never via the public API.
app.post('/api/auth/register', (req, res) => {
  const { email, password, name, role } = req.body ?? {};
  if (!email || !password || !name || (role !== 'TEACHER' && role !== 'STUDENT')) {
    res.status(400).json({
      error: 'email, password, name, and role (TEACHER|STUDENT) are required',
    });
    return;
  }
  if (getUserByEmail(String(email))) {
    res.status(409).json({ error: 'an account with this email already exists' });
    return;
  }
  const user = createUser({
    email: String(email),
    name: String(name),
    role,
    password: String(password),
  });
  res.status(201).json({ token: signToken(user), user });
});

// Login: one endpoint for both roles; the client app enforces which role it
// accepts, and every protected route re-checks the role server-side.
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }
  const user = verifyUserPassword(String(email), String(password));
  if (!user) {
    res.status(401).json({ error: 'invalid email or password' });
    return;
  }
  res.json({ token: signToken(user), user });
});

// Current user, for clients restoring a session from a stored token.
app.get('/api/auth/me', requireRole('TEACHER', 'STUDENT', 'PARENT', 'ADMIN'), (req, res) => {
  const user = getUser(req.user!.sub);
  if (!user) {
    res.status(404).json({ error: 'user not found' });
    return;
  }
  res.json(user);
});

// ---------------------------------------------------------------- protected

// Create a classroom and return its join code to the teacher.
app.post('/api/classrooms', requireRole('TEACHER'), (req, res) => {
  const { name } = req.body ?? {};
  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  const classroom = createClassroom(String(name), req.user!.sub);
  res.status(201).json(classroom);
});

// List the signed-in teacher's classrooms (persisted across restarts).
app.get('/api/classrooms', requireRole('TEACHER'), (req, res) => {
  res.json(getClassroomsByTeacher(req.user!.sub));
});

// Delete a classroom the signed-in teacher owns (and its enrollments).
app.delete('/api/classrooms/:id', requireRole('TEACHER'), (req, res) => {
  const classroom =
    getClassroom(req.params.id) ?? getClassroomByCode(req.params.id);
  if (!classroom) {
    res.status(404).json({ error: 'classroom not found' });
    return;
  }
  if (classroom.teacherId !== req.user!.sub) {
    res.status(403).json({ error: 'only the owning teacher can delete this class' });
    return;
  }
  deleteClassroom(classroom.id);
  res.json({ ok: true });
});

// List the classes the signed-in student is enrolled in.
app.get('/api/me/classes', requireRole('STUDENT'), (req, res) => {
  res.json(getClassroomsForStudent(req.user!.sub));
});

// Student removes themselves from a class ("delete" on their side).
app.delete('/api/me/classes/:id', requireRole('STUDENT'), (req, res) => {
  const classroom =
    getClassroom(req.params.id) ?? getClassroomByCode(req.params.id);
  if (!classroom) {
    res.status(404).json({ error: 'classroom not found' });
    return;
  }
  unenrollStudent(classroom.id, req.user!.sub);
  res.json({ ok: true });
});

// Teacher removes a student from a class: unenrolls them and drops them from
// any live session immediately (class switch, troubleshooting, etc.).
app.delete(
  '/api/classrooms/:id/students/:studentId',
  requireRole('TEACHER'),
  (req, res) => {
    const classroom =
      getClassroom(req.params.id) ?? getClassroomByCode(req.params.id);
    if (!classroom) {
      res.status(404).json({ error: 'classroom not found' });
      return;
    }
    if (classroom.teacherId !== req.user!.sub) {
      res.status(403).json({ error: 'only the owning teacher can remove students' });
      return;
    }
    const { studentId } = req.params;
    if (!getUser(studentId)) {
      res.status(404).json({ error: 'student not found' });
      return;
    }
    unenrollStudent(classroom.id, studentId);
    sessionManager.remove(studentId);
    // Drop their live socket so their app stops reporting immediately.
    const socketId = socketByStudent.get(studentId);
    if (socketId) {
      io.to(socketId).emit(EVENTS.SERVER_SESSION_ENDED, { sessionId: null });
      io.sockets.sockets.get(socketId)?.disconnect(true);
    }
    res.json({ ok: true });
  },
);

// Look up a classroom (teacher dashboard load) by id or code.
app.get('/api/classrooms/:id', requireRole('TEACHER'), (req, res) => {
  const classroom =
    getClassroom(req.params.id) ?? getClassroomByCode(req.params.id);
  if (!classroom) {
    res.status(404).json({ error: 'classroom not found' });
    return;
  }
  res.json({
    ...classroom,
    enrolledStudentIds: getEnrolledStudentIds(classroom.id),
    activeSessionId: getActiveSessionForClassroom(classroom.id)?.id ?? null,
  });
});

// Register a student account and enroll them in the teacher's classroom.
// Persists to data/users.json like every other account write.
app.post('/api/classrooms/:id/students', requireRole('TEACHER'), (req, res) => {
  const classroom =
    getClassroom(req.params.id) ?? getClassroomByCode(req.params.id);
  if (!classroom) {
    res.status(404).json({ error: 'classroom not found' });
    return;
  }
  if (classroom.teacherId !== req.user!.sub) {
    res.status(403).json({ error: 'only the owning teacher can add students' });
    return;
  }
  const { email, password, name } = req.body ?? {};
  if (!email || !password || !name) {
    res.status(400).json({ error: 'email, password, and name are required' });
    return;
  }
  if (String(password).length < 4) {
    res.status(400).json({ error: 'password must be at least 4 characters' });
    return;
  }
  const existing = getUserByEmail(String(email));
  if (existing) {
    if (existing.role !== 'STUDENT') {
      res.status(409).json({ error: 'an account with this email already exists' });
      return;
    }
    // Existing student account: just enroll them in this class.
    enrollStudent(classroom.id, existing.id);
    res.status(200).json({ user: existing, enrolled: true, existing: true });
    return;
  }
  const user = createUser({
    email: String(email),
    name: String(name),
    role: 'STUDENT',
    password: String(password),
  });
  enrollStudent(classroom.id, user.id);
  res.status(201).json({ user, enrolled: true });
});

// Resolve a student join code into the ids the app needs to open a socket.
// The student's identity comes from the JWT — never from the request body.
app.post('/api/join', requireRole('STUDENT'), (req, res) => {
  const { code } = req.body ?? {};
  if (!code) {
    res.status(400).json({ error: 'code is required' });
    return;
  }
  const classroom = getClassroomByCode(String(code));
  if (!classroom) {
    res.status(404).json({ error: 'invalid join code' });
    return;
  }

  // Auto-create a session if the teacher hasn't started one yet, so students
  // can always connect during a demo without coordinating first.
  let session = getActiveSessionForClassroom(classroom.id);
  if (!session) {
    const sessionId = `session-${Math.random().toString(36).slice(2, 10)}`;
    session = saveSession({
      id: sessionId,
      classroomId: classroom.id,
      state: 'ACTIVE_LEARNING',
      startedAt: new Date().toISOString(),
    });
    sessionManager.startSession(sessionId, classroom.id, session.startedAt);
    loadEnrolledRoster(sessionId, classroom.id);
  }

  const studentId = req.user!.sub;
  enrollStudent(classroom.id, studentId);

  res.json({
    classroomId: classroom.id,
    sessionId: session.id,
    studentId,
    name: req.user!.name,
  });
});

// ------------------------------------------------------------- Socket.io

io.on('connection', (socket: Socket) => {
  // Every socket must present a valid JWT in the handshake. Unauthenticated
  // sockets are dropped before they can join rooms or emit events.
  const authedUser = socketUser(socket.handshake.auth);
  if (!authedUser) {
    socket.disconnect(true);
    return;
  }

  socket.on(EVENTS.CLIENT_JOIN_SESSION, (payload) => {
    // Student app joins a live session; identity comes from the JWT.
    if (authedUser.role !== 'STUDENT') return;
    const { classroomId, sessionId } = payload ?? {};
    if (!classroomId || !sessionId) return;

    const studentId = authedUser.sub;
    const name = authedUser.name;

    const result = sessionManager.join({
      classroomId,
      sessionId,
      studentId,
      name,
    });

    if (result.state === 'ENDED') {
      // The teacher ended the session while this student was disconnected —
      // tell their app instead of silently resurrecting the session.
      socket.emit(EVENTS.SERVER_SESSION_ENDED, { sessionId });
      return;
    }

    socket.join(ROOM.classroom(classroomId));
    socket.join(ROOM.session(sessionId));

    metaBySocket.set(socket.id, {
      role: 'STUDENT',
      userId: studentId,
      classroomId,
      sessionId,
    });
    socketByStudent.set(studentId, socket.id);

    // Tell the joining student the current mode.
    socket.emit(EVENTS.SERVER_SESSION_STATE, {
      sessionId: result.sessionId,
      state: result.state,
    });

    // ...and their own authoritative score/badge, so a reconnecting app can
    // never show a stale local number (e.g. a leave the server already
    // penalized while the phone was dark).
    const entry = sessionManager.studentState(sessionId, studentId);
    if (entry) socket.emit(EVENTS.SERVER_STUDENT_STATE, entry);
  });

  socket.on(EVENTS.CLIENT_STATE_CHANGE, (payload) => {
    if (authedUser.role !== 'STUDENT') return;
    const { sessionId, event } = payload ?? {};
    if (!sessionId || !event) return;
    sessionManager.onFocusEvent(
      authedUser.sub,
      event as FocusEventType,
      payload.timestamp ?? new Date().toISOString(),
    );
  });

  socket.on(EVENTS.STUDENT_HEARTBEAT, () => {
    if (authedUser.role !== 'STUDENT') return;
    sessionManager.heartbeat(authedUser.sub);
  });

  // ---------------------------------------------------------- teacher events

  socket.on(EVENTS.TEACHER_JOIN_CLASSROOM, (payload) => {
    if (authedUser.role !== 'TEACHER') return;
    const { classroomId } = payload ?? {};
    if (!classroomId) return;
    socket.join(ROOM.classroom(classroomId));
    metaBySocket.set(socket.id, {
      role: 'TEACHER',
      userId: authedUser.sub,
      classroomId,
    });

    // If a session is already live (e.g. a student auto-created it), bring the
    // teacher up to speed immediately.
    const active = getActiveSessionForClassroom(classroomId);
    if (active) {
      socket.emit(EVENTS.SERVER_GRID_STATE, sessionManager.snapshot(active.id));
    }
  });

  socket.on(EVENTS.TEACHER_START_SESSION, (payload) => {
    if (authedUser.role !== 'TEACHER') return;
    const { classroomId } = payload ?? {};
    if (!classroomId) return;
    const sessionId = `session-${Math.random().toString(36).slice(2, 10)}`;
    saveSession({
      id: sessionId,
      classroomId,
      state: 'ACTIVE_LEARNING',
      startedAt: new Date().toISOString(),
    });
    sessionManager.startSession(sessionId, classroomId, new Date().toISOString());
    loadEnrolledRoster(sessionId, classroomId);
    io.to(ROOM.classroom(classroomId)).emit(EVENTS.SERVER_SESSION_STATE, {
      sessionId,
      state: 'ACTIVE_LEARNING',
    });
  });

  socket.on(EVENTS.TEACHER_SET_MODE, (payload) => {
    if (authedUser.role !== 'TEACHER') return;
    const { sessionId, mode } = payload ?? {};
    if (!sessionId || !mode) return;
    sessionManager.setMode(sessionId, mode as SessionMode);
  });

  socket.on(EVENTS.TEACHER_PING_STUDENT, (payload) => {
    if (authedUser.role !== 'TEACHER') return;
    const { studentId } = payload ?? {};
    if (!studentId) return;
    sessionManager.ping(studentId);
  });

  socket.on(EVENTS.TEACHER_UNLOCK_STUDENT, (payload) => {
    if (authedUser.role !== 'TEACHER') return;
    const { studentId } = payload ?? {};
    if (!studentId) return;
    sessionManager.unlock(studentId);
  });

  socket.on(EVENTS.TEACHER_END_SESSION, (payload) => {
    if (authedUser.role !== 'TEACHER') return;
    const { sessionId, classroomId } = payload ?? {};
    if (!sessionId) return;
    sessionManager.endSession(sessionId);
    if (classroomId) {
      io.to(ROOM.classroom(classroomId)).emit(EVENTS.SERVER_SESSION_ENDED, {
        sessionId,
      });
    }
  });

  socket.on('disconnect', () => {
    // A dropped socket is not "student left" (mobile clients force-reconnect
    // on foreground): presence stays heartbeat-driven — the offline sweep
    // marks them OFFLINE once heartbeats go stale — so only per-socket
    // bookkeeping is cleaned up here.
    const meta = metaBySocket.get(socket.id);
    if (meta?.role === 'STUDENT') {
      socketByStudent.delete(meta.userId);
    }
    metaBySocket.delete(socket.id);
  });
});

// Offline sweep: mark students whose heartbeat lapsed.
setInterval(() => sessionManager.sweepOffline(), 5_000);

httpServer.listen(PORT, () => {
  console.log(`ClassSync server listening on http://localhost:${PORT}`);
  console.log('Demo classroom join code: 123456');
});