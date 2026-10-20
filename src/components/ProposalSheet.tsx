import { useMemo, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { previewProposal, type PreviewEntry, type PreviewMove } from '../engine/proposalPreview';
import { resolveVariantDuration } from '../engine/substitutions';
import type { Advice } from '../engine/adviceEngine';
import type { SessionType } from '../models/training';
import { formatDateNL, todayISO, weekdayShortNL } from '../utils/dates';
import { useSheetClose } from '../utils/useSheetClose';
import { Portal } from './Portal';
import { Card, Eyebrow, PrimaryButton, SecondaryButton } from './ui';

// "Zo ziet je week eruit": a sheet from below, like a training in Week. On
// top what changes, one line each; below the week in the same style as the
// Week screen, the changed days marked; at the bottom Akkoord and Liever
// niet, so you see the proposal and decide in one place. Nothing is applied
// by looking at it.

const MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const short = (iso: string) => `${weekdayShortNL(iso).toLowerCase()} ${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;

const TYPE_COLOR: Record<SessionType, string> = {
  strength: 'var(--color-stone)',
  cardio: 'var(--color-alpine)',
  hiking: 'var(--color-sky)',
  adventure: 'var(--color-sky)',
  recovery: 'var(--color-ink-dim)',
};

const tint = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

export function ProposalSheet({ advice, onClose }: { advice: Advice; onClose: () => void }) {
  const { plannedSessions, templates, program, respondToAdvice } = useAppData();
  const { closing, requestClose } = useSheetClose(onClose);
  const [busy, setBusy] = useState(false);
  const data = useMemo(() => (advice.proposal ? previewProposal(advice.proposal.changes, plannedSessions, templates) : { moves: [], weeks: [] }), [advice, plannedSessions, templates]);
  const byId = useMemo(() => new Map(templates.map((t) => [t.id, t])), [templates]);
  const today = todayISO();

  const minutes = (e: PreviewEntry, date: string) => {
    if (e.type === 'recovery') return undefined;
    if (e.plannedMinutes) return e.plannedMinutes;
    const t = byId.get(e.templateId);
    return t ? resolveVariantDuration(t, 'full', date, program) : undefined;
  };

  async function respond(response: 'accepted' | 'declined') {
    setBusy(true);
    await respondToAdvice(advice, response);
    setBusy(false);
    requestClose();
  }

  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div className={`flex max-h-[88vh] w-full max-w-md flex-col ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <Card className="flex min-h-0 flex-col rounded-b-none border-b-0 p-0!">
            <div className="flex justify-center pt-2.5" aria-hidden>
              <span className="h-1 w-10 rounded-full" style={{ background: 'var(--color-card-border)' }} />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-3">
              <Eyebrow>VOORSTEL</Eyebrow>
              <h3 className="mt-1 font-display text-xl leading-snug" style={{ color: 'var(--color-ink)' }}>{advice.title}</h3>

              {data.moves.length > 0 && (
                <div className="mt-4 flex flex-col gap-2.5 rounded-xl border p-3.5" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)' }}>
                  {data.moves.map((m, i) => <MoveLine key={i} move={m} />)}
                </div>
              )}

              {data.weeks.map((w) => (
                <section key={w.weekStart} className="mt-6">
                  <p className="mb-3 text-[10px] font-medium tracking-[0.18em]" style={{ color: 'var(--color-bronze)' }}>
                    WEEK VAN {formatDateNL(w.weekStart).toUpperCase()}
                  </p>
                  <div className="flex flex-col gap-4">
                    {w.days.map((d) => {
                      const isToday = d.date === today;
                      return (
                        <div key={d.date}>
                          <div className="mb-2 flex items-baseline gap-2">
                            <span className="text-xs font-semibold tracking-wide" style={{ color: d.changed || isToday ? 'var(--color-gold)' : 'var(--color-ink-dim)' }}>{weekdayShortNL(d.date)}</span>
                            <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{formatDateNL(d.date)}</span>
                            {isToday && <span className="text-[11px]" style={{ color: 'var(--color-gold)' }}>vandaag</span>}
                          </div>
                          {d.entries.length === 0 ? (
                            <p className="pl-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>Geen training gepland</p>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {d.entries.map((e, i) => <EntryCard key={i} entry={e} minutes={minutes(e, d.date)} />)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            <div className="flex gap-3 border-t px-5 pt-3" style={{ borderColor: 'var(--color-card-border)', paddingBottom: 'max(env(safe-area-inset-bottom), 14px)' }}>
              <SecondaryButton onClick={() => void respond('declined')} disabled={busy} className="min-h-[46px]">LIEVER NIET</SecondaryButton>
              <PrimaryButton onClick={() => void respond('accepted')} disabled={busy} fullWidth={false}>AKKOORD</PrimaryButton>
            </div>
          </Card>
        </div>
      </div>
    </Portal>
  );
}

function MoveLine({ move }: { move: PreviewMove }) {
  const removed = move.action === 'remove';
  return (
    <div className="flex items-start gap-3 text-sm">
      <Glyph kind={move.action} />
      <span className="min-w-0 flex-1 leading-snug">
        <span className="font-medium" style={{ color: removed ? 'var(--color-ink-dim)' : 'var(--color-ink)', textDecoration: removed ? 'line-through' : undefined }}>{move.name}</span>
        <span className="mt-0.5 block text-xs tabular-nums">
          {removed ? (
            <span style={{ color: 'var(--color-ink-dim)' }}>{short(move.from!)} · vervalt</span>
          ) : (
            <>
              {move.from && <span style={{ color: 'var(--color-ink-dim)' }}>{short(move.from)}</span>}
              {move.from && <span className="mx-1.5" style={{ color: 'var(--color-bronze)' }}>→</span>}
              <span style={{ color: 'var(--color-gold)' }}>{short(move.to!)}</span>
              {!move.from && <span style={{ color: 'var(--color-ink-dim)' }}> · nieuw</span>}
            </>
          )}
        </span>
      </span>
    </div>
  );
}

function Glyph({ kind }: { kind: 'move' | 'add' | 'remove' }) {
  const color = kind === 'remove' ? 'var(--color-ink-dim)' : 'var(--color-gold)';
  return (
    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: tint(color, 14) }} aria-hidden>
      <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {kind === 'move' && <path d="M3 8h9M9 4.5 12.5 8 9 11.5" />}
        {kind === 'add' && <path d="M8 3.5v9M3.5 8h9" />}
        {kind === 'remove' && <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />}
      </svg>
    </span>
  );
}

// A training as a card, like in Week: a coloured dot for the kind of
// training, the name, the minutes; what changes gets its own state.
function EntryCard({ entry, minutes }: { entry: PreviewEntry; minutes?: number }) {
  const rest = entry.type === 'recovery';
  const struck = entry.change === 'weg' || entry.change === 'vervalt';
  const highlighted = entry.change === 'hierheen' || entry.change === 'nieuw';
  const note = entry.change === 'hierheen' && entry.otherDate ? `van ${short(entry.otherDate)}`
    : entry.change === 'weg' && entry.otherDate ? `naar ${short(entry.otherDate)}`
    : entry.change === 'vervalt' ? 'vervalt'
    : entry.change === 'nieuw' ? 'nieuw'
    : rest ? 'Wandelen mag, niets af te vinken' : undefined;
  return (
    <div
      className="flex items-center gap-3 rounded-2xl border px-4 py-3"
      style={{
        borderColor: highlighted ? 'var(--color-gold)' : 'var(--color-card-border)',
        background: highlighted ? tint('var(--color-gold)', 9) : struck ? 'transparent' : 'var(--color-card)',
        opacity: struck ? 0.6 : 1,
      }}
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: struck ? 'var(--color-ink-dim)' : TYPE_COLOR[entry.type] }} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" style={{ color: struck ? 'var(--color-ink-dim)' : 'var(--color-ink)', textDecoration: struck ? 'line-through' : undefined }}>
          {rest ? 'Rustdag' : entry.name}
        </p>
        {note && <p className="mt-0.5 truncate text-xs" style={{ color: highlighted ? 'var(--color-gold)' : 'var(--color-ink-dim)' }}>{note}</p>}
      </div>
      {highlighted && <span className="shrink-0 text-[10px] font-semibold tracking-[0.12em]" style={{ color: 'var(--color-gold)' }}>{entry.change === 'nieuw' ? 'NIEUW' : 'HIERHEEN'}</span>}
      {!highlighted && minutes !== undefined && !struck && <span className="shrink-0 text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{minutes} min</span>}
    </div>
  );
}
