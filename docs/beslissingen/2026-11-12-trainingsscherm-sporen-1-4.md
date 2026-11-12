# Trainingsscherm minimaal, sporen 1 tot 4: eigen keuzes van de bouwer

Datum: 2026-11-12
Status: aangenomen

Keuzes van de coördinator (12 november, de eigenaar liet de UI-keuzes aan hem): punt 2 en 3 hieronder zijn vervangen. Vandaag en Week volgen voor elke training te voet de stand (`missionButton` zonder de eis van een route, ook een wandeling); de Briefing is vanaf Vandaag altijd bereikbaar via de naam op de missiekaart en een rij in Meer keuzes; testloop en wedstrijd blijven Gedaan. De chip Waar train je? is stil, zodat er één mint per scherm is. Tests die daarvoor bewust meebewegen: `src/engine/briefing.test.ts` en `src/components/routeStart.scan.test.ts`.

## Besluit

Sporen 1 tot 4 van `docs/visie/Ontwerp trainingsscherm minimaal.md` zijn gebouwd zoals het ontwerp zegt (besluit `2026-11-12-trainingsscherm-en-ontwerpregels.md`). Waar het ontwerp iets open liet of botste met wat niet mocht bewegen, koos de bouwer dit:

1. De oorzaak van het oude scherm bij de Lange duurloop: de ingang zelf was goed (`briefingEntry` gaf ja), maar Vandaag al doen in het blad van Week opende het oude scherm bovenaan, met de uitleg en het formulier eronder. Ook Hoe je het doet op een dag die voorbij was, en elke wandeling, gingen daarheen. Nu opent Vandaag al doen voor een training te voet meteen het invullen (zoals Gedaan), en wordt elke rij Hoe je het doet voor lopen en wandelen de Briefing (`engine/briefing.ts#entryAction`). De keuzes in het blad en hun volgorde (`engine/sessionActions.ts`) veranderen niet.
2. De knop op Vandaag (`missionButton`) beweegt niet mee: een wandeling houdt daar Gedaan, ook met een horloge dat afvinkt. De Briefing van een wandeling open je via Week. Of een wandeling op Vandaag ook de knop Briefing krijgt is een vraag voor de eigenaar. (Vervangen, zie boven.)
3. De gekozen chip bij Waar train je? blijft mint. Het ontwerp wil een stille chip, maar `src/components/routeStart.scan.test.ts` legt bij Start bij vast dat Waar train je? de mint houdt; dat verandert pas met een eigen spoor. (Vervangen, zie boven.)
4. De vaste woorden van de lijst zijn Horloge, Weer, Mee en Voor en na. "Opwarmen en rekken" past niet in de kolom van het vaste woord op 360 px; Voor en na zegt hetzelfde en het blad erachter heeft beide lijsten met hun eigen kopje.
5. De knop onderaan zonder lus en zonder horloge dat afvinkt heet Gedaan (zoals op Vandaag) en opent het bestaande formulier. Zonder knop is er geen onderbalk; de terugknop sluit.
6. Een andere keuze dan de standaard krijgt één regel onder de chips: het oordeel ("Ook goed."), wat je anders doet (de tekst `how` van die plek) en, als het een andere sport is, "Dit telt als wandelen, niet als hardlopen." De kaart met wat je op de loopband instelt is daarmee weg.
7. De punten van de stopregels zijn gedempt; de amber stip staat alleen voor het kopje.

## Reden

De eigenaar vond het trainingsscherm onoverzichtelijk: zone en praattest stonden vier keer, het horloge drie keer, en twee schermen vertelden hetzelfde. De opdracht noemde `missionButton`, `engine/sessionActions.ts` en de bestaande tests als iets wat niet mag bewegen.

## Alternatieven

`sessionActions.ts` zelf aanpassen voor de dag die voorbij is: mocht niet bewegen, en `entryAction` doet hetzelfde aan de kant van de Briefing. De chip stil maken en de scantest aanpassen: een bestaande test laten meebewegen mag niet stil. (De chip is na review toch stil gemaakt; vervangen, zie boven.)

## Bron

`docs/visie/Ontwerp trainingsscherm minimaal.md` hoofdstuk 2, 4, 6 en 7; besluit `2026-11-12-trainingsscherm-en-ontwerpregels.md`.

## Vervangt

Niets. `2026-11-11-briefing.md` blijft; de vier vakken, de knop Horloge in de onderbalk en het vak Wat je loopt zijn vervangen door de hartkaart en de lijst.

## Terugdraaien

Per punt in `engine/briefing.ts` (`briefingEntry`, `entryAction`, de rijen) en `src/components/TrainingBriefing.tsx`. Logs, afvinken en de planning veranderen niet, dus terugdraaien raakt geen gegevens.
