# Overdracht coördinator ASCEND

Bijgewerkt: 12 november 2026, rond 16:10 UTC, door de coördinator session_01LnDpSm59PuKBYsAhFgUjTr. Vroege wissel omdat de chat lang werd (ongeveer 560k context). Oudere overdrachten staan in de git-geschiedenis van dit bestand. Let op: de sessieketen staat op diepte 7 van 8; de volgende wissel kan create_session misschien niet meer: vraag dan de eigenaar een nieuwe coördinator-chat te starten met de prompt uit de skill coordinator-wissel.

## Opdracht van de eigenaar

- 11 november: "werk de backlog af"; 12 november: "Je mag nu ook gewoon starten".
- 12 november: voor alles wat we verbeteren een mooiere UI en makkelijkere UX, minimaal en vernieuwend; de coördinator kiest het scherm en legt elke keuze vast in een besluit. Hoogstens drie bouwers tegelijk, nooit twee aan dezelfde bestanden.
- 12 november ochtend: "Wat vannacht gebeurd is mag niet nog een keer" (limiet van vijf uur, daarna alles stil). Daarvoor de Wachter en de regel Limiet van vijf uur in de skill werkverdeling.
- 12 november middag (afdrukken): routeblok "niet mooi", "Thuis mag weg" (gedaan); StairMaster in de Briefing klopte niet (gedaan); "Wat is haarlijn?" (gedaan); vroeg naar de stand van de hoogtemeters (stap 1 klaar, wacht op naspelen).

## Stand

- Live op 12 november middag (elk met Warden, Lookout, Pathfinder en eigen blik op afdrukken, pushmelding gestuurd): Dubbel log (ec1f56e), Frisheid zonder haarlijn (76b1e25), Week Wat ASCEND aanpaste (2eaa81d), Missiekaart (5f5b528), Route-blok (7fa66cc), Briefing per manier (540d0de), Week minimaal 2-4 (2eda701). Alle bouwersessies daarvan zijn gearchiveerd.
- Lopende bouwer: Sherpa Hoogtemeters stap 1 (Fable), session_01LnDpSmaTkuQYwMVjdeQMHr, branch claude/hoogtemeters-stap-1 (kop 69bf612). Warden (Fable) akkoord, alle moet-punten verwerkt; de sessie wacht stil. NIET naar main voor naspelen met een verse back-up van de eigenaar (gevraagd om 13:10 en 14:25 UTC, nog niet ontvangen). Naspelen: de zes lopen (Garmin samen 132 m): eigen telling voor en na, en per vlakke kilometer de stijging tegen de grens van 5 m per km (zone 2 vlak). Blijven echte vlakke km onder 5 m: stap 1 naar main zoals hij is (eerst nog een Warden-blik op ronde 2 en 3, die heeft niemand gezien). Gaan ze erover: eerst de bouwer een teller-markering op het log (migratie, eigen besluit) en de grens 10 m per km voor nieuwe logs laten bouwen. Gladmaken over 15 s blijft tot het naspelen anders zegt.
- Wachter: trig_01SkSM9teBGkQ14rUvfN3Esy op session_01LnDpSm59PuKBYsAhFgUjTr staat uit na de wissel; de nieuwe coördinator maakt een eigen (cron 40 * * * *, dezelfde prompt). De oude trig_01RfcpL1mKyjAquMVbctRoGN staat ook uit.
- Open vraag aan de eigenaar (advies ja, als eigen klein spoor): moet het horloge bij StairMaster een eigen wandelworkout krijgen? Nu zegt de Briefing alleen eerlijk wat er op staat.

## Volgende bouwers (hoogstens drie tegelijk)

1. Opslaan dat mislukt (Inbox; Forge gooit het concept weg, SportAskLine bewaart de sportkeuze ook zonder log). Sonnet, klein, opslag-nabij: Warden op Fable.
2. Weer op de gekozen plek (Inbox; `engine/places.ts#weatherAtPlace` ongebruikt). Opus, Briefing.
3. Week spoor 6: Vrije dagen als rij met blad (Rustweek is al gedaan). Opus.
4. Trainingsscherm spoor 6 (WatchAskCard als rij in Je dag, één vorm met Hoe ging het?), na de toets bij vraag 2. Pathfinder-advies in de backlog.
5. Daarna Ascend en Logboek in dezelfde lijn (eerst Cartographer), met `docs/onderhoud/2026-11-12-pathfinder-verborgen-schermen.md`.

## Inbox (docs/backlog.md) voor het bouwmoment van vrijdag 13 november 19:43

- Zie `## Inbox` in de backlog: Opslaan dat mislukt, Weer op de gekozen plek, Andere plek vindt geen heuvel (Photon), Twee dagen niet kunnen, Tempo bij zone 2, Verborgen schermen, Kleding en wind, Back-up kleiner, Efficiëntie-blad, avontuurlijke plekken.

## Werkwijze, geleerd

- Leg de datum van een fout naast de datum van eerdere herstellingen voor je een bouwer start (de lus in het weekplan was al op 11 november hersteld; een bouwer op Fable zocht er anderhalf uur naar).
- Een vangnet dat iets tegenhoudt op grond van het logboek houdt ook een terechte training stil tegen; liever niet.
- Spreid helpers: Lookout pas starten als de vorige klaar is; kijk rate_limit_info in get_session.

- Bouwers maken afdrukken in hun eigen sessie; laat Lookout ze in je eigen scratchpad maken en bekijk ze zelf. Vannacht vond die eigen blik telkens nog iets (tooltip uit de kaart, chip uit beeld, regel na Akkoord).
- Naspelen kan in een worktree van de bouwerbranch met de probe van de skill naspelen; roep dan de engine-functie zelf aan (bijvoorbeeld fullWeekAdvice) en verwijder de probe meteen.
- Bij een squash van een bouwerbranch: conflict in het kostenlogboek oplossen door beide kanten te houden; een besluit dat al via de werkbranch op main kwam, de versie van main nemen.

- Zeg in elke opdracht aan Warden, Lookout en Pathfinder: "wissel NIET de werkmap van de coördinator, maak een eigen worktree in de scratchpad". Pathfinder zette op 12 november /home/user/ascend op een andere branch.
- De kit-standen werken op de vaste klok 31 oktober 2026 08:00 Europe/Amsterdam: zet in een eigen script `page.clock.setFixedTime(...)` voor `goto`, anders zie je geen Let op, voorstel of rustweek. Nieuwe standen: heuvel, volle-week, voorstel-wacht, rustweek.
- Afdrukken van een bouwer staan in zijn eigen scratchpad en zijn voor de coördinator niet leesbaar; maak ze zelf met de kit (een preview op een eigen poort in een worktree van de bouwerbranch).
- Een bouwer die een vraag in zijn eigen chat stelt staat stil; de Wachter ziet dat als status need_input. Por hem met create_trigger: zelf het advies kiezen en melden.

## Sessies en tijden

- Vorige coördinatoren: session_01LnDpSm59PuKBYsAhFgUjTr (12 november, 10:27 tot ongeveer 16:10 UTC), session_01LnDpSkUxMFtEBmNMxMAKcN (12 november, tot 10:40 UTC), session_01LnDpSnA7KzoLikwifh3nyR (11 op 12 november), session_01LnDpSkFKoLuAUnLCXKbA1G, session_01LnDpSj5xhvz93hRnJrHyF8.
- Bouwmoment ma, wo, vr 19:43 (trig_01JDroCyzgfatU8c7MiK26Ei). Vrijdag 13 november: de Inbox.
- Volgende wissel: plan je zelf met send_later op 04:47 [Europe/Amsterdam] morgen.
