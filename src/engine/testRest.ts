// ASCEND: rust voor een test (docs/beslissingen/2026-11-02-rust-voor-een-test.md). De keuze zelf, los van de
// planner, zodat de instellingen haar kunnen lezen zonder de scheduler mee te laden. De regel staat in
// engine/scheduler.ts (testPairConflict, tooCloseBeforeTest) en in de weekcontrole (TEST-REST).
// Puur: geen React, geen IndexedDB.

export type TestRestHours = 48 | 72;

// Het advies: 72 uur tussen de laatste zware loop- of beendag en een test.
export const TEST_REST_ADVICE: TestRestHours = 72;

// Een opgeslagen waarde gelezen: alleen 48 telt als 48, al het andere (ook niets) is het advies.
export function resolveTestRest(value: unknown): TestRestHours {
  return value === 48 ? 48 : TEST_REST_ADVICE;
}
