import { useState, type ReactNode } from 'react';
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
  smallestBarJump,
  summarizeSeries,
  toggleWeight,
  COMMON_STACK_STEPS_KG,
  type WeightKind,
} from '../engine/gymProfileEdit';
import type { GymProfile } from '../engine/strengthSettings';
import { formatNumberNL } from '../utils/number';
import { haptics } from '../utils/haptics';
import { Icon } from './icons';
import { NumberField } from './NumberField';
import { Eyebrow, SecondaryButton } from './ui';

// "Je sportschool" in Instellingen, Training: what is in your gym, as taps
// instead of typing. The rules (which chip does what, which series you can pick
// up) live in engine/gymProfileEdit.ts; the stored shape is the GymProfile as it
// always was.

const kg = (n: number) => formatNumberNL(n, 2);
const tint = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;
const dim = { color: 'var(--color-ink-dim)' };

function Chip({ selected, onClick, children, dashed = false, label }: { selected?: boolean; onClick: () => void; children: ReactNode; dashed?: boolean; label?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        haptics.tap();
        onClick();
      }}
      aria-pressed={selected === undefined ? undefined : selected}
      aria-label={label}
      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-full border px-4 text-sm transition-all active:scale-[0.97]"
      style={{
        borderColor: selected ? 'var(--color-bronze)' : dashed ? 'var(--color-control-border)' : 'var(--color-card-border)',
        borderStyle: dashed ? 'dashed' : 'solid',
        background: selected ? tint('var(--color-bronze)', 16) : 'transparent',
        color: selected ? 'var(--color-ink)' : 'var(--color-ink-dim)',
        fontWeight: selected ? 600 : 400,
      }}
    >
      {children}
    </button>
  );
}

function Block({ title, helper, first = false, children }: { title: string; helper: string; first?: boolean; children: ReactNode }) {
  return (
    <div className={`flex flex-col gap-3 ${first ? '' : 'border-t pt-4'}`} style={{ borderColor: 'var(--color-card-border)' }}>
      <div>
        <Eyebrow>{title}</Eyebrow>
        <p className="mt-1 text-xs leading-snug" style={dim}>{helper}</p>
      </div>
      {children}
    </div>
  );
}

// Bars or plates: the usual weights as chips, your own below them.
function WeightPicker({ kind, list, onChange }: { kind: WeightKind; list: number[]; onChange: (list: number[]) => void }) {
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

function Stepper({ label, value, step, min, max, onChange }: { label: string; value: number; step: number; min: number; max: number; onChange: (v: number) => void }) {
  const btn = 'flex h-11 w-11 shrink-0 items-center justify-center transition-opacity active:opacity-60 disabled:opacity-30';
  return (
    <div>
      <p className="text-xs" style={dim}>{label}</p>
      <div className="mt-1 flex items-center rounded-xl border" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)' }} role="group" aria-label={label}>
        <button type="button" className={btn} disabled={value <= min} aria-label={`${label} omlaag`} onClick={() => { haptics.tap(); onChange(Math.max(min, value - step)); }} style={{ color: 'var(--color-ink)' }}>
          <Icon name="min" size={18} />
        </button>
        <span className="min-w-0 flex-1 text-center font-sans text-sm font-semibold tabular-nums" style={{ color: 'var(--color-ink)' }} aria-live="polite">
          {kg(value)} <span className="text-xs font-normal" style={dim}>kg</span>
        </span>
        <button type="button" className={btn} disabled={value >= max} aria-label={`${label} omhoog`} onClick={() => { haptics.tap(); onChange(Math.min(max, value + step)); }} style={{ color: 'var(--color-ink)' }}>
          <Icon name="plus" size={18} />
        </button>
      </div>
    </div>
  );
}

function Dumbbells({ rack, onChange }: { rack: GymProfile['dumbbells']; onChange: (rack: GymProfile['dumbbells']) => void }) {
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
        <Stepper label="Lichtste" value={rack.startKg} step={1} min={RACK_LIMITS.startMin} max={Math.min(RACK_LIMITS.startMax, rack.maxKg)} onChange={(v) => onChange(setRackBound(rack, 'startKg', v))} />
        <Stepper label="Zwaarste" value={rack.maxKg} step={2.5} min={rack.startKg} max={RACK_LIMITS.maxMax} onChange={(v) => onChange(setRackBound(rack, 'maxKg', v))} />
      </div>
      <div>
        <p className="text-xs" style={dim}>Stap tussen twee dumbbells</p>
        <div className="mt-1 flex flex-wrap gap-2">
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
        <p className="text-xs" style={dim}>Dit kun je pakken</p>
        <p className="mt-1 font-sans text-sm leading-relaxed tabular-nums" style={{ color: 'var(--color-ink)' }}>
          {series.head.map(kg).join(', ')}
          {series.gap && <span style={dim}> ... </span>}
          <span className="whitespace-nowrap">{series.tail.map(kg).join(', ')} kg</span>
        </p>
        <p className="mt-1 text-xs" style={dim}><span className="font-sans tabular-nums">{series.total}</span> gewichten</p>
      </div>
    </div>
  );
}

function StackStep({ value, onChange }: { value: number; onChange: (v: number) => void }) {
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

export function GymProfileSettings({ profile, onSave }: { profile: GymProfile; onSave: (patch: Partial<GymProfile>) => void }) {
  return (
    <div className="flex flex-col gap-4 border-t pt-4" style={{ borderColor: 'var(--color-card-border)' }}>
      <div>
        <p className="font-display text-lg" style={{ color: 'var(--color-ink)' }}>Je sportschool</p>
        <p className="mt-1 text-xs leading-snug" style={dim}>
          Tik aan wat er bij jou ligt. ASCEND stelt dan alleen gewichten voor die je echt kunt maken, in kilo&apos;s.
        </p>
      </div>
      <Block first title="Stangen" helper="Het gewicht van de lege stang. Bij een voorstel pakt ASCEND de zwaarste die past.">
        <WeightPicker kind="bars" list={profile.barsKg} onChange={(list) => onSave({ barsKg: list })} />
      </Block>
      <Block title="Schijven" helper="Elke schijf telt als twee, een aan elke kant.">
        <WeightPicker kind="plates" list={profile.platesKg} onChange={(list) => onSave({ platesKg: list })} />
        <p className="text-xs" style={dim}>Kleinste sprong op de stang: <span className="font-sans tabular-nums">{kg(smallestBarJump(profile.platesKg))} kg</span></p>
      </Block>
      <Block title="Dumbbells" helper="Van de lichtste tot de zwaarste, en hoeveel zwaarder het volgende paar is.">
        <Dumbbells rack={profile.dumbbells} onChange={(dumbbells) => onSave({ dumbbells })} />
      </Block>
      <Block title="Kabels en toestellen" helper="Hoeveel het gewichtenblok per stand omhoog gaat.">
        <StackStep value={profile.stackStepKg} onChange={(stackStepKg) => onSave({ stackStepKg })} />
      </Block>
    </div>
  );
}
