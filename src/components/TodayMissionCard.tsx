import { useRef, useState, type ReactNode } from 'react';
import type { PlannedSession, SessionTemplate, SessionVariant, SubjectiveFeel } from '../models/training';
import { availableVariants } from '../engine/substitutions';
import { getTrainingGuide, guideDayLabel } from '../data/trainingGuide';
import { todayISO } from '../utils/dates';
import { TrainingGuideSheet } from './TrainingGuideSheet';
import { MoveSuggestions } from './MoveSuggestions';
import type { MoveSuggestion } from '../engine/moveSuggestions';
import { PrimaryButton, SecondaryButton, Eyebrow, ZoneBar } from './ui';
import { sessionKindLabel } from '../engine/sports';
import { StrengthDoneElsewhere, type StrengthDoneExtra } from './StrengthDoneElsewhere';
import { isLegHeavyTemplate } from '../engine/scheduler';
import { WarmupRow } from './WarmupRow';
import { NotFitLink } from './IllnessCard';
import { TodaySheet } from './vandaag/TodaySheet';
import { CheckGlyph } from './vandaag/glyphs';
import { ZONE_SENTENCE, type Zone } from './vandaag/zone';
import { SportDisc } from './SportDisc';
import { Icon } from './icons';
import type { MissionChip } from '../engine/missionFacts';
import { WeatherLine } from './WeatherLine';
import { ClothingAdvice } from './ClothingAdvice';
import { WatchStatusRow } from './WatchStatusRow';

// "40 minuten" groot, de rest kleiner met zijn eenheid ernaast.
function splitChip(text: string, tempo: boolean): { value: string; unit: string } | undefined {
  const m = /^([±]?\d[\d.,:]*)\s*(.*)$/.exec(text);
  if (!m) return undefined;
  // Een regel als "5× 1 min hard bergop" is een zin, geen getal met eenheid.
  if (!tempo && /[\d×x]/.test(m[2])) return undefined;
  return { value: m[1], unit: m[2] };
}

// De missie van vandaag: de training, het getal dat telt (minuten groot, de rest
// kleiner), de zone als die er is, één mint knop, en daaronder Verplaatsen en
// "Niet fit?". Wat minder vaak nodig is (uitleg, korte versie, voorschrift)
// staat achter het puntjesmenu. De enige kaart op het scherm met hoogtelijnen
// (.topo-mission). Het krachtformulier (StrengthDoneElsewhere) staat er ongewijzigd in.
export function TodayMissionCard({
  template,
  fullDuration,
  weekNote,
  chips,
  paceNote,
  zone,
  quickComplete = false,
  onStart,
  onLog,
  onShowPlan,
  onMove,
  onSkip,
  suggestions,
  onPickSuggestion,
  originalDate,
  coachLine,
  weatherSlot,
  session,
}: {
  template: SessionTemplate;
  fullDuration: number;
  weekNote?: string;
  // engine/missionFacts.ts: duur, zone en tempo (uit de test, als die er is).
  chips: MissionChip[];
  paceNote?: string;
  // De zone van de training, als die er een heeft.
  zone?: Zone;
  quickComplete?: boolean;
  onStart: (variant: SessionVariant, feel?: SubjectiveFeel, durationMinutes?: number, extra?: StrengthDoneExtra) => void;
  // "Gedaan": het scherm waar je invult hoe het ging, meteen bij het formulier.
  onLog: (variant: SessionVariant) => void;
  // Kracht in MacroFactor: het voorschrift van Forge om in de sportschool mee
  // te kijken (components/forge/ForgeWorkout.tsx, zonder invulvelden).
  onShowPlan?: () => void;
  onMove: (date: string) => void;
  onSkip: () => void;
  suggestions: MoveSuggestion[];
  onPickSuggestion: (suggestion: MoveSuggestion) => void;
  originalDate?: string;
  // engine/coach.ts#coachLineForToday
  coachLine?: string;
  // Hier komt de weerregel (WeatherLine) tussen de coachregel en de knop.
  weatherSlot?: ReactNode;
  // De geplande training zelf: voor de regel over het horloge.
  session?: PlannedSession;
}) {
  const [showMove, setShowMove] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  // Wat je in het menu koos, gebeurt pas als het blad dicht is: nooit twee lagen tegelijk.
  const afterMenu = useRef<(() => void) | null>(null);
  const variants = availableVariants(template);
  const shortVariant = variants.find((v) => v === 'short');
  const guide = getTrainingGuide(template.id);
  // Kracht die je in de app zelf bijhoudt begint met "Training starten";
  // al het andere is een "Gedaan" dat meteen naar het invulscherm gaat.
  const inAppStrength = template.type === 'strength';
  const kind = sessionKindLabel(template).toLowerCase();

  const showShort = !quickComplete && !!shortVariant;
  const showPlan = quickComplete && !!onShowPlan;
  const hasMenu = !!guide || showShort || showPlan;

  // De minuten staan groot; wat de duurchip méér zegt dan alleen de minuten ("4 × 4 min") blijft als tekst.
  const plainMinutes = new RegExp(`^${fullDuration} min$`);
  const others = chips.filter((c) => c.kind !== 'zone' && !(c.kind === 'duur' && plainMinutes.test(c.text)));
  const numeric = others.flatMap((c) => {
    const s = splitChip(c.text, c.kind === 'tempo');
    return s && c.kind !== 'duur' ? [{ chip: c, ...s }] : [];
  });
  const words = others.filter((c) => c.kind === 'duur' || !splitChip(c.text, c.kind === 'tempo'));

  return (
    <section
      className="topo-mission relative flex flex-col gap-4 overflow-hidden rounded-2xl border p-4"
      style={{ backgroundColor: 'var(--color-raised)', borderColor: 'color-mix(in srgb, var(--color-action) 42%, var(--color-card-border))' }}
      aria-label="Je missie van vandaag"
    >
      <div className="flex items-center gap-3">
        <SportDisc template={template} size={44} />
        <div className="min-w-0 flex-1">
          <Eyebrow>Vandaag · {kind}</Eyebrow>
          {weekNote && <p className="mt-0.5 text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{weekNote}</p>}
        </div>
        {hasMenu && (
          <button
            type="button"
            onClick={() => setShowMenu(true)}
            aria-label="Meer over deze training"
            aria-haspopup="dialog"
            className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
            style={{ color: 'var(--color-ink-dim)' }}
          >
            <Icon name="meer" size={22} />
          </button>
        )}
      </div>

      <div>
        <h2 className="font-display text-[28px] leading-tight" style={{ color: 'var(--color-ink)' }}>{template.name}</h2>

        <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-3" aria-label="Kerngetallen">
          <div className="flex flex-col gap-1">
            <span className="font-sans text-[40px] font-semibold leading-none tracking-[-0.03em] tabular-nums" style={{ color: 'var(--color-ink)' }}>{fullDuration}</span>
            <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>minuten</span>
          </div>
          {numeric.map(({ chip, value, unit }) => (
            <div key={chip.text} className="flex flex-col gap-1">
              <span className="whitespace-nowrap font-sans text-[28px] font-semibold leading-none tracking-[-0.02em] tabular-nums" style={{ color: 'var(--color-ink)' }}>
                {value}
                {unit && <span className="ml-1 text-sm font-medium tracking-normal" style={{ color: 'var(--color-ink-dim)' }}>{unit}</span>}
              </span>
              {chip.kind === 'tempo' && <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>per km</span>}
            </div>
          ))}
        </div>
        {words.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Meer over de training">
            {words.map((c) => (
              <li key={c.text} className="inline-flex min-h-[28px] items-center rounded-full px-3 text-sm tabular-nums" style={{ boxShadow: 'inset 0 0 0 1px var(--color-card-border)', color: 'var(--color-ink)' }}>
                {c.text}
              </li>
            ))}
          </ul>
        )}
        {paceNote && <p className="mt-2 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{paceNote}</p>}
      </div>

      {zone && (
        <div className="flex flex-col gap-3">
          <ZoneBar active={zone} label={`Zone ${zone}`} />
          <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>
            <span className="font-semibold" style={{ color: 'var(--color-progress)' }}>Zone {zone}.</span> {ZONE_SENTENCE[zone]}
          </p>
        </div>
      )}

      <div>
          {coachLine && (
            <p className="border-l-2 pl-3 text-[15px] leading-snug" style={{ borderColor: 'var(--color-action)', color: 'var(--color-ink)' }}>
              {coachLine}
            </p>
          )}
          {weatherSlot ?? <WeatherLine template={template} date={todayISO()} minutes={fullDuration} className="mt-3" />}
          <ClothingAdvice template={template} date={todayISO()} minutes={fullDuration} className="mt-1.5" compact />
          {session && <WatchStatusRow session={session} template={template} offer={false} className="mt-3" />}
        </div>

      <WarmupRow template={template} />

      {showGuide && guide && <TrainingGuideSheet title={template.name} guide={guide} template={template} dateIso={todayISO()} dayLabel={guideDayLabel(template, todayISO())} onClose={() => setShowGuide(false)} />}

      {quickComplete ? (
        <StrengthDoneElsewhere fullDuration={fullDuration} legs={isLegHeavyTemplate(template)} onDone={(feel, minutes, extra) => onStart('full', feel, minutes, extra)} />
      ) : inAppStrength ? (
        <PrimaryButton onClick={() => onStart('full')}>Training starten</PrimaryButton>
      ) : (
        <PrimaryButton onClick={() => onLog('full')}>
          <span className="inline-flex items-center justify-center gap-2"><CheckGlyph size={18} />Gedaan</span>
        </PrimaryButton>
      )}

      <div className="-mt-1 flex gap-2">
        <SecondaryButton onClick={() => setShowMove(true)}>Verplaatsen</SecondaryButton>
        <NotFitLink outlined />
      </div>

      {showMenu && (
        <TodaySheet
          eyebrow="Vandaag"
          title={template.name}
          onClose={() => {
            setShowMenu(false);
            const next = afterMenu.current;
            afterMenu.current = null;
            next?.();
          }}
        >
          {(close) => {
            const pick = (action: () => void) => () => {
              afterMenu.current = action;
              close();
            };
            const row = 'flex min-h-[52px] w-full items-center justify-between gap-3 border-b text-left last:border-b-0';
            return (
              <div className="flex flex-col">
                {guide && (
                  <button type="button" className={row} style={{ borderColor: 'var(--color-card-border)' }} onClick={pick(() => setShowGuide(true))}>
                    <span className="text-[15px]" style={{ color: 'var(--color-ink)' }}>Meer over deze training</span>
                    <span style={{ color: 'var(--color-ink-dim)' }}><Icon name="verder" size={16} /></span>
                  </button>
                )}
                {showShort && (
                  <button type="button" className={row} style={{ borderColor: 'var(--color-card-border)' }} onClick={pick(() => (inAppStrength ? onStart('short') : onLog('short')))}>
                    <span className="text-[15px]" style={{ color: 'var(--color-ink)' }}>Korte versie</span>
                    <span style={{ color: 'var(--color-ink-dim)' }}><Icon name="verder" size={16} /></span>
                  </button>
                )}
                {showPlan && (
                  <button type="button" className={row} style={{ borderColor: 'var(--color-card-border)' }} onClick={pick(() => onShowPlan?.())}>
                    <span className="text-[15px]" style={{ color: 'var(--color-ink)' }}>Voorschrift</span>
                    <span style={{ color: 'var(--color-ink-dim)' }}><Icon name="verder" size={16} /></span>
                  </button>
                )}
              </div>
            );
          }}
        </TodaySheet>
      )}

      {showMove && (
        <TodaySheet eyebrow="VERPLAATSEN" title={template.name} onClose={() => setShowMove(false)}>
          {(close) => (
            <MoveSuggestions
              sessionDate={todayISO()}
              originalDate={originalDate}
              suggestions={suggestions}
              onPick={(sug) => { close(); onPickSuggestion(sug); }}
              onPickDate={(date) => { close(); onMove(date); }}
              onSkip={() => { close(); onSkip(); }}
            />
          )}
        </TodaySheet>
      )}
    </section>
  );
}
