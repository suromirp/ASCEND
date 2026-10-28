// ASCEND: de vlakken van de spieren op het figuur van Lichaam (data/bodyFigure.ts), voor het
// spierkaartje bij een oefening. Alleen tekenpaden op hetzelfde vlak van 200 bij 440, geen kleur,
// de linkerhelft van het lichaam (gespiegeld voor de rechterhelft). Alles zijn zachte bogen
// zonder scherpe hoeken, binnen het silhouet. Dit zijn geen tikplekken: de plekken van Lichaam
// (data/bodySpots.ts) wijzen een klacht aan, deze vlakken laten zien welke spier werkt.
// Ontwerp: docs/beslissingen/2026-10-28-plaatjes-bij-oefeningen.md.

import type { MuscleGroup } from '../models/exercise';

export type MuscleSide = 'front' | 'back';

export const MUSCLE_REGIONS: Record<MuscleSide, Partial<Record<MuscleGroup, string>>> = {
  front: {
    chest: 'M98.5,73 C91,70.5 81,71.5 74.5,76 C70.5,81 70.5,88 73.5,93.5 C79.5,101 89,105 98.5,104 C99,93 99,83 98.5,73 Z',
    front_delts: 'M72.5,73 C64.5,74.5 57.5,80.5 55.5,90 C55.5,96.5 58.5,101 63,102 C66.5,96 68.5,89 70,83 C71,79 72.5,77 72.5,73 Z',
    side_delts: 'M65,73.5 C58.5,76 54.5,82.5 54.5,90 C54.5,95.5 56.5,99 59.5,101 C58.5,93 59.5,82 65,73.5 Z',
    biceps: 'M62.5,107 C60.5,115 57.5,126 55.5,137 C57,140 60,140.5 61.5,138 C62.8,129 63.8,117.5 64.2,108.5 Z',
    forearms: 'M58.5,147 C56.5,162 52.5,184 48.5,206 C47,214 48.5,220 51,217 C54.5,198 58.5,174 60,154 C60.4,150.5 59.5,148 58.5,147 Z',
    core: 'M98.5,112 C93.5,113 90,124 90,141 C90,160 92,177 98.5,193 C99,166 99,138 98.5,112 Z',
    quadriceps: 'M97.5,240 C90.5,233.5 80,234 73.5,242 C69.5,255 70.5,275 74.5,291 C81,297 90,295.5 95.5,288.5 C97.5,273.5 98.5,255 97.5,240 Z',
    hip_adductors: 'M98.8,240 C97,253 95.5,268 95.5,284 C98,282 99,273 99,262 Z',
    tibialis: 'M80.5,318 C77.5,335 78.5,358 82.5,382 C85.5,377 87.5,356 86.5,331 Z',
  },
  back: {
    traps: 'M98.5,58 C93.5,62 84,66.5 73,70.5 C82,79 91,93 98.5,118 C99,98 99,77 98.5,58 Z',
    upper_back: 'M97.5,122 C92,114 86,106 80,100 C76,106 78,114 84,120 C89,124 94,124 97.5,122 Z',
    lats: 'M69,112 C68.5,128 72,146 80,160 C86,167 92,171 98.5,174 C99,162 99,148 98,136 C90,131 82,125 77,118 C74,116 71,114 69,112 Z',
    rear_delts: 'M71.5,72 C63.5,74 56.5,80 55,90 C55,96.5 58,100.5 62.5,101.5 C66,95 68.5,88 70,82 C71,78 72,75.5 71.5,72 Z',
    triceps: 'M63.5,105 C62,116 61.5,128 60.5,139.5 C57,143.5 52,143.5 49.5,140 C50.5,128 52,114 54,101.5 C58,100 61.5,101 63.5,105 Z',
    forearms: 'M58.5,147 C56.5,162 52.5,184 48.5,206 C47,214 48.5,220 51,217 C54.5,198 58.5,174 60,154 C60.4,150.5 59.5,148 58.5,147 Z',
    lower_back: 'M98.5,172 C92,174.5 86.5,184 86.5,196 C90.5,201.5 95,203.5 98.5,203.5 C99,193 99,182 98.5,172 Z',
    glutes: 'M98.5,205.5 C88.5,202.5 76.5,204.5 69.5,211.5 C68.5,222.5 76,234 88,236.5 C93,237.5 96.5,236.5 98.5,235 C99,224 99,214 98.5,205.5 Z',
    hip_abductors: 'M69.5,208 C75,204 82,203.5 88,204.5 C80.5,210.5 76.5,219 75.5,228 C71,224.5 68,216 69.5,208 Z',
    hamstrings: 'M97.5,241 C89,238.5 80,242 74.5,249 C71.5,262 72.5,280 76.5,296 C84,299.5 92,298 95.5,291.5 C97.5,276 98.5,258 97.5,241 Z',
    calves: 'M86,314 C79,318 74,332 74,347 C75,357 79,364 85,368 C90,362 93,348 93,332 C93,322 91,316 86,314 Z',
  },
};

// Aan welke kant een spier hoort te worden getekend: de kant waar hij zichtbaar is. De onderarm zit
// aan beide kanten en staat in het kaartje aan de voorkant.
export const MUSCLE_SIDE: Record<MuscleGroup, MuscleSide> = {
  quadriceps: 'front',
  hip_adductors: 'front',
  tibialis: 'front',
  core: 'front',
  chest: 'front',
  front_delts: 'front',
  side_delts: 'front',
  biceps: 'front',
  forearms: 'front',
  hamstrings: 'back',
  glutes: 'back',
  calves: 'back',
  hip_abductors: 'back',
  lower_back: 'back',
  lats: 'back',
  upper_back: 'back',
  rear_delts: 'back',
  triceps: 'back',
  traps: 'back',
};
