// ASCEND: de rugzakladder: hoeveel kilo je in welke week draagt.
//
// De GR5 met tent vraagt 12 tot 15 kg op je rug. Voeten, huid, schouders en
// heupen wennen daar trager aan dan je conditie (docs/visie/Trainingswetenschap.md,
// idee 2), dus het gewicht begint deze winter licht en klimt in kleine stappen
// naar het rugzakdoel van je doel:
//
// - de winter (Basis en Opbouw): ongeveer 5 tot 6,5 kg in rugzakwandelingen;
// - in Bergcapaciteit en Expeditieklaar stappen van 1 tot 2 kg per 1 tot 2
//   weken, gerekend vanaf de zwaarste weken terug;
// - de zwaarste weken zitten tot 1 kg boven het doel (een volle tent met eten
//   voor meer dagen weegt bij vertrek meer dan het gemiddelde);
// - rugzak en hoogtemeters gaan nooit in dezelfde week omhoog (Orr e.a. 2021:
//   een variabele tegelijk); in een week waarin de hoogtemeters stijgen
//   blijft het gewicht staan;
// - een rustweek is 2 kg lichter, de afbouw voor de start lichter dan de piek.
//
// Het doelgewicht komt uit het doel (programPackTarget in gr5Profile.ts,
// bewaard op Program.packTargetKg); niets hier is gekoppeld aan 14 kg.
//
// Puur: geen React, geen opslag, geen imports. De aanroeper
// (engine/programLayout.ts) vertaalt het programma naar LadderWeek's.

export const PACK_START_KG = 5; // de eerste rugzakwandelingen van de winter
export const PACK_HIKE_ENTRY_KG = 7; // de eerste bergtocht, bij een doel van 14 kg
export const PACK_PEAK_OVER_KG = 1; // de zwaarste weken: tot 1 kg boven het doel
export const PACK_MIN_STEP_KG = 1;
export const PACK_MAX_STEP_KG = 2;
export const PACK_REST_DROP_KG = 2;
export const PACK_FLOOR_KG = 4; // lichter dan dit is geen rugzak meer
// Eerste en tweede week van de afbouw: zoveel onder de piek.
export const PACK_TAPER_DROPS_KG = [3, 6];
// In de winter een halve kilo per drie wekelijkse stappen: 5 kg in het begin,
// 6 tot 6,5 kg vlak voor Bergcapaciteit.
const WINTER_KG_PER_BUILD_WEEK = 1 / 3;

export type LadderWeekKind = 'build' | 'rest' | 'taper';

export interface LadderWeek {
  kind: LadderWeekKind;
  // De week heeft een bergtocht op de wandelladder (Bergcapaciteit,
  // Expeditieklaar), geen gewone opbouwweek van de winter.
  hike: boolean;
  // De hoogtemeters van deze week liggen hoger dan die van de vorige
  // opbouwweek: het gewicht blijft dan staan.
  elevationRises: boolean;
}

const round05 = (kg: number) => Math.round(kg * 2) / 2;
const ceil05 = (kg: number) => Math.ceil(kg * 2) / 2;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// Het rugzakgewicht per programmaweek (zelfde volgorde als `weeks`), in
// halve kilo's, voor een rugzakdoel van `targetKg`.
export function packLadder(weeks: LadderWeek[], targetKg: number): number[] {
  const target = Number.isFinite(targetKg) && targetKg > 0 ? targetKg : PACK_START_KG;
  const start = round05(Math.min(PACK_START_KG, target));
  const floor = Math.min(PACK_FLOOR_KG, start);
  const peak = round05(target + PACK_PEAK_OVER_KG);
  const kg: number[] = new Array(weeks.length).fill(start);
  const builds = weeks.map((w, i) => (w.kind === 'build' ? i : -1)).filter((i) => i >= 0);
  const hikes = builds.filter((i) => weeks[i].hike);

  if (hikes.length > 0) {
    // Vanaf de piek terug: in elke week waarin de hoogtemeters stil blijven
    // ging het gewicht één stap omhoog, in de andere weken niet. Zo klopt de
    // regel "nooit allebei" vanzelf, en de stap volgt uit hoeveel er te
    // klimmen valt: van de eerste bergtocht naar de piek.
    const allowed = (j: number) => !weeks[hikes[j]].elevationRises;
    let steps = 0;
    for (let j = 1; j < hikes.length; j++) if (allowed(j)) steps++;
    const step = steps === 0 ? 0 : clamp(ceil05((peak - PACK_HIKE_ENTRY_KG) / steps), PACK_MIN_STEP_KG, PACK_MAX_STEP_KG);
    let level = peak;
    for (let j = hikes.length - 1; j >= 0; j--) {
      kg[hikes[j]] = Math.max(start, round05(level));
      if (j > 0 && allowed(j)) level -= step;
    }

    // De opbouwweken voor de eerste bergtocht: de winter, rustig oplopend naar
    // de eerste bergtocht (bij een groot doel eerder en met 1 kg per week).
    const entry = kg[hikes[0]];
    let back = 0;
    for (let b = builds.indexOf(hikes[0]) - 1; b >= 0; b--) {
      back++;
      const winter = PACK_HIKE_ENTRY_KG - back * WINTER_KG_PER_BUILD_WEEK;
      kg[builds[b]] = Math.max(start, Math.min(entry, round05(Math.max(winter, entry - back * PACK_MIN_STEP_KG))));
    }

    // Een opbouwweek tussen twee bergtochten zonder bergtocht van zichzelf
    // houdt het gewicht van de week ervoor.
    for (let b = builds.indexOf(hikes[0]) + 1; b < builds.length; b++) {
      const i = builds[b];
      if (i < hikes[hikes.length - 1] && !weeks[i].hike) kg[i] = kg[builds[b - 1]];
    }

    // Opbouwweken na de laatste bergtocht (geen doeldatum: Onderhoud): het doel.
    for (const i of builds) if (i > hikes[hikes.length - 1]) kg[i] = Math.min(peak, round05(target));
  }

  // Veiligheidsnet, in volgorde van de weken: geen stap omhoog in een week
  // met meer hoogtemeters, en nooit een grotere stap dan 2 kg.
  let previous: number | undefined;
  for (const i of builds) {
    if (previous !== undefined) {
      if (weeks[i].hike && weeks[i].elevationRises && kg[i] > previous) kg[i] = previous;
      if (kg[i] > previous + PACK_MAX_STEP_KG) kg[i] = previous + PACK_MAX_STEP_KG;
    }
    previous = kg[i];
  }

  // Rustweken en afbouw hangen aan de opbouwweken, dus nu pas.
  const lastHike = hikes.length > 0 ? kg[hikes[hikes.length - 1]] : undefined;
  let lastBuild = start;
  let taperIndex = 0;
  weeks.forEach((w, i) => {
    if (w.kind === 'build') {
      lastBuild = kg[i];
    } else if (w.kind === 'rest') {
      kg[i] = round05(Math.max(floor, lastBuild - PACK_REST_DROP_KG));
    } else {
      const drop = PACK_TAPER_DROPS_KG[Math.min(taperIndex, PACK_TAPER_DROPS_KG.length - 1)];
      kg[i] = round05(Math.max(floor, (lastHike ?? lastBuild) - drop));
      taperIndex++;
    }
  });
  return kg;
}
