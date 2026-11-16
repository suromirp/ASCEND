// De back-up als bestand (I-63): dezelfde gegevens als de envelop, kleiner opgeschreven.
//
// Twee dingen maken het bestand kleiner, zonder dat er iets van de gebruiker wegvalt:
// - Uitleg die in voorstellen steeds terugkomt staat één keer in `proposalTexts` (storage/migrationsCompact.ts).
// - Inspringing alleen in de bovenste lagen: de envelop, de payload en de onderdelen daarvan staan op eigen regels,
//   elk record (een log, een voorstel, de reeksen van één loop, een ochtend, één instelling) staat op één regel.
//   Bijna alle inspringing zat in de diepe records (sets, wijzigingen per voorstel); één record per regel blijft te
//   lezen en te doorzoeken.
// Inlezen gaat langs storage/backupNormalize.ts, dat elke versie leest.

import { CURRENT_BACKUP_SCHEMA_VERSION, type AscendBackupEnvelope } from './backupTypes';
import { packProposalTexts } from './migrationsCompact';

// Tot en met deze diepte staat elk onderdeel op een eigen regel; dieper is één regel per record.
const READABLE_DEPTH = 3;

// Boven READABLE_DEPTH schrijft dit zelf, niet JSON.stringify: het kent daar geen `toJSON` (een Date) en geen
// gaten in een lijst. Een envelop heeft geen van beide (datums zijn tekst, lijsten zijn dicht); daaronder doet
// JSON.stringify het werk en klopt alles vanzelf.
function write(value: unknown, depth: number, indent: string): string | undefined {
  if (depth >= READABLE_DEPTH || value === null || typeof value !== 'object') return JSON.stringify(value);
  const inner = indent + '  ';
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const parts = value.map((v) => write(v, depth + 1, inner) ?? 'null');
    return `[\n${parts.map((p) => inner + p).join(',\n')}\n${indent}]`;
  }
  const parts: string[] = [];
  for (const [key, v] of Object.entries(value)) {
    const text = write(v, depth + 1, inner);
    // Zoals JSON.stringify: een veld zonder waarde (undefined, een functie) valt weg.
    if (text !== undefined) parts.push(`${inner}${JSON.stringify(key)}: ${text}`);
  }
  if (parts.length === 0) return '{}';
  return `{\n${parts.join(',\n')}\n${indent}}`;
}

// De envelop met de teksten van de voorstellen als verwijzing. De envelop zelf blijft zoals hij is.
export function packBackupEnvelope(envelope: AscendBackupEnvelope): AscendBackupEnvelope {
  const payload = envelope.payload as unknown as Record<string, unknown>;
  const proposals = payload.planChangeProposals;
  if (!Array.isArray(proposals) || proposals.length === 0) return envelope;
  const packed = packProposalTexts(proposals);
  if (Object.keys(packed.texts).length === 0) return envelope;
  // De tabel staat vlak voor de voorstellen, zodat wie het bestand leest hem eerst ziet.
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(payload)) {
    if (key === 'planChangeProposals') {
      out.proposalTexts = packed.texts;
      out.planChangeProposals = packed.proposals;
    } else out[key] = v;
  }
  // Verwijzingen kan alleen schema 6 en hoger lezen: ook een oudere kopie van voor een import (schema 5) krijgt dat
  // nummer zodra er een verwijzing in staat.
  return { ...envelope, backupSchemaVersion: Math.max(envelope.backupSchemaVersion, CURRENT_BACKUP_SCHEMA_VERSION), payload: out as unknown as AscendBackupEnvelope['payload'] };
}

// De tekst van het bestand: wat Back-up maken, de automatische back-up en een kopie van voor een import
// opschrijven.
export function backupFileText(envelope: AscendBackupEnvelope): string {
  return write(packBackupEnvelope(envelope), 0, '') ?? '{}';
}
