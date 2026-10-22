// ASCEND — opschoonstap bij het opstarten: dubbele automatische regels in het
// wijzigingslogboek samenvoegen (engine/planLogDedupe.ts beslist welke).
//
// Idempotent: is er niets dubbel, dan wordt er niets gelezen-voor-schrijven en
// niets geschreven. Daarom mag de stap bij elke start draaien, en ruimt hij
// ook een oude back-up op die later wordt geïmporteerd, bij de eerstvolgende
// start. Raakt alleen planChangeProposals; nooit SessionLog of
// MilestoneProgress.

import { getDB, PlanChangeProposalsRepo } from './database';
import { findDuplicateWeeklyLines } from '../engine/planLogDedupe';

// Geeft terug hoeveel regels zijn samengevoegd (weggehaald).
export async function mergeDuplicateWeeklyPrescriptionLines(): Promise<number> {
  const { removeIds } = findDuplicateWeeklyLines(await PlanChangeProposalsRepo.getAll());
  if (removeIds.length === 0) return 0;

  // Alles of niets: één transactie, zodat een afgebroken opstart geen half
  // opgeschoond logboek achterlaat.
  const db = await getDB();
  const tx = db.transaction('planChangeProposals', 'readwrite');
  await Promise.all([...removeIds.map((id) => tx.store.delete(id)), tx.done]);
  return removeIds.length;
}
