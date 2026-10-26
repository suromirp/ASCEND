import { describe, expect, it } from 'vitest';
import type { SessionTemplate } from '../models/training';
import { isMountainTrip, sportKind, sportPictogram } from './sportKind';

function tpl(over: Partial<SessionTemplate>): SessionTemplate {
  return { id: 'tpl_x', name: 'Test', type: 'cardio', ...over } as SessionTemplate;
}

describe('isMountainTrip', () => {
  it('herkent de bergtocht aan zijn template', () => {
    expect(isMountainTrip({ id: 'tpl_mountain_hike', type: 'hiking' })).toBe(true);
    expect(isMountainTrip({ templateId: 'tpl_mountain_hike', type: 'hiking' })).toBe(true);
  });
  it('telt een tocht (avontuur) mee', () => {
    expect(isMountainTrip({ id: 'eigen', type: 'adventure' })).toBe(true);
  });
  it('houdt wandelen en rugzakwandelen apart', () => {
    expect(isMountainTrip({ id: 'tpl_ruck_walk', type: 'hiking' })).toBe(false);
    expect(isMountainTrip({ id: 'tpl_hike_day_one', type: 'hiking' })).toBe(false);
  });
});

describe('sportKind en sportPictogram', () => {
  it('geeft een bergtocht een eigen soort en pictogram', () => {
    const t = tpl({ id: 'tpl_mountain_hike', type: 'hiking', sport: 'hiking' });
    expect(sportKind(t)).toBe('mountain');
    expect(sportPictogram(t)).toBe('bergtocht');
  });
  it('laat wandelen wandelen', () => {
    const t = tpl({ id: 'tpl_ruck_walk', type: 'hiking', sport: 'hiking' });
    expect(sportKind(t)).toBe('walk');
    expect(sportPictogram(t)).toBe('wandelen');
  });
  it('kent kracht, lopen en rust', () => {
    expect(sportPictogram(tpl({ type: 'strength' }))).toBe('kracht');
    expect(sportPictogram(tpl({ type: 'cardio' }))).toBe('lopen');
    expect(sportPictogram(tpl({ type: 'recovery' }))).toBe('rust');
  });
  it('geeft fietsen de fiets, ook als het onder conditie staat', () => {
    const t = tpl({ id: 'tpl_bike', type: 'cardio', sport: 'cycling' });
    expect(sportKind(t)).toBe('bike');
    expect(sportPictogram(t)).toBe('fietsen');
  });
});
