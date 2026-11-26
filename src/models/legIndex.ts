import type { LegFeeling } from './checkIn';

// ASCEND: je eigen beenindex (engine/legIndexLearning.ts, docs/beslissingen/2026-11-26-beenindex-leert.md).
// Twee lijsten naast de instellingen, allebei alleen toevoegen.

// Een benenantwoord van een ochtend die niet meer bij de laatste 60 ochtendchecks hoort. De app bewaart
// hoogstens 60 ochtendchecks; wat daar vooraan afvalt komt hier, 180 dagen lang. Zo heeft de ijking een
// venster van 90 dagen. Een rij wordt nooit herschreven. 'goed' is "Gaat goed" (allNormal).
export interface LegAnswer {
  date: string; // ISO-datum van de ochtend
  legs: LegFeeling | 'goed';
  // Alleen bij spierpijn: de spierpijn zat alleen in je bovenlichaam (telt niet voor de benen).
  upper?: true;
  // Of het antwoord het voorstel van de app bevestigde ('voorstel') of je eigen keuze was ('zelf').
  // Afwezig: een ochtend van voor dit veld bestond.
  from?: 'voorstel' | 'zelf';
}

// Elk besluit over de factor, met datum. De laatste rij die de factor zet, geldt.
// - akkoord: je zei Akkoord op een voorstel; `factor` geldt vanaf nu.
// - liever-niet: je zei Liever niet; de factor blijft, de rij telt voor de rust van 28 dagen.
// - standaard: terug naar de standaard; de factor is weer 1.
// - uit: je zette het leren uit; de factor is 1 tot je het weer aanzet en opnieuw Akkoord geeft.
export type LegFactorSource = 'akkoord' | 'liever-niet' | 'standaard' | 'uit';
export interface LegFactorEntry {
  at: string; // ISO-tijdstip van het besluit
  factor: number; // de factor die het voorstel noemde (bij standaard en uit: 1)
  source: LegFactorSource;
}
