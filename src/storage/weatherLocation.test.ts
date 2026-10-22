import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetaRepo, SettingsRepo, wipeAllData } from './database';
import { followLocation } from './weatherLocation';
import { buildBackupEnvelope, normalizeBackupToCurrentModel } from './backup';
import { resolveOverviews } from '../engine/overviewSettings';
import { LocateError } from '../utils/geolocation';

// Verzonnen plek: midden in het land, geen adres.
const HERE = { name: 'Mijn locatie', lat: 52.1, lon: 5.3 };
const NOW = new Date('2026-10-22T12:00:00Z');
const granted = async () => 'granted' as const;

describe('followLocation', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('brings Mijn locatie to the new place and remembers when it looked', async () => {
    const locate = vi.fn(async () => ({ lat: 50.01, lon: 4.02 }));
    const result = await followLocation({ enabled: true, place: HERE, now: NOW, getPermission: granted, locate });
    expect(result).toEqual({ status: 'updated', place: { name: 'Mijn locatie', lat: 50.01, lon: 4.02 } });
    expect(await MetaRepo.get('weatherLocationCheckedAt')).toBe(NOW.toISOString());
  });

  it('keeps the place when you have not moved', async () => {
    const result = await followLocation({ enabled: true, place: HERE, now: NOW, getPermission: granted, locate: async () => ({ lat: 52.1, lon: 5.3 }) });
    expect(result).toEqual({ status: 'unchanged' });
  });

  it('asks the device at most once an hour', async () => {
    const locate = vi.fn(async () => ({ lat: 50.01, lon: 4.02 }));
    await followLocation({ enabled: true, place: HERE, now: NOW, getPermission: granted, locate });
    const again = await followLocation({ enabled: true, place: HERE, now: new Date(NOW.getTime() + 59 * 60_000), getPermission: granted, locate });
    expect(again).toEqual({ status: 'skipped', reason: 'te-vroeg' });
    await followLocation({ enabled: true, place: HERE, now: new Date(NOW.getTime() + 60 * 60_000), getPermission: granted, locate });
    expect(locate).toHaveBeenCalledTimes(2);
  });

  it('never locates without a given permission, with the setting off or for a place you searched', async () => {
    const locate = vi.fn(async () => ({ lat: 50.01, lon: 4.02 }));
    expect(await followLocation({ enabled: true, place: HERE, now: NOW, getPermission: async () => 'prompt', locate })).toEqual({ status: 'skipped', reason: 'geen-toestemming' });
    expect(await followLocation({ enabled: false, place: HERE, now: NOW, getPermission: granted, locate })).toEqual({ status: 'skipped', reason: 'uit' });
    expect(await followLocation({ enabled: true, place: { name: 'Teststad', lat: 1, lon: 1 }, now: NOW, getPermission: granted, locate })).toEqual({ status: 'skipped', reason: 'eigen-plaats' });
    expect(locate).not.toHaveBeenCalled();
  });

  it('a failing device is a quiet failure, not an error', async () => {
    const locate = async () => { throw new LocateError('timeout'); };
    expect(await followLocation({ enabled: true, place: HERE, now: NOW, getPermission: granted, locate })).toEqual({ status: 'failed' });
  });
});

describe('the setting and the backup', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('travels with the settings; an older backup means on; rubbish is read as on', async () => {
    await SettingsRepo.set({ overviews: { weatherFollowsLocation: false } });
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    expect(resolveOverviews(normalizeBackupToCurrentModel(envelope).settings?.overviews).weatherFollowsLocation).toBe(false);
    delete envelope.payload.settings.overviews;
    expect(resolveOverviews(normalizeBackupToCurrentModel(envelope).settings?.overviews).weatherFollowsLocation).toBe(true);
    envelope.payload.settings.overviews = { weatherFollowsLocation: 'misschien' };
    expect(resolveOverviews(normalizeBackupToCurrentModel(envelope).settings?.overviews).weatherFollowsLocation).toBe(true);
  });

  it('keeps the hour of the last look on this device, out of the backup', async () => {
    await MetaRepo.set('weatherLocationCheckedAt', NOW.toISOString());
    expect(JSON.stringify(await buildBackupEnvelope())).not.toContain('weatherLocationCheckedAt');
  });
});
