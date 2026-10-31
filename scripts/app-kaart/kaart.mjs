// Tekstuele kaart van de app. Zie docs/app-kaart/README.md en docs/beslissingen/2026-10-31-app-kaart.md.
//   node scripts/app-kaart/kaart.mjs                    maakt docs/app-kaart/ opnieuw
//   node scripts/app-kaart/kaart.mjs --vergelijk        vergelijkt met docs/app-kaart/ (exit 0 gelijk, 1 verschil)
//   node scripts/app-kaart/kaart.mjs --foto <scherm>    screenshot van een scherm
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

async function maakScherm(id, uitMap, fotoMap) {
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
    if (fotoMap) await o.page.screenshot({ path: join(fotoMap, id + '.png'), fullPage: true });
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
    await maakScherm(fotoScherm, tmp, process.env.LOOKOUT_SHOTS);
    console.log(`Foto: ${join(process.env.LOOKOUT_SHOTS, fotoScherm + '.png')}`);
  } else {
    const uit = vergelijk ? mkdtempSync(join(tmpdir(), 'kaart-nieuw-')) : KAART;
    const fotos = vergelijk ? mkdtempSync(join(tmpdir(), 'kaart-fotos-')) : null;
    mkdirSync(uit, { recursive: true });
    for (const id of Object.keys(SCHERMEN)) await maakScherm(id, uit, fotos);
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
        const foto = join(process.env.LOOKOUT_SHOTS, `kaart-${id}.png`);
        copyFileSync(join(fotos, id + '.png'), foto);
        console.log(`${id}: ${d.length} gewijzigde regels (foto: ${foto})`);
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
