# Overdracht coördinator ASCEND

Bijgewerkt: 14 november 2026, ongeveer 04:30 Amsterdam, door de coördinator session_01LnDpSnUEEuPrNVonLWzZVf (diepte 8 van 8: kon geen sessies, geplande taken of send_later meer maken). Oudere overdrachten staan in de git-geschiedenis van dit bestand. De eigenaar start de nieuwe coördinator-chat zelf (begint weer op diepte 0) met de prompt uit de skill coordinator-wissel.

## Opdracht van de eigenaar

- 13 november: "Start een nieuwe coördinator en ga verder met de backlog"; "Ja doe alles autonoom"; "Ga daarna verder met de backlog".
- 13 november: proef Ponytail en Graphify ("Allebei"): klaar, verslag `docs/onderzoek/Ponytail en Graphify.md`. Advies: Ponytail alleen de audit als prompt in de onderhoudsronde; Graphify weg. Niets van beide geïnstalleerd in de repo; de hook in `~/.claude/settings.json` werd door de rechten geweigerd.
- 14 november: wil weer bouwers in eigen chats ("dat kon eerder ook"). Kan pas vanuit een coördinator-chat die de eigenaar zelf start; deze chat zat op de grens van de keten.
- Eerdere afspraken blijven: hoogstens drie helpers tegelijk, nooit twee aan dezelfde bestanden; mooiere UI en makkelijkere UX met besluit; de Wachter staat uit sinds 13 november 00:00 ("geen planning nu"), alleen weer aanzetten als de eigenaar dat zegt.

## Live sinds 13 november (elk met Warden, Lookout, Pathfinder waar zichtbaar, en eigen blik op afdrukken)

- Kleding en wind (25fd7e0): wind en gevoel in de weerzin en de rij Weer van de Briefing vanaf 15 km/u; eerste kledingtik een graad.
- Weer van de plek (25fd7e0): de pagina Weer volgt de plek uit de Briefing.
- Opstarten en intervals.icu (edad0c3): grens tot het antwoord gelezen is; een fout in een herstelstap houdt de rest niet tegen.
- Verborgen schermen (1d48de9): tochtschermen, Reis-regel en zoekresultaten alleen met een trekdoel.
- Hoogtemeters na stap 1 (f30fe31): elk oordeel leest het merk; bodem van 20 m op het wantrouwen van het horloge.
- Opslaan dat mislukt (077fdf0): invoer blijft, één zin, nooit twee logs; laat nee na weggaan komt bovenin. Deploy en APK van deze laatste: nog nakijken.

## Niet naar main

- `claude/efficientie-blad`: het blad is sinds 12 november niet meer bereikbaar (commit 26c08167). Laten liggen.

## Open, volgende stappen

- Inbox van `docs/backlog.md` (staat bijgewerkt). Wat een back-up van de eigenaar vraagt (audit 13 november, bodem van 20 m naspelen) wacht tot hij er een in de scratchpad zet.
- Bouwrij: Trainingsscherm spoor 5 tot 10, daarna Ascend en Logboek in dezelfde lijn (eerst Cartographer).

## Werkwijze, geleerd vandaag

- Een fix in foutafhandeling opent telkens een nieuwe naad (Opslaan: vijf rondes). Vraag de bouwer vooraf naar elk pad: in beeld, weg, laat antwoord, tweede poging, automatisch.
- Kijk voor je een bouwer start of het scherm uit de backlogregel nog bereikbaar is (Efficiëntie-blad: 160k verspild).
- Hervatten van dezelfde bouwer met SendMessage werkt ook na een herstart van de container.
- Een werkbriefje heeft een grens van 45 regels (`src/werkbriefjes.scan.test.ts`); voeg een valkuil samen met een bestaande regel.
- Lookout-poorten botsen; noem in de opdracht een vrije poort of "niet 5231, 5237, 5263".
