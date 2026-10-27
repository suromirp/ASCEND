import { describe, expect, it } from 'vitest';
import { placeSeasonNames } from './seasonLayout';

// Controleert beide regels op de uitkomst, los van hoe de plaatsing ze haalt.
function problems(xs: number[], total: number): string[] {
  const p = placeSeasonNames(xs, total);
  const out: string[] = [];
  p.forEach((a, i) => {
    if (a.left < 0 || a.left + a.width > total) out.push(`naam ${i} buiten de strook`);
    p.forEach((b, j) => {
      if (j <= i) return;
      if (a.row === b.row && a.left < b.left + b.width && b.left < a.left + a.width) out.push(`namen ${i} en ${j} overlappen`);
      if (b.row > a.row && xs[j] + 13 > a.left && xs[j] - 1 < a.left + a.width) out.push(`stok ${j} door naam ${i}`);
      if (a.row > b.row && xs[i] + 13 > b.left && xs[i] - 1 < b.left + b.width) out.push(`stok ${i} door naam ${j}`);
    });
  });
  return out;
}

describe('namen op de seizoensstrook', () => {
  it('ver uit elkaar blijft alles op de onderste rij met volle breedte', () => {
    const p = placeSeasonNames([48, 148, 248], 296);
    expect(p.map((x) => x.row)).toEqual([0, 0, 0]);
    expect(p.every((x) => !x.shortened)).toBe(true);
  });

  it('drie doelen dicht bij elkaar op 296 px overlappen niet en geen stok loopt door een naam', () => {
    expect(problems([100, 125, 150], 296)).toEqual([]);
    expect(problems([200, 215, 230], 296)).toEqual([]);
    expect(problems([10, 40, 70], 296)).toEqual([]);
    expect(problems([230, 262, 290], 296)).toEqual([]);
  });

  it('veel posities geven geen overlap', () => {
    for (let a = 0; a <= 296; a += 17) {
      for (let b = a + 8; b <= 296; b += 23) {
        for (let c = b + 8; c <= 296; c += 29) {
          expect(problems([a, b, c], 296)).toEqual([]);
        }
      }
    }
  });

  it('een naam die niet past gaat naar een hogere rij of wordt korter getoond', () => {
    const p = placeSeasonNames([100, 108, 116], 296);
    expect(p.some((x) => x.shortened || x.row > 0)).toBe(true);
  });

  it('een naam blijft binnen de strook aan de randen', () => {
    const p = placeSeasonNames([0, 296], 296);
    expect(p[0].left).toBe(0);
    expect(p[1].left + p[1].width).toBe(296);
  });
});
