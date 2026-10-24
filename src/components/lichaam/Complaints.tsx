import { useNavigate } from 'react-router-dom';
import type { InjuryNote, InjurySeverity } from '../../models/injury';
import { SEVERITY_CHOICES } from '../../data/bodyCare';
import { spotForComplaint } from '../../engine/bodyMap';
import { formatDateNL } from '../../utils/dates';
import { Card, SecondaryButton } from '../ui';
import { TextButton } from '../TextButton';

const SEVERITY_COLOR: Record<InjurySeverity, string> = {
  licht: 'var(--color-success-text)',
  matig: 'var(--color-warning)',
  ernstig: 'var(--color-danger-text)',
};

const severityLabel = (s: InjurySeverity): string => SEVERITY_CHOICES.find((c) => c.value === s)?.label ?? s;

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
        <TextButton tone="dim" onClick={() => onDelete(note.id)} aria-label={`${note.bodyPart} verwijderen`}>Verwijderen</TextButton>
      </div>
    </Card>
  );
}

// Een opgeloste klacht in de weggeklapte lijst: één regel met de periode.
export function ResolvedComplaint({ note, onDelete }: { note: InjuryNote; onDelete: (id: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t py-1" style={{ borderColor: 'var(--color-card-border)' }}>
      <div className="min-w-0">
        <p className="text-base" style={{ color: 'var(--color-ink)' }}>{note.bodyPart}</p>
        <p className="text-sm tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>
          {formatDateNL(note.date)}{note.resolvedDate ? ` tot ${formatDateNL(note.resolvedDate)}` : ''}
        </p>
      </div>
      <TextButton tone="dim" onClick={() => onDelete(note.id)} aria-label={`${note.bodyPart} verwijderen`}>Verwijderen</TextButton>
    </div>
  );
}
