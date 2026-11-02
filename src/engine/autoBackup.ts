// ASCEND: de automatische back-up (docs/beslissingen/2026-11-02-automatische-backup.md).
//
// Wanneer er een back-up nodig is, welke oude bestanden weg mogen en wat de gebruiker leest.
// Het moment is zondagavond (wekelijks, het advies) of elke avond (dagelijks), om 18:00 in de tijd
// van het toestel. Een back-up op de dag van dat moment telt, ook een van die ochtend: wie zondag
// zelf een back-up maakte, krijgt die avond geen tweede. Een gemist moment (de app was dicht) komt
// bij de volgende keer openen. Opruimen raakt alleen bestanden die ASCEND zelf schreef: de lijst
// die de opslag bijhoudt, en daarvan alleen namen in de vorm van `backupFileName`.
// Puur: geen React, geen opslag, geen platform.

import { localDateOf, toISODate } from '../utils/dates';

export const AUTO_BACKUP_CHOICES = ['off', 'weekly', 'daily'] as const;
export type AutoBackupFrequency = (typeof AUTO_BACKUP_CHOICES)[number];
export const AUTO_BACKUP_ADVICE: AutoBackupFrequency = 'weekly';

// Hoeveel bestanden er blijven staan; 0 is alles bewaren.
export const AUTO_BACKUP_KEEP_CHOICES = [4, 8, 16, 0] as const;
export type AutoBackupKeep = (typeof AUTO_BACKUP_KEEP_CHOICES)[number];
export const AUTO_BACKUP_KEEP_ADVICE: AutoBackupKeep = 8;

// Zondagavond, en bij dagelijks elke avond: na de training van de dag.
const AUTO_BACKUP_HOUR = 18;

// Na een mislukte poging niet bij elke keer terugkomen in de app opnieuw proberen.
const AUTO_BACKUP_RETRY_MS = 60 * 60 * 1000;

export function resolveAutoBackup(raw: unknown): AutoBackupFrequency {
  return AUTO_BACKUP_CHOICES.find((c) => c === raw) ?? AUTO_BACKUP_ADVICE;
}

export function resolveAutoBackupKeep(raw: unknown): AutoBackupKeep {
  return AUTO_BACKUP_KEEP_CHOICES.find((c) => c === raw) ?? AUTO_BACKUP_KEEP_ADVICE;
}

// Het laatste moment dat al voorbij is (of precies nu), in lokale tijd; null bij uit.
export function autoBackupSlot(frequency: AutoBackupFrequency, now: Date): Date | null {
  if (frequency === 'off') return null;
  const slot = new Date(now.getFullYear(), now.getMonth(), now.getDate(), AUTO_BACKUP_HOUR, 0, 0, 0);
  if (frequency === 'daily') {
    if (slot > now) slot.setDate(slot.getDate() - 1);
    return slot;
  }
  // Wekelijks: zondag (getDay() 0).
  slot.setDate(slot.getDate() - slot.getDay());
  if (slot > now) slot.setDate(slot.getDate() - 7);
  return slot;
}

const validMoment = (moment: string | undefined): moment is string => !!moment && !Number.isNaN(new Date(moment).getTime());

export interface AutoBackupDueInput {
  frequency: AutoBackupFrequency;
  now: Date;
  // De laatste back-up, met de hand of vanzelf (AppSettings.lastExportedAt).
  lastBackupAt?: string;
  // "Niet nu" op de kaart van Vandaag: wacht tot het volgende moment.
  dismissedAt?: string;
  // Er is iets te bewaren (een training gelogd of gepland). Een lege app krijgt geen back-up.
  hasData: boolean;
}

export function isAutoBackupDue(input: AutoBackupDueInput): boolean {
  if (!input.hasData) return false;
  const slot = autoBackupSlot(input.frequency, input.now);
  if (!slot) return false;
  const touched = [input.lastBackupAt, input.dismissedAt].filter(validMoment).map(localDateOf).sort().at(-1);
  return !touched || touched < toISODate(slot);
}

// Welke back-upkaart Vandaag toont. Uit: de oude herinnering na 7 dagen (`reminderDue`, Today.tsx).
// Aan: "Tijd voor je back-up" op het moment, maar pas als de app heeft gekeken of het stil kon
// (`checked`); is hij stil gemaakt, dan is hij niet meer nodig en staat er niets.
export function backupCardOnToday(input: AutoBackupDueInput & { checked: boolean; reminderDue: boolean }): 'reminder' | 'due' | null {
  if (input.frequency === 'off') return input.reminderDue ? 'reminder' : null;
  return input.checked && isAutoBackupDue(input) ? 'due' : null;
}

// Mag de opslag het na een mislukte poging nu opnieuw proberen?
export function mayRetryAutoBackup(failedAt: string | undefined, now: Date): boolean {
  if (!validMoment(failedAt)) return true;
  return now.getTime() - new Date(failedAt).getTime() >= AUTO_BACKUP_RETRY_MS;
}

// ---- bestanden ---------------------------------------------------------------------------

// De vorm van `storage/backup.ts#backupFileName`: ascend-JJJJ-MM-DD.ascend-backup.json. Staat er op die
// dag al een bestand met die naam dat niet van de automatische back-up is, dan krijgt hij een volgnummer
// (ascend-JJJJ-MM-DD-2.ascend-backup.json): een vreemd bestand wordt nooit overschreven.
const NAME_RE = /^ascend-(\d{4}-\d{2}-\d{2})(?:-([2-9]|[1-9]\d+))?\.ascend-backup\.json$/;

export function autoBackupFileName(day: string, n: number): string {
  return n <= 1 ? `ascend-${day}.ascend-backup.json` : `ascend-${day}-${n}.ascend-backup.json`;
}

export function isAutoBackupName(name: string): boolean {
  return NAME_RE.test(name);
}

// Dag en volgnummer, om op te sorteren (de gewone naam is nummer 1).
function sortKey(name: string): string {
  const m = NAME_RE.exec(name);
  return m ? `${m[1]}#${String(Number(m[2] ?? 1)).padStart(6, '0')}` : '';
}

// Een geschreven bestand bijschrijven in de lijst van eigen bestanden, zonder dubbele.
export function rememberFile(own: readonly string[], name: string): string[] {
  if (!isAutoBackupName(name) || own.includes(name)) return [...own];
  return [...own, name];
}

// Welke eigen bestanden weg mogen: alles behalve de nieuwste `keep`, naar de dag en het volgnummer in
// de naam. Een naam die niet van ASCEND is, staat er nooit in. `keep` 0 bewaart alles.
export function filesToPrune(own: readonly string[], keep: number): string[] {
  if (keep <= 0) return [];
  const ours = [...new Set(own.filter(isAutoBackupName))].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  return ours.slice(0, Math.max(0, ours.length - keep));
}

// ---- teksten -----------------------------------------------------------------------------

export type BackupWhere = { kind: 'folder'; label: string } | { kind: 'download' } | { kind: 'file' };

export function backupWhereText(where: BackupWhere | undefined): string | undefined {
  if (!where) return undefined;
  if (where.kind === 'folder') return `In ${where.label}`;
  if (where.kind === 'download') return 'In je downloads';
  return 'Op de plek die je koos';
}

export type AutoBackupFailureReason = 'permission' | 'folder' | 'write' | 'timeout';

const FAILURE_REASONS: readonly AutoBackupFailureReason[] = ['permission', 'folder', 'write', 'timeout'];
export const isFailureReason = (v: unknown): v is AutoBackupFailureReason => FAILURE_REASONS.includes(v as AutoBackupFailureReason);

// De naam leek vrij, maar hernoemen ernaartoe lukte niet: vermoedelijk een bestand van een vorige
// installatie dat deze app niet kan zien (Android 11 en nieuwer). De opslag probeert het volgende volgnummer.
export class NameTakenError extends Error {
  constructor(name: string) {
    super(`Naam bezet: ${name}`);
    this.name = 'NameTakenError';
  }
}

// Een mislukte back-up met de reden; de lagen in integrations/ en storage/ gooien hem.
export class AutoBackupError extends Error {
  readonly reason: AutoBackupFailureReason;
  constructor(reason: AutoBackupFailureReason) {
    super(`Automatische back-up mislukt: ${reason}`);
    this.name = 'AutoBackupError';
    this.reason = reason;
  }
}

// Eén rustige regel: wat er misging en wat je kunt doen. Altijd met de weg terug: zelf maken.
export function autoBackupFailureText(reason: AutoBackupFailureReason, platform: 'app' | 'browser'): string {
  const lead = 'De automatische back-up lukte niet';
  switch (reason) {
    case 'permission':
      return platform === 'app'
        ? `${lead}: ASCEND mag niet in de map schrijven. Geef toegang bij Vaste map, of maak de back-up nu zelf.`
        : `${lead}: je browser geeft de map niet meer vrij. Kies hem opnieuw bij Vaste map, of maak de back-up nu zelf.`;
    case 'folder':
      return platform === 'app'
        ? `${lead}: de map is niet te bereiken. Kijk bij Vaste map, of maak de back-up nu zelf.`
        : `${lead}: de map is er niet meer. Kies hem opnieuw bij Vaste map, of maak de back-up nu zelf.`;
    case 'write':
      return `${lead}: het bestand kon niet worden opgeslagen. Kijk of er nog ruimte is, of maak de back-up nu zelf.`;
    case 'timeout':
      return `${lead}: het duurde te lang. ASCEND probeert het de volgende keer opnieuw, of maak de back-up nu zelf.`;
  }
}
