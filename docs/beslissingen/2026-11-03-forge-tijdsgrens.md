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

- De tijd per werkset komt uit je eigen trainingen (`durationLearning.ts#learnedMinutesPerSet`: duur gedeeld
  door werksets via `isWorkSet`, mediaan van de laatste zes, vanaf drie, alleen logs met minstens de helft
  van de voorgeschreven sets). Zonder die logs de verwachte duur van de training (`predictDuration`, de
  geleerde of geschatte duur van Trainingsduur) gedeeld door de voorgeschreven werksets. Zo blijft de grens
  staan als je vaker ingekort traint: minder sets in minder tijd geeft dezelfde tijd per set.
- Zoals "Minder tijd vandaag" de kern laat staan: eerst een set van de extra oefeningen (`optional`), dan van
  het bijwerk (`accessory`), steeds bij de oefening met de meeste sets, tot elke oefening er nog twee heeft.
  Pas daarna een hele oefening, eerst een extra, van achteren af. De kernsets (`core`) blijven altijd staan;
  passen die alleen al niet, dan zegt de regel dat.
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
