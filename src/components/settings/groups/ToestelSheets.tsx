// ASCEND: de bladen van Forge voor de sportschool en de gewichten per toestel. Wat een tik doet
// staat in engine/machineWeights.ts; hier alleen het scherm.
// Besluit: docs/beslissingen/2026-10-26-gewichten-per-toestel.md.

import { useId, useState } from 'react';
import { EXERCISES } from '../../../data/exercises';
import {
  addOnSource,
  addOnsFor,
  allProfiles,
  formatAddOns,
  formatMachineWeights,
  hasStack,
  MAX_GYM_PROFILES,
  ownWeightsFor,
  profileNameProblem,
  withActiveProfile,
  withNewProfile,
} from '../../../engine/machineWeights';
import { normalizeStrengthSettings, resolveStrengthSettings, withProfile } from '../../../engine/strengthSettings';
import { useAppData } from '../../../state/AppDataContext';
import { ExerciseAddOnSheet, GymAddOnForm } from '../../forge/AddOnWeights';
import { MachineWeightsSheet } from '../../forge/MachineWeights';
import { Icon } from '../../icons';
import { PrimaryButton, SecondaryButton } from '../../ui';
import { SettingsRow } from '../SettingsList';
import { ChoiceSheet, Sheet } from '../Sheet';

const STACK_EXERCISES = EXERCISES.filter(hasStack).sort((a, b) => a.name.localeCompare(b.name));

// Gewichten per toestel: de toestellen met een lijst in deze sportschool, om aan te passen of
// te wissen, en een keuze om een toestel toe te voegen.
export function MachineListSheet({ onClose }: { onClose: () => void }) {
  const { settings } = useAppData();
  const profile = resolveStrengthSettings(settings.strengthModel).profile;
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const withList = STACK_EXERCISES.filter((e) => ownWeightsFor(profile, e));
  const without = STACK_EXERCISES.filter((e) => !ownWeightsFor(profile, e));
  return (
    <>
      <Sheet eyebrow="Je sportschool" title="Gewichten per toestel" line={`Voor ${profile.name}.`} onClose={onClose}>
        {withList.length > 0 ? (
          <div className="st-list">
            {withList.map((e) => (
              <SettingsRow key={e.id} id={`tg-${e.id}`} title={e.name} value={formatMachineWeights(ownWeightsFor(profile, e) ?? [])} onClick={() => setEditing(e.id)} />
            ))}
          </div>
        ) : (
          <p className="st-hint" style={{ marginLeft: 0 }}>Nog geen toestel met een eigen lijst. Voeg er een toe, of vul de gewichten in tijdens een training.</p>
        )}
        <div className="st-list" style={{ marginTop: 12 }}>
          <button type="button" className="st-more" onClick={() => setAdding(true)}>
            <span>Toestel toevoegen</span>
            <Icon name="verder" size={16} />
          </button>
        </div>
      </Sheet>
      {adding && (
        <ChoiceSheet<string>
          eyebrow="Gewichten per toestel"
          title="Welk toestel?"
          options={without.map((e) => ({ value: e.id, label: e.name }))}
          value=""
          onPick={(id) => setEditing(id)}
          onClose={() => setAdding(false)}
        />
      )}
      {editing && <MachineWeightsSheet exerciseId={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

// Tussengewichten: een los plaatje of magneet voor de hele sportschool, en de toestellen die er
// iets anders mee doen (een eigen keuze of geen).
export function AddOnSheet({ onClose }: { onClose: () => void }) {
  const { settings } = useAppData();
  const profile = resolveStrengthSettings(settings.strengthModel).profile;
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const own = STACK_EXERCISES.filter((e) => addOnSource(profile, e) !== 'gym');
  const rest = STACK_EXERCISES.filter((e) => addOnSource(profile, e) === 'gym');
  return (
    <>
      <Sheet eyebrow="Je sportschool" title="Tussengewichten" line={`Voor ${profile.name}.`} onClose={onClose}>
        {(close) => (
          <>
            <GymAddOnForm onDone={close} />
            <p className="st-hint" style={{ marginLeft: 0, marginTop: 16 }}>
              {own.length > 0 ? 'Toestellen die het anders doen:' : 'Geen toestel doet het anders dan de sportschool.'}
            </p>
            {own.length > 0 && (
              <div className="st-list">
                {own.map((e) => (
                  <SettingsRow key={e.id} id={`ta-${e.id}`} title={e.name} value={formatAddOns(addOnsFor(profile, e))} onClick={() => setEditing(e.id)} />
                ))}
              </div>
            )}
            <div className="st-list" style={{ marginTop: 12 }}>
              <button type="button" className="st-more" onClick={() => setAdding(true)}>
                <span>Toestel toevoegen</span>
                <Icon name="verder" size={16} />
              </button>
            </div>
          </>
        )}
      </Sheet>
      {adding && (
        <ChoiceSheet<string>
          eyebrow="Tussengewichten"
          title="Welk toestel?"
          options={rest.map((e) => ({ value: e.id, label: e.name }))}
          value=""
          onPick={(id) => setEditing(id)}
          onClose={() => setAdding(false)}
        />
      )}
      {editing && <ExerciseAddOnSheet exerciseId={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

// De naam van een sportschool: een nieuwe, of een andere naam voor de actieve.
function GymNameSheet({ mode, onClose }: { mode: 'new' | 'rename'; onClose: () => void }) {
  const { settings, updateSettings } = useAppData();
  const profile = resolveStrengthSettings(settings.strengthModel).profile;
  const [name, setName] = useState(mode === 'rename' ? profile.name : '');
  const [touched, setTouched] = useState(false);
  const id = useId();
  const problem = profileNameProblem(settings.strengthModel, name, mode === 'rename' ? profile.id : undefined);
  const save = () => {
    if (problem) return setTouched(true);
    const next = mode === 'new' ? withNewProfile(settings.strengthModel, name) : withProfile(settings.strengthModel, { name: name.trim().slice(0, 40) });
    const clean = next ? normalizeStrengthSettings(next) : undefined;
    if (clean) void updateSettings({ strengthModel: clean });
  };
  return (
    <Sheet eyebrow="Je sportschool" title={mode === 'new' ? 'Nieuwe sportschool' : 'Naam van de sportschool'} line={mode === 'new' ? 'Je begint met de stangen, schijven en dumbbells van de huidige.' : undefined} onClose={onClose}>
      {(close) => (
        <div className="flex flex-col gap-3 pb-2">
          <label htmlFor={id} className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Naam</label>
          <input
            id={id}
            type="text"
            value={name}
            maxLength={40}
            autoComplete="off"
            onChange={(e) => {
              setName(e.target.value);
              setTouched(true);
            }}
            className="min-h-[44px] w-full rounded-xl border px-3 text-base"
            style={{ background: 'var(--color-charcoal)', borderColor: touched && problem ? 'var(--color-danger-text)' : 'var(--color-control-border)', color: 'var(--color-ink)' }}
          />
          {touched && problem && <p className="text-xs" role="alert" style={{ color: 'var(--color-danger-text)' }}>{problem}</p>}
          <div className="flex gap-3">
            <SecondaryButton onClick={close}>Annuleren</SecondaryButton>
            <PrimaryButton
              fullWidth={false}
              disabled={!!problem}
              onClick={() => {
                if (problem) return;
                save();
                close();
              }}
            >
              Opslaan
            </PrimaryButton>
          </div>
        </div>
      )}
    </Sheet>
  );
}

// Sportschool: in welke je nu traint. Een nieuwe krachttraining onthoudt dit, en wat ASCEND leert
// over de gewichten van toestellen is per sportschool.
export function GymProfileSheet({ onClose }: { onClose: () => void }) {
  const { settings, updateSettings } = useAppData();
  const [naming, setNaming] = useState<'new' | 'rename' | null>(null);
  const profiles = allProfiles(settings.strengthModel);
  const active = resolveStrengthSettings(settings.strengthModel).profile;
  return (
    <>
      <ChoiceSheet<string>
        eyebrow="Je sportschool"
        title="Sportschool"
        line="Waar je nu traint. De gewichten van toestellen horen bij deze keuze."
        options={profiles.map((p) => ({ value: p.id, label: p.name }))}
        value={active.id}
        keepOpen
        helpKey="gymProfiel"
        onPick={(id) => {
          const next = normalizeStrengthSettings(withActiveProfile(settings.strengthModel, id));
          if (next) void updateSettings({ strengthModel: next });
        }}
        onClose={onClose}
        footer={
          <div className="st-list" style={{ marginTop: 12 }}>
            <button type="button" className="st-more" onClick={() => setNaming('rename')}>
              <span>Naam veranderen</span>
              <Icon name="verder" size={16} />
            </button>
            {profiles.length < MAX_GYM_PROFILES && (
              <button type="button" className="st-more" onClick={() => setNaming('new')}>
                <span>Sportschool toevoegen</span>
                <Icon name="verder" size={16} />
              </button>
            )}
          </div>
        }
      />
      {naming && <GymNameSheet mode={naming} onClose={() => setNaming(null)} />}
    </>
  );
}
