import { useMemo } from 'react';
import { useAppData } from '../../state/AppDataContext';
import { useKeyFocus } from '../useKeyFocus';
import { useLegFatigueInputs } from '../LegFatigueCard';
import type { HikeDay } from '../../engine/climbPace';
import { indexChecks } from '../../engine/learning';
import { resolveIntensityCounting } from '../../engine/intensitySettings';
import { freshnessCurve, intensityMix, legCalendar, loadVersusBefore, weeklyDescent, weeklyLoad } from '../../engine/standing';
import { recentAdherence } from '../../engine/onCourse';
import { buildRhythm, loadVerdict } from '../../engine/standRhythm';
import { buildWeekReview } from '../../engine/weekReview';
import { plannedByIdOf } from '../../engine/logDay';
import { fatigueWord, legFatigueOn } from '../../engine/legFatigue';
import { restWeekState } from '../../engine/restWeek';
import { computeCurrentStreak } from '../../engine/streak';
import { leftOutOfCount } from '../../engine/weekLogs';
import { goalTiming, typicalDayValue } from '../../engine/goalRoute';
import { mainGoal } from '../../engine/mainGoal';
import { mondayOfWeek } from '../../utils/dates';

// Alles wat Je stand en zijn schermen (Benen, Belasting, Ritme) lezen, op één plek, zodat de regel bovenaan
// en het scherm erachter altijd hetzelfde getal tonen. Alleen lezen: elke berekening staat in engine/
// (standing.ts, standRhythm.ts, legFatigue.ts, onCourse.ts) en verandert hier niet.
export function useStandData() {
  const { program, plannedSessions, sessionLogs, templates, templateById, settings, planChangeLog, trainingGoals, goalMilestones } = useAppData();
  const keyFocus = useKeyFocus();
  const inputs = useLegFatigueInputs();
  const today = inputs.today;

  const curve = useMemo(() => freshnessCurve(inputs), [inputs]);
  const calendar = useMemo(() => legCalendar(inputs), [inputs]);
  const legNow = useMemo(() => legFatigueOn(today, inputs), [today, inputs]);
  const weeks = useMemo(
    () => weeklyLoad({
      logs: sessionLogs, plannedSessions, templates, today, minutesOf: inputs.minutesOf,
      isRestWeek: (monday) => (program ? restWeekState(program, monday, sessionLogs, today).isRestWeek && !restWeekState(program, monday, sessionLogs, today).skipped : false),
    }),
    [sessionLogs, plannedSessions, templates, today, inputs.minutesOf, program],
  );
  const counting = resolveIntensityCounting(settings);
  const mix = useMemo(() => intensityMix(sessionLogs, templates, today, settings.heartRate, 28, counting), [sessionLogs, templates, today, settings.heartRate, counting]);
  const descent = useMemo(() => weeklyDescent(sessionLogs, today), [sessionLogs, today]);
  const checks = useMemo(() => indexChecks(sessionLogs, templates, inputs.bodyKg), [sessionLogs, templates, inputs.bodyKg]);

  // Not an archived goal, as on Ascend (pages/Ascend.tsx).
  const primaryGoal = mainGoal(trainingGoals, goalMilestones, 'live');
  const routeDescent = primaryGoal ? typicalDayValue(primaryGoal.requirements, 'elevationLoss')?.value.amount : undefined;
  // Een gewone dag van je hoofddoel, voor de band op je eigen klimtempo (engine/climbPace.ts).
  const goalDay = useMemo((): HikeDay | undefined => {
    const dist = primaryGoal ? typicalDayValue(primaryGoal.requirements, 'distance')?.value : undefined;
    const up = primaryGoal ? typicalDayValue(primaryGoal.requirements, 'elevationGain')?.value.amount : undefined;
    // Zonder omhoog en omlaag zegt een klimtempo niets over die dag.
    if (!primaryGoal || dist?.unit !== 'km' || up === undefined || routeDescent === undefined) return undefined;
    return { km: dist.amount, up, down: routeDescent };
  }, [primaryGoal, routeDescent]);
  const goalPack = primaryGoal?.requirements.find((r) => r.kind === 'packWeight')?.target?.amount;

  // The same count as the coach on Ascend (engine/onCourse.ts#recentAdherence): the last
  // four finished weeks, what you skipped counts as not done. Deze week komt er als stipjes bij.
  const adherence = useMemo(
    () => recentAdherence({ today, program, plannedSessions, logs: sessionLogs, templates, planChangeLog, illnessEpisodes: settings.illnessEpisodes, keyFocus }),
    [today, program, plannedSessions, sessionLogs, templates, planChangeLog, settings.illnessEpisodes, keyFocus],
  );
  const thisWeek = useMemo(() => {
    const planned = plannedSessions.filter((s) => !s.fixed);
    return buildWeekReview({ plannedById: plannedByIdOf(planned), weekStart: mondayOfWeek(today), plannedSessions: planned, logs: sessionLogs, templates, program, planChangeLog, asOf: today, illnessEpisodes: settings.illnessEpisodes, heartRate: settings.heartRate, intensityCounting: counting, keyFocus });
  }, [today, program, plannedSessions, sessionLogs, templates, planChangeLog, settings.illnessEpisodes, settings.heartRate, counting, keyFocus]);
  const streak = useMemo(
    () => computeCurrentStreak(plannedSessions, sessionLogs, { templateById, programStart: program?.startDate, illnessEpisodes: settings.illnessEpisodes, leftOut: leftOutOfCount(plannedSessions, planChangeLog, settings.illnessEpisodes, today, program?.startDate) }),
    [plannedSessions, sessionLogs, templateById, program?.startDate, settings.illnessEpisodes, planChangeLog, today],
  );
  const rhythm = useMemo(() => buildRhythm({ adherence, thisWeek, streak }), [adherence, thisWeek, streak]);
  // The main goal is behind you: nothing planned any more (engine/programLayout.ts#planEndDay).
  const mainState = primaryGoal?.status === 'active' ? goalTiming(primaryGoal, today).state : undefined;
  const mainPast = mainState === 'past' && settings.afterMainGoal !== 'maintain';
  const restWeek = program ? restWeekState(program, mondayOfWeek(today), sessionLogs, today) : undefined;

  const load = useMemo(() => loadVerdict(weeks), [weeks]);
  // Voor de amber stip: dezelfde verhouding als het blok Stand en morgen op Vandaag (engine/standPage.ts#standWarnings).
  const jump = useMemo(() => loadVersusBefore(weeks), [weeks]);
  const leg = fatigueWord(legNow.index);

  return {
    today, inputs, program, curve, calendar, legNow, leg, weeks, mix, descent, checks, routeDescent, goalDay, goalPack,
    rhythm, mainPast, restWeek, load, jump, empty: sessionLogs.length === 0,
  };
}
