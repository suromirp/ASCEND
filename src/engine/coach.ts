// ASCEND — the coach's short lines: one sentence with today's training,
// and one reaction after you tick a training off. Fixed rules, no AI; the
// longer advice lives in engine/adviceEngine.ts and the weekly review in
// engine/weekReview.ts. A line only says what is true: ASCEND does not
// claim to adjust something it doesn't.
//
// Pure: no React, no IndexedDB.

import type { Program } from '../models/program';
import type { SessionLog, SessionTemplate } from '../models/training';
import { buildWorkoutPlan } from './workoutPlan';
import { progressionTarget } from './programLayout';
import { resolveEffectiveFullDuration } from './substitutions';
import { INTENSITY } from '../data/workoutStructure';
import { isLegHeavyTemplate } from './scheduler';

// The top of the planned effort, e.g. 4 for "RPE 3-4".
export function plannedRpeTop(template: SessionTemplate, date: string, program: Program | null | undefined): number | undefined {
  const plan = buildWorkoutPlan(template, date, program);
  const levels = plan?.timeline.filter((s) => s.kind !== 'strength' && !s.noTarget).map((s) => s.intensity) ?? [];
  if (levels.length === 0) return undefined;
  const m = INTENSITY[Math.max(...levels) as 1 | 2 | 3 | 4].rpe.match(/(\d+)(?:-(\d+))?/);
  return m ? Number(m[2] ?? m[1]) : undefined;
}

function feltHeavy(log: SessionLog, template: SessionTemplate | undefined, program: Program | null | undefined): boolean {
  if (log.subjectiveFeel === 'worse') return true;
  if (log.rpe === undefined || !template) return false;
  const top = plannedRpeTop(template, log.completedDate, program);
  return top !== undefined && log.rpe >= top + 2;
}

export interface CoachLineInputs {
  template: SessionTemplate;
  date: string;
  program: Program | null | undefined;
  tomorrow: SessionTemplate[];
  yesterdayLogs: SessionLog[];
  templateById: Map<string, SessionTemplate>;
}

// One sentence for today's training, the most useful one first.
export function coachLineForToday({ template, date, program, tomorrow, yesterdayLogs, templateById }: CoachLineInputs): string {
  const note = progressionTarget(template, program, date)?.step.note ?? '';
  const heavyYesterday = yesterdayLogs.find((l) => feltHeavy(l, templateById.get(l.templateId), program));
  if (heavyYesterday) {
    return `${templateById.get(heavyYesterday.templateId)?.name ?? 'Gisteren'} voelde zwaar. Begin rustig, en kies de korte versie als het vandaag niet gaat.`;
  }
  if (/rustweek/i.test(note)) return 'Rustweek: korter en rustiger is precies goed. Zo komt de opbouw binnen.';
  if (/^Kort en fris|Minder volume/.test(note)) return 'Afbouwen voor de start: minder, maar wel in hetzelfde tempo. Fris aankomen is het doel.';

  const legsTomorrow = tomorrow.find((t) => isLegHeavyTemplate(t) && t.type !== 'recovery');
  switch (template.id) {
    case 'tpl_mountain_hike':
      return 'De belangrijkste training van de week. Rustig tempo, elk uur iets eten en drinken, en beheerst dalen.';
    case 'tpl_hike_day_one':
      return 'Dag 1 van 2: bewust rustig. Morgen moet je gewoon weer kunnen vertrekken.';
    case 'tpl_long_run':
      return 'De langste loop van de week. Rustig, op vermoeide benen is precies de bedoeling; wandelen bergop mag.';
    case 'tpl_hill_intervals':
      return 'Kwaliteit boven aantal: hard bergop, rustig terug. Stop als je techniek rommelig wordt.';
    case 'tpl_lower_a':
      return legsTomorrow
        ? `Zware beendag. Morgen staat ${legsTomorrow.name}, dus houd een herhaling in de tank.`
        : 'Zware beendag. Techniek eerst, de zwaarte volgens MacroFactor.';
  }
  if (legsTomorrow && (template.type === 'cardio' || template.type === 'hiking')) {
    return `Rustig houden vandaag: morgen staat ${legsTomorrow.name}.`;
  }
  if (template.type === 'strength') return 'Techniek eerst, de zwaarte volgens MacroFactor.';
  return 'Rustig en gelijkmatig. Kun je hele zinnen praten, dan zit je goed.';
}

// One reaction after ticking a training off, based on what you filled in.
export function coachReaction(log: SessionLog, template: SessionTemplate | undefined, program: Program | null | undefined): string {
  if (!template || template.type === 'recovery') return 'Goed dat je bewoog. Rust blijft de basis van vandaag.';
  const top = plannedRpeTop(template, log.completedDate, program);
  const planned = resolveEffectiveFullDuration(template, log.completedDate, program);
  if (log.rpe !== undefined && top !== undefined && log.rpe >= top + 2) {
    return `Zwaarder dan gepland (zwaarte ${log.rpe}, gepland tot ${top}). Doe de volgende keer rustiger aan; voelt het weer zo, kies dan de korte versie.`;
  }
  if (log.subjectiveFeel === 'worse') return 'Slechter dan normaal. Let op slaap en eten, en doe het morgen rustig aan.';
  if (log.variant === 'full' && log.durationMinutes > 0 && log.durationMinutes < planned * 0.7) {
    return 'Korter dan gepland. Prima: iets doen is altijd beter dan niets.';
  }
  if (log.rpe !== undefined && top !== undefined && log.rpe <= top - 3) {
    return 'Lichter dan gepland. Een goed teken: je wordt sterker. Blijf het rustig opbouwen.';
  }
  return 'Gedaan zoals gepland. Zo bouw je op.';
}
