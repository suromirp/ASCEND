import { useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../state/AppDataContext';
import { Card, Eyebrow } from '../components/ui';
import { LegFatigueCard, useLegFatigueInputs } from '../components/LegFatigueCard';
import { FreshnessChart } from '../components/stand/FreshnessChart';
import { LegCalendar } from '../components/stand/LegCalendar';
import { WeeklyLoadChart } from '../components/stand/WeeklyLoadChart';
import { IntensityMixCard } from '../components/stand/IntensityMixCard';
import { DescentCard } from '../components/stand/DescentCard';
import { RunTrendsCard } from '../components/stand/RunTrendsCard';
import { AerobicTrendCard } from '../components/AerobicTrendCard';
import { Gr5ReadinessCard } from '../components/Gr5ReadinessCard';
import { IndexCheckCard } from '../components/stand/IndexCheckCard';
import { indexChecks } from '../engine/learning';
import { AdventureCard } from '../components/AdventureCard';
import { strengthModelOn } from '../engine/strengthSettings';
import { LessonCard } from '../components/LessonCard';
import { freshnessCurve, intensityMix, legCalendar, weeklyDescent, weeklyLoad } from '../engine/standing';
import { computeGr5Readiness } from '../engine/gr5Readiness';
import { adherenceSummary, recentAdherence } from '../engine/onCourse';
import { restWeekState } from '../engine/restWeek';
import { computeCurrentStreak } from '../engine/streak';
import { computeGoalProgress } from '../engine/progression';
import { deriveSessionStatus } from '../engine/sessionStatus';
import { goalTiming, typicalDayValue } from '../engine/goalRoute';
import { mondayOfWeek, resolveProgramWeek } from '../utils/dates';
import { Icon } from '../components/icons';
import { SkyBand } from '../components/SkyBand';

// Je stand: where you are, apart from what to do today. Today stays the
// mission; here are the numbers behind it, each on its own card, no
// folding: your legs now and ahead, the load per week, the intensity, the
// descent, your running (Lopen: efficiency, long days, climbing and form, with
// the card Tempo bij zone 2) and your main goal (engine/standing.ts).

const SECTIONS = [
  { id: 'benen', label: 'Benen' },
  { id: 'belasting', label: 'Belasting' },
  { id: 'lopen', label: 'Lopen' },
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
  const checks = useMemo(() => indexChecks(sessionLogs, templates, inputs.bodyKg), [sessionLogs, templates, inputs.bodyKg]);

  // Not an archived goal, as on Ascend (pages/Ascend.tsx).
  const primaryGoal = trainingGoals.find((g) => g.status !== 'archived' && goalMilestones.some((m) => m.goalId === g.id));
  // The same number and sentence as on Ascend (engine/gr5Readiness.ts).
  const gr5 = useMemo(() => (primaryGoal ? computeGr5Readiness(primaryGoal.requirements, sessionLogs, today) : undefined), [primaryGoal, sessionLogs, today]);
  const routeDescent = primaryGoal ? typicalDayValue(primaryGoal.requirements, 'elevationLoss')?.value.amount : undefined;
  const milestones = useMemo(() => goalMilestones.filter((m) => m.goalId === primaryGoal?.id), [goalMilestones, primaryGoal?.id]);
  const progress = useMemo(
    () => (primaryGoal ? computeGoalProgress(primaryGoal.id, primaryGoal.name, milestones, goalMilestoneProgress, sessionLogs) : null),
    [primaryGoal, milestones, goalMilestoneProgress, sessionLogs],
  );

  // The four numbers that used to sit on Today.
  const position = program ? resolveProgramWeek(program, today) : null;
  const weekTrainings = sessionsForWeek(mondayOfWeek(today)).filter((s) => templateById.get(s.templateId)?.type !== 'recovery');
  const weekDone = weekTrainings.filter((s) => deriveSessionStatus(s, sessionLogs).status === 'completed').length;
  // The same count as the coach on Ascend (engine/onCourse.ts#recentAdherence): the last
  // four finished weeks, what you skipped counts as not done.
  const adherence = useMemo(
    () => recentAdherence({ today, program, plannedSessions, logs: sessionLogs, templates, planChangeLog, illnessEpisodes: settings.illnessEpisodes }),
    [today, program, plannedSessions, sessionLogs, templates, planChangeLog, settings.illnessEpisodes],
  );
  const streak = useMemo(() => computeCurrentStreak(plannedSessions, sessionLogs), [plannedSessions, sessionLogs]);
  // The main goal is behind you: nothing planned any more (engine/programLayout.ts#planEndDay).
  const mainState = primaryGoal?.status === 'active' ? goalTiming(primaryGoal, today).state : undefined;
  const mainPast = mainState === 'past' && settings.afterMainGoal !== 'maintain';
  // Each number with what it means, in one plain sentence (production
  // feedback: "veel te vaag, wat betekenen deze categorieën").
  const phaseName = (name: string) => name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  const nextPhase = position && program ? program.phases[position.phaseIndex + 1] : undefined;
  const restWeek = program ? restWeekState(program, mondayOfWeek(today), sessionLogs, today) : undefined;
  const rows = [
    {
      label: 'Deze week',
      value: `${weekDone} van ${weekTrainings.length}`,
      text: 'trainingen gedaan',
      dots: weekTrainings.map((s) => deriveSessionStatus(s, sessionLogs).status === 'completed'),
    },
    {
      label: 'Volgehouden',
      value: adherence.enough ? `${adherence.done} van ${adherence.planned}` : 'nog niet',
      text: adherence.enough
        ? `${adherenceSummary(adherence)}. Wat je oversloeg telt als niet gedaan; ziek en rustdagen tellen niet mee. De coach op Ascend telt hetzelfde.`
        : mainPast
          ? 'Na je hoofddoel staat er niets meer gepland, dus er is niets om te tellen.'
          : 'Na twee volle weken zie je hier hoeveel van de geplande trainingen je deed.',
    },
    {
      label: 'Fase',
      value: position ? `week ${position.weekInPhase} van ${position.phase.weekCount}` : mainPast ? 'klaar' : mainState === 'underway' ? 'onderweg' : 'nog niet',
      text: position
        ? `${phaseName(position.phase.name)}.${restWeek?.isRestWeek && !restWeek.skipped ? ' Deze week is een rustweek: minder, zodat de weken ervoor binnenkomen.' : ''}${position.weekInPhase === position.phase.weekCount && nextPhase ? ` Volgende week begint ${phaseName(nextPhase.name)}.` : ''}`
        : mainPast || mainState === 'underway' ? 'Het programma naar je hoofddoel is af.' : '',
    },
    {
      label: 'Op rij',
      value: `${streak} ${streak === 1 ? 'trainingsdag' : 'trainingsdagen'}`,
      text: 'Achter elkaar alles gedaan wat gepland stond. Dagen zonder training tellen niet mee en breken de reeks niet.',
    },
  ];

  return (
    <div className="animate-page-in flex flex-col gap-5 px-4 pb-6">
      <SkyBand>
        <div>
          {position && <Eyebrow>Week {position.weekInProgram} van de {position.phase.name.toLowerCase()}</Eyebrow>}
          <h1 className="font-display text-[28px] leading-[34px]" style={{ color: 'var(--color-ink)' }}>Je stand</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>Hoe je ervoor staat, naast wat je vandaag doet.</p>
        </div>
      </SkyBand>

      {/* Het ene voortgangsgetal staat als gewone marine kaart onder de bergen, niet als
          groot wit vlak op de lucht: de lucht houdt dezelfde licht-donkerverhouding als
          op de andere tabs. */}
      {gr5 && <Gr5ReadinessCard readiness={gr5} />}

      <nav className="sticky top-0 z-10 -mx-4 flex gap-2 px-4 py-2" style={{ background: 'var(--color-bg)' }} aria-label="Onderdelen">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => refs.current[s.id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="min-h-[44px] rounded-full border px-4 text-xs"
            style={{ borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' }}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <section ref={(el) => { refs.current.benen = el; }} className="flex scroll-mt-14 flex-col gap-5" aria-label="Benen">
        <LegFatigueCard />
        <FreshnessChart points={curve} today={today} />
        <LegCalendar days={calendar} today={today} />
        <IndexCheckCard checks={checks} />
      </section>

      <section ref={(el) => { refs.current.belasting = el; }} className="flex scroll-mt-14 flex-col gap-5" aria-label="Belasting">
        <WeeklyLoadChart weeks={weeks} />
        <IntensityMixCard mix={mix} />
        <DescentCard weeks={descent} routeDayDescent={routeDescent} />
        {strengthModelOn(settings.strengthModel) && (
          <button onClick={() => navigate('/forge')} className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-card)' }}>
            <span>
              <span className="block font-display text-xl" style={{ color: 'var(--color-ink)' }}>Forge</span>
              <span className="mt-0.5 block text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Je krachttraining: vooruitgang per oefening en wat ASCEND de volgende keer voorstelt.</span>
            </span>
            <span className="shrink-0 text-sm" style={{ color: 'var(--color-progress)' }}><Icon name="verder" size={16} /></span>
          </button>
        )}
      </section>

      <Card className="flex flex-col">
        {rows.map((r, i) => (
          <div key={r.label} className={`flex flex-col gap-1 py-3 ${i === 0 ? 'pt-0' : 'border-t'} ${i === rows.length - 1 ? 'pb-0' : ''}`} style={{ borderColor: 'var(--color-card-border)' }}>
            <div className="flex items-baseline justify-between gap-3">
              <Eyebrow as="span">{r.label}</Eyebrow>
              <span className="font-sans text-lg tabular-nums" style={{ color: 'var(--color-ink)' }}>{r.value}</span>
            </div>
            {'dots' in r && r.dots && r.dots.length > 0 && (
              <div className="flex gap-1.5" aria-hidden>
                {r.dots.map((done, j) => (
                  <span key={j} className="h-1.5 flex-1 rounded-full" style={{ background: done ? 'var(--color-progress)' : 'var(--color-charcoal)' }} />
                ))}
              </div>
            )}
            {r.text && <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{r.text}</p>}
          </div>
        ))}
      </Card>

      <section ref={(el) => { refs.current.lopen = el; }} className="flex scroll-mt-14 flex-col gap-5" aria-label="Lopen">
        <RunTrendsCard />
        <AerobicTrendCard />
      </section>

      <section ref={(el) => { refs.current.doel = el; }} className="flex scroll-mt-14 flex-col gap-5" aria-label="Doel">
        {progress && <AdventureCard progress={progress} onOpenLadder={() => navigate('/ascend')} />}
        <LessonCard />
      </section>
    </div>
  );
}
