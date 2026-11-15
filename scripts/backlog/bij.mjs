// Houdt de Inbox van docs/backlog.md bij: een commit met "Klaar: I-<n>" (ook meer codes op één regel)
// verplaatst dat punt van de Inbox naar Pas live, met de datum en de korte commit. Idempotent.
//   npm run backlog:bij                      standaard origin/main~20..origin/main
//   npm run backlog:bij -- <bereik>          een ander bereik
//   npm run backlog:bij -- --droog           alleen tonen wat er zou gebeuren
//   --commits <bestand.json>                 [{hash, datum, bericht}] in plaats van git (voor tests)
//   --backlog <pad>                          een ander bestand dan docs/backlog.md
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const WORTEL = fileURLToPath(new URL('../../', import.meta.url));
const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

/** Alle codes uit de regels "Klaar: I-3, I-4" van een commitbericht. */
export function codesUit(bericht) {
  const uit = [];
  for (const m of String(bericht).matchAll(/^\s*Klaar:\s*(.+)$/gim)) {
    for (const c of m[1].matchAll(/\bI-(\d+)\b/g)) if (!uit.includes(+c[1])) uit.push(+c[1]);
  }
  return uit;
}

/** "15 november", in Amsterdamse tijd. */
export function datumNl(iso) {
  const delen = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', day: 'numeric', month: 'numeric' }).formatToParts(new Date(iso));
  const dag = delen.find((d) => d.type === 'day').value;
  const maand = delen.find((d) => d.type === 'month').value;
  return `${dag} ${MAANDEN[Number(maand) - 1]}`;
}

/** De korte titel van een punt: zonder haakjes, tot de eerste dubbele punt of zin, hoogstens 100 tekens. */
export function titelVan(tekst) {
  let t = tekst.replace(/`/g, '');
  let vorige;
  do { vorige = t; t = t.replace(/\s*\([^()]*\)/g, ''); } while (t !== vorige);
  const knip = [t.indexOf(': ', 6), t.indexOf('. ', 6)].filter((i) => i > 0);
  if (knip.length) t = t.slice(0, Math.min(...knip));
  t = t.trim().replace(/[.,;:]+$/, '');
  if (t.length > 100) t = t.slice(0, 100).replace(/\s+\S*$/, '') + '…';
  return t;
}

const inspring = (regel) => regel.length - regel.trimStart().length;

/**
 * Verplaatst de punten uit commits (oudste eerst) van de Inbox naar Pas live.
 * Geeft de nieuwe tekst, wat verplaatst is en welke codes nergens in de Inbox staan.
 */
export function bijwerken(tekst, commits) {
  const regels = tekst.split('\n');
  const verplaatst = [];
  const overgeslagen = [];
  for (const c of commits) {
    for (const nr of codesUit(c.bericht)) {
      const kop = regels.findIndex((r) => r.startsWith('## Inbox'));
      if (kop < 0) throw new Error('Geen kop "## Inbox" in de backlog.');
      let einde = regels.findIndex((r, i) => i > kop && r.startsWith('## '));
      if (einde < 0) einde = regels.length;
      const re = new RegExp(`^(\\s*)- \\[I-${nr}\\]\\s+(.*)$`);
      const i = regels.findIndex((r, n) => n > kop && n < einde && re.test(r));
      if (i < 0) { overgeslagen.push({ code: nr, hash: c.hash }); continue; }
      const m = regels[i].match(re);
      let tot = i + 1;
      while (tot < einde && regels[tot].trim() !== '' && inspring(regels[tot]) > m[1].length) tot += 1;
      regels.splice(i, tot - i);
      const live = regels.findIndex((r) => r.startsWith('## Pas live'));
      if (live < 0) throw new Error('Geen kop "## Pas live" in de backlog.');
      const nieuw = `- [I-${nr}] ${titelVan(m[2])} (${datumNl(c.datum)}, ${c.hash.slice(0, 7)})`;
      regels.splice(live + 1, 0, nieuw);
      verplaatst.push({ code: nr, hash: c.hash.slice(0, 7), regel: nieuw });
    }
  }
  return { tekst: regels.join('\n'), verplaatst, overgeslagen };
}

/** Commits van een bereik, oudste eerst. */
export function leesCommits(bereik) {
  const uit = execFileSync('git', ['log', '--reverse', '--format=%H%x1f%aI%x1f%B%x1e', bereik], { cwd: WORTEL, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return uit.split('\x1e').map((s) => s.replace(/^\n+/, '')).filter(Boolean).map((s) => {
    const [hash, datum, ...rest] = s.split('\x1f');
    return { hash, datum, bericht: rest.join('\x1f') };
  });
}

function hoofd(argv) {
  let bereik = 'origin/main~20..origin/main';
  let droog = false;
  let commitsBestand = null;
  let pad = `${WORTEL}docs/backlog.md`;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--droog') droog = true;
    else if (argv[i] === '--commits') commitsBestand = argv[++i];
    else if (argv[i] === '--backlog') pad = argv[++i];
    else bereik = argv[i];
  }
  const commits = commitsBestand ? JSON.parse(readFileSync(commitsBestand, 'utf8')) : leesCommits(bereik);
  const nu = readFileSync(pad, 'utf8');
  const r = bijwerken(nu, commits);
  console.log(`${commits.length} commits gelezen${commitsBestand ? '' : ` (${bereik})`}.`);
  for (const v of r.verplaatst) console.log(`${droog ? 'Zou verplaatsen' : 'Verplaatst'}: I-${v.code} (${v.hash})`);
  for (const o of r.overgeslagen) console.log(`Overgeslagen: I-${o.code} (${o.hash.slice(0, 7)}) staat niet in de Inbox, al verplaatst of onbekend.`);
  if (!r.verplaatst.length) console.log('Niets te verplaatsen.');
  if (!droog && r.tekst !== nu) writeFileSync(pad, r.tekst);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) hoofd(process.argv.slice(2));
