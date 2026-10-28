// ASCEND: wat er in een week niet klopt, in woorden. De weekcontrole
// (engine/weekValidator.ts) vindt het al; hier worden de bevindingen van de
// getoonde week gelezen als meldingen voor Week: één regel voor de kaart, een
// droog feit eronder en een korte tekst voor de rij van elke betrokken
// training (docs/visie/Waarschuwingen in Week.md, hoofdstuk 4).
//
// Zes regels: REST-DAY, LEG-SPACING, TWO-HARD-RUNS, AFTER-TEST, ONE-LONG en
// TEST-FRESH. De controle draait met `reportYours`, zodat ook een training op
// je rustdag meetelt die jij of een geaccepteerd voorstel vastzette. Alleen
// toekomstige dagen van de getoonde week; een verleden week meldt niets.
//
// Puur: geen React, geen IndexedDB.

import type { PlannedSession } from '../models/training';
import { addDays, daysBetween, mondayOfWeek, weekdayLongNL } from '../utils/dates';
import { idHasRole } from './templateRoles';
import { validateWeeks, type CheckInput, type CheckRule, type Finding } from './weekValidator';

export const CONCERN_RULES: readonly CheckRule[] = ['REST-DAY', 'LEG-SPACING', 'TWO-HARD-RUNS', 'AFTER-TEST', 'ONE-LONG', 'TEST-FRESH'];

export interface WeekConcern {
  // Dezelfde sleutel als de bevinding; verandert er iets in de week, dan verandert hij mee.
  key: string;
  rule: CheckRule;
  // De ene zin die het probleem zegt (kaart) en het droge feit eronder.
  headline: string;
  fact: string;
  // De naam van een voorstel en de reden erbij, voor de Advice.
  title: string;
  why: string;
  // De korte tekst per training in de rij.
  notes: Record<string, string>;
  finding: Finding;
}

export const dayName = (iso: string) => `${weekdayLongNL(iso)} ${Number(iso.slice(8, 10))}`;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function weekConcerns(input: CheckInput, weekStart: string): WeekConcern[] {
  const monday = mondayOfWeek(weekStart);
  const names = new Map(input.templates.map((t) => [t.id, t.name]));
  const byId = new Map(input.sessions.map((s) => [s.id, s]));
  const nameOf = (id: string) => names.get(byId.get(id)?.templateId ?? '') ?? 'Training';
  const dateOf = (id: string) => byId.get(id)?.scheduledDate ?? monday;
  const findings = validateWeeks({ ...input, reportYours: true }, new Set([monday])).filter((f) => CONCERN_RULES.includes(f.rule));
  // Een dag zonder training (of met alleen Herstel) is een vrije dag.
  const recovery = new Set(input.templates.filter((t) => t.type === 'recovery').map((t) => t.id));
  const busyDays = new Set(input.sessions
    .filter((s: PlannedSession) => s.status !== 'skipped' && mondayOfWeek(s.scheduledDate) === monday && !recovery.has(s.templateId))
    .map((s) => s.scheduledDate));
  const freeDays = Array.from({ length: 7 }, (_, i) => addDays(monday, i)).filter((d) => !busyDays.has(d));

  return findings.map((f): WeekConcern => {
    const base = { key: `${f.rule}:${[...f.sessionIds].sort().join(',')}`, rule: f.rule, finding: f };
    const [a, b] = f.sessionIds;
    switch (f.rule) {
      case 'REST-DAY': {
        const noneFree = freeDays.length === 0;
        return {
          ...base,
          headline: noneFree ? 'Deze week heeft geen rustdag.' : 'Je rustdag heeft een training.',
          fact: noneFree ? 'Op elke dag staat een training.' : `${nameOf(a)} staat op ${dayName(dateOf(a))}, je rustdag.`,
          title: noneFree ? 'Je week heeft geen rustdag' : 'Een training van je rustdag halen',
          why: 'Een rustdag is er om te herstellen. Deze training stond er door een voorstel dat je accepteerde of door jouw eigen keuze, daarom vraagt ASCEND het eerst.',
          notes: { [a]: 'op je rustdag' },
        };
      }
      case 'LEG-SPACING': {
        const gap = Math.abs(daysBetween(dateOf(a), dateOf(b)));
        const early = dateOf(a) <= dateOf(b) ? a : b;
        const late = early === a ? b : a;
        const between = Math.max(0, gap - 1);
        const days = plural(gap, 'dag', 'dagen');
        return {
          ...base,
          headline: `${nameOf(early)} en ${nameOf(late)} liggen te dicht op elkaar.`,
          fact: `Er zit ${between === 0 ? 'geen dag' : plural(between, 'dag', 'dagen')} tussen, liefst 2 voor dezelfde spieren.`,
          title: 'Zware beendagen verder uit elkaar',
          why: 'Zware dagen voor dezelfde spieren hebben tijd nodig om te herstellen. ASCEND houdt er liefst 48 uur tussen.',
          notes: { [early]: `${days} voor ${nameOf(late)}`, [late]: `${days} na ${nameOf(early)}` },
        };
      }
      case 'TWO-HARD-RUNS':
        return {
          ...base,
          headline: `Twee harde loopjes op ${dayName(f.date)}.`,
          fact: `${nameOf(a)} en ${nameOf(b)} staan op dezelfde dag.`,
          title: 'Niet twee harde loopjes op een dag',
          why: 'Twee harde loopjes op een dag zijn te veel voor je benen. Eén per dag laat ze herstellen.',
          notes: { [b]: 'tweede harde loop' },
        };
      case 'AFTER-TEST': {
        const kind = idHasRole(byId.get(b)?.templateId ?? '', 'race', input.templates) ? 'wedstrijd' : 'testloop';
        return {
          ...base,
          headline: `De dag na je ${kind} staat een zware training.`,
          fact: `${nameOf(a)} staat op ${dayName(dateOf(a))}, een dag na je ${kind} op ${dayName(dateOf(b))}.`,
          title: `Geen zware training na je ${kind}`,
          why: `Na een ${kind} krijgt je lijf een dag zonder zwaar werk.`,
          notes: { [a]: `dag na je ${kind}` },
        };
      }
      case 'ONE-LONG': {
        const list = f.sessionIds.map((id) => byId.get(id)).filter((s): s is PlannedSession => !!s).sort((x, y) => x.scheduledDate.localeCompare(y.scheduledDate));
        const first = list[0];
        const last = list[list.length - 1];
        return {
          ...base,
          headline: 'Deze week staan twee volle lange trainingen.',
          fact: nameOf(first.id) === nameOf(last.id)
            ? `${nameOf(first.id)} staat op ${dayName(first.scheduledDate)} en op ${dayName(last.scheduledDate)}, allebei de volle lengte.`
            : `${nameOf(first.id)} op ${dayName(first.scheduledDate)} en ${nameOf(last.id)} op ${dayName(last.scheduledDate)}, allebei de volle lengte.`,
          title: 'Eén volle lange training in de week',
          why: 'Twee volle lange trainingen in een week zijn veel. Eén vol en de ander korter houdt de week te doen.',
          notes: { [last.id]: 'tweede lange training' },
        };
      }
      default: {
        const index = f.legIndex === undefined ? '' : f.legIndex.toFixed(1).replace('.', ',');
        const kind = idHasRole(byId.get(a)?.templateId ?? '', 'race', input.templates) ? 'wedstrijd' : 'testloop';
        return {
          ...base,
          headline: `Je benen zijn nog niet fris genoeg voor je ${kind}.`,
          fact: `Op ${dayName(f.date)} is je beenindex ${index}. Fris is ${f.limit} of lager. De beenindex zegt hoe zwaar je benen de laatste dagen belast zijn.`,
          title: `Frissere benen voor je ${kind}`,
          why: 'Zware beendagen vlak voor een test maken je benen moe. Een kortere of latere beendag maakt ze frisser.',
          notes: { [a]: 'benen niet fris' },
        };
      }
    }
  });
}

// Wat de kaart zegt: bij één punt de zin zelf, bij meer de telling.
export function noticeHeadline(concerns: WeekConcern[]): string {
  return concerns.length === 1 ? concerns[0].headline : `Deze week heeft ${concerns.length} punten die niet kloppen.`;
}

// De tekst per training voor de rij, uit alle meldingen samen.
export function rowNotes(concerns: WeekConcern[]): Map<string, string> {
  const out = new Map<string, string[]>();
  for (const c of concerns) for (const [id, text] of Object.entries(c.notes)) out.set(id, [...(out.get(id) ?? []), text]);
  return new Map([...out].map(([id, list]) => [id, list.join(' · ')]));
}
