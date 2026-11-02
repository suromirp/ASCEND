# Trainingen ruilen in Week

Datum: 2026-11-02
Status: aangenomen

## Besluit

Twee trainingen van dezelfde week kun je van dag laten ruilen: in het actieblad met de keuze "Ruilen", en bij het slepen door een training los te laten op een dag waar precies één training staat die mag bewegen. Ruilen is twee keer verplaatsen tegelijk en gaat door dezelfde regels als Verplaatsen (`engine/weekSwap.ts#checkSwap` en `decideSwap`).

## Wat is vastgesteld

Het woord is "Ruilen", omdat de app dat al gebruikt (een oefening ruilen in Forge, "Ruilen bij slecht weer"). Wie mag ruilen is wie mag slepen (`dragEligibility`): niet gelogd, niet voorbij, niet overgeslagen, geen rustdag of herstelwandeling, geen wedstrijd en niets wat een vakantie of tocht neerzette. Beide staan in dezelfde week; over twee weken ruilen kan niet.

Schoon is: geen nieuwe botsing van de 48 uur tussen beenzware dagen (met de lange duurloop en de vaste sporten, `findHeavyConflicts` op de week na de ruil), geen rustdag, de tijd past op beide dagen (`dayHasRoomFor`), geen test en geen twee zware beendagen achter elkaar die de weekcontrole meldt (`legsCloseAfterSwap`). Dan gaat het meteen, met de melding "A en B geruild" en Ongedaan maken, die beide terugzet. Anders opent het bestaande blad (`RescheduleDialog`, kopje "Ruilen") met de droge reden en Liever niet links, Akkoord rechts. Een vakantiedag, tochtdag, de lichte dag bij een tocht, de dagen na je doel, je ziekte of een dag die al vol is maken ruilen onmogelijk; die training staat dan niet in de lijst.

Beide rijen krijgen jouw slot en `movedFromDate`, zoals Verplaatsen. Komt een training door de ruil terug op zijn eigen dag, dan is hij weer van het plan, net als bij Verplaatsen. Het wegschrijven gebeurt in één transactie (`storage/weekSwap.ts#writeSwap`): eerst wordt gekeken of beide nog op hun dag staan en niet gelogd zijn, anders gebeurt er niets. Historie wordt nooit geraakt.

Bij het slepen kleurt de dag mint als de ruil schoon is en amber als hij vraagt; het label zegt "Ruilen met" en de zin onderaan welke training naar welke dag gaat. Staan er op de dag twee of meer trainingen, of één die niet mag bewegen, dan blijft het gewone verplaatsen. Het slepen valt onder de instelling "Trainingen slepen in Week"; het actieblad biedt Ruilen altijd.

## Reden

De eigenaar: "Er moet ook een functie zijn om trainingen te wisselen met elkaar in 1 week, dit is soms best lastig." Met alleen Verplaatsen kost een ruil twee handelingen, met een tussenstand waarin twee trainingen op één dag staan en de week een botsing meldt.

## Alternatieven

Twee keer Verplaatsen na elkaar met één melding: de tussenstand zou door de controles gaan en kan een voorstel geven dat na de tweede stap niet meer klopt. Ruilen over twee weken: lastig te overzien en het slepen blijft binnen één week. Een ruil die botst in het blad met Liever niet als hoofdknop, zoals een botsende verplaatsing: de coördinator koos voor Liever niet links en Akkoord rechts, omdat een ruil altijd een eigen keuze is en het blad droog zegt wat botst.

## Bron

Wens van de eigenaar, `docs/beslissingen/2026-10-28-slepen-in-week.md`, `docs/visie/Slepen in Week.md`.

## Vervangt

Niets. Het slepen naar een dag met één training gaf eerst "Samen met"; dat geldt nu alleen nog als die ene training niet mag bewegen.

## Terugdraaien

Zet "Trainingen slepen in Week" uit voor het slepen. Om ruilen helemaal weg te halen: `withSwapVerdicts` niet meer aanroepen in `AppDataContext#dragVerdicts` en `swapOptions` niet meer meegeven aan het actieblad. Opgeslagen vormen zijn niet veranderd, er is geen migratie nodig.
