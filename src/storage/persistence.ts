// Asks the browser to treat ASCEND's IndexedDB as persistent. Without it
// the browser may clear all local data under storage pressure, and Safari
// clears script storage of a site not opened for seven days unless it's
// on the home screen. For an app with no server, that is the whole
// training history. Granted silently for installed PWAs in most browsers.

export type PersistenceStatus = 'protected' | 'not_protected' | 'unsupported';

export async function requestPersistentStorage(): Promise<PersistenceStatus> {
  const storage = typeof navigator !== 'undefined' ? navigator.storage : undefined;
  if (!storage?.persist || !storage.persisted) return 'unsupported';
  try {
    if (await storage.persisted()) return 'protected';
    return (await storage.persist()) ? 'protected' : 'not_protected';
  } catch {
    return 'not_protected';
  }
}

export async function getPersistenceStatus(): Promise<PersistenceStatus> {
  const storage = typeof navigator !== 'undefined' ? navigator.storage : undefined;
  if (!storage?.persisted) return 'unsupported';
  try {
    return (await storage.persisted()) ? 'protected' : 'not_protected';
  } catch {
    return 'not_protected';
  }
}
