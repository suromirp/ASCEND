// Calisthenics per training: per krachttraining kracht, calisthenics of samen (engine/trainingStyle.ts). Een andere
// keuze is eerst een voorstel met wat er verandert; pas na Akkoord schrijft één opslag alle plekken, met een grens in
// tijd, een zichtbare uitkomst en Ongedaan maken. De planning en je dagen veranderen niet; een sessie die al loopt
// houdt zijn oefeningen (forgeDraft.ts#sessionStepSwaps). Besluit: docs/beslissingen/2026-11-09-calisthenics-planner.md.

import { useEffect, useMemo, useRef, useState } from 'react';
import { STYLE_LABEL, styleChange, styleChangeText, styleTrainings, withStyleAccepted, withStyleUndone, type StyleChange, type TrainingStyle } from '../../../engine/trainingStyle';
import type { StepSwaps } from '../../../engine/stepSwaps';
import { useAppData } from '../../../state/AppDataContext';
import { todayISO } from '../../../utils/dates';
import { saveWithLimit } from '../../forge/stepUndo';
import { TextButton } from '../../TextButton';
import { Segmented } from '../../ui';
import { Sheet } from '../Sheet';

type State = 'open' | 'busy' | 'failed' | 'nofit' | 'done' | 'undoing' | 'undone' | 'undoFailed';

const NOW_LINE: Record<TrainingStyle, string> = {
  strength: 'Met gewicht.',
  calisthenics: 'Met je eigen gewicht, op je ladders.',
  mixed: 'Een deel met gewicht, een deel op je ladders.',
};

export function TrainingStyleSheet({ onClose }: { onClose: () => void }) {
  const { templates, sessionLogs, settings, updateSettings } = useAppData();
  const today = todayISO();
  const [pending, setPending] = useState<StyleChange | null>(null);
  const [accepted, setAccepted] = useState<{ change: StyleChange; before: { stepSwaps?: StepSwaps } } | null>(null);
  const [state, setState] = useState<State>('open');
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const list = useMemo(() => styleTrainings(templates, settings.strengthModel, today), [templates, settings.strengthModel, today]);
  const busy = state === 'busy' || state === 'undoing';

  function pick(templateId: string, style: TrainingStyle) {
    if (busy) return;
    const t = list.find((x) => x.template.id === templateId);
    if (!t) return;
    setAccepted(null);
    setState('open');
    setPending(style === t.style ? null : styleChange({ template: t.template, slots: t.slots, model: settings.strengthModel, style, logs: sessionLogs, today }));
  }

  async function accept() {
    if (!pending || busy) return;
    const change = pending;
    const next = withStyleAccepted(settings.strengthModel, change);
    if (!next) {
      setState('nofit');
      return;
    }
    const before = { stepSwaps: settings.strengthModel?.stepSwaps };
    setState('busy');
    const result = await saveWithLimit(() => updateSettings({ strengthModel: next }), undefined, () => {
      // Een late gelukte opslag telt alsnog: de keuze staat er dan wel.
      if (!mounted.current) return;
      setAccepted({ change, before });
      setPending(null);
      setState('done');
    });
    if (!mounted.current) return;
    if (result === 'done') {
      setAccepted({ change, before });
      setPending(null);
      setState('done');
    } else setState('failed');
  }

  async function undo() {
    if (!accepted || busy) return;
    setState('undoing');
    const back = withStyleUndone(settings.strengthModel, accepted.change, accepted.before);
    const result = await saveWithLimit(() => updateSettings({ strengthModel: back }), undefined, () => {
      if (mounted.current) setState('undone');
    });
    if (mounted.current) setState(result === 'done' ? 'undone' : 'undoFailed');
  }

  const ink = { color: 'var(--color-ink)' };
  const dim = { color: 'var(--color-ink-dim)' };
  return (
    <Sheet eyebrow="Forge" title="Calisthenics per training" line="Kracht met gewicht, calisthenics met je eigen gewicht, of samen." onClose={onClose}>
      {list.length === 0 && <p className="st-hint">Geen krachttraining met duwen of optrekken om op een ladder te zetten.</p>}
      <div className="flex flex-col gap-5">
        {list.map((t) => {
          const mine = pending?.templateId === t.template.id ? pending : null;
          const done = accepted?.change.templateId === t.template.id ? accepted.change : null;
          const text = mine ? styleChangeText(mine) : done ? styleChangeText(done) : null;
          return (
            <div key={t.template.id} data-testid={`soort-${t.template.id}`}>
              <p className="text-[15px] leading-5" style={ink}>{t.template.name}</p>
              <p className="mt-0.5 mb-2 text-[13px] leading-4" style={dim}>{NOW_LINE[t.style]}</p>
              <Segmented
                tall
                label={`Soort van ${t.template.name}`}
                value={mine ? mine.style : t.style}
                onChange={(v) => pick(t.template.id, v)}
                options={t.offered.map((s) => ({ value: s, label: STYLE_LABEL[s], disabled: busy }))}
              />
              {mine && text && (
                <div className="mx-row-in mt-3 flex flex-col gap-1.5" role="group" aria-label="Voorstel">
                  {text.lines.map((line) => <p key={line} className="text-sm leading-relaxed" style={ink}>{line}</p>)}
                  <p className="text-[13px] leading-snug" style={dim}>{text.always} Je planning en je dagen blijven.</p>
                  {state === 'failed' && <p role="status" className="st-hint warn" style={{ margin: 0 }}>Opslaan lukte niet op tijd. Probeer het nog eens; je training is niet veranderd.</p>}
                  {state === 'nofit' && <p role="status" className="st-hint warn" style={{ margin: 0 }}>Dit past niet meer bij je andere trainingen. Er is niets veranderd.</p>}
                  <div className="st-btns">
                    <button type="button" className="st-btn" disabled={busy} onClick={() => { setPending(null); setState('open'); }}>Liever niet</button>
                    <button type="button" className="st-btn gold" disabled={busy || state === 'nofit'} onClick={() => void accept()}>Akkoord</button>
                  </div>
                </div>
              )}
              {!mine && done && text && (
                <div className="mx-row-in mt-3 flex flex-col gap-1.5">
                  <p role="status" className="text-sm leading-relaxed" style={ink}>{state === 'undone' ? text.undone : text.done}</p>
                  {state === 'undoFailed' && <p role="status" className="st-hint warn" style={{ margin: 0 }}>Ongedaan maken lukte niet op tijd. Probeer het nog eens.</p>}
                  {state !== 'undone' && (
                    <div className="-mb-1">
                      <TextButton tone="dim" disabled={busy} onClick={() => void undo()}>Ongedaan maken</TextButton>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}
