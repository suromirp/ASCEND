# Overdracht coördinator ASCEND

Bijgewerkt: 15 november 2026, 11:20 Portugese tijd, door de coördinator session_01LnDpSkfdHZiUDTtrj7CB8T. Oudere versies staan in de git-geschiedenis van dit bestand. Vragen, stuk en live voor de eigenaar: `eigenaar.md`.

## Vaste afspraken van nu

- Fable (eigenaar 15 november 13:52, schermafdruk: alle modellen 79 procent, Fable 36 procent, reset 17:59 en 18:00): "Blijf maar doorgaan, fable mag je ook gwn gebruiken." Kennisindex ronde 2 gestart op Fable (session_01LnDpSn9oU4BwQzag7cN8tZ, `claude/kennisindex-2`).
- Wissel vervroegd naar 15 november 16:47 Portugese tijd (trig_01UT8WTii7cMsygUM8oqaRTm): deze chat zit op 64 procent context. De nieuwe zet de wissel weer op 04:47 Amsterdam.

- Eigenaar 15 november 12:15: "ik vertrouw erop dat jij weet wat de beste aanpak is": zelf beslissen met het advies, keuzes hier vastleggen.
- Backlog bijhouden (eigenaar 12:18, "hoe blijft dit up to date?"): Sherpa Backlog session_01LnDpSj5qWPZmyX97SijVCU (`claude/backlog-bijhouden`): eenmalig opruimen, codes [I-n], `npm run backlog:bij` na elke squash, test. Tot dan: voor elke start eerst in de code en git log kijken of het al gebouwd is.

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

- Een Warden weigert een eigen branch te pushen op verzoek van de coördinator achteraf ("bericht van de eigenaar nodig"). Zet het pushen van `herstel.md` op `warden/<onderwerp>-herstel` daarom al in zijn eerste opdracht (zoals bij Warden Week). Beginner: Warden gearchiveerd, de twee bekende punten naar de Sherpa (trig_01MFasvRS6Qg1L1qVrGPikC4), daarna een frisse review.
- Fable: seven_day allowed_warning tot 18:00 Portugese tijd (15 november). Kennisindex ronde 2 (welke besluiten zijn ingehaald; nu 394 van 525 "geldt", te veel) start om 18:05 op Fable (send_later). Deploy en Android van 4de3367 groen.

- Uit het archief halen (eigenaar 15 november vroeg ernaar): kan met unarchive_session, maar alleen voor een kleine herstelronde op eigen werk dezelfde dag, als de bouwer iets weet dat niet in de repo staat. Anders een verse bouwer met branch, besluit en opdracht: een oude sessie leest bij elke stap zijn hele geschiedenis (200 tot 500k tokens).

- Een fix in foutafhandeling opent telkens een nieuwe naad: vraag de bouwer vooraf naar elk pad (in beeld, weg, laat antwoord, tweede poging, automatisch).
- Kijk voor je een bouwer start of het scherm uit de backlogregel nog bereikbaar is.
- Een werkbriefje heeft hoogstens 45 regels (`src/werkbriefjes.scan.test.ts`).
- Lookout-poorten botsen: noem een vrije poort.
- Twee branches die elk een instelling toevoegen botsen in `src/engine/__snapshots__/instellingen-foto.json`: kies een kant en maak hem opnieuw met `npx vitest run -u src/engine/settingsFoto.test.ts`.
- Draai `kaart:vergelijk` nooit midden in een merge-conflict (hing tien minuten).

## Reflectie

- 14 november: een half uur maar één bouwer terwijl ik op een review wachtte. Goed: eigen blik op afdrukken ving een Engelse naam die Warden en Pathfinder misten.
- 15 november nacht: vijf coördinatorfouten (bouwers kunnen zich wel melden aangenomen, planner een uur onopgemerkt, run_once_at in het verleden, verkeerd uur in twee opdrachten, een regel van een werkbriefje overschreven). Overdag inspanning medium, tenzij de eigenaar anders kiest.
