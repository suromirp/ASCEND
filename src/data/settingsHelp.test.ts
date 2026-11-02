import { describe, expect, it } from 'vitest';
import { SETTINGS_HELP } from './settingsHelp';

const GROUPS = import.meta.glob<string>('../components/settings/groups/*.tsx', { query: '?raw', import: 'default', eager: true });
const sources = () => Object.entries(GROUPS).map(([file, text]) => ({ file, text }));

describe('uitleg bij de instellingen', () => {
  it('heeft een zin vooraf en minstens één punt, zonder gedachtestreepjes', () => {
    for (const [key, h] of Object.entries(SETTINGS_HELP)) {
      expect(h.title, key).not.toBe('');
      expect(h.lead, key).not.toBe('');
      expect(h.points.length, key).toBeGreaterThan(0);
      expect(JSON.stringify(h), key).not.toMatch(/[–—]/);
    }
  });

  it('elke rij met info= wijst naar uitleg die bestaat', () => {
    for (const { file, text } of sources()) {
      for (const m of text.matchAll(/\binfo="([^"]+)"/g)) expect(SETTINGS_HELP[m[1]], `${file}: ${m[1]}`).toBeDefined();
    }
  });

  it('de uitleg die al bestond hangt aan zijn rij', () => {
    const all = sources().map((s) => s.text).join('\n');
    for (const key of ['meerdere', 'gewicht', 'drempel', 'kleding', 'trainingsduur']) expect(all, key).toContain(`info="${key}"`);
  });
});
