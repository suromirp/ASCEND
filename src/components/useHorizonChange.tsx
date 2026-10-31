import { useState, type ReactNode } from 'react';
import { useAppData } from '../state/AppDataContext';
import { ProposalSheet } from './ProposalSheet';
import { withAcceptedConflicts, withResolvedConflicts, type HorizonApplyStatus, type HorizonPlan } from '../storage/horizonPlan';
import { askBeforeApplying, needsConfirmation } from '../engine/changeImpact';
import { addDays, mondayOfWeek, todayISO } from '../utils/dates';

// Een doel of planningsinstelling die de planningsronde anders laat lopen
// (storage/horizonPlan.ts): eerst uitrekenen, dan het voorstel met Akkoord of
// Liever niet, en pas daarna opslaan (Warden Logica punten 1 en 2,
// docs/beslissingen/2026-10-23-planning-nooit-stil.md).
//
// `ask: 'always'`: een doel. Verandert er iets aan je planning, dan altijd eerst
// het voorstel. `ask: 'setting'`: een instelling volgt je keuze bij
// "Wijzigingen", net als usePlanSettingChange: een kleine wijziging past het toe
// met een melding en ongedaan maken, anders eerst het voorstel.
// Verandert er niets, dan wordt de keuze bewaard en zegt het dat.

export const STALE_NOTE = 'Je planning veranderde net nog. Er is niets aangepast; kies het opnieuw om het voorstel met de planning van nu te zien.';
// Only said when everything is back as it was (storage/horizonPlan.ts puts it back first).
const FAILED_NOTE = 'Het lukte niet om je planning nu bij te werken. Er is niets aangepast; probeer het zo nog eens.';
const PENDING_NOTE = 'Je planning wordt nog bijgewerkt. Zodra het klaar is, zie je onderin wat er veranderde, met ongedaan maken.';
const PARTIAL_NOTE = 'Dit lukte maar half. Onderin zie je wat er wel veranderde; met ongedaan maken zet je het terug.';
export const APPLIED_NOTE = 'Gelukt, het staat in je planning. Onderin zie je wat er veranderde en kun je het ongedaan maken.';
const LENGTHS_NOTE = 'Opgeslagen. Je trainingen blijven op hun dag en krijgen de lengte uit het voorstel.';
const UNCHANGED_NOTE = 'Opgeslagen. Je planning kon gewoon blijven zoals ze was.';
const NOTE_FOR: Record<HorizonApplyStatus, string> = {
  applied: APPLIED_NOTE, unchanged: UNCHANGED_NOTE, stale: STALE_NOTE, failed: FAILED_NOTE, pending: PENDING_NOTE, partial: PARTIAL_NOTE,
};

const BOTH_NOTE = 'Je houdt allebei de doelen op hun datum. Je hoort hier niets meer over zolang de datums niet veranderen. De veiligheidsgrenzen tussen zware beendagen blijven gelden.';

export interface HorizonProposeOptions {
  eyebrow: string;
  ask: 'always' | 'setting';
  // What Liever niet means here, in one sentence.
  declined?: string;
  // Called once the change is stored (also when nothing in the plan changed).
  onStored?: () => void;
  // Called on Liever niet: a field that holds what you typed goes back to what is stored.
  onDeclined?: () => void;
  // Always the proposal first, also when the run itself moves nothing (a rest
  // week trained through: what changes is in the lines of the proposal).
  alwaysAsk?: boolean;
  // The heading above the notes of the proposal, when they are not about what stays.
  notesTitle?: string;
}

export function useHorizonChange(): {
  busy: boolean;
  note: string | null;
  clearNote: () => void;
  propose: (make: () => Promise<HorizonPlan | null>, options: HorizonProposeOptions) => Promise<void>;
  sheet: ReactNode;
} {
  const { applyHorizonPlan, planHorizonChange, plannedSessions, settings, leavePeriods } = useAppData();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  // `both`: het voorstel als je twee botsende doelen toch allebei houdt (de stille knop "Toch allebei").
  const [pending, setPending] = useState<{ plan: HorizonPlan; options: HorizonProposeOptions; both?: HorizonPlan } | null>(null);

  async function apply(plan: HorizonPlan, options: HorizonProposeOptions) {
    const stored = (status: HorizonApplyStatus) => status === 'applied' || status === 'unchanged' || status === 'partial';
    // Akkoord that finishes late: the advice is answered once it is stored.
    const status = await applyHorizonPlan(plan, { onLate: (late) => { if (stored(late)) options.onStored?.(); } }).catch((): HorizonApplyStatus => 'failed');
    if (stored(status)) options.onStored?.();
    // Nothing moved, but trainings got another length: say that, not that all stayed.
    setNote(status === 'unchanged' && plan.lengths.length > 0 ? LENGTHS_NOTE : NOTE_FOR[status]);
  }

  async function propose(make: () => Promise<HorizonPlan | null>, options: HorizonProposeOptions) {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      let plan = await make();
      if (!plan) return;
      // Twee doelen die te dicht op elkaar liggen (engine/goalConflicts.ts): het voorstel is wat
      // ASCEND voorstelt (een kortere afbouw of een label lager), met de som erbij. "Toch allebei"
      // laat zien wat er gebeurt als je de datums houdt zoals je ze koos.
      let both: HorizonPlan | undefined;
      if (plan.conflicts?.length) {
        const conflicts = plan.conflicts;
        const messages = conflicts.flatMap((c) => [c.message, c.suggestion]);
        both = await planHorizonChange(await withAcceptedConflicts(plan.input, conflicts));
        if (conflicts.some((c) => c.resolution.kind !== 'tell')) {
          const resolved = await planHorizonChange(await withResolvedConflicts(plan.input, conflicts));
          plan = { ...resolved, notes: [...new Set([...messages, ...resolved.notes])] };
        }
        options = { ...options, alwaysAsk: true };
      }
      const items = plan.proposal.changes;
      if (items.length === 0 && plan.lengths.length === 0 && !options.alwaysAsk) {
        await apply(plan, options);
        return;
      }
      let ask = true;
      if (options.ask === 'setting') {
        // Only another length (Ambitie): a change in the weeks ahead, like a notice.
        ask = items.length > 0 ? askBeforeApplying(items, plannedSessions, todayISO(), settings.changeApplyMode) : needsConfirmation('notice', settings.changeApplyMode ?? 'auto_small');
      }
      if (!ask) {
        await apply(plan, options);
        return;
      }
      setPending({ plan, options, both });
    } catch (err) {
      setNote(err instanceof Error ? err.message : FAILED_NOTE);
    } finally {
      setBusy(false);
    }
  }

  const sheet = pending ? (
    <ProposalSheet
      advice={{
        id: pending.plan.proposal.id,
        trigger: 'plan_update',
        ruleId: 'HORIZON',
        title: pending.plan.proposal.issue,
        effect: pending.plan.proposal.consequences,
        why: pending.plan.proposal.explanation,
        priority: 0,
        proposal: pending.plan.proposal,
      }}
      eyebrow={pending.options.eyebrow}
      summary={pending.plan.proposal.consequences}
      // The items are already the whole planning run: nothing to add to them.
      previewPass={(sessions) => sessions}
      leave={leavePeriods}
      notes={pending.plan.notes}
      notesTitle={pending.options.notesTitle}
      extraLines={pending.plan.lengths}
      emptyText="Je planning verandert hier niet door."
      alternative={pending.both ? { label: 'Toch allebei', onClick: () => setPending({ plan: { ...pending.both!, notes: [BOTH_NOTE, ...pending.both!.notes] }, options: pending.options }) } : undefined}
      listUntil={addDays(mondayOfWeek(todayISO()), 13)}
      onRespond={async (response) => {
        if (response === 'accepted') await apply(pending.plan, pending.options);
        else {
          pending.options.onDeclined?.();
          setNote(pending.options.declined ?? 'Je keuze en je planning blijven zoals ze waren.');
        }
      }}
      onClose={() => setPending(null)}
    />
  ) : null;

  return { busy, note, clearNote: () => setNote(null), propose, sheet };
}
