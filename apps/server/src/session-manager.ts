/**
 * SessionManager owns the live session state machine.
 *
 * Responsibilities:
 *   - Transition sessions through the focus modes + ENDED.
 *   - Track per-student status (FOCUSED / DISTRACTED / BREACHED / OFFLINE) —
 *     the badge — separately from the confirmed 'Away since' leave banner.
 *   - Enforce the grace window: a student may background for up to
 *     GRACE_WINDOW_MS before being flagged. During ASSESSMENT_LOCK, any
 *     backgrounding is an immediate breach.
 *   - Own the focus score — one penalty per confirmed leave or breach —
 *     and push each student's own state to their app, so the student app
 *     and the teacher dashboard always show the same number.
 *   - Sweep for students whose heartbeats have gone stale.
 *
 * It is deliberately decoupled from Socket.io: methods return "effects" (what
 * to broadcast, and to whom) so the IO layer stays thin and testable.
 */

import {
  EVENTS,
  FOCUS_PENALTY_PER_INFRACTION,
  GRACE_WINDOW_MS,
  OFFLINE_THRESHOLD_MS,
  ROOM,
  type FocusEventType,
  type ModeChangePayload,
  type SessionMode,
  type SessionState,
  type SessionSnapshot,
  type StudentRosterEntry,
  type StudentStatePayload,
  type StudentStatus,
} from '@classsync/common';

interface StudentState {
  studentId: string;
  name: string;
  status: StudentStatus;
  focusScore: number;
  lastHeartbeat: string;
  backgroundedSince?: string;
  /**
   * Last screen state the device reported (SCREEN_ON/SCREEN_OFF). When the
   * app is backgrounded its heartbeats freeze either way, so this flag is
   * what lets the sweep tell "locked phone" (OFFLINE) from "app switch with
   * the screen still on" (DISTRACTED). Defaults true — an app that just
   * joined is, by definition, on-screen.
   */
  screenOn: boolean;
  /** True once the grace window confirmed the leave — pops the banner. */
  awayConfirmed: boolean;
  /** Pending grace timer; a foreground event clears it before it fires. */
  graceTimer: ReturnType<typeof setTimeout> | null;
}

export interface JoinResult {
  sessionId: string;
  state: SessionState;
}

/** A single student join request payload. */
export interface JoinRequest {
  classroomId: string;
  sessionId: string;
  studentId: string;
  name: string;
}

export interface ManagerEvents {
  roomEmit: (room: string, event: string, payload: unknown) => void;
  studentEmit: (studentId: string, event: string, payload: unknown) => void;
}

export class SessionManager {
  // sessionId -> studentId -> state
  private sessions = new Map<string, Map<string, StudentState>>();
  // sessionId -> classroomId
  private classroomBySession = new Map<string, string>();
  // sessionId -> current state
  private stateBySession = new Map<string, SessionState>();
  // sessionId -> startedAt
  private startedAtBySession = new Map<string, string>();
  // studentId -> sessionId (current live session)
  private sessionByStudent = new Map<string, string>();

  constructor(private readonly events: ManagerEvents) {}

  // ------------------------------------------------------------ lifecycle

  startSession(sessionId: string, classroomId: string, startedAt: string): void {
    this.sessions.set(sessionId, new Map());
    this.classroomBySession.set(sessionId, classroomId);
    this.stateBySession.set(sessionId, 'ACTIVE_LEARNING');
    this.startedAtBySession.set(sessionId, startedAt);
  }

  endSession(sessionId: string): void {
    for (const [studentId] of this.sessions.get(sessionId) ?? []) {
      this.clearGrace(studentId);
      this.sessionByStudent.delete(studentId);
    }
    this.stateBySession.set(sessionId, 'ENDED');
    this.sessions.delete(sessionId);
    this.classroomBySession.delete(sessionId);
    this.startedAtBySession.delete(sessionId);
  }

  getState(sessionId: string): SessionState | undefined {
    return this.stateBySession.get(sessionId);
  }

  // ---------------------------------------------------------------- joins

  join(request: JoinRequest): JoinResult {
    const { sessionId, studentId, name, classroomId } = request;

    // A join to a session the teacher already ended must not resurrect it —
    // e.g. a student whose phone was dark when the session ended reconnects
    // on wake and re-joins. endSession deliberately keeps the ENDED state so
    // it can be detected here.
    if (this.stateBySession.get(sessionId) === 'ENDED') {
      return { sessionId, state: 'ENDED' };
    }

    if (!this.classroomBySession.has(sessionId)) {
      // Late join to a session not yet tracked (e.g. server restarted) — accept.
      this.classroomBySession.set(sessionId, classroomId);
    }
    if (!this.stateBySession.has(sessionId)) {
      this.stateBySession.set(sessionId, 'ACTIVE_LEARNING');
    }
    if (!this.startedAtBySession.has(sessionId)) {
      this.startedAtBySession.set(sessionId, new Date().toISOString());
    }

    let students = this.sessions.get(sessionId);
    if (!students) {
      students = new Map();
      this.sessions.set(sessionId, students);
    }

    const existing = students.get(studentId);
    let student: StudentState;
    if (existing) {
      student = existing;
      student.status = 'FOCUSED';
      student.name = name;
      student.lastHeartbeat = new Date().toISOString();
      student.backgroundedSince = undefined;
      student.awayConfirmed = false;
      student.screenOn = true;
    } else {
      student = {
        studentId,
        name,
        status: 'FOCUSED',
        focusScore: 100,
        lastHeartbeat: new Date().toISOString(),
        screenOn: true,
        awayConfirmed: false,
        graceTimer: null,
      };
      students.set(studentId, student);
    }

    this.sessionByStudent.set(studentId, sessionId);
    this.events.roomEmit(
      ROOM.classroom(this.classroomBySession.get(sessionId)!),
      EVENTS.SERVER_GRID_STATE,
      this.snapshot(sessionId),
    );

    return { sessionId, state: this.stateBySession.get(sessionId)! };
  }

  /**
   * Pre-seed an enrolled student into a live session so the teacher grid shows
   * the full roster immediately. They start OFFLINE (no heartbeat yet) and go
   * FOCUSED the moment their real app joins or heartbeats.
   */
  seedStudent(
    sessionId: string,
    classroomId: string,
    studentId: string,
    name: string,
  ): void {
    if (!this.classroomBySession.has(sessionId)) {
      this.classroomBySession.set(sessionId, classroomId);
    }
    if (!this.stateBySession.has(sessionId)) {
      this.stateBySession.set(sessionId, 'ACTIVE_LEARNING');
    }
    if (!this.startedAtBySession.has(sessionId)) {
      this.startedAtBySession.set(sessionId, new Date().toISOString());
    }
    let students = this.sessions.get(sessionId);
    if (!students) {
      students = new Map();
      this.sessions.set(sessionId, students);
    }
    if (students.has(studentId)) return;
    students.set(studentId, {
      studentId,
      name,
      status: 'OFFLINE',
      focusScore: 100,
      lastHeartbeat: new Date(0).toISOString(),
      screenOn: true,
      awayConfirmed: false,
      graceTimer: null,
    });
    this.sessionByStudent.set(studentId, sessionId);
  }

  /** Teacher-forced removal: drop from the live session roster entirely. */
  remove(studentId: string): void {
    this.clearGrace(studentId);
    const sessionId = this.sessionByStudent.get(studentId);
    this.sessionByStudent.delete(studentId);
    if (sessionId) {
      const students = this.sessions.get(sessionId);
      if (students) {
        students.delete(studentId);
      }
      const classroomId = this.classroomBySession.get(sessionId);
      if (classroomId) {
        this.events.roomEmit(
          ROOM.classroom(classroomId),
          EVENTS.SERVER_GRID_STATE,
          this.snapshot(sessionId),
        );
      }
    }
  }

  // NOTE: there is deliberately no leave-on-disconnect. A dropped socket is
  // not "student left" — mobile clients force-reconnect when foregrounding,
  // so presence is heartbeat-driven instead: the offline sweep marks a
  // student OFFLINE once their heartbeats go stale, and their events keep
  // working because the session mapping survives transient disconnects.

  // -------------------------------------------------------------- heartbeats

  heartbeat(studentId: string): void {
    const sessionId = this.sessionByStudent.get(studentId);
    if (!sessionId) return;
    const students = this.sessions.get(sessionId);
    const student = students?.get(studentId);
    if (!student) return;
    student.lastHeartbeat = new Date().toISOString();
    if (student.backgroundedSince !== undefined) {
      // Alive but still backgrounded — an app switch with the app itself
      // still running (demo simulator, some Android setups). Never FOCUSED
      // and never left OFFLINE while away: if the sweep had already marked
      // the device dark, DISTRACTED is the honest badge. The banner's
      // timing still belongs to the grace window.
      if (student.status === 'OFFLINE') {
        student.status = 'DISTRACTED';
        this.broadcastGrid(sessionId);
      }
      return;
    }
    // Not marked away: a heartbeat means the app is alive in the foreground
    // again — lift OFFLINE (e.g. after a network drop where no
    // APP_FOREGROUNDED ever arrives; the resumed app's first heartbeat
    // recovers the grid).
    if (student.status === 'OFFLINE') {
      student.status = 'FOCUSED';
      this.broadcastGrid(sessionId);
    }
  }

  // ---------------------------------------------------------- state changes

  /**
   * Handle a focus event from the student app. Returns true if anything about
   * the student changed (so the caller can decide whether to rebroadcast).
   */
  onFocusEvent(
    studentId: string,
    eventType: FocusEventType,
    timestamp: string,
  ): void {
    const sessionId = this.sessionByStudent.get(studentId);
    if (!sessionId) return;
    const state = this.stateBySession.get(sessionId);
    if (!state || state === 'ENDED') return;

    const students = this.sessions.get(sessionId);
    const student = students?.get(studentId);
    if (!student) return;

    const now = new Date().toISOString();

    switch (eventType) {
      case 'APP_BACKGROUNDED': {
        if (state === 'ASSESSMENT_LOCK') {
          student.backgroundedSince = now;
          this.flagBreach(studentId, now);
          return;
        }
        // Record the true leave time and start the grace window. Nothing is
        // broadcast yet: the banner only surfaces (via snapshot()) once the
        // leave is confirmed past the grace window — a dark phone and an
        // app switch look identical here, and both are simply "away".
        student.backgroundedSince = now;
        this.scheduleGrace(studentId);
        return;
      }

      case 'APP_FOREGROUNDED': {
        this.clearGrace(studentId);
        // Back in the app: clear the away timestamp and its banner and
        // recover if they had already slipped past the grace window into
        // DISTRACTED, or been marked OFFLINE by the sweep / a dropped socket.
        student.backgroundedSince = undefined;
        student.awayConfirmed = false;
        if (student.status === 'DISTRACTED' || student.status === 'OFFLINE') {
          student.status = 'FOCUSED';
        }
        student.lastHeartbeat = now;
        this.broadcastGrid(sessionId);
        return;
      }

      case 'ASSESSMENT_BREACH': {
        this.flagBreach(studentId, now);
        return;
      }

      case 'SCREEN_OFF': {
        // Device locked. The app's JS is about to freeze, so this is the
        // last word we'll get until wake — the sweep turns the badge OFFLINE
        // once heartbeats go stale.
        student.screenOn = false;
        return;
      }

      case 'SCREEN_ON': {
        // Device unlocked. Proves liveness on its own (it only fires while
        // the app is alive), so it doubles as a heartbeat.
        student.screenOn = true;
        student.lastHeartbeat = now;
        // Screen on but still backgrounded: the honest badge is DISTRACTED,
        // not the OFFLINE the sweep painted while the phone was dark.
        if (
          student.status === 'OFFLINE' &&
          student.backgroundedSince !== undefined
        ) {
          student.status = 'DISTRACTED';
          this.broadcastGrid(sessionId);
        }
        return;
      }

      default:
        student.lastHeartbeat = now;
    }
    void timestamp; // reserved for future audit-log work
  }

  // ------------------------------------------------------------------- mode

  setMode(sessionId: string, mode: SessionMode): void {
    const prev = this.stateBySession.get(sessionId);
    if (prev === 'ENDED' || prev === undefined) return;
    this.stateBySession.set(sessionId, mode);

    const classroomId = this.classroomBySession.get(sessionId);
    if (!classroomId) return;

    const payload: ModeChangePayload = {
      sessionId,
      mode,
      timestamp: new Date().toISOString(),
    };
    this.events.roomEmit(ROOM.session(sessionId), EVENTS.SERVER_MODE_CHANGED, payload);
    this.events.roomEmit(
      ROOM.classroom(classroomId),
      EVENTS.SERVER_GRID_STATE,
      this.snapshot(sessionId),
    );
  }

  // ----------------------------------------------------------------- actions

  ping(studentId: string): void {
    const sessionId = this.sessionByStudent.get(studentId);
    if (!sessionId) return;
    this.events.studentEmit(studentId, EVENTS.SERVER_PING, {
      sessionId,
      timestamp: new Date().toISOString(),
    });
  }

  unlock(studentId: string): void {
    const sessionId = this.sessionByStudent.get(studentId);
    if (!sessionId) return;
    const student = this.sessions.get(sessionId)?.get(studentId);
    if (!student) return;
    student.status = 'FOCUSED';
    student.backgroundedSince = undefined;
    student.awayConfirmed = false;
    this.clearGrace(studentId);
    this.broadcastGrid(sessionId);
  }

  // ------------------------------------------------------------- snapshots

  /**
   * The student's own authoritative status/score — used by the IO layer to
   * catch a (re)connecting app up with what the server already decided (e.g.
   * a leave it penalized while the phone was dark).
   */
  studentState(
    sessionId: string,
    studentId: string,
  ): StudentStatePayload | undefined {
    const s = this.sessions.get(sessionId)?.get(studentId);
    if (!s) return undefined;
    return {
      sessionId,
      status: s.status,
      focusScore: Math.max(0, Math.min(100, s.focusScore)),
    };
  }

  snapshot(sessionId: string): SessionSnapshot {
    const students = [...(this.sessions.get(sessionId)?.values() ?? [])];
    const roster: StudentRosterEntry[] = students.map((s) => ({
      studentId: s.studentId,
      name: s.name,
      status: s.status,
      focusScore: Math.max(0, Math.min(100, s.focusScore)),
      lastHeartbeat: s.lastHeartbeat,
      // The badge and the banner carry different truths. The badge says what
      // the device is doing right now: DISTRACTED (app still running in the
      // background), OFFLINE (phone dark / signal gone), BREACHED, FOCUSED.
      // The 'Away since' banner says the leave itself is confirmed: it pops
      // when the grace window elapses (awayConfirmed) — under either badge —
      // or immediately for a breach during Assessment Lock. A brief leave
      // within the grace window shows neither, and the timestamp is the true
      // leave time, captured the moment the app reported backgrounding.
      backgroundedSince:
        s.backgroundedSince !== undefined &&
        (s.status === 'BREACHED' || s.awayConfirmed)
          ? s.backgroundedSince
          : undefined,
    }));

    return {
      sessionId,
      classroomId: this.classroomBySession.get(sessionId) ?? '',
      state: this.stateBySession.get(sessionId) ?? 'IDLE',
      startedAt: this.startedAtBySession.get(sessionId) ?? '',
      students: roster,
    };
  }

  // ------------------------------------------------------------- internals

  private scheduleGrace(studentId: string): void {
    this.clearGrace(studentId);
    const sessionId = this.sessionByStudent.get(studentId);
    if (!sessionId) return;
    const student = this.sessions.get(sessionId)?.get(studentId);
    if (!student) return;

    student.graceTimer = setTimeout(() => {
      const s = this.sessions.get(sessionId)?.get(studentId);
      if (!s || s.backgroundedSince === undefined) return;
      // The grace window elapsed and the app never came back: the leave is
      // confirmed. The banner pops — under whatever badge is showing — and
      // the score takes one hit. Exactly one, whether the phone went dark or
      // the app kept running in the background: iOS freezes the student
      // app's JS while it is backgrounded, so the app can only ever count
      // whole leaves — the server must score the same way or the two
      // displays drift apart.
      s.awayConfirmed = true;
      s.focusScore = Math.max(0, s.focusScore - FOCUS_PENALTY_PER_INFRACTION);
      s.graceTimer = null;
      // The badge still depends on what the phone is doing. Fresh heartbeats
      // = the app itself is still running in the background (demo simulator,
      // some Android setups) -> DISTRACTED. Stale = the phone went dark ->
      // the sweep already shows OFFLINE, and that honest label stays.
      const heartbeatFresh =
        Date.now() - new Date(s.lastHeartbeat).getTime() < OFFLINE_THRESHOLD_MS;
      if (heartbeatFresh) {
        s.status = 'DISTRACTED';
      }
      this.broadcastGrid(sessionId);
    }, GRACE_WINDOW_MS);
  }

  private flagBreach(studentId: string, now: string): void {
    const sessionId = this.sessionByStudent.get(studentId);
    if (!sessionId) return;
    const student = this.sessions.get(sessionId)?.get(studentId);
    if (!student) return;

    this.clearGrace(studentId);
    student.status = 'BREACHED';
    student.focusScore = Math.max(0, student.focusScore - FOCUS_PENALTY_PER_INFRACTION);

    const classroomId = this.classroomBySession.get(sessionId);
    if (classroomId) {
      this.events.roomEmit(
        ROOM.classroom(classroomId),
        EVENTS.SERVER_BREACH_ALERT,
        this.studentEntry(student, now),
      );
    }
    this.broadcastGrid(sessionId);
  }

  private clearGrace(studentId: string): void {
    const sessionId = this.sessionByStudent.get(studentId);
    const student = sessionId
      ? this.sessions.get(sessionId)?.get(studentId)
      : undefined;
    if (student?.graceTimer) {
      clearTimeout(student.graceTimer);
      student.graceTimer = null;
    }
  }

  private studentEntry(s: StudentState, timestamp: string): StudentRosterEntry {
    return {
      studentId: s.studentId,
      name: s.name,
      status: s.status,
      focusScore: Math.max(0, Math.min(100, s.focusScore)),
      lastHeartbeat: timestamp,
      backgroundedSince: s.backgroundedSince,
    };
  }

  private broadcastGrid(sessionId: string): void {
    const classroomId = this.classroomBySession.get(sessionId);
    if (!classroomId) return;
    this.events.roomEmit(
      ROOM.classroom(classroomId),
      EVENTS.SERVER_GRID_STATE,
      this.snapshot(sessionId),
    );
    // Alongside the teacher grid, each student gets their own authoritative
    // state pushed to their app. The app mirrors these pushes instead of
    // computing a local score, so the student app and the teacher dashboard
    // can never drift apart.
    for (const student of this.sessions.get(sessionId)?.values() ?? []) {
      this.events.studentEmit(student.studentId, EVENTS.SERVER_STUDENT_STATE, {
        sessionId,
        status: student.status,
        focusScore: Math.max(0, Math.min(100, student.focusScore)),
      });
    }
  }

  // ------------------------------------------------------------------ sweep

  /** Mark stale students OFFLINE (or DISTRACTED if the screen is on). */
  sweepOffline(): void {
    const cutoff = Date.now() - OFFLINE_THRESHOLD_MS;
    for (const [sessionId, students] of this.sessions) {
      let changed = false;
      for (const student of students.values()) {
        // A breach is sticky: the teacher must see it until they explicitly
        // unlock, even if the phone then goes dark.
        if (student.status === 'BREACHED') continue;
        if (new Date(student.lastHeartbeat).getTime() >= cutoff) continue;

        if (
          student.backgroundedSince !== undefined &&
          student.screenOn &&
          student.status !== 'OFFLINE'
        ) {
          // Backgrounded with the screen still on: the JS froze (iOS), so
          // heartbeats stopped even though the student is right there —
          // that's DISTRACTED, not OFFLINE. An already-OFFLINE badge stays
          // OFFLINE: it means the phone locked *before* this leave, or went
          // silent without a goodbye.
          if (student.status !== 'DISTRACTED') {
            student.status = 'DISTRACTED';
            changed = true;
          }
          continue;
        }
        if (student.status !== 'OFFLINE') {
          // Badge-only: the device went silent — dark phone or dead app.
          // The leave, if any, keeps its pending grace timer (the banner
          // still pops at the grace mark) and its timestamp: a student who
          // left and went dark is "Away since <time>" + OFFLINE, while a
          // signal that vanished without a goodbye is just OFFLINE.
          student.status = 'OFFLINE';
          changed = true;
        }
      }
      if (changed) this.broadcastGrid(sessionId);
    }
  }
}