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
};
