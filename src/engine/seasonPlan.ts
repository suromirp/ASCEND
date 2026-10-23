// ASCEND — the season at a glance (Week → Jaaroverzicht): every phase
// toward the main goal, what it is for, what changes in it, and per week
// the sessions that matter, read straight from the planning that is
// already there. Nothing here plans anything; it only describes.
//
// Pure: no React, no IndexedDB.

import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import { addDays, mondayOfWeek, resolveProgramWeek } from '../utils/dates';
import { PHASE_TAPER, progressionTarget, waveWeek } from './programLayout';
import { resolveEffectiveFullDuration } from './substitutions';
import { EXTRA_CATALOGUE } from './extraRun';

export interface SeasonWeekItem {
  label: string;
  kind: 'race' | 'test' | 'long' | 'quality' | 'extra';
}

export interface SeasonWeek {
  weekStart: string;
  number: number; // week of the program
  weekInPhase: number;
  waveLabel: string;
  totalMinutes: number;
  items: SeasonWeekItem[];
  current: boolean;
  past: boolean;
  done?: { done: number; planned: number }; // past weeks only
}

export interface SeasonPhase {
  id: string;
  name: string;
  description: string;
  from: string;
  until: string;
  changes: string[];
  weeks: SeasonWeek[];
  current: boolean;
}

const WAVE_LABEL: Record<number, string> = { 1: 'Wennen', 2: 'Opbouw', 3: 'Zwaarste week', 4: 'Rustweek' };
const LONG = ['tpl_long_run', 'tpl_mountain_hike'];
const SATURDAY = ['tpl_hill_intervals', 'tpl_hills_descent', 'tpl_intervals', 'tpl_hike_day_one'];
const QUALITY = ['tpl_tempo_run', 'tpl_intervals', 'tpl_hills_descent'];

function shortDate(iso: string): string {
  const months = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  return `${Number(iso.slice(8, 10))} ${months[Number(iso.slice(5, 7)) - 1]}`;
}

function range(values: number[], unit: string): string | undefined {
  if (values.length === 0) return undefined;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  return lo === hi ? `${lo} ${unit}` : `${lo} tot ${hi} ${unit}`;
}

export function buildSeasonPlan(program: Program, plannedSessions: PlannedSession[], logs: SessionLog[], templates: SessionTemplate[], today: string): SeasonPhase[] {
  const byId = new Map(templates.map((t) => [t.id, t]));
  const logged = new Set(logs.map((l) => l.plannedSessionId).filter(Boolean));
  const thisMonday = mondayOfWeek(today);
  const start = mondayOfWeek(program.startDate);
  const minutesOf = (s: PlannedSession, t: SessionTemplate) => Math.round(s.plannedMinutes ?? resolveEffectiveFullDuration(t, s.scheduledDate, program));

  let weekNumber = 0;
  return program.phases.map((phase) => {
    const from = addDays(start, weekNumber * 7);
    const weeks: SeasonWeek[] = [];
    // Per template, the minutes across the phase's normal weeks (not the rest week).
    const minutes = new Map<string, number[]>();
    const hikeSteps: { d: number[]; kg: number[] } = { d: [], kg: [] };
    const saturdayNames = new Map<string, number>();
    const tests: string[] = [];
    const races: string[] = [];
    let blockFrom: string | undefined;

    for (let w = 0; w < phase.weekCount; w++) {
      weekNumber++;
      const weekStart = addDays(start, (weekNumber - 1) * 7);
      const position = resolveProgramWeek(program, weekStart);
      const wave = position ? waveWeek(position) : 1;
      const restWeek = phase.id !== PHASE_TAPER && wave === 4;
      const sessions = plannedSessions
        .filter((s) => s.scheduledDate >= weekStart && s.scheduledDate <= addDays(weekStart, 6) && s.status !== 'skipped')
        .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
      const items: SeasonWeekItem[] = [];
      let total = 0;
      let counted = 0;
      let done = 0;

      for (const s of sessions) {
        const t = byId.get(s.templateId);
        if (!t || t.type === 'recovery') continue;
        const min = minutesOf(s, t);
        total += min;
        counted++;
        if (logged.has(s.id)) done++;
        // The range per training: normal weeks only, not a fixed length (a taper, a catch-up).
        if (!restWeek && s.plannedMinutes === undefined) minutes.set(t.id, [...(minutes.get(t.id) ?? []), min]);

        if (t.id === 'tpl_race') {
          items.push({ label: `${t.name} op ${shortDate(s.scheduledDate)}`, kind: 'race' });
          races.push(shortDate(s.scheduledDate));
        } else if (t.id === 'tpl_test_run') {
          items.push({ label: `Testloop 5 km, ${shortDate(s.scheduledDate)}`, kind: 'test' });
          tests.push(shortDate(s.scheduledDate));
        } else if (LONG.includes(t.id)) {
          const step = progressionTarget(t, program, s.scheduledDate)?.step;
          const extra = t.id === 'tpl_mountain_hike' && step ? `, ${step.elevationGainM ?? 0} m omhoog, ${step.backpackKg ?? 0} kg` : '';
          if (t.id === 'tpl_mountain_hike' && step) {
            if (step.elevationGainM && !restWeek) hikeSteps.d.push(step.elevationGainM);
            if (step.backpackKg && !restWeek) hikeSteps.kg.push(step.backpackKg);
          }
          items.push({ label: `${t.name} ${min} min${extra}`, kind: 'long' });
        } else if (QUALITY.includes(t.id) || t.id === 'tpl_hike_day_one') {
          items.push({ label: `${t.name} ${min} min`, kind: 'quality' });
        } else if (EXTRA_CATALOGUE.includes(t.id)) {
          items.push({ label: `Extra: ${t.name}`, kind: 'extra' });
        }
        if (SATURDAY.includes(t.id)) saturdayNames.set(t.name, (saturdayNames.get(t.name) ?? 0) + 1);
        if (t.id === 'tpl_tempo_run' && !blockFrom) blockFrom = shortDate(weekStart);
      }

      weeks.push({
        weekStart,
        number: weekNumber,
        weekInPhase: w + 1,
        waveLabel: phase.id === PHASE_TAPER ? 'Afbouwen' : WAVE_LABEL[wave],
        totalMinutes: total,
        items: [...items.filter((i) => i.kind === 'race' || i.kind === 'test'), ...items.filter((i) => i.kind !== 'race' && i.kind !== 'test')],
        current: weekStart === thisMonday,
        past: weekStart < thisMonday,
        done: weekStart < thisMonday && counted > 0 ? { done, planned: counted } : undefined,
      });
    }

    // What changes in this phase, in a few lines.
    const changes: string[] = [];
    const name = (id: string) => byId.get(id)?.name ?? id;
    const longRun = range(minutes.get('tpl_long_run') ?? [], 'min');
    if (longRun) changes.push(`${name('tpl_long_run')}: ${longRun}`);
    const hike = range(minutes.get('tpl_mountain_hike') ?? [], 'min');
    if (hike) {
      const parts = [range(hikeSteps.d, 'm omhoog'), range(hikeSteps.kg, 'kg rugzak')].filter(Boolean);
      changes.push(`${name('tpl_mountain_hike')} op zondag: ${hike}${parts.length ? `, ${parts.join(', ')}` : ''}`);
    }
    const easy = range(minutes.get('tpl_easy_run') ?? [], 'min');
    if (easy) changes.push(`${name('tpl_easy_run')}: ${easy}`);
    if (saturdayNames.size > 0) changes.push(`Zaterdag: ${[...saturdayNames.keys()].join(', ').toLowerCase()}`);
    if (blockFrom) changes.push(`Wedstrijdblok vanaf ${blockFrom}: tempoloop en intervallen (met drie loopjes per week één van de twee)`);
    if (tests.length) changes.push(`Testloop 5 km: ${tests.join(' en ')}`);
    if (races.length) changes.push(`Wedstrijd: ${races.join(', ')}`);

    const until = addDays(from, phase.weekCount * 7 - 1);
    return {
      id: phase.id,
      name: phase.name,
      description: phase.description ?? '',
      from,
      until,
      changes,
      weeks,
      current: thisMonday >= from && thisMonday <= until,
    };
  });
}
