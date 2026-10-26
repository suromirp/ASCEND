// A blessure/injury log entry. Independent of SessionLog's strict
// append-only rule: marking an injury resolved is a legitimate status
// change, not a rewrite of history (nothing about what training actually
// happened is altered).

export type InjurySeverity = 'licht' | 'matig' | 'ernstig';

// Wat je merkt (docs/beslissingen/2026-10-26-hoe-voelt-je-lijf.md). Ontbreekt het, dan is het pijn,
// zoals elke melding van voor de kaart "Hoe voelt je lijf?". Spierpijn en stijf zijn geen klacht
// voor de planning en sluiten na 7 dagen vanzelf (engine/bodyMap.ts#isOpen, afgeleid bij het lezen).
export type InjuryKind = 'spierpijn' | 'stijf' | 'pijn';
// Welke kant. Ontbreekt het, dan staat de kant in de naam (oud) of is het beide kanten; een
// rugplek zonder kant leest als 'midden'.
export type InjurySide = 'links' | 'midden' | 'rechts' | 'beide';

export interface InjuryNote {
  id: string;
  date: string; // ISO date — when it started/was noticed
  bodyPart: string;
  severity: InjurySeverity;
  note?: string;
  kind?: InjuryKind;
  side?: InjurySide;
  resolvedDate?: string; // ISO date — undefined while still open
}
