# Kennisindex

Lees dit eerst. Hier staat per onderwerp waar alles ligt: het werkbriefje, de vaste documenten, en een eigen
bestand met de besluiten die gelden, het onderzoek, de ontwerpen en wat vervangen of verouderd is.

Dit bestand en de bestanden per onderwerp zijn gemaakt met `npm run kennisindex`; pas ze niet met de hand aan.
De bron is `docs/kennisindex/bronnen.json`: per document het onderwerp, de kern in één zin en de stand. Status en
"Vervangt" van een besluit komen uit het besluit zelf. Een nieuw document in `docs/` krijgt een regel in
`bronnen.json`, daarna `npm run kennisindex`; de test `scripts/kennisindex/kennisindex.test.mjs` faalt anders.

Stand van de 525 documenten: 394 gelden, 2 vervangen, 3 verouderd, 126 achtergrond.
Niet in de index: `docs/app-kaart/` (de tekstkaart, `npm run kaart`), deze map en afbeeldingen.

Zo lees je het: geldt is de regel van nu; achtergrond is onderzoek, een ontwerp of een verslag waar een besluit
op steunt; vervangen en verouderd staan onderaan elk onderwerp en lees je alleen voor de geschiedenis.

## Forge

- Werkbriefje: [werkbriefjes/forge.md](../werkbriefjes/forge.md)
- [architectuur/forge.md](../architectuur/forge.md): Het lange verhaal bij Forge: Je stand en volgorde, sessie, verloop, spotter, plaatjes, het blad Oefening en spieren voor de berg.
- [visie/Los van MacroFactor.md](../visie/Los%20van%20MacroFactor.md): Het doel van de eigenaar van 9 november 2026: Forge maakt MacroFactor Workouts overbodig, de voedingsapp blijft.
- Alles over dit onderwerp: [forge.md](forge.md) (78 besluiten die gelden, 20 keer onderzoek, ontwerp of verslag, 0 vervangen of verouderd).

## Koppelingen en data

- Werkbriefje: [werkbriefjes/koppelingen-en-data.md](../werkbriefjes/koppelingen-en-data.md)
- [android-sleutel.md](../android-sleutel.md): De Android-app wordt altijd met dezelfde sleutel ondertekend, anders kan een nieuwe versie niet over de oude heen; hier staat hoe de workflow dat doet.
- [architectuur/koppelingen-en-data.md](../architectuur/koppelingen-en-data.md): Wat ASCEND van Garmin leert (intensiteit, zweet, bergschoenen) en de tekst voor Strava.
- Alles over dit onderwerp: [koppelingen-en-data.md](koppelingen-en-data.md) (81 besluiten die gelden, 18 keer onderzoek, ontwerp of verslag, 1 vervangen of verouderd).

## Lopen en tests

- Werkbriefje: [werkbriefjes/lopen-en-tests.md](../werkbriefjes/lopen-en-tests.md)
- [architectuur/lopen-en-tests.md](../architectuur/lopen-en-tests.md): Het lange verhaal bij lopen: hartslag op het horloge, run in detail en de testloop met de tempo's.
- Alles over dit onderwerp: [lopen-en-tests.md](lopen-en-tests.md) (38 besluiten die gelden, 11 keer onderzoek, ontwerp of verslag, 0 vervangen of verouderd).

## Doelen

- Werkbriefje: [werkbriefjes/doelen.md](../werkbriefjes/doelen.md)
- [architectuur/doelen.md](../architectuur/doelen.md): Het lange verhaal bij doelen: de Ascend-tab, klaar voor je doel, de GR5-voortgang en een race met doeltijd.
- Alles over dit onderwerp: [doelen.md](doelen.md) (32 besluiten die gelden, 14 keer onderzoek, ontwerp of verslag, 0 vervangen of verouderd).

## Planning

- Werkbriefje: [werkbriefjes/planning.md](../werkbriefjes/planning.md)
- [architectuur/planning.md](../architectuur/planning.md): Het lange verhaal bij planning: hoofddoel en rollen, scheduler, wie een sessie mag aanraken, labels, eerst vragen, ziek, vrij, tochten en de rugzakladder.
- Alles over dit onderwerp: [planning.md](planning.md) (68 besluiten die gelden, 27 keer onderzoek, ontwerp of verslag, 0 vervangen of verouderd).

## Week

- Werkbriefje: [werkbriefjes/week.md](../werkbriefjes/week.md)
- [architectuur/week.md](../architectuur/week.md): Het lange verhaal bij de Week-tab: waarschuwingen, slepen en inhalen.
- Alles over dit onderwerp: [week.md](week.md) (31 besluiten die gelden, 4 keer onderzoek, ontwerp of verslag, 0 vervangen of verouderd).

## Lichaam en herstel

- Werkbriefje: [werkbriefjes/lichaam-en-herstel.md](../werkbriefjes/lichaam-en-herstel.md)
- [architectuur/lichaam-en-herstel.md](../architectuur/lichaam-en-herstel.md): Het lange verhaal bij lichaam: het figuur, hoe voelt je lijf, een zware beendag op vermoeide benen, een korte nacht en wat speelde er.
- Alles over dit onderwerp: [lichaam-en-herstel.md](lichaam-en-herstel.md) (38 besluiten die gelden, 20 keer onderzoek, ontwerp of verslag, 0 vervangen of verouderd).

## Historie en logs

- Werkbriefje: [werkbriefjes/historie-en-logs.md](../werkbriefjes/historie-en-logs.md)
- [architectuur/historie-en-logs.md](../architectuur/historie-en-logs.md): De volledige regel dat historie nooit herschreven wordt, met de uitzonderingen op verzoek van de eigenaar en het append-only patroon.
- Alles over dit onderwerp: [historie-en-logs.md](historie-en-logs.md) (25 besluiten die gelden, 3 keer onderzoek, ontwerp of verslag, 0 vervangen of verouderd).

## Bediening en beweging

- Werkbriefje: [werkbriefjes/bediening-en-beweging.md](../werkbriefjes/bediening-en-beweging.md)
- [architectuur/bediening-en-beweging.md](../architectuur/bediening-en-beweging.md): Het lange verhaal bij bediening: terugknop, scrollen, hervatten en de ontwerpregels voor logo, tabbalk, lucht, instellingen en overgangen.
- [architectuur/ontwerp-en-tokens.md](../architectuur/ontwerp-en-tokens.md): Het volledige ontwerp: Zee en berg, knoppen en tikdoelen, stem, beweging en alle tokens, woordelijk verhuisd uit CLAUDE.md.
- [visie/stemgids-concept.md](../visie/stemgids-concept.md): De stemgids: de regels voor alle teksten van de app, goedgekeurd op 9 november 2026 en vastgelegd in `docs/beslissingen/2026-11-09-stem-van-ascend.md`.
- Alles over dit onderwerp: [bediening-en-beweging.md](bediening-en-beweging.md) (51 besluiten die gelden, 22 keer onderzoek, ontwerp of verslag, 2 vervangen of verouderd).

## Werkwijze

- Geen werkbriefje. Hoe er aan ASCEND gewerkt wordt: rollen, poorten, kosten en het open werk.
- [backlog.md](../backlog.md): Het open werk van ASCEND: de Inbox met wat de eigenaar meldt en de bouwrij, bijgehouden door de coördinator.
- [beslissingen/_sjabloon.md](../beslissingen/_sjabloon.md): Het sjabloon voor een nieuw besluit: besluit, reden, alternatieven, bron, vervangt en terugdraaien.
- [werkbriefjes/README.md](../werkbriefjes/README.md): Wat een werkbriefje is, de vaste vorm en hoe het wordt bijgehouden.
- Alles over dit onderwerp: [werkwijze.md](werkwijze.md) (4 besluiten die gelden, 15 keer onderzoek, ontwerp of verslag, 2 vervangen of verouderd).

## Algemeen

- Geen werkbriefje. Wat bij geen enkel werkbriefje hoort of over de hele app gaat.
- [architectuur/onderwerpen.md](../architectuur/onderwerpen.md): De oorspronkelijke lijst van onderwerpen met hun harde regels, woordelijk verhuisd uit CLAUDE.md.
- Alles over dit onderwerp: [algemeen.md](algemeen.md) (9 besluiten die gelden, 4 keer onderzoek, ontwerp of verslag, 0 vervangen of verouderd).
