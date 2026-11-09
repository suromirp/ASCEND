# Forge: standen per toestel, opslag en regels

Datum: 2026-11-09
Status: aangenomen (stap 1, 2 en 4 van het bouwplan; engine en opslag)

## Besluit

Een kabel of toestel met gewichtsblok krijgt per sportschool standen: de gewichten die je er gebruikte. Ze staan in het nieuwe optionele veld `GymProfile.exerciseStandsKg` (per oefening `{ kg, only? }`), worden één keer uit je trainingen ingelezen en groeien bij het afvinken van een set. Ontwerp: `docs/visie/Toestelstanden in Forge.md`. Code: `src/engine/toestelStanden.ts`, `src/storage/machineStands.ts`.

De zes vragen uit het ontwerp zijn, omdat de eigenaar niet bereikbaar was, door de coördinator met het advies beantwoord: stil onthouden met Terugdraaien; standen zijn kilo's; de hulp van een optrekstation krijgt geen standen; de rij heet straks "Standen per toestel"; de profielstap blijft als vangnet; standen worden bij het eerste openen uit je logs overgenomen, en een typefout streep je weg.

## Eigen keuzes van de bouwer

- Geen migratiestap en geen nieuw schemanummer. Het veld is nieuw en optioneel, en geen bestaand veld verandert van vorm: een profiel zonder `exerciseStandsKg` leest precies zoals vroeger. Tests bewijzen dat voor een oud profiel zonder lijst, met eigen lijst, met bereik (ook in pond) en met alleen de profielstap, en voor een oude back-up via de hele importroute (`src/storage/machineStands.test.ts`, `src/engine/toestelStanden.test.ts`).
- De instelling "Standen onthouden" bestaat nog niet als opgeslagen keuze (stap 6). De engine en de opslag nemen een parameter `remember`; uit betekent niets inlezen en niets onthouden. Bestaande standen worden dan wel gelezen, zoals het ontwerp zegt. Zolang er geen standen zijn, is het gedrag precies dat van nu.
- `withMachineSetup` (het formulier van nu) schrijft nog de oude lijst en het bereik, en haalt de standen van dat toestel weg. Zo blijft het huidige blad kloppen met wat geldt, tot het nieuwe blad van stap 5 naar de standen zelf schrijft. Het ontwerp liet dat in stap 1 al naar de standen schrijven; dat zou het huidige formulier leeg laten tonen.
- Een toestel met een oude lijst of bereik wordt niet ingelezen uit je logs: die lijst blijft de gesloten lijst tot je het toestel aanraakt. Bij aanraken gaat het in één keer om naar standen met `only`. Past dat niet binnen 40 standen (een bereik kan tot 200 gewichten hebben), dan blijft alles zoals het was en wordt het gewicht geen stand.
- Bij het inlezen met meer dan 40 gebruikte gewichten blijven de 40 die je het vaakst gebruikte. Een opgeslagen lijst met meer dan 40 wordt bij het lezen de lichtste 40.
- Boven de hoogste stand schat het model met het laatste verschil tussen twee standen, onder de laagste met het eerste, nooit kleiner dan de helft van de profielstap en nooit onder 0,25 kg. Bij één stand is het de profielstap.
- Schrijven gaat alles of niets: de nieuwe instellingen worden helemaal uitgerekend en in één keer geschreven, met een grens van 4 seconden. Twee tikken kort na elkaar wachten op elkaar, zodat geen stand verloren gaat.
- Geen nieuwe uitzondering op de historie: een stand staat nooit in een log en geen log wordt gelezen om te schrijven of herschreven. Wegstrepen verandert alleen de lijst van het toestel.

## Reden

De eigenaar vindt het intikken van elk gewicht op een ongelijk blok te veel werk; de profielstap past daar nooit. Standen uit eigen gebruik kosten geen tik vooraf.

## Alternatieven

Een migratiestap die oude lijsten meteen naar standen omzet. Niet gekozen: dan verandert een oude back-up bij het lezen, en het gedrag van een gesloten lijst kan stil verschuiven.

## Bron

`docs/visie/Toestelstanden in Forge.md` (Cartographer), de wens van 5 november in `docs/backlog.md`, `docs/beslissingen/2026-10-26-gewichten-per-toestel.md` en `docs/beslissingen/2026-10-28-tussengewichten.md`.

## Vervangt

Niets.

## Terugdraaien

Het veld weglaten: zonder `exerciseStandsKg` werkt alles zoals voor dit besluit. De code leest het veld alleen via `cleanStandList`.
