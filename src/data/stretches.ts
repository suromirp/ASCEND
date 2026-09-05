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
// stretching afterward, once muscles are warm. Every videoUrl below points
// to a short (~1-2 min where available) demonstration-only clip from a
// hospital, physiotherapy, or established movement-coaching channel — see
// STRETCH_SOURCE_NOTE for the two corrections this pass made (IT-band
// naming, full neck rolls) and where the four newly added items came from.

import type { Stretch } from '../models/training';

export const DYNAMIC_WARMUP: Stretch[] = [
  { name: 'Beenzwaaien (voor-achter en zijwaarts)', durationSec: 30, note: 'per been', videoUrl: 'https://www.youtube.com/watch?v=EBmvMaPc1kg' },
  { name: 'Wandelende lunges', durationSec: 60, note: 'activeert bilspieren en quads', videoUrl: 'https://www.youtube.com/watch?v=4KprDo5DT-Q' },
  { name: 'Lichte bodyweight squats', durationSec: 45, videoUrl: 'https://www.youtube.com/watch?v=m0GcZ24pK6k' },
  { name: 'Armcirkels', durationSec: 20, videoUrl: 'https://www.youtube.com/watch?v=YQMidmi9pb4' },
  { name: 'Schouderrollen', durationSec: 20, videoUrl: 'https://www.youtube.com/watch?v=Bv8QPOs7xks' },
  { name: 'Knieheffingen (marcheren met hoge knieën)', durationSec: 45, videoUrl: 'https://www.youtube.com/watch?v=MKusQlu6rYU' },
  { name: "World's Greatest Stretch (lunge + rotatie)", durationSec: 60, note: 'hamstrings, heupbuigers, borst, schouders — telt als complete warming-up', videoUrl: 'https://www.youtube.com/shorts/ftLV1SkpWAA' },
  { name: 'Wandbrug / kuit-activatie', durationSec: 30, note: 'lichte kuitrek in beweging', videoUrl: 'https://www.youtube.com/watch?v=tPGEUBtiC9g' },
];

export const COOLDOWN_UPPER: Stretch[] = [
  { name: 'Deurpost borststretch', durationSec: 45, note: 'per kant', videoUrl: 'https://www.youtube.com/watch?v=xh07rHWLtkc' },
  { name: 'Lat-stretch (zijwaartse reik, hangend)', durationSec: 45, note: 'per kant', videoUrl: 'https://www.youtube.com/watch?v=x1SdnOkQoo0' },
  { name: 'Overhead triceps-stretch', durationSec: 45, note: 'per kant', videoUrl: 'https://www.youtube.com/watch?v=MWzR-WE_nhU' },
  { name: 'Cross-body schouderstretch', durationSec: 45, note: 'per kant', videoUrl: 'https://www.youtube.com/watch?v=KrBCD8Hv-fk' },
];

export const COOLDOWN_LOWER: Stretch[] = [
  { name: 'Staande quadstretch', durationSec: 45, note: 'per kant', videoUrl: 'https://www.youtube.com/watch?v=U_6sQ38wChM' },
  { name: 'Liggende hamstringstretch (met band)', durationSec: 45, note: 'per kant', videoUrl: 'https://www.youtube.com/watch?v=Il1L75v6gq0' },
  { name: 'Hip flexor-stretch (lunge-stretch)', durationSec: 45, note: 'per kant', videoUrl: 'https://www.youtube.com/watch?v=DXuStgWuJV8' },
  { name: 'Piriformis-stretch (figure-four liggend)', durationSec: 45, note: 'per kant', videoUrl: 'https://www.youtube.com/watch?v=WmRfU23f-fM' },
];

export const COOLDOWN_RUN: Stretch[] = [
  { name: 'Staande kuitstretch tegen muur (knie gestrekt)', durationSec: 45, note: 'per kant', videoUrl: 'https://www.youtube.com/watch?v=y01ri_43G50' },
  { name: 'Staande kuitstretch tegen muur (knie gebogen)', durationSec: 45, note: 'per kant', videoUrl: 'https://www.youtube.com/watch?v=kNm6qFnOiIw' },
  { name: 'Hip flexor-stretch (lunge-stretch)', durationSec: 45, note: 'per kant', videoUrl: 'https://www.youtube.com/watch?v=DXuStgWuJV8' },
  // Renamed from "IT-band stretch" — the IT-band itself barely changes in
  // acute stiffness from stretching/rolling; this targets TFL/lateral hip
  // tissue instead, which is what the movement actually reaches.
  { name: 'TFL / laterale-heupstretch (cross-leg side reach)', durationSec: 45, note: 'per kant', videoUrl: 'https://www.youtube.com/shorts/OOM_6DPQTMQ' },
];

export const COOLDOWN_RECOVERY: Stretch[] = [
  { name: 'Kattenrug / koeienrug (cat-cow)', durationSec: 45, videoUrl: 'https://youtu.be/muQ0luAlGKI' },
  { name: "Child's pose", durationSec: 60, videoUrl: 'https://www.youtube.com/watch?v=LZgABs0IggM' },
  { name: 'Thread-the-needle', durationSec: 45, note: 'per kant', videoUrl: 'https://www.youtube.com/watch?v=6roMIB2YV4Y' },
  { name: 'Forward fold', durationSec: 45, videoUrl: 'https://www.youtube.com/watch?v=cyVochkrbs0' },
  { name: 'Staande zijwaartse rek (side-bend)', durationSec: 30, note: 'per kant', videoUrl: 'https://www.youtube.com/watch?v=IpyxmlAp4jo' },
];

// Daily routines, independent of whatever training session is planned —
// shown every day on Today, not tied to a session log.
export const MORNING_ROUTINE: Stretch[] = [
  { name: 'Kattenrug / koeienrug (cat-cow)', durationSec: 45, note: 'wakkert de wervelkolom wakker', videoUrl: 'https://youtu.be/muQ0luAlGKI' },
  { name: 'Staande forward fold', durationSec: 30, note: 'rustig opbouwen, knieën licht gebogen', videoUrl: 'https://www.youtube.com/watch?v=cyVochkrbs0' },
  // Renamed from "Nekrollen" — grote, snelle volledige nekrollen worden
  // afgeraden; gecontroleerde rotatie is beter doseerbaar en stopt bij
  // duizeligheid/tintelingen in plaats van door te draaien.
  { name: 'Gecontroleerde nekrotatie', durationSec: 20, note: 'vervangt volledige nekrollen', videoUrl: 'https://www.youtube.com/watch?v=yPtjB3G9fPs' },
  { name: 'Schouderrollen', durationSec: 20, videoUrl: 'https://www.youtube.com/watch?v=Bv8QPOs7xks' },
  { name: 'Staande zijwaartse rek (side-bend)', durationSec: 20, note: 'per kant', videoUrl: 'https://www.youtube.com/watch?v=IpyxmlAp4jo' },
  { name: 'Rustige torso-rotatie', durationSec: 30, videoUrl: 'https://www.youtube.com/watch?v=zarXa4vjrxw' },
];

export const EVENING_ROUTINE: Stretch[] = [
  { name: "Child's pose", durationSec: 60, videoUrl: 'https://www.youtube.com/watch?v=LZgABs0IggM' },
  { name: 'Zittende forward fold', durationSec: 45, videoUrl: 'https://www.youtube.com/shorts/imptdV-1wKY' },
  { name: 'Figure-four liggend', durationSec: 45, note: 'per kant', videoUrl: 'https://www.youtube.com/watch?v=WmRfU23f-fM' },
  { name: 'Nek zij-buiging (oor naar schouder)', durationSec: 25, note: 'per kant', videoUrl: 'https://www.youtube.com/watch?v=UUXUVFQS5u0' },
  { name: 'Liggende torso-twist', durationSec: 30, note: 'per kant', videoUrl: 'https://www.youtube.com/watch?v=fHRXXGxUxX8' },
  { name: 'Benen tegen de muur (legs-up-the-wall)', durationSec: 120, note: 'rustig ademhalen, ontspanning', videoUrl: 'https://www.youtube.com/watch?v=_OQEIiZLY-0' },
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
      { name: 'Zij-buiging (oor naar schouder)', durationSec: 25, note: 'per kant', videoUrl: 'https://www.youtube.com/watch?v=UUXUVFQS5u0' },
      { name: 'Kin intrekken (chin tuck)', durationSec: 20, videoUrl: 'https://www.youtube.com/watch?v=lvXZQHSMiLk' },
      { name: 'Rotatie links/rechts', durationSec: 25, note: 'per kant', videoUrl: 'https://www.youtube.com/watch?v=yPtjB3G9fPs' },
      { name: 'Levator scapulae-stretch (hoofd 45° draaien + buigen)', durationSec: 30, note: 'per kant', videoUrl: 'https://www.youtube.com/watch?v=SFlsgvQ7F3g' },
    ],
  },
  {
    id: 'schouders',
    label: 'Schouders / bovenrug',
    stretches: [
      { name: 'Cross-body schouderstretch', durationSec: 45, note: 'per kant', videoUrl: 'https://www.youtube.com/watch?v=KrBCD8Hv-fk' },
      { name: 'Schouderrollen', durationSec: 30, videoUrl: 'https://www.youtube.com/watch?v=Bv8QPOs7xks' },
      { name: "Child's pose", durationSec: 60, videoUrl: 'https://www.youtube.com/watch?v=LZgABs0IggM' },
      { name: 'Thread-the-needle', durationSec: 45, note: 'per kant', videoUrl: 'https://www.youtube.com/watch?v=6roMIB2YV4Y' },
      // New — gerichte scapulaire controle, weinig aanwezig in de rest van de bibliotheek.
      { name: 'Scapular wall slides', durationSec: 30, note: 'controle, geen stretch', videoUrl: 'https://www.youtube.com/watch?v=Eaj_NG5_hIo' },
    ],
  },
  {
    id: 'onderrug',
    label: 'Onderrug',
    stretches: [
      { name: 'Kattenrug / koeienrug (cat-cow)', durationSec: 45, videoUrl: 'https://youtu.be/muQ0luAlGKI' },
      { name: "Child's pose", durationSec: 60, videoUrl: 'https://www.youtube.com/watch?v=LZgABs0IggM' },
      { name: 'Pelvic tilt (bekkenkanteling)', durationSec: 30, videoUrl: 'https://youtu.be/n2cpk6o-6_w' },
    ],
  },
  {
    id: 'kuiten',
    label: 'Kuiten / Achillespees',
    stretches: [
      { name: 'Staande kuitstretch tegen muur (knie gestrekt)', durationSec: 45, note: 'per kant', videoUrl: 'https://www.youtube.com/watch?v=y01ri_43G50' },
      { name: 'Staande kuitstretch tegen muur (knie gebogen)', durationSec: 45, note: 'per kant', videoUrl: 'https://www.youtube.com/watch?v=kNm6qFnOiIw' },
      // New — enkel-dorsiflexie en tibialis ontbraken in de originele bibliotheek.
      { name: 'Knee-to-wall ankle rocks (enkel-dorsiflexie)', durationSec: 30, note: 'per enkel', videoUrl: 'https://www.youtube.com/shorts/YCKhLjR6ZPw' },
      { name: 'Toe raises / tibialis raises', durationSec: 30, videoUrl: 'https://www.youtube.com/watch?v=L91Sd9Dv0kU' },
    ],
  },
  {
    id: 'heup',
    label: 'Heup / IT-band',
    stretches: [
      { name: '90/90 heuprotatie', durationSec: 45, note: 'per kant', videoUrl: 'https://www.youtube.com/watch?v=f_7qIPxw6nE' },
      { name: 'Figure-four liggend', durationSec: 45, note: 'per kant', videoUrl: 'https://www.youtube.com/watch?v=WmRfU23f-fM' },
      { name: 'Dynamic pigeon', durationSec: 45, note: 'per kant', videoUrl: 'https://www.youtube.com/watch?v=nMBjRbv9624' },
      // New — adductor-mobiliteit was nauwelijks apart aanwezig.
      { name: 'Adductor rock-back', durationSec: 30, note: 'per kant', videoUrl: 'https://www.youtube.com/watch?v=uZyLZDxcD38' },
    ],
  },
  {
    id: 'bilspieren',
    label: 'Bilspieren / piriformis',
    stretches: [
      { name: 'Figure-four zittend (op stoel)', durationSec: 45, note: 'per kant', videoUrl: 'https://www.youtube.com/watch?v=2E8WWX4cOc4' },
      { name: 'Figure-four liggend', durationSec: 45, note: 'per kant', videoUrl: 'https://www.youtube.com/watch?v=WmRfU23f-fM' },
    ],
  },
  {
    id: 'hamstrings',
    label: 'Hamstrings',
    stretches: [
      { name: 'Forward fold', durationSec: 45, videoUrl: 'https://www.youtube.com/watch?v=cyVochkrbs0' },
      { name: 'Liggende hamstringstretch (met band)', durationSec: 45, note: 'per kant', videoUrl: 'https://www.youtube.com/watch?v=Il1L75v6gq0' },
    ],
  },
  {
    id: 'quadriceps',
    label: 'Quadriceps',
    stretches: [
      { name: 'Staande quadstretch (evt. met band)', durationSec: 45, note: 'per kant', videoUrl: 'https://www.youtube.com/watch?v=U_6sQ38wChM' },
      { name: 'Liggende quadstretch (met band)', durationSec: 45, note: 'per kant', videoUrl: 'https://www.youtube.com/watch?v=lJ5Raevn8js' },
    ],
  },
  {
    id: 'polsen',
    label: 'Polsen / onderarmen',
    stretches: [
      { name: 'Polsflexie-stretch', durationSec: 20, note: 'per kant', videoUrl: 'https://youtu.be/_jeQIFYzJks' },
      { name: 'Polsextensie-stretch', durationSec: 20, note: 'per kant', videoUrl: 'https://youtu.be/uApyGT1Rpjo' },
      { name: 'Palm-tegen-palm rek', durationSec: 30, videoUrl: 'https://www.youtube.com/watch?v=p2n4OVhV_ng' },
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

export const STRETCH_SOURCE_NOTE = 'Bron: Mayo Clinic — dynamisch stretchen vóór het sporten, statisch stretchen erna. Video’s: ziekenhuizen, fysiotherapie-kanalen en Special Olympics; "IT-band stretch" is hernoemd naar TFL/laterale-heupstretch en volledige nekrollen zijn vervangen door gecontroleerde nekrotatie, beide op basis van de onderliggende bewegingswetenschap.';
