// ASCEND: de gewichten van een toestel invullen. Eén formulier, twee bladen: in Forge (het menu
// van een oefening en de regel als geen gewicht past) en in de instellingen. Geen rekenwerk;
// dat staat in engine/machineWeights.ts. Besluit: docs/beslissingen/2026-10-26-gewichten-per-toestel.md.

import { useId, useState } from 'react';
import { exerciseById } from '../../data/exercises';
import { formatMachineWeights, ownWeightsFor, parseMachineWeights, withMachineWeights } from '../../engine/machineWeights';
import { normalizeStrengthSettings, resolveStrengthSettings, type GymProfile, type StrengthSettings } from '../../engine/strengthSettings';
import { useAppData } from '../../state/AppDataContext';
import { formatNumberNL } from '../../utils/number';
import { Sheet } from '../settings/Sheet';
import { TextButton } from '../TextButton';
import { PrimaryButton, SecondaryButton } from '../ui';
import { ForgeSheet } from './parts';

// Zet of wist de lijst van één toestel in het actieve profiel. Geeft de nieuwe instellingen terug,
// zodat de aanroeper er meteen mee kan rekenen.
function useSaveMachineWeights() {
  const { settings, updateSettings } = useAppData();
  return (exerciseId: string, list: number[] | undefined): StrengthSettings => {
    const next = normalizeStrengthSettings(withMachineWeights(settings.strengthModel, exerciseId, list)) ?? {};
    void updateSettings({ strengthModel: next });
    return next;
  };
}

function MachineWeightsForm({
  exerciseId,
  exerciseName,
  profile,
  onDone,
  onSaved,
}: {
  exerciseId: string;
  exerciseName: string;
  profile: GymProfile;
  // Sluit het blad.
  onDone: () => void;
  onSaved?: (next: StrengthSettings) => void;
}) {
  const save = useSaveMachineWeights();
  const existing = ownWeightsFor(profile, exerciseById(exerciseId));
  const [text, setText] = useState(existing ? formatMachineWeights(existing) : '');
  const [touched, setTouched] = useState(false);
  const id = useId();
  const parsed = parseMachineWeights(text);
  const showError = touched && !parsed.ok;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
        De gewichten van {exerciseName} in {profile.name}, met een spatie ertussen. Dan stelt ASCEND hier alleen gewichten uit deze lijst voor.
      </p>
      <label htmlFor={id} className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Gewichten in kg</label>
      <input
        id={id}
        type="text"
        value={text}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-invalid={showError}
        aria-describedby={`${id}-info`}
        placeholder="4,5 9 13,5 18"
        onChange={(e) => {
          setText(e.target.value);
          setTouched(true);
        }}
        className="min-h-[44px] w-full rounded-xl border px-3 text-base tabular-nums"
        style={{ background: 'var(--color-charcoal)', borderColor: showError ? 'var(--color-danger-text)' : 'var(--color-control-border)', color: 'var(--color-ink)' }}
      />
      <p id={`${id}-info`} className="text-xs leading-snug" role={showError ? 'alert' : undefined} style={{ color: showError ? 'var(--color-danger-text)' : 'var(--color-ink-dim)' }}>
        {parsed.ok
          ? `${parsed.list.length} ${parsed.list.length === 1 ? 'gewicht' : 'gewichten'}, van ${formatNumberNL(parsed.list[0], 2)} tot ${formatNumberNL(parsed.list[parsed.list.length - 1], 2)} kg.`
          : touched
            ? parsed.reason
            : 'Bijvoorbeeld 4,5 9 13,5 18.'}
      </p>
      <div className="flex gap-3">
        <SecondaryButton onClick={onDone}>Annuleren</SecondaryButton>
        <PrimaryButton
          fullWidth={false}
          disabled={!parsed.ok}
          onClick={() => {
            if (!parsed.ok) return setTouched(true);
            const next = save(exerciseId, parsed.list);
            onSaved?.(next);
            onDone();
          }}
        >
          Opslaan
        </PrimaryButton>
      </div>
      {existing && (
        <TextButton
          tone="danger"
          onClick={() => {
            const next = save(exerciseId, undefined);
            onSaved?.(next);
            onDone();
          }}
        >
          Lijst wissen
        </TextButton>
      )}
    </div>
  );
}

function useActiveProfile(): GymProfile {
  const { settings } = useAppData();
  return resolveStrengthSettings(settings.strengthModel).profile;
}

// In de instellingen.
export function MachineWeightsSheet({ exerciseId, onClose }: { exerciseId: string; onClose: () => void }) {
  const profile = useActiveProfile();
  const name = exerciseById(exerciseId)?.name ?? exerciseId;
  return (
    <Sheet eyebrow="Je sportschool" title={name} onClose={onClose}>
      {(close) => <MachineWeightsForm exerciseId={exerciseId} exerciseName={name} profile={profile} onDone={close} />}
    </Sheet>
  );
}

// In Forge, met `onSaved` om meteen opnieuw te kijken of er een lichter gewicht past.
export function MachineWeightsForgeSheet({ exerciseId, onSaved, onClose }: { exerciseId: string; onSaved?: (next: StrengthSettings) => void; onClose: () => void }) {
  const profile = useActiveProfile();
  const name = exerciseById(exerciseId)?.name ?? exerciseId;
  return (
    <ForgeSheet title={`Gewichten van ${name}`} sub={profile.name} onClose={onClose}>
      {(close) => <MachineWeightsForm exerciseId={exerciseId} exerciseName={name} profile={profile} onDone={close} onSaved={onSaved} />}
    </ForgeSheet>
  );
}
