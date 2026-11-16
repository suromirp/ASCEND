// Back-up kleiner zonder dataverlies (I-63). Alles hier is nagemaakt: geen echte persoon, geen echte back-up.
// De omvang lijkt op een echte back-up van een paar maanden (ongeveer de helft horlogereeksen, een vijfde logs,
// een vijfde voorstellen waarvan bijna de helft weekcontroles).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ActivityStreamsRepo, PlanChangeProposalsRepo, PlannedSessionsRepo, ProgramsRepo, RecoveryMetricsRepo, SessionLogsRepo, SessionTemplatesRepo, SettingsRepo, InjuryNotesRepo, getDB, wipeAllData } from './database';
import { buildBackupEnvelope } from './backupExport';
import { backupFileText, packBackupEnvelope } from './backupFile';
import { normalizeBackupToCurrentModel, parseBackupText } from './backupNormalize';
import { buildImportPreview } from './backupPreview';
import { applyImportPlan, createImportPlan, createPreImportSnapshot, listSnapshots, restoreSnapshot } from './backupApply';
import { defaultActionsForMode, defaultPlanPolicyForMode } from './backupMerge';
import { packProposalTexts, unpackProposalTexts } from './migrations';
import { CURRENT_BACKUP_SCHEMA_VERSION, type BackupDataCategory, type CategoryAction, type ImportMode } from './backupTypes';
import { packStreams } from '../engine/streamPack';
import type { SessionLog, PlannedSession, SessionTemplate } from '../models/training';
import type { PlanChangeProposal } from '../models/planChange';
import type { RecoveryMetric } from '../models/metrics';

// --- nagemaakte back-up ------------------------------------------------------------------------------------------

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const DAY0 = Date.UTC(2026, 4, 4); // maandag 4 mei 2026
const iso = (d: number) => new Date(DAY0 + d * 86_400_000).toISOString().slice(0, 10);
const at = (d: number, h: number, m = 0) => new Date(DAY0 + d * 86_400_000 + (h * 60 + m) * 60_000).toISOString();

const WEEKCHECK_WHY = 'Na elke wijziging gaan je weken langs vaste regels: je rustdag vrij, niet te veel op een dag, genoeg ruimte tussen zware dagen, frisse benen voor een test. Wat vanzelf gepland was, wordt dan rechtgezet. Wat jij zelf zette en je test of wedstrijd schuiven nooit; daarvoor krijg je een voorstel.';
// Twintig vaste uitlegteksten, zoals de engine ze schrijft.
const WHYS = Array.from({ length: 20 }, (_, i) => `Vaste uitleg ${i + 1}: de week volgt je dagen, je tijd en het doel; wat jij zelf zette blijft staan en een zware dag krijgt ruimte eromheen.`);
const REPAIRS = ['Duurloop van di 12 naar wo 13', 'Krachttraining A van za 16 naar zo 17', 'Intervallen van do 14 naar vr 15', 'Wandeling van zo 17 naar za 16'];
const EXERCISES = ['Squat', 'Bankdrukken', 'Roeien met halter', 'Romaanse deadlift', 'Schouderdrukken', 'Optrekken'];

const templates: SessionTemplate[] = [
  { id: 'tpl_kracht_a', name: 'Kracht A', type: 'strength' },
  { id: 'tpl_kracht_b', name: 'Kracht B', type: 'strength' },
  { id: 'tpl_duurloop', name: 'Duurloop', type: 'cardio' },
  { id: 'tpl_interval', name: 'Intervallen', type: 'cardio' },
  { id: 'tpl_wandel', name: 'Wandeling met rugzak', type: 'hiking' },
] as unknown as SessionTemplate[];

function makeLogs(r: () => number): SessionLog[] {
  const logs: SessionLog[] = [];
  for (let d = 0; d < 190; d++) {
    const dow = d % 7;
    if (dow === 0 || dow === 3) {
      logs.push({
        id: `log_k_${d}`, plannedSessionId: `ps_${d}`, templateId: dow === 0 ? 'tpl_kracht_a' : 'tpl_kracht_b', type: 'strength',
        completedDate: iso(d), completedAt: at(d, 18, 40), variant: 'full', durationMinutes: 55 + Math.round(r() * 15), rpe: 7, source: 'manual',
        strengthData: EXERCISES.map((name, i) => ({
          exerciseId: `ex_${i}`, exerciseName: name,
          sets: Array.from({ length: 4 }, (_, k) => ({ reps: 8 - (k > 2 ? 1 : 0), weightKg: 40 + i * 5 + Math.round(r() * 4) * 2.5, rir: 2, kind: k === 0 ? 'warmup' : 'work' })),
        })),
      } as unknown as SessionLog);
    } else if (dow === 1 || dow === 4 || dow === 5) {
      const km = Math.round((5 + r() * 7) * 100) / 100;
      logs.push({
        id: `log_r_${d}`, plannedSessionId: `ps_${d}`, templateId: dow === 4 ? 'tpl_interval' : 'tpl_duurloop', type: 'cardio',
        completedDate: iso(d), completedAt: at(d, 7, 15), variant: 'full', durationMinutes: Math.round(km * 6), rpe: 5, source: 'garmin', externalId: `ext_${d}`,
        cardioData: { durationMinutes: Math.round(km * 6), distanceKm: km, avgHeartRate: 140 + Math.round(r() * 15), elevationLossM: 30, environment: 'outdoor' },
        notes: r() < 0.3 ? 'Rustig begonnen, tweede helft sneller.' : undefined,
      } as unknown as SessionLog);
    }
  }
  return logs;
}

function makeProposals(r: () => number): PlanChangeProposal[] {
  const out: PlanChangeProposal[] = [];
  for (let i = 0; i < 88; i++) {
    const d = Math.floor(i * 2.1);
    const now = at(d, 6, i % 50);
    out.push({ id: `plancheck_${i}`, trigger: 'plan_check', issue: 'Weekcontrole', changes: [], alternatives: [], consequences: REPAIRS.slice(0, 1 + (i % 3)).join('; '), explanation: WEEKCHECK_WHY, createdAt: now, resolvedAt: now, resolution: 'accepted' });
  }
  for (let i = 0; i < 98; i++) {
    const d = Math.floor(i * 1.9);
    const why = WHYS[i % WHYS.length];
    const n = 2 + Math.floor(r() * 5);
    out.push({
      id: `planchange_${i}`, trigger: 'weekly_prescription_computed', issue: 'Je week is bijgewerkt op je voortgang',
      changes: Array.from({ length: n }, (_, k) => ({
        plannedSessionId: `ps_${d + k}`, action: 'move', fromDate: iso(d + k), toDate: iso(d + k + 1),
        reason: 'Volgt de dagen en de tijd die je hebt ingesteld.', generatedBy: ['engine/weeklyPrescriptionEngine.ts', 'engine/weekReconciliation.ts', 'regel-ruimte-tussen-zware-dagen'],
      })),
      alternatives: [], consequences: `${n} trainingen schuiven een dag op.`, explanation: why,
      createdAt: at(d, 9), resolvedAt: at(d, 9, 2), resolution: r() < 0.8 ? 'accepted' : 'rejected',
    } as PlanChangeProposal);
  }
  return out;
}

function makePlanned(): PlannedSession[] {
  return Array.from({ length: 260 }, (_, d) => ({
    id: `ps_${d}`, templateId: templates[d % templates.length].id, scheduledDate: iso(d), weekStartDate: iso(d - (d % 7)), status: 'planned', order: 0,
  } as PlannedSession));
}

function makeStreams(r: () => number, logs: SessionLog[]) {
  const runs = logs.filter((l) => l.type === 'cardio').slice(-8);
  return runs.map((l) => {
    const n = 3000 + Math.floor(r() * 2400);
    const time = Array.from({ length: n }, (_, i) => i);
    const set = {
      timeSec: time,
      distanceM: time.map((t) => Math.round(t * 2.9 * 100) / 100),
      heartRate: time.map((t) => 120 + Math.round(30 * Math.sin(t / 400) + r() * 6)),
      speedMs: time.map(() => Math.round((2.6 + r() * 0.6) * 1000) / 1000),
      altitudeM: time.map((t) => Math.round((10 + 8 * Math.sin(t / 700)) * 100) / 100),
      cadence: time.map(() => 80 + Math.round(r() * 6)),
      powerW: time.map(() => 230 + Math.round(r() * 40)),
      stanceTimeMs: time.map(() => 250 + Math.round(r() * 20)),
      verticalOscillationMm: time.map(() => Math.round((80 + r() * 10) * 10) / 10),
      stepLengthM: time.map(() => Math.round((1 + r() * 0.2) * 1000) / 1000),
      temperatureC: time.map(() => 18),
    };
    const km = Math.floor(n * 2.9 / 1000);
    return packStreams(set as never, {
      logId: l.id, externalId: String(l.externalId), fetchedAt: l.completedAt, wholeKm: km, wholeMinutes: Math.round(n / 60),
      headwindKmh: Array.from({ length: km }, () => Math.round(r() * 120) / 10),
      laps: Array.from({ length: km }, (_, k) => ({ startSec: k * 345, endSec: (k + 1) * 345, kind: 'work' as const, source: { distanceM: 1000, movingSec: 345, avgHeartRate: 148 } })),
    })!;
  });
}

function makeMornings(): RecoveryMetric[] {
  return Array.from({ length: 190 }, (_, d) => ({ id: `intervals.icu:${iso(d)}`, date: iso(d), source: 'import' as const, restingHeartRate: 48 + (d % 5), hrv: 55 + (d % 9), sleepMinutes: 420 + (d % 40), sleepScore: 75 + (d % 15) }));
}

async function seedRealistic() {
  const r = rng(63);
  const logs = makeLogs(r);
  await ProgramsRepo.put({ id: 'prog_1', name: 'Nagemaakt programma', startDate: iso(0), phases: [] } as never);
  for (const t of templates) await SessionTemplatesRepo.put(t);
  for (const s of makePlanned()) await PlannedSessionsRepo.put(s);
  for (const l of logs) await SessionLogsRepo.put(l);
  for (const p of makeProposals(r)) await PlanChangeProposalsRepo.put(p);
  for (const s of makeStreams(r, logs)) await ActivityStreamsRepo.put(s);
  await RecoveryMetricsRepo.putAll(makeMornings());
  await InjuryNotesRepo.put({ id: 'inj_1', date: iso(30), bodyPart: 'Linkerkuit', severity: 'licht', note: 'Na de intervallen.' });
  await SettingsRepo.set({ restDay: 6, weightEntries: Array.from({ length: 60 }, (_, i) => ({ date: iso(i * 3), kg: 78 + (i % 4) / 2, source: 'manual' })) } as never);
}

// --- helpers -----------------------------------------------------------------------------------------------------

// Elke store, met de sleutels van meta, zonder de kopieën van voor een import (die hebben een eigen id en tijd).
async function dump() {
  const db = await getDB();
  const out: Record<string, unknown> = {};
  for (const name of [...db.objectStoreNames]) {
    if (name === 'backupSnapshots') continue;
    if (name === 'meta') {
      const keys = await db.getAllKeys('meta');
      out.meta = Object.fromEntries(await Promise.all(keys.map(async (k) => [String(k), await db.get('meta', k)])));
    } else out[name] = await db.getAll(name as never);
  }
  return out;
}

async function importText(text: string, mode: ImportMode = 'full_restore', selections?: Partial<Record<BackupDataCategory, CategoryAction>>) {
  const backup = normalizeBackupToCurrentModel(parseBackupText(text));
  const sel = selections ?? { ...defaultActionsForMode(mode), app_settings: 'replace' as const };
  const policy = defaultPlanPolicyForMode(mode);
  const preview = await buildImportPreview(backup, sel, policy);
  const snapshot = await createPreImportSnapshot();
  await applyImportPlan(backup, createImportPlan(backup, mode, sel, policy, preview.diffByCategory.flatMap((d) => d.conflicts), snapshot.id));
  return { backup, preview };
}

const oldText = (envelope: unknown) => JSON.stringify(envelope, null, 2);
const kb = (text: string) => Math.round(new TextEncoder().encode(text).length / 1024);

// --- tests -------------------------------------------------------------------------------------------------------

describe('back-up kleiner zonder dataverlies (I-63)', () => {
  beforeEach(async () => {
    await wipeAllData();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is veel kleiner op een back-up van echte omvang', async () => {
    await seedRealistic();
    const envelope = await buildBackupEnvelope({ streams: true });
    const before = oldText(envelope);
    const after = backupFileText(envelope);
    // Alleen de reeksen zonder inspringing, de rest zoals het was: ter vergelijking met de gekozen vorm.
    const streamsOnly = JSON.stringify({ ...envelope, payload: { ...envelope.payload, activityStreams: '§' } }, null, 2)
      .replace('"§"', `[\n${((envelope.payload as { activityStreams?: unknown[] }).activityStreams ?? []).map((s) => '      ' + JSON.stringify(s)).join(',\n')}\n    ]`);
    const p = envelope.payload as unknown as Record<string, unknown>;
    const part = (key: string) => kb(JSON.stringify(p[key], null, 2));
    console.log(`[I-63] voor ${kb(before)} kB (reeksen ${part('activityStreams')}, logs ${part('sessionLogs')}, voorstellen ${part('planChangeProposals')} kB); alleen reeksen compact ${kb(streamsOnly)} kB; na ${kb(after)} kB (${Math.round((1 - after.length / before.length) * 100)} procent kleiner)`);
    const newPart = (key: string) => {
      const packedPayload = packBackupEnvelope(envelope).payload as unknown as Record<string, unknown>;
      const v = packedPayload[key];
      return Array.isArray(v) ? kb(v.map((x) => JSON.stringify(x)).join(',\n')) : kb(JSON.stringify(v ?? null));
    };
    console.log(`[I-63] per deel na: reeksen ${newPart('activityStreams')}, logs ${newPart('sessionLogs')}, voorstellen ${newPart('planChangeProposals') + newPart('proposalTexts')}, ochtenden ${part('mornings')} -> ${newPart('mornings')}, planning ${part('plannedSessions')} -> ${newPart('plannedSessions')} kB`);
    // De reeksen zijn al base64 op één regel: daar valt zonder inpakken weinig te halen. Logs en voorstellen
    // halveren ongeveer, het geheel krimpt met de verhouding van een echte back-up met ongeveer een kwart.
    expect(after.length).toBeLessThan(before.length * 0.85);
    expect(newPart('sessionLogs')).toBeLessThan(part('sessionLogs') * 0.6);
    expect(newPart('planChangeProposals') + newPart('proposalTexts')).toBeLessThan(part('planChangeProposals') * 0.6);
    // Dezelfde gegevens: het bestand leest terug naar precies dezelfde payload als de oude vorm.
    const back = normalizeBackupToCurrentModel(parseBackupText(after));
    const old = normalizeBackupToCurrentModel(parseBackupText(before));
    expect({ ...back, sourceBackupSchemaVersion: 0 }).toEqual({ ...old, sourceBackupSchemaVersion: 0 });
    // De bovenste lagen blijven leesbaar: elk onderdeel van de payload begint op een eigen regel.
    expect(after).toMatch(/\n {4}"planChangeProposals": \[\n {6}\{"id":/);
    expect(after).toMatch(/\n {4}"proposalTexts": \{\n {6}"t1": "/);
  });

  it('heen en terug: export, import op een leeg toestel, elke store gelijk aan het begin en aan de oude vorm', async () => {
    await seedRealistic();
    const original = await dump();
    const envelope = await buildBackupEnvelope({ streams: true });
    const packed = backupFileText(envelope);
    expect(JSON.parse(packed).backupSchemaVersion).toBe(CURRENT_BACKUP_SCHEMA_VERSION);

    await wipeAllData();
    await importText(oldText(envelope));
    const viaOld = await dump();

    await wipeAllData();
    const { backup } = await importText(packed);
    expect(backup.skippedInvalid).toBe(0);
    const viaNew = await dump();

    // Precies wat de oude vorm gaf, store voor store.
    for (const store of Object.keys(viaOld)) expect({ store, rows: viaNew[store] }).toEqual({ store, rows: viaOld[store] });
    expect(Object.keys(viaNew).sort()).toEqual(Object.keys(viaOld).sort());
    // En alles van de gebruiker zoals het begon, diep vergeleken.
    for (const store of ['programs', 'sessionTemplates', 'plannedSessions', 'sessionLogs', 'planChangeProposals', 'activityStreams', 'recoveryMetrics', 'injuryNotes']) {
      expect({ store, rows: viaNew[store] }).toEqual({ store, rows: original[store] });
    }
    const settings = (s: unknown) => (s as { value?: unknown }[] | undefined);
    expect(settings(viaNew.settings)).toEqual(settings(viaOld.settings));
  });

  it('een v6-bestand maakt ook een v6-bestand dat gelijk is (export na import verandert niets)', async () => {
    await seedRealistic();
    const first = backupFileText(await buildBackupEnvelope({ streams: true }));
    await wipeAllData();
    await importText(first);
    const second = backupFileText(await buildBackupEnvelope({ streams: true }));
    const strip = (t: string) => ({ ...JSON.parse(t), createdAt: '' });
    expect(strip(second)).toEqual(strip(first));
  });

  it('een oude back-up (schema 5) zonder tabel leest zoals altijd', async () => {
    await seedRealistic();
    const envelope = { ...(await buildBackupEnvelope({ streams: true })), backupSchemaVersion: 5 };
    const original = await dump();
    await wipeAllData();
    const { backup } = await importText(oldText(envelope));
    expect(backup.sourceBackupSchemaVersion).toBe(5);
    expect(backup.skippedInvalid).toBe(0);
    const after = await dump();
    for (const store of ['sessionLogs', 'planChangeProposals', 'activityStreams', 'recoveryMetrics']) expect(after[store]).toEqual(original[store]);
  });

  it('een schema 5-bestand met iets dat op een verwijzing lijkt, blijft zoals het is', () => {
    const odd = { id: 'p1', trigger: 'plan_check', issue: 'Weekcontrole', changes: [], alternatives: [], consequences: '', explanation: 'x', createdAt: at(0, 9), extra: { $tekst: 't1' } };
    const backup = normalizeBackupToCurrentModel({ backupSchemaVersion: 5, createdAt: at(0, 9), payload: { version: 5, planChangeProposals: [odd], proposalTexts: { t1: 'nee' } } });
    expect(((backup.planChangeProposals ?? [])[0] as unknown as { extra: unknown }).extra).toEqual({ $tekst: 't1' });
  });

  it('een oude platte back-up (schemaVersion 2) en een v1-envelop importeren nog', () => {
    const flat = normalizeBackupToCurrentModel({ schemaVersion: 2, exportDate: at(0, 9), program: null, templates: [], plannedSessions: [], sessionLogs: [{ id: 'l1', templateId: 't', type: 'cardio', completedDate: iso(1), completedAt: at(1, 7), variant: 'full', durationMinutes: 30 }], objectives: [], milestoneProgress: [], settings: {} });
    expect(flat.sessionLogs.map((l) => l.id)).toEqual(['l1']);
    const v1 = normalizeBackupToCurrentModel({ backupSchemaVersion: 1, createdAt: at(0, 9), payload: { version: 1, program: null, templates: [], plannedSessions: [], sessionLogs: [], objectives: [], milestoneProgress: [], injuryNotes: [], settings: {} } });
    expect(v1.sourceBackupSchemaVersion).toBe(1);
  });

  it('een onbekende sleutel: geen fout, het voorstel blijft met een lege tekst en telt niet als overgeslagen', () => {
    const proposal = (id: string) => ({ id, trigger: 'plan_check', issue: 'Weekcontrole', changes: [], alternatives: [], consequences: 'Duurloop van di 12 naar wo 13', explanation: WEEKCHECK_WHY, createdAt: at(0, 9) });
    const { proposals, texts } = packProposalTexts([proposal('a'), proposal('b')]);
    expect(texts).toEqual({ t1: 'Duurloop van di 12 naar wo 13', t2: WEEKCHECK_WHY });
    (proposals[1] as Record<string, unknown>).explanation = { $tekst: 't99' };
    const backup = normalizeBackupToCurrentModel({ backupSchemaVersion: 6, createdAt: at(0, 9), payload: { version: 5, proposalTexts: texts, planChangeProposals: proposals } });
    expect(backup.planChangeProposals?.map((p) => p.explanation)).toEqual([WEEKCHECK_WHY, '']);
    expect(backup.planChangeProposals?.[1].consequences).toBe('Duurloop van di 12 naar wo 13');
    expect(backup.planChangeProposals).toHaveLength(2);
    expect(backup.skippedInvalid).toBe(0);
    // Zonder tabel of met een kapotte tabel: ook geen fout.
    expect(() => normalizeBackupToCurrentModel({ backupSchemaVersion: 6, createdAt: at(0, 9), payload: { version: 5, proposalTexts: 'kapot', planChangeProposals: proposals } })).not.toThrow();
    expect(unpackProposalTexts({ proposalTexts: { t1: 5 }, planChangeProposals: [{ explanation: { $tekst: 't1' } }] })).toEqual({ planChangeProposals: [{ explanation: '' }] });
  });

  it('alleen een object met precies de sleutel $tekst onder een tekstveld is een verwijzing', () => {
    const texts = { t1: 'Een tekst die in de tabel van het bestand staat.' };
    const proposal = {
      id: 'p1', trigger: 'plan_check', issue: { $tekst: 't1' }, changes: [{ action: 'keep', reason: { $tekst: 't1', ook: 'iets' }, generatedBy: [{ $tekst: 't1' }, 'engine/x.ts'] }], alternatives: [],
      consequences: '', explanation: 'x', createdAt: at(0, 9),
      // Buiten de tekstvelden: blijft precies zoals het in het bestand staat.
      extra: { $tekst: 't1' }, meer: [{ $tekst: 't1' }],
    };
    const backup = normalizeBackupToCurrentModel({ backupSchemaVersion: 6, createdAt: at(0, 9), payload: { version: 5, proposalTexts: texts, planChangeProposals: [proposal] } });
    const p = (backup.planChangeProposals ?? [])[0] as unknown as Record<string, unknown> & { changes: Record<string, unknown>[] };
    expect(p.issue).toBe(texts.t1);
    expect(p.changes[0].reason).toEqual({ $tekst: 't1', ook: 'iets' });
    expect(p.changes[0].generatedBy).toEqual([texts.t1, 'engine/x.ts']);
    expect(p.extra).toEqual({ $tekst: 't1' });
    expect(p.meer).toEqual([{ $tekst: 't1' }]);
    expect(backup.skippedInvalid).toBe(0);
  });

  it('een tekst die één keer voorkomt of kort is, blijft gewoon staan', () => {
    const { proposals, texts } = packProposalTexts([{ explanation: 'Kort', issue: 'Een tekst die maar één keer voorkomt in de lijst.' }, { explanation: 'Kort' }]);
    expect(texts).toEqual({});
    expect(proposals).toEqual([{ explanation: 'Kort', issue: 'Een tekst die maar één keer voorkomt in de lijst.' }, { explanation: 'Kort' }]);
  });

  it('een nieuwere app (schema 7) zegt werk de app bij', () => {
    expect(() => normalizeBackupToCurrentModel({ backupSchemaVersion: 7, createdAt: at(0, 9), payload: { version: 5 } })).toThrow('nieuwere versie');
  });

  it('een fout halverwege de import van een v6-bestand laat het toestel zoals het was', async () => {
    await seedRealistic();
    const text = backupFileText(await buildBackupEnvelope({ streams: true }));
    await wipeAllData();
    await SessionLogsRepo.put({ id: 'own', templateId: 'tpl_duurloop', type: 'cardio', completedDate: iso(200), completedAt: at(200, 7), variant: 'full', durationMinutes: 30, source: 'manual' } as SessionLog);
    await InjuryNotesRepo.put({ id: 'mine_n', date: iso(5), bodyPart: 'Enkel', severity: 'licht', note: 'eigen' });
    const before = await dump();
    const backup = normalizeBackupToCurrentModel(parseBackupText(text));
    (backup.injuryNotes[0] as unknown as Record<string, unknown>).note = () => 'geen kloon';
    const selections = defaultActionsForMode('full_restore');
    const snapshot = await createPreImportSnapshot();
    await expect(applyImportPlan(backup, createImportPlan(backup, 'full_restore', selections, 'restore_backup_plan', [], snapshot.id))).rejects.toThrow('Er is niets gewijzigd');
    expect(await dump()).toEqual(before);
  });

  it('samenvoegen met een v6-bestand voegt alleen nieuwe voorstellen toe, met hun volle tekst', async () => {
    await seedRealistic();
    const text = backupFileText(await buildBackupEnvelope({ streams: true }));
    const all = await PlanChangeProposalsRepo.getAll();
    await wipeAllData();
    // Het toestel heeft de helft van de voorstellen al.
    for (const p of all.slice(0, 90)) await PlanChangeProposalsRepo.put(p);
    const { preview } = await importText(text, 'custom', { training_history: 'merge' });
    expect(preview.backupMeta.skippedInvalid).toBe(0);
    const back = (await PlanChangeProposalsRepo.getAll()).sort((a, b) => a.id.localeCompare(b.id));
    expect(back).toEqual([...all].sort((a, b) => a.id.localeCompare(b.id)));
  });

  it('het voorbeeld van een v6-bestand telt hetzelfde als dat van de oude vorm', async () => {
    await seedRealistic();
    const envelope = await buildBackupEnvelope({ streams: true });
    await wipeAllData();
    const sel = defaultActionsForMode('full_restore');
    const policy = defaultPlanPolicyForMode('full_restore');
    const a = await buildImportPreview(normalizeBackupToCurrentModel(parseBackupText(oldText(envelope))), sel, policy);
    const b = await buildImportPreview(normalizeBackupToCurrentModel(parseBackupText(backupFileText(envelope))), sel, policy);
    expect(b.diffByCategory).toEqual(a.diffByCategory);
    expect({ ...b.backupMeta, backupSchemaVersion: 0, isFromOlderVersion: false }).toEqual({ ...a.backupMeta, backupSchemaVersion: 0, isFromOlderVersion: false });
  });

  it('een kopie van voor een import (schema 5 of 6, ongepakt in de database) blijft terug te zetten', async () => {
    await seedRealistic();
    const original = await dump();
    await createPreImportSnapshot();
    const [snapshot] = await listSnapshots();
    // De kopie in de database is de envelop zelf, zonder verwijzingen.
    expect(JSON.stringify(snapshot.envelope)).not.toContain('$tekst');
    // Als bestand bewaard (Gegevens, Kopie bewaren) is het een gewoon v6-bestand.
    const asFile = normalizeBackupToCurrentModel(parseBackupText(backupFileText({ ...snapshot.envelope, backupSchemaVersion: 5 })));
    expect(asFile.skippedInvalid).toBe(0);
    expect(asFile.planChangeProposals).toEqual(normalizeBackupToCurrentModel(snapshot.envelope).planChangeProposals);
    await PlanChangeProposalsRepo.put({ ...(original.planChangeProposals as PlanChangeProposal[])[0], id: 'later' });
    await restoreSnapshot(snapshot.id);
    const after = await dump();
    expect(after.sessionLogs).toEqual(original.sessionLogs);
  });

  it('packBackupEnvelope laat de envelop zelf ongemoeid', async () => {
    await seedRealistic();
    const envelope = await buildBackupEnvelope({ streams: false });
    const copy = structuredClone(envelope);
    packBackupEnvelope(envelope);
    expect(envelope).toEqual(copy);
  });

  it('de tekst is geldige JSON, ook met lege lijsten, null en velden zonder waarde', () => {
    const envelope = { backupSchemaVersion: 6, appVersion: undefined, createdAt: at(0, 9), payload: { version: 5, program: null, templates: [], settings: {}, sessionLogs: [{ id: 'a', notes: undefined, n: NaN }], planChangeProposals: [] } };
    const text = backupFileText(envelope as never);
    expect(JSON.parse(text)).toEqual(JSON.parse(JSON.stringify(envelope)));
  });
});
