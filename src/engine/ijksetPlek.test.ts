import { describe, expect, it } from 'vitest';
import { searchSettings } from './settingsSearch';
import { SETTINGS_INDEX } from '../data/settingsIndex';
import { placementOf } from '../data/settingsLayout';

const GROUP = Object.values(import.meta.glob<string>('../components/settings/groups/ForgeGroup.tsx', { query: '?raw', import: 'default', eager: true }))[0] ?? '';

// I-83: de ijkset staat als rij in de Forge-groep zelf, niet meer achter Bij het invullen.
describe('IJkset, de plek in Instellingen', () => {
  it('"ijkset" vindt de rij op de Forge-pagina, niet in een blad', () => {
    expect(searchSettings('ijkset', SETTINGS_INDEX)[0]?.item.id).toBe('forge-ijkset');
    expect(placementOf('forge-ijkset')).toEqual({ page: 'forge', row: 'forge-ijkset' });
    expect(placementOf('forge-stapvoorstel')).toMatchObject({ row: 'bundel-invullen', sheet: true });
  });

  it('de groep toont de rij onder Voorstellen en het blad Bij het invullen niet meer', () => {
    const src = GROUP;
    expect(src).not.toBe('');
    const fill = src.slice(src.indexOf("sheet === 'bundel-invullen'"), src.indexOf("sheet === 'forge-tijdsgrens'"));
    expect(fill).not.toContain('forge-ijkset');
    expect(src.indexOf('id="forge-ijkset"')).toBeGreaterThan(src.indexOf('id="bundel-weergave"'));
    expect(src.indexOf('id="forge-ijkset"')).toBeLessThan(src.indexOf('title="In de sportschool"'));
  });
});
