# Stand opschonen: de schermen Benen, Belasting en Ritme, één grafiekstijl, het label loopt mee

Datum: 2026-11-12
Status: aangenomen

## Besluit

Het tweede stuk van `2026-11-12-stand-minimaal.md` (sporen 2, 3, 4 en 6 van `docs/visie/Ontwerp Stand minimaal.md`) en de punten van Pathfinder en de coördinator is gebouwd:

- Benen, Belasting en Ritme hebben hun naam en hun i één keer, in de lucht naast de titel. Het hart eronder heeft geen eigen kop meer (de dubbele kop op Benen en Ritme). Ritme zegt in de lege stand één zin.
- Eén grafiekonderdeel, `components/stand/StandLineChart.tsx`, in de stijl van de zone 2-kaart: één lijn, vol is gedaan en open is gepland, het label bij zijn stip, hoogstens twee haarlijnen met een label in de strook rechts. Frisheid staat erop (frisser boven, geen band meer in het beeld, de marge in de regel van de gekozen dag) en Belasting per week (een stip per week, deze week een open stip erboven voor wat nog gepland is, de verdeling per sport alleen nog in de telling).
- Het label loopt mee: opzij schuiven verplaatst het label naar de stip onder je vinger, met een korte tik per stip (Trillen); loslaten zet het terug bij vandaag of deze week. Pijltjes, Home, End en Escape met het toetsenbord. 150 ms ease-out, in Rustig en Uit meteen (`.stand-chart-label` in `index.css`). De keuzes zelf staan in `engine/standChart.ts`.
- Geen vakken in kaarten meer: de gekozen dag of week, de beendag en "te hard" bij Intensiteit staan als gewone regels onder een haarlijn (`UnderLine`). Geen gekleurde woorden: "Fris", "op de grens", "wijkt af" en de rand van de gekozen dag staan in gewone inkt; let op bij je test of wedstrijd is een amber stip vooraan de regel.
- Uitleg achter de i: de punten van Belasting, wat Frisheid laat zien, wat Intensiteit telt. Een waarschuwing (de sprong in belasting, de regel voor je test of wedstrijd, pijn) staat volledig op het scherm.
- Beenkalender, Index en je benen, Dalen, Klimtempo en Trainingsverdeling worden rijen die hun bestaande inhoud in een blad openen. Een rij staat er alleen als er iets achter zit: Index zonder meting, Bergaf zonder daling en zonder doel dat bergaf vraagt, en Klimtempo met de instelling uit hebben geen rij.
- Stand: onder Benen staat wat nog doorwerkt ("1 training werkt nog door") in plaats van "index 0". Onder Tempo bij zone 2 hoogstens één zin; de zin over wat de kop en de stippen zijn en het hele oordeel staan achter de i. `trendVerdict` is niet veranderd (hij staat ook in de looptrends).
- Vandaag: de regels Benen en Week in Stand en morgen openen nu de schermen Benen en Belasting (`engine/yourDay.ts#standLines`, `StandSummaryCard`), en terug gaat naar Vandaag. Week toonde geen feit van Stand en is niet aangeraakt. `Today.tsx` en `Week.tsx` zijn niet gewijzigd.
- De volgorde-instelling toont twee korte lijsten, Regels bovenaan en Rijen in de lijst. Ze worden weer één bewaarde volgorde (`standOrderFrom`); `settings.cardOrder` en `resolveCardOrder` veranderen niet, een oude volgorde blijft gelden en Standaard in Instellingen kijkt alleen naar regels en rijen (`isDefaultStandLayout`).
- Dode code weg: `engine/strengthProgression.ts` (alleen gebruikt door de verwijderde Krachtprogressie) en `TrainingSplitRow.tsx`.

Eigen keuzes buiten de opdracht, voor de review:

1. De i van het scherm staat in de lucht, niet in het hart; zo verdwijnt de dubbele kop zonder dat de uitleg zoekraakt.
2. Een korte tik op een grafiek houdt een stip vast (nog een tik zet hem terug); alleen schuiven keert terug bij loslaten. Zonder dit is een oude week bij Belasting niet te lezen zonder je vinger erop te houden.
3. Frisheid toont onder de grafiek voor vandaag zonder training niets: het getal en het woord staan al in het hart van Benen.
4. De rij heet Verdeling, niet Trainingsverdeling: het lange woord past niet in de vaste kolom van 104 px. De titel van het blad blijft Trainingsverdeling.
5. Bergaf toont de meters van de laatste vier weken (dezelfde som als de zin in het blad), niet "deze week".
6. Beendagen toont het aantal zware dagen (zwaar of heel zwaar) in de kalender.
7. Bij een eerste schatting is de ene zin onder zone 2 de tweede zin van het oordeel ("Of het verandert, zie je na ..."): de eerste herhaalt het tempo van de kop.
8. In de rustweek zegt Belasting "de week is bewust lichter" en de hint "dan klopt de lijn beter", want er is geen balk meer.
9. In het blad Volgorde aanpassen staat per blok alleen zijn naam; het kopje van de lijst zegt of het een regel of een rij is. Wie de standaard terugzet of dezelfde indeling kiest, bewaart niets.
10. Frisheid heeft links de woorden fris en moe, zoals zone 2 sneller en trager heeft; Belasting niet (meer staat boven staat achter de i). Een rustige dag krijgt geen teken meer onder de lijn.
11. De kleurtokens `--color-chart-run`, `-strength`, `-walk` en `-other` worden in componenten niet meer gebruikt; ze blijven staan, weghalen is een eigen keuze.

## Reden

De eigenaar wil Stand minimaal, mooi en makkelijk, met elk feit één keer (`2026-11-12-stand-minimaal.md`). Pathfinder zag een dubbele kop op Benen en Ritme, drie keer dezelfde zin in de lege stand van Ritme, "index 0" dat niets zegt en een lange tekst onder zone 2.

## Alternatieven

Een tweede lijn of band voor de marge van Frisheid: twee lijnen lezen als twee reeksen. De volgorde-instelling als één lange lijst houden: daar staat Kracht tussen de regels, wat op de pagina niets betekent. Een eigen route voor elke rij in plaats van bladen: meer schermen voor inhoud die in een blad past.

## Bron

`docs/visie/Ontwerp Stand minimaal.md`, `docs/beslissingen/2026-11-12-stand-minimaal.md`, `docs/beslissingen/2026-11-12-trainingsscherm-en-ontwerpregels.md`, opdracht van de coördinator (Sherpa Stand opschonen).

## Vervangt

Niets.

## Terugdraaien

Alleen weergave. Berekeningen in engine, opslag en instellingen veranderen niet; terugdraaien is de commit terugzetten.
