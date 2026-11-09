import { describe, it, expect } from 'vitest';
import { legComplaintOpen } from './legSpots';
import type { InjuryNote } from '../models/injury';

const note = (over: Partial<InjuryNote>): InjuryNote => ({ id: 'n', date: '2026-11-05', bodyPart: 'Knie links', severity: 'matig', ...over });

describe('een klacht aan een knie of been op Matig of erger', () => {
  const today = '2026-11-09';
  it('telt vanaf Matig, voor een been of knie, zolang hij open staat', () => {
    expect(legComplaintOpen([note({})], today)).toBe(true);
    expect(legComplaintOpen([note({ severity: 'ernstig', bodyPart: 'Kuit rechts' })], today)).toBe(true);
    expect(legComplaintOpen([note({ severity: 'licht' })], today)).toBe(false);
    expect(legComplaintOpen([note({ bodyPart: 'Schouder links' })], today)).toBe(false);
    expect(legComplaintOpen([note({ resolvedDate: '2026-11-08' })], today)).toBe(false);
  });
  it('spierpijn en stijf zijn geen klacht voor de planning', () => {
    expect(legComplaintOpen([note({ kind: 'spierpijn' }), note({ id: 'm', kind: 'stijf' })], today)).toBe(false);
    expect(legComplaintOpen([note({ kind: 'pijn' })], today)).toBe(true);
  });
});
