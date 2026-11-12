import { describe, expect, it } from 'vitest';
import { resolveOverviews } from './overviewSettings';
import { matchTodayProfile, todayProfilePatch, todayProfileValues, TODAY_PROFILE_ORDER, type TodayCardValues } from './settingsProfiles';

// De vraag van de week hoort sinds 12 november niet meer bij een profiel (docs/beslissingen/2026-11-12-je-dag.md).
const FLAGS = ['morningCheckIn', 'morningCard', 'weatherLine', 'weekReview', 'completionMoment'] as const;

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
    expect(aangepast).toBe(2 * 3 * 32 - 3);
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

  it('de vraag van de week staat los van de profielen en standaard uit', () => {
    // Een verse installatie: weekvraag uit, en het profiel heet nog steeds Alles.
    expect(matchTodayProfile({})).toBe('alles');
    // Aan of uit verandert het profiel niet.
    expect(matchTodayProfile({ overviews: { weeklyQuestion: true } })).toBe('alles');
    expect(matchTodayProfile({ overviews: { weeklyQuestion: false } })).toBe('alles');
    // Een profiel kiezen laat je eigen keuze voor de weekvraag staan.
    expect(todayProfilePatch('training', { overviews: { weeklyQuestion: true } }).overviews?.weeklyQuestion).toBe(true);
    expect(todayProfilePatch('alles', { overviews: { weeklyQuestion: false } }).overviews?.weeklyQuestion).toBe(false);
    expect(todayProfilePatch('alles', {}).overviews?.weeklyQuestion).toBeUndefined();
  });

  it('een bestaande gebruiker met een gekozen profiel houdt zijn waarde', () => {
    // Opgeslagen door het oude profiel Alles (weekvraag aan) of Het belangrijkste (uit).
    const oudAlles = { morningCheckIn: true, morningCard: true, weatherLine: true, weekReview: true, weeklyQuestion: true, completionMoment: true };
    const oudBelangrijkst = { morningCheckIn: true, morningCard: false, weatherLine: true, weekReview: false, weeklyQuestion: false, completionMoment: false };
    expect(matchTodayProfile({ overviews: oudAlles })).toBe('alles');
    expect(matchTodayProfile({ overviews: oudBelangrijkst, introSoundEnabled: false })).toBe('belangrijkst');
    expect(resolveOverviews(oudAlles).weeklyQuestion).toBe(true);
    expect(resolveOverviews({}).weeklyQuestion).toBe(false);
  });
});
