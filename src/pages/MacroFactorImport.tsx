// ASCEND: Meer, MacroFactor inlezen.
//
// The strength workouts come from a MacroFactor export (Workout Log), and so
// does the body weight (the scale weight and/or the trend weight per day,
// engine/macrofactorWeight.ts), as xlsx or CSV. One file may hold both
// (engine/macrofactorFile.ts). The file arrives in one of two ways:
// shared straight to ASCEND on Android ("Delen, ASCEND", see
// public/share-target-sw.js), or picked here with "Kies bestand". ASCEND sees
// by the columns which of the two it is. It is read on this phone and goes
// nowhere else.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BackButton } from '../components/BackButton';
import { MacroFactorCard } from '../components/MacroFactorCard';
import { MacroFactorLeadCard } from '../components/MacroFactorLeadCard';
import { MacroFactorLinkCard } from '../components/MacroFactorLinkCard';
import { Icon } from '../components/icons';
import { Portal } from '../components/Portal';
import { useSheetClose } from '../utils/useSheetClose';
import { Card, Eyebrow, PrimaryButton, SecondaryButton, Toggle } from '../components/ui';
import { useAppData } from '../state/AppDataContext';
import { useMacroFactor } from '../state/useMacroFactor';
import { MacroFactorFormatError, nameKey } from '../engine/macrofactorImport';
import { importSummary, readMacroFactorBytes } from '../engine/macrofactorFile';
import { applyWeightImport, planWeightImport, weightEntryFromDay, type MacroFactorWeightResult, type WeightConflict } from '../engine/macrofactorWeight';
import { hasMacroFactorWeight, MACROFACTOR_FRESH_DAYS } from '../engine/bodyWeight';
import type { WeightEntry } from '../models/metrics';
import { formatNumberNL } from '../utils/number';
import { forgetMapping, importMacroFactorWorkouts, takeSharedFile } from '../storage/macrofactor';
import { daysBetween, formatDateNL, todayISO } from '../utils/dates';

// 'ok' with lines is the calm summary of a file; the other forms are one line.
type Notice = { tone: 'ok' | 'error'; text?: string; lines?: string[]; details?: string };

function countText(n: number): string {
  return n === 1 ? '1 krachttraining' : `${n} krachttrainingen`;
}

function daysText(n: number): string {
  return n === 1 ? '1 dag' : `${n} dagen`;
}

export function MacroFactorImportPage() {
  const { templates, settings, updateSettings, loading } = useAppData();
  const { loaded, state, mapping, plan, rows } = useMacroFactor();
  // Days where you filled in a weight yourself that differs from the file: yours stays, unless you choose otherwise.
  const [conflicts, setConflicts] = useState<WeightConflict[]>([]);
  // A shared file is read once, from an effect that must not see old settings.
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [params, setParams] = useSearchParams();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  // The body weight of a file: new days are stored, a day you filled in
  // yourself stays as it is and is offered below.
  async function storeWeight(file: MacroFactorWeightResult) {
    const current = settingsRef.current;
    const weightPlan = planWeightImport(current.weightEntries, file.days);
    await updateSettings({ weightEntries: applyWeightImport(current.weightEntries, weightPlan) });
    setConflicts(weightPlan.conflicts);
    const lastDay = [...file.days].reverse().find((d) => weightEntryFromDay(d));
    const last = lastDay ? weightEntryFromDay(lastDay) : undefined;
    if (!last) return undefined;
    return { kg: last.kg, date: last.date, basis: last.basis === 'trend' ? ('trend' as const) : ('scale' as const), added: weightPlan.add.length, offInSettings: current.weightFromMacroFactor === false };
  }

  async function readData(data: Uint8Array, name?: string) {
    setBusy(true);
    try {
      const content = await readMacroFactorBytes(data, name);
      const weight = content.weight ? await storeWeight(content.weight) : undefined;
      let workoutCount: number | undefined;
      if (content.workouts) {
        const result = await importMacroFactorWorkouts(content.workouts, name);
        workoutCount = result.count;
      }
      setNotice({ tone: 'ok', lines: importSummary({ weight, workoutCount, ignoredSheets: content.ignoredSheets }, formatDateNL) });
    } catch (err) {
      setNotice(
        err instanceof MacroFactorFormatError
          ? { tone: 'error', text: err.message, details: err.details }
          : { tone: 'error', text: 'ASCEND kan dit bestand niet lezen. Kies de export van MacroFactor als xlsx- of CSV-bestand.' },
      );
    } finally {
      setBusy(false);
    }
  }

  async function takeMacroFactorOnConflicts() {
    const chosen = conflicts;
    setConflicts([]);
    await updateSettings({ weightEntries: applyWeightImport(settingsRef.current.weightEntries, { add: [], conflicts: chosen, same: 0 }, true) });
    setNotice({ tone: 'ok', text: `Het gewicht van MacroFactor is gebruikt voor ${daysText(chosen.length)}.` });
  }

  // A file that arrived through "Delen, ASCEND" is waiting in the cache.
  const shared = params.get('gedeeld');
  useEffect(() => {
    // Wait for the stored settings: the weight in the file is merged into them.
    if (!shared || loading) return;
    let alive = true;
    void (async () => {
      const file = await takeSharedFile();
      if (!alive) return;
      if (file) await readData(file.data, file.name);
      else setNotice({ tone: 'error', text: 'Er kwam geen bestand binnen. Probeer het opnieuw te delen, of kies het bestand hieronder.' });
      setParams({}, { replace: true });
    })();
    return () => {
      alive = false;
    };
    // readData and setParams only set state; they must not retrigger the take.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [shared, loading]);

  async function onPick(file: File | undefined) {
    if (!file) return;
    try {
      await readData(new Uint8Array(await file.arrayBuffer()), file.name);
    } catch {
      setNotice({ tone: 'error', text: 'ASCEND kan dit bestand niet openen.' });
    }
    if (input.current) input.current.value = '';
  }

  // Names of the link card are changed there; the rest (older files) can be forgotten here.
  const shownAbove = new Set(rows.map((r) => r.key));
  const linked = Object.entries(mapping).filter(([key]) => !shownAbove.has(key));
  // One gold button per screen: the next step is the gold one.
  const unlinked = rows.some((r) => r.linked === undefined);
  const pickIsNext = rows.length === 0 && plan.proposals.length === 0;
  const nameOf = (key: string) => state.workouts.find((w) => nameKey(w.name) === key)?.name ?? key;
  const templateName = (id: string | null) => (id ? (templates.find((t) => t.id === id)?.name ?? 'een training die er niet meer is') : 'niet inlezen');
  const nothingToOffer = loaded && state.workouts.length > 0 && plan.proposals.length === 0;

  return (
    <div className="animate-page-in flex flex-col gap-5 px-4 pb-10 pt-6">
      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <p className="font-display text-lg" style={{ color: 'var(--color-bronze)' }}>MACROFACTOR INLEZEN</p>
          <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>krachttrainingen en gewicht zonder overtypen</p>
        </div>
      </div>

      <Card className="flex flex-col gap-3">
        <Eyebrow>DRIE STAPPEN</Eyebrow>
        <Step n={1}>Open MacroFactor en ga naar Meer, dan Data Export. De namen kunnen in jouw versie iets anders heten.</Step>
        <Step n={2}>Kies Granular Export. Vink Weight Trend en Scale Weight aan en tik op Export. Voor krachttrainingen tik je op Export Workout Log: de eerste keer 30 dagen, daarna wekelijks 7 dagen.</Step>
        <Step n={3}>Je krijgt een xlsx-bestand. Tik op Delen en kies ASCEND, voor elk bestand. Lukt dat niet, bewaar dan het bestand en tik hieronder op Kies bestand.</Step>
        <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
          ASCEND leest het bestand alleen op deze telefoon; het gaat nergens heen. Bij krachttrainingen koppel je eerst de namen en verwerk je ze daarna in één keer; er wordt nooit iets stil opgeslagen.
        </p>
        <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
          ASCEND leest xlsx en csv en ziet aan de kolommen zelf wat erin zit: gewicht, krachttrainingen of allebei in één bestand.
        </p>
      </Card>

      <Card className="flex flex-col gap-3">
        <Eyebrow>BESTAND</Eyebrow>
        <input
          ref={input}
          type="file"
          accept=".csv,.xlsx,.txt,text/csv,text/comma-separated-values,text/plain,application/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream"
          className="sr-only"
          aria-label="Kies de MacroFactor-export"
          onChange={(e) => void onPick(e.target.files?.[0])}
        />
        {pickIsNext ? (
          <PrimaryButton onClick={() => input.current?.click()} disabled={busy}>{busy ? 'Bezig…' : 'Kies bestand'}</PrimaryButton>
        ) : (
          <SecondaryButton onClick={() => input.current?.click()} disabled={busy}>{busy ? 'Bezig…' : 'Kies bestand'}</SecondaryButton>
        )}
        {notice?.lines && (
          <ul className="flex flex-col gap-1.5" role="status">
            {notice.lines.map((line) => (
              <li key={line} className="flex items-start gap-2 text-sm leading-snug" style={{ color: line.startsWith('Voeding') ? 'var(--color-ink-dim)' : 'var(--color-ink)' }}>
                <span className="mt-0.5 shrink-0" style={{ color: 'var(--color-ink-dim)' }}>
                  <Icon name="gedaan" size={16} />
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        )}
        {notice?.tone === 'error' && notice.text && (
          <div className="flex flex-col gap-2">
            <p className="text-sm leading-snug" role="alert" style={{ color: 'var(--color-danger-text)' }}>{notice.text}</p>
            {notice.details && <SecondaryButton onClick={() => setShowDetails(true)}>Details</SecondaryButton>}
          </div>
        )}
        {notice?.tone === 'ok' && notice.text && (
          <p className="text-sm leading-snug" role="status" style={{ color: 'var(--color-ink)' }}>{notice.text}</p>
        )}
        {state.readAt && !notice && (
          <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
            Laatst gelezen op {formatDateNL(state.readAt.slice(0, 10))}{state.fileName ? `: ${state.fileName}` : ''}.
          </p>
        )}
      </Card>

      {showDetails && notice?.details && <DetailsSheet text={notice.details} onClose={() => setShowDetails(false)} />}

      <MacroFactorLinkCard primary={unlinked} />

      <MacroFactorCard onImportPage primary={!unlinked} />

      {conflicts.length > 0 && (
        <Card className="flex flex-col gap-3">
          <Eyebrow>Zelf ingevuld gewicht</Eyebrow>
          <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>
            Op {daysText(conflicts.length)} had je zelf een ander gewicht ingevuld dan MacroFactor. Wat jij invulde is blijven staan.
          </p>
          <ul className="flex flex-col gap-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
            {conflicts.slice(0, 4).map((c) => (
              <li key={c.own.date}>
                {formatDateNL(c.own.date)}: jij <span className="font-sans tabular-nums">{formatNumberNL(c.own.kg, 1)} kg</span>, MacroFactor <span className="font-sans tabular-nums">{formatNumberNL(c.incoming.kg, 1)} kg</span>
              </li>
            ))}
          </ul>
          <div className="flex gap-3">
            <SecondaryButton onClick={() => setConflicts([])}>Begrepen</SecondaryButton>
            <SecondaryButton onClick={() => void takeMacroFactorOnConflicts()}>MacroFactor gebruiken</SecondaryButton>
          </div>
        </Card>
      )}

      {hasMacroFactorWeight(settings.weightEntries) && (
        <WeightSourceCard
          entries={settings.weightEntries ?? []}
          on={settings.weightFromMacroFactor !== false}
          onChange={(on) => void updateSettings({ weightFromMacroFactor: on })}
        />
      )}

      {loaded && <MacroFactorLeadCard />}

      {nothingToOffer && (
        <Card className="flex flex-col gap-1">
          <Eyebrow>ALLES STAAT AL IN JE LOGBOEK</Eyebrow>
          <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
            Van de {countText(state.workouts.length)} in dit bestand is er niets meer dat ASCEND kan toevoegen.
          </p>
        </Card>
      )}

      {linked.length > 0 && (
        <Card className="flex flex-col gap-3">
          <Eyebrow>Eerder gekoppelde namen</Eyebrow>
          <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
            Namen die niet in dit bestand staan. Je koos eerder welke training in MacroFactor welke training in ASCEND is. Dit staat alleen op deze telefoon en gaat niet mee in een back-up; na een nieuwe telefoon kies je het opnieuw.
          </p>
          {linked.map(([key, templateId]) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm" style={{ color: 'var(--color-ink)', overflowWrap: 'anywhere' }}>{nameOf(key)}</p>
                <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{templateName(templateId)}</p>
              </div>
              <SecondaryButton className="!flex-none px-3" onClick={() => void forgetMapping(key)}>Vergeet</SecondaryButton>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function WeightSourceCard({ entries, on, onChange }: { entries: WeightEntry[]; on: boolean; onChange: (on: boolean) => void }) {
  const mine = entries.filter((e) => e.source === 'macrofactor');
  const last = mine[mine.length - 1];
  if (!last) return null;
  const old = daysBetween(last.date, todayISO()) > MACROFACTOR_FRESH_DAYS;
  return (
    <Card className="flex flex-col gap-3">
      <Eyebrow>Gewicht uit MacroFactor</Eyebrow>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm" style={{ color: 'var(--color-ink)' }}>Gewicht uit MacroFactor gebruiken</p>
          <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
            Gewicht komt uit MacroFactor (bijgewerkt op {formatDateNL(last.date)}): <span className="font-sans tabular-nums">{formatNumberNL(last.kg, 1)} kg</span>, {last.basis === 'trend' ? 'je trendgewicht' : 'de weegschaal'}.
            {last.basis === 'trend' ? ' ASCEND rekent met het trendgewicht, omdat dat rustiger is dan één weging.' : ' In de export stond geen trendgewicht, dus ASCEND rekent met de weging zelf.'}
            {' '}Het telt voor rugzakgewicht als deel van je lichaamsgewicht en voor de beenindex. Uit betekent: ASCEND laat het staan maar rekent er niet mee, en vraagt weer om je gewicht.
          </p>
          {old && on && (
            <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
              Dit gewicht is ouder dan twee weken. Lees een nieuwe export in, dan blijft het kloppen.
            </p>
          )}
        </div>
        <Toggle checked={on} onChange={onChange} label="Gewicht uit MacroFactor gebruiken" />
      </div>
    </Card>
  );
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs"
        style={{ borderColor: 'var(--color-bronze)', color: 'var(--color-gold)' }}
      >
        {n}
      </span>
      <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{children}</p>
    </div>
  );
}

// The technical part of a refusal: found sheets and columns, to pass on.
function DetailsSheet({ text, onClose }: { text: string; onClose: () => void }) {
  const { closing, requestClose } = useSheetClose(onClose);
  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div className={`max-h-[85vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <Card className="flex flex-col gap-3 rounded-b-none border-b-0 pb-6">
            <Eyebrow>Details</Eyebrow>
            <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
              Dit zijn de werkbladen en kolommen die ASCEND in het bestand zag. Geef ze door, dan kan ASCEND ze leren herkennen.
            </p>
            <p className="whitespace-pre-line text-xs leading-snug" style={{ color: 'var(--color-ink)', overflowWrap: 'anywhere' }}>{text}</p>
            <SecondaryButton onClick={requestClose}>Begrepen</SecondaryButton>
          </Card>
        </div>
      </div>
    </Portal>
  );
}
