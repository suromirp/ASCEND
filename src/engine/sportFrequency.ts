// ASCEND — "zoveel keer per week" per sport (Settings → Training →
// Sporten). Optional: without a number a sport stays on Automatisch and the
// weekly pattern + weekly planning decide. With a number, every upcoming
// week gets exactly that many sessions of the sport:
//
// - too few: the sport's lightest session is added on the best free day,
//   via the same Groep C placement search every other placement uses
//   (time per day, pairing preference, 48h leg-load spacing);
// - too many: the lightest not-yet-logged sessions come off first, so the
//   sport's key sessions (intervals, the long one) stay;
// - doesn't fit (no day with room, or only a day that clashes with leg
//   load): nothing is forced — the week keeps what fits and the proposal
//   says plainly where and why it didn't fit.
//
// Logged sessions always count and are never touched.

import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import type { DailyTimeBudget, TrainingStrategyProfile, Weekday } from '../models/goalEngineConfig';
import type { PlanChangeItem, PlanChangeProposal } from '../models/planChange';
import { dayHasRoomFor } from './scheduler';
import { searchWeeklyPlacement, type PlacementRequest } from './candidatePlacement';
import { resolveEffectiveStressProfile } from './stressProfile';
import { templateSport, SPORT_LABEL, type Sport } from './sports';
import { weekDates, weekdayShortNL, formatDateNL } from '../utils/dates';
import { makeId } from '../utils/id';

const LOAD_RANK: Record<string, number> = { none: 0, light: 1, moderate: 2, heavy: 3 };

function loadRank(template: SessionTemplate): number {
  return LOAD_RANK[resolveEffectiveStressProfile(template).lowerBodyLoad] ?? 2;
}

// The session ASCEND adds when a sport needs more: its lightest one
// (Easy Run, Bergconditie, Fietstocht), shortest as a tie-break.
export function lightestTemplateOf(sport: Sport, templates: SessionTemplate[]): SessionTemplate | undefined {
  return templates
    .filter((t) => templateSport(t) === sport)
    .sort((a, b) => loadRank(a) - loadRank(b) || a.durationVariants.full - b.durationVariants.full || a.id.localeCompare(b.id))[0];
}

export interface SportFrequencyInputs {
  sport: Sport;
  perWeek: number;
  plannedSessions: PlannedSession[];
  templates: SessionTemplate[];
  sessionLogs: SessionLog[];
  program: Program | null | undefined;
  dailyTimeBudget: Partial<Record<Weekday, DailyTimeBudget>> | undefined;
  sameDayPairingPreference: TrainingStrategyProfile['sameDayPairingPreference'];
  asOf: string;
}

export interface SportFrequencyResult {
  proposal: PlanChangeProposal;
  shortWeeks: number; // weeks where the target didn't fit
  clashWeeks: number; // weeks where it only fit next to other leg load
}

function shortDate(iso: string): string {
  return `${weekdayShortNL(iso).toLowerCase()} ${formatDateNL(iso)}`;
}

export function computeSportFrequencyPlan(inputs: SportFrequencyInputs): SportFrequencyResult {
  const { sport, perWeek, plannedSessions, templates, sessionLogs, program, dailyTimeBudget, sameDayPairingPreference, asOf } = inputs;
  const label = SPORT_LABEL[sport];
  const templateById = new Map(templates.map((t) => [t.id, t]));
  const logged = new Set(sessionLogs.map((l) => l.plannedSessionId).filter(Boolean));
  const addTemplate = lightestTemplateOf(sport, templates);
  const isSport = (s: PlannedSession) => { const t = templateById.get(s.templateId); return t ? templateSport(t) === sport : false; };

  const items: PlanChangeItem[] = [];
  let shortWeeks = 0;
  let clashWeeks = 0;
  let firstShortWeek: string | undefined;
  const weekStarts = [...new Set(plannedSessions.filter((s) => s.scheduledDate >= asOf).map((s) => s.weekStartDate))].sort();

  for (const weekStart of weekStarts) {
    let week = plannedSessions.filter((s) => s.weekStartDate === weekStart && s.status !== 'skipped');
    const family = week.filter(isSport);
    const count = family.length;

    if (count > perWeek) {
      const removable = family
        .filter((s) => !logged.has(s.id) && s.scheduledDate >= asOf)
        .sort((a, b) => loadRank(templateById.get(a.templateId)!) - loadRank(templateById.get(b.templateId)!) || b.scheduledDate.localeCompare(a.scheduledDate));
      for (const s of removable.slice(0, count - perWeek)) {
        items.push({ plannedSessionId: s.id, action: 'remove', reason: `${label}: ${perWeek}x per week ingesteld.`, generatedBy: ['engine/sportFrequency.ts'] });
      }
      continue;
    }

    if (count < perWeek && addTemplate) {
      let missing = perWeek - count;
      while (missing > 0) {
        const provider = (t: SessionTemplate, tentative: { sessionOrDraft: string; date: string }[]) => {
          const tentativeSessions: PlannedSession[] = tentative.map((p, i) => ({ id: p.sessionOrDraft, templateId: t.id, scheduledDate: p.date, weekStartDate: weekStart, status: 'planned' as const, order: 1000 + i }));
          const all = [...week, ...tentativeSessions];
          return weekDates(weekStart).filter((d) => d >= asOf && !all.some((x) => x.scheduledDate === d && isSport(x)) && dayHasRoomFor(d, t, all, templateById, program, dailyTimeBudget, sameDayPairingPreference));
        };
        const toPlace: PlacementRequest[] = [{ template: addTemplate, source: 'strength-missing' }];
        const result = searchWeeklyPlacement(toPlace, week, provider, templateById, sessionLogs, new Map());
        const date = result.status === 'clean' || result.status === 'compromised' ? result.bestFound.placements[0]?.date : undefined;
        if (!date) {
          shortWeeks++;
          firstShortWeek ??= weekStart;
          break;
        }
        if (result.status === 'compromised') clashWeeks++;
        items.push({
          action: 'add',
          newSessionDraft: { templateId: addTemplate.id, scheduledDate: date, weekStartDate: weekStart },
          reason: result.status === 'compromised'
            ? `${label}: ${perWeek}x per week ingesteld. Let op: dit is de minst slechte dag, hij valt dicht op andere beenbelasting.`
            : `${label}: ${perWeek}x per week ingesteld.`,
          generatedBy: ['engine/sportFrequency.ts'],
        });
        week = [...week, { id: `draft:${weekStart}:${missing}`, templateId: addTemplate.id, scheduledDate: date, weekStartDate: weekStart, status: 'planned', order: 1000 }];
        missing--;
      }
    }
  }

  const warnings: string[] = [];
  if (shortWeeks > 0) {
    warnings.push(`Past eigenlijk niet: in ${shortWeeks} ${shortWeeks === 1 ? 'week' : 'weken'} (vanaf ${shortDate(firstShortWeek!)}) is geen dag met ruimte voor nog een ${label.toLowerCase()}sessie. Geef dagen meer tijd bij Trainingstijd per dag, sta meerdere trainingen op één dag toe, of kies een lager aantal.`);
  }
  if (clashWeeks > 0) {
    warnings.push(`In ${clashWeeks} ${clashWeeks === 1 ? 'week' : 'weken'} kon het alleen dicht op andere zware beenbelasting.`);
  }
  const changed = items.length > 0;
  return {
    shortWeeks,
    clashWeeks,
    proposal: {
      id: makeId('planchange'),
      trigger: 'strategy_changed',
      issue: `${label}: ${perWeek}x per week`,
      changes: items,
      alternatives: [],
      consequences: [
        changed
          ? `Elke komende week krijgt ${perWeek}x ${label.toLowerCase()}, waar het past.`
          : shortWeeks === 0 ? `Je planning heeft al ${perWeek}x ${label.toLowerCase()} per week.` : '',
        ...warnings,
      ].filter(Boolean).join(' '),
      explanation: `${label} op ${perWeek}x per week gezet in Instellingen → Training.`,
      createdAt: new Date().toISOString(),
    },
  };
}
