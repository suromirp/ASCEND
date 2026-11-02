// Twee bladen bij een oefening in Forge: de notitie en de keuzes om te ruilen.

import { useMemo, useState } from 'react';
import { ExerciseArtButton } from '../ExerciseArtButton';
import { useDrawingsFor } from '../useExerciseArtPrefetch';
import { MUSCLE_LABEL } from '../../models/exercise';
import { swapOptions } from '../../engine/forgeWorkout';
import { EXERCISE_NOTE_MAX } from '../../engine/strengthSettings';
import { Icon } from '../icons';
import { PrimaryButton, SecondaryButton } from '../ui';
import { ForgeSheet, MenuRow } from './parts';

// --- notitie ---------------------------------------------------------------------------

export function NoteSheet({ name, value, onSave, onClose }: { name: string; value: string; onSave: (text: string) => void; onClose: () => void }) {
  const [text, setText] = useState(value);
  return (
    <ForgeSheet title={`Notitie bij ${name}`} sub="Staat bij deze oefening, elke training weer." onClose={onClose}>
      {(close) => (
        <div className="flex flex-col gap-3">
          <textarea
            value={text}
            maxLength={EXERCISE_NOTE_MAX}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Bijvoorbeeld: stoel op 4, voeten hoog"
            className="w-full rounded-xl border px-3 py-2 text-sm"
            style={{ background: 'var(--color-charcoal)', borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' }}
          />
          <div className="flex gap-3">
            <SecondaryButton onClick={close}>Annuleren</SecondaryButton>
            <PrimaryButton fullWidth={false} onClick={() => { onSave(text); close(); }}>Opslaan</PrimaryButton>
          </div>
        </div>
      )}
    </ForgeSheet>
  );
}

// De keuzes in het ruilblad, met links het kaartje. De tekeningen ervan worden opgehaald zodra het blad
// opent, zodat de kaartjes de oefening laten zien en niet alleen de spieren.
// Een korte reden (`reasonOf`) staat onder de spieren als een keuze voorop staat omdat hij een spier bedient die weinig kreeg.
export function SwapList({ options, onPick, reasonOf }: { options: ReturnType<typeof swapOptions>; onPick: (id: string) => void; reasonOf?: (e: ReturnType<typeof swapOptions>[number]) => string | undefined }) {
  useDrawingsFor(useMemo(() => options.map((o) => o.id), [options]));
  return (
    <div className="flex flex-col">
      {options.map((o) => (
        <MenuRow key={o.id} lead={<ExerciseArtButton exerciseId={o.id} name={o.name} />} title={o.name} sub={[o.primary.map((m) => MUSCLE_LABEL[m]).join(', '), reasonOf?.(o)].filter(Boolean).join('. ')} onClick={() => onPick(o.id)} right={<span style={{ color: 'var(--color-ink-dim)' }}><Icon name="verder" size={18} /></span>} />
      ))}
    </div>
  );
}
