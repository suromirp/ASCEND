// ASCEND: de Nederlandse naam van een oefening, alleen voor de tekst van een melding (zoals het voorstel van
// engine/mountainMuscles.ts). De naam in Forge, in logs en in MacroFactor blijft de Engelse naam uit
// src/data/exercises.ts (docs/beslissingen/2026-10-22-oefeningnamen-engels.md). De Nederlandse naam staat daar
// al als alias; deze functie zoekt hem op en verzint niets. Besluit: docs/beslissingen/2026-11-12-je-week-tot-nu.md.

import { exerciseById } from '../data/exercises';

// Een alias is Nederlands als hij een Nederlands woord bevat. De lijst is kort en dekt de aliassen die nu in de
// data staan; een oefening zonder Nederlandse alias houdt in de melding haar eigen naam.
const DUTCH = /(^|\s)(één|een|op|met|aan|naar|de|het|van|staand|liggend|hangend|zijwaarts|achterwaarts|langzame|wandelende|negatieve|extra)(\s|$)|kuitheffen|heffen|staan|bilbrug|beenpers|beenstrekken|heupabductie|heupadductie|bankdrukken|optrekken|rugstrekken|zijplank|steunhouding|reiken|roemeense|bulgaarse|spaanse|stang/i;

export function dutchExerciseAlias(id: string): string | undefined {
  return exerciseById(id)?.aliases.find((a) => DUTCH.test(a));
}

// De naam voor een melding: de Nederlandse alias als die er is, anders de gewone naam.
export function noticeExerciseName(id: string, fallback: string): string {
  return dutchExerciseAlias(id) ?? exerciseById(id)?.name ?? fallback;
}
