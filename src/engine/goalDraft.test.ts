import { describe, it, expect } from 'vitest';
import type { TrainingGoal } from '../models/goals';
import { ADD_TILES, applyGoalEdit, buildGoalDraft, defaultDetails, detailsFromGoal, draftProblems, limitText, paceText, questionsFor, suggestPriority, tileOfGoal, RACE_KM } from './goalDraft';
import { isRaceGoal } from './goalLabels';

const NOW = '2026-10-26T10:00:00.000Z';
const existing = (id: string, date: string, priority: TrainingGoal['priority']): TrainingGoal => ({ id, name: id, status: 'active', targetDate: date, priority, requirements: [], createdAt: NOW, updatedAt: NOW }) as TrainingGoal;

describe('tijdslimiet en cutoff in het formulier', () => {
  it('een dagtocht vraagt een tijdslimiet, een trail een cutoff alleen bij een ultra', () => {
    expect(questionsFor('day_hike').map((q) => q.key)).toContain('timeLimitMinutes');
    const cutoff = questionsFor('trail').find((q) => q.key === 'cutoffMinutes')!;
    expect(cutoff.required).toBe(false);
    expect(cutoff.showIf?.({ variant: 'ultra' })).toBe(true);
    expect(cutoff.showIf?.({ variant: 'kort' })).toBe(false);
    expect(questionsFor('day_hike').length).toBeLessThanOrEqual(6);
    expect(questionsFor('trail').length).toBeLessThanOrEqual(6);
  });

  it('een korte trail houdt geen cutoff over', () => {
    const g = buildGoalDraft({ id: 'x', now: '2026-10-28T10:00:00Z', tile: 'trail', details: { variant: 'kort', distanceKm: 20, gainM: 800, expectedMinutes: 200, cutoffMinutes: 300 }, date: '2027-05-01', name: '', priority: 'top', order: 0 });
    expect(g.details?.cutoffMinutes).toBeUndefined();
    const u = buildGoalDraft({ id: 'y', now: '2026-10-28T10:00:00Z', tile: 'trail', details: { variant: 'ultra', distanceKm: 50, gainM: 2500, expectedMinutes: 600, cutoffMinutes: 660 }, date: '2027-05-01', name: '', priority: 'top', order: 0 });
    expect(u.details?.cutoffMinutes).toBe(660);
  });

  it('zegt de limiet in uren', () => {
    expect(limitText(660)).toBe('Dat is 11:00 uur.');
    expect(limitText(undefined)).toBeUndefined();
  });
});

describe('de soorten in het toevoegblad', () => {
  it('een leeg veld met een vraag als label leest als gewone zin', () => {
    expect(draftProblems('trek', { distanceKm: 100, gainM: 5000, lossM: 5000, shelter: 'hut' }, '2027-07-10', '2026-10-26')).toContain('Vul het aantal dagen in.');
    expect(draftProblems('trek', {}, '2027-07-10', '2026-10-26').some((p) => p.includes('?'))).toBe(false);
  });

  it('heeft een tegel per soort, de tocht met hut of tent als één', () => {
    expect(ADD_TILES.map((t) => t.id)).toEqual(['trek', 'day_hike', 'mountaineering', 'run_race', 'trail', 'bike', 'triathlon', 'stronger', 'fit']);
    expect(ADD_TILES.every((t) => t.label && t.summary && t.picto)).toBe(true);
  });

  it('vraagt per soort alleen wat nodig is, met een bovengrens', () => {
    const trek = questionsFor('trek');
    expect(trek.map((q) => q.key)).toEqual(['days', 'distanceKm', 'gainM', 'lossM', 'packKg', 'shelter']);
    expect(trek.length).toBeLessThanOrEqual(6);
    expect(questionsFor('run_race').map((q) => q.key)).toEqual(['variant', 'distanceKm', 'targetMinutes']);
    // De eigen afstand wordt alleen gevraagd bij "Eigen".
    const own = questionsFor('run_race')[1];
    expect(own.showIf?.({ variant: '10k' })).toBe(false);
    expect(own.showIf?.({ variant: 'eigen' })).toBe(true);
    expect(questionsFor('run_race')[0].choices?.map((c) => c.value)).toEqual(['5k', '10k', 'half', 'marathon', 'eigen']);
    expect(questionsFor('fit').map((q) => q.key)).toEqual(['weeklyMinutes', 'strengthDays']);
    expect(questionsFor('stronger')).toEqual([]);
  });
});

describe('het label dat voorgesteld wordt', () => {
  it('het eerste doel is Top', () => {
    expect(suggestPriority([], '2027-03-14')).toBe('top');
  });
  it('een volgend doel is Voortop als het voor je Top ligt en Verkenning als het erna ligt', () => {
    const top = existing('top', '2027-07-10', 'top');
    expect(suggestPriority([top], '2027-03-14')).toBe('voortop');
    expect(suggestPriority([top], '2027-09-18')).toBe('verkenning');
  });
  it('het doel met de mijlpalen telt als Top, ook zonder label', () => {
    const gr5 = existing('gr5', '2027-07-10', undefined);
    expect(suggestPriority([gr5], '2027-03-14', 'gr5')).toBe('voortop');
    expect(suggestPriority([gr5], '2027-09-18', 'gr5')).toBe('verkenning');
  });
  it('zonder datum is het Verkenning', () => {
    expect(suggestPriority([existing('top', '2027-07-10', 'top')], undefined)).toBe('verkenning');
  });
});

describe('van antwoorden naar een doel', () => {
  const base = { id: 'goal_x', now: NOW, order: 3 };

  it('een hardloopwedstrijd is een hardloopdoel met afstand en doeltijd', () => {
    const g = buildGoalDraft({ ...base, tile: 'run_race', details: { variant: '10k', targetMinutes: 55 }, date: '2027-03-14', name: '', priority: 'voortop' });
    expect(g).toMatchObject({ id: 'goal_x', kind: 'run_race', status: 'active', targetDate: '2027-03-14', priority: 'voortop', priorityChosen: true, planRole: 'secondary', order: 3, name: '10 km wedstrijd' });
    expect(g.details).toMatchObject({ variant: '10k', distanceKm: RACE_KM['10k'], targetMinutes: 55 });
    expect(isRaceGoal(g)).toBe(true);
    expect(g.requirements.find((r) => r.kind === 'targetTime')?.target?.amount).toBe(55);
  });

  it('een tocht met tent wordt trek_tent, met dagen en een etappe-uitvoering', () => {
    const g = buildGoalDraft({ ...base, tile: 'trek', details: { shelter: 'tent', days: 9, distanceKm: 120, gainM: 3000, lossM: 2800, packKg: 14 }, date: '2027-07-10', name: 'Kungsleden', priority: 'top' });
    expect(g.kind).toBe('trek_tent');
    expect(g.execution).toBe('stages');
    expect(g.planRole).toBe('secondary');
    expect(g.requirements.find((r) => r.kind === 'eventDays')?.target?.amount).toBe(9);
    expect(isRaceGoal(g)).toBe(false);
  });

  it('een tocht zonder keuze is een tocht met hutten', () => {
    expect(buildGoalDraft({ ...base, tile: 'trek', details: { days: 5 }, date: '2027-07-10', name: 'Tocht', priority: 'top' }).kind).toBe('trek_hut');
  });

  it('een trailrun is geen wedstrijdblok: de eisen zijn geen hardlopen', () => {
    const g = buildGoalDraft({ ...base, tile: 'trail', details: { variant: 'kort', distanceKm: 30, gainM: 1500, expectedMinutes: 270 }, date: '2027-09-18', name: 'Trailrun 30 km', priority: 'verkenning' });
    expect(g.kind).toBe('trail');
    expect(isRaceGoal(g)).toBe(false);
    expect(g.planRole).toBe('track');
  });

  it('zonder datum (fit blijven) is het doel gepauzeerd en zonder datum', () => {
    const g = buildGoalDraft({ ...base, tile: 'fit', details: {}, date: undefined, name: '', priority: 'verkenning' });
    expect(g.status).toBe('paused');
    expect(g.targetDate).toBeUndefined();
    expect(g.name).toBe('Fit blijven');
  });

  it('de naam Marathon blijft vrij voor het oude marathondoel', () => {
    const g = buildGoalDraft({ ...base, tile: 'run_race', details: { variant: 'marathon' }, date: '2027-04-18', name: 'Marathon', priority: 'top' });
    expect(g.name).not.toBe('Marathon');
  });

  it('ontbrekende verplichte antwoorden en een datum die niet kan', () => {
    expect(draftProblems('run_race', {}, '2027-03-14', '2026-10-26')).toEqual(['Kies een afstand.']);
    expect(draftProblems('run_race', { variant: '10k' }, undefined, '2026-10-26')).toEqual(['Kies een datum.']);
    expect(draftProblems('run_race', { variant: '10k' }, '2026-01-01', '2026-10-26')).toHaveLength(1);
    expect(draftProblems('run_race', { variant: '10k' }, '2027-03-14', '2026-10-26')).toEqual([]);
    expect(draftProblems('fit', {}, undefined, '2026-10-26')).toEqual([]);
    expect(draftProblems('trek', { days: 5 }, '2027-07-10', '2026-10-26')).toContain('Vul de afstand in.');
  });

  it('een eigen afstand vraagt om een getal en wordt de afstand van het doel', () => {
    expect(draftProblems('run_race', { variant: 'eigen' }, '2027-03-14', '2026-10-26')).toEqual(['Vul de afstand in.']);
    const g = buildGoalDraft({ ...base, tile: 'run_race', details: { variant: 'eigen', distanceKm: 15 }, date: '2027-03-14', name: '', priority: 'voortop' });
    expect(g.details?.variant).toBeUndefined();
    expect(g.details?.distanceKm).toBe(15);
    expect(g.requirements.find((r) => r.kind === 'distance')?.target?.amount).toBe(15);
  });

  it('een datum die het doel al had blijft toegestaan, ook als hij voorbij is', () => {
    expect(draftProblems('run_race', { variant: '10k' }, '2026-01-01', '2026-10-26', '2026-01-01')).toEqual([]);
  });
});

describe('aanpassen met velden die al leeg waren', () => {
  it('een verplicht veld dat al leeg was blokkeert Volgende niet', () => {
    const was = { shelter: 'hut' as const };
    expect(draftProblems('trek', { shelter: 'hut' }, '2027-07-10', '2026-10-26', undefined, was)).toEqual([]);
  });

  it('een veld dat je zelf leegmaakt blokkeert wel', () => {
    const was = { shelter: 'hut' as const, days: 5, distanceKm: 100, gainM: 5000, lossM: 5000 };
    const now = { shelter: 'hut' as const, distanceKm: 100, gainM: 5000, lossM: 5000 };
    expect(draftProblems('trek', now, '2027-07-10', '2026-10-26', undefined, was)).toContain('Vul het aantal dagen in.');
  });

  it('een veld dat leeg was maar nu iets geks krijgt, of een nieuw doel, blijft gelden', () => {
    expect(draftProblems('trek', { shelter: 'hut' }, '2027-07-10', '2026-10-26')).toContain('Vul het aantal dagen in.');
    expect(draftProblems('trek', { shelter: 'hut', days: 0 }, '2027-07-10', '2026-10-26', undefined, {})).toEqual([]);
  });
});

describe('het tempo onder de doeltijd', () => {
  it('zegt het tempo in min/km', () => {
    expect(paceText(10, 45)).toBe('Dat is een tempo van 4:30 min/km.');
    expect(paceText(21.1, 120)).toBe('Dat is een tempo van 5:41 min/km.');
  });
  it('zonder afstand of tijd niets', () => {
    expect(paceText(undefined, 45)).toBeUndefined();
    expect(paceText(10, undefined)).toBeUndefined();
    expect(paceText(0, 45)).toBeUndefined();
  });
});

describe('een bestaand doel aanpassen', () => {
  const stored = (): TrainingGoal => ({
    id: 'g1', name: 'Hardloopwedstrijd', status: 'active', targetDate: '2027-03-20', createdAt: NOW, updatedAt: NOW, kind: 'run_race', priority: 'voortop', planRole: 'secondary', conflictAccepted: ['2027-03-20|2027-07-10'], taperDays: 3, order: 1,
    details: { distanceKm: 10, variant: '10k', targetMinutes: 45 },
    requirements: [
      { id: 'r1', kind: 'distance', scope: 'SINGLE_EVENT', target: { amount: 10, unit: 'km' }, discipline: 'running' },
      { id: 'r2', kind: 'targetTime', scope: 'SINGLE_EVENT', target: { amount: 45, unit: 'min' }, discipline: 'running' },
    ],
  }) as TrainingGoal;

  it('leest de antwoorden uit het doel, met de afstand als keuze', () => {
    expect(detailsFromGoal(stored())).toMatchObject({ variant: '10k', distanceKm: 10, targetMinutes: 45 });
    expect(tileOfGoal(stored())).toBe('run_race');
    const own = { ...stored(), details: undefined, requirements: [{ id: 'r1', kind: 'distance', scope: 'SINGLE_EVENT', target: { amount: 15, unit: 'km' }, discipline: 'running' }] } as TrainingGoal;
    expect(detailsFromGoal(own)).toMatchObject({ variant: 'eigen', distanceKm: 15 });
  });

  it('de eisen worden bijgewerkt op hun plek en alles wat er verder bij hoort blijft', () => {
    const next = applyGoalEdit(stored(), { details: { variant: 'half', targetMinutes: 110 }, date: '2027-04-03', name: 'Halve in het voorjaar', now: '2027-01-01T00:00:00.000Z' });
    expect(next).toMatchObject({ id: 'g1', name: 'Halve in het voorjaar', targetDate: '2027-04-03', status: 'active', priority: 'voortop', order: 1, createdAt: NOW, updatedAt: '2027-01-01T00:00:00.000Z', conflictAccepted: ['2027-03-20|2027-07-10'], taperDays: 3 });
    expect(next.requirements.find((r) => r.id === 'r1')?.target?.amount).toBe(21.1);
    expect(next.requirements.find((r) => r.id === 'r2')?.target?.amount).toBe(110);
    expect(next.details).toMatchObject({ variant: 'half', distanceKm: 21.1, targetMinutes: 110 });
  });

  it('een leeg gemaakt veld haalt zijn eis weg, en andere eisen van het doel blijven', () => {
    const g = { ...stored(), requirements: [...stored().requirements, { id: 'r3', kind: 'consecutiveDays', scope: 'CONSECUTIVE_DAYS', target: { amount: 3, unit: 'days' } }] } as TrainingGoal;
    const next = applyGoalEdit(g, { details: { variant: '10k' }, date: '2027-03-20', name: 'x', now: NOW });
    expect(next.requirements.map((r) => r.id)).toEqual(['r1', 'r3']);
  });

  it('een tocht wisselt van hut naar tent en houdt zijn dagen en rugzak bij', () => {
    const trek = { id: 't', name: 'Tocht', status: 'active', targetDate: '2027-07-10', createdAt: NOW, updatedAt: NOW, kind: 'trek_hut', requirements: [
      { id: 'a', kind: 'eventDays', scope: 'TOTAL_EVENT', target: { amount: 9, unit: 'days' } }, { id: 'b', kind: 'packWeight', scope: 'SINGLE_EVENT', target: { amount: 10, unit: 'kg' } },
    ] } as TrainingGoal;
    expect(detailsFromGoal(trek)).toMatchObject({ days: 9, packKg: 10, shelter: 'hut' });
    const next = applyGoalEdit(trek, { details: { ...detailsFromGoal(trek), shelter: 'tent', packKg: 14 }, date: '2027-07-10', name: 'Tocht', now: NOW });
    expect(next.kind).toBe('trek_tent');
    expect(next.requirements.find((r) => r.id === 'b')?.target?.amount).toBe(14);
    expect(next.requirements.find((r) => r.id === 'a')?.target?.amount).toBe(9);
  });

  it('de keuze Slapen heet duidelijk en staat standaard op hutten', () => {
    const q = questionsFor('trek').find((x) => x.key === 'shelter');
    expect(q).toMatchObject({ label: 'Slapen', required: true });
    expect(q?.choices).toEqual([{ value: 'hut', label: 'In hutten' }, { value: 'tent', label: 'Met tent' }]);
    expect(defaultDetails('trek')).toEqual({ shelter: 'hut' });
    expect(defaultDetails('run_race')).toEqual({});
  });

  it('een bestaand GR5-doel gaat van hutten naar tent zonder datum, mijlpalen of andere gegevens te verliezen', () => {
    const gr5 = {
      id: 'gr5', name: 'GR5', status: 'active', targetDate: '2027-07-01', createdAt: NOW, updatedAt: NOW, kind: 'trek_hut', priority: 'top', execution: 'stages', planRole: 'main',
      details: { shelter: 'hut', distanceKm: 600, gainM: 30000, lossM: 28000, days: 30, packKg: 14, homeDaysInRow: 2 },
      requirements: [
        { id: 'd', kind: 'distance', scope: 'TOTAL_EVENT', target: { amount: 600, unit: 'km' }, discipline: 'hiking' },
        { id: 'g', kind: 'elevationGain', scope: 'TOTAL_EVENT', target: { amount: 30000, unit: 'm' } },
        { id: 'l', kind: 'elevationLoss', scope: 'TOTAL_EVENT', target: { amount: 28000, unit: 'm' } },
        { id: 'e', kind: 'eventDays', scope: 'TOTAL_EVENT', target: { amount: 30, unit: 'days' }, discipline: 'hiking' },
        { id: 'p', kind: 'packWeight', scope: 'SINGLE_EVENT', target: { amount: 14, unit: 'kg' } },
        { id: 'c', kind: 'consecutiveDays', scope: 'CONSECUTIVE_DAYS', target: { amount: 6, unit: 'days' } },
      ],
    } as TrainingGoal;
    const form = { ...detailsFromGoal(gr5), shelter: 'tent' as const };
    expect(detailsFromGoal(gr5).shelter).toBe('hut');
    const next = applyGoalEdit(gr5, { details: form, date: gr5.targetDate, name: gr5.name, now: '2027-01-01T00:00:00.000Z' });
    expect(next.kind).toBe('trek_tent');
    expect(next.details?.shelter).toBe('tent');
    // Wat er niet verandert, blijft: id (de mijlpalen hangen eraan), datum, label, rol, uitvoering en elke eis.
    expect(next).toMatchObject({ id: 'gr5', targetDate: '2027-07-01', status: 'active', priority: 'top', planRole: 'main', execution: 'stages', name: 'GR5', createdAt: NOW });
    expect(next.requirements).toEqual(gr5.requirements);
    expect(next.details).toMatchObject({ distanceKm: 600, gainM: 30000, lossM: 28000, days: 30, packKg: 14, homeDaysInRow: 2 });
    // En terug naar hutten kan.
    const back = applyGoalEdit(next, { details: { ...detailsFromGoal(next), shelter: 'hut' }, date: next.targetDate, name: next.name, now: NOW });
    expect(back.kind).toBe('trek_hut');
  });

  it('een naam die leeg is blijft de oude, en Marathon blijft Marathon', () => {
    expect(applyGoalEdit(stored(), { details: detailsFromGoal(stored()), date: '2027-03-20', name: '  ', now: NOW }).name).toBe('Hardloopwedstrijd');
    const m = { ...stored(), name: 'Marathon' } as TrainingGoal;
    expect(applyGoalEdit(m, { details: { variant: 'marathon' }, date: '2027-04-18', name: 'Marathon', now: NOW }).name).toBe('Marathon');
  });
});
