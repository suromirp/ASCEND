// ASCEND, hoe snel prestatie gemiddeld groeit, als gegevens (zoals data/goalKinds.ts).
//
// Elke prestatiemeter van "Klaar voor je doel" rekent het gat naar het doel om in weken realistisch
// werk (engine/goalGap.ts). Dit bestand heeft de getallen daarvoor, met bewijslabel en bron, zodat
// ze op één plek staan en een getal later kan veranderen zonder de rekenregels aan te raken.
// Onderbouwing: docs/onderzoek/Klaar voor je doel logisch per doel.md. Besluit:
// docs/beslissingen/2026-10-28-klaar-voor-je-doel-logisch.md.
//
// Het zijn gemiddelden voor gezonde volwassenen met een brede spreiding tussen mensen, geen
// voorspelling voor jou en geen medisch advies.

export type GrowthEvidence = 'sterk' | 'matig' | 'zwak' | 'expert' | 'afgeleid';

export interface GrowthRate {
  // Gemiddelde groei per week als breuk van de prestatie (0,0055 is 0,55% per week).
  weekly: number;
  evidence: GrowthEvidence;
  source: string;
}

// De sporten waarvoor nu een prestatiemeter bestaat. Nieuwe sporten komen hier bij.
export const GOAL_GROWTH: Record<'run', GrowthRate> = {
  run: {
    weekly: 0.0055,
    evidence: 'afgeleid',
    source: 'Munoz e.a. 2014 (0,35 tot 0,5% per week bij recreatieve lopers), Nuuttila e.a. 2022, Daniels (een VDOT-punt per vier tot zes weken)',
  },
};

// Het aantal weken werk waarbij een meter op de helft staat: vulling = HALF_WEEKS / (HALF_WEEKS + weken).
// Tien weken is de lengte van een gangbaar blok (goalKinds.ts, buildWeeks.recommended) en het punt waar de
// capaciteitsbreuk ook ongeveer 50% geeft.
export const HALF_WEEKS = 10;

// Marge op een tijdslimiet of cutoff (voor de voorwaardemeter, nog niet gebouwd).
export const LIMIT_MARGIN = 0.1;
