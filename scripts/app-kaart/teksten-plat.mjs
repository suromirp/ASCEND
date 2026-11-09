// Zet alle teksten van de app plat in één document, per scherm gegroepeerd, met waar ze in de code
// staan. Bron: de tekstkaart (docs/app-kaart/) en src/data/settingsHelp.ts. Forge blijft erbuiten.
// Gebruik: node scripts/app-kaart/teksten-plat.mjs  (schrijft docs/teksten/alle-teksten.md)
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const KAART = path.join(ROOT, 'docs', 'app-kaart');
const UIT = path.join(ROOT, 'docs', 'teksten', 'alle-teksten.md');
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

const FORGE = /(^|\/)(components\/forge\/|engine\/forge|strengthModel)/;
function bronbestanden(dir, uit = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) bronbestanden(p, uit);
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name) && !FORGE.test(rel(p).slice(4))) uit.push(p);
  }
  return uit;
}
const bron = bronbestanden(path.join(ROOT, 'src')).map((p) => ({ naam: rel(p), regels: fs.readFileSync(p, 'utf8').split('\n') }));

function zoek(tekst) {
  const probeer = (s, voorvoegsel) => {
    for (const f of bron) {
      const i = f.regels.findIndex((r) => r.includes(s));
      if (i >= 0) return `${voorvoegsel}${f.naam}:${i + 1}`;
    }
    return null;
  };
  const gladde = tekst.replace(/’/g, '’');
  let r = probeer(gladde, '');
  if (r) return r;
  const stuk = gladde.split(/[0-9]+/).sort((a, b) => b.length - a.length)[0].trim();
  if (stuk.length >= 10 && (r = probeer(stuk, '~'))) return r;
  const kop = gladde.slice(0, 14);
  if (kop.length >= 14 && (r = probeer(kop, '~'))) return r;
  return null;
}

const cache = new Map();
const plek = (t) => (cache.has(t) ? cache.get(t) : (cache.set(t, zoek(t)), cache.get(t)));

// Een regel van de kaart wordt een of meer teksten.
function teksten(regel) {
  const uit = [];
  let m = regel.match(/^\[(knop|link|veld|label): (.*?)\](?: \(aria: (.*)\))?$/);
  if (m) {
    uit.push({ soort: m[1], tekst: m[2] });
    if (m[3]) uit.push({ soort: 'aria', tekst: m[3] });
    return uit;
  }
  if (/^(#+ )/.test(regel)) return [{ soort: 'kop', tekst: regel.replace(/^#+ /, '') }];
  if (/^---|^Adres:|^$|^# /.test(regel)) return [];
  return [{ soort: 'tekst', tekst: regel }];
}

const bestanden = fs.readdirSync(KAART).filter((f) => f.endsWith('.md') && f !== 'README.md').sort();
const delen = [];
let totaal = 0;
let zonderPlek = 0;
for (const f of bestanden) {
  const regels = fs.readFileSync(path.join(KAART, f), 'utf8').split('\n');
  const titel = regels[0].replace(/^# /, '');
  const adres = (regels.find((r) => r.startsWith('Adres:')) || '').match(/`(.*?)`/)?.[1] || '';
  const uit = [`## ${titel}`, '', `Scherm \`${f.replace(/\.md$/, '')}\`${adres ? `, adres \`${adres}\`` : ''}.`, ''];
  for (const regel of regels) {
    for (const t of teksten(regel.trim())) {
      totaal++;
      const p = plek(t.tekst);
      if (!p) zonderPlek++;
      const label = t.soort === 'tekst' || t.soort === 'kop' ? '' : `${t.soort}: `;
      uit.push(`- ${label}${t.tekst} (${p ?? 'niet gevonden, komt uit de engine of is samengesteld'})`);
    }
  }
  delen.push(uit.join('\n'));
}

// Uitleg achter de i in de instellingen.
const helpPad = path.join(ROOT, 'src', 'data', 'settingsHelp.ts');
const helpRegels = fs.readFileSync(helpPad, 'utf8').split('\n');
const helpUit = ['## Uitleg achter de i in de instellingen', '', 'Bron `src/data/settingsHelp.ts`. Per sleutel: titel, de zin vooraf en de punten. De Forge-uitleg staat hier niet (lijn Forge).', ''];
let sleutel = null;
let overgeslagen = [];
for (let i = 0; i < helpRegels.length; i++) {
  const r = helpRegels[i];
  const k = r.match(/^  (\w+): \{$/);
  if (k) {
    sleutel = k[1];
    if (/^forge/.test(sleutel)) overgeslagen.push(sleutel);
    else helpUit.push(`### ${sleutel} (src/data/settingsHelp.ts:${i + 1})`);
    continue;
  }
  if (!sleutel || /^forge/.test(sleutel)) continue;
  let m;
  if ((m = r.match(/^\s+title: '(.*)',$/))) { helpUit.push(`- titel: ${m[1].replace(/\\'/g, "'")} (:${i + 1})`); totaal++; }
  else if ((m = r.match(/^\s+lead: '(.*)',$/))) { helpUit.push(`- vooraf: ${m[1].replace(/\\'/g, "'")} (:${i + 1})`); totaal++; }
  else if ((m = r.match(/head: '(.*?)', text: '(.*)' \},?$/))) { helpUit.push(`- ${m[1]}: ${m[2].replace(/\\'/g, "'")} (:${i + 1})`); totaal++; }
}
if (overgeslagen.length) helpUit.push('', `Niet opgenomen (Forge): ${overgeslagen.join(', ')}.`);

const kop = [
  '# Alle teksten van ASCEND, plat',
  '',
  'Stap 1 van het herschrijven van alle teksten (`docs/backlog.md`, "Alle teksten van ASCEND herschrijven, en Engels erbij"). Gemaakt met `node scripts/app-kaart/teksten-plat.mjs` uit de tekstkaart (`docs/app-kaart/`, nagemaakte data, klok 31 oktober 2026) en `src/data/settingsHelp.ts`. Draai het opnieuw na een kaartwijziging.',
  '',
  'Lees het zo: per scherm de teksten in volgorde van de kaart, met tussen haakjes het bestand en de regel waar de tekst staat. Een `~` vooraan betekent dat alleen een deel van de tekst is gevonden (een getal of naam wordt ingevuld). "Niet gevonden" is een tekst die uit de engine komt of uit stukken is samengesteld. Een knop met meerdere teksten die aan elkaar staan is zo uit de kaart overgenomen. Een kop staat zonder voorvoegsel; knoppen, links, velden en labels hebben het soort ervoor; `aria` is de naam voor schermlezers.',
  '',
  'Niet opgenomen: de Forge-tab en alle Forge-uitleg (lijn Forge loopt tegelijk), en teksten die alleen verschijnen in toestanden die de kaart niet laat zien (bijvoorbeeld foutmeldingen bij een mislukte koppeling). Dat laatste is een gat in de kaart, geen bewuste keuze.',
  '',
  `Aantal regels: ${totaal}, waarvan ${zonderPlek} zonder gevonden plek in de code.`,
  '',
].join('\n');

fs.writeFileSync(UIT, `${kop}\n${delen.join('\n\n')}\n\n${helpUit.join('\n')}\n`);
console.log(`${rel(UIT)}: ${totaal} regels, ${zonderPlek} zonder plek`);
