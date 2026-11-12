import { describe, expect, it } from 'vitest';
import { missionCardView, missionChipsShown } from './missionCard';
import { TODAY_CARD_RANK, capAboveMission, placeTodayCards, type TodayCardId } from './todayCards';
import { standTomorrow, tomorrowEntry, trainingRowsForYourDay } from './yourDay';
import { briefingEntry, missionButton } from './briefing';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { MissionChip } from './missionFacts';
import type { PlannedSession } from '../models/training';

// Besluit 2026-11-12-missiekaart.md. Nagemaakte trainingen uit het demoprogramma.
const { templates } = buildDefaultProgramData();
const tpl = (id: string) => templates.find((t) => t.id === id)!;
const viewFor = (id: string, { watchTicks = false, quickComplete = false } = {}) => {
  const template = tpl(id);
  const briefingReach = !quickComplete && briefingEntry(template);
  return missionCardView({ briefingReach, briefingButton: !quickComplete && watchTicks && briefingReach, quickComplete, inAppStrength: template.type === 'strength' });
};

describe('missionCardView: wat de kaart toont', () => {
  it('een loop: alles van vooraf in de Briefing; weer en horloge alleen als waarschuwing', () => {
    const v = viewFor('tpl_easy_run');
    expect(v).toMatchObject({ nameOpensBriefing: true, zone: false, pace: true, paceQuiet: true, otherFacts: false, weather: 'warning', watch: 'failed', beforehand: false, button: 'done' });
  });
  it('met een horloge dat afvinkt: de knop is Briefing; zonder: Gedaan', () => {
    expect(viewFor('tpl_long_run', { watchTicks: true }).button).toBe('briefing');
    expect(viewFor('tpl_long_run').button).toBe('done');
  });
  it('een tocht en een rugzakwandeling: de Briefing, zoals elke training te voet', () => {
    for (const id of ['tpl_mountain_hike', 'tpl_ruck_walk', 'tpl_hike_day_one']) expect(viewFor(id).nameOpensBriefing).toBe(true);
  });
  it('een testloop: de Briefing; de knop blijft Gedaan, ook met een horloge (missionButton)', () => {
    expect(viewFor('tpl_test_run').nameOpensBriefing).toBe(true);
    expect(viewFor('tpl_test_run').button).toBe('done');
  });
  it('kracht in ASCEND: Training starten, geen Briefing, wat de kaart had blijft', () => {
    expect(viewFor('tpl_upper_a')).toMatchObject({ nameOpensBriefing: false, zone: true, pace: true, weather: 'full', watch: 'full', beforehand: true, button: 'start' });
  });
  it('kracht in MacroFactor: het korte formulier, geen Briefing', () => {
    expect(viewFor('tpl_upper_a', { quickComplete: true })).toMatchObject({ nameOpensBriefing: false, button: 'elsewhere' });
  });
  it('een training zonder Briefing (fietsen) houdt zijn zone en zijn weer', () => {
    expect(viewFor('tpl_bike')).toMatchObject({ nameOpensBriefing: false, zone: true, weather: 'full', beforehand: true, button: 'done' });
  });
  it('al gedaan: missionButton geeft Gedaan, nooit Briefing', () => {
    const session = { id: 'ps1', templateId: 'tpl_long_run', scheduledDate: '2026-11-12', status: 'planned' } as PlannedSession;
    const logs = [{ id: 'l1', plannedSessionId: 'ps1', templateId: 'tpl_long_run', completedDate: '2026-11-12' }] as never;
    expect(missionButton({ template: tpl('tpl_long_run'), session, logs, watchLink: undefined, watchSource: undefined })).toBe('done');
  });
});

describe('missionChipsShown: de duur blijft altijd', () => {
  const chips: MissionChip[] = [
    { text: '4 × 4 min', kind: 'duur' },
    { text: 'Zone 4', kind: 'zone' },
    { text: '5:10 tot 5:30 /km', kind: 'tempo' },
    { text: 'Praten kan', kind: 'overig' },
  ];
  it('met de Briefing de duur en het tempo (dat nog geen thuis in de Briefing heeft)', () => {
    expect(missionChipsShown(chips, viewFor('tpl_intervals')).map((c) => c.kind)).toEqual(['duur', 'tempo']);
  });
  it('zonder Briefing alles', () => {
    expect(missionChipsShown(chips, viewFor('tpl_bike'))).toHaveLength(4);
  });
});

describe('placeTodayCards: regel 6 rond de missie', () => {
  it('Alles leest als twee: nooit meer dan twee gewone kaarten boven de missie', () => {
    expect(capAboveMission('all')).toBe(2);
    expect(capAboveMission(1)).toBe(1);
    expect(capAboveMission(2)).toBe(2);
    expect(placeTodayCards(['ramp', 'freshStart', 'backup', 'morning'], 'all').above).toEqual(['ramp', 'freshStart']);
  });
  it('de ochtendvraag staat direct onder de missie, nooit erboven', () => {
    for (const limit of [1, 2, 'all'] as const) {
      const p = placeTodayCards(['morning'], limit);
      expect(p.above).toEqual([]);
      expect(p.underMission).toEqual(['morning']);
    }
  });
  it('de back-up, een advies en Niet gedaan? staan onder Je dag, in de vaste volgorde', () => {
    const p = placeTodayCards(['backupDue', 'backup', 'missed', 'advice'], 2);
    expect(p.above).toEqual([]);
    expect(p.underDay).toEqual(['advice', 'missed', 'backup', 'backupDue']);
  });
  it('veiligheid staat altijd boven, ook boven de grens, en telt mee', () => {
    const p = placeTodayCards(['ill', 'weatherWarning', 'freshStart', 'morning'], 1);
    expect(p.above).toEqual(['ill', 'weatherWarning']);
    expect(p.underMission).toEqual(['morning']);
    expect(p.underDay).toEqual(['freshStart']);
  });
  it('elke aanwezige kaart komt precies één keer terug, bij elke combinatie en elke grens', () => {
    const ids = TODAY_CARD_RANK.map((c) => c.id);
    for (let mask = 0; mask < 1 << ids.length; mask++) {
      const present: TodayCardId[] = ids.filter((_, i) => mask & (1 << i));
      for (const limit of [1, 2, 'all'] as const) {
        const p = placeTodayCards(present, limit);
        const out = [...p.above, ...p.underMission, ...p.underDay];
        expect(out.length).toBe(present.length);
        expect(new Set(out)).toEqual(new Set(present));
        expect(p.above.filter((id) => !TODAY_CARD_RANK.find((c) => c.id === id)!.always).length).toBeLessThanOrEqual(capAboveMission(limit));
      }
    }
  });
  it('een kaart die boven geen plek heeft wacht onder Je dag', () => {
    expect(placeTodayCards(['ramp', 'freshStart'], 1)).toEqual({ above: ['ramp'], underMission: [], underDay: ['freshStart'] });
  });
});

describe('twee trainingen op één dag', () => {
  it('de eerste is de missie; de tweede staat als rij in Je dag, de missie niet nog eens', () => {
    const sessions = [{ id: 'a' }, { id: 'b' }];
    expect(trainingRowsForYourDay(sessions, 'a', () => 'planned').map((s) => s.id)).toEqual(['b']);
  });
  it('is de eerste gedaan, dan staat hij als gedaan in Je dag', () => {
    const sessions = [{ id: 'a' }, { id: 'b' }];
    expect(trainingRowsForYourDay(sessions, 'b', (s) => (s.id === 'a' ? 'completed' : 'planned')).map((s) => s.id)).toEqual(['a']);
  });
});

describe('Morgen niet dubbel op Vandaag', () => {
  const tomorrow = { kind: 'training' } as ReturnType<typeof tomorrowEntry>;
  it('naast de kaart van een training staat de regel Morgen in Stand en morgen', () => {
    expect(standTomorrow(tomorrow, true)).toBe(tomorrow);
  });
  it('op een rustdag, een stille dag of na Vandaag zit erop noemt de kaart morgen al: geen tweede regel', () => {
    expect(standTomorrow(tomorrow, false)).toBeUndefined();
  });
});
