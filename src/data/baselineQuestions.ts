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

import type { CapabilityDimension } from '../models/capability';
import type { Unit } from '../models/units';

export type BaselineDimension = Exclude<CapabilityDimension, 'fatigue_resistance'>;

export const DIMENSION_META: Record<BaselineDimension, { label: string; unit: Unit; question: string; needsDiscipline?: boolean }> = {
  aerobic_engine: { label: 'Algemene conditie', unit: 'min', question: 'Langste stevige cardio-inspanning recent (minuten)?' },
  sustainable_output: { label: 'Duurzaam tempo', unit: 'min_per_km', question: 'Tempo dat je een tijd kunt volhouden (min/km)?', needsDiscipline: true },
  endurance_duration: { label: 'Uithoudingsduur', unit: 'min', question: 'Langste wandeling/inspanning recent (minuten)?', needsDiscipline: true },
  mechanical_tolerance: { label: 'Mechanische belastbaarheid', unit: 'min', question: 'Langste aaneengesloten inspanning op de benen (minuten)?', needsDiscipline: true },
  ascent_capacity: { label: 'Klimcapaciteit (D+)', unit: 'm_elevation_gain', question: 'Meeste hoogtemeters omhoog in één keer?' },
  descent_tolerance: { label: 'Afdalingscapaciteit (D-)', unit: 'm_elevation_loss', question: 'Meeste hoogtemeters omlaag in één keer?' },
  load_carriage: { label: 'Rugzakcapaciteit', unit: 'kg', question: 'Zwaarste rugzak die je meerdere uren hebt gedragen (kg)?' },
  multi_day_durability: { label: 'Meerdaagse belastbaarheid', unit: 'days', question: 'Meeste opeenvolgende zware trainingsdagen recent?' },
  strength: { label: 'Kracht', unit: 'kg', question: 'Zwaarste gewicht dat je recent hebt getild (kg)?' },
};

export const DIMENSION_ORDER = Object.keys(DIMENSION_META) as BaselineDimension[];
