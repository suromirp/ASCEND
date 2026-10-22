// ASCEND: "Delen, ASCEND" voor een MacroFactor-export (Web Share Target).
//
// Dit bestand wordt door de gegenereerde service worker binnengehaald met
// importScripts (vite.config.ts, workbox.importScripts). Het raakt de
// precache en de routes van workbox niet aan: het luistert alleen naar de
// ene POST die Android stuurt als je een bestand met ASCEND deelt.
//
// Het bestand gaat als binair door (een Blob, nooit als tekst), zodat een
// xlsx, dat een zip is, ongeschonden aankomt; de pagina leest het als
// ArrayBuffer.
//
// Wat er gebeurt: het gedeelde bestand gaat in een eigen cache, en de
// pagina krijgt een omleiding naar het scherm "MacroFactor inlezen". Dat
// scherm haalt het bestand uit de cache en wist het daar meteen. Er gaat
// niets over het netwerk en niets naar een server.
//
// De namen hieronder moeten gelijk blijven aan src/storage/macrofactor.ts
// (src/storage/share-target-sw.test.ts controleert dat).

const SHARED_CACHE = 'ascend-gedeeld-v1';
const SHARED_FILE_PATH = 'gedeeld-bestand';
const SHARED_NAME_HEADER = 'x-bestandsnaam';
const SHARE_ACTION_PATH = 'delen/macrofactor';
const FILE_FIELD = 'bestand';
const LANDING = '#/koppelen/macrofactor';

function scopeUrl(path) {
  return new URL(path, self.registration.scope);
}

async function receiveSharedFile(request) {
  let outcome = 'ok';
  try {
    const form = await request.formData();
    const file = form.get(FILE_FIELD);
    if (file && typeof file === 'object' && typeof file.arrayBuffer === 'function') {
      const cache = await caches.open(SHARED_CACHE);
      await cache.put(
        scopeUrl(SHARED_FILE_PATH).toString(),
        new Response(file, { headers: { 'content-type': file.type || 'application/octet-stream', [SHARED_NAME_HEADER]: encodeURIComponent(file.name || '') } }),
      );
    } else {
      outcome = 'leeg';
    }
  } catch {
    outcome = 'fout';
  }
  // 303: after the POST, the browser opens the landing screen with a GET.
  return Response.redirect(`${scopeUrl('./').toString()}${LANDING}?gedeeld=${outcome}`, 303);
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'POST') return;
  if (new URL(request.url).pathname !== scopeUrl(SHARE_ACTION_PATH).pathname) return;
  event.respondWith(receiveSharedFile(request));
});
