// Migratiestappen voor sporten: hoe een sport telt, vaste trainingen,
// hoeveelheid per soort en eigen sporten.

import { cleanSportCounting, parseSportHandling, type SportCounting, type SportHandlingMap } from '../engine/sportRole';
import { COUNTED_SPORTS } from '../data/sports';
import { TRAINING_KINDS, type KindAmountMap } from '../data/trainingKinds';
import { parseKindAmounts } from '../engine/kindAmount';
import { parseCustomSports, type CustomSport } from '../engine/customSport';
import type { PlannedSession, SessionLog } from '../models/training';

// Sporten die meetellen (engine/sportRole.ts): alleen bekende sporten met een rol die ze kennen en
// echte vaste afspraken. Een oud bestand zonder dit veld importeert zoals het was.
export function migrateSportHandling(raw: unknown): { value: SportHandlingMap | undefined; skipped: number } {
  return parseSportHandling(raw);
}

// Hoe sporten meetellen (engine/sportRole.ts#resolveSportCounting): alleen de bekende keuzes. Een oud
// bestand zonder dit veld importeert zoals het was.
export function migrateSportCounting(raw: unknown): { value: Partial<SportCounting> | undefined; skipped: number } {
  return cleanSportCounting(raw);
}

// SessionLog.countedSport (sporten die meetellen, stap 4): alleen een bekende sport blijft, iets anders valt
// weg. Het log zelf verandert niet; zonder sport is het een gewone training zoals eerst.
export function migrateLogCountedSport(log: SessionLog): SessionLog {
  if (!('countedSport' in log)) return log;
  const value = (log as { countedSport?: unknown }).countedSport;
  if (COUNTED_SPORTS.some((s) => s.id === value)) return log;
  const { countedSport: _wrong, ...rest } = log as SessionLog & { countedSport?: unknown };
  void _wrong;
  return rest as SessionLog;
}

// PlannedSession.fixed (sporten die meetellen, stap 7): een vaste afspraak met een bekende sport, een dag van 1
// tot 7 en een bekende zwaarte. Iets anders valt weg en de rij blijft verder zoals hij was.
export function migratePlannedFixed(s: PlannedSession): PlannedSession {
  if (!('fixed' in s)) return s;
  const f = (s as { fixed?: unknown }).fixed as Record<string, unknown> | undefined;
  const ok = !!f && typeof f === 'object' && COUNTED_SPORTS.some((c) => c.id === f.sport)
    && typeof f.day === 'number' && Number.isInteger(f.day) && f.day >= 1 && f.day <= 7
    && (f.intensity === 'low' || f.intensity === 'moderate' || f.intensity === 'high');
  if (ok) {
    // De week is optioneel: een kapotte week valt weg en de rij leest dan zijn eigen week.
    if ('week' in f! && !(typeof f!.week === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(f!.week))) {
      const { week: _w, ...fixed } = f!;
      void _w;
      return { ...s, fixed: fixed as PlannedSession['fixed'] };
    }
    return s;
  }
  const { fixed: _wrong, ...rest } = s as PlannedSession & { fixed?: unknown };
  void _wrong;
  return rest as PlannedSession;
}

// Hoeveel per soort (engine/kindAmount.ts): alleen bekende soorten met Minder of Meer.
export function migrateKindAmount(raw: unknown): { value: KindAmountMap | undefined; skipped: number } {
  return parseKindAmounts(raw);
}

// PlannedSession.amount (Hoeveel per soort): een bekende soort en een bekende verandering, anders valt het weg
// en blijft de rij verder zoals hij was.
export function migratePlannedAmount(s: PlannedSession): PlannedSession {
  if (!('amount' in s)) return s;
  const a = (s as { amount?: unknown }).amount as Record<string, unknown> | undefined;
  if (a && typeof a === 'object' && TRAINING_KINDS.some((k) => k.id === a.kind) && (a.change === 'extra' || a.change === 'left_out')) return s;
  const { amount: _wrong, ...rest } = s as PlannedSession & { amount?: unknown };
  void _wrong;
  return rest as PlannedSession;
}

// Je eigen sporten (engine/customSport.ts): een type, waar je het merkt en een rol; hoogstens twintig.
export function migrateCustomSports(raw: unknown): { value: CustomSport[] | undefined; skipped: number } {
  return parseCustomSports(raw);
}

// SessionLog.customSport: alleen een id van een eigen sport blijft, iets anders valt weg. Het log verandert niet.
export function migrateLogCustomSport(log: SessionLog): SessionLog {
  if (!('customSport' in log)) return log;
  const v = (log as { customSport?: unknown }).customSport;
  if (typeof v === 'string' && /^custom_[a-z0-9_]{1,60}$/.test(v)) return log;
  const { customSport: _wrong, ...rest } = log as SessionLog & { customSport?: unknown };
  void _wrong;
  return rest as SessionLog;
}

// SessionLog.rpeAssumed: alleen `true` blijft, iets anders valt weg. Het log zelf verandert niet.
export function migrateLogRpeAssumed(log: SessionLog): SessionLog {
  if (!('rpeAssumed' in log) || (log as { rpeAssumed?: unknown }).rpeAssumed === true) return log;
  const { rpeAssumed: _wrong, ...rest } = log as SessionLog & { rpeAssumed?: unknown };
  void _wrong;
  return rest as SessionLog;
}
