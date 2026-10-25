import { describe, it, expect } from 'vitest';
import { applyWeightImport, planWeightImport, readMacroFactorWeightCsv, weightEntryFromDay } from './macrofactorWeight';
import { importSummary, readMacroFactorBytes } from './macrofactorFile';
import { makeXlsx, serialOf } from './xlsxTestKit';
import type { WeightEntry } from '../models/metrics';

// Nagemaakte exports. Het blad "Scale Weight" van MacroFactor heeft de kolommen
// Date, Weight (kg) en Fat Percent.

const day = (iso: string) => ({ date: serialOf(iso) });

describe('Fat Percent in de export', () => {
  it('leest het vetpercentage per datum naast het gewicht (xlsx, blad Scale Weight)', async () => {
    const content = await readMacroFactorBytes(
      makeXlsx([
        {
          name: 'Scale Weight',
          rows: [
            ['Date', 'Weight (kg)', 'Fat Percent'],
            [day('2026-10-13'), 80.4, 18.4],
            [day('2026-10-14'), 80.1, null],
            [day('2026-10-15'), 79.9, 18.1],
          ],
        },
      ]),
    );
    expect(content.weight?.hasFat).toBe(true);
    expect(content.weight?.days).toEqual([
      { date: '2026-10-13', scaleKg: 80.4, fatPct: 18.4 },
      { date: '2026-10-14', scaleKg: 80.1 },
      { date: '2026-10-15', scaleKg: 79.9, fatPct: 18.1 },
    ]);
  });

  it('neemt alleen geldige waarden, tussen 3 en 60', () => {
    const { days } = readMacroFactorWeightCsv('Date,Weight (kg),Fat Percent\n2026-10-01,80,2.5\n2026-10-02,80,3\n2026-10-03,80,60\n2026-10-04,80,61\n2026-10-05,80,0\n2026-10-06,80,abc\n2026-10-07,80,18,4\n');
    expect(days.map((d) => d.fatPct)).toEqual([undefined, 3, 60, undefined, undefined, undefined, 18]);
  });

  it('leest een komma als decimaal en een procentteken', () => {
    const { days } = readMacroFactorWeightCsv('Datum;Gewicht (kg);Vetpercentage\n2026-10-01;80,2;18,4%\n');
    expect(days).toEqual([{ date: '2026-10-01', scaleKg: 80.2, fatPct: 18.4 }]);
  });

  it('werkt zoals voorheen zonder die kolom, en met een lege kolom', () => {
    const without = readMacroFactorWeightCsv('Date,Weight (kg)\n2026-10-01,80\n');
    expect(without.days).toEqual([{ date: '2026-10-01', scaleKg: 80 }]);
    expect(without.hasFat).toBe(false);
    const empty = readMacroFactorWeightCsv('Date,Weight (kg),Fat Percent\n2026-10-01,80,\n2026-10-02,79.8,\n');
    expect(empty.days).toEqual([{ date: '2026-10-01', scaleKg: 80 }, { date: '2026-10-02', scaleKg: 79.8 }]);
    expect(empty.hasFat).toBe(false);
    expect(empty.skippedRows).toBe(0);
  });

  it('houdt een vetpercentage bij een trendgewicht', () => {
    expect(weightEntryFromDay({ date: '2026-10-13', scaleKg: 80.4, trendKg: 80.1, fatPct: 18.4 })).toEqual({
      date: '2026-10-13', kg: 80.1, source: 'macrofactor', basis: 'trend', scaleKg: 80.4, fatPct: 18.4,
    });
    expect(weightEntryFromDay({ date: '2026-10-13', scaleKg: 80.4, fatPct: 18.4 })).toEqual({
      date: '2026-10-13', kg: 80.4, source: 'macrofactor', basis: 'scale', fatPct: 18.4,
    });
  });
});

describe('een nieuwe import vult aan', () => {
  const old: WeightEntry = { date: '2026-10-13', kg: 80.4, source: 'macrofactor', basis: 'scale' };

  it('zet het vetpercentage bij een dag die al uit MacroFactor kwam', () => {
    const plan = planWeightImport([old], [{ date: '2026-10-13', scaleKg: 80.4, fatPct: 18.4 }]);
    expect(plan.same).toBe(0);
    expect(applyWeightImport([old], plan)).toEqual([{ ...old, fatPct: 18.4 }]);
  });

  it('laat een bewaard vetpercentage staan als het bestand de kolom niet heeft', () => {
    const had: WeightEntry = { ...old, fatPct: 18.4 };
    const plan = planWeightImport([had], [{ date: '2026-10-13', scaleKg: 80.4 }]);
    expect(plan.same).toBe(1);
    expect(plan.add).toHaveLength(0);
    const refreshed = planWeightImport([had], [{ date: '2026-10-13', scaleKg: 80.6 }]);
    expect(applyWeightImport([had], refreshed)[0]).toMatchObject({ kg: 80.6, fatPct: 18.4 });
  });

  it('vult een eigen meting zonder iets anders te veranderen aan', () => {
    const own: WeightEntry = { date: '2026-10-13', kg: 80.4, source: 'manual' };
    const plan = planWeightImport([own], [{ date: '2026-10-13', scaleKg: 80.4, fatPct: 18.4 }]);
    expect(plan.conflicts).toHaveLength(0);
    expect(applyWeightImport([own], plan)).toEqual([{ ...own, fatPct: 18.4 }]);
  });

  it('vult ook een eigen meting aan die in gewicht afwijkt, en laat het gewicht van jezelf staan', () => {
    const own: WeightEntry = { date: '2026-10-13', kg: 83, source: 'manual' };
    const plan = planWeightImport([own], [{ date: '2026-10-13', scaleKg: 80.4, fatPct: 18.4 }]);
    expect(plan.conflicts).toHaveLength(1);
    const applied = applyWeightImport([own], plan);
    expect(applied).toEqual([{ ...own, fatPct: 18.4 }]);
  });

  it('dezelfde import twee keer verandert niets meer', () => {
    const days = [{ date: '2026-10-13', scaleKg: 80.4, fatPct: 18.4 }];
    const first = applyWeightImport([], planWeightImport([], days));
    const again = planWeightImport(first, days);
    expect(again.add).toHaveLength(0);
    expect(again.same).toBe(1);
  });
});

describe('de samenvatting na het inlezen', () => {
  it('noemt het vetpercentage in gewoon Nederlands', () => {
    const lines = importSummary({ weight: { kg: 80, date: '2026-10-13', basis: 'scale', added: 3, offInSettings: false, fatDays: 3 }, ignoredSheets: 0 }, () => '13 oktober');
    expect(lines[1]).toBe('Vetpercentage: 3 metingen uit je weegschaal gelezen.');
    expect(lines.join(' ')).not.toMatch(/[–—]/);
  });
});
