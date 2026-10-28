// ASCEND: de instelling "Trillen" (docs/beslissingen/2026-10-28-vloeiende-overgangen.md).
// Optioneel en zonder migratie: afwezig of iets geks betekent aan. Alleen een
// expliciete `false` zet de tik uit. Het rustsignaal van Forge heeft zijn eigen
// keuze en volgt deze instelling niet.
export function resolveHaptics(raw: { haptics?: unknown } | undefined): boolean {
  return raw?.haptics !== false;
}
