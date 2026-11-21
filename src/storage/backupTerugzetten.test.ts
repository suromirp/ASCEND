// Na volledig terugzetten horen Laatste back-up en de lijst bij het toestel en gaan ze als paar
// (I-68, docs/beslissingen/2026-11-20-backup-terugzetten.md). Alle gegevens zijn nagemaakt.
import { beforeEach, describe, expect, it } from 'vitest';
import { InjuryNotesRepo, SessionLogsRepo, SettingsRepo, wipeAllData } from './database';
import { buildBackupEnvelope } from './backupExport';
import { normalizeBackupToCurrentModel } from './backupNormalize';
import { buildImportPreview } from './backupPreview';
import { applyImportPlan, createImportPlan, createPreImportSnapshot, restoreSnapshot } from './backupApply';
import { defaultActionsForMode, defaultPlanPolicyForMode } from './backupMerge';
import { backupMadeSettings, logsNotInLastBackup } from '../engine/backupSince';
import { isAutoBackupDue } from '../engine/autoBackup';
import { backupAge } from '../engine/settingsAttention';
import { addDays, localDateOf } from '../utils/dates';
import type { SessionLog } from '../models/training';

type Bestand = { createdAt?: unknown; payload: { settings: { lastExportedAt?: string; lastBackupLogs?: unknown }; sessionLogs: { id: string }[]; injuryNotes: unknown[] } };

const NOV8 = '2026-11-08T19:00:00.000Z';
const NOV15 = '2026-11-15T19:00:00.000Z';

const log = (id: string, completedAt: string): SessionLog => ({
  id, templateId: 'tpl', type: 'cardio', completedDate: completedAt.slice(0, 10), completedAt, variant: 'full', durationMinutes: 40, source: 'manual',
});
const pair = async () => {
  const s = await SettingsRepo.get();
  return { lastExportedAt: s.lastExportedAt, lastBackupLogs: s.lastBackupLogs };
};
const logIds = async () => (await SessionLogsRepo.getAll()).map((l) => l.id).sort();
// Welke trainingen de app als "niet in je laatste back-up" telt, op naam.
const unsaved = async () => {
  const [logs, settings] = [await SessionLogsRepo.getAll(), await SettingsRepo.get()];
  return logs.filter((l) => logsNotInLastBackup([l], settings) === 1).map((l) => l.id).sort();
};

// Een gewone back-up zoals de app hem maakt, op een gekozen tijdstip: het bestand draagt nog Laatste
// back-up van de keer daarvoor, pas daarna werkt de app het paar bij. `markedAt` is het tijdstip dat het
// toestel zelf opschrijft; bij de automatische back-up ligt dat net voor dat van het bestand.
async function makeBackup(at: string, markedAt = at): Promise<Bestand> {
  const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope())) as Bestand;
  envelope.createdAt = at;
  await SettingsRepo.set(backupMadeSettings(markedAt, envelope.payload.sessionLogs.map((l) => l.id)));
  return envelope;
}

async function plan(bestand: unknown, mode: 'full_restore' | 'merge') {
  const backup = normalizeBackupToCurrentModel(structuredClone(bestand));
  const categorySelections = defaultActionsForMode(mode);
  const planPolicy = defaultPlanPolicyForMode(mode);
  const preview = await buildImportPreview(backup, categorySelections, planPolicy);
  const snapshot = await createPreImportSnapshot();
  return { backup, snapshot, plan: createImportPlan(backup, mode, categorySelections, planPolicy, preview.diffByCategory.flatMap((d) => d.conflicts), snapshot.id) };
}
async function restore(bestand: unknown, mode: 'full_restore' | 'merge' = 'full_restore') {
  const p = await plan(bestand, mode);
  await applyImportPlan(p.backup, p.plan);
  return p.snapshot;
}

// Het toestel van de proef van Warden (B2): a, back-up op 8 november, b, back-up op 15 november.
async function twoBackups() {
  await SessionLogsRepo.put(log('a', '2026-11-01T10:00:00.000Z'));
  const first = await makeBackup(NOV8);
  await SessionLogsRepo.put(log('b', '2026-11-10T10:00:00.000Z'));
  const second = await makeBackup(NOV15);
  return { first, second };
}

describe('volledig terugzetten: Laatste back-up en de lijst gaan als paar', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('je eigen back-up op hetzelfde toestel: wat in de back-up staat telt als bewaard, een log van daarna telt mee', async () => {
    const { second } = await twoBackups();
    // In het bestand staat het tijdstip van de back-up daarvoor.
    expect(second.payload.settings.lastExportedAt).toBe(NOV8);
    // Een Forge-training van 7 november (laatste set), pas na de back-up van 15 november afgerond.
    await SessionLogsRepo.put(log('forge', '2026-11-07T18:00:00.000Z'));
    expect(await unsaved()).toEqual(['forge']);
    const before = await SessionLogsRepo.getAll();

    await restore(second);

    expect(await pair()).toEqual({ lastExportedAt: NOV15, lastBackupLogs: { at: NOV15, ids: ['a', 'b'] } });
    expect(await unsaved()).toEqual(['forge']);
    // Geen log is aangeraakt.
    expect(await SessionLogsRepo.getAll()).toEqual(before);
  });

  it('je eigen automatische back-up, waar het toestel een tel eerder noteerde dan het bestand: het bestand wordt het paar, de telling blijft gelijk', async () => {
    await SessionLogsRepo.put(log('a', '2026-11-01T10:00:00.000Z'));
    const bestand = await makeBackup('2026-11-15T19:00:02.000Z', NOV15);
    await SessionLogsRepo.put(log('forge', '2026-11-07T18:00:00.000Z'));

    await restore(bestand);

    expect(await pair()).toEqual({ lastExportedAt: '2026-11-15T19:00:02.000Z', lastBackupLogs: { at: '2026-11-15T19:00:02.000Z', ids: ['a'] } });
    expect(await unsaved()).toEqual(['forge']);
  });

  it('een leeg toestel: het bestand is de laatste back-up en alles erin telt als bewaard', async () => {
    const { second } = await twoBackups();
    await wipeAllData();
    expect((await pair()).lastExportedAt).toBeUndefined();

    await restore(second);

    expect(await logIds()).toEqual(['a', 'b']);
    expect(await pair()).toEqual({ lastExportedAt: NOV15, lastBackupLogs: { at: NOV15, ids: ['a', 'b'] } });
    expect(await unsaved()).toEqual([]);
    // Ook een training met een tijd van voor de back-up telt daarna mee.
    await SessionLogsRepo.put(log('forge', '2026-11-07T18:00:00.000Z'));
    expect(await unsaved()).toEqual(['forge']);
  });

  it('een bestand ouder dan de laatste back-up van het toestel: het paar van het toestel blijft staan', async () => {
    const { first } = await twoBackups();
    const before = await pair();
    expect(before).toEqual({ lastExportedAt: NOV15, lastBackupLogs: { at: NOV15, ids: ['a', 'b'] } });

    await restore(first);

    expect(await pair()).toEqual(before);
    expect(await unsaved()).toEqual([]);
  });

  it('een bestand met precies het tijdstip van het toestel: het paar van het toestel blijft staan', async () => {
    const { second } = await twoBackups();
    // De lijst van het toestel wijkt af van het bestand, zodat te zien is welke van de twee blijft.
    await SettingsRepo.set(backupMadeSettings(NOV15, ['a', 'b', 'x']));

    await restore(second);

    expect(await pair()).toEqual({ lastExportedAt: NOV15, lastBackupLogs: { at: NOV15, ids: ['a', 'b', 'x'] } });
  });

  it('een bestand zonder tijdstip: het paar van het toestel blijft staan', async () => {
    const { second } = await twoBackups();
    await SettingsRepo.set(backupMadeSettings(NOV8, ['a']));
    delete second.createdAt;

    await restore(second);

    expect(await pair()).toEqual({ lastExportedAt: NOV8, lastBackupLogs: { at: NOV8, ids: ['a'] } });
    expect(await unsaved()).toEqual(['b']);
  });

  it('een bestand met een kapot tijdstip: het paar van het toestel blijft staan, ook als dat leeg is', async () => {
    const { second } = await twoBackups();
    for (const kapot of ['geen datum', '', 20261115, null]) {
      await SettingsRepo.set(backupMadeSettings(NOV8, ['a']));
      await restore({ ...second, createdAt: kapot });
      expect(await pair()).toEqual({ lastExportedAt: NOV8, lastBackupLogs: { at: NOV8, ids: ['a'] } });
    }
    // Een leeg toestel: er is nog nooit een back-up gemaakt en het bestand zegt niet van wanneer het is.
    await wipeAllData();
    await restore({ ...second, createdAt: 'geen datum' });
    expect(await pair()).toEqual({ lastExportedAt: undefined, lastBackupLogs: undefined });
    expect(await unsaved()).toEqual(['a', 'b']);
  });

  it('een fout halverwege: er verandert niets, het paar blijft zoals het was en Ongedaan maken werkt nog', async () => {
    await InjuryNotesRepo.put({ id: 'n1', date: '2026-11-01', bodyPart: 'Knie', severity: 'licht', note: 'nagemaakt' });
    await SessionLogsRepo.put(log('a', '2026-11-01T10:00:00.000Z'));
    await SessionLogsRepo.put(log('b', '2026-11-10T10:00:00.000Z'));
    const bestand = await makeBackup(NOV15);
    // Het toestel loopt achter op het bestand, zodat een gelukte import het paar zou veranderen.
    await SettingsRepo.set(backupMadeSettings(NOV8, ['a']));
    const before = { pair: await pair(), logs: await SessionLogsRepo.getAll(), settings: await SettingsRepo.get() };

    const p = await plan(bestand, 'full_restore');
    // Kapot op de laatste opslag die geschreven wordt: alles ervoor staat al in de rij.
    (p.backup.injuryNotes[0] as unknown as Record<string, unknown>).note = () => 'geen kloon';
    await expect(applyImportPlan(p.backup, p.plan)).rejects.toThrow('Er is niets gewijzigd');

    expect(await pair()).toEqual(before.pair);
    expect(await SettingsRepo.get()).toEqual(before.settings);
    expect(await SessionLogsRepo.getAll()).toEqual(before.logs);
    // Ongedaan maken zet de kopie van voor de import terug: hetzelfde paar.
    await restoreSnapshot(p.snapshot.id);
    expect(await pair()).toEqual(before.pair);
    expect(await SessionLogsRepo.getAll()).toEqual(before.logs);
  });

  it('samenvoegen: de instellingen van het toestel blijven, het paar ook', async () => {
    const { second } = await twoBackups();
    await SettingsRepo.set(backupMadeSettings(NOV8, ['a']));
    await SessionLogsRepo.put(log('forge', '2026-11-07T18:00:00.000Z'));

    await restore(second, 'merge');

    expect(await pair()).toEqual({ lastExportedAt: NOV8, lastBackupLogs: { at: NOV8, ids: ['a'] } });
    expect(await unsaved()).toEqual(['b', 'forge']);
  });

  it('samenvoegen op een toestel zonder back-up: er komt geen Laatste back-up bij', async () => {
    const { second } = await twoBackups();
    await wipeAllData();

    await restore(second, 'merge');

    expect(await pair()).toEqual({ lastExportedAt: undefined, lastBackupLogs: undefined });
  });

  it('Ongedaan maken na een gelukte import: het nieuwste paar blijft, Laatste back-up springt niet terug, logs blijven (I-93)', async () => {
    await SessionLogsRepo.put(log('a', '2026-11-01T10:00:00.000Z'));
    const first = await makeBackup(NOV8);
    // Een nieuwer bestand, van een ander toestel, met twee trainingen erbij.
    const newer: Bestand = { ...structuredClone(first), createdAt: NOV15 };
    newer.payload.sessionLogs = [log('a', '2026-11-01T10:00:00.000Z'), log('b', '2026-11-10T10:00:00.000Z'), log('c', '2026-11-12T10:00:00.000Z')];

    const kopie = await restore(newer);
    expect(await pair()).toEqual({ lastExportedAt: NOV15, lastBackupLogs: { at: NOV15, ids: ['a', 'b', 'c'] } });
    expect(await unsaved()).toEqual([]);

    await restoreSnapshot(kopie.id);

    // De kopie draagt 8 november met [a], het toestel 15 november met [a, b, c]: het toestel is nieuwer.
    expect(await pair()).toEqual({ lastExportedAt: NOV15, lastBackupLogs: { at: NOV15, ids: ['a', 'b', 'c'] } });
    // Historie groeit alleen: b en c blijven. Ze staan in het bestand van 15 november, dus ze tellen als bewaard.
    expect(await logIds()).toEqual(['a', 'b', 'c']);
    expect(await unsaved()).toEqual([]);
  });

  it('een kopie van voor een import, gemaakt voor de laatste back-up: het paar van het toestel blijft (I-93)', async () => {
    await SessionLogsRepo.put(log('a', '2026-11-01T10:00:00.000Z'));
    await makeBackup(NOV8);
    const kopie = await createPreImportSnapshot(); // 8 november met [a]
    await SessionLogsRepo.put(log('b', '2026-11-10T10:00:00.000Z'));
    await makeBackup(NOV15);
    expect(await unsaved()).toEqual([]);

    await restoreSnapshot(kopie.id);

    expect(await pair()).toEqual({ lastExportedAt: NOV15, lastBackupLogs: { at: NOV15, ids: ['a', 'b'] } });
    expect(await logIds()).toEqual(['a', 'b']);
    expect(await unsaved()).toEqual([]);
  });

  it('een gedownloade kopie op een ander toestel: de lijst van het eerste toestel komt niet mee, het bestand zelf telt', async () => {
    await SessionLogsRepo.put(log('a', '2026-11-01T10:00:00.000Z'));
    await makeBackup(NOV8);
    await SessionLogsRepo.put(log('b', '2026-11-10T10:00:00.000Z'));
    const kopie = await createPreImportSnapshot();
    // Wat de download in een bestand zet: de envelop, met de lijst van het eerste toestel erin.
    const bestand = { ...(JSON.parse(JSON.stringify(kopie.envelope)) as Bestand), createdAt: NOV15 };
    expect(bestand.payload.settings.lastBackupLogs).toEqual({ at: NOV8, ids: ['a'] });
    await wipeAllData();

    await restore(bestand);

    expect(await pair()).toEqual({ lastExportedAt: NOV15, lastBackupLogs: { at: NOV15, ids: ['a', 'b'] } });
    expect(await unsaved()).toEqual([]);
  });

  it('een bestand met een tijdstip in de toekomst: Laatste back-up is nu, en de automatische back-up en de herinnering lopen door', async () => {
    const { second } = await twoBackups();
    const start = Date.now();

    await restore({ ...second, createdAt: '2099-11-20T12:00:00.000Z' });

    const p = await pair();
    const at = Date.parse(p.lastExportedAt!);
    expect(at).toBeGreaterThanOrEqual(start);
    expect(at).toBeLessThanOrEqual(Date.now());
    expect(p.lastBackupLogs).toEqual({ at: p.lastExportedAt, ids: ['a', 'b'] });
    expect(await unsaved()).toEqual([]);
    // De volgende dag is de dagelijkse back-up weer aan de beurt, en een maand later is de back-up oud.
    const day = new Date(at);
    const tomorrow = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1, 23, 59);
    expect(isAutoBackupDue({ frequency: 'daily', now: tomorrow, lastBackupAt: '2099-11-20T12:00:00.000Z', hasData: true })).toBe(false);
    expect(isAutoBackupDue({ frequency: 'daily', now: tomorrow, lastBackupAt: p.lastExportedAt, hasData: true })).toBe(true);
    expect(backupAge(p.lastExportedAt, addDays(localDateOf(p.lastExportedAt!), 35)).days).toBe(35);
  });

  it('het voorbeeld voor Akkoord: je eigen back-up op hetzelfde toestel toont geen bijgewerkte instelling', async () => {
    await twoBackups();
    // Een bestand van 12 november met 8 november in de instellingen, verder gelijk aan het toestel.
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope())) as Bestand;
    envelope.createdAt = '2026-11-12T19:00:00.000Z';
    envelope.payload.settings.lastExportedAt = NOV8;
    const backup = normalizeBackupToCurrentModel(envelope);
    const preview = await buildImportPreview(backup, defaultActionsForMode('full_restore'), defaultPlanPolicyForMode('full_restore'));
    expect(preview.settingsChanges).toEqual([]);
    expect(preview.diffByCategory.find((d) => d.category === 'app_settings')?.toReplace).toBe(0);
  });

  it('het voorbeeld telt het paar ook niet als het bestand de lijst zelf draagt (een gedownloade kopie)', async () => {
    await twoBackups();
    const kopie = await createPreImportSnapshot();
    const envelope = JSON.parse(JSON.stringify(kopie.envelope)) as Bestand;
    envelope.payload.settings.lastExportedAt = NOV8;
    envelope.payload.settings.lastBackupLogs = { at: NOV8, ids: ['a'] };
    const preview = await buildImportPreview(normalizeBackupToCurrentModel(envelope), defaultActionsForMode('full_restore'), defaultPlanPolicyForMode('full_restore'));
    expect(preview.settingsChanges.map((c) => c.key)).toEqual([]);
  });

  it('Ongedaan maken op een toestel dat voor de import nog geen back-up had: het paar van de import blijft staan', async () => {
    const { second } = await twoBackups();
    await wipeAllData();
    const kopie = await restore(second);
    expect(await pair()).toEqual({ lastExportedAt: NOV15, lastBackupLogs: { at: NOV15, ids: ['a', 'b'] } });

    await restoreSnapshot(kopie.id);

    // De kopie heeft de twee velden niet, en een ontbrekend veld betekent niet aanraken. De trainingen
    // blijven op het toestel en staan in dat bestand, dus het klopt.
    expect(await pair()).toEqual({ lastExportedAt: NOV15, lastBackupLogs: { at: NOV15, ids: ['a', 'b'] } });
    expect(await logIds()).toEqual(['a', 'b']);
    expect(await unsaved()).toEqual([]);
  });
});
