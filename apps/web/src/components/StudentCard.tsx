'use client';

import type { StudentRosterEntry } from '@classsync/common';

const STATUS_STYLE: Record<
  StudentRosterEntry['status'],
  { badgeClass: string; label: string }
> = {
  FOCUSED: { badgeClass: 'badge-green', label: 'Focused' },
  DISTRACTED: { badgeClass: 'badge-orange', label: 'Distracted' },
  BREACHED: { badgeClass: 'badge-red', label: 'Breached' },
  OFFLINE: { badgeClass: 'badge-gray', label: 'Offline' },
};

const SCORE_COLOR = (score: number) =>
  score > 60 ? 'var(--green)' : score > 30 ? 'var(--orange)' : 'var(--red)';

/** "10:32 AM" from an ISO timestamp. */
function formatClock(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

interface Props {
  entry: StudentRosterEntry;
  /** Current session mode — "Away since" only shows in Quiet Study / Assessment Lock. */
  mode: string;
  onPing: (studentId: string) => void;
  onUnlock: (studentId: string) => void;
  onRemove: (studentId: string) => void;
}

export function StudentCard({ entry, mode, onPing, onUnlock, onRemove }: Props) {
  const status = STATUS_STYLE[entry.status];
  const showAway =
    entry.backgroundedSince &&
    (mode === 'QUIET_STUDY' || mode === 'ASSESSMENT_LOCK');

  return (
    <div
      className="tile"
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <strong style={{ flex: 1, fontSize: '1.125rem', letterSpacing: '-0.4px' }}>
          {entry.name}
        </strong>
        <span className={`badge ${status.badgeClass}`}>
          <span className="badge-dot" />
          {status.label}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="caption" style={{ flex: 1 }}>
          Focus {entry.focusScore}%
        </span>
        <div className="track" style={{ width: 80 }}>
          <div
            style={{
              width: `${entry.focusScore}%`,
              background: SCORE_COLOR(entry.focusScore),
            }}
          />
        </div>
      </div>

      {showAway && entry.backgroundedSince ? (
        <span className="caption" style={{ color: 'var(--orange)' }}>
          Away since {formatClock(entry.backgroundedSince)}
        </span>
      ) : null}

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button
          className="btn btn-ghost btn-sm"
          style={{ flex: 1 }}
          onClick={() => onPing(entry.studentId)}
        >
          Ping
        </button>
        <button
          className="btn btn-sm"
          style={{
            flex: 1,
            background:
              entry.status === 'BREACHED' ? 'var(--orange)' : 'var(--ink-8)',
            color: entry.status === 'BREACHED' ? '#fff' : 'var(--ink)',
          }}
          onClick={() => onUnlock(entry.studentId)}
          disabled={entry.status !== 'BREACHED'}
        >
          Unlock
        </button>
        <button
          className="btn btn-danger btn-sm"
          onClick={() => onRemove(entry.studentId)}
        >
          Remove
        </button>
      </div>
    </div>
  );
}
