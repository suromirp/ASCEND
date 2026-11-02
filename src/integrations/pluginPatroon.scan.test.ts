import { describe, expect, it } from 'vitest';

// Een Capacitor-plugin is een Proxy met een methode `then`. Een belofte die ermee vervuld wordt
// (`import('x').then((m) => m.Plugin)`, `return plugin` uit een async functie) blijft op een toestel
// hangen. Houd de module in de belofte en pak de plugin pas na de await.
// Bronbestanden als tekst, zonder Node-types.
const SOURCES = import.meta.glob<string>('./*.ts', { query: '?raw', import: 'default', eager: true });
const files = Object.keys(SOURCES).filter((f) => !/\.test\.ts$/.test(f));

describe('plugins in src/integrations', () => {
  it('worden nooit als waarde van een belofte teruggegeven', () => {
    const bad: string[] = [];
    for (const f of files) {
      const text = SOURCES[f];
      // .then((m) => m.Naam) zonder aanroep erachter: de plugin zelf wordt de waarde.
      if (/\.then\(\s*\(?\s*(\w+)\s*\)?\s*=>\s*\1\.\w+\s*\)/.test(text)) bad.push(`${f}: .then((m) => m.Plugin)`);
      if (/Promise<Plugin>/.test(text)) bad.push(`${f}: Promise<Plugin>`);
    }
    expect(bad).toEqual([]);
  });
});
