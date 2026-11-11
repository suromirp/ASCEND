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
    // kaart.mjs meet bij elk scherm de breedte van de pagina en schrijft alleen bij een overschrijding een regel
    // "[te breed: ...]". Een pagina die breder is dan het venster schuift zijwaarts.
    naam: 'Geen scherm breder dan het venster',
    controleer: (k, schermen) => schermen.flatMap((s) => alle(k(s), /^\[te breed: .*\]$/gm).map((m) => `${s}: ${m[0]}`)),
  },
  {
    naam: 'Geen "0 min" bij een gedane training',
    controleer: (k, schermen) => schermen.flatMap((s) => alle(k(s), /^.*\bgedaan\b.*\b0 min\b.*$|^.*\b0 min\b.*\bgedaan\b.*$/gim).map((m) => `${s}: "${m[0].trim()}"`)),
  },
  {
    // "x van y gedaan" of "x/y gedaan" van deze week moet op Week en in de Weekterugblik gelijk zijn.
    // Stand telt deze week niet meer als getal: Ritme toont stipjes en de laatste vier weken (zie de volgende invarianten).
    naam: 'Trainingen gedaan deze week: Vandaag, Week en Weekterugblik gelijk',
    controleer: (k) => {
      const pak = (t) => {
        const m = t.match(/\b(\d+)\s*(?:van|\/)\s*(\d+)\s+(?:trainingen\s+)?gedaan/i) ?? t.match(/\b(\d+)\/(\d+)\s*\n\s*gedaan/i);
        return m ? `${m[1]} van ${m[2]}` : null;
      };
      const bronnen = { vandaag: pak(k('vandaag')), week: pak(k('week')), weekterugblik: pak(k('weekterugblik')) };
      const waarden = Object.values(bronnen).filter(Boolean);
      return new Set(waarden).size > 1 ? [`telling verschilt: ${JSON.stringify(bronnen)}`] : [];
    },
  },
  {
    // Ritme op Stand telt zoals de coach op Ascend (engine/onCourse.ts#recentAdherence): dezelfde laatste weken,
    // hetzelfde "x van y". Alleen te controleren als beide schermen de telling tonen.
    naam: 'Ritme op Stand telt hetzelfde als de coach op Ascend',
    controleer: (k) => {
      const uit = [];
      for (const [stand, ascend] of [['stand', 'ascend'], ['stand-zonder-doel', 'ascend-zonder-doel']]) {
        const r = k(stand).match(/Laatste (\d+) weken?: (\d+) van (\d+) gedaan/);
        const c = k(ascend).match(/Laatste (\d+) weken?: (\d+) van (\d+) trainingen/);
        if (r && c && r.slice(1).join(' ') !== c.slice(1).join(' ')) uit.push(`${stand} zegt "${r[0]}", ${ascend} zegt "${c[0]}"`);
      }
      return uit;
    },
  },
  {
    // Het ene voortgangsgetal "Klaar voor je doel" staat alleen op Ascend, nooit ook op Stand.
    naam: 'Klaar voor je doel alleen op Ascend, niet op Stand',
    controleer: (k) => ['stand', 'stand-zonder-doel'].flatMap((s) => alle(k(s), /^.*Klaar voor (?:je doel|de GR5).*$/gm).map((m) => `${s}: "${m[0].trim()}"`)),
  },
  {
    // Het Logboek is wat je deed: geen noemer met wat gepland stond en geen "Gemist".
    naam: 'Logboek zonder noemer en zonder Gemist',
    controleer: (k) => alle(k('logboek'), /^.*(?:\b\d+ van \d+\b|\bGemist\b).*$/gm).map((m) => `logboek: "${m[0].trim()}"`),
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
  {
    // Run in detail: de kop ("23 oktober · 6 km · 39:00"), het tempo en (bij een test) de regel "Hele run: 6 km in 39:00"
    // gaan over dezelfde afstand en tijd. Het tempo is die tijd door die afstand; de totaaltijd in de kop en in de
    // regel is dezelfde.
    naam: 'Run in detail: kop, tempo en totaaltijd gelijk',
    controleer: (k) => {
      const t = k('run-in-detail');
      if (!t) return [];
      const sec = (x) => x.split(':').map(Number).reduce((a, b) => a * 60 + b, 0);
      const kop = t.match(/^\d{1,2} \w+ · ([\d,.]+) km · (\d+(?::\d{2}){1,2})$/m);
      if (!kop) return ['de kop met afstand en totaaltijd ontbreekt'];
      const km = Number(kop[1].replace(',', '.'));
      const uit = [];
      const tempo = t.match(/^Tempo\n(\d+:\d{2})\/km$/m);
      if (tempo && km > 0) {
        const verwacht = sec(kop[2]) / km;
        // Het tempo telt zonder stilstaan; de afstand in de kop is op twee cijfers afgerond.
        if (Math.abs(sec(tempo[1]) - verwacht) > Math.max(3, verwacht * 0.015)) uit.push(`tempo ${tempo[1]} per km past niet bij ${kop[1]} km in ${kop[2]} (${Math.round(verwacht)} s per km)`);
      }
      const hele = t.match(/Hele run: ([\d,.]+) km in (\d+(?::\d{2}){1,2})/);
      if (hele && (sec(hele[2]) !== sec(kop[2]) || Math.abs(Number(hele[1].replace(',', '.')) - km) > 0.011)) uit.push(`kop zegt ${kop[1]} km in ${kop[2]}, "Hele run" zegt ${hele[1]} km in ${hele[2]}`);
      return uit;
    },
  },
  {
    // De zinnen over een testloop ("Telt mee", de beste 5 km, de vraag over het tempo) horen bij een training die een
    // test is. Op het scherm van een andere training (Run in detail en het blad van een geplande training) mogen ze
    // niet staan. De naam van de training is de kop onder "Sluiten".
    naam: 'Geen zin over een testloop bij een training die geen test is',
    controleer: (k) => {
      const uit = [];
      for (const s of ['run-in-detail', 'training-blad']) {
        const t = k(s);
        const kop = t.match(/^#{2,3} (.+)$/m);
        if (!kop || /\b(test|wedstrijd)/i.test(kop[1])) continue;
        for (const m of alle(t, /^.*\b(testloop|telt (?:niet )?mee|beste 5 km|snelste 5 km)\b.*$/gim)) uit.push(`${s} (${kop[1]}): "${m[0].trim()}"`);
      }
      return uit;
    },
  },
  {
    // kaart.mjs telt op elk scherm (of in het open blad) de knoppen met de mint vulling van de hoofdknop en schrijft alleen
    // bij meer dan één een regel "[gevulde mint knoppen: ...]". Eén accent per scherm (CLAUDE.md, Zee en berg).
    naam: 'Hoogstens één gevulde mint knop per scherm',
    controleer: (k, schermen) => schermen.flatMap((s) => alle(k(s), /^\[gevulde mint knoppen: .*\]$/gm).map((m) => `${s}: ${m[0]}`)),
  },
  {
    // kaart.mjs telt op Vandaag de zichtbare kaarten voor de missie en schrijft alleen bij te veel een regel "[boven de
    // missie: ...]". Hoogstens het afgesproken aantal (Kaarten boven de missie, het advies is één); ziek gemeld en vroeg
    // ziek zien mogen altijd en tellen mee (engine/todayCards.ts, docs/beslissingen/2026-11-02-vandaag-en-ongedaan.md).
    naam: 'Hoogstens het afgesproken aantal kaarten boven de missie',
    controleer: (k, schermen) => schermen.flatMap((s) => alle(k(s), /^\[boven de missie: .*\]$/gm).map((m) => `${s}: ${m[0]}`)),
  },
  {
    // Elke week in Week heeft een rustdag in beeld (engine/restDayThisWeek.ts): de vaste rustdag ("Rustdag"), een rij
    // Herstel, een vakantiedag, of, als de vaste rustdag bezet is, een vrije dag als "Rustdag deze week" met de reden.
    // Staat er een lege dag "Vrij" en nergens rust, dan telde de app een dag stil als rustdag zonder het te zeggen.
    naam: 'Week met bezette rustdag toont een vrije dag als rustdag',
    controleer: (k, schermen) => schermen.filter((s) => s === 'week' || s.startsWith('week-')).flatMap((s) => {
      const t = k(s);
      if (!t) return [];
      const uit = [];
      const vrij = /^Vrij$/m.test(t);
      const rust = /^Rustdag( deze week)?$|^\[knop: (Rustdag|Hersteldag)|^Vakantie$/m.test(t);
      if (vrij && !rust) uit.push(`${s}: een lege dag heet Vrij, maar geen dag van de week heet Rustdag`);
      for (const m of alle(t, /^Rustdag deze week\n(.*)$/gm)) if (!/je rustdag op \w+ is bezet/.test(m[1])) uit.push(`${s}: "Rustdag deze week" zonder reden ("${m[1].trim()}")`);
      return uit;
    }),
  },
  {
    // De sleuteltraining past bij je doel (engine/keySession.ts, docs/beslissingen/2026-11-11-sleuteltraining.md): alleen
    // met Sterker worden als doel of richting is het een krachttraining. Bij een race of een tocht nooit Benen A of
    // Bovenlichaam, ook niet als die het langst is.
    naam: 'Sleuteltraining op Ascend is geen krachttraining, behalve bij Sterker worden',
    controleer: (k, schermen) => schermen.filter((s) => s.startsWith('ascend')).flatMap((s) => {
      const t = k(s);
      if (/Sterker worden/.test(t)) return [];
      return alle(t, /^Volgende sleuteltraining · .*$/gm)
        .filter((m) => /\b(Benen [AB]|Bovenlichaam [AB]|Eigen gewicht)\b/.test(m[0]))
        .map((m) => `${s}: "${m[0].trim()}"`);
    }),
  },
];

const SCHERMEN = [
  'vandaag', 'week', 'stand', 'ascend', 'logboek', 'instellingen', 'weekterugblik', 'jaaroverzicht', 'training-blad',
  'gegevens', 'lichaam', 'lichaam-plek', 'vandaag-horloge', 'run-in-detail', 'vandaag-vakantie', 'week-vakantie',
  'vandaag-zonder-doel', 'week-zonder-doel', 'ascend-zonder-doel', 'stand-zonder-doel', 'vandaag-ziek', 'week-ziek',
  'ascend-algemeen', 'ascend-vaardigheid',
];

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
