import { useAppData } from '../state/AppDataContext';
import { PHASE_COLOR } from '../data/phaseColors';
import { PHASE_BASIS, PHASE_BERG, PHASE_OPBOUW, PHASE_LENGTH_LIMITS, type AdjustablePhaseId, type PhaseLengthOverrides } from '../engine/programLayout';
import { addDays, daysBetween, formatDateNL, mondayOfWeek, todayISO } from '../utils/dates';
import { raceBlocks } from '../engine/raceBlock';
import { usePlanSettingChange } from './settings/usePlanSettingChange';
import { Icon } from './icons';


// Settings → Training → Programma: the phases toward the goal as one bar,
// and per phase its length with − and +. The basis takes what is left.
// Saving goes through the settings; storage/database.ts#syncProgramHorizon
// lays the program out again on the next refresh.
export function PhaseEditor({ goalDate }: { goalDate: string | undefined }) {
  const { program, settings, trainingGoals, goalMilestones } = useAppData();
  // Other phase lengths change the plan: a proposal first (usePlanSettingChange).
  const plan = usePlanSettingChange();
  if (!program) return null;
  const overrides = settings.programPhaseOverrides ?? {};
  const total = program.phases.reduce((n, p) => n + p.weekCount, 0);
  const start = mondayOfWeek(program.startDate);
  const today = todayISO();
  const weekNow = Math.floor((new Date(today).getTime() - new Date(start).getTime()) / (7 * 86400000));

  const rows = program.phases.map((p, i) => {
    const startWeek = program.phases.slice(0, i).reduce((n, q) => n + q.weekCount, 0);
    return { phase: p, from: addDays(start, startWeek * 7), until: addDays(start, (startWeek + p.weekCount) * 7 - 1), startWeek };
  });

  async function save(next: PhaseLengthOverrides | undefined) {
    if (plan.busy) return;
    await plan.changeSetting('Fases van je programma', { programPhaseOverrides: next }, 'Volgt de nieuwe lengte van je fases.');
  }

  function change(id: AdjustablePhaseId, current: number, direction: 1 | -1) {
    const { step, min, max } = PHASE_LENGTH_LIMITS[id];
    // To the next whole block: a basis of 14 weeks goes to 12 or 16.
    const snapped = direction < 0 ? Math.ceil(current / step) * step - step : Math.floor(current / step) * step + step;
    const value = Math.min(max, Math.max(min, snapped));
    // The basis and the Opbouw share the weeks that are left: the one you
    // set is fixed, the other fills the rest.
    const next: PhaseLengthOverrides = { ...overrides, [id]: value };
    if (id === PHASE_BASIS) delete next[PHASE_OPBOUW];
    if (id === PHASE_OPBOUW) delete next[PHASE_BASIS];
    void save(next);
  }

  const hikeFrom = rows.find((r) => r.phase.id === PHASE_BERG)?.from;

  // Tussendoelen on the same bar (engine/raceBlock.ts), and per phase row.
  const ladder = new Set(goalMilestones.map((m) => m.goalId));
  const mainGoalId = trainingGoals.find((g) => g.status === 'active' && ladder.has(g.id))?.id;
  const blocks = raceBlocks(trainingGoals, mainGoalId, goalDate, today);
  const pct = (date: string) => Math.min(100, Math.max(0, (daysBetween(start, date) / (total * 7)) * 100));

  return (
    <div className="flex flex-col gap-3">
      <div className="relative flex h-3 overflow-hidden rounded-full" role="img" aria-label="Je fases tot aan het doel">
        {rows.map((r) => (
          <span key={r.phase.id} style={{ flexGrow: r.phase.weekCount, flexBasis: 0, background: PHASE_COLOR[r.phase.id] ?? 'var(--color-stone)', opacity: 0.85 }} />
        ))}
        {blocks.map((b) => (
          <span key={b.goalId} className="absolute inset-y-0" style={{ left: `${pct(b.blockStart)}%`, width: `${pct(b.raceDate) - pct(b.blockStart)}%`, background: 'var(--color-ink)', opacity: 0.25 }} aria-hidden="true" />
        ))}
        {weekNow >= 0 && weekNow < total && (
          <span className="absolute inset-y-0 w-0.5" style={{ left: `${((weekNow + 0.5) / total) * 100}%`, background: 'var(--color-ink)' }} aria-hidden="true" />
        )}
      </div>
      {blocks.length > 0 && (
        <div className="relative -mt-2 h-4" aria-hidden="true">
          {blocks.map((b) => <span key={b.goalId} className="absolute -translate-x-1/2 text-xs" style={{ left: `${pct(b.raceDate)}%`, color: 'var(--color-gold)' }}><Icon name="vlag" size={14} /></span>)}
        </div>
      )}

      <div className="flex flex-col">
        {rows.map((r) => {
          const adjustable = goalDate && r.phase.id in PHASE_LENGTH_LIMITS ? (r.phase.id as AdjustablePhaseId) : undefined;
          const fills = goalDate && (overrides[PHASE_BASIS] !== undefined ? r.phase.id === PHASE_OPBOUW : r.phase.id === PHASE_BASIS);
          const isNow = weekNow >= r.startWeek && weekNow < r.startWeek + r.phase.weekCount;
          return (
            <div key={r.phase.id} className="flex items-center justify-between gap-3 border-b py-2.5" style={{ borderColor: 'var(--color-card-border)' }}>
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-ink)' }}>
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: PHASE_COLOR[r.phase.id] }} aria-hidden="true" />
                  {r.phase.name.charAt(0) + r.phase.name.slice(1).toLowerCase()}
                  {isNow && <span className="text-xs" style={{ color: 'var(--color-gold)' }}>nu</span>}
                </p>
                {blocks.filter((b) => b.raceDate >= r.from && b.raceDate <= r.until).map((b) => (
                  <p key={b.goalId} className="text-xs" style={{ color: 'var(--color-gold)' }}><Icon name="vlag" size={14} className="inline align-[-2px]" /> {b.name}, {formatDateNL(b.raceDate)}</p>
                ))}
                <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                  {formatDateNL(r.from)} tot {formatDateNL(r.until)}{fills ? ' · vult aan' : ''}
                </p>
              </div>
              {adjustable ? (
                <div className="flex shrink-0 items-center gap-1">
                  <button onClick={() => change(adjustable, r.phase.weekCount, -1)} aria-label={`${r.phase.name} korter`} className="flex h-11 w-11 items-center justify-center rounded-lg border text-base" style={{ borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' }}>−</button>
                  <span className="w-[72px] whitespace-nowrap text-center text-sm tabular-nums" style={{ color: 'var(--color-ink)' }}>{r.phase.weekCount} {r.phase.weekCount === 1 ? 'week' : 'weken'}</span>
                  <button onClick={() => change(adjustable, r.phase.weekCount, 1)} aria-label={`${r.phase.name} langer`} className="flex h-11 w-11 items-center justify-center rounded-lg border text-base" style={{ borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' }}>+</button>
                </div>
              ) : (
                <span className="shrink-0 text-sm tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{r.phase.weekCount} {r.phase.weekCount === 1 ? 'week' : 'weken'}</span>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
        {goalDate
          ? `Je hoeft hier niets te kiezen: ASCEND rekent de fases uit. Naar de start is 2 weken, het best onderbouwde afbouwen. Bergcapaciteit en Expeditieklaar geven de tijd om hoogtemeters en rugzak stap voor stap op te bouwen. Wil je eerder opbouwen, maak dan de basis korter: de Opbouw begint eerder en loopt door tot Bergcapaciteit. In de Opbouw groeien je lange duurloop en je rustige loop elk blok verder, en als het goed gaat stelt ASCEND een extra training voor. De fases gaan per blok van vier weken, zodat de rustweek op zijn plek blijft.${hikeFrom && settings.longSundaySession !== 'run' ? ` De bergtocht op zondag begint op ${formatDateNL(hikeFrom)}.` : ''}`
          : 'Geef je hoofddoel een datum om de fases zelf in te stellen.'}
      </p>
      {goalDate && Object.keys(overrides).length > 0 && (
        <button onClick={() => void save(undefined)} className="min-h-[44px] self-start text-xs underline underline-offset-2" style={{ color: 'var(--color-bronze)' }}>
          Terug naar automatisch
        </button>
      )}
      {plan.note && <p className="text-xs leading-snug" style={{ color: 'var(--color-ink)' }} role="status">{plan.note}</p>}
      {plan.impact}
    </div>
  );
}
