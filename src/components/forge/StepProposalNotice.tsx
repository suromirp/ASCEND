// Het voorstel voor een stap omhoog of omlaag op een calisthenicsladder, bovenaan de training waar de oefening in
// staat (engine/skillStepProposal.ts). Pas na Akkoord verandert er iets: de plek in je krachttraining wordt de nieuwe
// stap (engine/stepSwaps.ts), vanaf je volgende training; deze training blijft zoals hij is. Liever niet laat precies
// deze stap met rust. Na Akkoord kan Ongedaan maken. Besluit: docs/beslissingen/2026-11-09-calisthenics-stapvoorstel.md.

import { useEffect, useMemo, useRef, useState } from 'react';
import { forgeSlotsFor } from '../../engine/forgeSlots';
import { stepProposals, stepProposalText, withStepAccepted, withStepUndone, type StepProposal } from '../../engine/skillStepProposal';
import type { StepSwaps } from '../../engine/stepSwaps';
import { resolveStrengthSettings } from '../../engine/strengthSettings';
import { useAppData } from '../../state/AppDataContext';
import { todayISO } from '../../utils/dates';
import { readStepDeclines, rememberStepDecline } from '../../utils/stepDeclines';
import { TextButton } from '../TextButton';
import { Eyebrow, SecondaryButton } from '../ui';

// Opslaan is lokaal en snel; na deze tijd zegt de kaart dat het niet op tijd lukte (zoals Spieren voor de berg).
const SAVE_LIMIT_MS = 8000;

type State = 'open' | 'busy' | 'done' | 'failed' | 'undoing' | 'undone' | 'undoFailed';

export function StepProposalNotice({ templateId, className = 'mb-2' }: { templateId: string; className?: string }) {
  const { sessionLogs, templates, settings, updateSettings } = useAppData();
  const [declines, setDeclines] = useState(readStepDeclines);
  const [state, setState] = useState<State>('open');
  // Na Akkoord blijft het voorstel staan als bevestiging, met wat er daarvoor stond voor Ongedaan maken.
  const [accepted, setAccepted] = useState<{ proposal: StepProposal; before: { stepSwaps?: StepSwaps } } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
    };
  }, []);
  const live = useMemo(() => {
    const strength = resolveStrengthSettings(settings.strengthModel);
    const today = todayISO();
    return stepProposals({
      on: strength.stepProposal,
      logs: sessionLogs,
      today,
      templates,
      exercisesOf: (t) => forgeSlotsFor(t, settings.strengthModel, today),
      declined: declines,
    }).find((p) => p.targets.some((t) => t.templateId === templateId)) ?? null;
  }, [templateId, sessionLogs, templates, settings.strengthModel, declines]);
  const proposal = accepted?.proposal ?? live;
  if (!proposal) return null;
  const text = stepProposalText(proposal);

  // Eén opslag met een grens in tijd. Een late gelukte opslag telt alsnog als gelukt.
  async function save(next: typeof settings.strengthModel, ok: () => void, failed: () => void) {
    const write = updateSettings({ strengthModel: next });
    let saved = false;
    write.then(() => {
      saved = true;
      if (mounted.current) ok();
    }, () => undefined);
    const limit = new Promise<never>((_, reject) => {
      timer.current = setTimeout(() => reject(new Error('tijd')), SAVE_LIMIT_MS);
    });
    try {
      await Promise.race([write, limit]);
    } catch {
      if (!saved && mounted.current) failed();
    } finally {
      clearTimeout(timer.current);
    }
  }

  function accept() {
    if (!proposal || accepted) return;
    const shown = proposal;
    const before = { stepSwaps: settings.strengthModel?.stepSwaps };
    setAccepted({ proposal: shown, before });
    setState('busy');
    void save(withStepAccepted(settings.strengthModel, shown), () => {
      setAccepted({ proposal: shown, before });
      setState('done');
    }, () => {
      setAccepted(null);
      setState('failed');
    });
  }

  function undo() {
    if (!accepted) return;
    setState('undoing');
    void save(withStepUndone(settings.strengthModel, accepted.proposal, accepted.before), () => setState('undone'), () => setState('undoFailed'));
  }

  function decline() {
    if (!proposal) return;
    // Alleen dit voorstel; een voorstel voor een andere stap komt wel terug.
    setDeclines(rememberStepDecline(proposal.id));
    setState('open');
  }

  const ink = { color: 'var(--color-ink)' };
  const decided = state === 'done' || state === 'undoing' || state === 'undoFailed';
  return (
    <div className={`mx-row-in ${className}`} role="group" aria-label="Stap op de ladder" data-testid="forge-stapvoorstel">
      <Eyebrow>{proposal.kind === 'harder' ? 'Volgende stap' : 'Lichtere stap'}</Eyebrow>
      <div className="mt-2 flex flex-col gap-1.5">
        <p className="text-sm leading-relaxed" style={ink}>{text.fact}</p>
        {state === 'undone' ? (
          <p role="status" className="text-sm leading-relaxed" style={ink}>Je plan staat weer op {proposal.fromName}.</p>
        ) : decided ? (
          <>
            <p role="status" className="text-sm leading-relaxed" style={ink}>
              Je plan staat op {proposal.toName}. Je ziet het vanaf je volgende training; deze training blijft zoals hij is.
            </p>
            {state === 'undoFailed' && <p role="status" className="text-xs" style={{ color: 'var(--color-warning)' }}>Ongedaan maken lukte niet op tijd. Probeer het nog eens.</p>}
            <div className="-mb-1">
              <TextButton tone="dim" disabled={state === 'undoing'} onClick={undo}>Ongedaan maken</TextButton>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm leading-relaxed" style={ink}>{text.question}</p>
            <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{text.where} {text.keeps}</p>
            {state === 'failed' && <p role="status" className="text-xs" style={{ color: 'var(--color-warning)' }}>Opslaan lukte niet op tijd. Probeer het nog eens; je plan is niet veranderd.</p>}
            <div className="mt-1 flex gap-3">
              <SecondaryButton disabled={state === 'busy'} onClick={decline}>Liever niet</SecondaryButton>
              <SecondaryButton disabled={state === 'busy'} onClick={accept}>Akkoord</SecondaryButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
