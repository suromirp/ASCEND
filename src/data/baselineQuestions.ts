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
  mechanical_tolerance: { label: 'Belastbaarheid van je benen', unit: 'min', question: 'Hoe lang hielden je benen en gewrichten het vol bij een aanhoudende inspanning — denk aan een lange afdaling — voordat het pijn ging doen of zwaar werd? (in minuten)', needsDiscipline: true },
  ascent_capacity: { label: 'Klimcapaciteit (D+)', unit: 'm_elevation_gain', question: 'Hoeveel hoogtemeters omhoog heb je de afgelopen maand in één keer geklommen?' },
  descent_tolerance: { label: 'Afdalingscapaciteit (D-)', unit: 'm_elevation_loss', question: 'Hoeveel hoogtemeters omlaag heb je de afgelopen maand in één keer afgedaald?' },
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
