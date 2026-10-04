// ASCEND — "just updated" marker across the one reload an update needs.
// Set right before the new version takes over (components/UpdatePrompt.tsx),
// read exactly once when the page loads again: the app then skips the
// splash and shows a short "bijgewerkt" confirmation instead. sessionStorage
// can be unavailable (private mode, blocked storage) — then the app simply
// behaves like a normal load.

const KEY = 'ascend.justUpdated';

export function markJustUpdated(): void {
  try {
    sessionStorage.setItem(KEY, '1');
  } catch {
    // no storage: a normal load with splash, nothing breaks
  }
}

function readAndClear(): boolean {
  try {
    const value = sessionStorage.getItem(KEY) === '1';
    sessionStorage.removeItem(KEY);
    return value;
  } catch {
    return false;
  }
}

// Evaluated once per page load, shared by everything that asks.
export const JUST_UPDATED = typeof window !== 'undefined' && readAndClear();

// The full splash (about 2.6 s) plays once a day, on the first open; every
// other open goes straight to the app, so "what is my mission today" is on
// screen within two seconds (CLAUDE.md). Never with reduced motion.
const SPLASH_KEY = 'ascend.splashShownOn';

function shouldShowSplash(): boolean {
  if (JUST_UPDATED) return false;
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
    const now = new Date();
    const today = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    if (localStorage.getItem(SPLASH_KEY) === today) return false;
    localStorage.setItem(SPLASH_KEY, today);
    return true;
  } catch {
    return true;
  }
}

export const SHOW_SPLASH = typeof window !== 'undefined' && shouldShowSplash();
