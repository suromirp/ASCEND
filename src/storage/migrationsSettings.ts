// Migratiestappen voor losse instellingen: navigatie, kaarten, gegevens,
// automatische back-up en Health Connect.

import { ABOVE_MISSION_CHOICES, type AboveMission } from '../engine/todayCards';
import { isStreamsBackup, type StreamsBackup } from '../engine/streamsBackup';
import { PROPOSAL_TIDY_OPTIONS, type ProposalTidyMonths } from '../engine/proposalTidy';
import { AUTO_BACKUP_CHOICES, AUTO_BACKUP_KEEP_CHOICES, type AutoBackupFrequency, type AutoBackupKeep } from '../engine/autoBackup';
import { RESUME_MINUTE_CHOICES, TAB_BACK_MODES, type TabBackMode } from '../engine/navigationSettings';
import { isRecord } from '../utils/guards';
import type { ExternalActivity } from '../engine/activityImport';
import type { HealthConnectErrorKind, HealthKind, HealthRoundFound } from '../models/healthConnect';
import type { HealthConnectState } from './healthConnect';

// --- terugknop en hervatten (optionele instellingen) ---------------------------
// `settings.tabBack` en `settings.resumeMinutes` (engine/navigationSettings.ts)
// zijn optioneel en additief: een back-up van voor deze instellingen heeft ze
// niet en blijft zoals hij is, het advies geldt dan. Staat er wel iets, dan
// blijft alleen een bekende waarde over; de rest wordt weggelaten en geteld.
export function cleanNavigationSettings(raw: { tabBack?: unknown; resumeMinutes?: unknown }): {
  value: { tabBack?: TabBackMode; resumeMinutes?: number };
  skipped: number;
} {
  const value: { tabBack?: TabBackMode; resumeMinutes?: number } = {};
  let skipped = 0;
  if (raw.tabBack !== undefined) {
    const mode = TAB_BACK_MODES.find((m) => m === raw.tabBack);
    if (mode) value.tabBack = mode;
    else skipped++;
  }
  if (raw.resumeMinutes !== undefined) {
    const minutes = RESUME_MINUTE_CHOICES.find((m) => m === raw.resumeMinutes);
    if (minutes !== undefined) value.resumeMinutes = minutes;
    else skipped++;
  }
  return { value, skipped };
}

// --- kaarten boven de missie (2026-11-01) ----------------------------------------------
// `settings.cardsAboveMission` (engine/todayCards.ts): hoeveel kaarten op Vandaag boven de missie staan.
// Optioneel en additief: een back-up van ervoor heeft het niet en krijgt het advies (één). Staat er iets,
// dan blijft alleen 1, 2 of 'all'; iets anders wordt weggelaten (undefined) en geteld.
export function migrateCardsAboveMission(raw: unknown): AboveMission | undefined {
  return ABOVE_MISSION_CHOICES.find((c) => c === raw);
}

// --- gegevens op lange termijn (2026-10-31) ------------------------------------------
// `settings.streamsBackup` vervangt de schakelaar `streamsInBackup` door drie keuzes
// (engine/streamsBackup.ts). Een back-up van daarvoor heeft alleen de schakelaar: uit wordt Geen
// reeksen, aan of niets is het advies (de laatste 2 jaar). De schakelaar zelf blijft staan, zodat
// een oudere versie van de app hetzelfde bestand nog leest. `settings.proposalTidyMonths` is
// nieuw: alleen een bekende waarde blijft, de rest wordt weggelaten en geteld.
export function migrateDataSettings(raw: { streamsBackup?: unknown; streamsInBackup?: unknown; proposalTidyMonths?: unknown }): {
  value: { streamsBackup?: StreamsBackup; proposalTidyMonths?: ProposalTidyMonths };
  skipped: number;
} {
  const value: { streamsBackup?: StreamsBackup; proposalTidyMonths?: ProposalTidyMonths } = {};
  let skipped = 0;
  if (raw.streamsBackup !== undefined) {
    if (isStreamsBackup(raw.streamsBackup)) value.streamsBackup = raw.streamsBackup;
    else skipped++;
  }
  if (value.streamsBackup === undefined && raw.streamsInBackup === false) value.streamsBackup = 'none';
  if (raw.proposalTidyMonths !== undefined) {
    if ((PROPOSAL_TIDY_OPTIONS as readonly unknown[]).includes(raw.proposalTidyMonths)) value.proposalTidyMonths = raw.proposalTidyMonths as ProposalTidyMonths;
    else skipped++;
  }
  return { value, skipped };
}

// --- automatische back-up (2026-11-02) ------------------------------------------------
// `settings.autoBackup` en `settings.autoBackupKeep` (engine/autoBackup.ts) zijn nieuw, optioneel en
// additief: een back-up van ervoor heeft ze niet en krijgt het advies (wekelijks, de laatste 8). Staat
// er iets, dan blijft alleen een bekende waarde; de rest wordt weggelaten en geteld. Waar de bestanden
// staan en welke ASCEND schreef hoort bij het toestel en zit nooit in een back-up.
export function migrateAutoBackupSettings(raw: { autoBackup?: unknown; autoBackupKeep?: unknown }): {
  value: { autoBackup?: AutoBackupFrequency; autoBackupKeep?: AutoBackupKeep };
  skipped: number;
} {
  const value: { autoBackup?: AutoBackupFrequency; autoBackupKeep?: AutoBackupKeep } = {};
  let skipped = 0;
  if (raw.autoBackup !== undefined) {
    const f = AUTO_BACKUP_CHOICES.find((c) => c === raw.autoBackup);
    if (f) value.autoBackup = f;
    else skipped++;
  }
  if (raw.autoBackupKeep !== undefined) {
    const k = AUTO_BACKUP_KEEP_CHOICES.find((c) => c === raw.autoBackupKeep);
    if (k !== undefined) value.autoBackupKeep = k;
    else skipped++;
  }
  return { value, skipped };
}

// --- Health Connect op dit toestel (2026-11-02) ------------------------------------------------
// De stand van Health Connect (storage/healthConnect.ts, docs/beslissingen/2026-11-02-health-connect.md)
// staat onder een eigen meta-sleutel, alleen op dit toestel, en gaat niet mee in de back-up: het is
// een apparaatvoorkeur plus een cache van wat Health Connect gaf. Wat er ook staat (niets, een
// oudere of een beschadigde vorm), het wordt de vorm van nu. Ontbreekt iets, dan staat het uit; een
// activiteit die niet van Health Connect is of geen geldige vorm heeft valt weg. De back-up
// verandert niet: een log uit Health Connect is een gewone SessionLog met `source: 'health-connect'`
// en een ochtend een gewone ochtend (MORNING_SOURCES hierboven), dus een oude back-up importeert
// zoals hij was en een nieuwe heeft geen veld dat een oudere app niet kent.
const HC_KINDS: readonly HealthKind[] = ['workouts', 'distance', 'sleep', 'restingHeartRate', 'heartRateVariability', 'weight', 'bodyFat'];
const HC_ERROR_KINDS: readonly HealthConnectErrorKind[] = ['web', 'not-installed', 'needs-update', 'denied', 'timeout', 'failed'];
const HC_ACTIVITY_KINDS: readonly string[] = ['run', 'hike', 'ride', 'strength', 'other'];
const isMoment = (v: unknown): v is string => typeof v === 'string' && Number.isFinite(Date.parse(v));

function migrateHealthActivity(raw: unknown): ExternalActivity | undefined {
  if (!isRecord(raw)) return undefined;
  const a = raw as Partial<ExternalActivity>;
  if (typeof a.externalId !== 'string' || !a.externalId.startsWith('health-connect:')) return undefined;
  if (typeof a.start !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(a.start)) return undefined;
  if (typeof a.durationSec !== 'number' || !(a.durationSec > 0) || !HC_ACTIVITY_KINDS.includes(a.kind as string)) return undefined;
  return { ...(a as ExternalActivity), source: 'health-connect', treadmill: a.treadmill === true };
}

export function migrateHealthConnectState(raw: unknown): HealthConnectState {
  const r = isRecord(raw) ? raw : {};
  const granted = Array.isArray(r.granted) ? HC_KINDS.filter((k) => (r.granted as unknown[]).includes(k)) : [];
  const err = isRecord(r.lastError) ? r.lastError : undefined;
  const lastError = err && HC_ERROR_KINDS.includes(err.kind as HealthConnectErrorKind) && typeof err.message === 'string' ? { kind: err.kind as HealthConnectErrorKind, message: err.message } : undefined;
  // Wat de laatste ronde per soort opleverde: een oude back-up of stand heeft het niet, dan blijft het weg.
  const lr = isRecord(r.lastRound) ? r.lastRound : undefined;
  const count = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : undefined);
  const weightFound: HealthRoundFound['weight'] | undefined = lr ? (lr.weight === 'off' || lr.weight === 'denied' ? lr.weight : count(lr.weight)) : undefined;
  const lastRound = lr && count(lr.activities) !== undefined && count(lr.mornings) !== undefined && weightFound !== undefined
    ? { activities: count(lr.activities)!, mornings: count(lr.mornings)!, weight: weightFound }
    : undefined;
  const seen = new Set<string>();
  const activities: ExternalActivity[] = [];
  for (const item of Array.isArray(r.activities) ? r.activities : []) {
    const a = migrateHealthActivity(item);
    if (!a || seen.has(a.externalId)) continue;
    seen.add(a.externalId);
    activities.push(a);
  }
  return {
    enabled: r.enabled === true,
    granted,
    ...(isMoment(r.fetchedAt) ? { fetchedAt: r.fetchedAt } : {}),
    ...(isMoment(r.attemptAt) ? { attemptAt: r.attemptAt } : {}),
    ...(lastError ? { lastError } : {}),
    ...(lastRound ? { lastRound } : {}),
    activities,
  };
}
