import { describe, expect, it } from 'vitest';
import { isTrustedUpdateUrl, nativeLevelFromVersionName, parseAppVersion, readyOutcome, updateDecision, type AppVersion } from './liveUpdate';

// Een nagemaakt app-versie.json zoals de deploy-workflow het neerzet.
const manifest: AppVersion = {
  version: 'abc1234',
  builtAt: '2026-11-01T10:00:00.000Z',
  minNative: 1,
  bundle: 'app/ascend-web-abc1234.zip',
  sha256: 'a'.repeat(64),
};

const base = { manifest, currentBuiltAt: '2026-10-30T08:00:00.000Z', nativeLevel: 1, enabled: true, blocked: [] as string[], downloaded: [] as string[], baseUrl: 'https://voorbeeld.test/ascend/', now: Date.parse('2026-11-01T12:00:00.000Z') };

describe('app-versie.json lezen', () => {
  it('neemt een geldig bestand over', () => {
    expect(parseAppVersion(manifest)).toEqual(manifest);
  });
  it('weigert een bestand met ontbrekende of rare velden', () => {
    expect(parseAppVersion(null)).toBeNull();
    expect(parseAppVersion({ ...manifest, minNative: 'een' })).toBeNull();
    expect(parseAppVersion({ ...manifest, builtAt: 'gisteren' })).toBeNull();
    expect(parseAppVersion({ ...manifest, sha256: 'kort' })).toBeNull();
    expect(parseAppVersion({ ...manifest, version: 'public' })).toBeNull();
    // Een bundel buiten de eigen site wordt nooit gevolgd.
    expect(parseAppVersion({ ...manifest, bundle: 'https://elders.test/x.zip' })).toBeNull();
    expect(parseAppVersion({ ...manifest, bundle: '../x.zip' })).toBeNull();
  });
});

describe('versie vergelijken', () => {
  it('een nieuwere webversie wordt op de achtergrond binnengehaald', () => {
    expect(updateDecision(base)).toEqual({ kind: 'download', bundleId: 'abc1234', url: 'https://voorbeeld.test/ascend/app/ascend-web-abc1234.zip', checksum: 'a'.repeat(64) });
  });
  it('dezelfde of een oudere versie doet niets', () => {
    expect(updateDecision({ ...base, currentBuiltAt: manifest.builtAt })).toEqual({ kind: 'none' });
    expect(updateDecision({ ...base, currentBuiltAt: '2026-11-02T00:00:00.000Z' })).toEqual({ kind: 'none' });
  });
  it('al binnen: alleen klaarzetten voor de volgende start', () => {
    expect(updateDecision({ ...base, downloaded: ['abc1234'] })).toEqual({ kind: 'ready', bundleId: 'abc1234' });
  });
  it('uit in de instellingen: niets', () => {
    expect(updateDecision({ ...base, enabled: false })).toEqual({ kind: 'none' });
  });
});

describe('terugvallen', () => {
  it('een bundel die bij het starten misging wordt niet opnieuw gehaald', () => {
    expect(updateDecision({ ...base, blocked: ['abc1234'] })).toEqual({ kind: 'none' });
  });
  it('zegt na het starten of de app terugviel en op welke bundel het misging', () => {
    expect(readyOutcome({ rollback: true, previousBundleId: 'abc1234', currentBundleId: null })).toEqual({ rolledBack: true, failed: 'abc1234' });
    expect(readyOutcome({ rollback: false, previousBundleId: null, currentBundleId: 'abc1234' })).toEqual({ rolledBack: false });
  });
});

describe('native deel te oud', () => {
  it('een webversie die een nieuwere app nodig heeft wordt niet geladen', () => {
    expect(updateDecision({ ...base, manifest: { ...manifest, minNative: 2 } })).toEqual({ kind: 'needs-app', version: 'abc1234' });
  });
  it('ook als hij al binnen was', () => {
    expect(updateDecision({ ...base, manifest: { ...manifest, minNative: 2 }, downloaded: ['abc1234'] })).toEqual({ kind: 'needs-app', version: 'abc1234' });
  });
  it('leest het niveau uit de versienaam van de app', () => {
    expect(nativeLevelFromVersionName('1.57')).toBe(1);
    expect(nativeLevelFromVersionName('3.2')).toBe(3);
    expect(nativeLevelFromVersionName('rommel')).toBe(0);
  });
});

describe('waar een update vandaan mag komen', () => {
  it('alleen https op github.io', () => {
    expect(isTrustedUpdateUrl('https://voorbeeld.github.io/ascend/')).toBe(true);
    expect(isTrustedUpdateUrl('http://voorbeeld.github.io/ascend/')).toBe(false);
    expect(isTrustedUpdateUrl('https://voorbeeld.github.io.elders.test/')).toBe(false);
    expect(isTrustedUpdateUrl('https://elders.test/ascend/')).toBe(false);
    expect(isTrustedUpdateUrl('https://iemand:geheim@voorbeeld.github.io/')).toBe(false);
    expect(isTrustedUpdateUrl('')).toBe(false);
  });
  it('een bouwtijd meer dan een dag vooruit wordt niet geloofd', () => {
    expect(updateDecision({ ...base, manifest: { ...manifest, builtAt: '2026-11-03T12:00:00.000Z' } })).toEqual({ kind: 'none' });
    expect(updateDecision({ ...base, manifest: { ...manifest, builtAt: '2026-11-02T11:00:00.000Z' } }).kind).toBe('download');
  });
});
