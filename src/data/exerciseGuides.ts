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
  // F4f: de overige ladders (data/skillLadders.ts). Houdingen hebben bij Tempo geen tellen maar een ademhaling.
  'assisted-pistol-squat': {
    short: [
      'Zak op één been, houd je vast en duw met je been omhoog.',
      'Je hiel blijft plat, je knie volgt je tweede teen.',
      'Optrekken aan de steun? Houd hem alleen vast voor balans.',
    ],
    setup: 'Sta op één been naast een paal, ring of deurpost en houd je met beide handen vast. Het andere been strek je voor je uit.',
    movement: 'Zak langzaam tot je billen laag zijn, met je knie boven je voet. Duw met je standbeen terug omhoog. Doe alle herhalingen op één been en wissel dan.',
    tempo: 'Drie tellen omlaag, rustig omhoog. Adem in bij het zakken.',
    mistakes: [
      { fault: 'Je trekt je omhoog aan de steun.', fix: 'Houd hem alleen vast voor balans en duw met je been.' },
      { fault: 'Je hiel komt van de grond.', fix: 'Zak minder diep of zet je voet iets verder naar voren.' },
    ],
    harder: 'skater-squat',
  },
  'skater-squat': {
    short: [
      'Eén been achter je, de achterknie bijna op de grond.',
      'Je romp leunt voorover, je knie blijft boven je voet.',
      'Neerploffen? Tel drie tellen omlaag.',
    ],
    setup: 'Sta op één been en zet het andere been naar achteren, de knie gebogen. Houd je armen naar voren voor balans.',
    movement: 'Zak op je standbeen tot je achterknie bijna de grond raakt, zonder erop te rusten. Duw met je standbeen terug omhoog. Doe alle herhalingen aan één kant en wissel dan.',
    tempo: 'Drie tellen omlaag, rustig omhoog. Adem in bij het zakken.',
    mistakes: [
      { fault: 'Je knie zakt naar binnen.', fix: 'Duw hem naar buiten, boven je tweede teen.' },
      { fault: 'Je achterknie landt hard op de grond.', fix: 'Leg een opgevouwen handdoek neer en zak langzamer.' },
    ],
    easier: 'assisted-pistol-squat',
    harder: 'box-pistol-squat',
  },
  'box-pistol-squat': {
    short: [
      'Zak op één been op een box en sta weer op.',
      'Het vrije been blijft gestrekt, je hiel blijft plat.',
      'Neerploffen? Kies een hogere box.',
    ],
    setup: 'Zet een box of bank achter je. Sta op één been en strek het andere been voor je uit. Je armen mogen naar voren.',
    movement: 'Zak langzaam tot je billen de box aanraken, met je vrije been gestrekt voor je. Duw door je hiel omhoog zonder je met je vrije voet af te zetten. Wissel na alle herhalingen van been.',
    tempo: 'Drie tellen omlaag, kort aantikken, rustig omhoog.',
    mistakes: [
      { fault: 'Je ploft op de box.', fix: 'Gebruik een hogere box en zak langzamer.' },
      { fault: 'Je zet je af met je vrije voet.', fix: 'Houd dat been in de lucht en duw alleen met je standbeen.' },
    ],
    easier: 'skater-squat',
    harder: 'pistol-squat',
  },
  'pistol-squat': {
    short: [
      'Zak diep op één been, het andere been gestrekt voor je.',
      'Je hiel blijft plat, je knie volgt je tweede teen.',
      'Achterover vallen? Houd je armen en borst naar voren.',
    ],
    setup: 'Sta op één been en til het andere been gestrekt voor je op. Je armen gaan naar voren voor balans.',
    movement: 'Zak zo diep als je kunt met je hiel plat en je knie boven je voet. Duw met je standbeen terug omhoog, zonder steun. Wissel na alle herhalingen van been.',
    tempo: 'Drie tellen omlaag, rustig omhoog. Adem in bij het zakken.',
    mistakes: [
      { fault: 'Je valt onderaan achterover.', fix: 'Breng je armen en borst naar voren en zak minder diep.' },
      { fault: 'Je hiel komt van de grond.', fix: 'Zet je voet iets naar buiten en zak langzamer.' },
    ],
    easier: 'box-pistol-squat',
  },
  'wall-plank-hold': {
    short: [
      'Handen op de vloer, voeten tegen de muur, houd stil.',
      'Je lichaam is één lijn, je schouders duw je omhoog.',
      'Hol in je rug? Span je buik en billen aan.',
    ],
    setup: 'Zet je handen op de vloer, iets breder dan je schouders, en zet je voeten tegen de muur. Hoe hoger je voeten, hoe zwaarder.',
    movement: 'Strek je armen en duw de vloer weg met je schouders. Span buik en billen aan zodat je lichaam een rechte lijn is. Houd die stand.',
    tempo: 'Adem rustig door. Stop zodra je lichaam doorzakt.',
    mistakes: [
      { fault: 'Je buik zakt en je rug wordt hol.', fix: 'Span buik en billen aan en zet je voeten lager.' },
      { fault: 'Je schouders zakken tussen je armen.', fix: 'Duw de vloer actief weg.' },
    ],
    harder: 'pike-hold',
  },
  'pike-hold': {
    short: [
      'Heupen hoog, armen en benen gestrekt, houd stil.',
      'Je heupen staan boven je schouders.',
      'Knieën gebogen? Loop je voeten wat dichter naar je handen.',
    ],
    setup: 'Zet je handen en voeten op de vloer en breng je heupen omhoog, tot je lichaam een omgekeerde V is. Je hoofd hangt tussen je armen.',
    movement: 'Duw de vloer weg met je schouders en houd je armen en benen gestrekt. Loop je voeten zo dicht naar je handen als je kunt, met je heupen boven je schouders.',
    tempo: 'Adem rustig door. Stop zodra je schouders zakken.',
    mistakes: [
      { fault: 'Je heupen blijven laag.', fix: 'Loop je voeten naar je handen en duw je heupen omhoog.' },
      { fault: 'Je schouders zakken richting je oren.', fix: 'Duw de vloer weg, weg van je oren.' },
    ],
    easier: 'wall-plank-hold',
    harder: 'wall-handstand-hold',
  },
  'wall-handstand-hold': {
    short: [
      'Buik naar de muur, armen gestrekt, houd stil.',
      'Duw je schouders omhoog, je lichaam is één lijn.',
      'Hol in je rug? Span je buik aan en trek je ribben in.',
    ],
    setup: 'Zet je handen ongeveer een handbreedte van de muur en loop met je voeten de muur op, tot je buik naar de muur wijst. Zorg voor een zachte ondergrond en vrije ruimte.',
    movement: 'Duw de vloer weg met je schouders. Span je buik en billen aan zodat je lichaam een rechte lijn is. Je tenen raken de muur licht aan.',
    tempo: 'Adem rustig door. Kom naar beneden zodra je rug hol wordt.',
    mistakes: [
      { fault: 'Je rug wordt hol en je ribben steken naar voren.', fix: 'Span je buik aan en loop met je handen dichter naar de muur.' },
      { fault: 'Je schouders zakken richting je oren.', fix: 'Duw de vloer actief weg.' },
    ],
    easier: 'pike-hold',
    harder: 'free-handstand-hold',
  },
  'free-handstand-hold': {
    short: [
      'Sta op je handen zonder steun, houd stil.',
      'Lichaam in één lijn, schouders omhoog gedrukt.',
      'Doorvallen? Corrigeer met je vingers, niet met je rug.',
    ],
    setup: 'Kies een vrije plek met een zachte ondergrond. Zet je handen op schouderbreedte en breng je benen omhoog, desnoods met een schop of tegen de muur.',
    movement: 'Duw de vloer weg met je schouders en houd je armen gestrekt. Span buik en billen aan. Je corrigeert je balans met je vingers: val je naar voren, druk dan je vingertoppen in de vloer.',
    tempo: 'Adem rustig door. Leer eerst veilig vallen, door te kantelen of een rol te maken.',
    mistakes: [
      { fault: 'Je trekt je rug hol om te balanceren.', fix: 'Span je buik aan en houd je ribben naar binnen.' },
      { fault: 'Je kijkt naar voren en je nek verkrampt.', fix: 'Kijk naar de vloer tussen je handen.' },
    ],
    easier: 'wall-handstand-hold',
  },
  'pike-push-up': {
    short: [
      'Heupen hoog, hoofd naar de vloer, duw terug.',
      'Je ellebogen wijzen schuin naar achteren.',
      'Heupen zakken? Loop je voeten dichter naar je handen.',
    ],
    setup: 'Zet je handen en voeten op de vloer met je heupen hoog, in een omgekeerde V. Je voeten staan dichtbij je handen.',
    movement: 'Buig je ellebogen schuin naar achteren en zak met je hoofd naar de vloer tussen je handen. Duw terug tot je armen gestrekt zijn en je heupen nog steeds hoog zijn.',
    tempo: 'Twee tellen omlaag, rustig omhoog. Adem in bij het zakken.',
    mistakes: [
      { fault: 'Je heupen zakken en het wordt een gewone push-up.', fix: 'Loop je voeten dichter naar je handen.' },
      { fault: 'Je ellebogen staan wijd.', fix: 'Houd ze schuin naar achteren.' },
    ],
    harder: 'elevated-pike-push-up',
  },
  'elevated-pike-push-up': {
    short: [
      'Voeten hoog, heupen boven je schouders, duw terug.',
      'Hoe hoger je voeten, hoe zwaarder.',
      'Je hoofd draagt? Zak minder diep of zet je voeten lager.',
    ],
    setup: 'Zet je voeten op een stevige bank of box en je handen op de vloer. Loop met je handen naar je voeten tot je heupen boven je schouders staan.',
    movement: 'Zak met je hoofd naar de vloer tussen je handen, met je ellebogen schuin naar achteren. Duw terug tot je armen gestrekt zijn. Je gewicht ligt op je handen, niet op je hoofd.',
    tempo: 'Twee tellen omlaag, rustig omhoog. Adem in bij het zakken.',
    mistakes: [
      { fault: 'Je zakt te ver naar voren en je hoofd draagt.', fix: 'Houd je heupen boven je schouders en zak minder diep.' },
      { fault: 'Je voeten glijden van de verhoging.', fix: 'Kies een stevig, stroef oppervlak.' },
    ],
    easier: 'pike-push-up',
    harder: 'wall-hspu-negative',
  },
  'wall-hspu-negative': {
    short: [
      'Zak in ongeveer 5 seconden tot je hoofd de mat raakt.',
      'Handstand tegen de muur, ellebogen schuin naar achteren.',
      'Vallen? Leg een mat neer en zak minder diep.',
    ],
    setup: 'Leg een opgevouwen handdoek of mat voor de muur. Ga met je buik naar de muur in een handstand staan.',
    movement: 'Zak langzaam met je ellebogen schuin naar achteren tot je hoofd de mat raakt. Kom daarna met een voet of beide benen naar beneden, je hoeft niet omhoog te duwen.',
    tempo: 'Ongeveer vijf tellen omlaag. Adem in bij het zakken.',
    mistakes: [
      { fault: 'Je laat het laatste stuk vallen op je hoofd.', fix: 'Zak minder diep of zak langzamer.' },
      { fault: 'Je ellebogen gaan wijd.', fix: 'Houd ze schuin naar achteren.' },
    ],
    easier: 'elevated-pike-push-up',
    harder: 'wall-hspu',
  },
  'wall-hspu': {
    short: [
      'Zak tot je hoofd de mat raakt en duw terug.',
      'Lichaam in één lijn, ellebogen schuin naar achteren.',
      'Schoppen met je benen? Zak langzamer en duw met je armen.',
    ],
    setup: 'Leg een opgevouwen handdoek of mat voor de muur. Ga met je buik naar de muur in een handstand staan, handen op schouderbreedte.',
    movement: 'Zak met je ellebogen schuin naar achteren tot je hoofd de mat raakt. Duw je terug tot je armen gestrekt zijn. Je benen blijven tegen de muur en doen niet mee.',
    tempo: 'Twee tellen omlaag, rustig omhoog. Adem in bij het zakken.',
    mistakes: [
      { fault: 'Je trekt je rug hol en schopt omhoog.', fix: 'Span je buik aan en duw met je armen.' },
      { fault: 'Je ellebogen gaan wijd.', fix: 'Houd ze schuin naar achteren.' },
    ],
    easier: 'wall-hspu-negative',
  },
  'tuck-l-sit': {
    short: [
      'Steun op je handen, knieën naar je borst, houd stil.',
      'Je armen blijven gestrekt, je schouders duw je omlaag.',
      'Schouders omhoog? Duw de grond of leuningen weg.',
    ],
    setup: 'Zet je handen naast je heupen op de vloer, parallettes of dip bars. Strek je armen en duw je schouders omlaag, weg van je oren.',
    movement: 'Til je voeten van de grond en trek je knieën naar je borst. Houd je armen gestrekt en je rug recht. Houd die stand.',
    tempo: 'Adem rustig door. Stop zodra je schouders optrekken.',
    mistakes: [
      { fault: 'Je schouders trekken naar je oren.', fix: 'Duw de grond weg en houd je schouders laag.' },
      { fault: 'Je zakt in je rug.', fix: 'Zit rechtop en trek je knieën verder naar je borst.' },
    ],
    harder: 'one-leg-l-sit',
  },
  'one-leg-l-sit': {
    short: [
      'Eén been gestrekt voor je, het andere gebogen.',
      'Armen gestrekt, schouders laag.',
      'Zakkend been? Houd het hoog of ga terug naar de tuck.',
    ],
    setup: 'Steun met gestrekte armen op de vloer, parallettes of dip bars. Duw je schouders omlaag.',
    movement: 'Strek één been recht voor je, ongeveer op heuphoogte, en houd het andere been gebogen. Houd die stand en wissel bij de volgende set van been.',
    tempo: 'Adem rustig door. Stop zodra je gestrekte been zakt.',
    mistakes: [
      { fault: 'Het gestrekte been zakt onder je heupen.', fix: 'Houd het hoog of ga terug naar de tuck.' },
      { fault: 'Je schouders trekken omhoog.', fix: 'Duw de grond actief weg.' },
    ],
    easier: 'tuck-l-sit',
    harder: 'l-sit',
  },
  'l-sit': {
    short: [
      'Beide benen gestrekt voor je, houd stil.',
      'Knieën gestrekt, schouders omlaag gedrukt.',
      'Benen zakken? Ga terug naar één been.',
    ],
    setup: 'Steun met gestrekte armen op de vloer, parallettes of dip bars, handen naast je heupen. Duw je schouders omlaag.',
    movement: 'Til beide benen gestrekt op tot ongeveer heuphoogte. Je lichaam vormt een L. Houd die stand met je armen gestrekt.',
    tempo: 'Adem rustig door. Stop zodra je benen zakken of je knieën buigen.',
    mistakes: [
      { fault: 'Je benen zakken onder je heupen.', fix: 'Ga terug naar de variant met één been.' },
      { fault: 'Je knieën buigen.', fix: 'Spits je tenen en span je bovenbenen aan.' },
    ],
    easier: 'one-leg-l-sit',
  },
  'tuck-front-lever': {
    short: [
      'Hang aan de stang, rug horizontaal, knieën naar je borst.',
      'Armen gestrekt, schouders omlaag.',
      'Heupen zakken? Trek je knieën verder naar je borst.',
    ],
    setup: 'Hang aan een stang met een overhandse greep op schouderbreedte. Trek je schouders omlaag en je knieën naar je borst.',
    movement: 'Breng je lichaam omhoog tot je rug horizontaal is, met je heupen op dezelfde hoogte als je schouders. Houd je armen gestrekt en houd die stand.',
    tempo: 'Adem rustig door. Kom gecontroleerd terug naar hangen.',
    mistakes: [
      { fault: 'Je heupen zakken onder je rug.', fix: 'Trek je knieën verder naar je borst en duw je schouders omlaag.' },
      { fault: 'Je armen buigen.', fix: 'Houd ze gestrekt, ook als je maar kort kunt houden.' },
    ],
    harder: 'advanced-tuck-front-lever',
  },
  'advanced-tuck-front-lever': {
    short: [
      'Rug horizontaal, heupen open, knieën op een rechte hoek.',
      'Je schenen liggen parallel aan je romp.',
      'Rug zakt? Ga terug naar de tuck.',
    ],
    setup: 'Hang aan een stang met een overhandse greep. Trek je schouders omlaag en breng je lichaam in een tuck front lever.',
    movement: 'Open je heupen zodat je knieën een rechte hoek maken en je schenen parallel aan je romp liggen. Houd je rug horizontaal en je armen gestrekt.',
    tempo: 'Adem rustig door. Kom gecontroleerd terug naar hangen.',
    mistakes: [
      { fault: 'Je rug zakt door.', fix: 'Ga terug naar de tuck en bouw de houdtijd op.' },
      { fault: 'Je heupen komen te hoog.', fix: 'Houd je lichaam in één lijn van schouders tot heupen.' },
    ],
    easier: 'tuck-front-lever',
    harder: 'one-leg-front-lever',
  },
  'one-leg-front-lever': {
    short: [
      'Eén been gestrekt, het andere gebogen, rug horizontaal.',
      'Armen gestrekt, schouders omlaag.',
      'Heupen zakken? Buig het gestrekte been weer.',
    ],
    setup: 'Hang aan een stang met een overhandse greep. Trek je schouders omlaag en kom in een advanced tuck front lever.',
    movement: 'Strek één been recht uit in lijn met je romp en houd het andere been gebogen. Houd je rug horizontaal en wissel bij de volgende set van been.',
    tempo: 'Adem rustig door. Kom gecontroleerd terug naar hangen.',
    mistakes: [
      { fault: 'Je heupen zakken zodra je het been strekt.', fix: 'Buig het been weer en bouw rustig op.' },
      { fault: 'Je trekt met gebogen armen.', fix: 'Houd je armen gestrekt.' },
    ],
    easier: 'advanced-tuck-front-lever',
    harder: 'straddle-front-lever',
  },
  'straddle-front-lever': {
    short: [
      'Beide benen gestrekt en gespreid, rug horizontaal.',
      'Armen gestrekt, een rechte lijn van schouder tot enkel.',
      'Knikken in je heupen? Ga terug naar één been.',
    ],
    setup: 'Hang aan een stang met een overhandse greep. Trek je schouders omlaag en kom in een front lever met één been.',
    movement: 'Strek beide benen en spreid ze zo ver als nodig is om je rug horizontaal te houden. Houd je armen gestrekt en je lichaam in één lijn.',
    tempo: 'Adem rustig door. Kom gecontroleerd terug naar hangen.',
    mistakes: [
      { fault: 'Je knikt in je heupen.', fix: 'Spreid je benen verder of ga terug naar één been.' },
      { fault: 'Je rug zakt door.', fix: 'Span je buik en billen aan en kort de houdtijd in.' },
    ],
    easier: 'one-leg-front-lever',
  },
  'chest-to-bar-pull-up': {
    short: [
      'Trek tot de stang je onderste borst raakt.',
      'Elleboog naar je heup, leun een beetje achterover.',
      'Zwaaien? Span je buik aan en houd je benen stil.',
    ],
    setup: 'Overhandse greep, iets breder dan je schouders. Hang met gestrekte armen en trek je schouders licht omlaag.',
    movement: 'Trek je ellebogen naar je heupen en leun een beetje achterover, tot de stang je onderste borst raakt. Zak daarna tot je armen weer gestrekt zijn.',
    tempo: 'Krachtig omhoog, twee tellen omlaag. Adem uit tijdens het trekken.',
    mistakes: [
      { fault: 'Je trekt maar tot je kin.', fix: 'Trek harder naar je heupen en leun een beetje achterover.' },
      { fault: 'Je schopt met je benen.', fix: 'Span buik en billen aan en houd je benen stil.' },
    ],
    easier: 'pull-up',
    harder: 'straight-bar-dip',
  },
  'straight-bar-dip': {
    short: [
      'Steun boven een rechte stang, borst voorover over de stang.',
      'De stang raakt je bovenbenen, schouders blijven laag.',
      'Voelt je schouder het? Zak minder diep.',
    ],
    setup: 'Spring in steun boven een rechte stang, met de stang tegen je bovenbenen. Je handen staan op schouderbreedte, je armen zijn gestrekt.',
    movement: 'Buig je ellebogen en breng je borst voorover over de stang, tot je bovenarmen ongeveer waterpas zijn. Duw terug tot je armen gestrekt zijn. Je schouders blijven laag.',
    tempo: 'Twee tellen omlaag, rustig omhoog. Adem in bij het zakken.',
    mistakes: [
      { fault: 'Je blijft rechtop en de stang raakt je buik.', fix: 'Breng je borst voorover over de stang.' },
      { fault: 'Je schouders trekken omhoog.', fix: 'Duw je schouders omlaag en zak minder diep.' },
    ],
    easier: 'chest-to-bar-pull-up',
    harder: 'negative-muscle-up',
  },
  'negative-muscle-up': {
    short: [
      'Begin in steun boven de stang en zak in 5 seconden.',
      'Ga met je borst over de stang terug naar beneden.',
      'Vallen? Zak langzamer en houd de stang dicht bij je.',
    ],
    setup: 'Spring in steun boven een stang, handen op schouderbreedte, met een zachte landing eronder. Je armen zijn gestrekt.',
    movement: 'Zak langzaam over de stang heen, met je borst dicht bij de stang, tot je in een volle hang hangt. Je hoeft niet omhoog te trekken: spring terug naar boven voor de volgende herhaling.',
    tempo: 'Ongeveer vijf tellen omlaag. Adem in bij het zakken.',
    mistakes: [
      { fault: 'Je valt door je ellebogen.', fix: 'Zak langzamer en houd de stang dicht bij je borst.' },
      { fault: 'Je laat de stang van je af zwaaien.', fix: 'Houd de stang dicht bij je lichaam.' },
    ],
    easier: 'straight-bar-dip',
    harder: 'muscle-up',
  },
  'muscle-up': {
    short: [
      'Trek explosief over de stang tot je in steun staat.',
      'Houd de stang dicht bij je onderbuik.',
      'Je mist de draai? Oefen eerst de negatieve variant.',
    ],
    setup: 'Hang aan een stang met een overhandse greep die een beetje dichter bij elkaar ligt dan schouderbreedte. Je armen zijn gestrekt en je buik is aangespannen.',
    movement: 'Trek de stang krachtig naar je onderbuik, kantel je borst over de stang en strek je armen tot je in steun staat. Zak daarna gecontroleerd terug naar een hang.',
    tempo: 'Krachtig omhoog, drie tellen omlaag. Adem uit tijdens het trekken.',
    mistakes: [
      { fault: 'De stang zwaait van je af.', fix: 'Houd hem dicht bij je onderbuik en trek hem naar je toe.' },
      { fault: 'Je blijft onder de stang hangen.', fix: 'Oefen de negatieve muscle-up en de straight bar dip.' },
    ],
    easier: 'negative-muscle-up',
  },
};
