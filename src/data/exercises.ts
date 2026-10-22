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
  ex('leg-press', 'Leg Press', ['Pin-Loaded Leg Press', 'Leg Press (Machine)', 'Machine Leg Press', 'Beenpers met gewichtstapel'], ['quadriceps', 'glutes'], ['hamstrings', 'hip_adductors'], 'machine_stack', 'squat', true, [
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
  ex('deadlift', 'Deadlift', ['Conventional Deadlift', 'Barbell Deadlift', 'Deadlift (Barbell)'], ['glutes', 'hamstrings', 'lower_back'], ['quadriceps', 'traps', 'forearms', 'core', 'lats'], 'barbell', 'hinge', true, [
    'Doen: stang over het midden van je voet, rug strak, duw de vloer van je weg.',
    'Let op: de stang blijft dicht langs je benen.',
    'Vaak fout: de heupen eerst laten stijgen, zodat je met een ronde rug trekt.',
  ]),
  ex('romanian-deadlift', 'Romanian Deadlift', ['Barbell Romanian Deadlift', 'RDL', 'Romanian Deadlift (Barbell)', 'Stiff Leg Deadlift', 'Roemeense deadlift'], ['hamstrings', 'glutes'], ['lower_back', 'forearms', 'traps'], 'barbell', 'hinge', true, [
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
  ex('seated-leg-curl', 'Seated Leg Curl', ['Seated Leg Curl (Machine)', 'Machine Seated Leg Curl', 'Hamstringcurl zittend'], ['hamstrings'], ['calves'], 'machine_stack', 'isolation_leg', true, [
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
  ex('seated-calf-raise', 'Seated Calf Raise', ['Seated Calf Raise (Machine)', 'Machine Seated Calf Raise', 'Bent Knee Calf Raise', 'Kuitheffen gebogen'], ['calves'], [], 'machine_stack', 'calf', true, [
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
  ex('hanging-leg-raise', 'Hanging Leg Raise', ['Hanging Knee Raise', 'Captain\'s Chair Leg Raise', 'Hanging Straight Leg Raise', 'Beenheffen hangend'], ['core'], ['forearms'], 'bodyweight', 'core', false, [
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
  ex('incline-bench-press', 'Incline Barbell Bench Press', ['45° Incline Barbell Bench Press', 'Incline Bench Press', 'Incline Bench Press (Barbell)', '30° Incline Barbell Bench Press', 'Schuin bankdrukken met stang'], ['chest', 'front_delts'], ['triceps'], 'barbell', 'push_horizontal', false, [
    'Doen: bank op een lichte helling, stang naar je bovenste borst en weer omhoog.',
    'Let op: een kleine helling is genoeg, te steil wordt een schouderpers.',
    'Vaak fout: de stang naar je nek laten zakken.',
  ]),
  ex('dumbbell-bench-press', 'Dumbbell Bench Press', ['Bench Press (Dumbbell)', 'DB Bench Press', 'Flat Dumbbell Press', 'Bankdrukken met dumbbells'], ['chest'], ['front_delts', 'triceps'], 'dumbbell', 'push_horizontal', false, [
    'Doen: duw de dumbbells omhoog en laat ze zakken tot een diepe rek in je borst.',
    'Let op: ellebogen schuin naar buiten, niet 90 graden.',
    'Vaak fout: de dumbbells te ver naar buiten laten zakken.',
  ]),
  ex('incline-dumbbell-press', 'Incline Dumbbell Press', ['Incline Dumbbell Bench Press', '45° Incline Dumbbell Bench Press', 'Incline Dumbbell Press (Dumbbell)', 'Schuin bankdrukken met dumbbells'], ['chest', 'front_delts'], ['triceps'], 'dumbbell', 'push_horizontal', false, [
    'Doen: bank op een lichte helling, duw de dumbbells recht omhoog.',
    'Let op: schouderbladen blijven op de bank.',
    'Vaak fout: de bank te steil zetten.',
  ]),
  ex('push-up', 'Push-Up', ['Pushup', 'Push Up', 'Push-Ups', 'Pushups', 'Push Ups'], ['chest'], ['front_delts', 'core', 'triceps'], 'bodyweight', 'push_horizontal', false, [
    'Doen: handen onder je schouders, lichaam recht, zak tot je borst bijna de grond raakt.',
    'Let op: ellebogen schuin naar achteren, niet wijd.',
    'Vaak fout: je heupen laten zakken.',
  ], 0.65),
  ex('machine-chest-press', 'Machine Chest Press', ['Chest Press (Machine)', 'Seated Chest Press', 'Pin-Loaded Machine Chest Press', 'Borstpers op de machine'], ['chest'], ['front_delts', 'triceps'], 'machine_stack', 'push_horizontal', false, [
    'Doen: duw de handgrepen naar voren en laat rustig terugkomen.',
    'Let op: stel de zitting zo in dat de handgrepen op borsthoogte zijn.',
    'Vaak fout: je schouders naar voren laten rollen.',
  ]),
  ex('cable-fly', 'Cable Fly', ['Cable Chest Fly', 'Cable Crossover', 'Standing Cable Fly', 'Kabel fly'], ['chest'], ['front_delts'], 'cable', 'push_horizontal', false, [
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
  ex('dumbbell-shoulder-press', 'Dumbbell Shoulder Press', ['Seated Dumbbell Shoulder Press', 'Dumbbell Overhead Press', 'Shoulder Press (Dumbbell)', 'Schouderpers met dumbbells'], ['front_delts'], ['side_delts', 'triceps'], 'dumbbell', 'push_vertical', false, [
    'Doen: duw de dumbbells van schouderhoogte recht omhoog.',
    'Let op: polsen boven je ellebogen.',
    'Vaak fout: de dumbbells naar elkaar laten botsen.',
  ]),
  ex('lateral-raise', 'Dumbbell Lateral Raise', ['Lateral Raise', 'Side Raise', 'Lateral Raise (Dumbbell)', 'Zijwaartse schouderheffing'], ['side_delts'], [], 'dumbbell', 'isolation_shoulder', false, [
    'Doen: til de gewichten zijwaarts tot schouderhoogte.',
    'Let op: licht gebogen ellebogen en een lichte gewichtskeuze.',
    'Vaak fout: zwaaien met je hele lichaam.',
  ]),
  ex('rear-delt-fly', 'Reverse Fly', ['Rear Delt Fly', 'Dumbbell Reverse Fly', 'Bent-Over Reverse Fly', 'Achterwaartse zijheffing'], ['rear_delts'], ['upper_back'], 'dumbbell', 'isolation_shoulder', false, [
    'Doen: buig voorover en til de gewichten zijwaarts tot je ellebogen op schouderhoogte zijn.',
    'Let op: je trekt met je achterste schouders, niet met je nek.',
    'Vaak fout: te zwaar en met je rug meezwaaien.',
  ]),
  ex('face-pull', 'Face Pull', ['Cable Face Pull', 'Cable Rope Face Pull', 'Rope Face Pull'], ['rear_delts', 'upper_back'], ['traps'], 'cable', 'pull_horizontal', false, [
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
  ex('assisted-pull-up', 'Assisted Pull-Up', ['Neutral Grip Machine-Assisted Pull-Up', 'Machine-Assisted Pull-Up', 'Assisted Pull Up', 'Assisted Pull-Up (Machine)', 'Assisted Chin-Up', 'Machine Assisted Pull Up', 'Optrekken met hulp'], ['lats'], ['upper_back', 'forearms', 'biceps'], 'assisted_bodyweight', 'pull_vertical', false, [
    'Doen: knie op het kussen, het gewicht dat je kiest is de hulp, minder hulp is zwaarder.',
    'Let op: het opgegeven gewicht is hulp, je eigen gewicht minus de hulp is wat je tilt.',
    'Vaak fout: te veel hulp blijven gebruiken terwijl je al sterker bent.',
  ], 1),
  ex('lat-pulldown', 'Lat Pulldown', ['Underhand Grip Cable Lat Pulldown', 'Cable Lat Pulldown', 'Lat Pulldown (Cable)', 'Wide Grip Lat Pulldown', 'Pulldown'], ['lats'], ['biceps', 'upper_back', 'forearms'], 'cable', 'pull_vertical', false, [
    'Doen: trek de stang naar je bovenste borst en laat weer rustig omhoog komen.',
    'Let op: schouders omlaag, ellebogen naar je heupen.',
    'Vaak fout: achteroverleunen en de stang naar beneden zwaaien.',
  ]),
  ex('straight-arm-pulldown', 'Straight Arm Pulldown', ['Cable Straight Arm Pulldown', 'Straight-Arm Pulldown', 'Pulldown met gestrekte armen'], ['lats'], ['core'], 'cable', 'pull_vertical', false, [
    'Doen: met bijna gestrekte armen trek je de stang van boven naar je bovenbenen.',
    'Let op: voel je brede rugspieren, niet je armen.',
    'Vaak fout: de ellebogen buigen en er een triceps-oefening van maken.',
  ]),
  ex('barbell-row', 'Barbell Row', ['Bent-Over Underhand Grip Barbell Row', 'Bent-Over Barbell Row', 'Bent Over Row', 'Barbell Row (Overhand)', 'Underhand Barbell Row', 'Roeien met stang'], ['lats', 'upper_back'], ['biceps', 'rear_delts', 'lower_back', 'forearms', 'traps'], 'barbell', 'pull_horizontal', false, [
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
  ex('seated-cable-row', 'Seated Cable Row', ['Cable Row', 'Row, Seated Cable', 'Seated Row', 'Seated Row (Cable)', 'Neutral Grip Seated Cable Row', 'Roeien aan de kabel zittend'], ['lats', 'upper_back'], ['biceps', 'rear_delts', 'forearms'], 'cable', 'pull_horizontal', false, [
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
  ex('triceps-pushdown', 'Triceps Pushdown', ['Tricep Pushdown', 'Cable Triceps Pushdown', 'Cable Rope Triceps Pushdown', 'Rope Pushdown', 'Triceps Pressdown'], ['triceps'], [], 'cable', 'isolation_arm', false, [
    'Doen: ellebogen aan je zij, duw het touw of de stang naar beneden tot je armen gestrekt zijn.',
    'Let op: alleen je onderarmen bewegen.',
    'Vaak fout: voorover leunen en met je lichaam duwen.',
  ]),
  ex('overhead-triceps-extension', 'Overhead Triceps Extension', ['Cable Overhead Triceps Extension', 'Overhead Tricep Extension', 'Triceps boven je hoofd'], ['triceps'], [], 'cable', 'isolation_arm', false, [
    'Doen: ellebogen wijzen omhoog, strek je armen boven je hoofd.',
    'Let op: je ellebogen blijven dicht bij je hoofd.',
    'Vaak fout: de ellebogen wijd laten uitvallen.',
  ]),
];

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

export function exerciseById(id: string): Exercise | undefined {
  return BY_ID.get(id);
}
