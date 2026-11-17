// ASCEND: "Klaar voor je test" (I-79 deel b; plek bepaald door Pathfinder vooraf, 17 november).
//
// De app leest zelf uit je laatste loop met een bewaarde reeks af of je borstband er was (de balans van
// grondcontact), of je horloge elke seconde een punt opsloeg (de tijd tussen de punten), en of de RR-reeks
// van je band binnenkwam. Geen checklist om af te vinken: drie korte feiten bij het horloge in
// Instellingen, en op een testdag één regel in de Briefing als er iets mist dat je test raakt.
//
// Puur: de feiten komen uit storage/testStreams.ts#lastRunStreamFacts.

export interface RunStreamFacts {
  logId: string;
  date: string;
  strapSeen: boolean;
  // De gewone tijd tussen twee punten (de mediaan), in seconden.
  stepSec?: number;
  rr: boolean;
}

// Tot hier is het elke seconde (een enkel gemist punt telt niet).
const EVERY_SECOND_MAX = 1.5;

export interface ReadinessFact {
  id: 'strap' | 'recording' | 'rr';
  ok: boolean;
  line: string;
}

export interface TestReadiness {
  // Nog geen loop met een reeks: één regel, geen feiten.
  empty?: string;
  facts: ReadinessFact[];
}

export const NO_RUN_YET = 'Nog geen loop met een reeks om uit af te lezen.';

export function testReadiness(facts: RunStreamFacts | undefined): TestReadiness {
  if (!facts) return { empty: NO_RUN_YET, facts: [] };
  const out: ReadinessFact[] = [];
  out.push(facts.strapSeen
    ? { id: 'strap', ok: true, line: 'Borstband gezien bij je laatste loop.' }
    : { id: 'strap', ok: false, line: 'Je laatste loop had geen borstband. Een test zonder telt niet voor je drempel.' });
  if (facts.stepSec !== undefined) {
    const every = facts.stepSec <= EVERY_SECOND_MAX;
    const n = Math.round(facts.stepSec);
    out.push(every
      ? { id: 'recording', ok: true, line: 'Je horloge sloeg elke seconde een punt op.' }
      : { id: 'recording', ok: false, line: `Je horloge sloeg ongeveer elke ${n} seconden een punt op. Zet de opslag op Elke seconde.` });
  }
  out.push(facts.rr
    ? { id: 'rr', ok: true, line: 'De RR-reeks van je band kwam binnen.' }
    : { id: 'rr', ok: false, line: 'Er kwam geen RR-reeks binnen van intervals.icu.' });
  return { facts: out };
}

// De ene regel in de Briefing op een testdag: alleen het eerste dat je test raakt (band of opslag);
// de RR-reeks telt nog nergens voor en zwijgt daar. Zonder loop met reeks niets: je weet het niet.
export function testReadyLine(r: TestReadiness): string | undefined {
  const strap = r.facts.find((f) => f.id === 'strap' && !f.ok);
  if (strap) return 'Borstband om: bij je laatste loop zag ASCEND hem niet, en zonder telt je test niet voor je drempel.';
  const rec = r.facts.find((f) => f.id === 'recording' && !f.ok);
  if (rec) return 'Je horloge slaat niet elke seconde een punt op. Zet de opslag voor je test op Elke seconde.';
  return undefined;
}

// De gewone tijd tussen twee punten van een klok, in seconden (de mediaan; pauzes wegen niet).
export function medianStepSec(timeSec: readonly number[]): number | undefined {
  const steps: number[] = [];
  for (let i = 1; i < timeSec.length; i++) {
    const d = timeSec[i] - timeSec[i - 1];
    if (Number.isFinite(d) && d > 0) steps.push(d);
  }
  if (steps.length === 0) return undefined;
  steps.sort((a, b) => a - b);
  const mid = Math.floor(steps.length / 2);
  return steps.length % 2 ? steps[mid] : (steps[mid - 1] + steps[mid]) / 2;
}
