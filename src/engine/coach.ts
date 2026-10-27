// ASCEND — the coach's short lines: one sentence with today's training,
// and one reaction after you tick a training off. Fixed rules, no AI; the
// longer advice lives in engine/adviceEngine.ts and the weekly review in
// engine/weekReview.ts. A line only says what is true: ASCEND does not
// claim to adjust something it doesn't.
//
// Pure: no React, no IndexedDB.

import { isStopPain, painReports, significantPain } from './pain';
import type { Program } from '../models/program';
import type { SessionLog, SessionTemplate } from '../models/training';
import { buildWorkoutPlan } from './workoutPlan';
import { progressionTarget } from './programLayout';
import { resolveEffectiveFullDuration } from './substitutions';
import { INTENSITY } from '../data/workoutStructure';
import { isLegHeavyTemplate } from './scheduler';
import { addDays } from '../utils/dates';

// The top of the planned effort, e.g. 4 for "RPE 3-4".
export function plannedRpeTop(template: SessionTemplate, date: string, program: Program | null | undefined): number | undefined {
  const plan = buildWorkoutPlan(template, date, program);
  const levels = plan?.timeline.filter((s) => s.kind !== 'strength' && !s.noTarget).map((s) => s.intensity) ?? [];
  if (levels.length === 0) return undefined;
  const m = INTENSITY[Math.max(...levels) as 1 | 2 | 3 | 4].rpe.match(/(\d+)(?:-(\d+))?/);
  return m ? Number(m[2] ?? m[1]) : undefined;
}

// Planned at most this effort: an easy session. Feeling light there is the
// point, never a sign it could be more.
export const EASY_RPE_TOP = 4;

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
  const soreYesterday = yesterdayLogs.flatMap((l) => significantPain(l).map((r) => r.area));
  if (soreYesterday.length > 0) {
    return `Gisteren pijn aan je ${joinNL([...new Set(soreYesterday)].map((a) => a.toLowerCase()))}. Voelt het nog niet goed, neem dan de korte versie of verplaats de training.`;
  }
  const heavyYesterday = yesterdayLogs.find((l) => feltHeavy(l, templateById.get(l.templateId), program));
  if (heavyYesterday) {
    const heavyName = templateById.get(heavyYesterday.templateId)?.name;
    return `${heavyName ? `${heavyName} voelde gisteren zwaar` : 'Gisteren voelde zwaar'}. Begin rustig; gaat het vandaag niet, neem dan de korte versie.`;
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
        : 'Zware beendag. Techniek eerst.';
  }
  if (legsTomorrow && (template.type === 'cardio' || template.type === 'hiking')) {
    return `Houd het vandaag rustig: morgen staat ${legsTomorrow.name}.`;
  }
  if (template.type === 'strength') return 'Techniek eerst.';
  return 'Rustig en gelijkmatig. Kun je hele zinnen praten, dan zit je goed.';
}

// Days back in which the same sore spot counts as "again".
const PAIN_WINDOW_DAYS = 14;

function joinNL(items: string[]): string {
  return items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} en ${items.at(-1)}`;
}

// Pain comes first: it decides what tomorrow looks like. The same spot
// twice in two weeks is a pattern, worth writing down under Lichaam,
// where ASCEND takes it into account (engine/adviceEngine.ts#injuryAdvice).
// The pain-monitoring model (docs/onderzoek/Pijn spierpijn en vermoeidheid
// melden.md): up to 2 is fine if it is gone by the morning, 3 to 5 holds
// back building on that spot, above 5, worse while going on or on a bone
// means a stop.
function painReaction(log: SessionLog, history: SessionLog[]): string | undefined {
  const reports = painReports(log);
  if (reports.length === 0) return undefined;
  const stop = reports.filter(isStopPain);
  if (stop.length > 0) {
    const p = stop[0];
    const why = p.onBone ? 'op één plekje op het bot' : p.worseDuring ? 'die erger werd terwijl je doorging' : `van ${p.score} op 10`;
    return `Pijn aan je ${p.area.toLowerCase()} ${why}: de komende 2 dagen niet lopen of springen op die plek, fietsen en bovenlichaam mogen. Doet wandelen daarna nog pijn, of doet het 's nachts pijn, laat het dan onderzoeken.`;
  }
  const significant = significantPain(log);
  if (significant.length === 0) {
    return `Een beetje pijn aan je ${joinNL(reports.map((r) => r.area.toLowerCase()))}. Tot 2 op 10 mag, als het morgenochtend weer weg is. ASCEND vraagt het je morgen.`;
  }
  const areas = significant.map((r) => r.area);
  const since = addDays(log.completedDate, -PAIN_WINDOW_DAYS);
  const again = areas.filter((a) => history.some((l) => l.id !== log.id && l.completedDate >= since && l.completedDate <= log.completedDate && significantPain(l).some((r) => r.area === a)));
  const where = joinNL(areas.map((a) => a.toLowerCase()));
  if (again.length > 0) {
    const which = joinNL(again.map((a) => a.toLowerCase()));
    return `${which.charAt(0).toUpperCase()}${which.slice(1)} deed de afgelopen twee weken vaker pijn. Meld het bij Lichaam, dan houdt ASCEND er rekening mee. Wordt het erger, laat een fysiotherapeut ernaar kijken.`;
  }
  return `Pijn aan je ${where}. Trainen mag, zolang het morgenochtend niet erger is; de komende 2 weken bouwt ASCEND op die plek niet verder op. Scherpe pijn of pijn die erger wordt is een reden om te stoppen.`;
}

// One reaction after ticking a training off, based on what you filled in.
export function coachReaction(log: SessionLog, template: SessionTemplate | undefined, program: Program | null | undefined, history: SessionLog[] = []): string {
  const pain = painReaction(log, history);
  if (pain) return pain;
  if (!template || template.type === 'recovery') return 'Goed dat je bewoog. Licht en rustig is precies de bedoeling van vandaag.';
  const top = plannedRpeTop(template, log.completedDate, program);
  const planned = resolveEffectiveFullDuration(template, log.completedDate, program);
  if (log.rpe !== undefined && top !== undefined && log.rpe >= top + 2) {
    return `Zwaarder dan gepland (zwaarte ${log.rpe}, gepland tot ${top}). Volgende keer iets rustiger? Voelt het weer zo, neem dan de korte versie.`;
  }
  if (log.subjectiveFeel === 'worse') return 'Slechter dan normaal, dat hoort erbij. Houd het morgen rustig; goed slapen en eten kan helpen.';
  if (log.variant === 'full' && log.durationMinutes > 0 && log.durationMinutes < planned * 0.7) {
    return 'Korter dan gepland. Prima: iets doen telt.';
  }
  if (log.rpe !== undefined && top !== undefined && top > EASY_RPE_TOP && log.rpe <= top - 3) {
    return 'Lichter dan gepland. Dat kan een teken zijn dat je sterker wordt. Bouw het rustig verder op.';
  }
  return 'Gedaan zoals gepland. Zo bouw je op.';
}
