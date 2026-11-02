# RPE bij een testloop

Datum: 2026-11-02
Status: aangenomen

## Besluit

Vijf kleine verbeteringen uit `docs/onderzoek/RPE bij een testloop.md`:

1. In de beenindex is de geplande RPE van een test of wedstrijd 10, herkend via de rol `test` of `race`
   (`engine/legFatigue.ts#PLANNED_MAX_EFFORT_RPE`). Een 10 telt dan als gepland en niet als 25% zwaarder; een
   7 telt lichter (de ondergrens 0,75). Een test van 30 minuten op RPE 10 telt de dag erna 3,5 in plaats van
   4,4. De andere geplande RPE's (4, 6, 8 en kracht 8) blijven.
2. De inspanningsfactor (0,7 tot 1,5, sets tot falen) geldt alleen voor kracht. Een test legt vast dat een
   loop op RPE 10 hem niet gebruikt.
3. Een test van het horloge komt via intervals.icu binnen als één activiteit: inlopen, de 5 km en uitlopen
   samen, met de RPE die je op het horloge of bij intervals.icu gaf. Heeft de log een snelste 5 km uit de
   reeks (`SessionLog.bestEffort`, voor de totalen die de log nu heeft, en de log niet ingekort), dan telt de
   belasting de minuten van die 5 km maal de RPE en de rest maal 3 (`engine/testEffortSplit.ts`). Dat geldt
   voor `sessionLoad`, de weekbalk in Stand (`standing.ts#weeklyLoad`) en de beenindex, waar de rest telt als
   een rustige loop op RPE 3. Voorbeeld: 45 minuten op 10 met een 5 km van 25 minuten is 310 in plaats van
   450, en de dag erna 3,3 in plaats van 5,3 in de index. Zonder snelste 5 km blijft alles zoals het was. De
   log verandert nooit: het is een afgeleide berekening.
4. Bij een test met zwaarte 7 of lager zegt de kaart van de test één rustige zin: "Zwaarte 7 van 10:
   waarschijnlijk geen volle poging. Je tempo's vallen dan wat voorzichtig uit." De test telt mee zoals
   voorheen; tempo's lezen `pacesFromLogs` en `countedTests`.
5. De ochtend na een test of wedstrijd stelt de ochtendkaart "Hoe voelen je benen?" open, met één zin over
   gisteren en zonder voorstel uit de beenindex (`engine/morningCard.ts#maxEffortYesterday`). De kaart volgt
   verder zijn eigen regels en zijn plek op Vandaag (`engine/todayCards.ts`). Instelling "Benen vragen na
   een test" (`overviews.legsAfterEffort`, standaard aan) in het blad Kaarten op Vandaag.

## Reden

Bij een test staat de zwaarte vast op maximaal en varieert het tempo: een 10 is daar de bedoeling, geen teken
van vermoeidheid. Een RPE van 10 aan het eind van een tijdrit zegt "goed ingedeeld", niet "spierschade", dus de
krachtfactor hoort er niet bij. Een hele activiteit op RPE 10 telt de test ongeveer 45% te zwaar. De RPE zegt bij
een test weinig over de belasting maar wel of de test een volle poging was. En de ochtend erna zegt meer over je
benen dan de RPE of de index, die een vlakke test licht telt; een voorgekozen "Klopt: fris" zou dat antwoord
voor je geven.

## Alternatieven

- Ook de geplande zwaarte in de weekbalk van Stand voor een test op 10 zetten: de geplande 45 minuten bevatten
  inlopen en uitlopen, en 8 is daar een redelijk gemiddelde. Niet gedaan.
- De split alleen bij een geaccepteerde snelste 5 km: de minuten zijn hoe dan ook gelopen, ook als de tempo's nog
  op je Akkoord wachten. Daarom telt elke bruikbare snelste 5 km voor de totalen van nu.
- De ochtendkaart na een test ook tonen als je hem uitzette: dan telt jouw keuze niet. Niet gedaan.
- Een eigen instelling voor punt 1, 3 en 4: dit zijn correcties van een berekening en een rustige zin, geen
  keuze voor je planning. Geen instelling.
- De weekterugblik ("gem. zwaarte") en spierschade voor een vlakke maximale loop (voorstel 3 en 8 van het
  rapport): laten liggen. De terugblik gaat mee met de herinrichting in ronde 3.

Wat het rapport zegt dat zo blijft, blijft: de rustige dag na een test (`AFTER-TEST`), krachttraining de dag na
een test, de test geen zware beendag en de wedstrijd wel, de drempels 8, 3 en 12, de halfwaardetijden en minuten
maal RPE als belastingmaat.

## Bron

`docs/onderzoek/RPE bij een testloop.md`, voorstellen 1, 2, 4, 5 en 6. Vraag van de eigenaar.

## Vervangt

Niets.

## Terugdraaien

Punt 1: `PLANNED_MAX_EFFORT_RPE` weghalen in `sessionImpulse`. Punt 3: `testEffortSplit` niet meer aanroepen in
`fatigueEvents`, `weeklyLoad` en de aanroepers van `sessionLoad`. Punt 4: de regel met `testEffortRemark` uit
`TestVerdictCard.tsx`. Punt 5: de instelling uitzetten, of `afterEffort` niet meer doorgeven in
`useMorningPrefill.ts`. Niets is opgeslagen behalve de optionele schakelaar.
