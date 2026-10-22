// ASCEND: de wandelladder per week: duur en hoogtemeters van de bergtocht en
// van de eerste wandeldag.
//
// Het rugzakgewicht staat hier bewust niet. Dat volgt uit het rugzakdoel van
// je doel (14 kg met tent, of wat je zelf instelde) en wordt per week
// uitgerekend in engine/packLadder.ts, zodat de ladder altijd naar jouw
// doelgewicht loopt. Deze getallen bepalen wel in welke weken het gewicht
// omhoog mag: nooit in een week waarin ook de hoogtemeters omhoog gaan.
//
// Alleen gewone getallen en tekst, geen imports: deze lijst wordt gelezen
// door zowel de standaarddata (defaultProgram.ts) als de planning
// (engine/programLayout.ts), en mag dus geen van beide terug importeren.

import type { WeeklyProgressionStep } from '../models/training';

// Hoogtemeters gaan omhoog in Bergcapaciteit week 2, 6 en in Expeditieklaar
// week 1 en 3 (het gewicht staat dan stil); in de weken ertussen gaat de
// rugzak omhoog (het aantal hoogtemeters blijft gelijk).
export const MOUNTAIN_HIKE_LADDER: WeeklyProgressionStep[] = [
  { phaseId: 'phase_3', weekInPhase: 1, targetMinutes: 120, elevationGainM: 400, note: 'Wennen' },
  { phaseId: 'phase_3', weekInPhase: 2, targetMinutes: 150, elevationGainM: 500, note: 'Meer hoogtemeters' },
  { phaseId: 'phase_3', weekInPhase: 3, targetMinutes: 165, elevationGainM: 500, note: 'Rugzak zwaarder' },
  { phaseId: 'phase_3', weekInPhase: 4, targetMinutes: 105, elevationGainM: 300, note: 'Rustweek' },
  { phaseId: 'phase_3', weekInPhase: 5, targetMinutes: 180, elevationGainM: 500, note: 'Rugzak zwaarder' },
  { phaseId: 'phase_3', weekInPhase: 6, targetMinutes: 195, elevationGainM: 650, note: 'Meer hoogtemeters' },
  { phaseId: 'phase_3', weekInPhase: 7, targetMinutes: 225, elevationGainM: 650, note: 'Zwaarste week, rugzak zwaarder' },
  { phaseId: 'phase_3', weekInPhase: 8, targetMinutes: 150, elevationGainM: 400, note: 'Rustweek' },
  { phaseId: 'phase_4', weekInPhase: 1, targetMinutes: 240, elevationGainM: 800, note: 'Tweede dag op rij, meer hoogtemeters' },
  { phaseId: 'phase_4', weekInPhase: 2, targetMinutes: 270, elevationGainM: 800, note: 'Rugzak naar tochtgewicht en erboven' },
  { phaseId: 'phase_4', weekInPhase: 3, targetMinutes: 300, elevationGainM: 1000, note: 'Zwaarste weekend, 1.000 m omhoog' },
  { phaseId: 'phase_4', weekInPhase: 4, targetMinutes: 180, elevationGainM: 500, note: 'Rustweek' },
  { phaseId: 'phase_taper', weekInPhase: 1, targetMinutes: 150, elevationGainM: 500, note: 'Minder volume, zelfde tempo' },
  { phaseId: 'phase_taper', weekInPhase: 2, targetMinutes: 90, elevationGainM: 200, note: 'Kort en fris, weinig dalen' },
];

// De zaterdag van Expeditieklaar: dezelfde rugzak als de zondag, minder
// hoogtemeters. Zijn hoogtemeters gaan in dezelfde weken omhoog als die van de
// bergtocht, zodat het gewicht ook daar vrij blijft.
export const HIKE_DAY_ONE_LADDER: WeeklyProgressionStep[] = [
  { phaseId: 'phase_4', weekInPhase: 1, targetMinutes: 150, elevationGainM: 500, note: 'Wennen aan twee dagen' },
  { phaseId: 'phase_4', weekInPhase: 2, targetMinutes: 180, elevationGainM: 500, note: 'Iets langer' },
  { phaseId: 'phase_4', weekInPhase: 3, targetMinutes: 180, elevationGainM: 600, note: 'Zwaarste weekend' },
  { phaseId: 'phase_4', weekInPhase: 4, targetMinutes: 90, elevationGainM: 250, note: 'Rustweek' },
];
