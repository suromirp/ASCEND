// ASCEND: de reeks van de korte test (I-79 stap 3, engine/shortTest.ts,
// docs/beslissingen/2026-11-18-korte-test.md). Eén antwoord op het voorstel "Elke week een korte test":
// met Akkoord het vaste testtempo van de reeks en de dag waarop hij begon. Een instelling naast de logs:
// de logs zelf veranderen er nooit door. Optioneel en additief, dus het schemanummer van de back-up
// verandert niet (storage/migrationsSettings.ts#migrateShortTestSeries).

export interface ShortTestSeries {
  answer: 'accepted' | 'declined';
  // De dag van het antwoord; bij Akkoord de eerste dag van de reeks.
  date: string;
  // Het vaste testtempo in seconden per km, alleen bij Akkoord.
  paceSecKm?: number;
}
