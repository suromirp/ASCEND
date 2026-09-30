// ASCEND — the service worker registration, kept where Settings can reach
// it for "Zoeken naar update". components/UpdatePrompt.tsx stores it when
// the worker registers; the prompt itself still appears through
// vite-plugin-pwa's needRefresh once a new version has been downloaded.

let registration: ServiceWorkerRegistration | undefined;

export function setSwRegistration(r: ServiceWorkerRegistration): void {
  registration = r;
}

export type UpdateCheck = 'update' | 'latest' | 'unavailable';

export async function checkForUpdate(): Promise<UpdateCheck> {
  if (!registration) return 'unavailable';
  try {
    await registration.update();
  } catch {
    return 'unavailable';
  }
  return registration.installing || registration.waiting ? 'update' : 'latest';
}

export const APP_VERSION = __APP_VERSION__;
export const BUILD_TIME = __BUILD_TIME__;
