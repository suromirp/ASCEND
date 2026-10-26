# Wijzigingen doorvoeren in Forge, en raak ook apart voor voorstellen dicht bij wat je deed

Datum: 2026-10-26
Status: aangenomen

## Besluit

Twee dingen. Eén: pas je in Forge het gewicht of de herhalingen van een werkset aan, dan nemen de latere open werksets die precies hetzelfde waren de nieuwe waarde over. Twee: de stille toets "raak" krijgt een tweede getal voor de rijen waar het voorstel van ASCEND dicht bij het gedane gewicht lag.

## Doorvoeren

Een latere werkset volgt alleen als hij nog niet gedaan is, je hem niet zelf aanpaste (`edited`) en hij vóór de wijziging hetzelfde gewicht én dezelfde herhalingen had als de set die je veranderde. Gewicht en herhalingen volgen apart: verander je alleen het gewicht, dan volgt alleen het gewicht. De RIR volgt nooit, want die is per set gemeten. Opwarmsets blijven staan en een gewijzigde opwarmset voert niets door. Een set die meeging krijgt geen `edited`, dus je kunt hem daarna nog zelf aanpassen of met een tik het voorschrift laten nemen (`takeTarget` voert zelf niets door). Wijzig je later de volgende set, dan gaat het op dezelfde manier verder naar de sets daarna; er is geen terugwerking en geen lus.

"Lichter" (bijsturen) zet zijn gewichten rechtstreeks in de open rijen en loopt dus niet door deze regel. Een set die Lichter lichter zette heeft een ander gewicht dan de set die je daarna wijzigt, en volgt die wijziging dan niet. Zo is er geen kettingreactie tussen de twee.

De logica is `carryChange` in `engine/forgeInput.ts`, met tests. Bij het gewicht is de uitgangsstand de oefening zoals hij was toen je dat veld begon te bewerken (zoals bij `applyWeight`), zodat 4 en dan 45 typen hetzelfde geeft als 45 in één keer. Het doorgevoerde gewicht wordt niet nog eens afgerond: je gebruikt de plus en min van het toestel of typt zelf, en de andere sets krijgen dan precies wat jij koos.

Instelling "Wijzigingen doorvoeren" (`carryMode`), een Forge-schermkeuze die niet in `checkModelKey` hoort en dus niets herrekent, met drie keuzes: "Gelijke sets" (het advies, zoals hierboven), "Zelfde verschil" (het oudere "Gewicht doorgeven aan volgende sets" uit besluit `2026-10-23-forge-soepel.md`: het verschil schuift door naar alle onaangeraakte sets, ook die met een ander gewicht) en "Uit". De twee oude schakelaars zijn zo één keuze geworden. Wie het oude doorgeven had uitgezet (`carryWeights` uit), krijgt "Uit"; verder geldt het advies.

## Raak dichtbij

Waar het voorstel van ASCEND binnen 5% van de last lag die je gebruikte (`isNear`, op de last en niet op het getal op de stang, zodat lichaamsgewicht en hulp goed meetellen), zijn jij en ASCEND in de praktijk ongeveer even vaak raak. Het verschil zit in voorstellen die ver afliggen, en juist daar leunt de toets op de omrekening naar een ander gewicht (Epley, 30 keer sterkte over last min 1). Die omrekening is het minst zekere deel van de toets: KR-1 in `docs/onderzoek/Kracht loggen en progressie.md` zegt dat de omrekening van herhalingen plus RIR naar een maximum boven ongeveer 12 herhalingen te onzeker wordt (Nuzzo, Halperin), dat een aangenomen RIR een zwakke aanname is en dat de formules onder 12 herhalingen een paar procent verschillen. Hoe verder een voorstel van het gemeten gewicht af ligt, hoe meer die onzekerheid in de uitkomst doorweegt. Een aparte uitkomst voor de rijen dicht bij wat je deed laat dus zien hoe de toets uitpakt zonder dat de onzekerste stap meetelt.

Het tweede getal telt beide kanten alleen over de rijen waar het voorstel binnen 5% lag, en alleen over rijen waar ASCEND een schatting was (MacroFactor, en Forge met een ander gewicht). Een set die in Forge zelf gemeten is, heeft geen omrekening, en zou beide kanten kunstmatig gelijk maken. Het staat als één extra korte regel op Forge, in het blok dat er al staat: "Dicht bij wat je deed (binnen 5%): jij 74%, ASCEND 73%, 78 keer", over alles (niet apart over de periode sinds de startdatum). Code: `isNear`, `totalsOf` en `nearLine` in `engine/prescriptionCheck.ts`, doorgegeven door `comparisonRows`. De regel van de rij "ASCEND naast MacroFactor" in de instellingen blijft zoals hij was; die klopt nog en een rij heeft hoogstens één regel eronder.

## Alternatieven

- Het doorvoeren op het verschil laten lopen (het oude gedrag): afgewezen, het verschuift ook sets die je bewust anders had.
- Ook de RIR doorvoeren: afgewezen, die is per set gevoeld.
- Een grens van 2,5% of 10% voor dichtbij: 5% is wat de eigenaar vroeg en ligt ongeveer op een stap van de stang bij gewone lasten.
- Het dichtbij-getal ook op andere plekken (instellingsrij, onderblad): afgewezen, geen nieuwe percentages verspreiden.

## Bron

Gesprek met de eigenaar op 25 oktober 2026, `docs/onderzoek/Kracht loggen en progressie.md` (KR-1), en de besluiten `2026-10-24-kracht-stil-toetsen.md`, `2026-10-25-bijsturen-in-forge.md` en `2026-10-23-forge-soepel.md`.

## Vervangt

De schakelaar "Gewicht doorgeven aan volgende sets" uit `2026-10-23-forge-soepel.md`. Het doorgeven van het verschil zelf blijft bestaan als de keuze "Zelfde verschil" bij "Wijzigingen doorvoeren".

## Terugdraaien

Kies bij "Wijzigingen doorvoeren" voor "Zelfde verschil" voor het oude doorgeven. De regel "Dicht bij wat je deed" is een optelling over bestaande gegevens en verdwijnt met het blok als "ASCEND naast MacroFactor" uit staat. Er is geen opgeslagen vorm veranderd: `carryMode` is een optioneel veld en de oude `carryWeights` wordt alleen gelezen en `RowCheck.near` wordt bij het rekenen gemaakt en niet bewaard.
