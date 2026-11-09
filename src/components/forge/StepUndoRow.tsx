// "Terug naar ... in je plan" in het blad van een oefening: een ladderstap die je na een voorstel met Akkoord in je
// training zette (engine/stepSwaps.ts) gaat weer naar de oefening van het sjabloon, vanaf je volgende training. Deze
// training blijft zoals hij is. Eén opslag met een grens in tijd en een zichtbare uitkomst in de rij zelf.

import { useEffect, useRef, useState } from 'react';
import { MenuRow } from './parts';

const SAVE_LIMIT_MS = 8000;

export function StepUndoRow({ fromName, onUndo }: { fromName: string; onUndo: () => Promise<unknown> }) {
  const [state, setState] = useState<'open' | 'busy' | 'done' | 'failed'>('open');
  const mounted = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
    };
  }, []);

  async function undo() {
    if (state === 'busy' || state === 'done') return;
    setState('busy');
    const write = onUndo();
    let saved = false;
    write.then(() => {
      saved = true;
      if (mounted.current) setState('done');
    }, () => undefined);
    const limit = new Promise<never>((_, reject) => {
      timer.current = setTimeout(() => reject(new Error('tijd')), SAVE_LIMIT_MS);
    });
    try {
      await Promise.race([write, limit]);
    } catch {
      if (!saved && mounted.current) setState('failed');
    } finally {
      clearTimeout(timer.current);
    }
  }

  if (state === 'done') return <MenuRow icon="vinkje" title={`Je plan staat weer op ${fromName}`} sub="Vanaf je volgende training. Deze training blijft zoals hij is." />;
  return (
    <MenuRow
      icon="ruilen"
      title={`Terug naar ${fromName} in je plan`}
      sub={state === 'failed' ? 'Opslaan lukte niet op tijd. Probeer het nog eens.' : 'Je zette je plan op deze stap na een voorstel. Vanaf je volgende training.'}
      onClick={state === 'busy' ? undefined : () => void undo()}
    />
  );
}
