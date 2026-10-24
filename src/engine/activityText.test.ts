import { describe, it, expect } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { addDays } from '../utils/dates';
import type { PlannedSession, SessionLog } from '../models/training';
import { activityText, minutesText, spanText } from './activityText';

const { templates, program } = buildDefaultProgramData();
const tpl = (id: string) => templates.find((t) => t.id === id)!;
// Een nagemaakte dag: de tweede week van het programma.
const day = addDays(program.startDate, 8);

const log = (templateId: string, over: Partial<SessionLog> = {}): SessionLog => ({
  id: `log_${templateId}`,
  templateId,
  type: tpl(templateId).type,
  completedDate: day,
  completedAt: `${day}T10:00:00.000Z`,
  variant: 'full',
  durationMinutes: 45,
  source: 'manual',
  ...over,
});
const planned = (templateId: string): PlannedSession => ({ id: `ps_${templateId}`, templateId, scheduledDate: day, weekStartDate: program.startDate, status: 'planned', order: 0 });
const text = (templateId: string, over: Partial<SessionLog> = {}) => activityText({ log: log(templateId, over), template: tpl(templateId), planned: planned(templateId), program });

describe('de stukjes', () => {
  it('schrijft korte tijden in seconden en lange in minuten', () => {
    expect(spanText(20)).toBe('20 sec');
    expect(spanText(60)).toBe('1 min');
    expect(spanText(90)).toBe('90 sec');
    expect(spanText(180)).toBe('3 min');
    expect(spanText(150)).toBe('2 min 30 sec');
    expect(minutesText(52)).toBe('52 min');
    expect(minutesText(75)).toBe('75 min');
    expect(minutesText(150)).toBe('2 u 30 min');
    expect(minutesText(120)).toBe('2 u');
  });
});

describe('activityText', () => {
  it('heuvelsprints: het aantal uit de progressie, daaronder de gemeten getallen', () => {
    const result = text('tpl_hills_descent', {
      durationMinutes: 52,
      outdoorData: { durationMinutes: 52, distanceKm: 7.2, elevationGainM: 140, source: 'garmin' },
    });
    const [first, second] = result.split('\n');
    expect(first).toMatch(/^Heuvelsprints en afdalen: (\d+)× hard bergop, \1× rustig op en beheerst af\.$/);
    expect(second).toBe('7,2 km · 52 min · 140 m stijgen');
  });

  it('het aantal van de log gaat voor op dat van de progressie', () => {
    const result = text('tpl_hills_descent', { workout: { reps: 4 } });
    expect(result.split('\n')[0]).toBe('Heuvelsprints en afdalen: 4× hard bergop, 4× rustig op en beheerst af.');
  });

  it('intervallen: herhalingen, harde en rustige tijd uit de progressie', () => {
    const result = text('tpl_intervals', { durationMinutes: 50 });
    expect(result.split('\n')[0]).toMatch(/^Intervallen: \d+× 4 min hard, 3 min rustig\.$/);
    expect(text('tpl_intervals', { workout: { reps: 6, repSeconds: 180 } }).split('\n')[0]).toBe('Intervallen: 6× 3 min hard, 3 min rustig.');
  });

  it('fartlek en heuvelintervallen noemen de korte tijden', () => {
    expect(text('tpl_fartlek', { workout: { reps: 6 } }).split('\n')[0]).toBe('Fartlek: 6× 1 min hard, 90 sec rustig.');
    expect(text('tpl_hill_intervals', { workout: { reps: 5 } }).split('\n')[0]).toBe('Heuvelintervallen: 5× 1 min hard bergop.');
  });

  it('duurloop met versnellingen en progressieve duurloop', () => {
    expect(text('tpl_strides_run', { durationMinutes: 35, workout: { reps: 6 } })).toBe('Duurloop met versnellingen: 35 min rustig met 6× 20 sec versnellen.');
    expect(text('tpl_progression_run', { durationMinutes: 50, workout: { blockMinutes: 10 } })).toBe('Progressieve duurloop: 50 min rustig, de laatste 10 min stevig.');
  });

  it('een doorlopende loop noemt de tijd en dan alleen wat erbij kwam', () => {
    expect(text('tpl_long_run', { durationMinutes: 75 })).toBe('Lange duurloop: 75 min rustig.');
    const withNumbers = text('tpl_long_run', {
      durationMinutes: 75,
      cardioData: { durationMinutes: 75, distanceKm: 11.6, elevationGainM: 90, source: 'garmin' },
    });
    expect(withNumbers).toBe('Lange duurloop: 75 min rustig.\n11,6 km · 90 m stijgen');
  });

  it('rugzakwandeling: afstand met het gewicht van de log', () => {
    const result = text('tpl_ruck_walk', {
      durationMinutes: 150,
      outdoorData: { durationMinutes: 150, distanceKm: 12, elevationGainM: 210, backpackWeightKg: 9, source: 'garmin' },
    });
    expect(result).toBe('Rugzakwandeling: 12 km met 9 kg.\n2 u 30 min · 210 m stijgen');
  });

  it('rugzakwandeling zonder afstand: de tijd, en het gewicht uit de rugzakladder', () => {
    const first = text('tpl_ruck_walk', { durationMinutes: 90 }).split('\n')[0];
    expect(first).toMatch(/^Rugzakwandeling: 90 min met [\d,]+ kg\.$/);
  });

  it('een geschatte stijging (loopband) wordt niet als gemeten getal genoemd', () => {
    const result = text('tpl_bergconditie', { durationMinutes: 41, cardioData: { durationMinutes: 41, distanceKm: 4, elevationGainM: 200, estimatedElevation: true, source: 'manual' } });
    expect(result).toBe('Bergop wandelen: 41 min.\n4 km');
  });

  it('kracht: de naam en het aantal oefeningen en sets, zonder opwarmsets', () => {
    const result = text('tpl_upper_a', {
      durationMinutes: 58,
      strengthData: [
        { exerciseId: 'a', exerciseName: 'Bench Press', sets: [{ reps: 5, kind: 'warmup' }, { reps: 8 }, { reps: 8 }, { reps: 7 }] },
        { exerciseId: 'b', exerciseName: 'Seated Cable Row', sets: [{ reps: 10 }, { reps: 10 }] },
      ],
    });
    expect(result).toBe('Bovenlichaam A: 2 oefeningen, 5 sets.\n58 min');
  });

  it('kracht zonder sets: alleen de naam en de tijd', () => {
    expect(text('tpl_lower_a', { durationMinutes: 40 })).toBe('Benen A (zwaar).\n40 min');
  });

  it('zonder sjabloon staat er Training, en zonder getallen één regel', () => {
    const result = activityText({ log: log('tpl_easy_run', { templateId: 'weg', durationMinutes: 0 }) });
    expect(result).toBe('Training.');
  });

  it('gebruikt nooit een gedachtestreep en houdt het bij twee regels', () => {
    for (const t of templates) {
      const result = text(t.id, { outdoorData: { durationMinutes: 45, distanceKm: 5, elevationGainM: 50, source: 'garmin' } });
      expect(result).not.toMatch(/[–—]/);
      expect(result.split('\n').length).toBeLessThanOrEqual(2);
    }
  });
});
