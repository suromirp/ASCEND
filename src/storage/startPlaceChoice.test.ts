import { beforeEach, describe, expect, it } from 'vitest';
import { wipeAllData } from './database';
import { START_PLACE_CHOICE_KEY, readStartPlaceChoices, resetStartPlaceChoiceCache, saveStartPlaceChoice, subscribeStartPlaceChoices } from './startPlaceChoice';
import { buildBackupEnvelope } from './backupExport';

const FAR = { date: '2026-11-16', name: 'Verwegdal', lat: 50.72, lon: 4.1, placeId: 'pl-1' };

describe('storage/startPlaceChoice', () => {
  beforeEach(async () => {
    await wipeAllData();
    resetStartPlaceChoiceCache();
  });
  it('bewaart, leest terug, wist, en meldt het aan wie luistert', async () => {
    let heard = 0;
    const stop = subscribeStartPlaceChoices(() => heard++);
    expect(await saveStartPlaceChoice('s1', FAR, '2026-11-15')).toBe(true);
    expect(await readStartPlaceChoices()).toEqual({ s1: FAR });
    expect(await saveStartPlaceChoice('s1', undefined, '2026-11-15')).toBe(true);
    expect(await readStartPlaceChoices()).toEqual({});
    stop();
    expect(heard).toBe(2);
  });
  it('staat niet in de export', async () => {
    await saveStartPlaceChoice('s1', FAR, '2026-11-15');
    const text = JSON.stringify(await buildBackupEnvelope());
    expect(text).not.toContain(START_PLACE_CHOICE_KEY);
    expect(text).not.toContain('Verwegdal');
  });
});
