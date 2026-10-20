import { useMemo } from 'react';
import { useAppData } from '../state/AppDataContext';
import { previewProposal, type PreviewEntry, type PreviewMove } from '../engine/proposalPreview';
import type { PlanChangeProposal } from '../models/planChange';
import type { SessionType } from '../models/training';
import { todayISO, weekdayShortNL } from '../utils/dates';

// The week as it would look after Akkoord. On top what changes, in one line
// each; below the week day by day, the changed days marked with a bronze
// edge. Nothing is applied by looking at it.

const MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const short = (iso: string) => `${weekdayShortNL(iso).toLowerCase()} ${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
const longMonth = (iso: string) => `${Number(iso.slice(8, 10))} ${['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'][Number(iso.slice(5, 7)) - 1]}`;

const TYPE_COLOR: Record<SessionType, string> = {
  strength: 'var(--color-stone)',
  cardio: 'var(--color-alpine)',
  hiking: 'var(--color-sky)',
  adventure: 'var(--color-sky)',
  recovery: 'var(--color-ink-dim)',
};

const tint = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

export function ProposalPreview({ proposal }: { proposal: PlanChangeProposal }) {
  const { plannedSessions, templates } = useAppData();
  const data = useMemo(() => previewProposal(proposal.changes, plannedSessions, templates), [proposal, plannedSessions, templates]);
  if (data.weeks.length === 0) return null;
  const today = todayISO();

  return (
    <div className="animate-rise-in mt-3 overflow-hidden rounded-xl border" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)' }}>
      <div className="flex flex-col gap-2 px-3.5 pb-3 pt-3.5">
        {data.moves.map((m, i) => <MoveLine key={i} move={m} />)}
      </div>

      {data.weeks.map((w) => (
        <div key={w.weekStart} className="border-t" style={{ borderColor: 'var(--color-card-border)' }}>
          <p className="px-3.5 pb-1.5 pt-3 text-[10px] font-medium tracking-[0.18em]" style={{ color: 'var(--color-bronze)' }}>
            WEEK VAN {longMonth(w.weekStart).toUpperCase()}
          </p>
          <ul className="pb-2">
            {w.days.map((d) => {
              const isToday = d.date === today;
              return (
                <li
                  key={d.date}
                  className="flex items-start gap-3 py-1.5 pl-3 pr-3.5"
                  style={{
                    borderLeft: `2px solid ${d.changed ? 'var(--color-gold)' : 'transparent'}`,
                    background: d.changed ? tint('var(--color-gold)', 7) : undefined,
                  }}
                >
                  <div className="flex w-9 shrink-0 flex-col items-center pt-0.5 leading-none">
                    <span className="text-[9px] font-medium tracking-[0.14em]" style={{ color: d.changed ? 'var(--color-gold)' : 'var(--color-ink-dim)' }}>
                      {weekdayShortNL(d.date).toUpperCase()}
                    </span>
                    <span className="mt-1 font-display text-[15px] tabular-nums" style={{ color: d.changed ? 'var(--color-ink)' : 'var(--color-ink-dim)' }}>
                      {Number(d.date.slice(8, 10))}
                    </span>
                    {isToday && <span className="mt-1 h-1 w-1 rounded-full" style={{ background: 'var(--color-gold)' }} aria-label="vandaag" />}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-wrap gap-1.5 pt-0.5">
                    {d.entries.length === 0 ? (
                      <span className="py-1 text-[11px]" style={{ color: 'var(--color-ink-dim)', opacity: 0.6 }}>vrij</span>
                    ) : (
                      d.entries.map((e, i) => <EntryChip key={i} entry={e} />)
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function MoveLine({ move }: { move: PreviewMove }) {
  if (move.action === 'remove') {
    return (
      <div className="flex items-baseline gap-2.5 text-xs">
        <Glyph kind="remove" />
        <span className="min-w-0 flex-1">
          <span className="font-medium" style={{ color: 'var(--color-ink-dim)', textDecoration: 'line-through' }}>{move.name}</span>
          <span className="mt-0.5 block tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{short(move.from!)} · vervalt</span>
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-baseline gap-2.5 text-xs">
      <Glyph kind={move.action} />
      <span className="min-w-0 flex-1">
        <span className="font-medium" style={{ color: 'var(--color-ink)' }}>{move.name}</span>
        <span className="block mt-0.5 tabular-nums">
          {move.from && <span style={{ color: 'var(--color-ink-dim)' }}>{short(move.from)}</span>}
          {move.from && <span className="mx-1.5" style={{ color: 'var(--color-bronze)' }}>→</span>}
          <span style={{ color: 'var(--color-gold)' }}>{short(move.to!)}</span>
        </span>
      </span>
    </div>
  );
}

function Glyph({ kind }: { kind: 'move' | 'add' | 'remove' }) {
  const color = kind === 'remove' ? 'var(--color-ink-dim)' : 'var(--color-gold)';
  return (
    <span className="flex h-5 w-5 shrink-0 translate-y-1 items-center justify-center rounded-full" style={{ background: tint(color, 14) }} aria-hidden>
      <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {kind === 'move' && <path d="M3 8h9M9 4.5 12.5 8 9 11.5" />}
        {kind === 'add' && <path d="M8 3.5v9M3.5 8h9" />}
        {kind === 'remove' && <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />}
      </svg>
    </span>
  );
}

function EntryChip({ entry }: { entry: PreviewEntry }) {
  const rest = entry.type === 'recovery';
  const struck = entry.change === 'weg' || entry.change === 'vervalt';
  const highlighted = entry.change === 'hierheen' || entry.change === 'nieuw';
  const tag = entry.change === 'hierheen' ? 'HIERHEEN' : entry.change === 'nieuw' ? 'NIEUW' : entry.change === 'vervalt' ? 'VERVALT' : undefined;
  return (
    <span
      className="inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] leading-tight"
      style={{
        borderColor: highlighted ? 'var(--color-gold)' : 'var(--color-card-border)',
        background: highlighted ? tint('var(--color-gold)', 10) : 'transparent',
        color: struck || rest ? 'var(--color-ink-dim)' : 'var(--color-ink)',
        opacity: struck ? 0.7 : 1,
      }}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: struck ? 'var(--color-ink-dim)' : TYPE_COLOR[entry.type] }} aria-hidden />
      <span className="truncate" style={{ textDecoration: struck ? 'line-through' : undefined }}>{rest ? 'Rustdag' : entry.name}</span>
      {entry.change === 'weg' && entry.otherDate && (
        <span className="shrink-0 tabular-nums" style={{ color: 'var(--color-gold)' }}>→ {weekdayShortNL(entry.otherDate).toLowerCase()} {Number(entry.otherDate.slice(8, 10))}</span>
      )}
      {tag && <span className="shrink-0 text-[9px] font-semibold tracking-[0.12em]" style={{ color: highlighted ? 'var(--color-gold)' : 'var(--color-ink-dim)' }}>{tag}</span>}
    </span>
  );
}
