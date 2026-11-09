// De regels boven de oefeningen in het workoutscherm van Forge: het voorstel Spieren voor de berg, het voorstel
// voor een stap op een calisthenicsladder (StepProposalNotice.tsx), de regel
// "Ingekort tot", wat alleen kijken inhoudt en het paneel of de regel voor vermoeide benen.

import type { ReactNode } from 'react';
import { previewDayLine } from '../../engine/sessionActions';
import type { Program } from '../../models/program';
import { addDays, mondayOfWeek } from '../../utils/dates';
import { MountainMuscleNotice } from '../MountainMuscleNotice';
import { StepProposalNotice } from './StepProposalNotice';

export function ForgeIntro({ templateId, today, date, program, preview, readOnly, mountainNotice, stepNotice, capLine, legLine, legPanel }: {
  templateId: string;
  today: string;
  date: string;
  program?: Program | null;
  preview: boolean;
  readOnly: boolean;
  mountainNotice: boolean;
  stepNotice: boolean;
  capLine: string | undefined;
  legLine: string | undefined;
  legPanel: ReactNode;
}) {
  if (!(legLine || readOnly || capLine || mountainNotice || stepNotice)) return null;
  return (
    <div className="flex flex-col gap-1 px-4 pt-3">
      {mountainNotice && <MountainMuscleNotice weekStart={addDays(mondayOfWeek(today), -7)} onlyFor={templateId} className="mb-2" />}
      {stepNotice && <StepProposalNotice templateId={templateId} date={date} />}
      {capLine && <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }} data-testid="forge-ingekort">{capLine}</p>}
      {preview && <p className="text-xs tabular-nums leading-snug" style={{ color: 'var(--color-ink)' }}>{previewDayLine(date, program)}</p>}
      {preview ? (
        <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Zo staat hij klaar. Afvinken kan op de dag zelf.</p>
      ) : readOnly && <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Je houdt kracht bij in MacroFactor. Dit is het voorschrift om mee te kijken; afvinken doe je hier als je klaar bent.</p>}
      {legPanel ?? (legLine && <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{legLine}</p>)}
    </div>
  );
}
