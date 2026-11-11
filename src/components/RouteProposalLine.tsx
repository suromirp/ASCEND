// ASCEND: de ingang "Route voorstellen" bij een training buiten te voet: op Vandaag, in het blad achter
// de i en op het trainingsscherm. Eén tik opent het blad Route met de kaart bovenaan; nergens klapt iets
// open (spoor 2 van de Briefing, docs/beslissingen/2026-11-11-briefing.md). De lange uitleg staat achter
// de i van het blad. Staat uit met de schakelaar Route voorstellen in het blad Weer en kleding.

import { useState } from 'react';
import type { SessionTemplate } from '../models/training';
import { useAppData } from '../state/AppDataContext';
import { plannedOn, placeHasRoute, routeShownFor } from '../engine/trainingPlace';
import { useTrainingPlaces } from './useTrainingPlaces';
import { useSheetClose } from '../utils/useSheetClose';
import { Portal } from './Portal';
import { SheetHeader } from './SheetHeader';
import { Card, InfoButton, SheetGrip } from './ui';
import { TextButton } from './TextButton';
import { Icon } from './icons';
import { RoutePanel } from './RoutePanel';
import { WATCH_STEPS, WATCH_STEPS_TITLE } from '../engine/routeSend';
import { MAP_HINT, PICK_HINT } from '../engine/routeSheet';

// Achter de i van het blad Route: hoe de kaart werkt en hoe een lus op je horloge komt. Stond eerder
// onder de kaart en in een uitklap; niets is weg.
function RouteInfoSheet({ onClose }: { onClose: () => void }) {
  const { closing, requestClose, sheetRef } = useSheetClose(onClose);
  const dim = { color: 'var(--color-ink-dim)' };
  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div ref={sheetRef} className={`relative max-h-[90vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <SheetGrip />
          <Card className="flex flex-col gap-3 rounded-b-none border-b-0 pb-[max(var(--rand-onder),32px)]">
            <div className="-mt-2"><SheetHeader eyebrow="Route voorstellen" title="Zo werkt de kaart" onClose={requestClose} /></div>
            <p className="text-sm leading-relaxed" style={dim}>{PICK_HINT}</p>
            <p className="text-sm leading-relaxed" style={dim}>{MAP_HINT}</p>
            <p className="text-sm font-medium leading-snug" style={{ color: 'var(--color-ink)' }}>{WATCH_STEPS_TITLE}</p>
            <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm leading-snug" style={dim}>
              {WATCH_STEPS.map((step) => <li key={step}>{step}</li>)}
            </ol>
          </Card>
        </div>
      </div>
    </Portal>
  );
}

function RouteSheet({ template, date, onClose }: { template: SessionTemplate; date: string; onClose: () => void }) {
  const { closing, requestClose, sheetRef } = useSheetClose(onClose);
  const [info, setInfo] = useState(false);
  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        {/* Een vaste hoogte: het blad springt niet omhoog als de lussen er na het zoeken zijn. */}
        <div ref={sheetRef} className={`relative h-[90vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <SheetGrip />
          {/* Onderaan de rand van het toestel (--rand-onder): niets valt achter de onderbalk. */}
          <Card className="flex min-h-full flex-col gap-3 rounded-b-none border-b-0 pb-[max(var(--rand-onder),32px)]">
            <div className="-mt-2"><SheetHeader eyebrow={template.name} title="Route voorstellen" info={<InfoButton label="Zo werkt de kaart" onClick={() => setInfo(true)} />} onClose={requestClose} /></div>
            <RoutePanel template={template} date={date} onDecline={requestClose} closing={closing} />
          </Card>
        </div>
      </div>
      {info && <RouteInfoSheet onClose={() => setInfo(false)} />}
    </Portal>
  );
}

// Alleen buiten en te voet: de bewaarde keuze Waar train je? van de geplande training op die dag telt
// (engine/trainingPlace.ts#routeShownFor), zodat Vandaag, het blad achter de i en het trainingsscherm
// hetzelfde zeggen. Het trainingsscherm geeft zijn eigen keuze mee als `place` (null: geen keuze, alleen
// de training). Zolang de keuzes nog niet gelezen zijn staat er niets: nooit eerst een route bij Loopband.
export function RouteProposalLine({ template, date, className = '', row = false, place }: { template: SessionTemplate; date: string; className?: string; row?: boolean; place?: string | null }) {
  const { settings, plannedSessions } = useAppData();
  const places = useTrainingPlaces();
  const [open, setOpen] = useState(false);
  if (settings.routeProposal === false) return null;
  if (place !== undefined) {
    if (!placeHasRoute(template, place ?? undefined)) return null;
  } else {
    if (!places) return null;
    const planned = plannedOn(plannedSessions, template.id, date);
    if (!routeShownFor(template, planned ? places[planned.id] : undefined)) return null;
  }
  const sheet = open && <RouteSheet template={template} date={date} onClose={() => setOpen(false)} />;
  if (row) {
    // Een lijstrij zoals Eerst opwarmen en Daarna rekken (op het trainingsscherm); opent het blad.
    return (
      <div className={className}>
        <button type="button" data-sheet-from onClick={() => setOpen(true)} className="flex min-h-[56px] w-full items-center gap-3 py-2 text-left">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--color-charcoal)', color: 'var(--color-ink-dim)' }}>
            <Icon name="lopen" size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base leading-snug" style={{ color: 'var(--color-ink)' }}>Route voorstellen</span>
            <span className="block text-xs" style={{ color: 'var(--color-ink-dim)' }}>Twee lussen op de kaart</span>
          </span>
          <span className="shrink-0" style={{ color: 'var(--color-ink-dim)' }}>
            <Icon name="verder" size={18} />
          </span>
        </button>
        {sheet}
      </div>
    );
  }
  return (
    <div className={className}>
      <TextButton tone="dim" icon="verder" data-sheet-from onClick={() => setOpen(true)}>
        Route voorstellen
      </TextButton>
      {sheet}
    </div>
  );
}
