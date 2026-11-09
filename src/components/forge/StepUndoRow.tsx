// "Terug naar ... in je plan" in het blad van een oefening: een ladderstap die je na een voorstel met Akkoord in je
// training zette (engine/stepSwaps.ts) gaat weer naar de oefening van het sjabloon, de volgende keer dat je de training
// opent. Deze sessie blijft zoals hij is. Eén opslag met een grens in tijd en een zichtbare uitkomst in de rij zelf; of
// de rij er hoort legt het blad vast bij het openen (stepUndo.ts#stepUndoFrom).

import { useEffect, useRef, useState } from 'react';
import { MenuRow } from './parts';
import { saveWithLimit } from './stepUndo';

export function StepUndoRow({ fromName, onUndo }: { fromName: string; onUndo: () => Promise<unknown> }) {
  const [state, setState] = useState<'open' | 'busy' | 'done' | 'failed'>('open');
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function undo() {
    if (state === 'busy' || state === 'done') return;
    setState('busy');
    const result = await saveWithLimit(onUndo, undefined, () => {
      if (mounted.current) setState('done');
    });
    if (mounted.current) setState(result);
  }

  if (state === 'done') return <MenuRow icon="vinkje" title={`Je plan staat weer op ${fromName}`} sub="Je ziet het de volgende keer dat je deze training opent. Deze sessie blijft zoals hij is." />;
  return (
    <MenuRow
      icon="ruilen"
      title={`Terug naar ${fromName} in je plan`}
      sub={state === 'failed' ? 'Opslaan lukte niet op tijd. Probeer het nog eens.' : 'Je zette je plan op deze stap na een voorstel. Deze sessie blijft zoals hij is.'}
      onClick={state === 'busy' ? undefined : () => void undo()}
    />
  );
}
