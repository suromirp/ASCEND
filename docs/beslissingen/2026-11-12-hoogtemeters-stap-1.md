# Hoogtemeters stap 1: één teller voor plan en log

Datum: 2026-11-12
Status: voorgesteld

## Besluit

Geplande en gelopen hoogtemeters worden geteld door één pure functie, `engine/elevation.ts#climbAndDescent`, met echte hysterese en een drempel per bron. De oude tellers (`routeGeometry.ts#ascentOf` met een verspringend anker en `activityDetail.ts#deadBand` als teller) verloren ongeveer een drempel per klim en tellen niet meer.

De keuzes, een voor een:

- **De telwijze.** De teller onthoudt het laagste punt sinds de laatste top en het hoogste punt sinds het laatste dal. Een klim telt zodra hij de drempel haalt, en dan van het echte dal tot de echte top. Daling telt op dezelfde manier. Na het laatste keerpunt telt een begonnen been dat de drempel niet haalt niet mee.
- **Precies de drempel telt.** Een klim van precies 2 m bij een drempel van 2 m telt; 1,9 m niet. Zo deed `ascentOf` het al.
- **Drempel per bron, vaste waarden** (`ELEVATION_THRESHOLD_M`): horloge met barometer 2 m, Lidar-maaiveld 2 m na gladmaken, model van 30 m (BRouter, Valhalla) 5 m, hetzelfde model in de bergen 10 m. Bron: het onderzoek, punt 4 (zes eigen lopen, Strava 2 m met en 10 m zonder barometer, GPS Visualizer rond 10 m in de bergen). Er is nog geen instelling; die hoort bij stap 3.
- **Wanneer is het bergen.** Een lijn uit een model van 30 m telt als bergen als er 300 m of meer tussen het laagste en het hoogste punt ligt (`MOUNTAIN_RELIEF_M`, `modelThresholdM`). Dit is een eigen aanname: het onderzoek noemt heuvels 20 tot 100 m per klim en geeft geen grens.
- **Lidar.** Er is in stap 1 nog geen Lidar-bron. De drempel van 2 m staat klaar; het gladmaken over ongeveer 30 m langs de lijn komt met de bron in stap 2.
- **Het horloge wordt eerst gladgemaakt over 15 seconden** (`WATCH_SMOOTH_SEC`, `smoothOverTime`, `watchLine`). Dit stond niet in de opdracht en is een eigen keuze. Reden: een reeks per seconde kan per meting een meter of meer springen, en zo'n sprong haalt de drempel van 2 m op zichzelf. De bestaande tests met nagemaakte barometerruis van 1 tot 1,5 m per seconde gingen daardoor rood (een vlakke loop van een uur gaf 92 m, een tocht 544 procent van het gemelde getal). Met het venster van 15 seconden blijven die tests ongewijzigd groen. De kosten op een rustige reeks: hoogstens 3 m per loop op de zes nagemaakte lopen. De coördinator moet dit naspelen met de echte reeksen, met en zonder gladmaken.
- **Het plan** (`ascentOf`, en daarmee `routePlanner.ts` en `places.ts#trackFacts`) telt met de teller en de drempel van een model van 30 m. `ASCENT_DEAD_BAND_M` blijft 5 m en blijft de maat waarmee de planner een helling herkent (`climbOnLine`, `tallestClimbLine`); die code is niet aangeraakt.
- **Het log** (`activityDetail.ts`, `runDetail.ts`, `activityTrim.ts`) leest de hoogte via `watchLine`: de lijn van de teller, zodat de stijging per stuk, per kilometer en per ronde samen precies het geheel is.
- **Bijsnijden van een klim in het profiel.** `TRIM_TOLERANCE_M` in `activityDetail.ts` gaat van 1 m naar de drempel van het horloge (2 m). De nieuwe lijn kruipt op een vlak stuk een fractie mee met restruis; binnen de drempel is de lijn op niveau.
- **Vrijwel vlak, alleen zonder hoogtedoel.** Onder 40 m (`NEARLY_FLAT_M`, `isNearlyFlat`) staat er bij een lus "vrijwel vlak" in plaats van een getal (`routePlanner.ts#proposalFacts`), maar alleen als de training geen hoogtemeters vraagt. Vraagt ze die wel (20 m of meer), dan staat het getal van de lus er altijd, ook als dat 10 of 0 is: een lus heet nooit vrijwel vlak naast een doel (antwoord van de coördinator, 12 november). `proposeRoutes` geeft het doel daarvoor mee op de lus (`RouteProposal.targetAscentM`); een lus wordt nergens bewaard, dus dit is geen opgeslagen vorm. Zonder doel was de grens 20 m na afronden op tientallen. `MIN_ASCENT_TARGET_M` (20 m), de grens waaronder een training geen hoogtemeters vraagt, is niet veranderd: die stuurt de keuze van de lus.
- **Bestaande logs.** Niets wordt herschreven en er is geen migratie. `detail` en `runDetail` zijn bij het importeren berekend en staan op het log; ze worden bij tonen niet opnieuw berekend. Een log van voor deze wijziging houdt dus zijn oude, lagere eigen telling; een nieuw log krijgt de nieuwe. Drie bestaande paden rekenen wel opnieuw, en doen dat nu met de nieuwe teller: `runDetail` als de totalen van het log niet meer passen (een correctie bij de bron) of als het ontbreekt, het profiel na inkorten (`trimLog.ts`), en het aftrekken van de weggeknipte stijging bij inkorten (`activityTrim.ts`). Het getal van Garmin op het log (`elevationGainM`) blijft het getal van het log; de eigen telling is er om te vergelijken en te verdelen.
- **Een log zonder profiel, en een log met twee tellingen.** Een bestaand log dat nog geen `detail` heeft (een eerdere poging gaf niets) krijgt het bij de volgende poging met de nieuwe teller. Krijgt een oud log een nieuw `runDetail`, dan staan de kilometers in de nieuwe telling en de 48 stukken van `detail` in de oude; `gainAgreementPct` hoort bij `detail` en blijft dus bij de oude telling.
- **Eén drempel per lijn van de routeplanner.** `composeSimple` telt aanloop, op en af met de drempel van de hele lijn, en ook een lus die een stuk van die lijn is telt met de drempel van de lijn (`proposal`). Zo telt de som van de delen hetzelfde als het geheel. Twee lijnen in één verzoek kunnen nog een andere drempel hebben als de ene wel en de andere niet door de bergen gaat.
- **Wat bewust niet meebeweegt.** `zone2Pieces.ts#stablePieces` houdt zijn eigen dode band van 5 m als hellingfilter. Het telt geen hoogtemeters maar beslist of een stuk vlak is; een andere lijn verschuift het tempo bij zone 2, en dat is geen onderdeel van stap 1.

## Reden

De eigenaar zag te weinig hoogtemeters en een paar keer een te korte planning. Het onderzoek wees de teller aan als grootste fout die geen netwerk kost: tot 20 procent bij herhalingen op een helling, en in vlak land een kwart tot de helft van wat het horloge meldt.

Gemeten met nagemaakte reeksen (`src/engine/elevation.test.ts`, `src/engine/fixtures/elevationSeries.ts`), oude telling op het log tegen de nieuwe, in meters: vijf vlakke lopen 0 naar 16, 1 naar 20, 2 naar 25, 7 naar 32 en 3 naar 26; een heuvellus 85 naar 138. Acht herhalingen van een helling van 30 m op een lijn uit een model: 192 naar 240.

## Alternatieven

- Alleen `ascentOf` herstellen en het log laten: dan tellen plan en log verschillend, terwijl het doel is dat het plan voorspelt wat het horloge zegt.
- De ruwe horlogereeks tellen zonder gladmaken: past bij de opdracht, maar telt sprongen van één seconde als klim en breekt acht bestaande tests die juist dat bewaken.
- Een hogere drempel voor het horloge in plaats van gladmaken: verliest echte kleine klimmen, en het onderzoek vond 2 m het best passend.
- `zone2Pieces` meenemen: verschuift tempo bij zone 2 voor nieuwe logs tegenover oude. Hoort bij een eigen besluit.
- De opgeslagen getallen van oude logs herrekenen uit de bewaarde reeksen: dat herschrijft afgeleide velden en is uitgesloten.

## Bron

`docs/onderzoek/Hoogtemeters met precisie.md` (punt 4 en het advies), `docs/backlog.md` (Hoogtemeters met precisie), de opdracht van de coördinator van 12 november.

## Vervangt

Niets. De dode band van 5 m uit `2026-11-09-routeplanner.md` blijft de drempel voor een model van 30 m; alleen de telwijze verandert.

## Terugdraaien

De commit van deze stap terugdraaien. Er is geen opgeslagen vorm veranderd; logs die intussen zijn geïmporteerd houden hun getallen van de nieuwe teller.

## Open

- De 15 seconden en de 300 m zijn niet beproefd op echte data. De 300 m is een harde grens: net eronder telt 5 m, net erboven 10 m.
- Wat het gladmaken kost op iets korts en steils (nagerekend door Warden): een bult van 6 m in 10 seconden op en 10 seconden af telt als 3,8 m; een bult onder ongeveer 4 m en korter dan 20 seconden verdwijnt. Denk aan een trap of een brug, bij herhalingen steeds opnieuw. Een helling van 10 m in 20 seconden blijft 10 m. Naspelen met een echte reeks met trappen.
- De helling voor het tempo gecorrigeerd voor de helling (`runDetail.ts#gapPace`) komt uit dezelfde lijn. Het totaal per klim is gelijk; het effect op dat tempo is klein geschat en niet gemeten.

## Meting: de grenzen per kilometer (niet gebouwd, gaat niet naar main voor het gemeten is)

Nieuwe logs krijgen een hogere eigen stijging per kilometer dan oude. Gemeten op de zes nagemaakte lopen (`src/engine/elevation.test.ts`, de laatste groep; een kilometer is daar zes minuten van de reeks), oude telling tegen nieuwe:

- **Vlak bij zone 2** (`zone2Rules.flatMetresPerKm`, 5 m stijging of daling per km, via `zone2Pieces.ts#kmPieces`). Dit kantelt. Vlakke lopen, kilometers die niet meer vlak heten, voor en na: 0 en 2 van 5, 0 en 3 van 6, 0 en 3 van 7, 0 en 6 van 8, 0 en 4 van 9. Samen 18 van de 35 vlakke kilometers. De hoogste stijging in één vlakke kilometer ging van 2,6 naar 9,4 m. Een kilometer die niet vlak heet telt met zijn tempo gecorrigeerd voor de helling in plaats van zijn gewone tempo; hij valt niet weg. De heuvellus: 8 van 8 voor en na.
- **Een klim in een kilometer** (`PACING.climbM`, 10 m, `runDetailRules.ts` en `runDetailView.ts`). Kantelt niet op de vlakke lopen (0 voor en na; de hoogste waarde 9,4 m zit er wel dicht onder). Op de heuvellus 4 naar 6 van de 8 kilometers, en dat klopt: die kilometers klimmen ook 10 m of meer.
- **15 m per km in `aerobicTrend`** (`MAX_CLIMB_PER_KM`). Kantelt niet op vlak: de regel leest het getal van het horloge en valt alleen terug op de eigen telling als die ver van het horloge ligt. Eigen telling per km op de vlakke lopen: 0 tot 0,8 voor, 2,8 tot 3,5 na. Op de heuvellus 10,3 naar 16,2, dus in de terugval gaat die over de grens.
- **Heuvelachtig bij een run in detail** (`runDetailRules.ts`, `HILLY_M_PER_KM` 10 m per km, de regel "De route was heuvelachtig"). Vlak kantelt niet (0 tot 0,8 voor, 2,8 tot 3,5 na). De heuvellus was al heuvelachtig (10,3) en blijft dat (16,2), maar een route tussen ongeveer 6 en 10 m per km in de oude telling komt er nu boven: de regel verschijnt vaker.
- **Te heuvelachtig voor een oordeel** (`runDetailRules.ts` rond regel 306 en `runMetrics.ts#formOf`, beide 15 m per km). Vlak kantelt niet. De heuvellus gaat van 10,3 naar 16,2 en heet bij een nieuw log dus `hilly`: het oordeel over het vasthouden van het tempo en over de loopvorm vervalt daar, waar het bij een oud log van dezelfde lus nog verscheen.
- **Vergelijkbare lopen** (`runComparison.ts`, `SIMILAR_CLIMB_M_PER_KM` 5 m per km verschil). Dit is hersteld en wel gebouwd: de vergelijking leest nu de stijging van het horloge op beide logs (die verandert niet met de teller) en valt alleen zonder dat getal terug op de eigen telling van beide. Anders vielen oude logs van dezelfde route weg zodra het nieuwe log hoger telde.
- **Bijvangst, de goede kant op.** `gainAgreementPct` (eigen telling tegen het horloge) lag bij vlakke lopen met de oude teller ver onder de 60 procent, waardoor de hoogte als niet te vertrouwen gold (`runMetrics.ts`, `aerobicTrend.ts`). Met de nieuwe teller ligt die rond de 100. Nieuwe logs vallen dus minder vaak terug op de eigen telling.

Voorstel voor hoe de grens mee moet (nog niet bouwen, eerst naspelen met de echte lopen):

- De grens voor vlak gaat voor logs met de nieuwe telling van 5 naar 10 m per km. Reden: de oude grens was afgesteld op een teller die tien meter per klim en afdaling verloor; een horloge telt op een vlakke baan zelf tot 4 m per km die er niet is (onderzoek, punt 1), dus onder 5 m is vlak niet van ruis te onderscheiden. Met 10 m blijven alle 35 nagemaakte vlakke kilometers vlak.
- Daarvoor moet een log weten met welke teller zijn kilometers zijn geteld: een nieuw veld erbij op `runDetail` en `detail` (bijvoorbeeld `counter: 2`, ontbreekt bij oude logs). Dat is een toevoeging en geen herschrijving, maar het raakt de opgeslagen vorm en hoort dus bij een eigen stap met een eigen besluit.
- `PACING.climbM`, de 10 m van `HILLY_M_PER_KM` en de 15 m per km blijven staan tot het naspelen; ze zijn hier alleen gemeten. De coördinator beslist daarna.
- Tot die stap gebouwd is: stap 1 niet naar main.
