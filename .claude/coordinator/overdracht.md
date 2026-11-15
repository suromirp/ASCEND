# Overdracht coördinator ASCEND

Bijgewerkt: 15 november 2026, 22:40 Portugese tijd, door de coördinator session_01LnDpSjEhK5wS8sN1rH1p5c (wissel om context 63 procent). Oudere versies: git-geschiedenis van dit bestand. Vragen, stuk en live voor de eigenaar: `eigenaar.md`.

## Vaste afspraken

- Tijden aan de eigenaar in Portugese tijd (Europe/Lisbon) tot woensdag 18 november, daarna Amsterdamse tijd; nooit UTC.
- Stijl Jarvis met "meneer"; vragen apart onderaan onder **Vraag aan u**, advies voorop, wat er zonder antwoord gebeurt.
- Eigenaar 15:36: "Ja jouw advies voor de wachters doe dit vanaf nu standaard en zeg alleen wat je gekozen hebt": Wachter en andere uurtaken bij elke wissel zelf verhuizen met het advies; geen vraag meer, alleen melden wat gekozen is. Weigert het systeem, dan dit citaat tonen.
- Eigenaar 12:15: "ik vertrouw erop dat jij weet wat de beste aanpak is": zelf beslissen met het advies, keuzes hier vastleggen. Niet op hem wachten.
- Fable (eigenaar 13:52): "fable mag je ook gwn gebruiken". Limiet toen: alle modellen 79 procent (reset 17:59), Fable 36 procent (reset 18:00). Bij een limiet: send_later op resetsAt plus vijf minuten.
- Zonder sportschool (eigenaar, "Ja advies"): alleen wat de sportschool nodig heeft vervalt; een loop of wandeling die je niet deed telt als gemist.
- Elke afspraak meteen hier; elke verandering in vragen, stuk of live meteen in `eigenaar.md`.
- Werkwijze: klaar werk na de volle controles op `claude/nacht`; Warden (planner en opslag op Fable), Lookout en Pathfinder bij iets zichtbaars, eigen blik op de afdrukken; dan main via squash (`git commit-tree HEAD^{tree} -p origin/main`), daarna `npm run backlog:bij` en meecommitten op nacht, pushmelding, `eigenaar.md` Net live, Werkkaart extra ronde met create_trigger op session_01LnDpSktfMxYFgMMgDhw8Do (run_once_at een paar minuten vooruit), nooit fire_trigger: dat opent een lege chat zonder repo.
- Backlog: elk Inboxpunt heeft een code [I-n]; een bouwer zet `Klaar: I-n` in zijn commit; voor een start eerst `git log origin/main --grep "I-n"` en in de code kijken of het al gebouwd is (vandaag twee keer oud werk in de Inbox).
- Kennisindex: elk nieuw document in docs/ krijgt een regel in `docs/kennisindex/bronnen.json`, dan `npm run kennisindex`; na een proefmerge altijd `npm run kennisindex` opnieuw. Zet dat in elke bouwopdracht.
- Een Warden pusht zijn herstel als `herstel.md` op `warden/<onderwerp>-herstel`: zet dat in zijn eerste opdracht (achteraf vragen weigert hij). Bouwers melden zich niet: kijk met get_session; list_sessions children werkt, de tag-filter niet. list_events heb je niet: laat bevindingen in een bestand of in de samenvatting landen.
- Back-up van de eigenaar: 15 november 22:03 in de scratchpad van session_01LnDpSjEhK5wS8sN1rH1p5c (backup/b.json, chmod 600, alleen python -I). Een nieuwe coördinator heeft hem niet: vraag een verse als je moet naspelen (I-63 maandag).
- Eigenaar ziek sinds 15 november, boven de nek (staat in de app). Zijn bericht via de vorige chat (16:45, "advies over koorts") kwam hier niet aan; gevraagd wat hij schreef.
- Eigenaar 19:41: oude bouwers, coördinators en chats archiveren zodra ze klaar zijn. Niet aanraken: Werkkaart session_01LnDpSktfMxYFgMMgDhw8Do, de vastgezette chat ASCEND, ECHO en Dual Ubuntu (geen ASCEND-werk), en de coördinator van de middag zolang de Wachter daar draait.
- Helpers in de coördinator-chat: zeg in elke opdracht dat ze alleen in een eigen worktree werken en /home/user/ascend nooit van branch wisselen (een Pathfinder deed dat om 22:35).

## Taken

- Bouwers nakijken elk uur op :10: trig_01E4NEQpURCEZGKYzpZGQizh op de vorige coördinator session_01LnDpSjEhK5wS8sN1rH1p5c. Nieuwe coördinator: maak hem op je eigen sessie (zelfde prompt, initiation human_schedule) en zet deze uit.
- Wachter elk uur op :40: trig_01CDpj9NsMnvoumE9kVDUPt3 wekt de coördinator van de middag (session_01LnDpSnngzUAioWQ5b8xBWH). Aanmaken op een eigen sessie werd drie keer geweigerd (Undermining Oversight), ook na het "Nee" van de eigenaar. Gevraagd dat hij hem zelf in de app op de coördinator-chat zet en "staat" zegt; dan de oude uit en die chat archiveren. Niet opnieuw zelf proberen.
- Werkkaart elk uur op :20: eigen sessie session_01LnDpSktfMxYFgMMgDhw8Do (trig_01JoRN6XzHJ17frpcWQAdEzB). Niet aanraken, niet archiveren.
- Volgende wissel: send_later 16 november 04:47 [Europe/Amsterdam] op de nieuwe coördinator; de oude (trig_01SgRjhVtzejbpKaz26bmsAi) is uitgezet.
- Bouwers melden zich met create_trigger bij session_01LnDpSjEhK5wS8sN1rH1p5c; bij de wissel kregen ze de nieuwe id. Kijk ook zelf met get_session.

## Bij de wissel (22:40) in behandeling

- Waar je nu bent (I-61, `claude/waar-je-nu-bent` 79397b0): Pathfinder: één moet voor main: de kaart zonder lus in de Briefing heeft touchAction none (RoutePanel.tsx:101 zonder onOpen, RouteMap.tsx:305) en blokkeert het scrollen; maak hem rustig (pan-y), tik kiest een punt, slepen en knijpen pas in de grote kaart. Later: dubbele "of kies hierboven Andere plek" weg zodra de kaart er staat (routeStart.ts:237, 242, 268), kortere zin bij approximate (219), midden op de weerplaats zegt dat de kaart globaal staat, I-62 hergebruikt askMapCenter en dezelfde kaart. Warden op Fable en Lookout (390/412 met nep-geolocatie) liepen nog als helpers in de vorige coördinator-chat; hun uitslag komt op `warden/waar-je-nu-bent-herstel` en `lookout/waar-je-nu-bent` (lookout.md). Lees die branches.
- Back-up telling (I-50, I-55, `claude/backup-telling` 74b5f18): Warden op Fable liep nog als helper; uitslag op `warden/backup-telling-herstel` (herstel.md). Daarna main (geen Lookout: niets zichtbaars).

## Stand 22:40 (coördinator session_01LnDpSjEhK5wS8sN1rH1p5c)

- Live vanavond op main: 09c716d Routes op reis (I-8), 8af3e43 Beginner heel licht 1 en 2 (I-18 loopt: stap 3), 91a4419 Ziek melden (I-48), e24d944 Back-up mag, dee69d9 Week samenhang (I-40 tot I-43), 701578c Forge nawerk (I-44, I-45), 9cdc1fb Import alleen nieuw (I-38), 9d035be Oud trainingsscherm (I-9, I-32), 5d68b87 Weer van de plek (I-37). Pushmelding gedaan; Werkkaart extra ronde 21:50.
- Bouwers (melden zich hier met create_trigger):
  - Waar je nu bent (I-61, session_01LnDpSnPGLTDDzKiyRqt4fW, `claude/waar-je-nu-bent`): eigenaar zag 21:42 "Je precieze plek is niet beschikbaar". Daarna Warden op Fable, Lookout, main. Eigenaar gevraagd of Precieze locatie in Android aan staat.
  - Back-up telling (I-50, I-55, session_01LnDpSnaiuj5CodXD7EQjxY, `claude/backup-telling`). Daarna Warden op Fable (opslag).
  - Wandeling plannen (I-62, eigenaar 21:52 "Nu bouwen", session_01LnDpSnTTMR2etYorSs1jNF, `claude/wandeling-plannen`): eigenaar 21:58: ingang via één + op Vandaag (vervangt Losse training; keuzeblad Training loggen / Wandeling plannen) en een rij in de tab Ascend; Losse training in twee stappen, eerst de sport (Wandelen, Hardlopen, Fietsen, Kracht, Anders), daarna duur en gevoel, de precieze soort optioneel. Blad met km-chips (5 standaard), hoogte optioneel, bestaande RoutePanel. Raakt RoutePanel net als I-61: wie later komt, cherry-pickt op main. Daarna Warden (Sonnet, planner niet geraakt), Lookout, Pathfinder.
- Zonder sportschool (I-64, session_01LnDpSjxNasmvW28wGx2sQr, `claude/zonder-sportschool-verplaatst`): eigenaar 22:00 zag Bovenlichaam A op wo 18 "verplaatst" binnen zijn periode zonder sportschool (14 t/m 18 nov). Oorzaak (naspelen met de back-up van 22:03): de eigenaar sleepte hem zelf op 10 november van ma 10 naar wo 18, in een al bestaande periode; een eigen vastzetting krijgt geen waarschuwing. Doorgegeven aan de bouwer. Planner: daarna Warden op Fable, Lookout, Pathfinder.
- IJkset (I-65, session_01LnDpSntCPZexgHzbzLTnkJ, `claude/ijkset-automatisch`): eigenaar 22:00 "mag van mij automatisch"; instelling met Vragen (advies), Automatisch erbij, Uit, en nooit bij ziek, zonder sportschool of vakantie. Na live: vragen of ik zijn stand op Automatisch zet (of hij doet het zelf).
- Back-up van de eigenaar: 15 november 22:03, in de scratchpad van session_01LnDpSjEhK5wS8sN1rH1p5c onder backup/b.json (chmod 600, alleen python -I). Ook bruikbaar voor I-63 maandag als hij dan nog vers genoeg is.
- Onderhoudsronde maandag (I-66): eigenaar 22:10 wil weten hoeveel van de engine dubbel of dood is; meten en in gewone taal melden.
- Eén regel voor uitzonderingen (I-67, eigenaar 22:15): Ontwerp klaar 22:18 (`claude/een-regel-uitzonderingen` f10b361, `docs/visie/Ontwerp een regel voor uitzonderingen.md`, alleen op die branch: mee naar main met de bouw): 12 gaten, één bestand engine/dayRules.ts, migratie in vijf stappen, plus een scan-test die losse toetsen laat falen. Twee vragen aan de eigenaar (zonder antwoord het advies). Cartographer gearchiveerd. Bouwen pas na I-64 en I-65 op main, met een verse bouwer op Opus high en Warden op Fable.
- Back-up kleiner (I-63): eigenaar 22:05 "maandag is prima": op het bouwmoment van maandag, met vooraf een verse back-up van hem.
- Wachter: eigenaar 21:20 "Nee" op laten staan. Zelf aanmaken blijft geweigerd (Undermining Oversight); hem gevraagd de taak zelf op deze chat te zetten en "staat" te zeggen. Dan trig_01CDpj9NsMnvoumE9kVDUPt3 uitzetten en session_01LnDpSnngzUAioWQ5b8xBWH archiveren.
- Alle bouwers van vanavond gearchiveerd, en alle worktrees in de scratchpad opgeruimd.
- Geleerd: (1) fire_trigger op de Werkkaart opent een lege chat zonder repo: extra ronde altijd met create_trigger op session_01LnDpSktfMxYFgMMgDhw8Do. (2) Bouwers met een oude basis: eigen commits cherry-picken op origin/main, nooit de boom squashen; conflicten in kennisindex met `npm run kennisindex`, bronnen.json als unie onder "documenten". (3) Bouwers maken eigen I-codes op een oude backlog: bij de squash de backlog van main houden; nacht = backlog van main plus backlog:bij. (4) Een korte hash vergelijken faalt bij 8 tekens: vergelijk op prefix. (5) `&` in een gewone Bash-aanroep sterft met de shell: lange controles met run_in_background. (6) Werk in /home/user/ascend altijd op de branch claude/nacht (git checkout -B claude/nacht origin/claude/nacht) en push met HEAD:claude/nacht: tussen 20:00 en 22:45 stond de map los en gingen vier updates verloren. (7) Een tijdtest (leavePlanAround) faalt als twee volle testrondes naast elkaar draaien.

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
