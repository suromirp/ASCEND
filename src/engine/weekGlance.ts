// ASCEND: de woorden van het blad Je week tot nu (docs/visie/Ontwerp Je week tot nu.md, besluit
// docs/beslissingen/2026-11-12-je-week-tot-nu.md). Drie blokken en een lijst, elk feit één keer: de regel onder
// de dagen, hoogstens twee regels om op te letten, en één regel over volgende week. Puur: alles komt uit wat
// buildWeekReview al levert; niets wordt opgeslagen of gepland.

import { hoursMinutes } from '../utils/hoursMinutes';
import { joinNames } from './weekHighlights';
import type { WeekReview } from './weekReview';

const time = (minutes: number) => {
  const m = Math.max(0, Math.round(minutes));
  return m >= 60 ? `${hoursMinutes(m)} uur` : `${m} min`;
};

const capital = (s: string) => (s ? `${s.charAt(0).toUpperCase()}${s.slice(1)}` : s);
const lower = (s: string) => (/^[A-Z][a-z]/.test(s) ? `${s.charAt(0).toLowerCase()}${s.slice(1)}` : s);

// De ene regel onder de dagen: "1 gedaan · 1:04 uur", een afgelopen week "4 van 5 gedaan · 5:10 uur". Wat vandaag
// nog staat laat de strip zien; de verdeling per sport staat in Je trainingen.
export function weekCountLine(r: WeekReview): string {
  if (!r.running && r.done === 0 && r.minutes === 0) return 'Geen trainingen deze week. Volgende week volgt het plan.';
  const count = r.running ? `${r.done} gedaan` : `${r.done} van ${r.planned} gedaan`;
  if (r.minutes <= 0) return count;
  return `${count} · ${time(r.minutes)}`;
}

// De verdeling per sport, voor de weergave Je trainingen: "hardlopen 18,4 km · 320 m omhoog".
export function sportLines(r: WeekReview): string[] {
  return r.perSport.map((p) => {
    const [name, rest] = p.split(': ');
    return capital(`${name.toLowerCase()} ${(rest ?? '').replace(', ', ' · ').replace(' m D+', ' m omhoog')}`.trim());
  });
}

export interface AttentionLine { key: string; label: string; value: string; warn: boolean }

// Een klacht uit de wekelijkse lijfvraag: het vaste woord is de plek, de zin is de waarschuwing, volledig.
function checkLine(r: WeekReview): AttentionLine | null {
  const c = r.weeklyCheck;
  if (!c || c.trouble === 'geen') return null;
  const label = c.area ? capital(c.area.toLowerCase()) : 'Lijf';
  let value: string;
  if (c.trouble === 'niet_kunnen' || c.severity === 'ernstig') {
    value = 'Je kon niet trainen. Bouw volgende week niet verder op, meld het bij Lichaam en laat het bekijken als het niet binnen 2 tot 3 weken beter wordt.';
  } else if (c.trouble === 'minder') {
    value = 'Hield je af en toe af. Volgende week blijft de omvang op die plek gelijk, zonder extra opbouw.';
  } else if (c.severity === 'matig') {
    value = 'Matige pijn. Volgende week blijft de omvang op die plek gelijk, zonder extra opbouw.';
  } else {
    value = 'Lichte klacht. Zakt hij niet, meld hem volgende week weer.';
  }
  return { key: 'check', label, value, warn: true };
}

// Hoogstens twee regels, de zorg eerst: een klacht uit de lijfvraag, pijn uit je logs (zonder de plek die de
// lijfvraag al noemt), een training die bleef liggen, en trainingen die zwaarder of lichter voelden. Zonder iets
// om op te letten is de lijst leeg: geen vervangende zin.
export function attentionLines(r: WeekReview): AttentionLine[] {
  const out: AttentionLine[] = [];
  const check = checkLine(r);
  if (check) out.push(check);
  const checkArea = r.weeklyCheck?.area?.toLowerCase();
  const pain = r.pain.filter((p) => !checkArea || !p.startsWith(checkArea));
  if (pain.length > 0) {
    out.push({ key: 'pain', label: 'Pijn', value: `${capital(joinNames(pain))}. Meld het bij Lichaam, dan houdt ASCEND er rekening mee.`, warn: true });
  }
  if (r.missed.length > 0) {
    const names = joinNames(r.missed);
    out.push({
      key: 'missed', label: 'Bleef liggen', warn: false,
      value: r.keyMissedName
        ? `${names}. De ${lower(r.keyMissedName)} is de belangrijkste; ASCEND verplaatst hem naar een vrije dag als dat past.`
        : `${names}. Laat het los; dubbel doen helpt niet.`,
    });
  }
  if (r.heavier >= 2) out.push({ key: 'heavier', label: 'Zwaarder', warn: false, value: 'Twee of meer trainingen voelden zwaarder. Voelt het weer zo, kies de korte versie.' });
  else if (r.lighter >= 2) out.push({ key: 'lighter', label: 'Lichter', warn: false, value: 'Een paar trainingen voelden lichter. Dat kan betekenen dat je sterker wordt.' });
  return out.slice(0, 2);
}

// Volgende week in één regel: "Rustweek · 4:20 uur" of "Opbouw, week 4 van 18 · 4:20 uur", met eronder de
// belangrijkste training. Buiten het programma alleen de tijd.
export function nextWeekLine(next: NonNullable<WeekReview['next']>): { value: string; sub?: string } {
  const value = [next.label, time(next.minutes)].filter(Boolean).join(' · ');
  const sub = next.key ? `Belangrijkste: ${lower(next.key).replace(': ', ', ')}` : undefined;
  return { value, sub };
}

// De tweede regel van de rij Wat ASCEND aanpaste: het getal met zijn woord.
export function changesSub(n: number): string {
  return `${n} ${n === 1 ? 'aanpassing' : 'aanpassingen'} in je planning`;
}
