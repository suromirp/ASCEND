import { describe, it, expect } from 'vitest';
import { GR5_SECTIONS, GR5_STAGES, stagesOfSection, STAGES_TAKEN_ON } from './gr5Stages';
import { BIVOUAC_REGIMES } from './gr5Bivouac';

describe('de 36 officiële etappes', () => {
  it('zijn er 36, in vier stukken van 7, 10, 10 en 9', () => {
    expect(GR5_STAGES).toHaveLength(36);
    expect(GR5_SECTIONS.map((s) => stagesOfSection(s.id).length)).toEqual([7, 10, 10, 9]);
    expect(GR5_SECTIONS.map((s) => s.count)).toEqual([7, 10, 10, 9]);
  });

  it('zijn doorlopend genummerd van Saint-Gingolph naar Nice', () => {
    GR5_STAGES.forEach((s, i) => {
      expect(s.overall).toBe(i + 1);
      expect(s.id).toBe(`t${s.section}e${s.number}`);
    });
    expect(GR5_STAGES[0].from).toBe('Saint-Gingolph');
    expect(GR5_STAGES[35].to).toBe('Nice');
  });

  it('geven onbekend als null en nooit als 0 of een gok', () => {
    const unknown = GR5_STAGES.filter((s) => s.km === null || s.up === null || s.down === null || s.minutes === null);
    expect(unknown.map((s) => s.id)).toEqual(['t2e6', 't3e1']);
    for (const s of GR5_STAGES) {
      for (const v of [s.km, s.up, s.down, s.minutes]) expect(v === null || v > 0).toBe(true);
    }
  });

  it('hebben de waarden die het rapport als voorbeeld noemt', () => {
    const byId = Object.fromEntries(GR5_STAGES.map((s) => [s.id, s]));
    expect(byId.t2e6).toMatchObject({ km: 14.7, up: 1297 });
    expect(byId.t2e5).toMatchObject({ km: 22.2, down: 1398 });
    expect(byId.t2e10).toMatchObject({ km: 16.2, down: 1656 });
  });

  it('noemen waar de site zichzelf tegenspreekt', () => {
    expect(GR5_STAGES.filter((s) => s.alt).map((s) => s.id)).toEqual(['t2e3', 't2e8', 't4e3']);
  });

  it('hebben per etappe een GPX en alleen bekende bivakgebieden', () => {
    for (const s of GR5_STAGES) {
      expect(s.gpx).toBe(`https://www.grande-traversee-alpes.com/wp-content/uploads/2026/02/GTA_troncon${s.section}_etape${s.number}.gpx`);
      for (const area of s.bivouac) expect(BIVOUAC_REGIMES[area]).toBeDefined();
    }
  });

  it('hebben een overnamedatum', () => {
    expect(STAGES_TAKEN_ON).toBe('2026-10-22');
  });

  it('gebruiken in geen enkele tekst een gedachtestreepje', () => {
    expect(JSON.stringify([GR5_STAGES, BIVOUAC_REGIMES])).not.toMatch(/[–—]/);
  });
});
