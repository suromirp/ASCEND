// ASCEND — "WIJZIGINGEN" on the Week page (Fase 3): what ASCEND changed on
// the calendar in the last two weeks, newest first; each entry opens to
// show why. Read-only view of the PlanChangeProposal audit trail
// (engine/changeLog.ts).

import { useMemo, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { buildChangeLog, type ChangeLogEntry } from '../engine/changeLog';
import { addDays, todayISO, formatDateNL, weekdayShortNL } from '../utils/dates';
import { Card, Eyebrow } from './ui';

export function ChangeLogCard() {
  const { planChangeLog, plannedSessions, templates } = useAppData();
  const entries = useMemo(
    () => buildChangeLog(planChangeLog, plannedSessions, templates, addDays(todayISO(), -14)),
    [planChangeLog, plannedSessions, templates],
  );
  const [showAll, setShowAll] = useState(false);
  if (entries.length === 0) return null;
  const shown = showAll ? entries : entries.slice(0, 4);

  return (
    <Card className="flex flex-col gap-3">
      <Eyebrow>WIJZIGINGEN</Eyebrow>
      <p className="-mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
        Wat ASCEND de afgelopen twee weken aan je planning heeft veranderd, en waarom. Oudere wijzigingen verdwijnen vanzelf uit dit overzicht.
      </p>
      <div className="flex flex-col gap-3">
        {shown.map((e) => <Entry key={e.id} entry={e} />)}
      </div>
      {entries.length > shown.length && (
        <button onClick={() => setShowAll(true)} className="self-start text-xs underline" style={{ color: 'var(--color-ink-dim)' }}>
          alle {entries.length} tonen
        </button>
      )}
    </Card>
  );
}

function Entry({ entry }: { entry: ChangeLogEntry }) {
  const [open, setOpen] = useState(false);
  const day = entry.at.slice(0, 10);
  return (
    <div>
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-baseline justify-between gap-3 text-left">
        <span className="min-w-0">
          <span className="block text-sm" style={{ color: entry.undone ? 'var(--color-ink-dim)' : 'var(--color-ink)' }}>
            {entry.issue}{entry.undone ? ' · ongedaan' : ''}
          </span>
          <span className="block text-[11px]" style={{ color: 'var(--color-ink-dim)' }}>
            {entry.label} · {weekdayShortNL(day).toLowerCase()} {formatDateNL(day)}{entry.lines.length > 0 ? ` · ${entry.lines.length} ${entry.lines.length === 1 ? 'wijziging' : 'wijzigingen'}` : ''}
          </span>
        </span>
        <span className="shrink-0 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{open ? '−' : 'waarom'}</span>
      </button>
      {open && (
        <div className="mt-1.5 flex flex-col gap-1 text-xs">
          {entry.lines.map((l, i) => <p key={i} style={{ color: 'var(--color-ink)' }}>{l}</p>)}
          {entry.reasons.map((r, i) => <p key={`r${i}`} className="leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{r}</p>)}
          {entry.reasons.length === 0 && entry.explanation && <p className="leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{entry.explanation}</p>}
        </div>
      )}
    </div>
  );
}
