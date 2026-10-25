// ASCEND — which sport a planned session belongs to, and whether ASCEND
// may plan it (Settings → Training → Sporten, Fase 2). Logging is never
// restricted by this: a sport that's switched off can still be logged,
// ASCEND just stops putting new sessions of it on the calendar.

import type { SessionTemplate, SessionLog } from '../models/training';
import { findModalityByKey, isCyclingModality, modalitySport } from '../data/modalities';

export type Sport = 'running' | 'hiking' | 'cycling';
export type EnabledSports = Record<Sport, boolean>;

export const SPORT_LABEL: Record<Sport, string> = { running: 'Hardlopen', hiking: 'Wandelen', cycling: 'Fietsen' };

export const DEFAULT_ENABLED_SPORTS: EnabledSports = { running: true, hiking: true, cycling: false };

// Strength/recovery/adventure sessions aren't one of these sports — they're
// never filtered here (strength has its own block strategy).
export function templateSport(template: SessionTemplate): Sport | undefined {
  if (template.sport) return template.sport;
  if (template.type === 'cardio') return 'running';
  if (template.type === 'hiking') return 'hiking';
  return undefined;
}

// What kind of training this is, in one word, everywhere a session or log
// is shown. The sport wins over the internal type, so a long run reads
// "Hardlopen" and not the type it is stored under (production feedback:
// "Avontuur" on the long run made the sport unclear).
const TYPE_KIND: Record<SessionTemplate['type'], string> = {
  strength: 'Kracht',
  cardio: 'Conditie',
  hiking: 'Wandelen',
  recovery: 'Herstel',
  adventure: 'Tocht',
};

export function sessionKindLabel(template: SessionTemplate): string {
  const sport = template.type === 'strength' || template.type === 'recovery' ? undefined : templateSport(template);
  return sport ? SPORT_LABEL[sport] : TYPE_KIND[template.type];
}

export function logKindLabel(log: Pick<SessionLog, 'type' | 'sport' | 'cardioData' | 'outdoorData'>): string {
  const sport = log.type === 'strength' || log.type === 'recovery' ? undefined : logSport(log);
  return sport ? SPORT_LABEL[sport] : TYPE_KIND[log.type];
}

export function isSportEnabled(sport: Sport | undefined, enabled: Partial<EnabledSports> | undefined): boolean {
  if (!sport) return true;
  return { ...DEFAULT_ENABLED_SPORTS, ...enabled }[sport];
}

export function isTemplatePlannable(template: SessionTemplate, enabled: Partial<EnabledSports> | undefined): boolean {
  return isSportEnabled(templateSport(template), enabled);
}

// Which sport a LOG was — a ride logged on the run slot with the bike
// modality is cycling, not running. Order: the log's own sport field (set
// when logged), then the chosen modality, then the session type.
export function logSport(log: Pick<SessionLog, 'type' | 'sport' | 'cardioData' | 'outdoorData'>): Sport | undefined {
  // The way it was done wins over what was stored from the template, so a
  // long run logged as a run counts as running even in older logs.
  const modality = log.cardioData?.modality ?? log.outdoorData?.modality;
  const fromModality = modalitySport(modality);
  if (fromModality) return fromModality;
  if (log.sport) return log.sport;
  if (isCyclingModality(modality)) return 'cycling';
  if (log.type === 'cardio') return 'running';
  if (log.type === 'hiking') return 'hiking';
  return undefined;
}

// Indoor = no real terrain: a treadmill, or a bike on a trainer. Indoor
// cycling gives no climbing credit (Fase 4).
export function isIndoorLog(log: Pick<SessionLog, 'cardioData' | 'outdoorData'>): boolean {
  const data = log.cardioData ?? log.outdoorData;
  if (data?.environment === 'treadmill') return true;
  return findModalityByKey(data?.modality)?.environment === 'indoor';
}

// The shape of your week, chosen at the start (engine/weekShape.ts): per
// template the weekday (1 Monday to 7 Sunday). What is not in it is not in the
// weekly pattern. Unset: the pattern as the default program has it.
export interface WeekShape {
  days: Record<string, number>;
  // The days you said you can train on (1 to 7). A rest day chosen later spreads
  // the weekday trainings over these only (engine/restDay.ts).
  allowed?: number[];
}

// The templates a week shape may name: the fixed weekly pattern.
export const WEEK_SHAPE_TEMPLATE_IDS: readonly string[] = ['tpl_upper_a', 'tpl_lower_a', 'tpl_upper_b', 'tpl_long_run', 'tpl_hill_intervals', 'tpl_easy_run', 'tpl_herstel'];

// Reads a stored week shape defensively: only known templates with a whole
// weekday from 1 to 7 get through; anything else (a file from elsewhere, a
// damaged value) is nothing, and the pattern is then the default one.
export function parseWeekShape(raw: unknown): WeekShape | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined;
  const days = (raw as { days?: unknown }).days;
  if (typeof days !== 'object' || days === null || Array.isArray(days)) return undefined;
  const clean: Record<string, number> = {};
  for (const [id, day] of Object.entries(days)) {
    if (!WEEK_SHAPE_TEMPLATE_IDS.includes(id)) continue;
    if (typeof day === 'number' && Number.isInteger(day) && day >= 1 && day <= 7) clean[id] = day;
  }
  // A shape without a single training is no shape.
  if (!Object.keys(clean).some((id) => id !== 'tpl_herstel')) return undefined;
  const allowedRaw = (raw as { allowed?: unknown }).allowed;
  const allowed = Array.isArray(allowedRaw)
    ? [...new Set(allowedRaw.filter((d): d is number => typeof d === 'number' && Number.isInteger(d) && d >= 1 && d <= 7))].sort((a, b) => a - b)
    : [];
  return { days: clean, ...(allowed.length > 0 ? { allowed } : {}) };
}

export function applyWeekShape(pattern: SessionTemplate[], shape: WeekShape | undefined): SessionTemplate[] {
  const read = parseWeekShape(shape);
  if (!read) return pattern;
  return pattern.filter((t) => read.days[t.id] !== undefined).map((t) => ({ ...t, defaultDayOfWeek: read.days[t.id] }));
}

export interface PatternSettings {
  enabledSports?: Partial<EnabledSports>;
  sportFrequency?: Partial<Record<Sport, number>>;
  weekShape?: WeekShape;
}

// The weekly pattern ASCEND builds a week from, shaped by the user's
// settings: sports that are off drop out. A sport with a fixed number per
// week is then brought to that number by engine/sportFrequency.ts.
export function weeklyPatternTemplates(templates: SessionTemplate[], settings: PatternSettings): SessionTemplate[] {
  return applyWeekShape(templates.filter((t) => t.defaultDayOfWeek && isTemplatePlannable(t, settings.enabledSports)), settings.weekShape);
}

// Sports the user pinned to a number per week — the automatic weekly
// planning leaves those counts alone.
export function fixedFrequencySports(settings: PatternSettings): Sport[] {
  return (Object.entries(settings.sportFrequency ?? {}) as [Sport, number | undefined][])
    .filter(([sport, n]) => n !== undefined && n > 0 && isSportEnabled(sport, settings.enabledSports))
    .map(([sport]) => sport);
}
