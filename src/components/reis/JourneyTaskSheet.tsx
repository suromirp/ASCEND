import { useNavigate } from 'react-router-dom';
import type { TimelineTask } from '../../engine/journey';
import { useSheetClose } from '../../utils/useSheetClose';
import { Portal } from '../Portal';
import { Card, Eyebrow, PrimaryButton, SecondaryButton } from '../ui';
import { shortDateNL } from './format';
import { Icon } from '../icons';
import { TextButton } from '../TextButton';

function windowLine(row: TimelineTask): string {
  if (row.status === 'done' && row.doneOn) return `Gedaan op ${shortDateNL(row.doneOn)}`;
  if (row.status === 'later') return `Komt aan de beurt vanaf ${shortDateNL(row.opensOn)}`;
  if (row.status === 'lapsed') return `Nog open. Het mooiste moment was tot en met ${shortDateNL(row.closesOn)}`;
  return `Past nu: tot en met ${shortDateNL(row.closesOn)}`;
}

// One task of the reisplanner: why, a link, and the tick box.
export function JourneyTaskSheet({ row, onTick, onUntick, onClose }: { row: TimelineTask; onTick: () => void; onUntick: () => void; onClose: () => void }) {
  const { closing, requestClose } = useSheetClose(onClose);
  const navigate = useNavigate();
  const { task } = row;
  const done = row.status === 'done';

  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div role="dialog" aria-label={task.title} className={`max-h-[85vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <Card className="flex flex-col gap-3 rounded-b-none border-b-0 pb-8">
            <Eyebrow>{row.isThisWeek ? 'DEZE WEEK' : 'TAAK'}</Eyebrow>
            <h3 className="font-display text-xl leading-snug" style={{ color: 'var(--color-ink)' }}>{task.title}</h3>
            <p className="text-xs font-medium" style={{ color: 'var(--color-action)' }}>{windowLine(row)}</p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{task.why}</p>
            {task.link && (task.link.url ? (
              <a href={task.link.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center self-start text-sm underline underline-offset-2" style={{ color: 'var(--color-action)' }}>
                {task.link.label}<Icon name="buiten" size={14} className="ml-1 inline align-[-2px]" />
              </a>
            ) : task.link.to ? (
              <TextButton onClick={() => navigate(task.link!.to!)} className="self-start" icon="verder">
                {task.link.label}
              </TextButton>
            ) : null)}
            <div className="mt-2 flex gap-3">
              <SecondaryButton onClick={requestClose}>Sluiten</SecondaryButton>
              {done ? (
                <SecondaryButton onClick={() => { onUntick(); requestClose(); }}>Haal vinkje weg</SecondaryButton>
              ) : (
                <PrimaryButton onClick={() => { onTick(); requestClose(); }} fullWidth={false}>Gedaan</PrimaryButton>
              )}
            </div>
          </Card>
        </div>
      </div>
    </Portal>
  );
}
