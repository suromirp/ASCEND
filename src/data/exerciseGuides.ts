// ASCEND: de uitleg bij oefeningen, in twee lagen (docs/beslissingen/2026-11-09-uitleg-bij-oefeningen.md).
// Een record op oefening-id; data/exercises.ts voegt ze samen. Een oefening zonder tekst hier houdt zijn drie
// oude regels (`cues`). Alle tekst is eigen werk, geschreven vanuit gangbare techniek; waar de tekst op een open
// bron met licentie zou rusten komt een `source` te staan (nu bij geen enkele). Waarop de techniek rust staat in
// docs/onderzoek/Bronnen bij de uitleg van oefeningen.md.
//
// Regels: In het kort is precies drie regels van hoogstens 60 tekens; Lees verder samen hoogstens 130 woorden
// (src/engine/exerciseGuide.test.ts). Je en jij, het droge feit eerst, elke aanwijzing te zien of te voelen, geen
// gedachtestreepjes. `easier` en `harder` alleen als de oefening in de lijst bestaat; anders weglaten.

import type { ExerciseGuide } from '../models/exercise';

export const EXERCISE_GUIDES: Record<string, ExerciseGuide> = {
  'push-up': {
    short: [
      'Zak tot je borst een vuist boven de vloer is, duw terug.',
      'Lichaam als een plank, van hoofd tot hielen.',
      'Hangen je heupen? Span je billen en buik aan.',
    ],
    setup: 'Handen iets breder dan je schouders, vingers naar voren, voeten bij elkaar. Span je billen en buik aan.',
    movement: 'Zak met je ellebogen schuin naar achteren, ongeveer 45 graden van je lichaam, tot je borst een vuist boven de vloer is. Duw de vloer weg tot je armen gestrekt zijn.',
    tempo: 'Twee tellen omlaag, rustig omhoog. Adem in bij het zakken, uit bij het duwen.',
    mistakes: [
      { fault: 'Je ellebogen staan recht opzij.', fix: 'Zet ze schuiner naar achteren.' },
      { fault: 'Je hoofd steekt vooruit.', fix: 'Houd je hoofd in lijn met je rug en kijk naar de vloer vlak voor je handen.' },
    ],
  },
  'pull-up': {
    short: [
      'Trek je kin boven de stang, zak helemaal omlaag.',
      'Begin elke herhaling in een volledige hang.',
      'Zwaai je? Span je buik aan en houd je benen stil.',
    ],
    setup: 'Overhandse greep, iets breder dan je schouders. Hang met gestrekte armen en trek je schouders licht omlaag, weg van je oren.',
    movement: 'Trek je ellebogen naar je heupen tot je kin boven de stang is. Zak daarna gecontroleerd tot je armen weer gestrekt zijn. Wordt het te licht, hang dan gewicht aan een riem om je middel.',
    tempo: 'Rustig omhoog, twee tellen omlaag. Adem uit tijdens het trekken.',
    mistakes: [
      { fault: 'Je begint met gebogen armen.', fix: 'Zak elke keer tot je armen gestrekt zijn.' },
      { fault: 'Je zwaait met benen of romp.', fix: 'Span buik en billen aan en houd je benen stil.' },
    ],
    easier: 'negative-chin-up',
  },
  'step-down': {
    short: [
      'Zak langzaam op één been tot je andere voet tikt.',
      'Je knie volgt de richting van je tweede teen.',
      'Neerploffen? Tel drie tellen omlaag.',
    ],
    setup: 'Sta met je werkbeen op een stevige verhoging van 15 tot 20 centimeter. De andere voet hangt over de rand. Houd je bekken recht.',
    movement: 'Buig je knie en zak langzaam tot de voet van je andere been de grond licht aantikt. Leg er geen gewicht op. Duw dan met het werkbeen terug omhoog tot je weer rechtop staat.',
    tempo: 'Drie tellen omlaag, rustig omhoog. Adem in bij het zakken.',
    mistakes: [
      { fault: 'Je knie zakt naar binnen.', fix: 'Duw hem naar buiten, boven je tweede teen.' },
      { fault: 'Je bekken zakt aan de kant van het vrije been.', fix: 'Houd je heupen waterpas en span je buik aan.' },
    ],
    harder: 'step-down-pack',
  },
  'romanian-deadlift': {
    short: [
      'Heupen terug, stang langs je benen tot onder de knie.',
      'Knieën licht gebogen en vast, je rug blijft recht.',
      'Door je knieën zakken? Duw je heupen verder terug.',
    ],
    setup: 'Voeten op heupbreedte, de stang overhands vast net buiten je benen. Sta rechtop met de stang tegen je bovenbenen, knieën een beetje gebogen, schouderbladen licht naar achteren.',
    movement: 'Duw je heupen naar achteren en laat de stang dicht langs je benen zakken, tot onder je knieën of tot je de achterkant van je bovenbenen sterk voelt rekken. Stop zodra je onderrug wil ronden. Duw je heupen naar voren tot je rechtop staat.',
    tempo: 'Twee tellen omlaag, krachtig omhoog. Adem in en span je romp aan voor je zakt, adem uit als je boven bent.',
    mistakes: [
      { fault: 'Je zakt door je knieën.', fix: 'Houd ze vast en duw je billen naar achteren.' },
      { fault: 'De stang zwaait van je af.', fix: 'Houd hem de hele weg tegen je benen.' },
    ],
    easier: 'dumbbell-rdl',
  },
  'incline-bench-press': {
    short: [
      'Bank op 45 graden, stang naar je bovenste borst.',
      'Voeten stevig op de vloer, schouderbladen samen.',
      'Billen van de bank? Duw je voeten in de vloer.',
    ],
    setup: 'Zet de bank op 45 graden en stel veiligheidsarmen in als je alleen traint. Ga liggen met je ogen onder de stang, schouderbladen naar elkaar en omlaag, voeten plat. Pak de stang iets breder dan je schouders en houd hem met gestrekte armen boven je schouders.',
    movement: 'Laat de stang gecontroleerd zakken tot hij je bovenste borst licht raakt, met je onderarmen ongeveer loodrecht. Duw hem terug omhoog tot je armen weer gestrekt zijn.',
    tempo: 'Twee tellen omlaag, dan krachtig omhoog. Adem in bij het zakken, uit bij het duwen.',
    mistakes: [
      { fault: 'Je billen komen van de bank.', fix: 'Duw je voeten in de vloer en houd je billen op de bank.' },
      { fault: 'Je ellebogen staan recht opzij.', fix: 'Zet ze schuin naar achteren.' },
    ],
  },
};
