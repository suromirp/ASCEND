// ASCEND: de ochtendmelding in de service worker.
//
// Dit bestand wordt door de gegenereerde service worker binnengehaald met
// importScripts (vite.config.ts, workbox.importScripts), net als
// share-target-sw.js. Het raakt de precache en de routes van workbox niet aan.
//
// Wat er gebeurt: Chrome maakt de service worker af en toe wakker voor een
// 'periodicsync' (alleen voor een geïnstalleerde app, en Chrome bepaalt zelf
// hoe vaak en wanneer). Dan lezen we uit IndexedDB de instellingen en of er
// vandaag al een melding was, en tonen we de melding als dat nog moet. Er gaat
// niets over het netwerk.
//
// De beslissing hieronder is dezelfde als src/engine/morningNotice.ts
// (shouldNotifyMorning); src/engine/morningNotice.test.ts draait dit script met
// dezelfde gevallen. De namen van de database, de opslag en de sleutels moeten
// gelijk blijven aan src/storage/database.ts.

const DB_NAME = 'ascend-db';
const META_STORE = 'meta';
const SETTINGS_KEY = 'settings';
const LAST_KEY = 'morningNoticeLast';
const SYNC_TAG = 'ascend-ochtend';
const NOTICE_TAG = 'ascend-ochtend';
const TITLE = 'Goedemorgen. Hoe voel je je?';
const BODY = 'Tik om je ochtend in te vullen.';
const LINK = '#/?actie=ochtend';
const DEFAULT_TIME = '07:30';
const UNTIL_MINUTES = 11 * 60;

function timeToMinutes(time) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  return m ? Number(m[1]) * 60 + Number(m[2]) : undefined;
}

function resolveNotice(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const minutes = typeof r.time === 'string' ? timeToMinutes(r.time) : undefined;
  const valid = minutes !== undefined && minutes < UNTIL_MINUTES;
  return { enabled: r.enabled === true, time: valid ? r.time : DEFAULT_TIME };
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function localDate(now) {
  return now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
}

function shouldNotifyMorning(p) {
  const settings = p.settings || {};
  const notice = resolveNotice(settings.morningNotice);
  if (!notice.enabled) return false;
  if (settings.overviews && settings.overviews.morningCheckIn === false) return false;
  const today = localDate(p.now);
  if ((settings.morningCheckIns || []).some((c) => c && c.date === today)) return false;
  if (p.lastNotified === today) return false;
  const minutes = p.now.getHours() * 60 + p.now.getMinutes();
  return minutes >= timeToMinutes(notice.time) && minutes < UNTIL_MINUTES;
}

// ---- IndexedDB, zonder bibliotheek ----------------------------------------------

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME);
    // Bestaat de database nog niet, dan is er niets te vragen: niet aanmaken.
    request.onupgradeneeded = () => {
      request.transaction.abort();
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('blocked'));
  });
}

function readKey(db, key) {
  return new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains(META_STORE)) return resolve(undefined);
    const request = db.transaction(META_STORE, 'readonly').objectStore(META_STORE).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function writeKey(db, key, value) {
  return new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains(META_STORE)) return resolve();
    const tx = db.transaction(META_STORE, 'readwrite');
    tx.objectStore(META_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function checkMorning(now) {
  let db;
  try {
    db = await openDb();
    const settings = await readKey(db, SETTINGS_KEY);
    const lastNotified = await readKey(db, LAST_KEY);
    if (!shouldNotifyMorning({ settings, lastNotified, now })) return;
    await self.registration.showNotification(TITLE, {
      body: BODY,
      tag: NOTICE_TAG,
      lang: 'nl',
      icon: new URL('pwa-192.png', self.registration.scope).href,
      badge: new URL('pwa-192.png', self.registration.scope).href,
      data: { url: new URL(LINK, self.registration.scope).href },
    });
    await writeKey(db, LAST_KEY, localDate(now));
  } catch {
    // Geen melding is beter dan een fout in de service worker.
  } finally {
    if (db) db.close();
  }
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === SYNC_TAG) event.waitUntil(checkMorning(new Date()));
});

// Tik op de melding: de app opent op Vandaag, met het blad van de ochtend open
// (Vandaag leest ?actie=ochtend, src/engine/shortcutAction.ts).
self.addEventListener('notificationclick', (event) => {
  if (event.notification.tag !== NOTICE_TAG) return;
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || new URL(LINK, self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url.indexOf(self.registration.scope) === 0);
      if (!open) return self.clients.openWindow(url);
      return open.focus().then((focused) => (focused && 'navigate' in focused ? focused.navigate(url) : undefined));
    }),
  );
});

// Voor de test: dezelfde beslissing, zonder de browser.
self.ascendMorningNotice = { shouldNotifyMorning, checkMorning };
