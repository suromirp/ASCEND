// ASCEND — onder het GR5-doel: wat je rugzak voor deze tocht weegt (zelf in
// te stellen, per doel) en hoeveel dagen de tocht in totaal vraagt met
// rustdagen en een rustige start. Alle getallen komen uit
// engine/gr5Profile.ts; dit bestand toont en slaat op, het rekent niet.

import { useState } from 'react';
import type { TrainingGoal } from '../models/goals';
import { useAppData } from '../state/AppDataContext';
import { packSharePct, weightsInUse } from '../engine/bodyWeight';
import { packWeightOf, tripShapeNote } from '../engine/gr5Profile';
import { eventDaysRequirement } from '../engine/goalRoute';
import { formatNumberNL } from '../utils/number';
import { NumberField } from './NumberField';
import { PackWeightPresets } from './PackWeightPresets';
import { Eyebrow, SecondaryButton } from './ui';

export function GoalTripNotes({ goal, onPackChange }: { goal: TrainingGoal; onPackChange: (kg: number | undefined) => void }) {
  const { settings } = useAppData();
  const [editing, setEditing] = useState(false);
  const stored = packWeightOf(goal.requirements);
  const [draft, setDraft] = useState<number | undefined>(stored);
  const share = stored ? packSharePct(stored, weightsInUse(settings.weightEntries, settings.weightFromMacroFactor)) : undefined;
  const note = tripShapeNote(eventDaysRequirement(goal.requirements)?.target?.amount);

  return (
    <div className="flex flex-col gap-2 rounded-xl border px-3 py-3" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)' }}>
      <div className="flex items-center justify-between gap-3">
        <Eyebrow as="span">Rugzak op deze tocht</Eyebrow>
        <button
          onClick={() => { setDraft(stored); setEditing((v) => !v); }}
          className="min-h-11 px-1 text-xs underline"
          style={{ color: 'var(--color-ink-dim)' }}
        >
          {editing ? 'klaar' : 'aanpassen'}
        </button>
      </div>
      <p className="-mt-2 text-sm font-medium" style={{ color: stored ? 'var(--color-gold)' : 'var(--color-ink-dim)' }}>
        {stored ? `${formatNumberNL(stored, 1)} kg` : 'Nog niet ingesteld'}
        {share !== undefined && <span className="font-normal" style={{ color: 'var(--color-ink-dim)' }}> · {share}% van je lichaamsgewicht</span>}
      </p>

      {editing && (
        <div className="flex flex-col gap-3">
          <PackWeightPresets value={stored} onPick={(kg) => { setDraft(kg); onPackChange(kg); }} />
          <NumberField
            label="Of een eigen gewicht"
            unit="kg"
            decimals={1}
            value={draft}
            onChange={setDraft}
            helper="Wat je op je rug hebt als je vertrekt, met water en eten erbij."
          />
          {draft !== stored && (
            <SecondaryButton onClick={() => onPackChange(draft)}>
              {draft ? `Zet rugzak op ${formatNumberNL(draft, 1)} kg` : 'Rugzakdoel wissen'}
            </SecondaryButton>
          )}
        </div>
      )}

      {note && <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{note}</p>}
    </div>
  );
}
