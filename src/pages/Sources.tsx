// ASCEND — Bronnen: every source behind the app's advice in one local
// place (engine/sourceLibrary.ts), grouped by kind, each with where in the
// app it is used.
//
// 300 sources in one long list were too much to scroll, so the page opens as
// five rows, one per kind, with the number of sources. A tap opens a row. The
// search field filters on title (and publisher, kind of study and where it is
// used) and then shows what it found, grouped. What is open stays as it was when
// you come back (usePageState).

import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppData } from '../state/AppDataContext';
import { buildSourceLibrary, searchSources, CATEGORY_LABEL, type LibrarySource, type SourceCategory } from '../engine/sourceLibrary';
import { Card, Eyebrow, PageHeader } from '../components/ui';
import { DisclosureRow } from '../components/DisclosureRow';
import { usePageState } from '../components/usePageState';
import { Icon } from '../components/icons';

const CATEGORY_ORDER: SourceCategory[] = ['wetenschap', 'training', 'bergsport', 'garmin', 'macrofactor', 'afbeeldingen'];

const isCategoryList = (v: unknown) => Array.isArray(v) && v.every((c) => (CATEGORY_ORDER as readonly unknown[]).includes(c));
const isKeyList = (v: unknown) => Array.isArray(v) && v.every((k) => typeof k === 'string');

export function SourcesPage() {
  const { templateById } = useAppData();
  const library = useMemo(() => buildSourceLibrary((id) => templateById.get(id)?.name ?? id), [templateById]);
  const [query, setQuery] = usePageState('query', '');
  // /bronnen?soort=afbeeldingen opent die soort meteen (de naamsvermelding bij een tekening wijst hierheen).
  const [params] = useSearchParams();
  const wanted = CATEGORY_ORDER.find((c) => c === params.get('soort'));
  const [openCategories, setOpenCategories] = usePageState<SourceCategory[]>('open', wanted ? [wanted] : [], isCategoryList);
  const [openSources, setOpenSources] = usePageState<string[]>('open-sources', [], isKeyList);
  const searching = query.trim().length > 0;

  const shown = useMemo(() => searchSources(library, query), [library, query]);
  const groups = CATEGORY_ORDER.map((category) => ({ category, sources: shown.filter((s) => s.category === category) })).filter((g) => g.sources.length > 0);

  const toggleCategory = (c: SourceCategory) => setOpenCategories((list) => (list.includes(c) ? list.filter((x) => x !== c) : [...list, c]));
  const toggleSource = (key: string) => setOpenSources((list) => (list.includes(key) ? list.filter((x) => x !== key) : [...list, key]));

  return (
    <div className="animate-page-in flex flex-col gap-4 px-4 pb-10 pt-6">
      <PageHeader eyebrow="Kennis" title="Bronnen" line="Waar de adviezen in ASCEND op gebaseerd zijn" />

      <label className="relative block">
        <span className="sr-only">Zoek op onderwerp, training of bron</span>
        <span className="pointer-events-none absolute left-3 top-3" style={{ color: 'var(--color-ink-dim)' }}><Icon name="zoeken" size={20} /></span>
        <input
          type="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Zoek op onderwerp, training of bron"
          className="min-h-[44px] w-full rounded-xl border bg-transparent py-2 pl-10 pr-3 text-base"
          style={{ borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' }}
        />
      </label>

      {searching ? (
        shown.length === 0 ? (
          <p role="status" className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>Geen bronnen gevonden.</p>
        ) : (
          <>
            <p role="status" className="text-sm tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>
              {shown.length === 1 ? '1 bron gevonden' : `${shown.length} bronnen gevonden`}
            </p>
            {groups.map(({ category, sources }) => (
              <Card key={category} className="flex flex-col gap-1">
                <Eyebrow>{CATEGORY_LABEL[category]}</Eyebrow>
                <SourceList sources={sources} openKeys={openSources} onToggle={toggleSource} />
              </Card>
            ))}
          </>
        )
      ) : (
        <Card className="flex flex-col py-1">
          {groups.map(({ category, sources }, i) => (
            <div key={category} className={i === 0 ? '' : 'border-t'} style={{ borderColor: 'var(--color-card-border)' }}>
              <DisclosureRow title={CATEGORY_LABEL[category]} value={sources.length} open={openCategories.includes(category)} onToggle={() => toggleCategory(category)}>
                <SourceList sources={sources} openKeys={openSources} onToggle={toggleSource} />
              </DisclosureRow>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function SourceList({ sources, openKeys, onToggle }: { sources: LibrarySource[]; openKeys: string[]; onToggle: (key: string) => void }) {
  return (
    <ul className="flex flex-col pb-1">
      {sources.map((s) => <SourceItem key={s.key} source={s} open={openKeys.includes(s.key)} onToggle={() => onToggle(s.key)} />)}
    </ul>
  );
}

function SourceItem({ source, open, onToggle }: { source: LibrarySource; open: boolean; onToggle: () => void }) {
  const byline = [source.publisher && source.publisher !== CATEGORY_LABEL[source.category] ? source.publisher : undefined, source.meta].filter(Boolean).join(' · ');
  const moreToShow = source.usedIn.length > 1 || (!!source.originalTitle && source.originalTitle !== source.title);
  const text = (
    <>
      <span className="block text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{source.title}</span>
      {byline && <span className="mt-0.5 block text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{byline}</span>}
      <span className="mt-0.5 block text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
        {source.usedIn.length === 1 ? source.usedIn[0] : `Gebruikt bij ${source.usedIn.length} onderdelen`}
      </span>
    </>
  );
  return (
    <li className="border-t first:border-t-0" style={{ borderColor: 'var(--color-card-border)' }}>
      <div className="flex items-start gap-1">
        {moreToShow ? (
          <button type="button" onClick={onToggle} aria-expanded={open} className="min-h-[44px] min-w-0 flex-1 py-2.5 text-left">{text}</button>
        ) : (
          <div className="min-h-[44px] min-w-0 flex-1 py-2.5">{text}</div>
        )}
        {source.url && (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open bron: ${source.title}`}
            className="flex h-11 w-11 shrink-0 items-center justify-center"
            style={{ color: 'var(--color-action)' }}
          >
            <Icon name="buiten" size={18} />
          </a>
        )}
      </div>
      {open && moreToShow && (
        <div className="mb-2 flex flex-col gap-1 rounded-xl border p-3" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-surface)' }}>
          {source.originalTitle && source.originalTitle !== source.title && (
            <p className="text-xs italic leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{source.originalTitle}</p>
          )}
          {source.usedIn.length > 1 && (
            <>
              <Eyebrow>Gebruikt bij</Eyebrow>
              <ul className="flex flex-col gap-0.5">
                {source.usedIn.map((u) => <li key={u} className="text-xs leading-snug" style={{ color: 'var(--color-ink)' }}>{u}</li>)}
              </ul>
            </>
          )}
        </div>
      )}
    </li>
  );
}
