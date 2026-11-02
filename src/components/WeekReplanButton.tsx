import { useEffect, useRef, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import type { Advice } from '../engine/adviceEngine';
import type { WeekReplanPlan } from '../storage/weekReplan';
import { REPLAN_NO_CHANGE, REPLAN_TITLE, replanSummary } from '../engine/replanWeek';
import { formatShortDayNL } from '../utils/dates';
import { ProposalSheet } from './ProposalSheet';
import { TextButton } from './TextButton';

// "Week opnieuw plannen" onder de week (engine/replanWeek.ts): rekent het voorstel uit als je erom vraagt en
// opent het in "Zo ziet je week eruit", met Liever niet en Akkoord. Er verandert niets zonder Akkoord. Zonder
// verschil zegt het blad dat, met alleen Begrepen. Lukt het rekenen niet binnen de tijd, dan staat dat er.
// Week.tsx geeft hem de week als key: een andere week begint opnieuw.
type State = { step: 'idle' } | { step: 'busy' } | { step: 'failed' } | { step: 'open'; plan: WeekReplanPlan };

export function WeekReplanButton({ weekStart }: { weekStart: string }) {
  const { planWeekReplan, applyWeekReplan } = useAppData();
  const [state, setState] = useState<State>({ step: 'idle' });
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const ask = async () => {
    setState({ step: 'busy' });
    try {
      const plan = await planWeekReplan(weekStart);
      if (!mounted.current) return;
      setState(plan ? { step: 'open', plan } : { step: 'failed' });
    } catch (err) {
      console.error('Week opnieuw plannen kon niet worden uitgerekend:', err);
      if (mounted.current) setState({ step: 'failed' });
    }
  };

  const plan = state.step === 'open' ? state.plan : undefined;
  const changes = plan ? plan.diff.writes.length + plan.diff.removedIds.length : 0;
  const advice: Advice | undefined = plan && {
    id: `replan:${plan.weekStart}`, trigger: 'plan_update', ruleId: 'WEEK-REPLAN', title: REPLAN_TITLE, effect: '', why: '', priority: 0,
    proposal: plan.proposal,
  };

  return (
    <div className="flex flex-col items-start">
      <TextButton tone="dim" icon="verder" data-sheet-from onClick={() => void ask()} disabled={state.step === 'busy'}>
        {state.step === 'busy' ? 'Even rekenen…' : REPLAN_TITLE}
      </TextButton>
      {state.step === 'failed' && (
        <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Dat lukte nu niet. Je week staat nog zoals hij was; probeer het straks nog eens.</p>
      )}
      {plan && advice && (
        <ProposalSheet
          advice={advice}
          eyebrow="Week"
          summary={replanSummary({ changes, caughtUp: plan.caughtUp, nextWeek: plan.nextWeek, testMove: plan.testMove && { name: plan.testMove.name, toLabel: formatShortDayNL(plan.testMove.to) } })}
          emptyText={REPLAN_NO_CHANGE}
          answerless={changes === 0}
          notes={changes > 0 ? plan.notes : undefined}
          previewPass={() => plan.after}
          onRespond={async (response) => {
            if (response === 'accepted') await applyWeekReplan(plan);
          }}
          onClose={() => setState({ step: 'idle' })}
        />
      )}
    </div>
  );
}
