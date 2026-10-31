# Kaart van de app

Dit is een tekstuele kaart van wat ASCEND op elk scherm laat zien: kopjes, kaarten in volgorde met hun tekst, knoppen als `[knop: Opslaan]`, getallen, meldingen en de aria-labels van iconknoppen. Zo controleer je data en teksten met een diff in plaats van met een screenshot.

De data is nagemaakt: de kaart komt uit het kracht-demoprogramma in `.claude/skills/lookout/kit/state-kracht.json`, nooit uit een back-up van een echte gebruiker. De klok staat vast op 31 oktober 2026, 08:00 (Europe/Amsterdam), de breedte is 390 px.

Schermen: vandaag, week, stand, ascend, logboek, instellingen (het overzicht op `/more`), weekterugblik, jaaroverzicht en training-blad (het blad van een geplande training in Week).

## Draaien

`npm run kaart` bouwt de app, start een eigen preview op poort 5271 en schrijft deze map opnieuw. Een run duurt ongeveer een minuut. Staat er al een server op die poort (of op `KAART_PORT`), dan gebruikt het die.

`npm run kaart:vergelijk` maakt de kaart in een tijdelijke map en toont per scherm alleen de gewijzigde regels (`-` was, `+` is). Alleen voor gewijzigde schermen komt er een screenshot in de map uit `LOOKOUT_SHOTS` (anders `./shots`). Exitcode 0 is geen verschil, 1 is verschil.

`node scripts/app-kaart/kaart.mjs --foto <scherm>` maakt op verzoek een screenshot van één scherm, voor als je twijfelt.

## Invarianten

`scripts/app-kaart/invarianten.mjs` leest de kaart en controleert getallen die op meerdere schermen gelijk moeten zijn, zoals "x van y gedaan", het weeknummer, de fase en de voorspelde tijd. Een schending geeft exitcode 2. Een nieuwe controle voeg je toe aan de lijst `INVARIANTEN` in dat bestand. Draai het ook los met `node scripts/app-kaart/invarianten.mjs`.

## Als de kaart verandert

Een bewuste wijziging in tekst of data: draai `npm run kaart` en neem de gewijzigde bestanden mee in je commit. Zie `docs/beslissingen/2026-10-31-app-kaart.md`.
