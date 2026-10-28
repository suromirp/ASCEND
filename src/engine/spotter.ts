// ASCEND: nooit tot falen zonder spotter. Pure; geen React. Bij een stangoefening waar falen
// gevaarlijk is (een stang op je borst of schouders: bankdrukken, squat) schrijft Forge minstens
// 1 herhaling in reserve voor, tenzij je sportschool veiligheidsarmen of een rek met vangers heeft
// of je de instelling "Zonder spotter" uitzette. Het is een voorschrift, geen blokkade: je kunt
// altijd 0 invullen als het zo ging, en dat wordt gewoon bewaard.
// Besluit: docs/beslissingen/2026-10-28-zonder-spotter.md.

import type { Exercise } from '../models/exercise';
import type { ExercisePrescription } from '../models/training';
import type { ResolvedStrengthSettings } from './strengthSettings';

// De minste herhalingen in reserve die Forge zonder spotter voorschrijft.
export const SPOTTER_MIN_RIR = 1;

// Geldt het voor deze oefening: falen is gevaarlijk, de instelling staat aan en de sportschool
// heeft geen veiligheidsarmen.
export function spotterApplies(exercise: Exercise | undefined, s: Pick<ResolvedStrengthSettings, 'noSpotter' | 'profile'>): boolean {
  return !!exercise?.failureRisk && s.noSpotter && !s.profile.spotterRack;
}

export interface SpotterSlot {
  slot: ExercisePrescription;
  // Per werkset (in volgorde) of het voorschrift omhoog ging.
  raised: boolean[];
}

// Het voorschrift van een oefening met minstens 1 over. Undefined als er niets te verhogen valt
// (het voorschrift vroeg al 1 of meer). Een set tot het uiterste ("9+" met 0 over) wordt een gewone
// set met 1 over: het aantal herhalingen blijft de onderkant van het bereik.
export function spotterSlot(slot: ExercisePrescription): SpotterSlot | undefined {
  if (slot.setTargets && slot.setTargets.length > 0) {
    const raised = slot.setTargets.map((t) => t.rir < SPOTTER_MIN_RIR);
    if (!raised.some(Boolean)) return undefined;
    const setTargets = slot.setTargets.map((t, i) => {
      if (!raised[i]) return t;
      const { failure: _failure, ...rest } = t;
      void _failure;
      return { ...rest, rir: SPOTTER_MIN_RIR };
    });
    return { slot: { ...slot, setTargets }, raised };
  }
  // Een RPE van 10 is 0 over; 9 is 1 over.
  if (slot.rpe !== undefined && 10 - slot.rpe < SPOTTER_MIN_RIR) {
    return { slot: { ...slot, rpe: 10 - SPOTTER_MIN_RIR }, raised: Array.from({ length: Math.max(1, slot.sets) }, () => true) };
  }
  return undefined;
}

// De regel bij de set en de uitleg erachter.
export const SPOTTER_SIGN = '1 over, zonder spotter';
export const SPOTTER_EXPLAIN = 'Zonder spotter of veiligheidsarmen kan een stang op je borst of schouders je klem zetten. Daarom schrijft Forge hier minstens 1 herhaling in reserve voor. Ging het toch tot 0, vul dan gewoon 0 in; dat wordt bewaard zoals je het deed.';
export const SPOTTER_HOW = 'Heeft je sportschool veiligheidsarmen of een rek met vangers, zet dat dan aan bij Je sportschool. Dan mag het 0 zijn. Je kunt dit ook uitzetten bij Zonder spotter.';
