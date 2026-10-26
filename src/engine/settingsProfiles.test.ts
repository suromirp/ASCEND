import { describe, expect, it } from 'vitest';
import { matchTodayProfile, todayProfilePatch, todayProfileValues, TODAY_PROFILE_ORDER, type TodayCardValues } from './settingsProfiles';

const FLAGS = ['morningCheckIn', 'morningCard', 'weatherLine', 'weekReview', 'weeklyQuestion', 'completionMoment'] as const;

describe('profiel Kaarten op Vandaag', () => {
  it('geen instellingen betekent het advies: alles', () => {
    expect(matchTodayProfile({})).toBe('alles');
  });

  it('elk profiel geeft na toepassen zichzelf terug', () => {
    for (const p of TODAY_PROFILE_ORDER) {
      expect(matchTodayProfile(todayProfilePatch(p, {}))).toBe(p);
    }
  });

  it('toepassen laat de andere overzichtsinstellingen staan', () => {
    const patch = todayProfilePatch('training', { overviews: { weekReviewDay: 'monday', bestMoment: false } });
    expect(patch.overviews?.weekReviewDay).toBe('monday');
    expect(patch.overviews?.bestMoment).toBe(false);
  });

  it('de profielen verschillen van elkaar', () => {
    const json = TODAY_PROFILE_ORDER.map((p) => JSON.stringify(todayProfileValues(p)));
    expect(new Set(json).size).toBe(3);
  });

  it('elke combinatie van de schakelaars is een profiel of aangepast', () => {
    const fitting = TODAY_PROFILE_ORDER.map((p) => todayProfileValues(p));
    let aangepast = 0;
    for (const sound of [true, false]) {
     for (const bodyCheck of ['reden', 'elke-week', 'uit'] as const) {
      for (let mask = 0; mask < 1 << FLAGS.length; mask++) {
        const overviews = Object.fromEntries(FLAGS.map((k, i) => [k, (mask & (1 << i)) !== 0]));
        const now = { ...overviews, introSoundEnabled: sound, bodyCheck } as unknown as TodayCardValues;
        const idx = fitting.findIndex((v) => FLAGS.every((k) => v[k] === now[k]) && v.introSoundEnabled === sound && v.bodyCheck === bodyCheck);
        const got = matchTodayProfile({ overviews, introSoundEnabled: sound, bodyCheck });
        if (idx >= 0) expect(got).toBe(TODAY_PROFILE_ORDER[idx]);
        else {
          expect(got).toBe('aangepast');
          aangepast++;
        }
      }
     }
    }
    expect(aangepast).toBe(2 * 3 * 64 - 3);
  });

  it('een ontbrekende geluidswaarde telt als aan, een enkele afwijking als aangepast', () => {
    expect(matchTodayProfile({ overviews: {} })).toBe('alles');
    expect(matchTodayProfile({ overviews: { weatherLine: false } })).toBe('aangepast');
    expect(matchTodayProfile({ introSoundEnabled: false })).toBe('aangepast');
  });

  it('de kaart Hoe voelt je lijf? hoort bij het profiel', () => {
    expect(todayProfileValues('alles').bodyCheck).toBe('reden');
    expect(todayProfileValues('belangrijkst').bodyCheck).toBe('reden');
    expect(todayProfileValues('training').bodyCheck).toBe('uit');
    expect(todayProfilePatch('training', {}).bodyCheck).toBe('uit');
    expect(matchTodayProfile({ bodyCheck: 'uit' })).toBe('aangepast');
    expect(matchTodayProfile({ bodyCheck: 'elke-week' })).toBe('aangepast');
    expect(matchTodayProfile({ bodyCheck: 'rommel' as never })).toBe('alles');
  });
});
