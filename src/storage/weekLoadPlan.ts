// ASCEND: doortrainen, de rustweek terugzetten, deze week nog een keer en de
// herhaling terugzetten als voorstel met Akkoord
// (docs/beslissingen/2026-10-24-rustweek-via-voorstel.md).
//
// Leest wat er is opgeslagen, laat engine/weekLoadChange.ts uitrekenen wat er
// verandert en maakt daar de invoer van voor het voorstelpad van een
// planningsinstelling (storage/horizonPlan.ts): het programma zoals het zou
// worden, de vaste lengte van wat je zelf vastzette en de regels per training.
// Is er niets te kiezen (de week is voorbij, of er is niets meer open dat
// verandert), dan een fout met de zin die de kaart ook laat zien. Er wordt
// niets opgeslagen.

import { PlannedSessionsRepo, ProgramsRepo, SessionLogsRepo, SessionTemplatesRepo } from './database';
import type { HorizonChangeInput } from './horizonPlan';
import { restWeekChange, restWeekState } from '../engine/restWeek';
import { canRepeatWeek, repeatState, repeatWeekChange } from '../engine/repeatWeek';
import { resolveVariantDuration } from '../engine/substitutions';
import type { WeekLoadContext } from '../engine/weekLoadChange';
import { mondayOfWeek, todayISO } from '../utils/dates';

export type WeekLoadKind = 'rest' | 'repeat';

const TEXT: Record<WeekLoadKind, Record<'on' | 'off', { title: string; why: string; explanation: string }>> = {
  rest: {
    on: {
      title: 'Doortrainen in de rustweek',
      why: 'Je traint deze week door als een normale opbouwweek.',
      explanation: 'De rustweek wordt een normale opbouwweek, geen tweede zwaarste week. Alleen de trainingen die nog komen veranderen; wat je deed en wat je zelf vastzette blijft zoals het was. ASCEND laat eerst zien wat er verandert en past het pas toe na jouw akkoord.',
    },
    off: {
      title: 'Rustweek terugzetten',
      why: 'De rustweek staat weer op de kalender.',
      explanation: 'De trainingen die nog komen worden weer die van een rustweek, zodat de opbouw van de vorige weken binnenkomt. Wat je deed en wat je zelf vastzette blijft zoals het was. ASCEND laat eerst zien wat er verandert en past het pas toe na jouw akkoord.',
    },
  },
  repeat: {
    on: {
      title: 'Deze week nog een keer',
      why: 'Deze week houdt de belasting van vorige week.',
      explanation: 'Je minuten, hoogtemeters en rugzak blijven op het niveau van vorige week, in plaats van een stap omhoog. De rustweek en de golven daarna blijven staan. Alleen de trainingen die nog komen veranderen; wat je deed en wat je zelf vastzette blijft zoals het was. ASCEND past het pas toe na jouw akkoord.',
    },
    off: {
      title: 'Herhaling terugzetten',
      why: 'De opbouw loopt weer volgens de kalender.',
      explanation: 'De trainingen die nog komen krijgen weer de belasting van de kalender. Wat je deed en wat je zelf vastzette blijft zoals het was. ASCEND laat eerst zien wat er verandert en past het pas toe na jouw akkoord.',
    },
  },
};

export async function weekLoadInput(kind: WeekLoadKind, weekStart: string, on: boolean): Promise<HorizonChangeInput> {
  const [programs, sessions, logs, templates] = await Promise.all([ProgramsRepo.getAll(), PlannedSessionsRepo.getAll(), SessionLogsRepo.getAll(), SessionTemplatesRepo.getAll()]);
  const program = programs[0];
  if (!program) throw new Error('Er is nog geen programma om aan te passen.');
  const today = todayISO();
  const monday = mondayOfWeek(weekStart);
  if (kind === 'rest') {
    const state = restWeekState(program, monday, logs, today);
    if (!state.isRestWeek) throw new Error('Deze week is geen rustweek.');
    if (on && !state.canSkip) throw new Error(state.reason ?? 'Deze rustweek kun je niet overslaan.');
    if (!on && !state.skipped) throw new Error('Deze rustweek staat al op de kalender.');
  } else {
    if (on && !canRepeatWeek(program, monday)) throw new Error('Deze week kan niet nog een keer.');
    if (!on && !repeatState(program, monday).repeated) throw new Error('Deze week is geen herhaling.');
  }
  const ctx: WeekLoadContext = { sessions, logs, templates, today, minutesOf: (s, t, p) => resolveVariantDuration(t, 'full', s.scheduledDate, p) };
  const change = kind === 'rest' ? restWeekChange(program, monday, on, ctx) : repeatWeekChange(program, monday, on, ctx);
  if (change.state !== 'open') throw new Error(change.sentence);
  const text = TEXT[kind][on ? 'on' : 'off'];
  return {
    ...text,
    trigger: 'week_load_changed',
    program: change.program,
    ...(change.kept.length ? { pinMinutes: change.kept.map((k) => ({ id: k.session.id, minutes: k.minutes })) } : {}),
    notes: [change.sentence, ...change.keptLines],
    lengths: change.lines,
  };
}
