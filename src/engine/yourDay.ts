// ASCEND: "Je dag" op Vandaag: wat er morgen komt, in één regel.
//
// Pure: no React, no IndexedDB.

import type { Program } from '../models/program';
import type { PlannedSession, SessionTemplate } from '../models/training';
import { resolveEffectiveFullDuration } from './substitutions';
import { addDays } from '../utils/dates';

export interface TomorrowEntry {
  kind: 'training' | 'rest' | 'none';
  name?: string;
  minutes?: number;
}

// De eerste training van morgen; een rustdag alleen als er niets anders is.
// Wat is overgeslagen telt niet mee, net als op de Vandaag-kaart zelf.
export function tomorrowEntry(
  today: string,
  planned: PlannedSession[],
  templateById: Map<string, SessionTemplate>,
  program: Program | null | undefined,
): TomorrowEntry {
  const date = addDays(today, 1);
  const tomorrow = planned
    .filter((s) => s.scheduledDate === date && s.status !== 'skipped')
    .sort((a, b) => a.order - b.order);
  const training = tomorrow.find((s) => templateById.get(s.templateId)?.type !== 'recovery');
  const template = training ? templateById.get(training.templateId) : undefined;
  if (training && template) {
    return { kind: 'training', name: template.name, minutes: resolveEffectiveFullDuration(template, date, program) };
  }
  if (tomorrow.length > 0) return { kind: 'rest' };
  return { kind: 'none' };
}

// "Bovenlichaam B, 60 min", "Rustdag, wandelen mag", "Niets gepland".
export function tomorrowText(entry: TomorrowEntry): string {
  if (entry.kind === 'training') return `${entry.name}, ${entry.minutes} min`;
  if (entry.kind === 'rest') return 'Rustdag, wandelen mag';
  return 'Niets gepland';
}

// De stand van een trainingsregel in "Je dag": gedaan, overgeslagen (gedimd, dus
// niet te verwarren met iets dat nog moet), de training van nu, of nog te doen.
export type TrainingRowState = 'done' | 'skipped' | 'now' | 'todo';

export function trainingRowState(status: string, isPrimary: boolean): TrainingRowState {
  if (status === 'completed') return 'done';
  if (status === 'skipped') return 'skipped';
  return isPrimary ? 'now' : 'todo';
}

// --- Je dag: wat je vandaag naast je training zelf nog doet (docs/visie/Ontwerp Je dag.md) ---

// Een rij in Je dag. `word` is hoe de rij heet in de regel onder "Nog 2" ("Gewicht, reis").
export type YourDayKind = 'checkin' | 'training' | 'stretch' | 'weight' | 'journey';
export interface YourDayItem {
  key: string;
  kind: YourDayKind;
  done: boolean;
  // De vraag naar een pijnplek: veiligheid, nooit achter "Nog".
  pain?: boolean;
  word: string;
}

export const YOUR_DAY_MAX = 4;
const KIND_ORDER: Record<YourDayKind, number> = { checkin: 0, training: 1, stretch: 2, weight: 3, journey: 4 };

// Open rijen eerst, gedane eronder; binnen elk deel gevoel, training, rekken, gewicht, reis.
// Hoogstens vier rijen: zijn er meer, dan staan de eerste drie er en komt de rest achter "Nog".
// Gedane rijen vallen dus als eerste achter Nog, de pijnplekvraag nooit.
export function arrangeYourDay<T extends YourDayItem>(items: T[], max = YOUR_DAY_MAX): { shown: T[]; more: T[] } {
  const sorted = items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => Number(a.item.done) - Number(b.item.done) || KIND_ORDER[a.item.kind] - KIND_ORDER[b.item.kind] || a.i - b.i)
    .map(({ item }) => item);
  if (sorted.length <= max) return { shown: sorted, more: [] };
  const keep = new Set(sorted.slice(0, max - 1));
  for (const pain of sorted.filter((i) => i.pain && !keep.has(i))) {
    const last = [...keep].reverse().find((i) => !i.pain);
    if (!last) break;
    keep.delete(last);
    keep.add(pain);
  }
  return { shown: sorted.filter((i) => keep.has(i)), more: sorted.filter((i) => !keep.has(i)) };
}

// "Nog 2" met eronder wat het is: "Gewicht, reis".
export function moreRowText(more: YourDayItem[]): { title: string; line: string } {
  const line = more.map((i) => i.word).join(', ');
  return { title: `Nog ${more.length}`, line: line.charAt(0).toUpperCase() + line.slice(1) };
}

// De trainingen van vandaag als rij: niet de training die al op de grote kaart staat
// (`primaryId`, zolang hij niet gedaan of overgeslagen is). Een tweede, een gedane of een
// overgeslagen training blijft: die rij is de weg naar zijn actieblad.
export function trainingRowsForYourDay<T extends { id: string }>(sessions: T[], primaryId: string | undefined, statusOf: (s: T) => string): T[] {
  return sessions.filter((s) => {
    if (s.id !== primaryId) return true;
    const status = statusOf(s);
    return status === 'completed' || status === 'skipped';
  });
}

// --- De reistaak op Vandaag (instelling "Reistaak op Vandaag") ---

export type JourneyOnToday = 'last-week' | 'every-week' | 'never';
export const JOURNEY_ON_TODAY_DEFAULT: JourneyOnToday = 'last-week';

export function resolveJourneyOnToday(raw: unknown): JourneyOnToday {
  return raw === 'every-week' || raw === 'never' || raw === 'last-week' ? raw : JOURNEY_ON_TODAY_DEFAULT;
}

// De laatste week van een taak: het aantal weken tot het doel is het eind van zijn venster.
export function isLastJourneyWeek(window: [number, number], weeksLeft: number): boolean {
  return weeksLeft === window[1];
}

// Of de taak van deze week als rij in Je dag staat. Uitgesteld blijft weg; een taak waarvan het
// venster voorbij is komt in de laatste-weekstand niet, die blijft op de Reisplanner.
export function journeyRowOnToday(
  pick: { task: { window: [number, number] }; state: 'todo' | 'done' | 'postponed' } | undefined,
  weeksLeft: number,
  mode: JourneyOnToday,
): boolean {
  if (!pick || pick.state === 'postponed' || mode === 'never') return false;
  if (mode === 'every-week') return true;
  return isLastJourneyWeek(pick.task.window, weeksLeft);
}

// De regel naast "Reis": "kan nog tot zondag" in de laatste week, anders "kan tot 6 december".
// Een taak waarvan het venster voorbij is krijgt niets: nooit "te laat".
export function journeyWhenText(window: [number, number], weeksLeft: number, closesOn: string, weekday: (iso: string) => string, date: (iso: string) => string): string | undefined {
  if (weeksLeft < window[1]) return undefined;
  if (isLastJourneyWeek(window, weeksLeft)) return `kan nog tot ${weekday(closesOn)}`;
  return `kan tot ${date(closesOn)}`;
}

// --- Stand en morgen: de rustige regels onder Je dag ---

export interface StandLine {
  key: 'legs' | 'week' | 'tomorrow';
  label: string;
  value: string;
  // Let op: een amber stip voor het vaste woord, nooit een gekleurd woord.
  warn: boolean;
  to: '/stand' | '/week';
}

// Benen altijd; de week alleen als je al duidelijk meer deed dan de weken ervoor (een
// waarschuwing staat nooit weggestopt); morgen tenzij de grote kaart al zegt dat er niets staat.
export function standLines(input: {
  legsWord: string;
  legsLevel: number;
  load?: { doneRatio: number };
  loadJump: number;
  tomorrow?: TomorrowEntry;
}): StandLine[] {
  const lines: StandLine[] = [{ key: 'legs', label: 'Benen', value: input.legsWord, warn: input.legsLevel >= 2, to: '/stand' }];
  if (input.load && input.load.doneRatio > input.loadJump) {
    lines.push({ key: 'week', label: 'Week', value: `${Math.round((input.load.doneRatio - 1) * 100)}% zwaarder dan de 4 weken ervoor`, warn: true, to: '/stand' });
  }
  if (input.tomorrow) lines.push({ key: 'tomorrow', label: 'Morgen', value: tomorrowText(input.tomorrow), warn: false, to: '/week' });
  return lines;
}

// De rij Reisplanner op Ascend: de taak van nu met hoe lang hij nog kan ("Nu: Besluit hoeveel
// dagen je loopt · kan tot 6 december"). Is er geen open taak van deze week, dan de telling.
export function journeyNowLine(
  pick: { task: { title: string; window: [number, number] }; state: 'todo' | 'done' | 'postponed' } | undefined,
  weeksLeft: number,
  closesOn: string | undefined,
  progress: { done: number; total: number },
  weekday: (iso: string) => string,
  date: (iso: string) => string,
): string {
  if (!pick || pick.state === 'done') return `${progress.done} van ${progress.total} taken gedaan`;
  const when = closesOn ? journeyWhenText(pick.task.window, weeksLeft, closesOn, weekday, date) : undefined;
  return when ? `Nu: ${pick.task.title} · ${when}` : `Nu: ${pick.task.title}`;
}
