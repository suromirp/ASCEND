// Tekstuele kaart van de app. Zie docs/app-kaart/README.md en docs/beslissingen/2026-10-31-app-kaart.md.
//   node scripts/app-kaart/kaart.mjs                    maakt docs/app-kaart/ opnieuw
//   node scripts/app-kaart/kaart.mjs --vergelijk        vergelijkt met docs/app-kaart/ (exit 0 gelijk, 1 verschil)
//   node scripts/app-kaart/kaart.mjs --foto <scherm>    afdruk van een heel scherm
//   node scripts/app-kaart/kaart.mjs --foto <scherm> --markeer "<tekst>"   idem, met een rand om die tekst
// Een afdruk toont de hele pagina, ook wat onder de vouw staat (volleAfdruk). Bij --vergelijk krijgt
// elk gewijzigd scherm een afdruk met een rand om de eerste gewijzigde regel.
// Exitcode 2: een invariant is geschonden (zie invarianten.mjs).
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
import { controleer, meld } from './invarianten.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const KAART = join(ROOT, 'docs', 'app-kaart');
const args = process.argv.slice(2);
const vergelijk = args.includes('--vergelijk');
const fotoAt = args.indexOf('--foto');
const fotoScherm = fotoAt >= 0 ? args[fotoAt + 1] : null;
const markeerAt = args.indexOf('--markeer');
const markeerTekst = markeerAt >= 0 ? args[markeerAt + 1] : null;

const PORT = Number(process.env.KAART_PORT ?? process.env.LOOKOUT_PORT ?? 5271);
process.env.LOOKOUT_PORT = String(PORT);
process.env.LOOKOUT_SHOTS ??= join(ROOT, 'shots');
const { open, BASE } = await import('../../.claude/skills/lookout/kit/lib.mjs');

const KLOK = '2026-10-31T08:00:00+01:00';
const WACHT = 3000;

// Eén in-page functie die de pagina (of het open blad) naar Markdown schrijft.
function pagina() {
  const regels = [];
  let lijn = '';
  const flush = () => { const t = lijn.replace(/\s+/g, ' ').trim(); if (t) regels.push(t); lijn = ''; };
  const zichtbaar = (e) => { const s = getComputedStyle(e); return s.display !== 'none' && s.visibility !== 'hidden' && e.getAttribute('aria-hidden') !== 'true'; };
  const isKaart = (e) => e.classList && e.classList.contains('rounded-2xl') && !e.closest('button');
  let kaartNr = 0;
  const loop = (n) => {
    if (n.nodeType === 3) { lijn += n.textContent; return; }
    if (n.nodeType !== 1) return;
    const tag = n.tagName.toLowerCase();
    if (['script', 'style', 'svg', 'canvas', 'nav', 'noscript'].includes(tag)) return;
    if (!zichtbaar(n)) return;
    const aria = (n.getAttribute('aria-label') || '').trim();
    if (tag === 'button' || tag === 'a' || n.getAttribute('role') === 'button') {
      flush();
      const t = n.textContent.replace(/\s+/g, ' ').trim();
      const naam = t || aria;
      if (naam) regels.push(`[${tag === 'a' ? 'link' : 'knop'}: ${naam}]` + (t && aria && aria !== t ? ` (aria: ${aria})` : ''));
      return;
    }
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      flush();
      regels.push(`[veld: ${aria || n.getAttribute('placeholder') || n.getAttribute('type') || tag}${n.value ? ' = ' + n.value : ''}]`);
      return;
    }
    if (/^h[1-4]$/.test(tag)) { flush(); regels.push('#'.repeat(Math.min(Number(tag[1]) + 1, 5)) + ' ' + n.textContent.replace(/\s+/g, ' ').trim()); return; }
    const blok = getComputedStyle(n).display !== 'inline';
    if (isKaart(n)) { flush(); kaartNr++; regels.push('', `--- kaart ${kaartNr} ---`); }
    else if (blok) flush();
    if (aria && n.getAttribute('role') && n.getAttribute('role') !== 'dialog') regels.push(`[label: ${aria}]`);
    if (n.getAttribute('role') === 'status' || n.getAttribute('role') === 'alert') { flush(); regels.push('[melding]'); }
    for (const c of n.childNodes) loop(c);
    if (blok) flush();
  };
  const dlg = [...document.querySelectorAll('[role=dialog]')].filter(zichtbaar).pop();
  loop(dlg || document.body);
  flush();
  return regels.join('\n');
}

export function normaliseer(t) {
  return t
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/g, '<id>')
    .replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?\b/g, '<tijdstempel>')
    .replace(/\b\d{13}\b/g, '<tijdstempel>')
    .replace(/Versie \d{1,2} \w+, \d{2}:\d{2}/g, 'Versie <bouwtijd>')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n').map((l) => l.trimEnd()).join('\n').trim() + '\n';
}

async function stabiel(page) {
  let vorige = null;
  for (let i = 0; i < 6; i++) {
    const nu = normaliseer(await page.evaluate(pagina));
    if (nu === vorige) return nu;
    vorige = nu;
    await page.waitForTimeout(700);
  }
  return vorige;
}

async function tik(page, sel) {
  const l = page.locator(sel).first();
  if (!(await l.count())) throw new Error('niet gevonden: ' + sel);
  await l.scrollIntoViewIfNeeded();
  await l.tap();
  await page.waitForTimeout(1200);
}

const SCHERMEN = {
  vandaag: { titel: 'Vandaag', pad: '#/' },
  week: { titel: 'Week', pad: '#/week' },
  stand: { titel: 'Stand', pad: '#/stand' },
  ascend: { titel: 'Ascend', pad: '#/ascend' },
  logboek: { titel: 'Logboek', pad: '#/history' },
  instellingen: { titel: 'Instellingen (overzicht)', pad: '#/more' },
  weekterugblik: { titel: 'Weekterugblik (blad in Week)', pad: '#/week', actie: (p) => tik(p, 'button:has-text("Weekterugblik")') },
  jaaroverzicht: { titel: 'Jaaroverzicht (in Week)', pad: '#/week', actie: (p) => tik(p, 'button:has-text("Jaaroverzicht")') },
  'training-blad': { titel: 'Blad van een geplande training (Week)', pad: '#/week', actie: (p) => tik(p, 'button[data-sheet-from]:has-text("Lange duurloop")') },
};

// Van een regel van de kaart naar wat je op het scherm zoekt: de tekst van een knop, een kop, een kaart of gewone tekst.
export function zoekterm(regel) {
  const r = regel.trim();
  if (!r) return null;
  let m;
  if ((m = /^--- kaart (\d+) ---$/.exec(r))) return { kaart: Number(m[1]) };
  if ((m = /^\[(?:knop|link): (.*?)\](?: \(aria: (.*)\))?$/.exec(r))) return { tekst: m[1], aria: m[2] ?? m[1] };
  if ((m = /^\[label: (.*)\]$/.exec(r))) return { aria: m[1] };
  if ((m = /^\[veld: (.*?)(?: = .*)?\]$/.exec(r))) return { aria: m[1] };
  if (r === '[melding]') return { melding: true };
  if (/^\[(niet beschikbaar|console)/.test(r)) return null;
  if ((m = /^#{1,5} (.*)$/.exec(r))) return { tekst: m[1] };
  return { tekst: r };
}

// In de pagina: zet een rand om het kleinste element dat bij de zoekterm past en scrol ernaartoe.
function markeerInPagina(term) {
  const norm = (t) => (t || '').replace(/\s+/g, ' ').trim();
  const kandidaten = [...document.querySelectorAll('body *')].filter((e) => !e.closest('nav') && e.getBoundingClientRect().height > 0);
  let doel = null;
  if (term.kaart) doel = [...document.querySelectorAll('.rounded-2xl')].filter((e) => !e.closest('button'))[term.kaart - 1] ?? null;
  else if (term.melding) doel = document.querySelector('[role=status],[role=alert]');
  else {
    const passend = (needle) => kandidaten.filter((e) => norm(e.textContent).includes(needle)).sort((a, b) => norm(a.textContent).length - norm(b.textContent).length)[0] ?? null;
    if (term.aria) doel = kandidaten.find((e) => norm(e.getAttribute('aria-label')) === term.aria) ?? null;
    if (!doel && term.tekst) doel = passend(norm(term.tekst)) ?? passend(norm(term.tekst).slice(0, 40));
  }
  if (!doel) return false;
  doel.style.outline = '3px solid var(--color-warning)';
  // Binnen het element: een rij in een kaart met overflow-hidden knipt een rand erbuiten af.
  doel.style.outlineOffset = '-3px';
  doel.scrollIntoView({ block: 'center' });
  return true;
}

// Een afdruk van de hele pagina. De app scrolt in een eigen container (main, of het blad), dus fullPage van
// Playwright ziet alleen het zichtbare deel. Daarom groeit het venster tot elke scrollcontainer zijn volle
// inhoud toont (een paar rondes, want een blad met een maximale hoogte in dvh groeit mee), dan de afdruk,
// dan terug naar de oude maat.
async function volleAfdruk(page, pad, markeer) {
  let gemarkeerd = false;
  if (markeer) gemarkeerd = await page.evaluate(markeerInPagina, markeer).catch(() => false);
  const oud = page.viewportSize();
  let hoogte = oud.height;
  for (let i = 0; i < 8; i++) {
    const extra = await page.evaluate(() => Math.max(0, ...[...document.querySelectorAll('*')].map((e) => {
      const s = getComputedStyle(e);
      if (!/(auto|scroll)/.test(s.overflowY) || e.clientHeight === 0) return 0;
      return e.scrollHeight - e.clientHeight;
    })));
    if (extra <= 1 || hoogte >= 15000) break;
    hoogte = Math.min(15000, Math.ceil(hoogte + extra));
    await page.setViewportSize({ width: oud.width, height: hoogte });
    await page.waitForTimeout(400);
  }
  // De tabbalk en een open meldingsbalk staan vast onderaan en kunnen over het einde van de inhoud liggen (de
  // meldingsbalk klapt soms weer uit na het vergroten). Dan krijgt main een losse ruimte onderaan (geen padding:
  // React zet die opnieuw) en groeit het venster even hard mee, tot de laatste kaart erboven staat.
  for (let i = 0; i < 3; i++) {
    const tekort = await page.evaluate(() => {
      if ([...document.querySelectorAll('[role=dialog]')].some((d) => d.getBoundingClientRect().height > 0)) return 0;
      const scroller = [...document.querySelectorAll('main')].find((e) => /(auto|scroll)/.test(getComputedStyle(e).overflowY));
      if (!scroller) return 0;
      const top = [...document.querySelectorAll('body *')]
        .filter((e) => getComputedStyle(e).position === 'fixed' && !scroller.contains(e))
        .map((e) => e.getBoundingClientRect())
        .filter((r) => r.height > 0 && r.height < innerHeight / 2 && r.bottom > innerHeight - 300)
        .reduce((t, r) => Math.min(t, r.top), innerHeight);
      const inhoud = [...scroller.children].filter((c) => !c.hasAttribute('data-kaart-ruimte')).map((c) => c.getBoundingClientRect().bottom);
      const onder = Math.max(0, ...inhoud);
      const nodig = Math.ceil(onder - top + 16);
      if (nodig <= 0) return 0;
      const ruimte = document.createElement('div');
      ruimte.setAttribute('data-kaart-ruimte', '');
      ruimte.style.height = `${nodig}px`;
      scroller.appendChild(ruimte);
      return nodig;
    });
    if (tekort <= 0 || hoogte >= 15000) break;
    hoogte = Math.min(15000, hoogte + tekort);
    await page.setViewportSize({ width: oud.width, height: hoogte });
    await page.waitForTimeout(400);
  }
  await page.evaluate(() => { for (const e of document.querySelectorAll('*')) if (e.scrollTop) e.scrollTop = 0; });
  await page.screenshot({ path: pad, fullPage: true });
  await page.setViewportSize(oud);
  return gemarkeerd;
}

async function maakScherm(id, uitMap, fotoMap, markeer) {
  const s = SCHERMEN[id];
  const o = await open(390, { timezoneId: 'Europe/Amsterdam', locale: 'nl-NL', serviceWorkers: 'block' });
  try {
    await o.page.clock.setFixedTime(new Date(KLOK));
    await o.page.goto(BASE + s.pad);
    await o.page.waitForTimeout(WACHT);
    // Een zware tab (Stand) rendert onder de vertraagde processor later: wacht op echte inhoud.
    await o.page.waitForFunction(() => [...document.querySelectorAll('h1,h2,h3,button')].filter((e) => !e.closest('nav')).length > 2, null, { timeout: 25000 }).catch(() => {});
    let nota = '';
    if (s.actie) { try { await s.actie(o.page); } catch (e) { nota = `[niet beschikbaar: ${e.message}]\n\n`; } }
    const tekst = nota + await stabiel(o.page);
    const fouten = o.errs.filter((e) => !/favicon|manifest|Service Worker/i.test(e)).map((e) => `[console: ${e.slice(0, 160)}]`);
    const md = `# ${s.titel}\n\nAdres: \`${s.pad}\`. Klok: 31 oktober 2026, 08:00. Breedte: 390 px.\n\n${tekst}${fouten.length ? '\n## Console\n\n' + [...new Set(fouten)].join('\n') + '\n' : ''}`;
    writeFileSync(join(uitMap, id + '.md'), md);
    if (fotoMap) return await volleAfdruk(o.page, join(fotoMap, id + '.png'), markeer);
    return false;
  } finally { await o.browser.close(); }
}

function poortOpen(p) {
  return new Promise((ok) => { const c = net.connect(p, '127.0.0.1'); c.on('connect', () => { c.destroy(); ok(true); }); c.on('error', () => ok(false)); });
}

async function dienstStart() {
  if (await poortOpen(PORT)) { console.log(`Gebruik de draaiende server op poort ${PORT}.`); return () => {}; }
  const dist = mkdtempSync(join(tmpdir(), 'kaart-dist-'));
  console.log('Bouwen...');
  execFileSync('npx', ['vite', 'build', '--outDir', dist, '--emptyOutDir'], { cwd: ROOT, stdio: 'ignore' });
  const pv = spawn('npx', ['vite', 'preview', '--outDir', dist, '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore', detached: true });
  for (let i = 0; i < 60 && !(await poortOpen(PORT)); i++) await new Promise((r) => setTimeout(r, 500));
  // Alleen de eigen procesgroep stoppen (npx en vite), nooit op naam.
  return () => { try { process.kill(-pv.pid); } catch { pv.kill(); } rmSync(dist, { recursive: true, force: true }); };
}

function diff(a, b) {
  const n = a.length, m = b.length;
  const L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const uit = []; let i = 0, j = 0;
  while (i < n && j < m) { if (a[i] === b[j]) { i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) uit.push('- ' + a[i++]); else uit.push('+ ' + b[j++]); }
  while (i < n) uit.push('- ' + a[i++]);
  while (j < m) uit.push('+ ' + b[j++]);
  return uit;
}

const stop = await dienstStart();
let code = 0;
try {
  const t0 = Date.now();
  if (fotoScherm) {
    if (!SCHERMEN[fotoScherm]) { console.error(`Onbekend scherm. Kies uit: ${Object.keys(SCHERMEN).join(', ')}`); process.exit(3); }
    const tmp = mkdtempSync(join(tmpdir(), 'kaart-foto-'));
    const term = markeerTekst ? zoekterm(markeerTekst) : null;
    const gemarkeerd = await maakScherm(fotoScherm, tmp, process.env.LOOKOUT_SHOTS, term);
    console.log(`Foto: ${join(process.env.LOOKOUT_SHOTS, fotoScherm + '.png')}${term ? (gemarkeerd ? ' (gemarkeerd)' : ' (tekst niet gevonden)') : ''}`);
  } else {
    const uit = vergelijk ? mkdtempSync(join(tmpdir(), 'kaart-nieuw-')) : KAART;
    mkdirSync(uit, { recursive: true });
    for (const id of Object.keys(SCHERMEN)) await maakScherm(id, uit, null);
    if (!vergelijk) {
      for (const f of readdirSync(KAART)) if (f.endsWith('.md') && f !== 'README.md' && !SCHERMEN[f.slice(0, -3)]) rmSync(join(KAART, f));
      for (const id of Object.keys(SCHERMEN)) console.log(`${id}: ${readFileSync(join(KAART, id + '.md'), 'utf8').split('\n').length} regels`);
    } else {
      let verschil = 0;
      mkdirSync(process.env.LOOKOUT_SHOTS, { recursive: true });
      for (const id of Object.keys(SCHERMEN)) {
        const oud = existsSync(join(KAART, id + '.md')) ? readFileSync(join(KAART, id + '.md'), 'utf8').split('\n') : [];
        const nieuw = readFileSync(join(uit, id + '.md'), 'utf8').split('\n');
        const d = diff(oud, nieuw);
        if (d.length === 0) { console.log(`${id}: gelijk`); continue; }
        verschil++;
        // Alleen een gewijzigd scherm krijgt een afdruk: opnieuw openen, met een rand om de eerste nieuwe regel.
        const eerste = d.find((r) => r.startsWith('+ ') && zoekterm(r.slice(2)));
        const term = eerste ? zoekterm(eerste.slice(2)) : null;
        const fotos = mkdtempSync(join(tmpdir(), 'kaart-fotos-'));
        const gemarkeerd = await maakScherm(id, mkdtempSync(join(tmpdir(), 'kaart-weg-')), fotos, term);
        const foto = join(process.env.LOOKOUT_SHOTS, `kaart-${id}.png`);
        copyFileSync(join(fotos, id + '.png'), foto);
        console.log(`${id}: ${d.length} gewijzigde regels (foto: ${foto}${gemarkeerd ? `, rand om "${eerste.slice(2, 62)}"` : ''})`);
        for (const r of d.slice(0, 60)) console.log('  ' + r);
        if (d.length > 60) console.log(`  ... en nog ${d.length - 60} regels`);
      }
      if (verschil) code = 1;
      else console.log('Geen verschil met docs/app-kaart/.');
    }
    const schendingen = controleer(vergelijk ? uit : KAART);
    if (schendingen.length) { meld(schendingen); code = 2; } else console.log('Invarianten: geen schendingen.');
  }
  console.log(`Klaar in ${Math.round((Date.now() - t0) / 1000)} s.`);
} finally { stop(); }
process.exit(code);
