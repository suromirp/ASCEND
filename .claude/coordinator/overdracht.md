# Overdracht coördinator ASCEND

Bijgewerkt: 15 november 2026, 14:20 Portugese tijd, door de coördinator session_01LnDpSnngzUAioWQ5b8xBWH (overgenomen van session_01LnDpSkfdHZiUDTtrj7CB8T om 14:13). Oudere versies: git-geschiedenis van dit bestand. Vragen, stuk en live voor de eigenaar: `eigenaar.md`.

## Vaste afspraken

- Tijden aan de eigenaar in Portugese tijd (Europe/Lisbon) tot woensdag 18 november, daarna Amsterdamse tijd; nooit UTC.
- Stijl Jarvis met "meneer"; vragen apart onderaan onder **Vraag aan u**, advies voorop, wat er zonder antwoord gebeurt.
- Eigenaar 15:36: "Ja jouw advies voor de wachters doe dit vanaf nu standaard en zeg alleen wat je gekozen hebt": Wachter en andere uurtaken bij elke wissel zelf verhuizen met het advies; geen vraag meer, alleen melden wat gekozen is. Weigert het systeem, dan dit citaat tonen.
- Eigenaar 12:15: "ik vertrouw erop dat jij weet wat de beste aanpak is": zelf beslissen met het advies, keuzes hier vastleggen. Niet op hem wachten.
- Fable (eigenaar 13:52): "fable mag je ook gwn gebruiken". Limiet toen: alle modellen 79 procent (reset 17:59), Fable 36 procent (reset 18:00). Bij een limiet: send_later op resetsAt plus vijf minuten.
- Zonder sportschool (eigenaar, "Ja advies"): alleen wat de sportschool nodig heeft vervalt; een loop of wandeling die je niet deed telt als gemist.
- Elke afspraak meteen hier; elke verandering in vragen, stuk of live meteen in `eigenaar.md`.
- Werkwijze: klaar werk na de volle controles op `claude/nacht`; Warden (planner en opslag op Fable), Lookout en Pathfinder bij iets zichtbaars, eigen blik op de afdrukken; dan main via squash (`git commit-tree HEAD^{tree} -p origin/main`), daarna `npm run backlog:bij` en meecommitten op nacht, pushmelding, `eigenaar.md` Net live, Werkkaart extra ronde (fire_trigger trig_01JoRN6XzHJ17frpcWQAdEzB).
- Backlog: elk Inboxpunt heeft een code [I-n]; een bouwer zet `Klaar: I-n` in zijn commit; voor een start eerst `git log origin/main --grep "I-n"` en in de code kijken of het al gebouwd is (vandaag twee keer oud werk in de Inbox).
- Kennisindex: elk nieuw document in docs/ krijgt een regel in `docs/kennisindex/bronnen.json`, dan `npm run kennisindex`; na een proefmerge altijd `npm run kennisindex` opnieuw. Zet dat in elke bouwopdracht.
- Een Warden pusht zijn herstel als `herstel.md` op `warden/<onderwerp>-herstel`: zet dat in zijn eerste opdracht (achteraf vragen weigert hij). Bouwers melden zich niet: kijk met get_session; list_sessions children werkt, de tag-filter niet. list_events heb je niet: laat bevindingen in een bestand of in de samenvatting landen.
- Back-up van de eigenaar: stond alleen in de scratchpad van de vorige coördinator (11:50, app fe704a3). Voor nieuw naspelen: vraag een verse.

## Taken

- Bouwers nakijken elk uur op :10: trig_015XdDMzaV3mQ89aqdgLLHpo op deze sessie. De oude (trig_011KHnGB7dsiNtt5r3VgdE4Q) staat uit.
- Wachter elk uur op :40: trig_01CDpj9NsMnvoumE9kVDUPt3 op deze sessie (eigenaar 15:36 "Ja"). De oude (trig_01Y6Gb6hgELCGn9XV2EAkMny) staat uit. Bij de volgende wissel: zelf verhuizen, niet meer vragen.
- Werkkaart elk uur op :20: eigen sessie session_01LnDpSktfMxYFgMMgDhw8Do (trig_01JoRN6XzHJ17frpcWQAdEzB). Niet aanraken, niet archiveren.
- Volgende wissel: send_later 16 november 04:47 [Europe/Amsterdam] staat (trig_01Eu5zZc9REdsU1VGyWCvjFe).

## Live vandaag

- 4de3367 (12:20): Q instellingen terug met Akkoord, kracht uit, wandelen in vaste bpm, kennisindex. Deploy en Android groen.
- b2439653 (13:15): kracht en bpm netjes in Instellingen, weesregel Stand, backlog met codes en `npm run backlog:bij`. Deploy en Android groen.

## Lopend (16:20)

- Live 49eca57 (16:20): Week telling (I-1), Afbreker (I-4), hitteregel (melding eigenaar 15:37, besluit 2026-11-15-hitte-bij-herhalingen), kennisindex ronde 2. Deploy en Android nog nakijken.
- Weekbudget (I-39) ronde 2 klaar (3f3bb08): Lookout session_01LnDpSkdgxjM61k9cG1nQ7p (`lookout/weekbudget`) en Pathfinder session_01LnDpSnrKnCEtgsmdvmX3KN (`pathfinder/weekbudget`). Warden is gedaan door de bouwer zelf op Sonnet; geen planner of opslag. Rest naar backlog: notitie in settingsDefs, Sterker worden met kracht uit.
- Back-up: herstel 40679346; Warden Fable ronde 2 session_01LnDpSj4LDkgBj7FgZGcSrm (`warden/backup-herstel-2`). Daarna main en de toesteltest voor de eigenaar.
- Beginner: herstel 52a45dee; Warden Fable ronde 3 session_01LnDpSiLqNk2UfWhBp7SySD (`warden/beginner-herstel-3`). Daarna Lookout en Pathfinder, dan stap 3.
- Squash geeft andere geschiedenis dan nacht: een branch vanaf main mergen in een proef geeft add/add-conflicten; cherry-pick dan de commits.
- Bouwrij daarna: I-40, I-41 (Week, later), D één plan (I-14, nakijken of het nog open is), I-23 M, I-8 Routes op reis. MacroFactor eruit na deze week. Woensdag 18 november: rustiger instap van de planner op de terugkomst van de eigenaar nakijken.

## Werkwijze, geleerd

- Twee branches die elk een instelling toevoegen botsen in `src/engine/__snapshots__/instellingen-foto.json`: kies een kant en maak hem opnieuw met `npx vitest run -u src/engine/settingsFoto.test.ts`.
- Draai `kaart:vergelijk` nooit midden in een merge-conflict.
- Een fix in foutafhandeling opent telkens een nieuwe naad: vraag elk pad vooraf (in beeld, weg, laat antwoord, tweede poging, automatisch). Vandaag: een leesfout mag nooit tot weghalen leiden.
- Uit het archief halen kan (unarchive_session), alleen voor een kleine herstelronde dezelfde dag; anders een verse bouwer.
- Een werkbriefje heeft hoogstens 45 regels. Lookout-poorten: noem een vrije poort.
- Wissel bij ongeveer 50 tot 60 procent context, niet pas 's nachts.

## Reflectie 15 november

- Goed: naspelen met de echte back-up vond de oorzaak van de Week-melding in een kwartier; de Warden op Opus ving twee keer dat de back-upfix een goed bestand kon weghalen.
- Slechter: een bouwer gestart voor werk dat al gebouwd was; een Warden die zijn herstel niet wilde pushen; de wissel te laat gepland.
