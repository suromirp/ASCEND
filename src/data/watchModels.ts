// ASCEND: de horloges waarvoor ASCEND datapagina's kan tekenen, als data per model
// (docs/beslissingen/2026-11-09-datavelden-horloge.md, docs/onderzoek/Datavelden voor je horloge.md).
// Eerst één model. Een model erbij is een lijst erbij in WATCH_MODELS, geen verbouwing: de engine
// (engine/watchFields.ts) en het scherm lezen alleen deze vorm. Dit bestand importeert niets uit engine/.
//
// De veld-id's zijn algemeen (heartRate, lapPace), geen naam van een leverancier: een ander model
// gebruikt dezelfde id's voor hetzelfde veld en laat weg wat het niet kent.
//
// Wat bevestigd is en wat niet (verslag van Scout, 9 november): de veldnamen komen uit de Nederlandse
// handleiding van het model; het pad op het horloge ook. De ligging van de velden op het ronde scherm
// is nergens bevestigd: de indelingen hieronder zijn de tekening van ASCEND, niet een kopie van het horloge.

export type WatchFieldGroupId =
  | 'timer' | 'distance' | 'pace' | 'speed' | 'heartRate' | 'cadence' | 'elevation' | 'power'
  | 'runningDynamics' | 'workout' | 'compass' | 'temperature' | 'other' | 'graphs';

export interface WatchFieldDef {
  id: string;
  group: WatchFieldGroupId;
  // De naam zoals de handleiding hem noemt.
  label: string;
  // Een kortere naam voor in de tekening, als de naam niet past.
  short?: string;
  // Een voorbeeldwaarde voor de tekening; een meter of grafiek heeft er geen.
  sample?: string;
  unit?: string;
  // Eén korte regel uitleg in het blad Veld kiezen.
  note?: string;
  // Vraagt een accessoire dat de romp meet (een borstband met loopdynamiek of een pod).
  needs?: 'dynamics-accessory';
  // Bestaat alleen bij hardlopen, of zegt alleen iets in een gestuurde workout.
  only?: 'run' | 'workout';
}

// Eén plek op het ronde scherm, in eenheden van WATCH_FACE (288 bij 288).
export interface WatchCell {
  x: number;
  y: number;
  w: number;
  h: number;
  // De hoogte van het cijfer in die plek.
  valueSize: number;
}

export interface WatchLayout {
  cells: WatchCell[];
  // De plek met het grootste cijfer: daar zet het advies het veld waar je op stuurt.
  main: number;
}

export interface WatchModel {
  id: string;
  name: string;
  // De activiteiten op het horloge waar de pagina's bij horen.
  activityRun: string;
  activityHike: string;
  maxPages: number;
  // Per aantal velden één indeling. ASCEND biedt 1 tot en met 4 aan; het horloge kan er meer.
  layouts: Record<number, WatchLayout>;
  groups: { id: WatchFieldGroupId; label: string }[];
  fields: WatchFieldDef[];
  // Het pad op het horloge naar de gegevensschermen, met {activiteit} voor de activiteit.
  pathOnWatch: string[];
  // Dezelfde weg in de app van het horloge, als tweede keuze.
  pathInApp: string;
}

// De tekening: een cirkel met straal WATCH_FACE.radius rond het midden van een vlak van WATCH_FACE.size.
export const WATCH_FACE = { size: 288, radius: 136 } as const;

// De kleinste plek die nog een tikdoel is.
export const WATCH_MIN_CELL = 44;

const ROWS_3: WatchCell[] = [
  { x: 70, y: 32, w: 148, h: 68, valueSize: 30 },
  { x: 18, y: 100, w: 252, h: 88, valueSize: 46 },
  { x: 70, y: 188, w: 148, h: 68, valueSize: 30 },
];

const LAYOUTS: Record<number, WatchLayout> = {
  1: { main: 0, cells: [{ x: 40, y: 64, w: 208, h: 160, valueSize: 64 }] },
  2: { main: 0, cells: [{ x: 56, y: 44, w: 176, h: 100, valueSize: 46 }, { x: 56, y: 144, w: 176, h: 100, valueSize: 46 }] },
  3: { main: 1, cells: ROWS_3 },
  4: {
    main: 0,
    cells: [
      { ...ROWS_3[0], valueSize: 34 },
      { x: 18, y: 100, w: 126, h: 88, valueSize: 28 },
      { x: 144, y: 100, w: 126, h: 88, valueSize: 28 },
      ROWS_3[2],
    ],
  },
};

const GROUPS: WatchModel['groups'] = [
  { id: 'heartRate', label: 'Hartslag' },
  { id: 'pace', label: 'Tempo' },
  { id: 'timer', label: 'Timer' },
  { id: 'distance', label: 'Afstand' },
  { id: 'elevation', label: 'Hoogte' },
  { id: 'cadence', label: 'Cadans' },
  { id: 'speed', label: 'Snelheid' },
  { id: 'other', label: 'Overig' },
  { id: 'power', label: 'Vermogen' },
  { id: 'runningDynamics', label: 'Hardloopdynamiek' },
  { id: 'workout', label: 'Workout' },
  { id: 'compass', label: 'Kompas' },
  { id: 'temperature', label: 'Temperatuur' },
  { id: 'graphs', label: 'Meters en grafieken' },
];

// De velden uit de handleiding van de Forerunner 255 die bij lopen, wandelen en hiken tellen.
// Weggelaten: fietsen, zwemmen, roeien, varen, klimmen, yoga, kracht, skiën en multisport.
const FR255_FIELDS: WatchFieldDef[] = [
  { id: 'timer', group: 'timer', label: 'Timer', sample: '46:08', note: 'De tijd van de activiteit, zonder pauzes.' },
  { id: 'elapsedTime', group: 'timer', label: 'Verstreken tijd', sample: '46:08', note: 'Alle tijd sinds de start, pauzes meegeteld.' },
  { id: 'movingTime', group: 'timer', label: 'Tijd bewogen', sample: '46:08', note: 'Alleen de tijd dat je bewoog.' },
  { id: 'stoppedTime', group: 'timer', label: 'Tijd gestopt', sample: '1:20', note: 'Alleen de tijd dat je stilstond.' },
  { id: 'lapTime', group: 'timer', label: 'Rondetijd', sample: '4:31', note: 'De tijd van de ronde waar je in zit.' },
  { id: 'lastLapTime', group: 'timer', label: 'Laatste rondetijd', short: 'L. rondetijd', sample: '4:31' },
  { id: 'averageLapTime', group: 'timer', label: 'Gemiddelde rondetijd', short: 'Gem. rondetijd', sample: '4:31' },
  { id: 'intervalTime', group: 'timer', label: 'Intervaltijd', sample: '4:31', note: 'De tijd van het lopende interval.', only: 'workout' },
  { id: 'estimatedFinishTime', group: 'timer', label: 'Geschatte finishtijd', sample: '58:30', note: 'Vraagt een doel of route.' },
  { id: 'overallAheadBehind', group: 'timer', label: 'Totaal voor/achter', sample: '-0:12', note: 'Voor of achter op een doeltempo. Vraagt een doeltempo.' },
  { id: 'distance', group: 'distance', label: 'Afstand', sample: '7,42', unit: 'km' },
  { id: 'lapDistance', group: 'distance', label: 'Rondeafstand', sample: '0,84', unit: 'km' },
  { id: 'lastLapDistance', group: 'distance', label: 'Laatste rondeafstand', short: 'L. rondeafstand', sample: '0,84', unit: 'km' },
  { id: 'intervalDistance', group: 'distance', label: 'Intervalafstand', sample: '0,84', unit: 'km', only: 'workout' },
  { id: 'pace', group: 'pace', label: 'Tempo', sample: '6:12', unit: '/km', note: 'Het tempo van dit moment.' },
  { id: 'averagePace', group: 'pace', label: 'Gemiddeld tempo', short: 'Gem. tempo', sample: '6:12', unit: '/km' },
  { id: 'lapPace', group: 'pace', label: 'Rondetempo', sample: '6:12', unit: '/km', note: 'Het gemiddelde van de ronde waar je in zit.' },
  { id: 'lastLapPace', group: 'pace', label: 'Laatste rondetempo', short: 'L. rondetempo', sample: '6:12', unit: '/km' },
  { id: 'intervalPace', group: 'pace', label: 'Intervaltempo', sample: '6:12', unit: '/km', only: 'workout' },
  { id: 'gradeAdjustedPace', group: 'pace', label: 'Voor helling gecorrigeerd tempo', short: 'Tempo op vlak', sample: '6:12', unit: '/km', note: 'Tempo omgerekend naar vlak.' },
  { id: 'speed', group: 'speed', label: 'Snelheid', sample: '9,7', unit: 'km/u' },
  { id: 'averageSpeed', group: 'speed', label: 'Gemiddelde snelheid', short: 'Gem. snelheid', sample: '9,7', unit: 'km/u' },
  { id: 'averageMovingSpeed', group: 'speed', label: 'Gemiddelde bewogen snelheid', short: 'Gem. bew. snelheid', sample: '9,7', unit: 'km/u', note: 'Zonder de pauzes.' },
  { id: 'averageOverallSpeed', group: 'speed', label: 'Gemiddelde totale snelheid', short: 'Gem. totale snelheid', sample: '9,7', unit: 'km/u', note: 'Met de pauzes.' },
  { id: 'lapSpeed', group: 'speed', label: 'Rondesnelheid', sample: '9,7', unit: 'km/u' },
  { id: 'lastLapSpeed', group: 'speed', label: 'Laatste rondesnelheid', short: 'L. rondesnelheid', sample: '9,7', unit: 'km/u' },
  { id: 'maxSpeed', group: 'speed', label: 'Maximumsnelheid', sample: '9,7', unit: 'km/u' },
  { id: 'verticalSpeed', group: 'speed', label: 'Verticale snelheid', sample: '520', unit: 'm/u', note: 'Hoe snel je stijgt of daalt.' },
  { id: 'heartRate', group: 'heartRate', label: 'Hartslag', sample: '142', unit: 'bpm', note: 'Slagen per minuut.' },
  { id: 'hrZone', group: 'heartRate', label: 'Hartslagzone', sample: '2,4', note: 'Zone 1 tot 5, met een decimaal.' },
  { id: 'averageHeartRate', group: 'heartRate', label: 'Gemiddelde hartslag', short: 'Gem. hartslag', sample: '142', unit: 'bpm' },
  { id: 'hrPercentMax', group: 'heartRate', label: 'Hartslag %max', sample: '78', unit: '%' },
  { id: 'hrPercentReserve', group: 'heartRate', label: '% hartslagreserve', short: '% HSR', sample: '78', unit: '%' },
  { id: 'averageHrPercentMax', group: 'heartRate', label: 'Gemiddelde hartslag %max', short: 'Gem. hartslag %max', sample: '78', unit: '%' },
  { id: 'averageHrPercentReserve', group: 'heartRate', label: 'Gemiddeld % hartslagreserve', short: 'Gem. % HSR', sample: '78', unit: '%' },
  { id: 'lapHeartRate', group: 'heartRate', label: 'Ronde hartslag', sample: '142', unit: 'bpm' },
  { id: 'lapHrPercentMax', group: 'heartRate', label: 'Ronde hartslag %max', sample: '78', unit: '%' },
  { id: 'lapHrPercentReserve', group: 'heartRate', label: 'Ronde % hartslagreserve', short: 'Ronde % HSR', sample: '78', unit: '%' },
  { id: 'lastLapHeartRate', group: 'heartRate', label: 'Laatste ronde hartslag', short: 'L. ronde hartslag', sample: '142', unit: 'bpm' },
  { id: 'lastLapHrPercentMax', group: 'heartRate', label: 'Laatste ronde hartslag %max', short: 'L. ronde hartslag %max', sample: '78', unit: '%' },
  { id: 'lastLapHrPercentReserve', group: 'heartRate', label: '%HSR laatste ronde', short: '%HSR l. ronde', sample: '78', unit: '%' },
  { id: 'timeInZone', group: 'heartRate', label: 'Tijd in zone', sample: '24:10', note: 'Tijd per hartslagzone.' },
  { id: 'aerobicTrainingEffect', group: 'heartRate', label: 'Aeroob trainingseffect', short: 'Aeroob TE', sample: '3,1' },
  { id: 'anaerobicTrainingEffect', group: 'heartRate', label: 'Anaeroob trainingseffect', short: 'Anaeroob TE', sample: '3,1' },
  { id: 'cadence', group: 'cadence', label: 'Cadans', sample: '168', unit: 'spm' },
  { id: 'averageCadence', group: 'cadence', label: 'Gemiddelde cadans', short: 'Gem. cadans', sample: '168', unit: 'spm' },
  { id: 'lapCadence', group: 'cadence', label: 'Rondecadans', sample: '168', unit: 'spm' },
  { id: 'lastLapCadence', group: 'cadence', label: 'Cadans laatste ronde', short: 'Cadans l. ronde', sample: '168', unit: 'spm' },
  { id: 'elevation', group: 'elevation', label: 'Hoogte', sample: '412', unit: 'm', note: 'Hoogte boven zeeniveau.' },
  { id: 'gpsElevation', group: 'elevation', label: 'GPS-hoogte', sample: '412', unit: 'm' },
  { id: 'totalAscent', group: 'elevation', label: 'Totale stijging', sample: '318', unit: 'm' },
  { id: 'totalDescent', group: 'elevation', label: 'Totale daling', sample: '318', unit: 'm' },
  { id: 'lapAscent', group: 'elevation', label: 'Stijging ronde', sample: '42', unit: 'm' },
  { id: 'lapDescent', group: 'elevation', label: 'Daling ronde', sample: '42', unit: 'm' },
  { id: 'lastLapAscent', group: 'elevation', label: 'Stijging laatste ronde', short: 'Stijging l. ronde', sample: '42', unit: 'm' },
  { id: 'lastLapDescent', group: 'elevation', label: 'Daling laatste ronde', short: 'Daling l. ronde', sample: '42', unit: 'm' },
  { id: 'grade', group: 'elevation', label: 'Gradiënt', sample: '6', unit: '%', note: 'Helling in procenten.' },
  { id: 'averageAscent', group: 'elevation', label: 'Gemiddelde stijging', short: 'Gem. stijging', sample: '480', unit: 'm/u' },
  { id: 'averageDescent', group: 'elevation', label: 'Gemiddelde daling', short: 'Gem. daling', sample: '480', unit: 'm/u' },
  { id: 'maxAscent', group: 'elevation', label: 'Maximum stijging', short: 'Max. stijging', sample: '480', unit: 'm/u', note: 'Hoogste stijgsnelheid.' },
  { id: 'maxDescent', group: 'elevation', label: 'Maximum daling', short: 'Max. daling', sample: '480', unit: 'm/u' },
  { id: 'maxElevation', group: 'elevation', label: 'Maximale hoogte', short: 'Max. hoogte', sample: '412', unit: 'm' },
  { id: 'minElevation', group: 'elevation', label: 'Minimale hoogte', short: 'Min. hoogte', sample: '412', unit: 'm' },
  { id: 'power', group: 'power', label: 'Vermogen', sample: '268', unit: 'W', note: 'Watt, nu.', only: 'run' },
  { id: 'averagePower', group: 'power', label: 'Gemiddeld vermogen', short: 'Gem. vermogen', sample: '268', unit: 'W', only: 'run' },
  { id: 'lapPower', group: 'power', label: 'Vermogen ronde', sample: '268', unit: 'W', only: 'run' },
  { id: 'lastLapPower', group: 'power', label: 'Vermogen laatste ronde', short: 'Vermogen l. ronde', sample: '268', unit: 'W', only: 'run' },
  { id: 'maxPower', group: 'power', label: 'Maximum vermogen', short: 'Max. vermogen', sample: '268', unit: 'W', only: 'run' },
  { id: 'powerZone', group: 'power', label: 'Vermogenszone', sample: '3', only: 'run' },
  { id: 'groundContactTime', group: 'runningDynamics', label: 'Grondcontacttijd', short: 'GCT', sample: '262', unit: 'ms', only: 'run' },
  { id: 'averageGroundContactTime', group: 'runningDynamics', label: 'Gemiddelde grondcontacttijd', short: 'Gem. GCT', sample: '262', unit: 'ms', only: 'run' },
  { id: 'lapGroundContactTime', group: 'runningDynamics', label: 'Ronde-grondcontacttijd', short: 'Ronde-GCT', sample: '262', unit: 'ms', only: 'run' },
  { id: 'strideLength', group: 'runningDynamics', label: 'Staplengte', sample: '1,04', unit: 'm', only: 'run' },
  { id: 'averageStrideLength', group: 'runningDynamics', label: 'Gemiddelde staplengte', short: 'Gem. staplengte', sample: '1,04', unit: 'm', only: 'run' },
  { id: 'lapStrideLength', group: 'runningDynamics', label: 'Ronde staplengte', sample: '1,04', unit: 'm', only: 'run' },
  { id: 'verticalOscillation', group: 'runningDynamics', label: 'Verticale oscillatie', short: 'Vert. oscillatie', sample: '9,1', unit: 'cm', only: 'run' },
  { id: 'averageVerticalOscillation', group: 'runningDynamics', label: 'Gemiddelde verticale oscillatie', short: 'Gem. vert. oscillatie', sample: '9,1', unit: 'cm', only: 'run' },
  { id: 'lapVerticalOscillation', group: 'runningDynamics', label: 'Ronde verticale oscillatie', short: 'Ronde vert. oscillatie', sample: '9,1', unit: 'cm', only: 'run' },
  { id: 'verticalRatio', group: 'runningDynamics', label: 'Verticale ratio', sample: '8,4', unit: '%', only: 'run' },
  { id: 'averageVerticalRatio', group: 'runningDynamics', label: 'Gemiddelde verticale ratio', short: 'Gem. vert. ratio', sample: '8,4', unit: '%', only: 'run' },
  { id: 'lapVerticalRatio', group: 'runningDynamics', label: 'Ronde verticale ratio', short: 'Ronde vert. ratio', sample: '8,4', unit: '%', only: 'run' },
  { id: 'gctBalance', group: 'runningDynamics', label: 'Balans grondcontacttijd', short: 'Balans GCT', sample: '50,2', unit: '%', needs: 'dynamics-accessory', only: 'run' },
  { id: 'averageGctBalance', group: 'runningDynamics', label: 'Gem. balans grondcontacttijd', short: 'Gem. balans GCT', sample: '50,2', unit: '%', needs: 'dynamics-accessory', only: 'run' },
  { id: 'lapGctBalance', group: 'runningDynamics', label: 'Ronde balans grondcontacttijd', short: 'Ronde balans GCT', sample: '50,2', unit: '%', needs: 'dynamics-accessory', only: 'run' },
  { id: 'stepDuration', group: 'workout', label: 'Stapduur', sample: '1:12', note: 'Wat er nog rest van deze stap, in tijd of afstand.', only: 'workout' },
  { id: 'stepTime', group: 'workout', label: 'Staptijd', sample: '0:48', note: 'Hoe lang je in deze stap zit.', only: 'workout' },
  { id: 'stepPace', group: 'workout', label: 'Staptempo', sample: '6:12', unit: '/km', only: 'workout' },
  { id: 'stepSpeed', group: 'workout', label: 'Stapsnelheid', sample: '9,7', unit: 'km/u', only: 'workout' },
  { id: 'repsToGo', group: 'workout', label: 'Herhalingen te gaan', short: 'Herh. te gaan', sample: '4', only: 'workout' },
  { id: 'heading', group: 'compass', label: 'Richting', sample: 'NO' },
  { id: 'compassHeading', group: 'compass', label: 'Kompaskoers', sample: 'NO' },
  { id: 'gpsHeading', group: 'compass', label: 'GPS-koers', sample: 'NO' },
  { id: 'temperature', group: 'temperature', label: 'Temperatuur', sample: '14', unit: '°C' },
  { id: 'temp24hMax', group: 'temperature', label: '24-uur maximum', sample: '14', unit: '°C' },
  { id: 'temp24hMin', group: 'temperature', label: '24-uur minimum', sample: '14', unit: '°C' },
  { id: 'timeOfDay', group: 'other', label: 'Tijd', sample: '10:42', note: 'De klok.' },
  { id: 'timeOfDaySeconds', group: 'other', label: 'Tijdstip (seconden)', sample: '10:42:07' },
  { id: 'sunrise', group: 'other', label: 'Zon op', sample: '7:48', note: 'Uit je GPS-positie.' },
  { id: 'sunset', group: 'other', label: 'Zon onder', sample: '16:55', note: 'Uit je GPS-positie.' },
  { id: 'batteryLevel', group: 'other', label: 'Batterijniveau', sample: '64', unit: '%' },
  { id: 'gps', group: 'other', label: 'GPS', sample: 'Goed', note: 'Sterkte van het signaal.' },
  { id: 'laps', group: 'other', label: 'Ronden', sample: '5', note: 'Aantal ronden.' },
  { id: 'steps', group: 'other', label: 'Stappen', sample: '6.840' },
  { id: 'activeCalories', group: 'other', label: 'Actieve calorieën', sample: '412', unit: 'kcal' },
  { id: 'totalCalories', group: 'other', label: 'Totaal calorieën', sample: '486', unit: 'kcal' },
  { id: 'performanceCondition', group: 'other', label: 'Prestatieconditie', sample: '+2' },
  { id: 'respirationRate', group: 'other', label: 'Ademhalingsritme', sample: '32', unit: '/min' },
  { id: 'stress', group: 'other', label: 'Stress', sample: '41' },
  { id: 'load', group: 'other', label: 'Last', sample: '86', note: 'Trainingsbelasting van deze activiteit.' },
  { id: 'barometricPressure', group: 'other', label: 'Barometerdruk', sample: '1013', unit: 'hPa' },
  { id: 'ambientPressure', group: 'other', label: 'Omgevingsluchtdruk', short: 'Omgevingsdruk', sample: '968', unit: 'hPa' },
  { id: 'heartRateGauge', group: 'graphs', label: 'Hartslagmeter', note: 'Kleur per zone.' },
  { id: 'cadenceGauge', group: 'graphs', label: 'Cadansmeter', only: 'run' },
  { id: 'totalAscentDescentGauge', group: 'graphs', label: 'Meter voor totale stijging/daling', short: 'Meter stijging/daling' },
  { id: 'trainingEffectGauge', group: 'graphs', label: 'Trainingseffectmeter', short: 'TE-meter' },
  { id: 'powerGauge', group: 'graphs', label: 'Vermogensmeter', only: 'run' },
  { id: 'groundContactTimeGauge', group: 'graphs', label: 'Grondcontacttijd-meter', short: 'GCT-meter', only: 'run' },
  { id: 'verticalOscillationGauge', group: 'graphs', label: 'Meter voor verticale oscillatie', short: 'Meter vert. oscillatie', only: 'run' },
  { id: 'verticalRatioGauge', group: 'graphs', label: 'Verticale ratio-meter', only: 'run' },
  { id: 'gctBalanceGauge', group: 'graphs', label: 'Balans GCT-meter', needs: 'dynamics-accessory', only: 'run' },
  { id: 'heartRateChart', group: 'graphs', label: 'Hartslaggrafiek' },
  { id: 'paceChart', group: 'graphs', label: 'Tempografiek' },
  { id: 'elevationChart', group: 'graphs', label: 'Hoogtegrafiek' },
  { id: 'barometerChart', group: 'graphs', label: 'Barometergrafiek' },
  { id: 'powerChart', group: 'graphs', label: 'Vermogensgrafiek', only: 'run' },
  { id: 'speedChart', group: 'graphs', label: 'Snelheidsgrafiek' },
];

const FR255: WatchModel = {
  id: 'fr255',
  name: 'Forerunner 255',
  activityRun: 'Hardlopen',
  activityHike: 'Hiken of Wandelen',
  maxPages: 5,
  layouts: LAYOUTS,
  groups: GROUPS,
  fields: FR255_FIELDS,
  pathOnWatch: [
    'Houd op je horloge UP ingedrukt en kies Activiteiten en apps.',
    'Kies {activiteit} en dan de activiteitinstellingen.',
    'Kies Gegevensschermen en het scherm dat je wilt aanpassen.',
    'Kies Indeling voor het aantal velden en Gegevensvelden voor wat elk veld toont.',
    'Kies Voeg nieuw toe voor een extra scherm.',
  ],
  // De namen in de app zijn gemeld, niet bevestigd: de tekst belooft ze dus niet.
  pathInApp: 'Het kan ook in Garmin Connect, bij de instellingen van je toestel. Bewaart de app het niet, doe het dan op het horloge.',
};

export const DEFAULT_WATCH_MODEL_ID = 'fr255';

export const WATCH_MODELS: Record<string, WatchModel> = { fr255: FR255 };
