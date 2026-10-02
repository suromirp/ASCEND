// ASCEND — "door ASCEND aangepast" on the Week page: what ASCEND changed in
// the week being viewed, one line per session (engine/changeLog.ts#
// weekChanges). Folded away by default; nothing at all when the week has
// no changes (production feedback: the full change log was too present and
// its many entries told the user nothing).

import { useMemo, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { weekChanges, type WeekChange } from '../engine/changeLog';
import { mondayOfWeek, todayISO } from '../utils/dates';
import { Card } from './ui';

export function ChangeLogCard({ weekStart }: { weekStart: string }) {
  const { planChangeLog, plannedSessions, templates } = useAppData();
  const today = todayISO();
  const changes = useMemo(
    () => weekChanges(planChangeLog, plannedSessions, templates, weekStart, today),
    [planChangeLog, plannedSessions, templates, weekStart, today],
  );
  const [open, setOpen] = useState(false);
  if (changes.length === 0) return null;
  const isCurrent = weekStart === mondayOfWeek(today);

  return (
    <Card>
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 text-left" aria-expanded={open}>
        <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
          {isCurrent ? 'Deze week' : 'In deze week'} door ASCEND aangepast · {changes.length}
        </span>
        <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{open ? 'sluiten' : 'bekijk'}</span>
      </button>
      {open && (
        <div className="mt-3 flex flex-col gap-2">
          {changes.map((c) => <ChangeRow key={c.key} change={c} />)}
          <p className="text-[11px]" style={{ color: 'var(--color-ink-dim)' }}>Tik op een regel voor de reden.</p>
        </div>
      )}
    </Card>
  );
}

function ChangeRow({ change }: { change: WeekChange }) {
  const [open, setOpen] = useState(false);
  return (
    <button onClick={() => setOpen((v) => !v)} className="text-left text-xs">
      <span className="block" style={{ color: 'var(--color-ink)' }}>{change.line}</span>
      {open && <span className="mt-0.5 block leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{change.reason}</span>}
    </button>
  );
}
