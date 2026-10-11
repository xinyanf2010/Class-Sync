'use client';

import {
  EVENTS,
  type SessionMode,
  type SessionSnapshot,
  type SessionState,
  type StudentRosterEntry,
} from '@classsync/common';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { ModeSwitcher } from '../../../components/ModeSwitcher';
import { StudentCard } from '../../../components/StudentCard';
import { getClassroom, getToken, registerStudent, removeStudent } from '../../../lib/api';
import { createSocket } from '../../../lib/socket';

interface ClassroomInfo {
  id: string;
  name: string;
  code: string;
  activeSessionId: string | null;
}

export default function LiveDashboard() {
  const params = useParams();
  const router = useRouter();
  const classId = params.classId as string;

  const socketRef = useRef<Socket | null>(null);
  const [classroom, setClassroom] = useState<ClassroomInfo | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [state, setState] = useState<SessionState>('IDLE');
  const [students, setStudents] = useState<StudentRosterEntry[]>([]);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    let socket: Socket | null = null;

    (async () => {
      try {
        const classroomInfo = await getClassroom(classId);
        setClassroom(classroomInfo);
        setSessionId(classroomInfo.activeSessionId);

        socket = createSocket();
        socketRef.current = socket;

        socket.on('connect', () => {
          socket!.emit(EVENTS.TEACHER_JOIN_CLASSROOM, {
            classroomId: classroomInfo.id,
          });
        });

        socket.on(EVENTS.SERVER_GRID_STATE, (snap: SessionSnapshot) => {
          setSessionId(snap.sessionId);
          setState(snap.state);
          setStudents(snap.students);
        });

        socket.on(EVENTS.SERVER_SESSION_STATE, (p: { sessionId: string; state: SessionState }) => {
          setSessionId(p.sessionId);
          setState(p.state);
        });

        socket.on(EVENTS.SERVER_SESSION_ENDED, () => {
          setState('ENDED');
          setStudents([]);
          setSessionId(null);
        });

        socket.on(EVENTS.SERVER_BREACH_ALERT, (entry: StudentRosterEntry) => {
          const msg = `${entry.name} breached Assessment Lock`;
          setAlerts((prev) => [msg, ...prev].slice(0, 20));
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load classroom');
      }
    })();

    return () => {
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [classId, router]);

  const active = state !== 'IDLE' && state !== 'ENDED';

  const startSession = () =>
    socketRef.current?.emit(EVENTS.TEACHER_START_SESSION, { classroomId: classroom?.id });
  const endSession = () =>
    socketRef.current?.emit(EVENTS.TEACHER_END_SESSION, {
      sessionId,
      classroomId: classroom?.id,
    });
  const setMode = (mode: SessionMode) =>
    socketRef.current?.emit(EVENTS.TEACHER_SET_MODE, { sessionId, mode });
  const ping = (studentId: string) =>
    socketRef.current?.emit(EVENTS.TEACHER_PING_STUDENT, { studentId });
  const unlock = (studentId: string) =>
    socketRef.current?.emit(EVENTS.TEACHER_UNLOCK_STUDENT, { studentId });
  const remove = async (studentId: string) => {
    const entry = students.find((s) => s.studentId === studentId);
    if (
      !confirm(
        `Remove ${entry?.name ?? 'this student'} from the class? They will be dropped from the live session and unenrolled.`,
      )
    )
      return;
    try {
      await removeStudent(classroom?.id ?? classId, studentId);
      // The server broadcasts a fresh grid state; update locally too in case
      // no session is live to trigger one.
      setStudents((prev) => prev.filter((s) => s.studentId !== studentId));
    } catch {
      alert('Could not remove student. Is the server running?');
    }
  };

  if (error) {
    return (
      <main className="container" style={{ paddingTop: 64 }}>
        <p className="error-text">Error: {error}</p>
      </main>
    );
  }

  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="wordmark">
              <span style={{ display: 'inline-flex', width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #0a84ff, #ff9400)', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(10,132,255,0.3)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9"></circle>
                  <circle cx="12" cy="12" r="3" fill="#fff"></circle>
                </svg>
              </span>
              ClassSync
            </span>
            <Link href="/" className="btn btn-ghost btn-sm">
              ← Intro Page
            </Link>
            <Link href="/dashboard" className="btn btn-ghost btn-sm">
              ← All classes
            </Link>
          </div>
        </div>
      </nav>

      <main className="container" style={{ maxWidth: 1180, paddingTop: 48, paddingBottom: 80 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: 24,
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Live session</div>
            <h1 className="headline">{classroom?.name ?? 'Loading…'}</h1>
            <div className="caption" style={{ marginTop: 6 }}>
              Join code:{' '}
              <strong style={{ color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>
                {classroom?.code ?? '—'}
              </strong>{' '}
              · {students.length} student{students.length === 1 ? '' : 's'} connected
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {!active ? (
              <button className="btn btn-primary" onClick={startSession}>
                Start Session
              </button>
            ) : (
              <button className="btn btn-danger" onClick={endSession}>
                End Session
              </button>
            )}
          </div>
        </div>

        {active && sessionId ? (
          <div style={{ marginBottom: 24 }}>
            <ModeSwitcher state={state} disabled={false} onSetMode={setMode} />
          </div>
        ) : (
          <p className="caption" style={{ marginBottom: 24 }}>
            No active session. Start one, then students can join with the class
            code.
          </p>
        )}

        {alerts.length > 0 ? (
          <div className="alert-stack" style={{ marginBottom: 24 }}>
            {alerts.map((a, i) => (
              <div key={i} style={{ padding: '2px 0' }}>
                {a}
              </div>
            ))}
          </div>
        ) : null}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 16,
          }}
        >
          {students.map((entry) => (
            <StudentCard
              key={entry.studentId}
              entry={entry}
              mode={state}
              onPing={ping}
              onUnlock={unlock}
              onRemove={remove}
            />
          ))}
          {students.length === 0 && active ? (
            <p className="caption">Waiting for students to join…</p>
          ) : null}
        </div>

        <RegisterStudentCard classId={classroom?.id ?? classId} />
      </main>
    </>
  );
}

/** Teacher-only: create a student account (saved to the server) and enroll
 *  them in this class. */
function RegisterStudentCard({ classId }: { classId: string }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async () => {
    setMessage(null);
    if (!name.trim() || !email.trim() || !password) {
      setMessage({ ok: false, text: 'Name, email, and password are all required.' });
      return;
    }
    setBusy(true);
    try {
      const res = await registerStudent(classId, {
        name: name.trim(),
        email: email.trim(),
        password,
      });
      setMessage({
        ok: true,
        text: res.existing
          ? `${res.user.name} already had an account — enrolled in this class.`
          : `Account created for ${res.user.name}. They can sign in on the app now.`,
      });
      setName('');
      setEmail('');
      setPassword('');
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : 'Failed to register student' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card" style={{ marginTop: 40, maxWidth: 560 }}>
      <h2 style={{ fontSize: 'var(--text-title)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>Register a student</h2>
      <p className="caption" style={{ marginBottom: 16 }}>
        Creates their login (saved on the server) and enrolls them in this
        class. Share the email and password with the student.
      </p>
      <div style={{ display: 'grid', gap: 10 }}>
        <input
          className="input"
          placeholder="Student name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="input"
          type="email"
          placeholder="Student email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="input"
          type="text"
          placeholder="Temporary password (min 4 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <button className="btn btn-primary" onClick={submit} disabled={busy}>
          {busy ? 'Registering…' : 'Register Student'}
        </button>
        {message ? (
          <p className={message.ok ? 'caption' : 'error-text'}>{message.text}</p>
        ) : null}
      </div>
    </section>
  );
}
