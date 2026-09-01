// General Garmin reference content — deliberately separate from
// data/trainingGuide.ts because none of this is specific to one training
// day (Easy Run and Bergconditie's guides link here rather than repeating
// it). Shown on pages/GarminGuide.tsx.
//
// The personal HR figures below (Max HR / LTHR / resting HR) are the
// user's own — ASCEND is a single-user, local-only, personal app per
// CLAUDE.md, so baking in their real training numbers here is the same
// kind of content as the rest of the program, not a privacy concern.

export interface GuideSource {
  label: string;
  url?: string;
}

export const GARMIN_PERSONAL_DATA = {
  maxHr: 204,
  lthr: 178,
  restingHr: 49,
};

export interface GuideCard {
  heading: string;
  body?: string;
  items?: string[];
  note?: string;
}

export const GARMIN_ZONE_SETUP: GuideCard = {
  heading: 'HARTSLAGZONES INSTELLEN',
  body: `Sport Heart Rate → Running → Based on %LTHR, met LTHR ${GARMIN_PERSONAL_DATA.lthr} bpm. Voor hardlopen geven sportspecifieke zones op basis van %LTHR een preciezer beeld dan alleen generieke %Max HR-zones. Laat Max HR- en LTHR automatic detection aan staan zodat Garmin nieuwe betrouwbare waarden kan voorstellen na voldoende activiteiten — de lactaatdrempelmeting vereist wel een compatibele borstband.`,
  note: `Bekende waarden: Max HR ${GARMIN_PERSONAL_DATA.maxHr} bpm · LTHR ${GARMIN_PERSONAL_DATA.lthr} bpm · Resting HR ${GARMIN_PERSONAL_DATA.restingHr} bpm. Gebruik hartslag niet als enige waarheid — een percentagezone is niet hetzelfde als een laboratoriummeting van je aerobe drempel. Talk test + RPE + HR samen blijven de beste praktische combinatie.`,
};

export const GARMIN_STRAP_USAGE: GuideCard = {
  heading: 'BORSTBAND GEBRUIKEN BIJ',
  items: ['Easy Run', 'toekomstige tempo runs', 'toekomstige intervallen', 'incline treadmill', 'serieuze hikes wanneer HR-data belangrijk is'],
  body: 'Niet noodzakelijk bij een casual wandeling, normale dagelijkse stappen of een rustdag — het horloge alleen is daar voldoende.',
  note: 'Voor trainingssturing heeft de borstband de voorkeur boven de polssensor: elektroden licht vochtig maken, strak en direct tegen de huid, en vóór de activiteit controleren of de sensor verbonden is.',
};

export const GARMIN_DATA_SCREENS: GuideCard = {
  heading: 'DATASCHERMEN PER ACTIVITEIT',
  items: [
    'Easy Run — hoofdscherm: timer, hartslag, hartslagzone, tempo. Tweede scherm: afstand, gem. HR, gem. tempo, cadans.',
    'Bergconditie (indoor) — gebruik Treadmill/Indoor Walking of maak een custom activity "Bergconditie" met eigen dataschermen.',
    'Bergconditie (buiten) — met GPS: afstand, Total Ascent, Total Descent, hartslag, RPE.',
  ],
  note: 'Garmin weet niet dat de treadmill bijvoorbeeld op 12% staat — Total Ascent is daarom geen betrouwbare D+-bron indoor. Gebruik Ascend\'s eigen schatting (afstand × helling%) in plaats daarvan. Bij treadmill running kan de Forerunner na minimaal 2,4 km handmatig gekalibreerd worden op de afstand van de treadmill.',
};

export const GARMIN_METRICS: GuideCard = {
  heading: 'METRICS INTERPRETEREN',
  items: [
    'Hartslag/zones — primair voor cardio-intensiteit.',
    'Training Effect — Garmins schatting van het effect van een sessie op aerobe/anaerobe fitness. Gebruik dit achteraf als context, niet als doel tijdens de training.',
    'Training Load — kijk naar de trend om grote veranderingen in totale duurbelasting te herkennen, niet naar één losse waarde.',
    'Recovery Time — een indicatie voor de volgende harde training, geen verplichte rusttimer.',
    'HRV Status — vooral de trend over meerdere dagen t.o.v. je eigen langdurige baseline volgen.',
    'Resting HR — de trend is belangrijker dan één losse ochtend.',
    'VO₂max — een langetermijnindicator; niet elke kleine dagelijkse verandering als echte fitnessverandering interpreteren.',
  ],
  note: 'Calorieën: niet gebruiken als nauwkeurige maat voor trainingskwaliteit of hoeveel je exact moet eten — energieverbruik wordt door wearables aanzienlijk minder betrouwbaar geschat dan hartslag.',
};

export const GARMIN_SOURCES: GuideSource[] = [
  { label: 'Garmin — support & training', url: 'https://www.garmin.com' },
  { label: 'PubMed — wetenschappelijke literatuur', url: 'https://pubmed.ncbi.nlm.nih.gov' },
];
