// ASCEND — "what can you already do" step of the goal wizard (goal-flow
// redesign, Fase 1).
//
// Asks about what the user recently, demonstrably did — never a
// self-assessment. Order of preference:
//   A. one activity: the hardest hike or training of the last 8 weeks,
//      which answers several capabilities at once
//      (engine/goalSetupAssist.ts#evidenceFromRecentActivity);
//   B. per remaining capability, a range to tap (cautious end stored);
//   C. next to it, the user's own best logged value as a reference — only
//      ever from their own history, never a preset example;
//   D. "weet ik niet" always available — the capability simply stays
//      ONBEKEND, never guessed.
// Every capability appears once: already known, answered here, or still
// open — never in two places.

import { useMemo, useState, type ReactNode } from 'react';
import { useAppData } from '../state/AppDataContext';
import type { TrainingGoal } from '../models/goals';
import type { CapabilityEvidence, CapabilityKey } from '../models/capability';
import type { Unit } from '../models/units';
import { formatCapabilityValue } from '../models/units';
import { identifyBaselineNeeds, identifyKnownCapabilities, ownHistoryAnchor, evidenceFromRecentActivity, type RecentActivityInput } from '../engine/goalSetupAssist';
import { keyId } from '../engine/capability';
import { questionMetaFor, capabilityKeyLabel } from '../data/baselineQuestions';
import { addDays, formatDateNL } from '../utils/dates';
import { PrimaryButton, SecondaryButton, Eyebrow } from './ui';
import { NumberField } from './NumberField';

const ACTIVITY_DIMENSIONS = new Set(['endurance_duration', 'mechanical_tolerance', 'aerobic_engine', 'ascent_capacity', 'descent_tolerance', 'load_carriage', 'sustainable_output']);

const WHEN_OPTIONS = [
  { label: 'Afgelopen 2 weken', daysAgo: 7 },
  { label: '2 – 4 weken geleden', daysAgo: 21 },
  { label: '4 – 8 weken geleden', daysAgo: 42 },
];

type Answer = { key: CapabilityKey; text: string };

export function GoalCapacityStep({
  draft,
  allEvidence,
  logEvidence,
  asOf,
  onBack,
  onNext,
}: {
  draft: TrainingGoal;
  allEvidence: CapabilityEvidence[];
  logEvidence: CapabilityEvidence[];
  asOf: string;
  onBack: () => void;
  onNext: () => void;
}) {
  const { addManualCapabilityEvidence } = useAppData();
  // Frozen at the moment this step opened: answering adds evidence, which
  // would otherwise reshuffle the lists under the user's finger.
  const [initialNeeds] = useState(() => identifyBaselineNeeds(draft.requirements, allEvidence, asOf));
  const known = useMemo(() => identifyKnownCapabilities(draft.requirements, allEvidence, asOf), [draft.requirements, allEvidence, asOf]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [unknown, setUnknown] = useState<Set<string>>(new Set());
  // The activity block comes first and covers several capabilities at
  // once; those only get their own question after it was answered (for
  // whatever it didn't cover) or skipped — never both at the same time.
  const [activityDone, setActivityDone] = useState(false);

  const handled = new Set([...answers.map((a) => keyId(a.key)), ...unknown]);
  const knownIds = new Set(known.map((k) => keyId(k.key)));
  const open = initialNeeds.filter((n) => !handled.has(keyId(n.key)) && !knownIds.has(keyId(n.key)));
  const coveredByActivity = (n: (typeof open)[number]) => ACTIVITY_DIMENSIONS.has(n.key.dimension) && (n.key.dimension !== 'sustainable_output' || n.key.discipline === 'running');
  const activityNeeds = activityDone ? [] : open.filter(coveredByActivity);
  const questions = activityNeeds.length > 0 ? open.filter((n) => !coveredByActivity(n)) : open;

  async function save(key: CapabilityKey, amount: number, unit: Unit, date: string, text: string) {
    await addManualCapabilityEvidence({ key, measured: { amount, unit }, date });
    setAnswers((prev) => [...prev.filter((a) => keyId(a.key) !== keyId(key)), { key, text }]);
  }

  async function saveActivity(activity: RecentActivityInput, date: string) {
    const derived = evidenceFromRecentActivity(activity, activityNeeds.map((n) => n.key));
    for (const d of derived) {
      await addManualCapabilityEvidence({ key: d.key, measured: d.measured, date });
    }
    setAnswers((prev) => [
      ...prev,
      ...derived.map((d) => ({ key: d.key, text: `${formatCapabilityValue(d.measured)}, uit je zwaarste activiteit` })),
    ]);
    setActivityDone(true);
  }

  const knownRows = [
    ...known.filter((k) => !answers.some((a) => keyId(a.key) === keyId(k.key))).map((k) => ({ id: keyId(k.key), label: capabilityKeyLabel(k.key), text: 'uit je trainingen' })),
    ...answers.map((a) => ({ id: keyId(a.key), label: capabilityKeyLabel(a.key), text: a.text })),
  ];
  const unknownRows = initialNeeds.filter((n) => unknown.has(keyId(n.key)));

  return (
    <div className="mt-4 flex flex-col gap-6">
      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
        Nu over jou: wat heb je recent echt gedaan? ASCEND gebruikt eerst je eigen trainingen en vraagt alleen wat daarin nog ontbreekt.
      </p>

      {knownRows.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <Eyebrow>AL BEKEND</Eyebrow>
          {knownRows.map((r) => (
            <div key={r.id} className="flex items-baseline justify-between gap-3 text-xs">
              <span style={{ color: 'var(--color-ink)' }}>{r.label}</span>
              <span className="text-right" style={{ color: 'var(--color-ink-dim)' }}>{r.text}</span>
            </div>
          ))}
        </section>
      )}

      {open.length > 0 && (
        <section className="flex flex-col gap-5">
          <Eyebrow>NOG NODIG</Eyebrow>
          {activityNeeds.length > 0 && (
            <RecentActivityBlock needs={activityNeeds.map((n) => n.key)} asOf={asOf} onSave={saveActivity} onSkip={() => setActivityDone(true)} />
          )}
          {questions.map((need) => (
            <CapabilityQuestion
              key={keyId(need.key)}
              capKey={need.key}
              anchor={ownHistoryAnchor(need.key, logEvidence)}
              onPick={(amount, unit, text) => save(need.key, amount, unit, asOf, text)}
              onUnknown={() => setUnknown((s) => new Set(s).add(keyId(need.key)))}
            />
          ))}
        </section>
      )}

      {open.length === 0 && knownRows.length > 0 && (
        <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Meer hoeft ASCEND niet te weten.</p>
      )}

      {unknownRows.length > 0 && (
        <p className="text-[11px] leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
          Blijft onbekend: {unknownRows.map((n) => capabilityKeyLabel(n.key)).join(', ')}. ASCEND rekent daar niet mee tot je trainingen er iets over zeggen.
        </p>
      )}

      <div className="mt-1 flex gap-3">
        <SecondaryButton onClick={onBack}>TERUG</SecondaryButton>
        <PrimaryButton fullWidth={false} onClick={onNext}>VOLGENDE</PrimaryButton>
      </div>
    </div>
  );
}

function RecentActivityBlock({
  needs,
  asOf,
  onSave,
  onSkip,
}: {
  needs: CapabilityKey[];
  asOf: string;
  onSave: (activity: RecentActivityInput, date: string) => Promise<void>;
  onSkip: () => void;
}) {
  const dims = new Set(needs.map((k) => k.dimension));
  const [hours, setHours] = useState<number | undefined>();
  const [distanceKm, setDistanceKm] = useState<number | undefined>();
  const [gain, setGain] = useState<number | undefined>();
  const [loss, setLoss] = useState<number | undefined>();
  const [pack, setPack] = useState<number | undefined>();
  const [daysAgo, setDaysAgo] = useState<number | undefined>();
  const [saving, setSaving] = useState(false);

  const askDuration = needs.some((k) => (k.dimension === 'endurance_duration' || k.dimension === 'mechanical_tolerance') && k.discipline !== 'cycling') || dims.has('aerobic_engine') || dims.has('sustainable_output');
  const cyclingDistance = needs.some((k) => k.discipline === 'cycling' && (k.dimension === 'endurance_duration' || k.dimension === 'mechanical_tolerance'));
  const askDistance = dims.has('sustainable_output') || cyclingDistance;
  const filled = [hours, distanceKm, gain, loss, pack].some((v) => v !== undefined && v > 0);

  async function handleSave() {
    if (daysAgo === undefined) return;
    setSaving(true);
    await onSave(
      { durationMinutes: hours ? Math.round(hours * 60) : undefined, distanceKm, elevationGainM: gain, elevationLossM: loss, packWeightKg: pack },
      addDays(asOf, -daysAgo),
    );
    setSaving(false);
  }

  return (
    <div className="rounded-xl border p-3" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)' }}>
      <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{cyclingDistance ? 'Je zwaarste rit of training van de afgelopen 8 weken' : 'Je zwaarste tocht of training van de afgelopen 8 weken'}</p>
      <p className="mt-0.5 text-[11px] leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
        Eén activiteit die je echt gedaan hebt. Vul in wat je weet, de rest mag leeg blijven.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {askDuration && <NumberField label="Duur" unit="uur" decimals={1} value={hours} onChange={setHours} compact />}
        {askDistance && <NumberField label="Afstand" unit="km" decimals={1} value={distanceKm} onChange={setDistanceKm} compact />}
        {dims.has('ascent_capacity') && <NumberField label="Stijging" unit="m D+" value={gain} onChange={setGain} compact />}
        {dims.has('descent_tolerance') && <NumberField label="Daling" unit="m D-" value={loss} onChange={setLoss} compact />}
        {dims.has('load_carriage') && <NumberField label="Rugzak" unit="kg" decimals={1} value={pack} onChange={setPack} compact />}
      </div>
      <p className="mt-3 text-xs" style={{ color: 'var(--color-ink-dim)' }}>Wanneer ongeveer?</p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {WHEN_OPTIONS.map((o) => (
          <Chip key={o.daysAgo} selected={daysAgo === o.daysAgo} onClick={() => setDaysAgo(o.daysAgo)}>{o.label}</Chip>
        ))}
      </div>
      <div className="mt-3">
        <PrimaryButton onClick={handleSave} disabled={saving || !filled || daysAgo === undefined}>OPSLAAN</PrimaryButton>
      </div>
      <button onClick={onSkip} className="mt-2 w-full text-center text-[11px] underline" style={{ color: 'var(--color-ink-dim)' }}>
        Liever per onderdeel antwoorden
      </button>
    </div>
  );
}

function CapabilityQuestion({
  capKey,
  anchor,
  onPick,
  onUnknown,
}: {
  capKey: CapabilityKey;
  anchor: ReturnType<typeof ownHistoryAnchor>;
  onPick: (amount: number, unit: Unit, text: string) => Promise<void>;
  onUnknown: () => void;
}) {
  const meta = questionMetaFor(capKey);
  const ranges = meta?.ranges;
  const [exact, setExact] = useState<number | undefined>();
  const [showExact, setShowExact] = useState(!ranges);
  if (!meta) return null;

  return (
    <div className="flex flex-col gap-2">
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{capabilityKeyLabel(capKey)}</p>
        <p className="mt-0.5 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{ranges ? meta.question.replace(/\s*\(in [^)]*\)\s*$/, '') : meta.question}</p>
        {anchor && (
          <p className="mt-1 text-[11px]" style={{ color: 'var(--color-ink-dim)' }}>
            Jouw logboek: zwaarste {formatCapabilityValue(anchor.measured)} op {formatDateNL(anchor.date)}.
          </p>
        )}
      </div>
      {ranges && (
        <div className="flex flex-wrap gap-1.5">
          {ranges.map((r) => (
            <Chip key={r.label} onClick={() => void onPick(r.value, meta.unit, r.label)}>{r.label}</Chip>
          ))}
          <Chip onClick={onUnknown} muted>Weet ik niet</Chip>
        </div>
      )}
      {showExact ? (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <NumberField value={exact} onChange={setExact} unit={unitSuffix(meta.unit)} decimals={meta.unit === 'kg' ? 1 : 0} compact />
          </div>
          <SecondaryButton onClick={() => exact && void onPick(exact, meta.unit, formatCapabilityValue({ amount: exact, unit: meta.unit }))} disabled={!exact}>OPSLAAN</SecondaryButton>
          {!ranges && <SecondaryButton onClick={onUnknown}>WEET IK NIET</SecondaryButton>}
        </div>
      ) : (
        meta.unit !== 'min_per_km' && (
          <button onClick={() => setShowExact(true)} className="self-start text-[11px] underline" style={{ color: 'var(--color-ink-dim)' }}>precies invullen</button>
        )
      )}
    </div>
  );
}

function unitSuffix(unit: Unit): string {
  if (unit === 'm_elevation_gain') return 'm D+';
  if (unit === 'm_elevation_loss') return 'm D−';
  if (unit === 'days') return 'dagen';
  return unit;
}

function Chip({ children, onClick, selected = false, muted = false }: { children: ReactNode; onClick: () => void; selected?: boolean; muted?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border px-3 py-1 text-xs transition-all active:scale-[0.97]"
      style={{
        borderColor: selected ? 'var(--color-gold)' : 'var(--color-card-border)',
        color: selected ? 'var(--color-gold)' : muted ? 'var(--color-ink-dim)' : 'var(--color-ink)',
      }}
    >
      {children}
    </button>
  );
}
