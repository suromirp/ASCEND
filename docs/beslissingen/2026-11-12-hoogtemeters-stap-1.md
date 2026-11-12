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
- **Vrijwel vlak.** Onder 40 m (`NEARLY_FLAT_M`, `isNearlyFlat`) staat er bij een lus "vrijwel vlak" in plaats van een getal (`routePlanner.ts#proposalFacts`). Dat was 20 m na afronden op tientallen. `MIN_ASCENT_TARGET_M` (20 m), de grens waaronder een training geen hoogtemeters vraagt, is niet veranderd: die stuurt de keuze van de lus.
- **Bestaande logs.** Niets wordt herschreven en er is geen migratie. `detail` en `runDetail` zijn bij het importeren berekend en staan op het log; ze worden bij tonen niet opnieuw berekend. Een log van voor deze wijziging houdt dus zijn oude, lagere eigen telling; een nieuw log krijgt de nieuwe. Drie bestaande paden rekenen wel opnieuw, en doen dat nu met de nieuwe teller: `runDetail` als de totalen van het log niet meer passen (een correctie bij de bron) of als het ontbreekt, het profiel na inkorten (`trimLog.ts`), en het aftrekken van de weggeknipte stijging bij inkorten (`activityTrim.ts`). Het getal van Garmin op het log (`elevationGainM`) blijft het getal van het log; de eigen telling is er om te vergelijken en te verdelen.
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

- Oude en nieuwe logs staan naast elkaar met een andere eigen telling per kilometer. Regels die daar een grens op leggen (`zone2Rules.flatMetresPerKm` 5 m per km via `kmPieces`, `PACING.climbM` 10 m, de grens van 15 m per km in `aerobicTrend`) zien bij nieuwe logs hogere getallen. Naspelen met de echte lopen moet laten zien of een vlakke kilometer daardoor niet meer vlak heet.
- De 15 seconden en de 300 m zijn niet beproefd op echte data.
