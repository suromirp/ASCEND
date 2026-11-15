// Houdt de kennisindex bij: elk document in docs/ heeft een regel in docs/kennisindex/bronnen.json, elke regel
// wijst naar een document dat bestaat, en docs/kennisindex/ is wat `npm run kennisindex` nu maakt.
import { describe, it, expect } from 'vitest';
import { controleer, documenten, leesBronnen, verschillen } from './maak.mjs';

describe('kennisindex', () => {
  it('heeft voor elk document in docs/ een regel in bronnen.json', () => {
    const bekend = new Set(Object.keys(leesBronnen().documenten));
    expect(documenten().filter((p) => !bekend.has(p))).toEqual([]);
  });

  it('heeft geen regel die naar een document wijst dat niet bestaat, en elke regel is compleet', () => {
    expect(controleer()).toEqual([]);
  });

  it('is gelijk aan wat het script nu maakt (anders: npm run kennisindex)', () => {
    expect(verschillen()).toEqual([]);
  });
});
