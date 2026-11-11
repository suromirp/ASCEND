# Briefing, spoor 5 en 6: het scherm en de knop op Vandaag

Datum: 2026-11-11
Status: aangenomen

## Besluit

De Briefing (`src/components/TrainingBriefing.tsx`) staat er als scherm, vanuit Week (de rij Briefing op de plek van Hoe je het doet) en vanuit Vandaag (de mint knop Briefing als je horloge de training afvinkt). Wat erop staat zegt `engine/briefing.ts`; de zoektocht is de regie van het blad Route (`src/components/useRouteSearch.ts`), gedeeld met het blad achter Groter. Nieuwe instelling Lus zoeken: Bij het openen van de briefing (advies) of Na een tik.

Eigen keuzes van de bouwer, binnen het ontwerp:
- De ingang (`briefingEntry`) is een training waar op zijn standaardplek een route bij hoort (`routeShownFor` zonder bewaarde keuze): de looptrainingen. Een keuze Loopband haalt de ingang niet weg, want die keuze maak je in de Briefing zelf. Wandelen en rugzak houden het oude scherm tot er routes voor wandelen zijn (spoor 11).
- De knop op Vandaag (`missionButton`) is Briefing alleen met de stand "je horloge vinkt af" uit `engine/briefing.ts`: een koppeling met intervals.icu, Vanzelf afvinken aan, trainingen van je horloge aan, geen stilte van trainingen, geen testloop of wedstrijd. Health Connect telt nog niet als koppeling: bij twijfel Gedaan.
- Onder de knop één gedempte regel: "Je horloge vinkt hem af na je loop." Zelf invullen staat in het menu; de routerij gaat van de kaart.
- Vooraf (een dag die nog komt) is de knop zonder koppeling Sluiten, niet Zelf invullen: afvinken kan pas op de dag zelf, zoals in Week.
- De lus wordt nog niet onthouden: opnieuw openen zoekt opnieuw (bij het openen alleen vandaag en morgen). Onthouden tot middernacht is spoor 9.
- Het vak Weer en kleding houdt alleen de eerste zin van de kleding; de rest staat op de weerpagina.
- Met Route voorstellen uit blijft de knop Briefing (met horloge dat afvinkt): de vier vakken blijven nuttig, de kaart is weg en de onderbalk zegt Sluiten.
- Lukt het lezen van de koppeling niet binnen 3 seconden, dan geldt de veilige kant (Gedaan), ook als eerder Briefing gold.
- De vakken hebben een gedempt kopje: het mint accent is de gekozen plek, de lus op de kaart en de knop onderaan.

## Reden

Je horloge logt en vinkt af; voor een loop buiten is de app de voorbereiding. Gedaan als mint knop was een knop die de eigenaar nooit indrukt, en Route voorstellen stond onder de vouw of vier tikken diep.

## Alternatieven

De Briefing ook bij wandelen nu al: zonder route alleen de vier vakken, en het oude scherm heeft daar meer. Health Connect als koppeling: Vanzelf afvinken leest het wel, maar de bronbewaking niet, dus een stille koppeling zou Briefing blijven zeggen.

## Bron

`docs/visie/Ontwerp Route en trainingsscherm.md` (hoofdstuk 5 tot 7), `docs/beslissingen/2026-11-11-briefing.md` en de opdracht van de coördinator.

## Vervangt

Niets.

## Terugdraaien

Week: `briefing: briefingEntry(template)` uit `SessionActionSheet.tsx` halen. Vandaag: `briefingButton` op false. Het oude scherm is ongewijzigd.

## Herstelronde (Pathfinder, zelfde dag)

- Week volgt Vandaag: vinkt je horloge af, dan is Briefing op de dag zelf de mint hoofdknop en Gedaan de rij Zelf invullen; de rij Je horloge valt weg naast de Briefing. Een dag die voorbij is krijgt geen Briefing.
- Met een lus is de route naar je horloge altijd de mint knop, ook zonder koppeling; Zelf invullen is dan een tekstknop onderaan.
- Zonder plaats wijst de Briefing de weg naar de pagina Weer (Kies je plaats).
- Eén naam: Waarom deze training. Het rondje met drie puntjes op de missiekaart heet Meer keuzes.
- De avond ervoor zegt "je lus staat in de briefing". De regel wordt geen tik: de kaart krijgt geen knop (besluit 2026-11-11-briefing.md).
- De laatst gelezen koppeling staat op het toestel (localStorage, sleutel `ascend.briefingWatchLink`: alleen de vlaggen van de koppeling, de tijd van ophalen en de dagen, geen sleutel en geen logs), zodat een koude start niet verspringt. Alleen een stand van vandaag telt.
