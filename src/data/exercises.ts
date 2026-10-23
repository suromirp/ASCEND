// ASCEND: the exercise list. Our own division into muscle groups and our own
// short texts; nothing is copied from another app or database. The names stay
// English, the way the gym and MacroFactor say them (the owner's wish: never
// translate them). The aliases are only there so an imported name (another
// English spelling, MacroFactor's variant, or an older Dutch name) finds its
// exercise (engine/exerciseMatch.ts). See
// docs/beslissingen/2026-10-22-oefeningnamen-engels.md.
//
// Heavy on what the mountains ask for: calves with a straight and a bent knee,
// the shin muscles, hip abductors, step-ups and step-downs (also with a pack),
// slow lowering squats, Bulgarian split squats, Nordic curls and the Copenhagen
// plank. Primary muscles count 1, secondary 0.5 (engine/muscleVolume.ts).

import type { Exercise, MovementPattern, MuscleGroup, Resistance } from '../models/exercise';

type M = MuscleGroup;

function ex(
  id: string,
  name: string,
  aliases: string[],
  primary: M[],
  secondary: M[],
  resistance: Resistance,
  pattern: MovementPattern,
  loadsLegs: boolean,
  cues: string[],
  bodyweightFraction?: number,
): Exercise {
  return { id, name, aliases, primary, secondary, resistance, pattern, loadsLegs, cues, ...(bodyweightFraction !== undefined ? { bodyweightFraction } : {}) };
}

export const EXERCISES: Exercise[] = [
  // --- knie: squat en pers ---------------------------------------------------
  ex('back-squat', 'Barbell Back Squat', ['Back Squat', 'Back Squat (Barbell)', 'High Bar Squat', 'Squat met stang op de rug'], ['quadriceps', 'glutes'], ['hamstrings', 'lower_back', 'core', 'hip_adductors'], 'barbell', 'squat', true, [
    'Doen: stang op je bovenrug, zak tot je dijen minstens waterpas zijn, kom met je hielen vast omhoog.',
    'Let op: knieën volgen de richting van je tenen, borst blijft hoog.',
    'Vaak fout: te vroeg omhoog komen met de heupen, waardoor de stang naar voren zakt.',
  ]),
  ex('front-squat', 'Front Squat', ['Barbell Front Squat', 'Front Squat (Barbell)'], ['quadriceps'], ['glutes', 'core', 'upper_back'], 'barbell', 'squat', true, [
    'Doen: stang op je schouders voor, ellebogen hoog, zak recht naar beneden.',
    'Let op: je romp blijft bijna rechtop.',
    'Vaak fout: ellebogen laten zakken, waardoor de stang wegrolt.',
  ]),
  ex('goblet-squat', 'Goblet Squat', ['Dumbbell Goblet Squat', 'Goblet Squat (Dumbbell)'], ['quadriceps', 'glutes'], ['core', 'hip_adductors'], 'dumbbell', 'squat', true, [
    'Doen: houd één gewicht tegen je borst en zak diep tussen je knieën.',
    'Let op: je ellebogen mogen binnen je knieën blijven.',
    'Vaak fout: voorover buigen in plaats van zakken.',
  ]),
  ex('leg-press', 'Pin-Loaded Leg Press', ['Leg Press (Machine)', 'Machine Leg Press', 'Beenpers met gewichtstapel', 'Leg Press'], ['quadriceps', 'glutes'], ['hamstrings', 'hip_adductors'], 'machine_stack', 'squat', true, [
    'Doen: voeten op schouderbreedte, zak gecontroleerd tot je knieën ruim gebogen zijn.',
    'Let op: je onderrug blijft tegen de leuning.',
    'Vaak fout: de knieën helemaal slot strekken onder zwaar gewicht.',
  ]),
  ex('leg-press-plates', 'Plate-Loaded Leg Press', ['45° Leg Press', 'Plate Loaded Leg Press', 'Beenpers met schijven'], ['quadriceps', 'glutes'], ['hamstrings', 'hip_adductors'], 'machine_plates', 'squat', true, [
    'Doen: voeten op schouderbreedte, zak tot je knieën ruim gebogen zijn en duw weer weg.',
    'Let op: je billen blijven op de zitting.',
    'Vaak fout: zo diep gaan dat je bekken onderaan wegkantelt.',
  ]),
  ex('hack-squat', 'Hack Squat', ['Machine Hack Squat', 'Hack Squat (Machine)', 'Hacksquat'], ['quadriceps'], ['glutes', 'hip_adductors'], 'machine_plates', 'squat', true, [
    'Doen: rug tegen het kussen, zak diep en duw weer omhoog.',
    'Let op: hielen blijven op het plateau.',
    'Vaak fout: korte halve herhalingen met te veel gewicht.',
  ]),
  ex('leg-extension', 'Leg Extension', ['Machine Leg Extension', 'Leg Extension (Machine)', 'Seated Leg Extension', 'Beenstrekken'], ['quadriceps'], [], 'machine_stack', 'isolation_leg', true, [
    'Doen: strek je benen tot ze bijna recht zijn en laat ze rustig zakken.',
    'Let op: stel het kussen vlak boven je enkels.',
    'Vaak fout: het gewicht omhoog zwaaien in plaats van strekken.',
  ]),
  ex('spanish-squat', 'Spanish Squat', ['Band Spanish Squat', 'Spaanse squat met band', 'Spaanse squat'], ['quadriceps'], [], 'bodyweight', 'squat', true, [
    'Doen: een stevige band achter je knieën, leun achterover en zak met rechte rug.',
    'Let op: je scheenbenen blijven bijna verticaal, de knieën gaan niet ver naar voren.',
    'Vaak fout: te snel zakken; houd het rustig en houd de spanning vast.',
  ]),
  ex('eccentric-squat', 'Eccentric Squat', ['Slow Eccentric Squat', 'Decline Squat', 'Excentrische squat', 'Langzame squat naar beneden'], ['quadriceps'], ['glutes', 'core'], 'bodyweight', 'squat', true, [
    'Doen: zak in ongeveer 4 seconden, sta op met beide benen of met hulp van je handen.',
    'Let op: staan op een licht schuin vlak maakt het zwaarder voor de knie.',
    'Vaak fout: de zakbeweging versnellen onderaan.',
  ], 1),
  ex('bulgarian-split-squat', 'Bulgarian Split Squat', ['Rear Foot Elevated Split Squat', 'Dumbbell Bulgarian Split Squat', 'Bulgarian Split Squat (Dumbbell)', 'Bulgaarse split squat'], ['quadriceps', 'glutes'], ['hip_adductors', 'core'], 'dumbbell', 'lunge_step', true, [
    'Doen: achterste voet op een bank, zak recht naar beneden op het voorste been.',
    'Let op: de voorste voet staat ver genoeg naar voren om je hiel te houden.',
    'Vaak fout: te dicht bij de bank staan, waardoor de knie doorschiet.',
  ], 1),
  ex('split-squat', 'Split Squat', ['Dumbbell Split Squat', 'Static Lunge', 'Split Squat (Dumbbell)'], ['quadriceps', 'glutes'], ['hip_adductors', 'core'], 'dumbbell', 'lunge_step', true, [
    'Doen: sta in spreidstand, zak recht naar beneden en kom weer omhoog.',
    'Let op: kleine stap is niet erg, zolang je stabiel blijft.',
    'Vaak fout: de achterste knie neerploffen.',
  ], 1),
  ex('walking-lunge', 'Walking Lunge', ['Dumbbell Walking Lunge', 'Walking Lunges', 'Wandelende lunge'], ['quadriceps', 'glutes'], ['hamstrings', 'hip_adductors', 'core'], 'dumbbell', 'lunge_step', true, [
    'Doen: stap naar voren, zak tot de achterknie bijna de grond raakt en stap door.',
    'Let op: neem stappen die lang genoeg zijn voor een rechte voorste scheen.',
    'Vaak fout: te korte stappen waardoor de knie ver naar voren gaat.',
  ], 1),
  ex('reverse-lunge', 'Reverse Lunge', ['Dumbbell Reverse Lunge', 'Backward Lunge', 'Lunge achterwaarts'], ['quadriceps', 'glutes'], ['hamstrings', 'hip_adductors'], 'dumbbell', 'lunge_step', true, [
    'Doen: stap naar achteren, zak recht omlaag en duw door de voorste hiel terug.',
    'Let op: het gewicht blijft op het voorste been.',
    'Vaak fout: te veel afzetten met het achterste been.',
  ], 1),
  ex('step-up', 'Step-Up', ['Step Up', 'Step-Ups', 'Dumbbell Step-Up', 'Box Step-Up', 'Step-Up (Dumbbell)'], ['quadriceps', 'glutes'], ['hamstrings', 'calves', 'core'], 'dumbbell', 'lunge_step', true, [
    'Doen: zet een voet op een stevige verhoging en sta op met dat been alleen.',
    'Let op: kies een hoogte waarbij je knie ongeveer 90 graden krijgt.',
    'Vaak fout: afzetten met het been dat op de grond blijft.',
  ], 1),
  ex('step-up-pack', 'Weighted Step-Up', ['Backpack Step-Up', 'Step-Up With Backpack', 'Loaded Step Up', 'Weighted Step Up', 'Vest Step-Up', 'Step-up met rugzak'], ['quadriceps', 'glutes'], ['hamstrings', 'calves', 'core'], 'pack_or_vest', 'lunge_step', true, [
    'Doen: dezelfde step-up, met de rugzak of het vest dat je in de bergen draagt.',
    'Let op: laat de rugzak stevig zitten, zodat hij niet schommelt.',
    'Vaak fout: te veel gewicht te snel, en dan schokkerig omhoog komen.',
  ], 1),
  ex('step-down', 'Step-Down', ['Step Down', 'Step-Downs', 'Eccentric Step-Down', 'Lateral Step-Down', 'Forward Step-Down'], ['quadriceps', 'glutes'], ['calves', 'core', 'hip_abductors'], 'bodyweight', 'lunge_step', true, [
    'Doen: sta op een verhoging en zak langzaam met één been tot de andere hiel de grond raakt.',
    'Let op: je knie blijft boven je tweede teen, je bekken blijft recht.',
    'Vaak fout: neerploffen in plaats van afremmen. Juist het remmen is de oefening.',
  ], 1),
  ex('step-down-pack', 'Weighted Step-Down', ['Backpack Step-Down', 'Step-Down With Backpack', 'Loaded Step Down', 'Vest Step-Down', 'Step-down met rugzak'], ['quadriceps', 'glutes'], ['calves', 'core', 'hip_abductors'], 'pack_or_vest', 'lunge_step', true, [
    'Doen: de step-down met je rugzak of vest, in een rustig tempo van 3 seconden naar beneden.',
    'Let op: begin licht, bergaf zware belasting is wat je hiermee leert dragen.',
    'Vaak fout: de knie naar binnen laten zakken.',
  ], 1),

  // --- heupscharnier en hamstrings ------------------------------------------
  ex('deadlift', 'Conventional Deadlift', ['Barbell Deadlift', 'Deadlift (Barbell)', 'Deadlift'], ['glutes', 'hamstrings', 'lower_back'], ['quadriceps', 'traps', 'forearms', 'core', 'lats'], 'barbell', 'hinge', true, [
    'Doen: stang over het midden van je voet, rug strak, duw de vloer van je weg.',
    'Let op: de stang blijft dicht langs je benen.',
    'Vaak fout: de heupen eerst laten stijgen, zodat je met een ronde rug trekt.',
  ]),
  ex('romanian-deadlift', 'Barbell Romanian Deadlift', ['RDL', 'Romanian Deadlift (Barbell)', 'Stiff Leg Deadlift', 'Roemeense deadlift', 'Romanian Deadlift'], ['hamstrings', 'glutes'], ['lower_back', 'forearms', 'traps'], 'barbell', 'hinge', true, [
    'Doen: knieën licht gebogen, schuif je heupen naar achteren en laat de stang langs je benen zakken.',
    'Let op: je voelt het in de achterkant van je bovenbenen, je rug blijft recht.',
    'Vaak fout: door de knieën zakken, waardoor het een squat wordt.',
  ]),
  ex('trap-bar-deadlift', 'Trap Bar Deadlift', ['Hex Bar Deadlift', 'Trap-Bar Deadlift', 'Deadlift met trapbar'], ['quadriceps', 'glutes', 'hamstrings'], ['lower_back', 'traps', 'forearms'], 'barbell', 'hinge', true, [
    'Doen: sta in de trapbar, rug recht, duw door je voeten omhoog.',
    'Let op: schouders boven de handvatten.',
    'Vaak fout: hem als squat doen en de heupen te laag houden of juist te hoog.',
  ]),
  ex('dumbbell-rdl', 'Dumbbell Romanian Deadlift', ['Romanian Deadlift (Dumbbell)', 'DB RDL', 'Roemeense deadlift met dumbbells'], ['hamstrings', 'glutes'], ['lower_back', 'forearms'], 'dumbbell', 'hinge', true, [
    'Doen: dumbbells langs je benen omlaag, heupen naar achteren, daarna weer rechtop.',
    'Let op: schouders naar achteren en omlaag.',
    'Vaak fout: de dumbbells van je lichaam laten wegzwaaien.',
  ]),
  ex('single-leg-rdl', 'Single Leg Romanian Deadlift', ['Single-Leg RDL', 'One Leg Romanian Deadlift', 'Single Leg Deadlift', 'Roemeense deadlift op één been'], ['hamstrings', 'glutes'], ['lower_back', 'core', 'hip_abductors'], 'dumbbell', 'hinge', true, [
    'Doen: buig voorover op één been, het andere been strekt zich naar achteren.',
    'Let op: je heupen blijven recht naar de grond gericht.',
    'Vaak fout: je bekken opendraaien.',
  ]),
  ex('hip-thrust', 'Barbell Hip Thrust', ['Hip Thrust (Barbell)', 'Hip Thrust', 'Hip thrust'], ['glutes'], ['hamstrings', 'quadriceps', 'core'], 'barbell', 'hinge', true, [
    'Doen: schouderbladen op een bank, stang op je heupen, duw je heupen omhoog.',
    'Let op: bovenaan staan je scheenbenen verticaal.',
    'Vaak fout: je onderrug laten doorhangen in plaats van met je billen duwen.',
  ]),
  ex('glute-bridge', 'Glute Bridge', ['Single Leg Glute Bridge', 'Hip Bridge', 'Bilbrug'], ['glutes'], ['hamstrings', 'core'], 'bodyweight', 'hinge', true, [
    'Doen: lig op je rug, voeten dichtbij, duw je heupen omhoog.',
    'Let op: knijp bovenaan even je billen samen.',
    'Vaak fout: een hol kruis maken in plaats van je heupen strekken.',
  ], 0.6),
  ex('back-extension', 'Back Extension', ['45° Back Extension', 'Hyperextension', 'Roman Chair Back Extension', 'Rugstrekken'], ['lower_back', 'glutes'], ['hamstrings'], 'bodyweight', 'hinge', true, [
    'Doen: heupen op het kussen, zak voorover en kom terug tot je lichaam een rechte lijn is.',
    'Let op: stop bovenaan op een rechte lijn.',
    'Vaak fout: bovenaan in een hol kruis doorbuigen.',
  ], 0.4),
  ex('nordic-curl', 'Nordic Hamstring Curl', ['Nordic Hamstring Curls', 'Nordic Curls', 'Nordic Ham Curl', 'Nordic curl'], ['hamstrings'], ['glutes', 'calves'], 'bodyweight', 'isolation_leg', true, [
    'Doen: knie op een kussen, enkels vast, zak zo langzaam mogelijk voorover.',
    'Let op: heupen blijven gestrekt, je lichaam een rechte lijn van knie tot hoofd.',
    'Vaak fout: meteen vallen. Vang jezelf op met je handen en duw terug.',
  ], 0.7),
  ex('lying-leg-curl', 'Lying Leg Curl', ['Lying Leg Curl (Machine)', 'Machine Lying Leg Curl', 'Prone Leg Curl', 'Hamstringcurl liggend'], ['hamstrings'], ['calves'], 'machine_stack', 'isolation_leg', true, [
    'Doen: lig op je buik, buig je knieën en breng je hielen naar je billen.',
    'Let op: je heupen blijven op het kussen.',
    'Vaak fout: je heupen omhoog laten komen om het gewicht te halen.',
  ]),
  ex('seated-leg-curl', 'Seated Hamstring Curl', ['Seated Leg Curl (Machine)', 'Machine Seated Leg Curl', 'Hamstringcurl zittend', 'Seated Leg Curl'], ['hamstrings'], ['calves'], 'machine_stack', 'isolation_leg', true, [
    'Doen: trek je hielen naar beneden en achter je en laat rustig terugkomen.',
    'Let op: het kussen op je bovenbenen zit stevig.',
    'Vaak fout: met je bovenlichaam meeschommelen.',
  ]),

  // --- kuit, scheenbeen, heup ------------------------------------------------
  ex('standing-calf-raise', 'Standing Calf Raise', ['Standing Calf Raises', 'Straight Knee Calf Raise', 'Standing Calf Raise (Machine)', 'Machine Standing Calf Raise', 'Kuitheffen gestrekt'], ['calves'], [], 'machine_stack', 'calf', true, [
    'Doen: sta met je voorvoet op een rand, kom hoog op je tenen en zak diep.',
    'Let op: pauzeer bovenaan en onderaan kort.',
    'Vaak fout: stuiteren in plaats van gecontroleerd zakken.',
  ]),
  ex('bodyweight-calf-raise', 'Bodyweight Calf Raise', ['Step Calf Raise', 'Calf Raise on Step', 'Kuitheffen op een trede'], ['calves'], [], 'bodyweight', 'calf', true, [
    'Doen: voorvoet op een trede, kom hoog omhoog en zak zo diep mogelijk.',
    'Let op: houd je knieën gestrekt, zodat de grote kuitspier het werk doet.',
    'Vaak fout: te snel en te kort bewegen.',
  ], 1),
  ex('single-leg-calf-raise', 'Single Leg Calf Raise', ['Single-Leg Calf Raise', 'One Leg Calf Raise', 'Single Leg Standing Calf Raise', 'Kuitheffen op één been'], ['calves'], [], 'bodyweight', 'calf', true, [
    'Doen: sta op één been op een trede, kom omhoog en zak diep.',
    'Let op: een hand op de muur voor balans mag, niet voor kracht.',
    'Vaak fout: de knie licht laten buigen.',
  ], 1),
  ex('seated-calf-raise', 'Seated Pin-Loaded Machine Calf Raise', ['Seated Calf Raise (Machine)', 'Machine Seated Calf Raise', 'Bent Knee Calf Raise', 'Kuitheffen gebogen', 'Seated Calf Raise'], ['calves'], [], 'machine_stack', 'calf', true, [
    'Doen: zit met gebogen knieën, kom hoog op je tenen en zak diep.',
    'Let op: met gebogen knie werkt vooral de diepe kuitspier, belangrijk bij lange afdalingen.',
    'Vaak fout: kleine halve herhalingen.',
  ]),
  ex('tibialis-raise', 'Tibialis Raise', ['Tibialis Raises', 'Tib Raise', 'Wall Tibialis Raise', 'Shin Raise', 'Tibialis Anterior Raise'], ['tibialis'], [], 'bodyweight', 'shin', true, [
    'Doen: rug en billen tegen de muur, voeten naar voren, trek je tenen naar je scheenbenen.',
    'Let op: hoe verder je voeten van de muur, hoe zwaarder.',
    'Vaak fout: er maar een paar doen. Neem 15 tot 25 herhalingen.',
  ]),
  ex('tibialis-raise-loaded', 'Weighted Tibialis Raise', ['Tibialis Bar Raise', 'Dumbbell Tibialis Raise', 'Loaded Tibialis Raise', 'Tibialis Raise (Weighted)', 'Tibialis raise met gewicht'], ['tibialis'], [], 'dumbbell', 'shin', true, [
    'Doen: zit op een bank, hang een gewicht aan je voorvoet en trek je tenen omhoog.',
    'Let op: beweeg vanuit je enkel, niet vanuit je knie.',
    'Vaak fout: te veel gewicht waardoor je het omhoog zwaait.',
  ]),
  ex('hip-abduction-machine', 'Hip Abduction Machine', ['Machine Hip Abduction', 'Seated Hip Abduction', 'Hip Abduction (Machine)', 'Abductor Machine', 'Heupabductie op de machine'], ['hip_abductors'], ['glutes'], 'machine_stack', 'hip', true, [
    'Doen: zit rechtop en druk je knieën rustig naar buiten.',
    'Let op: kom niet met een zwaai uit je bovenlichaam.',
    'Vaak fout: te snel terugkomen, waardoor het gewicht klapt.',
  ]),
  ex('hip-abduction-band', 'Banded Hip Abduction', ['Standing Hip Abduction', 'Band Hip Abduction', 'Standing Band Hip Abduction', 'Heupabductie staand met band'], ['hip_abductors'], ['glutes', 'core'], 'bodyweight', 'hip', true, [
    'Doen: band om je enkels, sta op één been en breng het andere been zijwaarts.',
    'Let op: je bovenlichaam blijft stil en recht.',
    'Vaak fout: hellen naar de kant waar je been naartoe gaat.',
  ]),
  ex('lateral-band-walk', 'Banded Lateral Walk', ['Lateral Band Walk', 'Monster Walk', 'Band Walk', 'Banded Side Step', 'Banded Lateral Walks', 'Zijwaarts lopen met band'], ['hip_abductors', 'glutes'], ['core'], 'bodyweight', 'hip', true, [
    'Doen: band boven je knieën, halfhoge squathouding, stap zijwaarts.',
    'Let op: houd spanning op de band bij elke stap.',
    'Vaak fout: je knieën naar binnen laten vallen.',
  ]),
  ex('side-lying-hip-abduction', 'Side Lying Hip Abduction', ['Side-Lying Hip Abduction', 'Side Lying Leg Raise', 'Clamshell', 'Clamshells', 'Heupabductie op de zij'], ['hip_abductors'], ['glutes'], 'bodyweight', 'hip', true, [
    'Doen: lig op je zij, til het bovenste been schuin omhoog en zak.',
    'Let op: je bekken blijft stil, tenen wijzen naar voren.',
    'Vaak fout: je lichaam naar achteren laten rollen.',
  ]),
  ex('cable-hip-abduction', 'Cable Hip Abduction', ['Standing Cable Hip Abduction', 'Cable Hip Abduction (Ankle Strap)', 'Heupabductie aan de kabel'], ['hip_abductors'], ['glutes', 'core'], 'cable', 'hip', true, [
    'Doen: bandje om je enkel, sta zijwaarts en trek je been naar buiten.',
    'Let op: houd je bovenlichaam stil en rechtop.',
    'Vaak fout: te veel gewicht en dan je romp meedraaien.',
  ]),
  ex('hip-adduction-machine', 'Hip Adduction Machine', ['Machine Hip Adduction', 'Seated Hip Adduction', 'Adductor Machine', 'Hip Adduction (Machine)', 'Heupadductie op de machine'], ['hip_adductors'], [], 'machine_stack', 'hip', true, [
    'Doen: zit rechtop en breng je knieën rustig naar elkaar toe.',
    'Let op: begin niet met de uiterste rek.',
    'Vaak fout: te snel terug laten klappen.',
  ]),
  ex('copenhagen-plank', 'Copenhagen Plank', ['Copenhagen Side Plank', 'Copenhagen Adduction', 'Copenhagen Hip Adduction'], ['hip_adductors'], ['core'], 'bodyweight', 'hip', true, [
    'Doen: zijsteun met je bovenste been op een bank, til je onderste been naar de bank.',
    'Let op: begin met je knie op de bank, dat is makkelijker.',
    'Vaak fout: je heupen laten zakken.',
  ], 0.6),

  // --- romp ---------------------------------------------------------------------
  ex('plank', 'Plank', ['Front Plank', 'Forearm Plank', 'Plank Hold'], ['core'], [], 'bodyweight', 'core', false, [
    'Doen: steun op je onderarmen, lichaam in een rechte lijn.',
    'Let op: bil licht aanspannen, buik hard maken.',
    'Vaak fout: je heupen laten zakken of omhoog steken.',
  ]),
  ex('side-plank', 'Side Plank', ['Side Plank Hold', 'Zijplank'], ['core'], ['hip_abductors'], 'bodyweight', 'core', false, [
    'Doen: steun op één onderarm, til je heupen op tot een rechte lijn.',
    'Let op: schouder recht boven je elleboog.',
    'Vaak fout: de heupen naar achteren laten zakken.',
  ]),
  ex('dead-bug', 'Dead Bug', ['Deadbug'], ['core'], [], 'bodyweight', 'core', false, [
    'Doen: lig op je rug, strek tegenovergestelde arm en been langzaam uit.',
    'Let op: je onderrug blijft plat op de grond.',
    'Vaak fout: te snel gaan en dan de rug laten hol staan.',
  ]),
  ex('hanging-leg-raise', 'Hanging Leg Raise', ['Hanging Knee Raise', 'Captain\'s Chair Leg Raise', 'Hanging Straight Leg Raise', 'Beenheffen hangend', 'Captain\'s Chair Straight Leg Raise'], ['core'], ['forearms'], 'bodyweight', 'core', false, [
    'Doen: hang aan een stang, til je benen of knieën op zonder te zwaaien.',
    'Let op: kantel je bekken aan het eind iets naar je toe.',
    'Vaak fout: zwaaien in plaats van de buik gebruiken.',
  ]),
  ex('cable-crunch', 'Cable Crunch', ['Kneeling Cable Crunch', 'Cable Rope Crunch', 'Kabelcrunch'], ['core'], [], 'cable', 'core', false, [
    'Doen: kniel voor de kabel, rol je borst naar je heupen.',
    'Let op: de beweging komt uit je buik, niet uit je heupen.',
    'Vaak fout: gewoon naar beneden zitten met je heupen.',
  ]),
  ex('machine-torso-rotation', 'Machine Torso Rotation', ['Kneeling Machine Lower Torso Rotation', 'Rotary Torso Machine', 'Torso Rotation (Machine)', 'Seated Torso Rotation', 'Rompdraaien op de machine'], ['core'], [], 'machine_stack', 'core', false, [
    'Doen: draai je romp rustig naar één kant en terug, met je benen stil.',
    'Let op: kleine, gecontroleerde draaiing in je middel.',
    'Vaak fout: te veel gewicht en je armen laten werken.',
  ]),
  ex('pallof-press', 'Pallof Press', ['Cable Pallof Press'], ['core'], ['hip_abductors'], 'cable', 'core', false, [
    'Doen: kabel op borsthoogte aan je zij, duw je handen recht voor je uit en terug.',
    'Let op: laat je romp niet meedraaien.',
    'Vaak fout: te dicht bij de kabel staan, waardoor er geen weerstand is.',
  ]),
  ex('farmers-carry', 'Farmer\'s Carry', ['Farmers Carry', 'Farmer\'s Walk', 'Farmers Walk', 'Suitcase Carry', 'Dumbbell Farmer\'s Carry', 'Boerenwandeling'], ['forearms', 'traps', 'core'], ['hip_abductors', 'glutes'], 'dumbbell', 'core', true, [
    'Doen: loop met zware gewichten in je handen, rechtop en met korte stappen.',
    'Let op: schouders laag, borst open.',
    'Vaak fout: voorover hangen of de gewichten laten zwaaien.',
  ]),

  // --- duwen -----------------------------------------------------------------
  ex('bench-press', 'Barbell Bench Press', ['Bench Press', 'Bench Press (Barbell)', 'Flat Barbell Bench Press', 'Bankdrukken met stang'], ['chest'], ['front_delts', 'triceps'], 'barbell', 'push_horizontal', false, [
    'Doen: schouderbladen samen, laat de stang naar je onderste borst zakken en duw omhoog.',
    'Let op: voeten stevig op de grond, polsen recht boven je ellebogen.',
    'Vaak fout: de stang laten stuiteren op je borst.',
  ]),
  ex('incline-bench-press', '45° Incline Barbell Press', ['45° Incline Barbell Bench Press', 'Incline Bench Press', 'Incline Bench Press (Barbell)', 'Schuin bankdrukken met stang', 'Incline Barbell Bench Press'], ['chest', 'front_delts'], ['triceps'], 'barbell', 'push_horizontal', false, [
    'Doen: bank op een lichte helling, stang naar je bovenste borst en weer omhoog.',
    'Let op: een kleine helling is genoeg, te steil wordt een schouderpers.',
    'Vaak fout: de stang naar je nek laten zakken.',
  ]),
  ex('dumbbell-bench-press', 'Dumbbell Bench Press', ['Bench Press (Dumbbell)', 'DB Bench Press', 'Flat Dumbbell Press', 'Bankdrukken met dumbbells'], ['chest'], ['front_delts', 'triceps'], 'dumbbell', 'push_horizontal', false, [
    'Doen: duw de dumbbells omhoog en laat ze zakken tot een diepe rek in je borst.',
    'Let op: ellebogen schuin naar buiten, niet 90 graden.',
    'Vaak fout: de dumbbells te ver naar buiten laten zakken.',
  ]),
  ex('incline-dumbbell-press', '45° Incline Dumbbell Press', ['Incline Dumbbell Bench Press', '45° Incline Dumbbell Bench Press', 'Incline Dumbbell Press (Dumbbell)', 'Schuin bankdrukken met dumbbells', 'Incline Dumbbell Press'], ['chest', 'front_delts'], ['triceps'], 'dumbbell', 'push_horizontal', false, [
    'Doen: bank op een lichte helling, duw de dumbbells recht omhoog.',
    'Let op: schouderbladen blijven op de bank.',
    'Vaak fout: de bank te steil zetten.',
  ]),
  ex('push-up', 'Push-Up', ['Pushup', 'Push Up', 'Push-Ups', 'Pushups', 'Push Ups'], ['chest'], ['front_delts', 'core', 'triceps'], 'bodyweight', 'push_horizontal', false, [
    'Doen: handen onder je schouders, lichaam recht, zak tot je borst bijna de grond raakt.',
    'Let op: ellebogen schuin naar achteren, niet wijd.',
    'Vaak fout: je heupen laten zakken.',
  ], 0.65),
  ex('machine-chest-press', 'Pin-Loaded Machine Chest Press', ['Chest Press (Machine)', 'Seated Chest Press', 'Borstpers op de machine', 'Machine Chest Press'], ['chest'], ['front_delts', 'triceps'], 'machine_stack', 'push_horizontal', false, [
    'Doen: duw de handgrepen naar voren en laat rustig terugkomen.',
    'Let op: stel de zitting zo in dat de handgrepen op borsthoogte zijn.',
    'Vaak fout: je schouders naar voren laten rollen.',
  ]),
  ex('cable-fly', 'Horizontal Cable Fly', ['Cable Chest Fly', 'Cable Crossover', 'Standing Cable Fly', 'Kabel fly', 'Cable Fly'], ['chest'], ['front_delts'], 'cable', 'isolation_upper', false, [
    'Doen: met licht gebogen ellebogen breng je de handgrepen in een boog naar elkaar.',
    'Let op: voel de rek in je borst.',
    'Vaak fout: er een pers van maken door de ellebogen te strekken.',
  ]),
  ex('dip', 'Dips', ['Parallel Bar Dip', 'Chest Dip', 'Tricep Dip', 'Weighted Dip', 'Dip'], ['chest'], ['front_delts', 'triceps'], 'bodyweight', 'push_horizontal', false, [
    'Doen: steun op twee leuningen, zak tot je bovenarmen ongeveer waterpas zijn en duw omhoog.',
    'Let op: kom niet dieper dan je schouders prettig vinden.',
    'Vaak fout: te diep zakken met opgetrokken schouders.',
  ], 1),
  ex('overhead-press', 'Barbell Overhead Press', ['Overhead Press', 'Overhead Press (Barbell)', 'Standing Barbell Shoulder Press', 'Military Press', 'Barbell Shoulder Press', 'Schouderpers met stang'], ['front_delts'], ['side_delts', 'core', 'upper_back', 'triceps'], 'barbell', 'push_vertical', false, [
    'Doen: stang op je sleutelbeen, duw recht omhoog en je hoofd een stukje naar voren.',
    'Let op: bil en buik aanspannen, ribben naar beneden.',
    'Vaak fout: een hol kruis maken om het gewicht omhoog te krijgen.',
  ]),
  ex('dumbbell-shoulder-press', 'Seated Dumbbell Overhead Press', ['Seated Dumbbell Shoulder Press', 'Dumbbell Overhead Press', 'Shoulder Press (Dumbbell)', 'Schouderpers met dumbbells', 'Dumbbell Shoulder Press', 'Standing Dumbbell Overhead Press'], ['front_delts'], ['side_delts', 'triceps'], 'dumbbell', 'push_vertical', false, [
    'Doen: duw de dumbbells van schouderhoogte recht omhoog.',
    'Let op: polsen boven je ellebogen.',
    'Vaak fout: de dumbbells naar elkaar laten botsen.',
  ]),
  ex('lateral-raise', 'Standing Dumbbell Lateral Raise', ['Lateral Raise', 'Side Raise', 'Lateral Raise (Dumbbell)', 'Zijwaartse schouderheffing', 'Dumbbell Lateral Raise'], ['side_delts'], [], 'dumbbell', 'isolation_shoulder', false, [
    'Doen: til de gewichten zijwaarts tot schouderhoogte.',
    'Let op: licht gebogen ellebogen en een lichte gewichtskeuze.',
    'Vaak fout: zwaaien met je hele lichaam.',
  ]),
  ex('rear-delt-fly', 'Reverse Fly', ['Rear Delt Fly', 'Dumbbell Reverse Fly', 'Bent-Over Reverse Fly', 'Achterwaartse zijheffing'], ['rear_delts'], ['upper_back'], 'dumbbell', 'isolation_shoulder', false, [
    'Doen: buig voorover en til de gewichten zijwaarts tot je ellebogen op schouderhoogte zijn.',
    'Let op: je trekt met je achterste schouders, niet met je nek.',
    'Vaak fout: te zwaar en met je rug meezwaaien.',
  ]),
  ex('face-pull', 'Cable Face Pull', ['Cable Rope Face Pull', 'Rope Face Pull', 'Face Pull', 'Low Pulley Cable Face Pull'], ['rear_delts', 'upper_back'], ['traps'], 'cable', 'isolation_shoulder', false, [
    'Doen: trek het touw naar je gezicht en spreid je handen uit elkaar.',
    'Let op: ellebogen hoog, de beweging komt vanuit je schouderbladen.',
    'Vaak fout: te zwaar en met je rug naar achteren leunen.',
  ]),

  // --- trekken -----------------------------------------------------------------
  ex('pull-up', 'Pull-Up', ['Pull Up', 'Pullup', 'Pull-Ups', 'Pull Ups', 'Pullups', 'Overhand Pull-Up', 'Weighted Pull-Up', 'Optrekken'], ['lats'], ['upper_back', 'forearms', 'core', 'biceps'], 'bodyweight', 'pull_vertical', false, [
    'Doen: hang aan een stang, trek je borst naar de stang en zak gecontroleerd.',
    'Let op: begin elke herhaling vanuit een volledige hang met schouders omlaag.',
    'Vaak fout: halve herhalingen of zwaaien.',
  ], 1),
  ex('chin-up', 'Chin-Up', ['Chin Up', 'Chinup', 'Chin-Ups', 'Chin Ups', 'Underhand Grip Pull-Up', 'Supinated Pull-Up'], ['lats'], ['upper_back', 'forearms', 'biceps'], 'bodyweight', 'pull_vertical', false, [
    'Doen: handen onderhands op schouderbreedte, trek je kin boven de stang.',
    'Let op: laat helemaal zakken tot je armen gestrekt zijn.',
    'Vaak fout: je hoofd naar voren steken.',
  ], 1),
  ex('assisted-pull-up', 'Neutral Grip Machine-Assisted Pull-Up', ['Machine-Assisted Pull-Up', 'Assisted Pull Up', 'Assisted Pull-Up (Machine)', 'Assisted Chin-Up', 'Machine Assisted Pull Up', 'Optrekken met hulp', 'Assisted Pull-Up'], ['lats'], ['upper_back', 'forearms', 'biceps'], 'assisted_bodyweight', 'pull_vertical', false, [
    'Doen: knie op het kussen, het gewicht dat je kiest is de hulp, minder hulp is zwaarder.',
    'Let op: het opgegeven gewicht is hulp, je eigen gewicht minus de hulp is wat je tilt.',
    'Vaak fout: te veel hulp blijven gebruiken terwijl je al sterker bent.',
  ], 1),
  ex('lat-pulldown', 'Underhand Grip Cable Lat Pulldown', ['Cable Lat Pulldown', 'Lat Pulldown (Cable)', 'Wide Grip Lat Pulldown', 'Pulldown', 'Lat Pulldown', 'Overhand Grip Cable Lat Pulldown', 'Neutral Shoulder Width Grip Cable Lat Pulldown', 'Wide Grip Cable Lat Pulldown', 'Underhand Close Grip Cable Lat Pulldown'], ['lats'], ['biceps', 'upper_back', 'forearms'], 'cable', 'pull_vertical', false, [
    'Doen: trek de stang naar je bovenste borst en laat weer rustig omhoog komen.',
    'Let op: schouders omlaag, ellebogen naar je heupen.',
    'Vaak fout: achteroverleunen en de stang naar beneden zwaaien.',
  ]),
  ex('straight-arm-pulldown', 'Cable Rope Straight Arm Lat Pulldown', ['Cable Straight Arm Pulldown', 'Straight-Arm Pulldown', 'Pulldown met gestrekte armen', 'Straight Arm Pulldown', 'Cable Bar Straight Arm Lat Pulldown'], ['lats'], ['core'], 'cable', 'isolation_upper', false, [
    'Doen: met bijna gestrekte armen trek je de stang van boven naar je bovenbenen.',
    'Let op: voel je brede rugspieren, niet je armen.',
    'Vaak fout: de ellebogen buigen en er een triceps-oefening van maken.',
  ]),
  ex('barbell-row', 'Bent-Over Underhand Grip Barbell Row', ['Bent-Over Barbell Row', 'Bent Over Row', 'Barbell Row (Overhand)', 'Underhand Barbell Row', 'Roeien met stang', 'Barbell Row'], ['lats', 'upper_back'], ['biceps', 'rear_delts', 'lower_back', 'forearms', 'traps'], 'barbell', 'pull_horizontal', false, [
    'Doen: buig voorover met een rechte rug en trek de stang naar je onderbuik.',
    'Let op: je romp blijft stil, de ellebogen gaan langs je lichaam.',
    'Vaak fout: omhoog schokken met je romp om het gewicht te halen.',
  ], 0.08),
  ex('dumbbell-row', 'Single Arm Dumbbell Row', ['Dumbbell Row', 'One Arm Dumbbell Row', 'One-Arm Dumbbell Row', 'Dumbbell Row (Single Arm)', 'Roeien met één dumbbell'], ['lats', 'upper_back'], ['biceps', 'rear_delts', 'forearms'], 'dumbbell', 'pull_horizontal', false, [
    'Doen: een hand op een bank, trek de dumbbell naar je heup.',
    'Let op: je schouders blijven recht.',
    'Vaak fout: je romp meedraaien.',
  ]),
  ex('chest-supported-row', 'Chest-Supported Dumbbell Row', ['Chest Supported Dumbbell Row', 'Chest Supported Row', 'Incline Dumbbell Row', 'Chest-Supported Row', 'Roeien met borst ondersteund'], ['upper_back', 'lats'], ['biceps', 'rear_delts', 'forearms'], 'dumbbell', 'pull_horizontal', false, [
    'Doen: leg je borst op een schuine bank en trek de dumbbells naar je heupen.',
    'Let op: knijp bovenaan even je schouderbladen samen.',
    'Vaak fout: je borst van de bank tillen om te helpen.',
  ]),
  ex('seated-cable-row', 'Seated Cable Row', ['Cable Row', 'Row, Seated Cable', 'Seated Row', 'Seated Row (Cable)', 'Neutral Grip Seated Cable Row', 'Roeien aan de kabel zittend', 'Underhand Grip Cable Row'], ['lats', 'upper_back'], ['biceps', 'rear_delts', 'forearms'], 'cable', 'pull_horizontal', false, [
    'Doen: trek het handvat naar je buik, rug rechtop.',
    'Let op: schouders naar achteren en omlaag, ellebogen langs je lichaam.',
    'Vaak fout: voor- en achterover schommelen.',
  ]),
  ex('cable-high-row', 'Cable Rope High Row', ['Cable High Row', 'High Row (Cable)', 'Cable Rope Row High', 'Rope High Row', 'Hoog roeien aan de kabel'], ['upper_back', 'rear_delts'], ['lats', 'biceps', 'traps'], 'cable', 'pull_horizontal', false, [
    'Doen: kabel hoog, trek het touw naar je gezicht met ellebogen hoog.',
    'Let op: je knijpt je schouderbladen samen aan het eind.',
    'Vaak fout: te veel gewicht en met je rug meetrekken.',
  ]),
  ex('inverted-row', 'Inverted Row', ['Bodyweight Row', 'Australian Pull-Up', 'TRX Row', 'Ring Row', 'Roeien onder een stang'], ['upper_back', 'lats'], ['biceps', 'rear_delts', 'core'], 'bodyweight', 'pull_horizontal', false, [
    'Doen: hang onder een stang of ringen en trek je borst ernaartoe.',
    'Let op: je lichaam blijft een rechte plank.',
    'Vaak fout: je heupen laten zakken.',
  ], 0.5),
  ex('shrug', 'Dumbbell Shrug', ['Shrug', 'Shrugs', 'Schouderophalen'], ['traps'], ['forearms'], 'dumbbell', 'isolation_shoulder', false, [
    'Doen: haal je schouders recht omhoog naar je oren en zak weer.',
    'Let op: pauzeer bovenaan kort.',
    'Vaak fout: je schouders ronddraaien.',
  ]),

  // --- armen -----------------------------------------------------------------------
  ex('barbell-curl', 'Barbell Curl', ['EZ Bar Curl', 'EZ-Bar Curl', 'Biceps Curl (Barbell)', 'Curl met stang'], ['biceps'], ['forearms'], 'barbell', 'isolation_arm', false, [
    'Doen: buig je ellebogen en breng de stang naar je schouders.',
    'Let op: ellebogen blijven bij je lichaam.',
    'Vaak fout: met je rug meezwaaien.',
  ]),
  ex('dumbbell-curl', 'Dumbbell Curl', ['Dumbbell Biceps Curl', 'Biceps Curl', 'Bicep Curl', 'Alternating Dumbbell Curl', 'Biceps Curl (Dumbbell)', 'Curl met dumbbells'], ['biceps'], ['forearms'], 'dumbbell', 'isolation_arm', false, [
    'Doen: buig je ellebogen en draai je handpalmen naar boven.',
    'Let op: laat helemaal zakken tot je armen gestrekt zijn.',
    'Vaak fout: te zwaar en met je schouders meehelpen.',
  ]),
  ex('hammer-curl', 'Hammer Curl', ['Dumbbell Hammer Curl', 'Hammer Curl (Dumbbell)', 'Hamercurl'], ['biceps', 'forearms'], [], 'dumbbell', 'isolation_arm', false, [
    'Doen: duimen omhoog, buig je ellebogen.',
    'Let op: ellebogen stil naast je lichaam.',
    'Vaak fout: de gewichten laten zwaaien.',
  ]),
  ex('triceps-pushdown', 'Cable V-Bar Triceps Pushdown', ['Tricep Pushdown', 'Cable Triceps Pushdown', 'Cable Rope Triceps Pushdown', 'Rope Pushdown', 'Triceps Pressdown', 'Triceps Pushdown'], ['triceps'], [], 'cable', 'isolation_arm', false, [
    'Doen: ellebogen aan je zij, duw het touw of de stang naar beneden tot je armen gestrekt zijn.',
    'Let op: alleen je onderarmen bewegen.',
    'Vaak fout: voorover leunen en met je lichaam duwen.',
  ]),
  ex('overhead-triceps-extension', 'Overhead Triceps Extension', ['Cable Overhead Triceps Extension', 'Overhead Tricep Extension', 'Triceps boven je hoofd'], ['triceps'], [], 'cable', 'isolation_arm', false, [
    'Doen: ellebogen wijzen omhoog, strek je armen boven je hoofd.',
    'Let op: je ellebogen blijven dicht bij je hoofd.',
    'Vaak fout: de ellebogen wijd laten uitvallen.',
  ]),

  // --- varianten zoals MacroFactor ze noemt -------------------------------------
  // Een eigen oefening waar het gewicht of de beweging echt anders is (helling,
  // pauze, toestel, een arm); alleen een andere greep of houding is een alias op
  // een oefening hierboven. Zie docs/beslissingen/2026-10-23-oefeningnamen-zoals-macrofactor.md.
  ex('low-incline-barbell-press', 'Low Incline Barbell Press', ['Low Incline Barbell Bench Press', '30° Incline Barbell Bench Press', '30° Incline Barbell Press'], ['chest', 'front_delts'], ['triceps'], 'barbell', 'push_horizontal', false, [
    'Doen: bank op een lage helling, laat de stang naar je bovenste borst zakken en duw omhoog.',
    'Let op: schouderbladen blijven samen en de ellebogen schuin naar buiten.',
    'Vaak fout: de bank te steil zetten, waardoor het een schouderpers wordt.',
  ]),
  ex('low-incline-dumbbell-press', 'Low Incline Dumbbell Press', ['Low Incline Dumbbell Bench Press', '30° Incline Dumbbell Press'], ['chest', 'front_delts'], ['triceps'], 'dumbbell', 'push_horizontal', false, [
    'Doen: bank op een lage helling, duw de dumbbells recht omhoog.',
    'Let op: laat ze zakken tot een diepe rek in je borst.',
    'Vaak fout: de bank steiler zetten dan nodig is.',
  ]),
  ex('low-incline-dumbbell-fly', 'Low Incline Dumbbell Fly', ['Low Incline Dumbbell Chest Fly'], ['chest'], ['front_delts'], 'dumbbell', 'isolation_upper', false, [
    'Doen: licht gebogen ellebogen, open je armen in een boog en breng ze weer samen.',
    'Let op: stop als je de rek in je borst voelt.',
    'Vaak fout: een pers van maken door de ellebogen te strekken.',
  ]),
  ex('pause-dumbbell-bench-press', 'Pause Dumbbell Bench Press', ['Paused Dumbbell Bench Press', 'Pause Dumbbell Press'], ['chest'], ['front_delts', 'triceps'], 'dumbbell', 'push_horizontal', false, [
    'Doen: laat de dumbbells zakken, houd ze een seconde stil onderaan en duw dan omhoog.',
    'Let op: de pauze is een stilstand, geen rustpunt op je borst.',
    'Vaak fout: stuiteren uit de pauze in plaats van strak weer te duwen.',
  ]),
  ex('wide-grip-bench-press', 'Wide Grip Bench Press', ['Wide Grip Barbell Bench Press'], ['chest'], ['front_delts', 'triceps'], 'barbell', 'push_horizontal', false, [
    'Doen: pak de stang breder dan je schouders en laat hem naar je borst zakken.',
    'Let op: je onderarmen blijven bij de stang verticaal.',
    'Vaak fout: zo breed pakken dat je schouders onder druk komen.',
  ]),
  ex('close-grip-bench-press', 'Close Grip Bench Press', ['Close Grip Barbell Bench Press', 'Narrow Grip Bench Press'], ['chest', 'triceps'], ['front_delts'], 'barbell', 'push_horizontal', false, [
    'Doen: pak de stang op schouderbreedte of net smaller en houd je ellebogen dicht bij je lichaam.',
    'Let op: je polsen blijven recht boven je ellebogen.',
    'Vaak fout: zo smal pakken dat je polsen knikken.',
  ]),
  ex('pec-deck-fly', 'Pec Deck Fly', ['Overhand Grip Pec Deck Fly', 'Pec Deck', 'Machine Pec Deck Fly', 'Machine Chest Fly', 'Butterfly Machine'], ['chest'], ['front_delts'], 'machine_stack', 'isolation_upper', false, [
    'Doen: breng de armen in een boog voor je borst naar elkaar en laat rustig terugkomen.',
    'Let op: stel de zitting zo in dat je ellebogen op borsthoogte zijn.',
    'Vaak fout: je schouders naar voren laten rollen onderaan de beweging.',
  ]),
  ex('low-to-high-cable-fly', 'Low-To-High Cable Fly', ['Low To High Cable Fly', 'Low Cable Fly', 'Low To High Cable Crossover'], ['chest'], ['front_delts'], 'cable', 'isolation_upper', false, [
    'Doen: kabels laag, haal je handen in een boog omhoog naar ooghoogte voor je.',
    'Let op: licht gebogen ellebogen en een rustige terugweg.',
    'Vaak fout: met je romp meezwaaien om het gewicht omhoog te krijgen.',
  ]),
  ex('machine-shoulder-press', 'Pin-Loaded Machine Shoulder Press', ['Neutral Grip Pin-Loaded Machine Shoulder Press', 'Machine Shoulder Press', 'Shoulder Press (Machine)', 'Seated Machine Shoulder Press', 'Schouderpers op de machine'], ['front_delts'], ['side_delts', 'triceps'], 'machine_stack', 'push_vertical', false, [
    'Doen: duw de handgrepen recht omhoog en laat rustig zakken tot schouderhoogte.',
    'Let op: stel de zitting zo in dat de handgrepen vanaf je schouders vertrekken.',
    'Vaak fout: je onderrug hol trekken om hoger te komen.',
  ]),
  ex('push-press', 'Barbell Push Press', ['Push Press', 'Push Press (Barbell)'], ['front_delts'], ['side_delts', 'triceps', 'quadriceps', 'core'], 'barbell', 'push_vertical', false, [
    'Doen: stang op je sleutelbeen, zak een stukje door je knieën en duw met je benen de stang omhoog.',
    'Let op: strek je armen pas als je benen de stang in beweging hebben gebracht.',
    'Vaak fout: een diepe squat maken in plaats van een korte, snelle dip.',
  ]),
  ex('single-arm-cable-lateral-raise', 'Single Arm Cable Lateral Raise (With Cable In Front Of Body)', ['Single Arm Cable Lateral Raise', 'Single Arm High Cable Lateral Raise', 'Cable Lateral Raise (Single Arm)'], ['side_delts'], [], 'cable', 'isolation_shoulder', false, [
    'Doen: kabel voor je lichaam langs, til je arm zijwaarts tot schouderhoogte.',
    'Let op: licht gebogen elleboog en een lichte gewichtskeuze.',
    'Vaak fout: met je romp wegleunen om het gewicht omhoog te krijgen.',
  ]),
  ex('chest-supported-dumbbell-y-raise', 'Chest-Supported Dumbbell Y-Raise', ['Chest Supported Dumbbell Y-Raise', 'Chest Supported Dumbbell Y Raise', 'Dumbbell Y-Raise'], ['rear_delts', 'traps'], ['upper_back'], 'dumbbell', 'isolation_shoulder', false, [
    'Doen: leg je borst op een schuine bank en til de dumbbells in een Y-vorm schuin omhoog.',
    'Let op: duimen omhoog en een licht gewicht.',
    'Vaak fout: je borst van de bank tillen of de schouders optrekken.',
  ]),
  ex('chest-supported-dumbbell-high-row', 'Chest-Supported Dumbbell High Row', ['Chest Supported Dumbbell High Row', 'Incline Dumbbell High Row'], ['upper_back', 'rear_delts'], ['lats', 'biceps', 'traps'], 'dumbbell', 'pull_horizontal', false, [
    'Doen: leg je borst op een schuine bank en trek de dumbbells met hoge ellebogen naar buiten en omhoog.',
    'Let op: knijp bovenaan je schouderbladen samen.',
    'Vaak fout: de ellebogen naar je heupen trekken, waardoor het een lage roei wordt.',
  ]),
  ex('bent-over-barbell-high-row', 'Bent-Over Barbell High Row', ['Barbell High Row', 'Bent Over Barbell High Row'], ['upper_back', 'rear_delts'], ['lats', 'biceps', 'traps', 'lower_back', 'forearms'], 'barbell', 'pull_horizontal', false, [
    'Doen: buig voorover met een rechte rug en trek de stang met wijde ellebogen naar je bovenborst.',
    'Let op: je romp blijft stil.',
    'Vaak fout: omhoog schokken met je romp om het gewicht te halen.',
  ], 0.08),
  ex('machine-row', 'Overhand Grip Pin-Loaded Machine Row', ['Pin-Loaded Machine Row', 'Machine Row', 'Seated Machine Row', 'Neutral Grip Pin-Loaded Machine Row'], ['upper_back', 'lats'], ['rear_delts', 'biceps', 'forearms'], 'machine_stack', 'pull_horizontal', false, [
    'Doen: borst tegen het kussen, trek de handgrepen naar je lichaam en laat rustig terugkomen.',
    'Let op: schouders omlaag, knijp bovenaan je schouderbladen samen.',
    'Vaak fout: met je romp meeschommelen in plaats van trekken.',
  ]),
  ex('machine-row-plates', 'Overhand Grip Plate-Loaded Machine Row', ['Neutral Grip Plate-Loaded Machine Row', 'Plate Loaded Machine Row', 'Plate-Loaded Machine Row'], ['upper_back', 'lats'], ['rear_delts', 'biceps', 'forearms'], 'machine_plates', 'pull_horizontal', false, [
    'Doen: borst tegen het kussen, trek de handgrepen naar je lichaam en laat gecontroleerd terugkomen.',
    'Let op: laad de schijven aan beide kanten gelijk.',
    'Vaak fout: de schijven laten terugvallen in plaats van afremmen.',
  ]),
  ex('kelso-shrug', 'Pin-Loaded Row Machine Kelso Shrug', ['Kelso Shrug', 'Machine Kelso Shrug'], ['upper_back', 'traps'], ['rear_delts'], 'machine_stack', 'isolation_upper', false, [
    'Doen: borst tegen het kussen, haal je schouderbladen naar elkaar met gestrekte armen.',
    'Let op: de beweging zit in je schouderbladen, je armen blijven recht.',
    'Vaak fout: gaan roeien met je armen.',
  ]),
  ex('single-arm-cable-lat-pulldown', 'Single Arm Cable Lat Pulldown', ['Single Arm Lat Pulldown', 'One Arm Cable Lat Pulldown'], ['lats'], ['biceps', 'upper_back', 'forearms'], 'cable', 'pull_vertical', false, [
    'Doen: trek met één hand het handvat naar de zijkant van je borst en laat rustig omhoog komen.',
    'Let op: schouder omlaag, je romp blijft recht.',
    'Vaak fout: meedraaien met je romp om het gewicht te halen.',
  ]),
  ex('dumbbell-pullover', 'Dumbbell Pullover', ['Pullover (Dumbbell)', 'Pullover', 'Dumbbell Pull-Over'], ['lats'], ['chest', 'triceps', 'core'], 'dumbbell', 'isolation_upper', false, [
    'Doen: lig op een bank, laat één dumbbell met bijna gestrekte armen achter je hoofd zakken en trek hem terug.',
    'Let op: voel de rek in je zij, je ribben blijven laag.',
    'Vaak fout: je onderrug laten doorhangen onderaan.',
  ]),
  ex('negative-chin-up', 'Negative Chin-Up', ['Negative Chin Up', 'Eccentric Chin-Up', 'Negative Pull-Up'], ['lats'], ['biceps', 'upper_back', 'forearms'], 'bodyweight', 'pull_vertical', false, [
    'Doen: spring of stap tot je kin boven de stang is en zak in 4 tot 5 seconden naar beneden.',
    'Let op: zak helemaal tot je armen gestrekt zijn.',
    'Vaak fout: laten vallen in de laatste helft.',
  ], 1),
  ex('dumbbell-preacher-curl', 'Dumbbell Preacher Curl', ['Preacher Curl (Dumbbell)', 'Single Arm Dumbbell Preacher Curl'], ['biceps'], ['forearms'], 'dumbbell', 'isolation_arm', false, [
    'Doen: bovenarm op het schuine kussen, buig de elleboog en laat rustig helemaal zakken.',
    'Let op: je bovenarm blijft op het kussen liggen.',
    'Vaak fout: bovenaan je elleboog van het kussen tillen.',
  ]),
  ex('machine-preacher-curl', 'Pin-Loaded Machine Preacher Curl', ['Machine Preacher Curl', 'Preacher Curl (Machine)'], ['biceps'], ['forearms'], 'machine_stack', 'isolation_arm', false, [
    'Doen: bovenarmen op het kussen, buig je ellebogen en laat rustig zakken.',
    'Let op: stel de zitting zo in dat je oksels tegen het kussen zitten.',
    'Vaak fout: je schouders optrekken om het gewicht omhoog te krijgen.',
  ]),
  ex('incline-hammer-curl', 'Incline Hammer Curl', ['Incline Dumbbell Hammer Curl'], ['biceps', 'forearms'], [], 'dumbbell', 'isolation_arm', false, [
    'Doen: leun achterover op een schuine bank en buig met duimen omhoog.',
    'Let op: je ellebogen blijven naast of iets achter je lichaam.',
    'Vaak fout: de bank te recht zetten en je ellebogen naar voren laten komen.',
  ]),
  ex('sumo-deadlift', 'Sumo Deadlift', ['Barbell Sumo Deadlift', 'Sumo Deadlift (Barbell)'], ['glutes', 'hip_adductors', 'hamstrings'], ['quadriceps', 'lower_back', 'traps', 'forearms', 'core'], 'barbell', 'hinge', true, [
    'Doen: voeten wijd met tenen naar buiten, pak de stang binnen je knieën, duw de vloer uit elkaar en kom omhoog.',
    'Let op: knieën volgen de richting van je tenen, borst blijft hoog.',
    'Vaak fout: je heupen eerst laten stijgen, zodat je met een ronde rug trekt.',
  ]),
  ex('pause-back-squat', 'Pause Back Squat', ['Paused Back Squat', 'Pause Squat', 'Pause Barbell Back Squat'], ['quadriceps', 'glutes'], ['hamstrings', 'lower_back', 'core', 'hip_adductors'], 'barbell', 'squat', true, [
    'Doen: een back squat met een stilstand van een tot twee seconden in het diepste punt.',
    'Let op: houd tijdens de pauze je romp strak en je borst hoog.',
    'Vaak fout: in de pauze ontspannen en dan stuiteren uit het gat.',
  ]),
  ex('leg-press-quad-biased', 'Pin-Loaded Quad-Biased Leg Press', ['Quad-Biased Leg Press', 'Quad Biased Pin-Loaded Leg Press'], ['quadriceps'], ['glutes', 'hip_adductors'], 'machine_stack', 'squat', true, [
    'Doen: voeten laag op het plateau, zak diep met de knieën ver naar voren en duw weer weg.',
    'Let op: je hielen blijven op het plateau en je billen op de zitting.',
    'Vaak fout: de knieën helemaal slot strekken onder zwaar gewicht.',
  ]),
  ex('leg-press-calf-raise', 'Pin-Loaded Leg Press Calf Raise', ['Leg Press Calf Raise', 'Calf Press', 'Leg Press Calf Press'], ['calves'], [], 'machine_stack', 'calf', true, [
    'Doen: voorvoeten onderaan het plateau, duw door je tenen en laat de hielen diep zakken.',
    'Let op: houd je knieën bijna gestrekt en pauzeer onderaan kort.',
    'Vaak fout: stuiteren in plaats van gecontroleerd zakken.',
  ]),
  ex('seated-single-leg-curl', 'Seated Single Leg Hamstring Curl', ['Seated Single Leg Curl', 'Single Leg Seated Hamstring Curl'], ['hamstrings'], ['calves'], 'machine_stack', 'isolation_leg', true, [
    'Doen: trek met één been je hiel naar beneden en achter je en laat rustig terugkomen.',
    'Let op: het kussen op je bovenbeen zit stevig.',
    'Vaak fout: met je bovenlichaam meeschommelen.',
  ]),
  ex('weighted-roman-chair-back-extension', 'Weighted Roman Chair Back Extension', ['Weighted Roman Chair Hip Hinge', 'Weighted Back Extension', 'Weighted Hyperextension'], ['lower_back', 'glutes'], ['hamstrings'], 'dumbbell', 'hinge', true, [
    'Doen: heupen op het kussen, houd een gewicht tegen je borst, zak voorover en kom terug tot een rechte lijn.',
    'Let op: stop bovenaan op een rechte lijn.',
    'Vaak fout: bovenaan in een hol kruis doorbuigen.',
  ], 0.4),
  ex('weighted-ghd-hip-hinge', 'Weighted Glute Ham Developer Hip Hinge', ['Weighted GHD Hip Hinge', 'Glute Ham Developer Hip Hinge'], ['glutes', 'hamstrings'], ['lower_back'], 'dumbbell', 'hinge', true, [
    'Doen: op de glute ham developer, houd een gewicht vast en scharnier vanuit je heupen.',
    'Let op: je rug blijft recht en de beweging komt uit je heupen.',
    'Vaak fout: je rug ronden om dieper te komen.',
  ], 0.4),
  ex('glute-ham-raise', 'Glute Ham Raise', ['GHR', 'Glute-Ham Raise', 'Glute Ham Developer Raise'], ['hamstrings', 'glutes'], ['calves', 'lower_back'], 'bodyweight', 'isolation_leg', true, [
    'Doen: enkels vast, zak voorover met een rechte lijn en kom terug door je hamstrings te buigen.',
    'Let op: je heupen blijven gestrekt.',
    'Vaak fout: bovenaan met je rug de beweging afmaken.',
  ], 0.7),
  ex('reverse-nordic-curl', 'Reverse Nordic Curl', ['Reverse Nordic', 'Reverse Nordic Curls'], ['quadriceps'], ['core'], 'bodyweight', 'isolation_leg', true, [
    'Doen: kniel met je enkels vast en zak met een rechte lijn achterover van knie tot hoofd.',
    'Let op: kom zo ver als je rustig terug kunt komen.',
    'Vaak fout: in je heupen knikken in plaats van met je bovenbenen remmen.',
  ], 0.6),
  ex('dumbbell-glute-bridge', 'Dumbbell Glute Bridge', ['Glute Bridge (Dumbbell)'], ['glutes'], ['hamstrings', 'core'], 'dumbbell', 'hinge', true, [
    'Doen: lig op je rug met een dumbbell op je heupen en duw je heupen omhoog.',
    'Let op: knijp bovenaan even je billen samen.',
    'Vaak fout: een hol kruis maken in plaats van je heupen strekken.',
  ]),
  ex('dumbbell-frog-pump', 'Dumbbell Frog Pump', ['Frog Pump', 'Frog Pumps'], ['glutes'], ['hip_abductors', 'core'], 'dumbbell', 'hinge', true, [
    'Doen: lig op je rug met de voetzolen tegen elkaar en de knieën open, duw je heupen omhoog.',
    'Let op: maak veel herhalingen met een korte, strakke beweging.',
    'Vaak fout: door je onderrug omhoog duwen in plaats van door je billen.',
  ]),
  ex('barbell-glute-bridge', 'Barbell Glute Bridge', ['Glute Bridge (Barbell)'], ['glutes'], ['hamstrings', 'core'], 'barbell', 'hinge', true, [
    'Doen: lig op de grond met de stang op je heupen en duw je heupen omhoog.',
    'Let op: gebruik een pad of handdoek om de stang prettig te laten liggen.',
    'Vaak fout: een hol kruis maken in plaats van je heupen strekken.',
  ]),
  ex('superman', 'Superman', ['Superman Hold'], ['lower_back', 'glutes'], ['upper_back'], 'bodyweight', 'hinge', false, [
    'Doen: lig op je buik en til tegelijk je armen en benen een stukje van de grond.',
    'Let op: kijk naar de grond en houd je nek lang.',
    'Vaak fout: je nek achterover trekken om hoger te komen.',
  ], 0.3),
  ex('snatch-grip-shrug', 'Snatch Grip Shrug', ['Barbell Snatch Grip Shrug', 'Snatch Grip Barbell Shrug'], ['traps'], ['upper_back', 'forearms'], 'barbell', 'isolation_shoulder', false, [
    'Doen: pak de stang breed, sta rechtop en haal je schouders recht omhoog naar je oren.',
    'Let op: pauzeer bovenaan kort en zak gecontroleerd.',
    'Vaak fout: met je armen omhoog trekken.',
  ]),
  ex('decline-weighted-sit-up', 'Decline Weighted Sit-Up', ['Weighted Decline Sit-Up', 'Decline Weighted Sit Up'], ['core'], ['quadriceps'], 'dumbbell', 'core', false, [
    'Doen: op een afgaande bank met een gewicht tegen je borst, rol omhoog tot je rechtop zit.',
    'Let op: kom met je rug rustig omhoog, wervel voor wervel.',
    'Vaak fout: met zwaaien omhoog komen in plaats van met je buik.',
  ]),
  ex('horizontal-cable-chop', 'Horizontal Cable Chop', ['Cable Chop', 'Horizontal Chop'], ['core'], ['hip_abductors'], 'cable', 'core', false, [
    'Doen: kabel op borsthoogte, trek het handvat horizontaal over je lichaam en laat gecontroleerd terugkomen.',
    'Let op: draai vanuit je romp en houd je armen vrij recht.',
    'Vaak fout: te veel gewicht en je schouders laten draaien.',
  ]),
  ex('ab-wheel-rollout', 'Ab Wheel Rollout', ['Ab Wheel', 'Ab Roller Rollout', 'Wheel Rollout'], ['core'], ['lats'], 'bodyweight', 'core', false, [
    'Doen: kniel met het wiel onder je schouders, rol naar voren en kom terug met je buik.',
    'Let op: bil en buik aanspannen, ribben naar beneden.',
    'Vaak fout: je onderrug laten doorzakken onderaan.',
  ]),
  ex('barbell-rollout', 'Barbell Rollout', [], ['core'], ['lats'], 'bodyweight', 'core', false, [
    'Doen: kniel met een stang met schijven voor je en rol naar voren en terug.',
    'Let op: bil en buik aanspannen, ribben naar beneden.',
    'Vaak fout: je onderrug laten doorzakken onderaan.',
  ]),
];

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

export function exerciseById(id: string): Exercise | undefined {
  return BY_ID.get(id);
}
