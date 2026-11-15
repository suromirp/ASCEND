// ASCEND: de hartslag van een wandelworkout als vaste slagen per minuut.
//
// intervals.icu kent maar vier soorten instellingen: Fietsen, Hardlopen, Zwemmen en Andere. Wandelen valt onder
// Andere, en daar staan geen eigen hartslagzones. Een doel als "Z2 HR" of "75-85% LTHR" op een wandelworkout
// heeft dan geen maat. En een vaste waarde in bpm kent de workouttaal van intervals.icu niet: de maker schreef
// in maart 2024 dat het op de lijst staat maar lastig is, en in maart 2025 dat bpm bij een import wordt
// omgerekend naar een percentage van de drempel van die soort. Besluit:
// docs/beslissingen/2026-11-15-wandelen-vaste-bpm.md.
//
// Daarom krijgt een wandelworkout (de StairMaster en elke wandeltraining) geen zonedoel op een stap, maar een
// regel met vaste slagen per minuut uit je hardloopzones, boven de stappen en in de Briefing.
// - Rustig (zwaarte 1 of 2): alleen een bovengrens, het einde van die zone. Wandelend zak je makkelijk onder
//   zone 1, en dat is goed.
// - Stevig (zwaarte 3 of 4) alleen als zo'n blok minstens twee minuten duurt: korter loopt de hartslag achter
//   en zegt de training het in RPE.
// - Opwarmen, uitlopen en een stap zonder doel tellen niet mee.
//
// Puur: geen React, geen IndexedDB, geen netwerk.

import type { WorkoutPlan } from './workoutPlan';
import { zoneBpm, type HeartRateSettings } from './heartRateZones';
import { hasAscendHeartRate, stepBpm } from './watchHeartRate';

// Korter dan dit krijgt een stevig blok geen slagen (zelfde grens als een hartslagdoel op het horloge).
const HARD_MIN_SECONDS = 120;

export interface WalkBpm {
  // Rustig: niet boven dit getal.
  top?: number;
  // Stevige blokken van minstens twee minuten: van tot.
  hard?: [number, number];
  // Stevige blokken korter dan twee minuten, zonder eigen slagen: de bovengrens geldt dan alleen ertussen.
  shortHard?: boolean;
}

// Instelling Hartslag bij wandelen (AppSettings.watchWalkBpm): afwezig is aan, het advies.
export function resolveWalkBpm(on: boolean | undefined): boolean {
  return on !== false;
}

// De slagen voor deze wandelworkout, of undefined zonder drempel of maximale hartslag of zonder stap met doel.
export function walkBpm(plan: Pick<WorkoutPlan, 'timeline'> | undefined, heartRate: HeartRateSettings | undefined): WalkBpm | undefined {
  if (!plan || !heartRate || !hasAscendHeartRate(heartRate)) return undefined;
  const steps = plan.timeline.filter((s) => s.kind !== 'warmup' && s.kind !== 'cooldown' && !s.noTarget);
  const calm = steps.filter((s) => s.intensity <= 2);
  const hard = steps.filter((s) => s.intensity >= 3 && s.kind !== 'recover' && s.seconds >= HARD_MIN_SECONDS);
  const out: WalkBpm = {};
  if (calm.length) {
    const zone = zoneBpm(calm.some((s) => s.intensity === 2) ? 2 : 1, heartRate);
    if (zone) out.top = zone[1];
  }
  if (hard.length) {
    const range = stepBpm(hard.some((s) => s.intensity === 4) ? 4 : 3, heartRate, false);
    if (range) out.hard = range;
  } else if (out.top !== undefined && steps.some((s) => s.intensity >= 3 && s.kind !== 'recover')) {
    out.shortHard = true;
  }
  return out.top !== undefined || out.hard ? out : undefined;
}

// "Hartslag onder 152 bpm." en eventueel "Stevige blokken 160 tot 175 bpm.": de regel boven de stappen.
// Met alleen korte stevige blokken (8 x 1 minuut traplopen) "Tussen de blokken onder 138 bpm.": anders leest de
// bovengrens als een plafond voor de hele training.
export function walkBpmText(bpm: WalkBpm): string {
  const parts: string[] = [];
  if (bpm.top !== undefined) parts.push(`${bpm.shortHard ? 'Tussen de blokken' : 'Hartslag'} onder ${bpm.top} bpm.`);
  if (bpm.hard) parts.push(`${bpm.top !== undefined ? 'Stevige blokken' : 'Hartslag'} ${bpm.hard[0]} tot ${bpm.hard[1]} bpm.`);
  return parts.join(' ');
}

// De regel in de Briefing: dezelfde getallen, met waar ze vandaan komen.
export function walkBpmBriefing(bpm: WalkBpm): string {
  return `${walkBpmText(bpm).replace(/\.$/, '')}, uit je hardloopzones.`;
}

// Wat de workout en de Briefing krijgen uit de bewaarde instellingen: je hartslaginstellingen als Hartslag bij
// wandelen aan staat, anders niets. De ene plek waar het versturen, de stand en de Briefing langs gaan, zodat de
// vingerafdrukken gelijk blijven.
export function walkHrFromSettings(s: { watchWalkBpm?: boolean; heartRate?: HeartRateSettings }): HeartRateSettings | undefined {
  return resolveWalkBpm(s.watchWalkBpm) ? s.heartRate : undefined;
}
