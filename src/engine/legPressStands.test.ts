// Nagaan (eigenaar, 11 november, nagemaakte data): een leg press met pinnen toonde 84,7, 105,5, 91,6 en 89,4 kg.
// Rekent Forge buiten de standen van het toestel? Met opgeslagen standen moet elk gewicht dat Forge zelf zet
// (voorschrift, opwarmen, doorvoeren, Minder en Meer) een stand zijn. Besluit: docs/beslissingen/2026-11-11-forge-verloop.md.
import { describe, expect, it } from 'vitest';
import { exerciseById } from '../data/exercises';
import { DEFAULT_PROFILE, normalizeProfile, type GymProfile } from './strengthSettings';
import { candidatesFor, learnedStack } from './strengthWeights';
import { makeSnap, nextStand } from './forgeInput';

const legPress = exerciseById('leg-press')!;
// Nagemaakte standen met oneven stappen, zoals een blok dat in een andere eenheid is gemerkt.
const STANDS = [70.6, 75.3, 80, 84.7, 89.4, 91.6, 96.3, 101, 105.5, 110.2];
const gym = (p: Partial<GymProfile>): GymProfile => normalizeProfile({ ...DEFAULT_PROFILE, id: 'g', name: 'Gym', ...p })!;
const withStands = gym({ exerciseStandsKg: { [legPress.id]: { kg: STANDS } } });

describe('leg press met standen', () => {
  it('de leg press met pinnen is een toestel met gewichtsblok', () => {
    expect(legPress.resistance).toBe('machine_stack');
  });

  it('de gewichten die Forge kan voorstellen zijn binnen het bereik precies de standen', () => {
    const c = candidatesFor(legPress, withStands, { usedKg: [83, 87.5, 99] })!;
    const inside = c.map((x) => x.externalKg).filter((w) => w >= STANDS[0] && w <= STANDS[STANDS.length - 1]);
    expect(inside).toEqual(STANDS);
  });

  it('afronden (opwarmen, doorvoeren, Terugzetten) landt altijd op een stand', () => {
    const snap = makeSnap(legPress, withStands, undefined, 90);
    for (const kg of [72, 83.1, 86, 90.4, 93.9, 100, 104, 107]) expect(STANDS).toContain(snap(kg));
  });

  it('Minder en Meer gaan van stand naar stand', () => {
    expect(nextStand(STANDS, 84.7, 1, 5)).toBe(89.4);
    expect(nextStand(STANDS, 89.4, 1, 5)).toBe(91.6);
    expect(nextStand(STANDS, 105.5, -1, 5)).toBe(101);
  });

  it('zonder opgeslagen standen leert Forge uit gebruikte gewichten en vult een groot gat met de stap van het profiel', () => {
    // Het bekende gedrag zonder standen (Standen onthouden uit of nog niet ingelezen): 91,6 lijkt op 202 pond en valt
    // weg, en tussen 89,4 en 105,5 komen 94,4, 99,4 en 104,4, die op dit toestel niet bestaan. Met standen gebeurt
    // dat niet (zie hierboven).
    const learned = learnedStack([84.7, 89.4, 91.6, 105.5], 5)!;
    expect(learned.filter((w) => w > 80 && w < 106)).toEqual([84.7, 89.4, 94.4, 99.4, 104.4, 105.5]);
    expect(learnedStack([84.7, 89.4, 91.6, 105.5], 5, { fillGaps: false })!.filter((w) => w > 80 && w < 106)).toEqual([84.7, 89.4, 91.6, 105.5]);
  });
});
