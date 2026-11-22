// ASCEND: welke instelling uitleg heeft, en de uitleg zelf ophalen (docs/visie/Ontwerp instellingen op een plek.md,
// stap 3). De lange teksten (data/settingsHelp.ts) laden niet bij de start van de app: de instellingenpagina's
// halen ze vooraf op, elders gebeurt dat bij de eerste tik op de i. Wie al weet of er uitleg is (de knop
// Meer uitleg), leest hier zonder iets te laden.

import { deriveHelpKeys } from '../engine/settingsDefs/derive';
import type { SettingsHelp } from './settingsHelp';

const KEYS = new Set(deriveHelpKeys().keys);

export const hasSettingsHelp = (key: string): boolean => KEYS.has(key);

type HelpModule = typeof import('./settingsHelp');
let loaded: HelpModule | undefined;
let loading: Promise<HelpModule> | undefined;

// Haalt de teksten op (één keer); een mislukte poging mag later opnieuw.
export function loadSettingsHelp(): Promise<HelpModule> {
  if (loaded) return Promise.resolve(loaded);
  loading ??= import('./settingsHelp').then(
    (m) => (loaded = m),
    (e: unknown) => {
      loading = undefined;
      throw e;
    },
  );
  return loading;
}

// De uitleg als die al geladen is; anders undefined (laad dan eerst met loadSettingsHelp).
export function settingsHelpIfLoaded(key: string, named: boolean, strengthOn: boolean = true): SettingsHelp | undefined {
  return loaded?.settingsHelp(key, named, strengthOn);
}
