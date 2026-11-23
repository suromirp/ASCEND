import { FORGE_READ_LINES, FORGE_READ_TITLE } from '../../data/forgeReadLines';
import { forgeLabels, type ForgeWords } from '../../engine/forgeWords';
import { ForgeSheet } from './parts';

// Achter de i naast de kolomkoppen in Forge: wat Plan, Herh., Over en W betekenen (data/forgeReadLines.ts).
// In de vaktaal heten de koppen Voorschrift en RIR; het blad volgt de woorden die je ziet. Een blad in Forge is
// ForgeSheet (z-[60]), anders valt het onder het cijferblok.
export function ForgeReadSheet({ words, onClose }: { words: ForgeWords; onClose: () => void }) {
  const labels = forgeLabels(words);
  const head = (h: string) => (h === 'Plan' ? labels.plan : h === 'Over' ? labels.over : h);
  return (
    <ForgeSheet title={FORGE_READ_TITLE} onClose={onClose}>
      {() => (
        <div className="flex flex-col gap-4 pb-4">
          {FORGE_READ_LINES.map((l) => (
            <p key={l.head} className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
              <span style={{ color: 'var(--color-ink)' }}>{head(l.head)}</span>
              {': '}
              {l.text}
            </p>
          ))}
        </div>
      )}
    </ForgeSheet>
  );
}
