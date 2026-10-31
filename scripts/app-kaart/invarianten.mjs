// Controles over meerdere schermen heen, gelezen uit de tekstkaart.
// Een invariant toevoegen: voeg een object toe aan INVARIANTEN met een `naam` en een functie
// `controleer(k, schermen)`. `k(scherm)` geeft de tekst van een scherm; de functie geeft een lijst
// met schendingen terug (tekst), leeg als alles klopt.
//   node scripts/app-kaart/invarianten.mjs [map]    (standaard docs/app-kaart)
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

const lees = (map, scherm) => { const p = join(map, scherm + '.md'); return existsSync(p) ? readFileSync(p, 'utf8') : ''; };
const alle = (t, re) => [...t.matchAll(re)];

export const INVARIANTEN = [
  {
    naam: 'Geen NaN, undefined of null in beeld',
    controleer: (k, schermen) => schermen.flatMap((s) => alle(k(s), /^.*\b(NaN|undefined|null)\b.*$/gm).map((m) => `${s}: "${m[0].trim()}"`)),
  },
  {
    naam: 'Geen "0 min" bij een gedane training',
    controleer: (k, schermen) => schermen.flatMap((s) => alle(k(s), /^.*\bgedaan\b.*\b0 min\b.*$|^.*\b0 min\b.*\bgedaan\b.*$/gim).map((m) => `${s}: "${m[0].trim()}"`)),
  },
  {
    // "x van y gedaan" of "x/y gedaan" van deze week moet op Week en in de Weekterugblik gelijk zijn.
    naam: 'Trainingen gedaan deze week: Vandaag, Week, Stand en Weekterugblik gelijk',
    controleer: (k) => {
      const pak = (t) => {
        const m = t.match(/\b(\d+)\s*(?:van|\/)\s*(\d+)\s+(?:trainingen\s+)?gedaan/i) ?? t.match(/\b(\d+)\/(\d+)\s*\n\s*gedaan/i);
        return m ? `${m[1]} van ${m[2]}` : null;
      };
      const bronnen = { vandaag: pak(k('vandaag')), week: pak(k('week')), stand: pak(k('stand')), weekterugblik: pak(k('weekterugblik')) };
      const waarden = Object.values(bronnen).filter(Boolean);
      return new Set(waarden).size > 1 ? [`telling verschilt: ${JSON.stringify(bronnen)}`] : [];
    },
  },
  {
    naam: 'Weeknummer en fase gelijk op Vandaag, Week en Stand',
    controleer: (k) => {
      const uit = [];
      const nummers = {}, fasen = {};
      for (const s of ['vandaag', 'week', 'stand']) {
        const t = k(s);
        const m = t.match(/\bweek\s+(\d+)\b(?!\s*(?:van|\/))/i);
        if (m) nummers[s] = m[1];
        const f = t.match(/\b(opbouw|basis|piek|taper|herstel|onderhoud|afbouw|testweek)\w*\b/i);
        if (f) fasen[s] = f[1].toLowerCase();
      }
      if (new Set(Object.values(nummers)).size > 1) uit.push(`weeknummer verschilt: ${JSON.stringify(nummers)}`);
      if (new Set(Object.values(fasen)).size > 1) uit.push(`fase verschilt: ${JSON.stringify(fasen)}`);
      return uit;
    },
  },
  {
    // De voorspelde tijd op Vandaag en Ascend mag hooguit een minuut verschillen.
    naam: 'Voorspelde tijd gelijk op Vandaag en Ascend (binnen een minuut)',
    controleer: (k) => {
      const naarMin = (t) => { const d = t.split(':').map(Number); return d.length === 3 ? d[0] * 60 + d[1] + d[2] / 60 : d[0] + d[1] / 60; };
      const vandaag = k('vandaag').match(/in ongeveer (\d+) minuten/);
      const ascend = k('ascend').match(/Verwacht nu (\d+(?::\d{2}){1,2})/);
      if (!vandaag || !ascend) return [];
      const v = Number(vandaag[1]), a = naarMin(ascend[1]);
      return Math.abs(v - a) > 1 ? [`Vandaag zegt "ongeveer ${v} minuten", Ascend zegt "Verwacht nu ${ascend[1]}" (${Math.abs(v - a).toFixed(1)} min verschil)`] : [];
    },
  },
];

const SCHERMEN = ['vandaag', 'week', 'stand', 'ascend', 'logboek', 'instellingen', 'weekterugblik', 'jaaroverzicht', 'training-blad'];

export function controleer(map = join(ROOT, 'docs', 'app-kaart')) {
  const cache = {};
  const k = (s) => (cache[s] ??= lees(map, s));
  return INVARIANTEN.flatMap((i) => i.controleer(k, SCHERMEN).map((tekst) => ({ naam: i.naam, tekst })));
}

export function meld(schendingen) {
  console.log(`\nINVARIANTEN GESCHONDEN (${schendingen.length}):`);
  for (const s of schendingen) console.log(`  - ${s.naam}: ${s.tekst}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const s = controleer(process.argv[2] ? resolve(process.argv[2]) : undefined);
  if (s.length) { meld(s); process.exit(2); }
  console.log('Invarianten: geen schendingen.');
}
