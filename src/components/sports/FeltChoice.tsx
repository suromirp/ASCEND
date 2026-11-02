// "Hoe zwaar voelde het?" met vier woorden: Rustig, Pittig, Zwaar, Heel zwaar (engine/sessionLoad.ts zet
// ze op RPE 3, 5, 7 en 9). Alleen de keuze; wat ermee gebeurt beslist de aanroeper.

import { FELT_LABEL, FELT_RPE, type FeltWord } from '../../engine/sessionLoad';
import { Chip, Eyebrow } from '../ui';
import '../settings/settings.css';

const WORDS = Object.keys(FELT_RPE) as FeltWord[];

export function FeltChoice({ value, onPick, note }: { value: FeltWord | undefined; onPick: (word: FeltWord) => void; note?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <Eyebrow>Hoe zwaar voelde het?</Eyebrow>
      <div className="st-chips" role="group" aria-label="Hoe zwaar voelde het?">
        {WORDS.map((w) => (
          <Chip key={w} selected={value === w} onClick={() => onPick(w)}>
            {FELT_LABEL[w]}
          </Chip>
        ))}
      </div>
      {note && <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{note}</p>}
    </div>
  );
}
