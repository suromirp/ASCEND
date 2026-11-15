# Overdracht coördinator ASCEND

Bijgewerkt: 15 november 2026, 11:20 Portugese tijd, door de coördinator session_01LnDpSkfdHZiUDTtrj7CB8T. Oudere versies staan in de git-geschiedenis van dit bestand. Vragen, stuk en live voor de eigenaar: `eigenaar.md`.

## Vaste afspraken van nu

- Zonder sportschool (eigenaar 15 november, "Ja advies"): alleen wat de sportschool nodig heeft vervalt; een loop of wandeling die je niet deed telt als gemist. Doorgegeven aan Sherpa Week.

- Tijden aan de eigenaar in Portugese tijd (Europe/Lisbon) tot woensdag 18 november, daarna Amsterdamse tijd; nooit UTC.
- Stijl Jarvis met "meneer"; vragen apart onderaan onder **Vraag aan u**, advies voorop, en wat er zonder antwoord gebeurt.
- Niet op de eigenaar wachten: open vragen krijgen het advies als standaard; elke keuze en reflectie hier vastleggen.
- Elke afspraak meteen hier; elke verandering in vragen, stuk of live meteen in `eigenaar.md`.
- Limiet (09:50): alle modellen 69 procent, reset 17:59; Fable 25 procent, reset 18:00. Fable tot 18:00 benutten (Warden, Scout, Cartographer, planner-bouwers). Bij een limiet: send_later op resetsAt plus vijf minuten.
- Werkwijze overdag: klaar werk na de volle controles op `claude/nacht`; per onderwerp Lookout en Pathfinder (bij iets zichtbaars); dan main via squash (`git commit-tree HEAD^{tree} -p origin/main`), pushmelding, werkkaart.
- Bouwplekken vol (drie bouwers, tot zes sessies). Bouwers en Wardens melden zich niet: kijk met get_session (de tag-filter van list_sessions werkt niet; gebruik de id's hieronder).
- Inspanning coördinator overdag: medium.
- Back-up van de eigenaar alleen in de scratchpad (chmod 600), alleen lezen, nooit in de repo.

## Taken en wissel

- Wachter (elk uur op :40): trig_01Y6Gb6hgELCGn9XV2EAkMny op deze sessie (eigenaar 11:50: "Zet wachter aan"; eerst geweigerd door de rechtencontrole, met zijn akkoord gelukt).
- Bouwers nakijken (elk uur op :10): trig_011KHnGB7dsiNtt5r3VgdE4Q op deze sessie.
- Werkkaart elk uur op :20: eigen sessie session_01LnDpSktfMxYFgMMgDhw8Do (trig_01JoRN6XzHJ17frpcWQAdEzB), niet aanraken, niet archiveren.
- Wissel: send_later 16 november 04:47 Amsterdam (trig_01L3EV4HCeLhdnygvM2rh9bM).

## Lopend (15 november 11:20)

- EERST: melding Week van de eigenaar (10:40). Telling klopt niet met de kruisen; za 14 lange loop grijs zonder kruis (vermoedelijk: Zonder sportschool telt nu als nooit gemist, ook voor een loop, besluit 2026-11-14); waarschuwing naast een niet gedane lange loop; inhaaladvies zegt "vandaag deed je geen training" terwijl Heuvelintervallen vandaag staat, legt de lange loop direct na de heuvelintervallen en zegt vaag "die week". Sherpa Week session_01LnDpSihpwmNKme8Mudp1nF (Opus high, `claude/week-telling`), met nagemaakte data. Na hem: Warden op Fable. Zodra de eigenaar een back-up stuurt: skill naspelen en de uitkomst naar de Sherpa. De notitie bij zijn periode is privé.
- Q instellingen (`claude/q-instellingen`): Warden akkoord, niet blokkerend. Proefmerge met nacht op `proef/q-kennis` (lokaal; conflict in de instellingenfoto opgelost door hem opnieuw te maken). Daarna Lookout en Pathfinder, samen met StairMaster.
- StairMaster en wandelen in bpm: Warden akkoord en zelf op claude/nacht gezet (e78388d). Nog Lookout en Pathfinder.
- Kennisindex: op claude/nacht (4306d25). Elk nieuw document in docs/ heeft nu een regel in `docs/kennisindex/bronnen.json` nodig, anders faalt `scripts/kennisindex`; `npm run kennisindex` maakt de index opnieuw. Zet dat in elke bouwopdracht die een besluit schrijft.
- Beginner heel licht stap 1 en 2 (`claude/beginner-licht`, Sherpa session_01LnDpSk5RjwPEFvrRzyLnjW, idle met een open vraag over de overgang na week 4, volgt het advies): Warden session_01LnDpSji7qMKisXbWFkVsdb (Fable), let op de veranderde planGolden-foto. Daarna stap 3.
- Gearchiveerd 12:10 (eigenaar: "oude bouwer sessies archiveren"): twaalf afgeronde sessies, ook de coördinatoren van 12 en 14 november. Open blijven: Werkkaart-sessie, Sherpa beginner (herstel volgt), lopende bouwers.
- Week: Sherpa klaar (dd92b19), Warden Week session_01LnDpSj4BZ8tUcTDLVp4ZkT (Fable); bij blokkerend schrijft hij `herstel.md` op `warden/week-herstel`.
- Beginner: Warden wil herstel (rem na de start moet de langste sessie lezen; de Akkoord-wissel optioneel). Gevraagd als `herstel.md` op `warden/beginner-herstel` (trig_01Hs1bhNkoZZy84rJtr6ERM9), daarna naar Sherpa beginner.
- Klein 15 november klaar (41f0901 op claude/klein-15-nov): proefmerge, Warden sonnet, Lookout.
- Les: list_events heb ik niet; een Warden die niet akkoord is laat zijn herstel als bestand op een branch achter.

- Back-up van de eigenaar (15 november 11:50, app fe704a3) staat in de scratchpad van deze sessie: `backup-eigenaar-1/b.json`, chmod 600. Naspelen Week: vr 13 beide skipped (geen gemist), za 14 Lange duurloop (type hiking) en zo 15 Heuvelintervallen geruild, za 14 afgeleid away; advies met leave leeg, zonder leave precies zijn tekst. Doorgegeven aan Sherpa Week (trig_014agsDwjutsHvizV1TUzx61).
- Back-up eerste keer mislukt (schermafdruk 11:50, "het bestand kon niet worden geschreven", tweede poging lukt met -2 in de naam): Sherpa Back-up session_01LnDpSnNF5icymXAJ1Rc6xC (Fable, `claude/backup-eerste-keer`).
- Sherpa Klein 15 november session_01LnDpSnF3VCAmFtp8CGzVEz (Opus medium, `claude/klein-15-nov`): Forge-tikdoelen en Logboek lege maand.
- Q, StairMaster en Kennisindex: Lookout groen, Pathfinder akkoord, eigen blik: bpm-regel bij korte blokken werd "Tussen de blokken onder N bpm." (ddd0a35 op proef/q-kennis). Volle controles lopen, dan squash naar main.

## Bouwrij daarna

- D één plan (planner, Fable), dan M2, R, P uit de Inbox van `docs/backlog.md`. Pathfinder-punten 2 en 4 van routes wandelen staan in de backlog (later).
- Na routes wandelen: de vaste ijktocht. MacroFactor eruit na deze week (oude logs blijven leesbaar).
- Woensdag 18 november: de rustiger instap van de planner op de terugkomst van de eigenaar nakijken.

## Werkwijze, geleerd

- Een fix in foutafhandeling opent telkens een nieuwe naad: vraag de bouwer vooraf naar elk pad (in beeld, weg, laat antwoord, tweede poging, automatisch).
- Kijk voor je een bouwer start of het scherm uit de backlogregel nog bereikbaar is.
- Een werkbriefje heeft hoogstens 45 regels (`src/werkbriefjes.scan.test.ts`).
- Lookout-poorten botsen: noem een vrije poort.
- Twee branches die elk een instelling toevoegen botsen in `src/engine/__snapshots__/instellingen-foto.json`: kies een kant en maak hem opnieuw met `npx vitest run -u src/engine/settingsFoto.test.ts`.
- Draai `kaart:vergelijk` nooit midden in een merge-conflict (hing tien minuten).

## Reflectie

- 14 november: een half uur maar één bouwer terwijl ik op een review wachtte. Goed: eigen blik op afdrukken ving een Engelse naam die Warden en Pathfinder misten.
- 15 november nacht: vijf coördinatorfouten (bouwers kunnen zich wel melden aangenomen, planner een uur onopgemerkt, run_once_at in het verleden, verkeerd uur in twee opdrachten, een regel van een werkbriefje overschreven). Overdag inspanning medium, tenzij de eigenaar anders kiest.
