// Tekstuele kaart van de app. Zie docs/app-kaart/README.md en docs/beslissingen/2026-10-31-app-kaart.md.
//   node scripts/app-kaart/kaart.mjs                    maakt docs/app-kaart/ opnieuw
//   node scripts/app-kaart/kaart.mjs --vergelijk        vergelijkt met docs/app-kaart/ (exit 0 gelijk, 1 verschil)
//   node scripts/app-kaart/kaart.mjs --vergelijk --details   idem, met de gelijke schermen bij naam en tot 60 regels per verschil
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
// Kort (standaard): gelijke schermen als één regel en per verschil de eerste 8 regels. --details toont tot 60.
const details = args.includes('--details');
const fotoAt = args.indexOf('--foto');
const fotoScherm = fotoAt >= 0 ? args[fotoAt + 1] : null;
const markeerAt = args.indexOf('--markeer');
const markeerTekst = markeerAt >= 0 ? args[markeerAt + 1] : null;

// Zonder KAART_PORT bouwt de kaart altijd zelf en kiest een vrije poort, zodat hij nooit een verouderde build van
// iemand anders vergelijkt. Alleen met KAART_PORT mag hij een draaiende server hergebruiken.
const EXPLICIET = process.env.KAART_PORT !== undefined;
const PORT = EXPLICIET ? Number(process.env.KAART_PORT) : await vrijePoort();
process.env.LOOKOUT_PORT = String(PORT);
process.env.LOOKOUT_SHOTS ??= join(ROOT, 'shots');
const { open, BASE } = await import('../../.claude/skills/lookout/kit/lib.mjs');

const KLOK = '2026-10-31T08:00:00+01:00';
// De klok van een scherm met een eigen klok, zoals in de kop van de kaart: "1 november 2026, 08:00".
const klokTekst = (iso) => new Date(iso).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(' om ', ', ');
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
    // Hoeveel ruimte de browser geeft en hoeveel de stand gebruikt hangt van de schijf van de machine af.
    .replace(/(Van de )[\d.,]+ [KMGT]?B( die ASCEND mag gebruiken\n)[\d.,]+ [KMGT]?B/g, '$1<ruimte>$2<gebruikt>')
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

// Logboek (de trainingen staan per week in beeld), de rustige duurloop van 23 oktober (6 km, met detail uit het horloge), dan de rij "Run in detail".
async function openRunInDetail(page) {
  await tik(page, 'button:has-text("Rustige duurloop"):has-text("23")');
  await tik(page, 'button:has-text("Run in detail")');
  await page.waitForTimeout(1500);
}

const SCHERMEN = {
  vandaag: { titel: 'Vandaag', pad: '#/' },
  week: { titel: 'Week', pad: '#/week' },
  stand: { titel: 'Stand', pad: '#/stand' },
  // De schermen achter Je stand (docs/beslissingen/2026-11-12-stand-minimaal.md): achter de drie regels en de rijen.
  'stand-benen': { titel: 'Stand: Benen', pad: '#/stand/benen' },
  'stand-belasting': { titel: 'Stand: Belasting', pad: '#/stand/belasting' },
  'stand-ritme': { titel: 'Stand: Ritme', pad: '#/stand/ritme' },
  'stand-lopen': { titel: 'Stand: Lopen', pad: '#/stand/lopen' },
  'stand-invloed': { titel: 'Stand: Wat speelde er', pad: '#/stand/invloed' },
  ascend: { titel: 'Ascend', pad: '#/ascend' },
  logboek: { titel: 'Logboek', pad: '#/history' },
  instellingen: { titel: 'Instellingen (overzicht)', pad: '#/more' },
  weekterugblik: { titel: 'Weekterugblik (blad in Week)', pad: '#/week', actie: (p) => tik(p, 'button:has-text("Weekterugblik")') },
  jaaroverzicht: { titel: 'Jaaroverzicht (in Week)', pad: '#/week', actie: (p) => tik(p, 'button:has-text("Jaaroverzicht")') },
  // Een dag later (zondag 1 november), zodat er een looptraining op Vandaag staat: de missiekaart met Gedaan en de
  // routerij (zonder koppeling met je horloge; met koppeling staat er Briefing, engine/briefing.ts#missionButton).
  'vandaag-loop': { titel: 'Vandaag met een looptraining (Lange duurloop)', pad: '#/', klok: '2026-11-01T08:00:00+01:00' },
  // Forge (docs/beslissingen/2026-11-11-forge-kern-zichtbaar.md): Benen A uit Week (woensdag 28 oktober), na Training
  // starten. Elke oefening toont zijn rol (Kern, Bijwerk, Extra); de klok loopt nog niet, dus geen regel onder de klok.
  forge: { titel: 'Forge met Benen A (blad in Week, Training starten)', pad: '#/week', actie: async (p) => { await tik(p, 'button[data-sheet-from]:has-text("Benen A")'); await tik(p, 'button:has-text("Training starten")'); } },
  'training-blad': { titel: 'Blad van een geplande training (Week)', pad: '#/week', actie: (p) => tik(p, 'button[data-sheet-from]:has-text("Lange duurloop")') },
  // De Briefing van de Lange duurloop (morgen) uit het blad in Week: het enige scherm vooraf voor een training te voet
  // (docs/visie/Ontwerp trainingsscherm minimaal.md, sporen 1 tot 4). Zone, praattest, duur en horloge staan er één keer.
  briefing: { titel: 'Briefing van de Lange duurloop (blad in Week)', pad: '#/week', actie: async (p) => { await tik(p, 'button[data-sheet-from]:has-text("Lange duurloop")'); await tik(p, '[role=dialog] button:has-text("Briefing")'); } },
  // De opslagrijen komen asynchroon uit de browser (storage.estimate); wacht tot ze er zijn.
  gegevens: { titel: 'Instellingen: Gegevens en back-up', pad: '#/more/gegevens', actie: (p) => p.waitForFunction(() => /die ASCEND mag gebruiken/.test(document.body.innerText) && /Ruimte van reeksen, /.test(document.body.innerText), null, { timeout: 15000 }).catch(() => {}) },
  'datavelden': { titel: 'Datavelden voor je horloge (Zone 2, advies)', pad: '#/horloge/datavelden' },
  lichaam: { titel: 'Lichaam', pad: '#/lichaam' },
  'lichaam-plek': { titel: 'Lichaam: een plek (rechterknie)', pad: '#/lichaam/knie-r' },
  // De standen met horlogegegevens, een vakantie, zonder doel en ziek gemeld (scripts/app-kaart/maak-standen.mjs).
  'vandaag-horloge': { titel: 'Vandaag met horlogegegevens (ochtendkaart)', pad: '#/', stand: 'horloge' },
  'run-in-detail': { titel: 'Run in detail (stand met horlogegegevens)', pad: '#/history', stand: 'horloge', actie: openRunInDetail },
  'vandaag-vakantie': { titel: 'Vandaag met een vakantie in de komende twee weken', pad: '#/', stand: 'vakantie' },
  'week-vakantie': { titel: 'Week met een vakantie', pad: '#/week', stand: 'vakantie' },
  'vandaag-zonder-doel': { titel: 'Vandaag zonder doel (Fit blijven)', pad: '#/', stand: 'zonder-doel' },
  'week-zonder-doel': { titel: 'Week zonder doel (Fit blijven)', pad: '#/week', stand: 'zonder-doel' },
  'ascend-zonder-doel': { titel: 'Ascend zonder doel (Fit blijven)', pad: '#/ascend', stand: 'zonder-doel' },
  'stand-zonder-doel': { titel: 'Stand zonder doel (Fit blijven)', pad: '#/stand', stand: 'zonder-doel' },
  'stand-ritme-zonder-doel': { titel: 'Stand: Ritme zonder doel (Fit blijven)', pad: '#/stand/ritme', stand: 'zonder-doel' },
  'stand-vakantie': { titel: 'Stand met een vakantie', pad: '#/stand', stand: 'vakantie' },
  'stand-ziek': { titel: 'Stand, ziek gemeld', pad: '#/stand', stand: 'ziek' },
  'vandaag-ziek': { titel: 'Vandaag, ziek gemeld', pad: '#/', stand: 'ziek' },
  'week-ziek': { titel: 'Week, ziek gemeld', pad: '#/week', stand: 'ziek' },
  'ascend-vaardigheid': { titel: 'Ascend met een vaardigheid (Pull-Up)', pad: '#/ascend', stand: 'vaardigheid' },
  'ascend-algemeen': { titel: 'Ascend met Algemeen sterk met eigen gewicht', pad: '#/ascend', stand: 'algemeen' },
  // Het voorstel voor spieren voor de berg als eigen weergave in de weekterugblik (besluit 2026-11-12-je-week-tot-nu).
  'weekterugblik-voorstel': { titel: 'Weekterugblik, de weergave Voorstel (stand met een bergdoel)', pad: '#/week', stand: 'voorstel', actie: async (p) => { await tik(p, 'button:has-text("Weekterugblik")'); await tik(p, 'button:has-text("Voorstel")'); } },
  // Aangepast door ASCEND (besluit 2026-11-12-week-minimaal): de rij onder de dagen en het blad erachter, met twee
  // nagemaakte aanpassingen in deze week. De invariant leest het getal, de regels en de dagrijen met "aangepast".
  'week-aangepast': { titel: 'Week met twee aanpassingen door ASCEND', pad: '#/week', stand: 'aangepast' },
  'week-aangepast-blad': { titel: 'Blad Aangepast door ASCEND (Week)', pad: '#/week', stand: 'aangepast', actie: (p) => tik(p, 'button[data-sheet-from]:has-text("Aangepast door ASCEND")') },
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
  const o = await open(390, { timezoneId: 'Europe/Amsterdam', locale: 'nl-NL', serviceWorkers: 'block', stand: s.stand });
  try {
    await o.page.clock.setFixedTime(new Date(s.klok ?? KLOK));
    await o.page.goto(BASE + s.pad);
    await o.page.waitForTimeout(WACHT);
    // Een zware tab (Stand) rendert onder de vertraagde processor later: wacht op echte inhoud.
    await o.page.waitForFunction(() => [...document.querySelectorAll('h1,h2,h3,button')].filter((e) => !e.closest('nav')).length > 2, null, { timeout: 25000 }).catch(() => {});
    let nota = '';
    if (s.actie) { try { await s.actie(o.page); } catch (e) { nota = `[niet beschikbaar: ${e.message}]\n\n`; } }
    const tekst = nota + await stabiel(o.page);
    // Breedte: past het scherm in het venster? Gemeten op 390 px en op de smalle telefoons 360 en 320 px. Alleen bij een
    // overschrijding komt er een regel bij (de invariant "geen scherm breder dan het venster" in invarianten.mjs leest
    // die), zodat een goed scherm niets verandert in de kaart.
    const meetBreedte = () => o.page.evaluate(() => {
      const w = innerWidth;
      const scroller = document.getElementById('app-scroll');
      const breedste = Math.max(document.documentElement.scrollWidth, scroller ? scroller.scrollWidth : 0);
      if (breedste <= w + 1) return null;
      const dader = [...document.querySelectorAll('body *')].filter((e) => !e.closest('nav') && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().right > w + 1)
        .sort((a, b) => b.getBoundingClientRect().right - a.getBoundingClientRect().right)[0];
      return { breedste, w, dader: dader ? `${dader.tagName.toLowerCase()} "${(dader.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40)}" tot ${Math.round(dader.getBoundingClientRect().right)} px` : 'onbekend' };
    });
    // Mint: hoogstens één gevulde mint knop (de PrimaryButton) per scherm. Alleen bij meer dan één komt er een regel bij
    // (de invariant "hoogstens één gevulde mint knop per scherm" in invarianten.mjs leest die). Telt in het open blad
    // als er een blad open staat, anders op de hele pagina. De vulling lezen we uit het token, geen vaste kleur.
    const mint = await o.page.evaluate(() => {
      const probe = document.createElement('span');
      probe.style.background = 'var(--color-action-fill)';
      document.body.appendChild(probe);
      const vulling = getComputedStyle(probe).backgroundColor;
      probe.remove();
      const zicht = (e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.display !== 'none'; };
      const blad = [...document.querySelectorAll('[role=dialog]')].filter(zicht).pop();
      return [...(blad || document.body).querySelectorAll('button')].filter((b) => zicht(b) && getComputedStyle(b).backgroundColor === vulling)
        .map((b) => (b.textContent || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 40));
    });
    if (process.env.KAART_MINT) console.log(`${id}: ${mint.length} gevulde mint knoppen ${JSON.stringify(mint)}`);
    const mintRegel = mint.length > 1 ? `\n[gevulde mint knoppen: ${mint.length}, ${mint.map((m) => `"${m}"`).join(', ')}]\n` : '';
    // Vandaag: hoogstens het afgesproken aantal kaarten boven de missie (engine/todayCards.ts#aboveMissionOverflow, dezelfde
    // regel). Telt elke zichtbare kaart die in de pagina voor de missie staat, behalve de lucht en een blad; een kaart
    // met data-today-safety (ziek gemeld, vroeg ziek zien) mag altijd en telt mee. Een kaart zonder data-today-card telt
    // als gewone kaart, zodat een kaart die buiten de rij om boven de missie komt ook opvalt. Alleen bij te veel komt er
    // een regel bij (de invariant "Hoogstens het afgesproken aantal kaarten boven de missie" in invarianten.mjs leest die).
    const boven = await o.page.evaluate(() => {
      const missie = document.querySelector('[data-today-mission]');
      if (!missie) return null;
      const limiet = missie.getAttribute('data-above-limit');
      const zicht = (e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.height > 0 && c.visibility !== 'hidden' && c.position !== 'fixed'; };
      const vakken = (e) => (getComputedStyle(e).display === 'contents' ? [...e.children].flatMap(vakken) : [e]);
      const kaarten = [];
      for (const e of missie.parentElement.children) {
        if (e === missie) break;
        if (e.classList.contains('sky-band')) continue;
        if (!vakken(e).some(zicht)) continue;
        kaarten.push({ id: e.getAttribute('data-today-card') || (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30), veilig: e.hasAttribute('data-today-safety'), mag: e.hasAttribute('data-today-card') });
      }
      const veilig = kaarten.filter((k) => k.veilig).length;
      const gewoon = kaarten.length - veilig;
      const max = limiet === 'all' ? Infinity : Number(limiet) || 1;
      const teVeel = Math.max(0, gewoon - Math.max(0, max - veilig)) + kaarten.filter((k) => !k.mag).length;
      return teVeel > 0 ? { n: kaarten.length, limiet, ids: kaarten.map((k) => k.id) } : null;
    });
    const bovenRegel = boven ? `\n[boven de missie: ${boven.n} kaarten, hoogstens ${boven.limiet === 'all' ? 'alles' : boven.limiet}: ${boven.ids.join(', ')}]\n` : '';
    let breedteRegel = '';
    const hoogteNu = o.page.viewportSize().height;
    for (const breedte of [390, 360, 320]) {
      if (breedte !== 390) { await o.page.setViewportSize({ width: breedte, height: hoogteNu }); await o.page.waitForTimeout(500); }
      const breed = await meetBreedte();
      if (breed) breedteRegel += `\n[te breed: ${breed.breedste} px in een venster van ${breed.w} px, het verst: ${breed.dader}]\n`;
    }
    await o.page.setViewportSize({ width: 390, height: hoogteNu });
    await o.page.waitForTimeout(300);
    const fouten = o.errs.filter((e) => !/favicon|manifest|Service Worker/i.test(e)).map((e) => `[console: ${e.slice(0, 160)}]`);
    const md = `# ${s.titel}\n\nAdres: \`${s.pad}\`. Klok: ${s.klok ? klokTekst(s.klok) : '31 oktober 2026, 08:00'}. Breedte: 390 px.\n\n${tekst}${mintRegel}${bovenRegel}${breedteRegel}${fouten.length ? '\n## Console\n\n' + [...new Set(fouten)].join('\n') + '\n' : ''}`;
    writeFileSync(join(uitMap, id + '.md'), md);
    if (fotoMap) return await volleAfdruk(o.page, join(fotoMap, id + '.png'), markeer);
    return false;
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
  if (EXPLICIET && (await poortOpen(PORT))) { console.log(`LET OP: KAART_PORT=${PORT} staat gezet en daar draait al een server. Die wordt gebruikt zoals hij is, zonder bouwen; staat daar een oude build, dan vergelijkt de kaart een oude app.`); return () => {}; }
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
      const gelijk = [];
      mkdirSync(process.env.LOOKOUT_SHOTS, { recursive: true });
      for (const id of Object.keys(SCHERMEN)) {
        const oud = existsSync(join(KAART, id + '.md')) ? readFileSync(join(KAART, id + '.md'), 'utf8').split('\n') : [];
        const nieuw = readFileSync(join(uit, id + '.md'), 'utf8').split('\n');
        const d = diff(oud, nieuw);
        if (d.length === 0) { gelijk.push(id); continue; }
        verschil++;
        // Alleen een gewijzigd scherm krijgt een afdruk: opnieuw openen, met een rand om de eerste nieuwe regel.
        const eerste = d.find((r) => r.startsWith('+ ') && zoekterm(r.slice(2)));
        const term = eerste ? zoekterm(eerste.slice(2)) : null;
        const fotos = mkdtempSync(join(tmpdir(), 'kaart-fotos-'));
        const gemarkeerd = await maakScherm(id, mkdtempSync(join(tmpdir(), 'kaart-weg-')), fotos, term);
        const foto = join(process.env.LOOKOUT_SHOTS, `kaart-${id}.png`);
        copyFileSync(join(fotos, id + '.png'), foto);
        console.log(`${id}: ${d.length} gewijzigde regels (foto: ${foto}${gemarkeerd ? `, rand om "${eerste.slice(2, 62)}"` : ''})`);
        const max = details ? 60 : 8;
        for (const r of d.slice(0, max)) console.log('  ' + r);
        if (d.length > max) console.log(`  ... en nog ${d.length - max} regels${details ? '' : ' (alles: --details)'}`);
      }
      if (gelijk.length) console.log(`Gelijk: ${gelijk.length} schermen${details ? ` (${gelijk.join(', ')})` : ''}.`);
      if (verschil) code = 1;
      else console.log('Geen verschil met docs/app-kaart/.');
    }
    const schendingen = controleer(vergelijk ? uit : KAART);
    if (schendingen.length) { meld(schendingen); code = 2; } else console.log('Invarianten: geen schendingen.');
  }
  console.log(`Klaar in ${Math.round((Date.now() - t0) / 1000)} s.`);
} finally { stop(); }
process.exit(code);
