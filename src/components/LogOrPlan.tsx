// ASCEND: de + onderaan Vandaag. Eén knop opent een klein keuzeblad: Training loggen (Losse training,
// AdHocLogSheet.tsx) of Wandeling plannen (WalkPlanSheet.tsx). Staat Route voorstellen uit, dan is er niets
// te kiezen en opent de + meteen Losse training (besluit docs/beslissingen/2026-11-15-wandeling-plannen.md).

import { useRef, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { useSheetClose } from '../utils/useSheetClose';
import { todayISO } from '../utils/dates';
import { Portal } from './Portal';
import { SheetHeader } from './SheetHeader';
import { SheetRow, SheetRows } from './SheetRows';
import { Card, SecondaryButton, SheetGrip } from './ui';
import { Icon } from './icons';
import { AdHocLogFlow } from './AdHocLogSheet';
import { WalkPlanSheet } from './WalkPlanSheet';

type Open = 'choose' | 'log' | 'walk';

function ChooseSheet({ onPick, onClose }: { onPick: (next: 'log' | 'walk') => void; onClose: () => void }) {
  // Een keuze sluit eerst dit blad (ook de laag van de terugknop); daarna opent het volgende.
  const after = useRef<'log' | 'walk' | undefined>(undefined);
  const { closing, requestClose, sheetRef } = useSheetClose(() => {
    const next = after.current;
    if (next) onPick(next);
    else onClose();
  });
  const choose = (next: 'log' | 'walk') => { after.current = next; requestClose(); };
  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div ref={sheetRef} className={`relative w-full max-w-md ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <SheetGrip />
          <Card className="flex flex-col gap-3 rounded-b-none border-b-0 pb-[max(var(--rand-onder),24px)]">
            <SheetHeader eyebrow="Vandaag" title="Loggen of plannen" onClose={requestClose} />
            <SheetRows label="Loggen of plannen">
              <SheetRow title="Training loggen" sub="Iets gedaan dat niet op de planning stond" onClick={() => choose('log')} />
              <SheetRow title="Wandeling plannen" sub="Een route van een paar kilometer, zonder training" onClick={() => choose('walk')} />
            </SheetRows>
            <SecondaryButton onClick={requestClose}>Annuleren</SecondaryButton>
          </Card>
        </div>
      </div>
    </Portal>
  );
}

export function LogOrPlan() {
  const { settings, templates, program } = useAppData();
  const [open, setOpen] = useState<Open | undefined>();
  const walkOn = settings.routeProposal !== false;
  return (
    <>
      <button
        type="button"
        aria-label={walkOn ? 'Loggen of plannen' : 'Losse training'}
        onClick={() => setOpen(walkOn ? 'choose' : 'log')}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border"
        style={{ color: 'var(--color-ink-dim)', borderColor: 'var(--color-card-border)' }}
      >
        <Icon name="plus" size={20} />
      </button>
      {open === 'choose' && <ChooseSheet onPick={setOpen} onClose={() => setOpen(undefined)} />}
      {open === 'log' && <AdHocLogFlow templates={templates} program={program} date={todayISO()} onClose={() => setOpen(undefined)} />}
      {open === 'walk' && <WalkPlanSheet onClose={() => setOpen(undefined)} />}
    </>
  );
}
