// Kennisindex van de documenten. Zie docs/kennisindex/README.md.
//   node scripts/kennisindex/maak.mjs               maakt docs/kennisindex/README.md en een bestand per onderwerp
//   node scripts/kennisindex/maak.mjs --vergelijk   vergelijkt met wat er staat (exit 0 gelijk, 1 verschil of fout)
// De bron is docs/kennisindex/bronnen.json (met de hand bijgehouden: onderwerp, kern, stand). Status en "Vervangt"
// van een besluit leest het script uit het besluit zelf. Deterministisch: gesorteerd, zonder datum van vandaag.
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve, dirname, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const INDEX = 'docs/kennisindex';
const BRONNEN = `${INDEX}/bronnen.json`;
const BUITEN = ['docs/app-kaart/', `${INDEX}/`];
const PLAATJE = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);
const STANDEN = ['geldt', 'vervangen', 'verouderd', 'achtergrond'];
const ZONDER_BRIEFJE = { werkwijze: 'Hoe er aan ASCEND gewerkt wordt: rollen, poorten, kosten en het open werk.', algemeen: 'Wat bij geen enkel werkbriefje hoort of over de hele app gaat.' };

const op = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** Elk document in docs/ dat een regel in bronnen.json hoort te hebben, gesorteerd. */
export function documenten(root = ROOT) {
  const uit = [];
  const loop = (map) => {
    for (const naam of readdirSync(join(root, map))) {
      const pad = `${map}/${naam}`;
      if (statSync(join(root, pad)).isDirectory()) loop(pad);
      else if (!BUITEN.some((b) => pad.startsWith(b)) && !PLAATJE.has(extname(naam).toLowerCase())) uit.push(pad);
    }
  };
  loop('docs');
  return uit.sort(op);
}

export function leesBronnen(root = ROOT) {
  return JSON.parse(readFileSync(join(root, BRONNEN), 'utf8'));
}

/** Wat er niet klopt tussen bronnen.json en docs/. Een lege lijst is goed. */
export function controleer(root = ROOT) {
  const bron = leesBronnen(root);
  const fout = [];
  const paden = documenten(root);
  const bekend = new Set(Object.keys(bron.documenten));
  for (const p of paden) if (!bekend.has(p)) fout.push(`Geen regel in bronnen.json: ${p}`);
  const echt = new Set(paden);
  for (const [p, e] of Object.entries(bron.documenten)) {
    if (!echt.has(p)) fout.push(`Regel wijst naar een document dat niet bestaat: ${p}`);
    if (!Array.isArray(e.onderwerpen) || e.onderwerpen.length === 0) fout.push(`Geen onderwerp: ${p}`);
    for (const o of e.onderwerpen ?? []) if (!bron.onderwerpen.includes(o)) fout.push(`Onbekend onderwerp "${o}": ${p}`);
    if (!e.kern || /[–—]/.test(e.kern)) fout.push(`Kern ontbreekt of heeft een gedachtestreepje: ${p}`);
    if (!STANDEN.includes(e.stand)) fout.push(`Onbekende stand "${e.stand}": ${p}`);
    if (e.stand === 'vervangen' && !(e.door && existsSync(join(root, e.door)))) fout.push(`Vervangen zonder bestaand "door": ${p}`);
    if (e.stand === 'verouderd' && !e.waarom) fout.push(`Verouderd zonder "waarom": ${p}`);
  }
  for (const o of bron.onderwerpen) {
    if (!(o in ZONDER_BRIEFJE) && !existsSync(join(root, `docs/werkbriefjes/${o}.md`))) fout.push(`Geen werkbriefje voor onderwerp ${o}`);
  }
  return fout;
}

const stuk = (tekst, kop) => {
  const m = tekst.match(new RegExp(`^## ${kop}[^\\n]*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm'));
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
};

/** Titel, Status en wat het besluit zegt te vervangen of aan te vullen, uit het besluit zelf. */
function leesBesluit(root, pad) {
  const tekst = readFileSync(join(root, pad), 'utf8');
  const titel = (tekst.match(/^# (.+)$/m)?.[1] ?? pad).trim();
  const status = (tekst.match(/^Status:\s*(.+)$/m)?.[1] ?? '').trim().replace(/\.$/, '');
  const vervangt = stuk(tekst, 'Vervangt');
  const genoemd = [...new Set(vervangt.match(/\d{4}-\d{2}-\d{2}-[a-z0-9-]+(?=\.md)/g) ?? [])];
  return { titel, status, soort: /^niets/i.test(vervangt) ? 'aangevuld' : 'deels vervangen', genoemd };
}

const link = (pad, tekst) => `[${tekst}](${encodeURI(`../${pad.slice('docs/'.length)}`)})`;
const naam = (pad) => pad.split('/').pop().replace(/\.(md|txt)$/, '');
const isBesluit = (pad) => /^docs\/beslissingen\/\d{4}-/.test(pad);
const kop = (o) => o[0].toUpperCase() + o.slice(1).replaceAll('-', ' ');

/** De bestanden van de index als { pad: inhoud }. */
export function maak(root = ROOT) {
  const bron = leesBronnen(root);
  const paden = Object.keys(bron.documenten).sort(op);
  const besluit = new Map();
  for (const p of paden) if (isBesluit(p) && existsSync(join(root, p))) besluit.set(p, leesBesluit(root, p));

  // Welk later besluit zegt in "Vervangt" iets over een eerder besluit.
  const geraakt = new Map();
  for (const [p, b] of besluit) {
    for (const g of b.genoemd) {
      const doel = `docs/beslissingen/${g}.md`;
      if (doel === p || !besluit.has(doel)) continue;
      if (!geraakt.has(doel)) geraakt.set(doel, { 'deels vervangen': [], aangevuld: [] });
      geraakt.get(doel)[b.soort].push(naam(p));
    }
  }

  const weg = (p) => {
    const e = bron.documenten[p];
    const s = besluit.get(p)?.status.toLowerCase() ?? '';
    return e.stand === 'vervangen' || e.stand === 'verouderd' || s.startsWith('vervangen') || s.startsWith('ingetrokken');
  };
  const regelBesluit = (p) => {
    const b = besluit.get(p);
    const e = bron.documenten[p];
    let r = `- ${naam(p).slice(0, 10)} ${link(p, b.titel)}: ${e.kern}`;
    if (!/^aangenomen$/i.test(b.status)) r += ` Status: ${b.status || 'onbekend'}.`;
    const g = geraakt.get(p);
    if (g?.['deels vervangen'].length) r += ` Deels vervangen door: ${g['deels vervangen'].sort(op).join(', ')}.`;
    if (g?.aangevuld.length) r += ` Aangevuld door: ${g.aangevuld.sort(op).join(', ')}.`;
    return r;
  };
  const regelDoc = (p) => `- ${link(p, p.slice('docs/'.length))}: ${bron.documenten[p].kern}`;
  const regelWeg = (p) => {
    const e = bron.documenten[p];
    const b = besluit.get(p);
    const waarom = e.stand === 'vervangen' ? `Vervangen door ${link(e.door, naam(e.door))}.`
      : e.stand === 'verouderd' ? `Verouderd: ${e.waarom}`
      : `Status in het besluit: ${b.status}.`;
    return `- ${link(p, b ? b.titel : p.slice('docs/'.length))}: ${e.kern} ${waarom}`;
  };

  const tel = { geldt: 0, vervangen: 0, verouderd: 0, achtergrond: 0 };
  for (const p of paden) tel[bron.documenten[p].stand] += 1;

  const bestanden = {};
  const overzicht = [
    '# Kennisindex',
    '',
    'Lees dit eerst. Hier staat per onderwerp waar alles ligt: het werkbriefje, de vaste documenten, en een eigen',
    'bestand met de besluiten die gelden, het onderzoek, de ontwerpen en wat vervangen of verouderd is.',
    '',
    'Dit bestand en de bestanden per onderwerp zijn gemaakt met `npm run kennisindex`; pas ze niet met de hand aan.',
    'De bron is `docs/kennisindex/bronnen.json`: per document het onderwerp, de kern in één zin en de stand. Status en',
    '"Vervangt" van een besluit komen uit het besluit zelf. Een nieuw document in `docs/` krijgt een regel in',
    '`bronnen.json`, daarna `npm run kennisindex`; de test `scripts/kennisindex/kennisindex.test.mjs` faalt anders.',
    '',
    `Stand van de ${paden.length} documenten: ${tel.geldt} gelden, ${tel.vervangen} vervangen, ${tel.verouderd} verouderd, ${tel.achtergrond} achtergrond.`,
    'Niet in de index: `docs/app-kaart/` (de tekstkaart, `npm run kaart`), deze map en afbeeldingen.',
    '',
    'Zo lees je het: geldt is de regel van nu; achtergrond is onderzoek, een ontwerp of een verslag waar een besluit',
    'op steunt; vervangen en verouderd staan onderaan elk onderwerp en lees je alleen voor de geschiedenis.',
    '',
  ];

  for (const o of bron.onderwerpen) {
    const eigen = paden.filter((p) => bron.documenten[p].onderwerpen.includes(o));
    const leeft = eigen.filter((p) => !weg(p));
    const vast = leeft.filter((p) => !isBesluit(p) && bron.documenten[p].stand === 'geldt');
    const besluiten = leeft.filter(isBesluit).sort((a, b) => op(b, a));
    const achter = leeft.filter((p) => !isBesluit(p) && bron.documenten[p].stand === 'achtergrond');
    const oud = eigen.filter(weg);
    const briefje = o in ZONDER_BRIEFJE ? null : `docs/werkbriefjes/${o}.md`;

    overzicht.push(`## ${kop(o)}`, '');
    overzicht.push(briefje ? `- Werkbriefje: ${link(briefje, `werkbriefjes/${o}.md`)}` : `- Geen werkbriefje. ${ZONDER_BRIEFJE[o]}`);
    for (const p of vast) if (p !== briefje) overzicht.push(regelDoc(p));
    overzicht.push(`- Alles over dit onderwerp: [${o}.md](${o}.md) (${besluiten.length} besluiten die gelden, ${achter.length} keer onderzoek, ontwerp of verslag, ${oud.length} vervangen of verouderd).`, '');

    const blad = [`# Kennisindex: ${kop(o).toLowerCase()}`, '', 'Gemaakt met `npm run kennisindex`. Het overzicht staat in [README.md](README.md).', ''];
    blad.push('## Begin hier', '');
    blad.push(briefje ? `- Werkbriefje: ${link(briefje, `werkbriefjes/${o}.md`)}` : `- Geen werkbriefje. ${ZONDER_BRIEFJE[o]}`);
    for (const p of vast) if (p !== briefje) blad.push(regelDoc(p));
    blad.push('', '## Besluiten die gelden', '', 'Nieuwste eerst. Bij een besluit staat welk later besluit het deels vervangt of aanvult.', '');
    blad.push(...(besluiten.length ? besluiten.map(regelBesluit) : ['Geen.']));
    blad.push('', '## Onderzoek, ontwerpen en verslagen', '');
    blad.push(...(achter.length ? achter.map(regelDoc) : ['Geen.']));
    blad.push('', '## Vervangen of verouderd', '');
    blad.push(...(oud.length ? oud.map(regelWeg) : ['Niets.']));
    bestanden[`${INDEX}/${o}.md`] = `${blad.join('\n')}\n`;
  }
  bestanden[`${INDEX}/README.md`] = `${overzicht.join('\n')}`;
  return bestanden;
}

/** De verschillen tussen wat er staat en wat het script nu maakt. Een lege lijst is goed. */
export function verschillen(root = ROOT) {
  const uit = [];
  for (const [pad, inhoud] of Object.entries(maak(root))) {
    const staat = existsSync(join(root, pad)) ? readFileSync(join(root, pad), 'utf8') : null;
    if (staat !== inhoud) uit.push(`${pad} ${staat === null ? 'ontbreekt' : 'wijkt af'}; draai npm run kennisindex`);
  }
  return uit;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const fout = controleer();
  if (fout.length) {
    for (const f of fout) console.error(f);
    process.exit(1);
  }
  if (process.argv.includes('--vergelijk')) {
    const v = verschillen();
    for (const r of v) console.error(r);
    if (!v.length) console.log('Geen verschil met docs/kennisindex/.');
    process.exit(v.length ? 1 : 0);
  }
  const bestanden = maak();
  for (const [pad, inhoud] of Object.entries(bestanden)) writeFileSync(join(ROOT, pad), inhoud);
  console.log(`${Object.keys(bestanden).length} bestanden in docs/kennisindex/ gemaakt.`);
}
