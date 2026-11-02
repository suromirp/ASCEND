import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { useAppData } from '../state/AppDataContext';
import { Eyebrow } from '../components/ui';
import { LegFatigueCard, useLegFatigueInputs } from '../components/LegFatigueCard';
import { FreshnessChart } from '../components/stand/FreshnessChart';
import { LegCalendar } from '../components/stand/LegCalendar';
import { WeeklyLoadChart } from '../components/stand/WeeklyLoadChart';
import { IntensityMixCard } from '../components/stand/IntensityMixCard';
import { DescentCard } from '../components/stand/DescentCard';
import { ClimbPaceCard } from '../components/stand/ClimbPaceCard';
import type { HikeDay } from '../engine/climbPace';
import { RunTrendsCard } from '../components/stand/RunTrendsCard';
import { PaceCurveCard } from '../components/stand/PaceCurveCard';
import { AerobicTrendCard } from '../components/AerobicTrendCard';
import { YourWeekStandCard } from '../components/stand/YourWeekStandCard';
import { useStandYourWeek } from '../components/stand/useStandYourWeek';
import { TextButton } from '../components/TextButton';
import { OrderSheet } from '../components/stand/OrderSheet';
import { ForgeEntryCard } from '../components/stand/ForgeEntryCard';
import { StrengthProgressionCard } from '../components/stand/StrengthProgressionCard';
import { TrainingSplitRow } from '../components/stand/TrainingSplitRow';
import { IndexCheckCard } from '../components/stand/IndexCheckCard';
import { RhythmCard } from '../components/stand/RhythmCard';
import { StandSummary, type SummaryColumn } from '../components/stand/StandSummary';
import { indexChecks } from '../engine/learning';
import { resolveIntensityCounting } from '../engine/intensitySettings';
import { freshnessCurve, intensityMix, legCalendar, weeklyDescent, weeklyLoad } from '../engine/standing';
import { recentAdherence } from '../engine/onCourse';
import { buildRhythm, loadVerdict, standSentence } from '../engine/standRhythm';
import { buildWeekReview } from '../engine/weekReview';
import { plannedByIdOf } from '../engine/logDay';
import { fatigueWord, legFatigueOn } from '../engine/legFatigue';
import { restWeekState } from '../engine/restWeek';
import { computeCurrentStreak } from '../engine/streak';
import { leftOutOfCount } from '../engine/weekLogs';
import { goalTiming, typicalDayValue } from '../engine/goalRoute';
import { mondayOfWeek, resolveProgramWeek } from '../utils/dates';
import { formatNumberNL } from '../utils/number';
import { SkyBand } from '../components/SkyBand';
import { InfluenceCard } from '../components/influence/InfluenceCard';
import { waveHeader } from '../engine/programLayout';
import { mainGoal } from '../engine/mainGoal';
import { resolveCardOrder } from '../engine/cardOrder';

// Je stand: where you are, apart from what to do today. Today stays the
// mission; here are the numbers behind it. Bovenaan op de lucht staan drie woorden
// (Benen, Belasting, Ritme) met één zin; daaronder elke kaart op zijn eigen plek:
// your legs now and ahead, the load per week, the intensity, the descent, Ritme
// (de laatste weken als stipjes, dezelfde telling als de coach), your running and
// your strength (engine/standing.ts, engine/standRhythm.ts). Het ene percentage
// "Klaar voor je doel" staat alleen op Ascend
// (docs/beslissingen/2026-11-02-gegevens-herinrichting.md).

export function StandingPage() {
  const [ordering, setOrdering] = useState(false);
  const { program, plannedSessions, sessionLogs, templates, templateById, settings, planChangeLog, trainingGoals, goalMilestones } = useAppData();
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

  // Zonder doel: Je week, dezelfde berekening als op Ascend. Met een doel staat hij er niet.
  const weekWithoutGoal = useStandYourWeek();
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

  const position = program ? resolveProgramWeek(program, today) : null;
  // The same count as the coach on Ascend (engine/onCourse.ts#recentAdherence): the last
  // four finished weeks, what you skipped counts as not done. Deze week komt er als stipjes bij.
  const adherence = useMemo(
    () => recentAdherence({ today, program, plannedSessions, logs: sessionLogs, templates, planChangeLog, illnessEpisodes: settings.illnessEpisodes }),
    [today, program, plannedSessions, sessionLogs, templates, planChangeLog, settings.illnessEpisodes],
  );
  const thisWeek = useMemo(() => {
    const planned = plannedSessions.filter((s) => !s.fixed);
    return buildWeekReview({ plannedById: plannedByIdOf(planned), weekStart: mondayOfWeek(today), plannedSessions: planned, logs: sessionLogs, templates, program, planChangeLog, asOf: today, illnessEpisodes: settings.illnessEpisodes, heartRate: settings.heartRate });
  }, [today, program, plannedSessions, sessionLogs, templates, planChangeLog, settings.illnessEpisodes, settings.heartRate]);
  const streak = useMemo(
    () => computeCurrentStreak(plannedSessions, sessionLogs, { templateById, programStart: program?.startDate, illnessEpisodes: settings.illnessEpisodes, leftOut: leftOutOfCount(plannedSessions, planChangeLog, settings.illnessEpisodes, today, program?.startDate) }),
    [plannedSessions, sessionLogs, templateById, program?.startDate, settings.illnessEpisodes, planChangeLog, today],
  );
  const rhythm = useMemo(() => buildRhythm({ adherence, thisWeek, streak }), [adherence, thisWeek, streak]);
  // The main goal is behind you: nothing planned any more (engine/programLayout.ts#planEndDay).
  const mainState = primaryGoal?.status === 'active' ? goalTiming(primaryGoal, today).state : undefined;
  const mainPast = mainState === 'past' && settings.afterMainGoal !== 'maintain';
  const restWeek = program ? restWeekState(program, mondayOfWeek(today), sessionLogs, today) : undefined;

  // Drie woorden en één zin op de lucht. Zonder een enkele training staat er "nog niets".
  const empty = sessionLogs.length === 0;
  const load = useMemo(() => loadVerdict(weeks), [weeks]);
  const leg = fatigueWord(legNow.index);
  const sentence = empty
    ? 'Na je eerste training zie je hier hoe je ervoor staat.'
    : standSentence({ legLevel: leg.level, load, rhythm, restWeek: !!restWeek?.isRestWeek && !restWeek.skipped });
  const columns: SummaryColumn[] = [
    { id: 'benen', label: 'Benen', word: empty ? 'Fris' : leg.word, fact: empty ? 'nog niets' : `index ${formatNumberNL(legNow.index, 1)}`, target: 'stand-benen' },
    { id: 'belasting', label: 'Belasting', word: load?.word ?? 'Nog niets', fact: load?.fact ?? 'na enkele weken', target: 'stand-belasting' },
    { id: 'ritme', label: 'Ritme', word: rhythm.enough && rhythm.status ? { on: 'Op koers', nearly: 'Bijna', behind: 'Achter' }[rhythm.status] : 'Nog niets', fact: rhythm.enough ? rhythm.fact : 'na twee weken', target: 'stand-ritme' },
  ];

  // De volgorde van de blokken is jouw voorkeur (engine/cardOrder.ts).
  const order = resolveCardOrder('stand', settings.cardOrder);
  const blocks: Record<string, ReactNode> = {
    'benen': (
      <section className="flex flex-col gap-5" aria-label="Benen" id="stand-benen">
        <LegFatigueCard />
        <FreshnessChart points={curve} today={today} />
        <LegCalendar days={calendar} today={today} />
        {checks.length > 0 && <IndexCheckCard checks={checks} />}
      </section>
    ),
    'belasting': (
      <section className="flex flex-col gap-5" aria-label="Belasting" id="stand-belasting">
        <WeeklyLoadChart weeks={weeks} />
        <IntensityMixCard mix={mix} />
        <DescentCard weeks={descent} routeDayDescent={routeDescent} />
        <ClimbPaceCard goalDay={goalDay} pack={{ packKg: goalPack, bodyKg: inputs.bodyKg }} />
      </section>
    ),
    'kracht': (
      <section className="flex flex-col gap-5" aria-label="Kracht">
        <ForgeEntryCard />
        <StrengthProgressionCard logs={sessionLogs} />
        <TrainingSplitRow />
      </section>
    ),
    'ritme': <RhythmCard rhythm={rhythm} mainPast={mainPast} />,
    'lopen': (
      <section className="flex flex-col gap-5" aria-label="Lopen">
        <RunTrendsCard />
        <PaceCurveCard />
        <AerobicTrendCard />
      </section>
    ),
    'invloed': (
      <InfluenceCard />
    ),
  };

  return (
    <div className="animate-page-in flex flex-col gap-5 px-4 pb-6">
      <SkyBand>
        <div>
          {position && <Eyebrow>{waveHeader(position) ?? `Week ${position.weekInPhase} van ${position.phase.weekCount}, ${position.phase.name.toLowerCase()}`}</Eyebrow>}
          <h1 className="font-display text-[28px] leading-[34px]" style={{ color: 'var(--color-ink)' }}>Je stand</h1>
          {sentence && <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>{sentence}</p>}
        </div>
        <StandSummary columns={columns} />
      </SkyBand>

      {weekWithoutGoal && <YourWeekStandCard week={weekWithoutGoal} />}

      {order.map((id) => (
        <Fragment key={id}>{blocks[id]}</Fragment>
      ))}

      <div className="flex justify-center">
        <TextButton tone="dim" onClick={() => setOrdering(true)}>Volgorde aanpassen</TextButton>
      </div>
      {ordering && <OrderSheet onClose={() => setOrdering(false)} />}
    </div>
  );
}
