import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { syncWatchActivities } from '../storage/externalActivities';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppData } from '../state/AppDataContext';
import type { LegFeeling, MorningCheckIn } from '../models/checkIn';
import { checkInFor, recentPainSpot } from '../engine/wellbeing';
import { LEGS, SOURCE_TEXT, morningCardView, morningConsequence } from '../engine/morningCard';
import { resolveLegEase } from '../engine/legEaseSettings';
import { NO_SLEEP_TEXT } from '../engine/wellnessCheck';
import { wantsMorningLink, withoutShortcut } from '../engine/shortcutAction';
import { todayISO } from '../utils/dates';
import { withTimeout } from '../utils/withTimeout';
import { Card, Eyebrow, SecondaryButton, Stat } from './ui';
import { TextButton } from './TextButton';
import { Icon } from './icons';
import { MorningCheckInSheet } from './MorningCheckInSheet';
import { ShortNightAsk } from './ShortNightAsk';
import { useMorningPrefill } from './useMorningPrefill';
import { markMorningAnswered } from './useMorningCardVisible';
import { useScrollToAdvice } from './motion';

// De ochtendvraag bovenaan Vandaag, boven de missiekaart (docs/beslissingen/2026-10-23-
// ochtendkaart-en-melding.md, docs/visie/Ochtendkaart vernieuwd.md). Drie standen:
// de vraag (voorstel als brede knop, de andere keuzes als pillen), het gevolg (één regel
// over wat je antwoord voor vandaag doet) en de ingeklapte rij met Wijzigen en
// Ongedaan maken. Het gevolg klapt na 6 seconden in, na 12 bij een voorstel. De kaart
// heeft zelf geen mint gloed en geen gevulde knop: de missiekaart houdt het ene accent.
// Met een pijnplek van de laatste 14 dagen opent elke tik het blad, want die plek wil
// een cijfer. De kaart blijft tot je hebt ingevuld, tot de middag of tot de eerste
// training van vandaag is gelogd.

const SAVE_LIMIT_MS = 8000;
const SAVE_FAILED = 'Opslaan lukte niet. Probeer het nog eens.';
const UNDO_FAILED = 'Ongedaan maken lukte niet. Probeer het nog eens.';
const FOLD_MS = 6000;
const FOLD_PROPOSAL_MS = 12000;

interface CardState {
  // Je hebt in dit bezoek antwoord gegeven of via het blad gewijzigd: dan staat het gevolg er.
  answered: boolean;
  folded: boolean;
}
type CardAction = { type: 'answered' } | { type: 'fold' } | { type: 'reset' };
function cardReducer(state: CardState, action: CardAction): CardState {
  if (action.type === 'answered') return { answered: true, folded: false };
  if (action.type === 'fold') return { ...state, folded: true };
  return { answered: false, folded: false };
}

// Een keuze van je benen als pil van minstens 44 px, die nooit breekt.
function MorningChoice({ children, onClick, disabled }: { children: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="min-h-[44px] whitespace-nowrap rounded-full px-3.5 text-sm active:opacity-70 disabled:opacity-40"
      style={{ border: '1px solid var(--color-control-border)', color: 'var(--color-ink)' }}
    >
      {children}
    </button>
  );
}

export function MorningCard() {
  const today = todayISO();
  const { settings, updateSettings, sessionLogs, plannedSessions, templates, program, goalEngineConfig, answeredAdviceIds, injuryNotes } = useAppData();
  const { prefill, reading, linked, sleepOn } = useMorningPrefill(today);
  const [sheet, setSheet] = useState<{ legs?: LegFeeling } | null>(null);
  const [state, dispatch] = useReducer(cardReducer, { answered: false, folded: false });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [undoError, setUndoError] = useState(false);
  const [held, setHeld] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [bodyHeight, setBodyHeight] = useState(0);
  const scrollToAdvice = useScrollToAdvice();
  const { stats, heading, line } = morningCardView(reading, { sleepExpected: sleepOn, linked });
  const suggested = prefill.legs;
  const spot = recentPainSpot(today, sessionLogs);
  const answered = checkInFor(today, settings.morningCheckIns);
  const rememberHeight = () => { setBodyHeight(bodyRef.current?.parentElement?.getBoundingClientRect().height ?? 0); };

  // Eén tik: je benen, met energie en slaap van het horloge als die er zijn. De tik wacht
  // op het opslaan, met een grens in tijd; mislukt het, dan blijft de vraag staan.
  const answer = async (legs: LegFeeling) => {
    if (saving) return;
    if (spot) { setSheet({ legs }); return; }
    const others = (settings.morningCheckIns ?? []).filter((c) => c.date !== today);
    const entry: MorningCheckIn = { date: today, legs, energy: prefill.energy?.value, sleep: prefill.sleep?.value, ...(prefill.sleep ? { sleepSuggested: true } : {}) };
    setSaving(true);
    setSaveError(false);
    rememberHeight();
    markMorningAnswered(today);
    try {
      await withTimeout(updateSettings({ morningCheckIns: [...others, entry].sort((a, b) => a.date.localeCompare(b.date)).slice(-60) }), SAVE_LIMIT_MS, 'Opslaan');
      dispatch({ type: 'answered' });
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };
  const onSheetSaved = () => {
    rememberHeight();
    markMorningAnswered(today);
    dispatch({ type: 'answered' });
  };
  // Ongedaan maken wacht op het opslaan, met dezelfde grens in tijd; mislukt het, dan blijft
  // je antwoord staan en zegt de kaart het.
  const undo = async () => {
    if (saving) return;
    setSaving(true);
    setUndoError(false);
    try {
      await withTimeout(updateSettings({ morningCheckIns: (settings.morningCheckIns ?? []).filter((c) => c.date !== today) }), SAVE_LIMIT_MS, 'Ongedaan maken');
      dispatch({ type: 'reset' });
    } catch {
      setUndoError(true);
    } finally {
      setSaving(false);
    }
  };

  // Wat het antwoord voor vandaag doet: dezelfde regels als het blad en Vandaag.
  const consequence = useMemo(() => {
    if (!answered) return undefined;
    const inputs = {
      logs: sessionLogs, plannedSessions, templates, injuries: injuryNotes, program,
      dailyTimeBudget: goalEngineConfig.availability.dailyTimeBudget,
      sameDayPairingPreference: goalEngineConfig.strategy.sameDayPairingPreference,
      respondedIds: answeredAdviceIds, asOf: today, legEase: resolveLegEase({ legEase: settings.legEase }),
      checkIns: settings.morningCheckIns,
    };
    return morningConsequence(answered, { inputs, answeredAdviceIds });
  }, [answered, sessionLogs, plannedSessions, templates, injuryNotes, program, goalEngineConfig, answeredAdviceIds, settings.legEase, settings.morningCheckIns, today]);

  const phase: 'vraag' | 'gevolg' | 'klein' = !answered ? 'vraag' : state.answered && !state.folded ? 'gevolg' : 'klein';
  const hasProposal = !!consequence?.adviceId;

  // Het gevolg klapt vanzelf in, niet zolang je vinger op de kaart ligt. De timer is geen animatie
  // en loopt dus in elke stand van Beweging.
  useEffect(() => {
    if (phase !== 'gevolg' || held) return;
    const id = window.setTimeout(() => dispatch({ type: 'fold' }), hasProposal ? FOLD_PROPOSAL_MS : FOLD_MS);
    return () => window.clearTimeout(id);
  }, [phase, held, hasProposal]);

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
  const sheetEl = sheet && <MorningCheckInSheet initialLegs={sheet.legs} onClose={() => setSheet(null)} onSaved={onSheetSaved} />;

  // Ingeklapt: één rij met wat je koos en wat het doet, Wijzigen en Ongedaan maken altijd binnen één tik.
  if (phase === 'klein' && answered && consequence) {
    return (
      <>
        <Card className="mx-fold flex flex-col gap-0 py-2">
          <div className="flex items-center gap-2" title={consequence.summary} aria-label={consequence.summary}>
            <span className="shrink-0" style={{ color: 'var(--color-progress)' }}><Icon name="vinkje" size={20} /></span>
            {hasProposal ? (
              <button
                type="button"
                onClick={() => consequence.adviceId && scrollToAdvice(consequence.adviceId)}
                className="min-h-[44px] min-w-0 flex-1 text-left active:opacity-70"
              >
                <span className="line-clamp-2 text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{consequence.summary}</span>
              </button>
            ) : (
              <p className="line-clamp-2 text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{consequence.summary}</p>
            )}
          </div>
          <div className="flex flex-nowrap items-center justify-end gap-x-3">
            <TextButton onClick={() => setSheet({})}>Wijzigen</TextButton>
            <TextButton tone="dim" disabled={saving} onClick={() => void undo()}>Ongedaan maken</TextButton>
          </div>
          {undoError && <p className="pb-1 text-xs leading-snug" role="alert" style={{ color: 'var(--color-warning)' }}>{UNDO_FAILED}</p>}
        </Card>
        {sheetEl}
      </>
    );
  }

  // Direct na het antwoord: één regel gevolg, op de plek van de vraag.
  if (phase === 'gevolg' && consequence) {
    return (
      <>
        <Card
          className="flex flex-col gap-3"
          onPointerDown={() => setHeld(true)}
          onPointerUp={() => setHeld(false)}
          onPointerCancel={() => setHeld(false)}
          onPointerLeave={() => setHeld(false)}
          onClick={(e) => { if (!(e.target as HTMLElement).closest('button')) dispatch({ type: 'fold' }); }}
        >
          <div className="mx-swap flex flex-col gap-3" style={{ minHeight: bodyHeight > 0 ? Math.max(0, bodyHeight - 34) : undefined }} role="status">
            <Header heading={undefined} />
            <div className="flex items-start gap-2">
              <span className="mx-check-draw mt-0.5 shrink-0" style={{ color: 'var(--color-progress)' }}><Icon name="vinkje" size={20} /></span>
              <p className="text-base leading-snug" style={{ color: 'var(--color-ink)' }}>{consequence.answer}</p>
            </div>
            {consequence.line && <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{consequence.line}</p>}
            {consequence.detail && <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{consequence.detail}</p>}
            {consequence.adviceId && (
              <div className="mt-1 flex">
                <SecondaryButton onClick={() => consequence.adviceId && scrollToAdvice(consequence.adviceId)}>Bekijk voorstel</SecondaryButton>
              </div>
            )}
            <div className="mt-auto flex justify-end">
              <TextButton tone="dim" disabled={saving} onClick={() => void undo()}>Ongedaan maken</TextButton>
            </div>
            {undoError && <p className="text-xs leading-snug" role="alert" style={{ color: 'var(--color-warning)' }}>{UNDO_FAILED}</p>}
          </div>
        </Card>
        {sheetEl}
      </>
    );
  }

  return (
    <>
      <Card className="flex flex-col gap-3">
        <div ref={bodyRef} className="flex flex-col gap-3">
          <Header heading={heading} />
          <p className="font-display text-xl leading-snug" style={{ color: 'var(--color-ink)' }}>Hoe voelen je benen?</p>
          {(stats.length > 0 || line || linked) && (
            <div style={{ minHeight: linked ? 48 : undefined }}>
              {stats.length > 0 ? (
                <div className="grid divide-x" style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))`, borderColor: 'var(--color-card-border)' }}>
                  {stats.map((st, i) => (
                    <div key={st.label} className={`min-w-0 ${i > 0 ? 'pl-4' : ''}`} style={{ borderColor: 'var(--color-card-border)' }}>
                      <Stat label={st.label} value={st.value} unit={st.unit} />
                    </div>
                  ))}
                </div>
              ) : (
                line && <p className="text-xs leading-snug tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{line}</p>
              )}
            </div>
          )}
          {reading?.night && <ShortNightAsk reading={reading} today={today} />}
          {missingSleep && (
            <div className="-my-2 flex flex-wrap items-center gap-x-3">
              {stats.length > 0 && <span className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{NO_SLEEP_TEXT}</span>}
              <TextButton size="xs" disabled={fetching === 'busy'} onClick={() => void fetchAgain()}>Opnieuw ophalen</TextButton>
              {fetchNote && <span className="text-xs leading-snug" role="status" style={{ color: 'var(--color-ink-dim)' }}>{fetchNote}</span>}
            </div>
          )}
          {suggested && suggestedText && (
            <div>
              <SecondaryButton className="flex w-full min-h-[48px] items-center justify-center gap-2" disabled={saving} onClick={() => void answer(suggested.value)}>
                <Icon name="vinkje" size={18} />
                Klopt: {suggestedText.toLowerCase()}
              </SecondaryButton>
              <p className="mt-1.5 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Voorstel {SOURCE_TEXT[suggested.from]}. Of kies zelf:</p>
              {spot && <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Eerst nog één vraag over je {spot.area.toLowerCase()}.</p>}
            </div>
          )}
          <div>
            <div className="flex flex-wrap gap-2">
              {LEGS.filter(([k]) => k !== suggested?.value).map(([k, text]) => (
                <MorningChoice key={k} disabled={saving} onClick={() => void answer(k)}>{text}</MorningChoice>
              ))}
            </div>
            {!suggested && spot && <p className="mt-1.5 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Eerst nog één vraag over je {spot.area.toLowerCase()}.</p>}
            {saveError && <p className="mt-2 text-xs leading-snug" role="alert" style={{ color: 'var(--color-warning)' }}>{SAVE_FAILED}</p>}
          </div>
        </div>
        <TextButton tone="dim" size="xs" className="-my-2 self-start" onClick={() => setSheet({})}>
          Energie, slaap of pijn invullen
        </TextButton>
      </Card>
      {sheetEl}
    </>
  );
}

function Header({ heading }: { heading: string | undefined }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2" style={{ color: 'var(--color-page)' }}>
        <Icon name="vandaag" size={20} />
        <Eyebrow>Goedemorgen</Eyebrow>
      </div>
      {heading && (
        <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
          <Icon name="horloge" size={14} />
          {heading}
        </span>
      )}
    </div>
  );
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
