// ASCEND: het zoekveld en de filters per training bovenaan de lijst van Forge.
// Alleen weergave: de zoekterm en het filter komen van de pagina (usePageState).

import { Icon } from '../icons';
import { Chip } from '../ui';

export function ForgeFilters({
  query,
  onQuery,
  trainings,
  training,
  onTraining,
}: {
  query: string;
  onQuery: (q: string) => void;
  // De namen van de trainingen waar oefeningen in gelogd zijn, uit de echte templates.
  trainings: string[];
  training: string | null;
  onTraining: (t: string | null) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <label className="relative block">
        <span className="sr-only">Zoek een oefening</span>
        <span className="pointer-events-none absolute left-3 top-3" style={{ color: 'var(--color-ink-dim)' }}><Icon name="zoeken" size={20} /></span>
        <input
          type="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Zoek een oefening"
          className="min-h-[44px] w-full rounded-xl border bg-transparent py-2 pl-10 pr-3 text-base"
          style={{ borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' }}
        />
      </label>
      {trainings.length > 1 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]" role="group" aria-label="Filter op training">
          <span className="shrink-0"><Chip selected={training === null} onClick={() => onTraining(null)}>Alles</Chip></span>
          {trainings.map((t) => (
            <span key={t} className="shrink-0 whitespace-nowrap"><Chip selected={training === t} onClick={() => onTraining(training === t ? null : t)}>{t}</Chip></span>
          ))}
        </div>
      )}
    </div>
  );
}
