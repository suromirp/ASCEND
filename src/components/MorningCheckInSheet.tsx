import { useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import type { LegFeeling, MorningCheckIn } from '../models/checkIn';
import { recentPainSpot } from '../engine/wellbeing';
import { describeMorningPreview, previewMorningAdvice } from '../engine/adviceEngine';
import { ENERGY, LEGS, SLEEP, SOURCE_TEXT, type SuggestionSource } from '../engine/morningCard';
import { todayISO } from '../utils/dates';
import { TodaySheet } from './vandaag/TodaySheet';
import { SettingsLinkRow } from './settings/SettingsLink';
import { NotFitLink } from './IllnessCard';
import { WellnessLines } from './WellnessLines';
import { ShortNightAsk } from './ShortNightAsk';
import { useMorningPrefill } from './useMorningPrefill';
import { PrimaryButton } from './ui';

// Het blad van de ochtendvraag (docs/onderzoek/Pijn spierpijn en vermoeidheid
// melden.md): benen, energie en slaap, elk vergeleken met een gewone ochtend. Het
// blad opent vanaf de ochtendkaart, de regel "Gevoel" in "Je dag" en de melding.
// Wat ASCEND al weet staat er alvast in, met de bron erbij: slaap en energie uit het
// horloge, benen uit de beenindex (engine/morningCard.ts). Is alles ingevuld, dan is
// Opslaan één tik. Met een pijnplek van de laatste 14 dagen wordt die plek ook gescoord.

const KEEP = 60;

// Een rij van vier keuzes, elk minstens 44 px hoog. `from`: waar de ingevulde waarde vandaan komt.
function ChoiceRow<K extends string>({ label, from, options, value, set }: { label: string; from?: SuggestionSource; options: [K, string][]; value: K | undefined; set: (v: K) => void }) {
  return (
    <div>
      <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
        {label}
        {from && <span> · {SOURCE_TEXT[from]}</span>}
      </p>
      <div className="mt-1.5 grid grid-cols-4 gap-1.5">
        {options.map(([k, text], i) => {
          const on = value === k;
          const tone = i >= 2 ? 'var(--color-warning)' : 'var(--color-action)';
          return (
            <button key={k} onClick={() => set(k)} aria-pressed={on} className="min-h-[44px] rounded-lg border px-1 text-xs leading-tight" style={{ borderColor: on ? tone : 'var(--color-card-border)', color: on ? tone : 'var(--color-ink)', background: on ? 'color-mix(in srgb, currentColor 8%, transparent)' : 'transparent' }}>
              {text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// painOnly: de ochtendcheck staat uit, maar er is een pijnplek van de laatste 14
// dagen. Dan alleen die vraag, niet benen, energie en slaap.
// onSaved: de ochtendkaart meldt hiermee dat je via het blad hebt beantwoord, zodat
// ze net als na één tik blijft staan met Wijzigen en Ongedaan maken.
export function MorningCheckInSheet({ painOnly = false, initialLegs, onClose, onSaved }: { painOnly?: boolean; initialLegs?: LegFeeling; onClose: () => void; onSaved?: () => void }) {
  const { settings, updateSettings, sessionLogs, plannedSessions, templates, program, goalEngineConfig, answeredAdviceIds } = useAppData();
  const today = todayISO();
  const existing = settings.morningCheckIns?.find((c) => c.date === today);
  const spot = recentPainSpot(today, sessionLogs);
  const [draft, setDraft] = useState<MorningCheckIn>(() => existing ? { ...existing, sleep: existing.sleepSuggested ? undefined : existing.sleep } : { date: today, legs: initialLegs, spot: spot ? { area: spot.area, score: spot.lastScore } : undefined });
  const { prefill, reading } = useMorningPrefill(today);
  const wellness = painOnly ? undefined : reading;

  // Wat je zelf koos gaat voor; anders staat het voorstel erin (de cijfers van het
  // horloge kunnen na het openen nog binnenkomen). Een ochtend die er al is, krijgt
  // geen voorstel erbij.
  const suggest = !existing && !painOnly;
  const legs = draft.legs ?? (suggest ? prefill.legs?.value : undefined);
  const energy = draft.energy ?? (suggest ? prefill.energy?.value : undefined);
  // Een slaapantwoord dat uit het voorstel kwam, volgt je oordeel over de nacht: het staat
  // niet vast in het concept maar wordt vers uit de opgeslagen ochtend gelezen.
  const sleep = draft.sleep ?? (existing?.sleepSuggested ? existing.sleep : suggest ? prefill.sleep?.value : undefined);
  const legsFrom = suggest && !draft.legs ? prefill.legs?.from : undefined;
  const energyFrom = suggest && !draft.energy ? prefill.energy?.from : undefined;
  const sleepFrom = suggest && !draft.sleep ? prefill.sleep?.from : undefined;
  // Kwam het slaapantwoord uit het voorstel en koos je zelf niets, dan blijft het een voorstel.
  const sleepSuggested = !draft.sleep && !!sleep ? true : draft.sleepSuggested;

  function save(entry: MorningCheckIn) {
    onSaved?.();
    const others = (settings.morningCheckIns ?? []).filter((c) => c.date !== today);
    void updateSettings({ morningCheckIns: [...others, entry].sort((a, b) => a.date.localeCompare(b.date)).slice(-KEEP) });
    onClose();
  }

  // Wat Vandaag na opslaan zegt: hetzelfde advies, op je echte planning.
  const preview = () => {
    const entry: MorningCheckIn = { ...draft, legs, energy, sleep, date: today, allNormal: undefined };
    return describeMorningPreview(previewMorningAdvice({
      logs: sessionLogs, plannedSessions, templates, injuries: [], program,
      dailyTimeBudget: goalEngineConfig.availability.dailyTimeBudget,
      sameDayPairingPreference: goalEngineConfig.strategy.sameDayPairingPreference,
      respondedIds: answeredAdviceIds, asOf: today,
      checkIns: [...(settings.morningCheckIns ?? []).filter((c) => c.date !== today), entry],
    }).filter((a) => !answeredAdviceIds.has(a.id)));
  };

  const complete = painOnly ? draft.spot !== undefined : !!(legs && sleep && (energy || wellness));
  return (
    <TodaySheet eyebrow="Vanochtend" title={painOnly && spot ? `Hoe is je ${spot.area.toLowerCase()} vanochtend?` : 'Hoe voel je je vanochtend?'} onClose={onClose}>
      <div className="flex flex-col gap-3">
        {!painOnly && <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Vergeleken met een gewone ochtend.</p>}
        {!painOnly && <button onClick={() => save({ date: today, allNormal: true })} className="min-h-[44px] rounded-xl border px-3.5 py-2 text-sm font-semibold" style={{ borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' }}>
          Gaat goed
        </button>}
        {wellness && <WellnessLines reading={wellness} />}
        {wellness?.night && <ShortNightAsk reading={wellness} today={today} />}
        {!painOnly && <ChoiceRow label="Benen" from={legsFrom} options={LEGS} value={legs} set={(v) => setDraft({ ...draft, legs: v })} />}
        {!painOnly && <ChoiceRow label={wellness ? 'Energie (mag leeg blijven)' : 'Energie'} from={energyFrom} options={ENERGY} value={energy} set={(v) => setDraft({ ...draft, energy: v })} />}
        {!painOnly && <ChoiceRow label="Slaap" from={sleepFrom} options={SLEEP} value={sleep} set={(v) => setDraft({ ...draft, sleep: v, sleepSuggested: undefined })} />}
        {spot && (
          <div>
            <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Hoe is je {spot.area.toLowerCase()} vanochtend? 0 is niets. Na de training was het {spot.lastScore}.</p>
            <div className="mt-1.5 grid grid-cols-11 gap-1">
              {Array.from({ length: 11 }, (_, n) => n).map((n) => {
                const on = draft.spot?.score === n;
                return (
                  <button key={n} onClick={() => setDraft({ ...draft, spot: { area: spot.area, score: n } })} aria-pressed={on} className="min-h-[44px] rounded-md border text-xs tabular-nums" style={{ borderColor: on ? 'var(--color-warning)' : 'var(--color-card-border)', background: on ? 'var(--color-warning)' : 'transparent', color: on ? 'var(--color-bg)' : 'var(--color-ink-dim)' }}>
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {!painOnly && (
          <p className="text-xs leading-snug" role="status" style={{ color: complete ? 'var(--color-ink)' : 'var(--color-ink-dim)' }}>
            {!legs ? 'Kies eerst hoe je benen voelen.' : !sleep ? 'Kies nog hoe je sliep.' : !complete ? 'Kies nog je energie.' : preview()}
          </p>
        )}
        <div className="flex items-center justify-between gap-3">
          {painOnly ? <span /> : <NotFitLink />}
          <PrimaryButton fullWidth={false} disabled={!complete} onClick={() => save(painOnly ? { date: today, spot: draft.spot } : { ...draft, legs, energy, sleep, sleepSuggested: sleepSuggested || undefined, date: today, allNormal: undefined })}>
            Opslaan
          </PrimaryButton>
        </div>
        {existing && !painOnly && (
          <button
            onClick={() => { void updateSettings({ morningCheckIns: (settings.morningCheckIns ?? []).filter((c) => c.date !== today) }); onClose(); }}
            className="min-h-[44px] rounded-xl border px-3.5 text-sm font-medium"
            style={{ borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' }}
          >
            Antwoord van vanochtend wissen
          </button>
        )}
        <SettingsLinkRow page="vandaag" row="ochtendcheck" />
      </div>
    </TodaySheet>
  );
}
