// ASCEND: Meer, Weer. Your place, when the forecast was last updated, how
// ASCEND judges the weather for a training, and where the data comes from.
//
// The place is AppSettings.homeLocation, the same one Trainingsplekken uses
// for distances: one place, one setting, kept on this phone. Only the name you
// search and coordinates rounded to about a kilometre go to Open-Meteo.

import { useState } from 'react';
import { BackButton } from '../components/BackButton';
import { Card, Eyebrow, PrimaryButton, SecondaryButton } from '../components/ui';
import { useAppData } from '../state/AppDataContext';
import { clearWeather } from '../storage/weather';
import { OPEN_METEO_SITE, openMeteoErrorMessage, searchPlaces, type PlaceResult } from '../integrations/openMeteo';
import { DEFAULT_WEEKDAY_HOUR, DEFAULT_WEEKEND_HOUR, WEATHER_RULES, updatedLabel } from '../engine/weather';

const fieldStyle = { background: 'var(--color-charcoal)', borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' };

export function WeatherPage() {
  const { settings, updateSettings, weather } = useAppData();
  const place = settings.homeLocation;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  async function search() {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const found = await searchPlaces(query);
      setResults(found);
      if (found.length === 0) setNotice({ tone: 'error', text: 'Geen plaats gevonden met die naam. Controleer de spelling of probeer een grotere plaats in de buurt.' });
    } catch (err) {
      setResults(null);
      setNotice({ tone: 'error', text: openMeteoErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  async function choose(result: PlaceResult) {
    await updateSettings({ homeLocation: { name: result.name, lat: result.lat, lon: result.lon } });
    setResults(null);
    setQuery('');
    setNotice({ tone: 'ok', text: `${result.name} is je plaats. Het weer wordt nu opgehaald.` });
  }

  async function clearPlace() {
    await updateSettings({ homeLocation: undefined });
    await clearWeather();
    setNotice({ tone: 'ok', text: 'De plaats is gewist. Er staat geen weer meer bij je trainingen.' });
  }

  async function refresh() {
    setBusy(true);
    setNotice(null);
    try {
      const result = await weather.refresh();
      setNotice(result.status === 'error' ? { tone: 'error', text: result.message } : { tone: 'ok', text: 'Het weer is bijgewerkt.' });
    } finally {
      setBusy(false);
    }
  }

  const fetchedAt = weather.forecast?.fetchedAt;

  return (
    <div className="animate-page-in flex flex-col gap-5 px-4 pb-10 pt-6">
      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <p className="font-display text-lg" style={{ color: 'var(--color-bronze)' }}>WEER</p>
          <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Het weer bij je buitentraining, voor je plaats</p>
        </div>
      </div>

      <Card className="flex flex-col gap-3">
        <Eyebrow>JE PLAATS</Eyebrow>
        {place ? (
          <>
            <p className="font-display text-xl" style={{ color: 'var(--color-ink)' }}>{place.name}</p>
            <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
              {fetchedAt ? `Weer ${updatedLabel(fetchedAt)}.` : 'Het weer is nog niet opgehaald.'}
              {weather.lastError ? ` ${weather.lastError}` : ''}
            </p>
            <div className="flex gap-3">
              <SecondaryButton onClick={() => void refresh()} disabled={busy}>{busy ? 'Bezig…' : 'Nu verversen'}</SecondaryButton>
              <SecondaryButton onClick={() => void clearPlace()} disabled={busy}>Plaats wissen</SecondaryButton>
            </div>
          </>
        ) : (
          <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
            Nog geen plaats gekozen. Zoek hieronder je woonplaats of een plaats dichtbij. Dan staat bij je hardloop-, wandel- en bergtrainingen één regel met het weer.
          </p>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <Eyebrow>{place ? 'ANDERE PLAATS KIEZEN' : 'PLAATS ZOEKEN'}</Eyebrow>
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void search();
          }}
        >
          <label htmlFor="weather-place" className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Plaatsnaam, bijvoorbeeld Amersfoort</label>
          <input
            id="weather-place"
            type="text"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-h-[44px] w-full rounded-lg border bg-transparent px-2.5 py-2 text-sm"
            style={fieldStyle}
          />
          <PrimaryButton onClick={() => void search()} disabled={busy || query.trim().length < 2}>{busy ? 'Bezig…' : 'Zoeken'}</PrimaryButton>
        </form>
        {notice && (
          <p role="status" className="text-xs leading-snug" style={{ color: notice.tone === 'error' ? 'var(--color-warning)' : 'var(--color-ink-dim)' }}>{notice.text}</p>
        )}
        {results && results.length > 0 && (
          <div className="flex flex-col gap-2">
            {results.map((r) => (
              <button
                key={`${r.name}-${r.lat}-${r.lon}`}
                onClick={() => void choose(r)}
                className="flex min-h-[44px] items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-all active:scale-[0.98]"
                style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)' }}
              >
                <span className="text-sm" style={{ color: 'var(--color-ink)' }}>{r.name}</span>
                <span className="min-w-0 text-right text-xs" style={{ color: 'var(--color-ink-dim)' }}>{[r.region, r.country].filter(Boolean).join(', ')}</span>
              </button>
            ))}
          </div>
        )}
        <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
          Dit is dezelfde plaats als je woonplaats bij Trainingsplekken. Ze blijft op deze telefoon. Naar Open-Meteo gaan alleen de plaatsnaam die je zoekt en coördinaten die op ongeveer een kilometer zijn afgerond: geen naam van jou, geen account en geen gps.
        </p>
      </Card>

      <Card className="flex flex-col gap-2">
        <Eyebrow>ZO OORDEELT ASCEND</Eyebrow>
        <Para>
          ASCEND kijkt naar het weer in de uren waarin je gewoonlijk traint. Dat is de tijd van je eerdere trainingen van dezelfde soort als je er minstens drie hebt (op werkdagen en in het weekend apart), anders {DEFAULT_WEEKDAY_HOUR}.00 uur op werkdagen en {DEFAULT_WEEKEND_HOUR}.00 uur in het weekend. Een lange tocht telt de hele duur mee.
        </Para>
        <Para>
          Prima is geen van onderstaande. Let op is warm (voelt als {WEATHER_RULES.heatWatch} graden of meer), koud (voelt als {Math.abs(WEATHER_RULES.coldWatch)} graden onder nul of kouder), harde wind (gemiddeld {WEATHER_RULES.windWatch} km/u of vlagen van {WEATHER_RULES.gustWatch} km/u), regen (minstens {WEATHER_RULES.rainWatchTotal} mm in totaal), sneeuw of mist.
        </Para>
        <Para>
          Slecht is onweer, ijzel, zware sneeuw, storm (gemiddeld {WEATHER_RULES.windBad} km/u of vlagen van {WEATHER_RULES.gustBad} km/u), zware regen ({WEATHER_RULES.rainBadHour} mm in een uur of {WEATHER_RULES.rainBadTotal} mm in totaal), extreme hitte (voelt als {WEATHER_RULES.heatBad} graden of meer) en strenge kou (voelt als {Math.abs(WEATHER_RULES.coldBad)} graden onder nul of kouder).
        </Para>
        <Para>
          Eindig je na zonsondergang, of begin je voor zonsopkomst, dan staat er dat je een lampje moet meenemen. Is het weer slecht en is er die week een dag met beter weer waarop de training past volgens de gewone regels, dan krijg je een voorstel om te ruilen. Dat gaat altijd met jouw Akkoord, nooit stil.
        </Para>
      </Card>

      <Card className="flex flex-col gap-2">
        <Eyebrow>BRON</Eyebrow>
        <Para>
          Weergegevens van{' '}
          <a href={OPEN_METEO_SITE} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2" style={{ color: 'var(--color-gold)' }}>Open-Meteo.com</a>
          , onder licentie CC BY 4.0. Open-Meteo is gratis voor niet-commercieel gebruik en vraagt geen sleutel of account.
        </Para>
        <Para>
          Het opgehaalde weer staat alleen op deze telefoon en gaat niet mee in een back-up. De plaats zelf zit bij je instellingen. Zonder verbinding laat ASCEND de laatste stand zien, met de tijd van de laatste update erbij. Een verwachting is een verwachting: kijk zelf nog even naar buiten.
        </Para>
      </Card>
    </div>
  );
}

function Para({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{children}</p>;
}
