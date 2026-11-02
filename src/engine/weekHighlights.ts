// ASCEND: wat de weekterugblik als eerste zegt. Hoogstens twee regels over de week ("Wat telt"), gekozen uit
// wat buildWeekReview al levert, in vaste volgorde: pijn die je meldde, een sleuteltraining die bleef liggen,
// trainingen die zwaarder of lichter voelden, de wekelijkse lijfvraag, en anders het advies. De volgende
// week staat er apart onder. Puur: geen React, niets wordt opgeslagen of gepland.

import { hoursMinutes } from '../utils/hoursMinutes';
import type { WeekReview } from './weekReview';

export interface Highlight { text: string; tone: 'normal' | 'warning'; icon: 'info' | 'week' | 'lichaam' }

export function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} en ${names[names.length - 1]}`;
}

const lower = (name: string) => (/^[A-Z][a-z]/.test(name) ? name.charAt(0).toLowerCase() + name.slice(1) : name);

export function weekHighlights(r: WeekReview): Highlight[] {
  const out: Highlight[] = [];
  if (r.pain.length > 0) {
    out.push({ tone: 'warning', icon: 'lichaam', text: `Pijn deze week: ${r.pain.join(', ')}. Meld het bij Lichaam, dan houdt ASCEND er rekening mee.` });
  }
  // Wat vandaag nog kan staat nooit als blijven liggen (buildWeekReview telt alleen wat voor vandaag lag).
  if (r.missed.length > 0) {
    const names = joinNames(r.missed);
    const left = `${names} ${r.missed.length === 1 ? 'bleef' : 'bleven'} liggen. `;
    out.push({
      tone: 'normal', icon: 'week',
      text: left + (r.keyMissedName
        ? `De ${lower(r.keyMissedName)} is de belangrijkste van de week; die haalt ASCEND in op een vrije dag als dat nog past. De rest laat je los.`
        : 'Laat los wat blijft liggen: inhalen door te stapelen is geen goed idee.'),
    });
  }
  if (r.heavier >= 2) {
    out.push({ tone: 'normal', icon: 'info', text: 'Twee of meer trainingen voelden zwaarder dan gepland. Voelt het volgende week weer zo, kies dan de korte versie of houd de minuten gelijk.' });
  } else if (r.lighter >= 2) {
    out.push({ tone: 'normal', icon: 'info', text: 'Een paar trainingen voelden lichter dan gepland. Dat kan een teken zijn dat je sterker wordt.' });
  }
  if (r.checkAdvice) out.push({ tone: 'normal', icon: 'lichaam', text: r.checkAdvice });
  if (out.length === 0 && r.advice[0]) out.push({ tone: 'normal', icon: 'info', text: r.advice[0] });
  return out.slice(0, 2);
}

// De ene feitregel onder de dagen.
export function weekSummaryLine(r: WeekReview): string {
  if (r.running) {
    return `${r.done} gedaan${r.todayLeft > 0 ? `, vandaag ${r.todayLeft === 1 ? 'staat er' : 'staan er'} nog ${r.todayLeft}` : ''}`;
  }
  if (r.done === 0) return 'Deze week kwam het er niet van. Volgende week begint gewoon volgens plan.';
  const time = r.minutes >= 60 ? `${hoursMinutes(r.minutes)} uur` : `${r.minutes} min`;
  const sports = r.perSport.map((p) => {
    const [name, rest] = p.split(': ');
    return `${name.toLowerCase()} ${(rest ?? '').replace(', ', ' · ').replace(' m D+', ' m omhoog')}`.trim();
  });
  return [`${r.done} van ${r.planned} gedaan`, time, ...sports].join(' · ');
}
