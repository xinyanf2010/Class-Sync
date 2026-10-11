import {
  EVENTS,
  FOCUS_PENALTY_PER_INFRACTION,
  HEARTBEAT_INTERVAL_MS,
  type ModeChangePayload,
  type SessionMode,
  type StudentStatePayload,
  type StudentStatus,
} from '@classsync/common';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { Socket } from 'socket.io-client';
import {
  addScreenStateListener,
  isScreenOn,
} from '../../modules/screen-state/src';

export interface SessionContext {
  classroomId: string;
  sessionId: string;
  studentId: string;
  name: string;
}

export interface SessionLiveState {
  mode: SessionMode;
  focusScore: number;
  status: StudentStatus;
  breached: boolean;
  lastPingAt: string | null;
  sessionEnded: boolean;
}

/**
 * Drives the live student session: joins the socket room, forwards AppState
 * (background/foreground) transitions as telemetry, runs a heartbeat, and
 * reacts to mode changes / pings / session end from the teacher.
 *
 * Scoring is server-authoritative: the hook mirrors the server's
 * SERVER_STUDENT_STATE pushes instead of computing a local score, so the
 * student app and the teacher dashboard always show the same number. (A
 * local grace-timer mirror used to drift: iOS freezes this app's JS within
 * seconds of backgrounding, so its timer fired late and the two screens
 * disagreed.)
 */
export function useSession(
  ctx: SessionContext,
  socket: Socket,
): SessionLiveState & { acknowledgePing: () => void } {
  const [mode, setMode] = useState<SessionMode>('ACTIVE_LEARNING');
  const [focusScore, setFocusScore] = useState(100);
  const [status, setStatus] = useState<StudentStatus>('FOCUSED');
  const [breached, setBreached] = useState(false);
  const [lastPingAt, setLastPingAt] = useState<string | null>(null);
  const [sessionEnded, setSessionEnded] = useState(false);

  const modeRef = useRef<SessionMode>('ACTIVE_LEARNING');

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const { classroomId, sessionId, studentId, name } = ctx;

    const ts = () => new Date().toISOString();

    const emit = (
      event:
        | 'APP_BACKGROUNDED'
        | 'APP_FOREGROUNDED'
        | 'SCREEN_ON'
        | 'SCREEN_OFF',
    ) =>
      socket.emit(EVENTS.CLIENT_STATE_CHANGE, {
        studentId,
        sessionId,
        event,
        timestamp: ts(),
      });

    const onBackgrounded = () => {
      emit('APP_BACKGROUNDED');
      if (modeRef.current === 'ASSESSMENT_LOCK') {
        // Hard breach immediately during assessment lock — instant local
        // feedback; the server's push confirms the same values.
        setBreached(true);
        setStatus('BREACHED');
        setFocusScore((s) => Math.max(0, s - FOCUS_PENALTY_PER_INFRACTION));
      }
      // Otherwise the server owns the grace window: it confirms the leave,
      // applies one penalty, and pushes the result back via
      // SERVER_STUDENT_STATE. (A local timer can't do this on iOS — the OS
      // freezes this app's JS within seconds of backgrounding.)
    };

    const onForegrounded = () => {
      emit('APP_FOREGROUNDED');
      // Snappy local recovery. The server's push re-asserts the honest
      // badge right after — e.g. a lock-mode breach stays BREACHED until
      // the teacher unlocks, exactly as the dashboard shows it.
      setStatus('FOCUSED');
    };

    // Socket listeners (teacher-driven).
    const onSessionState = (p: { sessionId: string; state: SessionMode }) =>
      setMode(p.state);
    const onModeChanged = (p: ModeChangePayload) => setMode(p.mode);
    const onPing = () => setLastPingAt(ts());
    const onEnded = () => {
      setSessionEnded(true);
      setStatus('OFFLINE');
    };
    // Server-authoritative score/badge sync: the server pushes the
    // student's own state on every change (and once more at re-join), so
    // the app displays its number rather than a local mirror.
    const onStudentState = (p: StudentStatePayload) => {
      if (p.sessionId !== sessionId) return;
      setFocusScore(p.focusScore);
      setStatus(p.status);
      setBreached(p.status === 'BREACHED');
    };

    // Join the session room — and re-join on every (re)connect. A reconnect
    // gets a brand-new socket id with no rooms and no registration in the
    // server's socket maps, so a fresh join is what re-enters the rooms,
    // re-registers the socket, flips the teacher grid back to FOCUSED, and
    // re-delivers the current mode — which may have changed while the phone
    // was dark.
    const joinSession = () => {
      socket.emit(EVENTS.CLIENT_JOIN_SESSION, {
        classroomId,
        sessionId,
        studentId,
        name,
        role: 'STUDENT',
      });
      // Re-sync the screen state on every (re)join: the server may have
      // missed a SCREEN_OFF that fired while the socket was down, and its
      // OFFLINE/DISTRACTED decision hangs on this flag.
      emit(isScreenOn() ? 'SCREEN_ON' : 'SCREEN_OFF');
    };
    if (socket.connected) joinSession();
    socket.on('connect', joinSession);

    // Screen lock/unlock telemetry. Fires synchronously at lock time, while
    // the app is still alive — the one reliable chance to tell the server
    // "phone went dark" before iOS freezes the JS runtime and the heartbeats
    // (and everything else) stop.
    const unsubscribeScreen = addScreenStateListener((state) =>
      emit(state === 'on' ? 'SCREEN_ON' : 'SCREEN_OFF'),
    );

    socket.on(EVENTS.SERVER_SESSION_STATE, onSessionState);
    socket.on(EVENTS.SERVER_MODE_CHANGED, onModeChanged);
    socket.on(EVENTS.SERVER_PING, onPing);
    socket.on(EVENTS.SERVER_SESSION_ENDED, onEnded);
    socket.on(EVENTS.SERVER_STUDENT_STATE, onStudentState);

    // Native lifecycle -> telemetry (the non-MDM stand-in for app-switch detection).
    // 'inactive' counts as back: after a screen lock/unlock (Face ID prompt,
    // Control Center) the app re-enters as 'inactive' and may never fire
    // 'active' again, which would leave the server stuck on "away".
    let wasBackgrounded = false;
    const appStateSub = AppState.addEventListener('change', (next) => {
      if (next === 'background') {
        wasBackgrounded = true;
        onBackgrounded();
        return;
      }
      if (next !== 'active' && next !== 'inactive') return;
      onForegrounded();
      if (!wasBackgrounded) return;
      wasBackgrounded = false;
      // Coming back from a real background/suspension, force a clean socket
      // reset. React Native websockets can survive an iOS suspension as
      // zombies: the socket still looks open, so socket.io never reconnects
      // — no 'connect' fires, the re-join never runs, and heartbeats plus
      // app-leave events are written into a dead connection forever. Closing
      // and reopening defeats it deterministically; the 'connect' listener
      // above then re-joins the session.
      socket.disconnect();
      socket.connect();
    });

    // Liveness heartbeat.
    const heartbeat = setInterval(() => {
      socket.emit(EVENTS.STUDENT_HEARTBEAT, { studentId, timestamp: ts() });
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      socket.off('connect', joinSession);
      socket.off(EVENTS.SERVER_SESSION_STATE, onSessionState);
      socket.off(EVENTS.SERVER_MODE_CHANGED, onModeChanged);
      socket.off(EVENTS.SERVER_PING, onPing);
      socket.off(EVENTS.SERVER_SESSION_ENDED, onEnded);
      socket.off(EVENTS.SERVER_STUDENT_STATE, onStudentState);
      unsubscribeScreen();
      appStateSub.remove();
      clearInterval(heartbeat);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.classroomId, ctx.sessionId, ctx.studentId, ctx.name, socket]);

  return {
    mode,
    focusScore,
    status,
    breached,
    lastPingAt,
    sessionEnded,
    acknowledgePing: () => setLastPingAt(null),
  };
}