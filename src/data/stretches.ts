// ASCEND — Stretch content
//
// Two uses:
// 1. Session-bound: DYNAMIC_WARMUP (same routine before every training day)
//    and the COOLDOWN_* lists (tailored per session's muscle groups) are
//    attached to SessionTemplate.warmup/.cooldown in data/defaultProgram.ts
//    and shown as reference in ExerciseLogger.
// 2. Standalone: PROBLEM_AREAS is a "waar zit je vast?" library, unrelated
//    to any planned session — always reachable from Settings → Stretches.
//
// Source: Mayo Clinic recommends dynamic stretching before exercise (static
// stretching on cold muscles can reduce strength/performance) and static
// stretching afterward, once muscles are warm.

import type { Stretch } from '../models/training';

export const DYNAMIC_WARMUP: Stretch[] = [
  { name: 'Beenzwaaien (voor-achter en zijwaarts)', durationSec: 30, note: 'per been' },
  { name: 'Wandelende lunges', durationSec: 60, note: 'activeert bilspieren en quads' },
  { name: 'Lichte bodyweight squats', durationSec: 45 },
  { name: 'Armcirkels en schouderrollen', durationSec: 30 },
  { name: 'Knieheffingen (marcheren met hoge knieën)', durationSec: 45 },
  { name: "World's Greatest Stretch (lunge + rotatie)", durationSec: 60, note: 'hamstrings, heupbuigers, borst, schouders — telt als complete warming-up' },
  { name: 'Wandbrug / kuit-activatie', durationSec: 30, note: 'lichte kuitrek in beweging' },
];

export const COOLDOWN_UPPER: Stretch[] = [
  { name: 'Deurpost borststretch', durationSec: 45, note: 'per kant' },
  { name: 'Lat-stretch (zijwaartse reik, hangend)', durationSec: 45, note: 'per kant' },
  { name: 'Overhead triceps-stretch', durationSec: 45, note: 'per kant' },
  { name: 'Cross-body schouderstretch', durationSec: 45, note: 'per kant' },
];

export const COOLDOWN_LOWER: Stretch[] = [
  { name: 'Staande quadstretch', durationSec: 45, note: 'per kant' },
  { name: 'Liggende hamstringstretch (met band)', durationSec: 45, note: 'per kant' },
  { name: 'Hip flexor-stretch (lunge-stretch)', durationSec: 45, note: 'per kant' },
  { name: 'Piriformis-stretch (figure-four liggend)', durationSec: 45, note: 'per kant' },
];

export const COOLDOWN_RUN: Stretch[] = [
  { name: 'Staande kuitstretch tegen muur (knie gestrekt)', durationSec: 45, note: 'per kant' },
  { name: 'Staande kuitstretch tegen muur (knie gebogen)', durationSec: 45, note: 'per kant' },
  { name: 'Hip flexor-stretch (lunge-stretch)', durationSec: 45, note: 'per kant' },
  { name: 'IT-band stretch (staande zijwaartse cross-leg reach)', durationSec: 45, note: 'per kant' },
];

export const COOLDOWN_RECOVERY: Stretch[] = [
  { name: 'Kattenrug / koeienrug (cat-cow)', durationSec: 45 },
  { name: "Child's pose", durationSec: 60 },
  { name: 'Thread-the-needle', durationSec: 45, note: 'per kant' },
  { name: 'Forward fold', durationSec: 45 },
  { name: 'Staande zijwaartse rek (side-bend)', durationSec: 30, note: 'per kant' },
];

// Daily routines, independent of whatever training session is planned —
// shown every day on Today, not tied to a session log.
export const MORNING_ROUTINE: Stretch[] = [
  { name: 'Kattenrug / koeienrug (cat-cow)', durationSec: 45, note: 'wakkert de wervelkolom wakker' },
  { name: 'Staande forward fold', durationSec: 30, note: 'rustig opbouwen, knieën licht gebogen' },
  { name: 'Nekrollen', durationSec: 20 },
  { name: 'Schouderrollen', durationSec: 20 },
  { name: 'Staande zijwaartse rek (side-bend)', durationSec: 20, note: 'per kant' },
  { name: 'Rustige torso-rotatie', durationSec: 30 },
];

export const EVENING_ROUTINE: Stretch[] = [
  { name: "Child's pose", durationSec: 60 },
  { name: 'Zittende forward fold', durationSec: 45 },
  { name: 'Figure-four liggend', durationSec: 45, note: 'per kant' },
  { name: 'Nek zij-buiging (oor naar schouder)', durationSec: 25, note: 'per kant' },
  { name: 'Liggende torso-twist', durationSec: 30, note: 'per kant' },
  { name: 'Benen tegen de muur (legs-up-the-wall)', durationSec: 120, note: 'rustig ademhalen, ontspanning' },
];

export interface ProblemAreaGroup {
  id: string;
  label: string;
  stretches: Stretch[];
}

export const PROBLEM_AREAS: ProblemAreaGroup[] = [
  {
    id: 'nek',
    label: 'Nek stijf',
    stretches: [
      { name: 'Zij-buiging (oor naar schouder)', durationSec: 25, note: 'per kant' },
      { name: 'Kin intrekken (chin tuck)', durationSec: 20 },
      { name: 'Rotatie links/rechts', durationSec: 25, note: 'per kant' },
      { name: 'Levator scapulae-stretch (hoofd 45° draaien + buigen)', durationSec: 30, note: 'per kant' },
    ],
  },
  {
    id: 'schouders',
    label: 'Schouders / bovenrug',
    stretches: [
      { name: 'Cross-body schouderstretch', durationSec: 45, note: 'per kant' },
      { name: 'Schouderrollen', durationSec: 30 },
      { name: "Child's pose", durationSec: 60 },
      { name: 'Thread-the-needle', durationSec: 45, note: 'per kant' },
    ],
  },
  {
    id: 'onderrug',
    label: 'Onderrug',
    stretches: [
      { name: 'Kattenrug / koeienrug (cat-cow)', durationSec: 45 },
      { name: "Child's pose", durationSec: 60 },
      { name: 'Pelvic tilt (bekkenkanteling)', durationSec: 30 },
    ],
  },
  {
    id: 'kuiten',
    label: 'Kuiten / Achillespees',
    stretches: [
      { name: 'Staande kuitstretch tegen muur (knie gestrekt)', durationSec: 45, note: 'per kant' },
      { name: 'Staande kuitstretch tegen muur (knie gebogen)', durationSec: 45, note: 'per kant' },
    ],
  },
  {
    id: 'heup',
    label: 'Heup / IT-band',
    stretches: [
      { name: '90/90 heuprotatie', durationSec: 45, note: 'per kant' },
      { name: 'Figure-four liggend', durationSec: 45, note: 'per kant' },
      { name: 'Dynamic pigeon', durationSec: 45, note: 'per kant' },
    ],
  },
  {
    id: 'bilspieren',
    label: 'Bilspieren / piriformis',
    stretches: [
      { name: 'Figure-four zittend (op stoel)', durationSec: 45, note: 'per kant' },
      { name: 'Figure-four liggend', durationSec: 45, note: 'per kant' },
    ],
  },
  {
    id: 'hamstrings',
    label: 'Hamstrings',
    stretches: [
      { name: 'Forward fold', durationSec: 45 },
      { name: 'Liggende hamstringstretch (met band)', durationSec: 45, note: 'per kant' },
    ],
  },
  {
    id: 'quadriceps',
    label: 'Quadriceps',
    stretches: [
      { name: 'Staande quadstretch (evt. met band)', durationSec: 45, note: 'per kant' },
      { name: 'Liggende quadstretch (met band)', durationSec: 45, note: 'per kant' },
    ],
  },
  {
    id: 'polsen',
    label: 'Polsen / onderarmen',
    stretches: [
      { name: 'Pols flexie/extensie-stretch', durationSec: 30, note: 'per kant' },
      { name: 'Palm-tegen-palm rek', durationSec: 30 },
    ],
  },
];

export const STRETCH_GENERAL_ADVICE = [
  'Nooit bouncen — rustig en gecontroleerd bewegen.',
  'Adem rustig door tijdens het aanhouden van een stretch.',
  'Bij pijn (niet lichte spanning) direct stoppen.',
  'Stretch pas als de spieren warm zijn — na een korte warming-up of aan het eind van de training.',
  'Stretchen voorkomt spierpijn (DOMS) niet aantoonbaar, maar verbetert wel mobiliteit en gewrichtsfunctie op lange termijn.',
];

export const STRETCH_SOURCE_NOTE = 'Bron: Mayo Clinic — dynamisch stretchen vóór het sporten, statisch stretchen erna.';
