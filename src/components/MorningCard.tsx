import { useEffect, useState } from 'react';
import { syncWatchActivities } from '../storage/externalActivities';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppData } from '../state/AppDataContext';
import type { LegFeeling } from '../models/checkIn';
import { checkInFor, recentPainSpot } from '../engine/wellbeing';
import { LEGS, SOURCE_TEXT } from '../engine/morningCard';
import { NO_SLEEP_TEXT, watchSummaryLine, type WellnessLine } from '../engine/wellnessCheck';
import { wantsMorningLink, withoutShortcut } from '../engine/shortcutAction';
import { todayISO } from '../utils/dates';
import { Card, SecondaryButton, Stat } from './ui';
import { Icon } from './icons';
import { MorningCheckInSheet } from './MorningCheckInSheet';
import { ShortNightAsk } from './ShortNightAsk';
import { useMorningPrefill } from './useMorningPrefill';
import { markMorningAnswered } from './useMorningCardVisible';

// De ochtendvraag bovenaan Vandaag, boven de missiekaart (docs/beslissingen/2026-10-23-
// ochtendkaart-en-melding.md): "Goedemorgen. Hoe voel je je?" met één regel van wat het
// horloge gaf en de vier keuzes voor je benen. Steen, geen goud: de missiekaart houdt de
// gouden knop. Eén tik op hoe je benen voelen is het antwoord: energie en slaap komen
// van het horloge of gelden als gewoon. Met een pijnplek van de laatste 14 dagen opent
// de tik het blad, want die plek wil een cijfer. "Meer invullen" opent het blad ook.
// De kaart blijft tot je hebt ingevuld, tot de middag of tot de eerste training van
// vandaag is gelogd.

export function MorningCard() {
  const today = todayISO();
  const { settings, updateSettings, sessionLogs } = useAppData();
  const { prefill, reading, linked, sleepOn } = useMorningPrefill(today);
  const [sheet, setSheet] = useState<{ legs?: LegFeeling } | null>(null);
  const line = reading || linked ? watchSummaryLine(reading, { sleepExpected: sleepOn }) : '';
  const suggested = prefill.legs;
  const spot = recentPainSpot(today, sessionLogs);
  // Eén tik: je benen, met energie en slaap van het horloge als die er zijn.
  const answer = (legs: LegFeeling) => {
    if (spot) { setSheet({ legs }); return; }
    const others = (settings.morningCheckIns ?? []).filter((c) => c.date !== today);
    const entry = { date: today, legs, energy: prefill.energy?.value, sleep: prefill.sleep?.value };
    markMorningAnswered(today);
    void updateSettings({ morningCheckIns: [...others, entry].sort((a, b) => a.date.localeCompare(b.date)).slice(-60) });
  };
  // Wel iets van het horloge, geen slaap: die komt via Garmin Connect soms later bij intervals.icu.
  const missingSleep = !!reading && sleepOn && !reading.lines.some((l) => l.key === 'sleep');
  const [fetching, setFetching] = useState<'busy' | 'tried' | 'failed' | 'slow' | null>(null);
  async function fetchAgain() {
    setFetching('busy');
    const limit = new Promise<'slow'>((r) => setTimeout(() => r('slow'), 15000));
    try {
      const result = await Promise.race([syncWatchActivities({ force: true }), limit]);
      setFetching(result === 'slow' ? 'slow' : result.status === 'error' ? 'failed' : 'tried');
    } catch {
      setFetching('failed');
    }
  }
  const fetchNote = fetching === 'busy' ? 'Even kijken bij intervals.icu...' : fetching === 'tried' ? 'Nog geen slaap bij intervals.icu' : fetching === 'failed' ? 'Ophalen lukte niet. Probeer het straks nog eens.' : fetching === 'slow' ? 'Dit duurt te lang. Probeer het straks nog eens.' : '';
  const suggestedText = suggested ? LEGS.find(([k]) => k === suggested.value)?.[1] : undefined;
  const answered = checkInFor(today, settings.morningCheckIns);
  const undo = () => {
    void updateSettings({ morningCheckIns: (settings.morningCheckIns ?? []).filter((c) => c.date !== today) });
  };

  // Net beantwoord: de kaart blijft klein staan, zodat je ziet wat je koos en het
  // kunt wijzigen of ongedaan maken. Later op de dag kan dat via Gevoel in Je dag.
  if (answered) {
    const legsText = answered.allNormal ? 'Gaat goed' : `Benen ${(LEGS.find(([k]) => k === answered.legs)?.[1] ?? 'ingevuld').toLowerCase()}`;
    return (
      <>
        <Card className="flex flex-col gap-3">
          <div>
            <Title />
            <p className="mt-1 text-sm" style={{ color: 'var(--color-ink)' }}>{legsText}. Opgeslagen.</p>
          </div>
          <div className="flex gap-2">
            <SecondaryButton onClick={() => setSheet({})}>Wijzigen</SecondaryButton>
            <SecondaryButton onClick={undo}>Ongedaan maken</SecondaryButton>
          </div>
        </Card>
        {sheet && <MorningCheckInSheet onClose={() => setSheet(null)} onSaved={() => markMorningAnswered(today)} />}
      </>
    );
  }

  const stats = (reading?.lines ?? []).flatMap((l) => {
    const stat = statOf(l);
    return stat ? [stat] : [];
  });

  return (
    <>
      <Card className="flex flex-col gap-4">
        <div>
          <div className="flex items-center justify-between gap-2">
            <Title />
            {stats.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                <Icon name="horloge" size={14} />
                van je horloge
              </span>
            )}
          </div>
          {stats.length > 0 ? (
            <div className="mt-3 grid divide-x" style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))`, borderColor: 'var(--color-card-border)' }}>
              {stats.map((st, i) => (
                <div key={st.label} className={`min-w-0 ${i > 0 ? 'pl-4' : ''}`} style={{ borderColor: 'var(--color-card-border)' }}>
                  <Stat label={st.label} value={st.value} unit={st.unit} />
                </div>
              ))}
            </div>
          ) : (
            line && <p className="mt-1.5 text-xs leading-snug tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{line}</p>
          )}
          {reading?.night && <div className="mt-3"><ShortNightAsk reading={reading} today={today} /></div>}
          {missingSleep && (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {stats.length > 0 && <span className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{NO_SLEEP_TEXT}</span>}
              <button onClick={() => void fetchAgain()} disabled={fetching === 'busy'} className="min-h-[44px] rounded-lg border px-3 text-xs font-medium disabled:opacity-40" style={{ borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' }}>
                Opnieuw ophalen
              </button>
              {fetchNote && <span className="text-xs leading-snug" role="status" style={{ color: 'var(--color-ink-dim)' }}>{fetchNote}</span>}
            </div>
          )}
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Hoe voelen je benen? Eén tik is genoeg</p>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {LEGS.map(([k, text]) => {
              const isSuggestion = suggested?.value === k;
              return (
                <button
                  key={k}
                  onClick={() => answer(k)}
                  className="min-h-[44px] rounded-xl px-1 text-sm leading-tight transition-all active:scale-[0.97]"
                  style={{
                    boxShadow: isSuggestion ? 'inset 0 0 0 1.5px var(--color-action)' : 'inset 0 0 0 1px var(--color-control-border)',
                    background: isSuggestion ? 'color-mix(in srgb, var(--color-action) 10%, transparent)' : 'transparent',
                    color: 'var(--color-ink)',
                  }}
                >
                  {text}
                </button>
              );
            })}
          </div>
          {suggested && suggestedText && (
            <p className="mt-1.5 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
              Voorstel {SOURCE_TEXT[suggested.from]}: {suggestedText.toLowerCase()}
            </p>
          )}
        </div>
        <button
          onClick={() => setSheet({})}
          className="-my-2 min-h-[44px] self-start text-xs font-medium"
          style={{ color: 'var(--color-ink-dim)' }}
        >
          Energie, slaap of pijn invullen
        </button>
      </Card>
      {sheet && <MorningCheckInSheet initialLegs={sheet.legs} onClose={() => setSheet(null)} onSaved={() => markMorningAnswered(today)} />}
    </>
  );
}

function Title() {
  return <h2 className="text-base font-semibold leading-snug" style={{ color: 'var(--color-ink)' }}>Vanochtend</h2>;
}

// De drie getallen van het horloge als Stat: waarde en eenheid apart.
function statOf(l: WellnessLine): { label: string; value: string; unit?: string } | undefined {
  if (l.key === 'restingHeartRate') {
    const n = /^(\d+)/.exec(l.value)?.[1];
    return n ? { label: 'Rusthart', value: n, unit: 'bpm' } : undefined;
  }
  if (l.key === 'hrv') {
    const n = /^(\d+)/.exec(l.value)?.[1];
    return n ? { label: 'HRV', value: n, unit: 'ms' } : undefined;
  }
  const hm = /^(\d+) uur(?: (\d+))?$/.exec(l.value);
  if (hm) return { label: 'Slaap', value: `${hm[1]}:${(hm[2] ?? '0').padStart(2, '0')}`, unit: 'u' };
  const min = /^(\d+) min$/.exec(l.value);
  if (min) return { label: 'Slaap', value: min[1], unit: 'min' };
  return { label: 'Slaap', value: l.value };
}

// De melding "Goedemorgen. Hoe voel je je?" opent Vandaag op `#/?actie=ochtend`
// (public/morning-notice-sw.js). Het adres wordt één keer gelezen en weggehaald, en
// het blad gaat open, ook als de kaart er niet (meer) staat. Is de ochtend al
// ingevuld, dan gebeurt er niets behalve het opruimen van het adres.
export function MorningDeepLink() {
  const { settings } = useAppData();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const today = todayISO();
  const filled = !!checkInFor(today, settings.morningCheckIns);

  useEffect(() => {
    if (!wantsMorningLink(location.search)) return;
    navigate({ pathname: location.pathname, search: withoutShortcut(location.search) }, { replace: true });
    if (!filled) setOpen(true);
    // Alleen als het adres de actie bevat.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  return open ? <MorningCheckInSheet onClose={() => setOpen(false)} onSaved={() => markMorningAnswered(today)} /> : null;
}
