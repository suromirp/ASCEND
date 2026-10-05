// ASCEND — the head of a training, in one place.
//
// The training screen and the info screen used to each build their own
// heading, and drifted apart (audit 2026-10, report 6: the sport was
// missing, the numbers differed). Both now render this brief: the sport and
// kind of training ("HARDLOPEN · BERGOP"), one sentence why, the week, three
// key numbers and the signals to stop or ease off. The way you choose to
// train (modality) decides the sport, so a ride on a run day reads FIETSEN.
//
// Pure: no React, no IndexedDB.

import type { Program } from '../models/program';
import type { SessionTemplate } from '../models/training';
import { SESSION_STYLE } from '../data/sessionStyle';
import { INTENSITY, type Intensity } from '../data/workoutStructure';
import { modalitySport } from '../data/modalities';
import { buildWorkoutPlan, type WorkoutPlan } from './workoutPlan';
import { progressionTarget } from './programLayout';
import { resolveEffectiveFullDuration } from './substitutions';
import { SPORT_LABEL, sessionKindLabel, templateSport, type Sport } from './sports';
import { addDays, resolveProgramWeek } from '../utils/dates';
import { formatNumberNL } from '../utils/number';

export interface BriefFact {
  value: string;
  label: string;
}

export interface SessionBrief {
  sportLabel: string; // "Hardlopen"
  headline: string; // "HARDLOPEN · BERGOP"
  // Set when the chosen way of training is a different sport than the plan.
  sportSwitch?: string;
  purpose: string;
  weekLabel?: string; // "Week 3 van 20, basisfase · zwaarste week"
  facts: BriefFact[];
  levelsUsed: Intensity[];
  stopSignals: string[];
  tomorrow?: string; // the hiking day: what day 2 asks
  plan?: WorkoutPlan;
}

// "45 min", "2 uur", "2,5 uur".
export function durationLabel(minutes: number): string {
  if (minutes < 90) return `${minutes} min`;
  return `${formatNumberNL(Math.round((minutes / 60) * 2) / 2, 1)} uur`;
}

export function buildSessionBrief(
  template: SessionTemplate,
  dateIso: string | undefined,
  program: Program | null | undefined,
  options: { modalityKey?: string; templates?: SessionTemplate[] } = {},
): SessionBrief {
  const style = SESSION_STYLE[template.id];
  const plan = buildWorkoutPlan(template, dateIso, program);
  const minutes = dateIso ? resolveEffectiveFullDuration(template, dateIso, program) : template.durationVariants.full;

  // The sport: the plan's, unless the chosen way of training is another one.
  const planned = template.type === 'strength' || template.type === 'recovery' ? undefined : templateSport(template);
  const chosen: Sport | undefined = options.modalityKey ? modalitySport(options.modalityKey) : undefined;
  const sport = chosen ?? planned;
  const sportLabel = sport && template.type !== 'strength' && template.type !== 'recovery' ? SPORT_LABEL[sport] : sessionKindLabel(template);
  const sportSwitch = chosen && planned && chosen !== planned ? `Dit telt als ${SPORT_LABEL[chosen].toLowerCase()}, niet als ${SPORT_LABEL[planned].toLowerCase()}.` : undefined;
  const headline = [sportLabel, style?.styleLabel].filter(Boolean).join(' · ').toUpperCase();

  // The week: position in the phase and this week's note ("Zwaarste week").
  let weekLabel: string | undefined;
  if (dateIso && program) {
    const position = resolveProgramWeek(program, dateIso);
    if (position) {
      const note = progressionTarget(template, program, dateIso)?.step.note?.split(/, | \(/)[0];
      weekLabel = `Week ${position.weekInPhase} van ${position.phase.weekCount}, ${position.phase.name.toLowerCase()}${note ? ` · ${note.toLowerCase()}` : ''}`;
    }
  }

  const step = dateIso ? progressionTarget(template, program, dateIso)?.step : undefined;
  const levelsUsed = plan ? ([...new Set(plan.timeline.filter((s) => s.kind !== 'strength' && !s.noTarget).map((s) => s.intensity))].sort() as Intensity[]) : [];
  const total = { value: durationLabel(minutes), label: 'totaal' };
  const facts: BriefFact[] = (() => {
    switch (style?.facts) {
      case 'intervals': {
        const work = plan?.items.find((it) => 'repeat' in it);
        const hard = work && 'repeat' in work ? work.steps.find((s) => s.intensity === 4) : undefined;
        return [
          total,
          { value: work && 'repeat' in work && hard ? `${work.repeat} × ${Math.round(hard.seconds / 60)} min` : 'Kort', label: 'hard bergop' },
          { value: INTENSITY[4].rpe, label: 'op de heuvel' },
        ];
      }
      case 'long': {
        const d = template.outdoorTarget?.targetElevationM;
        return [total, { value: 'Zone 2', label: 'rustig' }, d ? { value: `±${formatNumberNL(d, 0)} m`, label: 'omhoog als het kan' } : { value: 'Praten kan', label: 'hele zinnen' }];
      }
      case 'hike': {
        const d = step?.elevationGainM ?? template.outdoorTarget?.targetElevationM;
        const kg = step?.backpackKg ?? template.outdoorTarget?.backpackWeightKg;
        return [total, { value: d ? `${formatNumberNL(d, 0)} m` : 'Heuvels', label: 'omhoog en omlaag' }, { value: kg ? `${formatNumberNL(kg, 1)} kg` : 'Licht', label: 'rugzak' }];
      }
      case 'strength':
        return [total, { value: String(template.exercises?.length ?? 0), label: 'oefeningen' }, { value: 'MacroFactor', label: 'zwaarte volgens' }];
      case 'recovery':
        return [{ value: 'Rust', label: 'of rustig wandelen' }, { value: '30-60 min', label: 'als je wandelt' }, { value: 'Geen doel', label: 'tempo of hartslag' }];
      default:
        return [total, { value: 'Zone 2', label: 'hartslag' }, { value: 'Praten kan', label: 'hele zinnen' }];
    }
  })();

  // The first hiking day: what tomorrow's mountain hike asks.
  let tomorrow: string | undefined;
  if (template.id === 'tpl_hike_day_one' && dateIso && options.templates) {
    const hike = options.templates.find((t) => t.id === 'tpl_mountain_hike');
    const next = hike ? progressionTarget(hike, program, addDays(dateIso, 1)) : undefined;
    if (next) {
      const parts = [durationLabel(next.minutes), next.step.elevationGainM ? `${formatNumberNL(next.step.elevationGainM, 0)} m omhoog` : undefined, next.step.backpackKg ? `${formatNumberNL(next.step.backpackKg, 1)} kg rugzak` : undefined].filter(Boolean);
      tomorrow = `Morgen: bergtocht van ${parts.join(', ')}.`;
    }
  }

  return {
    sportLabel,
    headline,
    sportSwitch,
    purpose: style?.purpose ?? plan?.summary ?? template.focus ?? '',
    weekLabel,
    facts,
    levelsUsed,
    stopSignals: style?.stopSignals ?? [],
    tomorrow,
    plan,
  };
}
