import { useState } from 'react';
import { Icon } from '../icons';
import { TrainingSplitSheet } from '../TrainingSplitSheet';
import { Card, Eyebrow } from '../ui';

// De rij die de trainingsverdeling opent: hoe kracht, hardlopen en bergwerk zich in je week
// verhouden. Dit hoort bij je stand en niet bij een doel; het stond eerst op Ascend
// (docs/beslissingen/2026-10-26-ascend-tab-als-doelen.md, deel 7).
export function TrainingSplitRow() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Card className="flex flex-col">
        <button onClick={() => setOpen(true)} className="flex min-h-[56px] items-center justify-between gap-3 py-1 text-left">
          <span className="min-w-0">
            <Eyebrow>Trainingsverdeling</Eyebrow>
            <span className="mt-1 block text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Hoe kracht, hardlopen en bergwerk zich in je week verhouden.</span>
          </span>
          <span className="shrink-0" style={{ color: 'var(--color-ink-dim)' }}><Icon name="verder" size={18} /></span>
        </button>
      </Card>
      {open && <TrainingSplitSheet onClose={() => setOpen(false)} />}
    </>
  );
}
