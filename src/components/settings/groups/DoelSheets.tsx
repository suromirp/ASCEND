import { useState } from 'react';
import { useAppData } from '../../../state/AppDataContext';
import { PHASE_BASIS, PHASE_LENGTH_LIMITS, PHASE_OPBOUW, programAnchorDate, type AdjustablePhaseId, type PhaseLengthOverrides } from '../../../engine/programLayout';
import { shortDate } from '../../../engine/settingsSummary';
import { shortGoalName } from '../../../engine/settingsStatus';
import { addDays, mondayOfWeek, todayISO } from '../../../utils/dates';
import { Icon } from '../../icons';
import { ChoiceList, Sheet } from '../Sheet';
import { SettingsList } from '../SettingsList';
import { haptics } from '../../../utils/haptics';
import { usePlanSettingChange } from '../usePlanSettingChange';

// De kleur van elke fase in de balk, zonder goud: goud is het ene accent van het scherm.
const PHASE_COLOR_SOFT: Record<string, string> = {
  phase_1: 'var(--color-stone)',
  phase_2: 'var(--color-sky)',
  phase_3: 'var(--color-alpine)',
  phase_4: 'var(--color-bronze)',
  phase_taper: 'var(--color-snow)',
  phase_onderhoud: 'var(--color-stone)',
};

const weeks = (n: number) => `${n} ${n === 1 ? 'week' : 'weken'}`;

// Programma: de fases tot aan je doel als één balk met een streepje voor nu, en per fase de lengte
// met min en plus. De basis vult aan wat overblijft; wat je zelf zet staat vast
// (storage/database.ts#syncProgramHorizon legt het programma opnieuw neer).
export function ProgramSheet({ onClose, onRestart }: { onClose: () => void; onRestart: () => void }) {
  const { program, settings, trainingGoals, goalMilestones } = useAppData();
  // Other phase lengths change the plan: a proposal first (usePlanSettingChange).
  const plan = usePlanSettingChange();
  const today = todayISO();
  const goalDate = programAnchorDate(trainingGoals, goalMilestones, today);
  const ladder = new Set(goalMilestones.map((m) => m.goalId));
  const main = trainingGoals.find((g) => g.status === 'active' && ladder.has(g.id));
  if (!program) return null;

  const overrides = settings.programPhaseOverrides ?? {};
  const total = program.phases.reduce((n, p) => n + p.weekCount, 0);
  const start = mondayOfWeek(program.startDate);
  const weekNow = Math.floor((new Date(today).getTime() - new Date(start).getTime()) / (7 * 86400000));
  const rows = program.phases.map((p, i) => {
    const startWeek = program.phases.slice(0, i).reduce((n, q) => n + q.weekCount, 0);
    return { phase: p, startWeek, from: addDays(start, startWeek * 7) };
  });
  const line = goalDate && main
    ? `Week ${weekNow + 1} van ${total}. Teruggerekend vanaf ${shortGoalName(main.name)}, ${shortDate(goalDate)}.`
    : `Week ${weekNow + 1} van ${total}. Zonder doel staan de fases vast.`;

  async function save(next: PhaseLengthOverrides | undefined) {
    if (plan.busy) return;
    await plan.changeSetting('Fases van je programma', { programPhaseOverrides: next }, 'Volgt de nieuwe lengte van je fases.');
  }

  function change(id: AdjustablePhaseId, current: number, direction: 1 | -1) {
    haptics.tap();
    const { step, min, max } = PHASE_LENGTH_LIMITS[id];
    // Naar het volgende hele blok: een basis van 14 weken gaat naar 12 of 16.
    const snapped = direction < 0 ? Math.ceil(current / step) * step - step : Math.floor(current / step) * step + step;
    const value = Math.min(max, Math.max(min, snapped));
    // De basis en de Opbouw delen wat overblijft: wat je zet staat vast, de ander vult aan.
    const next: PhaseLengthOverrides = { ...overrides, [id]: value };
    if (id === PHASE_BASIS) delete next[PHASE_OPBOUW];
    if (id === PHASE_OPBOUW) delete next[PHASE_BASIS];
    void save(next);
  }

  const adjustableId = (id: string) => id in PHASE_LENGTH_LIMITS && goalDate;

  return (
    <Sheet eyebrow="Doel en tochten" title="Programma" line={line} onClose={onClose}>
      {plan.note && <p className="st-hint st-hint-note" role="status">{plan.note}</p>}
      {plan.impact}
      <div className="st-phases" role="img" aria-label="Je fases tot aan het doel">
        {rows.map((r) => <span key={r.phase.id} style={{ flex: r.phase.weekCount, background: PHASE_COLOR_SOFT[r.phase.id] ?? 'var(--color-stone)' }} />)}
      </div>
      {weekNow >= 0 && weekNow < total && (
        <div className="st-now" aria-hidden="true"><b style={{ left: `${((weekNow + 0.5) / total) * 100}%` }} /></div>
      )}
      <SettingsList className="mt-2">
        {rows.map((r) => {
          const adjustable = adjustableId(r.phase.id) ? (r.phase.id as AdjustablePhaseId) : undefined;
          const isNow = weekNow >= r.startWeek && weekNow < r.startWeek + r.phase.weekCount;
          return (
            <div key={r.phase.id} className="st-row field">
              <span className="t">
                <span className="st-dot" style={{ background: PHASE_COLOR_SOFT[r.phase.id], borderRadius: 2 }} aria-hidden="true" />
                <span className="st-title-text">{r.phase.name.charAt(0) + r.phase.name.slice(1).toLowerCase()}</span>
              </span>
              <span className="v">
                {adjustable ? (
                  <span className="flex items-center" style={{ gap: 0 }}>
                    <button type="button" className="st-close" style={{ width: 44, height: 44 }} aria-label={`${r.phase.name} korter`} onClick={() => change(adjustable, r.phase.weekCount, -1)}><Icon name="min" size={18} /></button>
                    <span className="st-num" style={{ minWidth: 72, textAlign: 'center', color: 'var(--color-ink)' }}>{weeks(r.phase.weekCount)}</span>
                    <button type="button" className="st-close" style={{ width: 44, height: 44 }} aria-label={`${r.phase.name} langer`} onClick={() => change(adjustable, r.phase.weekCount, 1)}><Icon name="plus" size={18} /></button>
                  </span>
                ) : (
                  <span className="st-num" style={{ color: 'var(--color-ink-dim)' }}>{weeks(r.phase.weekCount)}{isNow ? ', nu' : ''}</span>
                )}
              </span>
            </div>
          );
        })}
      </SettingsList>
      {goalDate && Object.keys(overrides).length > 0 && (
        <div className="st-btns">
          <button type="button" className="st-btn" onClick={() => void save(undefined)}>Terug naar automatisch</button>
        </div>
      )}
      <div className="st-btns">
        <button type="button" className="st-btn" onClick={onRestart}>Opnieuw bij week 1</button>
      </div>
    </Sheet>
  );
}

// Opnieuw beginnen bij week 1: een schone start of alleen de weektelling, en vanaf welke week.
export function RestartSheet({ onClose }: { onClose: () => void }) {
  const { restartProgram } = useAppData();
  const [mode, setMode] = useState<'clean' | 'count_only'>('clean');
  const [from, setFrom] = useState<'this_week' | 'next_week'>('this_week');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  return (
    <Sheet eyebrow="Doel en tochten" title="Opnieuw bij week 1" onClose={onClose}>
      {(close) => done ? (
        <>
          <p className="st-lead">{done}</p>
          <div className="st-btns"><button type="button" className="st-btn" onClick={close}>Begrepen</button></div>
        </>
      ) : (
        <>
          <p className="st-lab">Wat er gebeurt</p>
          <ChoiceList<'clean' | 'count_only'>
            label="Wat er gebeurt"
            value={mode}
            onPick={setMode}
            options={[
              { value: 'clean', label: 'Schone start', note: 'Planning opnieuw vanaf week 1' },
              { value: 'count_only', label: 'Alleen de weektelling', note: 'Wat gepland staat blijft zoals het is' },
            ]}
          />
          <p className="st-lab" style={{ marginTop: 24 }}>Vanaf</p>
          <ChoiceList<'this_week' | 'next_week'>
            label="Vanaf"
            value={from}
            onPick={setFrom}
            options={[
              { value: 'this_week', label: 'Deze week', note: 'Vanaf vandaag' },
              { value: 'next_week', label: 'Volgende week', note: 'Vanaf aankomende maandag' },
            ]}
          />
          <p className="st-hint" style={{ marginLeft: 0 }}>
            {mode === 'clean' ? 'Eigen verplaatsingen vanaf dat moment vervallen. Je geschiedenis blijft.' : 'Alleen het weeknummer en de opbouw per week schuiven.'}
          </p>
          <div className="st-btns">
            <button type="button" className="st-btn" disabled={busy} onClick={close}>Annuleren</button>
            <button
              type="button"
              className="st-btn"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setDone(await restartProgram(from, mode));
                setBusy(false);
              }}
            >
              {busy ? 'Bezig' : 'Bevestigen'}
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}
