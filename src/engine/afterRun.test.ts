import { describe, expect, it, vi } from 'vitest';
import type { SessionLog } from '../models/training';
import type { AutoLogged } from './autoTick';
import { arrangeYourDay, type YourDayItem } from './yourDay';
import {
  AFTER_RUN_QUESTIONS_DEFAULT,
  afterRunFacts,
  afterRunHas,
  afterRunMoreLine,
  afterRunSaveLabel,
  afterRunSteps,
  afterRunTitle,
  attemptWithin,
  availableFields,
  openAfterRunQuestion,
  resolveAfterRunQuestions,
  withoutAskedTraining,
} from './afterRun';

// Spoor 6: Hoe ging het? na een training van je horloge. Alles nagemaakt.
const DAY = '2026-11-14';
const day = (iso: string) => (iso === DAY ? 'vandaag' : `dag ${iso}`);
function log(id: string, extra: Partial<SessionLog> = {}): SessionLog {
  return { id, templateId: 'tpl_long_run', type: 'cardio', completedDate: DAY, completedAt: `${DAY}T08:10:00.000Z`, variant: 'custom', durationMinutes: 76, source: 'garmin', externalId: `test:${id}`, plannedSessionId: 'p1', ...extra };
}
const asked = (id: string, at = `${DAY}T09:00:00.000Z`): AutoLogged => ({ externalId: `test:${id}`, logId: id, at, status: 'asking' });
const NOW = new Date(`${DAY}T10:00:00.000Z`);
const allHas = afterRunHas({ templateType: 'cardio', pain: true, sweat: true, trim: true, strava: true });

describe('de instelling Vragen na je loop', () => {
  it('Kort is het advies; een onbekende waarde uit een back-up leest als Kort', () => {
    expect(AFTER_RUN_QUESTIONS_DEFAULT).toBe('short');
    expect(resolveAfterRunQuestions(undefined)).toBe('short');
    expect(resolveAfterRunQuestions('alles')).toBe('short');
    expect(resolveAfterRunQuestions('all')).toBe('all');
  });

  it('Kort: gevoel, pijn en zwaarte voorop, de rest achter Meer (de zwaarte blijft, zie besluit vraag 2)', () => {
    expect(afterRunSteps('short')).toEqual({ first: ['feel', 'pain', 'rpe'], more: ['sweat', 'trim', 'strava'] });
  });

  it('Alles: alles in één stap, geen Meer', () => {
    expect(afterRunSteps('all')).toEqual({ first: ['feel', 'pain', 'rpe', 'sweat', 'trim', 'strava'], more: [] });
  });

  it('de volgorde is die van zelf invullen (regel 7): gevoel, pijn, zwaarte', () => {
    const first = afterRunSteps('short').first;
    expect(first.indexOf('feel')).toBeLessThan(first.indexOf('pain'));
    expect(first.indexOf('pain')).toBeLessThan(first.indexOf('rpe'));
  });
});

describe('wat er per training te vragen valt', () => {
  it('loop buiten: alles', () => {
    expect(availableFields(afterRunSteps('all').first, allHas)).toEqual(['feel', 'pain', 'rpe', 'sweat', 'trim', 'strava']);
  });

  it('fiets binnen zonder weging en zonder inkorten: Meer noemt alleen Strava', () => {
    const has = afterRunHas({ templateType: 'cardio', pain: true, sweat: false, trim: false, strava: true });
    const more = availableFields(afterRunSteps('short').more, has);
    expect(more).toEqual(['strava']);
    expect(afterRunMoreLine(more)).toBe('Tekst voor Strava');
  });

  it('rustdag: geen gevoel, pijn of zwaarte, zoals bij zelf invullen', () => {
    const has = afterRunHas({ templateType: 'recovery', pain: true, sweat: false, trim: false, strava: false });
    expect(availableFields(afterRunSteps('short').first, has)).toEqual([]);
    expect(availableFields(afterRunSteps('short').more, has)).toEqual([]);
  });

  it('kracht die niet zwaar is voor de benen: geen pijnvraag', () => {
    const has = afterRunHas({ templateType: 'strength', pain: false, sweat: false, trim: false, strava: true });
    expect(availableFields(afterRunSteps('short').first, has)).toEqual(['feel', 'rpe']);
  });

  it('de regel onder Meer noemt alleen wat er is, in de vaste volgorde', () => {
    expect(afterRunMoreLine(['sweat', 'trim', 'strava'])).toBe('Gewicht na, inkorten, tekst voor Strava');
    expect(afterRunMoreLine(['trim'])).toBe('Inkorten');
  });
});

describe('de regel met feiten', () => {
  it('loop buiten: minuten, km op een decimaal, hoogtemeters heel', () => {
    expect(afterRunFacts(log('a', { outdoorData: { source: 'garmin', distanceKm: 11.437, elevationGainM: 309.6 } as SessionLog['outdoorData'] }), day)).toBe('76 min, 11,4 km, +310 m, vandaag');
  });

  it('loopband: afstand zonder hoogtemeters', () => {
    expect(afterRunFacts(log('a', { durationMinutes: 40, cardioData: { distanceKm: 8 } as SessionLog['cardioData'] }), day)).toBe('40 min, 8 km, vandaag');
  });

  it('fiets binnen zonder afstand: alleen de minuten en de dag', () => {
    expect(afterRunFacts(log('a', { durationMinutes: 45, templateId: 'tpl_bike' }), day)).toBe('45 min, vandaag');
  });

  it('een log bewaart minuten: geen seconden of decimalen in de regel', () => {
    expect(afterRunFacts(log('a', { durationMinutes: 52 }), day)).toBe('52 min, vandaag');
    expect(afterRunFacts(log('a', { durationMinutes: 52.4 }), day)).toBe('52 min, vandaag');
  });

  it('minder dan 1 m stijging staat er niet; een dag eerder heet bij naam', () => {
    expect(afterRunFacts(log('a', { completedDate: '2026-11-13', outdoorData: { source: 'garmin', elevationGainM: 0.4 } as SessionLog['outdoorData'] }), day)).toBe('76 min, dag 2026-11-13');
  });
});

describe('de rij in Je dag', () => {
  it('de titel zegt dat de app afvinkte', () => {
    expect(afterRunTitle('Lange duurloop')).toBe('Lange duurloop is afgevinkt');
    expect(afterRunTitle(undefined)).toBe('Training afgevinkt');
  });

  it('Opslaan met een antwoord, Klaar zonder', () => {
    expect(afterRunSaveLabel(true)).toBe('Opslaan');
    expect(afterRunSaveLabel(false)).toBe('Klaar');
  });

  it('de training van de vraag staat niet nog eens als gedaan; een tweede training blijft', () => {
    const sessions = [{ id: 'p1' }, { id: 'p2' }];
    expect(withoutAskedTraining(sessions, 'p1')).toEqual([{ id: 'p2' }]);
    expect(withoutAskedTraining(sessions, undefined)).toEqual(sessions);
  });

  it('bovenaan Je dag, en nooit achter Nog, ook met een pijnplekvraag en vier andere rijen', () => {
    const item = (kind: YourDayItem['kind'], word: string, extra: Partial<YourDayItem> = {}): YourDayItem => ({ key: word, kind, word, done: false, ...extra });
    const { shown, more } = arrangeYourDay([
      item('training', 'mobiliteit'), item('stretch', 'rekken'), item('weight', 'gewicht'), item('journey', 'reis'),
      item('checkin', 'pijnplek', { pain: true }), item('watch', 'hoe ging het'),
    ]);
    expect(shown[0].kind).toBe('watch');
    expect(shown.map((i) => i.word)).toContain('pijnplek');
    expect(more.map((i) => i.kind)).not.toContain('watch');
    expect(shown).toHaveLength(3);
  });
});

describe('welke vraag er open is', () => {
  const state = (autoLogged: AutoLogged[], activities = true) => ({ use: { activities }, autoLogged });

  it('zonder horloge-koppeling: geen vraag, geen rij', () => {
    expect(openAfterRunQuestion(null, [log('a')], NOW)).toBeUndefined();
    expect(openAfterRunQuestion(state([]), [log('a')], NOW)).toBeUndefined();
  });

  it('trainingen van je horloge uitgezet: geen vraag', () => {
    expect(openAfterRunQuestion(state([asked('a')], false), [log('a')], NOW)).toBeUndefined();
  });

  it('de nieuwste open vraag; ouder dan 72 uur niet meer', () => {
    const logs = [log('a'), log('b', { completedDate: '2026-11-10' })];
    expect(openAfterRunQuestion(state([asked('b', '2026-11-10T09:00:00.000Z'), asked('a')]), logs, NOW)?.log.id).toBe('a');
    expect(openAfterRunQuestion(state([asked('b', '2026-11-10T09:00:00.000Z')]), logs, NOW)).toBeUndefined();
  });

  it('een beantwoorde vraag of een log dat weg is: geen rij', () => {
    expect(openAfterRunQuestion(state([{ ...asked('a'), status: 'done' }]), [log('a')], NOW)).toBeUndefined();
    expect(openAfterRunQuestion(state([asked('a')]), [], NOW)).toBeUndefined();
  });
});

describe('opslaan met een grens in tijd', () => {
  it('gelukt: ja, en geen melding dat het lang duurt', async () => {
    const slow = vi.fn();
    expect(await attemptWithin(async () => undefined, slow, 50)).toBe(true);
    expect(slow).not.toHaveBeenCalled();
  });

  it('offline of de opslag weigert: nee, het blad blijft open met je antwoord', async () => {
    expect(await attemptWithin(async () => { throw new Error('opslag weigert'); }, () => undefined, 50)).toBe(false);
  });

  it('na de grens meldt hij dat het lang duurt, en de uitkomst blijft die van het opslaan zelf', async () => {
    vi.useFakeTimers();
    try {
      const slow = vi.fn();
      let finish!: () => void;
      const done = attemptWithin(() => new Promise<void>((r) => { finish = r; }), slow, 10_000);
      await vi.advanceTimersByTimeAsync(10_000);
      expect(slow).toHaveBeenCalledOnce();
      finish();
      expect(await done).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
