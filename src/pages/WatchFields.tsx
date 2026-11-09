// ASCEND: Datavelden voor je horloge (/horloge/datavelden, docs/ontwerp/datavelden-horloge.md).
// Per soort training de datapagina's voor je horloge, getekend op een rond scherm, met het advies en één zin
// waarom, twee eigen versies ernaast en de stappen om het op het horloge te zetten. Het plant niets en verandert
// geen training. Alle logica staat in engine/watchFields.ts; dit bestand legt het bij elkaar en tekent.

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { WatchFieldSheet } from '../components/watch/WatchFieldSheet';
import { WatchPager } from '../components/watch/WatchPager';
import { WatchStepsCard } from '../components/watch/WatchStepsCard';
import { TextButton } from '../components/TextButton';
import { Card, Chip, Eyebrow, PageHeader, SecondaryButton, Segmented } from '../components/ui';
import { settingsAdvancedRoute } from '../data/settingsLayout';
import {
  WATCH_KINDS,
  cleanWatchFieldStore,
  copyOfAdvice,
  firstFreeSlot,
  isWatchKind,
  replacedLine,
  resolveVersion,
  resolveWatchModel,
  storeWith,
  versionDiff,
  watchAdvice,
  watchPageState,
  withField,
  withFieldCount,
  withPageAdded,
  withPageRemoved,
  type WatchKindId,
  type WatchSlot,
  type WatchVersion,
} from '../engine/watchFields';
import { useAppData } from '../state/AppDataContext';
import { TimeoutError, withTimeout } from '../utils/withTimeout';

type Tab = 'advice' | WatchSlot;
const SLOT_NAME: Record<WatchSlot, string> = { v2: 'Versie 2', v3: 'Versie 3' };
const UNDO_MS = 6000;
const SAVE_MS = 5000;

export function WatchFieldsPage() {
  const { settings, updateSettings } = useAppData();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const model = resolveWatchModel(settings.watchModel);
  const asked = params.get('soort');
  // Zonder ?soort= opent de pagina op Zone 2; een soort die niet bestaat geeft de lege stand.
  const [kind, setKind] = useState<WatchKindId | undefined>(() => (asked === null ? 'zone2' : isWatchKind(asked) ? asked : undefined));
  const [tab, setTab] = useState<Tab>('advice');
  const [page, setPage] = useState(0);
  const [sheet, setSheet] = useState<{ page: number; cell: number } | null>(null);
  const [notice, setNotice] = useState<string>();
  const [saveFailed, setSaveFailed] = useState(false);
  const [undo, setUndo] = useState<{ kind: WatchKindId; slot: WatchSlot; version: WatchVersion }>();
  const undoTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(undoTimer.current), []);

  const state = watchPageState(settings, kind, model);
  const advice = watchAdvice(kind, model);
  const store = settings.watchFieldVersions;

  if (state === 'off') {
    return (
      <div className="animate-page-in flex flex-col gap-5 px-4 pb-10 pt-6">
        <PageHeader eyebrow="Je horloge" title="Datavelden" />
        <Card className="flex flex-col gap-3">
          <p className="font-display text-xl" style={{ color: 'var(--color-ink)' }}>Datavelden staan uit.</p>
          <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>Zet ze aan bij Instellingen.</p>
          <div className="flex"><SecondaryButton onClick={() => navigate(settingsAdvancedRoute('koppelingen'))}>Naar Instellingen</SecondaryButton></div>
        </Card>
      </div>
    );
  }

  const slot: WatchSlot | undefined = tab === 'advice' ? undefined : tab;
  const resolved = kind && slot ? resolveVersion(store, kind, slot, model) : undefined;
  const pages: string[][] = slot ? (resolved?.version.pages ?? []) : (advice?.pages.map((p) => p.fields) ?? []);
  const shownPage = Math.min(page, Math.max(0, pages.length - 1));
  const replaced = replacedLine(resolved?.replaced ?? 0);

  const save = async (next: ReturnType<typeof storeWith>): Promise<boolean> => {
    try {
      await withTimeout(updateSettings({ watchFieldVersions: next }), SAVE_MS);
      setSaveFailed(false);
      return true;
    } catch (e) {
      setSaveFailed(true);
      if (!(e instanceof TimeoutError)) console.warn('Datavelden opslaan lukte niet', e);
      return false;
    }
  };

  const pickKind = (id: WatchKindId) => {
    setKind(id);
    setTab('advice');
    setPage(0);
    setNotice(undefined);
    setSheet(null);
  };
  const changeTab = (next: Tab) => {
    setTab(next);
    setNotice(undefined);
    setSheet(null);
  };

  const openCell = (p: number, cell: number) => {
    if (!kind) return;
    if (!slot && !firstFreeSlot(store, kind)) {
      setNotice('Het advies blijft zoals het is. Pas Versie 2 of 3 aan, of zet er een terug naar advies.');
      return;
    }
    setNotice(undefined);
    setSheet({ page: p, cell });
  };

  const applyField = async (fieldId: string) => {
    if (!kind || !sheet || !advice) return;
    if (slot && resolved) {
      await save(storeWith(store, kind, slot, withField(resolved.version, sheet.page, sheet.cell, fieldId)));
      return;
    }
    const free = firstFreeSlot(store, kind);
    if (!free || advice.pages[sheet.page]?.fields[sheet.cell] === fieldId) return;
    const copy = withField(copyOfAdvice(advice), sheet.page, sheet.cell, fieldId);
    if (await save(storeWith(store, kind, free, copy))) {
      setTab(free);
      setNotice(`Dit staat nu in ${SLOT_NAME[free]}. Het advies blijft zoals het was.`);
    }
  };

  const edit = (next: WatchVersion) => {
    if (kind && slot) void save(storeWith(store, kind, slot, next));
  };

  const resetToAdvice = async () => {
    if (!kind || !slot) return;
    const before = cleanWatchFieldStore(store).store?.[kind]?.[slot];
    if (await save(storeWith(store, kind, slot, undefined))) {
      setTab('advice');
      setNotice(undefined);
      if (before) {
        setUndo({ kind, slot, version: before });
        window.clearTimeout(undoTimer.current);
        undoTimer.current = window.setTimeout(() => setUndo(undefined), UNDO_MS);
      }
    }
  };

  const undoReset = async () => {
    if (!undo) return;
    window.clearTimeout(undoTimer.current);
    if (await save(storeWith(store, undo.kind, undo.slot, undo.version))) {
      setKind(undo.kind);
      setTab(undo.slot);
      setUndo(undefined);
    }
  };

  const diff = slot && resolved ? versionDiff(resolved.version, advice, model) : [];
  const advisedAt = sheet && advice ? advice.pages[sheet.page]?.fields[sheet.cell] : undefined;
  const currentAt = sheet ? pages[sheet.page]?.[sheet.cell] : undefined;

  return (
    <div className="animate-page-in flex flex-col gap-5 px-4 pb-10 pt-6">
      <PageHeader eyebrow="Je horloge" title="Datavelden" />

      <div className="flex flex-wrap gap-2" role="group" aria-label="Soort training">
        {WATCH_KINDS.map((k) => (
          <Chip key={k.id} selected={k.id === kind} onClick={() => pickKind(k.id)}>{k.label}</Chip>
        ))}
      </div>

      {state === 'noAdvice' || !advice ? (
        <Card className="flex flex-col gap-2">
          <p className="font-display text-xl" style={{ color: 'var(--color-ink)' }}>Voor deze training heb ik geen advies.</p>
          <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>Kies een soort die erop lijkt.</p>
        </Card>
      ) : (
        <>
          <Segmented<Tab>
            tall
            label="Advies of eigen versie"
            value={tab}
            onChange={changeTab}
            options={[{ value: 'advice', label: 'Advies' }, { value: 'v2', label: 'Versie 2' }, { value: 'v3', label: 'Versie 3' }]}
          />

          {slot && !resolved ? (
            <Card className="flex flex-col gap-3">
              <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>{SLOT_NAME[slot]} is nog leeg.</p>
              <div className="flex"><SecondaryButton onClick={() => void save(storeWith(store, advice.kind, slot, copyOfAdvice(advice)))}>Begin met een kopie van het advies</SecondaryButton></div>
            </Card>
          ) : (
            <section key={`${kind}-${tab}`} className="mx-row-in flex flex-col gap-3" aria-label="Het horloge">
              <div>
                {slot && <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>Jouw versie. Advies voor deze pagina:</p>}
                <p className="text-base" style={{ color: 'var(--color-ink)' }}>
                  {advice.pages[shownPage]?.why ?? 'Deze pagina staat niet in het advies.'}
                </p>
              </div>
              <WatchPager
                model={model}
                pages={pages}
                page={shownPage}
                onPageChange={setPage}
                selected={sheet ?? undefined}
                onPick={openCell}
                contentKey={`${kind}-${tab}`}
              />
              <p className="text-center text-xs" style={{ color: 'var(--color-ink-dim)' }}>De cijfers zijn voorbeelden.</p>
              {replaced && <p className="text-sm" style={{ color: 'var(--color-warning)' }}>{replaced}</p>}
            </section>
          )}

          {notice && <p role="status" className="text-sm" style={{ color: 'var(--color-ink)' }}>{notice}</p>}

          {slot && resolved && (
            <Card className="flex flex-col gap-3">
              <Eyebrow>Velden op deze pagina</Eyebrow>
              <Segmented<number>
                tall
                label="Aantal velden"
                value={resolved.version.pages[shownPage]?.length}
                onChange={(n) => edit(withFieldCount(resolved.version, shownPage, n, model, advice))}
                options={[1, 2, 3, 4].map((n) => ({ value: n, label: String(n) }))}
              />
              <div className="flex items-center justify-between gap-3">
                <SecondaryButton
                  disabled={resolved.version.pages.length >= model.maxPages}
                  onClick={() => { edit(withPageAdded(resolved.version, model)); setPage(resolved.version.pages.length); }}
                >
                  Pagina erbij
                </SecondaryButton>
                {resolved.version.pages.length > 1 && (
                  <TextButton tone="dim" onClick={() => edit(withPageRemoved(resolved.version, shownPage))}>Pagina weghalen</TextButton>
                )}
              </div>
              {diff.length > 0 ? (
                <div className="flex flex-col gap-1.5 border-t pt-3" style={{ borderColor: 'var(--color-card-border)' }}>
                  <Eyebrow>Anders dan het advies</Eyebrow>
                  {diff.map((line) => <p key={line} className="text-sm" style={{ color: 'var(--color-ink)' }}>{line}</p>)}
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>Je versie is gelijk aan het advies.</p>
              )}
            </Card>
          )}

          {slot && resolved && <div className="flex"><TextButton onClick={() => void resetToAdvice()}>Terug naar advies</TextButton></div>}
          {undo && (
            <p role="status" className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-ink)' }}>
              Teruggezet.
              <TextButton tone="dim" onClick={() => void undoReset()}>Ongedaan maken</TextButton>
            </p>
          )}
          {saveFailed && <p role="alert" className="text-sm" style={{ color: 'var(--color-warning)' }}>Opslaan lukte niet. Probeer het opnieuw.</p>}

          {pages.length > 0 && <WatchStepsCard pages={pages} model={model} advice={advice} />}
        </>
      )}

      {sheet && currentAt && (
        <WatchFieldSheet
          model={model}
          page={sheet.page}
          cell={sheet.cell}
          current={currentAt}
          advised={advisedAt}
          onPick={(id) => void applyField(id)}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}
