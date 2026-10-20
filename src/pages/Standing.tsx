import { useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../state/AppDataContext';
import { BackButton } from '../components/BackButton';
import { Card } from '../components/ui';
import { LegFatigueCard, useLegFatigueInputs } from '../components/LegFatigueCard';
import { FreshnessChart } from '../components/stand/FreshnessChart';
import { LegCalendar } from '../components/stand/LegCalendar';
import { WeeklyLoadChart } from '../components/stand/WeeklyLoadChart';
import { IntensityMixCard } from '../components/stand/IntensityMixCard';
import { DescentCard } from '../components/stand/DescentCard';
import { RouteDayCard } from '../components/stand/RouteDayCard';
import { AdventureCard } from '../components/AdventureCard';
import { LessonCard } from '../components/LessonCard';
import { freshnessCurve, intensityMix, legCalendar, routeDayRows, weeklyDescent, weeklyLoad } from '../engine/standing';
import { restWeekState } from '../engine/restWeek';
import { computeReadiness, droppedAfterMissIds } from '../engine/readiness';
import { computeCurrentStreak } from '../engine/streak';
import { computeGoalProgress } from '../engine/progression';
import { deriveSessionStatus } from '../engine/sessionStatus';
import { isIllnessDay } from '../engine/illness';
import { typicalDayValue } from '../engine/goalRoute';
import { daysBetween, mondayOfWeek, resolveProgramWeek } from '../utils/dates';

// Je stand: where you are, apart from what to do today. Today stays the
// mission; here are the numbers behind it, each on its own card, no
// folding: your legs now and ahead, the load per week, the intensity, the
// descent and your main goal (engine/standing.ts).

const SECTIONS = [
  { id: 'benen', label: 'Benen' },
  { id: 'belasting', label: 'Belasting' },
  { id: 'doel', label: 'Doel' },
] as const;

export function StandingPage() {
  const navigate = useNavigate();
  const { program, plannedSessions, sessionLogs, templates, templateById, settings, planChangeLog, trainingGoals, goalMilestones, goalMilestoneProgress, sessionsForWeek } = useAppData();
  const inputs = useLegFatigueInputs();
  const today = inputs.today;
  const refs = useRef<Record<string, HTMLElement | null>>({});

  const curve = useMemo(() => freshnessCurve(inputs), [inputs]);
  const calendar = useMemo(() => legCalendar(inputs), [inputs]);
  const weeks = useMemo(
    () => weeklyLoad({
      logs: sessionLogs, plannedSessions, templates, today, minutesOf: inputs.minutesOf,
      isRestWeek: (monday) => (program ? restWeekState(program, monday, sessionLogs, today).isRestWeek && !restWeekState(program, monday, sessionLogs, today).skipped : false),
    }),
    [sessionLogs, plannedSessions, templates, today, inputs.minutesOf, program],
  );
  const mix = useMemo(() => intensityMix(sessionLogs, templates, today, settings.heartRate), [sessionLogs, templates, today, settings.heartRate]);
  const descent = useMemo(() => weeklyDescent(sessionLogs, today), [sessionLogs, today]);

  const primaryGoal = trainingGoals.find((g) => goalMilestones.some((m) => m.goalId === g.id));
  const routeRows = useMemo(() => (primaryGoal ? routeDayRows(primaryGoal.requirements, sessionLogs, today) : []), [primaryGoal, sessionLogs, today]);
  const routeDescent = primaryGoal ? typicalDayValue(primaryGoal.requirements, 'elevationLoss')?.value.amount : undefined;
  const weeksToGo = primaryGoal?.targetDate && primaryGoal.targetDate > today ? Math.floor(daysBetween(today, primaryGoal.targetDate) / 7) : undefined;
  const milestones = useMemo(() => goalMilestones.filter((m) => m.goalId === primaryGoal?.id), [goalMilestones, primaryGoal?.id]);
  const progress = useMemo(
    () => (primaryGoal ? computeGoalProgress(primaryGoal.id, primaryGoal.name, milestones, goalMilestoneProgress, sessionLogs) : null),
    [primaryGoal, milestones, goalMilestoneProgress, sessionLogs],
  );

  // The four numbers that used to sit on Today.
  const position = program ? resolveProgramWeek(program, today) : null;
  const weekTrainings = sessionsForWeek(mondayOfWeek(today)).filter((s) => templateById.get(s.templateId)?.type !== 'recovery');
  const weekDone = weekTrainings.filter((s) => deriveSessionStatus(s, sessionLogs).status === 'completed').length;
  const readiness = computeReadiness(sessionLogs, plannedSessions, 28, today, program?.startDate, (d) => isIllnessDay(d, settings.illnessEpisodes, today), { isRest: (p) => templateById.get(p.templateId)?.type === 'recovery', droppedAfterMissIds: droppedAfterMissIds(planChangeLog) });
  const streak = useMemo(() => computeCurrentStreak(plannedSessions, sessionLogs), [plannedSessions, sessionLogs]);
  const tiles = [
    { label: 'WEEK', value: `${weekDone} / ${weekTrainings.length}`, gold: false },
    { label: 'CONSISTENTIE', value: readiness.consistencyBasis === 0 ? '–' : `${readiness.consistency}%`, gold: true },
    { label: 'WEEK IN FASE', value: position ? `${position.weekInPhase}/${position.phase.weekCount}` : '–', gold: false },
    { label: 'REEKS', value: `${streak} ${streak === 1 ? 'dag' : 'dagen'}`, gold: true },
  ];

  return (
    <div className="animate-page-in flex flex-col gap-5 px-4 pb-6 pt-4">
      <div>
        <BackButton fallback="/" />
        <h1 className="font-display text-3xl" style={{ color: 'var(--color-ink)' }}>Je stand</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>
          {position ? `Week ${position.weekInProgram}, ${position.phase.name}. ` : ''}Hoe je ervoor staat, naast wat je vandaag doet.
        </p>
      </div>

      <nav className="sticky top-0 z-10 -mx-4 flex gap-2 px-4 py-2" style={{ background: 'var(--color-bg)' }} aria-label="Onderdelen">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => refs.current[s.id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="min-h-[36px] rounded-full border px-4 text-xs tracking-wide"
            style={{ borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' }}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <div className="grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <Card key={t.label} className="text-center">
            <p className="flex min-h-8 items-center justify-center text-xs leading-tight" style={{ color: 'var(--color-ink-dim)' }}>{t.label}</p>
            <p className="mt-1 font-display text-lg" style={{ color: t.gold ? 'var(--color-gold)' : 'var(--color-ink)' }}>{t.value}</p>
          </Card>
        ))}
      </div>

      <section ref={(el) => { refs.current.benen = el; }} className="flex scroll-mt-14 flex-col gap-5" aria-label="Benen">
        <LegFatigueCard />
        <FreshnessChart points={curve} today={today} />
        <LegCalendar days={calendar} today={today} />
      </section>

      <section ref={(el) => { refs.current.belasting = el; }} className="flex scroll-mt-14 flex-col gap-5" aria-label="Belasting">
        <WeeklyLoadChart weeks={weeks} />
        <IntensityMixCard mix={mix} />
        <DescentCard weeks={descent} routeDayDescent={routeDescent} />
      </section>

      <section ref={(el) => { refs.current.doel = el; }} className="flex scroll-mt-14 flex-col gap-5" aria-label="Doel">
        {primaryGoal && <RouteDayCard goalName={primaryGoal.name} weeksToGo={weeksToGo} rows={routeRows} onOpen={() => navigate('/ascend')} />}
        {progress && <AdventureCard progress={progress} onOpenLadder={() => navigate('/ascend')} />}
        <LessonCard />
      </section>
    </div>
  );
}
