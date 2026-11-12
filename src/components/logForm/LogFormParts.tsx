// ASCEND: de velden van het formulier Hoe ging het?, ongewijzigd uit components/ExerciseLogger.tsx.
// Het oude trainingsscherm zet ze onder elkaar in één kaart; het blad Hoe ging het? verdeelt ze over
// twee stappen. Beide lezen en schrijven dezelfde toestand (useLogForm.ts).

import type { SessionTemplate } from '../../models/training';
import { NumberField } from '../NumberField';
import { Chip, Segmented, Toggle } from '../ui';
import { PainReportFields } from '../PainReportFields';
import { WorkoutDetailsFields } from '../WorkoutDetailsFields';
import { getModalities, modalitySport } from '../../data/modalities';
import { isSportEnabled, type EnabledSports } from '../../engine/sports';
import { shortPlaceLabels } from '../../engine/trainingPlace';
import { addDays, formatDateNL, weekdayShortNL } from '../../utils/dates';
import { formatNumberNL } from '../../utils/number';
import { entryMinutes } from '../../engine/inputLimits';
import { detailForm } from '../../engine/workoutDetails';
import { asksLegs, type LegsAtStart } from '../../engine/learning';
import { availableVariants } from '../../engine/substitutions';
import { INTENSITY } from '../../data/workoutStructure';
import { GARMIN_SUGGESTED_TYPES, GARMIN_TYPE_LABEL, COMPATIBILITY_LABEL } from '../../data/garminSuggested';
import type { LogForm } from './useLogForm';
import { asksPain, placeLabel, VARIANT_LABEL } from './formRules';

const FEEL_LABEL: Record<'better' | 'normal' | 'worse', string> = { better: 'Beter', normal: 'Normaal', worse: 'Slechter' };
const LEGS_OPTIONS: [LegsAtStart, string][] = [['fris', 'Fris'], ['normaal', 'Normaal'], ['zwaar', 'Zwaar']];

type Part = { form: LogForm; template: SessionTemplate };

// Dutch number entry (components/NumberField.tsx): "1.200" m D+ stays 1200, "12,5" km stays 12.5.
export function Field({ label, value, onChange, decimals = 0, unit, placeholder }: { label: string; value: number | ''; onChange: (v: number | '') => void; decimals?: number; unit?: string; placeholder?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{label}</span>
      <div className="w-32">
        <NumberField value={value === '' ? undefined : value} onChange={(v) => onChange(v === undefined ? '' : v)} decimals={decimals} unit={unit} placeholder={placeholder} compact />
      </div>
    </div>
  );
}

// Volledig, Kort of Minimum: verandert de versie en zet de duur op die van de versie.
export function VariantField({ form, template }: Part) {
  const variants = availableVariants(template);
  if (variants.length <= 1 || form.shape.isRest) return null;
  return (
    <Segmented tall label="Versie" value={form.values.variant} onChange={form.selectVariant} options={variants.map((v) => ({ value: v, label: VARIANT_LABEL[v] }))} />
  );
}

// Waar train je? (of Wat doe je vandaag?), alleen bij het eigen plan en met meer dan één plek.
// In het blad Hoe ging het?: één rij stille chips zoals in de Briefing, zodat Opslaan het enige mint
// is; de uitleg per plek staat in de Briefing. Dezelfde keuzes en dezelfde opslag als ModalityChoice.
export function PlaceChoice({ form, template, enabledSports }: Part & { enabledSports?: Partial<EnabledSports> }) {
  const selected = form.values.modalityKey;
  const places = (getModalities(template.id) ?? []).filter((m) => m.key === selected || (!m.locked && isSportEnabled(modalitySport(m.key), enabledSports)));
  const labels = shortPlaceLabels(places.map((m) => m.label));
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={placeLabel(template)}>
      {places.map((m, i) => (
        <Chip key={m.key} tone="quiet" selected={m.key === selected} label={m.label} onClick={() => form.choosePlace(m.key)}>{labels[i]}</Chip>
      ))}
    </div>
  );
}

// Gedaan op: een geplande training van een dag die voorbij is (die dag of vandaag), of een losse
// training (een datum tot 60 dagen terug).
export function DoneOnRow({ form, scheduledDate }: { form: LogForm; scheduledDate?: string }) {
  const { today, plannedInPast } = form;
  const doneOn = form.values.doneOn;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span style={{ color: 'var(--color-ink-dim)' }}>Gedaan op</span>
      {plannedInPast ? (
        [scheduledDate!, today].map((d) => (
          <Chip key={d} selected={doneOn === d} onClick={() => form.setDoneOn(d)}>
            {d === today ? 'vandaag' : `${weekdayShortNL(d).toLowerCase()} ${formatDateNL(d)}`}
          </Chip>
        ))
      ) : (
        <input
          type="date" lang="nl"
          value={doneOn}
          max={today}
          min={addDays(today, -60)}
          onChange={(e) => e.target.value && form.setDoneOn(e.target.value)}
          className="min-h-[44px] rounded-lg border bg-transparent px-2 py-1.5"
          style={{ borderColor: 'var(--color-control-border)', color: 'var(--color-ink)', colorScheme: 'dark' }}
        />
      )}
    </div>
  );
}

export function DurationField({ form, onChange }: { form: LogForm; onChange?: () => void }) {
  const duration = form.values.duration;
  return (
    <>
      <Field label="Duur" unit="min" value={duration} onChange={(v) => { form.setDuration(v); onChange?.(); }} />
      {entryMinutes(duration) === 0 && (
        <p className="-mt-2 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Leeg of 0 betekent: geen duur. De training wordt zonder minuten bewaard.</p>
      )}
    </>
  );
}

export function DetailsField({ form, template }: Part) {
  return detailForm(template.id) ? <WorkoutDetailsFields templateId={template.id} value={form.values.workout} onChange={form.setWorkout} /> : null;
}

export function RpeField({ form }: { form: LogForm }) {
  const { planRpe, peak, conditioningSteps } = form;
  const rpe = form.values.rpe;
  return (
    <div>
      <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Zwaarte (RPE): hoe zwaar voelde de hele training?</p>
      <div className="mt-2 grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Zwaarte van 1 tot 10">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const inPlan = planRpe && n >= planRpe[0] && n <= planRpe[1];
          const active = rpe === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => form.setRpe(active ? '' : n)}
              className="st-chip"
              style={{ padding: 0, borderColor: active ? undefined : inPlan ? 'var(--color-action-muted)' : undefined, color: inPlan && !active ? 'var(--color-ink)' : undefined }}
            >
              {n}
            </button>
          );
        })}
      </div>
      {peak && (
        <p className="mt-1.5 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
          Het plan: {INTENSITY[peak].label.toLowerCase()} ({INTENSITY[peak].rpe}){peak >= 3 && conditioningSteps.some((st) => st.intensity <= 2) ? ' in de zware stukken, rustig ertussen' : ''}.
        </p>
      )}
    </div>
  );
}

// De pijnvraag: bij elke loop en wandeling, en bij kracht die zwaar is voor de benen.
export function PainField({ form, template }: Part) {
  return asksPain(template) ? <PainReportFields value={form.values.painReports} onChange={form.setPainReports} /> : null;
}

export function LegsField({ form, template }: Part) {
  if (!asksLegs(template)) return null;
  const legsAtStart = form.values.legsAtStart;
  return (
    <div>
      <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Hoe voelden je benen bij het inlopen? (optioneel; zo leert ASCEND hoe goed de beenindex bij jou klopt)</p>
      <div className="mt-2">
        <Segmented
          tall
          label="Benen bij het inlopen"
          value={legsAtStart}
          onChange={(v) => form.setLegsAtStart(legsAtStart === v ? undefined : v)}
          options={LEGS_OPTIONS.map(([value, label]) => ({ value, label }))}
        />
      </div>
    </div>
  );
}

export function FeelField({ form, template }: Part) {
  if (template.type === 'recovery') return null;
  const subjectiveFeel = form.values.subjectiveFeel;
  return (
    <div>
      <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Hoe voelde het ten opzichte van normaal? (optioneel)</p>
      <div className="mt-2">
        <Segmented
          tall
          label="Ten opzichte van normaal"
          value={subjectiveFeel}
          onChange={(f) => form.setSubjectiveFeel(subjectiveFeel === f ? undefined : f)}
          options={(['better', 'normal', 'worse'] as const).map((value) => ({ value, label: FEEL_LABEL[value] }))}
        />
      </div>
    </div>
  );
}

// Afstand, helling, stijging, daling, stokken, trap, hartslag, cadans, vermogen, rugzak en terrein:
// alleen wat de gekozen plek vraagt.
export function ModalityFields({ form }: { form: LogForm }) {
  const { shape, elevation, plannedStep, values } = form;
  const { fields } = shape;
  if (!shape.hasModalities) return null;
  return (
    <>
      {fields.distance && <Field label="Afstand" unit="km" decimals={2} value={values.distanceKm} onChange={form.setDistanceKm} />}
      {fields.inclinePercent && (
        <>
          <Field label="Helling" unit="%" decimals={1} value={values.inclinePercent} onChange={form.setInclinePercent} />
          <p className="-mt-2 text-xs" style={{ color: 'var(--color-ink-dim)' }}>ASCEND schat je hoogtemeters uit afstand en helling.</p>
        </>
      )}
      {fields.elevation && (
        <>
          <Field label={`Stijging${elevation.estimated ? ' (geschat)' : ''}`} unit="m D+" value={elevation.gainM} onChange={form.setElevationGainM} placeholder={plannedStep?.elevationGainM ? formatNumberNL(plannedStep.elevationGainM, 0) : undefined} />
          {elevation.estimated && <p className="-mt-2 text-xs" style={{ color: 'var(--color-ink-dim)' }}>Geschat uit afstand × helling, geen GPS-meting.</p>}
        </>
      )}
      {fields.elevationLoss && <Field label="Daling" unit="m D−" value={values.elevationLossM} onChange={form.setElevationLossM} placeholder={plannedStep?.elevationGainM ? formatNumberNL(plannedStep.elevationGainM, 0) : undefined} />}
      {fields.elevationLoss && (
        <div className="-mt-1 flex min-h-[44px] items-center justify-between gap-3">
          <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Met stokken</span>
          <Toggle checked={values.poles} onChange={form.setPoles} label="Met stokken" />
        </div>
      )}
      {fields.steps && (
        <>
          <Field label="Verdiepingen (trap)" value={values.steps} onChange={form.setSteps} />
          <Field label="Hoogtemeters op toestel (optioneel)" unit="m" value={values.machineVerticalM} onChange={form.setMachineVerticalM} />
        </>
      )}
      <Field label="Gem. hartslag" unit="bpm" value={values.avgHeartRate} onChange={form.setAvgHeartRate} />
      {fields.cadence && <Field label="Cadans" value={values.cadence} onChange={form.setCadence} />}
      {fields.power && <Field label="Vermogen" unit="W" value={values.power} onChange={form.setPower} />}
      {fields.backpackWeight && <Field label="Rugzak" unit="kg" decimals={1} value={values.backpackWeightKg} onChange={form.setBackpackWeightKg} />}
      {fields.terrain && (
        <div>
          <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }} htmlFor="terrain">Terrein</label>
          <input
            id="terrain"
            type="text"
            value={values.terrain}
            onChange={(e) => form.setTerrain(e.target.value)}
            placeholder="bijv. bos, rotsen, zand"
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            style={{ background: 'var(--color-charcoal)', borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' }}
          />
        </div>
      )}
    </>
  );
}

// Iets anders gedaan? Het plan, het voorstel van je Garmin of een eigen training.
export function OtherDoneField({ form, open, onToggle }: { form: LogForm; open: boolean; onToggle: () => void }) {
  if (!form.supportsGuidanceMode) return null;
  const { guidanceMode, garminSuggestedType } = form.values;
  const compatibility = form.compatibility;
  return (
    <div className="border-t pt-3" style={{ borderColor: 'var(--color-card-border)' }}>
      <button type="button" onClick={onToggle} className="flex min-h-[44px] w-full items-center justify-between text-left text-sm" style={{ color: 'var(--color-ink)' }} aria-expanded={open}>
        <span>Iets anders gedaan?</span>
        <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{guidanceMode === 'ascend_guided' ? (open ? 'sluiten' : 'openen') : guidanceMode === 'garmin_suggested' ? 'voorstel van Garmin' : 'eigen training'}</span>
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-2">
          {([['ascend_guided', 'Gedaan volgens dit plan'], ['garmin_suggested', 'Het voorstel van je Garmin gevolgd'], ['free', 'Een eigen training']] as const).map(([mode, label]) => (
            <Chip key={mode} selected={guidanceMode === mode} onClick={() => form.setGuidanceMode(mode)}>
              {label}
            </Chip>
          ))}
          {guidanceMode === 'garmin_suggested' && (
            <div className="flex flex-col gap-2">
              <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Wat stelde je Garmin voor?</p>
              <div className="flex flex-wrap gap-2">
                {GARMIN_SUGGESTED_TYPES.map((t) => (
                  <Chip key={t} selected={garminSuggestedType === t} onClick={() => form.setGarminSuggestedType(t)}>
                    {GARMIN_TYPE_LABEL[t] ?? t}
                  </Chip>
                ))}
              </div>
              {compatibility && (
                <div className="rounded-xl border p-2.5 text-xs leading-relaxed" style={{ borderColor: compatibility.compatibility === 'not_equivalent' ? 'var(--color-warning)' : 'var(--color-card-border)', color: 'var(--color-ink-dim)' }}>
                  <span className="font-medium" style={{ color: 'var(--color-ink)' }}>{COMPATIBILITY_LABEL[compatibility.compatibility]}. </span>
                  {compatibility.note}
                </div>
              )}
            </div>
          )}
          {guidanceMode === 'free' && <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Vul in wat je echt deed.</p>}
        </div>
      )}
    </div>
  );
}

export function NotesField({ form }: { form: LogForm }) {
  return (
    <div>
      <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }} htmlFor="notes">Notities</label>
      <textarea
        id="notes"
        value={form.values.notes}
        onChange={(e) => form.setNotes(e.target.value)}
        rows={2}
        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
        style={{ background: 'var(--color-charcoal)', borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' }}
      />
    </div>
  );
}
