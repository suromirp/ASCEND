import { describe, expect, it } from 'vitest';
import { TRAINING_GUIDES } from '../data/trainingGuide';
import { goalWords, guideForGoal } from './guideWording';

describe('guideForGoal', () => {
  it('met een tocht als doel blijft de gids zoals hij is', () => {
    const g = Object.values(TRAINING_GUIDES)[0];
    expect(guideForGoal(g, true)).toBe(g);
    expect(guideForGoal(undefined, false)).toBeUndefined();
  });
  it('zonder tocht staat er nergens "je tocht" of "je bergtocht" meer, en de bron blijft heel', () => {
    for (const [id, g] of Object.entries(TRAINING_GUIDES)) {
      const before = JSON.stringify(g);
      const out = JSON.stringify(guideForGoal(g, false));
      expect(out, id).not.toMatch(/je (berg)?tocht\b/);
      expect(JSON.stringify(g), id).toBe(before);
    }
  });
  it('zinnen blijven lopen', () => {
    expect(goalWords('Twee dagen wandelen, zoals op je tocht.')).toBe('Twee dagen wandelen, zoals bij je doel.');
    expect(goalWords('verticale belasting richting je tocht')).toBe('verticale belasting richting je doel');
    expect(goalWords('Nooit zwaarder dan de rugzak van je bergtocht.')).toBe('Nooit zwaarder dan de rugzak van je doel.');
  });
  it('raakt links niet aan', () => {
    const g = { subtitle: 's', registration: 'r', sections: [], gear: [], sources: [{ label: 'je tocht', url: 'https://x.test/je tocht' }] };
    expect(guideForGoal(g, false)!.sources[0].url).toBe('https://x.test/je tocht');
  });
});
