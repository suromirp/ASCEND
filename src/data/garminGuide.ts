// General Garmin reference content — deliberately separate from
// data/trainingGuide.ts because none of this is specific to one training
// day (Easy Run and Bergconditie's guides link here rather than repeating
// it). Shown on pages/GarminGuide.tsx.
//
// The personal HR figures below (Max HR / LTHR / resting HR) are the
// user's own — ASCEND is a single-user, local-only, personal app per
// CLAUDE.md, so baking in their real training numbers here is the same
// kind of content as the rest of the program, not a privacy concern.
//
// Sources link to the exact pages the user supplied
// (trainingsschema_bronnen_urls.txt). The Garmin Forerunner 255 manual
// pages are opaque GUID URLs on a domain this environment can't fetch to
// verify, so their assignment to a specific card is inferred from the
// order they were supplied and the order the original research document
// cited Garmin for each topic, not independently confirmed.

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
  sources: GuideSource[];
}

const GARMIN_ZONES: GuideSource = { label: 'Garmin — sportspecifieke hartslagzones', url: 'https://www8.garmin.com/manuals-apac/webhelp/forerunner255series/EN-SG/GUID-21F7EFD8-1AE2-4E1A-959E-A98B6A297584-1763.html' };
const GARMIN_AUTO_DETECT: GuideSource = { label: 'Garmin — automatische Max HR/LTHR-detectie', url: 'https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/EN-GB/GUID-DAC27D10-886A-4EA8-8339-674479E9574A.html' };
const GARMIN_STRAP_PRIORITY: GuideSource = { label: 'Garmin — borstband vs. polssensor', url: 'https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/EN-US/GUID-F5BF67CE-C94E-4842-AE96-A7A05C85B732.html' };
const GARMIN_ELECTRODES: GuideSource = { label: 'Garmin — elektroden bevochtigen', url: 'https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/EN-GB/GUID-7275629E-743A-4658-A284-C84F42A66AE5.html' };
const GARMIN_CUSTOM_ACTIVITY: GuideSource = { label: 'Garmin — aangepaste activiteiten & dataschermen', url: 'https://support.garmin.com/en-GB/?faq=o3jGSobIba3z7lLLMexE16&identifier=649059&tab=topics' };
const GARMIN_INDOOR_ACCELEROMETER: GuideSource = { label: 'Garmin — indoor afstand via accelerometer', url: 'https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/NL-NL/GUID-3A4C7C6C-1FE3-4EB5-B38E-3F744A5C1F00.html' };
const GARMIN_CALIBRATION: GuideSource = { label: 'Garmin — treadmill handmatig kalibreren', url: 'https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/EN-US/GUID-25FA2988-33F2-4FC9-92FA-E457CBDB9E72.html' };
const GARMIN_ELEVATION_FIELDS: GuideSource = { label: 'Garmin — gegevensvelden Total Ascent/Descent', url: 'https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/EN-GB/GUID-86541696-B60E-44BC-9A46-4349C86A1CD8.html' };
const GARMIN_HANDRAIL: GuideSource = { label: 'Garmin — nauwkeurigheid bij treadmill-handgrepen', url: 'https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/EN-US/GUID-BDCC2C12-1D33-45DB-967B-4313BBA83BC9.html' };
const GARMIN_RECOVERY_TIME: GuideSource = { label: 'Garmin — Recovery Time', url: 'https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/EN-US/GUID-73BCE454-042E-420D-96A4-9DBA46626CD4.html' };
const PUBMED_CALORIES: GuideSource = { label: 'PubMed — wetenschappelijke literatuur', url: 'https://pubmed.ncbi.nlm.nih.gov' };

export const GARMIN_ZONE_SETUP: GuideCard = {
  heading: 'HARTSLAGZONES INSTELLEN',
  body: `Sport Heart Rate → Running → Based on %LTHR, met LTHR ${GARMIN_PERSONAL_DATA.lthr} bpm. Voor hardlopen geven sportspecifieke zones op basis van %LTHR een preciezer beeld dan alleen generieke %Max HR-zones. Laat Max HR- en LTHR automatic detection aan staan zodat Garmin nieuwe betrouwbare waarden kan voorstellen na voldoende activiteiten — de lactaatdrempelmeting vereist wel een compatibele borstband.`,
  note: `Bekende waarden: Max HR ${GARMIN_PERSONAL_DATA.maxHr} bpm · LTHR ${GARMIN_PERSONAL_DATA.lthr} bpm · Resting HR ${GARMIN_PERSONAL_DATA.restingHr} bpm. Gebruik hartslag niet als enige waarheid — een percentagezone is niet hetzelfde als een laboratoriummeting van je aerobe drempel. Talk test + RPE + HR samen blijven de beste praktische combinatie.`,
  sources: [GARMIN_ZONES, GARMIN_AUTO_DETECT],
};

export const GARMIN_STRAP_USAGE: GuideCard = {
  heading: 'BORSTBAND GEBRUIKEN BIJ',
  items: ['Easy Run', 'toekomstige tempo runs', 'toekomstige intervallen', 'incline treadmill', 'serieuze hikes wanneer HR-data belangrijk is'],
  body: 'Niet noodzakelijk bij een casual wandeling, normale dagelijkse stappen of een rustdag — het horloge alleen is daar voldoende.',
  note: 'Voor trainingssturing heeft de borstband de voorkeur boven de polssensor: elektroden licht vochtig maken, strak en direct tegen de huid, en vóór de activiteit controleren of de sensor verbonden is.',
  sources: [GARMIN_STRAP_PRIORITY, GARMIN_ELECTRODES],
};

export const GARMIN_DATA_SCREENS: GuideCard = {
  heading: 'DATASCHERMEN PER ACTIVITEIT',
  items: [
    'Easy Run — hoofdscherm: timer, hartslag, hartslagzone, tempo. Tweede scherm: afstand, gem. HR, gem. tempo, cadans.',
    'Bergconditie (indoor) — gebruik Treadmill/Indoor Walking of maak een custom activity "Bergconditie" met eigen dataschermen.',
    'Bergconditie (buiten) — met GPS: afstand, Total Ascent, Total Descent, hartslag, RPE.',
  ],
  note: 'Garmin weet niet dat de treadmill bijvoorbeeld op 12% staat — Total Ascent is daarom geen betrouwbare D+-bron indoor. Gebruik Ascend\'s eigen schatting (afstand × helling%) in plaats daarvan. Bij treadmill running kan de Forerunner na minimaal 2,4 km handmatig gekalibreerd worden op de afstand van de treadmill.',
  sources: [GARMIN_CUSTOM_ACTIVITY, GARMIN_INDOOR_ACCELEROMETER, GARMIN_CALIBRATION, GARMIN_ELEVATION_FIELDS, GARMIN_HANDRAIL],
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
  sources: [GARMIN_RECOVERY_TIME, PUBMED_CALORIES],
};
