// ASCEND: alle grenzen van de korte test bij elkaar (I-79 stap 3, docs/onderzoek/Drempel en submaximale
// test.md, hoofdstuk 3 en stap 3). Zoals zone2Rules.ts en THRESHOLD_RULES: elke grens is een gok uit het
// onderzoek en hoort na zes tot acht tests te worden bijgesteld op de eigen spreiding.

export const SHORT_TEST_RULES = {
  // De vorm: 10 minuten inlopen, 4 minuten op het testtempo, 1 minuut stilstaan.
  warmupSec: 10 * 60,
  testSec: 4 * 60,
  standSec: 60,
  // Een rustige loop korter dan dit krijgt geen korte test: na de test blijft er te weinig loop over.
  minRunMinutes: 25,
  // Waar ASCEND in de reeks naar het teststuk zoekt: een begin tussen deze minuten.
  searchFromSec: 5 * 60,
  searchToSec: 20 * 60,
  // Een begin tussen minuut 8 en 15 is vergelijkbaar (hartslagdrift: altijd op hetzelfde moment).
  validFromSec: 8 * 60,
  validToSec: 15 * 60,
  // Het snelste stuk van 4 minuten is een test als het binnen 8 procent van het testtempo ligt;
  // vergelijkbaar is het binnen 2 procent.
  foundTolerance: 0.08,
  paceTolerance: 0.02,
  // De hartslag van de test: het gemiddelde over de laatste 60 seconden.
  lastSec: 60,
  // Een gat in de hartslag langer dan dit in die laatste minuut, en de test telt niet.
  maxHrGapSec: 15,
  // Een stop: minder dan zoveel meter vooruit in meer dan zoveel seconden.
  stopMetres: 3,
  maxStopSec: 10,
  // Stilgestaan: minder dan zoveel meter in de minuut na de test.
  stillMetres: 25,
  // De hartslag aan het eind van de test en van de minuut stilstaan: het gemiddelde over de laatste 5 en 10 seconden.
  dropHalfSec: 5,
  // Het eigen midden: de laatste zoveel geldige tests, en pas een oordeel bij minstens zoveel.
  baselineMax: 6,
  baselineMin: 4,
  // Verschil met je midden in slagen: vanaf hier is het waarschijnlijk echt (met band, en aan de pols).
  notableBpm: 4,
  wristNotableBpm: 8,
  // Zoveel zwaarder dan gewoon (de RPE van de loop) heet zwaarder.
  harderRpe: 1,
} as const;
