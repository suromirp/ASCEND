import { describe, it, expect, beforeEach } from 'vitest';
import { InjuryNotesRepo, ProgramsRepo, wipeAllData } from './database';
import { buildExportPayload } from './export';
import { importFromFile } from './import';
import type { InjuryNote } from '../models/injury';
import type { Program } from '../models/program';

// Phase 0a regression: export.ts/import.ts used to silently drop
// injuryNotes entirely (confirmed during the v0.3 repository audit) — a
// Settings -> Export lost all blessure history without any error. This
// locks the fix in.

describe('export/import round-trip', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('round-trips injuryNotes through export and import', async () => {
    const program: Program = { id: 'p1', name: 'Test Program', startDate: '2026-01-05', phases: [] };
    const injury: InjuryNote = { id: 'inj1', date: '2026-08-01', bodyPart: 'Rechterknie', severity: 'matig', note: 'test' };

    await ProgramsRepo.put(program);
    await InjuryNotesRepo.put(injury);

    const payload = await buildExportPayload();
    expect(payload.injuryNotes).toEqual([injury]);

    // Simulate importing that export on a clean device.
    await wipeAllData();
    expect(await InjuryNotesRepo.getAll()).toEqual([]);

    const file = new File([JSON.stringify(payload)], 'ascend-export.json', { type: 'application/json' });
    await importFromFile(file);

    expect(await InjuryNotesRepo.getAll()).toEqual([injury]);
  });

  it('imports cleanly when injuryNotes is absent (an export made before the field existed)', async () => {
    const program: Program = { id: 'p1', name: 'Test Program', startDate: '2026-01-05', phases: [] };
    await ProgramsRepo.put(program);
    const payload = await buildExportPayload();
    const { injuryNotes: _injuryNotes, ...withoutInjuryNotes } = payload;

    const file = new File([JSON.stringify(withoutInjuryNotes)], 'old-export.json', { type: 'application/json' });
    await expect(importFromFile(file)).resolves.not.toThrow();
    expect(await InjuryNotesRepo.getAll()).toEqual([]);
  });
});
