// ASCEND — targeted baseline question copy (Algorithm Contract v0.2 §27).
//
// Shared between the generic, full-list baseline editor
// (components/BaselineEvidenceCard.tsx — the advanced/fallback entry point,
// Phase 7) and the goal setup wizard's targeted baseline step
// (components/GoalSetupWizard.tsx), so both ever ask the exact same
// question for the exact same dimension — one copy, not two that could
// silently drift apart.
//
// fatigue_resistance is deliberately excluded — v0.2 §9.9 explicitly notes
// it "mag in de eerste implementatie vaak UNKNOWN zijn": there's no single
// honest number a manual question could ask for here yet.

import type { CapabilityDimension, CapabilityKey } from '../models/capability';
import type { Unit } from '../models/units';
import { disciplineLabel } from '../models/disciplines';

export type BaselineDimension = Exclude<CapabilityDimension, 'fatigue_resistance'>;

export const DIMENSION_META: Record<BaselineDimension, { label: string; unit: Unit; question: string; needsDiscipline?: boolean }> = {
  aerobic_engine: { label: 'Algemene conditie', unit: 'min', question: 'Hoe lang hield je de afgelopen maand je langste stevige cardio-inspanning vol — een duurloop, fietstocht of iets vergelijkbaars? (in minuten)' },
  sustainable_output: { label: 'Duurzaam tempo', unit: 'min_per_km', question: 'Welk tempo kun je langere tijd volhouden, zonder buiten adem te raken? (in min/km)', needsDiscipline: true },
  // "Uithoudingsvermogen" en "Belastbaarheid" vragen naar hetzelfde
  // getal (hoe lang je doorging) maar met een ander doel: het eerste gaat
  // over conditie/adem, het tweede over hoe je benen en gewrichten een
  // aanhoudende inspanning verdragen — vandaar twee losse, concrete vragen
  // met een eigen anker (wandeling vs. afdaling) in plaats van bijna-
  // identieke abstracte formuleringen.
  endurance_duration: { label: 'Uithoudingsvermogen', unit: 'min', question: 'Wat is de langste tijd dat je de afgelopen maand aan één stuk hebt doorgewandeld of -gelopen, zonder te stoppen? (in minuten)', needsDiscipline: true },
  mechanical_tolerance: { label: 'Belastbaarheid van je benen', unit: 'min', question: 'Hoe lang hielden je benen en gewrichten het vol bij een aanhoudende inspanning, zoals een lange afdaling, voordat het pijn ging doen of zwaar werd? (in minuten)', needsDiscipline: true },
  ascent_capacity: { label: 'Klimcapaciteit (D+)', unit: 'm_elevation_gain', question: 'Hoeveel hoogtemeters omhoog heb je de afgelopen maand in één keer geklommen?' },
  descent_tolerance: { label: 'Afdalingscapaciteit (D−)', unit: 'm_elevation_loss', question: 'Hoeveel hoogtemeters omlaag heb je de afgelopen maand in één keer afgedaald?' },
  load_carriage: { label: 'Rugzakcapaciteit', unit: 'kg', question: 'Wat is het zwaarste gewicht dat je de afgelopen maand meerdere uren achter elkaar hebt gedragen? (in kg)' },
  multi_day_durability: { label: 'Meerdaagse belastbaarheid', unit: 'days', question: 'Wat is het meeste aantal dagen op rij dat je recent zwaar hebt getraind, zonder een rustdag ertussen?' },
  strength: { label: 'Kracht', unit: 'kg', question: 'Wat is het zwaarste gewicht dat je de afgelopen maand hebt getild?' },
};

export const DIMENSION_ORDER = Object.keys(DIMENSION_META) as BaselineDimension[];

// Human label for a capability dimension — never the raw dimension key
// (production incident: explanation copy showing "sustainable_output"
// verbatim). fatigue_resistance has no baseline question (it's excluded
// from DIMENSION_META above) but still needs a display label wherever a
// CapabilityGap for it is shown.
export function dimensionLabel(dimension: CapabilityDimension): string {
  return dimension === 'fatigue_resistance' ? 'Vermoeidheidsweerstand' : DIMENSION_META[dimension].label;
}

// Full human label for a capability key ("Duurzaam tempo (hardlopen)"),
// combining the dimension label with a friendly discipline label — falls
// back to the raw discipline string for anything outside the known list
// (models/disciplines.ts), so an unrecognized value still renders instead
// of disappearing.
export function capabilityKeyLabel(key: Pick<CapabilityKey, 'dimension' | 'discipline'>): string {
  const dim = dimensionLabel(key.dimension);
  const discipline = disciplineLabel(key.discipline);
  return discipline ? `${dim} (${discipline})` : dim;
}

// Fallback answer ranges (goal-flow redesign, Fase 1) — for when the
// "hardest recent activity" route doesn't cover a capability. Each option
// stores the CAUTIOUS end of its range (the lower bound; for pace the
// slower bound), so a range answer never overstates what was shown.
// strength has none: a lifted weight is exercise-specific, a range would
// say nothing.
const DURATION_RANGES = [
  { label: '< 1 uur', value: 30 },
  { label: '1 – 2 uur', value: 60 },
  { label: '2 – 3 uur', value: 120 },
  { label: '3 – 5 uur', value: 180 },
  { label: '5+ uur', value: 300 },
];
const ELEVATION_RANGES = [
  { label: '< 300 m', value: 150 },
  { label: '300 – 600 m', value: 300 },
  { label: '600 – 1.000 m', value: 600 },
  { label: '1.000 – 1.500 m', value: 1000 },
  { label: '1.500+ m', value: 1500 },
];

export const RANGE_OPTIONS: Partial<Record<BaselineDimension, { label: string; value: number }[]>> = {
  aerobic_engine: DURATION_RANGES,
  endurance_duration: DURATION_RANGES,
  mechanical_tolerance: DURATION_RANGES,
  ascent_capacity: ELEVATION_RANGES,
  descent_tolerance: ELEVATION_RANGES,
  load_carriage: [
    { label: 'Dagrugzak (< 5 kg)', value: 3 },
    { label: '5 – 8 kg', value: 5 },
    { label: '8 – 12 kg', value: 8 },
    { label: '12+ kg', value: 12 },
  ],
  multi_day_durability: [
    { label: '1 dag', value: 1 },
    { label: '2 dagen', value: 2 },
    { label: '3 – 4 dagen', value: 3 },
    { label: '5+ dagen', value: 5 },
  ],
  sustainable_output: [
    { label: 'Trager dan 7:00', value: 7.5 },
    { label: '6:00 – 7:00', value: 7 },
    { label: '5:30 – 6:00', value: 6 },
    { label: '5:00 – 5:30', value: 5.5 },
    { label: 'Sneller dan 5:00', value: 5 },
  ],
};

// Fase 4 — the question, unit and ranges for one capability KEY. Cycling
// endurance is measured in kilometres (a ride and a cycling goal both are,
// engine/capability.ts), so its question differs from the time-based
// walking/running one. Everything else is the dimension's own entry.
const CYCLING_DISTANCE_RANGES = [
  { label: '< 30 km', value: 15 },
  { label: '30 – 60 km', value: 30 },
  { label: '60 – 100 km', value: 60 },
  { label: '100 – 150 km', value: 100 },
  { label: '150+ km', value: 150 },
];

export interface QuestionMeta {
  label: string;
  unit: Unit;
  question: string;
  ranges?: { label: string; value: number }[];
}

export function questionMetaFor(key: Pick<CapabilityKey, 'dimension' | 'discipline'>): QuestionMeta | undefined {
  if (key.dimension === 'fatigue_resistance') return undefined;
  const base = DIMENSION_META[key.dimension];
  if (key.discipline === 'cycling' && (key.dimension === 'endurance_duration' || key.dimension === 'mechanical_tolerance')) {
    return {
      label: base.label,
      unit: 'km',
      question: key.dimension === 'endurance_duration'
        ? 'Wat is de langste rit die je de afgelopen 8 weken hebt gefietst?'
        : 'Hoe ver fietste je de afgelopen 8 weken op een dag voordat je benen echt op waren?',
      ranges: CYCLING_DISTANCE_RANGES,
    };
  }
  if (key.discipline === 'cycling' && key.dimension === 'ascent_capacity') {
    return { label: base.label, unit: base.unit, question: 'Hoeveel hoogtemeters heb je de afgelopen 8 weken op één rit geklommen?', ranges: RANGE_OPTIONS.ascent_capacity };
  }
  return { label: base.label, unit: base.unit, question: base.question, ranges: RANGE_OPTIONS[key.dimension] };
}
