// Maakt de nagemaakte standen voor de tekstkaart (docs/app-kaart/README.md) en laat elk één planningsronde
// draaien op de vaste klok van de kaart, zodat een start daarna niets meer bijwerkt.
//   node scripts/app-kaart/maak-standen.mjs            maakt alle standen opnieuw
//   node scripts/app-kaart/maak-standen.mjs horloge    maakt alleen die stand (kracht, horloge, vakantie, zonder-doel, ziek)
// Alles is nagemaakt: de basis is state-kracht.json, de rest zijn kleine wijzigingen met verzonnen getallen.
//
// Waarom "settle": bij de eerste start na het laden van een stand vindt de planningsronde nog iets te
// repareren (de trainingsvoorschriften staan er niet in, want ze zijn afgeleid), schrijft ze en toont
// "Weekplanning bijgewerkt". Dat lag over screenshots heen en liet de kaart soms wisselen. Na één ronde op
// de vaste klok slaan we de stand opnieuw op; een volgende start vindt dan niets meer.
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const KIT = join(ROOT, '.claude', 'skills', 'lookout', 'kit');
const EXPLICIET = process.env.KAART_PORT !== undefined;
const PORT = EXPLICIET ? Number(process.env.KAART_PORT) : await vrijePoort();
process.env.LOOKOUT_PORT = String(PORT);
process.env.LOOKOUT_SHOTS ??= join(ROOT, 'shots');
const { open, BASE } = await import('../../.claude/skills/lookout/kit/lib.mjs');

export const KLOK = '2026-10-31T08:00:00+01:00';
const VANDAAG = '2026-10-31';

// --- hulpjes om de opgeslagen vorm van Playwright te lezen en te schrijven ----------------------------

const winkel = (state, naam) => state.origins[0].indexedDB[0].stores.find((s) => s.name === naam);
// Playwright bewaart een veld met undefined als valueEncoded; de datum lezen we er dan uit.
const veld = (rec, naam) => {
  if (rec.value) return rec.value[naam];
  const o = rec.valueEncoded?.o?.find((x) => x.k === naam);
  return o ? o.v : undefined;
};
const meta = (state, sleutel) => winkel(state, 'meta').records.find((r) => r.key === sleutel);
const verwijderPlanning = (state, welke) => {
  const w = winkel(state, 'plannedSessions');
  w.records = w.records.filter((r) => !welke(veld(r, 'scheduledDate')));
};
const dagen = (van, n) => new Date(Date.parse(`${van}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

// --- de standen -------------------------------------------------------------------------------------

// Een rustige, nagemaakte reeks van 28 ochtenden (vandaag erbij): rusthartslag rond 52, HRV rond 62,
// slaap rond 7 uur. Vandaag iets korter en met een lagere HRV, zodat de ochtendkaart iets te zeggen heeft.
function metHorloge(state) {
  const rust = [52, 51, 53, 52, 50, 52, 53, 51, 52, 54, 52, 51, 50, 52, 53, 52, 51, 52, 55, 53, 52, 51, 52, 53, 52, 54, 53, 55];
  const hrv = [63, 65, 62, 64, 66, 63, 61, 64, 65, 62, 63, 66, 67, 64, 62, 63, 65, 64, 60, 62, 64, 65, 63, 62, 64, 61, 60, 56];
  const slaap = [440, 425, 450, 430, 445, 420, 435, 440, 415, 430, 450, 445, 425, 440, 430, 420, 445, 435, 410, 430, 440, 450, 435, 425, 430, 415, 420, 395];
  const score = [82, 78, 85, 80, 84, 77, 81, 83, 75, 79, 86, 84, 78, 82, 80, 76, 84, 81, 72, 79, 83, 86, 81, 77, 80, 74, 76, 68];
  const w = winkel(state, 'recoveryMetrics');
  w.records = rust.map((r, i) => {
    const date = dagen(VANDAAG, i - 27);
    return { value: { id: `intervals.icu:${date}`, date, restingHeartRate: r, hrv: hrv[i], sleepScore: score[i], sleepMinutes: slaap[i], source: 'garmin' } };
  });
  // Een run met detail: 6 km in 39 minuten, kilometer voor kilometer, zoals de horlogegegevens het geven.
  const log = winkel(state, 'sessionLogs').records.find((r) => r.value?.id === 'fake_2').value;
  const secs = [392, 388, 390, 386, 391, 393];
  const hr = [141, 146, 148, 150, 152, 155];
  const kms = secs.map((sec, i) => ({ index: i + 1, startM: i * 1000, endM: (i + 1) * 1000, distanceM: 1000, sec, paceSecKm: sec, hrAvg: hr[i], hrMax: hr[i] + 6, cadence: 168 + (i % 3), gainM: 3 + (i % 2) * 4, lossM: 4 - (i % 2) * 2 }));
  const n = 31;
  const distM = [], timeSec = [], paceSecKm = [], hrLijn = [], altitudeM = [];
  for (let i = 0; i < n; i++) {
    const d = (6000 * i) / (n - 1);
    distM.push(Math.round(d));
    timeSec.push(Math.round((2340 * i) / (n - 1)));
    paceSecKm.push(386 + ((i * 7) % 9));
    hrLijn.push(140 + Math.round((15 * i) / (n - 1)));
    altitudeM.push(12 + Math.round(6 * Math.sin(i / 4)));
  }
  log.runDetail = { version: 1, wholeKm: 6, wholeMinutes: 39, builtAt: '2026-10-23T09:00:00.000Z', totalM: 6000, movingSec: 2340, pauseSec: 0, kms, line: { n, distM, timeSec, paceSecKm, hr: hrLijn, altitudeM } };
}

// Een vakantie zonder training in de komende twee weken (9 tot en met 13 november). De trainingen op die
// dagen zijn er al af, zoals ze na Akkoord op het voorstel zouden zijn.
function metVakantie(state) {
  const s = meta(state, 'settings').value;
  s.leavePeriods = [{ id: 'leave_kaart_1', kind: 'no_training', startDate: '2026-11-09', endDate: '2026-11-13' }];
  verwijderPlanning(state, (d) => d >= '2026-11-09' && d <= '2026-11-13');
}

// Geen doel, een richting: Fit blijven.
function zonderDoel(state) {
  winkel(state, 'trainingGoals').records = [];
  meta(state, 'settings').value.direction = 'maintain';
}

// Ziek gemeld sinds vandaag, verkouden boven de nek. De trainingen van vandaag en morgen zijn eraf.
function ziek(state) {
  const s = meta(state, 'settings').value;
  s.illnessEpisodes = [{ id: 'ill_kaart_1', kind: 'above_neck', startDate: VANDAAG }];
  verwijderPlanning(state, (d) => d >= VANDAAG && d <= '2026-11-01');
}

export const STANDEN = {
  kracht: () => {},
  horloge: metHorloge,
  vakantie: metVakantie,
  'zonder-doel': zonderDoel,
  ziek,
};

// --- één planningsronde op de vaste klok -------------------------------------------------------------

async function settle(bestand) {
  const o = await open(390, { timezoneId: 'Europe/Amsterdam', locale: 'nl-NL', serviceWorkers: 'block', stand: bestand });
  try {
    await o.page.clock.setFixedTime(new Date(KLOK));
    await o.page.goto(BASE + '#/');
    await o.page.waitForTimeout(10000);
    // Nog een keer langs Week, zodat ook een ronde die daar pas start klaar is.
    await o.page.goto(BASE + '#/week');
    await o.page.waitForTimeout(6000);
    return await o.ctx.storageState({ indexedDB: true });
  } finally { await o.browser.close(); }
}

// Een poort die het besturingssysteem vrij geeft.
function vrijePoort() {
  return new Promise((ok, fout) => {
    const s = net.createServer();
    s.on('error', fout);
    s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => ok(port)); });
  });
}

function poortOpen(p) {
  return new Promise((ok) => { const c = net.connect(p, '127.0.0.1'); c.on('connect', () => { c.destroy(); ok(true); }); c.on('error', () => ok(false)); });
}

async function dienstStart() {
  if (EXPLICIET && (await poortOpen(PORT))) { console.log(`LET OP: KAART_PORT=${PORT}: de draaiende server wordt gebruikt zonder te bouwen.`); return () => {}; }
  const dist = mkdtempSync(join(tmpdir(), 'standen-dist-'));
  console.log('Bouwen...');
  execFileSync('npx', ['vite', 'build', '--outDir', dist, '--emptyOutDir'], { cwd: ROOT, stdio: 'ignore' });
  const pv = spawn('npx', ['vite', 'preview', '--outDir', dist, '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore', detached: true });
  for (let i = 0; i < 60 && !(await poortOpen(PORT)); i++) await new Promise((r) => setTimeout(r, 500));
  return () => { try { process.kill(-pv.pid); } catch { pv.kill(); } rmSync(dist, { recursive: true, force: true }); };
}

const gekozen = process.argv.slice(2);
const namen = gekozen.length ? gekozen : Object.keys(STANDEN);
const stop = await dienstStart();
try {
  // De basis blijft de stand zoals hij nu is; een tweede keer draaien verandert dus niets meer.
  const basis = JSON.parse(readFileSync(join(KIT, 'state-kracht.json'), 'utf8'));
  for (const naam of namen) {
    if (!STANDEN[naam]) { console.error(`Onbekende stand ${naam}. Kies uit: ${Object.keys(STANDEN).join(', ')}`); process.exit(3); }
    const state = JSON.parse(JSON.stringify(basis));
    STANDEN[naam](state);
    const pad = join(KIT, `state-${naam}.json`);
    // De stand hoort bij localhost:4697; lib.mjs zet hem om naar de poort die draait.
    const tijdelijk = join(process.env.LOOKOUT_SHOTS, `maak-${naam}.json`);
    writeFileSync(tijdelijk, JSON.stringify(state));
    const klaar = await settle(tijdelijk);
    // De route waar de app laatst was hoort niet bij de stand: terug naar Vandaag, zoals in de basis.
    for (const l of klaar.origins[0].localStorage) if (l.name === 'ascend.lastRoute') l.value = JSON.stringify({ path: '/', at: 1793203889192 });
    writeFileSync(pad, JSON.stringify(klaar).replaceAll(`localhost:${PORT}`, 'localhost:4697'));
    console.log(`${naam}: opgeslagen in ${pad}`);
  }
} finally { stop(); }
