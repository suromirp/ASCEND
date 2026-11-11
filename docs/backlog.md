# Backlog

Wat nog op de lijst staat, zodat een nieuwe sessie het niet uit het gesprek hoeft te halen. De
coördinator houdt dit bij: iets wat live staat gaat eruit, iets nieuws komt erbij met een regel uitleg.
Opnieuw opgebouwd op 11 november 2026 tegen main (2a333d5): alles wat live staat is eruit, wat eruit ging
en waarom staat in `docs/onderhoud/2026-11-11-backlog-opnieuw.md`. De geschiedenis staat in git en in
`docs/beslissingen/`.

## Inbox

Wat de eigenaar tussendoor meldt, voor het volgende bouwmoment (maandag, woensdag, vrijdag; skill `bouwmoment`).
Vast punt, elk bouwmoment: na de punten hieronder de eerstvolgende open ronde uit het rooster hieronder. Een opmerking over hetzelfde komt bij het bestaande punt. Meteen, tussendoor: iets dat nu stuk is (de app werkt niet, verkeerde getallen in je training, data die verloren kan gaan) en kleine fixes die de coördinator zelf in een paar minuten doet, zonder helper (een tekst, een regel, een getal). De rest gaat in de Inbox.

Leeg: alles van 11 november staat in de Bouwrij hieronder, die de coördinator deze week zelf bouwt.

## Bouwrij deze week (coördinator, tot en met 15 november)

Het bouwmoment slaat deze rij en het rooster over: de coördinator start de bouwers zelf, hoogstens drie tegelijk, nooit twee aan dezelfde bestanden, model volgens skill werkverdeling "Deze week". Volgorde is de volgorde van starten zodra er plek is.

- Route-kaart, vervolg: de lus bijsturen (andere kant op, langer of korter, een stuk vermijden), per stuk afstand en hoogtemeters, een knop Groter (kaart op volle hoogte met terugknop), hoogtelijnen (maplibre-contour met sleutelvrije hoogtetegels). Plus van Warden: een regel tijdens het bewaren van een getikt punt. Opus.
- Het Info-blad van een training opnieuw (eigenaar 11 november: "dat infomenu is kut en moet een hele refactor krijgen, een hele UI en UX verandering"). Het blad achter de knop Info (`components/TrainingGuideSheet.tsx`, menu in drie groepen). De Datavelden bekijken waren daar nauwelijks te vinden. Ontwerpvoorstel klaar (`docs/visie/Ontwerp Info-blad.md`, richting A: blad Je horloge, Uitleg korter); wacht op vijf antwoorden van de eigenaar dat de hele app bekijkt en zegt waar wat logisch hoort; daarna bouwen.
- GR5, vervolg: hutten via refuges.info bij de etappe; de grenzen ver van het spoor nakijken (Maljasset 1 km, Trébentaz, Thabor, eind in Nice 2,3 km). Opus.
- Week: de band van een periode blijft tikbaar, ook als de periode meer dan twee weken voorbij is (eigenaar 11 november, advies gevolgd). Nagaan of dat al zo is; zo niet, de grens weghalen.
- Weekterugblik met een losse training: "0 van 3 gedaan" klopt (een losse duurloop op een dag zonder geplande training telt niet als gedaan), maar leest tegenstrijdig naast "56 min". Voorstel: "0 van 3 gedaan, 1 los · 56 min" in WeekReview en weekHighlights (Sherpa Klein deel 1, 11 november). Opus.
- De voorstelzin van het krachtblok noemt de knop "Blok activeren" in plaats van de vaste zin van de stemgids (regel 3); netter is de knop Akkoord in de wizard (Warden, 11 november). Klein.
- Krachtscherm: setvinkjes 32 bij 32 px en "Toon vorige keer" 16 px hoog, onder de 44 px; op het trainingsscherm de tekstknop "Meer" 35 bij 19 px (Lookout, 11 november). Opus.
- Kleine teksten bij de sleuteltraining (Warden): keyPhrase met dubbel "of" bij marathon, trail en triathlon ("de tempo- of intervaltraining", komma voor het laatste "of"); restDayBack kijkt zeven dagen en elke trede terug, het inhalen drie dagen en de beste trede: noemen in het besluit. Klein.
- Spieren voor de berg: vakantie-, tocht- en no_gym-weken ook voor kuiten, scheen en bilspieren niet meetellen, zoals bij evenwicht (gedragswijziging, advies ja); tekeningen voor de vier evenwichtsoefeningen; een test op de Forge-weergave van een houding met reps 4-6. Klein.
- De avond ervoor, vervolg: tests voor de dag van zomer- en wintertijd en voor elke tijd uit EVENING_TIMES; een avondstand (20:30) in de tekstkaart met een invariant; nagaan of de eigenaar de kaart vindt (hij staat onder Advies, Nog open en Back-up), anders op de avond direct onder de missie. Klein.
- Wis startpunt tijdens een lopende zoektocht: de zoektocht schrijft daarna het exacte punt terug in de cache van heuvels. Vlak voor het wegschrijven opnieuw lezen (Warden, 11 november). Klein.
- Kansen 11 november, door de eigenaar gekozen (alle met het advies; bronnen in `docs/visie/Kansen 11 november app.md` en `docs/onderzoek/Kansen 11 november training.md`):
  - In aanbouw 11 november (Sherpa Afdaalklok, session_01LnDpSj2BVjJP3JFaXvSErk, fable, claude/afdaalklok): Afdaalklok: na 21 dagen zonder afdaling één regel en een voorstel met Akkoord voor een trapsessie; 7 tot 14 dagen voor een tocht om een verse afdaling vragen. Planning, Fable.
  - Racedag voor de 10 km: blad in de laatste week met weer bij de start, inlopen, tempo per km voor doeltijd en verwachte tijd; de dag erna een terugblik. Opus.
  - Vaste ijktocht elke zes tot acht weken als kompas voor de berg, inplannen via Akkoord. Planning, Fable.
  - De beenindex leert van je ochtendantwoorden (`learning.ts#indexChecks`), begrensd, veiligheidsregels nooit soepeler, met migratiestap. Fable.
  - Routes ook voor wandelen en rugzaktraining, met klimtempo. Na de twee route-bouwers. Opus, engine op Fable.
- Vervallen door de Briefing (spoor 7), alleen nog als bron: Info-blad spoor 3 en 4: Uitleg opschonen (De stappen eruit, namen gelijk: "Meer over deze training" en de i), daarna Datavelden bekijken naar Gidsen. Plus van Warden: de rij Je horloge op Vandaag met de stand eronder zoals in Week; garmin in useWatchSheet zelf ophalen in plaats van buildWorkoutPlan in drie componenten. Opus.

## Rooster voor de bouwmomenten

Deze week (tot en met 15 november) bouwt de coördinator het rooster zelf; het bouwmoment slaat het over. Per bouwmoment eerst de Inbox, daarna de volgende ronde hieronder. Een ronde heeft tot drie sporen die elkaars bestanden niet raken; ze lopen tegelijk, elk met een eigen helper in een eigen worktree, en gaan samen in één keer naar main. Nooit twee Forge-sporen tegelijk (zelfde bestanden), nooit twee planner-sporen tegelijk. Afgerond: uit dit rooster en uit de groepen hieronder, met een regel onder Pas live.

1. Buiten: UV, licht tot, hoogte van je plek.
2. Voorstel squat op één been en L-sit (planner) ‖ Uitleg bij oefeningen, batch 5 (Forge-data).
3. Feestdagen als voorstel (planner) ‖ Forge herinrichting, de rest.
4. Klein en fouten, deel 2 (Forge en Calisthenics) ‖ R10, de teksten van Forge.
5. Forge: herhalingen schatten bij een ander gewicht en de volgende set bijstellen.

## Pas live

Beantwoord op 11 november (eigenaar): APK 158, Precies, vanaf je deur en de datavelden werken; Eccentric Squat blijft de lichte vorm; de vier tekstpunten zonder screenshot vervallen.

Live op 11 november (branch claude/klein-deel-1, wacht op merge): Klein en fouten deel 1. "Twee harde lopen" in plaats van loopjes in de weekcheck; "loopjes" in runTrends en runInsight blijft, want dat zijn tellingen (R8); openFysio weg; de voorstelzin van het krachtblok volgt de stemgids en noemt de knop Blok activeren; Intensiteit zegt niet meer "een paar keer hard" zonder harde training; een losse log van horloge of MacroFactor op de dag van een open training van dezelfde soort telt in Belasting en Week één keer (zelfde maatstaf als de koppeling achteraf, `engine/looseLog.ts`), een handlog is altijd extra; Belasting op Stand: de telling klopte, het feit heet nu "wordt 424, gewoonlijk 540" (gedaan plus wat nog komt); bolletjes in de legenda van Intensiteit, elk deel ongebroken; de ontbrekende tests. De valkuil over inkorten staat nu in het werkbriefje bediening-en-beweging.

Het bouwmoment zet hier per keer één regel "Live op <datum>: ..."; de coördinator haalt die weg bij de volgende opruiming.

- Live op 11 november: Briefing spoor 2 (blad Route: kaart, lussen als rijen, knop eronder, uitleg achter de i).
- Live op 11 november: Afdaalklok (na 21 dagen zonder afdaling een voorstel met Akkoord voor Trap af, 20 min; instelbaar in Tochten; besluit `2026-11-11-afdaalklok.md`). Mag: plek als regel op de missiekaart staat nu in de coachzin.
- Live op 11 november: Briefing A (route alleen bij buiten; Vandaag, het blad achter de i en De avond ervoor volgen Waar train je?, geen route bij Loopband).
- Live op 11 november: Eten onderweg (koolhydraten per uur vanaf 90 minuten met stuks, per dag bij een tocht met de aanname erbij; kaart op het trainingsscherm onder de route, De avond ervoor, etappe en Tochten; besluit `2026-11-11-eten-onderweg.md`).
- Live op 11 november: Route-kaart 2 (startpunt Waar je nu bent als standaard, Vast punt, Ongeveer; tweede lus duidelijk met een regel; Lussen zoeken met stappen; geen aanroep meer na sluiten; besluit `2026-11-11-route-kaart-2.md`).
- Live op 11 november: GR5-etappes met spoor uit OpenStreetMap (546 km, Vanoise via de GR 55), engine/stageAt.ts, de regel Op je etappe op een GR5-wandeldag; besluit `2026-11-11-gr5-uit-osm.md`.
- Live op 11 november: Enkel en evenwicht in Spieren voor de berg (vier oefeningen, voorstel met Akkoord, schakelaar Enkel en evenwicht; besluit `2026-11-11-enkel-evenwicht.md`).
- Live op 11 november: De avond ervoor (vanaf 20:00 een kaart onder je missie met wat je voor morgen klaarlegt; melding als keuze, standaard uit; besluit `2026-11-11-avond-ervoor.md`).
- Live op 11 november: De sleuteltraining past bij je doel (één definitie per soort doel; bij 10 km ook tempo of intervallen inhalen, hoogstens één inhaal per keer, 48 uur over de weekgrens; besluit `2026-11-11-sleuteltraining.md`).
- Live op 11 november: Route voorstellen met een echte kaart (MapLibre met OpenFreeMap, alle lussen, je plek, Start hier wordt je startpunt; instelling Ondergrond van de kaart; besluit `2026-11-11-route-kaart.md`).
- Live op 11 november: Klein en fouten deel 1 (Twee harde lopen, voorstelzin krachtblok, dode code weg, ontbrekende tests, Belasting "wordt ..., gewoonlijk ...", zin en legenda van Intensiteit, een los horlogelog telt één keer met dezelfde maatstaf als koppelen achteraf).
- Live op 11 november: Je horloge (knop Horloge op het trainingsscherm, rij in Week en op Vandaag; workout en datavelden op één plek; besluiten `2026-11-11-info-blad-horloge.md` en `-spoor-2.md`).
- Live op 11 november: Route voorstellen verfijnd (te korte lus bij veel punten dichtbij, melding zonder heuvels, startpunt preciezer, helling zonder hoogte telt niet mee; besluit `2026-11-11-route-verfijnen.md`).

## De Briefing (eigenaar akkoord 11 november, besluit `2026-11-11-briefing.md`)

Elf sporen uit `docs/visie/Ontwerp Route en trainingsscherm.md`, hoofdstuk 7, allemaal Opus, geen planning. Volgorde:
- Live 11 november: spoor 1, 3 en 4 (Briefing A).
- Live 11 november: spoor 2 (het blad Route met de kaart bovenaan).
- In aanbouw 11 november: spoor 5 en 6 (Sherpa, opus, branch claude/briefing-spoor-5-6).
- Daarna spoor 7 (namen gelijk, Waarom deze training, het dubbele weg), 8 (past het best), 9 (de lus onthouden tot middernacht), 10 (hoogteprofiel), 11 (wandelen en rugzak).
- Het oude Info-blad spoor 3 en 4 vervallen: spoor 7 hier vervangt ze.

## Werkwijze (onderzoek autonome agents, 11 november)

- Proefversie per branch die de eigenaar op zijn telefoon kan openen vóór main: een debug-APK met `applicationIdSuffix` en eigen opslag, via de Android-workflow per branch. Native: eerst een proefbouw. Opus.
- Een Stop-hook die een bouwer pas laat stoppen als tsc en de gerichte tests groen zijn (instellingen van Claude Code: alleen met akkoord van de eigenaar).

## Samenhang (Pathfinder)

- Briefing spoor 2 (Pathfinder, moet op 360 bij 640): de hoofdknop van het blad Route valt daar net onder de vouw. Voorstel: rijen compacter (één regel per lus) of de knop als vaste onderrand van het blad. Op 412 (telefoon eigenaar) staat hij erboven.

- Briefing spoor 2 (Warden, moet, later): `engine/routeSheet.ts#loopLines` herkent de korter-zin aan de tekst van proposalNotes; laat de planner de notes als {text, warn} teruggeven zodra routePlanner.ts mag bewegen (spoor 8).
- Briefing spoor 2 (Pathfinder, moet, spoor 6): mint Gedaan op Vandaag en Gedaan, invullen op het trainingsscherm bij een Garmin-loop; Route voorstellen staat op Vandaag onder de vouw en is via Week vier tikken. Spoor 5 en 6 lossen dit op; pas dan is de klacht weg.
- Briefing spoor 2 (Pathfinder, mag): de eerste vraag van de route is een lange tekstmuur zonder mint knop.
- Werkwijze (coördinator): Warden en Pathfinder zetten soms de hoofdmap op een andere commit (git checkout); in hun opdracht expliciet "alleen in een eigen worktree, nooit checkout in /home/user/ascend".

- Briefing A (Warden, mag): De avond ervoor laat de route-regel weg zolang de plekkeuzes nog niet gelezen zijn (nu telt dan de standaard; alleen als lezen langer dan 1 s duurt).
- Briefing A (Warden, mag): readMap in storage/trainingPlace.ts neemt een lezing alleen over als er sinds de start geen save klaar is (versieteller).
- Eigen gewicht (Sherpa Afdaalklok): tpl_bodyweight en tpl_hill_easy hebben geen SESSION_STYLE; Eigen gewicht toont daardoor "Zone 2, praten kan" bij een krachttraining.
- Afdaalklok (Warden, mag): een weerruil of slepen kan Trap af uit het venster van de klok halen; de klok controleert dat niet. Test voor een ruil met Trap af als partner, en een test voor de duur bij een andere nieuwe rij in een voorstel.

- Afdaalklok (Pathfinder, mag): bij 21 dagen of meer mag de afdaalregel niet wegzakken achter "nog 3" in de adviezenkaart.
- Afdaalklok (Pathfinder, mag): na de afgevinkte duurloop wordt Trap af de missie, zoals elke tweede training op een dag.
- Afdaalklok (Pathfinder, mag): telt het blad Gemist een vervallen Trap af mee als gemiste training? Nagaan en zo ja niet meetellen.
- Afdaalklok (Pathfinder, mag): de naam Trap af dekt geen duin of helling; pas als de uitleg in het scherm niet genoeg is.
- Afdaalklok (Pathfinder, mag): een korte Garmin-wandeling op een dag met duurloop en Trap af mag niet aan Trap af koppelen als de loop bedoeld is; testen met één dag.

Wat Pathfinder vindt en niet meteen terug naar een bouwer gaat. Eerste lijst (coördinator, 11 november): de horlogestand staat twee keer in het blad van een training in Week; de route staat ook bij de loopband; geen route in het blad in Week; de avondkaart staat onder Advies, Nog open en Back-up; het trainingsscherm van een Garmin-loop heeft "Gedaan, invullen" als hoofdknop. De redesign (Cartographer, `docs/visie/Ontwerp Route en trainingsscherm.md`) neemt de eerste vier mee.
- Twee invarianten in de tekstkaart: dezelfde zin twee keer op één scherm of in één blad is een schending; het aantal tikken van Vandaag tot de route en tot de datavelden staat in de kaart en mag niet stil groeien. Eerst de dubbele horlogeregel weg, anders faalt de vergelijking. Opus.

## Groot

- Herinrichting uit de ontwerprapporten (`docs/visie/Ontwerprapport gegevens.md`, `instellingen.md`): Stand met Ritme, de weekterugblik, het Logboek, Geavanceerd als eigen pagina, één notatie voor tijden ("13.05" bij het weer tegenover "06:11" in Instellingen). Een eigen ronde van een uur of meer met Cartographer. De keuzes uit de rapporten maakt de coördinator met het advies.
- Forge herinrichting, de rest (deel 1 live sinds 2 november, besluit `2026-11-02-forge-herinrichting.md`; uit `docs/visie/Ontwerprapport Forge.md`): de kolom Voorschrift weg, RIR-bolletje en vinkvak naar minstens 44 px (45 kleine tikdoelen in de Lookout-doorloop), Kleiner maken en Afronden niet dubbel in het menu, de naam van een oefening in Marcellus, het blad Set met lang drukken zichtbaar, de regel "per kant ..." onder elke set en het percentage van je maximum. `components/forge/`. Eén bouwer.
- Teksten stap 4: de teksten uit de code naar een vertaalbestand per taal, daarna Engels, te kiezen in Instellingen. Groot werk in alle componenten; de engine geeft ook zinnen terug. Pas na R10. Wacht: "Engels wacht" (plan van de coördinator, 9 november).
- Routeplanner na het kaartje: startpunt kiezen, huidige locatie en bijsturen (zie Inbox). `engine/route*`, `integrations/`.

## Middelgroot

- Buiten (akkoord eigenaar 7 november): UV-index als regel bij een lange loop of tocht vanaf UV 6 (de waarde zit al in `engine/weather.ts`, de regel niet), "Licht tot 17.12" als een training buiten na zonsondergang eindigt (`engine/sun.ts` bestaat), en de hoogte van je plek of vakantieadres (de hoogteaanroep staat nu in `integrations/overpass.ts`, kan naar `openMeteo.ts`). Instelbaar, alleen tekst. Sonnet.
- Feestdagen als voorstel (akkoord 7 november, bleef liggen in ronde 3): Nager.Date, Nederland en het land van een vakantie, eens per jaar ophalen, een feestdag is een voorstel met Akkoord. Raakt de planning: engine op Fable, niet tegelijk met een andere planner-sessie.
- Voorstel squat op één been en L-sit (akkoord eigenaar 9 november avond): bij Calisthenics algemeen één keer een voorstel met Akkoord dat ze in een training zet als ze nergens staan; de kaart zegt nu "Staat nog niet in je trainingen." Planner, Fable, niet tegelijk met een andere planner-sessie. De kaart onthoudt geen hoogste stap: zo laten.
- Uitleg bij oefeningen: nog 59 oefeningen zonder uitleg, in batches van twintig (Scribe schrijft, Scout toetst de techniek, bron in `docs/onderzoek/`). `src/data/exercises.ts`. Sonnet.
- R10: de teksten van de Forge-tab volgens de stemgids. Daarna de uitleg in Instellingen inkorten (nu gemiddeld ongeveer 66 woorden, doel ongeveer 40).
- Forge, wens 3 november: (1) herhalingen schatten bij een ander gewicht dat je zelf invult (uit je geschatte kracht en de gevraagde RIR, alleen een voorstel in het vak); (2) na afvinken de volgende open werkset bijstellen naar wat Forge nu verwacht, beide kanten op, instelbaar. Nu stelt `engine/forgeAdjust.ts` alleen lichter voor, met een tik; `forgeInput.ts#carryChange` schuift alleen een gelijke waarde door.
- Heuvels en de periode: de OpenStreetMap-regel op een vakantieadres of in een periode Zonder sportschool. Een periode heeft geen eigen plek; vraagt een nieuwe opgeslagen vorm met migratie (Fable).
- Health Connect, de rest: een ronde start alleen als je terugkomt in de app (niet na urenlang open staan); het blad Lichaamsgewicht toont heel even "Gewicht: staat uit" na weer aanzetten.
- Zonder doel: de vorm van de week veranderen bij een andere richting (de kaart Je week op Je stand staat er al, `components/stand/YourWeekStandCard.tsx`).

## Klein en fouten

Deel 2 (Forge en Calisthenics):
- Regel 4 en 5 van de afvinkregels lezen gelijk (besluit `2026-11-09-forge-review-afvinken.md`).
- Spieren voor de berg heeft in Forge geen eigen schakelaar (Forge zit op het maximum van 6 rijen).
- Toestelstanden: de formulier-`key` in `components/forge/MachineWeights.tsx`; standen in pond, plaatjesnummers en optrekhulp; het strookje "Ook tussenin en erboven schatten" breekt op 390 px; Rustig niet gezien.
- Reverse Lunge staat als dumbbell-oefening in de catalogus; een variant met eigen gewicht ontbreekt.
- De terugknop van het toestel sluit het uitlegblad ook na Lichter of Zwaarder; alleen Terug naar gaat een stap terug.
- Calisthenics: de toets van de straddle front lever is hoog; Ongedaan maken verdwijnt na Akkoord op een andere training; bij het maximum van 20 trainingen meldt Akkoord gelukt terwijl de stap niet geldt; een back-up uit een nieuwere versie met een onbekende ladder bewaart die vaardigheid verborgen; Liever niet bij een stapvoorstel staat alleen in localStorage; 17 nieuwe tekeningen niet allemaal bekeken; een stopwatch bij een houding.
- IJkset: de rij van de extra set heet nog "eigen set" (`engine/forgeRows.ts`, `ExerciseBlock.tsx`); Niet nu geldt alleen voor deze keer.
- Toevoegingen van Spieren voor de berg gaan nog niet mee in het concept van een lopende sessie; Ruilen op een toegevoegde bergspieroefening die na Uit deze training halen met afgevinkte sets blijft, doet stil niets.
- Tempo: de stippen in de tempografiek zijn niet tikbaar; het blad gebruikt 8 weken, de kaart 12.

Overig:
- De info-knop van een instellingsrij meet 20 bij 20 px (gedeeld onderdeel).
- Een helling zonder bekende hoogte telt mee in het aantal maar niet voor de hoogste (Route voorstellen).
- De kaart Let op op Vandaag verschijnt na het ophalen en kan de ochtendkaart onder de missie schuiven; mogelijk dubbel onweer met het bergweer.
- De periode Zonder sportschool geeft de 3 dagen na een tocht dezelfde lengteregel als de 72 uur rust.
- Overzicht Gewicht: met precies twee wegingen in twee weken kan het eind van de lijn een paar tienden afwijken van het grote getal.
- Nagekomen uit ronde 2b: een eigen sport telt niet in de weekcheck; "Laten staan" bij een vakantie en "laten rusten?" rond een Top-race voor vaste sporten; de waarde "Alles normaal" valt af in de rij Hoeveel per soort op 360 px; een test die alle Android-XML vooraf leest (een dubbel streepje in commentaar brak de APK-bouw).

## Nakijken

Twijfel of het af is; eerst kijken, dan schrappen of bouwen.
- Rustdag terug: een training die je zelf oversloeg of waarvan je het inhaalvoorstel afwees, kan de rustdag tot zeven dagen tegenhouden. `trainedOn` volgt nu `dayLoads` (af), maar `catchUpFits` in `engine/restDayBack.ts` kijkt niet naar een afgewezen inhaalvoorstel.
- Tempo bij zone 2, kleine rest: een oude `aerobicProgressCelebrated` na 14 dagen negeren; het dauwpunt per loop (`dewPoint` zit in `heatPace.ts` en het weer); de regel voor benen die niet uitgerust zijn (hoofdstuk 5 van het verslag). Niet in de code teruggevonden of bevestigd.
- Geavanceerd als eigen pagina in Instellingen (akkoord eigenaar 2 november): er is een Geavanceerd per groep (bijvoorbeeld Koppelingen, Geavanceerd); of dat de bedoelde pagina is, is niet nagegaan.
- Eén notatie voor tijden: niet nagegaan of "13.05" en "06:11" nog naast elkaar staan.
- Jaaroverzicht: "Testloop 5 km: 14 jan en 15 jan", twee dagen voor één test. Fout in de gegevens of in de telling?
- De vaste doorloop van Lookout gaf Stand helemaal leeg; een eigen afdruk was vol. Drukt de kit te vroeg af?
- Startvragen: standaard is "Een tocht of wedstrijd"; is "Fit blijven" logischer voor iemand zonder plan?
- Op een toestel of in een echte browser nog niet gezien: de echte Overpass- en hoogteaanroep, live Open-Meteo-waarschuwing en EAWS, opslaan in Documenten/ASCEND, een GPX als koers in Garmin Connect en op het horloge, de keuzelijst van Android, lussen boven ongeveer 18 km (de heuvelcache is 3 km), de locatievraag bij Precies, plakken in de echte Strava-app, de tempoband met 8 of meer lopen over 4 weken, het bolletje gewicht en aandeel met een echte weging, 34 van de 40 uitlegteksten van batch 3 en 4.
- Routeplanner: in de afdruk waren beide lussen korter dan de training (4,2 en 4,6 km bij 6 km); nakijken met echte lussen van de eigenaar.
- Feiten om te toetsen (Scout): de factor 0,98 voor de drempelhartslag na een 5 km; Sporten lezen echte intervals.icu-types (Swim, Padel, Soccer, Yoga) alleen met nagemaakte data getest; de drempels van vermoeidheid tussen oefeningen niet op echte trainingen getoetst.

## Wacht op de eigenaar

Niets open (11 november).

## Later

- Los van MacroFactor Workouts (doel eigenaar 9 november; de voedingsapp blijft): criteria en stand in `docs/visie/Los van MacroFactor.md`, de weekbriefing meldt elke maandag hoe het ervoor staat. De MacroFactor-code pas weg als het moment er is.
- Helemaal aan het eind, als alles klaar is (toestemming eigenaar, 1 november): de vakantiedata van de eigenaar uit de geschiedenis van git halen (oude commits van `docs/onderhoud/2026-11-01-aanpak-backlog.md` en c305cb1). Herschrijft geschiedenis op main en de werkbranch; eerst alle helpers stoppen, daarna de deploy controleren.
- Gebruikerstest met vier nagemaakte personen en de herstelronde erna, in een eigen sessie (eigenaar, 2 november).
- Kansen: de bestandsroute voor FIT-bestanden als vangnet (stap 0c van het onderzoek).
- Ochtendkaart: de kaart leert van jou (hoe ging de training na "moe" of "slecht geslapen"); een melding op de telefoon met de vier keuzes, zodat je de app niet hoeft te openen.
- Oefeningendatabase wger (CC-BY-SA) als bron bij het schrijven van uitleg en vervangers; nooit letterlijk, met bron in `ATTRIBUTION.md`. Geen koppeling in de app.
- Na de Android-app, nog niet (eigenaar, 1 november): trainingen in je agenda inplannen met kaders voor ochtend, middag en avond; gesproken signalen, vergrendelen met vingerafdruk, 's nachts horlogegegevens ophalen, delen met één tik.

## Bewust niet

- Voeding naast gewicht en kracht (kans E): de eigenaar laat dit liggen (1 november).
- Hartslagband via Bluetooth (eigenaar).
- Camera en een gps-route of spoor van tochten, tenzij de eigenaar het vraagt (afgeraden om batterij en privacy).
- Spraakloggen en een getal op het icoon (afgeraden).
- Meteoalarm: niet leesbaar vanuit een webapp (geen CORS); de waarschuwingen draaien op drempels van Open-Meteo.

## Geparkeerd

- Spierindex stap 3.

## Werkwijze, voor de coördinator

- Een controle op echte data: een script dat een back-up van de eigenaar (alleen in de scratchpad, nooit in de repo) door de engine haalt en dezelfde invarianten toetst. Draaien zodra de eigenaar een back-up stuurt.
- Afspraken die nu alleen in het gesprek staan: de eigenaar stuurt elke zondag een verse back-up; de coördinator wisselt dagelijks (skill `coordinator-wissel`), de overdracht staat in `.claude/coordinator/overdracht.md`.
- Bij een opruiming als deze: een punt is pas af als de code het doet, niet omdat een tekst het zegt; twijfel gaat onder Nakijken.

## Werkwijze, overig

- Het wekelijkse onderhoud en de appscan op Sonnet laten draaien en na een paar weken kijken wat ze vinden en kosten.
