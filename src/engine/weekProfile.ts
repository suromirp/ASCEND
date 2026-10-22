// ASCEND — het bergprofiel van de week: de belasting van elke dag, en één zin
// over de zwaarste dag en de ruimte tussen de beendagen.
//
// De maat is één en dezelfde als op Stand ("Belasting per week"): minuten maal
// inspanning (sessie-RPE, Foster e.a. 2001). Wat je deed telt met je eigen
// minuten en je eigen RPE (zonder RPE de geplande inspanning); wat nog komt
// telt met de geplande minuten en de geplande inspanning. Een training die
// niet gebeurd is (gemist, overgeslagen) telt niet, een rustdag is 0. De
// rekenregels zelf staan in `weeklyLoad` (engine/standing.ts); dit bestand
// verdeelt die per dag en voegt de beendagen toe. De eenheid heeft geen
// betekenis op zichzelf: de hoogte vergelijkt dagen en weken met elkaar.
//
// Een beendag is een dag met een training die zwaar is voor de benen
// (`isLegHeavyTemplate`: beenkracht, heuvelintervallen, lange duurloop,
// bergtocht). De ruimte ertussen komt uit dezelfde regel als de planner
// (`legSpacingDays`: 48 uur, na een tocht met veel dalen 72 uur) en de bewuste
// uitzondering (`isIntentionalBackToBack`: heuvelintervallen op zaterdag en de
// lange duurloop op zondag).
//
// Puur: geen React, geen IndexedDB.

import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import { addDays, daysBetween, mondayOfWeek, weekDates, weekdayLongNL } from '../utils/dates';
import { isIntentionalBackToBack, isLegHeavyTemplate, legSpacingDays } from './scheduler';
import { weeklyLoad, type LoadInputs } from './standing';

export interface DayLoad {
  date: string;
  load: number; // minuten maal inspanning; 0 op een rustdag
  minutes: number;
  // Er is op deze dag iets gedaan (een log) of er komt nog iets (gepland).
  hasTraining: boolean;
  // De training die het zwaarst is voor de benen, als die er is.
  legTemplate?: SessionTemplate;
}

export interface WeekProfileInputs extends Omit<LoadInputs, 'isRestWeek'> {
  weekStart: string;
}

// De zeven dagen van een week, van maandag tot zondag.
export function dayLoads(inputs: WeekProfileInputs): DayLoad[] {
  const monday = mondayOfWeek(inputs.weekStart);
  const current = mondayOfWeek(inputs.today);
  const offset = Math.round(daysBetween(current, monday) / 7);
  // weeklyLoad loopt van -weeksBack tot en met +weeksAhead rond de huidige week.
  const weeks = weeklyLoad(inputs, Math.max(0, -offset), Math.max(0, offset));
  const week = weeks.find((w) => w.weekStart === monday);
  const byId = new Map(inputs.templates.map((t) => [t.id, t]));
  const logged = new Set(inputs.logs.map((l) => l.plannedSessionId).filter(Boolean));
  const end = addDays(monday, 7);

  // Welke templates op welke dag staan (voor de beendagen), met dezelfde
  // keuze als weeklyLoad: wat gedaan is op de dag van doen, wat nog komt op
  // de geplande dag, en niets wat gemist of overgeslagen is.
  const templatesByDate = new Map<string, SessionTemplate[]>();
  const add = (date: string, t: SessionTemplate | undefined) => {
    if (!t || t.type === 'recovery') return;
    templatesByDate.set(date, [...(templatesByDate.get(date) ?? []), t]);
  };
  for (const l of inputs.logs) if (l.completedDate >= monday && l.completedDate < end) add(l.completedDate, byId.get(l.templateId));
  for (const s of inputs.plannedSessions) {
    if (s.scheduledDate < monday || s.scheduledDate >= end || s.scheduledDate < inputs.today) continue;
    if (s.status === 'skipped' || logged.has(s.id)) continue;
    add(s.scheduledDate, byId.get(s.templateId));
  }

  return weekDates(monday).map((date) => {
    const items = (week?.items ?? []).filter((i) => i.date === date);
    const legs = (templatesByDate.get(date) ?? []).filter(isLegHeavyTemplate);
    return {
      date,
      load: items.reduce((n, i) => n + i.load, 0),
      minutes: items.reduce((n, i) => n + i.minutes, 0),
      hasTraining: items.length > 0,
      legTemplate: legs[0],
    };
  });
}

// "2 van 5 gedaan": wat gepland staat (zonder rustdagen en overgeslagen
// trainingen) en wat daarvan een log heeft. Gedaan is nooit een vlag: een
// training is gedaan als er een log naar verwijst.
export function weekProgress(sessions: PlannedSession[], logs: SessionLog[], templateById: Map<string, SessionTemplate>): { done: number; total: number } {
  const logged = new Set(logs.map((l) => l.plannedSessionId).filter(Boolean));
  let done = 0;
  let total = 0;
  for (const s of sessions) {
    if (templateById.get(s.templateId)?.type === 'recovery') continue;
    if (logged.has(s.id)) {
      done++;
      total++;
    } else if (s.status !== 'skipped') total++;
  }
  return { done, total };
}

// --- de zin onder de kam ---------------------------------------------------------

const NUMBER_WORDS = ['geen', 'één', 'twee', 'drie', 'vier', 'vijf', 'zes'];
const words = (n: number) => NUMBER_WORDS[n] ?? String(n);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
// "Benen A (zwaar)" wordt "Benen A": de toevoeging hoort bij de lijst, niet bij de zin.
const shortName = (t: SessionTemplate) => t.name.replace(/\s*\([^)]*\)\s*$/, '');

export function ridgeSentence(days: DayLoad[], today: string): string {
  const peak = days.reduce<DayLoad | undefined>((best, d) => (d.load > (best?.load ?? 0) ? d : best), undefined);
  if (!peak) return 'Er staat deze week geen training.';
  const past = days[days.length - 1].date < today;
  const heaviest = `${cap(weekdayLongNL(peak.date))} ${past || peak.date < today ? 'was' : 'is'} je zwaarste dag.`;

  const legs = days.filter((d) => d.legTemplate);
  if (legs.length === 0) return `${heaviest} Geen zware beendag.`;
  if (legs.length === 1) return `${heaviest} Eén zware beendag (${shortName(legs[0].legTemplate!)}), dus de benen hebben alle ruimte.`;

  // Per paar opeenvolgende beendagen: genoeg ruimte volgens de regel van de planner?
  interface Pair { first: DayLoad; second: DayLoad; gap: number; need: number; intended: boolean }
  const pairs: Pair[] = [];
  for (let i = 1; i < legs.length; i++) {
    const first = legs[i - 1];
    const second = legs[i];
    pairs.push({
      first, second,
      gap: daysBetween(first.date, second.date),
      need: legSpacingDays(first.legTemplate!, second.legTemplate!),
      intended: isIntentionalBackToBack(first.legTemplate!, second.legTemplate!),
    });
  }
  const names = (p: Pair) => `${shortName(p.first.legTemplate!)} en ${shortName(p.second.legTemplate!)}`;
  // "zit één dag", "zitten vier dagen": het werkwoord volgt het aantal dagen.
  const between = (p: Pair) => {
    const d = p.gap - 1;
    const verb = d > 1 ? (past ? 'zaten' : 'zitten') : past ? 'zat' : 'zit';
    return `${verb} ${d === 0 ? 'geen hele dag' : d === 1 ? 'één dag' : `${words(d)} dagen`}`;
  };

  // Eerst wat te kort is, dan het krapste paar dat nog net genoeg heeft.
  const close = pairs.filter((p) => !p.intended && p.gap <= p.need).sort((a, b) => a.gap - b.gap)[0];
  if (close) {
    const hours = (close.need + 1) * 24;
    return `${heaviest} Let op: tussen ${names(close)} ${between(close)}, liefst ${hours} uur.`;
  }
  const regular = pairs.filter((p) => !p.intended).sort((a, b) => (a.gap - a.need) - (b.gap - b.need))[0];
  if (regular) {
    const margin = regular.gap - regular.need - 1;
    const verdict = margin >= 1 ? 'ruim genoeg' : 'net genoeg';
    return `${heaviest} Tussen ${names(regular)} ${between(regular)}, ${verdict}.`;
  }
  const intended = pairs[0];
  return `${heaviest} ${names(intended)} liggen bewust achter elkaar, op vermoeide benen.`;
}
