// ASCEND: de drie kerngetallen van de missiekaart op Vandaag, als chips.
//
// De feiten komen uit de training zelf (engine/sessionBrief.ts: duur, zone,
// wat de training vraagt). Heeft de gebruiker een testloop gedaan, dan
// vervangt het tempo uit die test de losse "praten kan"-aanwijzing: een tempo
// dat bij hem past is nuttiger dan een algemene regel. Zonder test blijft het
// algemene feit staan en wordt er niets verzonnen.
//
// Pure: no React, no IndexedDB.

import type { BriefFact, SessionBrief } from './sessionBrief';
import { formatPace, paceForTemplate, type PaceRange, type RacePaces } from './racePaces';
import { formatDateNL } from '../utils/dates';
import { idHasRole } from './templateRoles';

export type MissionChipKind = 'duur' | 'zone' | 'tempo' | 'overig';

export interface MissionChip {
  text: string;
  kind: MissionChipKind;
}

export interface MissionFacts {
  chips: MissionChip[];
  // Eén korte zin die het tempo-chipje uitlegt; alleen als dat chipje er is.
  paceNote?: string;
}

// Rustige trainingen krijgen het rustige tempo uit de test. Tempoloop,
// intervallen en bergafdaling hebben hun eigen tempo (racePaces.ts).
function paceFor(templateId: string, paces: RacePaces): PaceRange | undefined {
  const own = paceForTemplate(templateId, paces)?.range;
  if (own) return own;
  return idHasRole(templateId, 'easy_pace') ? paces.easy : undefined;
}

function formatPaceChip(range: PaceRange): string {
  return `${formatPace(range.fast)} tot ${formatPace(range.slow)} /km`;
}

const startsWithNumber = (s: string) => /^[±\d]/.test(s);

// "45 min" blijft "45 min"; "4 × 4 min" krijgt zijn uitleg ("hard") erbij;
// een woord als "Zone 2" of "Praten kan" staat op zichzelf.
function factText(fact: BriefFact): string {
  if (fact.label === 'totaal') return fact.value;
  if (fact.label.startsWith('zwaarte volgens')) return `Zwaarte volgens ${fact.value}`;
  return startsWithNumber(fact.value) ? `${fact.value} ${fact.label}` : fact.value;
}

function kindOf(fact: BriefFact, index: number): MissionChipKind {
  if (index === 0) return 'duur';
  if (/^zone \d/i.test(fact.value)) return 'zone';
  return 'overig';
}

export function missionFacts(templateId: string, brief: SessionBrief, paces: RacePaces | undefined): MissionFacts {
  const chips: MissionChip[] = brief.facts.map((f, i) => ({ text: factText(f), kind: kindOf(f, i) }));
  const range = paces ? paceFor(templateId, paces) : undefined;
  if (!paces || !range) return { chips };
  const pace: MissionChip = { text: formatPaceChip(range), kind: 'tempo' };
  const last = brief.facts.length - 1;
  // Het laatste feit is een losse aanwijzing ("Praten kan", "Zone 3"): het
  // tempo komt in zijn plaats. Is het een getal (hoogtemeters, rugzak), dan
  // blijft dat staan en komt het tempo erbij.
  if (last >= 1 && !startsWithNumber(brief.facts[last].value)) chips[last] = pace;
  else chips.push(pace);
  return { chips, paceNote: `Tempo uit je testloop van ${formatDateNL(paces.test.date)}.` };
}
