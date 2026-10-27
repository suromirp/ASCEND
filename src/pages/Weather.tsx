// ASCEND: Meer, Weer. Your place, when the forecast was last updated, how
// ASCEND judges the weather for a training, and where the data comes from.
//
// The place is AppSettings.homeLocation, the same one Trainingsplekken uses
// for distances: one place, one setting, kept on this phone. The first way to
// set it is "Gebruik mijn locatie" (rounded to about a kilometre), the second
// is a search by name. Only the name you search and coordinates rounded to
// about a kilometre go to Open-Meteo.
//
// Every action has its own busy flag and its own time limit, and always ends
// in a short message: no button stays on "Bezig" when an answer stalls.

import { useState } from 'react';
import { Icon } from '../components/icons';
import { Card, Eyebrow, InfoButton, PrimaryButton, SecondaryButton, PageHeader } from '../components/ui';
import { useAppData } from '../state/AppDataContext';
import { WeatherTodayCard } from '../components/WeatherTodayCard';
import { clearWeather } from '../storage/weather';
import { OPEN_METEO_SITE, openMeteoErrorMessage, searchPlaces, type PlaceResult } from '../integrations/openMeteo';
import { DEFAULT_WEEKDAY_HOUR, DEFAULT_WEEKEND_HOUR, MIN_LOGS, updatedLabel, weatherRuleRows, type WeatherRuleRow } from '../engine/weather';
import { followsLocation } from '../engine/overviewSettings';
import { isMyLocation, myLocation } from '../engine/weatherLocation';
import { locateErrorMessage, locateMe } from '../utils/geolocation';
import { TimeoutError, withTimeout } from '../utils/withTimeout';

const fieldStyle = { background: 'var(--color-charcoal)', borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' };
const hairline = { borderColor: 'var(--color-card-border)' };

// How long each action may take before it gives up (the requests have a limit
// of their own too; this is the net around everything, saving included).
const LOCATE_LIMIT_MS = 20_000;
const SEARCH_LIMIT_MS = 20_000;
const REFRESH_LIMIT_MS = 25_000;
const SAVE_LIMIT_MS = 8_000;

type Action = 'locate' | 'search' | 'refresh' | 'clear';
type Notice = { area: 'place' | 'search'; tone: 'ok' | 'error'; text: string };

export function WeatherPage() {
  const { settings, updateSettings, weather } = useAppData();
  const place = settings.homeLocation;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[] | null>(null);
  const [busy, setBusy] = useState<Record<Action, boolean>>({ locate: false, search: false, refresh: false, clear: false });
  const [notice, setNotice] = useState<Notice | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const anyBusy = busy.locate || busy.search || busy.refresh || busy.clear;

  // One action: its own busy flag, its own limit, always reset in finally.
  async function run(action: Action, area: Notice['area'], limitMs: number, work: () => Promise<Omit<Notice, 'area'> | null>) {
    if (busy[action]) return;
    setBusy((b) => ({ ...b, [action]: true }));
    setNotice(null);
    try {
      const outcome = await withTimeout(work(), limitMs);
      setNotice(outcome ? { area, ...outcome } : null);
    } catch (err) {
      const text = err instanceof TimeoutError ? 'Dit duurde te lang. Probeer het over een poosje nog eens.' : 'Dit lukte niet. Probeer het nog eens.';
      setNotice({ area, tone: 'error', text });
    } finally {
      setBusy((b) => ({ ...b, [action]: false }));
    }
  }

  const locate = () =>
    run('locate', 'place', LOCATE_LIMIT_MS, async () => {
      let found;
      try {
        found = await locateMe();
      } catch (err) {
        return { tone: 'error', text: locateErrorMessage(err) };
      }
      await withTimeout(updateSettings({ homeLocation: myLocation(found.lat, found.lon) }), SAVE_LIMIT_MS);
      setResults(null);
      return { tone: 'ok', text: 'Je locatie is je plaats. Het weer wordt nu opgehaald.' };
    });

  const search = () =>
    run('search', 'search', SEARCH_LIMIT_MS, async () => {
      try {
        const found = await searchPlaces(query);
        setResults(found);
        return found.length === 0 ? { tone: 'error', text: 'Geen plaats gevonden met die naam. Controleer de spelling of probeer een grotere plaats in de buurt.' } : null;
      } catch (err) {
        setResults(null);
        return { tone: 'error', text: openMeteoErrorMessage(err) };
      }
    });

  const refresh = () =>
    run('refresh', 'place', REFRESH_LIMIT_MS, async () => {
      const result = await weather.refresh();
      return result.status === 'error' ? { tone: 'error', text: result.message } : { tone: 'ok', text: 'Het weer is bijgewerkt.' };
    });

  const clearPlace = () =>
    run('clear', 'place', SAVE_LIMIT_MS, async () => {
      await updateSettings({ homeLocation: undefined });
      await clearWeather();
      return { tone: 'ok', text: 'De plaats is gewist. Er staat geen weer meer bij je trainingen.' };
    });

  async function choose(result: PlaceResult) {
    setResults(null);
    setQuery('');
    await run('search', 'place', SAVE_LIMIT_MS, async () => {
      await updateSettings({ homeLocation: { name: result.name, lat: result.lat, lon: result.lon } });
      return { tone: 'ok', text: `${result.name} is je plaats. Het weer wordt nu opgehaald.` };
    });
  }

  const fetchedAt = weather.forecast?.fetchedAt;
  const following = !!place && isMyLocation(place) && followsLocation(settings.overviews);
  const noticeFor = (area: Notice['area']) =>
    notice && notice.area === area ? (
      <p role="status" className="text-xs leading-snug" style={{ color: notice.tone === 'error' ? 'var(--color-warning)' : 'var(--color-ink-dim)' }}>{notice.text}</p>
    ) : null;

  return (
    <div className="animate-page-in flex flex-col gap-5 px-4 pb-10 pt-6">
      <PageHeader eyebrow="Buiten" title="Weer en kleding" line="Het weer en wat je aantrekt bij je buitentraining" />

      <WeatherTodayCard />

      <Card className="flex flex-col gap-3">
        <Eyebrow>Je plaats</Eyebrow>
        {place ? (
          <div className="flex flex-col gap-1">
            <p className="flex items-center gap-2 font-display text-xl" style={{ color: 'var(--color-ink)' }}>
              {isMyLocation(place) && <Icon name="locatie" size={20} className="shrink-0" />}
              <span className="min-w-0 break-words">{place.name}</span>
            </p>
            <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
              {fetchedAt ? `Weer ${updatedLabel(fetchedAt)}.` : 'Het weer is nog niet opgehaald.'}
              {following ? ' De plek volgt je locatie.' : ''}
              {weather.lastError ? ` ${weather.lastError}` : ''}
            </p>
          </div>
        ) : (
          <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
            Nog geen plaats gekozen. Met een plaats zie je hier en bij je hardloop-, wandel- en bergtrainingen het weer en wat je aantrekt.
          </p>
        )}

        <PrimaryButton onClick={() => void locate()} disabled={busy.locate}>
          <span className="inline-flex items-center justify-center gap-2">
            <Icon name="locatie" size={18} />
            {busy.locate ? 'Locatie bepalen…' : place && isMyLocation(place) ? 'Locatie opnieuw bepalen' : 'Locatie gebruiken'}
          </span>
        </PrimaryButton>

        {place && (
          <div className="flex gap-3">
            <SecondaryButton onClick={() => void refresh()} disabled={busy.refresh || busy.clear}>{busy.refresh ? 'Verversen…' : 'Nu verversen'}</SecondaryButton>
            <SecondaryButton onClick={() => void clearPlace()} disabled={busy.clear || busy.refresh}>{busy.clear ? 'Wissen…' : 'Plaats wissen'}</SecondaryButton>
          </div>
        )}
        {noticeFor('place')}

        <div className="flex items-start gap-2">
          <p className="min-w-0 flex-1 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
            Je plek blijft op deze telefoon. Open-Meteo krijgt alleen een plaatsnaam of een plek op ongeveer 1 km.
          </p>
          <InfoButton onClick={() => setPrivacyOpen((o) => !o)} label={privacyOpen ? 'Uitleg over privacy sluiten' : 'Uitleg over privacy'} />
        </div>
        {privacyOpen && (
          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
            Dit is dezelfde plaats als je woonplaats bij Trainingsplekken en staat in je back-up. Naar Open-Meteo gaat alleen een plaatsnaam of een plek afgerond op ongeveer een kilometer, nooit je precieze plek, en geen naam of account.
          </p>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <Eyebrow>{place ? 'Andere plaats' : 'Plaats zoeken'}</Eyebrow>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (query.trim().length >= 2) void search();
          }}
        >
          <input
            id="weather-place"
            type="text"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Plaatsnaam"
            placeholder="Een plaatsnaam"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-h-[44px] min-w-0 flex-1 rounded-lg border bg-transparent px-2.5 py-2 text-sm"
            style={fieldStyle}
          />
          <button
            type="submit"
            aria-label={busy.search ? 'Zoeken…' : 'Zoeken'}
            disabled={busy.search || query.trim().length < 2}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-all active:scale-[0.97] active:opacity-70 disabled:opacity-40"
            style={{ borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' }}
          >
            <Icon name="zoeken" size={20} />
          </button>
        </form>
        {busy.search && <p role="status" className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Zoeken…</p>}
        {noticeFor('search')}
        {results && results.length > 0 && (
          <div className="flex flex-col gap-2">
            {results.map((r) => (
              <button
                key={`${r.name}-${r.lat}-${r.lon}`}
                onClick={() => void choose(r)}
                disabled={anyBusy}
                className="flex min-h-[44px] items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-all active:scale-[0.98] disabled:opacity-40"
                style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)' }}
              >
                <span className="text-sm" style={{ color: 'var(--color-ink)' }}>{r.name}</span>
                <span className="min-w-0 text-right text-xs" style={{ color: 'var(--color-ink-dim)' }}>{[r.region, r.country].filter(Boolean).join(', ')}</span>
              </button>
            ))}
          </div>
        )}
      </Card>

      <JudgementCard />

      <Card className="flex flex-col gap-2">
        <Eyebrow>Bron</Eyebrow>
        <Para>Weergegevens van Open-Meteo.com, CC BY 4.0. Zonder verbinding zie je de laatste stand.</Para>
        <a
          href={OPEN_METEO_SITE}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-[44px] items-center justify-between gap-2 rounded-xl border px-3 text-sm"
          style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}
        >
          <span>Open-Meteo.com</span>
          <Icon name="buiten" size={16} />
        </a>
      </Card>
    </div>
  );
}

// "Zo oordeelt ASCEND": three blocks, the thresholds as short rows. The numbers
// come from the engine (weatherRuleRows), not from this file.
function JudgementCard() {
  const { watch, bad } = weatherRuleRows();
  return (
    <Card className="flex flex-col gap-4">
      <Eyebrow>Zo oordeelt ASCEND</Eyebrow>
      <Block tone="success" title="Prima" note="Als niets hieronder geldt." />
      <Block tone="warning" title="Let op" rows={watch} />
      <Block tone="danger" title="Slecht" rows={bad} />
      <div className="flex flex-col gap-2 border-t pt-3" style={hairline}>
        <Rows
          rows={[
            { label: 'Wanneer', text: `Je gewone trainingsuur (na minstens ${MIN_LOGS} trainingen van dezelfde soort), anders ${DEFAULT_WEEKDAY_HOUR}.00 op werkdagen en ${DEFAULT_WEEKEND_HOUR}.00 in het weekend. Een lange tocht telt helemaal mee.` },
            { label: 'Lampje', text: 'Eindig je na zonsondergang of begin je voor zonsopkomst, dan staat dat erbij.' },
            { label: 'Ruilen', text: 'Bij slecht weer en een betere dag die week stelt ASCEND een ruil voor, altijd met jouw Akkoord.' },
          ]}
        />
      </div>
    </Card>
  );
}

function Block({ tone, title, rows, note }: { tone: 'success' | 'warning' | 'danger'; title: string; rows?: WeatherRuleRow[]; note?: string }) {
  return (
    <section className="flex flex-col gap-2 border-t pt-3 first-of-type:border-t-0 first-of-type:pt-0" style={hairline} aria-label={title}>
      <p className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
        <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: `var(--color-${tone})` }} />
        {title}
      </p>
      {note && <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{note}</p>}
      {rows && <Rows rows={rows} />}
    </section>
  );
}

function Rows({ rows }: { rows: WeatherRuleRow[] }) {
  return (
    <dl className="flex flex-col gap-1.5">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[6.75rem_1fr] gap-x-3 text-sm leading-snug">
          <dt style={{ color: 'var(--color-ink)' }}>{r.label}</dt>
          <dd className="font-sans tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{r.text}</dd>
        </div>
      ))}
    </dl>
  );
}

function Para({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{children}</p>;
}
