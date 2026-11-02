// ASCEND: Hoeveel per soort (docs/visie/Sporten die meetellen.md, 2.4). Per soort training Minder, Normaal of
// Meer. In volgorde: eerst de duur (15 procent korter of langer, afgerond op 5 minuten, en nooit boven de
// sessiepiek van 110 procent van je langste training van dat sjabloon in 30 dagen, engine/substitutions.ts),
// dan het aantal: Meer zet een training van die soort extra op een vrije dag als de regels dat toelaten, Minder
// laat er een weg als er meer dan één staat. De wens blijft bewaard (AppSettings.kindAmount); de planning
// verandert alleen via het voorstel met Akkoord, en Normaal zet terug wat Meer of Minder deed.
//
// De grenzen in drie lagen: veiligheid schuift nooit (een extra training blijft alleen staan als de weekcheck
// er niets nieuws door vindt), wat je doel minstens vraagt (nooit minder dan één van een soort per week, en een
// Minder op de sleuteltraining van je doel zegt in het voorstel wat het kost), en daarboven ben je vrij.
// Puur: geen React, geen IndexedDB.

import { TRAINING_KINDS, type KindAmount, type KindAmountMap, type TrainingKind, type TrainingKindId } from '../data/trainingKinds';
import type { LeavePeriod } from '../models/leave';
import type { PlannedSession, SessionTemplate } from '../models/training';
import { addDays, isoWeekday, mondayOfWeek } from '../utils/dates';
import { scaledMinutes, trainingKindOf } from './trainingKind';
import { lockLevel, validateWeeks, type CheckInput, type Repair } from './weekValidator';
export { scaledMinutes, trainingKindOf };

// Defensief gelezen: alleen bekende soorten met Minder of Meer. Normaal staat er niet in.
export function parseKindAmounts(raw: unknown): { value: KindAmountMap | undefined; skipped: number } {
  if (raw === undefined) return { value: undefined, skipped: 0 };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { value: undefined, skipped: 1 };
  const out: KindAmountMap = {};
  let skipped = 0;
  for (const [key, v] of Object.entries(raw as Record<string, unknown>)) {
    const kind = TRAINING_KINDS.find((k) => k.id === key);
    if (kind && (v === 'less' || v === 'more')) out[kind.id] = v;
    else skipped++;
  }
  return { value: Object.keys(out).length > 0 ? out : undefined, skipped };
}

// De soorten die er zijn: alleen wat in je weekpatroon staat, de rugzakwandeling alleen met een tocht als doel.
// Een soort die er niet is, bestaat niet; geen uitgegrijsde rijen.
export function visibleKinds(pattern: readonly SessionTemplate[], opts: { trek: boolean }): TrainingKind[] {
  const present = new Set(pattern.map(trainingKindOf).filter(Boolean));
  return TRAINING_KINDS.filter((k) => (k.onlyWithTrek ? opts.trek : present.has(k.id)));
}

// De waarde van de rij: "Alles normaal" of "Kracht meer, Lange duur minder".
export function kindAmountSummary(map: KindAmountMap | undefined): { value: string; sub?: string } {
  const parts = TRAINING_KINDS.filter((k) => map?.[k.id]).map((k) => `${k.label} ${map![k.id] === 'more' ? 'meer' : 'minder'}`);
  if (parts.length === 0) return { value: 'Alles normaal' };
  return { value: parts.length === 1 ? '1 anders' : `${parts.length} anders`, sub: parts.join(', ') };
}

// "Normaal: 45 minuten, 2 keer per week. Meer: 50 minuten."
export function kindAmountLine(minutes: number, perWeek: number, amount: KindAmount | undefined): string {
  const base = `Normaal: ${minutes} minuten, ${perWeek} keer per week.`;
  if (!amount) return `${base} Meer: ${scaledMinutes(minutes, 'more')} minuten.`;
  return `${base} ${amount === 'more' ? 'Meer' : 'Minder'}: ${scaledMinutes(minutes, amount)} minuten.`;
}

// Het kostenzinnetje bij een Minder op wat je doel het meest vraagt (laag 2): de sleuteltraining van de week.
export function kindCostLine(kind: TrainingKindId, amount: KindAmount | undefined, goal: { trek: boolean; key?: TrainingKindId }): string | undefined {
  if (amount !== 'less') return undefined;
  if (kind === 'ruck' && goal.trek) return 'Met minder rugzakwandelingen is de stap naar je volle rugzak groot. Toch doen?';
  if (kind === goal.key) return 'Je doel vraagt deze training elke week. Korter kan, maar de stap naar je doel wordt groter. Toch doen?';
  return undefined;
}

// --- het aantal: de stap in de planningsronde ----------------------------------------------------------

const WEEKS_AHEAD = 8;

export interface KindAmountContext {
  today: string;
  until?: string;
  leave?: readonly LeavePeriod[];
  check: Omit<CheckInput, 'sessions'>;
  newId: () => string;
}

const findingKey = (f: { rule: string; sessionIds: string[] }) => `${f.rule}:${[...f.sessionIds].sort().join(',')}`;

function blockedByLeave(date: string, leave: readonly LeavePeriod[] | undefined): boolean {
  return (leave ?? []).some((p) => (p.kind === 'no_training' || p.kind === 'trek') && date >= p.startDate && date <= p.endDate);
}

export function applyKindAmounts(all: readonly PlannedSession[], amounts: KindAmountMap | undefined, ctx: KindAmountContext): { sessions: PlannedSession[]; repairs: Repair[] } {
  const byId = new Map(ctx.check.templates.map((t) => [t.id, t]));
  const logged = new Set(ctx.check.logs.map((l) => l.plannedSessionId).filter(Boolean));
  const open = (s: PlannedSession) => s.scheduledDate >= ctx.today && !logged.has(s.id);
  const repairs: Repair[] = [];
  let sessions = [...all];

  // Normaal weer: wat Meer erbij zette gaat weg, wat Minder wegliet komt terug. Alleen open rijen.
  sessions = sessions.flatMap((s) => {
    if (!s.amount || !open(s)) return [s];
    const still = amounts?.[s.amount.kind] === (s.amount.change === 'extra' ? 'more' : 'less');
    if (still) return [s];
    if (s.amount.change === 'extra') {
      repairs.push({ sessionId: s.id, rule: 'KIND-AMOUNT', from: s.scheduledDate, to: s.scheduledDate, removed: true, reason: 'je koos weer Normaal' });
      return [];
    }
    const { amount: _gone, ...rest } = s;
    void _gone;
    repairs.push({ sessionId: s.id, rule: 'KIND-AMOUNT', from: s.scheduledDate, to: s.scheduledDate, reason: 'je koos weer Normaal, hij staat er weer' });
    return [{ ...rest, status: 'planned' as const }];
  });
  if (!amounts || Object.keys(amounts).length === 0) return { sessions, repairs };

  const last = [addDays(mondayOfWeek(ctx.today), 7 * WEEKS_AHEAD - 1), ctx.until].filter((d): d is string => !!d).sort()[0];
  const kindOf = (s: PlannedSession) => { const t = byId.get(s.templateId); return t ? trainingKindOf(t) : undefined; };
  const isTraining = (s: PlannedSession) => s.status !== 'skipped' && byId.get(s.templateId)?.type !== 'recovery';

  for (let monday = mondayOfWeek(ctx.today); monday <= last; monday = addDays(monday, 7)) {
    const weekOf = () => sessions.filter((s) => mondayOfWeek(s.scheduledDate) === monday);
    for (const [kind, amount] of Object.entries(amounts) as [TrainingKindId, KindAmount][]) {
      const week = weekOf();
      if (week.some((s) => s.amount?.kind === kind)) continue;
      const ofKind = week.filter((s) => s.status !== 'skipped' && kindOf(s) === kind);
      if (amount === 'less') {
        // Laag 2: nooit minder dan één van een soort. Alleen wat van het systeem is en nog moet komen.
        const mine = ofKind.filter((s) => open(s) && lockLevel(s, logged, ctx.today) === 3 && !s.fixed && !s.raceBlock && !s.leave);
        if (ofKind.length <= 1 || mine.length === 0) continue;
        const out = mine.sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))[0];
        sessions = sessions.map((s) => (s.id === out.id ? { ...s, status: 'skipped' as const, amount: { kind, change: 'left_out' as const } } : s));
        repairs.push({ sessionId: out.id, rule: 'KIND-AMOUNT', from: out.scheduledDate, to: out.scheduledDate, removed: true, reason: 'je koos Minder' });
        continue;
      }
      // Meer: een training van die soort extra op een vrije dag. Laag 1: alleen als de weekcheck er niets
      // nieuws door vindt (48 uur tussen zware beendagen, de rustdag, het aantal harde dagen).
      const model = ofKind[0];
      if (!model) continue;
      const weeks = new Set([-7, 0, 7].map((o) => addDays(monday, o)));
      const before = new Set(validateWeeks({ ...ctx.check, sessions }, weeks).map(findingKey));
      const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
        .filter((d) => d >= ctx.today && d <= last && isoWeekday(d) !== ctx.check.restDay && !blockedByLeave(d, ctx.leave) && !sessions.some((s) => s.scheduledDate === d && isTraining(s)))
        .sort((a, b) => Math.abs(isoWeekday(a) - 3) - Math.abs(isoWeekday(b) - 3) || a.localeCompare(b));
      for (const d of days) {
        const extra: PlannedSession = { id: ctx.newId(), templateId: model.templateId, scheduledDate: d, weekStartDate: monday, status: 'planned', order: 9, amount: { kind, change: 'extra' } };
        const after = validateWeeks({ ...ctx.check, sessions: [...sessions, extra] }, weeks);
        if (after.every((f) => before.has(findingKey(f)))) {
          sessions = [...sessions, extra];
          repairs.push({ sessionId: extra.id, rule: 'KIND-AMOUNT', from: d, to: d, added: true, reason: 'je koos Meer' });
          break;
        }
      }
    }
  }
  return { sessions, repairs };
}
