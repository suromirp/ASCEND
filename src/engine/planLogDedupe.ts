// ASCEND — dubbele automatische regels in het wijzigingslogboek samenvoegen.
//
// Door de herschrijffout (docs/visie/Techniek en kwaliteit.md, 2.3) zette de
// weekprescriptie bij elke opening een nieuwe regel "Weekprescriptie
// bijgewerkt" in planChangeProposals, ook als er niets veranderde. Bij een
// gebruiker liggen er ruim honderd van zulke regels met precies dezelfde
// wijziging. Deze functie zoekt ze op, zonder iets aan te passen.
//
// Wat telt als "dezelfde": opeenvolgende regels (op tijd gesorteerd, zonder
// iets anders ertussen) die door de weekplanning zelf zijn gemaakt en
// inhoudelijk gelijk zijn: zelfde soort, zelfde tekst, dezelfde sessies met
// dezelfde actie en data. Verse id's van voorschriften en tijdstempels tellen
// niet mee. Per reeks blijft de eerste regel staan (het moment waarop dit
// voor het eerst gebeurde); de rest kan weg.
//
// Wat nooit wordt samengevoegd: regels die jij zelf hebt gemaakt of
// afgewezen, regels van andere stappen (verplaatsen, ziekmelden, weekcontrole,
// doelen), en elke regel waar een "ongedaan maken" naar verwijst, of die zelf
// een ongedaan-maken is. SessionLog en MilestoneProgress komen hier niet
// eens in beeld: dit werkt alleen op planChangeProposals.

import type { PlanChangeProposal } from '../models/planChange';
import { stableJson } from './weeklyPrescriptionDiff';

function isAutomaticWeeklyLine(p: PlanChangeProposal, referenced: Set<string>): boolean {
  return p.trigger === 'weekly_prescription_computed' && p.resolution === 'accepted' && !p.revertsProposalId && !referenced.has(p.id);
}

// Inhoud van een regel zonder wat bij elke opening vers is.
function contentOf(p: PlanChangeProposal): string {
  const changes = p.changes.map((c) => stableJson({ ...c, newPrescriptionId: undefined })).sort();
  return stableJson({ trigger: p.trigger, issue: p.issue, consequences: p.consequences, explanation: p.explanation, resolution: p.resolution, changes });
}

// De id's van de regels die weg mogen, en hoeveel reeksen er waren.
export function findDuplicateWeeklyLines(proposals: PlanChangeProposal[]): { removeIds: string[]; runs: number } {
  const referenced = new Set(proposals.map((p) => p.revertsProposalId).filter((id): id is string => Boolean(id)));
  const sorted = [...proposals].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));

  const removeIds: string[] = [];
  let runs = 0;
  let previousKey: string | null = null; // sleutel van de vorige regel als die automatisch was, anders null
  let runHasDuplicates = false;
  for (const p of sorted) {
    if (!isAutomaticWeeklyLine(p, referenced)) {
      previousKey = null;
      continue;
    }
    const key = contentOf(p);
    if (previousKey === key) {
      removeIds.push(p.id);
      if (!runHasDuplicates) runs++;
      runHasDuplicates = true;
    } else {
      runHasDuplicates = false;
    }
    previousKey = key;
  }
  return { removeIds, runs };
}
