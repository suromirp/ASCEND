# Alles is instelbaar

Datum: 2026-10-22
Status: aangenomen

## Besluit

Elke keuze die ASCEND voor de gebruiker maakt, kan de gebruiker in de instellingen veranderen. Standaard staat het advies, met één zin uitleg waarom. Een nieuwe functie zonder instelling is niet af.

## Reden

De eigenaar wil weinig handwerk, maar ook de baas blijven over wat de app laat zien en doet. Wie een overzicht, vraag of melding niet wil, moet dat zelf kunnen uitzetten, zonder dat er een leeg gat achterblijft. Een nieuwe instelling krijgt als standaard het gedrag dat er al was, zodat niemand iets merkt tot hij het zelf verandert.

De instellingen (het tandwiel, `/more`) hebben vaste groepen, in deze volgorde:

1. Training
2. Doelen en tochten
3. Overzichten en vragen
4. Koppelingen
5. Gegevens en back-up
6. Gidsen en kennis

Elke instelling heeft één korte zin uitleg in gewone woorden. Bovenaan staat een zoekveld dat over alle instellingen zoekt (`src/data/settingsIndex.ts` en `src/engine/settingsSearch.ts`). Een nieuwe instelling komt in de index en in de juiste groep.

Of iets getoond wordt, beslist een pure functie in `src/engine/` (nu `overviewSettings.ts`), niet het component.

## Alternatieven

Een korte lijst met alleen de belangrijkste instellingen en de rest vast: afgewezen, want dan maakt de app keuzes die de gebruiker niet kan terugdraaien. Tabs per onderwerp zoals voorheen (Algemeen, Training, Gegevens, Geavanceerd): afgewezen, want "Algemeen" en "Geavanceerd" zeggen niet waar iets staat.

## Bron

Keuze van de eigenaar op 22 oktober 2026 (middag), vastgelegd in de gedeelde bouwcontext.

## Vervangt

Niets. De vier tabs in `src/pages/Settings.tsx` worden vervangen door de zes groepen; alle routes blijven werken.

## Terugdraaien

De nieuwe velden in `AppSettings.overviews` zijn optioneel. Haal je het blok "Overzichten en vragen" weg, dan valt alles terug op het oude gedrag, want ontbrekende waarden betekenen de standaard.
