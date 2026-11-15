# Overdracht coördinator ASCEND

Bijgewerkt: 15 november 2026, 14:20 Portugese tijd, door de coördinator session_01LnDpSnngzUAioWQ5b8xBWH (overgenomen van session_01LnDpSkfdHZiUDTtrj7CB8T om 14:13). Oudere versies: git-geschiedenis van dit bestand. Vragen, stuk en live voor de eigenaar: `eigenaar.md`.

## Vaste afspraken

- Tijden aan de eigenaar in Portugese tijd (Europe/Lisbon) tot woensdag 18 november, daarna Amsterdamse tijd; nooit UTC.
- Stijl Jarvis met "meneer"; vragen apart onderaan onder **Vraag aan u**, advies voorop, wat er zonder antwoord gebeurt.
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
- Wachter elk uur op :40: aanmaken op deze sessie weer geweigerd (14:13); gevraagd aan de eigenaar. De oude (trig_01Y6Gb6hgELCGn9XV2EAkMny) staat uit, zodat de vorige coördinator niet naast mij handelt. Tot dan dekt Bouwers nakijken het uur.
- Werkkaart elk uur op :20: eigen sessie session_01LnDpSktfMxYFgMMgDhw8Do (trig_01JoRN6XzHJ17frpcWQAdEzB). Niet aanraken, niet archiveren.
- Volgende wissel: send_later 16 november 04:47 [Europe/Amsterdam] staat (trig_01Eu5zZc9REdsU1VGyWCvjFe).

## Live vandaag

- 4de3367 (12:20): Q instellingen terug met Akkoord, kracht uit, wandelen in vaste bpm, kennisindex. Deploy en Android groen.
- b2439653 (13:15): kracht en bpm netjes in Instellingen, weesregel Stand, backlog met codes en `npm run backlog:bij`. Deploy en Android groen.

## Lopend (14:20)

- Wardens op Fable gestart om 14:14, elk pusht herstel.md op warden/<onderwerp>-herstel: Afbreker session_01LnDpSidQYFbuC9fh8bb9mt, Back-up session_01LnDpSktRyJ9tNDAW6X7ZhL, Beginner session_01LnDpSiJcwFr9G6m4KfgPCx (herstel 024d057 was al klaar).
- Kennisindex ronde 2 (3f21610) door mij nagekeken en op nacht (762632f): deels ingehaalde besluiten apart met "Geldt nog", test groen; kaart:vergelijk overgeslagen (raakt alleen docs/kennisindex en het script; duurt meer dan tien minuten). Gaat mee met de volgende main. Sessie gearchiveerd.

- Week telling (I-1), Sherpa session_01LnDpSihpwmNKme8Mudp1nF (`claude/week-telling`): Warden (Opus) en Pathfinder akkoord. Laatste ronde loopt: `openToday` in adviceWeek telt alleen wat Week open noemt (sportschooltraining in de periode houdt het voorstel niet tegen), "gemist" krimpt niet op 360 px, een gemiste rij heeft altijd het woord. Daarna: proefmerge, volle controles, Lookout op 360 en 412 px (week-aangepast en de stand zonder-sportschool), main. Eigen blik op de afdrukken.
- Back-up eerste keer, Sherpa session_01LnDpSnNF5icymXAJ1Rc6xC (`claude/backup-eerste-keer`): tweede herstel loopt. Blokkerend was: `verify` na een gelukte rename haalt bij een leesfout de complete back-up weg (`manualBackup.ts`, `autoBackup.ts`, `backupFolder.ts`). Ook op main zit dat (manualBackup regel 43): waarschijnlijk de kern van de melding van de eigenaar. Na het herstel een frisse Warden op Fable (laat hem renameFile van ionfilesystem 1.1.1 nabouwen: het doel gaat eerst weg). Daarna main en de eigenaar een toesteltest geven: Gedwongen stoppen, openen, meteen Back-up maken, de zin letterlijk noteren, in Documents/ASCEND kijken welke bestanden er van die minuut staan, drie keer, één keer met twee snelle tikken, daarna het nieuwste bestand terugzetten.
- Beginner heel licht stap 1 en 2, Sherpa session_01LnDpSk5RjwPEFvrRzyLnjW (`claude/beginner-licht`): herstel loopt (rem na week 4 leest de langste echte sessie; wissel via Akkoord optioneel). Daarna een frisse Warden op Fable (let op de planGolden-foto: A en C bewegen niet), dan Lookout en Pathfinder. Daarna stap 3.
- Afbreker randgevallen (I-4), Sherpa session_01LnDpSmcBhQfQpy5MYTXTbi (`claude/afbreker-rand`, ba0e481): Warden op Fable liep in de oude sessie. Start een frisse Warden op Fable (punt 3, de dag van de laatste set, raakt historie). Daarna Lookout.
- Weekbudget bij kracht uit (I-39): `claude/weekbudget-kracht` (645d59f), door mij nagekeken, klaar voor main samen met Afbreker. Sessie gearchiveerd.
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
