// ASCEND: het scherm "Run in detail" (docs/visie/Run in detail.md). Een volledig scherm boven
// het logblad, met een vaste kop, dat laat zien wat je in een run deed: het oordeel en drie
// getallen, het tempo per kilometer, de grafieken over de afstand en de lijst per kilometer
// en per ronde, met bij een test de beste 5 km en de vraag "Telt mee". Alles wat hier staat
// komt uit engine/runDetailView.ts; dit bestand rekent niets en verandert niets aan de log.

import { useEffect, useMemo, useState } from 'react';
import type { SessionLog } from '../../models/training';
import type { RunKm, RunLap } from '../../models/runDetail';
import { useAppData } from '../../state/AppDataContext';
import { useSheetClose } from '../../utils/useSheetClose';
import { formatDateNL } from '../../utils/dates';
import { formatNumberNL } from '../../utils/number';
import { formatPace } from '../../engine/aerobicTrend';
import { isIndoorLog } from '../../engine/sports';
import { isStaleRunDetail } from '../../engine/runDetail';
import { judgmentOptions, testBasisLine, testState } from '../../engine/testJudgment';
import {
  clock,
  compareWithSimilar,
  distanceLabel,
  formKeysOf,
  recurringFastStart,
  runAdvice,
  runPatterns,
  headlineStats,
  heartNote,
  kmBetween,
  kmChips,
  kmWord,
  lapsForList,
  paceBars,
  runKindOf,
  runVerdict,
  sourceLine,
  testHalvesLine,
  testLayout,
} from '../../engine/runDetailView';
import { ensureOutcomeText, ensureRunDetail, type EnsureOutcome } from '../../storage/activityDetail';
import { Portal } from '../Portal';
import { SheetClose } from '../SheetHeader';
import { TextButton } from '../TextButton';
import { TestVerdictCard } from '../TestVerdictCard';
import { Card, Eyebrow, InfoButton, Num, SecondaryButton, Segmented, Stat } from '../ui';
import { DistanceCharts, PaceBarsChart } from './RunDetailCharts';
import { AdviceCard, CompareCard, FormCard, PatternsCard } from './RunDetailExtras';
import { useLegFatigueInputs } from '../LegFatigueCard';
import { useExcludedLogIds } from '../influence/useExcludedLogIds';
import { resolveRunInsight } from '../../engine/runInsightSettings';
import { similarRuns } from '../../engine/runComparison';
import { mainReason, reasonText } from '../../engine/runInsight';
import { painReports } from '../../engine/pain';
import { ExplainSheet, PieceSheet } from './RunDetailSheets';

const dim = { color: 'var(--color-ink-dim)' };
const ink = { color: 'var(--color-ink)' };
// A long run shows its first kilometres and the rest on a tap.
const LIST_FIRST = 12;
const LIST_LONG_KM = 30;

type Piece = { kind: 'km' | 'lap'; index: number };

export function RunDetailScreen({ logId, templateName, onClose }: { logId: string; templateName: string; onClose: () => void }) {
  const { sessionLogs, templates, settings, refresh } = useAppData();
  const { closing, requestClose } = useSheetClose(onClose, 200);
  const log = sessionLogs.find((l) => l.id === logId);
  // A log that is gone (deleted while this was open) closes the screen.
  useEffect(() => {
    if (!log) onClose();
  }, [log, onClose]);
  const [scrolled, setScrolled] = useState(false);

  return (
    <Portal>
      <div
        className={`fixed inset-0 z-[70] overflow-y-auto ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
        style={{ background: 'var(--color-bg)' }}
        role="dialog"
        aria-label="Run in detail"
        onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 4)}
      >
        <div className="mx-auto max-w-md px-4 pb-16">
          <div
            className="sticky top-0 z-10 -mx-4 border-b px-4 pb-2 pt-[max(4px,env(safe-area-inset-top))]"
            style={{ background: 'var(--color-bg)', borderColor: scrolled ? 'var(--color-card-border)' : 'transparent' }}
          >
            <div className="flex h-11 items-center">
              <div className="min-w-0 flex-1"><Eyebrow>Run in detail</Eyebrow></div>
              <SheetClose onClose={requestClose} className="-mr-3" />
            </div>
            <h1 className="font-display text-2xl leading-tight" style={ink}>{templateName}</h1>
            {log && <HeaderLine log={log} />}
          </div>
          {log && <Body log={log} templates={templates} settings={settings} refresh={refresh} onClose={requestClose} />}
        </div>
      </div>
    </Portal>
  );
}

function HeaderLine({ log }: { log: SessionLog }) {
  const d = log.cardioData ?? log.outdoorData;
  const rd = log.runDetail;
  const km = rd ? rd.totalM / 1000 : d?.distanceKm;
  const parts = [
    formatDateNL(log.completedDate),
    km !== undefined ? `${formatNumberNL(km, 2)} km` : undefined,
    rd ? clock(rd.movingSec) : `${log.durationMinutes} min`,
    isIndoorLog(log) ? 'Loopband' : undefined,
  ].filter(Boolean);
  return <p className="mt-0.5 font-sans text-sm tabular-nums" style={dim}>{parts.join(' · ')}</p>;
}

type AppSettings = ReturnType<typeof useAppData>['settings'];
type Templates = ReturnType<typeof useAppData>['templates'];

function Body({ log, templates, settings, refresh, onClose }: { log: SessionLog; templates: Templates; settings: AppSettings; refresh: () => Promise<void> | void; onClose: () => void }) {
  const { sessionLogs, program } = useAppData();
  const legs = useLegFatigueInputs();
  const excluded = useExcludedLogIds();
  const screen = resolveRunInsight(settings.runInsight);
  const rd = log.runDetail;
  const d = log.cardioData ?? log.outdoorData;
  const stale = !!rd && isStaleRunDetail(rd, d?.distanceKm ?? 0, d?.durationMinutes || log.durationMinutes);
  const kind = runKindOf(log, templates);
  const indoor = isIndoorLog(log);
  const coverage = log.detail?.quality.heartRateCoveragePct;
  const isTest = kind === 'test';
  const tstate = useMemo(() => (isTest ? testState(sessionLogs, judgmentOptions(settings), log.id) : undefined), [isTest, sessionLogs, settings, log.id]);
  const askTop = tstate?.standing === 'pending' || tstate?.standing === 'held';

  const verdict = useMemo(() => (rd ? runVerdict(rd, kind) : undefined), [rd, kind]);
  const stats = useMemo(() => (rd ? headlineStats(rd, kind) : []), [rd, kind]);
  const bars = useMemo(() => (rd ? paceBars(rd, kind) : undefined), [rd, kind]);
  const layout = useMemo(() => (rd && isTest ? testLayout(rd) : undefined), [rd, isTest]);
  const laps = rd ? lapsForList(rd) : [];
  // 4.7 to 4.10: only what the run has and what is switched on.
  const formKeys = useMemo(() => (rd ? formKeysOf(rd, screen.detail.form) : []), [rd, screen.detail.form]);
  const patterns = useMemo(() => {
    if (!rd || !screen.detail.patterns) return undefined;
    const recurring = kind === 'test' || kind === 'race' || kind === 'blocks' ? recurringFastStart(sessionLogs, templates, log) : undefined;
    return runPatterns(rd, { kind, indoor, recurring, played: { conditions: log.detail?.conditions } });
  }, [rd, screen.detail.patterns, kind, indoor, sessionLogs, templates, log]);
  const compare = useMemo(() => {
    if (!rd) return undefined;
    const c = similarRuns(log, { logs: sessionLogs, templates, program, hr: settings.heartRate, legs, chestStrap: screen.chestStrap, excludedLogIds: excluded });
    const others = c.logs.flatMap((l) => (l.runDetail ? [l.runDetail] : []));
    const result = c.enough ? compareWithSimilar(rd, others) : undefined;
    const reason = mainReason(c.reasons);
    return { result, reason: reason ? reasonText(reason, 'runs') : undefined };
  }, [rd, log, sessionLogs, templates, program, settings.heartRate, legs, screen.chestStrap, excluded]);
  const advice = useMemo(
    () => (rd && screen.detail.advice ? runAdvice(rd, kind, { pain: painReports(log).length > 0, feltWorse: log.subjectiveFeel === 'worse', indoor }) : undefined),
    [rd, screen.detail.advice, kind, log, indoor],
  );
  const meanPace = rd && rd.totalM > 0 ? (rd.movingSec / rd.totalM) * 1000 : 0;

  const [selected, setSelected] = useState<number | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const [mode, setMode] = useState<'km' | 'lap'>(bars?.by === 'lap' ? 'lap' : 'km');
  const [open, setOpen] = useState<Piece | null>(null);
  const [info, setInfo] = useState<'bars' | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Fetching the kilometres for a run that has none: a limit in time and a visible outcome.
  const [fetching, setFetching] = useState(false);
  const [outcome, setOutcome] = useState<EnsureOutcome | undefined>();
  async function fetchNow() {
    if (fetching) return;
    setFetching(true);
    setOutcome(undefined);
    const r = await ensureRunDetail(log.id, { timeoutMs: 15_000 });
    setOutcome(r);
    setFetching(false);
    if (r === 'added') await refresh();
  }

  if (!rd) {
    const pace = d?.distanceKm ? (log.durationMinutes * 60) / d.distanceKm : undefined;
    const text = outcome ? ensureOutcomeText(outcome) : undefined;
    return (
      <div className="mt-3 flex flex-col gap-3">
        <Card texture>
          <Eyebrow>Hoe de run liep</Eyebrow>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <Stat label="Tijd" value={`${log.durationMinutes}`} unit="min" />
            {d?.distanceKm !== undefined && <Stat label="Afstand" value={formatNumberNL(d.distanceKm, 2)} unit="km" />}
            {pace !== undefined && <Stat label="Tempo" value={formatPace(pace)} unit="/km" />}
          </div>
          <p className="mt-3 text-sm leading-snug" style={dim}>
            {fetching ? 'Gegevens ophalen…' : text ?? 'Voor kilometer na kilometer heb je de gegevens van je horloge nodig.'}
          </p>
          {log.externalId && !fetching && outcome !== 'off' && outcome !== 'no-link' && (
            <div className="mt-1"><TextButton onClick={() => void fetchNow()}>{outcome === 'failed' || outcome === 'timeout' ? 'Opnieuw proberen' : 'Gegevens ophalen'}</TextButton></div>
          )}
          {!log.externalId && <p className="mt-1 text-xs" style={dim}>Koppel je horloge bij Meer, Koppelingen.</p>}
        </Card>
        <SecondaryButton onClick={onClose}>Begrepen</SecondaryButton>
      </div>
    );
  }

  const kmOf = (i: number): RunKm | undefined => rd.kms.find((k) => k.index === i);
  const lapOf = (i: number): RunLap | undefined => laps.find((l) => l.index === i);
  const barLabel = (i: number) => {
    if (bars?.by === 'lap') {
      const l = lapOf(i);
      return l ? `Ronde ${i}: ${l.paceSecKm ? `${formatPace(l.paceSecKm)} per km` : clock(l.sec)}${l.hrAvg ? `, hartslag ${Math.round(l.hrAvg)}` : ''}` : '';
    }
    const k = kmOf(i);
    return k ? `Km ${i}${k.partial ? ` (${distanceLabel(k.distanceM)})` : ''}: ${formatPace(k.paceSecKm)} per km${k.hrAvg ? `, hartslag ${Math.round(k.hrAvg)}` : ''}` : '';
  };
  const selectedBand = (() => {
    if (selected === null) return undefined;
    const p = bars?.by === 'lap' ? lapOf(selected) : kmOf(selected);
    return p ? { startM: p.startM, endM: p.endM } : undefined;
  })();
  const best = isTest && rd.bestFive ? { startM: rd.bestFive.startM, endM: rd.bestFive.endM } : undefined;
  const hrNote = heartNote(rd, coverage);
  const listKms = rd.kms.length > LIST_LONG_KM && !showAll ? rd.kms.slice(0, LIST_FIRST) : rd.kms;
  const testCard = isTest && tstate ? <Card><TestVerdictCard logId={log.id} /></Card> : null;

  return (
    <div className="mt-3 flex flex-col gap-3">
      {stale && <p className="text-sm leading-snug" style={dim}>De run is gecorrigeerd bij intervals.icu. De kilometers hieronder horen bij de vorige getallen en worden opnieuw gelezen.</p>}

      {/* 4.2: binnen twee seconden */}
      <Card texture>
        <Eyebrow>Hoe de run liep</Eyebrow>
        {verdict && (
          <>
            <p className="mt-2 font-display text-2xl leading-tight" style={ink}>{verdict.word}</p>
            <p className="mt-1 text-sm leading-snug" style={ink}>{verdict.sentence}</p>
          </>
        )}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.key} className="min-w-0">
              <Stat label={s.label} value={s.value} unit={s.unit} />
              <p className="mt-1 text-xs leading-snug" style={dim}>{s.note}</p>
            </div>
          ))}
        </div>
        {isTest && tstate && !askTop && <p className="mt-3 text-xs" style={dim}>{testBasisLine(tstate.result)}</p>}
      </Card>

      {/* 4.3: de open vraag bij een test */}
      {askTop && testCard}

      {/* 6.2: zo was je test opgebouwd */}
      {layout && (
        <Card>
          <Eyebrow>Zo was je test opgebouwd</Eyebrow>
          <div className="mt-3 flex h-3 overflow-hidden rounded-full" aria-hidden="true">
            <span style={{ width: `${layout.warmFrac * 100}%`, background: 'var(--color-track)' }} />
            <span style={{ width: `${layout.bestFrac * 100}%`, background: 'var(--color-action)' }} />
            <span style={{ width: `${layout.coolFrac * 100}%`, background: 'var(--color-track)' }} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
            <div className="min-w-0">
              <p className="text-xs" style={dim}>Inlopen</p>
              <p className="font-sans tabular-nums" style={ink}>{distanceLabel(layout.warm.m)}</p>
              <p className="font-sans text-xs tabular-nums" style={dim}>in {clock(layout.warm.sec)}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs" style={{ color: 'var(--color-action)' }}>Beste 5 km</p>
              <p className="font-sans tabular-nums" style={ink}>{clock(layout.best.sec)}</p>
              <p className="font-sans text-xs tabular-nums" style={dim}>{formatPace(layout.best.sec / 5)} per km</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs" style={dim}>Uitlopen</p>
              <p className="font-sans tabular-nums" style={ink}>{distanceLabel(layout.cool.m)}</p>
              <p className="font-sans text-xs tabular-nums" style={dim}>in {clock(layout.cool.sec)}</p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-snug" style={dim}>Je test telt met alleen het stuk in het midden. Het inlopen en uitlopen telden niet mee.</p>
          {testHalvesLine(layout.halves) && <p className="mt-2 font-sans text-sm tabular-nums leading-snug" style={ink}>{testHalvesLine(layout.halves)}</p>}
        </Card>
      )}

      {/* 4.4: tempo per kilometer */}
      {bars && rd.kms.length >= 2 ? (
        <Card>
          <div className="flex items-center justify-between gap-2">
            <Eyebrow>{bars.by === 'lap' ? 'Tempo per ronde' : 'Tempo per kilometer'}</Eyebrow>
            <InfoButton onClick={() => setInfo('bars')} label="Over tempo per kilometer" />
          </div>
          <div className="mt-2">
            <PaceBarsChart bars={bars} selected={selected} onSelect={(i) => { setSelected(i); if (bars.by === 'lap') setMode('lap'); }} label={barLabel} />
          </div>
        </Card>
      ) : (
        <Card>
          <Eyebrow>Tempo per kilometer</Eyebrow>
          <p className="mt-2 text-sm" style={dim}>Te kort voor een verdeling.</p>
        </Card>
      )}

      {/* 4.5: over de afstand */}
      <Card>
        <Eyebrow>Over de afstand</Eyebrow>
        <div className="mt-2">
          <DistanceCharts line={rd.line} best={best} selectedKm={selectedBand} hr={settings.heartRate} cursor={cursor} onCursor={setCursor} />
        </div>
        {hrNote && <p className="mt-2 text-xs leading-snug" style={dim}>{hrNote}</p>}
        {rd.pauseSec > 0 && <p className="mt-1 font-sans text-xs tabular-nums" style={dim}>Je stond samen {clock(rd.pauseSec)} stil; dat telt niet mee in je tempo.</p>}
      </Card>

      {/* 4.6: per kilometer en per ronde */}
      <Card>
        {laps.length > 0 ? (
          <Segmented
            tall
            label="Lijst"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'km', label: 'Per kilometer' },
              { value: 'lap', label: 'Per ronde' },
            ]}
          />
        ) : (
          <Eyebrow>Per kilometer</Eyebrow>
        )}
        <div className="mt-2 flex flex-col">
          {mode === 'lap' && laps.length > 0
            ? laps.map((l) => (
                <PieceRow
                  key={l.index}
                  number={l.index}
                  main={l.paceSecKm ? `${formatPace(l.paceSecKm)} /km` : clock(l.sec)}
                  time={`${distanceLabel(l.distanceM)} · ${clock(l.sec)}`}
                  hr={l.hrAvg}
                  chips={[l.kind === 'work' ? 'werk' : l.kind === 'recovery' ? 'herstel' : undefined, l.label, ...kmChips(l)].filter((x): x is string => !!x)}
                  barFrac={undefined}
                  dimmed={l.kind === 'recovery'}
                  selected={selected === l.index && bars?.by === 'lap'}
                  onClick={() => { setSelected(l.index); setOpen({ kind: 'lap', index: l.index }); }}
                />
              ))
            : listKms.map((k) => (
                <PieceRow
                  key={k.index}
                  number={k.index}
                  main={`${formatPace(k.paceSecKm)} /km`}
                  time={k.partial ? `${distanceLabel(k.distanceM)} in ${clock(k.sec)}` : (k.pauseSec ?? 0) >= 1 ? `${clock(k.sec + (k.pauseSec ?? 0))} met stilstaan` : undefined}
                  hr={k.hrAvg}
                  chips={kmChips(k)}
                  barFrac={Math.min(...rd.kms.map((x) => x.paceSecKm)) / k.paceSecKm}
                  dimmed={!!best && !((k.startM + k.endM) / 2 >= best.startM && (k.startM + k.endM) / 2 <= best.endM)}
                  selected={selected === k.index && bars?.by !== 'lap'}
                  onClick={() => { setSelected(k.index); setOpen({ kind: 'km', index: k.index }); }}
                />
              ))}
        </div>
        {mode === 'km' && rd.kms.length > LIST_LONG_KM && !showAll && (
          <div className="mt-1"><TextButton onClick={() => setShowAll(true)}>Alle {rd.kms.length} kilometer tonen</TextButton></div>
        )}
      </Card>

      {/* 4.7 tot 4.10 */}
      {formKeys.length > 0 && <FormCard rd={rd} keys={formKeys} />}
      {patterns && <PatternsCard patterns={patterns} />}
      {compare && <CompareCard rd={rd} comparison={compare.result} reason={compare.reason} />}
      {advice && <AdviceCard advice={advice} />}

      {/* 6.3: geen open vraag, dan onderaan */}
      {!askTop && testCard}

      {/* 4.11: voet */}
      <p className="text-xs leading-snug" style={dim}>{indoor ? 'Gegevens van je horloge via intervals.icu. Op een loopband komen afstand en tempo van de band of je pols.' : sourceLine(coverage)}</p>
      <SecondaryButton onClick={onClose}>Begrepen</SecondaryButton>

      {open && (() => {
        const list = open.kind === 'km' ? rd.kms : laps;
        const at = list.findIndex((p) => p.index === open.index);
        const piece = list[at];
        if (!piece) return null;
        const go = (step: number) => {
          const next = list[at + step];
          if (next) { setOpen({ kind: open.kind, index: next.index }); setSelected(next.index); }
        };
        return (
          <PieceSheet
            key={`${open.kind}-${open.index}`}
            piece={piece}
            kind={open.kind}
            word={open.kind === 'km' ? kmWord(piece as RunKm, meanPace) : undefined}
            between={open.kind === 'km' ? kmBetween(rd, piece as RunKm) : []}
            onPrev={at > 0 ? () => go(-1) : undefined}
            onNext={at < list.length - 1 ? () => go(1) : undefined}
            onClose={() => setOpen(null)}
          />
        );
      })()}
      {info === 'bars' && (
        <ExplainSheet
          eyebrow="Tempo per kilometer"
          title="Wat je ziet"
          onClose={() => setInfo(null)}
          points={[
            { head: 'Een staaf', text: 'is een kilometer, of bij een training met blokken een ronde van je horloge. Hoger is sneller.' },
            { head: 'De basis', text: 'is niet nul maar iets onder je traagste kilometer, zodat de verschillen te zien zijn.' },
            { head: 'Uitgerekend', text: 'uit de afstand en de tijd van je horloge, zonder de tijd dat je stilstond.' },
            { head: 'De laatste', text: 'is vaak korter dan een kilometer. Die staaf is smaller en het tempo staat er per kilometer bij.' },
            { head: 'Een amber stip', text: 'staat bij een kilometer die meer dan 5 procent van je gemiddelde af lag. Eén kilometer schommelt door de gps al zo\'n 3 procent.' },
          ]}
        />
      )}
    </div>
  );
}

function PieceRow({ number, main, time, hr, chips, barFrac, dimmed, selected, onClick }: {
  number: number;
  main: string;
  time?: string;
  hr?: number;
  chips: string[];
  barFrac: number | undefined;
  dimmed: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-sheet-from
      aria-pressed={selected}
      className="flex min-h-[56px] w-full flex-col justify-center gap-1 border-t py-2 text-left first:border-t-0 active:bg-black/20"
      style={{ borderColor: 'var(--color-card-border)', opacity: dimmed ? 0.6 : 1 }}
    >
      <span className="flex w-full items-baseline gap-3 font-sans tabular-nums">
        <span className="w-6 shrink-0 text-sm" style={{ color: selected ? 'var(--color-action)' : 'var(--color-ink-dim)' }}>{number}</span>
        <span className="min-w-0 flex-1 text-base font-semibold" style={ink}>{main}</span>
        {time && <span className="shrink-0 text-sm" style={dim}>{time}</span>}
        {hr !== undefined && <span className="w-16 shrink-0 text-right text-sm" style={dim}><Num>{Math.round(hr)}</Num> <span className="text-xs">bpm</span></span>}
      </span>
      {barFrac !== undefined && (
        <span className="ml-9 block h-1 rounded-full" style={{ background: 'var(--color-track)' }} aria-hidden="true">
          <span className="block h-1 rounded-full" style={{ width: `${Math.round(barFrac * 100)}%`, background: 'var(--color-action)' }} />
        </span>
      )}
      {chips.length > 0 && <span className="ml-9 block text-xs leading-snug" style={dim}>{chips.join(' · ')}</span>}
    </button>
  );
}
