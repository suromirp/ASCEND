import { describe, expect, it } from 'vitest';
import levelText from '../../android/native-level.txt?raw';
import pluginsText from '../../android/native-plugins.json?raw';
import packageText from '../../package.json?raw';
import databaseSource from './database.ts?raw';

// Het native niveau van de Android-app (android/native-level.txt) zegt welke APK een webversie
// nodig heeft (engine/liveUpdate.ts, docs/beslissingen/2026-11-01-android-app.md). Twee regels
// bewaakt deze test, met de vaste lijst in android/native-plugins.json:
// - Gaat DB_VERSION omhoog, dan gaat het native niveau mee omhoog. Anders kan de app bij een
//   mislukte start terugvallen op een oude bundel die de nieuwere database niet kent.
// - Verandert een plugin of Capacitor zelf in package.json, dan vraagt dat een nieuwe APK en dus
//   ook een hoger niveau.
// Faalt hij: hoog android/native-level.txt op en werk android/native-plugins.json bij.

const level = Number(levelText.trim());
const fixed = JSON.parse(pluginsText) as { nativeLevel: number; dbVersion: number; packages: Record<string, string> };
const pkg = JSON.parse(packageText) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };
const dbVersion = Number(/const DB_VERSION = (\d+);/.exec(databaseSource)?.[1]);

describe('het native niveau van de Android-app', () => {
  it('de vaste lijst hoort bij het huidige niveau', () => {
    expect(Number.isInteger(level) && level > 0).toBe(true);
    expect(fixed.nativeLevel, 'werk android/native-plugins.json bij als je het native niveau ophoogt').toBe(level);
  });

  it('een nieuwe databaseversie vraagt een hoger native niveau', () => {
    expect(dbVersion, 'DB_VERSION veranderd: hoog android/native-level.txt op en zet dbVersion in android/native-plugins.json').toBe(fixed.dbVersion);
  });

  it('de plugins in package.json zijn die van de vaste lijst', () => {
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    const native = Object.fromEntries(Object.entries(all).filter(([name]) => /^@capacitor(-community)?\/|^@capawesome\//.test(name)).sort(([a], [b]) => a.localeCompare(b)));
    expect(native, 'een plugin veranderd: hoog android/native-level.txt op en werk android/native-plugins.json bij').toEqual(fixed.packages);
  });
});
