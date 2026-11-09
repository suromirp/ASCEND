# Verschil Lichaam: lichaam en herstel

Elk verschil dat `npm run kaart:vergelijk` liet zien, met de reden. Regels van de stemgids: `docs/beslissingen/2026-11-09-stem-van-ascend.md`. De kaart gaf 2 gewijzigde regels voor Lichaam en 4 voor Lichaam: een plek. De andere 21 schermen bleven gelijk. Geen schendingen van de invarianten.

De teksten van Lichaam stonden er al grotendeels goed voor: kort, je/jij, "kan helpen" en geen gedachtestreepjes. Deze ronde is daarom klein.

## Lichaam

- Lege lijst: "Geen open klachten. Heb je last van iets, tik dan de plek aan en meld het." wordt "Geen open klachten. Last van iets? Tik de plek aan en meld het." Regel 2: korter op het scherm, dezelfde inhoud.

## Lichaam: een plek

- Onderbouwing bij de knie: "Heupkracht naast kniewerk helpt bij pijn voorin de knie" wordt "kan helpen". Regel 6: gezondheid is "kan helpen".
- Onder Melden: "Melden legt de klacht vast, meer niet: je planning verandert er niet door. Bij een klacht aan been of voet toont Vandaag een hint bij zware beentrainingen; jij kiest per training." wordt vier korte zinnen. Regel 1: één gedachte per zin, geen puntkomma. Getoetst aan de code: melden schrijft alleen de klacht (`addInjury`), de hint komt uit de regel INJURY-LEGS in `engine/adviceLoad.ts`.

## Buiten de kaart (zichtbaar zodra er een toestand is die de kaart niet laat zien)

- Onderbouwing bij andere plekken (`src/data/bodyCare.ts`): "Roeien en optrekken helpen bij rugzakdragen" wordt "kunnen helpen". "krachttraining verlaagt het aantal blessures" wordt "verlaagde", en "De Nordic curl halveert hamstringblessures bijna" wordt "halveerde": het is de uitkomst van een onderzoek, geen belofte. Twee puntkomma's zijn een punt geworden. De spoedteksten en de lijst "Naar een fysio of je huisarts bij" zijn woordelijk gelijk gebleven.
- Het blad "Hoe voelt je lijf?": de regel "Wanneer naar een fysio of huisarts?" heet nu "Wanneer laat je het nakijken?", net als op de plekpagina. Regel 5: één woord voor één ding.
- Klacht verwijderen: "Dat kun je niet terugzetten." wordt "Dat kan niet terug.", de zin die het Logboek ook gebruikt.
- Korte nacht: "Goed, die nacht telt gewoon mee." wordt "Die nacht telt gewoon mee." (zelfde reden als "Prima," in R7). "Nog niet bevestigd, kijk zo of het staat." wordt twee zinnen.
- Wat speelde er: de foutregels "Kijk zo of het staat; zo niet, ..." en "Er is niets veranderd; probeer het zo nog eens." zijn twee zinnen geworden (blad van een notitie, Alles wissen in de instellingen). "Je horloge schat slaap ruw; de duur is betrouwbaarder dan de fasen." ook.
- "loopjes" alleen als telling: "je volgende loopjes", "je gewone loopjes", "je eerdere rustige loopjes" en "Lijkt op je loopjes bij ..." worden "lopen". "Op 4 rustige loopjes", "drie rustige loopjes" en "2 vorige loopjes ernaast" blijven, want dat zijn tellingen. De test in `influenceEffects.test.ts` is mee aangepast.

## Eén wijziging die geen tekst is

In het blad "Hoe voelt je lijf?" stond de spoedtekst van een plek (bijvoorbeeld "bel direct je huisarts of 112" bij de borst) binnen de ingeklapte regel "Wanneer laat je het nakijken?". Bij lichte of matige pijn zag je hem dus pas na een tik. Hij staat nu altijd zichtbaar boven die regel, zoals op de plekpagina al zo was. De woorden zijn gelijk. Dit volgt de vaste regel dat een spoedtekst nooit achter een tik staat.

## Na het besluit van de coördinator

De lijst "Naar een fysio of je huisarts bij" staat nu altijd open, op de plekpagina en in het blad. De knop met het pijltje is weg, de kop "Wanneer laat je het nakijken?" en de woorden zijn gebleven. Zorg staat nooit achter een tik (`src/components/lichaam/lichaamZorg.scan.test.ts`).

## Bewust niet aangeraakt

- "Twee harde loopjes" in `weekConcerns.ts` en `weekValidator.ts` (Week, met test) en `GarminLink.tsx`: buiten Lichaam.
- De Forge-kant van de zware beendag (`components/forge/LegEasePanel.tsx`): daar loopt een andere bouwer.
- De teksten van de kaart "zware beendag" en van de beenindex in `legDayEase.ts`: die volgen de stemgids al.
