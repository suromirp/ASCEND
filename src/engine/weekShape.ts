// ASCEND: de vorm van je week. Hoeveel trainingen, welke, en op welke dagen.
//
// Het weekpatroon (data/defaultProgram.ts) is vast: herstel, bovenlichaam A,
// benen A, rustige duurloop, bovenlichaam B, heuvels en de lange duurloop. Wie
// bij de start zegt "vier dagen per week, alleen dinsdag, donderdag, zaterdag en
// zondag, geen kracht" krijgt een kleiner patroon. Dat is geen tweede planner:
// het kiest alleen welke vaste trainingen in het patroon blijven en op welke dag
// ze staan. De planningsronde blijft alles doen wat ze deed (fases, tochten,
// wedstrijdblok, weekcontrole); `AppSettings.weekShape` wordt gelezen door
// `engine/sports.ts#weeklyPatternTemplates`, op dezelfde plek als sporten aan of uit.
//
// Zonder weekShape verandert er niets: het patroon is dan zoals het was.
//
// Puur: geen React, geen IndexedDB.

import type { PlannedSession, SessionTemplate } from '../models/training';
import { addDays } from '../utils/dates';
import { PATTERN_SWAPS } from './programLayout';
import { respectsHeavySpacing } from './scheduler';
import type { RestWeekday } from './restDay';
import { WEEK_SHAPE_CARDIO, WEEK_SHAPE_STRENGTH, type WeekShape } from './sports';

export type { WeekShape };

export type StartGoalKind = 'trek' | 'race' | 'fit';

export interface WeekShapeInput {
  goal: StartGoalKind;
  // Aantal trainingen (en dus dagen) per week.
  daysPerWeek: number;
  // Dagen waarop je kunt trainen, 1 tot 7.
  allowedDays: number[];
  strength: boolean;
  // Hoeveel keer kracht (Sterker worden: 2 tot 4). Zonder: afgeleid uit het aantal dagen.
  strengthSessions?: number;
}

export interface WeekShapeResult {
  shape: WeekShape;
  restDay: RestWeekday;
  // Sjablonen die in het patroon blijven, op volgorde van de week.
  kept: string[];
  // Het aantal trainingen dat het geworden is (kan lager zijn dan gevraagd).
  count: number;
  // Gewone zinnen over wat anders uitpakte dan gevraagd.
  notes: string[];
}

const STRENGTH = WEEK_SHAPE_STRENGTH;
const CARDIO = WEEK_SHAPE_CARDIO;

// Welke training het eerst blijft als er minder dagen zijn dan het patroon heeft.
const CARDIO_ORDER: Record<StartGoalKind, string[]> = {
  trek: ['tpl_long_run', 'tpl_hill_intervals', 'tpl_easy_run'],
  race: ['tpl_long_run', 'tpl_easy_run', 'tpl_hill_intervals'],
  fit: ['tpl_long_run', 'tpl_easy_run', 'tpl_hill_intervals'],
};
const STRENGTH_ORDER: Record<StartGoalKind, string[]> = {
  trek: ['tpl_lower_a', 'tpl_upper_a', 'tpl_upper_b'],
  race: ['tpl_lower_a', 'tpl_upper_a', 'tpl_upper_b'],
  fit: ['tpl_upper_a', 'tpl_lower_a', 'tpl_upper_b'],
};

export const MIN_DAYS = 2;
export const MAX_DAYS = 6;

// Het advies per doel, met de reden in één zin.
export function adviceDays(goal: StartGoalKind): { days: number; reason: string } {
  if (goal === 'trek') return { days: 5, reason: 'Een tocht met rugzak vraagt om vaak, rustig en lang lopen, naast wat kracht.' };
  if (goal === 'race') return { days: 4, reason: 'Vier dagen geeft je benen genoeg rust tussen de looptrainingen.' };
  return { days: 3, reason: 'Drie dagen is genoeg om sterk en fit te blijven, en het blijft goed vol te houden.' };
}

// Zonder kracht heeft het patroon drie vaste trainingen.
export function maxDaysWithoutStrength(): number {
  return CARDIO.length;
}

// Hoeveel krachttrainingen bij dit aantal dagen (alleen als je kracht wilt).
function strengthCount(total: number, available: number, asked?: number): number {
  const needed = Math.max(0, total - CARDIO.length);
  // Gevraagd: zoveel als er sjablonen en dagen zijn, en minstens een duurtraining blijft over.
  if (asked !== undefined && asked > 0) return Math.min(available, Math.max(asked, needed), Math.max(1, total - 1));
  const wanted = total <= 3 ? 1 : 2;
  return Math.min(available, Math.max(wanted, needed), total);
}

interface Slot {
  t: SessionTemplate;
  day: number;
}

const BASE_MONDAY = '2026-01-05';

// Voor de test en de controle: hoeveel conflicten heeft een week met deze dagen?
export function shapeSpacingConflicts(templates: SessionTemplate[], days: Record<string, number>): number {
  const byId = new Map(templates.map((t) => [t.id, t]));
  const slots = Object.entries(days).filter(([id]) => byId.get(id)?.type !== 'recovery' && byId.has(id)).map(([id, day]) => ({ t: byId.get(id)!, day }));
  return spacingConflicts(slots, byId);
}

// Hoeveel trainingen op een te korte afstand van een zware training staan, over
// drie weken heen (vorige, deze en volgende week), met en zonder de bergvariant.
function spacingConflicts(slots: Slot[], byId: Map<string, SessionTemplate>): number {
  let conflicts = 0;
  for (const swapped of [false, true]) {
    const resolve = (s: Slot): SessionTemplate => {
      if (!swapped) return s.t;
      const swap = PATTERN_SWAPS.find((p) => p.from === s.t.id);
      return (swap && byId.get(swap.to)) || s.t;
    };
    const rows: { t: SessionTemplate; date: string }[] = [];
    for (const week of [-1, 0, 1]) for (const s of slots) rows.push({ t: resolve(s), date: addDays(BASE_MONDAY, week * 7 + s.day - 1) });
    const planned: PlannedSession[] = rows.map((r, i) => ({ id: `w${i}`, templateId: r.t.id, scheduledDate: r.date, weekStartDate: BASE_MONDAY, status: 'planned', order: i }));
    const map = new Map([...byId, ...rows.map((r) => [r.t.id, r.t] as [string, SessionTemplate])]);
    // Alleen de middelste week telt: de buren zijn er voor de afstand.
    planned.forEach((p, i) => {
      if (i < slots.length || i >= slots.length * 2) return;
      if (!respectsHeavySpacing(p.scheduledDate, rows[i].t, planned.filter((o) => o.id !== p.id), map)) conflicts++;
    });
  }
  return conflicts;
}

function* assignments(ids: string[], days: number[], used: number[] = []): Generator<number[]> {
  if (used.length === ids.length) {
    yield used;
    return;
  }
  for (const d of days) {
    if (used.includes(d)) continue;
    yield* assignments(ids, days, [...used, d]);
  }
}

// Wat er in het patroon blijft, voor dit aantal dagen.
function keptFor(input: WeekShapeInput, count: number, has: (id: string) => boolean): string[] {
  const cardio = CARDIO_ORDER[input.goal].filter(has);
  const strength = input.strength ? STRENGTH_ORDER[input.goal].filter(has) : [];
  const s = input.strength ? strengthCount(count, strength.length, input.strengthSessions) : 0;
  const c = Math.min(cardio.length, count - s);
  return [...cardio.slice(0, c), ...strength.slice(0, s)];
}

const WEEKDAYS = [1, 2, 3, 4, 5];

// De week kiezen: eerst het aantal dat past, dan de dagen. Zo min mogelijk
// verplaatsing van de vaste dag, de lange training op het weekend als dat kan,
// en nergens twee zware dingen kort na elkaar. De rustdag is een doordeweekse
// dag waarop niets staat: bij voorkeur een dag waarop je niet kunt.
export function chooseWeekShape(templates: SessionTemplate[], input: WeekShapeInput): WeekShapeResult {
  const byId = new Map(templates.map((t) => [t.id, t]));
  const has = (id: string) => !!byId.get(id)?.defaultDayOfWeek;
  const allowed = [...new Set(input.allowedDays.filter((d) => d >= 1 && d <= 7))].sort((a, b) => a - b);
  const notes: string[] = [];
  let count = Math.max(MIN_DAYS, Math.min(MAX_DAYS, Math.round(input.daysPerWeek)));

  const possible = keptFor(input, MAX_DAYS, has).length;
  if (!input.strength && count > possible) {
    notes.push(`Zonder krachttraining plant ASCEND hoogstens ${possible} trainingen per week.`);
  }
  count = Math.min(count, possible);
  if (allowed.length < count) {
    notes.push(`Je koos ${allowed.length} ${allowed.length === 1 ? 'dag' : 'dagen'}, dus ${allowed.length === 1 ? 'is' : 'zijn'} het er ${allowed.length} geworden.`);
    count = allowed.length;
  }
  // Er moet een doordeweekse dag vrij blijven voor de rust: kies je alle vijf,
  // dan kunnen er hoogstens vier van gebruikt worden.
  const weekdaysAllowed = allowed.filter((d) => d <= 5).length;
  const fits = allowed.length - weekdaysAllowed + (weekdaysAllowed === 5 ? 4 : weekdaysAllowed);
  if (count > fits) {
    notes.push(`ASCEND houdt één doordeweekse dag vrij voor rust, dus het ${fits === 1 ? 'is' : 'zijn'} ${fits} ${fits === 1 ? 'training' : 'trainingen'} geworden.`);
    count = fits;
  }

  if (count < 1) return { shape: { days: {} }, restDay: 1, kept: [], count: 0, notes: [...notes, 'Met deze dagen past er geen vaste week. Kies er een paar meer.'] };
  const ids = keptFor(input, count, has);
  const slotsOf = (days: number[]): Slot[] => ids.map((id, i) => ({ t: byId.get(id)!, day: days[i] }));
  const usable: { days: number[]; moved: number }[] = [];
  for (const days of assignments(ids, allowed)) {
    // Er moet een doordeweekse dag vrij blijven.
    if (!WEEKDAYS.some((d) => !days.includes(d))) continue;
    const moved = ids.reduce((n, id, i) => n + Math.abs(days[i] - (byId.get(id)!.defaultDayOfWeek as number)), 0)
      // De lange training hoort op het weekend, als het kan.
      + (ids.includes('tpl_long_run') && allowed.some((d) => d >= 6) && days[ids.indexOf('tpl_long_run')] < 6 ? 6 : 0);
    usable.push({ days: [...days], moved });
  }
  usable.sort((a, b) => a.moved - b.moved);
  let best: { days: number[]; conflicts: number } | undefined;
  // De goedkoopste eerst (de minste verplaatsing); de eerste zonder conflict wint, anders de beste van de eerste vierhonderd.
  for (const cand of usable.slice(0, 400)) {
    const conflicts = spacingConflicts(slotsOf(cand.days), byId);
    if (!best || conflicts < best.conflicts) best = { days: cand.days, conflicts };
    if (conflicts === 0) break;
  }
  if (!best) {
    // Nergens een plek (praktisch alleen als alles uitgesloten is): het gewone patroon.
    return { shape: { days: {} }, restDay: 1, kept: [], count: 0, notes: [...notes, 'Met deze dagen past er geen vaste week. Kies er een paar meer.'] };
  }

  const used = new Set(best.days);
  const freeWeekdays = WEEKDAYS.filter((d) => !used.has(d));
  const restDay = (freeWeekdays.find((d) => !allowed.includes(d)) ?? freeWeekdays[0]) as RestWeekday;
  const days: Record<string, number> = {};
  ids.forEach((id, i) => { days[id] = best!.days[i]; });
  // The rest walk only on a day you can: on another day the planning would keep moving it as "not available".
  if (has('tpl_herstel') && allowed.includes(restDay)) days['tpl_herstel'] = restDay;
  const order = [...ids].sort((a, b) => days[a] - days[b]);
  if (best.conflicts > 0) notes.push('Twee zware trainingen komen op deze dagen dicht bij elkaar. ASCEND let daar bij het plannen op, maar met meer dagen of een andere indeling gaat het soepeler.');
  return { shape: { days, allowed }, restDay, kept: order, count, notes };
}

export function isStrengthTemplateId(id: string): boolean {
  return STRENGTH.includes(id);
}
