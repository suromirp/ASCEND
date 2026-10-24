// ASCEND — Bronnen: every source behind the app's advice in one local
// place (engine/sourceLibrary.ts), searchable, grouped by kind, each with
// where in the app it is used.

import { useMemo } from 'react';
import { useAppData } from '../state/AppDataContext';
import { buildSourceLibrary, searchSources, CATEGORY_LABEL, type LibrarySource, type SourceCategory } from '../engine/sourceLibrary';
import { Card, Eyebrow, PageHeader } from '../components/ui';
import { usePageState } from '../components/usePageState';
import { Icon } from '../components/icons';

const CATEGORY_ORDER: SourceCategory[] = ['wetenschap', 'training', 'bergsport', 'garmin', 'macrofactor'];

export function SourcesPage() {
  const { templateById } = useAppData();
  const library = useMemo(() => buildSourceLibrary((id) => templateById.get(id)?.name ?? id), [templateById]);
  const [query, setQuery] = usePageState('query', '');
  const [category, setCategory] = usePageState<SourceCategory | undefined>('category', undefined, (v) => v === undefined || (CATEGORY_ORDER as readonly unknown[]).includes(v));
  const shown = searchSources(library, query, category);
  const counts = new Map(CATEGORY_ORDER.map((c) => [c, library.filter((s) => s.category === c).length]));

  return (
    <div className="animate-page-in flex flex-col gap-4 px-4 pb-10 pt-6">
      <PageHeader eyebrow="Kennis" title="Bronnen" line="Waar de adviezen in ASCEND op gebaseerd zijn" />

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Zoek op onderwerp, training of bron"
        className="w-full rounded-xl border px-3 py-2.5 text-sm"
        style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)', color: 'var(--color-ink)' }}
      />

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        <Chip active={!category} onClick={() => setCategory(undefined)}>Alles · {library.length}</Chip>
        {CATEGORY_ORDER.filter((c) => (counts.get(c) ?? 0) > 0).map((c) => (
          <Chip key={c} active={category === c} onClick={() => setCategory(category === c ? undefined : c)}>
            {CATEGORY_LABEL[c]} · {counts.get(c)}
          </Chip>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>Geen bronnen gevonden.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {shown.map((s) => <SourceCard key={s.key} source={s} />)}
        </div>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="min-h-[44px] shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs"
      style={{ borderColor: active ? 'var(--color-action)' : 'var(--color-card-border)', color: active ? 'var(--color-action)' : 'var(--color-ink-dim)' }}
    >
      {children}
    </button>
  );
}

function SourceCard({ source }: { source: LibrarySource }) {
  const [open, setOpen] = usePageState(`open-${source.key}`, false);
  return (
    <Card className="flex flex-col gap-1.5">
      <button onClick={() => setOpen((v) => !v)} className="text-left" aria-expanded={open}>
        <Eyebrow>{[CATEGORY_LABEL[source.category], source.publisher && source.publisher !== CATEGORY_LABEL[source.category] ? source.publisher : undefined].filter(Boolean).join(' · ')}</Eyebrow>
        <p className="mt-0.5 text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{source.title}</p>
        {source.meta && <p className="mt-0.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{source.meta}</p>}
        <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
          {source.usedIn.length === 1 ? source.usedIn[0] : `Gebruikt bij ${source.usedIn.length} onderdelen${open ? '' : ' · meer'}`}
        </p>
      </button>
      {open && (source.usedIn.length > 1 || (source.originalTitle && source.originalTitle !== source.title)) && (
        <div className="mt-1 flex flex-col gap-1 border-t pt-2" style={{ borderColor: 'var(--color-card-border)' }}>
          {source.originalTitle && source.originalTitle !== source.title && (
            <p className="text-xs italic leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{source.originalTitle}</p>
          )}
          {source.usedIn.length > 1 && source.usedIn.map((u) => (
            <p key={u} className="text-xs" style={{ color: 'var(--color-ink)' }}>· {u}</p>
          ))}
        </div>
      )}
      {source.url && (
        <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center self-start text-xs underline underline-offset-2" style={{ color: 'var(--color-sky)' }}>
          Open bron<Icon name="buiten" size={14} className="ml-1 inline align-[-2px]" />
        </a>
      )}
    </Card>
  );
}
