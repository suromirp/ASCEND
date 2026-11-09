// ASCEND: de knop "Route voorstellen" bij een looptraining. Op Vandaag opent hij een blad; in de
// uitleg van een training (al een blad) klapt het paneel op zijn plek open, zodat er nooit twee
// lagen tegelijk zijn. Staat uit met de schakelaar Route voorstellen in het blad Weer en kleding.

import { useState } from 'react';
import type { SessionTemplate } from '../models/training';
import { useAppData } from '../state/AppDataContext';
import { wantsRoute } from '../engine/routeTarget';
import { useSheetClose } from '../utils/useSheetClose';
import { Portal } from './Portal';
import { SheetHeader } from './SheetHeader';
import { Card, SheetGrip } from './ui';
import { TextButton } from './TextButton';
import { RoutePanel } from './RoutePanel';

function RouteSheet({ template, date, onClose }: { template: SessionTemplate; date: string; onClose: () => void }) {
  const { closing, requestClose, sheetRef } = useSheetClose(onClose);
  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div ref={sheetRef} className={`relative max-h-[90vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <SheetGrip />
          <Card className="flex flex-col gap-4 rounded-b-none border-b-0 pb-8">
            <div className="-mt-2"><SheetHeader eyebrow={template.name} title="Route voorstellen" onClose={requestClose} /></div>
            <RoutePanel template={template} date={date} onDecline={requestClose} />
          </Card>
        </div>
      </div>
    </Portal>
  );
}

export function RouteProposalLine({ template, date, mode, className = '' }: { template: SessionTemplate; date: string; mode: 'sheet' | 'inline'; className?: string }) {
  const { settings } = useAppData();
  const [open, setOpen] = useState(false);
  if (settings.routeProposal === false || !wantsRoute(template)) return null;
  return (
    <div className={className}>
      <TextButton tone="dim" icon={mode === 'inline' ? 'omlaag' : 'verder'} flipped={mode === 'inline' && open} aria-expanded={mode === 'inline' ? open : undefined} onClick={() => setOpen((v) => !v)}>
        Route voorstellen
      </TextButton>
      {open && mode === 'inline' && <RoutePanel template={template} date={date} onDecline={() => setOpen(false)} />}
      {open && mode === 'sheet' && <RouteSheet template={template} date={date} onClose={() => setOpen(false)} />}
    </div>
  );
}
