// De bladen van "Run in detail": een kilometer of ronde met al zijn getallen, en de uitleg
// achter een InfoButton (wat je ziet, waarom een patroon er staat). Elk blad gaat door
// useSheetClose met sheetRef, dus de terugknop en wegslepen sluiten alleen het blad.

import type { ReactNode } from 'react';
import type { RunKm, RunLap } from '../../models/runDetail';
import { useSheetClose } from '../../utils/useSheetClose';
import { formatPace } from '../../engine/aerobicTrend';
import { clock, distanceLabel, FORM_INFO } from '../../engine/runDetailView';
import { formatNumberNL } from '../../utils/number';
import { Portal } from '../Portal';
import { SheetHeader } from '../SheetHeader';
import { TextButton } from '../TextButton';
import { Card, Eyebrow, SecondaryButton, SheetGrip } from '../ui';

function Sheet({ eyebrow, title, onClose, children }: { eyebrow: string; title?: string; onClose: () => void; children: (close: () => void) => ReactNode }) {
  const { closing, requestClose, sheetRef } = useSheetClose(onClose);
  return (
    <Portal>
      <div className={`fixed inset-0 z-[80] flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div
          ref={sheetRef}
          role="dialog"
          aria-label={title ?? eyebrow}
          className={`relative max-h-[85vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <SheetGrip />
          <Card className="rounded-b-none border-b-0 pb-8">
            <div className="-mt-2"><SheetHeader eyebrow={eyebrow} title={title} onClose={requestClose} /></div>
            {children(requestClose)}
          </Card>
        </div>
      </div>
    </Portal>
  );
}

const dim = { color: 'var(--color-ink-dim)' };
const ink = { color: 'var(--color-ink)' };

function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <div className="flex flex-col">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between gap-3 border-b py-2 text-sm" style={{ borderColor: 'var(--color-card-border)' }}>
          <span style={dim}>{label}</span>
          <span className="font-sans tabular-nums" style={ink}>{value}</span>
        </div>
      ))}
    </div>
  );
}

// "Kilometer 4" or "Ronde 3": the numbers, what happened in between, and through the run.
export function PieceSheet({
  piece,
  kind,
  word,
  between,
  onPrev,
  onNext,
  onClose,
}: {
  piece: RunKm | RunLap;
  kind: 'km' | 'lap';
  word?: string;
  between: string[];
  onPrev?: () => void;
  onNext?: () => void;
  onClose: () => void;
}) {
  const name = kind === 'km' ? `Kilometer ${piece.index}` : `Ronde ${piece.index}`;
  const p = piece as Partial<RunKm> & Partial<RunLap>;
  const main: [string, string][] = [
    ['Tijd', clock(piece.sec)],
    ['Afstand', distanceLabel(piece.distanceM)],
  ];
  if (p.paceSecKm !== undefined) main.push(['Tempo', `${formatPace(p.paceSecKm)} /km`]);
  if (p.gapSecKm !== undefined) main.push(['Tempo gecorrigeerd voor de helling', `${formatPace(p.gapSecKm)} /km`]);
  if (p.hrAvg !== undefined) main.push(['Hartslag gemiddeld', `${Math.round(p.hrAvg)} bpm`]);
  if (p.hrMax !== undefined) main.push(['Hartslag hoogst', `${p.hrMax} bpm`]);
  if (p.hrDropFirstMinute !== undefined) main.push(['Hartslag omlaag in de eerste minuut', `${p.hrDropFirstMinute} slagen`]);
  if (p.gainM !== undefined) main.push(['Stijging', `${Math.round(p.gainM)} m`]);
  if (p.lossM !== undefined) main.push(['Daling', `${Math.round(p.lossM)} m`]);
  if (p.pauseSec !== undefined) main.push(['Stilgestaan', clock(p.pauseSec)]);
  if (p.headwindKmh !== undefined) main.push([p.headwindKmh >= 0 ? 'Tegenwind' : 'Wind mee', `${Math.round(Math.abs(p.headwindKmh))} km/u`]);
  if (p.powerW !== undefined) main.push(['Vermogen', `${p.powerW} W`]);
  const form: [string, string][] = [];
  if (p.cadence !== undefined) form.push(['Cadans', `${Math.round(p.cadence)} stappen/min`]);
  if (p.stanceTimeMs !== undefined) form.push(['Grondcontact', `${Math.round(p.stanceTimeMs)} ms`]);
  if (p.stepLengthM !== undefined) form.push(['Staplengte', `${Math.round(p.stepLengthM * 100)} cm`]);
  if (p.oscillationMm !== undefined) form.push(['Op en neer', `${Math.round(p.oscillationMm)} mm`]);
  if (p.verticalRatioPct !== undefined) form.push(['Verticale ratio', `${formatNumberNL(p.verticalRatioPct, 1)} %`]);
  if (p.stanceBalanceLeftPct !== undefined) form.push(['Balans links', `${formatNumberNL(p.stanceBalanceLeftPct, 1)} %`]);

  return (
    <Sheet eyebrow={name} title={word ?? (p.label || undefined)} onClose={onClose}>
      {(close) => (
        <div className="mt-3 flex flex-col gap-4">
          <Rows rows={main} />
          {form.length > 0 && (
            <div>
              <Eyebrow>Loopvorm</Eyebrow>
              <div className="mt-1"><Rows rows={form} /></div>
              <p className="mt-2 text-xs leading-snug" style={dim}>{FORM_INFO[p.stanceTimeMs !== undefined ? 'stanceTimeMs' : p.stepLengthM !== undefined ? 'stepLengthM' : 'cadence'].meaning}</p>
            </div>
          )}
          {between.length > 0 && (
            <div>
              <Eyebrow>Wat daartussen gebeurde</Eyebrow>
              <ul className="mt-1 flex flex-col gap-1.5">
                {between.map((b) => <li key={b} className="text-sm leading-snug" style={ink}>{b}</li>)}
              </ul>
            </div>
          )}
          <div className="flex justify-between">
            {onPrev ? <TextButton onClick={onPrev}>{kind === 'km' ? 'Vorige kilometer' : 'Vorige ronde'}</TextButton> : <span />}
            {onNext ? <TextButton onClick={onNext}>{kind === 'km' ? 'Volgende kilometer' : 'Volgende ronde'}</TextButton> : <span />}
          </div>
          <SecondaryButton onClick={close}>Begrepen</SecondaryButton>
        </div>
      )}
    </Sheet>
  );
}

// The sheet behind an InfoButton: a few heads with one sentence each.
export function ExplainSheet({ eyebrow, title, points, onClose }: { eyebrow: string; title: string; points: { head: string; text: string }[]; onClose: () => void }) {
  return (
    <Sheet eyebrow={eyebrow} title={title} onClose={onClose}>
      {(close) => (
        <div className="mt-3 flex flex-col gap-3">
          {points.map((p) => (
            <div key={p.head}>
              <p className="text-sm font-semibold" style={ink}>{p.head}</p>
              <p className="mt-0.5 text-sm leading-snug" style={dim}>{p.text}</p>
            </div>
          ))}
          <SecondaryButton onClick={close}>Begrepen</SecondaryButton>
        </div>
      )}
    </Sheet>
  );
}
