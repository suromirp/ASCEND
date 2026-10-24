// De onderdelen van het trainingsscherm voor duursport (ExerciseLogger), in de
// stijl van de missiekaart op Vandaag: grote getallen, het profiel van de
// training als één balk in de zonekleuren, compacte stappen en een rustige
// keuze waar je traint. Alles leest het plan dat er al is
// (engine/workoutPlan.ts, engine/sessionBrief.ts); hier wordt niets berekend
// wat het plan niet al zegt.

import { useState } from 'react';
import type { Stretch } from '../../models/training';
import type { BriefFact } from '../../engine/sessionBrief';
import { formatClock, type PlanStep, type WorkoutPlan } from '../../engine/workoutPlan';
import { zoneText } from '../../engine/heartRateZones';
import { INTENSITY, type Intensity } from '../../data/workoutStructure';
import { ROLE_LABEL, getModalities, modalitySport } from '../../data/modalities';
import { isSportEnabled, type EnabledSports } from '../../engine/sports';
import { useAppData } from '../../state/AppDataContext';
import { EFFORT_COLOR } from '../effortColor';
import { firstSentence, restAfterFirstSentence } from './text';
import { StretchItems } from '../StretchList';
import { Icon, type IconName } from '../icons';

// Een niveau van het plan in de kleur van zijn zone: heel rustig is Z1, rustig
// Z2, stevig Z3 en hard Z4 (het plan zegt "zone 4-5"). Een stap zonder doel
// (rust, een herstelwandeling) staat op de lege baan.
function stepColor(step: Pick<PlanStep, 'intensity' | 'noTarget'>): string {
  return step.noTarget ? 'var(--color-track)' : EFFORT_COLOR[step.intensity];
}
const ZONE_SHORT: Record<Intensity, string> = { 1: 'Z1', 2: 'Z2', 3: 'Z3', 4: 'Z4-5' };
const BAR_HEIGHT: Record<Intensity, string> = { 1: '38%', 2: '55%', 3: '78%', 4: '100%' };

function minutesText(seconds: number): string {
  return seconds % 60 === 0 ? `${seconds / 60} min` : formatClock(seconds);
}

// "40 min" -> 40 en "min"; "2,5 uur" -> 2,5 en "uur". Een woord geeft niets.
function splitNumber(value: string): { value: string; unit: string } | undefined {
  const m = /^([±]?\d[\d.,]*)\s*(min|uur|km|m|kg)?$/.exec(value);
  return m ? { value: m[1], unit: m[2] ?? '' } : undefined;
}

// De kerngetallen: de duur groot, wat er nog een getal is ("4 × 1 min") kleiner,
// en wat een woord is ("Afdalen, beheerst") als pil.
export function KeyNumbers({ facts }: { facts: BriefFact[] }) {
  const [first, ...rest] = facts;
  const hero = first ? splitNumber(first.value) : undefined;
  const numeric = rest.filter((f) => /^[±]?\d/.test(f.value));
  const words = [...(hero ? [] : facts.slice(0, 1)), ...rest.filter((f) => !/^[±]?\d/.test(f.value))];
  return (
    <div>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3" aria-label="Kerngetallen">
        {hero && (
          <div className="flex flex-col gap-1">
            <span className="whitespace-nowrap font-sans text-[40px] font-semibold leading-none tracking-[-0.03em] tabular-nums" style={{ color: 'var(--color-ink)' }}>
              {hero.value}
              {hero.unit && hero.unit !== 'min' && <span className="ml-1 text-sm font-medium tracking-normal" style={{ color: 'var(--color-ink-dim)' }}>{hero.unit}</span>}
            </span>
            <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{hero.unit === 'min' ? `minuten ${first.label}` : first.label}</span>
          </div>
        )}
        {numeric.map((f) => (
          <div key={f.label} className="flex flex-col gap-1">
            <span className="whitespace-nowrap font-sans text-[28px] font-semibold leading-none tracking-[-0.02em] tabular-nums" style={{ color: 'var(--color-ink)' }}>{f.value}</span>
            <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{f.label}</span>
          </div>
        ))}
      </div>
      {words.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Meer over de training">
          {words.map((f) => (
            <li key={f.label} className="inline-flex min-h-[28px] items-center rounded-full px-3 text-sm" style={{ boxShadow: 'inset 0 0 0 1px var(--color-card-border)', color: 'var(--color-ink)' }}>
              {f.value}<span className="ml-1" style={{ color: 'var(--color-ink-dim)' }}>{f.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Het verloop van de training als één balk over de tijd: elk blok in de kleur
// van zijn zone en hoger naarmate het zwaarder is, eronder wat elk deel is
// (opwarmen, de herhalingen, afkoelen) en de tijdas.
export function IntervalProfile({ plan }: { plan: WorkoutPlan }) {
  const total = plan.timeline.reduce((sum, s) => sum + s.seconds, 0);
  if (total <= 0) return null;
  const parts = plan.items.map((it) =>
    'step' in it
      ? { label: it.step.label, seconds: it.step.seconds }
      : { label: `${it.repeat}×`, seconds: it.repeat * it.steps.reduce((sum, s) => sum + s.seconds, 0) },
  );
  const used = [...new Map(plan.timeline.filter((s) => !s.noTarget).map((s) => [s.intensity, s])).keys()].sort() as Intensity[];
  return (
    <div>
      <div className="flex h-12 items-end gap-[2px]" role="img" aria-label={`Verloop van de training, ${Math.round(total / 60)} minuten`}>
        {plan.timeline.map((step, i) => (
          <div
            key={i}
            className="rounded-[3px]"
            style={{ flexGrow: step.seconds, flexBasis: 0, minWidth: 2, height: step.noTarget ? BAR_HEIGHT[1] : BAR_HEIGHT[step.intensity], background: stepColor(step) }}
          />
        ))}
      </div>
      {parts.length > 1 && (
        <div className="mt-1.5 flex gap-[2px]" aria-hidden="true">
          {parts.map((p, i) => (
            <div key={i} className="min-w-0 border-t pt-1 text-center" style={{ flexGrow: p.seconds, flexBasis: 0, borderColor: 'var(--color-card-border)' }}>
              {p.seconds / total >= 0.12 && <span className="block truncate px-0.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{p.label}</span>}
            </div>
          ))}
        </div>
      )}
      <div className="mt-1 flex justify-between text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>
        <span>0</span>
        <span>{Math.round(total / 60)} min</span>
      </div>
      {used.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {used.map((lvl) => (
            <span key={lvl} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: EFFORT_COLOR[lvl] }} />
              <span className="font-semibold tabular-nums" style={{ color: 'var(--color-ink)' }}>{ZONE_SHORT[lvl]}</span>
              {INTENSITY[lvl].label.toLowerCase()}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Een stap: links de kleurstreep van de zone, de naam, rechts de duur, en één
// regel met zwaarte, zone, hartslag en de praattest.
function StepLine({ step }: { step: PlanStep }) {
  const { settings } = useAppData();
  const level = INTENSITY[step.intensity];
  const line = step.kind === 'strength'
    ? step.detail
    : step.noTarget
      ? `${level.label} · geen hartslagdoel${step.detail ? `. ${step.detail}` : ''}`
      : `${level.rpe} · ${zoneText(step.intensity, level.zone, settings.heartRate)} · ${level.feel}${step.detail ? `. ${step.detail}` : ''}`;
  return (
    <li className="flex gap-3 py-2.5">
      <span aria-hidden="true" className="w-1 shrink-0 self-stretch rounded-full" style={{ background: stepColor(step) }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[15px] leading-snug" style={{ color: 'var(--color-ink)' }}>{step.label}</span>
          <span className="shrink-0 font-sans text-sm font-semibold tabular-nums" style={{ color: 'var(--color-ink)' }}>{minutesText(step.seconds)}</span>
        </div>
        {line && <p className="mt-0.5 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{line}</p>}
      </div>
    </li>
  );
}

// De stappen onder elkaar; een herhaling als groep met "4×" ervoor.
export function StepList({ plan }: { plan: WorkoutPlan }) {
  return (
    <ul className="flex flex-col">
      {plan.items.map((item, i) =>
        'step' in item ? (
          <StepLine key={i} step={item.step} />
        ) : (
          <li key={i} className="my-1.5 rounded-xl px-3 py-1" style={{ background: 'var(--color-charcoal)', boxShadow: 'inset 0 0 0 1px var(--color-card-border)' }}>
            <p className="flex items-center gap-2 pt-2 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
              <span className="font-sans text-base font-semibold tabular-nums" style={{ color: 'var(--color-ink)' }}>{item.repeat}×</span>
              herhalen, samen {minutesText(item.repeat * item.steps.reduce((sum, s) => sum + s.seconds, 0))}
            </p>
            <ul className="flex flex-col">
              {item.steps.map((step, j) => <StepLine key={j} step={step} />)}
            </ul>
          </li>
        ),
      )}
    </ul>
  );
}

// "Hardlopen, buiten op een heuvel" -> "Buiten op een heuvel" met "Hardlopen"
// klein ernaast; een naam zonder komma blijft zoals hij is.
function splitLabel(label: string): { name: string; sport?: string } {
  const i = label.indexOf(', ');
  if (i < 0) return { name: label };
  const rest = label.slice(i + 2);
  return { name: rest.charAt(0).toUpperCase() + rest.slice(1), sport: label.slice(0, i) };
}


// "Waar train je?": een rij per plek, de plek groot en eronder hoe goed die
// keuze is. Dezelfde opties en dezelfde keuze als ModalityPicker; de uitleg
// van de gekozen plek in één zin (de rest staat onder Info).
export function ModalityChoice({
  templateId,
  selectedKey,
  onSelect,
  enabledSports,
  label,
}: {
  templateId: string;
  selectedKey?: string;
  onSelect: (key: string) => void;
  enabledSports?: Partial<EnabledSports>;
  label: string;
}) {
  // Zelfde filter als ModalityPicker: een uitgezette sport alleen als hij al gekozen is.
  const modalities = (getModalities(templateId) ?? []).filter((m) => m.key === selectedKey || isSportEnabled(modalitySport(m.key), enabledSports));
  if (modalities.length === 0) return null;
  const selected = modalities.find((m) => m.key === selectedKey);
  return (
    <div>
      <div className="flex flex-col gap-1.5" role="radiogroup" aria-label={label}>
        {modalities.map((m) => {
          const active = selectedKey === m.key;
          const split = splitLabel(m.label);
          // Twee keer "Buiten" zegt niets: dan de hele naam.
          const twice = modalities.some((o) => o.key !== m.key && splitLabel(o.label).name === split.name);
          const { name, sport } = twice ? { name: m.label, sport: undefined } : split;
          return (
            <button
              key={m.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => !m.locked && onSelect(m.key)}
              disabled={m.locked}
              className="flex min-h-[52px] items-center gap-3 rounded-xl px-3 py-2 text-left disabled:opacity-40"
              style={{
                background: active ? 'var(--color-action-muted)' : 'transparent',
                boxShadow: `inset 0 0 0 1px ${active ? 'var(--color-action)' : 'var(--color-card-border)'}`,
              }}
            >
              <span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ boxShadow: `inset 0 0 0 1.5px ${active ? 'var(--color-action)' : 'var(--color-control-border)'}` }}>
                {active && <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--color-action)' }} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base leading-snug" style={{ color: 'var(--color-ink)', fontWeight: active ? 600 : 400 }}>{name}</span>
                <span className="block text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{[sport, ROLE_LABEL[m.role]].filter(Boolean).join(' · ')}</span>
              </span>
            </button>
          );
        })}
      </div>
      {selected && <MoreText key={selected.key} text={selected.how} className="mt-2.5" color="var(--color-ink-dim)" />}
    </div>
  );
}

// Eén zin van een uitleg, en de rest achter Meer: niets van de tekst valt weg.
export function MoreText({ text, className = '', color }: { text: string; className?: string; color: string }) {
  const [open, setOpen] = useState(false);
  const rest = restAfterFirstSentence(text);
  return (
    <p className={`text-sm leading-snug ${className}`} style={{ color }}>
      {open || !rest ? text : firstSentence(text)}
      {rest && (
        <>
          {' '}
          <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="relative font-medium" style={{ color: 'var(--color-action)' }}>
            <span aria-hidden="true" className="absolute -inset-x-3 -inset-y-3.5" />
            {open ? 'Minder' : 'Meer'}
          </button>
        </>
      )}
    </p>
  );
}

// Een lijstrij met een pictogram, een titel, een regel eronder en een chevron die
// de oefeningen eronder openklapt (zoals de opwarmlijst altijd deed).
export function StretchRow({ icon, title, line, stretches }: { icon: IconName; title: string; line: string; stretches: Stretch[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-h-[56px] w-full items-center gap-3 py-2 text-left">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--color-charcoal)', color: 'var(--color-ink-dim)' }}>
          <Icon name={icon} size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base leading-snug" style={{ color: 'var(--color-ink)' }}>{title}</span>
          <span className="block text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{line}</span>
        </span>
        <span className="shrink-0 transition-transform" style={{ color: 'var(--color-ink-dim)', transform: open ? 'rotate(90deg)' : undefined }}>
          <Icon name="verder" size={18} />
        </span>
      </button>
      {open && <StretchItems stretches={stretches} className="flex flex-col pb-2" />}
    </div>
  );
}
