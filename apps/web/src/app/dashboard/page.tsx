'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClassroom, deleteClassroom, getToken, listClassrooms, SERVER_URL, setToken } from '../../lib/api';

interface Classroom {
  id: string;
  code: string;
  name: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [teacherName, setTeacherName] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    fetch(`${SERVER_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => u && setTeacherName(u.name))
      .catch(() => {});

    // Load this teacher's saved classes — they persist across logins now.
    listClassrooms()
      .then(setClasses)
      .catch(() => {});
  }, [router]);

  const removeClass = async (id: string) => {
    if (!confirm('Delete this class? Students will lose access to it.')) return;
    try {
      await deleteClassroom(id);
      setClasses((prev) => prev.filter((c) => c.id !== id));
    } catch {
      setError('Could not delete class. Is the server running?');
    }
  };

  const signOut = () => {
    setToken(null);
    router.replace('/login');
  };

  const create = async () => {
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const c = await createClassroom(name.trim());
      setClasses((prev) => [c, ...prev]);
      setName('');
    } catch {
      setError('Could not create class. Is the server running?');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-line">
        <div className="max-w-[1180px] mx-auto px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-3 text-[1.25rem] leading-4 font-semibold tracking-[-0.4px] text-ink">
              <span className="w-7 h-7 rounded-xl bg-gradient-to-tr from-brand to-orange flex items-center justify-center text-white shrink-0 shadow-sm">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9"></circle>
                  <circle cx="12" cy="12" r="3" fill="currentColor"></circle>
                </svg>
              </span>
              ClassSync
            </span>
            <Link href="/" className="inline-flex items-center justify-center rounded-full bg-ink/[0.08] hover:bg-ink/[0.12] text-ink text-sm font-medium tracking-[-0.35px] px-4 py-2 leading-5 transition-colors">
              ← Intro Page
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {teacherName ? <span className="text-sm text-sub">{teacherName}</span> : null}
            <button className="inline-flex items-center justify-center rounded-full bg-ink/[0.08] hover:bg-ink/[0.12] text-ink text-sm font-medium px-4 py-2 transition-colors" onClick={signOut}>
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-[960px] mx-auto px-6 pt-16 pb-20">
        <div className="max-w-[640px]">
          <h1 className="text-4xl font-bold tracking-tight">Your classes.</h1>
          <p className="mt-2 mb-8 text-lg text-sub">
            Create a class and share the 6-digit join code with your students.
          </p>

          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <input
              className="flex-1 px-4 py-3.5 rounded-xl border border-line bg-surface text-base text-ink placeholder:text-muted outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Class name (e.g. Period 3 — Biology)"
              onKeyDown={(e) => e.key === 'Enter' && create()}
            />
            <button
              className="inline-flex items-center justify-center rounded-full bg-brand hover:bg-brand-hover text-white text-sm font-semibold px-6 py-3.5 transition-colors"
              onClick={create}
              disabled={creating}
            >
              {creating ? 'Creating…' : 'Create Class'}
            </button>
          </div>

          {error ? <p className="text-red text-sm">{error}</p> : null}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {classes.length === 0 ? (
            <p className="text-sub text-sm">
              No classes yet. Try the seeded demo class with code{' '}
              <strong className="text-ink font-mono font-bold">123456</strong>.
            </p>
          ) : null}
          {classes.map((c) => (
            <div
              key={c.id}
              className="bg-surface rounded-tile p-6 shadow-card hover:shadow-tile-hover transition-shadow flex items-center justify-between gap-4 border border-line"
            >
              <div>
                <strong className="text-lg font-bold text-ink">{c.name}</strong>
                <div className="text-sm text-sub mt-1">
                  Join code:{' '}
                  <span className="font-bold text-ink font-mono">{c.code}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => removeClass(c.id)}
                  className="inline-flex items-center justify-center rounded-full bg-red/10 hover:bg-red/20 text-red text-xs font-semibold px-4 py-2 transition-colors"
                >
                  Delete
                </button>
                <Link href={`/live/${c.id}`} className="inline-flex items-center justify-center rounded-full bg-ink/[0.08] hover:bg-ink/[0.12] text-ink text-xs font-semibold px-4 py-2 transition-colors">
                  Open
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 border-t border-line pt-6">
          <Link href="/live/123456" className="text-brand font-medium hover:underline">
            Open demo classroom →
          </Link>
          <span className="ml-3 text-sm text-sub">(code 123456)</span>
        </div>
      </main>
    </div>
  );
}
