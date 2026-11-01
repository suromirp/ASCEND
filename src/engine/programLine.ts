import type { SetTarget } from '../models/training';

// De korte regel boven de sets in Forge: wat je programma vraagt. Gelijke sets staan samen
// ("4 sets van 9+ herhalingen tot falen"), verschillende kort na elkaar ("2 sets van 8 tot 10 met
// 2 over, dan 1 set van 9+ tot falen"). Alleen woorden; het gewicht rekent forgeWorkout.ts.

const reps = (s: SetTarget) => (s.repsLow === s.repsHigh ? `${s.repsLow}` : `${s.repsLow} tot ${s.repsHigh}`);
const plus = (s: SetTarget) => `${s.repsLow}+`;
const count = (n: number) => (n === 1 ? '1 set' : `${n} sets`);
const sameKind = (a: SetTarget, b: SetTarget) => !!a.failure === !!b.failure && !!a.open === !!b.open && (a.failure || a.open ? a.repsLow === b.repsLow : reps(a) === reps(b));
const sameSet = (a: SetTarget, b: SetTarget) => sameKind(a, b) && (a.failure ? true : a.rir === b.rir);

function segment(n: number, s: SetTarget, alone: boolean): string {
  if (s.failure) return `${count(n)} van ${plus(s)}${alone ? ' herhalingen' : ''} tot falen`;
  if (s.open) return `${count(n)} van ${plus(s)} met ${s.rir} over`;
  return `${count(n)} van ${reps(s)} met ${s.rir} over`;
}

export function programLine(sets: SetTarget[]): string {
  if (sets.length === 0) return '';
  // Dezelfde sets, alleen de reserve loopt op of af: "met 1, 2 en 3 over".
  if (sets.length > 1 && sets.every((s) => sameKind(s, sets[0]) && !s.failure && !s.open) && sets.some((s) => s.rir !== sets[0].rir)) {
    const rirs = sets.map((s) => s.rir);
    return `${count(sets.length)} van ${reps(sets[0])} met ${rirs.slice(0, -1).join(', ')} en ${rirs.at(-1)} over`;
  }
  const groups: { n: number; set: SetTarget }[] = [];
  for (const s of sets) {
    const last = groups.at(-1);
    if (last && sameSet(last.set, s)) last.n += 1;
    else groups.push({ n: 1, set: s });
  }
  return groups.map((g) => segment(g.n, g.set, groups.length === 1)).join(', dan ');
}
