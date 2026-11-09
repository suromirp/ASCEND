// ASCEND: "Vrije dagen en vakanties" on the Week screen. A list of the
// periods you are free or away (engine/leave.ts) and one button to add one.
// A tap on a period opens the same sheet to change its days, kind or note, or
// to remove it. Adding, other days or another kind, and removing show the
// proposal first ("Zo ziet je planning eruit", the same sheet as an advice)
// and only change the planning, and store the period, after Akkoord. Only
// another note is stored at once, with Ongedaan maken in the notice
// (engine/leaveEdit.ts, docs/beslissingen/2026-11-01-vakantie-bijwerken.md).

import { useMemo, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import type { LeaveKind, LeavePeriod, NoGymDetails } from '../models/leave';
import type { Advice } from '../engine/adviceEngine';
import type { LeavePlan } from '../engine/leaveProposal';
import {
  LEAVE_KINDS, LEAVE_KIND_HINT, LEAVE_KIND_LABEL, describeDayCount, describePeriodDates, validateLeaveDraft,
} from '../engine/leave';
import { editedPeriod, leaveEditScope, leaveWordsChange } from '../engine/leaveEdit';
import { NO_GYM_ADVICE, resolveNoGym } from '../engine/noGymDetails';
import { mainGoalIsMountain } from '../engine/mountainMuscles';
import { addDays, todayISO } from '../utils/dates';
import { makeId } from '../utils/id';
import { useSheetClose } from '../utils/useSheetClose';
import { Icon } from './icons';
import { Portal } from './Portal';
import { ProposalSheet } from './ProposalSheet';
import { SettingsLinkRow } from './settings/SettingsLink';
import { Card, Eyebrow, PrimaryButton, SecondaryButton, Segmented, SheetGrip, Toggle } from './ui';
import { TextButton } from './TextButton';

const STALE_TEXT = 'Je planning is intussen veranderd. Bekijk het voorstel opnieuw.';
const tint = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;
const KIND_COLOR: Record<LeaveKind, string> = {
  no_training: 'var(--color-success-text)',
  trek: 'var(--color-status)',
  no_gym: 'var(--color-ink)',
  free_days: 'var(--color-ink-dim)',
};

export function LeavePeriodsCard() {
  const { leavePeriods, planLeave, applyLeave, planPreviewPass, saveLeaveNote } = useAppData();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<LeavePeriod | null>(null);
  const [plan, setPlan] = useState<LeavePlan | null>(null);
  // The planning changed while the proposal was open: nothing was stored.
  const [stale, setStale] = useState(false);
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
          <Eyebrow>Vrije dagen en vakanties</Eyebrow>
          <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
            {shown.length === 0
              ? 'Vrije dagen, vakantie of tocht op komst? Zet ze hier. Eerst een voorstel, pas na Akkoord verandert er iets.'
              : 'Tik op een periode om hem bij te werken. Eerst een voorstel, pas na Akkoord verandert er iets.'}
          </p>
        </div>

        {shown.length > 0 && (
          <ul className="flex flex-col gap-2">
            {shown.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  data-sheet-from
                  onClick={() => setEditing(p)}
                  className="flex min-h-[56px] w-full items-center gap-2 rounded-xl border py-2 pl-3 pr-2 text-left active:opacity-75"
                  style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-surface)' }}
                  aria-label={`${p.trek?.name ?? LEAVE_KIND_LABEL[p.kind]}, ${describePeriodDates(p)}, bijwerken`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-2 text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: KIND_COLOR[p.kind] }} aria-hidden />
                      <span className="break-words">{p.trek?.name ?? LEAVE_KIND_LABEL[p.kind]}</span>
                    </span>
                    <span className="mt-0.5 block pl-4 text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{describePeriodDates(p, true)} · {describeDayCount(p)}</span>
                    {p.note && <span className="mt-0.5 block break-words pl-4 text-xs" style={{ color: 'var(--color-ink)' }}>{p.note}</span>}
                  </span>
                  <span className="shrink-0" style={{ color: 'var(--color-ink-dim)' }}><Icon name="verder" size={16} /></span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {stale && <p className="text-sm leading-snug" style={{ color: 'var(--color-warning)' }} role="status">{STALE_TEXT}</p>}
        <SecondaryButton onClick={() => setAdding(true)} className="min-h-[46px] flex-none">Periode toevoegen</SecondaryButton>
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

      {editing && (
        <LeavePeriodSheet
          existing={leavePeriods}
          editing={editing}
          onClose={() => setEditing(null)}
          onSubmit={(period) => {
            const before = editing;
            setEditing(null);
            const scope = leaveEditScope(before, period);
            if (scope === 'note') void saveLeaveNote(before.id, period.note ?? '', period.noGym?.hills);
            else if (scope === 'plan') setPlan(planLeave('add', period, before));
          }}
          onRemove={() => {
            const before = editing;
            setEditing(null);
            setPlan(planLeave('remove', before));
          }}
        />
      )}

      {plan && advice && (
        <ProposalSheet
          advice={advice}
          eyebrow={`${plan.mode === 'remove' ? 'Verwijderen · ' : plan.replaces ? 'Bijwerken · ' : ''}${LEAVE_KIND_LABEL[plan.period.kind]} · ${describePeriodDates(plan.period, true)}`}
          previewPass={previewPass}
          leave={plan.periodsAfter}
          notes={plan.notes}
          emptyText={plan.mode === 'remove'
            ? 'Je planning hoeft niet te veranderen. Met Akkoord verwijder je de periode.'
            : plan.replaces
              ? 'Je planning hoeft niet te veranderen. Met Akkoord bewaar je de nieuwe datums en houdt ASCEND er rekening mee.'
              : 'Je planning hoeft niet te veranderen. Met Akkoord bewaar je de periode en houdt ASCEND er rekening mee.'}
          onRespond={async (response) => {
            setStale(response === 'accepted' && (await applyLeave(plan)) === 'stale');
          }}
          onClose={() => setPlan(null)}
        />
      )}
    </>
  );
}

const inputStyle = { borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' };

// Adding a period, or with `editing` changing one: the same fields, filled in.
function LeavePeriodSheet({ existing, editing, onSubmit, onRemove, onClose }: {
  existing: LeavePeriod[];
  editing?: LeavePeriod;
  onSubmit: (period: LeavePeriod) => void;
  onRemove?: () => void;
  onClose: () => void;
}) {
  const { closing, requestClose, sheetRef } = useSheetClose(onClose);
  const { settings, trainingGoals, goalMilestones } = useAppData();
  const mountainGoal = useMemo(() => mainGoalIsMountain(trainingGoals, new Set(goalMilestones.map((m) => m.goalId))), [trainingGoals, goalMilestones]);
  const today = todayISO();
  const [kind, setKind] = useState<LeaveKind>(editing?.kind ?? 'no_training');
  // Zonder sportschool: de keuzes van de periode, met het advies (en je instelling voor kracht) als begin.
  const [noGym, setNoGym] = useState<NoGymDetails>(() => editing?.kind === 'no_gym' ? resolveNoGym(editing) : { ...NO_GYM_ADVICE, strength: settings.noGymStrength ?? NO_GYM_ADVICE.strength });
  const setGym = (patch: Partial<NoGymDetails>) => setNoGym((was) => ({ ...was, ...patch }));
  const [startDate, setStartDate] = useState(editing?.startDate ?? today);
  const [endDate, setEndDate] = useState(editing?.endDate ?? today);
  const [note, setNote] = useState(editing?.note ?? '');
  const problem = validateLeaveDraft({ kind, startDate, endDate }, today);
  const overlap = !problem ? existing.find((p) => p.id !== editing?.id && p.startDate <= endDate && p.endDate >= startDate) : undefined;
  // A tocht stays a tocht here: its name, terrain and importance live with Tochten on Ascend.
  const isTocht = !!editing?.trek;
  const draft = editing ? editedPeriod(editing, { kind, startDate, endDate, note, ...(kind === 'no_gym' ? { noGym } : {}) }) : undefined;
  const scope = editing && draft ? leaveEditScope(editing, draft) : 'plan';
  // An ongoing period may keep its first day in the past.
  const minStart = editing && editing.startDate < today ? editing.startDate : today;

  return (
    <Portal>
      <div
        className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}
        onClick={requestClose}
      >
        <div ref={sheetRef} className={`relative flex max-h-[92vh] w-full max-w-md flex-col ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <SheetGrip />
          <Card className="flex min-h-0 flex-col rounded-b-none border-b-0 p-0!">
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-3 pt-5">
              <Eyebrow>{editing ? 'Periode bijwerken' : 'Periode toevoegen'}</Eyebrow>
              <h3 className="mt-1 font-display text-xl leading-snug" style={{ color: 'var(--color-ink)' }}>
                {editing ? (editing.trek?.name ?? LEAVE_KIND_LABEL[editing.kind]) : 'Wanneer ben je vrij of weg?'}
              </h3>

              {isTocht ? (
                <p className="mt-2 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
                  Dit is een tocht. Hier verschuif je de datums. Naam, terrein en belang wijzig je bij Tochten op de Ascend-tab.
                </p>
              ) : (
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
                        style={{ borderColor: on ? 'var(--color-action)' : 'var(--color-card-border)', background: on ? tint('var(--color-action)', 8) : 'transparent' }}
                      >
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border" style={{ borderColor: on ? 'var(--color-action)' : 'var(--color-ink-dim)' }} aria-hidden>
                          {on && <span className="h-2 w-2 rounded-full" style={{ background: 'var(--color-action)' }} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm" style={{ color: 'var(--color-ink)' }}>{LEAVE_KIND_LABEL[k]}</span>
                          <span className="mt-0.5 block text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{LEAVE_KIND_HINT[k]}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {kind === 'no_gym' && !isTocht && (
                <div className="mt-4 flex flex-col gap-3">
                  <div>
                    <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Hoeveel</p>
                    <div className="mt-1">
                      <Segmented tall label="Hoeveel" value={noGym.amount} onChange={(v) => setGym({ amount: v })} options={[{ value: 'light', label: 'Licht' }, { value: 'normal', label: 'Gewoon' }]} />
                    </div>
                    <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
                      {noGym.amount === 'light' ? 'Twee keer lopen per week, korter en rustig. Het advies.' : 'Je looptrainingen zoals gepland, alleen zonder sportschool.'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Kracht</p>
                    <div className="mt-1">
                      <Segmented tall label="Kracht" value={noGym.strength} onChange={(v) => setGym({ strength: v })} options={[{ value: 'bodyweight', label: 'Eigen gewicht' }, { value: 'drop', label: 'Laten vervallen' }]} />
                    </div>
                    <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
                      {noGym.strength === 'bodyweight' ? 'Squats, lunges, push-ups en kuitheffingen, 15 tot 20 minuten.' : 'Geen kracht in deze periode.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm" style={{ color: 'var(--color-ink)' }}>Heuvels in de buurt</span>
                      <span className="mt-0.5 block text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Eén loop per week wordt een heuveltraining. Heb je een klacht aan je knie of been, dan een rustige heuvelloop.{mountainGoal ? ' Goed voor je bergdoel.' : ''}</span>
                    </span>
                    <Toggle checked={noGym.hills} onChange={(on) => setGym({ hills: on })} label="Heuvels in de buurt" />
                  </div>
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="block text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                  Eerste dag
                  <input
                    type="date" lang="nl"
                    value={startDate}
                    min={minStart}
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
                    type="date" lang="nl"
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
                  Dit overlapt met {LEAVE_KIND_LABEL[overlap.kind].toLowerCase()} ({describePeriodDates(overlap)}). Op dagen die allebei gelden telt de strengste: vakantie, tocht, zonder sportschool, vrije dagen.
                </p>
              )}

              <label className="mt-4 block text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                Notitie (mag leeg)
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
              <p className="mt-3 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }} aria-live="polite">
                {scope === 'note' && editing && draft
                  ? leaveWordsChange(editing, draft).line
                  : scope === 'none'
                    ? 'Je hebt nog niets veranderd.'
                    : editing
                      ? 'Eerst een voorstel, pas na Akkoord verandert er iets. Daarna worden de nieuwe datums bewaard.'
                      : 'Eerst een voorstel, pas na Akkoord verandert er iets. Daarna wordt de periode bewaard.'}
              </p>
              {onRemove && (
                <TextButton tone="dim" onClick={onRemove} className="-ml-1 mt-1 px-1">Periode verwijderen</TextButton>
              )}
              <SettingsLinkRow page="planning" row="vakantie-opzij" label="Trainingen die moeten wijken" />
              {kind === 'no_gym' && <SettingsLinkRow page="planning" row="zonder-sportschool" label="Kracht zonder sportschool instellen" />}
              <SettingsLinkRow page="doel" row="rust-na-tocht" label="Rust na een bergtocht instellen" />
            </div>

            <div className="flex gap-3 border-t px-5 pt-3" style={{ borderColor: 'var(--color-card-border)', paddingBottom: '14px' }}>
              <SecondaryButton onClick={requestClose} className="min-h-[46px]">Annuleren</SecondaryButton>
              <PrimaryButton
                disabled={scope === 'none' || (scope === 'plan' && !!problem)}
                fullWidth={false}
                className="whitespace-nowrap"
                onClick={() => onSubmit(draft ?? { id: makeId('leave'), kind, startDate, endDate, ...(note.trim() ? { note: note.trim() } : {}), ...(kind === 'no_gym' ? { noGym } : {}) })}
              >{scope === 'plan' ? 'Voorstel bekijken' : 'Bewaren'}</PrimaryButton>
            </div>
          </Card>
        </div>
      </div>
    </Portal>
  );
}
