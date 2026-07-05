import { useEffect, useRef } from 'react';
import { useOnboarding } from './store';

const CHECK_INTERVAL_MS = 2_000;
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'] as const;

/**
 * Mounted once at the app root. Locks the wallet after the configured idle
 * timeout, and (optionally) immediately when the tab/window is hidden.
 *
 * No-op while already locked or in watch-only mode — there's no seed in
 * memory then, so there's nothing to protect. Reads fresh settings from the
 * store on every check rather than as effect deps, so listeners are only ever
 * registered once.
 */
export function AutoLock() {
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    const markActive = () => {
      lastActivityRef.current = Date.now();
    };
    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, markActive, { passive: true });
    }

    const interval = setInterval(() => {
      const { keyring, autoLockMinutes, lock } = useOnboarding.getState();
      if (!keyring || autoLockMinutes <= 0) return;
      const idleMs = Date.now() - lastActivityRef.current;
      if (idleMs >= autoLockMinutes * 60_000) lock();
    }, CHECK_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (!document.hidden) return;
      const { keyring, lockOnBlur, lock } = useOnboarding.getState();
      if (keyring && lockOnBlur) lock();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, markActive);
      }
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return null;
}
