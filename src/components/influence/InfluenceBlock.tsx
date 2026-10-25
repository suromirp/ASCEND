import { useEffect, useRef, useState } from 'react';
import { useAppData } from '../../state/AppDataContext';
import { AMOUNTS, AMOUNT_LABEL, MAX_LABEL_LENGTH, REASON_CHIPS, REASON_LABEL } from '../../data/influenceReasons';
import type { AlcoholAmount, InfluenceEntry, InfluenceReason } from '../../models/influence';
import { chipsWithout, EXCLUDE_LOG_EXPLAIN, setAmount, setExclude, setLabel, toggleReason, type KnownFact, type NoteTarget } from '../../engine/influence';
import { TimeoutError, withTimeout } from '../../utils/withTimeout';
import { Toggle } from '../ui';

// "Wat speelde er": wat ASCEND al weet (gewone regels, niets te tikken), de keuzes, de hoeveelheid bij
// alcohol, je eigen woord, en de schakelaar die iets uit je hartslagcijfers houdt. Voor een training
// en voor een dag; de woorden verschillen alleen waar de plek het zegt. Elke tik bewaart meteen: er is
// geen knop Opslaan en geen gevulde knop in dit blok.
const SAVE_LIMIT_MS = 10_000;
const CONFIRMED_ONLY: InfluenceReason[] = ['warm', 'zware_beendag'];

const hint = { color: 'var(--color-ink-dim)' } as const;

export function InfluenceBlock({
  target,
  entry,
  facts,
  mode,
  showStravaLine = false,
}: {
  target: NoteTarget;
  entry: InfluenceEntry | undefined;
  facts: KnownFact[];
  mode: 'log' | 'day';
  showStravaLine?: boolean;
}) {
  const { saveInfluence } = useAppData();
  const [failed, setFailed] = useState(false);
  const reasons = entry?.reasons ?? [];
  const has = (r: InfluenceReason) => reasons.some((x) => x.reason === r);

  async function change(fn: (e: InfluenceEntry) => InfluenceEntry) {
    setFailed(false);
    try {
      await withTimeout(saveInfluence(target, fn), SAVE_LIMIT_MS, 'Opslaan');
    } catch (err) {
      // Na een time-out loopt het opslaan door en kan het nog lukken; de regel zegt dat eerlijk.
      setFailed(true);
      if (!(err instanceof TimeoutError)) console.error(err);
    }
  }

  // What ASCEND knows by itself is told, not asked: no circle, no tick, nothing to tap. It counts
  // in "Wat doet dit met je?" without a note. A reason you confirmed earlier that ASCEND no longer
  // sees stays here as a chosen chip, so you can still take it away.
  const chips = [...chipsWithout(REASON_CHIPS, facts), ...CONFIRMED_ONLY.filter((r) => has(r) && !facts.some((f) => f.reason === r) && !REASON_CHIPS.includes(r))];
  const alcohol = reasons.find((r) => r.reason === 'alcohol');
  const other = reasons.find((r) => r.reason === 'anders');
  const exclude = entry?.excludeHeartRate === true;

  // The own word: while you type, the field shows what you typed (the stored value follows every
  // keystroke, a little behind); otherwise it shows what is stored.
  const storedWord = other?.label ?? '';
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');
  const word = typing ? draft : storedWord;
  // The word is stored on blur or 400 ms after the last keystroke, not on every keystroke.
  const pending = useRef<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const latest = useRef(change);
  useEffect(() => {
    latest.current = change;
  });
  function flushWord() {
    window.clearTimeout(timer.current);
    const value = pending.current;
    pending.current = null;
    if (value !== null) void latest.current((e) => setLabel(e, value));
  }
  // Closing the sheet while typing still stores what was typed.
  useEffect(() => () => flushWord(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const excludeTitle = mode === 'log' ? 'Niet meetellen voor hartslag' : 'Deze nacht niet meetellen';
  const excludeLine = mode === 'log' ? 'Telt wel mee voor je belasting.' : 'Blijft uit je gemiddelde van rusthartslag en HRV, de ochtend erna.';

  return (
    <div>
      {facts.length > 0 && (
        <>
          <p className="text-[13px] leading-[18px]" style={hint}>Wat ASCEND al weet</p>
          <ul className="mt-1 flex flex-col">
            {facts.map((f) => (
              <li key={f.reason} className="py-1.5">
                <span className="block text-[15px] leading-5" style={{ color: 'var(--color-ink)' }}>{f.title}</span>
                <span className="block text-[13px] leading-[18px]" style={hint}>{f.source}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className={`text-[13px] leading-[18px] ${facts.length > 0 ? 'mt-3' : ''}`} style={hint}>{facts.length > 0 ? 'Speelde er nog iets?' : 'Speelde er iets?'}</p>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Wat speelde er">
        {chips.map((r) => {
          const on = has(r);
          return (
            <button
              key={r}
              type="button"
              aria-pressed={on}
              onClick={() => void change((e) => toggleReason(e, r))}
              className="inline-flex min-h-[44px] min-w-[44px] items-center rounded-full border px-3.5 text-[15px] leading-5"
              style={{
                borderColor: on ? 'var(--color-action)' : 'var(--color-control-border)',
                background: on ? 'var(--color-action-muted)' : 'transparent',
                color: on ? 'var(--color-ink)' : 'var(--color-ink-dim)',
                fontWeight: on ? 600 : undefined,
              }}
            >
              {REASON_LABEL[r]}
            </button>
          );
        })}
      </div>

      {alcohol && (
        <>
          <p className="mt-3 text-[13px] leading-[18px]" style={hint}>{mode === 'log' ? 'Hoeveel glazen, de avond ervoor?' : 'Hoeveel glazen?'}</p>
          <div role="radiogroup" aria-label="Hoeveel glazen" className="mt-2 grid grid-cols-3 gap-1 rounded-xl border p-1" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-card-border)' }}>
            {AMOUNTS.map((a: AlcoholAmount) => {
              const on = alcohol.amount === a;
              return (
                <button
                  key={a}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => void change((e) => setAmount(e, on ? undefined : a))}
                  className="min-h-[44px] rounded-lg text-sm tabular-nums"
                  style={{
                    background: on ? 'var(--color-action-muted)' : 'transparent',
                    boxShadow: on ? 'inset 0 0 0 1px var(--color-action)' : undefined,
                    color: on ? 'var(--color-ink)' : 'var(--color-ink-dim)',
                    fontWeight: on ? 600 : undefined,
                  }}
                >
                  {AMOUNT_LABEL[a]}
                </button>
              );
            })}
          </div>
        </>
      )}

      {other && (
        <>
          <label htmlFor={`influence-word-${target.logId ?? target.date}`} className="mt-3 block text-[13px] leading-[18px]" style={hint}>Je eigen woord</label>
          <input
            id={`influence-word-${target.logId ?? target.date}`}
            type="text"
            value={word}
            maxLength={MAX_LABEL_LENGTH}
            autoComplete="off"
            onFocus={() => {
              setDraft(storedWord);
              setTyping(true);
            }}
            onBlur={() => {
              flushWord();
              setTyping(false);
            }}
            onChange={(ev) => {
              setDraft(ev.target.value);
              pending.current = ev.target.value;
              window.clearTimeout(timer.current);
              timer.current = window.setTimeout(flushWord, 400);
            }}
            className="mt-1 block h-11 w-full rounded-xl border px-3 text-base"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' }}
          />
        </>
      )}

      <div className="mt-3 border-t" style={{ borderColor: 'var(--color-card-border)' }} />
      <div className="flex min-h-[68px] items-center gap-3 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] leading-5" style={{ color: 'var(--color-ink)' }}>{excludeTitle}</p>
          <p className="mt-1 text-[13px] leading-4" style={hint}>{excludeLine}</p>
        </div>
        <Toggle checked={exclude} onChange={(on) => void change((e) => setExclude(e, on))} label={excludeTitle} />
      </div>
      {mode === 'log' && exclude && <p className="text-[13px] leading-[18px]" style={{ color: 'var(--color-ink)' }}>{EXCLUDE_LOG_EXPLAIN}</p>}
      {showStravaLine && <p className="mt-2 text-xs" style={hint}>Alleen voor jou: niet in de tekst voor Strava.</p>}
      {failed && <p role="status" className="mt-2 text-xs" style={{ color: 'var(--color-warning)' }}>Opslaan lukte niet of is nog niet bevestigd. Kijk zo of het staat, en probeer het anders nog eens.</p>}
    </div>
  );
}
