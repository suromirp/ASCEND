// ASCEND: het trilpatroon bij het einde van de rust, passend bij het gekozen
// geluid (Instellingen, Forge). Wat je hoort en wat je voelt hebben hetzelfde
// ritme, ook als je alleen trillen koos, zodat je in je zak al weet welk
// geluid het zou zijn. Besluit: docs/beslissingen/2026-10-24-trillen-bij-het-rustgeluid.md.
//
// Een patroon is de lijst van navigator.vibrate: trillen, pauze, trillen, ...
// Begint en eindigt met trillen. Geen trilstoot korter dan 70 ms: veel
// Android-motoren laten hele korte stoten weg (zie utils/haptics.ts). Puur: geen
// React, geen browser.

import type { RestAlert, RestSound } from './strengthSettings';
import { readRestSound, type RestCue } from './restSounds';

// Het vaste patroon van vroeger: drie duidelijke stoten, de laatste lang. Een
// geluid dat hier geen eigen patroon heeft (of ontbreekt) houdt dit, en de
// afteltimer (CountdownTimer) gebruikt het nog altijd.
export const REST_ALARM_PATTERN: readonly number[] = [250, 120, 250, 120, 400];

const PATTERNS: Record<RestSound, readonly number[]> = {
  // Pickel op rots: één droge klik.
  pickaxe: [110],
  // Cornu: één lange roep.
  cornu: [700],
  // Vikinghoorn: één lange, lage roep die uitklinkt.
  vikinghorn: [900],
  // Trommel: drie trage zware slagen.
  drum: [160, 260, 160, 260, 220],
  // Bronzen klokken: drie tonen.
  bianzhong: [90, 140, 90, 140, 200],
  // Hyōshigi: twee houten klappers.
  hyoshigi: [80, 160, 80],
  // Tempelbel: één diepe slag met lange uitklank.
  templebell: [800],
  // Heldere bel: twee korte hoge slagen.
  clearbell: [90, 110, 90],
  // Lier: één aangeslagen snaar.
  lyre: [350],
};

// Het patroon bij een geluid; een oude keuze leest als de nieuwe (engine/restSounds.ts), een onbekend
// of ontbrekend geluid houdt het vaste patroon.
export function restVibrationPattern(sound: RestSound | string | undefined): number[] {
  const known = readRestSound(sound);
  return [...(known ? PATTERNS[known] : REST_ALARM_PATTERN)];
}

// Bij een volgende oefening: het patroon, een korte pauze en nog een keer, zoals de klank twee keer klinkt.
export function restVibrationFor(sound: RestSound | string | undefined, cue: RestCue): number[] {
  const one = restVibrationPattern(sound);
  if (cue === 'pre') return [70];
  return cue === 'exercise' ? [...one, 250, ...one] : one;
}

// Wat het signaal als de rust om is laat doen: geluid, trillen, allebei of niets.
export function restAlertChannels(alert: RestAlert): { sound: boolean; vibrate: boolean } {
  return { sound: alert === 'sound_vibrate' || alert === 'sound', vibrate: alert === 'sound_vibrate' || alert === 'vibrate' };
}
