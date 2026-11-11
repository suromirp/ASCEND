# Verloop van de training: een regel per set

Datum: 2026-11-11
Status: aangenomen

## Besluit

Het blad Verloop van de training toont per oefening een regel per set: het eindresultaat (gewicht, herhalingen, RIR) en alle redenen in een zin. Een schakelaar Wijzigingen (het advies) of Alle sets bovenaan; de keuze is de instelling Verloop toont. Het verloop zelf (`ForgeEvent[]`, append-only) blijft zoals het is; alleen de weergave voegt samen (`engine/forgeLog.ts#linesPerSet`).

## Reden

Bij Benen A stond set 3 er twee keer (eigen en onder) en miste set 1 de 0 RIR, omdat de wijziging werd vastgelegd voordat de RIR werd gekozen. Een tijdlijn van gebeurtenissen leest rommelig; per set lees je in een oogopslag wat er gebeurde en waarom.

## Keuzes

- Het eindresultaat komt uit de rijen van de training (`workout`) of, in het logboek, uit de gelogde sets (`strengthData`). Pas als geen van beide er is, uit de laatste stand in het verloop. Zo is de RIR altijd die van de set zoals hij uiteindelijk is.
- Een aangenomen RIR (`rirAssumed`) staat als het gedempte bolletje dat ook op het Forge-scherm een niet zelf gekozen RIR aangeeft; de schermlezer zegt "het doel, niet zelf gekozen".
- In het logboek blijft de schakelaar: Alle sets toont daar de gelogde sets. Sets die je niet afvinkte zijn niet gelogd en staan er dan niet bij, behalve als er iets mee gebeurde (dan uit het verloop).
- Na afloop koppelt een regel aan een gelogde set via het nummer (1, 2, W1). Liet je een eerdere set open, dan schuiven de nummers van het log; dat is een bekende grens, want het log bewaart geen rij-id.
- Weggehaald en daarna een set met hetzelfde nummer toegevoegd is een regel ("Weggehaald en weer toegevoegd."). Weggehaald zonder terugkomst is een eigen regel "Weggehaald", achteraan bij die oefening.
- De spotterregel hoort bij elke set uit het voorschrift, maar telt niet als wijziging: hij staat bij Alle sets, niet bij Wijzigingen. Het spotterteken staat al bij de set zelf.
- De zwaarste set: per oefening de gedane werkset met het hoogste gewicht, bij gelijk gewicht de meeste herhalingen, alleen als er minstens twee zijn. Vet met de woorden "zwaarste set" in gedimd grijs; geen tweede mint accent.
- De klok per gebeurtenis is weg uit het blad; de volgorde is die van de training.
- De instelling staat in het blad Bij het invullen (onder Geavanceerd), naast Oefeningen in een training. Zo komt er onder Geavanceerd geen zevende rij bij (besluit 8 november).
- Bijvangst, los van het blad: leg press met pinnen (84,7, 105,5, 91,6 en 89,4 kg): met opgeslagen standen zet Forge alleen standen (voorschrift, opwarmen, doorvoeren, Minder en Meer; `legPressStands.test.ts`). Zulke getallen zijn dus standen van het toestel of zelf getypt. Zonder standen leert Forge uit gebruikte gewichten: 91,6 lijkt op 202 pond en valt weg, en een groot gat wordt gevuld met de stap van het profiel (94,4, 99,4, 104,4), gewichten die op zo'n toestel niet bestaan. Dat is bestaand gedrag, geen fout in de standen; met echte data na te gaan.

## Alternatieven

- De tijdlijn houden en alleen dubbele regels samenvoegen: lost set 1 zonder RIR niet op, want de RIR komt pas na de gebeurtenis.
- Het verloop bij het afvinken bijwerken: dat herschrijft een gebeurtenis en raakt het append-only verloop.

## Bron

Melding van de eigenaar (Benen A, 11 november); `docs/backlog.md`, Bouwrij, Forge: kern zichtbaar.

## Vervangt

Het deel "de tijdlijn, nieuwste bovenaan" van `2026-10-28-forge-logboek.md`. Het verloop zelf en de stip blijven.

## Terugdraaien

`ForgeLogSheet.tsx` terug naar de tijdlijn (git); `linesPerSet` en de instelling `forgeLogView` kunnen blijven staan, een oude waarde wordt genegeerd. De leg press-test (`legPressStands.test.ts`) legt alleen bestaand gedrag vast en kan los blijven staan.
