'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { login, register, setToken } from '../../lib/api';

/**
 * Teacher login. Students who land here are told to use the mobile app —
 * the server would reject their requests anyway, but failing here is clearer.
 */
export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res =
        mode === 'login'
          ? await login(email.trim(), password)
          : await register({
              email: email.trim(),
              password,
              name: name.trim() || email.trim(),
              role: 'TEACHER',
            });
      if (res.user.role !== 'TEACHER') {
        setError(
          'This dashboard is for teachers. Please use the ClassSync mobile app instead.',
        );
        return;
      }
      setToken(res.token);
      router.push('/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'inline-block' }}>
          <span className="wordmark" style={{ fontSize: '1.5rem', cursor: 'pointer' }}>
            <span style={{ display: 'inline-flex', width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #0a84ff, #ff9400)', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(10,132,255,0.3)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9"></circle>
                <circle cx="12" cy="12" r="3" fill="#fff"></circle>
              </svg>
            </span>
            ClassSync
          </span>
        </Link>
        <h1 className="display" style={{ marginTop: 24 }}>
          {mode === 'login' ? 'Welcome back.' : 'Create your account.'}
        </h1>
        <p className="subtitle" style={{ marginTop: 8 }}>
          Teacher sign in — students use the mobile app.
        </p>
      </div>

      <div
        className="card"
        style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        {mode === 'register' ? (
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        ) : null}
        <input
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          autoComplete="email"
        />
        <input
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />

        {error ? <p className="error-text" style={{ margin: 0 }}>{error}</p> : null}

        <button
          className="btn btn-primary"
          onClick={submit}
          disabled={busy}
          style={{ width: '100%', marginTop: 4 }}
        >
          {busy ? 'Signing in…' : mode === 'login' ? 'Sign In' : 'Create Teacher Account'}
        </button>

        <button
          className="btn btn-ghost"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError(null);
          }}
          style={{ width: '100%' }}
        >
          {mode === 'login'
            ? 'Need a teacher account? Register'
            : 'Already have an account? Sign in'}
        </button>
      </div>

      <p className="caption" style={{ marginTop: 24, color: 'var(--muted)' }}>
        Demo: teacher@classsync.demo / demo1234
      </p>
    </main>
  );
}
