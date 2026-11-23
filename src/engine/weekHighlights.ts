// ASCEND: wat de weekterugblik als eerste zegt. Hoogstens twee regels over de week ("Wat telt"), gekozen uit
// wat buildWeekReview al levert, in vaste volgorde: pijn die je meldde, een gemiste sleuteltraining,
// trainingen die zwaarder of lichter voelden, de wekelijkse lijfvraag, en anders het advies. De volgende
// week staat er apart onder. Puur: geen React, niets wordt opgeslagen of gepland.

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
    out.push({ tone: 'warning', icon: 'lichaam', text: `Pijn deze week: ${r.pain.join(', ')}. Meld het bij Lichaam, dan houdt je planning er rekening mee.` });
  }
  // Wat vandaag nog kan staat nooit als gemist (buildWeekReview telt alleen wat voor vandaag lag).
  if (r.missed.length > 0) {
    const names = joinNames(r.missed);
    const left = `${names} gemist. `;
    out.push({
      tone: 'normal', icon: 'week',
      text: left + (r.keyMissedName
        ? `De ${lower(r.keyMissedName)} is de belangrijkste van de week. Die komt na Akkoord op een vrije dag, als dat past. De rest laat je los.`
        : 'Laat los wat je miste. Dubbel doen helpt niet.'),
    });
  }
  if (r.heavier >= 2) {
    out.push({ tone: 'normal', icon: 'info', text: 'Twee of meer trainingen voelden zwaarder dan gepland. Voelt het volgende week weer zo? Kies de korte versie of houd de minuten gelijk.' });
  } else if (r.lighter >= 2) {
    out.push({ tone: 'normal', icon: 'info', text: 'Een paar trainingen voelden lichter dan gepland. Dat kan een teken zijn dat je sterker wordt.' });
  }
  if (r.checkAdvice) out.push({ tone: 'normal', icon: 'lichaam', text: r.checkAdvice });
  if (out.length === 0 && r.advice[0]) out.push({ tone: 'normal', icon: 'info', text: r.advice[0] });
  return out.slice(0, 2);
}
