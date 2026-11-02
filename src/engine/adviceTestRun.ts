// Regel TEST-MAKE-ROOM: ruimte maken voor een gemiste testloop.

import { FATIGUE_THRESHOLDS } from './legFatigue';
import type { PlannedSession, SessionTemplate } from '../models/training';
import type { PlanChangeItem, PlanChangeProposal } from '../models/planChange';
import { activeIllness, isIllnessDay, recoveryRamp } from './illness';
import { findHeavyConflicts, freshnessAt, respectsHeavySpacing, dayHasRoomFor, isLegHeavyTemplate } from './scheduler';
import { addDays, daysBetween, mondayOfWeek, formatWeekdayDateNL } from '../utils/dates';
import { type AdviceInputs, type Advice, isDone, inProgram, leavesNextHardFresh, proposal, MAX_OPTIONS } from './adviceShared';

// --- Rule TEST-MAKE-ROOM -----------------------------------------------------
// Trigger: the 5 km test run was missed or skipped (no time). The test is
// what sets your race pace, so it is worth more than most trainings around
// it. Rule: first a free day in the next 9 days that keeps the spacing
// (a test never within 48 hours after heavy legs, 72 before a test, and not
// next to another hard run); if there is none, the least important training
// on a day that does fit goes, and the test takes its place. Never the long
// run, the mountain hike, a race or leg strength. Always a proposal.
export const TEST_RUN_ID = 'tpl_test_run';
const TEST_ROOM_DAYS = 9;

// How much a training can be missed, lowest first; undefined: never taken out.
function removalCost(templateId: string, template: SessionTemplate): number | undefined {
  if (['tpl_strides_run', 'tpl_fartlek', 'tpl_progression_run', 'tpl_recovery_run', 'tpl_ruck_walk', 'tpl_bergconditie'].includes(templateId)) return 1;
  if (templateId === 'tpl_easy_run') return 2;
  if (template.type === 'strength' && !isLegHeavyTemplate(template)) return 3;
  if (['tpl_hill_intervals', 'tpl_hills_descent', 'tpl_intervals', 'tpl_tempo_run'].includes(templateId)) return 4;
  return undefined;
}

// `forced`: a proposal to move one given test, asked for by something other than a missed
// or tired-legs test (engine/influenceProposal.ts: what you noted about the evening before).
// It runs the same search around the test's own date, with the same spacing rules, and
// carries its own id and reason.
export interface ForcedTestMove {
  sessionId: string;
  id: string;
  title: string;
  why: string;
}

// `again`: the retry of TEST-RETRY that did not happen (skipped or missed) gets one new day through the
// same search as a missed test, with its own id and reason; nothing you locked is moved or let go for it,
// holiday, trek and light days are no candidates, and without a day that fits there is no advice.
interface RetryAgain {
  row: PlannedSession;
  id: string;
  title: string;
  why: string;
  blocked: (date: string) => boolean;
  yours: (s: PlannedSession) => boolean;
  // A session another open proposal already changes, or the leg day the Benen card speaks for: left alone.
  taken: (s: PlannedSession) => boolean;
}

export function testRunAdvice(inputs: AdviceInputs, templateById: Map<string, SessionTemplate>, usedIds: Set<string>, forced?: ForcedTestMove, again?: RetryAgain): Advice[] {
  if (activeIllness(inputs.illnessEpisodes) || recoveryRamp(inputs.illnessEpisodes, inputs.asOf)) return [];
  const test = templateById.get(TEST_RUN_ID);
  if (!test) return [];
  const today = inputs.asOf;
  const loggedIds = new Set(inputs.logs.map((l) => l.plannedSessionId));
  const open = (s: PlannedSession) => s.status !== 'skipped' && !loggedIds.has(s.id);
  // Not in the two weeks before a race: that is the taper.
  if (!forced && inputs.plannedSessions.some((s) => s.templateId === 'tpl_race' && open(s) && daysBetween(today, s.scheduledDate) >= 0 && daysBetween(today, s.scheduledDate) <= 14)) return [];
  // A test that sits on your rest day (the rest day moved onto it, or the
  // test fell on it): that is arranged like a missed one, around its own date.
  // Any test ahead, not only the next two weeks: the week check
  // (engine/weekValidator.ts) leaves where a test goes to you.
  const restDates = new Set(inputs.plannedSessions.filter((s) => open(s) && templateById.get(s.templateId)?.type === 'recovery').map((s) => s.scheduledDate));
  const onRestDay = again ? undefined : inputs.plannedSessions
    .filter((s) => s.templateId === TEST_RUN_ID && open(s) && s.scheduledDate > today && restDates.has(s.scheduledDate) && !usedIds.has(s.id))
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0];
  // A test in the next two weeks your legs won't be fresh for by the index
  // (clearly above the line, not just near it: there the card says to decide
  // at the warm-up). Arranged around its own date too (docs/onderzoek/
  // Planning op een lijn.md, conflict 6).
  const notFresh = onRestDay || again ? undefined : inputs.plannedSessions
    .filter((s) => s.templateId === TEST_RUN_ID && open(s) && s.scheduledDate > today && daysBetween(today, s.scheduledDate) <= 14 && !usedIds.has(s.id)
      && freshnessAt(s.scheduledDate, inputs.plannedSessions.filter((o) => o.id !== s.id), templateById, inputs.logs).index > FATIGUE_THRESHOLDS.test.doubt)
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0];
  const forcedSession = forced ? inputs.plannedSessions.find((s) => s.id === forced.sessionId && s.templateId === TEST_RUN_ID && open(s)) : undefined;
  if (forced && !forcedSession) return [];
  const around = forcedSession ?? onRestDay ?? notFresh;
  // Another test already waiting in the next two weeks: nothing to arrange.
  if (!around && inputs.plannedSessions.some((s) => s.templateId === TEST_RUN_ID && open(s) && s.scheduledDate >= today && daysBetween(today, s.scheduledDate) <= 14)) return [];

  // A retry of TEST-RETRY that did not happen is TEST-RETRY's to speak for (one voice, one Liever niet).
  const lost = again?.row ?? around ?? inputs.plannedSessions
    .filter((s) => s.templateId === TEST_RUN_ID && !loggedIds.has(s.id) && !isDone(s, inputs.logs, loggedIds) && inProgram(s, inputs.program) && !inputs.removedByPlanIds?.has(s.id) && !usedIds.has(s.id) && !inputs.retryRows?.has(s.id)
      && !isIllnessDay(s.scheduledDate, inputs.illnessEpisodes, today)
      && (s.status === 'skipped' ? daysBetween(s.scheduledDate, today) >= -14 && daysBetween(s.scheduledDate, today) <= 7 : s.scheduledDate < today && daysBetween(s.scheduledDate, today) <= 7))
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))[0];
  if (!lost) return [];

  const load = (without: Set<string>) => inputs.plannedSessions.filter((s) => s.id !== lost.id && !without.has(s.id) && s.status !== 'skipped' && (s.scheduledDate >= today || loggedIds.has(s.id)));
  const weekOf = (date: string) => inputs.plannedSessions.filter((s) => s.weekStartDate === mondayOfWeek(date) && s.id !== lost.id && s.status !== 'skipped');
  // The days after today; for a test on your rest day those around its own
  // date, nearest first, never a rest day itself.
  const days = around
    ? Array.from({ length: 9 }, (_, i) => addDays(lost.scheduledDate, [1, -1, 2, -2, 3, -3, 4, -4, 5][i]))
      .filter((d) => d > today && !restDates.has(d) && !isIllnessDay(d, inputs.illnessEpisodes, today))
    : Array.from({ length: TEST_ROOM_DAYS }, (_, i) => addDays(today, i + 1))
      .filter((d) => !again || (!again.blocked(d) && !isIllnessDay(d, inputs.illnessEpisodes, today)));
  const ruleId = forced ? 'TEST-INFLUENCE' : again ? 'TEST-RETRY' : 'TEST-MAKE-ROOM';
  const by = ['engine/adviceEngine.ts', again ? 'TEST-RETRY' : 'TEST-MAKE-ROOM'];
  const why = forced?.why ?? again?.why ?? 'De testloop van 5 km is het meetpunt voor je wedstrijdtempo: daarop stelt ASCEND je tempo af, en daaruit rekent hij je voorspelde tijd. Daarom hoort hij erin, ook als er een andere training voor moet wijken. Alleen jij beslist: dit is een voorstel.';
  const missedWord = lost.status === 'skipped' ? 'overgeslagen' : 'gemist';
  const title = forced ? forced.title : again ? again.title : onRestDay ? `Testloop van ${formatWeekdayDateNL(lost.scheduledDate)} staat op je rustdag` : notFresh ? `Testloop van ${formatWeekdayDateNL(lost.scheduledDate)}: je benen zijn dan nog niet fris` : `Testloop van ${formatWeekdayDateNL(lost.scheduledDate)} ${missedWord}`;
  const adviceId = forced?.id ?? again?.id ?? `testroom:${lost.id}`;
  const moveItem = (date: string): PlanChangeItem => ({ plannedSessionId: lost.id, action: 'move', fromDate: lost.scheduledDate, toDate: date, reason: 'De testloop is het meetpunt voor je tempo.', generatedBy: by });

  // 1b. Move leg strength out of the way rather than dropping anything: to
  // after the test, that evening (with "Zware dingen op één dag") or in the
  // days after. Running first and lifting later leaves the next run alone
  // (Doma en Deakin 2013; docs/onderzoek/Spierbelasting en beenvermoeidheid.md).
  // Strength that shares the day (when the test doesn't fit beside it) moves
  // too, to the nearest day where it fits; nothing is dropped in this step.
  // Moved leg strength must not leave the next hard session (hills, intervals,
  // tempo, a long run) in the two days after it too heavy: index 12 at most
  // (docs/onderzoek/Spierbelasting en beenvermoeidheid.md, "Drempels").
  const nextHardStaysFresh = (d: string, s: PlannedSession, others: PlannedSession[]) => leavesNextHardFresh(inputs, templateById, d, s, others);

  function moveStrengthFor(date: string): Advice[] | undefined {
    if (!test || !lost) return undefined;
    const base = load(new Set());
    const sameDay = base.filter((s) => s.scheduledDate === date && templateById.get(s.templateId)?.type !== 'recovery');
    const roomOk = dayHasRoomFor(date, test, weekOf(date), templateById, inputs.program, inputs.dailyTimeBudget, inputs.sameDayPairingPreference);
    const blockers = findHeavyConflicts(lost.id, test, date, base, templateById, inputs.logs);
    const toMove = [...blockers, ...(roomOk ? [] : sameDay.filter((s) => !blockers.some((b) => b.id === s.id)))];
    if (toMove.length === 0 || !toMove.every(movable)) return undefined;
    const testAt: PlannedSession = { ...lost, scheduledDate: date, weekStartDate: mondayOfWeek(date), status: 'planned' };
    let now = base;
    const moves: { session: PlannedSession; to: string }[] = [];
    for (const s of toMove) {
      const t = templateById.get(s.templateId)!;
      const legs = isLegHeavyTemplate(t);
      const others = now.filter((o) => o.id !== s.id);
      // Leg strength after the test (that evening first); upper body the nearest free day.
      const targets = legs ? [0, 1, 2, 3] : [1, -1, 2, -2, 3];
      const to = targets.map((d) => addDays(date, d)).find((d) => {
        if (d < today || d === s.scheduledDate && d === date || restDates.has(d) || isIllnessDay(d, inputs.illnessEpisodes, today) || !!again?.blocked(d)) return false;
        const week = [...weekOf(d).filter((o) => o.id !== s.id && !moves.some((m) => m.session.id === o.id)), ...moves.filter((m) => m.to === d).map((m) => ({ ...m.session, scheduledDate: m.to })), ...(d === date ? [testAt] : [])];
        return dayHasRoomFor(d, t, week, templateById, inputs.program, inputs.dailyTimeBudget, inputs.sameDayPairingPreference)
          && respectsHeavySpacing(d, t, [...others, testAt], templateById, inputs.logs, s.id)
          && nextHardStaysFresh(d, s, [...others, testAt]);
      });
      if (!to) break;
      moves.push({ session: s, to });
      now = [...others, { ...s, scheduledDate: to, weekStartDate: mondayOfWeek(to) }];
    }
    const weekAfter = [...weekOf(date).filter((o) => !moves.some((m) => m.session.id === o.id)), ...moves.map((m) => ({ ...m.session, scheduledDate: m.to }))];
    if (moves.length !== toMove.length || !dayHasRoomFor(date, test, weekAfter, templateById, inputs.program, inputs.dailyTimeBudget, inputs.sameDayPairingPreference) || !respectsHeavySpacing(date, test, now, templateById, inputs.logs, lost.id)) return undefined;
    const moveLines = moves.map((m) => `${templateById.get(m.session.templateId)?.name ?? 'Kracht'} naar ${m.to === date ? `${formatWeekdayDateNL(m.to)}, na de test (liefst 6 uur later)` : formatWeekdayDateNL(m.to)}`);
    const items: PlanChangeItem[] = [
      ...moves.map((m): PlanChangeItem => ({ plannedSessionId: m.session.id, action: 'move', fromDate: m.session.scheduledDate, toDate: m.to, reason: 'Na de test, zodat je benen fris zijn voor de testloop.', generatedBy: by })),
      moveItem(date),
    ];
    const effect = `Doe hem ${formatWeekdayDateNL(date)}, en ${moveLines.join(' en ')}. Eerst lopen en daarna kracht verstoort je volgende loop niet, andersom wel.`;
    return [{ id: adviceId, trigger: around || again ? 'plan_update' : 'session_missed', ruleId, title, effect, why, priority: 3, proposal: proposal(title, items, `De testloop komt op ${formatWeekdayDateNL(date)}; ${moveLines.join('; ')}.`, why) }];
  }

  // 1. Per day, nearest first: a free day, or else (1b below) a day that
  // becomes free by moving strength, before looking at the next day.
  const isStrength = (s: PlannedSession) => templateById.get(s.templateId)?.type === 'strength';
  const movable = (s: PlannedSession) => isStrength(s) && s.scheduledDate >= today && !loggedIds.has(s.id) && !again?.yours(s) && !again?.taken(s);
  // The smallest change wins: a day further away weighs one, every training
  // moved aside two (a free day two days off beats moving two sessions).
  const daysFrom = (date: string) => (around ? Math.abs(daysBetween(lost.scheduledDate, date)) : daysBetween(today, date));
  type Candidate = { cost: number; date: string; label: string; effect: string; proposal: PlanChangeProposal };
  const candidates: Candidate[] = [];
  for (const date of days) {
    const free = dayHasRoomFor(date, test, weekOf(date), templateById, inputs.program, inputs.dailyTimeBudget, inputs.sameDayPairingPreference)
      && respectsHeavySpacing(date, test, load(new Set()), templateById, inputs.logs, lost.id);
    if (!free) {
      const moved = moveStrengthFor(date);
      if (moved) {
        const extra = moved[0].proposal!.changes.filter((c) => c.plannedSessionId !== lost.id);
        const label = `${formatWeekdayDateNL(date)}, ${extra.map((c) => `${templateById.get(inputs.plannedSessions.find((x) => x.id === c.plannedSessionId)?.templateId ?? '')?.name ?? 'training'} naar ${formatWeekdayDateNL(c.toDate!)}`).join(', ')}`;
        candidates.push({ cost: daysFrom(date) + 2 * extra.length, date, label, effect: moved[0].effect, proposal: moved[0].proposal! });
      }
      continue;
    }
    const sameDayLegs = weekOf(date).filter((s) => s.scheduledDate === date && open(s) && (() => { const t = templateById.get(s.templateId); return !!t && t.type === 'strength' && isLegHeavyTemplate(t); })());
    const legsName = sameDayLegs.length > 0 ? templateById.get(sameDayLegs[0].templateId)?.name ?? 'Beenkracht' : undefined;
    const legsNote = legsName ? ` ${legsName} die dag pas na de test, liefst 6 uur later (minstens 3): eerst lopen, dan kracht.` : '';
    // The leg day the option shows stays as shown: kept, so accepting fixes it.
    const keeps = sameDayLegs.filter((l) => !again?.yours(l) && !again?.taken(l)).map((l): PlanChangeItem => ({ plannedSessionId: l.id, action: 'keep', reason: `${legsName} blijft die dag, na de test.`, generatedBy: by }));
    candidates.push({ cost: daysFrom(date), date, label: `${formatWeekdayDateNL(date)}${legsName ? `, ${legsName} erna` : ''}`, effect: `Doe hem ${formatWeekdayDateNL(date)}.${legsNote}`, proposal: proposal(title, [moveItem(date), ...keeps], `De testloop komt op ${formatWeekdayDateNL(date)}.`, why) });
  }

  // 2. Make room: the least important trainings that stand in the way, on
  // that day or close to it (the hills the day after, an easy run the day
  // before). In a test week the test is the quality session, so the hills
  // of that week may go. Never the long run, leg strength or a race.
  // Dropping weighs more than moving: these come after the options above.
  for (const date of days) {
    // What is on that day only has to go when the test doesn't fit next to it.
    const fitsBeside = dayHasRoomFor(date, test, weekOf(date), templateById, inputs.program, inputs.dailyTimeBudget, inputs.sameDayPairingPreference);
    const there = fitsBeside ? [] : inputs.plannedSessions.filter((s) => s.scheduledDate === date && s.id !== lost.id && open(s) && templateById.get(s.templateId)?.type !== 'recovery');
    const blockers = findHeavyConflicts(lost.id, test, date, load(new Set(there.map((s) => s.id))), templateById, inputs.logs);
    const remove = [...there, ...blockers.filter((b) => !there.some((t) => t.id === b.id))];
    if (remove.length === 0 || remove.some((s) => loggedIds.has(s.id) || s.scheduledDate < today || !!again?.yours(s) || !!again?.taken(s))) continue;
    const costs = remove.map((s) => { const t = templateById.get(s.templateId); return t ? removalCost(s.templateId, t) : undefined; });
    if (costs.some((c) => c === undefined)) continue;
    if (!respectsHeavySpacing(date, test, load(new Set(remove.map((s) => s.id))), templateById, inputs.logs, lost.id)) continue;
    const names = remove.map((s) => templateById.get(s.templateId)?.name ?? 'training');
    const items: PlanChangeItem[] = [
      ...remove.map((s): PlanChangeItem => ({ plannedSessionId: s.id, action: 'remove', reason: 'Plaats gemaakt voor de testloop.', generatedBy: by })),
      moveItem(date),
    ];
    const verb = remove.length === 1 ? 'vervalt' : 'vervallen';
    const sameDay = remove.every((s) => s.scheduledDate === date);
    const effect = sameDay
      ? `Er is geen vrije dag. Mijn voorstel: ${names.join(' en ')} van ${formatWeekdayDateNL(date)} ${verb} en de testloop komt daar.`
      : `Er is geen dag met frisse benen. Mijn voorstel: de testloop op ${formatWeekdayDateNL(date)}, en ${remove.map((s) => `${templateById.get(s.templateId)?.name ?? 'training'} van ${formatWeekdayDateNL(s.scheduledDate)}`).join(' en ')} ${verb}. In een testweek is de test je kwaliteitstraining.`;
    candidates.push({ cost: daysFrom(date) + 3 + (costs as number[]).reduce((a, b) => a + b, 0), date, label: `${formatWeekdayDateNL(date)}, ${names.join(' en ')} ${verb}`, effect, proposal: proposal(title, items, `${names.join(' en ')} ${verb}; de testloop komt op ${formatWeekdayDateNL(date)}.`, why) });
  }

  // The best first; up to three different days to choose from (one way per day, so a
  // "Liever niet" to tomorrow still leaves other days, also in the next week).
  for (const c of candidates) c.label = `Testloop ${c.label}`;
  const ranked = candidates.sort((a, b) => a.cost - b.cost || a.date.localeCompare(b.date)).filter((c, n, all) => all.findIndex((o) => o.date === c.date) === n).slice(0, MAX_OPTIONS);
  const trigger = around || again ? 'plan_update' as const : 'session_missed' as const;
  if (ranked.length > 0) {
    const [first] = ranked;
    return [{ id: adviceId, trigger, ruleId, title, effect: first.effect, why, priority: 3, proposal: first.proposal, options: ranked.length > 1 ? ranked.map((c) => ({ label: c.label, effect: c.effect, proposal: c.proposal })) : undefined }];
  }
  // The retry once more: no workable day, no advice.
  if (again) return [];
  return [{ id: adviceId, trigger, ruleId, title, effect: 'De komende dagen is er geen goede plek voor de testloop zonder je zware dagen te raken. De volgende testloop staat in je plan; je kunt de testloop ook zelf in Week verplaatsen.', why, priority: 1 }];
}

// The proposal to move one given test (engine/influenceProposal.ts), with the same preview,
// spacing and Akkoord as every other proposal. Without a place that keeps the leg rules: nothing.
export function testMoveAdvice(inputs: AdviceInputs, forced: ForcedTestMove): Advice | undefined {
  const templateById = new Map(inputs.templates.map((t) => [t.id, t]));
  return testRunAdvice(inputs, templateById, new Set(), forced).find((a) => a.proposal);
}
