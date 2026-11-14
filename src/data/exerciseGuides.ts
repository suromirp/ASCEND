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
    easier: 'incline-push-up',
    harder: 'decline-push-up',
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
    harder: 'weighted-pull-up',
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
      'Knieën gebogen? Zet je voeten iets verder van je handen.',
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
    movement: 'Duw de vloer weg met je schouders en houd je armen gestrekt. Span buik en billen aan. Je corrigeert je balans met je vingers: helt je naar voren over, druk dan je vingertoppen in de vloer.',
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
      'Hoofd tegen de muur? Zet je handen verder weg.',
    ],
    setup: 'Leg een opgevouwen handdoek of mat voor de muur. Ga met je buik naar de muur in een handstand staan, handen op schouderbreedte en een flinke handbreedte van de muur.',
    movement: 'Zak met je ellebogen schuin naar achteren tot je hoofd de mat raakt. Duw je terug tot je armen gestrekt zijn. Je benen blijven tegen de muur en doen niet mee.',
    tempo: 'Twee tellen omlaag, rustig omhoog. Adem in bij het zakken.',
    mistakes: [
      { fault: 'Je handen staan te dicht bij de muur en je hoofd botst.', fix: 'Zet je handen een flinke handbreedte of meer van de muur, zodat je hoofd voor je handen landt.' },
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
  // Batch 1 (docs/onderzoek/Bronnen bij de uitleg van oefeningen, batch 1.md): het demoprogramma en de Dip.
  'bench-press': {
    short: [
      'Stang naar je borst, duw hem recht omhoog.',
      'Schouderbladen samen, voeten stevig op de vloer.',
      'Stuiteren op je borst? Zak rustig en tik alleen aan.',
    ],
    setup: 'Ga liggen met je ogen onder de stang. Schouderbladen naar elkaar en omlaag, voeten plat, billen op de bank. Pak de stang iets breder dan je schouders. Train je met een spotter of stel veiligheidsarmen in.',
    movement: 'Laat de stang zakken tot hij je borst licht raakt, ongeveer ter hoogte van je tepels. Je ellebogen staan schuin naar achteren en je polsen boven je ellebogen. Duw de stang terug tot je armen gestrekt zijn.',
    tempo: 'Twee tellen omlaag, krachtig omhoog. Adem in bij het zakken, uit bij het duwen.',
    mistakes: [
      { fault: 'Je laat de stang op je borst stuiteren.', fix: 'Zak in twee tellen en duw zonder te stuiteren.' },
      { fault: 'Je ellebogen staan recht opzij.', fix: 'Zet ze schuin naar achteren, dichter bij je lichaam.' },
    ],
  },
  'barbell-row': {
    short: [
      'Trek de stang naar je onderbuik, ellebogen langs je lijf.',
      'Je rug blijft vlak, je romp blijft stil.',
      'Schokken met je romp? Neem minder gewicht.',
    ],
    setup: 'Voeten op heupbreedte, knieën licht gebogen. Pak de stang onderhands, ongeveer schouderbreed. Buig voorover vanuit je heupen met een vlakke rug, de stang hangt voor je knieën.',
    movement: 'Trek de stang naar je onderbuik en houd je ellebogen dicht langs je lichaam. Knijp bovenaan even je schouderbladen samen. Laat de stang gecontroleerd zakken tot je armen gestrekt zijn.',
    tempo: 'Krachtig omhoog, twee tellen omlaag. Adem uit tijdens het trekken.',
    mistakes: [
      { fault: 'Je schokt met je romp omhoog.', fix: 'Houd je romp stil en kies een lager gewicht.' },
      { fault: 'Je rug rondt.', fix: 'Houd je borst hoog en stop een herhaling eerder.' },
    ],
  },
  'overhead-press': {
    short: [
      'Duw de stang vanaf je sleutelbeen recht omhoog.',
      'Billen en buik aan, je ribben naar beneden.',
      'Hol kruis? Span je billen aan en neem minder gewicht.',
    ],
    setup: 'Sta op heupbreedte. Pak de stang iets breder dan je schouders en zet hem op je sleutelbeen, je ellebogen net voor de stang. Span je billen en buik aan.',
    movement: 'Duw de stang recht omhoog en haal je hoofd even naar achteren zodat hij erlangs kan. Zet je hoofd daarna onder de stang terug, met gestrekte armen boven je schouders. Zak weer tot je sleutelbeen.',
    tempo: 'Krachtig omhoog, twee tellen omlaag. Adem in voor je duwt, uit bovenaan.',
    mistakes: [
      { fault: 'Je maakt een hol kruis.', fix: 'Houd je ribben naar beneden en span je billen aan.' },
      { fault: 'De stang gaat in een boog naar voren.', fix: 'Duw hem recht omhoog, dicht langs je gezicht.' },
    ],
    easier: 'dumbbell-shoulder-press',
  },
  'lat-pulldown': {
    short: [
      'Trek de stang naar je bovenste borst, ellebogen omlaag.',
      'Schouders omlaag, weg van je oren.',
      'Achteroverleunen? Neem minder gewicht.',
    ],
    setup: 'Zit met je dijen stevig onder de kussens. Pak de stang onderhands, ongeveer schouderbreed. Leun licht achterover en hang met gestrekte armen.',
    movement: 'Trek je schouders omlaag en breng de stang naar je bovenste borst, met je ellebogen naar je heupen. Laat de stang rustig weer omhoog komen tot je armen gestrekt zijn.',
    tempo: 'Krachtig omlaag, twee tot drie tellen omhoog. Adem uit tijdens het trekken.',
    mistakes: [
      { fault: 'Je leunt ver achterover en zwaait de stang omlaag.', fix: 'Neem minder gewicht en houd je romp bijna stil.' },
      { fault: 'Je schouders gaan richting je oren.', fix: 'Trek je schouders eerst omlaag, dan pas je armen.' },
    ],
  },
  'lateral-raise': {
    short: [
      'Til de gewichten zijwaarts tot schouderhoogte.',
      'Ellebogen licht gebogen, je romp blijft stil.',
      'Zwaaien? Kies een lichter gewicht.',
    ],
    setup: 'Sta rechtop met een dumbbell in elke hand langs je lichaam. Je ellebogen zijn licht gebogen en je schouders ontspannen.',
    movement: 'Til je armen zijwaarts, met je ellebogen voorop, tot ongeveer schouderhoogte. Houd je ellebogen licht gebogen. Laat de gewichten rustig weer zakken.',
    tempo: 'Eén tel omhoog, twee tellen omlaag. Adem uit bij het tillen.',
    mistakes: [
      { fault: 'Je zwaait met je hele lichaam.', fix: 'Kies een lichter gewicht en houd je romp stil.' },
      { fault: 'Je schouders trekken naar je oren.', fix: 'Houd je schouders laag en stop op schouderhoogte.' },
    ],
  },
  'triceps-pushdown': {
    short: [
      'Duw de stang omlaag tot je armen gestrekt zijn.',
      'Je ellebogen blijven aan je zij.',
      'Voorover leunen? Neem minder gewicht.',
    ],
    setup: 'Sta dicht bij de kabel en pak de V-stang met beide handen. Zet je ellebogen tegen je zij, je romp rechtop of licht voorover.',
    movement: 'Duw de stang omlaag tot je armen gestrekt zijn en span je triceps even aan. Laat de stang rustig omhoog komen tot je onderarmen ongeveer waterpas zijn. Alleen je onderarmen bewegen.',
    tempo: 'Krachtig omlaag, twee tellen omhoog. Adem uit bij het duwen.',
    mistakes: [
      { fault: 'Je ellebogen gaan naar voren mee.', fix: 'Houd ze tegen je zij en laat alleen je onderarmen bewegen.' },
      { fault: 'Je leunt voorover en duwt met je lichaam.', fix: 'Neem minder gewicht en blijf rechtop.' },
    ],
  },
  'back-squat': {
    short: [
      'Zak tot je dijen waterpas zijn, duw met je hele voet omhoog.',
      'Je knieën volgen je tenen, je borst blijft hoog.',
      'Heupen schieten omhoog? Breng je borst en heupen samen op.',
    ],
    setup: 'Leg de stang op je bovenrug, niet op je nek, en pak hem stevig vast. Voeten iets breder dan je heupen, tenen licht naar buiten. Zet veiligheidsarmen in het rek. Adem in en span je romp aan.',
    movement: 'Zak door je heupen en knieën tegelijk tot je dijen minstens waterpas zijn. Je knieën volgen je tenen en je borst blijft hoog. Duw met je hele voet vast op de grond omhoog.',
    tempo: 'Twee tellen omlaag, krachtig omhoog. Adem in bovenaan, uit als je de lastigste stand voorbij bent.',
    mistakes: [
      { fault: 'Je knieën vallen naar binnen.', fix: 'Duw ze naar buiten, boven je tenen.' },
      { fault: 'Je heupen komen eerder omhoog dan je borst.', fix: 'Neem minder gewicht en laat borst en heupen samen stijgen.' },
    ],
    harder: 'pause-back-squat',
  },
  'seated-leg-curl': {
    short: [
      'Trek je hielen omlaag en achter je, laat rustig terug.',
      'Het kussen zit stevig op je bovenbenen.',
      'Meeschommelen met je romp? Neem minder gewicht.',
    ],
    setup: 'Stel de machine zo in dat je knieën naast de draaias zitten. Het kussen ligt boven je hielen op je onderbenen, het bovenbeenkussen zit stevig. Je rug ligt tegen de leuning.',
    movement: 'Trek je hielen omlaag en achter je tot je knieën ver gebogen zijn. Laat het kussen rustig terugkomen tot je benen bijna gestrekt zijn.',
    tempo: 'Eén tel omlaag, drie tellen terug. Adem uit bij het trekken.',
    mistakes: [
      { fault: 'Je schommelt met je bovenlichaam mee.', fix: 'Neem minder gewicht en houd je rug tegen de leuning.' },
      { fault: 'Je laat het gewicht terugvallen.', fix: 'Tel drie tellen terug.' },
    ],
  },
  'bulgarian-split-squat': {
    short: [
      'Achterste voet op een bank, zak recht omlaag.',
      'Je voorste knie volgt je tweede teen.',
      'Knie schiet door? Zet je voorste voet verder naar voren.',
    ],
    setup: 'Zet de wreef van je achterste voet op een bank. Zet je voorste voet ver genoeg naar voren om je hiel te houden. Houd je romp rechtop, met eventueel een dumbbell in elke hand.',
    movement: 'Zak recht omlaag tot je voorste bovenbeen ongeveer waterpas is. Je knie blijft boven je voet. Duw met je voorste been terug omhoog. Doe alle herhalingen aan één kant en wissel dan.',
    tempo: 'Twee tot drie tellen omlaag, krachtig omhoog. Adem in bij het zakken.',
    mistakes: [
      { fault: 'Je staat te dicht bij de bank.', fix: 'Zet je voorste voet een stuk verder naar voren.' },
      { fault: 'Je knie zakt naar binnen.', fix: 'Duw hem naar buiten, boven je tweede teen.' },
    ],
    easier: 'split-squat',
  },
  'plank': {
    short: [
      'Steun op je onderarmen, lijn van hoofd tot hielen.',
      'Billen en buik aan, blijf rustig doorademen.',
      'Zakken je heupen? Stop of kies een kortere tijd.',
    ],
    setup: 'Leg je onderarmen op de grond, ellebogen recht onder je schouders. Strek je benen achter je en zet je tenen neer.',
    movement: 'Til je heupen op tot je lichaam een rechte lijn vormt, van hoofd tot hielen. Span je billen en buik aan, houd je nek lang en kijk naar de vloer. Houd deze stand voor de hele tijd.',
    tempo: 'Geen tellen, een houding. Adem rustig door en houd je buik aangespannen.',
    mistakes: [
      { fault: 'Je heupen zakken of steken omhoog.', fix: 'Zoek de rechte lijn en stop als je die verliest.' },
      { fault: 'Je houdt je adem in.', fix: 'Adem rustig door, ook als het zwaar wordt.' },
    ],
  },
  'machine-chest-press': {
    short: [
      'Duw de handgrepen naar voren, laat rustig terugkomen.',
      'Handgrepen op borsthoogte, schouders tegen de leuning.',
      'Schouders naar voren? Zet de zitting anders.',
    ],
    setup: 'Stel de zitting zo in dat de handgrepen ongeveer op borsthoogte zijn. Leun met je rug en schouderbladen tegen de leuning en zet je voeten plat.',
    movement: 'Duw de handgrepen naar voren tot je armen bijna gestrekt zijn. Laat ze rustig terugkomen tot je ellebogen ongeveer in lijn met je borst zijn. Je schouders blijven tegen de leuning.',
    tempo: 'Eén tel duwen, twee tot drie tellen terug. Adem uit bij het duwen.',
    mistakes: [
      { fault: 'Je schouders rollen naar voren.', fix: 'Houd je schouderbladen tegen de leuning.' },
      { fault: 'De handgrepen staan te hoog of te laag.', fix: 'Zet de zitting zo dat ze op borsthoogte zijn.' },
    ],
  },
  'incline-dumbbell-press': {
    short: [
      'Bank op 45 graden, duw de dumbbells recht omhoog.',
      'Schouderbladen blijven op de bank.',
      'Bank te steil? Zet hem terug op 45 graden.',
    ],
    setup: 'Zet de bank op 45 graden. Ga zitten met de dumbbells op je bovenbenen en breng ze naar je schouders. Schouderbladen naar elkaar en omlaag, voeten plat op de vloer.',
    movement: 'Duw de dumbbells recht omhoog tot je armen gestrekt zijn. Laat ze gecontroleerd zakken tot ze naast je bovenste borst zijn, met je ellebogen schuin naar achteren. Je onderarmen staan ongeveer loodrecht.',
    tempo: 'Twee tellen omlaag, krachtig omhoog. Adem in bij het zakken, uit bij het duwen.',
    mistakes: [
      { fault: 'Je schouderbladen komen van de bank.', fix: 'Neem minder gewicht en houd ze naar elkaar en omlaag.' },
      { fault: 'De bank staat te steil.', fix: 'Zet hem op 45 graden, anders neemt je schouder het over.' },
    ],
  },
  'chest-supported-row': {
    short: [
      'Borst op de bank, trek de dumbbells naar je heupen.',
      'Knijp bovenaan je schouderbladen samen.',
      'Borst van de bank? Neem minder gewicht.',
    ],
    setup: 'Zet de bank schuin en leg je borst erop, met je voeten stevig op de grond. Laat de dumbbells met gestrekte armen hangen, handpalmen naar elkaar.',
    movement: 'Trek de dumbbells naar je heupen en houd je ellebogen dicht langs je lichaam. Knijp bovenaan even je schouderbladen samen. Laat ze gecontroleerd zakken tot je armen gestrekt zijn.',
    tempo: 'Eén tel omhoog, twee tellen omlaag. Adem uit tijdens het trekken.',
    mistakes: [
      { fault: 'Je tilt je borst van de bank.', fix: 'Neem minder gewicht en houd je borst op de bank.' },
      { fault: 'Je schouders trekken naar je oren.', fix: 'Trek je schouders omlaag voor je je armen buigt.' },
    ],
  },
  'goblet-squat': {
    short: [
      'Gewicht tegen je borst, zak diep tussen je knieën.',
      'Je borst blijft hoog, je hielen blijven plat.',
      'Voorover buigen? Houd het gewicht dicht tegen je borst.',
    ],
    setup: 'Houd één dumbbell rechtop tegen je borst, met je handen onder het bovenste uiteinde. Voeten iets breder dan je heupen, tenen licht naar buiten.',
    movement: 'Zak rechtdoor tussen je knieën zo diep als je netjes kunt, met je ellebogen binnen je knieën. Je borst blijft hoog en je hielen blijven plat. Duw door je hele voet terug omhoog.',
    tempo: 'Twee tellen omlaag, krachtig omhoog. Adem in bij het zakken.',
    mistakes: [
      { fault: 'Je buigt voorover in plaats van te zakken.', fix: 'Houd het gewicht dicht tegen je borst en je borst hoog.' },
      { fault: 'Je hielen komen van de grond.', fix: 'Zet je voeten iets breder en zak minder diep.' },
    ],
  },
  'step-up': {
    short: [
      'Zet een voet op de verhoging en sta op met dat been.',
      'Je andere voet tikt alleen licht aan.',
      'Afzetten met je onderste been? Zet de verhoging lager.',
    ],
    setup: 'Zet je hele voet stevig op een verhoging waarbij je knie ongeveer 90 graden krijgt. Houd je romp rechtop, met eventueel een dumbbell in elke hand.',
    movement: 'Duw met het been op de verhoging jezelf omhoog tot je rechtop staat. Tik met je andere voet licht aan zonder je af te zetten. Zak langzaam terug. Doe alle herhalingen aan één kant en wissel dan.',
    tempo: 'Krachtig omhoog, twee tot drie tellen terug. Adem uit bij het opstaan.',
    mistakes: [
      { fault: 'Je zet af met het been op de grond.', fix: 'Kies een lagere verhoging en duw alleen met het werkbeen.' },
      { fault: 'Je knie zakt naar binnen.', fix: 'Duw hem naar buiten, boven je tweede teen.' },
    ],
    harder: 'step-up-pack',
  },
  'side-plank': {
    short: [
      'Steun op één onderarm, til je heupen in een rechte lijn.',
      'Je elleboog staat recht onder je schouder.',
      'Zakken je heupen? Kies een kortere tijd.',
    ],
    setup: 'Ga op je zij liggen met je onderarm op de grond, elleboog recht onder je schouder. Leg je voeten op elkaar of de ene net voor de andere.',
    movement: 'Til je heupen op tot je lichaam van hoofd tot voeten een rechte lijn vormt. Houd je bovenste arm langs je lichaam of op je heup. Houd de stand voor de hele tijd en doe dan de andere kant.',
    tempo: 'Geen tellen, een houding. Adem rustig door.',
    mistakes: [
      { fault: 'Je heupen zakken naar de vloer.', fix: 'Duw je onderarm in de grond en stop als je de lijn verliest.' },
      { fault: 'Je romp draait naar voren of achteren.', fix: 'Houd je borst en heupen recht boven elkaar.' },
    ],
  },
  'reverse-lunge': {
    short: [
      'Stap naar achteren, zak recht omlaag.',
      'Je voorste knie blijft boven je voet.',
      'Afzetten met je achterste been? Duw door je voorste hiel.',
    ],
    setup: 'Sta rechtop met je voeten op heupbreedte, eventueel met een dumbbell in elke hand. Houd je romp rechtop.',
    movement: 'Stap met één been naar achteren en zak recht omlaag tot je achterste knie bijna de grond raakt. Je voorste knie blijft boven je voet. Duw door je voorste hiel terug naar staand. Doe alle herhalingen aan één kant of wissel af.',
    tempo: 'Twee tellen omlaag, krachtig omhoog. Adem in bij het zakken.',
    mistakes: [
      { fault: 'Je zet je af met het achterste been.', fix: 'Duw door de hiel van je voorste been terug omhoog.' },
      { fault: 'Je valt naar voren of opzij.', fix: 'Stap iets verder terug en houd je romp rechtop.' },
    ],
    harder: 'walking-lunge',
  },
  'eccentric-squat': {
    short: [
      'Zak in vier tellen, sta met twee benen op.',
      'Je knieën volgen je tenen, je hielen blijven plat.',
      'Onderaan versnellen? Tel hardop mee.',
    ],
    setup: 'Sta met je voeten iets breder dan je heupen, tenen licht naar buiten. Je armen mogen naar voren voor balans. Dit kan zonder gewicht.',
    movement: 'Zak heel langzaam, ongeveer vier seconden, tot je dijen ongeveer waterpas zijn. Je knieën volgen je tenen en je hielen blijven plat. Sta op met twee benen, desnoods met een hand als hulp.',
    tempo: 'Vier tellen omlaag, rustig omhoog. Adem in bij het zakken.',
    mistakes: [
      { fault: 'Je versnelt onderaan.', fix: 'Tel hardop vier tellen en zak minder diep als dat niet lukt.' },
      { fault: 'Je knieën vallen naar binnen.', fix: 'Duw ze naar buiten, boven je tenen.' },
    ],
  },
  'bodyweight-calf-raise': {
    short: [
      'Voorvoet op een trede, kom hoog op je tenen.',
      'Zak onderaan zo diep als je kunt.',
      'Te snel en te kort? Pauzeer boven en onder even.',
    ],
    setup: 'Zet je voorvoeten op de rand van een trede, met je hielen erover. Houd je knieën gestrekt en hou je met een hand vast voor balans.',
    movement: 'Duw je op tot je zo hoog mogelijk op je tenen staat en houd dat even vast. Zak langzaam zo diep als je kunt, tot je een rek in je kuiten voelt.',
    tempo: 'Eén tel omhoog, even stil, twee tellen omlaag. Adem rustig door.',
    mistakes: [
      { fault: 'Je doet kleine, snelle herhalingen.', fix: 'Ga helemaal omhoog en helemaal omlaag, met een pauze boven.' },
      { fault: 'Je knieën buigen mee.', fix: 'Houd ze gestrekt, zodat je kuit het werk doet.' },
    ],
    harder: 'single-leg-calf-raise',
  },
  'dip': {
    short: [
      'Zak tot je bovenarmen waterpas zijn, duw terug omhoog.',
      'Schouders omlaag, weg van je oren.',
      'Pijn in je schouder? Stop en zak minder diep.',
    ],
    setup: 'Steun op twee leuningen met gestrekte armen. Trek je schouders omlaag, weg van je oren. Kruis je benen of houd ze licht gebogen achter je.',
    movement: 'Zak gecontroleerd tot je bovenarmen ongeveer waterpas zijn, met je ellebogen schuin naar achteren. Duw jezelf terug omhoog tot je armen gestrekt zijn. Kom niet dieper dan je schouders prettig vinden.',
    tempo: 'Twee tellen omlaag, krachtig omhoog. Adem in bij het zakken.',
    mistakes: [
      { fault: 'Je zakt te diep met opgetrokken schouders.', fix: 'Stop als je bovenarmen waterpas zijn en houd je schouders laag.' },
      { fault: 'Je zwaait met je benen.', fix: 'Houd je romp stil en zak rustiger.' },
    ],
    easier: 'negative-dip',
    harder: 'weighted-dip',
  },
  // Batch 2 (docs/onderzoek/Bronnen bij de uitleg van oefeningen, batch 2.md).
  'dumbbell-preacher-curl': {
    short: [
      'Bovenarm op het kussen, buig je elleboog, zak rustig.',
      'Je bovenarm blijft de hele herhaling op het kussen.',
      'Elleboog komt omhoog? Neem een lichter gewicht.',
    ],
    setup: 'Stel het kussen zo in dat je hele bovenarm erop kan liggen. Leg hem erop en pak de dumbbell met je handpalm omhoog.',
    movement: 'Buig je elleboog tot de dumbbell bij je schouder is. Zak daarna rustig tot je arm bijna gestrekt is. Is helemaal strekken onprettig, kom dan eerder weer omhoog.',
    tempo: 'Rustig omhoog, twee tellen omlaag. Adem uit tijdens het buigen.',
    mistakes: [
      { fault: 'Je tilt je elleboog van het kussen.', fix: 'Neem een lichter gewicht en houd je bovenarm op het kussen.' },
      { fault: 'Je laat de dumbbell onderaan vallen.', fix: 'Zak in twee tellen en houd spanning in je biceps.' },
    ],
  },
  'assisted-pull-up': {
    short: [
      'Knie op het kussen, trek je op tot je kin boven de greep is.',
      'Het gewicht dat je kiest is de hulp: minder is zwaarder.',
      'Zwaaien? Span je buik aan en trek rustiger.',
    ],
    setup: 'Kies een hulpgewicht en zet je knieën op het kussen. Pak de handgrepen met je handpalmen naar elkaar. Hang met gestrekte armen en trek je schouders licht omlaag.',
    movement: 'Trek je ellebogen naar je heupen tot je kin boven de handgrepen is. Zak daarna gecontroleerd tot je armen weer gestrekt zijn. Kun je dit met gemak, neem dan minder hulp.',
    tempo: 'Rustig omhoog, twee tellen omlaag.',
    mistakes: [
      { fault: 'Je zakt niet tot je armen gestrekt zijn.', fix: 'Begin elke herhaling in een volledige hang.' },
      { fault: 'Je zwaait met je romp.', fix: 'Span je buik aan en kies meer hulp als het nodig is.' },
    ],
    harder: 'pull-up',
  },
  'incline-hammer-curl': {
    short: [
      'Achterover op een schuine bank, duimen omhoog, buig.',
      'Je ellebogen blijven naast of iets achter je lichaam.',
      'Ellebogen naar voren? Leun verder achterover.',
    ],
    setup: 'Zet de bank op een flinke helling en leun achterover met je hoofd en rug tegen de bank. Laat je armen langs je lichaam hangen, handpalmen naar elkaar.',
    movement: 'Buig je ellebogen en breng de dumbbells omhoog met je duimen naar boven. Houd je bovenarmen stil. Zak daarna rustig tot je armen weer hangen.',
    tempo: 'Rustig omhoog, twee tellen omlaag. Houd je polsen recht.',
    mistakes: [
      { fault: 'Je ellebogen komen naar voren.', fix: 'Houd ze naast je lichaam en zet de bank schuiner.' },
      { fault: 'Je tilt je schouders van de bank.', fix: 'Neem een lichter gewicht en houd je rug tegen de bank.' },
    ],
  },
  'overhead-triceps-extension': {
    short: [
      'Ellebogen wijzen omhoog, strek je armen boven je hoofd.',
      'Je ellebogen blijven dicht bij je hoofd.',
      'Ellebogen wijd? Neem een lichter gewicht.',
    ],
    setup: 'Zet de kabel laag en pak het touw met beide handen. Sta met je rug naar de machine, een voet voor de andere. Breng je ellebogen boven je hoofd.',
    movement: 'Strek je armen vanuit een ellebooghoek van ongeveer 90 graden tot ze gestrekt zijn. Je bovenarmen blijven stil. Laat daarna rustig terugkomen tot je triceps rekt.',
    tempo: 'Krachtig strekken, twee tellen terug. Adem uit tijdens het strekken.',
    mistakes: [
      { fault: 'Je ellebogen vallen wijd uit.', fix: 'Houd ze dicht bij je hoofd en neem een lichter gewicht.' },
      { fault: 'Je rug wordt hol.', fix: 'Span je buik en billen aan en sta rechtop.' },
    ],
  },
  'seated-calf-raise': {
    short: [
      'Voorvoeten op de steun, duw hoog op je tenen, zak diep.',
      'Met gebogen knie werkt vooral je soleus.',
      'Halve herhalingen? Neem minder gewicht en ga helemaal.',
    ],
    setup: 'Stel het kussen in zodat het stevig op je bovenbenen zit, vlak boven je knieën. Zet de bal van je voeten op de steun, je hielen hangen vrij.',
    movement: 'Duw het gewicht omhoog door je enkels te strekken, zo hoog als kan. Zak daarna gecontroleerd tot je kuiten rekken. Pauzeer onderaan kort.',
    tempo: 'Eén tel omhoog, twee tellen omlaag. Stuiter niet onderaan.',
    mistakes: [
      { fault: 'Je maakt korte halve herhalingen.', fix: 'Neem minder gewicht en gebruik het hele bereik.' },
      { fault: 'Je stuitert onderaan.', fix: 'Pauzeer onderaan kort en duw dan rustig omhoog.' },
    ],
  },
  'leg-press-calf-raise': {
    short: [
      'Voorvoeten onderaan het plateau, duw door je tenen.',
      'Zak diep met je hielen, houd je knieën vrijwel gestrekt.',
      'Stuiteren? Pauzeer onderaan en neem minder gewicht.',
    ],
    setup: 'Zit met je rug en hoofd tegen de leuning. Zet alleen je voorvoeten op het plateau, op heupbreedte, met je hielen over de rand. Ontgrendel de veiligheid.',
    movement: 'Duw het plateau weg door je enkels te strekken, op je tenen. Zak daarna gecontroleerd met je hielen tot je kuiten rekken. Je knieën blijven vrijwel gestrekt en buigen niet mee.',
    tempo: 'Eén tel omhoog, twee tellen omlaag. Pauzeer onderaan kort.',
    mistakes: [
      { fault: 'Je stuitert in plaats van te zakken.', fix: 'Pauzeer onderaan kort en neem minder gewicht.' },
      { fault: 'Je knieën buigen en strekken mee.', fix: 'Houd ze vrijwel gestrekt en beweeg alleen met je enkels.' },
    ],
  },
  'seated-single-leg-curl': {
    short: [
      'Trek met één been je hiel omlaag en achter je.',
      'Het kussen zit stevig, je heupen blijven op de zitting.',
      'Schommelen? Neem minder gewicht, rug tegen de leuning.',
    ],
    setup: 'Zit met je rug tegen de leuning. Stel de machine zo in dat het kussen vlak boven je enkel ligt. Zet het andere been vrij en houd je vast aan de handgrepen.',
    movement: 'Buig je knie en trek je hiel naar je billen. Strek daarna rustig terug. Doe alle herhalingen met één been en wissel dan.',
    tempo: 'Eén tel omlaag, twee tellen terug. Beweeg gelijkmatig.',
    mistakes: [
      { fault: 'Je schommelt met je bovenlichaam.', fix: 'Neem minder gewicht en houd je rug tegen de leuning.' },
      { fault: 'Je knie draait mee.', fix: 'Houd je knie recht voor je en trek rustiger.' },
    ],
    easier: 'seated-leg-curl',
  },
  'leg-press': {
    short: [
      'Voeten op schouderbreedte, zak gecontroleerd, duw terug.',
      'Je billen en onderrug blijven tegen de zitting.',
      'Knieën naar binnen? Duw ze naar buiten.',
    ],
    setup: 'Zit met je rug en hoofd tegen de leuning, voeten ongeveer op schouderbreedte op het plateau. Pak de handgrepen en ontgrendel de veiligheid.',
    movement: 'Zak tot je knieën ongeveer 90 graden zijn, of dieper zolang je billen op de zitting en je onderrug tegen de leuning blijven. Duw het plateau weg zonder je knieën te vergrendelen.',
    tempo: 'Twee tellen omlaag, krachtig omhoog. Adem in bij het zakken.',
    mistakes: [
      { fault: 'Je knieën vallen naar binnen.', fix: 'Duw ze naar buiten, boven je tweede teen.' },
      { fault: 'Je billen komen van de zitting.', fix: 'Zak minder diep en houd je onderrug tegen de leuning.' },
    ],
  },
  // Batch 3 (docs/onderzoek/Bronnen bij de uitleg van oefeningen, batch 3.md): de stappen van de ladders push-up,
  // optrekken en dip, wat Spieren voor de berg kiest, en waar bestaande teksten naar verwijzen.
  'incline-push-up-high': {
    short: [
      'Handen op een aanrecht, zak met je borst naar de rand.',
      'Je lichaam is één lijn, van hoofd tot hielen.',
      'Te licht? Neem een lager steunpunt.',
    ],
    setup: 'Zet je handen op een aanrecht of hoge bank van ongeveer 60 centimeter, iets breder dan je schouders. Loop je voeten naar achteren tot je lichaam een rechte lijn is. Kies iets dat niet kan wegschuiven.',
    movement: 'Zak met je ellebogen schuin naar achteren tot je borst de rand bijna raakt. Duw terug tot je armen gestrekt zijn. Je buik en billen blijven aangespannen.',
    tempo: 'Twee tellen omlaag, rustig omhoog. Adem in bij het zakken, uit bij het duwen.',
    mistakes: [
      { fault: 'Je ellebogen vallen wijd uit.', fix: 'Zet ze schuiner naar achteren.' },
      { fault: 'Je heupen zakken door.', fix: 'Span je billen en buik aan.' },
    ],
    harder: 'knee-push-up',
  },
  'knee-push-up': {
    short: [
      'Op je knieën, zak tot je borst bijna de vloer raakt.',
      'Recht van knie tot hoofd, je billen niet achter je.',
      'Alleen je hoofd zakt? Breng je borst naar de vloer.',
    ],
    setup: 'Kniel op een mat en zet je handen iets breder dan je schouders, vingers naar voren. Schuif je knieën naar achteren tot je lichaam van knie tot hoofd een rechte lijn is.',
    movement: 'Zak met je ellebogen schuin naar achteren tot je borst een vuist boven de vloer is. Duw de vloer weg tot je armen gestrekt zijn. Je heupen bewegen mee met je borst.',
    tempo: 'Twee tellen omlaag, rustig omhoog. Adem in bij het zakken, uit bij het duwen.',
    mistakes: [
      { fault: 'Je billen blijven hoog en achter je.', fix: 'Schuif je knieën verder naar achteren en span je billen aan.' },
      { fault: 'Alleen je hoofd zakt.', fix: 'Kijk naar de vloer vlak voor je handen en zak met je borst.' },
    ],
    easier: 'incline-push-up-high',
    harder: 'incline-push-up',
  },
  'incline-push-up': {
    short: [
      'Handen op een lage bank, zak met je borst naar de rand.',
      'Je lichaam is één lijn, van hoofd tot hielen.',
      'Heupen komen eerst omhoog? Span je billen en buik aan.',
    ],
    setup: 'Zet je handen op een stevige bank of trede van ongeveer 30 centimeter, iets breder dan je schouders. Strek je benen naar achteren, voeten bij elkaar.',
    movement: 'Zak met je ellebogen schuin naar achteren tot je borst de rand bijna raakt. Duw terug tot je armen gestrekt zijn. Borst en heupen komen tegelijk omhoog.',
    tempo: 'Twee tellen omlaag, rustig omhoog. Adem in bij het zakken, uit bij het duwen.',
    mistakes: [
      { fault: 'Je heupen komen eerder omhoog dan je borst.', fix: 'Span je billen en buik aan en duw je hele lichaam tegelijk op.' },
      { fault: 'De bank schuift weg.', fix: 'Zet hem tegen een muur.' },
    ],
    easier: 'knee-push-up',
    harder: 'push-up',
  },
  'decline-push-up': {
    short: [
      'Voeten op een bank, zak met je borst naar de vloer.',
      'Buik en billen aan, je rug zakt niet door.',
      'Je hoofd gaat eerst? Kijk iets voor je handen.',
    ],
    setup: 'Zet je handen op de vloer, iets breder dan je schouders, en je voeten op een bank van ongeveer 30 centimeter. Span je buik en billen aan.',
    movement: 'Zak met je ellebogen schuin naar achteren tot je borst een vuist boven de vloer is. Duw terug tot je armen gestrekt zijn. Er rust meer gewicht op je handen dan bij een gewone push-up.',
    tempo: 'Twee tellen omlaag, rustig omhoog. Adem in bij het zakken, uit bij het duwen.',
    mistakes: [
      { fault: 'Je onderrug zakt door.', fix: 'Span je billen en buik aan, of zet je voeten lager.' },
      { fault: 'Je steekt je hoofd naar de vloer.', fix: 'Houd je hoofd in lijn met je rug en zak met je borst.' },
    ],
    easier: 'push-up',
    harder: 'diamond-push-up',
  },
  'diamond-push-up': {
    short: [
      'Handen bij elkaar onder je borst, zak en duw terug.',
      'Je ellebogen blijven langs je lichaam.',
      'Pijn in je polsen? Zet je handen iets uit elkaar.',
    ],
    setup: 'Zet je handen onder je borst, zo dicht bij elkaar dat je duimen en wijsvingers elkaar raken. Benen gestrekt, buik en billen aangespannen.',
    movement: 'Zak met je ellebogen langs je lichaam tot je borst je handen bijna raakt. Duw terug tot je armen gestrekt zijn. Je voelt dit meer in je triceps dan een gewone push-up.',
    tempo: 'Twee tellen omlaag, rustig omhoog. Adem in bij het zakken, uit bij het duwen.',
    mistakes: [
      { fault: 'Je handen staan te ver naar voren en je polsen knikken.', fix: 'Zet ze onder je borst, niet onder je gezicht.' },
      { fault: 'Je ellebogen vallen naar buiten.', fix: 'Houd ze langs je lichaam.' },
    ],
    easier: 'decline-push-up',
    harder: 'archer-push-up',
  },
  'archer-push-up': {
    short: [
      'Handen wijd, zak naar één hand, de andere arm blijft recht.',
      'Eerst de ene kant, dan de andere: samen één set.',
      'Heupen draaien mee? Zet je voeten breder.',
    ],
    setup: 'Zet je handen ruim breder dan je schouders, vingers iets naar buiten. Voeten op heupbreedte of breder, je lichaam als een plank.',
    movement: 'Buig één arm en zak met je borst naar die hand. De andere arm blijft gestrekt opzij. Duw terug naar het midden. Doe alle herhalingen aan één kant en wissel dan.',
    tempo: 'Twee tellen omlaag, rustig omhoog. Adem in bij het zakken, uit bij het duwen.',
    mistakes: [
      { fault: 'Je heupen draaien naar de kant waar je zakt.', fix: 'Span je buik aan en zet je voeten breder.' },
      { fault: 'De gestrekte arm buigt mee.', fix: 'Zak minder diep, tot hij recht blijft.' },
    ],
    easier: 'diamond-push-up',
  },
  'dead-hang': {
    short: [
      'Hang stil aan de stang, armen gestrekt.',
      'Schouders licht omlaag, niet tegen je oren.',
      'Glijden je handen weg? Kom eraf en rust.',
    ],
    setup: 'Pak de stang overhands op schouderbreedte, met je duimen eromheen. Stap van een verhoging af in plaats van te springen, dan zwaai je niet.',
    movement: 'Hang met gestrekte armen en je voeten van de grond. Trek je schouders een klein stukje omlaag, weg van je oren, en span je buik licht aan. Houd die stand.',
    tempo: 'Adem rustig door. Stop zodra je greep het niet meer houdt of je schouders omhoog kruipen.',
    mistakes: [
      { fault: 'Je zwaait.', fix: 'Span je buik en billen aan en houd je benen bij elkaar.' },
      { fault: 'Je schouders zitten tegen je oren.', fix: 'Trek ze een klein stukje omlaag.' },
    ],
    harder: 'scapular-pull-up',
  },
  'scapular-pull-up': {
    short: [
      'Hang met gestrekte armen, trek je schouderbladen omlaag.',
      'Je ellebogen buigen niet.',
      'Wordt het een halve pull-up? Maak de beweging kleiner.',
    ],
    setup: 'Hang aan de stang met een overhandse greep, iets breder dan je schouders. Je armen zijn gestrekt en je schouders ontspannen omhoog.',
    movement: 'Trek je schouderbladen omlaag en iets naar elkaar, zonder je ellebogen te buigen. Je lichaam komt een paar centimeter omhoog. Houd even vast en laat je schouders rustig terugkomen.',
    tempo: 'Eén tel omhoog, even stil, twee tellen terug. Adem rustig door.',
    mistakes: [
      { fault: 'Je buigt je armen.', fix: 'Houd je ellebogen gestrekt en beweeg alleen je schouders.' },
      { fault: 'Je zwaait met je benen.', fix: 'Span je buik aan en begin elke herhaling stil.' },
    ],
    easier: 'dead-hang',
    harder: 'negative-chin-up',
  },
  'negative-chin-up': {
    short: [
      'Begin met je kin boven de stang, zak in vijf tellen.',
      'Zak helemaal, tot je armen gestrekt zijn.',
      'Val je het laatste stuk? Stop de set.',
    ],
    setup: 'Zet een bank of box onder de stang. Pak de stang onderhands op schouderbreedte en stap of spring tot je kin erboven is.',
    movement: 'Til je voeten op en zak zo gelijkmatig als je kunt, in ongeveer vijf seconden, tot je armen gestrekt zijn. Zet je voeten weer op de bank en stap terug naar boven. Je trekt je niet op.',
    tempo: 'Vijf tellen omlaag. Adem rustig door.',
    mistakes: [
      { fault: 'Je laat je vallen in de onderste helft.', fix: 'Rem af tot het einde. Lukt dat niet meer, stop dan de set.' },
      { fault: 'Je slaat het laatste stuk over.', fix: 'Zak tot je armen gestrekt zijn.' },
    ],
    easier: 'scapular-pull-up',
    harder: 'pull-up',
  },
  'weighted-pull-up': {
    short: [
      'De pull-up met gewicht aan een riem of in een vest.',
      'Elke herhaling uit een volledige hang.',
      'Wordt je beweging korter? Neem minder gewicht.',
    ],
    setup: 'Hang het gewicht aan een riem om je middel of draag een vest. Begin met 2,5 kilo. Pak de stang overhands, iets breder dan je schouders, en hang met gestrekte armen.',
    movement: 'Trek je ellebogen naar je heupen tot je kin boven de stang is. Zak gecontroleerd tot je armen weer gestrekt zijn. Het gewicht hangt stil.',
    tempo: 'Rustig omhoog, twee tellen omlaag.',
    mistakes: [
      { fault: 'Je trekt minder hoog dan zonder gewicht.', fix: 'Neem minder gewicht en trek je kin boven de stang.' },
      { fault: 'Het gewicht zwaait.', fix: 'Kruis je enkels, span je buik aan en begin elke herhaling stil.' },
    ],
    easier: 'pull-up',
  },
  'support-hold': {
    short: [
      'Steun met gestrekte armen op twee leuningen, houd stil.',
      'Schouders omlaag, weg van je oren.',
      'Kruipen je schouders omhoog? Stop en rust.',
    ],
    setup: 'Pak twee leuningen op ongeveer schouderbreedte. Stap of spring omhoog tot je armen gestrekt zijn.',
    movement: 'Duw de leuningen weg, zodat je schouders laag blijven en je nek lang is. Je armen zijn gestrekt en je lichaam hangt recht onder je schouders, met je benen licht voor je of gekruist. Houd die stand.',
    tempo: 'Adem rustig door. Stop zodra je schouders omhoog kruipen.',
    mistakes: [
      { fault: 'Je schouders kruipen naar je oren.', fix: 'Duw de leuningen weg en maak je nek lang.' },
      { fault: 'Je zwaait.', fix: 'Span je buik en billen aan.' },
    ],
    harder: 'negative-dip',
  },
  'negative-dip': {
    short: [
      'Begin boven op de leuningen, zak in vijf tellen.',
      'Stop als je bovenarmen waterpas zijn, stap terug omhoog.',
      'Pijn in je schouder? Stop en zak minder diep.',
    ],
    setup: 'Zet een bank of box bij de leuningen. Steun met gestrekte armen en trek je schouders omlaag, weg van je oren.',
    movement: 'Zak zo gelijkmatig als je kunt, in ongeveer vijf seconden, met je ellebogen schuin naar achteren, tot je bovenarmen ongeveer waterpas zijn. Zet je voeten neer en stap terug naar boven. Je duwt jezelf niet op.',
    tempo: 'Vijf tellen omlaag. Adem in bij het zakken.',
    mistakes: [
      { fault: 'Je laat je het laatste stuk vallen.', fix: 'Rem af tot het einde. Lukt dat niet meer, stop dan de set.' },
      { fault: 'Je zakt dieper dan je schouders prettig vinden.', fix: 'Stop als je bovenarmen waterpas zijn.' },
    ],
    easier: 'support-hold',
    harder: 'dip',
  },
  'weighted-dip': {
    short: [
      'De dip met gewicht aan een riem of in een vest.',
      'Dezelfde diepte als zonder: bovenarmen waterpas.',
      'Pijn in je schouder? Stop en neem minder gewicht.',
    ],
    setup: 'Hang het gewicht aan een riem om je middel of draag een vest. Begin met 2,5 kilo. Steun op de leuningen met gestrekte armen en je schouders omlaag.',
    movement: 'Zak gecontroleerd tot je bovenarmen ongeveer waterpas zijn, met je ellebogen schuin naar achteren. Duw jezelf terug omhoog tot je armen gestrekt zijn. Het gewicht hangt stil.',
    tempo: 'Twee tellen omlaag, krachtig omhoog. Adem in bij het zakken.',
    mistakes: [
      { fault: 'Je zakt minder diep zodra er gewicht bij komt.', fix: 'Neem minder gewicht en zak tot je bovenarmen waterpas zijn.' },
      { fault: 'Het gewicht zwaait.', fix: 'Kruis je enkels en zak rustiger.' },
    ],
    easier: 'dip',
  },
  'single-leg-calf-raise': {
    short: [
      'Op één been op een trede, kom hoog op je tenen.',
      'Zak onderaan zo diep als je kunt.',
      'Trek je je op aan je hand? Alleen vingertoppen.',
    ],
    setup: 'Zet de voorvoet van één been op de rand van een trede, met je hiel erover. Je andere voet houd je los van de grond. Eén hand aan de muur of leuning voor balans.',
    movement: 'Duw je op tot je zo hoog mogelijk op je tenen staat en houd dat even vast. Zak langzaam zo diep als je kunt, met je knie gestrekt. Doe alle herhalingen aan één kant en wissel dan.',
    tempo: 'Eén tel omhoog, even stil, twee tellen omlaag. Adem rustig door.',
    mistakes: [
      { fault: 'Je knie buigt mee.', fix: 'Houd hem gestrekt, zodat je kuit het werk doet.' },
      { fault: 'Je trekt jezelf op aan je hand.', fix: 'Raak de muur alleen met je vingertoppen aan.' },
    ],
    easier: 'bodyweight-calf-raise',
  },
  'tibialis-raise': {
    short: [
      'Rug tegen de muur, trek je tenen naar je schenen.',
      'Hoe verder je voeten van de muur, hoe zwaarder.',
      'Knieën buigen mee? Zet je voeten dichter bij de muur.',
    ],
    setup: 'Leun met je rug en billen tegen een muur. Zet je voeten ongeveer een voetlengte naar voren, op heupbreedte, met je benen gestrekt.',
    movement: 'Trek je voorvoeten zo hoog mogelijk op, tot je alleen nog op je hielen staat. Houd even vast en laat ze rustig zakken tot je zolen plat staan. Je voelt het aan de voorkant van je scheenbeen.',
    tempo: 'Eén tel omhoog, even stil, twee tellen omlaag. Adem rustig door.',
    mistakes: [
      { fault: 'Je buigt je knieën of je billen komen van de muur.', fix: 'Zet je voeten dichter bij de muur.' },
      { fault: 'Je doet kleine, snelle herhalingen.', fix: 'Ga helemaal omhoog en helemaal omlaag, met een pauze boven.' },
    ],
    harder: 'tibialis-raise-loaded',
  },
  'glute-bridge': {
    short: [
      'Lig op je rug, duw je heupen omhoog met je billen.',
      'Bovenaan één lijn van schouders tot knieën.',
      'Hol in je rug? Stop eerder en span je buik aan.',
    ],
    setup: 'Lig op je rug met gebogen knieën, je voeten plat op heupbreedte en dicht bij je billen. Je armen liggen naast je.',
    movement: 'Duw door je hielen en til je heupen op tot je schouders, heupen en knieën één lijn zijn. Knijp je billen bovenaan even samen. Zak rustig terug tot je billen de vloer net raken.',
    tempo: 'Eén tel omhoog, even stil, twee tellen omlaag. Adem uit bij het omhoog komen.',
    mistakes: [
      { fault: 'Je duwt door tot een holle rug.', fix: 'Stop op de rechte lijn en span je buik aan.' },
      { fault: 'Je voelt vooral je hamstrings.', fix: 'Zet je voeten dichter bij je billen.' },
    ],
    harder: 'dumbbell-glute-bridge',
  },
  'step-down-pack': {
    short: [
      'De step-down met rugzak of vest, drie tellen omlaag.',
      'Je knie volgt de richting van je tweede teen.',
      'Pijn in je knie? Stop en doe hem zonder gewicht.',
    ],
    setup: 'Trek de rugzak of het vest strak aan, zodat hij niet schommelt. Begin met een paar kilo. Sta met je werkbeen op een stevige verhoging van 15 tot 20 centimeter, de andere voet over de rand.',
    movement: 'Buig je knie en zak in drie tellen tot de voet van je andere been de grond licht aantikt. Leg er geen gewicht op. Duw met het werkbeen terug omhoog. Houd je bekken recht en je romp rechtop.',
    tempo: 'Drie tellen omlaag, rustig omhoog. Adem in bij het zakken.',
    mistakes: [
      { fault: 'Je knie zakt naar binnen.', fix: 'Duw hem naar buiten, boven je tweede teen.' },
      { fault: 'Je ploft neer onder het gewicht.', fix: 'Neem minder gewicht, tot je drie tellen kunt remmen.' },
    ],
    easier: 'step-down',
  },
  'dumbbell-rdl': {
    short: [
      'Heupen terug, dumbbells langs je benen omlaag.',
      'Knieën licht gebogen en vast, je rug blijft recht.',
      'Ronde onderrug? Zak minder diep.',
    ],
    setup: 'Voeten op heupbreedte, een dumbbell in elke hand voor je bovenbenen. Knieën een beetje gebogen, schouders naar achteren en omlaag.',
    movement: 'Duw je heupen naar achteren en laat de dumbbells dicht langs je benen zakken, tot onder je knieën of tot de achterkant van je bovenbenen sterk rekt. Stop zodra je onderrug wil ronden. Duw je heupen naar voren tot je rechtop staat.',
    tempo: 'Twee tellen omlaag, krachtig omhoog. Adem in en span je romp aan voor je zakt.',
    mistakes: [
      { fault: 'Je zakt door je knieën.', fix: 'Houd ze vast en duw je billen naar achteren.' },
      { fault: 'De dumbbells zwaaien van je af.', fix: 'Houd ze de hele weg dicht bij je benen.' },
    ],
    harder: 'romanian-deadlift',
  },
  'split-squat': {
    short: [
      'Sta in spreidstand, zak recht omlaag, kom weer omhoog.',
      'Je gewicht rust vooral op je voorste been.',
      'Wankel je? Zet je voeten op heupbreedte, niet op één lijn.',
    ],
    setup: 'Zet één voet een grote stap naar voren en blijf zo staan. Je voeten staan op heupbreedte en je achterste hiel is van de grond. Eventueel een dumbbell in elke hand.',
    movement: 'Zak recht omlaag tot je achterste knie de vloer bijna raakt. Je voorste knie volgt je tenen en je voorste hiel blijft plat. Duw met je voorste been terug omhoog. Doe alle herhalingen aan één kant en wissel dan.',
    tempo: 'Twee tellen omlaag, rustig omhoog. Adem in bij het zakken.',
    mistakes: [
      { fault: 'Je achterste knie ploft op de vloer.', fix: 'Rem af en stop vlak boven de vloer.' },
      { fault: 'Je voorste knie valt naar binnen.', fix: 'Duw hem naar buiten, boven je tenen.' },
    ],
    harder: 'bulgarian-split-squat',
  },
  'pause-back-squat': {
    short: [
      'Een back squat met één tot twee tellen stil onderaan.',
      'In de pauze blijf je strak: romp aan, borst hoog.',
      'Stuiter je eruit? Neem minder gewicht.',
    ],
    setup: 'Als bij de back squat: de stang op je bovenrug, voeten iets breder dan je heupen, veiligheidsarmen in het rek. Neem minder gewicht dan bij je gewone squat.',
    movement: 'Zak tot je dijen minstens waterpas zijn en blijf daar één tot twee seconden stil, met je romp aangespannen. Duw daarna zonder te veren met je hele voet omhoog.',
    tempo: 'Twee tellen omlaag, even stil, krachtig omhoog. Adem in bovenaan, uit op weg omhoog.',
    mistakes: [
      { fault: 'Je ontspant in de pauze.', fix: 'Houd je romp aangespannen en je borst hoog.' },
      { fault: 'Je stuitert uit het diepste punt.', fix: 'Tel de pauze hardop en neem minder gewicht.' },
    ],
    easier: 'back-squat',
  },
  // Batch 4 (docs/onderzoek/Bronnen bij de uitleg van oefeningen, batch 4.md): de rest van de oefeningen voor de berg
  // (rugzak, scheenspier, bilspieren) en de gangbare oefeningen in een eigen programma.
  'dumbbell-shoulder-press': {
    short: [
      'Duw de dumbbells van schouderhoogte recht omhoog.',
      'Polsen boven je ellebogen, rug tegen de leuning.',
      'Hol kruis? Span je buik aan en neem minder gewicht.',
    ],
    setup: 'Zet de leuning bijna rechtop en ga zitten met je voeten plat op de vloer. Breng de dumbbells naar schouderhoogte, met je ellebogen onder je polsen en iets voor je lichaam.',
    movement: 'Duw de dumbbells recht omhoog tot je armen gestrekt zijn boven je schouders. Laat ze rustig zakken tot schouderhoogte. Ze hoeven elkaar bovenaan niet te raken.',
    tempo: 'Krachtig omhoog, twee tellen omlaag. Adem uit bij het duwen.',
    mistakes: [
      { fault: 'Je maakt een hol kruis.', fix: 'Houd je ribben naar beneden en je rug tegen de leuning.' },
      { fault: 'De dumbbells botsen bovenaan tegen elkaar.', fix: 'Duw ze recht omhoog, elk boven een schouder.' },
    ],
    harder: 'overhead-press',
  },
  'step-up-pack': {
    short: [
      'De step-up met de rugzak of het vest van je tocht.',
      'Sta op met het been op de verhoging.',
      'Pijn in je knie? Stop en doe hem zonder gewicht.',
    ],
    setup: 'Trek de rugzak of het vest strak aan, zodat hij niet schommelt. Begin licht. Zet je hele voet op een verhoging waarbij je knie ongeveer 90 graden krijgt.',
    movement: 'Duw met het been op de verhoging jezelf omhoog tot je rechtop staat. Tik met je andere voet licht aan zonder je af te zetten. Zak langzaam terug. Doe alle herhalingen aan één kant en wissel dan.',
    tempo: 'Krachtig omhoog, twee tot drie tellen terug. Adem uit bij het opstaan.',
    mistakes: [
      { fault: 'Je zet af met het been op de grond.', fix: 'Neem minder gewicht of een lagere verhoging.' },
      { fault: 'Je knie zakt naar binnen.', fix: 'Duw hem naar buiten, boven je tweede teen.' },
    ],
    easier: 'step-up',
  },
  'tibialis-raise-loaded': {
    short: [
      'Zit op een bank, gewicht aan je voorvoet, tenen omhoog.',
      'Beweeg vanuit je enkel, niet vanuit je knie.',
      'Zwaai je het omhoog? Neem minder gewicht.',
    ],
    setup: 'Zit op een hoge bank met je onderbenen over de rand, zodat je voeten vrij hangen. Hang het gewicht aan je voorvoet, met een tibialisstang of een dumbbell tussen je voeten geklemd.',
    movement: 'Trek je tenen zo hoog mogelijk naar je scheenbenen. Houd even vast en laat je voeten rustig zakken tot je enkels gestrekt zijn. Je bovenbenen blijven stil op de bank.',
    tempo: 'Eén tel omhoog, even stil, twee tellen omlaag. Adem rustig door.',
    mistakes: [
      { fault: 'Je zwaait het gewicht omhoog met je benen.', fix: 'Neem minder gewicht en beweeg alleen je enkels.' },
      { fault: 'Het gewicht glijdt van je voeten.', fix: 'Klem het steviger, of neem een lichter gewicht.' },
    ],
    easier: 'tibialis-raise',
  },
  'dumbbell-glute-bridge': {
    short: [
      'Dumbbell op je heupen, duw je heupen omhoog.',
      'Bovenaan één lijn van schouders tot knieën.',
      'Hol in je rug? Stop eerder en span je buik aan.',
    ],
    setup: 'Lig op je rug met gebogen knieën, je voeten plat op heupbreedte. Leg de dumbbell dwars op je heupen en houd hem met beide handen vast.',
    movement: 'Duw door je hielen en til je heupen op tot je schouders, heupen en knieën één lijn zijn. Knijp je billen bovenaan even samen. Zak rustig terug tot je billen de vloer net raken.',
    tempo: 'Eén tel omhoog, even stil, twee tellen omlaag. Adem uit bij het omhoog komen.',
    mistakes: [
      { fault: 'Je duwt door tot een holle rug.', fix: 'Stop op de rechte lijn en span je buik aan.' },
      { fault: 'De dumbbell rolt naar je buik.', fix: 'Houd hem met beide handen op je heupen.' },
    ],
    easier: 'glute-bridge',
    harder: 'hip-thrust',
  },
  'hip-thrust': {
    short: [
      'Bovenrug op een bank, stang op je heupen, heupen omhoog.',
      'Bovenaan staan je scheenbenen verticaal.',
      'Hol in je rug? Kijk recht vooruit, ribben naar beneden.',
    ],
    setup: 'Zit met je bovenrug tegen de lange kant van een stevige bank. Rol de stang tot in je heupplooi, met een pad of handdoek ertussen. Voeten plat op heupbreedte.',
    movement: 'Duw door je hielen en til je heupen op tot je romp waterpas is en je scheenbenen verticaal staan. Knijp je billen samen. Zak gecontroleerd terug. Je schouderbladen blijven op de bank.',
    tempo: 'Krachtig omhoog, even stil, twee tellen omlaag. Adem uit bij het omhoog komen.',
    mistakes: [
      { fault: 'Je duwt door tot een holle rug.', fix: 'Stop als je romp waterpas is en houd je ribben naar beneden.' },
      { fault: 'De bank schuift weg.', fix: 'Zet hem tegen een muur of een rek.' },
    ],
    easier: 'dumbbell-glute-bridge',
  },
  'deadlift': {
    short: [
      'Stang boven het midden van je voet, duw de vloer weg.',
      'De stang blijft tegen je benen, je rug blijft recht.',
      'Ronde rug? Zet de stang neer en neem minder gewicht.',
    ],
    setup: 'Sta op heupbreedte met de stang boven het midden van je voet. Pak de stang net buiten je benen, met gestrekte armen. Schenen tegen de stang, borst hoog, rug recht. Adem in en span je romp aan.',
    movement: 'Duw de vloer weg en laat de stang langs je schenen en dijen omhoog glijden. Heupen en schouders komen samen omhoog tot je rechtop staat. Zet de stang langs dezelfde weg terug: eerst heupen naar achteren, dan knieën buigen.',
    tempo: 'Krachtig omhoog, gecontroleerd omlaag. Elke herhaling begint stil vanaf de vloer.',
    mistakes: [
      { fault: 'Je heupen stijgen eerst en je rug rondt.', fix: 'Neem minder gewicht en laat borst en heupen samen stijgen.' },
      { fault: 'De stang zwaait van je af.', fix: 'Houd hem de hele weg tegen je benen.' },
    ],
  },
  'dumbbell-bench-press': {
    short: [
      'Duw de dumbbells omhoog, zak tot je borst rekt.',
      'Schouderbladen samen, ellebogen schuin naar achteren.',
      'Pijn in je schouder? Stop en zak minder diep.',
    ],
    setup: 'Zit op de bank met de dumbbells op je bovenbenen en neem ze mee als je gaat liggen. Schouderbladen naar elkaar en omlaag, voeten plat, de dumbbells naast je borst.',
    movement: 'Duw de dumbbells omhoog tot je armen gestrekt zijn boven je schouders. Laat ze zakken tot ze naast je borst zijn en je een rek voelt. Je ellebogen staan schuin, niet recht opzij.',
    tempo: 'Twee tellen omlaag, krachtig omhoog. Adem in bij het zakken, uit bij het duwen.',
    mistakes: [
      { fault: 'Je ellebogen staan recht opzij.', fix: 'Zet ze schuin naar achteren, dichter bij je lichaam.' },
      { fault: 'De dumbbells zakken te ver naar buiten.', fix: 'Houd je polsen boven je ellebogen.' },
    ],
    harder: 'pause-dumbbell-bench-press',
  },
  'seated-cable-row': {
    short: [
      'Trek het handvat naar je buik, je rug rechtop.',
      'Schouders omlaag, ellebogen langs je lichaam.',
      'Schommel je mee? Neem minder gewicht.',
    ],
    setup: 'Zit met je voeten tegen de steunen en je knieën licht gebogen. Pak het handvat en ga rechtop zitten, met gestrekte armen en een vlakke rug.',
    movement: 'Trek het handvat naar je buik, met je ellebogen dicht langs je lichaam. Knijp je schouderbladen even samen. Laat het handvat rustig terugkomen tot je armen gestrekt zijn.',
    tempo: 'Eén tel naar je toe, twee tellen terug.',
    mistakes: [
      { fault: 'Je schommelt voor- en achterover.', fix: 'Houd je romp stil en neem minder gewicht.' },
      { fault: 'Je rug rondt als het handvat teruggaat.', fix: 'Houd je borst hoog en strek alleen je armen.' },
    ],
  },
  'dumbbell-row': {
    short: [
      'Eén hand op de bank, trek de dumbbell naar je heup.',
      'Je rug blijft vlak, je schouders blijven recht.',
      'Draait je romp mee? Neem minder gewicht.',
    ],
    setup: 'Zet één hand en de knie aan dezelfde kant op een bank, je andere voet op de grond. Je rug is vlak. De dumbbell hangt met gestrekte arm onder je schouder.',
    movement: 'Trek de dumbbell naar je heup, met je elleboog dicht langs je lichaam. Houd bovenaan even vast en laat hem gecontroleerd zakken tot je arm gestrekt is. Doe alle herhalingen aan één kant en wissel dan.',
    tempo: 'Eén tel omhoog, twee tellen omlaag.',
    mistakes: [
      { fault: 'Je romp draait open om het gewicht te halen.', fix: 'Houd beide schouders even hoog en neem minder gewicht.' },
      { fault: 'Je trekt je schouder naar je oor.', fix: 'Trek je elleboog naar je heup, niet naar je oor.' },
    ],
  },
  'chin-up': {
    short: [
      'Onderhands, trek je kin boven de stang.',
      'Zak elke keer tot je armen gestrekt zijn.',
      'Zwaai je? Span je buik aan en houd je benen stil.',
    ],
    setup: 'Pak de stang onderhands op schouderbreedte, met je handpalmen naar je toe. Hang met gestrekte armen en trek je schouders licht omlaag, weg van je oren.',
    movement: 'Trek je ellebogen omlaag langs je ribben tot je kin boven de stang is. Zak daarna gecontroleerd tot je armen weer gestrekt zijn.',
    tempo: 'Rustig omhoog, twee tellen omlaag.',
    mistakes: [
      { fault: 'Je steekt je kin naar voren om de stang te halen.', fix: 'Houd je nek lang en trek je borst naar de stang.' },
      { fault: 'Je begint met gebogen armen.', fix: 'Zak elke keer tot je armen gestrekt zijn.' },
    ],
    easier: 'negative-chin-up',
  },
  'leg-extension': {
    short: [
      'Strek je benen tot ze bijna recht zijn, zak rustig.',
      'Kussen vlak boven je enkels, rug tegen de leuning.',
      'Pijn in je knie? Stop en neem minder gewicht.',
    ],
    setup: 'Stel de leuning zo in dat je knieën naast de draaias zitten. Het kussen ligt vlak boven je enkels. Houd de handgrepen vast.',
    movement: 'Strek je benen tot ze bijna recht zijn en houd even vast. Laat het kussen rustig zakken tot je knieën weer gebogen zijn. Je billen blijven op de zitting.',
    tempo: 'Eén tel omhoog, even stil, twee tot drie tellen omlaag. Adem uit bij het strekken.',
    mistakes: [
      { fault: 'Je zwaait het gewicht omhoog.', fix: 'Neem minder gewicht en begin elke herhaling stil.' },
      { fault: 'Je billen komen van de zitting.', fix: 'Houd de handgrepen vast en neem minder gewicht.' },
    ],
  },
  'lying-leg-curl': {
    short: [
      'Lig op je buik, trek je hielen naar je billen.',
      'Je heupen blijven op het kussen.',
      'Heupen komen omhoog? Neem minder gewicht.',
    ],
    setup: 'Lig op je buik met je knieën net over de rand van het kussen, naast de draaias. Het beenkussen ligt vlak boven je hielen. Houd de handgrepen vast.',
    movement: 'Buig je knieën en trek je hielen zo ver als je kunt naar je billen. Laat het rustig terugkomen tot je benen bijna gestrekt zijn.',
    tempo: 'Eén tel omhoog, drie tellen terug. Adem uit bij het trekken.',
    mistakes: [
      { fault: 'Je heupen komen van het kussen.', fix: 'Druk je heupen in het kussen en neem minder gewicht.' },
      { fault: 'Je laat het gewicht terugvallen.', fix: 'Tel drie tellen terug.' },
    ],
  },
  'standing-calf-raise': {
    short: [
      'Voorvoet op de rand, kom hoog op je tenen, zak diep.',
      'Je knieën blijven gestrekt.',
      'Stuiteren? Pauzeer boven en onder even.',
    ],
    setup: 'Zet je schouders onder de kussens en je voorvoeten op de rand van de trede, op heupbreedte, met je hielen erover. Strek je benen om het gewicht van de steun te halen.',
    movement: 'Duw je op tot je zo hoog mogelijk op je tenen staat en houd even vast. Zak langzaam tot je een rek in je kuiten voelt. Je knieën blijven gestrekt.',
    tempo: 'Eén tel omhoog, even stil, twee tellen omlaag. Adem rustig door.',
    mistakes: [
      { fault: 'Je stuitert onderaan.', fix: 'Pauzeer een tel in de rek.' },
      { fault: 'Je knieën buigen mee.', fix: 'Houd ze gestrekt, zodat je kuit het werk doet.' },
    ],
  },
  'walking-lunge': {
    short: [
      'Stap naar voren, zak tot je achterste knie bijna tikt.',
      'Stap meteen door, je romp blijft rechtop.',
      'Wankel je? Zet je voeten op heupbreedte neer.',
    ],
    setup: 'Sta rechtop met je voeten op heupbreedte, eventueel met een dumbbell in elke hand. Zorg voor een vrije baan van een paar meter.',
    movement: 'Stap naar voren en zak recht omlaag tot je achterste knie de vloer bijna raakt. Je voorste hiel blijft plat. Duw met je voorste been omhoog en stap met je achterste been meteen door in de volgende.',
    tempo: 'Rustig omlaag, krachtig omhoog. Adem in bij het zakken.',
    mistakes: [
      { fault: 'Je stappen zijn zo kort dat je voorste hiel loskomt.', fix: 'Neem een langere stap en houd je hiel plat.' },
      { fault: 'Je valt naar binnen of naar buiten.', fix: 'Zet je voeten op heupbreedte neer, niet op één lijn.' },
    ],
    easier: 'reverse-lunge',
  },
  'nordic-curl': {
    short: [
      'Kniel met je enkels vast, zak zo langzaam als je kunt.',
      'Heupen gestrekt: één lijn van knie tot hoofd.',
      'Steek achter in je bovenbeen? Stop de set.',
    ],
    setup: 'Kniel op een kussen en zet je enkels vast, onder een steun of bij een partner. Je lichaam is rechtop van knie tot hoofd, je handen voor je borst. Begin met weinig herhalingen.',
    movement: 'Laat je zo langzaam mogelijk voorover zakken, met gestrekte heupen. Rem met je hamstrings zo lang als je kunt. Vang jezelf op met je handen, duw je terug en kom omhoog. Het zakken is de oefening.',
    tempo: 'Zo langzaam omlaag als je kunt. Adem rustig door.',
    mistakes: [
      { fault: 'Je knikt in je heupen.', fix: 'Span je billen aan en houd de lijn van knie tot hoofd.' },
      { fault: 'Je valt meteen.', fix: 'Zak tot waar je nog kunt remmen en vang je dan op.' },
    ],
  },
  'face-pull': {
    short: [
      'Trek het touw naar je gezicht, handen uit elkaar.',
      'Ellebogen hoog, schouders weg van je oren.',
      'Leun je achterover? Neem minder gewicht.',
    ],
    setup: 'Zet de kabel op ooghoogte of iets hoger, met het touw eraan. Pak de uiteinden vast, stap terug tot je armen gestrekt zijn en zet één voet iets voor.',
    movement: 'Trek het touw naar je gezicht en spreid je handen, tot ze naast je oren zijn en je ellebogen op schouderhoogte. Knijp je schouderbladen even samen. Laat rustig terugkomen tot je armen gestrekt zijn.',
    tempo: 'Eén tel naar je toe, even stil, twee tellen terug. Adem uit tijdens het trekken.',
    mistakes: [
      { fault: 'Je leunt achterover en trekt met je rug.', fix: 'Neem minder gewicht en houd je romp stil.' },
      { fault: 'Je ellebogen zakken en het wordt roeien.', fix: 'Houd ze op schouderhoogte.' },
    ],
  },
  'dumbbell-curl': {
    short: [
      'Buig je ellebogen, draai je handpalmen naar boven.',
      'Je ellebogen blijven naast je lichaam.',
      'Zwaai je met je rug? Neem een lichter gewicht.',
    ],
    setup: 'Sta rechtop met een dumbbell in elke hand, je armen gestrekt naast je en je handpalmen naar je lichaam.',
    movement: 'Buig je ellebogen en draai je handpalmen naar boven terwijl je de dumbbells naar je schouders brengt. Je bovenarmen blijven stil. Zak rustig tot je armen gestrekt zijn.',
    tempo: 'Rustig omhoog, twee tellen omlaag. Adem uit tijdens het buigen.',
    mistakes: [
      { fault: 'Je zwaait met je rug of schouders.', fix: 'Neem een lichter gewicht en houd je bovenarmen stil.' },
      { fault: 'Je zakt niet helemaal.', fix: 'Strek je armen onderaan elke herhaling.' },
    ],
  },
  'back-extension': {
    short: [
      'Heupen op het kussen, zak voorover, kom terug.',
      'Stop bovenaan op een rechte lijn.',
      'Hol kruis bovenaan? Stop eerder.',
    ],
    setup: 'Stel het kussen zo in dat de rand net onder je heupen zit en je vrij kunt buigen. Haak je hielen onder de steun en kruis je armen voor je borst.',
    movement: 'Zak voorover vanuit je heupen, zo ver als dat gaat met een rechte rug. Kom terug door je billen aan te spannen, tot je lichaam een rechte lijn is van hoofd tot hielen.',
    tempo: 'Twee tellen omlaag, rustig omhoog. Adem uit bij het omhoog komen.',
    mistakes: [
      { fault: 'Je buigt bovenaan door in een hol kruis.', fix: 'Stop op de rechte lijn en knijp je billen samen.' },
      { fault: 'Je zwaait omhoog.', fix: 'Begin elke herhaling stil onderaan.' },
    ],
    harder: 'weighted-roman-chair-back-extension',
  },
  'inverted-row': {
    short: [
      'Hang onder de stang, trek je borst ernaartoe.',
      'Je lichaam blijft een rechte plank.',
      'Te zwaar? Zet de stang hoger of buig je knieën.',
    ],
    setup: 'Zet een stang in een rek op ongeveer heuphoogte, of gebruik ringen. Hang eronder met een overhandse greep, iets breder dan je schouders, je armen gestrekt en je hielen op de grond.',
    movement: 'Span je billen en buik aan, zodat je lichaam een rechte lijn is. Trek je borst naar de stang, met je ellebogen schuin langs je lichaam. Knijp je schouderbladen even samen en zak gecontroleerd terug.',
    tempo: 'Eén tel omhoog, twee tellen omlaag.',
    mistakes: [
      { fault: 'Je heupen zakken.', fix: 'Span je billen aan, of zet de stang hoger.' },
      { fault: 'Je steekt je kin naar de stang.', fix: 'Houd je nek lang en trek met je borst.' },
    ],
  },
  'dead-bug': {
    short: [
      'Lig op je rug, strek tegenovergestelde arm en been.',
      'Je onderrug blijft plat op de vloer.',
      'Komt je rug los? Strek minder ver.',
    ],
    setup: 'Lig op je rug met je armen recht omhoog en je heupen en knieën 90 graden gebogen. Druk je onderrug licht in de vloer.',
    movement: 'Strek langzaam één been en de arm aan de andere kant, tot ze vlak boven de vloer zijn. Je onderrug blijft op de vloer. Kom terug en wissel van kant.',
    tempo: 'Drie tellen uit, drie tellen terug. Adem uit bij het strekken.',
    mistakes: [
      { fault: 'Je onderrug komt los van de vloer.', fix: 'Strek minder ver, of houd je knie gebogen.' },
      { fault: 'Je gaat te snel.', fix: 'Tel drie tellen per kant.' },
    ],
  },
  // Enkel en evenwicht (docs/beslissingen/2026-11-11-enkel-evenwicht.md): de volgorde ogen open, ogen dicht, een
  // zachte ondergrond, en reiken op één been.
  'single-leg-stance': {
    short: [
      'Sta op één been, knie licht gebogen, heup recht.',
      'Houd vast tot je wiebelt, dan het andere been.',
      'Leun je op de muur? Raak hem alleen even aan.',
    ],
    setup: 'Sta op blote voeten of in vlakke schoenen naast een muur of een stoel. Til één voet een paar centimeter op, met je knie licht gebogen.',
    movement: 'Houd je bekken recht en je blik op een vast punt. Je enkel stuurt steeds een beetje bij; dat is precies het werk. Houd vast tot je moet steunen en wissel dan van been. Vul het aantal seconden in van je zwakste been.',
    tempo: 'Stil staan, rustig doorademen. Elke set één keer per been.',
    mistakes: [
      { fault: 'Je zakt weg in je heup.', fix: 'Houd beide heupen even hoog.' },
      { fault: 'Je klemt je opgetilde been tegen je standbeen.', fix: 'Houd het los, een handbreedte ernaast.' },
    ],
    harder: 'single-leg-stance-eyes-closed',
  },
  'single-leg-stance-eyes-closed': {
    short: [
      'Sta op één been en sluit je ogen.',
      'Je enkel moet nu alles doen, zonder hulp van je ogen.',
      'Wiebel je meteen? Eerst langer met ogen open.',
    ],
    setup: 'Sta naast een muur of een stoel, zodat je hem met een hand kunt raken. Til één voet een paar centimeter op en kijk eerst naar een vast punt.',
    movement: 'Sluit je ogen en houd je bekken recht. Zonder je ogen moet je enkel het meeste bijsturen, ook als je denkt dat je stil staat. Raak de muur even aan als het nodig is en houd daarna weer los. Wissel van been.',
    tempo: 'Stil staan, rustig doorademen. Elke set één keer per been.',
    mistakes: [
      { fault: 'Je opent je ogen bij het eerste wiebelen.', fix: 'Stuur eerst bij vanuit je enkel en heup.' },
      { fault: 'Je staat op slot in je knie.', fix: 'Houd hem licht gebogen.' },
    ],
    easier: 'single-leg-stance',
    harder: 'single-leg-stance-cushion',
  },
  'single-leg-stance-cushion': {
    short: [
      'Sta op één been op een kussen of opgevouwen matje.',
      'Knie licht gebogen, je enkel stuurt steeds bij.',
      'Val je eraf? Eerst met ogen dicht op de vloer.',
    ],
    setup: 'Leg een stevig kussen, een balanskussen of een dubbelgevouwen matje naast een muur of een stoel. Ga er met één voet op staan.',
    movement: 'Til je andere voet op en houd je bekken recht. De zachte ondergrond lijkt op los grind of een modderig pad: je enkel moet steeds kleine correcties maken. Houd vast tot je moet steunen en wissel dan van been.',
    tempo: 'Stil staan, rustig doorademen. Elke set één keer per been.',
    mistakes: [
      { fault: 'Je staat op slot in je knie.', fix: 'Houd hem licht gebogen, dan vangt je been het wiebelen op.' },
      { fault: 'Je kijkt naar je voet.', fix: 'Kijk naar een vast punt voor je.' },
    ],
    easier: 'single-leg-stance-eyes-closed',
  },
  'star-excursion-reach': {
    short: [
      'Sta op één been, tik voor, opzij en achter je.',
      'Reik zo ver als je kunt, je standbeen zakt mee.',
      'Hiel komt los? Reik minder ver.',
    ],
    setup: 'Sta op één been in het midden van een denkbeeldige ster op de vloer. Je handen mogen op je heupen.',
    movement: 'Zak door je standbeen en reik met je andere voet zo ver mogelijk naar voren. Tik licht met je tenen en kom terug naar het midden. Doe hetzelfde schuin, opzij en naar achteren. Eén rondje is één herhaling; dan het andere been.',
    tempo: 'Rustig reiken, licht tikken, rustig terug. Adem gewoon door.',
    mistakes: [
      { fault: 'Je leunt op je tikkende voet.', fix: 'Raak de vloer alleen even aan.' },
      { fault: 'De hiel van je standbeen komt los.', fix: 'Reik minder ver tot hij plat blijft.' },
    ],
    easier: 'single-leg-stance',
  },
  // De kandidaten van Spieren voor de berg die nog geen uitleg hadden (engine/mountainMuscles.ts kiest uit elke
  // oefening met kuiten, scheenspier of bilspieren als hoofdspier); eerst de eerste keuzes voor de bilspieren.
  'dumbbell-frog-pump': {
    short: [
      'Voetzolen tegen elkaar, knieën open, heupen omhoog.',
      'Dumbbell op je heupen, een korte en strakke beweging.',
      'Voel je je onderrug? Kantel je bekken, stop eerder.',
    ],
    setup: 'Lig op je rug met je voetzolen tegen elkaar en je knieën naar buiten gevallen, hielen dicht bij je billen. Leg een dumbbell dwars op je heupen en houd hem vast.',
    movement: 'Duw de buitenkant van je voeten in de vloer en til je heupen op tot je billen hard aanspannen. De beweging is kort, minder hoog dan een gewone bilbrug. Zak terug tot je billen de vloer net raken.',
    tempo: 'Eén tel omhoog, even knijpen, één tel omlaag. Adem uit bij het omhoog komen.',
    mistakes: [
      { fault: 'Je duwt omhoog met je onderrug.', fix: 'Kantel je bekken, houd je ribben naar beneden en stop eerder.' },
      { fault: 'Je knieën komen naar elkaar toe.', fix: 'Laat ze open vallen en houd je voetzolen tegen elkaar.' },
    ],
    easier: 'glute-bridge',
  },
  'barbell-glute-bridge': {
    short: [
      'Lig op de vloer, stang op je heupen, heupen omhoog.',
      'Bovenaan één lijn van schouders tot knieën.',
      'Drukt de stang? Leg er een pad of handdoek onder.',
    ],
    setup: 'Zit op de vloer en rol de stang over je benen tot in je heupplooi, met een pad of handdoek ertussen. Ga liggen, voeten plat op heupbreedte en dicht bij je billen. Houd de stang met beide handen vast.',
    movement: 'Duw door je hielen en til je heupen op tot je schouders, heupen en knieën één lijn zijn. Knijp je billen bovenaan samen. Zak rustig terug tot de schijven de vloer net raken.',
    tempo: 'Krachtig omhoog, even stil, twee tellen omlaag. Adem uit bij het omhoog komen.',
    mistakes: [
      { fault: 'Je duwt door tot een holle rug.', fix: 'Stop op de rechte lijn en houd je ribben naar beneden.' },
      { fault: 'De stang rolt naar je buik.', fix: 'Houd hem met beide handen in je heupplooi.' },
    ],
    easier: 'dumbbell-glute-bridge',
    harder: 'hip-thrust',
  },
  'lateral-band-walk': {
    short: [
      'Band boven je knieën, zak iets door, stap opzij.',
      'De band blijft bij elke stap strak.',
      'Knieën naar binnen? Duw ze naar buiten.',
    ],
    setup: 'Doe een korte weerstandsband om je bovenbenen, net boven je knieën. Sta met je voeten op heupbreedte, zodat de band al strak staat. Zak een stukje door je knieën, heupen iets naar achteren, romp rechtop.',
    movement: 'Stap met één voet opzij, ongeveer een voetlengte, en laat de andere voet rustig volgen tot heupbreedte. Je voeten wijzen recht naar voren en raken elkaar niet. Loop zo de ene kant op en dan terug. Elke stap is een herhaling.',
    tempo: 'Rustige, korte stappen zonder te veren. Adem gewoon door.',
    mistakes: [
      { fault: 'Je sleept de volgende voet bij en de band valt slap.', fix: 'Zet hem bewust neer op heupbreedte.' },
      { fault: 'Je romp wiegt heen en weer.', fix: 'Houd je schouders stil boven je heupen en maak kleinere stappen.' },
    ],
  },
  'glute-ham-raise': {
    short: [
      'Enkels vast, zak voorover, kom terug met je hamstrings.',
      'Van knieën tot hoofd blijf je één rechte lijn.',
      'Knik je in je heupen? Span je billen aan.',
    ],
    setup: 'Stel de voetsteun zo in dat je knieën net achter het kussen liggen en je voeten klem zitten. Begin rechtop op je knieën, armen gekruist voor je borst, billen en buik aangespannen.',
    movement: 'Laat je romp langzaam voorover zakken door je knieën te strekken, tot je lichaam waterpas is. Trek jezelf terug door je hielen tegen de steun te duwen en je knieën te buigen. Je heupen blijven de hele weg gestrekt.',
    tempo: 'Drie tellen omlaag, krachtig omhoog. Adem in bij het zakken.',
    mistakes: [
      { fault: 'Je knikt in je heupen om omhoog te komen.', fix: 'Knijp je billen samen en zak minder ver.' },
      { fault: 'Je valt het laatste stuk.', fix: 'Zak minder ver en bouw de diepte op.' },
    ],
  },
  'superman': {
    short: [
      'Lig op je buik, til armen en benen een stukje op.',
      'Kijk naar de vloer, je nek blijft lang.',
      'Kramp in je onderrug? Til minder hoog.',
    ],
    setup: 'Lig op je buik op een mat, armen gestrekt voor je, benen gestrekt en op heupbreedte. Je voorhoofd wijst naar de vloer.',
    movement: 'Span je billen aan en til tegelijk je armen, borst en benen een paar centimeter van de vloer. Maak jezelf lang, alsof iemand aan je handen en voeten trekt. Houd even vast en zak rustig terug.',
    tempo: 'Eén tel omhoog, twee tellen vasthouden, twee tellen omlaag. Adem door.',
    mistakes: [
      { fault: 'Je trekt je hoofd achterover.', fix: 'Kijk naar de vloer en houd je nek lang.' },
      { fault: 'Je zwaait omhoog voor meer hoogte.', fix: 'Til lager en langzamer, vanuit je billen.' },
    ],
    harder: 'back-extension',
  },
  'single-leg-rdl': {
    short: [
      'Sta op één been, scharnier voorover, been naar achteren.',
      'Je heupen blijven recht naar de vloer wijzen.',
      'Wiebel je? Tik met je achterste teen de vloer aan.',
    ],
    setup: 'Sta op één been met de knie licht gebogen. Houd een dumbbell in de hand aan de kant van het vrije been. Schouders naar achteren en omlaag.',
    movement: 'Duw je heupen naar achteren en laat je romp zakken terwijl je vrije been gestrekt naar achteren gaat. Romp en been blijven één lijn. Zak tot de dumbbell halverwege je scheen is. Duw je heup naar voren tot je rechtop staat.',
    tempo: 'Twee tellen omlaag, rustig omhoog. Eerst alle herhalingen op één been, dan wisselen.',
    mistakes: [
      { fault: 'Je bekken draait open naar de kant van het vrije been.', fix: 'Wijs de tenen van je achterste voet naar de vloer.' },
      { fault: 'Je buigt je standbeen als bij een squat.', fix: 'Houd je knie vast en duw je billen naar achteren.' },
    ],
    easier: 'dumbbell-rdl',
  },
  'weighted-ghd-hip-hinge': {
    short: [
      'Heupen vrij voor het kussen, scharnier met gewicht.',
      'Je rug blijft recht, de beweging komt uit je heupen.',
      'Ronde rug? Zak minder diep of neem minder gewicht.',
    ],
    setup: 'Stel de steun zo in dat het kussen onder je bovenbenen zit en je heupen vrij kunnen buigen. Voeten klem, knieën licht gebogen. Houd een dumbbell of schijf tegen je borst.',
    movement: 'Zak voorover vanuit je heupen met een rechte rug, zo ver als dat gaat zonder te ronden. Kom terug door je billen aan te spannen en je heupen in het kussen te duwen, tot je lichaam een rechte lijn is.',
    tempo: 'Twee tellen omlaag, rustig omhoog. Adem uit bij het omhoog komen.',
    mistakes: [
      { fault: 'Je rondt je rug om dieper te komen.', fix: 'Stop zodra je rug wil ronden.' },
      { fault: 'Je buigt bovenaan door in een hol kruis.', fix: 'Stop op de rechte lijn en knijp je billen samen.' },
    ],
    easier: 'back-extension',
  },
  'weighted-roman-chair-back-extension': {
    short: [
      'Heupen op het kussen, gewicht tegen je borst.',
      'Zak voorover, kom terug tot een rechte lijn.',
      'Hol kruis bovenaan? Stop eerder.',
    ],
    setup: 'Stel het kussen zo in dat de rand net onder je heupen zit. Haak je hielen onder de steun. Houd een dumbbell of schijf met beide armen tegen je borst.',
    movement: 'Zak voorover vanuit je heupen, zo ver als dat gaat met een rechte rug. Kom terug door je billen aan te spannen, tot je lichaam een rechte lijn is van hoofd tot hielen. Het gewicht blijft tegen je borst.',
    tempo: 'Twee tellen omlaag, rustig omhoog. Adem uit bij het omhoog komen.',
    mistakes: [
      { fault: 'Je buigt bovenaan door in een hol kruis.', fix: 'Stop op de rechte lijn en knijp je billen samen.' },
      { fault: 'Het gewicht trekt je schouders rond.', fix: 'Neem minder gewicht en houd je borst open.' },
    ],
    easier: 'back-extension',
  },
  'leg-press-plates': {
    short: [
      'Voeten op schouderbreedte, zak gecontroleerd, duw terug.',
      'Je billen en onderrug blijven tegen de zitting.',
      'Kantelt je bekken onderin? Zak minder diep.',
    ],
    setup: 'Leg aan beide kanten evenveel schijven op. Zit met je rug en hoofd tegen de leuning, voeten ongeveer op schouderbreedte midden op het plateau. Duw het plateau los en draai de veiligheidshendels weg.',
    movement: 'Laat het plateau zakken tot je knieën ruim gebogen zijn, zolang je billen op de zitting blijven. Duw terug zonder je knieën te vergrendelen. Zet na je laatste herhaling de hendels terug voor je ontspant.',
    tempo: 'Twee tellen omlaag, krachtig omhoog. Adem in bij het zakken.',
    mistakes: [
      { fault: 'Je bekken kantelt onderin weg van de zitting.', fix: 'Zak minder diep.' },
      { fault: 'Je knieën vallen naar binnen.', fix: 'Duw ze naar buiten, boven je tweede teen.' },
    ],
  },
  'sumo-deadlift': {
    short: [
      'Voeten wijd, tenen naar buiten, grijp binnen je knieën.',
      'Duw de vloer uit elkaar, borst hoog.',
      'Ronde rug? Zet de stang neer en neem minder gewicht.',
    ],
    setup: 'Sta wijd, schenen tegen de stang, tenen schuin naar buiten. Pak de stang op schouderbreedte, binnen je knieën, met gestrekte armen. Zak met je heupen tot je rug recht is. Adem in en span je romp aan.',
    movement: 'Duw je voeten naar buiten en omlaag en laat de stang langs je benen omhoog glijden. Je knieën volgen je tenen. Strek heupen en knieën samen tot je rechtop staat. Zet de stang langs dezelfde weg terug.',
    tempo: 'Krachtig omhoog, gecontroleerd omlaag. Elke herhaling begint stil vanaf de vloer.',
    mistakes: [
      { fault: 'Je heupen stijgen eerst en je rug rondt.', fix: 'Neem minder gewicht en laat borst en heupen samen stijgen.' },
      { fault: 'Je knieën vallen naar binnen.', fix: 'Duw ze naar buiten, boven je tenen.' },
    ],
  },
  'trap-bar-deadlift': {
    short: [
      'Sta midden in de trapbar, duw de vloer weg.',
      'Schouders boven de handvatten, rug recht.',
      'Ronde rug? Zet hem neer en neem minder gewicht.',
    ],
    setup: 'Sta midden in de trapbar, voeten op heupbreedte. Buig heupen en knieën en pak de handvatten in het midden vast, armen gestrekt. Borst hoog, rug recht, schouders boven de handvatten. Adem in en span je romp aan.',
    movement: 'Duw de vloer weg en kom omhoog tot je rechtop staat. Heupen en schouders stijgen samen, de handvatten blijven naast je benen. Zak terug door eerst je heupen naar achteren te duwen en dan je knieën te buigen.',
    tempo: 'Krachtig omhoog, gecontroleerd omlaag. Elke herhaling begint stil vanaf de vloer.',
    mistakes: [
      { fault: 'Je heupen schieten eerst omhoog.', fix: 'Neem minder gewicht en laat borst en heupen samen stijgen.' },
      { fault: 'Je leunt bovenaan achterover.', fix: 'Stop zodra je rechtop staat en knijp je billen samen.' },
    ],
  },
};
