import { useMemo, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { previewProposal, type PreviewEntry, type PreviewMove } from '../engine/proposalPreview';
import { resolveVariantDuration } from '../engine/substitutions';
import type { Advice } from '../engine/adviceEngine';
import type { PlannedSession, SessionType } from '../models/training';
import type { LeavePeriod } from '../models/leave';
import { LeaveBand } from './LeaveBand';
import { formatDateNL, todayISO, weekdayShortNL } from '../utils/dates';
import { useSheetClose } from '../utils/useSheetClose';
import { Portal } from './Portal';
import { Card, Eyebrow, PrimaryButton, SecondaryButton } from './ui';
import { applyPlanChangeItems } from '../engine/proposalEngine';
import { isLegHeavyTemplate } from '../engine/scheduler';
import { fatigueStatus, legFatigueOn } from '../engine/legFatigue';
import { useLegFatigueInputs } from './LegFatigueCard';
import { formatNumberNL } from '../utils/number';
import { Icon } from './icons';

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

// Unique ids for sessions a proposal would add, so two never look like one.
const previewIds = () => { let n = 0; return () => `preview-${n++}`; };

export interface ProposalSheetProps {
  advice: Advice;
  onClose: () => void;
  // Another proposal than a coach advice (a vrije periode): what Akkoord and
  // Liever niet do, the planning run the preview uses (with the periods as
  // they would be), those periods for the bands on the days, and plain notes
  // on what stays as it is.
  onRespond?: (response: 'accepted' | 'declined') => Promise<void>;
  previewPass?: (sessions: PlannedSession[]) => PlannedSession[];
  leave?: LeavePeriod[];
  notes?: string[];
  eyebrow?: string;
  // Shown when the proposal changes nothing.
  emptyText?: string;
  // A change over many weeks (another rest day): only the lines up to this
  // date are listed, the rest is counted in one sentence.
  listUntil?: string;
}

export function ProposalSheet({ advice, onClose, onRespond, previewPass, leave, notes, eyebrow = 'VOORSTEL', emptyText, listUntil }: ProposalSheetProps) {
  const { plannedSessions, templates, program, respondToAdvice, planPreviewPass: contextPass } = useAppData();
  const planPreviewPass = previewPass ?? contextPass;
  const { closing, requestClose } = useSheetClose(onClose);
  const [busy, setBusy] = useState(false);
  // With more than one option: the chosen one drives the week shown and Akkoord.
  const [choice, setChoice] = useState(0);
  const chosen = advice.options?.[choice]?.proposal ?? advice.proposal;
  const data = useMemo(() => (chosen ? previewProposal(chosen.changes, plannedSessions, templates, planPreviewPass, leave) : { moves: [], weeks: [] }), [chosen, plannedSessions, templates, planPreviewPass, leave]);
  const byId = useMemo(() => new Map(templates.map((t) => [t.id, t])), [templates]);
  const listed = listUntil ? data.moves.filter((m) => (m.from ?? m.to ?? '') <= listUntil) : data.moves;
  // Counted from the proposal's own items, so the total is the real number of changes.
  const later = listUntil && chosen ? chosen.changes.filter((c) => c.action !== 'keep' && (c.fromDate ?? c.toDate ?? '') > listUntil).length : 0;
  const today = todayISO();
  const fatigueInputs = useLegFatigueInputs();
  // A test or race this proposal moves: how fresh the legs are there, now and after.
  const freshness = useMemo(() => {
    if (!chosen) return undefined;
    const item = chosen.changes.find((c) => c.action === 'move' && c.plannedSessionId && ['tpl_test_run', 'tpl_race'].includes(plannedSessions.find((s) => s.id === c.plannedSessionId)?.templateId ?? ''));
    if (!item?.toDate) return undefined;
    const kind = plannedSessions.find((s) => s.id === item.plannedSessionId)!.templateId === 'tpl_race' ? 'race' : 'test';
    const after = planPreviewPass(applyPlanChangeItems(chosen.changes.filter((c) => c.action !== 'replace'), plannedSessions, previewIds(), { by: 'proposal', at: 'preview' }).sessions);
    const at = legFatigueOn(item.toDate, { ...fatigueInputs, plannedSessions: after });
    return { kind, date: item.toDate, index: at.index, status: fatigueStatus(at, kind) } as const;
  }, [chosen, plannedSessions, fatigueInputs, planPreviewPass]);

  const minutes = (e: PreviewEntry, date: string) => {
    if (e.type === 'recovery') return undefined;
    if (e.plannedMinutes) return e.plannedMinutes;
    const t = byId.get(e.templateId);
    return t ? resolveVariantDuration(t, 'full', date, program) : undefined;
  };

  // Per option: how fresh the legs are on the test or race day it gives.
  const optionFreshness = useMemo(() => (advice.options ?? []).map((o) => {
    const item = o.proposal.changes.find((c) => c.action === 'move' && ['tpl_test_run', 'tpl_race'].includes(plannedSessions.find((x) => x.id === c.plannedSessionId)?.templateId ?? ''));
    if (!item?.toDate) return undefined;
    const kind = plannedSessions.find((x) => x.id === item.plannedSessionId)!.templateId === 'tpl_race' ? 'race' as const : 'test' as const;
    const after = planPreviewPass(applyPlanChangeItems(o.proposal.changes.filter((c) => c.action !== 'replace'), plannedSessions, previewIds(), { by: 'proposal', at: 'preview' }).sessions);
    const at = legFatigueOn(item.toDate, { ...fatigueInputs, plannedSessions: after });
    return { index: at.index, status: fatigueStatus(at, kind) };
  }), [advice, plannedSessions, fatigueInputs, planPreviewPass]);

  async function respond(response: 'accepted' | 'declined') {
    setBusy(true);
    const option = advice.options?.[choice];
    if (onRespond) await onRespond(response === 'accepted' ? 'accepted' : 'declined');
    else await respondToAdvice(option ? { ...advice, proposal: option.proposal, effect: option.effect } : advice, response);
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
              <Eyebrow>{eyebrow}</Eyebrow>
              <h3 className="mt-1 font-display text-xl leading-snug" style={{ color: 'var(--color-ink)' }}>{advice.title}</h3>

              {advice.options && advice.options.length > 1 && (
                <div className="mt-4 flex flex-col gap-2" role="radiogroup" aria-label="Kies een optie">
                  <p className="text-xs font-medium tracking-[0.18em]" style={{ color: 'var(--color-ink-dim)' }}>{advice.options.length} OPTIES · KIES ER EEN</p>
                  {advice.options.map((o, i) => {
                    const on = i === choice;
                    return (
                      <button
                        key={o.label}
                        role="radio"
                        aria-checked={on}
                        onClick={() => setChoice(i)}
                        className="flex min-h-[48px] items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left"
                        style={{ borderColor: on ? 'var(--color-gold)' : 'var(--color-card-border)', background: on ? tint('var(--color-gold)', 8) : 'transparent' }}
                      >
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border" style={{ borderColor: on ? 'var(--color-gold)' : 'var(--color-ink-dim)' }} aria-hidden>
                          {on && <span className="h-2 w-2 rounded-full" style={{ background: 'var(--color-gold)' }} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm" style={{ color: 'var(--color-ink)' }}>{o.label}</span>
                          {i === 0 && <span className="block text-xs" style={{ color: 'var(--color-gold)' }}>de kleinste verandering</span>}
                        </span>
                        {optionFreshness[i] && (
                          <span className="shrink-0 text-right text-xs leading-tight tabular-nums" style={{ color: optionFreshness[i]!.status === 'fris' ? 'var(--color-alpine)' : 'var(--color-gold)' }}>
                            benen {formatNumberNL(optionFreshness[i]!.index, 1)}<br />{optionFreshness[i]!.status}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {data.moves.length > 0 && (
                <div className="mt-4 flex flex-col gap-2.5 rounded-xl border p-3.5" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)' }}>
                  {listed.map((m, i) => <MoveLine key={i} move={m} />)}
                  {later > 0 && (
                    <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
                      {listed.length > 0 ? 'En nog' : 'In de weken daarna'} <span className="tabular-nums">{later}</span> {later === 1 ? 'wijziging' : 'wijzigingen'}{listed.length > 0 ? ' in de weken daarna' : ''}, steeds op dezelfde manier.
                    </p>
                  )}
                </div>
              )}

              {data.moves.length === 0 && emptyText && (
                <p className="mt-4 rounded-xl border p-3.5 text-sm leading-relaxed" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)', color: 'var(--color-ink)' }}>{emptyText}</p>
              )}

              {notes && notes.length > 0 && (
                <div className="mt-3 flex flex-col gap-1.5 rounded-xl border px-3.5 py-3" style={{ borderColor: 'var(--color-card-border)' }}>
                  <p className="text-xs font-medium tracking-[0.18em]" style={{ color: 'var(--color-bronze)' }}>BLIJFT STAAN</p>
                  {notes.map((n) => <p key={n} className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{n}</p>)}
                </div>
              )}

              {freshness && (
                <p className="mt-3 flex items-baseline justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-xs" style={{ borderColor: 'var(--color-card-border)' }}>
                  <span style={{ color: 'var(--color-ink-dim)' }}>Benen op de {freshness.kind === 'race' ? 'wedstrijd' : 'testdag'}, {short(freshness.date)}</span>
                  <span className="shrink-0 tabular-nums" style={{ color: freshness.status === 'fris' ? 'var(--color-alpine)' : 'var(--color-gold)' }}>{formatNumberNL(freshness.index, 1)} · {freshness.status}</span>
                </p>
              )}

              {data.weeks.map((w) => (
                <section key={w.weekStart} className="mt-6">
                  <p className="mb-3 text-xs font-medium tracking-[0.18em]" style={{ color: 'var(--color-bronze)' }}>
                    WEEK VAN {formatDateNL(w.weekStart).toUpperCase()}
                  </p>
                  <div className="flex flex-col gap-4">
                    {w.days.map((d) => {
                      const isToday = d.date === today;
                      return (
                        <div key={d.date}>
                          <div className="mb-2 flex items-baseline gap-2">
                            <span className="text-xs font-semibold" style={{ color: d.changed || isToday ? 'var(--color-gold)' : 'var(--color-ink-dim)' }}>{weekdayShortNL(d.date)}</span>
                            <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{formatDateNL(d.date)}</span>
                            {isToday && <span className="text-xs" style={{ color: 'var(--color-gold)' }}>vandaag</span>}
                          </div>
                          {d.leave && <div className="mb-2"><LeaveBand label={d.leave} /></div>}
                          {d.entries.length === 0 ? (
                            d.leave && (d.leave.kind === 'off' || d.leave.kind === 'trek') ? null : <p className="pl-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>Geen training gepland</p>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {d.entries.map((e, i) => {
                                const testThatDay = d.entries.some((o) => (o.templateId === 'tpl_test_run' || o.templateId === 'tpl_race') && o.change !== 'weg' && o.change !== 'vervalt');
                                const afterTest = testThatDay && e.type === 'strength' && !!byId.get(e.templateId) && isLegHeavyTemplate(byId.get(e.templateId)!);
                                return <EntryCard key={i} entry={e} minutes={minutes(e, d.date)} afterTest={afterTest} />;
                              })}
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
              <SecondaryButton onClick={() => void respond('declined')} disabled={busy} className="min-h-[46px]">Liever niet</SecondaryButton>
              <PrimaryButton onClick={() => void respond('accepted')} disabled={busy} fullWidth={false}>Akkoord</PrimaryButton>
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
              {move.from && <span className="mx-1.5 inline-block align-[-2px]" style={{ color: 'var(--color-bronze)' }}><Icon name="verder" size={14} /></span>}
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
function EntryCard({ entry, minutes, afterTest }: { entry: PreviewEntry; minutes?: number; afterTest?: boolean }) {
  const rest = entry.type === 'recovery';
  const struck = entry.change === 'weg' || entry.change === 'vervalt';
  const highlighted = entry.change === 'hierheen' || entry.change === 'nieuw';
  const note = entry.change === 'hierheen' && entry.otherDate ? `van ${short(entry.otherDate)}`
    : entry.change === 'weg' && entry.otherDate ? `naar ${short(entry.otherDate)}`
    : entry.change === 'vervalt' ? 'vervalt'
    : entry.change === 'nieuw' ? 'nieuw'
    : rest ? 'Wandelen mag, niets af te vinken'
    : afterTest ? 'Na de test, liefst 6 uur later' : undefined;
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
        <p className="break-words text-sm font-medium" style={{ color: struck ? 'var(--color-ink-dim)' : 'var(--color-ink)', textDecoration: struck ? 'line-through' : undefined }}>
          {rest ? 'Rustdag' : entry.name}
        </p>
        {note && <p className="mt-0.5 break-words text-xs" style={{ color: highlighted ? 'var(--color-gold)' : 'var(--color-ink-dim)' }}>{note}</p>}
      </div>
      {highlighted && <span className="shrink-0 text-xs font-semibold tracking-[0.12em]" style={{ color: 'var(--color-gold)' }}>{entry.change === 'nieuw' ? 'NIEUW' : 'HIERHEEN'}</span>}
      {!highlighted && minutes !== undefined && !struck && <span className="shrink-0 text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{minutes} min</span>}
    </div>
  );
}
