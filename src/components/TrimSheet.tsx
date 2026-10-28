import { useEffect, useMemo, useState } from 'react';
import type { StreamSet } from '../models/activityDetail';
import type { SessionLog } from '../models/training';
import { chartSeries, suggestTrim, type TrimChart as TrimChartData, type TrimSport, type TrimSuggestion } from '../engine/activityTrim';
import { clockLabel, previewTrim, suggestionLines } from '../engine/trimLog';
import { logSport } from '../engine/sports';
import { fetchTrimStreams, TrimUnavailableError } from '../storage/trim';
import { useAppData } from '../state/AppDataContext';
import { TimeoutError, withTimeout } from '../utils/withTimeout';
import { formatNumberNL } from '../utils/number';
import { useSheetClose } from '../utils/useSheetClose';
import { Portal } from './Portal';
import { SheetHeader } from './SheetHeader';
import { TextButton } from './TextButton';
import { TrimChart } from './TrimChart';
import { Card, PrimaryButton, SecondaryButton } from './ui';

// The series come from the provider (its own limit is 15 seconds); this is the
// limit for the whole fetch, and for the write, which is local work.
const FETCH_TIMEOUT_MS = 20_000;
const SAVE_TIMEOUT_MS = 15_000;

type Loaded = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; streams: StreamSet; suggestion: TrimSuggestion | undefined; chart: TrimChartData };

const sportOf = (log: SessionLog): TrimSport => logSport(log) ?? (log.type === 'recovery' ? 'hiking' : 'running');

const maxMinutesOf = (streams: StreamSet) => Math.max(2, Math.ceil(streams.timeSec[streams.timeSec.length - 1] / 60));

// Where the sliders start, in minutes: the cut of the suggestion (the end rounded
// down and the beginning rounded up, so the doubtful seconds fall on the side of
// the car), or the whole training.
function startingRange(streams: StreamSet, suggestion: TrimSuggestion | undefined): [number, number] {
  const max = maxMinutesOf(streams);
  const from = suggestion?.atStart ? Math.min(max - 1, Math.ceil(suggestion.startSec / 60)) : 0;
  const to = suggestion?.atEnd ? Math.max(from + 1, Math.floor(suggestion.endSec / 60)) : max;
  return [from, to];
}

// Het blad "Inkorten": haalt de reeksen van de training op, toont de snelheid
// over de tijd met twee schuiven voor het begin en het eind (in minuten sinds de
// start), het voorstel als er iets te snel was voor de sport, en daaronder de
// nieuwe getallen naast de oude (docs/beslissingen/2026-10-24-activiteit-inkorten.md).
export function TrimSheet({ log, templateName, onClose }: { log: SessionLog; templateName: string; onClose: () => void }) {
  const { trimWatchActivity } = useAppData();
  const [saving, setSaving] = useState(false);
  const { closing, requestClose, sheetRef } = useSheetClose(onClose, 200, () => !saving);
  const [loaded, setLoaded] = useState<Loaded>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [startMin, setStartMin] = useState(0);
  const [endMin, setEndMin] = useState(0);
  const [note, setNote] = useState<string | null>(null);

  // The series belong to the activity the sheet was opened for, not to the
  // numbers on the log, which change when the app reads its data again.
  const [opened] = useState(log);
  useEffect(() => {
    let cancelled = false;
    withTimeout(fetchTrimStreams(opened), FETCH_TIMEOUT_MS)
      .then((got) => {
        if (cancelled) return;
        // The suggestion is where the sliders start; without one, the whole training.
        const chart = chartSeries(got);
        if (!chart) {
          setLoaded({ kind: 'error', message: 'Van deze training is geen snelheid over de tijd te tekenen. Inkorten kan dan niet.' });
          return;
        }
        const suggestion = suggestTrim(got, sportOf(opened));
        const [from, to] = startingRange(got, suggestion);
        setStartMin(from);
        setEndMin(to);
        setLoaded({ kind: 'ready', streams: got, suggestion, chart });
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof TrimUnavailableError
          ? err.message
          : err instanceof TimeoutError
            ? 'Ophalen duurt langer dan verwacht. Probeer het zo nog eens.'
            : 'Ophalen lukte niet. Probeer het zo nog eens.';
        setLoaded({ kind: 'error', message });
      });
    return () => {
      cancelled = true;
    };
  }, [opened, attempt]);

  const streams = loaded.kind === 'ready' ? loaded.streams : undefined;
  const totalSec = streams ? streams.timeSec[streams.timeSec.length - 1] : 0;
  const maxMin = streams ? maxMinutesOf(streams) : 2;
  const suggestion = loaded.kind === 'ready' ? loaded.suggestion : undefined;
  const chart = loaded.kind === 'ready' ? loaded.chart : undefined;

  const startSec = startMin * 60;
  const endSec = endMin >= maxMin ? totalSec : endMin * 60;
  const whole = startMin === 0 && endMin >= maxMin;
  const preview = useMemo(() => (streams && !whole ? previewTrim(log, streams, startSec, endSec) : undefined), [streams, log, startSec, endSec, whole]);

  async function save() {
    if (!streams || !preview || saving) return;
    setSaving(true);
    setNote(null);
    try {
      const written = await withTimeout(trimWatchActivity(log.id, streams, startSec, endSec), SAVE_TIMEOUT_MS);
      if (written) {
        setSaving(false);
        requestClose();
        return;
      }
      setNote('Er is niets ingekort: de training is al ingekort of niet meer te vinden.');
    } catch (err) {
      setNote(err instanceof TimeoutError
        ? 'Inkorten duurt langer dan verwacht. Kijk zo in de training of het gelukt is; zo niet, probeer het dan nog eens.'
        : 'Inkorten lukte niet. Er is niets veranderd; probeer het zo nog eens.');
    }
    setSaving(false);
  }

  const lines = suggestion ? suggestionLines(suggestion) : [];

  return (
    <Portal>
      <div
        className={`fixed inset-0 z-[60] flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}
        onClick={requestClose}
      >
        <div
          ref={sheetRef}
          className={`max-h-[90vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-label="Inkorten"
        >
          <Card className="rounded-b-none border-b-0 pb-8">
            <div className="-mt-2"><SheetHeader eyebrow={templateName} title="Inkorten" onClose={requestClose} /></div>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>Haal een stuk aan het begin of het eind weg, bijvoorbeeld een autorit.</p>

            {loaded.kind === 'loading' && (
              <p role="status" className="mt-4 text-sm" style={{ color: 'var(--color-ink-dim)' }}>De reeksen van deze training ophalen…</p>
            )}

            {loaded.kind === 'error' && (
              <div className="mt-4 flex flex-col gap-3">
                <p role="alert" className="text-sm" style={{ color: 'var(--color-warning)' }}>{loaded.message}</p>
                <div className="flex gap-3">
                  <SecondaryButton onClick={requestClose}>Annuleren</SecondaryButton>
                  <SecondaryButton onClick={() => { setLoaded({ kind: 'loading' }); setAttempt((a) => a + 1); }}>Opnieuw proberen</SecondaryButton>
                </div>
              </div>
            )}

            {streams && chart && (
              <>
                {lines.length > 0 && (
                  <div className="mt-4 flex flex-col gap-1" role="status">
                    {lines.map((line) => (
                      <p key={line} className="text-sm" style={{ color: 'var(--color-warning)' }}>{line}</p>
                    ))}
                  </div>
                )}

                <div className="mt-4">
                  <TrimChart chart={chart} startSec={startSec} endSec={endSec} />
                </div>

                <div className="mt-3 flex flex-col">
                  <Slider
                    id="trim-start"
                    label="Begin"
                    value={startMin}
                    min={0}
                    max={maxMin - 1}
                    onChange={(v) => setStartMin(Math.min(v, endMin - 1))}
                  />
                  <Slider
                    id="trim-end"
                    label="Eind"
                    value={endMin}
                    min={1}
                    max={maxMin}
                    onChange={(v) => setEndMin(Math.max(v, startMin + 1))}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Tijden in uren en minuten sinds de start van je training.</p>
                    {(startMin !== 0 || endMin < maxMin) && (
                      <TextButton tone="dim" className="shrink-0" onClick={() => { setStartMin(0); setEndMin(maxMin); }}>Alles houden</TextButton>
                    )}
                  </div>
                </div>

                <div className="mt-4" aria-live="polite">
                  {preview ? (
                    <Numbers preview={preview} />
                  ) : (
                    <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>
                      {whole ? 'Je houdt nu de hele training. Schuif het begin of het eind om in te korten.' : 'In dit stuk zit geen beweging. Kies een ander stuk.'}
                    </p>
                  )}
                </div>

                {note && <p role="status" className="mt-3 text-sm" style={{ color: 'var(--color-ink-dim)' }}>{note}</p>}

                {/* The buttons stay in reach while you scroll through the numbers. */}
                <div className="sticky bottom-0 -mx-4 mt-4 flex gap-3 border-t px-4 pb-1 pt-3" style={{ background: 'var(--color-card)', borderColor: 'var(--color-card-border)' }}>
                  <SecondaryButton onClick={requestClose} disabled={saving}>Annuleren</SecondaryButton>
                  <PrimaryButton fullWidth={false} onClick={() => void save()} disabled={!preview || saving}>{saving ? 'Bezig…' : 'Inkorten'}</PrimaryButton>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </Portal>
  );
}

function Slider({ id, label, value, min, max, onChange }: { id: string; label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const text = clockLabel(value * 60);
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <label htmlFor={id} style={{ color: 'var(--color-ink)' }}>{label}</label>
        <span className="font-sans tabular-nums" style={{ color: 'var(--color-ink)' }}>{text}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={`${value} minuten, ${text}`}
        className="block h-11 w-full"
        style={{ accentColor: 'var(--color-action)' }}
      />
    </div>
  );
}

const ROWS: { label: string; field: 'durationMinutes' | 'distanceKm' | 'elevationGainM' | 'elevationLossM' | 'avgHeartRate'; decimals: number; unit: string }[] = [
  { label: 'Tijd', field: 'durationMinutes', decimals: 0, unit: 'min' },
  { label: 'Afstand', field: 'distanceKm', decimals: 1, unit: 'km' },
  { label: 'Stijgen', field: 'elevationGainM', decimals: 0, unit: 'm' },
  { label: 'Dalen', field: 'elevationLossM', decimals: 0, unit: 'm' },
  { label: 'Gem. hartslag', field: 'avgHeartRate', decimals: 0, unit: 'bpm' },
];

// "Tijd 62 naar 48 min": the number before and after, or just the number when the
// cut does not change it at the precision you see.
function Numbers({ preview }: { preview: NonNullable<ReturnType<typeof previewTrim>> }) {
  return (
    <div className="flex flex-col">
      {ROWS.map((row) => {
        const before = preview.before[row.field];
        if (before === undefined) return null;
        const after = preview.after[row.field] ?? before;
        const was = formatNumberNL(before, row.decimals);
        const now = formatNumberNL(after, row.decimals);
        const changed = was !== now;
        return (
          <div key={row.field} className="flex items-center justify-between border-b py-1.5 text-sm" style={{ borderColor: 'var(--color-card-border)' }}>
            <span style={{ color: 'var(--color-ink-dim)' }}>{row.label}</span>
            <span className="font-sans tabular-nums" style={{ color: changed ? 'var(--color-ink)' : 'var(--color-ink-dim)' }}>
              {changed ? `${was} naar ${now} ${row.unit}` : `${was} ${row.unit}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}
