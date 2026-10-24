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

// Het vaste patroon van vroeger: drie duidelijke stoten, de laatste lang. Een
// geluid dat hier geen eigen patroon heeft (of ontbreekt) houdt dit, en de
// afteltimer (CountdownTimer) gebruikt het nog altijd.
export const REST_ALARM_PATTERN: readonly number[] = [250, 120, 250, 120, 400];

const PATTERNS: Record<RestSound, readonly number[]> = {
  // Drie zachte tonen omhoog, 160 ms uit elkaar, de laatste houdt aan.
  chime: [90, 70, 90, 70, 260],
  // Eén diepe, ronde toon.
  bell: [450],
  // De korte piepjes van eerst: vier, de laatste na een iets langere pauze.
  beep: [150, 90, 150, 90, 150, 150, 220],
  // Een ringbel, snel achter elkaar: drie snelle tikken.
  boxing: [80, 90, 80, 90, 80],
  // Een kort fluitje met triller: twee korte.
  whistle: [140, 110, 140],
  // Eén lage gong met lange uitklank: één lange.
  gong: [900],
};

// Het patroon bij een geluid; een onbekend of ontbrekend geluid houdt het vaste patroon.
export function restVibrationPattern(sound: RestSound | string | undefined): number[] {
  const known = sound !== undefined && Object.prototype.hasOwnProperty.call(PATTERNS, sound);
  return [...(known ? PATTERNS[sound as RestSound] : REST_ALARM_PATTERN)];
}

// Wat het signaal als de rust om is laat doen: geluid, trillen, allebei of niets.
export function restAlertChannels(alert: RestAlert): { sound: boolean; vibrate: boolean } {
  return { sound: alert === 'sound_vibrate' || alert === 'sound', vibrate: alert === 'sound_vibrate' || alert === 'vibrate' };
}
