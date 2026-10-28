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
  // Gemiddelde groei per week als breuk van de prestatie (0,0055 is 0,55% per week): het midden van de band.
  weekly: number;
  // De band om dat midden. De onderkant is de voorzichtige keuze ("Groei bij het rekenen"), de bovenkant
  // is voor wie net begint. Geen studie geeft deze grenzen; ze zijn afgeleid.
  low: number;
  high: number;
  evidence: GrowthEvidence;
  source: string;
}

// De sporten waarvoor nu een prestatiemeter bestaat. Nieuwe sporten komen hier bij.
export const GOAL_GROWTH: Record<'run' | 'walk' | 'trail', GrowthRate> = {
  run: {
    weekly: 0.0055, low: 0.003, high: 0.008,
    evidence: 'afgeleid',
    source: 'het midden van de band van 0,3 tot 0,8% per week, afgeleid uit meerdere bronnen (Munoz e.a. 2014 vond 0,35 tot 0,5% bij recreatieve lopers, verder Nuuttila e.a. 2022 en Daniels), niet uit één studie',
  },
  // Tempo bij een tijdslimiet of cutoff: geen trainingsstudie gevonden, dezelfde schatting als fietsvermogen.
  walk: { weekly: 0.005, low: 0.003, high: 0.008, evidence: 'zwak', source: 'afgeleid, geen studie over het tempo van recreatieve wandelaars' },
  trail: { weekly: 0.0055, low: 0.003, high: 0.008, evidence: 'zwak', source: 'het hardlooptempo, doorgetrokken naar inspanningskilometers; de groei op een ultra is niet onderzocht' },
};

// Het aantal weken werk waarbij een meter op de helft staat: vulling = HALF_WEEKS / (HALF_WEEKS + weken).
// Tien weken is de lengte van een gangbaar blok (goalKinds.ts, buildWeeks.recommended) en het punt waar de
// capaciteitsbreuk ook ongeveer 50% geeft.
export const HALF_WEEKS = 10;

// Marge op een tijdslimiet of cutoff (voor de voorwaardemeter, engine/limitReadiness.ts). Instelling
// "Marge bij een tijdslimiet" (AppSettings.limitMargin): tien procent is het advies, afwezig = tien.
export type LimitMarginChoice = 'ten' | 'five' | 'none';
export const LIMIT_MARGINS: Record<LimitMarginChoice, number> = { ten: 0.1, five: 0.05, none: 0 };
export const LIMIT_MARGIN = LIMIT_MARGINS.ten;
export const resolveLimitMargin = (v: unknown): LimitMarginChoice => (v === 'five' || v === 'none' ? v : 'ten');

// Instelling "Groei bij het rekenen" (AppSettings.goalGrowth): gemiddeld (het midden van de band, advies,
// afwezig = gemiddeld) of voorzichtig (de onderkant van de band: meer weken werk, een lagere meter).
export type GrowthChoice = 'average' | 'careful';
export const resolveGrowthChoice = (v: unknown): GrowthChoice => (v === 'careful' ? 'careful' : 'average');
export const growthPer = (rate: GrowthRate, choice: GrowthChoice = 'average'): number => (choice === 'careful' ? rate.low : rate.weekly);

// Kracht: groei van het geschatte maximum per week, per niveau op een oefening. De richting is sterk
// (beginners winnen veel sneller dan ervaren krachtsporters), de getallen zijn zwak en afgeleid uit
// Ralston 2018, Latella 2020 en Rhea 2003. Het niveau komt uit de lengte van je eigen krachtgeschiedenis
// op die oefening (engine/strengthReadiness.ts), nooit uit een vraag.
export type StrengthLevel = 'beginner' | 'gevorderd' | 'ervaren';
export const STRENGTH_GROWTH: Record<StrengthLevel, GrowthRate> = {
  beginner: { weekly: 0.01, low: 0.005, high: 0.02, evidence: 'zwak', source: 'Ralston e.a. 2018 (ongetrainden winnen in de eerste maanden 1 tot 3% per week)' },
  gevorderd: { weekly: 0.0025, low: 0.0015, high: 0.004, evidence: 'zwak', source: 'afgeleid uit Rhea 2003 en Latella e.a. 2020' },
  ervaren: { weekly: 0.001, low: 0.0005, high: 0.0015, evidence: 'zwak', source: 'Latella e.a. 2020 (powerlifters na het eerste wedstrijdjaar)' },
};
