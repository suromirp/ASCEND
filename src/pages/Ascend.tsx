import { useMemo, useState } from 'react';
import type { TrainingGoal } from '../models/goals';
import type { SessionLog } from '../models/training';
import type { AppSettings } from '../storage/database';
import { useAppData } from '../state/AppDataContext';
import { isIllnessDay } from '../engine/illness';
import { computeReadiness, computeReadinessTrend, droppedAfterMissIds } from '../engine/readiness';
import { computeCapacity } from '../engine/capacity';
import { targetPackWeightKg } from '../engine/demand';
import { computeGoalProgress } from '../engine/progression';
import { findRequirement } from '../engine/goals';
import { computeExerciseProgression, listLoggedExercises } from '../engine/strengthProgression';
import { daysBetween, formatDateNL, todayISO } from '../utils/dates';
import { useNavigate } from 'react-router-dom';
import { BackButton } from '../components/BackButton';
import { MetricBar } from '../components/MetricBar';
import { AscentLadder } from '../components/AscentLadder';
import { MilestoneDetailSheet } from '../components/MilestoneDetailSheet';
import { TrendLineChart } from '../components/TrendLineChart';
import { getGR5MilestoneDetail, GR5_TRACK_DESCRIPTION, GR5_PACKING_LIST, GR5_PACKING_NOTE, GR5_PACKING_SOURCES, GR5_TRAINING_SPLIT_SOURCES } from '../data/gr5Details';
import { Card, PrimaryButton, SecondaryButton, Eyebrow } from '../components/ui';
import { GoalFocusCard } from '../components/GoalFocusCard';
import { GoalSetupWizard } from '../components/GoalSetupWizard';
import { StrengthProgramCard } from '../components/StrengthProgramCard';
import { makeId } from '../utils/id';
import { NumberField } from '../components/NumberField';
import { formatNumberNL } from '../utils/number';
import { eventDaysRequirement, routeTotal, routeDayParts, routeDayWord, routeDiscipline, formatRouteDayValue, ROUTE_KINDS } from '../engine/goalRoute';

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
  const { program, sessionLogs, plannedSessions, trainingGoals, goalMilestones, goalMilestoneProgress, clearMilestoneManually, settings, templateById, planChangeLog } = useAppData();
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const [showPackingList, setShowPackingList] = useState(false);
  const [showLadder, setShowLadder] = useState(false);
  // Archiving (below) sets status:'archived' in place rather than removing
  // the row, so every "find the live goal" lookup here must exclude it —
  // otherwise the dedicated GR5/Marathon cards would keep showing an
  // archived goal as if it were still active.
  const marathonGoal = trainingGoals.find((g) => g.name === 'Marathon' && g.status !== 'archived');

  const programStart = program?.startDate;
  const illnessEpisodes = settings.illnessEpisodes;
  const readinessExtras = useMemo(() => ({
    isRest: (p: { templateId: string }) => templateById.get(p.templateId)?.type === 'recovery',
    droppedAfterMissIds: droppedAfterMissIds(planChangeLog),
  }), [templateById, planChangeLog]);
  const readiness = useMemo(() => computeReadiness(sessionLogs, plannedSessions, 28, undefined, programStart, (d) => isIllnessDay(d, illnessEpisodes, todayISO()), readinessExtras), [sessionLogs, plannedSessions, programStart, illnessEpisodes, readinessExtras]);
  const readinessTrend = useMemo(() => computeReadinessTrend(sessionLogs, plannedSessions, 8, programStart, readinessExtras), [sessionLogs, plannedSessions, programStart, readinessExtras]);
  // Sports-science review, item B1: capacity ("what have you demonstrably
  // been building lately") and readiness ("are you acutely ready for more
  // right now") were previously one flat 7-score average — split into two
  // engines (engine/capacity.ts vs engine/readiness.ts) and shown here as
  // two separate cards, not re-averaged back together.
  // Fase 6 (sports-science review, item D2): pack-capability targets
  // whichever active goal actually set a pack-weight requirement, not a
  // universal hard cap.
  const packWeightTargetKg = useMemo(
    () => trainingGoals.filter((g) => g.status === 'active').map((g) => targetPackWeightKg(g.requirements)).find((v) => v !== undefined),
    [trainingGoals],
  );
  const capacity = useMemo(() => computeCapacity(sessionLogs, 28, undefined, packWeightTargetKg), [sessionLogs, packWeightTargetKg]);
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
  const selectedMilestone = progress?.milestones.find((m) => m.definition.id === selectedMilestoneId);
  const selectedDetail = selectedMilestone ? getGR5MilestoneDetail(selectedMilestone.definition.order) : undefined;

  const navigate = useNavigate();
  const weeksLeft = goal?.targetDate ? Math.max(0, Math.ceil(daysBetween(todayISO(), goal.targetDate) / 7)) : undefined;
  const cleared = progress ? progress.milestones.filter((m) => m.status === 'completed').length : 0;
  const marathonDate = marathonGoal?.targetDate ?? settings.marathonTargetDate;
  const otherGoals = [
    ...(marathonGoal && marathonGoal.status === 'active' ? [{ id: marathonGoal.id, name: marathonGoal.name, date: marathonDate }] : []),
    ...customGoals.filter((g) => g.status === 'active').map((g) => ({ id: g.id, name: g.name, date: g.targetDate })),
  ];

  // Ascend is the overview: where you stand toward your goal. Setting goals
  // up lives on its own page (/doelen), so data and setup no longer mix
  // (production feedback: "te slordig", "raar dat dit bij elkaar staat").
  return (
    <div className="animate-page-in flex flex-col gap-5 px-4 pb-10 pt-6">
      {goal ? (
        <div>
          <Eyebrow>HOOFDDOEL</Eyebrow>
          <p className="mt-1 font-display text-3xl" style={{ color: 'var(--color-ink)' }}>{goal.name}</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 text-sm" style={{ color: 'var(--color-ink-dim)' }}>
            {goal.targetDate && <span>{formatDateNL(goal.targetDate)}</span>}
            {weeksLeft !== undefined && <span style={{ color: 'var(--color-gold)' }}>nog {weeksLeft} {weeksLeft === 1 ? 'week' : 'weken'}</span>}
            {progress && <span>kamp {cleared} van {progress.milestones.length}</span>}
          </div>
          <div className="mt-2"><RouteLine goal={goal} /></div>
        </div>
      ) : (
        <Card className="flex flex-col gap-3">
          <Eyebrow>HOOFDDOEL</Eyebrow>
          <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>Je hebt nog geen hoofddoel. Stel er een in, dan bouwt ASCEND je training ernaartoe op.</p>
          <PrimaryButton onClick={() => navigate('/ascend/doelen')}>DOEL INSTELLEN</PrimaryButton>
        </Card>
      )}

      {progress && goal && progress.currentMilestone && !showLadder && (
        <Card className="flex flex-col gap-2">
          <Eyebrow>VOLGEND KAMP</Eyebrow>
          <button onClick={() => setSelectedMilestoneId(progress.currentMilestone!.definition.id)} className="text-left">
            <p className="font-display text-xl" style={{ color: 'var(--color-ink)' }}>{progress.currentMilestone.definition.title}</p>
            {getGR5MilestoneDetail(progress.currentMilestone.definition.order)?.subtitle && (
              <p className="mt-0.5 text-xs" style={{ color: 'var(--color-gold)' }}>{getGR5MilestoneDetail(progress.currentMilestone.definition.order)?.subtitle}</p>
            )}
          </button>
          <div className="mt-1 flex gap-1">
            {progress.milestones.map((m) => (
              <span key={m.definition.id} className="h-1.5 flex-1 rounded-full" style={{ background: m.status === 'completed' ? 'var(--color-gold)' : m.status === 'current' ? 'var(--color-bronze-dark)' : 'var(--color-card-border)' }} />
            ))}
          </div>
          <button onClick={() => setShowLadder(true)} className="min-h-11 text-left text-xs" style={{ color: 'var(--color-ink-dim)' }}>Alle {progress.milestones.length} kampen bekijken</button>
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
          <button onClick={() => setShowLadder(false)} className="-mt-3 min-h-11 text-left text-xs" style={{ color: 'var(--color-ink-dim)' }}>Inklappen</button>
        </>
      )}

      <Card className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <Eyebrow>KLAAR VOOR MEER?</Eyebrow>
          <span className="font-display text-2xl" style={{ color: 'var(--color-gold)' }}>{readiness.overall}%</span>
        </div>
        <MetricBar label="HERSTEL" value={readiness.recovery} accent="alpine" />
        {readiness.consistencyBasis > 0 && <MetricBar label="CONSISTENTIE" value={readiness.consistency} />}
        <MetricBar label="SESSIE-RESPONS" value={readiness.subjectiveSignal} />
        {readinessTrend.length > 1 && (
          <details>
            <summary className="cursor-pointer text-xs" style={{ color: 'var(--color-ink-dim)' }}>Verloop van de laatste weken</summary>
            <div className="mt-3"><TrendLineChart points={readinessTrend} formatValue={(v) => `${v}%`} /></div>
          </details>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <Eyebrow>WAT JE AL AANKUNT</Eyebrow>
          <span className="font-display text-2xl" style={{ color: 'var(--color-gold)' }}>{capacity.overall}%</span>
        </div>
        <p className="-mt-2 text-xs" style={{ color: 'var(--color-ink-dim)' }}>Wat je de afgelopen vier weken aantoonbaar hebt opgebouwd.</p>
        <MetricBar label="KRACHT" value={capacity.strength} />
        <MetricBar label="CARDIO" value={capacity.cardio} />
        <MetricBar label="KLIMMEN / D+" value={capacity.climbing} accent="alpine" />
        <MetricBar label="UITHOUDING" value={capacity.endurance} />
        <MetricBar label="RUGZAK" value={capacity.packCapability} />
      </Card>

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

      <PrimaryButton onClick={() => navigate('/ascend/doelen')}>DOELEN BEHEREN</PrimaryButton>

      <StrengthProgressionCard logs={sessionLogs} />

      <Card className="flex flex-col gap-3">
        <details>
          <summary className="cursor-pointer"><Eyebrow>TRAININGSVERDELING RICHTING GR5</Eyebrow></summary>
          <p className="mt-3 text-sm" style={{ color: 'var(--color-ink-dim)' }}>
            Hardlopen blijft in het schema: het is een goede aerobe aanvulling en gaat niet ten koste van kracht.
            De verhouding verschuift wel steeds meer richting echt bergwandelen naarmate de GR5 dichterbij komt.
          </p>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm" style={{ color: 'var(--color-ink)' }}>
            <li className="flex gap-2"><span style={{ color: 'var(--color-gold)' }}>·</span>3 tot 4 keer kracht</li>
            <li className="flex gap-2"><span style={{ color: 'var(--color-gold)' }}>·</span>1 tot 2 keer hardlopen: aerobe basis, later snelheid en drempel</li>
            <li className="flex gap-2"><span style={{ color: 'var(--color-gold)' }}>·</span>1 keer bergspecifiek: helling, D+ of een echte hike</li>
            <li className="flex gap-2"><span style={{ color: 'var(--color-gold)' }}>·</span>regelmatig: lange hike, afdalen, rugzak, twee dagen achter elkaar</li>
          </ul>
          <div className="mt-3 flex flex-col gap-1 border-t pt-3" style={{ borderColor: 'var(--color-card-border)' }}>
            {GR5_TRAINING_SPLIT_SOURCES.map((s) => (
              <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs underline underline-offset-2" style={{ color: 'var(--color-sky)' }}>
                {s.label} ↗
              </a>
            ))}
          </div>
        </details>
      </Card>

      <Card className="flex flex-col gap-3">
        <button onClick={() => setShowPackingList((s) => !s)} className="flex items-center justify-between gap-3 text-left">
          <div>
            <Eyebrow>UITRUSTING VOOR DE GR5</Eyebrow>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>Wat je voor een echte etappe nodig hebt. Nu nog niet nodig.</p>
          </div>
          <span className="shrink-0 text-sm" style={{ color: 'var(--color-gold)' }}>{showPackingList ? '−' : '+'}</span>
        </button>

        {showPackingList && (
          <>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm" style={{ color: 'var(--color-ink)' }}>
              {GR5_PACKING_LIST.map((item) => (
                <li key={item} className="flex gap-2">
                  <span style={{ color: 'var(--color-gold)' }}>·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{GR5_PACKING_NOTE}</p>
            <div className="flex flex-col gap-1.5 border-t pt-3" style={{ borderColor: 'var(--color-card-border)' }}>
              {GR5_PACKING_SOURCES.map((s) => (
                <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs underline underline-offset-2" style={{ color: 'var(--color-sky)' }}>
                  {s.label} ↗
                </a>
              ))}
            </div>
          </>
        )}
      </Card>

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
  const { trainingGoals, goalMilestones, sessionLogs, updateGoal, archiveGoal, unarchiveGoal, updateMarathonGoal, settings } = useAppData();
  const [creatingGoal, setCreatingGoal] = useState<TrainingGoal | null>(null);
  const goal = trainingGoals.find((g) => g.status !== 'archived' && goalMilestones.some((m) => m.goalId === g.id));
  const marathonGoal = trainingGoals.find((g) => g.name === 'Marathon' && g.status !== 'archived');
  const customGoals = trainingGoals.filter((g) => g.status !== 'archived' && g.name !== 'Marathon' && !goalMilestones.some((m) => m.goalId === g.id));
  const archivedGoals = trainingGoals.filter((g) => g.status === 'archived');

  return (
    <div className="animate-page-in flex flex-col gap-5 px-4 pb-10 pt-4">
      <div className="flex items-center gap-1">
        <BackButton fallback="/ascend" />
        <div>
          <Eyebrow>DOELEN</Eyebrow>
          <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Waar je naartoe traint, en hoe zwaar elk doel meeweegt.</p>
        </div>
      </div>

      {goal && <GR5GoalCard goal={goal} onUpdate={(patch) => updateGoal(goal.id, patch)} onArchive={() => archiveGoal(goal.id)} />}

      <MarathonGoalCard settings={settings} sessionLogs={sessionLogs} marathonGoal={marathonGoal} onUpdate={updateMarathonGoal} onArchive={marathonGoal ? () => archiveGoal(marathonGoal.id) : undefined} />

      <CustomGoalsList goals={customGoals} onArchive={archiveGoal} />

      <SecondaryButton onClick={() => setCreatingGoal(blankGoalDraft())}>+ NIEUW DOEL</SecondaryButton>
      {creatingGoal && <GoalSetupWizard mode="create" initialGoal={creatingGoal} onClose={() => setCreatingGoal(null)} />}

      <GoalFocusCard />

      <StrengthProgramCard />

      <ArchivedGoalsCard goals={archivedGoals} onUnarchive={unarchiveGoal} />
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
      <div className="flex items-center justify-between gap-3">
        <Eyebrow>KRACHTPROGRESSIE</Eyebrow>
        <select
          value={activeId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="rounded-lg border bg-transparent px-2 py-1 text-xs"
          style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}
        >
          {exercises.map((ex) => (
            <option key={ex.id} value={ex.id} style={{ background: 'var(--color-card)' }}>{ex.name}</option>
          ))}
        </select>
      </div>
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
  onUpdate,
  onArchive,
}: {
  goal: TrainingGoal;
  onUpdate: (patch: { targetDate?: string; targetDistanceKm?: number }) => void;
  onArchive: () => void;
}) {
  const daysLeft = goal.targetDate ? daysBetween(todayISO(), goal.targetDate) : undefined;
  const targetDistanceKm = findRequirement(goal, 'distance')?.target?.amount;
  const [wizardOpen, setWizardOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <Card className="flex flex-col gap-3">
      <Eyebrow>GR5-DOEL</Eyebrow>
      <GoalStatusNote status={goal.status} goal={goal} />
      <RouteLine goal={goal} />
      {daysLeft !== undefined && (
        <p className="font-display text-2xl" style={{ color: 'var(--color-gold)' }}>
          {daysLeft > 0 ? `nog ${daysLeft} dagen` : daysLeft === 0 ? 'Vandaag is de dag' : 'Datum verstreken'}
        </p>
      )}
      {isTaperWindow(daysLeft) && (
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-alpine)' }}>
          Taper: bouw dagelijkse afstand en D+ de komende twee weken rustig af, houd de benen fris en zorg voor
          extra slaap en herstel richting de tocht.
        </p>
      )}

      <PrimaryButton onClick={() => setWizardOpen(true)}>DOEL AANPASSEN</PrimaryButton>

      <button onClick={() => setAdvancedOpen((s) => !s)} className="text-left text-xs" style={{ color: 'var(--color-ink-dim)' }}>
        {advancedOpen ? '− geavanceerd: velden direct aanpassen' : '+ geavanceerd: velden direct aanpassen'}
      </button>

      {advancedOpen && (
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Startdatum</label>
          <input
            type="date"
            value={goal.targetDate ?? ''}
            onChange={(e) => onUpdate({ targetDate: e.target.value || undefined })}
            className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
            style={dateInputStyle}
          />
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

      <button onClick={onArchive} className="text-left text-xs" style={{ color: 'var(--color-ink-dim)' }}>Doel archiveren</button>

      {wizardOpen && <GoalSetupWizard mode="edit" initialGoal={goal} onClose={() => setWizardOpen(false)} />}
    </Card>
  );
}

const RACE_DISTANCE_KM: Record<'half' | 'full', number> = { half: 21.1, full: 42.2 };

type MarathonGoalPatch = Partial<Pick<AppSettings, 'marathonRaceType' | 'marathonTargetDate' | 'marathonTargetTimeMinutes'>>;

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
  onUpdate,
  onArchive,
}: {
  settings: AppSettings;
  sessionLogs: SessionLog[];
  marathonGoal: TrainingGoal | undefined;
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
  const percentOfDistance = distanceKm && longestRunKm > 0 ? Math.round((longestRunKm / distanceKm) * 100) : undefined;

  const totalMinutes = settings.marathonTargetTimeMinutes;
  const hours = totalMinutes !== undefined ? Math.floor(totalMinutes / 60) : undefined;
  const minutes = totalMinutes !== undefined ? totalMinutes % 60 : undefined;

  function updateHours(value: string) {
    const h = value === '' ? 0 : Number(value);
    const m = minutes ?? 0;
    onUpdate({ marathonTargetTimeMinutes: value === '' && m === 0 ? undefined : h * 60 + m });
  }

  function updateMinutes(value: string) {
    const h = hours ?? 0;
    const m = value === '' ? 0 : Number(value);
    onUpdate({ marathonTargetTimeMinutes: h === 0 && value === '' ? undefined : h * 60 + m });
  }

  return (
    <Card className="flex flex-col gap-3">
      <Eyebrow>MARATHONDOEL</Eyebrow>
      <div className="flex gap-2">
        {(['half', 'full'] as const).map((type) => (
          <button
            key={type}
            onClick={() => onUpdate({ marathonRaceType: type })}
            className="flex-1 rounded-xl border py-2 text-xs font-medium tracking-wide transition-all active:scale-[0.97]"
            style={{
              borderColor: raceType === type ? 'var(--color-gold)' : 'var(--color-card-border)',
              color: raceType === type ? 'var(--color-gold)' : 'var(--color-ink)',
            }}
          >
            {type === 'half' ? 'HALVE (21,1 KM)' : 'HELE (42,2 KM)'}
          </button>
        ))}
      </div>

      {raceType && (
        <>
          <GoalStatusNote status={marathonGoal?.status ?? 'paused'} />
          {daysLeft !== undefined && (
            <p className="font-display text-2xl" style={{ color: 'var(--color-gold)' }}>
              {daysLeft > 0 ? `nog ${daysLeft} dagen` : daysLeft === 0 ? 'Vandaag is de dag' : 'Datum verstreken'}
            </p>
          )}
          {isTaperWindow(daysLeft) && (
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-alpine)' }}>
              Taper: bouw het volume de komende twee weken af, houd de intensiteit kort maar scherp, en focus op
              slaap en voeding richting de start.
            </p>
          )}

          <PrimaryButton onClick={() => setWizardOpen(true)}>DOEL AANPASSEN</PrimaryButton>

          <button onClick={() => setAdvancedOpen((s) => !s)} className="text-left text-xs" style={{ color: 'var(--color-ink-dim)' }}>
            {advancedOpen ? '− geavanceerd: velden direct aanpassen' : '+ geavanceerd: velden direct aanpassen'}
          </button>

          {advancedOpen && (
            <>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Wedstrijddatum</label>
                  <input
                    type="date"
                    value={targetDate ?? ''}
                    onChange={(e) => onUpdate({ marathonTargetDate: e.target.value || undefined })}
                    className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
                    style={dateInputStyle}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Doeltijd — uur</label>
                  <input
                    type="number"
                    min={0}
                    value={hours ?? ''}
                    onChange={(e) => updateHours(e.target.value)}
                    className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
                    style={dateInputStyle}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Doeltijd — min</label>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={minutes ?? ''}
                    onChange={(e) => updateMinutes(e.target.value)}
                    className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
                    style={dateInputStyle}
                  />
                </div>
              </div>
            </>
          )}
          {longestRunKm > 0 && (
            <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
              Langste duurloop tot nu toe: {formatNumberNL(longestRunKm, 1)} km
              {percentOfDistance !== undefined ? ` — ${percentOfDistance}% van de wedstrijdafstand` : ''}
            </p>
          )}
          {onArchive && (
            <button onClick={onArchive} className="text-left text-xs" style={{ color: 'var(--color-ink-dim)' }}>Doel archiveren</button>
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
      <Eyebrow>EIGEN DOELEN</Eyebrow>
      {goals.map((g) => (
        <div key={g.id} className="flex flex-col gap-2 border-t pt-3 first:border-t-0 first:pt-0" style={{ borderColor: 'var(--color-card-border)' }}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{g.name || 'Naamloos doel'}</p>
            <div className="flex shrink-0 gap-3">
              <SecondaryButton onClick={() => setEditing(g)}>AANPASSEN</SecondaryButton>
              <button onClick={() => onArchive(g.id)} className="text-xs" style={{ color: 'var(--color-danger-text)' }}>archiveren</button>
            </div>
          </div>
          <GoalStatusNote status={g.status} goal={g} />
          <RouteLine goal={g} />
        </div>
      ))}
      {editing && <GoalSetupWizard mode="edit" initialGoal={editing} onClose={() => setEditing(null)} />}
    </Card>
  );
}

// The recovery path for the archiving above — collapsed by default since
// this is a rarely-needed corner, not a primary action. Reactivating puts
// a goal back to 'paused' (never straight to 'active' — archiving cleared
// its targetDate), from where its own dedicated card (GR5/Marathon) or
// the custom-goals list above picks it back up, ready for a new date.
function ArchivedGoalsCard({ goals, onUnarchive }: { goals: TrainingGoal[]; onUnarchive: (goalId: string) => void }) {
  const [open, setOpen] = useState(false);
  if (goals.length === 0) return null;

  return (
    <Card className="flex flex-col gap-3">
      <button onClick={() => setOpen((s) => !s)} className="flex items-center justify-between gap-3 text-left">
        <Eyebrow>GEARCHIVEERDE DOELEN ({goals.length})</Eyebrow>
        <span className="shrink-0 text-sm" style={{ color: 'var(--color-gold)' }}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-3">
          {goals.map((g) => (
            <div key={g.id} className="flex items-center justify-between gap-3 border-t pt-3 first:border-t-0 first:pt-0" style={{ borderColor: 'var(--color-card-border)' }}>
              <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>{g.name || 'Naamloos doel'}</p>
              <button onClick={() => onUnarchive(g.id)} className="shrink-0 text-xs underline underline-offset-2" style={{ color: 'var(--color-sky)' }}>
                heractiveren
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
