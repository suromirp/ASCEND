// ASCEND: de ochtendmelding in de browser (docs/beslissingen/2026-10-23-
// ochtendkaart-en-melding.md). Dit bestand praat met de browser: toestemming
// vragen, Periodic Background Sync aan- of uitzetten. Wat er beslist wordt staat
// in engine/morningNotice.ts, en de melding zelf toont public/morning-notice-sw.js.
//
// Periodic Background Sync bestaat alleen in Chromium (Chrome op Android), alleen
// voor een geïnstalleerde app, en Chrome bepaalt zelf hoe vaak en wanneer
// (afhankelijk van hoe vaak je de app gebruikt). Een precieze tijd bestaat dus niet.

import { noticeSupport, type NoticeEnvironment, type NoticeSupport } from '../engine/morningNotice';

export const SYNC_TAG = 'ascend-ochtend';
// Hoe vaak de browser hoogstens mag wakker maken: twee keer per dag is genoeg om
// de ochtend te raken; Chrome rekent zelf nog strenger.
const MIN_INTERVAL_MS = 12 * 60 * 60 * 1000;

interface PeriodicSyncManager {
  register(tag: string, options?: { minInterval?: number }): Promise<void>;
  unregister(tag: string): Promise<void>;
}
type Registration = ServiceWorkerRegistration & { periodicSync?: PeriodicSyncManager };

async function registration(): Promise<Registration | undefined> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return undefined;
  try {
    // Zonder service worker (bijvoorbeeld in dev) zou ready eeuwig wachten.
    const found = await Promise.race([navigator.serviceWorker.ready, new Promise<undefined>((r) => setTimeout(() => r(undefined), 3000))]);
    return found as Registration | undefined;
  } catch {
    return undefined;
  }
}

function isInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches;
  return !!standalone || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function permission(): NoticeEnvironment['permission'] {
  return typeof Notification === 'undefined' ? 'default' : Notification.permission;
}

export async function readNoticeEnvironment(): Promise<NoticeEnvironment> {
  const reg = await registration();
  return {
    notification: typeof Notification !== 'undefined',
    serviceWorker: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
    periodicSync: !!reg && 'periodicSync' in reg && !!reg.periodicSync,
    installed: isInstalled(),
    permission: permission(),
  };
}

export async function readNoticeSupport(): Promise<NoticeSupport> {
  return noticeSupport(await readNoticeEnvironment());
}

async function registerSync(reg: Registration): Promise<boolean> {
  try {
    await reg.periodicSync?.register(SYNC_TAG, { minInterval: MIN_INTERVAL_MS });
    return !!reg.periodicSync;
  } catch {
    // Chrome weigert het als de app niet geïnstalleerd is of de toestemming ontbreekt.
    return false;
  }
}

// Aanzetten door een tik van de gebruiker: eerst toestemming, dan de periodieke sync.
// 'ok' als beide gelukt zijn; anders waarom niet, zodat de rij het eerlijk kan zeggen.
export async function enableMorningNotice(): Promise<'ok' | 'denied' | 'no_background' | 'sync_refused'> {
  if (typeof Notification === 'undefined') return 'no_background';
  const asked = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
  if (asked !== 'granted') return 'denied';
  const reg = await registration();
  if (!reg?.periodicSync) return 'no_background';
  if (await registerSync(reg)) return 'ok';
  // Meldingen mogen, de aanmelding niet: dan weigert Chrome de achtergrond (nog).
  return (await syncPermission()) === 'denied' ? 'sync_refused' : 'no_background';
}

// De toestemming van Chrome voor wakker maken op de achtergrond, als de browser die kent.
async function syncPermission(): Promise<PermissionState | undefined> {
  try {
    const status = await navigator.permissions?.query({ name: 'periodic-background-sync' as PermissionName });
    return status?.state;
  } catch {
    return undefined;
  }
}

export async function disableMorningNotice(): Promise<void> {
  const reg = await registration();
  try {
    await reg?.periodicSync?.unregister(SYNC_TAG);
  } catch {
    // Niets om uit te zetten.
  }
}

// Bij het openen van de app: staat de melding aan en is de toestemming er, dan wordt
// de periodieke sync (opnieuw) aangemeld; staat hij uit, dan wordt hij afgemeld.
// Dubbel aanmelden met dezelfde naam vervangt de oude, dus dit mag elke keer.
export async function syncMorningNotice(enabled: boolean): Promise<void> {
  if (!enabled) return disableMorningNotice();
  if (permission() !== 'granted') return;
  const reg = await registration();
  if (reg?.periodicSync) await registerSync(reg);
}
