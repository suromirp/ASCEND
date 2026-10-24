import { useMemo, useState } from 'react';
import { Icon } from '../components/icons';
import type { TrainingGoal } from '../models/goals';
import type { SessionLog } from '../models/training';
import type { AppSettings } from '../storage/database';
import { useAppData, type MarathonGoalPatch } from '../state/AppDataContext';
import { computeGr5Readiness } from '../engine/gr5Readiness';
import { computeGoalProgress } from '../engine/progression';
import { findRequirement } from '../engine/goals';
import { computeExerciseProgression, listLoggedExercises } from '../engine/strengthProgression';
import { addDays, daysBetween, formatDateNL, mondayOfWeek, todayISO } from '../utils/dates';
import { useNavigate } from 'react-router-dom';
import { NextTrekLine } from '../components/NextTrekLine';
import { TrekGoalsCard } from '../components/TrekGoals';
import { Gr5ReadinessCard } from '../components/Gr5ReadinessCard';
import { AscentLadder } from '../components/AscentLadder';
import { MilestoneDetailSheet } from '../components/MilestoneDetailSheet';
import { TrainingSplitSheet } from '../components/TrainingSplitSheet';
import { TrendLineChart } from '../components/TrendLineChart';
import { getGR5MilestoneDetail, GR5_TRACK_DESCRIPTION } from '../data/gr5Details';
import { JourneyEntryCard } from '../components/reis/JourneyEntryCard';
import { Card, PrimaryButton, SecondaryButton, Eyebrow, Num, NumText, PageHeader } from '../components/ui';
import { AscendAnimatedLogo } from '../components/AscendAnimatedLogo';
import { GoalFocusCard } from '../components/GoalFocusCard';
import { OnCourseCard } from '../components/OnCourseCard';
import { SeasonCard } from '../components/SeasonCard';
import { GoalSetupWizard } from '../components/GoalSetupWizard';
import { GoalTripNotes } from '../components/GoalTripNotes';
import { StrengthProgramCard } from '../components/StrengthProgramCard';
import { makeId } from '../utils/id';
import { goalPlanRole, isRaceGoal, RACE_BLOCK_WEEKS } from '../engine/raceBlock';
import { formatRaceTime, predictRace, predictionRange, TEST_NOISE } from '../engine/racePrediction';
import { NumberField } from '../components/NumberField';
import { formatNumberNL } from '../utils/number';
import { eventDaysRequirement, goalTiming, routeTotal, routeDayParts, routeDayWord, routeDiscipline, formatRouteDayValue, ROUTE_KINDS } from '../engine/goalRoute';
import { usePageState } from '../components/usePageState';
import { useHorizonChange } from '../components/useHorizonChange';
import { ImpactSheet } from '../components/ImpactSheet';
import { goalDateProblem } from '../engine/goalDate';
import { SkyBand } from '../components/SkyBand';

function blankGoalDraft(): TrainingGoal {
  const now = new Date().toISOString();
  return { id: makeId('goal'), name: '', requirements: [], createdAt: now, updatedAt: now, status: 'paused' };
}

// Surfaces the difference between 'active' and 'paused' that used to be
// invisible on every goal card — a goal reads as fully configured (a race
// type picked, a full editable card) with no visual sign it's actually
// paused and contributing nothing to Goal Focus/scheduling until a
// targetDate is set. Renders nothing for 'active' (the countdown above
// already implies it).
function GoalStatusNote({ status, goal }: { status: TrainingGoal['status']; goal?: TrainingGoal }) {
  // A multi-day goal without its day count can't be turned into a typical
  // day yet (engine/goalRoute.ts) — ASCEND then compares nothing per day
  // for its route values, so say so instead of silently under-planning.
  const missingDays = goal?.execution !== undefined && !eventDaysRequirement(goal.requirements)?.target;
  return (
    <>
      {status === 'paused' && (
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-warning)' }}>
          Gepauzeerd, nog geen streefdatum ingesteld. Telt zo nog niet mee bij de doelfocus of de planning.
        </p>
      )}
      {missingDays && (
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-warning)' }}>
          Het aantal loopdagen ontbreekt nog. Vul het in via Doel aanpassen, dan rekent ASCEND de tocht om naar een gemiddelde loopdag.
        </p>
      )}
    </>
  );
}

// One line that says what the trip is and what one day of it asks — the
// number training is actually measured against.
function RouteLine({ goal }: { goal: TrainingGoal }) {
  if (goal.execution === undefined) return null;
  const dayWord = routeDayWord(routeDiscipline(goal));
  const totals = ROUTE_KINDS.flatMap((k) => { const t = routeTotal(goal.requirements, k); return t ? [formatRouteDayValue(k, t.amount)] : []; });
  const days = eventDaysRequirement(goal.requirements)?.target?.amount;
  if (days) totals.push(`${days} ${dayWord.plural}`);
  const average = days && days > 1 ? routeDayParts(goal.requirements, 'average') : [];
  const training = routeDayParts(goal.requirements, 'training');
  if (totals.length === 0) return null;
  return (
    <div className="text-xs leading-relaxed">
      <p style={{ color: 'var(--color-ink)' }}>{totals.join(' · ')}</p>
      {average.length > 0 && <p style={{ color: 'var(--color-ink-dim)' }}>Gemiddelde {dayWord.singular}: {average.join(' · ')}</p>}
      {training.length > 0 && <p style={{ color: 'var(--color-ink-dim)' }}>Trainingsdag: {training.join(' · ')}</p>}
    </div>
  );
}

export function AscendPage() {
  const { sessionLogs, trainingGoals, goalMilestones, goalMilestoneProgress, clearMilestoneManually, settings } = useAppData();
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const [showLadder, setShowLadder] = usePageState('showLadder', false);
  const [splitOpen, setSplitOpen] = useState(false);
  // Archiving (below) sets status:'archived' in place rather than removing
  // the row, so every "find the live goal" lookup here must exclude it —
  // otherwise the dedicated GR5/Marathon cards would keep showing an
  // archived goal as if it were still active.
  const marathonGoal = trainingGoals.find((g) => g.name === 'Marathon' && g.status !== 'archived');

  // The GR5 goal is always the one with milestones — the marathon goal
  // (migrated from AppSettings) has none. Mirrors the old objectives[0]
  // assumption, now stated explicitly rather than by array position.
  const goal = trainingGoals.find((g) => g.status !== 'archived' && goalMilestones.some((m) => m.goalId === g.id));
  // Any other goal created via "+ NIEUW DOEL" — GR5 and Marathon each have
  // their own dedicated card above, so this is the only place a custom
  // goal is visible/editable/archivable at all.
  const customGoals = trainingGoals.filter(
    (g) => g.status !== 'archived' && g.name !== 'Marathon' && !goalMilestones.some((m) => m.goalId === g.id),
  );
  // Archiving used to be a one-way door — nothing in the UI ever read
  // status:'archived', so an archived goal simply vanished with no way
  // back except "+ NIEUW DOEL", which mints a fresh id and can never
  // re-link to GR5's own id-pinned goalMilestones. Surfaced here so a
  // mis-click (or an old habit of "archiving" instead of pausing) is
  // recoverable.
  const milestonesForGoal = useMemo(() => goalMilestones.filter((m) => m.goalId === goal?.id), [goalMilestones, goal?.id]);
  const progress = useMemo(
    () => (goal ? computeGoalProgress(goal.id, goal.name, milestonesForGoal, goalMilestoneProgress, sessionLogs) : null),
    [goal, milestonesForGoal, goalMilestoneProgress, sessionLogs],
  );
  // The one progress number (engine/gr5Readiness.ts): never a second one next to it.
  const gr5 = useMemo(() => (goal ? computeGr5Readiness(goal.requirements, sessionLogs, todayISO()) : undefined), [goal, sessionLogs]);
  const selectedMilestone = progress?.milestones.find((m) => m.definition.id === selectedMilestoneId);
  const selectedDetail = selectedMilestone ? getGR5MilestoneDetail(selectedMilestone.definition.order) : undefined;

  const navigate = useNavigate();
  // Ahead, underway (day N of the trip) or past (engine/goalRoute.ts#goalTiming).
  const timing = goal ? goalTiming(goal, todayISO()) : undefined;
  const counting = !timing || timing.state === 'ahead' || timing.state === 'undated';
  const marathonDate = marathonGoal?.targetDate ?? settings.marathonTargetDate;
  // A goal whose day has gone is not one you are on your way to any more.
  const notPast = (g: { targetDate?: string; requirements: TrainingGoal['requirements'] }) => goalTiming(g, todayISO()).state !== 'past';
  const otherGoals = [
    ...(marathonGoal && marathonGoal.status === 'active' && notPast({ targetDate: marathonDate, requirements: marathonGoal.requirements }) ? [{ id: marathonGoal.id, name: marathonGoal.name, date: marathonDate }] : []),
    ...customGoals.filter((g) => g.status === 'active' && notPast(g)).map((g) => ({ id: g.id, name: g.name, date: g.targetDate })),
  ];

  // Ascend is the overview: where you stand toward your goal. Setting goals
  // up lives on its own page (/doelen), so data and setup no longer mix
  // (production feedback: "te slordig", "raar dat dit bij elkaar staat").
  return (
    <div className="animate-page-in flex flex-col gap-5 px-4 pb-10">
      {/* The animated brand mark lives here, on the tab that carries its
          name: the light climbs the trail once each time you open Ascend. */}
      <SkyBand>
        <div className="flex items-center gap-4">
          <div className="shrink-0" aria-hidden="true"><AscendAnimatedLogo size={84} withWord={false} /></div>
          <div className="min-w-0 flex-1">
            <Eyebrow>{goal ? 'Hoofddoel' : 'Ascend'}</Eyebrow>
            <h1 className="font-display text-[28px] leading-[34px]" style={{ color: 'var(--color-ink)' }}>{goal ? goal.name : 'Ascend'}</h1>
            {goal ? (
              <div className="mt-1 flex flex-wrap items-baseline gap-x-3 text-sm" style={{ color: 'var(--color-ink-dim)' }}>
                {goal.targetDate && <span>{formatDateNL(goal.targetDate)}</span>}
                {timing?.state === 'ahead' && <span className="font-medium" style={{ color: 'var(--color-status)' }}>nog <Num>{timing.weeksLeft}</Num> {timing.weeksLeft === 1 ? 'week' : 'weken'}</span>}
                {timing?.state === 'underway' && <span className="font-medium" style={{ color: 'var(--color-status)' }}>onderweg, dag <Num>{timing.day}</Num> van <Num>{timing.days}</Num></span>}
                {timing?.state === 'past' && <span>voorbij</span>}
              </div>
            ) : (
              <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>Train. Progress. Explore. Ascend.</p>
            )}
          </div>
        </div>
        {goal && <RouteLine goal={goal} />}
      </SkyBand>
      {!goal && (
        <Card className="flex flex-col gap-3">
          <Eyebrow>HOOFDDOEL</Eyebrow>
          <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>Je hebt nog geen hoofddoel. Stel er een in, dan bouwt ASCEND je training ernaartoe op.</p>
          <PrimaryButton onClick={() => navigate('/ascend/doelen')}>Doel instellen</PrimaryButton>
        </Card>
      )}

      {gr5 && counting && <Gr5ReadinessCard readiness={gr5} />}

      {goal?.targetDate && goal.status === 'active' && counting && <OnCourseCard goalName={goal.name} goalDate={goal.targetDate} />}

      {goal && (timing?.state === 'underway' || timing?.state === 'past') && (
        <Card className="flex flex-col gap-2">
          <Eyebrow>{timing.state === 'underway' ? 'ONDERWEG' : 'ACHTER JE'}</Eyebrow>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
            {timing.state === 'underway'
              ? `Je bent onderweg op de ${goal.name}. Tijdens de tocht plant ASCEND geen training: de tocht is de training.`
              : settings.afterMainGoal === 'maintain'
                ? `De ${goal.name} ligt achter je. ASCEND plant onderhoudsweken tot je een nieuw doel kiest of dit doel op behaald zet.`
                : `De ${goal.name} ligt achter je. Na je hoofddoel plant ASCEND geen training meer, tot je een nieuw doel kiest of dit doel op behaald zet.`}
          </p>
          <SecondaryButton onClick={() => navigate('/ascend/doelen')}>Naar je doelen</SecondaryButton>
        </Card>
      )}

      {progress && goal && progress.currentMilestone && !showLadder && (
        <Card className="flex flex-col gap-2">
          <Eyebrow>VOLGEND KAMP</Eyebrow>
          <button onClick={() => setSelectedMilestoneId(progress.currentMilestone!.definition.id)} className="text-left">
            <p className="font-display text-xl" style={{ color: 'var(--color-ink)' }}><NumText>{progress.currentMilestone.definition.title}</NumText></p>
            {getGR5MilestoneDetail(progress.currentMilestone.definition.order)?.subtitle && (
              <p className="mt-0.5 text-xs" style={{ color: 'var(--color-action)' }}>{getGR5MilestoneDetail(progress.currentMilestone.definition.order)?.subtitle}</p>
            )}
          </button>
          <div className="mt-1 flex gap-1">
            {progress.milestones.map((m) => (
              <span key={m.definition.id} className="h-1.5 flex-1 rounded-full" style={{ background: m.status === 'completed' ? 'var(--color-action)' : m.status === 'current' ? 'var(--color-bronze-dark)' : 'var(--color-card-border)' }} />
            ))}
          </div>
          <button onClick={() => setShowLadder(true)} className="flex min-h-11 items-center justify-between text-sm" style={{ color: 'var(--color-ink-dim)' }}>Alle {progress.milestones.length} kampen bekijken<Icon name="omlaag" size={18} /></button>
        </Card>
      )}

      {progress && goal && showLadder && (
        <>
          <AscentLadder
            progress={progress}
            description={GR5_TRACK_DESCRIPTION}
            onMarkCleared={(milestoneId) => clearMilestoneManually(goal.id, milestoneId)}
            onSelectMilestone={setSelectedMilestoneId}
          />
          <button onClick={() => setShowLadder(false)} className="-mt-3 flex min-h-11 items-center gap-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>Inklappen<span style={{ transform: 'rotate(180deg)' }} className="flex"><Icon name="omlaag" size={18} /></span></button>
        </>
      )}

      {goal && (
        <Card className="flex flex-col gap-1">
          <Eyebrow>DE ROUTE</Eyebrow>
          <button onClick={() => navigate('/etappes')} className="flex min-h-[56px] items-center justify-between gap-3 border-b py-2 text-left" style={{ borderColor: 'var(--color-card-border)' }}>
            <span>
              <span className="block text-sm" style={{ color: 'var(--color-ink)' }}>Etappeplan</span>
              <span className="block text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>De 36 etappes, je zwaarste dagen en waar je slaapt. Ook zonder bereik.</span>
            </span>
            <span className="shrink-0" style={{ color: 'var(--color-ink-dim)' }}><Icon name="verder" size={18} /></span>
          </button>
          <button onClick={() => navigate('/onderweg')} className="flex min-h-[56px] items-center justify-between gap-3 py-2 text-left">
            <span>
              <span className="block text-sm" style={{ color: 'var(--color-ink)' }}>Alleen onderweg</span>
              <span className="block text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Alarmnummer, je afspraak met thuis en de vertrekbrief.</span>
            </span>
            <span className="shrink-0" style={{ color: 'var(--color-ink-dim)' }}><Icon name="verder" size={18} /></span>
          </button>
        </Card>
      )}

      <NextTrekLine />

      {otherGoals.length > 0 && (
        <Card className="flex flex-col gap-2">
          <Eyebrow>OOK ONDERWEG NAAR</Eyebrow>
          {otherGoals.map((g) => (
            <div key={g.id} className="flex items-baseline justify-between text-sm">
              <span style={{ color: 'var(--color-ink)' }}>{g.name}</span>
              <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{g.date ? formatDateNL(g.date) : 'geen datum'}</span>
            </div>
          ))}
        </Card>
      )}

      {goal ? <PrimaryButton onClick={() => navigate('/ascend/doelen')}>Doelen beheren</PrimaryButton> : <SecondaryButton onClick={() => navigate('/ascend/doelen')}>Doelen beheren</SecondaryButton>}

      <StrengthProgressionCard logs={sessionLogs} />

      <Card className="flex flex-col">
        <button onClick={() => setSplitOpen(true)} className="flex min-h-[56px] items-center justify-between gap-3 py-1 text-left">
          <span className="min-w-0">
            <Eyebrow>TRAININGSVERDELING RICHTING GR5</Eyebrow>
            <span className="mt-1 block text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Hoe kracht, hardlopen en bergwerk zich in je week verhouden.</span>
          </span>
          <span className="shrink-0" style={{ color: 'var(--color-ink-dim)' }}><Icon name="verder" size={18} /></span>
        </button>
      </Card>

      <JourneyEntryCard />

      {splitOpen && <TrainingSplitSheet onClose={() => setSplitOpen(false)} />}

      {selectedMilestone && selectedDetail && (
        <MilestoneDetailSheet
          title={selectedMilestone.definition.title}
          detail={selectedDetail}
          onClose={() => setSelectedMilestoneId(null)}
        />
      )}
    </div>
  );
}

// Doelen beheren: everything you set up (main goal, marathon, other goals,
// the strength block, how goals weigh against each other). Reached from
// the Ascend overview.
export function GoalsPage() {
  const { trainingGoals, goalMilestones, sessionLogs, updateGoal, planGoalChange, unarchiveGoal, planMarathonGoal, settings } = useAppData();
  const [creatingGoal, setCreatingGoal] = useState<TrainingGoal | null>(null);
  // Another date or archiving changes the planning: first the proposal, stored
  // only with Akkoord (components/useHorizonChange.tsx). Archiving asks first.
  const horizon = useHorizonChange();
  const [archiving, setArchiving] = useState<TrainingGoal | null>(null);
  const keep = 'Je doel en je planning blijven zoals ze waren.';
  // Liever niet puts the typed date or time back to what is stored (Lookout punt 1).
  const [draftReset, setDraftReset] = useState(0);
  const resetDrafts = () => setDraftReset((n) => n + 1);
  const changeDate = (goalId: string, date: string | null) =>
    horizon.propose(() => planGoalChange(goalId, { targetDate: date }), { eyebrow: 'Doeldatum', ask: 'always', declined: keep, onDeclined: resetDrafts });
  const archive = (g: TrainingGoal) => {
    setArchiving(null);
    void horizon.propose(() => planGoalChange(g.id, { archive: true }), { eyebrow: 'Doel archiveren', ask: 'always', declined: keep });
  };
  const askArchive = (goalId: string) => setArchiving(trainingGoals.find((g) => g.id === goalId) ?? null);
  // The Marathon card: another date, type or time is a proposal too; when the
  // planning does not change, it is simply stored.
  const changeMarathon = (patch: MarathonGoalPatch) =>
    void horizon.propose(() => planMarathonGoal(patch), { eyebrow: 'Marathondoel', ask: 'always', declined: keep, onDeclined: resetDrafts });
  const goal = trainingGoals.find((g) => g.status !== 'archived' && goalMilestones.some((m) => m.goalId === g.id));
  const marathonGoal = trainingGoals.find((g) => g.name === 'Marathon' && g.status !== 'archived');
  const customGoals = trainingGoals.filter((g) => g.status !== 'archived' && g.name !== 'Marathon' && !goalMilestones.some((m) => m.goalId === g.id));
  const archivedGoals = trainingGoals.filter((g) => g.status === 'archived');

  return (
    <div className="animate-page-in flex flex-col gap-5 px-4 pb-10 pt-6">
      <PageHeader eyebrow="Ascend" title="Doelen" line="Eén hoofddoel waar je plan naartoe werkt, en tussendoelen die erin passen." fallback="/ascend" />

      {horizon.note && (
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }} role="status">{horizon.note}</p>
      )}

      <SeasonCard />

      {goal && <GR5GoalCard key={goal.targetDate ?? 'geen-datum'} goal={goal} busy={horizon.busy} resetKey={draftReset} onUpdate={(patch) => updateGoal(goal.id, patch)} onDate={(date) => void changeDate(goal.id, date)} onArchive={() => askArchive(goal.id)} />}

      <MarathonGoalCard key={`${marathonGoal?.targetDate ?? settings.marathonTargetDate ?? ''}|${settings.marathonTargetTimeMinutes ?? ''}`} settings={settings} sessionLogs={sessionLogs} marathonGoal={marathonGoal} busy={horizon.busy} resetKey={draftReset} onUpdate={changeMarathon} onArchive={marathonGoal ? () => askArchive(marathonGoal.id) : undefined} />

      <CustomGoalsList goals={customGoals} onArchive={askArchive} />

      <TrekGoalsCard />

      <PrimaryButton onClick={() => setCreatingGoal(blankGoalDraft())}>Nieuw doel of tussendoel</PrimaryButton>
      {creatingGoal && <GoalSetupWizard mode="create" initialGoal={creatingGoal} onClose={() => setCreatingGoal(null)} />}

      <GoalFocusCard />

      <StrengthProgramCard />

      <ArchivedGoalsCard goals={archivedGoals} onUnarchive={unarchiveGoal} />

      {archiving && (
        <ImpactSheet
          eyebrow="DOEL ARCHIVEREN"
          title={`${archiving.name} archiveren?`}
          lines={[]}
          why="Een gearchiveerd doel telt niet meer mee voor je planning. Heeft dat gevolgen voor je trainingen, dan zie je eerst wat er verandert en beslis je daarna. Je kunt het doel later terughalen."
          primaryLabel="Archiveren"
          secondaryLabel="Annuleren"
          onPrimary={() => archive(archiving)}
          onSecondary={() => setArchiving(null)}
          onClose={() => setArchiving(null)}
          busy={horizon.busy}
        />
      )}
      {horizon.sheet}
    </div>
  );
}

const dateInputStyle = { background: 'var(--color-charcoal)', borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' };

// Date-driven UI guidance only — deliberately not an engine/scheduler
// change that auto-mutates session durations. Just a nudge on the goal
// card itself once a target date is close.
const TAPER_WINDOW_DAYS = 14;

function isTaperWindow(daysLeft: number | undefined): boolean {
  return daysLeft !== undefined && daysLeft >= 0 && daysLeft <= TAPER_WINDOW_DAYS;
}

function StrengthProgressionCard({ logs }: { logs: SessionLog[] }) {
  const exercises = useMemo(() => listLoggedExercises(logs), [logs]);
  const [selectedId, setSelectedId] = useState<string | undefined>(exercises[0]?.id);
  const activeId = selectedId && exercises.some((e) => e.id === selectedId) ? selectedId : exercises[0]?.id;
  const progression = useMemo(() => (activeId ? computeExerciseProgression(logs, activeId) : []), [logs, activeId]);

  if (exercises.length === 0) return null;

  return (
    <Card>
      <Eyebrow>KRACHTPROGRESSIE</Eyebrow>
      <select
        value={activeId}
        onChange={(e) => setSelectedId(e.target.value)}
        aria-label="Oefening"
        className="mt-2 block min-h-[44px] w-full min-w-0 max-w-full truncate rounded-lg border bg-transparent px-3 py-2 text-sm"
        style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}
      >
        {exercises.map((ex) => (
          <option key={ex.id} value={ex.id} style={{ background: 'var(--color-card)' }}>{ex.name}</option>
        ))}
      </select>
      {progression.length >= 2 ? (
        <div className="mt-3">
          <TrendLineChart points={progression} formatValue={(v) => `${v} kg`} />
        </div>
      ) : (
        <p className="mt-3 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
          Nog te weinig trainingen van deze oefening om een trend te tonen.
        </p>
      )}
    </Card>
  );
}

function GR5GoalCard({
  goal,
  busy,
  resetKey,
  onUpdate,
  onDate,
  onArchive,
}: {
  goal: TrainingGoal;
  busy: boolean;
  // Raised on Liever niet: the typed date goes back to the stored one.
  resetKey: number;
  onUpdate: (patch: { targetDistanceKm?: number; packWeightKg?: number }) => void;
  // Another date (or none): a proposal first, never stored while you type.
  onDate: (date: string | null) => void;
  onArchive: () => void;
}) {
  const navigate = useNavigate();
  const daysLeft = goal.targetDate ? daysBetween(todayISO(), goal.targetDate) : undefined;
  const targetDistanceKm = findRequirement(goal, 'distance')?.target?.amount;
  const [wizardOpen, setWizardOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  // The date as you type it: stored only with "Datum opslaan" and then Akkoord.
  const [dateDraft, setDateDraft] = useState(goal.targetDate ?? '');
  const [seenReset, setSeenReset] = useState(resetKey);
  if (seenReset !== resetKey) {
    setSeenReset(resetKey);
    setDateDraft(goal.targetDate ?? '');
  }
  const today = todayISO();
  const dateProblem = goalDateProblem(dateDraft || undefined, today, goal.targetDate);
  const dateChanged = dateDraft !== (goal.targetDate ?? '');

  return (
    <Card className="flex flex-col gap-3">
      <Eyebrow>GR5-DOEL</Eyebrow>
      <GoalStatusNote status={goal.status} goal={goal} />
      <RouteLine goal={goal} />
      <GoalTripNotes goal={goal} onPackChange={(kg) => onUpdate({ packWeightKg: kg })} />
      <div className="flex gap-3">
        <SecondaryButton onClick={() => navigate('/etappes')}>Etappeplan</SecondaryButton>
        <SecondaryButton onClick={() => navigate('/onderweg')}>Alleen onderweg</SecondaryButton>
      </div>
      {daysLeft !== undefined && (
        <p className="font-display text-2xl" style={{ color: 'var(--color-action)' }}>
          {daysLeft > 0 ? <>nog <Num>{daysLeft}</Num> dagen</> : daysLeft === 0 ? 'Vandaag is de dag' : 'Datum verstreken'}
        </p>
      )}
      {isTaperWindow(daysLeft) && (
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-alpine)' }}>
          Taper: bouw dagelijkse afstand en D+ de komende twee weken rustig af, houd de benen fris en zorg voor
          extra slaap en herstel richting de tocht.
        </p>
      )}

      <SecondaryButton onClick={() => setWizardOpen(true)}>Doel aanpassen</SecondaryButton>

      <button onClick={() => setAdvancedOpen((s) => !s)} className="min-h-[44px] text-left text-xs" style={{ color: 'var(--color-ink-dim)' }}>
        {advancedOpen ? '− geavanceerd: velden direct aanpassen' : '+ geavanceerd: velden direct aanpassen'}
      </button>

      {advancedOpen && (
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }} htmlFor="gr5-start">Doeldatum</label>
          <input
            id="gr5-start"
            type="date"
            value={dateDraft}
            min={today}
            onChange={(e) => setDateDraft(e.target.value)}
            className="mt-1 min-h-[44px] w-full rounded-lg border px-2 py-1.5 text-sm"
            style={dateInputStyle}
          />
          {dateChanged && dateProblem && <p className="mt-1 text-xs" style={{ color: 'var(--color-warning)' }} role="alert">{dateProblem}</p>}
          {dateChanged && !dateProblem && (
            <div className="mt-2 flex flex-col gap-2">
              <SecondaryButton onClick={() => onDate(dateDraft || null)} disabled={busy}>{busy ? 'Even rekenen…' : 'Datum opslaan'}</SecondaryButton>
              <button onClick={() => setDateDraft(goal.targetDate ?? '')} className="min-h-[44px] text-left text-xs" style={{ color: 'var(--color-ink-dim)' }}>Annuleren</button>
            </div>
          )}
        </div>
        <div className="flex-1">
          <NumberField
            label="Afstand"
            unit="km"
            decimals={1}
            value={targetDistanceKm}
            onChange={(v) => onUpdate({ targetDistanceKm: v })}
            placeholder="600"
          />
        </div>
      </div>
      )}

      <SecondaryButton onClick={onArchive}>Doel archiveren</SecondaryButton>

      {wizardOpen && <GoalSetupWizard mode="edit" initialGoal={goal} onClose={() => setWizardOpen(false)} />}
    </Card>
  );
}

const RACE_DISTANCE_KM: Record<'half' | 'full', number> = { half: 21.1, full: 42.2 };


// Standalone goal, not a second GoalAchievementTrack/GoalMilestone ladder —
// the Ascent Ladder only ever renders the one goal that actually has
// milestones (Today, Ascend), so a second ladder would need a broader
// refactor. This mirrors GR5GoalCard's UI instead, backed by AppSettings.
// Migrated into its own TrainingGoal (storage/goalMigration.ts) purely so
// it's visible to the goal engine's storage layer — the UI here is
// unchanged and still reads/writes AppSettings directly.
function MarathonGoalCard({
  settings,
  sessionLogs,
  marathonGoal,
  busy,
  resetKey,
  onUpdate,
  onArchive,
}: {
  settings: AppSettings;
  sessionLogs: SessionLog[];
  marathonGoal: TrainingGoal | undefined;
  busy: boolean;
  resetKey: number;
  // Every change is a proposal first (GoalsPage#changeMarathon), never stored while you type.
  onUpdate: (patch: MarathonGoalPatch) => void;
  onArchive?: () => void;
}) {
  const raceType = settings.marathonRaceType;
  const distanceKm = raceType ? RACE_DISTANCE_KM[raceType] : undefined;
  // The goal itself is the source of truth for its date: the wizard sets
  // it there, the quick fields below mirror it into settings.
  const targetDate = marathonGoal?.targetDate ?? settings.marathonTargetDate;
  const daysLeft = targetDate ? daysBetween(todayISO(), targetDate) : undefined;
  const [wizardOpen, setWizardOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // The wizard always needs a real TrainingGoal draft to edit — the
  // migrated one (storage/goalMigration.ts#buildMarathonGoal) once it
  // exists, kept in sync going forward by updateMarathonGoal
  // (state/AppDataContext.tsx); a fresh, not-yet-persisted draft mirroring
  // the current quick-pick fields otherwise, so choosing a race type
  // first is never a hard requirement to reach the wizard.
  const wizardDraft = useMemo<TrainingGoal>(() => {
    if (marathonGoal) return marathonGoal;
    const now = new Date().toISOString();
    return {
      id: makeId('goal'),
      name: 'Marathon',
      requirements: raceType ? [{ id: makeId('req'), kind: 'distance', scope: 'SINGLE_EVENT', target: { amount: RACE_DISTANCE_KM[raceType], unit: 'km' }, discipline: 'running' }] : [],
      createdAt: now,
      updatedAt: now,
      status: 'paused',
    };
  }, [marathonGoal, raceType]);

  // Longest tpl_long_run so far — that template is 'hiking' type, so its
  // distance lives under outdoorData (see models/training.ts).
  const longestRunKm = useMemo(() => {
    const distances = sessionLogs
      .filter((l) => l.templateId === 'tpl_long_run')
      .map((l) => l.outdoorData?.distanceKm ?? l.cardioData?.distanceKm ?? 0);
    return distances.length > 0 ? Math.max(...distances) : 0;
  }, [sessionLogs]);

  const totalMinutes = settings.marathonTargetTimeMinutes;
  // The date and time as you type them: stored only with Opslaan, and then
  // the proposal (Warden Planning punt 6).
  const today = todayISO();
  const [dateDraft, setDateDraft] = useState(targetDate ?? '');
  const dateProblem = goalDateProblem(dateDraft || undefined, today, targetDate);
  const dateChanged = dateDraft !== (targetDate ?? '');
  const [hoursDraft, setHoursDraft] = useState(totalMinutes !== undefined ? String(Math.floor(totalMinutes / 60)) : '');
  const [minutesDraft, setMinutesDraft] = useState(totalMinutes !== undefined ? String(totalMinutes % 60) : '');
  const typedMinutes = hoursDraft === '' && minutesDraft === '' ? undefined : (Number(hoursDraft) || 0) * 60 + (Number(minutesDraft) || 0);
  const timeChanged = typedMinutes !== totalMinutes;
  const resetTime = () => {
    setHoursDraft(totalMinutes !== undefined ? String(Math.floor(totalMinutes / 60)) : '');
    setMinutesDraft(totalMinutes !== undefined ? String(totalMinutes % 60) : '');
  };
  const [seenReset, setSeenReset] = useState(resetKey);
  if (seenReset !== resetKey) {
    setSeenReset(resetKey);
    setDateDraft(targetDate ?? '');
    resetTime();
  }

  return (
    <Card className="flex flex-col gap-3">
      <Eyebrow>MARATHONDOEL</Eyebrow>
      <div className="flex gap-2">
        {(['half', 'full'] as const).map((type) => (
          <button
            key={type}
            onClick={() => { if (raceType !== type) onUpdate({ marathonRaceType: type }); }}
            disabled={busy}
            className="min-h-[44px] flex-1 rounded-xl border py-2 text-xs font-medium transition-all active:scale-[0.97]"
            style={{
              borderColor: raceType === type ? 'var(--color-action)' : 'var(--color-card-border)',
              color: raceType === type ? 'var(--color-action)' : 'var(--color-ink)',
            }}
          >
            {type === 'half' ? 'Halve (21,1 km)' : 'Hele (42,2 km)'}
          </button>
        ))}
      </div>

      {raceType && (
        <>
          <GoalStatusNote status={marathonGoal?.status ?? 'paused'} />
          {daysLeft !== undefined && (
            <p className="font-display text-2xl" style={{ color: 'var(--color-action)' }}>
              {daysLeft > 0 ? <>nog <Num>{daysLeft}</Num> dagen</> : daysLeft === 0 ? 'Vandaag is de dag' : 'Datum verstreken'}
            </p>
          )}
          {isTaperWindow(daysLeft) && (
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-alpine)' }}>
              Taper: bouw het volume de komende twee weken af, houd de intensiteit kort maar scherp, en focus op
              slaap en voeding richting de start.
            </p>
          )}

          <SecondaryButton onClick={() => setWizardOpen(true)}>Doel aanpassen</SecondaryButton>

          <button onClick={() => setAdvancedOpen((s) => !s)} className="min-h-[44px] text-left text-xs" style={{ color: 'var(--color-ink-dim)' }}>
            {advancedOpen ? '− geavanceerd: velden direct aanpassen' : '+ geavanceerd: velden direct aanpassen'}
          </button>

          {advancedOpen && (
            <>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }} htmlFor="marathon-date">Wedstrijddatum</label>
                  <input
                    id="marathon-date"
                    type="date"
                    value={dateDraft}
                    min={today}
                    onChange={(e) => setDateDraft(e.target.value)}
                    className="mt-1 min-h-[44px] w-full rounded-lg border px-2 py-1.5 text-sm"
                    style={dateInputStyle}
                  />
                  {dateChanged && dateProblem && <p className="mt-1 text-xs" style={{ color: 'var(--color-warning)' }} role="alert">{dateProblem}</p>}
                  {dateChanged && !dateProblem && (
                    <div className="mt-2 flex flex-col gap-2">
                      <SecondaryButton onClick={() => onUpdate({ marathonTargetDate: dateDraft || undefined })} disabled={busy}>{busy ? 'Even rekenen…' : 'Datum opslaan'}</SecondaryButton>
                      <button onClick={() => setDateDraft(targetDate ?? '')} className="min-h-[44px] text-left text-xs" style={{ color: 'var(--color-ink-dim)' }}>Annuleren</button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Doeltijd, uur</label>
                  <input
                    type="number"
                    min={0}
                    value={hoursDraft}
                    onChange={(e) => setHoursDraft(e.target.value)}
                    className="mt-1 min-h-[44px] w-full rounded-lg border px-2 py-1.5 text-sm"
                    style={dateInputStyle}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Doeltijd, min</label>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={minutesDraft}
                    onChange={(e) => setMinutesDraft(e.target.value)}
                    className="mt-1 min-h-[44px] w-full rounded-lg border px-2 py-1.5 text-sm"
                    style={dateInputStyle}
                  />
                </div>
              </div>
              {timeChanged && (
                <div className="flex flex-col gap-2">
                  <SecondaryButton onClick={() => onUpdate({ marathonTargetTimeMinutes: typedMinutes })} disabled={busy}>{busy ? 'Even rekenen…' : 'Doeltijd opslaan'}</SecondaryButton>
                  <button onClick={resetTime} className="min-h-[44px] text-left text-xs" style={{ color: 'var(--color-ink-dim)' }}>Annuleren</button>
                </div>
              )}
            </>
          )}
          {longestRunKm > 0 && (
            <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
              Langste duurloop tot nu toe: {formatNumberNL(longestRunKm, 1)} km{distanceKm ? ` van de ${formatNumberNL(distanceKm, 1)} km` : ''}.
            </p>
          )}
          {onArchive && (
            <SecondaryButton onClick={onArchive}>Doel archiveren</SecondaryButton>
          )}
        </>
      )}

      {wizardOpen && <GoalSetupWizard mode="edit" initialGoal={wizardDraft} onClose={() => setWizardOpen(false)} />}
    </Card>
  );
}

// Any goal created via "+ NIEUW DOEL" that isn't GR5 (has its own ladder
// card above) or Marathon (its own settings-backed card above) — until
// now these had no edit/archive entry point at all outside the read-only
// DOELFOCUS overview.
function CustomGoalsList({ goals, onArchive }: { goals: TrainingGoal[]; onArchive: (goalId: string) => void }) {
  const [editing, setEditing] = useState<TrainingGoal | null>(null);
  if (goals.length === 0) return null;

  return (
    <Card className="flex flex-col gap-3">
      <Eyebrow>TUSSENDOELEN EN ANDERE DOELEN</Eyebrow>
      {goals.map((g) => (
        <div key={g.id} className="flex flex-col gap-2 border-t pt-3 first:border-t-0 first:pt-0" style={{ borderColor: 'var(--color-card-border)' }}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{g.name || 'Naamloos doel'}</p>
            <div className="flex shrink-0 gap-3">
              <SecondaryButton onClick={() => setEditing(g)}>Aanpassen</SecondaryButton>
              <button onClick={() => onArchive(g.id)} className="min-h-[44px] text-xs" style={{ color: 'var(--color-danger-text)' }}>archiveren</button>
            </div>
          </div>
          <GoalStatusNote status={g.status} goal={g} />
          <RouteLine goal={g} />
          <GoalRoleRow goal={g} />
        </div>
      ))}
      {editing && <GoalSetupWizard mode="edit" initialGoal={editing} onClose={() => setEditing(null)} />}
    </Card>
  );
}

// A race before the main goal: tussendoel (its own 8-week block in the
// plan, engine/raceBlock.ts) or only followed. Other goals are followed.
function GoalRoleRow({ goal }: { goal: TrainingGoal }) {
  const { planGoalRole, trainingGoals, goalMilestones, sessionLogs } = useAppData();
  // Tussendoel or Alleen volgen changes the planning: first the proposal.
  const horizon = useHorizonChange();
  if (!isRaceGoal(goal)) return null;
  const raceKm = goal.requirements.find((r) => r.kind === 'distance' && r.target?.unit === 'km')?.target?.amount;
  const targetMin = goal.requirements.find((r) => r.kind === 'targetTime' && r.target?.unit === 'min')?.target?.amount;
  const prediction = raceKm ? predictRace(sessionLogs, raceKm) : undefined;
  const ladder = new Set(goalMilestones.map((m) => m.goalId));
  const mainGoalId = trainingGoals.find((g) => g.status === 'active' && ladder.has(g.id))?.id;
  const role = goalPlanRole(goal, mainGoalId);
  const blockStart = goal.targetDate ? addDays(mondayOfWeek(goal.targetDate), -7 * RACE_BLOCK_WEEKS) : undefined;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2" role="radiogroup" aria-label="Rol in je plan">
        {([['secondary', 'Tussendoel'], ['track', 'Alleen volgen']] as const).map(([value, label]) => (
          <button
            key={value}
            role="radio"
            aria-checked={role === value}
            onClick={() => { if (role !== value) void horizon.propose(() => planGoalRole(goal.id, value), { eyebrow: 'Rol in je plan', ask: 'always', declined: 'Je doel en je planning blijven zoals ze waren.' }); }}
            disabled={horizon.busy}
            className="min-h-[44px] flex-1 rounded-lg border text-xs font-semibold"
            style={{ borderColor: role === value ? 'var(--color-progress)' : 'var(--color-card-border)', color: role === value ? 'var(--color-action)' : 'var(--color-ink-dim)', background: 'var(--color-charcoal)' }}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
        {role === 'secondary'
          ? `Tussendoel: ASCEND traint ervoor.${blockStart ? ` Vanaf ${formatDateNL(blockStart)} krijgt elke week een kwaliteitstraining voor je wedstrijd: een tempoloop of lange intervallen. Met drie loopjes per week is dat er één, de belangrijkste van die week; met vier of meer loopjes allebei. Er komt een testloop de week ervoor. Een eerste testloop komt al eerder, zodat ASCEND je tempo kent.` : ''} De wedstrijd komt in je planning, de wedstrijdweek is licht en de lange duurloop erna kort.`
          : 'Alleen volgen: je ziet hoe je ervoor staat, maar je planning verandert er niet voor.'}
      </p>
      {prediction?.predictedMinutes !== undefined && (
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink)' }}>
          Laatste testloop: {formatNumberNL(prediction.latest.km, 1)} km in {formatRaceTime(prediction.latest.minutes)}. Voorspelde {formatNumberNL(raceKm!, 1)} km: <span style={{ color: 'var(--color-action)' }}>tussen {formatRaceTime(predictionRange(prediction.predictedMinutes)[0])} en {formatRaceTime(predictionRange(prediction.predictedMinutes)[1])}</span>
          {targetMin ? `, je doel is ${formatRaceTime(targetMin)}` : ''}.
          {prediction.change !== undefined && (Math.abs(prediction.change) < TEST_NOISE
            ? ' Gelijk aan je vorige test: verschillen tot 3 à 4% zijn normale schommeling.'
            : prediction.change < 0
              ? ` ${Math.round(-prediction.change * 100)}% sneller dan je vorige test.`
              : ` ${Math.round(prediction.change * 100)}% langzamer dan je vorige test.`)}
        </p>
      )}
      {horizon.note && <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }} role="status">{horizon.note}</p>}
      {horizon.sheet}
    </div>
  );
}

// The recovery path for the archiving above — collapsed by default since
// this is a rarely-needed corner, not a primary action. Reactivating puts
// a goal back to 'paused' (never straight to 'active' — archiving cleared
// its targetDate), from where its own dedicated card (GR5/Marathon) or
// the custom-goals list above picks it back up, ready for a new date.
function ArchivedGoalsCard({ goals, onUnarchive }: { goals: TrainingGoal[]; onUnarchive: (goalId: string) => void }) {
  const [open, setOpen] = usePageState('archivedGoalsOpen', false);
  if (goals.length === 0) return null;

  return (
    <Card className="flex flex-col gap-3">
      <button onClick={() => setOpen((s) => !s)} className="flex min-h-[44px] items-center justify-between gap-3 text-left">
        <Eyebrow>GEARCHIVEERDE DOELEN ({goals.length})</Eyebrow>
        <span className="shrink-0 text-sm" style={{ color: 'var(--color-action)' }}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-3">
          {goals.map((g) => (
            <div key={g.id} className="flex items-center justify-between gap-3 border-t pt-3 first:border-t-0 first:pt-0" style={{ borderColor: 'var(--color-card-border)' }}>
              <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>{g.name || 'Naamloos doel'}</p>
              <button onClick={() => onUnarchive(g.id)} className="inline-flex min-h-[44px] items-center shrink-0 text-xs underline underline-offset-2" style={{ color: 'var(--color-sky)' }}>
                heractiveren
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
