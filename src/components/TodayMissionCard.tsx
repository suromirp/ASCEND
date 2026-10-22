import { useState, type ReactNode } from 'react';
import type { PlannedSession, SessionTemplate, SessionVariant, SubjectiveFeel } from '../models/training';
import { availableVariants } from '../engine/substitutions';
import { getTrainingGuide, guideDayLabel } from '../data/trainingGuide';
import { todayISO } from '../utils/dates';
import { TrainingGuideSheet } from './TrainingGuideSheet';
import { MoveSuggestions } from './MoveSuggestions';
import type { MoveSuggestion } from '../engine/moveSuggestions';
import { PrimaryButton, Eyebrow, InfoButton } from './ui';
import { sessionKindLabel } from '../engine/sports';
import { StrengthDoneElsewhere, type StrengthDoneExtra } from './StrengthDoneElsewhere';
import { isLegHeavyTemplate } from '../engine/scheduler';
import { WarmupRow } from './WarmupRow';
import { NotFitLink } from './IllnessCard';
import { TodaySheet } from './vandaag/TodaySheet';
import { CheckGlyph } from './vandaag/glyphs';
import type { MissionChip } from '../engine/missionFacts';
import { WeatherLine } from './WeatherLine';
import { ClothingAdvice } from './ClothingAdvice';
import { WatchStatusRow } from './WatchStatusRow';

const LINK = 'inline-flex min-h-[44px] items-center text-sm font-medium';

// De missie van vandaag: de training, drie kerngetallen als chips, één zin
// hoe het moet voelen, één gouden knop, en daaronder alleen Verplaatsen en
// "Niet fit?". De enige kaart op het scherm met hoogtelijnen (.topo-mission).
// Het krachtformulier (StrengthDoneElsewhere) staat er ongewijzigd in.
export function TodayMissionCard({
  template,
  fullDuration,
  weekNote,
  chips,
  paceNote,
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
  const variants = availableVariants(template);
  const shortVariant = variants.find((v) => v === 'short');
  const guide = getTrainingGuide(template.id);
  // Kracht die je in de app zelf bijhoudt begint met "Training starten";
  // al het andere is een "Gedaan" dat meteen naar het invulscherm gaat.
  const inAppStrength = template.type === 'strength';
  const subtitle = [sessionKindLabel(template), weekNote].filter(Boolean).join(' · ');

  return (
    <section
      className="topo-mission relative flex flex-col gap-4 overflow-hidden rounded-2xl border p-4"
      style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-card-border)' }}
      aria-label="Je missie van vandaag"
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <Eyebrow>VANDAAG</Eyebrow>
          {guide && <InfoButton onClick={() => setShowGuide(true)} label="Meer over deze training" />}
        </div>
        <h2 className="mt-1.5 font-display text-[28px] leading-tight" style={{ color: 'var(--color-ink)' }}>{template.name}</h2>
        {subtitle && <p className="mt-1 text-[13px]" style={{ color: 'var(--color-ink-dim)' }}>{subtitle}</p>}
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Kerngetallen">
          {chips.map((c) => (
            <li key={c.text} className="inline-flex min-h-[30px] items-center rounded-full border px-3 text-[13px] tabular-nums" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-surface)', color: 'var(--color-ink)' }}>
              {c.text}
            </li>
          ))}
        </ul>
        {paceNote && <p className="mt-1.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{paceNote}</p>}
        {coachLine && (
          <p className="mt-3 border-l-2 pl-3 text-[15px] leading-snug" style={{ borderColor: 'var(--color-bronze)', color: 'var(--color-ink)' }}>
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

      <div className="-mt-2 flex items-center justify-between gap-3 px-1">
        <button onClick={() => setShowMove(true)} className={LINK} style={{ color: 'var(--color-ink-dim)' }}>Verplaatsen</button>
        {quickComplete && onShowPlan && (
          <button onClick={onShowPlan} className={LINK} style={{ color: 'var(--color-ink-dim)' }}>Voorschrift</button>
        )}
        {!quickComplete && shortVariant && (
          <button onClick={() => (inAppStrength ? onStart('short') : onLog('short'))} className={LINK} style={{ color: 'var(--color-ink-dim)' }}>Korte versie</button>
        )}
        <NotFitLink plain />
      </div>

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
