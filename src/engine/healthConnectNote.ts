// ASCEND: de zin onder de rij Health Connect na aan- of uitzetten
// (docs/beslissingen/2026-11-02-health-connect.md). Elke uitkomst is zichtbaar: aan met wat er
// binnenkwam, aan maar nog niets gelukt, of uit met de reden. Puur: geen React, geen opslag.

import type { HealthEnableResult, HealthKind } from '../models/healthConnect';

export interface HealthNote {
  text: string;
  tone: 'ok' | 'warn';
  // Bij een weigering: de knop die Health Connect zelf opent, want Android vraagt het na twee
  // keer nee niet meer.
  openSettings?: boolean;
}

const KIND_WORD: Record<HealthKind, string> = {
  workouts: 'trainingen',
  distance: 'afstand',
  sleep: 'slaap',
  restingHeartRate: 'rusthartslag',
  heartRateVariability: 'HRV',
};
const ORDER: HealthKind[] = ['workouts', 'distance', 'sleep', 'restingHeartRate', 'heartRateVariability'];

const count = (n: number, one: string, more: string) => `${n} ${n === 1 ? one : more}`;

function list(words: string[]): string {
  return words.length <= 1 ? (words[0] ?? '') : `${words.slice(0, -1).join(', ')} en ${words[words.length - 1]}`;
}

export function healthEnableNote(result: HealthEnableResult): HealthNote {
  switch (result.status) {
    case 'on': {
      const missing = ORDER.filter((k) => !result.granted.includes(k)).map((k) => KIND_WORD[k]);
      const partly = missing.length > 0 ? ` Je gaf niet alles vrij: ${list(missing)} haalt ASCEND niet op.` : '';
      const sync = result.sync;
      if (sync.status === 'error') return { text: `Health Connect staat aan, maar ophalen lukte nog niet. ${sync.message}${partly}`, tone: 'warn' };
      if (sync.status !== 'ok') return { text: `Health Connect staat aan.${partly}`, tone: 'ok' };
      const parts = [sync.activities > 0 ? count(sync.activities, 'training', 'trainingen') : '', sync.mornings > 0 ? count(sync.mornings, 'ochtend', 'ochtenden') : ''].filter(Boolean);
      const got = parts.length > 0 ? ` ${parts.join(' en ')} opgehaald.` : ' Er stond nog niets nieuws in.';
      return { text: `Health Connect staat aan.${got}${partly}`, tone: 'ok' };
    }
    case 'denied':
      return { text: 'Je gaf geen toestemming, dus Health Connect blijft uit. Vraagt Android het niet meer, sta het dan toe in Health Connect zelf.', tone: 'warn', openSettings: true };
    case 'not-installed':
      return { text: 'Health Connect staat niet op deze telefoon. Installeer het uit de Play Store en zet het daarna hier aan.', tone: 'warn' };
    case 'needs-update':
      return { text: 'Health Connect moet eerst worden bijgewerkt in de Play Store. Zet het daarna hier aan.', tone: 'warn' };
    case 'web':
      return { text: 'Health Connect werkt alleen in de Android-app van ASCEND.', tone: 'warn' };
    case 'error':
      return { text: result.message, tone: 'warn' };
  }
}

export function healthOffNote(): HealthNote {
  return { text: 'Health Connect staat uit. De opgehaalde trainingen zijn van je telefoon gehaald; je logs blijven staan.', tone: 'ok' };
}
