import { useMemo, useState } from 'react';
import type { TrainingGoal } from '../models/goals';
import type { SessionLog } from '../models/training';
import type { AppSettings } from '../storage/database';
import { useAppData } from '../state/AppDataContext';
import { computeReadiness, computeReadinessTrend } from '../engine/readiness';
import { computeGoalProgress } from '../engine/progression';
import { findRequirement } from '../engine/goals';
import { computeExerciseProgression, listLoggedExercises } from '../engine/strengthProgression';
import { daysBetween, todayISO } from '../utils/dates';
import { MetricBar } from '../components/MetricBar';
import { AscentLadder } from '../components/AscentLadder';
import { MilestoneDetailSheet } from '../components/MilestoneDetailSheet';
import { TrendLineChart } from '../components/TrendLineChart';
import { getGR5MilestoneDetail, GR5_TRACK_DESCRIPTION, GR5_PACKING_LIST, GR5_PACKING_NOTE, GR5_PACKING_SOURCES, GR5_TRAINING_SPLIT_SOURCES } from '../data/gr5Details';
import { Card, Eyebrow } from '../components/ui';

export function AscendPage() {
  const { sessionLogs, plannedSessions, trainingGoals, goalMilestones, goalMilestoneProgress, clearMilestoneManually, updateGoal, settings, updateSettings } = useAppData();
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const [showPackingList, setShowPackingList] = useState(false);

  const readiness = useMemo(() => computeReadiness(sessionLogs, plannedSessions), [sessionLogs, plannedSessions]);
  const readinessTrend = useMemo(() => computeReadinessTrend(sessionLogs, plannedSessions), [sessionLogs, plannedSessions]);
  // The GR5 goal is always the one with milestones — the marathon goal
  // (migrated from AppSettings) has none. Mirrors the old objectives[0]
  // assumption, now stated explicitly rather than by array position.
  const goal = trainingGoals.find((g) => goalMilestones.some((m) => m.goalId === g.id));
  const milestonesForGoal = useMemo(() => goalMilestones.filter((m) => m.goalId === goal?.id), [goalMilestones, goal?.id]);
  const progress = useMemo(
    () => (goal ? computeGoalProgress(goal.id, goal.name, milestonesForGoal, goalMilestoneProgress, sessionLogs) : null),
    [goal, milestonesForGoal, goalMilestoneProgress, sessionLogs],
  );
  const selectedMilestone = progress?.milestones.find((m) => m.definition.id === selectedMilestoneId);
  const selectedDetail = selectedMilestone ? getGR5MilestoneDetail(selectedMilestone.definition.order) : undefined;

  return (
    <div className="animate-page-in flex flex-col gap-6 px-4 pb-10 pt-6">
      <div>
        <Eyebrow>ASCEND READINESS</Eyebrow>
        <p className="mt-1 font-display text-4xl" style={{ color: 'var(--color-gold)' }}>{readiness.overall}%</p>
      </div>

      <Card className="flex flex-col gap-4">
        <MetricBar label="KRACHT" value={readiness.strength} />
        <MetricBar label="CARDIO" value={readiness.cardio} />
        <MetricBar label="KLIMMEN / D+" value={readiness.climbing} accent="alpine" />
        <MetricBar label="UITHOUDING" value={readiness.endurance} />
        <MetricBar label="HERSTEL" value={readiness.recovery} accent="alpine" />
        <MetricBar label="CONSISTENTIE" value={readiness.consistency} />
        <MetricBar label="RUGZAKCAPACITEIT" value={readiness.packCapability} />
      </Card>

      {readinessTrend.some((p) => p.value > 0) && (
        <Card>
          <Eyebrow>READINESS TREND — 8 WEKEN</Eyebrow>
          <div className="mt-3">
            <TrendLineChart points={readinessTrend} formatValue={(v) => `${v}%`} />
          </div>
        </Card>
      )}

      <StrengthProgressionCard logs={sessionLogs} />

      {goal && (
        <GR5GoalCard goal={goal} onUpdate={(patch) => updateGoal(goal.id, patch)} />
      )}

      <MarathonGoalCard settings={settings} sessionLogs={sessionLogs} onUpdate={(patch) => updateSettings(patch)} />

      {progress && goal && (
        <AscentLadder
          progress={progress}
          description={GR5_TRACK_DESCRIPTION}
          onMarkCleared={(milestoneId) => clearMilestoneManually(goal.id, milestoneId)}
          onSelectMilestone={setSelectedMilestoneId}
        />
      )}

      <Card className="flex flex-col gap-3">
        <Eyebrow>TRAININGSVERDELING RICHTING GR5</Eyebrow>
        <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>
          Hardlopen blijft in het schema — het is een goede aerobe aanvulling en gaat niet ten koste van kracht.
          De verhouding verschuift wel steeds meer richting echte hiking-specificiteit naarmate de GR5 dichterbij komt.
        </p>
        <ul className="flex flex-col gap-1.5 text-sm" style={{ color: 'var(--color-ink)' }}>
          <li className="flex gap-2"><span style={{ color: 'var(--color-gold)' }}>·</span>4× kracht / hypertrofie</li>
          <li className="flex gap-2"><span style={{ color: 'var(--color-gold)' }}>·</span>1–2× hardlopen — aerobe basis, later snelheid/drempel</li>
          <li className="flex gap-2"><span style={{ color: 'var(--color-gold)' }}>·</span>1× bergspecifiek — incline / D+ / echte hike</li>
          <li className="flex gap-2"><span style={{ color: 'var(--color-gold)' }}>·</span>regelmatig: lange hike, afdaling, rugzak, back-to-back</li>
        </ul>
        <div className="flex flex-col gap-1 border-t pt-3" style={{ borderColor: 'var(--color-card-border)' }}>
          {GR5_TRAINING_SPLIT_SOURCES.map((s) => (
            <a
              key={s.label}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs underline underline-offset-2"
              style={{ color: 'var(--color-sky)' }}
            >
              {s.label} ↗
            </a>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <button onClick={() => setShowPackingList((s) => !s)} className="flex items-center justify-between gap-3 text-left">
          <div>
            <Eyebrow>LATER: ALPINE / GR5-MATERIAAL</Eyebrow>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>Nog niet nodig voor Maand 1 — de volledige uitrusting voor een echte GR5-etappe.</p>
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
                <a
                  key={s.label}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs underline underline-offset-2"
                  style={{ color: 'var(--color-sky)' }}
                >
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
        <Eyebrow>KRACHT PROGRESSIE</Eyebrow>
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
          Nog te weinig loggings van deze oefening om een trend te tonen.
        </p>
      )}
    </Card>
  );
}

function GR5GoalCard({
  goal,
  onUpdate,
}: {
  goal: TrainingGoal;
  onUpdate: (patch: { targetDate?: string; targetDistanceKm?: number }) => void;
}) {
  const daysLeft = goal.targetDate ? daysBetween(todayISO(), goal.targetDate) : undefined;
  const targetDistanceKm = findRequirement(goal, 'distance')?.target?.amount;

  return (
    <Card className="flex flex-col gap-3">
      <Eyebrow>GR5 DOEL</Eyebrow>
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
          <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Afstand (km)</label>
          <input
            type="number"
            value={targetDistanceKm ?? ''}
            onChange={(e) => onUpdate({ targetDistanceKm: e.target.value === '' ? undefined : Number(e.target.value) })}
            placeholder="±600"
            className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
            style={dateInputStyle}
          />
        </div>
      </div>
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
  onUpdate,
}: {
  settings: AppSettings;
  sessionLogs: SessionLog[];
  onUpdate: (patch: MarathonGoalPatch) => void;
}) {
  const raceType = settings.marathonRaceType;
  const distanceKm = raceType ? RACE_DISTANCE_KM[raceType] : undefined;
  const daysLeft = settings.marathonTargetDate ? daysBetween(todayISO(), settings.marathonTargetDate) : undefined;

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
      <Eyebrow>MARATHON DOEL</Eyebrow>
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
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Wedstrijddatum</label>
              <input
                type="date"
                value={settings.marathonTargetDate ?? ''}
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
          {longestRunKm > 0 && (
            <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
              Langste duurloop tot nu toe: {longestRunKm.toFixed(1)} km
              {percentOfDistance !== undefined ? ` — ${percentOfDistance}% van de wedstrijdafstand` : ''}
            </p>
          )}
        </>
      )}
    </Card>
  );
}
