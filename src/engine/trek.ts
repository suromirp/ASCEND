// ASCEND: tochten as goals of your own next to the GR5 (a snow hike over two
// months, a weekend with a tent). A tocht is a trek period with its details on
// it (models/leave.ts), so the planning around it is exactly the planning of
// engine/leave.ts: a walk on every day (engine/leaveBlock.ts), light days
// around it (rule LEAVE-LIGHT, more of them before a tocht you want to be fresh
// for, engine/trekTaper.ts) and a proposal with Akkoord for making, moving or
// removing it (engine/leaveProposal.ts). The tocht and its period are one
// record, so changing or removing the tocht takes the period with it.
//
// A tocht never changes the GR5 progress by itself: a walk you log counts
// toward "Klaar voor de GR5" like any other (engine/gr5Readiness.ts).
//
// Pure: no React, no IndexedDB.

import type { LeavePeriod, TrekDetails, TrekImportance, TrekTerrain } from '../models/leave';
import { addDays, daysBetween } from '../utils/dates';
import { dayCount } from './leave';
import { trekLightDaysBefore } from './trekTaper';

export const TREK_TERRAINS: TrekTerrain[] = ['flat_trail', 'uneven_trail', 'mountain', 'snow'];
export const TREK_TERRAIN_LABEL: Record<TrekTerrain, string> = {
  flat_trail: 'Vlak',
  uneven_trail: 'Heuvels',
  mountain: 'Bergen',
  snow: 'Sneeuw',
};

export const TREK_IMPORTANCES: TrekImportance[] = ['training', 'goal'];
export const TREK_IMPORTANCE_LABEL: Record<TrekImportance, string> = {
  training: 'Training onderweg',
  goal: 'Doel, fris aan de start',
};

export function trekImportanceHint(importance: TrekImportance, days: number): string {
  if (importance === 'training') return 'Geen afbouw. Alleen de dag ervoor en erna blijft licht. De tocht telt als training richting de GR5.';
  const n = trekLightDaysBefore(days, 'goal');
  return `ASCEND houdt de ${n} dagen ervoor licht, zodat je fris vertrekt. De tocht telt ook als training richting de GR5.`;
}

export const MAX_TREK_DAYS = 30;
const MAX_PACK_KG = 40;

export interface TrekDraft {
  name: string;
  startDate: string;
  days: number;
  terrain: TrekTerrain;
  packKg?: number;
  tent: boolean;
  importance: TrekImportance;
}

// What you may fill in. Returns the message to show, or nothing when fine.
export function validateTrekDraft(draft: TrekDraft, today: string): string | undefined {
  if (!draft.name.trim()) return 'Geef de tocht een naam.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.startDate)) return 'Kies een startdatum.';
  if (!Number.isInteger(draft.days) || draft.days < 1) return 'Een tocht duurt minstens één dag.';
  if (draft.days > MAX_TREK_DAYS) return `Langer dan ${MAX_TREK_DAYS} dagen? Controleer het aantal dagen.`;
  if (addDays(draft.startDate, draft.days - 1) < today) return 'Deze tocht is al voorbij.';
  if (draft.packKg !== undefined && (!Number.isFinite(draft.packKg) || draft.packKg < 0 || draft.packKg > MAX_PACK_KG)) return `Een rugzak van 0 tot ${MAX_PACK_KG} kg.`;
  return undefined;
}

// The trek period that is the tocht. `id` stays the same when you change a
// tocht, so the stored period is replaced, never duplicated.
export function trekToPeriod(draft: TrekDraft, id: string): LeavePeriod {
  const trek: TrekDetails = {
    name: draft.name.trim(),
    terrain: draft.terrain,
    ...(draft.packKg !== undefined && draft.packKg > 0 ? { packKg: draft.packKg } : {}),
    tent: draft.tent,
    importance: draft.importance,
  };
  return { id, kind: 'trek', startDate: draft.startDate, endDate: addDays(draft.startDate, draft.days - 1), trek };
}

export function periodToTrekDraft(period: LeavePeriod): TrekDraft | undefined {
  if (!period.trek) return undefined;
  return {
    name: period.trek.name, startDate: period.startDate, days: dayCount(period), terrain: period.trek.terrain,
    packKg: period.trek.packKg, tent: period.trek.tent, importance: period.trek.importance,
  };
}

export function trekPeriods(periods: LeavePeriod[] | undefined): LeavePeriod[] {
  return (periods ?? []).filter((p) => p.kind === 'trek' && !!p.trek).sort((a, b) => a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id));
}

export interface NextTrek {
  period: LeavePeriod;
  trek: TrekDetails;
  // Whole days until the first day; 0 = today, negative = under way.
  daysUntil: number;
  underway: boolean;
}

// The next tocht to look forward to: the first one that is not over yet and
// that starts before the day of the main goal (a tocht after the GR5 starts is
// not "before" it). One under way counts as the next.
export function nextTrek(periods: LeavePeriod[] | undefined, today: string, goalDay?: string): NextTrek | undefined {
  const period = trekPeriods(periods).find((p) => p.endDate >= today && (!goalDay || p.startDate < goalDay));
  if (!period?.trek) return undefined;
  const daysUntil = daysBetween(today, period.startDate);
  return { period, trek: period.trek, daysUntil, underway: daysUntil < 0 };
}

// "over 12 dagen", "morgen", "vandaag", "bezig".
export function whenText(next: Pick<NextTrek, 'daysUntil' | 'underway'>): string {
  if (next.underway) return 'bezig';
  if (next.daysUntil === 0) return 'vandaag';
  if (next.daysUntil === 1) return 'morgen';
  return `over ${next.daysUntil} dagen`;
}

// One calm line for the tocht: "Sneeuw, 2 dagen, rugzak 9 kg, met tent".
export function trekFacts(period: LeavePeriod): string {
  const t = period.trek;
  if (!t) return '';
  const n = dayCount(period);
  const parts = [TREK_TERRAIN_LABEL[t.terrain], `${n} ${n === 1 ? 'dag' : 'dagen'}`];
  if (t.packKg) parts.push(`rugzak ${String(t.packKg).replace('.', ',')} kg`);
  parts.push(t.tent ? 'met tent' : 'zonder tent');
  return parts.join(', ');
}
