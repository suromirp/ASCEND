// ASCEND: het blad Nieuwe plek, achter de chip Andere plek bij Start bij (besluit
// docs/beslissingen/2026-11-12-andere-plek.md). Eén zoekveld met meteen focus; na een pauze in het typen
// zoekt de bestaande zoekdienst (integrations/placeSearchSession.ts). Een tik op een treffer zet de
// start voor deze zoektocht daar en sluit het blad; er wordt niets bewaard. Sluiten stopt het zoeken.
// Het blad heeft een vaste hoogte met het veld bovenaan: het toetsenbord duwt niets weg.

import { useEffect, useRef, useState } from 'react';
import { useSheetClose } from '../utils/useSheetClose';
import { Portal } from './Portal';
import { SheetHeader } from './SheetHeader';
import { Card, SheetGrip } from './ui';
import { createPlaceSearch, type PlaceSearchSession } from '../integrations/placeSearchSession';
import { PLACE_PRIVACY_LINE, placeSearchLine, placeWhere, type FoundPlace, type PlaceSearchView } from '../engine/placeSearch';

const dim = { color: 'var(--color-ink-dim)' };
const fieldStyle = { background: 'var(--color-charcoal)', borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' };

export function NewPlaceSheet({ onPick, onClose }: { onPick: (found: FoundPlace) => void; onClose: () => void }) {
  const { closing, requestClose, sheetRef } = useSheetClose(onClose);
  const [text, setText] = useState('');
  const [view, setView] = useState<PlaceSearchView>({ kind: 'idle' });
  const session = useRef<PlaceSearchSession | undefined>(undefined);
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const s = createPlaceSearch(setView);
    session.current = s;
    // Meteen typen: het veld krijgt focus zodra het blad er is, zonder te scrollen.
    field.current?.focus({ preventScroll: true });
    return () => s.close();
  }, []);

  // Sluiten tijdens het zoeken: er gaat daarna geen aanroep meer uit, ook niet tijdens de animatie.
  useEffect(() => {
    if (closing) session.current?.close();
  }, [closing]);

  const line = placeSearchLine(view);
  // Alleen treffers van het woord dat nu in het veld staat: tijdens het typen geen lijst van een ander woord.
  const results = view.kind === 'results' && view.query === text.trim() ? view.results : [];

  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div ref={sheetRef} className={`relative flex h-[80dvh] w-full max-w-md flex-col ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <SheetGrip />
          <Card className="flex min-h-0 flex-1 flex-col gap-3 rounded-b-none border-b-0 pb-8">
            <div className="-mt-2"><SheetHeader eyebrow="Start bij" title="Nieuwe plek" onClose={requestClose} /></div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                session.current?.submit();
              }}
            >
              <input
                ref={field}
                type="text"
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                aria-label="Plaatsnaam"
                placeholder="Plaatsnaam"
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  session.current?.type(e.target.value);
                }}
                className="min-h-[44px] w-full rounded-lg border bg-transparent px-2.5 py-2 text-base"
                style={fieldStyle}
              />
            </form>
            <p className="text-xs leading-snug" style={dim}>{PLACE_PRIVACY_LINE}</p>
            <p role="status" className="min-h-[20px] text-sm leading-snug" style={{ color: view.kind === 'busy' ? 'var(--color-ink-dim)' : 'var(--color-ink)' }}>{line}</p>
            {results.length > 0 && (
              <ul data-no-sheet-drag="" className="-mx-1 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-1 pb-2">
                {results.map((r) => (
                  <li key={`${r.name}-${r.lat}-${r.lon}`}>
                    <button
                      type="button"
                      onClick={() => {
                        session.current?.close();
                        onPick(r);
                        requestClose();
                      }}
                      className="flex min-h-[44px] w-full flex-col items-start justify-center rounded-xl border px-3 py-2 text-left transition-all active:scale-[0.98]"
                      style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)' }}
                    >
                      <span className="text-sm" style={{ color: 'var(--color-ink)' }}>{r.name}</span>
                      {placeWhere(r) && <span className="text-xs" style={dim}>{placeWhere(r)}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </Portal>
  );
}
