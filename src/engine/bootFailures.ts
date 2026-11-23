// Een herstelstap bij het openen die faalt, geteld per stap: hoeveel starts op rij, sinds wanneer.
// Alleen voor de diagnose (Instellingen, Gegevens, Versie); de stap zelf wordt elke start opnieuw
// geprobeerd zoals in besluit 2026-11-14-opstarten-en-intervals-grens.md. Lukt hij weer, dan gaat hij
// uit de teller. Besluit 2026-11-23-opslag-twee-tabbladen-en-grens.md (I-35).

export const BOOT_FAILURES_KEY = 'bootStepFailures';

export interface BootFailure {
  count: number;
  firstAt: string;
  lastAt: string;
}

export type BootFailureRecord = Record<string, BootFailure>;

function clean(rec: unknown): BootFailureRecord {
  if (!rec || typeof rec !== 'object' || Array.isArray(rec)) return {};
  const out: BootFailureRecord = {};
  for (const [id, v] of Object.entries(rec as Record<string, unknown>)) {
    const f = v as Partial<BootFailure> | null;
    if (f && typeof f.count === 'number' && Number.isFinite(f.count) && f.count > 0 && typeof f.firstAt === 'string' && typeof f.lastAt === 'string') {
      out[id] = { count: f.count, firstAt: f.firstAt, lastAt: f.lastAt };
    }
  }
  return out;
}

// De teller na een start. Geeft dezelfde waarde terug als er niets verandert (dan hoeft er niets
// geschreven te worden) en undefined als er geen fout meer openstaat.
export function noteBootOutcomes(
  rec: BootFailureRecord | undefined,
  outcome: { failed: string[]; succeeded: string[] },
  at: string,
): BootFailureRecord | undefined {
  const before = clean(rec);
  const touched = outcome.failed.length > 0 || outcome.succeeded.some((id) => id in before);
  if (!touched && (rec === undefined || Object.keys(before).length === Object.keys(rec as object).length)) {
    return Object.keys(before).length > 0 ? rec : undefined;
  }
  const next: BootFailureRecord = { ...before };
  for (const id of outcome.succeeded) delete next[id];
  for (const id of outcome.failed) {
    const prev = next[id];
    next[id] = prev ? { count: prev.count + 1, firstAt: prev.firstAt, lastAt: at } : { count: 1, firstAt: at, lastAt: at };
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

// Eén zin voor de diagnose, of niets als alles lukte.
export function bootFailureLine(rec: BootFailureRecord | undefined): string | undefined {
  const list = Object.entries(clean(rec)).sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]));
  if (list.length === 0) return undefined;
  const [id, worst] = list[0];
  const when = worst.count === 1 ? 'de laatste start' : `de laatste ${worst.count} starts op rij`;
  const others = list.length > 1 ? `, en nog ${list.length - 1}` : '';
  return `Een herstelstap bij het openen mislukte ${when} (${id}${others}). Je gegevens blijven staan; de volgende start probeert het opnieuw.`;
}
