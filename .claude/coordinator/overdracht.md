# Overdracht coördinator ASCEND

Bijgewerkt: 12 november 2026, rond 03:40, door de coördinator van 11 op 12 november (session_01LnDpSnA7KzoLikwifh3nyR). Oudere overdrachten staan in de git-geschiedenis van dit bestand.

## Opdracht van de eigenaar

- 11 november: "werk de backlog af"; 12 november: "Je mag nu ook gewoon starten" (niet wachten op de wissel).
- 12 november, voor hij ging slapen: voor alles wat we verbeteren een mooiere UI en makkelijkere UX, minimaal en vernieuwend. "Ik wil dat jij kiest welk scherm het wordt. Het moet passen bij de rest van ASCEND." De coördinator kiest dus op advies van Cartographer en legt elke keuze vast in een besluit. Hoogstens drie bouwers tegelijk, nooit twee aan dezelfde bestanden.

## Stand

- Live vannacht: Tempo bij zone 2 (edfa8a9), Week na gemiste dagen (0e73e48, nagespeeld met de back-up), Je dag (4120e72). Pushmelding alleen voor zone 2 gestuurd; de deploys van 0e73e48 en 4120e72 nog nakijken en dan één melding: "Je dag en de vraag bij een volle week zijn live."
- Live: Stand minimaal (26c0816, eerste stuk; opschoonstuk in backlog onder Samenhang). Andere plek (1af978e, door coördinator 12 november gemerged na Pathfinder akkoord en eigen blik op de afdrukken van Lookout; Lookout zelf brak af door de limiet van vijf uur van Sonnet). Sessie gearchiveerd.
- Lopend (melden zich bij session_01LnDpSkUxMFtEBmNMxMAKcN): Sherpa Je week tot nu (session_01LnDpSmKGD4U7U1iny68EUg, branch claude/je-week-tot-nu) , Sherpa Trainingsscherm 1-4 (session_01LnDpSikvyNKh8gCEPQwkUT, branch claude/trainingsscherm-1-4). Na hun melding: Lookout (afdrukken in eigen scratchpad), Pathfinder, eigen blik, squash naar main.
- Wachter: trig_01RfcpL1mKyjAquMVbctRoGN, elk uur op minuut 40 in deze sessie; bij de wissel verhuizen (skill werkverdeling, Limiet van vijf uur). Volgende reset van het limiet: 11:10 UTC.
- Limiet: om 03:00 UTC liep Sonnet tegen de limiet van vijf uur aan; bij een afgebroken Lookout eerst kijken of zijn afdrukken er al staan.
- Back-up van de eigenaar van 12 november 02:11: scratchpad van de vorige coördinator, niet bereikbaar voor jou. Vraag een nieuwe als je moet naspelen.

## Ontwerpen klaar, met besluit, nog te bouwen (volgorde)

1. Je week tot nu (`2026-11-12-je-week-tot-nu.md`, ontwerp in docs/visie): in aanbouw. Let op: de rij Wat ASCEND aanpaste vervalt hier (vervangen door Week minimaal).
2. Stand minimaal: eerste stuk live; het opschoonstuk (sporen 2, 3, 4, 6 en de punten van Pathfinder) is de volgende bouwer.
3. Week minimaal (`2026-11-12-week-minimaal.md`): na Je week tot nu (de ring verhuist daarheen) en na Stand (bergkam pas als Stand belasting per dag toont). Eerst een changeLog.test.ts; "toegevoegd" bij een opnieuw neergelegde training is fout.
4. Trainingsscherm en ontwerpregels (`2026-11-12-trainingsscherm-en-ontwerpregels.md`): sporen 1 tot 4 kunnen nu (Andere plek staat op main); de derde bouwer (zelfde Briefing-bestanden), 5 en 6 daarna, spoor 10 per regel met eigen besluit. Voorwaarde bij vraag 2: eerst laten zien wat de belasting doet met een log zonder zwaarte.
5. Daarna Ascend en Logboek in dezelfde lijn (nog geen ontwerp), met de vondsten uit `docs/onderhoud/2026-11-12-pathfinder-verborgen-schermen.md` (na een loop zes tot acht lagen, groep Gidsen uit het tandwiel, Forge-instellingen tijdens trainen).

## Inbox en Nakijken die vannacht bijkwamen (staan in docs/backlog.md)

- Weekplan bijgewerkt in een lus: twaalf aangenomen voorstellen voor een wandeldag op 6 maart 2027 die nooit landt; Lookout zag ook "Weekplanning bijgewerkt" na elke start. Fable met naspelen.
- Verborgen schermen, twee fouten: Kennisbank belooft een les per week op Vandaag (LessonCard nergens gebruikt); tochtschermen zonder trekdoel bereikbaar.
- Kaarten boven Je dag (Goedemorgen, Nog open, Back-up, advies) duwen Je dag twee tot drie keer scrollen omlaag: regel 6 van de ontwerpregels.
- Hoogtemeters met precisie (`docs/onderzoek/Hoogtemeters met precisie.md`): stap 1 de teller (hysterese, drempel per bron, horloge 2 m; nu telt de app op vlakke lopen een kwart van Garmin), plus de instelling Hoogtemeters bij twijfel (Liever iets meer, standaard, hoogstens 10 procent).
- Kleding en wind: Te koud telt maar een halve graad; wind niet in de zin.
- Back-up kleiner zonder dataverlies; Efficiëntie-blad; avontuurlijke plekken (na hoogtemeters).

## Werkwijze, vannacht geleerd

- Bouwers maken afdrukken in hun eigen sessie; laat Lookout ze in je eigen scratchpad maken en bekijk ze zelf. Vannacht vond die eigen blik telkens nog iets (tooltip uit de kaart, chip uit beeld, regel na Akkoord).
- Naspelen kan in een worktree van de bouwerbranch met de probe van de skill naspelen; roep dan de engine-functie zelf aan (bijvoorbeeld fullWeekAdvice) en verwijder de probe meteen.
- Bij een squash van een bouwerbranch: conflict in het kostenlogboek oplossen door beide kanten te houden; een besluit dat al via de werkbranch op main kwam, de versie van main nemen.

## Sessies en tijden

- Vorige coördinatoren: session_01LnDpSnA7KzoLikwifh3nyR (11 op 12 november), session_01LnDpSkFKoLuAUnLCXKbA1G, session_01LnDpSj5xhvz93hRnJrHyF8.
- Bouwmoment ma, wo, vr 19:43 (trig_01JDroCyzgfatU8c7MiK26Ei). Vrijdag 13 november: de Inbox.
- Volgende wissel: plan je zelf met send_later op 04:47 [Europe/Amsterdam] morgen.
