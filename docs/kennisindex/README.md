# Kennisindex

Lees dit eerst. Hier staat per onderwerp waar alles ligt: het werkbriefje, de vaste documenten, en een eigen
bestand met de besluiten die gelden, de besluiten die deels zijn ingehaald, het onderzoek, de ontwerpen en wat
vervangen of verouderd is.

Dit bestand en de bestanden per onderwerp zijn gemaakt met `npm run kennisindex`; pas ze niet met de hand aan.
De bron is `docs/kennisindex/bronnen.json`: per document het onderwerp, de kern in één zin en de stand. Een besluit
wordt nooit herschreven, dus dat een later besluit het geheel of deels inhaalt staat alleen daar, in `vervangenDoor`.
Een nieuw document in `docs/` krijgt een regel in `bronnen.json`, en haalt het een ouder besluit in, dan krijgt dat
oudere besluit de stand deels of vervangen. Daarna `npm run kennisindex`; de test
`scripts/kennisindex/kennisindex.test.mjs` faalt anders.

Stand van de 556 documenten: 339 gelden, 82 deels ingehaald, 3 vervangen, 3 verouderd, 129 achtergrond.
Niet in de index: `docs/app-kaart/` (de tekstkaart, `npm run kaart`), deze map en afbeeldingen.

Zo lees je het: geldt is de regel van nu; deels ingehaald geldt alleen nog voor wat achter "Geldt nog" staat, de
rest lees je in het latere besluit dat erbij genoemd is; achtergrond is onderzoek, een ontwerp of een verslag waar
een besluit op steunt; vervangen en verouderd staan onderaan elk onderwerp en lees je alleen voor de geschiedenis.

## Forge

- Werkbriefje: [werkbriefjes/forge.md](../werkbriefjes/forge.md)
- [architectuur/forge.md](../architectuur/forge.md): Het lange verhaal bij Forge: Je stand en volgorde, sessie, verloop, spotter, plaatjes, het blad Oefening en spieren voor de berg.
- [visie/Los van MacroFactor.md](../visie/Los%20van%20MacroFactor.md): Het doel van de eigenaar van 9 november 2026: Forge maakt MacroFactor Workouts overbodig, de voedingsapp blijft.
- Alles over dit onderwerp: [forge.md](forge.md) (66 besluiten die gelden, 15 deels ingehaald, 20 keer onderzoek, ontwerp of verslag, 0 vervangen of verouderd).

## Koppelingen en data

- Werkbriefje: [werkbriefjes/koppelingen-en-data.md](../werkbriefjes/koppelingen-en-data.md)
- [android-sleutel.md](../android-sleutel.md): De Android-app wordt altijd met dezelfde sleutel ondertekend, anders kan een nieuwe versie niet over de oude heen; hier staat hoe de workflow dat doet.
- [architectuur/koppelingen-en-data.md](../architectuur/koppelingen-en-data.md): Wat ASCEND van Garmin leert (intensiteit, zweet, bergschoenen) en de tekst voor Strava.
- Alles over dit onderwerp: [koppelingen-en-data.md](koppelingen-en-data.md) (71 besluiten die gelden, 19 deels ingehaald, 19 keer onderzoek, ontwerp of verslag, 2 vervangen of verouderd).

## Lopen en tests

- Werkbriefje: [werkbriefjes/lopen-en-tests.md](../werkbriefjes/lopen-en-tests.md)
- [architectuur/lopen-en-tests.md](../architectuur/lopen-en-tests.md): Het lange verhaal bij lopen: hartslag op het horloge, run in detail en de testloop met de tempo's.
- Alles over dit onderwerp: [lopen-en-tests.md](lopen-en-tests.md) (31 besluiten die gelden, 10 deels ingehaald, 12 keer onderzoek, ontwerp of verslag, 0 vervangen of verouderd).

## Doelen

- Werkbriefje: [werkbriefjes/doelen.md](../werkbriefjes/doelen.md)
- [architectuur/doelen.md](../architectuur/doelen.md): Het lange verhaal bij doelen: de Ascend-tab, klaar voor je doel, de GR5-voortgang en een race met doeltijd.
- Alles over dit onderwerp: [doelen.md](doelen.md) (24 besluiten die gelden, 8 deels ingehaald, 14 keer onderzoek, ontwerp of verslag, 0 vervangen of verouderd).

## Planning

- Werkbriefje: [werkbriefjes/planning.md](../werkbriefjes/planning.md)
- [architectuur/planning.md](../architectuur/planning.md): Het lange verhaal bij planning: hoofddoel en rollen, scheduler, wie een sessie mag aanraken, labels, eerst vragen, ziek, vrij, tochten en de rugzakladder.
- Alles over dit onderwerp: [planning.md](planning.md) (61 besluiten die gelden, 13 deels ingehaald, 28 keer onderzoek, ontwerp of verslag, 0 vervangen of verouderd).

## Week

- Werkbriefje: [werkbriefjes/week.md](../werkbriefjes/week.md)
- [architectuur/week.md](../architectuur/week.md): Het lange verhaal bij de Week-tab: waarschuwingen, slepen en inhalen.
- Alles over dit onderwerp: [week.md](week.md) (28 besluiten die gelden, 8 deels ingehaald, 5 keer onderzoek, ontwerp of verslag, 0 vervangen of verouderd).

## Lichaam en herstel

- Werkbriefje: [werkbriefjes/lichaam-en-herstel.md](../werkbriefjes/lichaam-en-herstel.md)
- [architectuur/lichaam-en-herstel.md](../architectuur/lichaam-en-herstel.md): Het lange verhaal bij lichaam: het figuur, hoe voelt je lijf, een zware beendag op vermoeide benen, een korte nacht en wat speelde er.
- Alles over dit onderwerp: [lichaam-en-herstel.md](lichaam-en-herstel.md) (32 besluiten die gelden, 7 deels ingehaald, 20 keer onderzoek, ontwerp of verslag, 0 vervangen of verouderd).

## Historie en logs

- Werkbriefje: [werkbriefjes/historie-en-logs.md](../werkbriefjes/historie-en-logs.md)
- [architectuur/historie-en-logs.md](../architectuur/historie-en-logs.md): De volledige regel dat historie nooit herschreven wordt, met de uitzonderingen op verzoek van de eigenaar en het append-only patroon.
- Alles over dit onderwerp: [historie-en-logs.md](historie-en-logs.md) (25 besluiten die gelden, 6 deels ingehaald, 3 keer onderzoek, ontwerp of verslag, 0 vervangen of verouderd).

## Bediening en beweging

- Werkbriefje: [werkbriefjes/bediening-en-beweging.md](../werkbriefjes/bediening-en-beweging.md)
- [architectuur/bediening-en-beweging.md](../architectuur/bediening-en-beweging.md): Het lange verhaal bij bediening: terugknop, scrollen, hervatten en de ontwerpregels voor logo, tabbalk, lucht, instellingen en overgangen.
- [architectuur/ontwerp-en-tokens.md](../architectuur/ontwerp-en-tokens.md): Het volledige ontwerp: Zee en berg, knoppen en tikdoelen, stem, beweging en alle tokens, woordelijk verhuisd uit CLAUDE.md.
- [visie/stemgids-concept.md](../visie/stemgids-concept.md): De stemgids: de regels voor alle teksten van de app, goedgekeurd op 9 november 2026 en vastgelegd in `docs/beslissingen/2026-11-09-stem-van-ascend.md`.
- Alles over dit onderwerp: [bediening-en-beweging.md](bediening-en-beweging.md) (37 besluiten die gelden, 15 deels ingehaald, 22 keer onderzoek, ontwerp of verslag, 2 vervangen of verouderd).

## Werkwijze

- Geen werkbriefje. Hoe er aan ASCEND gewerkt wordt: rollen, poorten, kosten en het open werk.
- [backlog.md](../backlog.md): Het open werk van ASCEND: de Inbox met wat de eigenaar meldt en de bouwrij, bijgehouden door de coördinator.
- [beslissingen/_sjabloon.md](../beslissingen/_sjabloon.md): Het sjabloon voor een nieuw besluit: besluit, reden, alternatieven, bron, vervangt en terugdraaien.
- [onderhoud/2026-11-16-onderhoudsronde.md](../onderhoud/2026-11-16-onderhoudsronde.md): Onderhoudsronde 16 november 2026: grootte, dubbele en dode code, top tien om op te ruimen, ochtenden en IJkset.
- [werkbriefjes/README.md](../werkbriefjes/README.md): Wat een werkbriefje is, de vaste vorm en hoe het wordt bijgehouden.
- Alles over dit onderwerp: [werkwijze.md](werkwijze.md) (7 besluiten die gelden, 0 deels ingehaald, 16 keer onderzoek, ontwerp of verslag, 2 vervangen of verouderd).

## Algemeen

- Geen werkbriefje. Wat bij geen enkel werkbriefje hoort of over de hele app gaat.
- [architectuur/onderwerpen.md](../architectuur/onderwerpen.md): De oorspronkelijke lijst van onderwerpen met hun harde regels, woordelijk verhuisd uit CLAUDE.md.
- Alles over dit onderwerp: [algemeen.md](algemeen.md) (9 besluiten die gelden, 0 deels ingehaald, 4 keer onderzoek, ontwerp of verslag, 0 vervangen of verouderd).
