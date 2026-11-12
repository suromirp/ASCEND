// Advies, het weer, de widget, de weekmelding, slepen en ruilen, en het voorstel na wat er speelde.

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { resolveGrowthChoice } from '../data/goalGrowth';
import type { Program } from '../models/program';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { TrainingGoal, GoalMilestone } from '../models/goals';
import type { InjuryNote } from '../models/injury';
import type { GoalEngineConfig } from '../models/goalEngineConfig';
import type { AppSettings } from '../storage/database';
import { tentPackProposal } from '../engine/gr5Profile';
import type { ResolvedMissedMemory } from '../engine/missedTraining';
import { legsCloseAfterMove, newConcernLines, type DragContext, type MoveDecision } from '../engine/weekDrag';
import { checkSwap, decideSwap, legsCloseAfterSwap, swapOptions, type SwapOption } from '../engine/weekSwap';
import { computeAdvice, retryTestRows, type Advice } from '../engine/adviceEngine';
import { resolveLegEase } from '../engine/legEaseSettings';
import { influenceMove, influenceMoveCause } from '../engine/influenceProposal';
import { useWeatherForecast } from './useWeather';
import { useFollowLocation } from './useFollowLocation';
import { widgetSummary } from '../engine/widgetSummary';
import { writeWidgetSummary } from '../integrations/widgetBridge';
import type { PlanChangeProposal } from '../models/planChange';
import type { GoalOverview } from '../engine/goalOverview';
import { mondayOfWeek, todayISO } from '../utils/dates';
import { resolveVariantDuration } from '../engine/substitutions';
import { patternDays } from '../engine/planPass';
import { markKept, resolveWeekAfterChoice } from '../engine/weekKept';
import { adviceSessionIds, weekNotice, weekNoticeConcerns, type WeekNotice } from '../engine/weekFixProposal';
import { declinedRules, learnFromDeclines, type StoredResponse } from '../engine/learning';
import { planEndDay } from '../engine/programLayout';
import { planDirection } from '../engine/direction';
import { noGoalWavesAdvice } from '../engine/noGoalWaves';
import { rankFocusGaps } from '../engine/extraRun';
import { raceBlocks, afterGoalWindows } from '../engine/raceBlock';
import { needsWeather, showWeatherSwap } from '../engine/overviewSettings';
import { mainGoal } from '../engine/mainGoal';
import { keyFocusOf } from '../engine/keySession';
import { answeredDays, descentClockContext } from '../engine/descentClock';
import { fullWeekFollowed, fullWeekId, fullWeekLine, resolveFullWeekAsk } from '../engine/fullWeek';

export function useAdviceAndWeek(deps: {
  loading: boolean;
  program: Program | null;
  plannedSessions: PlannedSession[];
  sessionLogs: SessionLog[];
  trainingGoals: TrainingGoal[];
  goalMilestones: GoalMilestone[];
  injuryNotes: InjuryNote[];
  goalEngineConfig: GoalEngineConfig;
  settings: AppSettings;
  templates: SessionTemplate[];
  planChangeLog: PlanChangeProposal[];
  adviceResponses: Record<string, StoredResponse>;
  missedMemory: ResolvedMissedMemory | null;
  plannerAdvice: Advice | null;
  templateById: Map<string, SessionTemplate>;
  goalOverviews: GoalOverview[];
  dragContextFor: (weekStart: string) => DragContext;
  updateSettings: (patch: Partial<AppSettings>) => Promise<AppSettings>;
}) {
  const { loading, program, plannedSessions, sessionLogs, trainingGoals, goalMilestones, injuryNotes, goalEngineConfig, settings, templates, planChangeLog, adviceResponses, missedMemory, plannerAdvice, templateById, goalOverviews, dragContextFor, updateSettings } = deps;
  // What the extra training of the week is chosen from (engine/extraRun.ts).
  const extraSessionContext = useMemo(() => {
    const today = todayISO();
    const anchor = planEndDay(trainingGoals, goalMilestones, today, settings.afterMainGoal);
    const ladder = new Set(goalMilestones.map((m) => m.goalId));
    const mainGoalId = mainGoal(trainingGoals, ladder)?.id;
    return {
      gaps: rankFocusGaps(goalOverviews),
      races: raceBlocks(trainingGoals, mainGoalId, anchor, today),
      ambition: settings.ambition,
      anchor,
      restDay: settings.restDay,
      planChangeLog,
      leave: settings.leavePeriods,
    };
  }, [trainingGoals, goalMilestones, goalOverviews, settings.ambition, settings.restDay, settings.leavePeriods, settings.afterMainGoal, planChangeLog]);

  const weather = useWeatherForecast(settings.homeLocation, !loading && needsWeather(settings.overviews));
  useFollowLocation(settings, updateSettings, !loading);

  // De widget op het startscherm van de Android-app (engine/widgetSummary.ts): na elke wijziging
  // van de planning en bij terugkeer in de app opnieuw; op het web doet dit niets.
  useEffect(() => {
    if (loading) return;
    const write = () =>
      writeWidgetSummary(widgetSummary({ today: todayISO(), sessions: plannedSessions, logs: sessionLogs, templateById, program, leavePeriods: settings.leavePeriods, illnessEpisodes: settings.illnessEpisodes }));
    write();
    const onVisible = () => {
      if (document.visibilityState === 'visible') write();
    };
    document.addEventListener('visibilitychange', onVisible);
    // Blijft de app open over middernacht, dan klopt de dag van de samenvatting niet meer.
    let timer: number | undefined;
    const arm = () => {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
      timer = window.setTimeout(() => {
        write();
        arm();
      }, Math.max(1000, next.getTime() - now.getTime()));
    };
    arm();
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearTimeout(timer);
    };
  }, [loading, plannedSessions, sessionLogs, templateById, program, settings.leavePeriods, settings.illnessEpisodes]);

  // Een bestaand plan zonder doel: neutrale golven pas na Akkoord (engine/noGoalWaves.ts).
  const wavesOffer = useMemo(
    () => noGoalWavesAdvice(planDirection(
      { direction: settings.direction, directionStart: settings.directionStart, noGoalWaves: settings.noGoalWaves },
      trainingGoals, new Set(goalMilestones.map((m) => m.goalId)), todayISO(),
      planEndDay(trainingGoals, goalMilestones, todayISO(), settings.afterMainGoal), program,
    )),
    [settings.direction, settings.directionStart, settings.noGoalWaves, settings.afterMainGoal, trainingGoals, goalMilestones, program],
  );
  const answeredAdviceIds = useMemo(() => new Set(Object.keys(adviceResponses)), [adviceResponses]);
  const advice = useMemo(
    // Proposals you kept turning down come last (engine/learning.ts).
    () => learnFromDeclines([
      ...(plannerAdvice && !adviceResponses[plannerAdvice.id] ? [plannerAdvice] : []),
      // Een bestaand plan zonder doel: neutrale golven pas na Akkoord (engine/noGoalWaves.ts).
      ...wavesOffer.filter((a) => !adviceResponses[a.id]),
      ...computeAdvice({
        logs: sessionLogs,
        plannedSessions,
        templates,
        injuries: injuryNotes,
        program,
        dailyTimeBudget: goalEngineConfig.availability.dailyTimeBudget,
        sameDayPairingPreference: goalEngineConfig.strategy.sameDayPairingPreference,
        enabledSports: settings.enabledSports,
        respondedIds: new Set(Object.keys(adviceResponses)),
        asOf: todayISO(),
        illnessEpisodes: settings.illnessEpisodes,
        checkIns: settings.morningCheckIns,
        legEase: resolveLegEase({ legEase: settings.legEase }),
        testJudgments: settings.testJudgments,
        askDoubtTest: settings.askDoubtTest !== false,
        proposeTargetTime: settings.proposeTargetTime !== false,
        goalGrowth: resolveGrowthChoice(settings.goalGrowth),
        newTestOnStops: settings.newTestOnStops !== false,
        restDay: settings.restDay ?? 1,
        restDayBack: settings.restDayBack !== false,
        fullWeekAsk: resolveFullWeekAsk(settings.fullWeekAsk),
        descentClock: descentClockContext(settings.descentClock, trainingGoals, goalMilestones, settings.leavePeriods, todayISO()),
        answeredOn: answeredDays(adviceResponses),
        // Eerst koppelen, dan inhalen (engine/missedTraining.ts#linkCandidates).
        missedLink: { on: settings.missedLink !== false, declined: missedMemory?.declined ?? [], declinedOn: missedMemory?.declinedOn },
        leave: settings.leavePeriods,
        removedByPlanIds: new Set(planChangeLog.filter((p) => p.resolution === 'accepted').flatMap((p) => p.changes.filter((c) => c.action === 'remove' && c.plannedSessionId).map((c) => c.plannedSessionId!))),
        // De herkansingen die TEST-RETRY neerzette: ging er een niet door, dan vraagt hij het nog één keer.
        retryRows: retryTestRows(planChangeLog),
        extraSession: extraSessionContext,
        tentPack: tentPackProposal(trainingGoals, new Set(goalMilestones.map((m) => m.goalId))),
        raceGoals: extraSessionContext.races,
        // Dezelfde sleuteltraining als de regel op Ascend (engine/keySession.ts).
        keyFocus: keyFocusOf(trainingGoals, goalMilestones, todayISO(), { direction: settings.direction }),
        weather: weather.forecast && showWeatherSwap(settings.overviews) ? { forecast: weather.forecast, now: new Date(), leave: settings.leavePeriods } : undefined,
      }),
    ].sort((a, b) => b.priority - a.priority), declinedRules(adviceResponses, todayISO())),
    [plannerAdvice, wavesOffer, sessionLogs, plannedSessions, templates, injuryNotes, program, goalEngineConfig, settings.enabledSports, settings.illnessEpisodes, settings.morningCheckIns, settings.legEase, settings.testJudgments, settings.askDoubtTest, settings.proposeTargetTime, settings.goalGrowth, settings.newTestOnStops, settings.restDay, settings.restDayBack, settings.fullWeekAsk, settings.descentClock, settings.missedLink, missedMemory, adviceResponses, planChangeLog, extraSessionContext, trainingGoals, goalMilestones, weather.forecast, settings.leavePeriods, settings.overviews, settings.direction],
  );

  // The week check over the week you look at, with what is yours reported too (rule WEEK-CHECK).
  // Two steps so drawing never waits: `weekNoticeFor` gives the concerns at once (about 10 ms), and
  // `weekFixesFor` works out the proposals (a few hundred milliseconds) only when you ask for them in Week
  // ("Bekijk voorstel"). Never throws: a failure leaves Week with its plain list.
  const weekNoticeCache = useRef<{ key: unknown[]; quick: Map<string, WeekNotice>; full: Map<string, WeekNotice> } | null>(null);
  const weekCheckInput = useCallback(() => {
    const today = todayISO();
    const anchor = planEndDay(trainingGoals, goalMilestones, today, settings.afterMainGoal);
    const ladder = new Set(goalMilestones.map((m) => m.goalId));
    const mainGoalId = mainGoal(trainingGoals, ladder)?.id;
    const restDay = settings.restDay ?? 1;
    const blocks = raceBlocks(trainingGoals, mainGoalId, anchor, today);
    return {
      sessions: plannedSessions, logs: sessionLogs, templates, today, restDay, goalDay: anchor,
      raceDays: blocks.map((b) => b.raceDate), afterGoals: afterGoalWindows(trainingGoals, mainGoalId, anchor, today), program,
      dailyTimeBudget: goalEngineConfig.availability.dailyTimeBudget, sameDayPairingPreference: goalEngineConfig.strategy.sameDayPairingPreference,
      slotDays: patternDays(templates, settings, restDay),
      minutesOf: (s: PlannedSession, t: SessionTemplate) => resolveVariantDuration(t, 'full', s.scheduledDate, program),
      leave: settings.leavePeriods, trekRest: settings.trekLegRest, leaveCrowding: settings.leaveCrowding,
    };
  }, [trainingGoals, goalMilestones, settings, plannedSessions, sessionLogs, templates, program, goalEngineConfig]);
  // Koos je vandaag Benen fris, dan zegt de melding in Week dat jij koos (engine/weekKept.ts). Alleen tekst.
  const keptNotice = useCallback((n: WeekNotice): WeekNotice => ({
    ...n,
    concerns: markKept(n.concerns, { today: todayISO(), checkIns: settings.morningCheckIns, sessions: plannedSessions, templates, setting: resolveWeekAfterChoice(settings), answeredAdviceIds,
      inputs: {
        logs: sessionLogs, plannedSessions, templates, injuries: injuryNotes, program,
        dailyTimeBudget: goalEngineConfig.availability.dailyTimeBudget,
        sameDayPairingPreference: goalEngineConfig.strategy.sameDayPairingPreference,
        respondedIds: answeredAdviceIds, asOf: todayISO(), legEase: resolveLegEase({ legEase: settings.legEase }),
        checkIns: settings.morningCheckIns,
      },
    }),
  }), [settings, plannedSessions, templates, sessionLogs, injuryNotes, program, goalEngineConfig, answeredAdviceIds]);
  // Een volle week na weggevallen dagen (engine/fullWeek.ts): de gewone regel in Week. Na Liever niet zegt hij
  // dat jij alles liet staan; staat het voorstel nog open, dan verwijst hij naar Vandaag. Alleen tekst.
  const withFullWeek = useCallback((n: WeekNotice, weekStart: string): WeekNotice => {
    const today = todayISO();
    const id = fullWeekId(today);
    const status = adviceResponses[id]?.response === 'declined' ? 'declined' as const : fullWeekFollowed(planChangeLog, plannedSessions, today) ? 'accepted' as const : advice.some((a) => a.id === id && !!a.proposal) ? 'open' as const : undefined;
    const line = fullWeekLine({
      today, sessions: plannedSessions, logs: sessionLogs, templates, leave: settings.leavePeriods, illnessEpisodes: settings.illnessEpisodes,
      removedByPlanIds: new Set(planChangeLog.filter((p) => p.resolution === 'accepted').flatMap((p) => p.changes.filter((c) => c.action === 'remove' && c.plannedSessionId).map((c) => c.plannedSessionId!))),
      keyFocus: keyFocusOf(trainingGoals, goalMilestones, today, { direction: settings.direction }),
      check: { restDay: settings.restDay ?? 1, program, dailyTimeBudget: goalEngineConfig.availability.dailyTimeBudget, sameDayPairingPreference: goalEngineConfig.strategy.sameDayPairingPreference },
    }, weekStart, status);
    return line ? { ...n, plain: [line] } : n;
  }, [adviceResponses, advice, plannedSessions, sessionLogs, templates, planChangeLog, settings.illnessEpisodes, settings.leavePeriods, settings.direction, settings.restDay, trainingGoals, goalMilestones, program, goalEngineConfig]);
  const weekNoticeState = useCallback((): NonNullable<typeof weekNoticeCache.current> => {
    const key = [weekCheckInput, advice, keptNotice, withFullWeek];
    if (!weekNoticeCache.current || weekNoticeCache.current.key.some((v, i) => v !== key[i])) weekNoticeCache.current = { key, quick: new Map(), full: new Map() };
    return weekNoticeCache.current;
  }, [weekCheckInput, advice, keptNotice, withFullWeek]);
  const weekNoticeFor = useCallback((weekStart: string): WeekNotice => {
    const state = weekNoticeState();
    const cached = state.quick.get(weekStart);
    if (cached) return cached;
    try {
      const result = withFullWeek(keptNotice(weekNoticeConcerns(weekCheckInput(), weekStart, adviceSessionIds(advice))), weekStart);
      state.quick.set(weekStart, result);
      return result;
    } catch (err) {
      console.error('De weekmelding kon niet worden berekend:', err);
      return { concerns: [], fixes: {}, covered: [] };
    }
  }, [weekNoticeState, weekCheckInput, advice, keptNotice, withFullWeek]);
  const weekFixesFor = useCallback((weekStart: string): WeekNotice => {
    const state = weekNoticeState();
    const cached = state.full.get(weekStart);
    if (cached) return cached;
    const result = withFullWeek(keptNotice(weekNotice(weekCheckInput(), weekStart, settings.weekFixProposal !== false, adviceSessionIds(advice))), weekStart);
    state.full.set(weekStart, result);
    return result;
  }, [weekNoticeState, weekCheckInput, advice, settings.weekFixProposal, keptNotice, withFullWeek]);

  // The new concerns of the week check when a training lands on a day, for the line while dragging.
  // Never throws: a failure leaves the line with only what the day itself says.
  const previewDrop = useCallback((sessionId: string, date: string, skipRules: string[] = []): string[] => {
    try {
      return newConcernLines(weekCheckInput(), mondayOfWeek(date), sessionId, date, skipRules);
    } catch (err) {
      console.error('De weekmelding bij het slepen kon niet worden berekend:', err);
      return [];
    }
  }, [weekCheckInput]);

  // Twee zware beendagen achter elkaar op de nieuwe plek: de vraag voor het loslaten. Een fout laat de
  // verplaatsing gewoon zijn eigen weg gaan.
  const legsCloseAt = useCallback((sessionId: string, date: string): boolean => {
    try {
      return legsCloseAfterMove(weekCheckInput(), sessionId, date);
    } catch (err) {
      console.error('De controle op zware beendagen bij het verplaatsen kon niet worden berekend:', err);
      return false;
    }
  }, [weekCheckInput]);

  // Ruilen: dezelfde controles als Verplaatsen, voor beide richtingen (engine/weekSwap.ts#decideSwap).
  const proposeSwap = useCallback((sessionId: string, otherId: string): MoveDecision => {
    const session = plannedSessions.find((s) => s.id === sessionId);
    if (!session) return { action: 'none', proposal: { changes: [], reason: 'Sessie niet gevonden.', resolved: false } };
    const check = checkSwap(dragContextFor(session.scheduledDate), sessionId, otherId);
    let legsClose = false;
    try {
      legsClose = check.ok && legsCloseAfterSwap(weekCheckInput(), sessionId, otherId);
    } catch (err) {
      console.error('De controle op zware beendagen bij het ruilen kon niet worden berekend:', err);
    }
    return decideSwap(check, { legsClose });
  }, [plannedSessions, dragContextFor, weekCheckInput]);

  const swapOptionsFor = useCallback((sessionId: string): SwapOption[] => {
    const session = plannedSessions.find((s) => s.id === sessionId);
    if (!session) return [];
    try {
      return swapOptions(dragContextFor(session.scheduledDate), sessionId);
    } catch (err) {
      console.error('De trainingen om mee te ruilen konden niet worden berekend:', err);
      return [];
    }
  }, [plannedSessions, dragContextFor]);

  // The proposal to move a test after what you noted about the evening before. Its own memo
  // so the coach advice above stays as it was; the answer is kept like any advice response.
  const influenceMoveNow = useMemo(() => {
    const today = todayISO();
    const cause = influenceMoveCause({ today, plannedSessions, logs: sessionLogs, entries: settings.influences ?? [], enabled: settings.influenceTestMove !== false });
    return influenceMove({
      logs: sessionLogs,
      plannedSessions,
      templates,
      injuries: injuryNotes,
      program,
      dailyTimeBudget: goalEngineConfig.availability.dailyTimeBudget,
      sameDayPairingPreference: goalEngineConfig.strategy.sameDayPairingPreference,
      enabledSports: settings.enabledSports,
      respondedIds: new Set(Object.keys(adviceResponses)),
      asOf: today,
      illnessEpisodes: settings.illnessEpisodes,
    }, cause);
  }, [plannedSessions, sessionLogs, templates, injuryNotes, program, goalEngineConfig, settings.influences, settings.influenceTestMove, settings.enabledSports, settings.illnessEpisodes, adviceResponses]);

  return { weather, answeredAdviceIds, advice, weekNoticeFor, weekFixesFor, previewDrop, legsCloseAt, proposeSwap, swapOptionsFor, influenceMoveNow };
}
