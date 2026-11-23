// ASCEND: één getal voor de stijging van een loop, overal hetzelfde (I-77).
// Besluit: docs/beslissingen/2026-11-23-hoogte-en-ziek-signalen.md.
//
// Een log van het horloge heeft twee getallen: de samenvatting van het horloge op het log
// (`elevationGainM`, via intervals.icu) en de eigen telling uit de reeks (`detail.slices`,
// `runDetail.kms`). Ze verschillen: een log van voor 12 november 2026 is geteld met de oude dode
// band die elke klim te laag telde, en ook de teller van nu ligt er een paar meter naast.
//
// De regel: het getal van het horloge is het totaal, tenzij het niet te geloven is (een 0, of ver
// van de eigen telling volgens `watchClimbTrusted`); dan de eigen telling. De km in Run in detail
// tellen samen op tot dat totaal: ze worden naar verhouding geschaald, alleen om te tonen. De
// opgeslagen km blijven zoals ze zijn (historie), en regels met een grens op de eigen stijging
// blijven het veld zelf lezen, met zijn merk (`climbLimitFor`).
//
// Puur: geen React, geen IndexedDB.

import type { SessionLog } from '../models/training';
import type { RunDetail, RunKm } from '../models/runDetail';
import { gainDisagreement, gainSidesFor, ownGainOf, type GainSide } from './elevation';

// Is het getal van het horloge op dit log te geloven? Een 0 is geen meting (een horloge met hoogte
// meldt op een loop vrijwel nooit precies niets, een horloge zonder hoogte wel). Verder de
// overeenkomst met de eigen telling van het profiel (engine/elevation.ts#gainDisagreement: buiten
// 60 tot 140 procent en ook 20 m of meer uit elkaar, want in vlak land zeggen procenten weinig),
// gelezen met het merk van `detail`: de teller van engine/elevation.ts ligt dicht bij het horloge,
// dus ver uiteen is het horloge niet te vertrouwen. De oude dode band telde altijd te laag: een
// lage overeenkomst zegt daar niets over het horloge, alleen een te hoge.
export const WATCH_CLIMB_DISTRUST: { old: readonly GainSide[]; counted: readonly GainSide[] } = { old: ['high'], counted: ['low', 'high'] };

export function watchClimbTrusted(log: Pick<SessionLog, 'detail'>, reported: number | undefined): reported is number {
  if (reported === undefined || !Number.isFinite(reported) || reported <= 0) return false;
  const detail = log.detail;
  if (!detail) return true;
  const apart = gainDisagreement(detail.quality.gainAgreementPct, ownGainOf(detail), reported);
  return apart === undefined || !gainSidesFor(detail.counter, WATCH_CLIMB_DISTRUST).includes(apart);
}

const sumOf = (pieces: readonly { gainM?: number }[]): number | undefined =>
  pieces.some((p) => p.gainM !== undefined) ? pieces.reduce((n, p) => n + (p.gainM ?? 0), 0) : undefined;
const lossOf = (pieces: readonly { lossM?: number }[]): number | undefined =>
  pieces.some((p) => p.lossM !== undefined) ? pieces.reduce((n, p) => n + (p.lossM ?? 0), 0) : undefined;

// De eigen telling: de km van Run in detail als die er zijn (dat zie je), anders het profiel.
function ownGain(log: SessionLog): number | undefined {
  const fromKms = log.runDetail ? sumOf(log.runDetail.kms) : undefined;
  if (fromKms !== undefined) return fromKms;
  return log.detail && log.detail.slices.length > 0 ? ownGainOf(log.detail) : undefined;
}

export interface RunClimb {
  gainM: number;
  // 'log': het getal op het log (van het horloge of met de hand); 'own': de eigen telling uit de reeks.
  from: 'log' | 'own';
}

// De stijging van een training, voor elke plek die hem noemt: het logblad, afronden en Run in detail.
export function runClimb(log: SessionLog): RunClimb | undefined {
  const reported = (log.cardioData ?? log.outdoorData)?.elevationGainM;
  if (watchClimbTrusted(log, reported)) return { gainM: reported, from: 'log' };
  const own = ownGain(log);
  if (own !== undefined) return { gainM: own, from: 'own' };
  return reported !== undefined && Number.isFinite(reported) ? { gainM: reported, from: 'log' } : undefined;
}

// De stijging in de regel van een log in het Logboek: hetzelfde getal als het logblad, met
// "(geschat)" alleen als het getal op het log geschat is. Totalen (de maand, per sport, de week)
// tellen het getal op het log op en vallen hier niet onder.
export function climbOfLine(log: SessionLog): { elevationGainM?: number; elevationEstimated?: boolean } {
  const climb = runClimb(log);
  if (!climb) return {};
  return { elevationGainM: climb.gainM, elevationEstimated: climb.from === 'log' && !!(log.cardioData ?? log.outdoorData)?.estimatedElevation };
}

// Met welke factor de km van Run in detail de stijging (en de daling) van het log volgen. 1 als het
// totaal de eigen telling is, als er geen eigen stijging is om te schalen, of als de km bij andere
// totalen horen dan het log nu heeft.
export function climbScale(log: SessionLog): { gain: number; loss: number } {
  const one = { gain: 1, loss: 1 };
  const rd = log.runDetail;
  const d = log.cardioData ?? log.outdoorData;
  if (!rd || !d) return one;
  if (d.distanceKm !== undefined && Math.abs(rd.wholeKm - d.distanceKm) > 0.05) return one;
  const climb = runClimb(log);
  const own = sumOf(rd.kms);
  if (!climb || climb.from !== 'log' || own === undefined || !(own > 0)) return one;
  const ownLoss = lossOf(rd.kms);
  const watchLoss = d.elevationLossM;
  const loss = watchLoss !== undefined && watchLoss > 0 && ownLoss !== undefined && ownLoss > 0 ? watchLoss / ownLoss : 1;
  return { gain: climb.gainM / own, loss };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function scalePiece<T extends Pick<RunKm, 'gainM' | 'lossM'>>(p: T, s: { gain: number; loss: number }): T {
  return {
    ...p,
    ...(p.gainM !== undefined ? { gainM: round1(p.gainM * s.gain) } : {}),
    ...(p.lossM !== undefined ? { lossM: round1(p.lossM * s.loss) } : {}),
  };
}

// Een kopie van Run in detail met de km, rondes en de beste 5 km op de schaal van het totaal.
// Alleen om te tonen: nooit opslaan.
export function withClimbScale(rd: RunDetail, s: { gain: number; loss: number }): RunDetail {
  if (s.gain === 1 && s.loss === 1) return rd;
  return {
    ...rd,
    kms: rd.kms.map((k) => scalePiece(k, s)),
    ...(rd.laps ? { laps: rd.laps.map((l) => scalePiece(l, s)) } : {}),
    ...(rd.bestFive ? { bestFive: { ...rd.bestFive, kms: rd.bestFive.kms.map((k) => scalePiece(k, s)) } } : {}),
  };
}

// De twee kanten van Run in detail. `shown` is voor de getallen op het scherm (kop Stijging, de km,
// de rondes, de bladen per km of ronde). `rules` zijn de opgeslagen km, voor elk oordeel met een
// grens op de eigen stijging (runVerdict, runPatterns, runAdvice, compareWithSimilar, formKeysOf):
// die grenzen lezen het merk van de telling (climbLimitFor) en horen bij de ongeschaalde km.
export function runDetailViews(log: SessionLog, rd: RunDetail): { shown: RunDetail; rules: RunDetail } {
  return { shown: withClimbScale(rd, climbScale(log)), rules: rd };
}
