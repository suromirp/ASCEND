import { useEffect, useMemo, useRef, useState } from 'react';
import { withSportNames } from '../engine/sportTemplate';
import { useAppData } from '../state/AppDataContext';
import type { Advice } from '../engine/adviceEngine';
import type { WeekReplanPlan } from '../storage/weekReplan';
import { REPLAN_NO_CHANGE, REPLAN_TITLE, replanPreview, replanSummary } from '../engine/replanWeek';
import { formatShortDayNL } from '../utils/dates';
import { ProposalSheet } from './ProposalSheet';
import { SheetRow } from './SheetRows';
import { REPLAN_BUSY, REPLAN_FAILED, REPLAN_SUB } from '../engine/weekList';

// "Week opnieuw plannen" als rij in de lijst onder de week (engine/replanWeek.ts): rekent het voorstel uit als je erom vraagt en
// opent het in "Zo ziet je week eruit", met Liever niet en Akkoord. Er verandert niets zonder Akkoord. Zonder
// verschil zegt het blad dat, met alleen Begrepen. Tijdens het rekenen zegt de regel onder de rij "Even rekenen…";
// lukt het niet, dan zegt die regel dat.
// Week.tsx geeft hem de week als key: een andere week begint opnieuw.
type State = { step: 'idle' } | { step: 'busy' } | { step: 'failed' } | { step: 'open'; plan: WeekReplanPlan };

export function WeekReplanRow({ weekStart }: { weekStart: string }) {
  const { planWeekReplan, applyWeekReplan, templates } = useAppData();
  const [state, setState] = useState<State>({ step: 'idle' });
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const ask = async () => {
    if (state.step === 'busy') return;
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
  // De lijst in het blad en het aantal wijzigingen komen uit dezelfde bron: plan.diff.
  const preview = useMemo(() => (plan ? replanPreview(plan.stored, plan.after, plan.diff, withSportNames(templates)) : undefined), [plan, templates]);
  const changes = preview?.moves.length ?? 0;
  const advice: Advice | undefined = plan && {
    id: `replan:${plan.weekStart}`, trigger: 'plan_update', ruleId: 'WEEK-REPLAN', title: REPLAN_TITLE, effect: '', why: '', priority: 0,
    proposal: plan.proposal,
  };

  return (
    <>
      <SheetRow title={REPLAN_TITLE} sub={state.step === 'busy' ? REPLAN_BUSY : state.step === 'failed' ? REPLAN_FAILED : REPLAN_SUB} onClick={() => void ask()} sheetFrom />
      {plan && advice && (
        <ProposalSheet
          advice={advice}
          eyebrow="Week"
          summary={replanSummary({ changes, caughtUp: plan.caughtUp, nextWeek: plan.nextWeek, testMove: plan.testMove && { name: plan.testMove.name, toLabel: formatShortDayNL(plan.testMove.to) } })}
          emptyText={REPLAN_NO_CHANGE}
          answerless={changes === 0}
          notes={changes > 0 ? plan.notes : undefined}
          preview={preview}
          onRespond={async (response) => {
            if (response === 'accepted') await applyWeekReplan(plan);
          }}
          onClose={() => setState({ step: 'idle' })}
        />
      )}
    </>
  );
}
