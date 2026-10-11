'use client';

import type { SessionMode, SessionState } from '@classsync/common';

const MODES: { mode: SessionMode; label: string }[] = [
  { mode: 'ACTIVE_LEARNING', label: 'Active Learning' },
  { mode: 'QUIET_STUDY', label: 'Quiet Study' },
  { mode: 'ASSESSMENT_LOCK', label: 'Assessment Lock' },
];

interface Props {
  state: SessionState;
  disabled: boolean;
  onSetMode: (mode: SessionMode) => void;
}

export function ModeSwitcher({ state, disabled, onSetMode }: Props) {
  return (
    <div className="segmented">
      {MODES.map(({ mode, label }) => (
        <button
          key={mode}
          className={state === mode ? 'active' : ''}
          onClick={() => onSetMode(mode)}
          disabled={disabled}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
