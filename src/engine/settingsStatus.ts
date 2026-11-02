// ASCEND: de stand bovenaan het overzicht van de instellingen, in drie vakken
// als op een horloge: fase, doel en back-up. Puur: de feiten gaan erin, de tekst
// komt eruit. Elk vak zegt waar je het verandert (`target`).

import { daysBetween } from '../utils/dates';
import { backupAge, backupAgoText, backupNeedsAttention } from './settingsAttention';
import type { SettingsPageId } from '../data/settingsLayout';
import { DIRECTIONS } from '../data/directions';
import { settingBudget } from './weekBudget';
import { waveShapeFor, waveWeek } from './waves';
import { parseDirectionStart } from './direction';

export interface StatusFacts {
  today: string;
  // De week in het programma, of null als de datum buiten het programma valt.
  position: { weekInProgram: number; totalWeeks: number; phaseName: string } | null;
  // Het hoofddoel met een datum die nog komt, of null.
  goal: { name: string; date: string } | null;
  lastExportedAt: string | undefined;
  // Zonder doel zegt het eerste vak waar je naartoe werkt: de richting. Weglaten als er een doel is.
  direction?: DirectionStatus;
}

export interface DirectionStatus {
  label: string;
  // "golf, week 2 van 4", of de lengte van de golf als de richting nog niet gekozen is.
  detail: string;
  chosen: boolean;
}

// De richting zoals het vak op het overzicht hem toont: de naam, en waar je in de golf bent.
export function directionStatus(settings: { direction?: unknown; weekBudget?: unknown; directionStart?: unknown; waves?: unknown }, today: string): DirectionStatus {
  const w = settingBudget(settings);
  const shape = waveShapeFor(w.id, settings.waves);
  const wave = shape && w.chosen ? waveWeek(parseDirectionStart(settings.directionStart), today, shape.weeks) : undefined;
  const detail = wave ? `golf, week ${wave.week} van ${wave.length}` : shape ? `golven van ${shape.weeks} weken` : 'zonder golven';
  return { label: DIRECTIONS[w.id].label, detail, chosen: w.chosen };
}

export interface StatusCell {
  key: 'fase' | 'richting' | 'doel' | 'backup';
  label: string;
  value: string;
  detail: string;
  // Goud: alleen het back-upvak, en alleen als de back-up oud is of er nooit een was.
  attention: boolean;
  // Gedimd: er is niets ingesteld.
  dim: boolean;
  // Waar je het verandert: de pagina, de rij en of het blad opent.
  target: { page: SettingsPageId; row: string; sheet?: boolean };
}

const capitalize = (text: string): string => (text ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() : text);

// Een doelnaam kort genoeg voor een vak van een derde van de breedte:
// "GR5 / ALPENKLAAR" wordt "GR5".
export function shortGoalName(name: string): string {
  const first = name.split(/\s+[/\u2013\u2014-]\s+/)[0].trim();
  if (first.length <= 10) return first;
  const word = first.split(/\s+/)[0];
  return word.length <= 10 ? word : `${word.slice(0, 9)}…`;
}

export function statusCells(facts: StatusFacts): [StatusCell, StatusCell, StatusCell] {
  const { position, goal, today } = facts;
  const fase: StatusCell = !goal && facts.direction
    ? {
        key: 'richting', label: 'Richting', value: capitalize(facts.direction.label), detail: facts.direction.detail,
        attention: false, dim: !facts.direction.chosen, target: { page: 'doel', row: 'richting', sheet: true },
      }
    : position
    ? {
        key: 'fase', label: 'Fase', value: capitalize(position.phaseName), detail: `week ${position.weekInProgram} van ${position.totalWeeks}`,
        attention: false, dim: false, target: { page: 'doel', row: 'programma', sheet: true },
      }
    : {
        key: 'fase', label: 'Fase', value: 'Geen', detail: 'buiten het programma',
        attention: false, dim: true, target: { page: 'doel', row: 'programma', sheet: true },
      };
  const left = goal ? Math.max(0, daysBetween(today, goal.date)) : 0;
  const doel: StatusCell = goal
    ? {
        key: 'doel', label: 'Doel', value: shortGoalName(goal.name), detail: left === 1 ? 'nog 1 dag' : `nog ${left} dagen`,
        attention: false, dim: false, target: { page: 'doel', row: 'doelen' },
      }
    : {
        key: 'doel', label: 'Doel', value: 'Geen', detail: 'kies een doel',
        attention: false, dim: true, target: { page: 'doel', row: 'doelen' },
      };
  const age = backupAge(facts.lastExportedAt, today);
  const attention = backupNeedsAttention(age);
  const backup: StatusCell = {
    key: 'backup',
    label: 'Back-up',
    value: age.days === null ? 'Nog nooit' : age.days === 0 ? 'Vandaag' : age.days === 1 ? 'Gisteren' : `${age.days} dagen`,
    detail: attention ? 'Nu maken' : 'in orde',
    attention,
    dim: false,
    target: { page: 'gegevens', row: 'backup', sheet: true },
  };
  return [fase, doel, backup];
}

// De zin onder het back-upvak voor schermlezers: "Back-up 12 dagen geleden, nu maken".
export function backupSpoken(lastExportedAt: string | undefined, today: string): string {
  const age = backupAge(lastExportedAt, today);
  return `Back-up: ${backupAgoText(age).toLowerCase()}${backupNeedsAttention(age) ? ', nu maken' : ''}`;
}
