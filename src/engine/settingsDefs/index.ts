// ASCEND: alle verklaringen van de instellingen, één bestand per groep (docs/visie/Ontwerp instellingen op een
// plek.md). Stap 1: naast de oude bestanden, die tot stap 2 en 3 de bron blijven.

import type { SettingsPageId } from '../../data/settingsLayout';
import type { SettingDef } from './types';
import { PLANNING } from './planning';
import { DOEL } from './doel';
import { FORGE } from './forge';
import { LICHAAM } from './lichaam';
import { VANDAAG } from './vandaag';
import { KOPPELINGEN } from './koppelingen';
import { GEGEVENS } from './gegevens';
import { GIDSEN } from './gidsen';

// De volgorde van de groepen op het overzicht (SETTINGS_PAGES).
export const PAGE_ORDER: readonly SettingsPageId[] = ['planning', 'doel', 'forge', 'lichaam', 'vandaag', 'koppelingen', 'gegevens', 'gidsen'];

export const ALL_DEFS: readonly SettingDef[] = [...PLANNING, ...DOEL, ...FORGE, ...LICHAAM, ...VANDAAG, ...KOPPELINGEN, ...GEGEVENS, ...GIDSEN];

export const DEFS: Readonly<Record<string, SettingDef>> = Object.fromEntries(ALL_DEFS.map((d) => [d.id, d]));
