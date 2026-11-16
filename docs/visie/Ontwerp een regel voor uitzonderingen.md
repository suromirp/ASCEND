# Ontwerp: één regel voor alle uitzonderingen

Status: voorstel van Cartographer, 15 november. Er is geen code gewijzigd. Backlogpunt I-67.

Aanleiding: de eigenaar op 15 november, 22:15: "Maak die ene functie voor alle uitzonderingen." Die avond gingen drie dingen mis waar twee regels elkaar niet kenden. Een zelf versleepte sportschooltraining binnen een periode zonder sportschool kreeg geen waarschuwing. De ijkset kwam tijdens ziekte. Week telde op meerdere plekken anders.

Gelezen: CLAUDE.md, de kennisindex, de werkbriefjes planning en week, en in `src/engine/` en `src/storage/` elke plek die ziek, een periode, een race of een vaste afspraak toetst. De twee branches die in dit gebied bouwen (`claude/zonder-sportschool-verplaatst` en `claude/ijkset-automatisch`) stonden op het moment van schrijven niet op origin. Hun richting is daarom uit de opdracht genomen: een waarschuwing voor de versleepte training, geen ijkset bij ziek. Zie 3.7.

## 0. Het ongemakkelijke eerst

Eén functie lost dit niet op. De code heeft al drie pogingen tot die ene functie: `leave.ts#isAwayFor` ("de ene toets voor Week"), `sessionStatus.ts#isPausedFor` en `adviceShared.ts#raceWeekGuard` ("nooit een eigen venster"). Elk klopt, en toch ontstonden de fouten van vanavond, omdat een nieuwe stap (de ijkset, het slepen) gewoon zijn eigen toets schreef en niemand dat tegenhield.

Wat het wel oplost is de functie plus een slot erop: een scan in de tests die elke losse toets buiten dat ene bestand laat falen, zoals `src/engine/weekTelling.test.ts` nu al doet voor `isAwayDay`. Zonder die scan is dit over een maand de vierde poging.

Tweede punt: de functie mag niet alles worden. Hij beantwoordt alleen wat een dag over een training zegt. Wat twee trainingen over elkaar zeggen (48 uur tussen beendagen, frisse benen voor een test, een volle dag) blijft in `weekValidator.ts`. Trek je dat erbij, dan krijg je één bestand van duizend regels dat niemand durft te wijzigen.

## 1. Inventaris: wie past wat toe

Per uitzondering eerst waar hij woont, dan wie hem leest.

Ziek. Het feit: `illness.ts#activeIllness` en `isIllnessDay`. Gelezen door de tellingen (`sessionStatus.ts:92`, `weekLogs.ts:101`, `streak.ts:43`, `fullWeek.ts:113`, `missedTraining.ts:146` en `:241`), door de voorstellen als poort aan het begin (`adviceCompute.ts:53`, `adviceTestRun.ts:58`, `adviceWeek.ts:39`, `:167`, `:207`, `:247`, `fullWeek.ts:322`, `descentClock.ts:276`, `weatherSwap.ts:55`, `repeatWeek.ts:236`, `reentry.ts:125`, `morningProposal.ts:54`, `extraRun.ts:87`, `restWeek.ts:107`, `eveningBefore.ts:155`), door de dagkeuze van voorstellen (`adviceCompute.ts:322`, `adviceTestRun.ts:95` tot `:148`, `descentClock.ts:214`, `restDayBack.ts:66`, `directionStrength.ts:184`), door het verplaatsen (`moveSuggestions.ts:64`), door Week opnieuw plannen (`replanWeek.ts:57`) en door Vandaag (`pages/Today.tsx:172`).

Opbouw na ziek. Het feit: `illness.ts#recoveryRamp`. Gelezen door dezelfde poorten van de voorstellen en door `replanWeek.ts:61`. De duur loopt apart via `recoveryDurationAdjustments`.

Vakantie zonder training en tocht. Het feit: `leave.ts#leaveDays` met `RANK`. Vier afgeleide vragen in hetzelfde bestand: `isLeaveBlockedDay` (niets erbij), `isPauseDay` (pauze), `isAwayDay` (weg, ook zonder sportschool) en `isAwayFor` (telt als weg voor deze training). Gelezen door de ronde (`weekValidator.ts` regels LEAVE-OFF en LEAVE-LIGHT, `leaveBlock.ts`, `leaveAround.ts`), de tellingen (via `isAwayFor`), het verplaatsen (`moveSuggestions.ts:57` tot `:61`), en de toevoegers (`extraRun.ts:137`, `storage/weeklyPrescriptionStep.ts:134`, `kindAmount.ts:78`).

Zonder sportschool. De ronde: `noGym.ts#applyNoGymDays`. De telling: `leave.ts#isAwayFor`. Vaste afspraken: `fixedSports.ts:52`. Bergspieren: `mountainMuscles.ts:51` (eigen lijst `LEAVE_SKIP`). Hoeveel per soort: `kindAmount.ts:80` (eigen lijst).

Vrije dagen. Beperken niets; alleen `leaveBlock.ts` plaatst er iets en `lightDays` laat ze licht.

Afbouw en race. Het feit: `raceWindow.ts#isTaperDay`, `afterRaceGuard` en `adviceShared.ts#raceWeekGuard`. Gelezen door de tellingen en de voorstellen. De ijkset heeft een eigen venster (`calibration.ts:22`).

Rustdag, dag van het doel. `weekValidator.ts` (REST-DAY, GOAL-DAY) en `moveSuggestions.ts:62` en `:63`.

Golven, beginnersstart, rustige instap, rustige week. `programLayout.ts`, `waves.ts`, `beginnerStart.ts`, `reentry.ts`, `restWeek.ts`. Alleen de planning en `extraRun.ts:259` lezen ze.

Vaste afspraken. `fixedSports.ts`; `catchUp.ts:30` en `replanWeek.ts:78` laten ze met rust.

Krachttraining uit. `strengthTraining.ts#strengthAllows`, gelezen op twee plekken: `sports.ts:166` en `storage/weeklyPrescriptionStep.ts:124`.

## 2. De gaten

Twaalf gevonden. Bij elk hoe zeker het is.

1. Zonder sportschool bij slepen, verplaatsen en ruilen. Zeker. `moveSuggestions.ts:56` tot `:66` (`keptDayReason`) kent vakantie, tocht, licht, rustdag, doel en ziek, maar geen zonder sportschool. Slepen (`weekDrag.ts:115`), ruilen (`weekSwap.ts:71`) en de voorgestelde dagen lezen alleen die functie. Een sportschooltraining valt dus stil in de periode. Geen test in `weekDrag`, `weekSwap` of `moveSuggestions` noemt de periode. Dit is fout één van vanavond.

2. Zonder sportschool in Let op. Zeker. `weekValidator.ts:45` tot `:60` heeft geen regel voor een sportschooltraining in zo'n periode. Een training met jouw slot laat `applyNoGymDays` staan, en alleen het voorstel zelf zegt dat één keer (`leaveProposal.ts:249`). Daarna zwijgt alles.

3. De ijkset bij ziek en bij opbouw na ziek. Zeker. `calibration.ts:37` tot `:54` leest alleen geplande tochten, tests en wedstrijden; `components/forge/ForgeWorkout.tsx:657` geeft ook niets anders mee. `calibration.test.ts` heeft geen geval met ziek. Dit is fout twee.

4. De ijkset heeft een eigen venster. Zeker. Drie dagen of dezelfde week (`calibration.ts:22` en `:39`), naast de zeven dagen van `raceWeekGuard`. Het werkbriefje planning verbiedt een eigen venster rond een race. Rustige instap, een lichte golfweek en de beginnersstart kent hij ook niet: een set tot bijna falen in een week die bewust licht is.

5. Ziek bestaat in vier versies. Zeker. `moveSuggestions.ts:64` houdt alles tegen tot en met morgen, welke soort ook. `replanWeek.ts:57` tot `:67` houdt bij neus of keel alleen zwaar tegen. `pages/Today.tsx:172` tot `:177` doet hetzelfde maar in een pagina, tegen de regel dat logica in `engine/` staat. `directionStrength.ts:184` heeft een vijfde vorm. Gevolg: met neus of keel mag een rustige loop vandaag wel gedaan worden, maar niet naar morgen gesleept.

6. Opbouw na ziek bij verplaatsen en in Let op. Zeker. `keptDayReason` kent `recoveryRamp` niet, `weekValidator.ts` kent ziek helemaal niet. Een zware training sleep je stil naar een dag voor `heavyFrom`, terwijl Week opnieuw plannen hem daar tegenhoudt (`replanWeek.ts:65`).

7. De reeks telt anders dan Week. Zeker. `streak.ts:41` tot `:46` kent ziek en wat een periode liet vervallen, maar roept `deriveSessionStatus` zonder periodes, afbouw of open concept aan. Een vastgezette training op een vakantiedag is in Week "weg" en breekt in Stand de reeks. `streak.test.ts` heeft geen geval met een periode. Dit is een deel van fout drie.

8. Iets erbij in een periode zonder sportschool: drie antwoorden. Zeker. `kindAmount.ts:78` tot `:81` zegt nee op elke dag van de periode. `extraRun.ts:137` en `storage/weeklyPrescriptionStep.ts:134` lezen `isLeaveBlockedDay` en zeggen ja.

9. Het weekvoorschrift kent ziek niet. Waarschijnlijk. `storage/weeklyPrescriptionStep.ts` noemt ziek en opbouw nergens; `blockedDay` (`:134`) kent alleen doel, race, vakantie en tocht. Of een eerdere stap het al tegenhoudt is niet nagelopen.

10. Vervallen en toch inhalen. Waarschijnlijk. `catchUp.ts:18` tot `:31` en `weekDrag.ts:27` tot `:38` kennen `isPausedFor` niet. Een training die op een zieke dag verviel ("haal je niet in") weigert de engine niet als inhaal. Of het scherm de greep toont is niet nagelopen.

11. De opbouw na ziek ontbreekt in twee poorten. Zeker dat hij ontbreekt, het gevolg is waarschijnlijk klein. `extraRun.ts:87` toetst zelf of een ziekte loopt en `morningProposal.ts:54` alleen `activeIllness`; de andere elf poorten toetsen ook `recoveryRamp`.

12. Krachttraining uit. Te bevestigen. `strengthAllows` wordt op twee plekken gelezen. De ijkset, het voorstel voor bergspieren, hoeveel per soort en inhalen lezen hem niet.

Dubbel zonder dat het nu fout gaat: `fullWeek.ts:113` bouwt `isPausedFor` na; `missedTraining.ts:241` doet het in twee stappen; `descentClock.ts:214` heeft een eigen lijst van dagen; `mountainMuscles.ts:51` en `kindAmount.ts:80` hebben elk een eigen lijst van soorten periodes; de poort `activeIllness(...) || recoveryRamp(...)` staat elf keer letterlijk.

## 3. Het ontwerp

### 3.1 Twee lagen, één bestand

`src/engine/dayRules.ts`, puur: geen React, geen opslag, geen klok. Vandaag komt mee als invoer.

Laag één zijn de feiten: wat geldt er op deze dag. `dayFacts(stand)` rekent één keer uit en geeft per datum een lijst oorzaken op volgorde van voorrang. Dit is `leaveDays` met `RANK`, uitgebreid met ziek, opbouw, afbouw, doel, rustdag en de lichte weken.

Laag twee is het oordeel: `mayOn(vraag, feiten)`. Een vaste tabel van oorzaak maal stap. Geen gewichten, geen score, geen volgorde die van eerdere aanroepen afhangt. Dezelfde invoer geeft altijd hetzelfde antwoord.

### 3.2 De invoer

De vraag: de datum; de stap; het sjabloon (voor zwaar, sportschool nodig, test, race, kracht); de geplande sessie als die er al is (voor het slot en het merk van een periode); en wie het doet, de eigenaar of ASCEND.

De stappen: plaatsen door de ronde, erbij (extra training, weekvoorschrift, hoeveel per soort, heuvelloop), verplaatsen (slepen, het blad, ruilen, een voorstel dat verplaatst), inhalen, een set erbij in Forge (de ijkset en wat daarna komt), voorstellen (mag ASCEND vandaag iets voorstellen) en tellen (telt dit als gemist).

De stand: vandaag, periodes, ziekmeldingen, racedagen, de dag van het doel, de rustdag, vaste afspraken, de rustige instap, de plek in het programma (golfweek, beginnersstart), krachttraining aan of uit, en de sjablonen. Het type dwingt af dat wie periodes meegeeft ook sjablonen meegeeft, zoals `PauseContext` nu doet.

### 3.3 De uitvoer

Mag, of een van vijf uitkomsten met de oorzaak, de reden in gewone taal en de andere oorzaken die ook golden:

- vervalt: de training gaat van de planning en telt niet als gemist.
- vervang: door een ander sjabloon of een kortere versie (eigen gewicht, de korte loop).
- verplaats: hij hoort op een andere dag; de aanroeper zoekt welke.
- waarschuw: hij blijft staan, met een regel in Let op en bij het loslaten.
- weiger: deze stap gebeurt niet (ASCEND stelt het niet voor, de dag is niet te kiezen).

De reden komt uit één tabel met teksten per oorzaak, in de stem van ASCEND. De teksten van `weekDrag.ts` (`BLOCKED_TEXT`), `weekSwap.ts` (`KEPT_LINE`) en `ILLNESS_GUIDANCE` verhuizen daarheen, zodat slepen, ruilen en Let op hetzelfde woord gebruiken.

### 3.4 Voorrang

Van sterk naar zwak. De eerste die iets zegt over deze stap wint; de rest staat erbij als bijzaak.

1. Historie: voorbij of gelogd. Nooit aangeraakt.
2. Op of na de dag van het doel.
3. Ziek met koorts of buikgriep: alles.
4. Vakantie zonder training.
5. Tocht.
6. Racedag en afbouw.
7. Ziek met neus of keel, en opbouw na ziek: alleen wat zwaar is.
8. Licht rond een tocht: alleen wat zwaar is.
9. Zonder sportschool: alleen wat de sportschool nodig heeft.
10. Krachttraining uit: alleen kracht.
11. Rustige instap, lichte golfweek, beginnersstart, rustige week: alleen erbij en een set erbij.
12. Rustdag.
13. Vaste afspraak.
14. Vrije dagen: beperken nooit.

Ziek staat boven vakantie omdat het advies dan over gezondheid gaat en niet over de agenda. De volgorde van 4, 5 en 9 is die van `RANK` nu en verandert niet.

### 3.5 Wat de eigenaar zelf vastzette

Een training met jouw slot (`lockLevel` 1 door de gebruiker) krijgt nooit vervalt, vervang of verplaats. De uitkomst wordt waarschuw, met de reden en "Je zette hem zelf hier." Alleen historie is sterker.

Bij een stap die de eigenaar nu zet (slepen, ruilen) blijft wat vandaag hard is ook hard: een vakantiedag, een tochtdag, op of na het doel, ziek met koorts. Daar is de dag niet te kiezen. Dat verandert dit ontwerp niet. Wat erbij komt (zonder sportschool, opbouw na ziek, neus of keel bij een zware training) is een waarschuwing met Akkoord: het blad zegt de reden, Liever niet is de hoofdknop, Toch verplaatsen de tweede. Daarna staat de regel in Let op.

Open punt voor de eigenaar, zie 5: Let op meldt een rij met jouw slot nu alleen met `reportYours`, en die staat standaard uit.

### 3.6 Wat via Akkoord gaat

De functie schrijft niets en plant niets. Hij zegt alleen wat geldt. De aanroeper houdt zich aan drie regels:

- Vervalt, vervang of verplaats voor een rij die al opgeslagen is: altijd een voorstel met Akkoord, zoals nu bij ziek melden en bij een periode.
- Waarschuw is alleen tekst.
- Weiger voor een stap van ASCEND is stil: het voorstel komt niet. Weiger voor een stap van de eigenaar geeft de reden op de dag.

De ronde (`planPass`) mag zijn eigen rijen (slot 3) blijven herstellen zoals nu; hij leest alleen de feiten uit dezelfde bron.

### 3.7 De twee lopende branches

De versleepte training: de waarschuwing die daar gebouwd wordt is oorzaak 9 bij de stap verplaatsen, voor de eigenaar. Bouwt die branch een eigen toets in `keptDayReason` of `weekValidator`, dan is dat goed als tussenstap; stap 2 van de migratie neemt hem over. Verzoek aan die bouwer: de tekst op één plek, niet in `weekDrag.ts` en `weekSwap.ts` apart.

De ijkset: wat daar gebouwd wordt is oorzaak 3 en 7 bij de stap een set erbij. Verzoek aan die bouwer: geef `calibrationBlock` de ziekmeldingen en vandaag mee als invoer in plaats van in `ForgeWorkout.tsx` te toetsen, dan is stap 3 van de migratie het vervangen van één functie.

## 4. Migratie

Vijf stappen, elk los naar main, van weinig risico naar veel.

Stap 0, de functie zonder aanroepers. `dayRules.ts` met een tabeltest (elke oorzaak maal elke stap, plus elke combinatie van twee oorzaken voor de voorrang) en een vergelijking over willekeurige standen: het nieuwe antwoord is gelijk aan `isAwayFor`, `isPauseDay`, `isLeaveBlockedDay`, `isPausedFor`, `keptDayReason` en `illnessHeld`, behalve op de gaten uit 2, die elk met naam in de test staan. Vorm: `src/engine/wardenWeekProef.test.ts`. Niets beweegt.

Stap 1, tellen. `isPausedFor`, `fullWeek.ts:113`, `missedTraining.ts:241`, `streak.ts` en `weekLogs.ts#leftOutOfCount` lezen de stap tellen. Vangnet: `weekTelling`, `wardenWeekProef`, `vakantieZiekGemist`, `missedTraining`, `conceptLooptNog`, en de invarianten op de tekstkaart (stand zonder-sportschool en ziek-eerder). Zichtbaar verschil: de reeks in Stand volgt Week (gat 7). De planning wordt niet geraakt, de golden test kan niet bewegen.

Stap 2, wat de eigenaar verplaatst. `keptDayReason` wordt een dunne schil en verdwijnt daarna; `weekDrag.ts`, `weekSwap.ts` en `suggestMoveDates` lezen de stap verplaatsen; `weekValidator.ts` krijgt één regel die waarschuw doorgeeft aan Let op. Dicht: gat 1, 2, 5, 6 en 10. Vangnet: `weekDrag`, `weekSwap`, `moveSuggestions`, `week*`, `catchUp`, tekstkaart met elk verschil verklaard. De golden test beweegt niet: de nieuwe regel meldt alleen en herstelt niets.

Stap 3, Forge. `calibrationBlock` leest de stap een set erbij. Dicht: gat 3, 4 en het deel kracht uit van 12. Vangnet: `calibration.test.ts` uitgebreid met ziek, opbouw, raceweek en lichte week.

Stap 4, wat ASCEND voorstelt. De elf poorten worden één aanroep van de stap voorstellen; de dagkeuzes (`adviceCompute.ts:322`, `adviceTestRun.ts`, `descentClock.ts:214`, `restDayBack.ts:66`, `directionStrength.ts:184`, `weatherSwap.ts:75`, `extraRun.ts:137`, `weeklyPrescriptionStep.ts:134`, `kindAmount.ts:78`) lezen erbij of verplaatsen. Dicht: gat 8, 9 en 11. Gat 8 vraagt eerst een keuze, zie 5. Vangnet: de tests van elk advies, `descentClock`, `extraRun`, `openingPingpong`, `weeklyPrescriptionRepeat`, twee keer `planPass` achter elkaar. Golden A en C bewegen niet. B mag alleen bewegen als de keuze bij gat 8 dat verklaart, met de reden in de commit.

Stap 5, de ronde. `weekValidator.ts` (LEAVE-OFF, LEAVE-LIGHT, REST-DAY, GOAL-DAY), `noGym.ts` en `replanWeek.ts#illnessHeld` lezen de feiten uit `dayFacts`. Hun eigen herstel blijft. Dit is het grootste risico en levert het minste op: de ronde klopt nu al. Advies: alleen doen als stap 0 tot 4 stil zijn gebleven, en anders laten.

Na elke stap: de scan. Een test die faalt als een bestand buiten `dayRules.ts` en de bronbestanden zelf (`leave.ts`, `illness.ts`, `raceWindow.ts`) een van de oude toetsen aanroept. De lijst met toegestane uitzonderingen wordt per stap korter.

### Wat weg kan

Na stap 1: de samenstelling in `fullWeek.ts:113`, de twee filters in `missedTraining.ts:241`, de eigen lijst `neutral` in `streak.ts`.
Na stap 2: de inhoud van `keptDayReason`, `BLOCKED_TEXT` en `KEPT_LINE` als aparte tabellen, `allowedWhileIll` uit `pages/Today.tsx`.
Na stap 3: `LEAD_DAYS` en de lus over geplande sessies in `calibration.ts`.
Na stap 4: elf keer dezelfde poort, `awayOn` in `adviceShared.ts`, `blockedByLeave` in `kindAmount.ts`, `LEAVE_SKIP` in `mountainMuscles.ts`, de eigen lijst in `descentClock.ts:214`, en `isLeaveBlockedDay`, `isPauseDay` en `isAwayDay` als uitvoer van `leave.ts`.
Na stap 5: `illnessHeld`.

## 5. Vragen aan de eigenaar

Twee keuzes die het ontwerp niet zelf kan maken.

Let op bij wat je zelf vastzette. Advies: de waarschuwing bij het loslaten komt altijd, en de regel in Let op komt ook altijd voor ziek en zonder sportschool, los van `reportYours`. Anders is de fout van vanavond met de standaardinstelling nog steeds onzichtbaar. Het andere antwoord: alles achter `reportYours`, consequent met de rustdag, maar dan standaard stil.

Iets erbij in een periode zonder sportschool. Advies: niets erbij van ASCEND, behalve de ene heuvelloop die de periode zelf plaatst. Dat is wat `kindAmount.ts` nu doet en wat het besluit van 9 november zegt ("je traint bewust minder"). Het andere antwoord: een loop mag erbij, alleen kracht niet. Dit bepaalt of golden B in stap 4 beweegt.

Zonder antwoord bouwt stap 0 tot 3 gewoon door; alleen stap 4 wacht op de tweede vraag.

## 6. Niet gecontroleerd

- De twee lopende branches zijn niet gelezen; ze stonden niet op origin.
- Gat 9, 10 en 12 zijn uit de code gelezen en niet met een test nagespeeld.
- Componenten zijn alleen nagelopen waar een engine-functie ernaar wees (`Today.tsx`, `ForgeWorkout.tsx`); een losse toets diep in een ander scherm kan gemist zijn. De scan uit stap 0 vindt die.
