// ASCEND: het losse tussengewicht (een plaatje of magneet dat je bij elk gewicht van het blok
// optelt) invullen. Eén formulier voor de sportschool en één voor een toestel, en de bladen
// daaromheen in de instellingen en in Forge. Geen rekenwerk; dat staat in engine/machineWeights.ts.
// Besluit: docs/beslissingen/2026-10-28-tussengewichten.md.

import { useId, useState } from 'react';
import { exerciseById } from '../../data/exercises';
import { ADD_ON_LIMITS, addOnSource, addOnsFor, formatAddOns, formatMachineWeights, parseAddOns, withExerciseAddOns, withGymAddOns } from '../../engine/machineWeights';
import { normalizeStrengthSettings, resolveStrengthSettings, type GymProfile } from '../../engine/strengthSettings';
import { useAppData } from '../../state/AppDataContext';
import { Sheet } from '../settings/Sheet';
import { TextButton } from '../TextButton';
import { PrimaryButton, SecondaryButton } from '../ui';
import { ForgeSheet } from './parts';

function useActiveProfile(): GymProfile {
  const { settings } = useAppData();
  return resolveStrengthSettings(settings.strengthModel).profile;
}

// Het veld met de tussengewichten, met de uitleg eronder.
function AddOnField({ value, onChange, touched }: { value: string; onChange: (v: string) => void; touched: boolean }) {
  const id = useId();
  const parsed = parseAddOns(value);
  const showError = touched && !parsed.ok;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Tussengewichten in kg</label>
      <input
        id={id}
        type="text"
        value={value}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-invalid={showError}
        aria-describedby={`${id}-info`}
        placeholder="2,3"
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[44px] w-full rounded-xl border px-3 text-base tabular-nums"
        style={{ background: 'var(--color-charcoal)', borderColor: showError ? 'var(--color-danger-text)' : 'var(--color-control-border)', color: 'var(--color-ink)' }}
      />
      <p id={`${id}-info`} className="text-xs leading-snug" role={showError ? 'alert' : undefined} style={{ color: showError ? 'var(--color-danger-text)' : 'var(--color-ink-dim)' }}>
        {showError && !parsed.ok ? parsed.reason : `Hoogstens ${ADD_ON_LIMITS.maxCount}, met een spatie ertussen. Elk mag bij een gewicht van het blok, alleen of samen met de andere.`}
      </p>
    </div>
  );
}

// De hele sportschool: voor alle kabels en toestellen met een gewichtstapel.
export function GymAddOnForm({ onDone }: { onDone: () => void }) {
  const { settings, updateSettings } = useAppData();
  const profile = useActiveProfile();
  const [text, setText] = useState(formatMachineWeights(profile.addOnKg ?? []));
  const [touched, setTouched] = useState(false);
  const parsed = parseAddOns(text);
  const save = (list: number[] | undefined) => {
    const next = normalizeStrengthSettings(withGymAddOns(settings.strengthModel, list)) ?? {};
    void updateSettings({ strengthModel: next });
    onDone();
  };
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
        Een los plaatje of magneet dat je bij elk gewicht van het blok kunt leggen, bijvoorbeeld 2,3 kg. Het geldt voor alle kabels en toestellen met een gewichtstapel in {profile.name}. Per toestel kun je het overschrijven of uitzetten.
      </p>
      <AddOnField value={text} onChange={(v) => { setText(v); setTouched(true); }} touched={touched} />
      <div className="flex gap-3">
        <SecondaryButton onClick={onDone}>Annuleren</SecondaryButton>
        <PrimaryButton fullWidth={false} disabled={!parsed.ok} onClick={() => parsed.ok && save(parsed.list.length > 0 ? parsed.list : undefined)}>
          Opslaan
        </PrimaryButton>
      </div>
      {(profile.addOnKg?.length ?? 0) > 0 && <TextButton tone="danger" onClick={() => save(undefined)}>Tussengewichten wissen</TextButton>}
    </div>
  );
}

type Choice = 'gym' | 'own' | 'none';

// Eén toestel: zoals de sportschool, een eigen keuze of geen.
export function ExerciseAddOnForm({ exerciseId, onDone }: { exerciseId: string; onDone: () => void }) {
  const { settings, updateSettings } = useAppData();
  const profile = useActiveProfile();
  const exercise = exerciseById(exerciseId);
  const source = addOnSource(profile, exercise);
  const [choice, setChoice] = useState<Choice>(source === 'own' ? 'own' : source === 'none-own' ? 'none' : 'gym');
  const [text, setText] = useState(source === 'own' ? formatMachineWeights(addOnsFor(profile, exercise)) : '');
  const [touched, setTouched] = useState(false);
  const parsed = parseAddOns(text);
  const valid = choice !== 'own' || (parsed.ok && parsed.list.length > 0);
  const options: { value: Choice; label: string; sub: string }[] = [
    { value: 'gym', label: 'Zoals de sportschool', sub: formatAddOns(profile.addOnKg) },
    { value: 'own', label: 'Eigen tussengewicht', sub: 'Alleen voor dit toestel' },
    { value: 'none', label: 'Geen', sub: 'Dit toestel heeft geen los gewicht' },
  ];
  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-label="Tussengewicht van dit toestel" className="flex flex-col gap-2">
        {options.map((o) => {
          const on = choice === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setChoice(o.value)}
              className="flex min-h-[52px] w-full flex-col justify-center rounded-xl border px-3 py-2 text-left"
              style={{ background: on ? 'var(--color-action-muted)' : 'var(--color-charcoal)', borderColor: on ? 'var(--color-action)' : 'var(--color-control-border)', color: 'var(--color-ink)' }}
            >
              <span className="text-base">{o.label}</span>
              <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{o.sub}</span>
            </button>
          );
        })}
      </div>
      {choice === 'own' && <AddOnField value={text} onChange={(v) => { setText(v); setTouched(true); }} touched={touched} />}
      <div className="flex gap-3">
        <SecondaryButton onClick={onDone}>Annuleren</SecondaryButton>
        <PrimaryButton
          fullWidth={false}
          disabled={!valid}
          onClick={() => {
            if (!valid) return setTouched(true);
            const list = choice === 'gym' ? undefined : choice === 'none' ? [] : parsed.ok ? parsed.list : undefined;
            const next = normalizeStrengthSettings(withExerciseAddOns(settings.strengthModel, exerciseId, list)) ?? {};
            void updateSettings({ strengthModel: next });
            onDone();
          }}
        >
          Opslaan
        </PrimaryButton>
      </div>
    </div>
  );
}

// In de instellingen: één toestel.
export function ExerciseAddOnSheet({ exerciseId, onClose }: { exerciseId: string; onClose: () => void }) {
  const name = exerciseById(exerciseId)?.name ?? exerciseId;
  return (
    <Sheet eyebrow="Tussengewichten" title={name} onClose={onClose}>
      {(close) => <ExerciseAddOnForm exerciseId={exerciseId} onDone={close} />}
    </Sheet>
  );
}

// In Forge, vanuit het menu van een oefening.
export function ExerciseAddOnForgeSheet({ exerciseId, onClose }: { exerciseId: string; onClose: () => void }) {
  const profile = useActiveProfile();
  const name = exerciseById(exerciseId)?.name ?? exerciseId;
  return (
    <ForgeSheet title={`Tussengewicht van ${name}`} sub={profile.name} onClose={onClose}>
      {(close) => <ExerciseAddOnForm exerciseId={exerciseId} onDone={close} />}
    </ForgeSheet>
  );
}
