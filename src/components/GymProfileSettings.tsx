import { useState } from 'react';
import {
  DUMBBELL_PRESETS,
  RACK_LIMITS,
  STEP_LIMITS,
  applyDumbbellPreset,
  checkCustomWeight,
  chipValues,
  detectDumbbellPreset,
  dumbbellWeights,
  isCommonStackStep,
  setRackBound,
  summarizeSeries,
  toggleWeight,
  COMMON_STACK_STEPS_KG,
  type WeightKind,
} from '../engine/gymProfileEdit';
import type { GymProfile } from '../engine/strengthSettings';
import { formatNumberNL } from '../utils/number';
import { Icon } from './icons';
import { NumberField } from './NumberField';
import { Chip, SecondaryButton, Stepper } from './ui';

// "Je sportschool" in Instellingen, Forge (de bladen in components/settings/groups/ForgeSheets.tsx): what is in your gym, as taps
// instead of typing. The rules (which chip does what, which series you can pick
// up) live in engine/gymProfileEdit.ts; the stored shape is the GymProfile as it
// always was.

const kg = (n: number) => formatNumberNL(n, 2);
const dim = { color: 'var(--color-ink-dim)' };

// Bars or plates: the usual weights as chips, your own below them.
export function WeightPicker({ kind, list, onChange }: { kind: WeightKind; list: number[]; onChange: (list: number[]) => void }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<number | undefined>();
  const [refused, setRefused] = useState<string | undefined>();
  const error = draft === undefined ? undefined : checkCustomWeight(kind, list, draft);
  const close = () => {
    setAdding(false);
    setDraft(undefined);
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {chipValues(kind, list).map(({ value, custom }) => {
          const selected = list.includes(value);
          return (
            <Chip
              key={value}
              selected={selected}
              label={custom ? `${kg(value)} kg, eigen gewicht, weghalen` : `${kg(value)} kg`}
              onClick={() => {
                const r = toggleWeight(kind, list, value);
                setRefused(r.refused);
                if (!r.refused) onChange(r.list);
              }}
            >
              <span className="font-sans tabular-nums">{kg(value)}</span>
              {custom && <Icon name="sluiten" size={14} />}
            </Chip>
          );
        })}
        {!adding && (
          <Chip dashed onClick={() => { setRefused(undefined); setAdding(true); }}>
            <Icon name="plus" size={16} />
            Eigen gewicht
          </Chip>
        )}
      </div>
      {refused && <p className="text-xs" style={{ color: 'var(--color-warning)' }} role="status">{refused}</p>}
      {adding && (
        <div className="flex flex-col gap-2 rounded-xl border p-3" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)' }}>
          <NumberField label="Eigen gewicht" unit="kg" decimals={2} tall value={draft} onChange={setDraft} helper={error && draft !== undefined ? error : undefined} />
          <div className="flex gap-2">
            <SecondaryButton
              disabled={error !== undefined}
              onClick={() => {
                if (draft === undefined || error) return;
                onChange(toggleWeight(kind, list, draft).list);
                close();
              }}
            >
              Toevoegen
            </SecondaryButton>
            <SecondaryButton onClick={close}>Annuleren</SecondaryButton>
          </div>
        </div>
      )}
    </div>
  );
}

function KgStepper({ label, value, step, min, max, onChange }: { label: string; value: number; step: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <Stepper
      label={label}
      display={<>{kg(value)} <small>kg</small></>}
      decLabel={`${label} omlaag`}
      incLabel={`${label} omhoog`}
      decDisabled={value <= min}
      incDisabled={value >= max}
      onDec={() => onChange(Math.max(min, value - step))}
      onInc={() => onChange(Math.min(max, value + step))}
    />
  );
}

export function Dumbbells({ rack, onChange }: { rack: GymProfile['dumbbells']; onChange: (rack: GymProfile['dumbbells']) => void }) {
  const [customOpen, setCustomOpen] = useState(false);
  const preset = detectDumbbellPreset(rack);
  const custom = customOpen || preset === undefined;
  const series = summarizeSeries(dumbbellWeights(rack));
  const set = (patch: Partial<GymProfile['dumbbells']>, valid: boolean) => {
    if (valid) onChange({ ...rack, ...patch });
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <KgStepper label="Lichtste" value={rack.startKg} step={1} min={RACK_LIMITS.startMin} max={Math.min(RACK_LIMITS.startMax, rack.maxKg)} onChange={(v) => onChange(setRackBound(rack, 'startKg', v))} />
        <KgStepper label="Zwaarste" value={rack.maxKg} step={2.5} min={rack.startKg} max={RACK_LIMITS.maxMax} onChange={(v) => onChange(setRackBound(rack, 'maxKg', v))} />
      </div>
      <div className="mt-3">
        <p className="st-lab">Stap</p>
        <div className="flex flex-wrap gap-2">
          {DUMBBELL_PRESETS.map((p) => (
            <Chip key={p.id} selected={!custom && preset === p.id} onClick={() => { setCustomOpen(false); onChange(applyDumbbellPreset(rack, p.id)); }}>
              <span className="font-sans tabular-nums">{p.label}</span>
            </Chip>
          ))}
          <Chip selected={custom} onClick={() => setCustomOpen(true)}>Anders</Chip>
        </div>
      </div>
      {custom && (
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Stap in het eerste stuk" unit="kg" decimals={2} tall value={rack.stepKg} onChange={(v) => v !== undefined && set({ stepKg: v }, v >= STEP_LIMITS.min && v <= STEP_LIMITS.max)} />
          <NumberField label="Eerste stuk loopt tot" unit="kg" decimals={2} tall value={rack.upToKg} onChange={(v) => v !== undefined && set({ upToKg: v }, v >= rack.startKg && v <= rack.maxKg)} />
          <NumberField label="Stap daarna" unit="kg" decimals={2} tall value={rack.thenStepKg} onChange={(v) => v !== undefined && set({ thenStepKg: v }, v >= STEP_LIMITS.min && v <= STEP_LIMITS.max)} />
        </div>
      )}
      <div className="rounded-xl border p-3" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)' }} aria-live="polite">
        <p className="text-xs" style={dim}>Dit kun je pakken, <span className="font-sans tabular-nums">{series.total}</span> gewichten</p>
        <p className="mt-1 font-sans text-sm leading-relaxed tabular-nums" style={{ color: 'var(--color-ink)' }}>
          {series.head.map(kg).join(', ')}
          {series.gap && <span style={dim}> ... </span>}
          <span className="whitespace-nowrap">{series.tail.map(kg).join(', ')} kg</span>
        </p>
      </div>
    </div>
  );
}

export function StackStep({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [customOpen, setCustomOpen] = useState(false);
  const custom = customOpen || !isCommonStackStep(value);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {COMMON_STACK_STEPS_KG.map((n) => (
          <Chip key={n} selected={!custom && value === n} onClick={() => { setCustomOpen(false); onChange(n); }}>
            <span className="font-sans tabular-nums">{kg(n)}</span>
          </Chip>
        ))}
        <Chip selected={custom} onClick={() => setCustomOpen(true)}>Anders</Chip>
      </div>
      {custom && (
        <NumberField label="Stap" unit="kg" decimals={2} tall value={value} onChange={(v) => v !== undefined && v >= STEP_LIMITS.min && v <= STEP_LIMITS.max && onChange(v)} />
      )}
    </div>
  );
}
