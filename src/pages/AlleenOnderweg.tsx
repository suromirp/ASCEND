// ASCEND — Alleen onderweg: het alarmnummer, wat je bij een ongeluk doet, je
// afspraak met thuis en de vertrekbrief die de app uit je etappeplan
// samenstelt. Wat je invult blijft op de telefoon. De app alarmeert niemand:
// dit is een afspraak en een brief, geen noodsysteem.

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Portal } from '../components/Portal';
import { Card, Eyebrow, PrimaryButton, SecondaryButton, PageHeader, SheetGrip } from '../components/ui';
import { useAppData } from '../state/AppDataContext';
import { useTripPlan } from '../state/useTripPlan';
import { buildItinerary, itineraryTotals } from '../engine/routePlan';
import { buildDepartureLetter, EMERGENCY_NUMBER, letterGaps, SMS_FALLBACK_NUMBER } from '../engine/departureLetter';
import { ALARM_COST_NOTE, ALARM_REPORT, ALARM_SOURCES, ALARM_STEPS, NO_COVERAGE_NOTE } from '../data/soloSafety';
import type { SatelliteAnswer } from '../models/routePlan';
import { canShareText, copyText, shareText } from '../utils/shareText';
import { useSheetClose } from '../utils/useSheetClose';
import { formatDateNL } from '../utils/dates';
import { Icon } from '../components/icons';
import { TextButton } from '../components/TextButton';
import { mainGoal } from '../engine/mainGoal';

const inputStyle = { background: 'var(--color-charcoal)', borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' };
const inputClass = 'mt-1 w-full rounded-xl border px-3 py-2.5 text-sm';

const SATELLITE_CHOICES: { value: SatelliteAnswer; label: string }[] = [
  { value: 'ja', label: 'Ja' },
  { value: 'nee', label: 'Nee' },
  { value: 'nog-niet', label: 'Nog niet beslist' },
];

export function AlleenOnderwegPage() {
  const navigate = useNavigate();
  const { trainingGoals, goalMilestones } = useAppData();
  const { plan, solo, loaded, updateSolo } = useTripPlan();
  const [letterOpen, setLetterOpen] = useState(false);
  const [feedback, setFeedback] = useState('');

  const goal = mainGoal(trainingGoals, goalMilestones, 'live');
  const startDate = goal?.targetDate;
  const days = useMemo(() => buildItinerary(plan, startDate), [plan, startDate]);
  const totals = useMemo(() => itineraryTotals(days), [days]);
  const letter = useMemo(() => buildDepartureLetter(days, solo), [days, solo]);
  const gaps = useMemo(() => letterGaps(solo, days), [solo, days]);

  async function copy() {
    setFeedback((await copyText(letter)) ? 'Gekopieerd. Plak de brief in een bericht aan thuis.' : 'Kopiëren lukte niet. Open de brief en selecteer de tekst zelf.');
  }
  async function share() {
    const result = await shareText('Vertrekbrief GR5', letter);
    if (result === 'shared') setFeedback('Gedeeld.');
    else if (result === 'failed') setFeedback('Delen lukte niet. Gebruik Kopiëren.');
  }

  return (
    <div className="animate-page-in flex flex-col gap-4 px-4 pb-24 pt-6">
      <PageHeader eyebrow="Reis" title="Alleen onderweg" line="Je kaart voor als het misgaat" fallback="/ascend" />

      <Card className="flex flex-col gap-3" texture>
        <Eyebrow>Alarm</Eyebrow>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-sans tabular-nums text-5xl leading-none" style={{ color: 'var(--color-ink)' }}>{EMERGENCY_NUMBER}</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>Alarmnummer in Frankrijk, ook in de bergen</p>
          </div>
          <a
            href={`tel:${EMERGENCY_NUMBER}`}
            className="flex min-h-11 items-center whitespace-nowrap rounded-xl border px-4 text-xs font-semibold"
            style={{ borderColor: 'var(--color-action)', color: 'var(--color-action)' }}
          >
            BEL {EMERGENCY_NUMBER}
          </a>
        </div>
        <div className="flex items-center justify-between gap-3 border-t pt-3" style={{ borderColor: 'var(--color-card-border)' }}>
          <div>
            <p className="font-sans tabular-nums text-2xl leading-none" style={{ color: 'var(--color-ink)' }}>{SMS_FALLBACK_NUMBER}</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>Per sms, als bellen niet lukt</p>
          </div>
          <a
            href={`sms:${SMS_FALLBACK_NUMBER}`}
            className="flex min-h-11 items-center rounded-xl border px-4 text-xs font-medium"
            style={{ borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' }}
          >
            SMS {SMS_FALLBACK_NUMBER}
          </a>
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <Eyebrow>Bij een ongeluk</Eyebrow>
        <ol className="flex flex-col gap-3">
          {ALARM_STEPS.map((step, i) => (
            <li key={step} className="flex gap-3 text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>
              <span className="font-sans tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{NO_COVERAGE_NOTE}</p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{ALARM_COST_NOTE}</p>
        <TextButton onClick={() => navigate('/kennis/noodgevallen')} className="self-start text-left" icon="verder">
          Meer in de Kennisbank: Als het misgaat
        </TextButton>
        <div className="border-t pt-3" style={{ borderColor: 'var(--color-card-border)' }}>
          <Eyebrow>Bronnen</Eyebrow>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{ALARM_REPORT}</p>
          <div className="mt-1 flex flex-col">
            {ALARM_SOURCES.map((s) => (
              <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center text-xs underline underline-offset-2" style={{ color: 'var(--color-action)' }}>
                {s.label}<Icon name="buiten" size={14} className="ml-1 inline align-[-2px]" />
              </a>
            ))}
          </div>
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <div>
          <Eyebrow>Afspraak met thuis</Eyebrow>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
            Dit blijft op je telefoon en gaat alleen mee als je het zelf deelt. De app stuurt zelf niets en alarmeert niemand: het is een afspraak tussen jou en thuis.
          </p>
        </div>
        {!loaded ? (
          <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Je afspraak wordt geladen.</p>
        ) : (
          <>
            <div>
              <label htmlFor="solo-who" className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Wie is je thuisfront?</label>
              <input id="solo-who" type="text" value={solo.who} maxLength={80} onChange={(e) => updateSolo({ who: e.target.value })} placeholder="Bijvoorbeeld een voornaam" className={inputClass} style={inputStyle} />
              <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Deze naam staat bovenaan je brief. Hij blijft op deze telefoon.</p>
            </div>
            <div>
              <label htmlFor="solo-time" className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Hoe laat stuur je elke dag een bericht?</label>
              <input id="solo-time" type="time" value={solo.checkInTime} onChange={(e) => updateSolo({ checkInTime: e.target.value })} className={inputClass} style={inputStyle} />
              <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Een vast moment, bijvoorbeeld als je de tent staat. Kies een tijd waarop je meestal al bij je slaapplek bent.</p>
            </div>
            <div>
              <label htmlFor="solo-missing" className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Wat doet thuis als je bericht uitblijft?</label>
              <textarea id="solo-missing" value={solo.ifMissing} rows={4} maxLength={2000} onChange={(e) => updateSolo({ ifMissing: e.target.value })} placeholder="Bijvoorbeeld: na twee uur bellen, na zes uur 112 bellen met het etappeplan" className={inputClass} style={inputStyle} />
              <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Spreek vooraf af hoe lang thuis wacht en wanneer 112 wordt gebeld. In dalen zonder bereik kan een dag stilte normaal zijn.</p>
            </div>

            <div>
              <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Neem je een satellietcommunicator mee?</p>
              <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="Satellietcommunicator">
                {SATELLITE_CHOICES.map((c) => {
                  const selected = solo.satellite === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => updateSolo({ satellite: selected ? '' : c.value })}
                      className="min-h-11 rounded-xl border px-1 text-xs font-medium transition-all active:scale-[0.98]"
                      style={selected
                        ? { borderColor: 'var(--color-action)', background: 'var(--color-card)', color: 'var(--color-action)' }
                        : { borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)', color: 'var(--color-ink-dim)' }}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
              <input type="text" value={solo.satelliteNote} maxLength={300} onChange={(e) => updateSolo({ satelliteNote: e.target.value })} aria-label="Welk toestel" placeholder="Toestel, of hoe thuis je bereikt" className={inputClass} style={inputStyle} />
            </div>

            <div>
              <label htmlFor="solo-gear" className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Hoe herkent men jou en je tent?</label>
              <textarea id="solo-gear" value={solo.gear} rows={3} maxLength={2000} onChange={(e) => updateSolo({ gear: e.target.value })} placeholder="Kleur van tent, rugzak en jas, en wat je verder bij je hebt" className={inputClass} style={inputStyle} />
              <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Dit helpt een zoekactie. Het staat in de brief onder uitrusting.</p>
            </div>
          </>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <Eyebrow>Vertrekbrief</Eyebrow>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
          ASCEND stelt een brief voor thuis samen uit je etappeplan: de route, je slaapplek per datum, je uitrusting, de afspraak en of je een satellietcommunicator meeneemt.
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
          Nu {totals.walkDays} loopdagen{totals.restDays > 0 ? ` en ${totals.restDays} ${totals.restDays === 1 ? 'rustdag' : 'rustdagen'}` : ''}
          {startDate && totals.endDate ? `, van ${formatDateNL(startDate)} tot ${formatDateNL(totals.endDate)}` : ''}. Slaapplekken en rustdagen pas je aan in het etappeplan.
        </p>
        {gaps.length > 0 ? (
          <div className="rounded-xl border p-3" style={{ borderColor: 'var(--color-warning)' }}>
            <p className="text-xs font-semibold" style={{ color: 'var(--color-warning)' }}>Nog in te vullen</p>
            <ul className="mt-1 flex flex-col gap-0.5">
              {gaps.map((g) => <li key={g} className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>· {g}</li>)}
            </ul>
          </div>
        ) : (
          <p className="text-xs font-medium" style={{ color: 'var(--color-success-text)' }}>De brief is compleet.</p>
        )}
        <div className="flex gap-3">
          <PrimaryButton fullWidth={false} onClick={() => void copy()}>Kopiëren</PrimaryButton>
          {canShareText() && <SecondaryButton onClick={() => void share()}>Delen</SecondaryButton>}
        </div>
        <SecondaryButton onClick={() => setLetterOpen(true)}>Brief lezen</SecondaryButton>
        {feedback && <p role="status" className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{feedback}</p>}
        <SecondaryButton onClick={() => navigate('/etappes')}>Naar het etappeplan</SecondaryButton>
      </Card>

      {letterOpen && <LetterSheet letter={letter} onCopy={() => void copy()} onShare={canShareText() ? () => void share() : undefined} feedback={feedback} onClose={() => setLetterOpen(false)} />}
    </div>
  );
}

function LetterSheet({ letter, onCopy, onShare, feedback, onClose }: { letter: string; onCopy: () => void; onShare?: () => void; feedback: string; onClose: () => void }) {
  const { closing, requestClose, sheetRef } = useSheetClose(onClose);
  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div ref={sheetRef} role="dialog" aria-modal="true" aria-label="Vertrekbrief" className={`relative max-h-[88vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <SheetGrip />
          <Card className="rounded-b-none border-b-0 pb-8">
            <Eyebrow>Vertrekbrief</Eyebrow>
            <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{letter}</div>
            <div className="mt-5 flex gap-3">
              <PrimaryButton fullWidth={false} onClick={onCopy}>Kopiëren</PrimaryButton>
              {onShare && <SecondaryButton onClick={onShare}>Delen</SecondaryButton>}
            </div>
            {feedback && <p role="status" className="mt-2 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{feedback}</p>}
            <button onClick={requestClose} className="mt-4 min-h-11 w-full text-center text-xs" style={{ color: 'var(--color-ink-dim)' }}>Sluiten</button>
          </Card>
        </div>
      </div>
    </Portal>
  );
}
