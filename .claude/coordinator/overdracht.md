# Overdracht coördinator ASCEND

Bijgewerkt: 15 november 2026, 18:35 Portugese tijd, door de coördinator session_01LnDpSnngzUAioWQ5b8xBWH (wissel om context 60 procent). Oudere versies: git-geschiedenis van dit bestand. Vragen, stuk en live voor de eigenaar: `eigenaar.md`.

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

## Stand 18:35 (Portugese tijd)

Live vandaag: 49eca57 (16:28: Week telling I-1, Afbreker I-4, hitteregel, kennisindex 2) en 8cce377 (17:45: Back-up eerste keer, Weekbudget kracht uit I-39). Deploy en Android van 49eca57 groen; 8cce377 nog nakijken.

Eigenaar: ziek boven de nek sinds 15 november, koorts komt op. Advies gegeven: laten staan, bij 38 graden "Toch koorts" tikken; geen harde training. Toesteltest back-up gevraagd (staat in eigenaar.md). Eigenaar 17:33 en 17:37: "alle trossen los", "geen limiet" aan sessies; om 17:45 liep de sessielimiet vol (reset 18:29), weeklimiet reset 17:59.

Klaar, nog afhandelen naar main:
- Beginner heel licht stap 1 en 2 (`claude/beginner-licht`, bouwer session_01LnDpSk5RjwPEFvrRzyLnjW): Warden Fable ronde 4 AKKOORD (`warden/beginner-herstel-4`, zes mag-punten; het werkbriefje zegt "5 minuten" waar het 10 is: laten herstellen). Nog: Lookout en Pathfinder, proefmerge, main. Daarna stap 3.
- Routes op reis 3 (I-8, `claude/routes-op-reis-3`, session_01LnDpSikySyiwvu3K6GumV6): Warden Sonnet akkoord, geen Lookout nodig.
- Forge Afronden nawerk (I-44, I-45, `claude/forge-afronden-nawerk`, session_01LnDpSmRtKRvbByZGmXjMaJ): 18:33 een extra punt uit de onderhoudsronde (completedAt krijgt het tijdstip van nu, forgeFinishLog.ts:28). Daarna Warden op Fable (conceptveld firstDoneAt nooit in een log, pil-sleutel) en Lookout met twee tabbladen.
- Scout Kleding en wind staat op nacht; bouwen als I-49 (windjack vanaf 20 km/u).

Bezig (18:33 weer aangezet na de limiet; melden zich bij session_01LnDpSnngzUAioWQ5b8xBWH, dus kijk zelf met get_session):
- Week samenhang I-40 tot I-43: session_01LnDpSk1qS9r2sGs2psx7dK, `claude/week-samenhang`.
- Ziek met koorts I-48 (alleen tekst): session_01LnDpSmh3tLbznWZY1MRKPp, `claude/ziek-koorts`.
- Oud trainingsscherm I-9, I-30, I-32: session_01LnDpSnt3xo2ApGNgFFNvxQ, `claude/oud-trainingsscherm`.
- Import alleen nieuw I-38 (opslag, Warden op Fable): session_01LnDpSjqJSAJ7omGDnaWV7c.
- Weer van de plek I-37: session_01LnDpSnTsArC7Mn2MPLRgzq (branch `claude/weer-plek-vervolg`).
- Back-up mag-punten: `claude/backup-mag` via session_01LnDpSnNF5icymXAJ1Rc6xC.

Uitslagen om te lezen: `pathfinder/totaal-15-nov` (tien punten over de hele app) en `warden/onderhoud-15-nov` (onderhoud.md; het moet-punt ging naar Forge nawerk). Zet wat moet in de backlog.

Taken voor de nieuwe coördinator: Wachter (:40) en Bouwers nakijken (:10) zelf naar de eigen sessie verhuizen met dezelfde prompts als trig_01CDpj9NsMnvoumE9kVDUPt3 en trig_015XdDMzaV3mQ89aqdgLLHpo (eigenaar 15:36: "doe dit vanaf nu standaard en zeg alleen wat je gekozen hebt"), daarna die twee uitzetten. Volgende wissel: send_later 16 november 04:47 [Europe/Amsterdam] (de oude trig_01Eu5zZc9REdsU1VGyWCvjFe is weg). Conflicten in docs/kennisindex en scripts/app-kaart: beide kanten houden, bronnen.json met de hand, .md opnieuw maken. Een hook draait alle tests bij elke git commit: commit los. Draai kaart:vergelijk in een eigen worktree, nooit terwijl je van branch wisselt.

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
