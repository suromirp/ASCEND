// ASCEND: bij een oefening met eigen gewicht een klein bolletje "84,2 kg · 50%" en het blad erachter
// (engine/bodyLoad.ts, docs/beslissingen/2026-11-09-gewicht-bij-eigen-gewicht.md). Alleen tekst; geen rekenwerk.

import type { BodyLoadView } from '../../engine/bodyLoad';
import { TextButton } from '../TextButton';
import { ForgeSheet } from './parts';

export function BodyLoadChip({ text, name, onOpen }: { text: string; name: string; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} aria-label={`Eigen gewicht bij ${name}: ${text}`} className="mt-0.5 flex min-h-[44px] items-center" data-testid="forge-body-load">
      <span className="rounded-full border px-2.5 py-0.5 font-sans text-xs tabular-nums" style={{ borderColor: 'var(--color-control-border)', color: 'var(--color-ink-dim)' }}>{text}</span>
    </button>
  );
}

export function BodyLoadSheet({ name, view, onAdjust, onClose }: { name: string; view: BodyLoadView; onAdjust: () => void; onClose: () => void }) {
  return (
    <ForgeSheet title="Eigen gewicht" sub={name} onClose={onClose}>
      {(close) => (
        <div className="space-y-3" data-testid="forge-body-load-sheet">
          <div>
            <p className="font-sans text-xs" style={{ color: 'var(--color-ink-dim)' }}>Jouw gewicht</p>
            <p className="font-display text-2xl tabular-nums" style={{ color: 'var(--color-ink)' }}>{view.weight ?? 'Niet ingevuld'}</p>
            <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{view.weightLabel}</p>
          </div>
          <div>
            <p className="font-sans text-xs" style={{ color: 'var(--color-ink-dim)' }}>Telt mee als weerstand</p>
            <p className="font-sans text-base font-semibold tabular-nums" style={{ color: 'var(--color-ink)' }}>{view.shareLine}</p>
            <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{view.source}</p>
          </div>
          <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{view.explain}</p>
          <TextButton onClick={() => { close(); onAdjust(); }}>Gewicht aanpassen</TextButton>
        </div>
      )}
    </ForgeSheet>
  );
}
