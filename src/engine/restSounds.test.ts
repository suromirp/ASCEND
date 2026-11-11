import { describe, expect, it } from 'vitest';
import { CHOICES } from '../data/settingsChoices';
import { listenNotice, preTickDelay, PRE_TICK_SECONDS, readRestSound, readRestVolume, REST_SOUND_FILES, REST_SOUND_GROUPS, REST_SOUNDS, restCue, vibrateInstead } from './restSounds';

describe('de tien rustgeluiden', () => {
  it('elke klank staat precies één keer onder een kopje, in de volgorde van de wens', () => {
    const grouped = REST_SOUND_GROUPS.flatMap((g) => g.sounds);
    expect(grouped).toEqual([...REST_SOUNDS]);
    expect(new Set(grouped).size).toBe(10);
    expect(REST_SOUND_GROUPS.map((g) => g.title)).toEqual(['Bergen', 'Rome', 'Noorden', 'Oosten', 'Overig']);
  });

  it('de keuze in de instellingen heeft dezelfde tien, met Koebel als advies', () => {
    expect(CHOICES.rustgeluid.options.map((o) => o.value)).toEqual([...REST_SOUNDS]);
    expect(CHOICES.rustgeluid.advice).toBe('cowbell');
    expect(CHOICES.rustvolume.options.map((o) => o.value)).toEqual(['soft', 'normal', 'clear']);
    expect(CHOICES.rustvolume.advice).toBe('normal');
  });

  it('elke aangemelde opname staat echt in public/sounds/ (anders klinkt hij altijd als de heldere bel)', () => {
    const present = Object.keys(import.meta.glob('../../public/sounds/*.mp3')).map((k) => k.replace('../../public/', ''));
    for (const path of Object.values(REST_SOUND_FILES)) expect(present, path).toContain(path);
  });

  it('teksten zonder gedachtestreepjes en zonder hoofdletterknoppen', () => {
    const all = [CHOICES.rustgeluid, CHOICES.rustvolume].flatMap((d) => [d.title, d.line ?? '', ...d.options.flatMap((o) => [o.label, o.note ?? ''])]);
    for (const t of all) expect(t).not.toMatch(/[–—]/);
    expect(listenNotice('blocked')).not.toMatch(/[–—]/);
    expect(listenNotice('fallback')).not.toMatch(/[–—]/);
  });
});

describe('readRestSound: een bewaarde waarde defensief lezen', () => {
  it('een nieuwe keuze blijft', () => {
    for (const s of REST_SOUNDS) expect(readRestSound(s)).toBe(s);
  });
  it('de zes oude keuzes gaan naar de dichtstbijzijnde nieuwe', () => {
    expect(readRestSound('chime')).toBe('clearbell');
    expect(readRestSound('bell')).toBe('clearbell');
    expect(readRestSound('gong')).toBe('templebell');
    expect(readRestSound('boxing')).toBe('cowbell');
    expect(readRestSound('whistle')).toBe('clearbell');
    expect(readRestSound('beep')).toBe('clearbell');
  });
  it('rommel is undefined, ook een naam van Object', () => {
    for (const r of ['trompet', 'toString', '__proto__', '', 3, null, undefined, {}]) expect(readRestSound(r)).toBeUndefined();
    expect(readRestVolume('luid')).toBeUndefined();
    expect(readRestVolume('clear')).toBe('clear');
  });
});

describe('restCue: welke klank', () => {
  it('een nieuwe oefening klinkt anders, behalve als dat uit staat', () => {
    expect(restCue(true, true)).toBe('exercise');
    expect(restCue(true, false)).toBe('set');
    expect(restCue(false, true)).toBe('set');
    expect(restCue(undefined, true)).toBe('set');
  });
});

describe('preTickDelay: de zachte tik 10 seconden voor het einde', () => {
  const now = 1_000_000;
  it('uit: geen tik', () => {
    expect(preTickDelay({ endsAt: now + 90_000, total: 90 }, now, false)).toBeNull();
  });
  it('aan: 10 seconden voor het einde', () => {
    expect(preTickDelay({ endsAt: now + 90_000, total: 90 }, now, true)).toBe(80_000);
    expect(PRE_TICK_SECONDS).toBe(10);
  });
  it('een korte rust van 15 seconden of minder: geen tik vlak na het afvinken', () => {
    expect(preTickDelay({ endsAt: now + 15_000, total: 15 }, now, true)).toBeNull();
    expect(preTickDelay({ endsAt: now + 16_000, total: 16 }, now, true)).toBe(6_000);
  });
  it('al voorbij (de app was weg): niet meer; net voorbij: meteen', () => {
    expect(preTickDelay({ endsAt: now + 5_000, total: 90 }, now, true)).toBeNull();
    expect(preTickDelay({ endsAt: now + 9_500, total: 90 }, now, true)).toBe(0);
  });
});

describe('nooit stilte zonder melding', () => {
  it('alleen geluid en de telefoon laat het niet toe: dan trilt hij', () => {
    expect(vibrateInstead({ sound: true, vibrate: false }, 'blocked')).toBe(true);
    expect(vibrateInstead({ sound: true, vibrate: true }, 'blocked')).toBe(false);
    expect(vibrateInstead({ sound: true, vibrate: false }, 'played')).toBe(false);
    expect(vibrateInstead({ sound: true, vibrate: false }, 'fallback')).toBe(false);
  });
  it('Uit bij geluid: nooit iets in de plaats', () => {
    expect(vibrateInstead({ sound: false, vibrate: false }, 'blocked')).toBe(false);
  });
  it('Luister zegt het als het niet klonk zoals gekozen', () => {
    expect(listenNotice('played')).toBeNull();
    expect(listenNotice('blocked')).toMatch(/geen geluid/);
    expect(listenNotice('fallback')).toMatch(/heldere bel/);
  });
});
