// ASCEND: één stem per log (I-14, docs/visie/Ontwerp Eén plan.md, "één stem per aanleiding").
//
// Twee regels kunnen hetzelfde log lezen en elk iets zeggen dat op zich klopt, maar samen als tegenspraak leest: na een
// zware test "houd het rustig" naast "een nieuwe poging, zodat je benen dan fris zijn". Daarom houdt computeAdvice per
// log (Advice.relatedLogId) één advies: de regel die het eerst staat in VOICE_RANK. Een regel die er niet in staat
// wijkt voor een die er wel in staat; tussen twee zulke regels wint de hoogste prioriteit, dan het id. Wie wint houdt
// zijn eigen knoppen en Akkoord; de ander valt weg. Een nieuwe regel die een log noemt krijgt hier een plek.
//
// Pure: no React, no IndexedDB.

import type { Advice } from './adviceShared';

// Van belangrijk naar minder belangrijk. Een nieuwe testpoging gaat voor: een test heeft zijn eigen rust en vervolg.
// Daarna de rust na een zware training (verschuift misschien een dag), dan het bericht dat iets twee keer licht voelde
// (verandert niets).
export const VOICE_RANK: readonly string[] = ['TEST-RETRY', 'HARD-THEN-SPACE', 'LIGHT-TWICE'];

const rankOf = (a: Advice) => {
  const i = VOICE_RANK.indexOf(a.ruleId);
  return i < 0 ? VOICE_RANK.length : i;
};

// Negatief: a gaat voor b.
const compare = (a: Advice, b: Advice) => rankOf(a) - rankOf(b) || b.priority - a.priority || a.id.localeCompare(b.id);

export function oneVoicePerLog(advice: Advice[]): Advice[] {
  const best = new Map<string, Advice>();
  for (const a of advice) {
    if (!a.relatedLogId) continue;
    const held = best.get(a.relatedLogId);
    if (!held || compare(a, held) < 0) best.set(a.relatedLogId, a);
  }
  return advice.filter((a) => !a.relatedLogId || best.get(a.relatedLogId) === a);
}
