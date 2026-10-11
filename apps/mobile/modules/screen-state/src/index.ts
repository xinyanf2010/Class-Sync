/**
 * Safe facade over the native ScreenState module.
 *
 * requireNativeModule throws where the native side is unavailable (Expo Go),
 * so it's resolved here behind a guard and everything degrades to no-ops —
 * which leaves the old heartbeat-only presence behavior in place.
 */
import type { ScreenState, ScreenStateChangeEvent } from './ScreenState.types';

type NativeModuleType = {
  isScreenOn(): boolean;
  addListener(
    event: 'onScreenState',
    listener: (event: ScreenStateChangeEvent) => void,
  ): { remove(): void };
};

let nativeModule: NativeModuleType | null = null;
try {
  // Static import so Metro can resolve the platform variant (.web.ts stub).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  nativeModule = require('./ScreenStateModule').default;
} catch {
  nativeModule = null;
}

/** Current screen state — re-emitted on (re)join so the server re-syncs. */
export function isScreenOn(): boolean {
  try {
    return nativeModule?.isScreenOn() ?? true;
  } catch {
    return true;
  }
}

/**
 * Subscribe to screen lock/unlock. Returns an unsubscribe function; a no-op
 * where the native module is missing.
 */
export function addScreenStateListener(
  callback: (state: ScreenState) => void,
): () => void {
  if (!nativeModule) return () => {};
  const sub = nativeModule.addListener('onScreenState', (e) =>
    callback(e.state),
  );
  return () => sub.remove();
}

export type { ScreenState };
