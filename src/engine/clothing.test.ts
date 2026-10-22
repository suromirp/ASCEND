import { describe, expect, it } from 'vitest';
import type { SessionTemplate } from '../models/training';
import type { WeatherForecast } from '../models/weather';
import { clothingAdvice, clothingForTraining, clothingKind, isHeatSession, type ClothingInput } from './clothing';

const base: ClothingInput = { kind: 'easy_run', minutes: 60, feelsC: 15, windKmh: 10, gustKmh: 15, precipMm: 0, dark: false };
const advise = (over: Partial<ClothingInput>) => clothingAdvice({ ...base, ...over });
const text = (over: Partial<ClothingInput>) => advise(over).lines.join(' ').toLowerCase();

describe('de zeven testgevallen uit het rapport', () => {
  it('1. rustige duurloop, voelt als 3, droog, 40 minuten: lange tight, thermoshirt, dunne handschoenen, koel begin', () => {
    const a = advise({ kind: 'easy_run', feelsC: 3, minutes: 40 });
    const t = a.lines.join(' ').toLowerCase();
    expect(t).toContain('thermoshirt met lange mouwen');
    expect(t).toContain('lange tight');
    expect(t).toContain('dunne handschoenen');
    expect(t).not.toContain('oorband');
    expect(t).toContain('de eerste tien minuten voel je het koel');
    expect(a.packLine).toBeUndefined();
  });

  it('2. intervallen, voelt als 8, droog, 60 minuten: korte mouwen en korte broek, opwarmen met een jack', () => {
    const t = text({ kind: 'intervals', feelsC: 8, minutes: 60 });
    expect(t).toContain('shirt met korte mouwen');
    expect(t).toContain('korte broek');
    expect(t).not.toContain('handschoenen');
    expect(t).toContain('warm op met een jack aan');
  });

  it('3. fietsen, voelt als 6, droog, 60 minuten: thermoshirt, lange broek, dunne handschoenen, geen overschoenen', () => {
    const t = text({ kind: 'bike', feelsC: 6, minutes: 60 });
    expect(t).toContain('thermoshirt');
    expect(t).toContain('lange broek');
    expect(t).toContain('dunne handschoenen');
    expect(t).not.toContain('overschoenen');
  });

  it('4. bergtocht, voelt als 2, sneeuw, wind 30, 6 uur: windjack, oorband en handschoenen, en een rugzakzin', () => {
    const a = advise({ kind: 'mountain', feelsC: 2, minutes: 360, snow: true, windKmh: 30, gustKmh: 40 });
    const t = a.lines.join(' ').toLowerCase();
    expect(t).toContain('windjack');
    expect(t).toContain('dunne handschoenen');
    expect(t).toContain('oorband');
    expect(t).toContain('waterdichte schoenen');
    expect(a.lines.length).toBeLessThanOrEqual(4);
    for (const item of ['warme laag', 'muts', 'handschoenen', 'droog shirt', 'regenjas', 'zonnebril', 'gamaschen']) {
      expect(a.packLine).toContain(item);
    }
    expect(a.packLine).toContain('Boven is het kouder');
  });

  it('5. rustdagwandeling, voelt als 12, 40 procent kans op een bui, 45 minuten: dun lang shirt en een regenjack mee', () => {
    const t = text({ kind: 'rest_walk', feelsC: 12, precipProb: 40, minutes: 45 });
    expect(t).toContain('dun shirt met lange mouwen');
    expect(t).toContain('regenjack mee');
    expect(t).not.toContain('tight');
  });

  it('6. hardlopen na zonsondergang, voelt als 14, droog: korte mouwen, korte broek en een lampje', () => {
    const t = text({ kind: 'easy_run', feelsC: 14, dark: true });
    expect(t).toContain('shirt met korte mouwen');
    expect(t).toContain('korte broek');
    expect(t).toContain('lampje');
    expect(t).toContain('reflecterends');
    expect(t).not.toContain('de eerste tien minuten');
  });

  it('7. hardlopen, voelt als 24, uv-index 6, 60 minuten: luchtig shirt, zonnebrand, pet en water mee', () => {
    const t = text({ kind: 'easy_run', feelsC: 24, uvIndex: 6, minutes: 60 });
    expect(t).toContain('luchtig shirt');
    expect(t).toContain('zonnebrand');
    expect(t).toContain('pet');
    expect(t).toContain('water mee');
  });
});

describe('de vaste volgorde en de afvalregel', () => {
  it('zet romp, handen en hoofd, buitenlaag, zon of donker in die volgorde, hooguit vier regels', () => {
    const a = advise({ kind: 'easy_run', feelsC: 2, windKmh: 30, gustKmh: 45, dark: true });
    expect(a.lines).toHaveLength(4);
    expect(a.lines[0].toLowerCase()).toContain('thermoshirt');
    expect(a.lines[1].toLowerCase()).toContain('handschoenen');
    expect(a.lines[2].toLowerCase()).toContain('windjack');
    expect(a.lines[3].toLowerCase()).toContain('hoofdlamp');
  });

  it('laat bij te veel regels eerst de zon vallen, dan het hoofd, nooit de romp', () => {
    // fietsen in het donker bij vorst met regen: romp, handen en hoofd, regen, voeten, donker is vijf
    const five = advise({ kind: 'bike', feelsC: -2, precipMm: 2, dark: true, minutes: 60 });
    expect(five.lines.length).toBeLessThanOrEqual(4);
    expect(five.lines[0].toLowerCase()).toContain('thermoshirt');
    expect(five.lines.join(' ').toLowerCase()).toContain('licht voor en achter');
    // zon en donker tegelijk kan met een tocht in het donker bij uv: zon valt eerst
    const sunAndDark = advise({ kind: 'mountain', feelsC: -2, snow: true, precipMm: 1, uvIndex: 4, dark: true, minutes: 300 });
    expect(sunAndDark.lines.length).toBeLessThanOrEqual(4);
    expect(sunAndDark.lines[0].toLowerCase()).toContain('thermoshirt');
    expect(sunAndDark.lines.join(' ').toLowerCase()).not.toContain('zonnebril');
  });

  it('vraagt onder min 5 gevoel om blote huid te bedekken', () => {
    expect(text({ kind: 'easy_run', feelsC: -8 })).toContain('bedek blote huid');
    expect(text({ kind: 'easy_run', feelsC: 0 })).not.toContain('bedek blote huid');
  });

  it('geeft op een aangename dag één regel', () => {
    expect(advise({ kind: 'long_run', feelsC: 12, minutes: 90 }).lines).toEqual(['Shirt en korte broek, meer is niet nodig.']);
  });
});

describe('wind, regen en zon', () => {
  it('geeft een dun windjack bij wind van 25 of vlagen van 40 en T onder 16', () => {
    expect(text({ kind: 'easy_run', feelsC: 3, windKmh: 25 })).toContain('windjack');
    expect(text({ kind: 'easy_run', feelsC: 3, gustKmh: 40 })).toContain('windjack');
    expect(text({ kind: 'easy_run', feelsC: 3, windKmh: 24, gustKmh: 39 })).not.toContain('windjack');
  });

  it('laat het windjack weg bij intervallen met T boven 8', () => {
    expect(text({ kind: 'intervals', feelsC: 4, windKmh: 30 })).not.toContain('windjack');
  });

  it('zet bij wandelen het windjack in de rugzak als het warm genoeg is', () => {
    expect(text({ kind: 'ruck_walk', feelsC: 14, windKmh: 30 })).toContain('windjack in de rugzak');
  });

  it('kleedt bij regen een loper warm genoeg anders dan een wandelaar', () => {
    expect(text({ kind: 'easy_run', feelsC: 8, precipMm: 2 })).toContain('waterafstotend jack');
    expect(text({ kind: 'easy_run', feelsC: 16, precipMm: 2 })).toContain('pet met klep');
    expect(text({ kind: 'ruck_walk', feelsC: 12, precipMm: 2 })).toContain('regenjas aan');
  });

  it('telt een kans van 60 procent als regen en 30 tot 60 als een bui', () => {
    expect(text({ kind: 'ruck_walk', feelsC: 12, precipProb: 60 })).toContain('regenjas aan');
    expect(text({ kind: 'ruck_walk', feelsC: 12, precipProb: 45 })).toContain('regenjas in de rugzak');
    expect(text({ kind: 'ruck_walk', feelsC: 12, precipProb: 20 })).not.toContain('regenjas');
  });

  it('noemt iets droogs voor na afloop bij regen, kou en meer dan een uur', () => {
    expect(text({ kind: 'ruck_walk', feelsC: 4, precipMm: 3, minutes: 90 })).toContain('iets droogs');
    expect(text({ kind: 'ruck_walk', feelsC: 4, precipMm: 3, minutes: 50 })).not.toContain('iets droogs');
    expect(text({ kind: 'ruck_walk', feelsC: 10, precipMm: 3, minutes: 90 })).not.toContain('iets droogs');
  });

  it('geeft een fietser bij lange regen een regenbroek of overschoenen', () => {
    expect(text({ kind: 'bike', feelsC: 12, precipMm: 3, minutes: 60 })).toContain('regenbroek');
    expect(text({ kind: 'bike', feelsC: 12, precipMm: 3, minutes: 30 })).not.toContain('regenbroek');
  });

  it('geeft overschoenen bij fietsen onder 4 gevoel', () => {
    expect(text({ kind: 'bike', feelsC: 3 })).toContain('overschoenen');
  });

  it('vraagt zonnebrand pas bij uv 3 en 45 minuten', () => {
    expect(text({ kind: 'easy_run', feelsC: 15, uvIndex: 3, minutes: 45 })).toContain('zonnebrand');
    expect(text({ kind: 'easy_run', feelsC: 15, uvIndex: 3, minutes: 30 })).not.toContain('zonnebrand');
    expect(text({ kind: 'easy_run', feelsC: 15, uvIndex: 2, minutes: 60 })).not.toContain('zonnebrand');
  });

  it('geeft een bergtocht met sneeuw altijd een zonnebril', () => {
    expect(text({ kind: 'mountain', feelsC: 0, snow: true, uvIndex: 1 })).toContain('zonnebril');
  });
});

describe('donker', () => {
  it('geeft een fietser licht voor en achter, een loper een lampje en een tocht een hoofdlamp met reserve', () => {
    expect(text({ kind: 'bike', feelsC: 14, dark: true })).toContain('licht voor en achter');
    expect(text({ kind: 'easy_run', feelsC: 14, dark: true })).toContain('lampje');
    expect(text({ kind: 'mountain', feelsC: 14, dark: true })).toContain('reservebatterij');
  });
});

describe('de rugzakzin', () => {
  it('komt alleen bij een lange wandeling met rugzak of een bergtocht', () => {
    expect(advise({ kind: 'ruck_walk', feelsC: 8, minutes: 120 }).packLine).toContain('warme laag');
    expect(advise({ kind: 'ruck_walk', feelsC: 8, minutes: 90 }).packLine).toBeUndefined();
    expect(advise({ kind: 'easy_run', feelsC: 8, minutes: 200 }).packLine).toBeUndefined();
  });

  it('volgt de drempels 14, 10 en 6', () => {
    const at = (feelsC: number) => advise({ kind: 'ruck_walk', feelsC, minutes: 180 }).packLine ?? '';
    expect(at(20)).toBe('');
    expect(at(13)).toContain('warme laag');
    expect(at(13)).not.toContain('droog shirt');
    expect(at(9)).toContain('droog shirt');
    expect(at(9)).not.toContain('muts');
    expect(at(5)).toContain('muts, handschoenen');
  });

  it('noemt bij een bergtocht altijd de warme laag, het windjack, de regenjas en de zonnebril', () => {
    const p = advise({ kind: 'mountain', feelsC: 20, minutes: 360 }).packLine ?? '';
    for (const item of ['warme laag', 'windjack', 'regenjas', 'zonnebril']) expect(p).toContain(item);
  });
});

describe('hittegewenning', () => {
  it('krijgt geen advies om luchtiger te gaan', () => {
    const t = text({ kind: 'easy_run', feelsC: 28, uvIndex: 7, heatSession: true });
    expect(t).not.toContain('luchtig');
    expect(t).not.toContain('singlet');
    expect(t).not.toContain('korte broek');
    expect(t).toContain('bewust warm');
  });

  it('herkent een hittesessie aan id of naam', () => {
    expect(isHeatSession({ id: 'tpl_heat_block', name: 'Training' })).toBe(true);
    expect(isHeatSession({ id: 'x', name: 'Hittegewenning, loop met extra kleding' })).toBe(true);
    expect(isHeatSession({ id: 'tpl_easy_run', name: 'Rustige duurloop' })).toBe(false);
  });
});

describe('je eigen bijstelling', () => {
  it('maakt het lichter als je warm loopt en zwaarder als je het koud hebt', () => {
    expect(text({ kind: 'easy_run', feelsC: 3 })).toContain('thermoshirt met lange mouwen');
    expect(text({ kind: 'easy_run', feelsC: 3, adjustC: 2 })).toContain('dun shirt met lange mouwen');
    expect(text({ kind: 'easy_run', feelsC: 1, adjustC: -4 })).toContain('dun vest of fleece');
  });
});

describe('taal', () => {
  it('bevat geen gedachtestreepjes', () => {
    const all = [
      advise({ kind: 'mountain', feelsC: -8, snow: true, windKmh: 40, precipMm: 2, dark: true, uvIndex: 5, minutes: 400 }),
      advise({ kind: 'bike', feelsC: 1, precipMm: 2, dark: true }),
      advise({ kind: 'intervals', feelsC: 5, heatSession: true }),
    ];
    for (const a of all) expect([...a.lines, a.packLine ?? ''].join(' ')).not.toMatch(/[\u2013\u2014]/);
  });
});

// --- van training naar advies ---------------------------------------------------

const template = (over: Partial<SessionTemplate>): SessionTemplate => ({ id: 'tpl_easy_run', name: 'Rustige duurloop', type: 'cardio', durationVariants: { full: 40 }, ...over });

function forecast(over: { feelsC?: number; code?: number; uv?: number } = {}): WeatherForecast {
  const hours = Array.from({ length: 24 }, (_, h) => ({
    time: `2026-11-03T${String(h).padStart(2, '0')}:00`,
    tempC: 8,
    feelsC: over.feelsC ?? 3,
    precipMm: 0,
    precipProb: 5,
    windKmh: 10,
    gustKmh: 15,
    code: over.code ?? 0,
    uvIndex: over.uv ?? 0,
  }));
  return { fetchedAt: '2026-11-03T08:00:00.000Z', place: { name: 'Teststad', lat: 52, lon: 5 }, hours, days: [{ date: '2026-11-03', sunrise: '2026-11-03T07:20', sunset: '2026-11-03T16:50' }] };
}

describe('clothingKind en clothingForTraining', () => {
  it('geeft kracht en herstel geen advies', () => {
    expect(clothingKind(template({ id: 'tpl_upper_a', type: 'strength' }))).toBeUndefined();
    expect(clothingKind(template({ id: 'tpl_herstel', type: 'recovery' }))).toBeUndefined();
    const r = clothingForTraining({ forecast: forecast(), template: template({ id: 'tpl_upper_a', type: 'strength' }), logs: [], date: '2026-11-03', durationMinutes: 45 });
    expect(r).toBeUndefined();
  });

  it('geeft zonder weergegevens geen advies', () => {
    expect(clothingForTraining({ forecast: undefined, template: template({}), logs: [], date: '2026-11-03', durationMinutes: 40 })).toBeUndefined();
    // een dag buiten de verwachting
    expect(clothingForTraining({ forecast: forecast(), template: template({}), logs: [], date: '2026-12-25', durationMinutes: 40 })).toBeUndefined();
  });

  it('kent het soort training van de eigen templates en valt voor andere terug op de sport', () => {
    expect(clothingKind(template({ id: 'tpl_intervals' }))).toBe('intervals');
    expect(clothingKind(template({ id: 'tpl_mountain_hike', type: 'hiking', sport: 'hiking' }))).toBe('mountain');
    expect(clothingKind(template({ id: 'eigen', type: 'cardio', sport: 'cycling' }))).toBe('bike');
    expect(clothingKind(template({ id: 'eigen', type: 'hiking' }))).toBe('ruck_walk');
  });

  it('maakt van een koude dag een advies met wat je aantrekt, en neemt de zonsondergang mee', () => {
    // 18.00 op een werkdag, 40 minuten: klaar om 18.40, de zon was om 16.50 onder
    const a = clothingForTraining({ forecast: forecast(), template: template({}), logs: [], date: '2026-11-03', durationMinutes: 40 });
    expect(a).toBeDefined();
    const t = a!.lines.join(' ').toLowerCase();
    expect(t).toContain('thermoshirt');
    expect(t).toContain('lampje');
  });

  it('geeft een hittesessie geen luchtiger advies', () => {
    const a = clothingForTraining({ forecast: forecast({ feelsC: 28 }), template: template({ id: 'tpl_hitte', name: 'Hittegewenning' }), logs: [], date: '2026-11-03', durationMinutes: 40 });
    expect(a!.lines.join(' ').toLowerCase()).not.toContain('luchtig');
  });
});
