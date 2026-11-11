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
import { Icon } from './icons';
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
            <RoutePanel template={template} date={date} onDecline={requestClose} closing={closing} />
          </Card>
        </div>
      </div>
    </Portal>
  );
}

export function RouteProposalLine({ template, date, mode, className = '', row = false }: { template: SessionTemplate; date: string; mode: 'sheet' | 'inline'; className?: string; row?: boolean }) {
  const { settings } = useAppData();
  const [open, setOpen] = useState(false);
  if (settings.routeProposal === false || !wantsRoute(template)) return null;
  if (row) {
    // Een lijstrij zoals Eerst opwarmen en Daarna rekken (op de trainingspagina), met het paneel eronder.
    return (
      <div className={className}>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex min-h-[56px] w-full items-center gap-3 py-2 text-left">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--color-charcoal)', color: 'var(--color-ink-dim)' }}>
            <Icon name="lopen" size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base leading-snug" style={{ color: 'var(--color-ink)' }}>Route voorstellen</span>
            <span className="block text-xs" style={{ color: 'var(--color-ink-dim)' }}>Twee lussen voor deze training</span>
          </span>
          <span className="shrink-0 transition-transform" style={{ color: 'var(--color-ink-dim)', transform: open ? 'rotate(90deg)' : undefined }}>
            <Icon name="verder" size={18} />
          </span>
        </button>
        {open && <div className="pb-3"><RoutePanel template={template} date={date} onDecline={() => setOpen(false)} /></div>}
      </div>
    );
  }
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
