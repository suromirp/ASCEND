// Alle regels samen (computeAdvice), met de regel TEST-RETRY. Die staat hier
// omdat hij computeAdvice opnieuw draait op een nagespeelde week om te zien of
// er een nieuw probleem ontstaat; in een eigen bestand gaf dat een kringverwijzing.

import { FATIGUE_THRESHOLDS } from './legFatigue';
import type { PlannedSession, SessionTemplate } from '../models/training';
import type { PlanChangeItem, PlanChangeProposal } from '../models/planChange';
import { activeIllness, isIllnessDay, recoveryRamp } from './illness';
import { findHeavyConflicts, freshnessAt, respectsHeavySpacing, dayHasRoomFor, isLegHeavyTemplate, testRestHours } from './scheduler';
import { LEG_EASE_INDEX, legEaseCardSession } from './legDayEase';
import { addDays, daysBetween, formatShortDayNL, mondayOfWeek, weekdayLongNL, formatWeekdayDateNL } from '../utils/dates';
import { countedTests, type TestResult } from './racePrediction';
import { manyStops } from './bestEffort';
import { hasRole, idIsTestOrRace } from './templateRoles';
import { templateSport } from './sports';
import { leaveDays, lightDays } from './leave';
import { freeDaysOfWeek, lockLevel, validateWeeks, type CheckInput, type Finding } from './weekValidator';
import { CONCERN_RULES } from './weekConcerns';
import { applyPlanChangeItems } from './proposalEngine';
import { weatherAdvice } from './weatherSwap';
import { restBackAdvice } from './restDayBack';
import { type AdviceInputs, type Advice, MAX_OPTIONS, proposal, leavesNextHardFresh, catchUpMinutes } from './adviceShared';
import { TEST_RUN_ID, testRunAdvice } from './adviceTestRun';
import { missedAdvice, skippedKeyAdvice, restSwapAdvice, restPullAdvice, extraSessionAdvice } from './adviceWeek';
import { tooHardAdvice, tooLightAdvice, injuryAdvice, strengthAdvice, spacingAdvice } from './adviceLoad';
import { restWeekSkipAdvice, repeatWeekAdvice, tentPackAdvice, targetTimeAdvice } from './adviceBlock';
import { morningAdvice } from './adviceMorning';
import { descentAdvice } from './descentClock';

// --- Rule TEST-RETRY ---------------------------------------------------------
// Trigger: the last test run (the last 21 days) has a fastest 5 km with more standing still than
// the app already calls "iets te gunstig" (engine/bestEffort.ts#manyStops), or it waits for your
// answer as a doubtful, slower test, and no other test is planned in the next 14 days.
// Rule: the first hard run (role hard_run) that falls at least 3 days after that test, within 10
// days from today, becomes a 5 km test on the same day. Without a day where that works: no advice.
// What stands in the way moves in the same proposal (decision 2026-10-28-nieuwe-testpoging-ruimte.md):
// leg strength to after the test, a long run or hard run of the day after to the next day where it
// fits (short when that week has a long run of its own), the smallest change first, up to three
// options. What you locked is never moved, only named.
// Always a proposal; Liever niet is not asked again for the same test (the id carries its date).
const RETRY_WINDOW_DAYS = 21;
const RETRY_AHEAD_DAYS = 10;
const RETRY_MIN_GAP_DAYS = 3;

const stoppedTime = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec) % 60).padStart(2, '0')}`;

function testRetryAdvice(inputs: AdviceInputs, templateById: Map<string, SessionTemplate>, usedIds: Set<string>, testRoom: Advice[]): Advice[] {
  if (inputs.newTestOnStops === false) return [];
  // TEST-MAKE-ROOM already speaks about a test: one voice for the same test.
  if (testRoom.length > 0) return [];
  if (activeIllness(inputs.illnessEpisodes) || recoveryRamp(inputs.illnessEpisodes, inputs.asOf)) return [];
  const test = templateById.get(TEST_RUN_ID);
  if (!test) return [];
  const today = inputs.asOf;
  const counted = countedTests(inputs.logs, { judgments: inputs.testJudgments, ask: inputs.askDoubtTest });
  const last = [...counted.tests, ...counted.waiting, ...counted.ignored].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  if (!last || counted.ignored.includes(last) || daysBetween(last.date, today) > RETRY_WINDOW_DAYS || daysBetween(last.date, today) < 0) return [];
  const stops = last.basis === 'effort' && manyStops(last);
  const doubt = counted.waiting.includes(last);
  if (!stops && !doubt) return [];

  const loggedIds = new Set(inputs.logs.map((l) => l.plannedSessionId));
  const open = (s: PlannedSession) => s.status !== 'skipped' && !loggedIds.has(s.id);
  // Another test already waiting in the next two weeks, or a race close by (that is the taper).
  if (inputs.plannedSessions.some((s) => open(s) && s.scheduledDate >= today && daysBetween(today, s.scheduledDate) <= 14 && idIsTestOrRace(s.templateId, templateById))) return [];

  const afterTest = addDays(last.date, RETRY_MIN_GAP_DAYS);
  const earliest = afterTest > addDays(today, 1) ? afterTest : addDays(today, 1);
  const latest = addDays(today, RETRY_AHEAD_DAYS);
  const levelOf = (s: PlannedSession) => lockLevel(s, loggedIds, today);
  const leaveMap = leaveDays(inputs.leave);
  const light = lightDays(inputs.leave, leaveMap);
  // The first question was answered: once more only when its retry did not happen (decision 2026-11-02-testloop-en-zware-benen.md).
  if (inputs.respondedIds.has(`retest:${last.date}`)) return retryAgainAdvice(inputs, templateById, usedIds, last, stops, (d) => { const kind = leaveMap.get(d)?.kind; return kind === 'off' || kind === 'trek' || light.has(d); });
  const ctx: RetryContext = {
    usedIds,
    easeId: legEaseCardSession({ mode: inputs.legEase, today, plannedSessions: inputs.plannedSessions, templates: inputs.templates, logs: inputs.logs, injuries: inputs.injuries, checkIns: inputs.checkIns })?.id,
    blocked: (d, heavy) => { const kind = leaveMap.get(d)?.kind; return kind === 'off' || kind === 'trek' || (heavy && light.has(d)); },
  };
  const hardRuns = inputs.plannedSessions
    .filter((s) => {
      const t = templateById.get(s.templateId);
      return !!t && hasRole(t, 'hard_run') && open(s) && levelOf(s) === 3 && s.scheduledDate >= earliest && s.scheduledDate <= latest && !isIllnessDay(s.scheduledDate, inputs.illnessEpisodes, today) && !ctx.blocked(s.scheduledDate, true);
    })
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.id.localeCompare(b.id));

  const plans = hardRuns.flatMap((s) => retryPlansFor(s, inputs, templateById, test, levelOf, ctx));
  // The smallest change wins; with equal cost the earlier day.
  const ranked = plans.sort((a, b) => a.cost - b.cost || a.found.scheduledDate.localeCompare(b.found.scheduledDate)).slice(0, MAX_OPTIONS);
  if (ranked.length === 0) return [];

  const was = stops
    ? `Je testloop van ${formatWeekdayDateNL(last.date)} had ${(last.stoppedSec ?? 0) > 60 ? `${stoppedTime(last.stoppedSec ?? 0)} stilstand` : `${last.stops} keer stilstand`}, dus hij is iets te gunstig.`
    : `Je testloop van ${formatWeekdayDateNL(last.date)} was duidelijk trager dan je vorige en wacht nog op je antwoord, dus hij telt nog niet mee.`;
  const longDay = weekdayLongNL(last.date);
  const dayName = `${longDay.charAt(0).toUpperCase()}${longDay.slice(1)}`;
  const shortDay = formatShortDayNL(last.date);
  const dayLabel = `${shortDay.charAt(0).toUpperCase()}${shortDay.slice(1)}`;
  const brief = stops
    ? `${dayLabel}: ${(last.stoppedSec ?? 0) > 60 ? stoppedTime(last.stoppedSec ?? 0) : `${last.stops} keer`} stilgestaan`
    : `${dayName} trager dan je vorige, wacht op je antwoord`;
  const tip = stops ? 'Kies een route zonder stoplichten en zet auto-pauze uit.' : 'Zorg dat je die dag uitgerust aan de start staat.';
  const why = 'De testloop is het meetpunt voor je tempo\'s en je voorspelde tijd. Een test met veel stilstaan of een dag die niet klopte geeft een tempo dat niet helemaal van jou is. Eén nieuwe poging op de plek van je eerstvolgende harde loop kost geen extra belasting: je traint niet meer, alleen anders. ASCEND zoekt de dag die het minst verandert. Staat er een zware beendag of de lange duurloop in de weg, dan schuift die mee naar een dag waar hij past, in hetzelfde voorstel. Wat jij zelf vastzette, schuift of laat ASCEND alleen gaan met jouw Akkoord, met de naam erbij. Eerst een voorstel, pas na Akkoord verandert er iets.';
  const nameOf = (x: PlannedSession) => templateById.get(x.templateId)?.name ?? 'Training';
  const isStrength = (x: PlannedSession) => templateById.get(x.templateId)?.type === 'strength';
  // A session you locked is named as yours; one an earlier proposal moved is said as such.
  const whose = (x: PlannedSession) => (levelOf(x) !== 1 ? '' : x.lock?.by === 'proposal' ? ', die al eerder verschoof,' : ', die je zelf vastzette,');
  const build = (plan: RetryPlan) => {
    const when = formatWeekdayDateNL(plan.found.scheduledDate);
    const title = `Nieuwe testpoging op ${when}`;
    const lower = (x: string) => `${x.charAt(0).toLowerCase()}${x.slice(1)}`;
    const short = (m: { minutes?: number }) => (m.minutes ? `, korter (${m.minutes} minuten)` : '');
    const lines = [
      ...plan.moves.map((m) => m.rest
        ? `${nameOf(m.session)} van ${formatWeekdayDateNL(m.session.scheduledDate)} doe je op ${formatWeekdayDateNL(m.to)} in plaats van je rustdag${short(m)}. De ${lower(nameOf(m.rest))} van die dag vervalt.`
        : `${nameOf(m.session)} van ${formatWeekdayDateNL(m.session.scheduledDate)}${whose(m.session)} gaat naar ${formatWeekdayDateNL(m.to)}${isStrength(m.session) ? ', na de test' : ''}${short(m)}.`),
      ...plan.moves.filter((m) => m.lightDrop).map((m) => `${nameOf(m.lightDrop!)} van ${formatWeekdayDateNL(m.lightDrop!.scheduledDate)} vervalt: dat wordt je rustdag.`),
      ...plan.dropped.map((l) => plan.longKept.has(l.id)
        ? `${nameOf(l)} van ${formatWeekdayDateNL(l.scheduledDate)} vervalt. Je houdt de ${lower(nameOf(plan.longKept.get(l.id)!))} van ${formatWeekdayDateNL(plan.longKept.get(l.id)!.scheduledDate)} in die week.`
        : plan.restLoss.includes(l.id)
        ? `${nameOf(l)} van ${formatWeekdayDateNL(l.scheduledDate)} vervalt deze keer: zo houd je die week een rustdag.`
        : `${nameOf(l)} van ${formatWeekdayDateNL(l.scheduledDate)}${whose(l)} laat je ${mondayOfWeek(l.scheduledDate) === mondayOfWeek(today) ? 'deze' : 'die'} week gaan, zodat je benen ${weekdayLongNL(plan.found.scheduledDate).toLowerCase()} fris zijn.`),
    ];
    const extra = lines.length > 0 ? ` ${lines.join(' ')}` : '';
    const effect = `${was} Met Akkoord wordt ${nameOf(plan.found)} op ${when} een testloop van 5 km.${extra} ${tip} Met Liever niet blijft alles staan en vraagt ASCEND er niet meer naar voor deze test.`;
    const by = ['engine/adviceEngine.ts', 'TEST-RETRY'];
    const items: PlanChangeItem[] = [
      ...plan.moves.flatMap((m): PlanChangeItem[] => [
        { plannedSessionId: m.session.id, action: 'move', fromDate: m.session.scheduledDate, toDate: m.to, plannedMinutes: m.minutes, reason: isStrength(m.session) ? 'Na de testpoging, zodat je benen fris zijn voor de testloop.' : 'De dag na een testloop blijft rustig.', generatedBy: by },
        ...(m.rest ? [{ plannedSessionId: m.rest.id, action: 'remove' as const, reason: 'Rustdag niet nodig: de dag ervoor staat dan geen training meer.', generatedBy: by }] : []),
        ...(m.lightDrop ? [{ plannedSessionId: m.lightDrop.id, action: 'remove' as const, reason: 'Zodat die week een rustdag houdt.', generatedBy: by }] : []),
      ]),
      ...plan.dropped.map((d): PlanChangeItem => ({ plannedSessionId: d.id, action: 'remove', reason: plan.longKept.has(d.id) ? 'Die week heeft al een eigen lange duurloop.' : plan.restLoss.includes(d.id) ? 'Zodat die week een rustdag houdt.' : 'Zodat je benen fris zijn voor de testloop.', generatedBy: by })),
      {
        plannedSessionId: plan.found.id, action: 'move', fromDate: plan.found.scheduledDate, toDate: plan.found.scheduledDate, templateId: TEST_RUN_ID, plannedMinutes: test.durationVariants.full,
        reason: stops ? 'Nieuwe testpoging: de vorige had veel stilstand.' : 'Nieuwe testpoging: de vorige telde nog niet.', generatedBy: by,
      },
    ];
    const label = `Testloop ${when}${plan.moves.length + plan.dropped.length > 0 ? `, ${[...plan.moves.map((m) => `${nameOf(m.session)} naar ${formatWeekdayDateNL(m.to)}`), ...plan.moves.filter((m) => m.lightDrop).map((m) => `${nameOf(m.lightDrop!)} vervalt`), ...plan.dropped.map((d) => `${nameOf(d)} vervalt`)].join(', ')}` : ''}`;
    return { title, effect, label, proposal: proposal(title, items, `${nameOf(plan.found)} op ${when} wordt een testloop van 5 km.${extra}`, why) };
  };
  const built = ranked.map(build);
  const [first] = built;
  return [{
    id: `retest:${last.date}`, trigger: 'plan_update', ruleId: 'TEST-RETRY', title: first.title, effect: first.effect, lead: was, brief, tip, why, priority: 2, relatedLogId: last.logId,
    proposal: first.proposal,
    options: built.length > 1 ? built.map((b) => ({ label: b.label, effect: b.effect, proposal: b.proposal })) : undefined,
  }];
}

// --- TEST-RETRY once more -----------------------------------------------------
// Trigger: the retry TEST-RETRY placed (an accepted proposal, `AdviceInputs.retryRows`) was skipped or
// missed and has no log, and the test it was for still asks for a new attempt. A skipped retry is not a
// retry that was done. Rule: one new day for that same row, through the search of a missed test (fresh
// legs, 48 hours after heavy legs, the day after stays easy), never on a holiday, trek or light day or
// an illness day, and nothing you locked yourself moves or goes for it. Effect: a proposal with Akkoord;
// Liever niet keeps it quiet until a new test is logged (the id carries the date of the test).
function retryAgainAdvice(inputs: AdviceInputs, templateById: Map<string, SessionTemplate>, usedIds: Set<string>, last: TestResult, stops: boolean, blocked: (date: string) => boolean): Advice[] {
  const today = inputs.asOf;
  const id = `retest:${last.date}:opnieuw`;
  if (inputs.respondedIds.has(id) || !inputs.retryRows || inputs.retryRows.size === 0) return [];
  const loggedIds = new Set(inputs.logs.map((l) => l.plannedSessionId));
  const row = inputs.plannedSessions
    .filter((s) => inputs.retryRows!.has(s.id) && s.templateId === TEST_RUN_ID && s.scheduledDate > last.date && !loggedIds.has(s.id) && (s.status === 'skipped' || s.scheduledDate < today))
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))[0];
  if (!row) return [];
  const when = formatWeekdayDateNL(row.scheduledDate);
  const shortDay = formatShortDayNL(row.scheduledDate);
  const was = stops
    ? `Je testloop van ${formatWeekdayDateNL(last.date)} had ${(last.stoppedSec ?? 0) > 60 ? `${stoppedTime(last.stoppedSec ?? 0)} stilstand` : `${last.stops} keer stilstand`}, dus hij is iets te gunstig.`
    : `Je testloop van ${formatWeekdayDateNL(last.date)} was duidelijk trager dan je vorige en wacht nog op je antwoord, dus hij telt nog niet mee.`;
  const lead = `${was} De herkansing van ${when} ging niet door.`;
  const tip = stops ? 'Kies een route zonder stoplichten en zet auto-pauze uit.' : 'Zorg dat je die dag uitgerust aan de start staat.';
  const why = `De testloop is het meetpunt voor je tempo's en je voorspelde tijd. Een herkansing die niet doorging is geen herkansing die gedaan is, daarom vraagt ASCEND het nog één keer. Hij zoekt een dag met frisse benen, minstens ${testRestHours()} uur na een zware loop- of beendag, buiten je vakanties en tochten. Wat jij zelf vastzette, blijft staan. Eerst een voorstel, pas na Akkoord verandert er iets.`;
  const yours = (s: PlannedSession) => lockLevel(s, loggedIds, today) === 1;
  const easeId = legEaseCardSession({ mode: inputs.legEase, today, plannedSessions: inputs.plannedSessions, templates: inputs.templates, logs: inputs.logs, injuries: inputs.injuries, checkIns: inputs.checkIns })?.id;
  const taken = (s: PlannedSession) => usedIds.has(s.id) || s.id === easeId;
  // Only a way whose end state gives nothing new about the sessions it touches (decision 2026-10-28-voorstel-eindstand.md).
  const found = testRunAdvice(inputs, templateById, usedIds, undefined, { row, id, title: `Je herkansing van ${when} ging niet door`, why, blocked, yours, taken })
    .filter((a) => a.proposal)
    .flatMap((a): Advice[] => {
      const ways = (a.options ?? [{ label: '', effect: a.effect, proposal: a.proposal! }]).filter((o) => !newConcernsOfItems(o.proposal.changes, inputs));
      if (ways.length === 0) return [];
      return [{ ...a, effect: ways[0].effect, proposal: ways[0].proposal, options: ways.length > 1 ? ways : undefined }];
    });
  const wrap = (effect: string) => `${lead} ${effect.replace(/^Doe hem /, 'Doe de nieuwe test ')} ${tip} Met Liever niet blijft alles staan en vraagt ASCEND er niet meer naar, tot je een nieuwe test logt.`;
  return found.map((a) => ({
    ...a, lead, tip, priority: 2, relatedLogId: last.logId,
    brief: `${shortDay.charAt(0).toUpperCase()}${shortDay.slice(1)}: herkansing ging niet door`,
    effect: wrap(a.effect),
    options: a.options?.map((o) => ({ ...o, effect: wrap(o.effect) })),
  }));
}

// The rows an accepted TEST-RETRY proposal made a test: the item that gave a row the template of the test
// run. Read from the stored proposals; a proposal that was undone does not count.
export function retryTestRows(log: readonly PlanChangeProposal[]): Set<string> {
  const reverted = new Set(log.map((p) => p.revertsProposalId).filter((x): x is string => !!x));
  const out = new Set<string>();
  for (const p of log) {
    if (p.resolution !== 'accepted' || reverted.has(p.id)) continue;
    for (const c of p.changes) if (c.plannedSessionId && c.templateId === TEST_RUN_ID && c.generatedBy?.includes('TEST-RETRY')) out.add(c.plannedSessionId);
  }
  return out;
}

// One way to make a hard run the new test: what has to give way for it, and what that costs.
interface RetryPlan {
  found: PlannedSession;
  cost: number;
  // `lightDrop`: the lightest training of that week, let go so the week keeps a rest day.
  moves: { session: PlannedSession; to: string; minutes?: number; rest?: PlannedSession; lightDrop?: PlannedSession }[];
  // Heavy leg strength that goes in this proposal (with Akkoord) when it cannot move to after the test.
  dropped: PlannedSession[];
  // Ids in `dropped` that go because moving them would cost the week its last rest day.
  restLoss: string[];
  // A long run in `dropped` that goes because the week it would move to has a long run of its own: that one stays
  // (docs/beslissingen/2026-11-02-lange-duurloop-vervalt.md). Dropped id to the long run that stays.
  longKept: Map<string, PlannedSession>;
}

interface RetryContext {
  usedIds: Set<string>;
  easeId?: string;
  // A holiday or trek day, or a light day around a trek: nothing hard goes there (heavy: the session is hard, heavy for the legs or long).
  blocked: (date: string, heavy: boolean) => boolean;
}

// The test replaces `found` on its own day. Whatever the spacing rules (the same as TEST-MAKE-ROOM)
// find in the way moves in the same proposal: a long run or another hard run of the day after to the
// next day where it fits (short when that week has a long run of its own, as in a catch-up), and
// heavy leg strength to after the test (0 to 3 days after it), processed last so a day that frees up
// counts. A session you locked, a logged one or a race is never moved by itself: a leg day you
// locked is offered a move to after the test with your Akkoord (the proposal names it), with
// letting it go as the second option; anything else of yours in the way makes this day no candidate.
// The end state is judged by the leg index on the test day against the same line as TEST-FRESH (the
// week check) and TEST-MAKE-ROOM (FATIGUE_THRESHOLDS.test.fresh), so the proposal and the rules never
// contradict. Heavy leg strength that adds to the index moves first and only goes when it cannot
// move; a day where even that does not help is no candidate. Letting go weighs more than moving, and
// anything of yours weighs more than the system's own.
function retryPlansFor(found: PlannedSession, inputs: AdviceInputs, templateById: Map<string, SessionTemplate>, test: SessionTemplate, levelOf: (s: PlannedSession) => number, ctx: RetryContext): RetryPlan[] {
  const today = inputs.asOf;
  const date = found.scheduledDate;
  const loggedIds = new Set(inputs.logs.map((l) => l.plannedSessionId));
  const base = inputs.plannedSessions.filter((o) => o.id !== found.id && o.status !== 'skipped' && (o.scheduledDate >= today || loggedIds.has(o.id)));
  const testAt: PlannedSession = { ...found, templateId: TEST_RUN_ID, status: 'planned' };
  const isHeavyFor = (t: SessionTemplate) => t.type !== 'recovery' && !(t.type === 'strength' && !isLegHeavyTemplate(t));
  const legStrength = (t: SessionTemplate) => t.type === 'strength' && isLegHeavyTemplate(t);
  const stuck: PlannedSession[] = [];
  const toMove: PlannedSession[] = [];
  for (const b of findHeavyConflicts(found.id, test, date, base, templateById, inputs.logs)) {
    const t = templateById.get(b.templateId);
    if (!t) return [];
    const level = levelOf(b);
    if (level === 3) toMove.push(b);
    else if (level === 1 && legStrength(t) && b.scheduledDate < date) stuck.push(b);
    else return [];
  }
  // Long runs and hard runs first, leg strength last.
  toMove.sort((a, b) => Number(legStrength(templateById.get(a.templateId)!)) - Number(legStrength(templateById.get(b.templateId)!)));
  const restDates = new Set(base.filter((o) => templateById.get(o.templateId)?.type === 'recovery' && !loggedIds.has(o.id)).map((o) => o.scheduledDate));
  const limit = FATIGUE_THRESHOLDS.test.fresh;

  // `ban`: session@day pairs the end-state check found to give a new concern; the search takes another day.
  const attempt = (lockedMode: 'move' | 'remove', ban: Set<string>): RetryPlan | undefined => {
    let state: PlannedSession[] = [...base, testAt];
    const moves: RetryPlan['moves'] = [];
    const dropped: PlannedSession[] = [];
    const restLoss = new Set<string>();
    const longKept = new Map<string, PlannedSession>();
    let restBlocked = false;
    // The long run of the week a long run would move to (role long and the same sport), when there is one.
    let longTwin: PlannedSession | undefined;
    const ownLongOf = (s: PlannedSession, t: SessionTemplate, d: string, others: PlannedSession[]) => {
      if (!hasRole(t, 'long')) return undefined;
      const sport = templateSport(t);
      return others.find((o) => {
        const ot = templateById.get(o.templateId);
        return o.id !== s.id && o.id !== found.id && o.status !== 'skipped' && mondayOfWeek(o.scheduledDate) === mondayOfWeek(d) && !!ot && hasRole(ot, 'long') && templateSport(ot) === sport;
      });
    };
    const weekOf = (d: string, without: string) => state.filter((o) => o.id !== without && mondayOfWeek(o.scheduledDate) === mondayOfWeek(d));
    const drop = (s: PlannedSession) => { dropped.push(s); state = state.filter((o) => o.id !== s.id); };
    // The first day after the test (0 to 3 for leg strength) where the session fits, the same building blocks as TEST-MAKE-ROOM.
    // A rest day is a day of the week without training (a recovery walk counts as rest), the same notion as
    // the REST-DAY rule and the rest day swap. A move may take the last rest day of a week only when the
    // same proposal lets the lightest training of that week go (decision 2026-10-28-nieuwe-testpoging-rustdag.md).
    const hasRest = (list: PlannedSession[], anyDay: string) => freeDaysOfWeek(anyDay, list, inputs.logs, templateById).length > 0;
    const lightestToDrop = (list: PlannedSession[], anyDay: string, except: string[]): PlannedSession | undefined => {
      const rank = (o: PlannedSession) => {
        const t = templateById.get(o.templateId);
        if (!t || t.type === 'recovery' || levelOf(o) !== 3 || o.scheduledDate <= today || loggedIds.has(o.id)) return undefined;
        if (except.includes(o.id) || ctx.usedIds.has(o.id) || o.id === ctx.easeId) return undefined;
        if (hasRole(t, 'long') || hasRole(t, 'key') || hasRole(t, 'hard_run') || hasRole(t, 'hard_load') || hasRole(t, 'ask_legs') || hasRole(t, 'test') || hasRole(t, 'race') || isLegHeavyTemplate(t)) return undefined;
        // Only a training that stands alone on its day gives that day back as a rest day.
        if (list.some((x) => x.id !== o.id && x.scheduledDate === o.scheduledDate && templateById.get(x.templateId)?.type !== 'recovery')) return undefined;
        return hasRole(t, 'easy_pace') ? 0 : 1;
      };
      return list
        .filter((o) => mondayOfWeek(o.scheduledDate) === mondayOfWeek(anyDay) && rank(o) !== undefined)
        .sort((a, b) => rank(a)! - rank(b)! || (templateById.get(a.templateId)?.durationVariants.full ?? 0) - (templateById.get(b.templateId)?.durationVariants.full ?? 0) || a.scheduledDate.localeCompare(b.scheduledDate))[0];
    };
    const tryMove = (s: PlannedSession): boolean => {
      restBlocked = false;
      longTwin = undefined;
      const t = templateById.get(s.templateId)!;
      const strength = t.type === 'strength';
      const others = state.filter((o) => o.id !== s.id);
      // A heavy leg day goes first to a day the legs can carry it (the line of the quiet note when you move one yourself);
      // only when no such day fits it goes to a tired one, as before, and the note in the sheet says so.
      const calm = (off: number) => freshnessAt(addDays(date, off), others, templateById, inputs.logs).index <= LEG_EASE_INDEX;
      const targets = strength ? (isLegHeavyTemplate(t) ? [0, 1, 2, 3].sort((x, y) => Number(!calm(x)) - Number(!calm(y))) : [1, -1, 2, -2, 3]) : [2, 3, 4, 5, 6, 7];
      // First a day that keeps the rest day of its week; only then one that costs it, with the lightest training let go.
      for (const letGo of [false, true]) for (const off of targets) {
        const d = addDays(date, off);
        if (d <= today || d === s.scheduledDate || ban.has(`${s.id}@${d}`) || (strength && restDates.has(d)) || isIllnessDay(d, inputs.illnessEpisodes, today) || ctx.blocked(d, isHeavyFor(t))) continue;
        // A long run never moves into a week that has a long run of its own: then it goes instead (below).
        const twin = ownLongOf(s, t, d, others);
        if (twin) { longTwin ??= twin; continue; }
        if (!respectsHeavySpacing(d, t, others, templateById, inputs.logs, s.id) || !leavesNextHardFresh(inputs, templateById, d, s, others)) continue;
        const week = weekOf(d, s.id);
        // The day budget counts the length the session will have there (short in a week with a long training of its own).
        const minutes = strength ? undefined : catchUpMinutes(s, t, d, inputs, templateById);
        const candidate = minutes ? { ...t, durationVariants: { ...t.durationVariants, full: minutes } } : t;
        let rest: PlannedSession | undefined;
        if (!dayHasRoomFor(d, candidate, week, templateById, inputs.program, inputs.dailyTimeBudget, inputs.sameDayPairingPreference)) {
          if (strength) continue;
          // A recovery walk on that day gives way when nothing else stands on the day before.
          const there = others.filter((o) => o.scheduledDate === d);
          rest = there.length === 1 && templateById.get(there[0].templateId)?.type === 'recovery' && levelOf(there[0]) === 3 ? there[0] : undefined;
          const dayBefore = addDays(d, -1);
          const dayBeforeEmpty = !others.some((o) => o.scheduledDate === dayBefore && templateById.get(o.templateId)?.type !== 'recovery') && !inputs.logs.some((l) => l.completedDate === dayBefore);
          if (!rest || !dayBeforeEmpty || !dayHasRoomFor(d, candidate, week.filter((o) => o.id !== rest?.id), templateById, inputs.program, inputs.dailyTimeBudget, inputs.sameDayPairingPreference)) continue;
        }
        const movedTo: PlannedSession = { ...s, scheduledDate: d, weekStartDate: mondayOfWeek(d), ...(minutes ? { plannedMinutes: minutes } : {}) };
        let next = [...others.filter((o) => o.id !== rest?.id), movedTo];
        let lightDrop: PlannedSession | undefined;
        if (hasRest(others, d) && !hasRest(next, d)) {
          restBlocked = true;
          if (!letGo) continue;
          lightDrop = lightestToDrop(next, d, [found.id, s.id]);
          if (!lightDrop) continue;
          next = next.filter((o) => o.id !== lightDrop?.id);
        } else if (letGo) continue;
        moves.push({ session: s, to: d, minutes, rest, lightDrop });
        state = next;
        return true;
      }
      return false;
    };

    for (const s of toMove) {
      if (tryMove(s)) continue;
      // A long run with no day left outside a week with a long run of its own: it goes, and that week keeps its own.
      const twin = longTwin;
      if (twin && levelOf(s) === 3) { drop(s); longKept.set(s.id, twin); continue; }
      // Leg strength before the test with no place after it can only go (with Akkoord).
      if (legStrength(templateById.get(s.templateId)!) && s.scheduledDate < date) { drop(s); continue; }
      // No day without costing the week its rest day: this time it goes, rather than the rest day.
      if (restBlocked && levelOf(s) === 3) { drop(s); restLoss.add(s.id); continue; }
      return undefined;
    }
    // What you locked and stands in the way of the spacing: moved with your Akkoord, or let go as the second option.
    for (const s of stuck) {
      if (lockedMode === 'move' && tryMove(s)) continue;
      drop(s);
    }

    // The end state without the test row itself.
    const judge = () => {
      const sessions = state.filter((o) => o.id !== found.id);
      return {
        conflicts: findHeavyConflicts(found.id, test, date, sessions, templateById, inputs.logs),
        index: freshnessAt(date, sessions, templateById, inputs.logs),
        room: dayHasRoomFor(date, test, sessions.filter((o) => mondayOfWeek(o.scheduledDate) === mondayOfWeek(date)), templateById, inputs.program, inputs.dailyTimeBudget, inputs.sameDayPairingPreference),
      };
    };
    // Heavy leg strength that adds most to the index moves to after the test first; it only goes when it cannot.
    let now = judge();
    for (const c of now.index.contributions) {
      if (now.index.index <= limit) break;
      if (c.logged) continue;
      const s = state.find((o) => o.id === c.id);
      const t = s && templateById.get(s.templateId);
      if (!s || !t || !legStrength(t) || s.scheduledDate < today || loggedIds.has(s.id) || s.scheduledDate >= date) continue;
      const level = levelOf(s);
      if (level !== 3 && level !== 1) continue;
      if (!(level === 3 || lockedMode === 'move') || !tryMove(s)) drop(s);
      now = judge();
    }
    if (!now.room || now.index.index > limit || now.conflicts.length > 0) return undefined;
    const touched = [found.id, ...moves.flatMap((m) => [m.session.id, ...(m.rest ? [m.rest.id] : []), ...(m.lightDrop ? [m.lightDrop.id] : [])]), ...dropped.map((d) => d.id)];
    if (!touched.every((id) => !ctx.usedIds.has(id) && id !== ctx.easeId)) return undefined;
    const own = (s: PlannedSession) => levelOf(s) === 1;
    const cost = moves.reduce((n, m) => n + (own(m.session) ? 3 : 2) + (m.rest ? 1 : 0) + (m.lightDrop ? 2 : 0), 0) + dropped.reduce((n, d) => n + (own(d) ? 8 : 5), 0);
    return { found, moves, dropped, cost, restLoss: [...restLoss], longKept };
  };

  // The proposal tests its own end state with the rules of the rest of the app. A plan that gives a new
  // concern about a session it moved is tried again with another day for that session; nothing left, no plan.
  const checked = (mode: 'move' | 'remove'): RetryPlan | undefined => {
    const ban = new Set<string>();
    for (let round = 0; round < 6; round++) {
      const plan = attempt(mode, ban);
      if (!plan) return undefined;
      const hit = newConcernIds(plan, inputs, test);
      if (!hit) return plan;
      const culprits = plan.moves.filter((m) => hit.has(m.session.id));
      const bans = culprits.length > 0 ? culprits : plan.moves;
      if (bans.length === 0) return undefined;
      for (const m of bans) ban.add(`${m.session.id}@${m.to}`);
    }
    return undefined;
  };
  const first = checked('move');
  const plans = first ? [first] : [];
  // A leg day you locked that moved also gets the plan where it goes instead, as the second option.
  if (!first || first.moves.some((m) => levelOf(m.session) === 1)) {
    const second = checked('remove');
    if (second) plans.push(second);
  }
  return plans;
}

// The plan as Akkoord leaves it: the same items the proposal carries, applied the way commitPlanChange does.
function endStateOf(plan: RetryPlan, inputs: AdviceInputs, test: SessionTemplate): PlannedSession[] {
  const items: PlanChangeItem[] = [
    ...plan.moves.flatMap((m): PlanChangeItem[] => [
      { plannedSessionId: m.session.id, action: 'move', fromDate: m.session.scheduledDate, toDate: m.to, plannedMinutes: m.minutes, reason: '', generatedBy: [] },
      ...(m.rest ? [{ plannedSessionId: m.rest.id, action: 'remove' as const, reason: '', generatedBy: [] }] : []),
      ...(m.lightDrop ? [{ plannedSessionId: m.lightDrop.id, action: 'remove' as const, reason: '', generatedBy: [] }] : []),
    ]),
    ...plan.dropped.map((d): PlanChangeItem => ({ plannedSessionId: d.id, action: 'remove', reason: '', generatedBy: [] })),
    { plannedSessionId: plan.found.id, action: 'move', fromDate: plan.found.scheduledDate, toDate: plan.found.scheduledDate, templateId: TEST_RUN_ID, plannedMinutes: test.durationVariants.full, reason: '', generatedBy: [] },
  ];
  let n = 0;
  return applyPlanChangeItems(items, inputs.plannedSessions, () => `end-state-${n++}`, { by: 'proposal', at: `${inputs.asOf}T00:00:00.000Z` }).sessions;
}

// The sessions a new advice or a new finding of the week check is about, on the end state of the plan, when it
// touches a session the proposal touches (undefined when there is nothing new). Akkoord must not be followed by a
// second proposal about the same sessions (docs/beslissingen/2026-10-28-voorstel-eindstand.md). Only what is new
// counts, so a concern that was already there before the proposal does not block it.
const adviceBeforeCache = new WeakMap<AdviceInputs, Set<string>>();
function newConcernIds(plan: RetryPlan, inputs: AdviceInputs, test: SessionTemplate): Set<string> | undefined {
  const touched = new Set([plan.found.id, ...plan.moves.flatMap((m) => [m.session.id, m.rest?.id, m.lightDrop?.id]), ...plan.dropped.map((d) => d.id)].filter((id): id is string => !!id));
  return newConcernsOfEnd(endStateOf(plan, inputs, test), touched, inputs);
}

// The same check for a proposal as it stands: its items applied the way Akkoord applies them.
function newConcernsOfItems(items: PlanChangeItem[], inputs: AdviceInputs): Set<string> | undefined {
  const touched = new Set(items.map((c) => c.plannedSessionId).filter((id): id is string => !!id));
  let n = 0;
  const end = applyPlanChangeItems(items, inputs.plannedSessions, () => `end-state-${n++}`, { by: 'proposal', at: `${inputs.asOf}T00:00:00.000Z` }).sessions;
  return newConcernsOfEnd(end, touched, inputs);
}

function newConcernsOfEnd(end: PlannedSession[], touched: Set<string>, inputs: AdviceInputs): Set<string> | undefined {
  const hit = new Set<string>();
  const idsOf = (a: Advice) => [a.proposal, ...(a.options?.map((o) => o.proposal) ?? [])].flatMap((p) => p?.changes.map((c) => c.plannedSessionId).filter((id): id is string => !!id) ?? []);
  // The advice on the plan as it is now is the same for every candidate of this run: worked out once.
  let before = adviceBeforeCache.get(inputs);
  if (!before) {
    before = new Set(computeAdvice({ ...inputs, noRetry: true }).map((a) => a.id));
    adviceBeforeCache.set(inputs, before);
  }
  for (const a of computeAdvice({ ...inputs, plannedSessions: end, noRetry: true })) {
    const ids = idsOf(a);
    if (!before.has(a.id) && ids.some((id) => touched.has(id))) for (const id of ids) hit.add(id);
  }
  const check = (sessions: PlannedSession[]): CheckInput => ({
    sessions, logs: inputs.logs, templates: inputs.templates, today: inputs.asOf, restDay: inputs.extraSession?.restDay, program: inputs.program,
    dailyTimeBudget: inputs.dailyTimeBudget, sameDayPairingPreference: inputs.sameDayPairingPreference, leave: inputs.leave, reportYours: true,
  });
  const weeks = new Set(end.filter((s) => touched.has(s.id)).map((s) => mondayOfWeek(s.scheduledDate)));
  const keyOf = (f: Finding) => `${f.rule}:${[...f.sessionIds].sort().join(',')}`;
  const known = new Set(validateWeeks(check(inputs.plannedSessions), weeks).map(keyOf));
  for (const f of validateWeeks(check(end), weeks)) {
    if (CONCERN_RULES.includes(f.rule) && f.sessionIds.some((id) => touched.has(id)) && !known.has(keyOf(f))) for (const id of f.sessionIds) hit.add(id);
  }
  return hit.size > 0 ? hit : undefined;
}

export function computeAdvice(inputs: AdviceInputs): Advice[] {
  const templateById = new Map(inputs.templates.map((t) => [t.id, t]));
  // A catch-up you declined leaves the rest day free for the swap.
  const missed = missedAdvice(inputs, templateById).filter((a) => !inputs.respondedIds.has(a.id));
  const usedIds = new Set(missed.flatMap((a) => a.proposal?.changes.map((c) => c.plannedSessionId).filter((id): id is string => !!id) ?? []));
  // Eén inhaal per keer over beide regels: stelt MISSED-CATCH-UP al een inhaal voor, dan geen tweede via de rustdag
  // (twee voorstellen die elk kloppen, maar samen hard naast hard zetten; Warden, 11 november).
  const missedMoves = missed.some((a) => a.proposal?.changes.some((c) => c.action === 'move'));
  const skippedKey = missedMoves ? [] : skippedKeyAdvice(inputs, templateById, usedIds).filter((a) => !inputs.respondedIds.has(a.id));
  for (const id of skippedKey.flatMap((a) => a.proposal?.changes.map((c) => c.plannedSessionId) ?? [])) if (id) usedIds.add(id);
  const testRoom = testRunAdvice(inputs, templateById, usedIds).filter((a) => !inputs.respondedIds.has(a.id));
  const fresh = (list: Advice[]) => list.filter((a) => !inputs.respondedIds.has(a.id));
  const restSwap = restSwapAdvice(inputs, templateById, usedIds);
  const restPull = restPullAdvice(inputs, templateById, usedIds);
  const tooHard = tooHardAdvice(inputs, templateById);
  const tooLight = tooLightAdvice(inputs, templateById);
  const injury = injuryAdvice(inputs, templateById);
  const strength = strengthAdvice(inputs, templateById);
  const spacing = spacingAdvice(inputs, templateById);
  const extraSession = extraSessionAdvice(inputs, templateById);
  const restWeekSkip = restWeekSkipAdvice(inputs);
  const repeatWeek = repeatWeekAdvice(inputs);
  const tentPack = tentPackAdvice(inputs);
  const targetTime = targetTimeAdvice(inputs);
  const weather = weatherAdvice(inputs, templateById);
  const morning = morningAdvice(inputs, templateById);
  // Een rustdag die een voorstel liet vervallen en die weer leeg is: terug, met Akkoord (engine/restDayBack.ts).
  const restBack = restBackAdvice({
    plannedSessions: inputs.plannedSessions, logs: inputs.logs, templates: inputs.templates, today: inputs.asOf,
    restDay: inputs.restDay ?? inputs.extraSession?.restDay, anchor: inputs.extraSession?.anchor, leave: inputs.leave,
    illnessEpisodes: inputs.illnessEpisodes, on: inputs.restDayBack, keyFocus: inputs.keyFocus,
  });
  // TEST-RETRY touches no session that already stands in another proposal.
  const retryUsed = new Set(usedIds);
  for (const a of fresh([...restSwap, ...restPull, ...tooHard, ...tooLight, ...injury, ...strength, ...spacing, ...extraSession, ...restWeekSkip, ...repeatWeek, ...tentPack, ...targetTime, ...weather, ...morning, ...restBack])) {
    for (const p of [a.proposal, ...(a.options?.map((o) => o.proposal) ?? [])]) for (const c of p?.changes ?? []) if (c.plannedSessionId) retryUsed.add(c.plannedSessionId);
  }
  const retry = inputs.noRetry ? [] : testRetryAdvice(inputs, templateById, retryUsed, testRoom);
  // Inhalen gaat voor (docs/beslissingen/2026-11-01-rustdag-na-rust.md): zet een inhaalvoorstel iets op de dag
  // waar REST-BACK de rustdag terug wil, dan komt REST-BACK niet.
  const catchUpDays = new Set(fresh([...missed, ...skippedKey, ...testRoom, ...retry]).flatMap((a) => [a.proposal, ...(a.options?.map((o) => o.proposal) ?? [])])
    .flatMap((p) => p?.changes.filter((c) => c.action !== 'remove').map((c) => c.toDate ?? c.newSessionDraft?.scheduledDate) ?? []));
  const restBackLeft = restBack.filter((a) => !a.proposal?.changes.some((c) => c.toDate && catchUpDays.has(c.toDate)));
  // Alles behalve de afdaalklok, zoals het straks teruggaat: één lijst, zodat de afdaalklok dezelfde voorstellen ziet
  // als de gebruiker.
  const rest = [
    ...missed,
    ...skippedKey,
    ...testRoom,
    ...restSwap,
    ...restPull,
    ...tooHard,
    ...tooLight,
    ...injury,
    ...strength,
    ...spacing,
    ...extraSession,
    ...restWeekSkip,
    ...repeatWeek,
    ...tentPack,
    ...targetTime,
    ...retry,
    ...weather,
    ...morning,
    ...restBackLeft,
  ].filter((a) => !inputs.respondedIds.has(a.id));
  // De afdaalklok komt als laatste en wijkt voor alles: geen trapsessie op of naast een dag waar een ander
  // voorstel van vandaag iets neerzet (twee voorstellen die elk kloppen, maar samen botsen).
  const takenDays = new Set(rest.flatMap((a) => [a.proposal, ...(a.options?.map((o) => o.proposal) ?? [])])
    .flatMap((p) => p?.changes.filter((c) => c.action !== 'remove').map((c) => c.toDate ?? c.newSessionDraft?.scheduledDate) ?? []).filter((d): d is string => !!d));
  const descent = descentAdvice({
    today: inputs.asOf, logs: inputs.logs, plannedSessions: inputs.plannedSessions, templates: inputs.templates, context: inputs.descentClock,
    respondedIds: inputs.respondedIds, answeredOn: inputs.answeredOn, leave: inputs.leave, illnessEpisodes: inputs.illnessEpisodes,
    restDay: inputs.restDay ?? inputs.extraSession?.restDay, taken: takenDays, keyFocus: inputs.keyFocus,
    program: inputs.program, dailyTimeBudget: inputs.dailyTimeBudget, sameDayPairingPreference: inputs.sameDayPairingPreference,
  }).filter((a) => !inputs.respondedIds.has(a.id));
  return [...rest, ...descent].sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
}
