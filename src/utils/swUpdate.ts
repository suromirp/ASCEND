// ASCEND — de service worker registreren en de app zichzelf laten bijwerken.
//
// Dit draait vanaf het laden van de pagina (main.tsx), los van de opstart van
// de app: ook tijdens de splash en op het foutscherm wordt naar een nieuwe
// versie gezocht. Eerder stond dit in components/UpdatePrompt.tsx en werd er
// pas gezocht als de opstart klaar was; bij een opslagfout dus nooit.
//
// De beslissing wanneer een klaarstaande versie wordt geactiveerd staat in
// utils/updatePolicy.ts; de handmatige knop BIJWERKEN in UpdatePrompt blijft
// het vangnet.

import { registerSW } from 'virtual:pwa-register';
import { markJustUpdated } from './updateFlag';
import { setSwRegistration } from './appUpdate';
import { isAppBusy, trackUserInput } from './appBusy';
import { createUpdateController } from './updatePolicy';

const UPDATE_CHECK_MS = 60 * 60 * 1000;
const RETRY_TICK_MS = 5 * 1000;

let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | undefined;
let needRefresh = false;
let updating = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

// Voor useSyncExternalStore in components/UpdatePrompt.tsx.
export function subscribeToUpdate(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function updateIsWaiting(): boolean {
  return needRefresh;
}

// Activeert de klaarstaande versie; de pagina herlaadt zodra die het overneemt.
// "Bijgewerkt" verschijnt daarna in plaats van de splash (utils/updateFlag.ts).
export function applyUpdateNow(): void {
  if (updating || !updateServiceWorker) return;
  updating = true;
  markJustUpdated();
  void updateServiceWorker(true);
}

let started = false;

export function startServiceWorkerUpdates(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  trackUserInput();

  const controller = createUpdateController({ now: () => Date.now(), isBusy: () => isAppBusy(), isVisible: () => document.visibilityState === 'visible', applyUpdate: applyUpdateNow });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') controller.hidden();
    else controller.visible();
  });
  setInterval(() => controller.tick(), RETRY_TICK_MS);

  updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh() {
      needRefresh = true;
      emit();
      controller.updateWaiting();
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      setSwRegistration(registration);
      setInterval(() => void registration.update(), UPDATE_CHECK_MS);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void registration.update();
      });
    },
  });
}
