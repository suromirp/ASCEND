import { useState, type ReactNode } from 'react';
import { useAppData } from '../state/AppDataContext';
import { ProposalSheet } from './ProposalSheet';
import type { HorizonApplyStatus, HorizonPlan } from '../storage/horizonPlan';
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
const APPLIED_NOTE = 'Opgeslagen en toegepast. Onderin zie je wat er veranderde, met ongedaan maken.';
const UNCHANGED_NOTE = 'Opgeslagen. Je planning hoefde niet te veranderen.';
const NOTE_FOR: Record<HorizonApplyStatus, string> = {
  applied: APPLIED_NOTE, unchanged: UNCHANGED_NOTE, stale: STALE_NOTE, failed: FAILED_NOTE, pending: PENDING_NOTE, partial: PARTIAL_NOTE,
};

export interface HorizonProposeOptions {
  eyebrow: string;
  ask: 'always' | 'setting';
  // What Liever niet means here, in one sentence.
  declined?: string;
  // Called once the change is stored (also when nothing in the plan changed).
  onStored?: () => void;
  // Called on Liever niet: a field that holds what you typed goes back to what is stored.
  onDeclined?: () => void;
}

export function useHorizonChange(): {
  busy: boolean;
  note: string | null;
  clearNote: () => void;
  propose: (make: () => Promise<HorizonPlan | null>, options: HorizonProposeOptions) => Promise<void>;
  sheet: ReactNode;
} {
  const { applyHorizonPlan, plannedSessions, settings, leavePeriods } = useAppData();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [pending, setPending] = useState<{ plan: HorizonPlan; options: HorizonProposeOptions } | null>(null);

  async function apply(plan: HorizonPlan, options: HorizonProposeOptions) {
    const status = await applyHorizonPlan(plan).catch((): HorizonApplyStatus => 'failed');
    if (status === 'applied' || status === 'unchanged' || status === 'partial') options.onStored?.();
    setNote(NOTE_FOR[status]);
  }

  async function propose(make: () => Promise<HorizonPlan | null>, options: HorizonProposeOptions) {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      const plan = await make();
      if (!plan) return;
      const items = plan.proposal.changes;
      if (items.length === 0 && plan.lengths.length === 0) {
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
      setPending({ plan, options });
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
      extraLines={pending.plan.lengths}
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
