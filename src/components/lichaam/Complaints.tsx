import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { InjuryNote, InjurySeverity } from '../../models/injury';
import { SEVERITY_CHOICES } from '../../data/bodyCare';
import { closedOn, spotForComplaint } from '../../engine/bodyMap';
import { formatDateNL } from '../../utils/dates';
import { useSheetClose } from '../../utils/useSheetClose';
import { Card, PrimaryButton, SecondaryButton, SheetGrip } from '../ui';
import { TextButton } from '../TextButton';
import { Portal } from '../Portal';
import { SheetHeader } from '../SheetHeader';

const SEVERITY_COLOR: Record<InjurySeverity, string> = {
  licht: 'var(--color-success-text)',
  matig: 'var(--color-warning)',
  ernstig: 'var(--color-danger-text)',
};

const severityLabel = (s: InjurySeverity): string => SEVERITY_CHOICES.find((c) => c.value === s)?.label ?? s;

// Verwijderen kan niet terug: eerst vragen, in een klein blad. De klacht blijft bestaan tot
// je "Verwijderen" kiest; Annuleren, de achtergrond en de terugknop laten alles zoals het was.
function DeleteComplaintSheet({ note, onConfirm, onClose }: { note: InjuryNote; onConfirm: (id: string) => void; onClose: () => void }) {
  const { closing, requestClose, sheetRef } = useSheetClose(onClose);
  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div ref={sheetRef} className={`relative w-full max-w-md ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Klacht verwijderen">
          <SheetGrip />
          <Card className="flex flex-col gap-3 rounded-b-none border-b-0 pb-6">
            <SheetHeader eyebrow="Klacht" title="Verwijderen?" onClose={requestClose} />
            <p className="text-base leading-snug" style={{ color: 'var(--color-ink)' }}>
              {note.bodyPart} van <span className="tabular-nums">{formatDateNL(note.date)}</span> verdwijnt uit je lijst. Dat kun je niet terugzetten.
            </p>
            <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Is het over? Kies dan liever Opgelost, dan blijft het bewaard.</p>
            <PrimaryButton onClick={() => onConfirm(note.id)}>Verwijderen</PrimaryButton>
            <SecondaryButton onClick={requestClose}>Annuleren</SecondaryButton>
          </Card>
        </div>
      </div>
    </Portal>
  );
}

// Een open klacht: waar, sinds wanneer en hoe erg, met "Opgelost" en "Verwijderen".
// Is er een plek op het figuur bij, dan opent een tik op de titel het detail van die plek
// (tenzij we er al zijn: `linked` uit).
export function OpenComplaint({
  note,
  linked = true,
  onResolve,
  onDelete,
}: {
  note: InjuryNote;
  linked?: boolean;
  onResolve: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const spot = linked ? spotForComplaint(note) : undefined;
  const head = (
    <>
      <span className="block text-base font-medium" style={{ color: 'var(--color-ink)' }}>{note.bodyPart}</span>
      <span className="block text-sm" style={{ color: 'var(--color-ink-dim)' }}>
        <span className="tabular-nums">{formatDateNL(note.date)}</span> · <span style={{ color: SEVERITY_COLOR[note.severity] }}>{severityLabel(note.severity)}</span>
      </span>
    </>
  );
  return (
    <Card className="flex flex-col gap-2">
      {spot ? (
        <button type="button" onClick={() => navigate(`/lichaam/${spot.id}`)} className="min-h-[44px] text-left" aria-label={`${note.bodyPart}, bekijk de plek`}>
          {head}
        </button>
      ) : (
        <div className="min-h-[44px]">{head}</div>
      )}
      {note.note && <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{note.note}</p>}
      <div className="flex items-center gap-3">
        <SecondaryButton onClick={() => onResolve(note.id)}>Opgelost</SecondaryButton>
        <TextButton tone="dim" onClick={() => setConfirming(true)} aria-label={`${note.bodyPart} verwijderen`}>Verwijderen</TextButton>
      </div>
      {confirming && <DeleteComplaintSheet note={note} onConfirm={onDelete} onClose={() => setConfirming(false)} />}
    </Card>
  );
}

// Een opgeloste klacht in de weggeklapte lijst: één regel met de periode.
export function ResolvedComplaint({ note, onDelete }: { note: InjuryNote; onDelete: (id: string) => void }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 border-t py-1" style={{ borderColor: 'var(--color-card-border)' }}>
      <div className="min-w-0">
        <p className="text-base" style={{ color: 'var(--color-ink)' }}>{note.bodyPart}</p>
        <p className="text-sm tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>
          {formatDateNL(note.date)}{closedOn(note) ? ` tot ${formatDateNL(closedOn(note)!)}` : ''}
        </p>
      </div>
      <TextButton tone="dim" onClick={() => setConfirming(true)} aria-label={`${note.bodyPart} verwijderen`}>Verwijderen</TextButton>
      {confirming && <DeleteComplaintSheet note={note} onConfirm={onDelete} onClose={() => setConfirming(false)} />}
    </div>
  );
}
