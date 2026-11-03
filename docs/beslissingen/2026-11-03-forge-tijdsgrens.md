# Hoogstens per krachttraining

Datum: 2026-11-03
Status: aangenomen

## Besluit

Een krachttraining in Forge duurt hoogstens 60 minuten en een beendag hoogstens 75 (het advies, instelling
"Hoogstens per krachttraining" onder Forge, Geavanceerd: Uit, 45, 60, 75 of 90 per soort,
`AppSettings.forgeCapStrength` en `forgeCapLegs`). Zou een training langer duren, dan zet Forge hem
ingekort klaar en zegt dat in één rustige regel, bijvoorbeeld "Ingekort tot ongeveer 60 minuten: 2 sets
bijwerk vallen weg." Is de training al korter, dan verandert er niets.

Hoe (`engine/forgeTimeCap.ts`):

- De tijd per werkset komt altijd uit de eigen werksets van je logs (`durationLearning.ts#learnedMinutesPerSet`:
  per log de duur gedeeld door zijn werksets via `isWorkSet`, los van het voorschrift; een log telt vanaf zes
  werksets; mediaan van de laatste zes, vanaf drie). Zonder genoeg logs is de terugval de verwachte duur van
  het sjabloon (of je eigen schatting) gedeeld door de voorgeschreven werksets, nooit de geleerde duur van de
  hele training: die komt uit logs met een ander aantal sets (een probe liet zien dat 23 voorgeschreven sets
  dan "passen" in 50 minuten). Zo blijft de grens ook staan als je vaker ingekort traint.
- Zoals "Minder tijd vandaag" de kern laat staan: eerst een set van de extra oefeningen (`optional`), dan van
  het bijwerk (`accessory`), steeds bij de oefening met de meeste sets, tot elke oefening er nog twee heeft.
  Pas daarna een hele oefening, eerst een extra, van achteren af. De kernsets (`core`) blijven altijd staan;
  passen die alleen al niet, dan zegt de regel dat.
- Bij een bergdoel met "Spieren voor de berg" aan (dezelfde check als `swapPreference`: `hasMountainGoal`)
  vallen oefeningen die als hoofdspier kuit, scheen of bilspieren trainen (`servesMountainMuscle`,
  `MOUNTAIN_MUSCLES`) als laatste binnen hun laag: ze leveren als laatste sets in, gaan dan eerst naar
  één set en vallen pas daarna weg. Zonder bergdoel verandert er niets.
- Een beendag wordt herkend aan de belasting van de training (`scheduler.ts#isLegHeavyTemplate`, het
  stressprofiel dat de planner en Lichter bij vermoeide benen ook lezen), nooit aan een sjabloon-id. Er is
  geen aparte rol voor een beendag; dit is de bestaande herkenning.

Het gaat alleen om de inhoud van één sessie op het scherm: de geplande sessie, de weekplanning en elk log
blijven zoals ze zijn, dus er is geen voorstel nodig. Een begonnen sessie houdt wat erin staat
(`mergeDraft`). Het "voorstel van een sessie" is hetzelfde scherm: alleen kijken naar een latere dag laat
de ingekorte versie zien.

Daarbij: Ruilen op een toegevoegde bergspieroefening die na "Uit deze training halen" met afgevinkte sets
in de sessie bleef, deed stil niets. Ruilen rekent nu met het voorschrift van de sessie
(`addedExercises.ts#sessionPrescription`), en een oefening zonder voorschrift krijgt geen knop Ruilen.
Ruilen en Terug naar staan er voor geen enkele oefening meer zodra er een set is afgevinkt
(`addedExercises.ts#canSwap`, ook als vangnet in de handeling): ruilen zet nieuwe rijen neer, en afgevinkte
sets gaan nooit stil weg. De regel "Ingekort" telt bij de eerste stand van de sessie (`capLineFor`), zodat
een heropend concept dat de volle sets hield niet als ingekort wordt gemeld. In Bovenlichaam B is de
pull-up kern geworden in `data/defaultProgram.ts`, zodat er bij het inkorten altijd een verticale trek blijft.
Er is geen migratie van opgeslagen sjablonen voor geschreven. Let op: de ingebouwde sjablonen worden bij elke
start gelijkgezet met hun definitie (`databaseSeed.ts#ensureDefaultTemplates`), dus het ingebouwde sjabloon
krijgt de pull-up als kern ook op een toestel dat er al was. Komt de training uit een programma van
MacroFactor, dan bepaalt dat programma de oefeningen en is de volgorde de rangorde
(`macrofactorProgram.ts`: de eerste twee kern); daar verandert dit niets. Houdt de pull-up bijwerk, dan
houdt hij bij inkorten minstens twee sets zolang er nog extra oefeningen of later bijwerk weg kunnen.

## Reden

De eigenaar wil dat een krachttraining niet uitloopt: een gewone training hoogstens een uur, een beendag
hoogstens vijf kwartier. Wat minder telt (bijwerk en isolatie) gaat eerst, zoals bij "Minder tijd vandaag".

## Alternatieven

- De geplande duur inkorten in de week: raakt de planning en zou een voorstel met Akkoord vragen voor iets
  wat alleen de inhoud van een sessie is.
- De geleerde duur van de hele training gebruiken: na een paar ingekorte trainingen leert ASCEND dan een
  kortere training, en zou Forge weer alles klaarzetten. Daarom de tijd per set.
- Eerst hele oefeningen schrappen: haalt een beweging helemaal weg waar een set minder genoeg was.

## Bron

Gesprek met de eigenaar, 3 november 2026.

## Vervangt

Niets.

## Terugdraaien

Zet beide waarden op Uit. In code: `capSlots` niet meer aanroepen in `ForgeWorkout.tsx`; de instelling is
optioneel en wordt defensief gelezen, een back-up met of zonder de velden blijft importeerbaar.
