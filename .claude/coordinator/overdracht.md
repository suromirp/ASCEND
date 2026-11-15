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
- Back-up van de eigenaar: 15 november 16:29 (app b243965), in de scratchpad van session_01LnDpSnngzUAioWQ5b8xBWH onder backup/ (chmod 600, alleen lezen met python -I). Bestandsnaam eindigde weer op -2 (fix nog niet live). Een volgende coördinator vraagt een verse.
- Eigenaar ziek sinds 15 november, boven de nek (staat in de app). Zijn bericht via de vorige chat (16:45, "advies over koorts") kwam hier niet aan; gevraagd wat hij schreef.
- Opgeruimd 16:50: alle klaar zijnde sessies van vandaag gearchiveerd. Niet aanraken: Werkkaart, de drie bouwers, de vastgezette chat ASCEND, ECHO en Dual Ubuntu (geen ASCEND-werk).

## Taken

- Bouwers nakijken elk uur op :10: trig_015XdDMzaV3mQ89aqdgLLHpo op deze sessie. De oude (trig_011KHnGB7dsiNtt5r3VgdE4Q) staat uit.
- Wachter elk uur op :40: trig_01CDpj9NsMnvoumE9kVDUPt3 op deze sessie (eigenaar 15:36 "Ja"). De oude (trig_01Y6Gb6hgELCGn9XV2EAkMny) staat uit. Bij de volgende wissel: zelf verhuizen, niet meer vragen.
- Werkkaart elk uur op :20: eigen sessie session_01LnDpSktfMxYFgMMgDhw8Do (trig_01JoRN6XzHJ17frpcWQAdEzB). Niet aanraken, niet archiveren.
- Volgende wissel: send_later 16 november 04:47 [Europe/Amsterdam] staat (trig_01Eu5zZc9REdsU1VGyWCvjFe).

## Live vandaag

- 4de3367 (12:20): Q instellingen terug met Akkoord, kracht uit, wandelen in vaste bpm, kennisindex. Deploy en Android groen.
- b2439653 (13:15): kracht en bpm netjes in Instellingen, weesregel Stand, backlog met codes en `npm run backlog:bij`. Deploy en Android groen.

## Alle trossen los (eigenaar 17:33, "nog een halfuurtje"; weeklimiet alle modellen 87%, reset 17:59; Fable 47%, reset 18:00; sessielimiet 70%, reset 18:30)

- Gestart 17:34: Sherpa Week samenhang I-40 tot I-43 (session_01LnDpSk1qS9r2sGs2psx7dK, Opus, `claude/week-samenhang`), Sherpa Forge Afronden nawerk I-44 en I-45 (session_01LnDpSmRtKRvbByZGmXjMaJ, Opus, `claude/forge-afronden-nawerk`), Sherpa Ziek met koorts I-48 (session_01LnDpSmh3tLbznWZY1MRKPp, Sonnet, `claude/ziek-koorts`), Back-up mag-punten via trigger op session_01LnDpSnNF5icymXAJ1Rc6xC (`claude/backup-mag`), Pathfinder totaalplaatje (session_01LnDpSmkwo3AgWvu81SUx2M, Fable, `pathfinder/totaal-15-nov`), Onderhoud en audit (session_01LnDpSk8Few3HKY4zYcJf8n, Fable, `warden/onderhoud-15-nov`). Elke bouwer meldt zich met een trigger.
- 17:37, eigenaar "geen limiet": ook Sherpa Oud trainingsscherm I-9/I-30/I-32 (session_01LnDpSnt3xo2ApGNgFFNvxQ, `claude/oud-trainingsscherm`), Sherpa Import alleen nieuw I-38 (session_01LnDpSjqJSAJ7omGDnaWV7c, `claude/import-alleen-nieuw`, opslag: Warden op Fable), Sherpa Weer van de plek I-37 (session_01LnDpSnTsArC7Mn2MPLRgzq, `claude/weer-plek-rest`), Sherpa Routes op reis 3 I-8 (session_01LnDpSikySyiwvu3K6GumV6, `claude/routes-op-reis-3`), Scout Kleding en wind I-36 (session_01LnDpSihzMitguTWpVKkioL, Fable, `claude/scout-kleding-wind`).
- Live 8cce377 (17:45): Back-up eerste keer en Weekbudget (I-39). Toesteltest back-up gevraagd aan de eigenaar.
- Klaar, wacht op main: Routes op reis 3 (I-8, `claude/routes-op-reis-3`, Warden Sonnet akkoord; geen Lookout nodig, één foutregel). Forge Afronden nawerk (I-44, I-45, `claude/forge-afronden-nawerk` 015dfbd): nog Warden op Fable (conceptveld firstDoneAt, pil-sleutel) en Lookout met twee tabbladen. Scout Kleding en wind op nacht, bouwen als I-49.
- Sessielimiet vol rond 17:45, reset 18:29; send_later 18:34 port stilgevallen sessies. Start dan ook de Warden en Lookout voor Forge.
- Was: Weekbudget (I-39) en Back-up gaan samen naar main: proef `proef/wb` in worktree scratchpad/wt-wb; Lookout ronde 3 session_01LnDpSnHKQiSjzMz8hPhs3X (`lookout/weekbudget-3`). Back-up Warden ronde 3 (subagent, Fable): Akkoord op 0dcb233.
- Beginner: Warden ronde 4 session_01LnDpSmDUxGVe9KVaLoPRYv (`warden/beginner-herstel-4`).
- Eigenaar ziek boven de nek, koorts komt op: advies gegeven (nu laten staan, bij 38 graden op "Toch koorts"; geen harde training, hoogstens 20 tot 30 minuten rustig).

## Lopend (16:20)

- Live 49eca57 (16:20): Week telling (I-1), Afbreker (I-4), hitteregel (melding eigenaar 15:37, besluit 2026-11-15-hitte-bij-herhalingen), kennisindex ronde 2. Deploy en Android groen.
- Weekbudget (I-39): Pathfinder wil de rij Krachtblok op Ascend weg bij kracht uit (voor main); herstel 16:44 naar de bouwer. Lookout groen (afdrukken bekeken). Was: ronde 2 klaar (3f3bb08): Lookout session_01LnDpSkdgxjM61k9cG1nQ7p (`lookout/weekbudget`) en Pathfinder session_01LnDpSnrKnCEtgsmdvmX3KN (`pathfinder/weekbudget`). Warden is gedaan door de bouwer zelf op Sonnet; geen planner of opslag. Rest naar backlog: notitie in settingsDefs, Sterker worden met kracht uit.
- Back-up: Warden ronde 2 niet akkoord om Moet 5 (automatisch vergeet de naam als weghalen mislukt); herstel ronde 3 om 16:44 naar de bouwer, daarna blik op de diff. Was: herstel 40679346; Warden Fable ronde 2 session_01LnDpSj4LDkgBj7FgZGcSrm (`warden/backup-herstel-2`). Daarna main en de toesteltest voor de eigenaar.
- Beginner: Warden ronde 3 niet akkoord (sprong 35 naar 50 bij het eerste eigen log na een start zonder logs; eerste voorstel leest opgeslagen keuze niet); herstel ronde 4 om 16:44. Was: herstel 52a45dee; Warden Fable ronde 3 session_01LnDpSiLqNk2UfWhBp7SySD (`warden/beginner-herstel-3`). Daarna Lookout en Pathfinder, dan stap 3.
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
