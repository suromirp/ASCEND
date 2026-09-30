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
