// Twee bladen bij een oefening in Forge: de notitie en de keuzes om te ruilen.

import { useMemo, useState } from 'react';
import { ExerciseArtButton } from '../ExerciseArtButton';
import { useDrawingsFor } from '../useExerciseArtPrefetch';
import { MUSCLE_LABEL } from '../../models/exercise';
import type { Exercise } from '../../models/exercise';
import type { SwapGroups } from '../../engine/forgeWorkout';
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

// De keuzes in het ruilblad in twee groepen, met links het kaartje. Eerst "Doet hetzelfde" (de eerste is
// aanbevolen, elke keuze heeft een korte reden), dan "Zelfde spier, anders". Een lege groep laat ook
// haar kop weg. De tekeningen worden opgehaald zodra het blad opent. Een korte reden (`reasonOf`) staat
// onder de spieren van de tweede groep als een keuze voorop staat omdat hij een spier bedient die weinig kreeg.
export function SwapList({ groups, onPick, reasonOf }: { groups: SwapGroups; onPick: (id: string) => void; reasonOf?: (e: Exercise) => string | undefined }) {
  const ids = useMemo(() => [...groups.same.map((s) => s.exercise.id), ...groups.other.map((o) => o.id)], [groups]);
  useDrawingsFor(ids);
  const heading = (text: string) => <div className="pb-1 pt-3 text-xs font-semibold first:pt-0" style={{ color: 'var(--color-ink-dim)' }}>{text}</div>;
  const arrow = <span style={{ color: 'var(--color-ink-dim)' }}><Icon name="verder" size={18} /></span>;
  return (
    <div className="flex flex-col">
      {groups.same.length > 0 && heading('Doet hetzelfde')}
      {groups.same.map((s, i) => (
        <MenuRow key={s.exercise.id} lead={<ExerciseArtButton exerciseId={s.exercise.id} name={s.exercise.name} />} title={s.exercise.name} sub={i === 0 ? `Aanbevolen. ${s.reason}` : s.reason} onClick={() => onPick(s.exercise.id)} right={arrow} />
      ))}
      {groups.other.length > 0 && heading('Zelfde spier, anders')}
      {groups.other.map((o) => (
        <MenuRow key={o.id} lead={<ExerciseArtButton exerciseId={o.id} name={o.name} />} title={o.name} sub={[o.primary.map((m) => MUSCLE_LABEL[m]).join(', '), reasonOf?.(o)].filter(Boolean).join('. ')} onClick={() => onPick(o.id)} right={arrow} />
      ))}
    </div>
  );
}
