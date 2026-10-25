import { describe, expect, it } from 'vitest';
import type { SweatEntry } from '../models/sweat';
import { expectedStageTempC, litersText, stageWater, stageWaterBasisLine, stageWaterLine, stageWaterShort, waterPointsLine } from './stageWater';

const own: SweatEntry = {
  id: 'a', logId: 'l', date: '2026-06-01', activity: 'walk', durationMinutes: 120, tempC: 26,
  weightBeforeKg: 80, weightAfterKg: 78.8, updatedAt: '2026-06-01T10:00:00.000Z',
};

describe('stageWater', () => {
  it('rekent zweettempo maal uren, op een halve liter', () => {
    // stuk 1 is 20 graden: standaard voor wandelen 550 ml per uur, 5,5 uur is 3 liter
    const w = stageWater({ section: 1, minutes: 330 }, undefined);
    expect(w).toMatchObject({ liters: 3, hours: 5.5 });
    expect(w?.rate.basis).toBe('default');
  });
  it('gebruikt de temperatuur van het stuk en je eigen meting', () => {
    expect(expectedStageTempC({ section: 4 })).toBe(26);
    // 600 ml per uur bij 26 graden, 7 uur is 4,2 liter
    const w = stageWater({ section: 4, minutes: 420 }, [own]);
    expect(w?.rate.basis).toBe('measured');
    expect(w?.liters).toBe(4);
  });
  it('rekent niet met een gok als de site geen looptijd geeft', () => {
    expect(stageWater({ section: 2, minutes: null }, undefined)).toBeUndefined();
  });
  it('geeft een eigen temperatuur voorrang', () => {
    expect(stageWater({ section: 1, minutes: 60 }, undefined, 30)?.rate.mlPerHour).toBe(750);
  });
});

describe('teksten', () => {
  const w = stageWater({ section: 1, minutes: 330 }, undefined)!;
  it('noemt het ongeveer en markeert de standaard', () => {
    expect(stageWaterLine(w)).toBe('Je zweet op deze etappe ongeveer 3 liter.');
    expect(stageWaterShort(w)).toBe('water ± 3 l');
    expect(stageWaterBasisLine(w)).toContain('nog niet gemeten, naar algemene cijfers');
    expect(stageWaterBasisLine(w)).not.toMatch(/voorzichtig/i);
    expect(stageWaterBasisLine(w)).toContain('Weeg jezelf');
  });
  it('zegt dat de temperatuur van het stuk een aanname is, en een gegeven temperatuur niet', () => {
    expect(stageWaterBasisLine(w)).toContain('aanname: bij ongeveer 20 graden, verwacht op een zomerdag');
    const given = stageWater({ section: 1, minutes: 330 }, undefined, 24)!;
    expect(given.tempAssumed).toBe(false);
    expect(stageWaterBasisLine(given)).not.toContain('aanname');
  });
  it('noemt bij een eigen meting geen standaard', () => {
    const m = stageWater({ section: 4, minutes: 420 }, [own])!;
    expect(stageWaterBasisLine(m)).toContain('op je eigen meting');
    expect(stageWaterShort(m)).toBe('water ± 4 l');
  });
  it('schrijft liters in het Nederlands', () => {
    expect(litersText(4)).toBe('4 liter');
    expect(litersText(5.5)).toBe('5,5 liter');
  });
  it('zegt waar water is uit de data van de etappe', () => {
    expect(waterPointsLine({ water: { text: 'In het noorden is water ruim.', source: 'rapport' } })).toBe('In het noorden is water ruim.');
    expect(waterPointsLine({ water: { text: 'In het zuiden liggen bronnen soms uren uit elkaar. Vul laat in de middag.', source: 'rapport' } })).toBe('In het zuiden liggen bronnen soms uren uit elkaar.');
    expect(waterPointsLine({})).toContain('niet bekend');
  });
});
