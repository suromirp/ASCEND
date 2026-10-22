// ASCEND: "Vrije dagen en vakanties" on the Week screen. A list of the
// periods you are free or away (engine/leave.ts) and one button to add one.
// Adding or removing a period shows the proposal first ("Zo ziet je planning
// eruit", the same sheet as an advice) and only changes the planning, and
// stores the period, after Akkoord.

import { useMemo, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import type { LeaveKind, LeavePeriod } from '../models/leave';
import type { Advice } from '../engine/adviceEngine';
import type { LeavePlan } from '../engine/leaveProposal';
import {
  LEAVE_KINDS, LEAVE_KIND_HINT, LEAVE_KIND_LABEL, describeDayCount, describePeriodDates, validateLeaveDraft,
} from '../engine/leave';
import { addDays, todayISO } from '../utils/dates';
import { makeId } from '../utils/id';
import { useSheetClose } from '../utils/useSheetClose';
import { Portal } from './Portal';
import { ProposalSheet } from './ProposalSheet';
import { Card, Eyebrow, PrimaryButton, SecondaryButton } from './ui';

const tint = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;
const KIND_COLOR: Record<LeaveKind, string> = {
  no_training: 'var(--color-success-text)',
  trek: 'var(--color-sky)',
  free_days: 'var(--color-stone)',
};

export function LeavePeriodsCard() {
  const { leavePeriods, planLeave, applyLeave, planPreviewPass } = useAppData();
  const [adding, setAdding] = useState(false);
  const [plan, setPlan] = useState<LeavePlan | null>(null);
  const today = todayISO();
  // What is over for more than two weeks is no longer shown.
  const shown = leavePeriods.filter((p) => p.endDate >= addDays(today, -14));

  const previewPass = useMemo(
    () => (plan ? (sessions: Parameters<typeof planPreviewPass>[0]) => planPreviewPass(sessions, plan.periodsAfter) : undefined),
    [plan, planPreviewPass],
  );

  const advice: Advice | null = plan && {
    id: `leave:${plan.period.id}`,
    trigger: 'plan_update',
    ruleId: 'LEAVE',
    title: 'Zo ziet je planning eruit',
    effect: plan.proposal.consequences,
    why: plan.proposal.explanation,
    priority: 0,
    proposal: plan.proposal,
  };

  return (
    <>
      <Card className="flex flex-col gap-3" texture>
        <div>
          <Eyebrow>VRIJE DAGEN EN VAKANTIES</Eyebrow>
          <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
            {shown.length === 0
              ? 'Heb je vrije dagen, een vakantie of een tocht gepland? Zet die hier. ASCEND laat zien hoe je weken er dan uitzien en past pas iets aan na jouw akkoord.'
              : 'ASCEND houdt hier rekening mee in je planning. Een periode toevoegen of weghalen laat je eerst zien en past pas iets aan na jouw akkoord.'}
          </p>
        </div>

        {shown.length > 0 && (
          <ul className="flex flex-col gap-2">
            {shown.map((p) => (
              <li key={p.id} className="rounded-xl border py-1 pl-3 pr-1" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-surface)' }}>
                <div className="flex items-center justify-between gap-2">
                  <p className="flex min-w-0 items-center gap-2 text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: KIND_COLOR[p.kind] }} aria-hidden />
                    <span className="truncate">{LEAVE_KIND_LABEL[p.kind]}</span>
                  </p>
                  <button
                    onClick={() => setPlan(planLeave('remove', p))}
                    className="min-h-[44px] shrink-0 px-3 text-xs underline"
                    style={{ color: 'var(--color-ink-dim)' }}
                    aria-label={`${LEAVE_KIND_LABEL[p.kind]} ${describePeriodDates(p)} verwijderen`}
                  >
                    Verwijderen
                  </button>
                </div>
                <div className="-mt-1.5 pb-2 pl-4 pr-3">
                  <p className="text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{describePeriodDates(p, true)} · {describeDayCount(p)}</p>
                  {p.note && <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--color-ink)' }}>{p.note}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}

        <SecondaryButton onClick={() => setAdding(true)} className="min-h-[46px] flex-none">PERIODE TOEVOEGEN</SecondaryButton>
      </Card>

      {adding && (
        <LeavePeriodSheet
          existing={leavePeriods}
          onClose={() => setAdding(false)}
          onSubmit={(period) => {
            setAdding(false);
            setPlan(planLeave('add', period));
          }}
        />
      )}

      {plan && advice && (
        <ProposalSheet
          advice={advice}
          eyebrow={`${plan.mode === 'add' ? '' : 'VERWIJDEREN · '}${LEAVE_KIND_LABEL[plan.period.kind].toUpperCase()} · ${describePeriodDates(plan.period, true).toUpperCase()}`}
          previewPass={previewPass}
          leave={plan.periodsAfter}
          notes={plan.notes}
          emptyText={plan.mode === 'add'
            ? 'Je planning hoeft niet te veranderen. De periode wordt bewaard en ASCEND houdt er rekening mee.'
            : 'Je planning hoeft niet te veranderen. De periode wordt verwijderd.'}
          onRespond={async (response) => {
            if (response === 'accepted') await applyLeave(plan);
          }}
          onClose={() => setPlan(null)}
        />
      )}
    </>
  );
}

const inputStyle = { borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' };

function LeavePeriodSheet({ existing, onSubmit, onClose }: { existing: LeavePeriod[]; onSubmit: (period: LeavePeriod) => void; onClose: () => void }) {
  const { closing, requestClose } = useSheetClose(onClose);
  const today = todayISO();
  const [kind, setKind] = useState<LeaveKind>('no_training');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [note, setNote] = useState('');
  const problem = validateLeaveDraft({ kind, startDate, endDate }, today);
  const overlap = !problem ? existing.find((p) => p.startDate <= endDate && p.endDate >= startDate) : undefined;

  return (
    <Portal>
      <div
        className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}
        onClick={requestClose}
      >
        <div className={`flex max-h-[92vh] w-full max-w-md flex-col ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <Card className="flex min-h-0 flex-col rounded-b-none border-b-0 p-0!">
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-3 pt-5">
              <Eyebrow>PERIODE TOEVOEGEN</Eyebrow>
              <h3 className="mt-1 font-display text-xl leading-snug" style={{ color: 'var(--color-ink)' }}>Wanneer ben je vrij of weg?</h3>

              <div className="mt-4 flex flex-col gap-2" role="radiogroup" aria-label="Soort periode">
                {LEAVE_KINDS.map((k) => {
                  const on = k === kind;
                  return (
                    <button
                      key={k}
                      role="radio"
                      aria-checked={on}
                      onClick={() => setKind(k)}
                      className="flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left"
                      style={{ borderColor: on ? 'var(--color-gold)' : 'var(--color-card-border)', background: on ? tint('var(--color-gold)', 8) : 'transparent' }}
                    >
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border" style={{ borderColor: on ? 'var(--color-gold)' : 'var(--color-ink-dim)' }} aria-hidden>
                        {on && <span className="h-2 w-2 rounded-full" style={{ background: 'var(--color-gold)' }} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm" style={{ color: 'var(--color-ink)' }}>{LEAVE_KIND_LABEL[k]}</span>
                        <span className="mt-0.5 block text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{LEAVE_KIND_HINT[k]}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="block text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                  Eerste dag
                  <input
                    type="date"
                    value={startDate}
                    min={today}
                    onChange={(e) => {
                      const v = e.target.value;
                      setStartDate(v);
                      if (v && (!endDate || endDate < v)) setEndDate(v);
                    }}
                    className="mt-1 w-full rounded-lg border bg-transparent px-2.5 py-2 text-sm"
                    style={inputStyle}
                  />
                </label>
                <label className="block text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                  Laatste dag
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || today}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border bg-transparent px-2.5 py-2 text-sm"
                    style={inputStyle}
                  />
                </label>
              </div>
              {problem && startDate && endDate && <p className="mt-2 text-xs" style={{ color: 'var(--color-danger-text)' }} role="alert">{problem}</p>}
              {overlap && (
                <p className="mt-2 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
                  Dit overlapt met {LEAVE_KIND_LABEL[overlap.kind].toLowerCase()} ({describePeriodDates(overlap)}). Op de dagen die allebei gelden telt de strengste: eerst vakantie, dan tocht, dan vrije dagen.
                </p>
              )}

              <label className="mt-4 block text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                Notitie (hoeft niet)
                <input
                  type="text"
                  value={note}
                  maxLength={60}
                  placeholder="Bijvoorbeeld: Hemelvaart in de Ardennen"
                  onChange={(e) => setNote(e.target.value)}
                  className="mt-1 w-full rounded-lg border bg-transparent px-2.5 py-2 text-sm"
                  style={inputStyle}
                />
              </label>
              <p className="mt-3 text-[11px] leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
                Je ziet eerst wat er in je planning verandert. Pas na jouw akkoord wordt de periode bewaard.
              </p>
            </div>

            <div className="flex gap-3 border-t px-5 pt-3" style={{ borderColor: 'var(--color-card-border)', paddingBottom: 'max(env(safe-area-inset-bottom), 14px)' }}>
              <SecondaryButton onClick={requestClose} className="min-h-[46px]">ANNULEREN</SecondaryButton>
              <PrimaryButton
                disabled={!!problem}
                fullWidth={false}
                onClick={() => onSubmit({ id: makeId('leave'), kind, startDate, endDate, ...(note.trim() ? { note: note.trim() } : {}) })}
              >
                VOORSTEL BEKIJKEN
              </PrimaryButton>
            </div>
          </Card>
        </div>
      </div>
    </Portal>
  );
}
