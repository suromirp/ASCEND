# ASCEND QA-rapport: bugs

Datum van de test: zaterdag 3 oktober 2026 (tijdzone Europe/Amsterdam). Getest met Playwright (Chromium) op 390x844 en 360x780, steeds met een verse IndexedDB zodat het demoprogramma opnieuw wordt geseed. Waar een andere dag nodig was is de klok in de browser vastgezet (bijvoorbeeld maandag 5 oktober of 00:30 's nachts).

Alle scripts staan in `/tmp/claude-0/-home-user-ASCEND/ad6ded69-be17-5801-b543-86d3d2b5c25f/scratchpad/audit/bugs/` (s1.js t/m s30.js, met `lib.js` en `check48.js` als hulpjes). Screenshots staan in de submap `shots/`.

`npx vitest run`: 60 bestanden, 561 tests, allemaal groen. `npx tsc -b`: geen fouten. `npm run lint`: alleen 2 waarschuwingen over fast refresh, geen fouten. Er waren geen consolefouten of pageerrors van de app zelf. De enige fout in de console was een font of extern bestand dat niet laadde door het certificaat van de testomgeving (`ERR_CERT_AUTHORITY_INVALID`). Dat komt door de sandbox en is geen bug.

Elke bug hieronder is minstens één keer gereproduceerd in de browser, tenzij er "codeanalyse" bij staat.

---

## HOOG

### 1. Een krachtblok van 4x per week zet Lower A en Lower B elke week op twee opeenvolgende dagen
- Ernst: hoog. Dit schendt de 48-uursregel uit CLAUDE.md, en de planner doet het zelf.
- Stappen: Ascend, KRACHTPROGRAMMA, SCHEMA AANPASSEN. Zet sessies per week op 4, vink Lower B aan, kies twee keer VOLGENDE en dan BLOK ACTIVEREN. Bekijk de planning vanaf week +2. Tik daarna ook op NU AL TOEPASSEN en BEVESTIGEN.
- Wat er gebeurt: in elke week vanaf 12 oktober staat Lower A op woensdag en Lower B op donderdag (14+15 okt, 21+22 okt, enzovoort, 14 weken lang). Met "Nu al toepassen" komt Lower B ook op zaterdag 3 oktober, de dag voor de Lange Duurloop van zondag, en op donderdag 8 oktober na Lower A van woensdag 7. Mijn controlescript vond 16 paren zware beensessies binnen 24 uur.
- Wat er zou moeten gebeuren: de plaatsing mag nooit twee zware beensessies binnen 48 uur zetten, behalve het bedoelde paar heuvelintervallen op zaterdag en lange duurloop op zondag.
- Vermoedelijke oorzaak: `src/engine/weekReconciliation.ts`. De hardValidDatesProvider (rond regel 209-223, ook bij de reflow rond regel 392-405 en bij de swap-kandidaat op regel 97) controleert alleen `dayHasRoomFor` en niet `findHeavyConflict`. De beenbelasting telt alleen mee in de score van `candidatePlacement.ts`, als zachte factor.

### 2. Verplaatsen met cascade lost maar één botsing op en meldt dan toch "opgelost"
- Ernst: hoog, want de 48-uursregel wordt geschonden zonder dat de gebruiker het merkt.
- Stappen (klok op ma 5 okt): Week, Heuvel-/Incline-Intervallen, "andere dag kiezen", vr 9 okt. Dat wordt direct toegepast. Kies daarna Lange Duurloop, "andere dag kiezen", do 8 okt, en dan TOEPASSEN.
- Wat er gebeurt: in de dialoog staat alleen "Heuvel-/Incline-Intervallen 9 → 10 oktober, Zware training voor benen hoort ongeveer 48 uur uit elkaar te liggen". Het resultaat is Lower A op wo 7 okt en Lange Duurloop op do 8 okt: twee zware beensessies op opeenvolgende dagen, zonder enige waarschuwing.
- Wat er zou moeten gebeuren: alle botsingen rond de doeldag horen in het voorstel te staan. Kan dat niet, dan hoort het voorstel als onopgelost getoond te worden.
- Vermoedelijke oorzaak: `src/engine/scheduler.ts` regel 111. `findHeavyConflict` gebruikt `sessions.find` en geeft dus maar één botsing terug. `proposeMove` (rond regel 247-330) verschuift alleen die ene sessie.
- Screenshot: `shots/week_double_conflict.png`

### 3. Snel dubbeltikken bij afvinken in MacroFactor-modus maakt twee logs voor dezelfde sessie
- Ernst: hoog. De data wordt verdubbeld.
- Stappen (klok op di 6 okt): Meer, Training, zet "Bijgehouden in MacroFactor" aan. Ga naar Today en dubbeltik op NORMAAL bij Upper A.
- Wat er gebeurt: er komen 2 SessionLogs met hetzelfde `plannedSessionId`. Via "ongedaan maken" verdwijnt er maar één, want `undoLog` haalt alleen de eerste weg.
- Wat er zou moeten gebeuren: de knoppen moeten uitgeschakeld zijn terwijl het opslaan loopt, of `logSession` moet weigeren als er al een log voor die geplande sessie bestaat.
- Vermoedelijke oorzaak: `src/components/TodayMissionCard.tsx` regel 87 en `src/components/SessionActionSheet.tsx` regel 147. Daar is geen busy-status. Ook `src/state/AppDataContext.tsx` `logSession` (rond regel 905) heeft geen guard. Het formulier in ExerciseLogger heeft wel `saving`.
- Screenshot: `shots/quick_complete_double.png`

### 4. "Schone start, deze week is week 1" verdubbelt de sessie die vandaag al gelogd is
- Ernst: hoog. Er ontstaat een dubbele sessie en Today vraagt opnieuw om dezelfde training.
- Stappen: Today, SESSIE STARTEN, VOLTOOIEN. Ga daarna naar Meer, Training, OPNIEUW BEGINNEN BIJ WEEK 1, kies Schone start en "Deze week is week 1", en BEVESTIGEN.
- Wat er gebeurt: deze week bevat 8 sessies, waarvan twee keer Heuvel-/Incline-Intervallen op za 3 okt. De ene is gelogd, de andere is nieuw. Today toont de nieuwe als missie (SESSIE STARTEN) en de tip "Heuvel-/Incline-Intervallen en Heuvel-/Incline-Intervallen staan vandaag beide gepland".
- Wat er zou moeten gebeuren: een sessie die vandaag al gelogd is, mag niet opnieuw worden aangemaakt.
- Vermoedelijke oorzaak: `src/storage/database.ts` `rebuildPlanningFromWeekOne` (rond regel 782-815). De cutoff is `todayISO()`. Gelogde sessies worden terecht niet verwijderd, maar de nieuwe sessies voor `date >= cutoff` worden toch aangemaakt (regel 811). `resetScheduleToDefault` heeft hetzelfde patroon (regel 759).
- Screenshot: `shots/restart_clean_this_week.png`

### 5. Een sessie naar een andere week verplaatsen laat haar in beide weken meetellen
- Ernst: hoog. Tellingen en totalen kloppen niet meer.
- Stappen: Today, VERPLAATSEN, "andere dag kiezen", di 6 okt (volgende week), TOEPASSEN.
- Wat er gebeurt: `weekStartDate` blijft 2026-09-28. Today toont nog steeds "WEEK 0 / 7", terwijl de sessie uit deze week weg is. Week toont voor deze week "6u 30m gepland" terwijl de zichtbare sessies samen 5u 50m zijn: de verplaatste 40 minuten tellen mee. Volgende week telt ze ook mee (7u 25m).
- Wat er zou moeten gebeuren: na een verplaatsing hoort de sessie alleen bij de week van haar nieuwe datum.
- Vermoedelijke oorzaak: `src/state/AppDataContext.tsx` `applyProposal` (rond regel 1044-1050) en `applyNoTimeToday` (rond regel 1354) werken `weekStartDate` niet bij. `src/engine/proposalEngine.ts` `applyPlanChangeItems` (move/swap) doet dat ook niet. `sessionsForWeek` (regel 900) neemt zowel `weekStartDate` als `mondayOfWeek(scheduledDate)` mee, dus de sessie verschijnt in beide weken. De suggesties (`moveSuggestions.ts`) bieden zelf dagen in volgende week aan.
- Screenshots: `shots/week_after_cross_move.png`, `shots/week_next_after_cross_move.png`, `shots/today_after_cross_week_move.png`

### 6. Marathondoel: een datum die via de wizard is ingesteld, verdwijnt bij een tik op HALVE of HELE
- Ernst: hoog. De datum gaat stil verloren.
- Stappen: Ascend, MARATHON DOEL, HALVE. Kies DOEL AANPASSEN, Doeldatum 11-04-2027, VOLGENDE, VOLGENDE, DOEL ACTIVEREN, SLUITEN. Tik daarna op HELE (42,2 KM).
- Wat er gebeurt: na de wizard staat de TrainingGoal op active met 2027-04-11, maar de kaart toont geen aftelling ("nog X dagen"), omdat die uit `settings.marathonTargetDate` leest. Na de tik op HELE is het doel weer `paused` zonder targetDate, en staat er weer "Gepauzeerd, nog geen streefdatum ingesteld".
- Wat er zou moeten gebeuren: de wizard en de snelkeuze moeten dezelfde bron gebruiken, zodat een ingestelde datum blijft staan.
- Vermoedelijke oorzaak: `src/pages/Ascend.tsx` regel 417 (de aftelling leest uit settings) en regel 473. `src/state/AppDataContext.tsx` `updateMarathonGoal` (regel 1233) bouwt het doel opnieuw op uit AppSettings en overschrijft daarmee de datum uit de wizard. `activateGoal` werkt de settings niet bij.
- Screenshot: `shots/marathon_after_wizard.png`

---

## MIDDEL

### 7. Bij een verse installatie begint het programma op de maandag van deze week, met "gemiste" sessies van vóór de installatie
- Ernst: middel. Iedere nieuwe gebruiker loopt hier op de eerste dag tegenaan.
- Stappen: open de app op zaterdag in een verse browser.
- Wat er gebeurt: ma tot en met vr van deze week staan met "!" (gemist) in Week. De coach toont 4 adviezen ("Easy Run van do 1 oktober gemist", "Kracht: 0 van 3 sessies afgevinkt"). Consistentie staat op 0%, readiness op 33%. History toont "Gemist 2" in oktober en 3 in september.
- Wat er zou moeten gebeuren: week 1 begint vandaag of aankomende maandag, of dagen vóór de installatie tellen niet mee. De commentaarregel zegt zelf: "Start op de eerstvolgende maandag zodat Week 1 (WENNEN) meteen aansluit bij vandaag".
- Vermoedelijke oorzaak: `src/data/defaultProgram.ts` regel 277: `const startDate = mondayOfWeek(todayISO())`.
- Screenshot: `shots/today_fresh.png`

### 8. Na twee dagen ziek toont Today gewoon weer de training, terwijl de kaart zegt dat die van de planning is
- Ernst: middel. De tekst en het gedrag spreken elkaar tegen.
- Stappen: klok op za 3 okt, "Niet fit?", "Koorts of klachten onder de nek". Zet de klok op di 6 okt en herlaad.
- Wat er gebeurt: de ZIEK-kaart zegt "Rust. Je trainingen van vandaag en morgen zijn van je planning gehaald", maar daaronder staat "VANDAAG Upper A, SESSIE STARTEN".
- Wat er zou moeten gebeuren: zolang de ziekmelding actief is, hoort een sessie van vandaag niet als missie te verschijnen, of moet de planning elke dag worden bijgewerkt.
- Vermoedelijke oorzaak: `src/engine/illness.ts` `planIllnessStart` (regel 91-120) haalt alleen vandaag en morgen eraf, en alleen op het moment van melden. Daarna gebeurt er niets meer.
- Screenshot: `shots/ill_day4_today.png`

### 9. "Ongedaan maken" na "Toch koorts of klachten onder de nek?" wist de hele ziekmelding
- Ernst: middel. Ongedaan maken doet hier meer dan het zou moeten.
- Stappen: "Niet fit?", "Verkouden, alleen boven de nek", dan "Toch koorts of klachten onder de nek?", dan "Ongedaan maken" in de melding.
- Wat er gebeurt: `illnessEpisodes` wordt leeg. De gebruiker is dus helemaal niet meer ziek, maar Heuvel-/Incline-Intervallen en Lange Duurloop blijven op "overgeslagen" staan. Die waren door de eerste melding geschrapt. De coach stelt nu voor om gemiste sessies in te halen.
- Wat er zou moeten gebeuren: alleen het soort ziekte terugzetten naar "boven de nek".
- Vermoedelijke oorzaak: `src/state/AppDataContext.tsx` regel 398. Bij `illness_reported` worden alle open episodes met de startdatum van vandaag weggefilterd, ook als de melding alleen het soort ziekte veranderde (`reportIllness`, rond regel 1191-1200).
- Screenshot: `shots/illness_after_undo_now.png`

### 10. Een ziekmelding ongedaan maken tussen 00:00 en 02:00 laat de ziekte actief staan
- Ernst: middel. Dit is een tijdzonefout.
- Stappen: klok op zo 4 okt 00:30 CEST, "Niet fit?", Buikgriep, "Ongedaan maken".
- Wat er gebeurt: de sessies komen terug (Lange Duurloop staat weer als missie), maar de episode blijft bestaan en de ZIEK-kaart blijft staan.
- Wat er zou moeten gebeuren: de ziekmelding verdwijnt samen met de planningswijziging.
- Vermoedelijke oorzaak: `src/state/AppDataContext.tsx` regel 398 vergelijkt `e.startDate` (lokale datum) met `recentChange.createdAt.slice(0, 10)`. Die waarde is UTC en dus nog 3 oktober.
- Screenshot: `shots/illness_undo_after_midnight.png`

### 11. "Ongedaan maken" na het uitzetten van een sport zet de sessies terug, maar de schakelaar blijft uit
- Ernst: middel. Instelling en planning lopen uit elkaar.
- Stappen: Meer, Training, zet Hardlopen uit, NU TOEPASSEN, en tik dan op "Ongedaan maken".
- Wat er gebeurt: alle 31 geschrapte loopsessies komen terug, maar `enabledSports.running` blijft `false` en de schakelaar staat uit. Een volgende schone start of weekplanning haalt ze dan weer weg. Hetzelfde geldt voor "x per week" en voor de trainingstijd per dag: undo zet alleen de sessies terug, nooit de instelling.
- Wat er zou moeten gebeuren: ongedaan maken zet ook de instelling terug.
- Vermoedelijke oorzaak: `src/pages/Settings.tsx` `handleSportToggle` (regel 163-165) slaat de instelling op vóór `route()`. `undoRecentChange` in `AppDataContext.tsx` (regel 391) herstelt alleen PlannedSessions.
- Screenshots: `shots/settings_running_off.png`, `shots/settings_running_after_undo.png`

### 12. De back-up mist trainingstijd per dag, de voorkeur voor meerdere trainingen per dag en het krachtblok
- Ernst: middel. Na herstel op een nieuw toestel is een deel van de gegevens weg.
- Stappen: zet maandag op 90 min, exporteer, importeer in een verse browser met "Volledig herstellen".
- Wat er gebeurt: na de import is `goalEngineConfig` er niet (de trainingstijd per dag is weg). Het exportbestand bevat alleen program, templates, plannedSessions, sessionLogs, trainingGoals, goalMilestones, goalMilestoneProgress, capabilityEvidence, injuryNotes en settings. `strengthProgramStrategies` (een zelf ingesteld krachtblok), `goalEngineConfig`, de afvinkstatus van het rekken en `planChangeProposals` ontbreken.
- Wat er zou moeten gebeuren: alles wat de gebruiker zelf heeft ingesteld, hoort in de back-up.
- Vermoedelijke oorzaak: `src/storage/backup.ts` `buildBackupEnvelope` (regel 92-124) en `applyImportPlan`.

### 13. "Alles verwijderen en opnieuw beginnen" wist de instellingen niet, terwijl de tekst zegt van wel
- Ernst: middel. De tekst klopt niet met wat er gebeurt.
- Stappen: vul je gewicht in (82,5), zet het geluid uit en MacroFactor aan, en kies dan Geavanceerd, "Alles verwijderen…", "JA, ALLES VERWIJDEREN".
- Wat er gebeurt: gewicht, geluid uit en MacroFactor aan blijven staan. Hetzelfde geldt voor sporten, ziekmeldingen (ook een actieve), trainingstijd per dag en coach-antwoorden. Na afloop verschijnt er ook geen bevestiging.
- Wat er zou moeten gebeuren: de tekst zegt "Wist al je geschiedenis, doelen, blessures en instellingen". Dus ofwel ook settings, goalEngineConfig en meta wissen, ofwel de tekst aanpassen.
- Vermoedelijke oorzaak: `src/storage/database.ts` `resetToDemoData` (rond regel 674-710) zet alleen de marathonvelden in settings terug.

### 14. Lange Duurloop telt als "Hiken" in plaats van "Hardlopen"
- Ernst: middel. Sporten aan of uit doet niet wat je verwacht, en de statistiek klopt niet.
- Stappen: zet Hardlopen uit. Of log een Lange Duurloop van 8,5 km en open History.
- Wat er gebeurt: met Hardlopen uit blijven 16 Lange Duurlopen gepland (alleen Easy Run en Heuvel verdwijnen). Met Hiken uit verdwijnt juist de duurloop. In "losse training loggen" staat "Lange Duurloop: Hiken". History telt de 8,5 km onder "Wandelen" en zet "Hardlopen 0 km". Today toont het type "Avontuur".
- Wat er zou moeten gebeuren: de lange duurloop (een loop richting marathon) hoort bij Hardlopen.
- Vermoedelijke oorzaak: `src/data/defaultProgram.ts` rond regel 214 (`type: 'hiking'` zonder `sport: 'running'`). `src/engine/sports.ts` `templateSport` leidt de sport dan af als hiking.

### 15. "Klaar voor vandaag, je sessie(s) van vandaag staan op voltooid" bij een overgeslagen of door ziekte geschrapte sessie
- Ernst: middel. De tekst klopt niet met wat er gebeurde.
- Stappen: Today, VERPLAATSEN, overslaan, TOEPASSEN. Of meld je ziek.
- Wat er gebeurt: er staat "Klaar voor vandaag. Je sessie(s) van vandaag staan op voltooid." terwijl er niets voltooid is.
- Wat er zou moeten gebeuren: een aparte tekst voor overgeslagen of rustdag.
- Vermoedelijke oorzaak: `src/pages/Today.tsx` regel 62 (`allTodayDone` geldt ook als alles alleen is overgeslagen) en regel 216-219.
- Screenshot: `shots/today_after_skip.png`

### 16. History "Gemist" telt overgeslagen sessies mee, ook toekomstige en door ziekte geschrapte
- Ernst: middel. Het getal klopt niet.
- Stappen: klok op ma 5 okt. Meld je ziek (koorts) en zet de klok op do 8 okt. Tik "IK BEN WEER BETER" en open History.
- Wat er gebeurt: "Gemist 6". Dat zijn de 3 dagen ziek plus vr 9, za 10 en zo 11 oktober, die nog moeten komen en die tijdens het opbouwen bewust geschrapt zijn. De ziektekaart zegt juist "Wat je mist terwijl je ziek bent, telt niet als gemist".
- Wat er zou moeten gebeuren: alleen voorbije, niet gelogde sessies tellen als gemist, en ziektedagen niet.
- Vermoedelijke oorzaak: `src/pages/History.tsx` `countMissed` (regel 33-39). Die telt `skipped` mee en kijkt niet naar `todayISO()` of naar `isIllnessDay`.
- Screenshot: `shots/week_after_illness.png`

### 17. Een gemiste sessie achteraf afvinken zet de log op de datum van vandaag
- Ernst: middel. De geschiedenis toont de verkeerde datum.
- Stappen: Week, tik op Lower A van wo 30 sep (gemist), START VOLLEDIGE SESSIE, VOLTOOIEN. Open History.
- Wat er gebeurt: `completedDate` is 2026-10-03 en History toont "3 oktober, Lower A". Er is geen veld om een datum te kiezen.
- Wat er zou moeten gebeuren: de log krijgt de geplande datum, of je kunt de datum kiezen.
- Vermoedelijke oorzaak: `src/state/AppDataContext.tsx` regel 913 (`completedDate: todayISO()`). `LogSessionInput` heeft geen datum.
- Screenshot: `shots/week_sheet_past.png`

### 18. TOEPASSEN bij een onopgeloste botsing zet toch twee zware beensessies binnen 48 uur
- Ernst: middel. Er is wel een waarschuwing, maar de knop doet hetzelfde als bij een opgeloste botsing.
- Stappen: Today (za 3 okt), VERPLAATSEN, "andere dag kiezen", di 6 okt, TOEPASSEN.
- Wat er gebeurt: de dialoog meldt "Let op: Lower A valt nu binnen de hersteltijd…", maar de primaire knop heet gewoon TOEPASSEN. Daarna staan Heuvel-/Incline-Intervallen op di 6 en Lower A op wo 7, en Heuvel staat bovendien op dezelfde dag als Upper A.
- Wat er zou moeten gebeuren: bij `resolved: false` een duidelijk andere keuze ("toch verplaatsen"), of de 48-uursregel hard handhaven zoals CLAUDE.md vraagt.
- Vermoedelijke oorzaak: `src/components/RescheduleDialog.tsx` (geen onderscheid op `proposal.resolved`), `src/pages/Today.tsx` en `src/pages/Week.tsx` (onApply).
- Screenshot: `shots/today_after_cross_week_move.png`

---

## LAAG

### 19. Herstel (rustdag) telt als gemist als je hem niet logt
- Stappen: klok op di 6 okt met een verse installatie (start maandag).
- Wat er gebeurt: maandag Herstel ("Rust of rustig wandelen") staat met "!" in Week, consistentie is 50% na één gemiste rustdag, en Ascend toont "HERSTEL 0%". De coach slaat recovery juist wel over bij "gemist".
- Wat er zou moeten gebeuren: een rustdag niet als gemist tellen, of dat consequent overal hetzelfde doen.
- Vermoedelijke oorzaak: `src/engine/readiness.ts` (consistency en recovery), `src/engine/sessionStatus.ts`.

### 20. Readiness rekent "niets te doen" als 0% consistentie, en de trend toont 33% voor weken vóór de start
- Wat er gebeurt: als er nog niets due is, is `consistency` 0 en zakt het totaal naar 33%. De trendgrafiek (8 weken) toont 33% voor weken waarin het programma nog niet bestond. Op Today staat in dat geval wel een streepje in plaats van een percentage.
- Vermoedelijke oorzaak: `src/engine/readiness.ts` regel 55-57 en `computeReadinessTrend`.
- Screenshot: `shots/ascend_fresh.png`

### 21. Het maandoverzicht opent op de maand van maandag in plaats van de huidige maand
- Stappen: Week (za 3 okt), "maandoverzicht".
- Wat er gebeurt: je ziet september 2026, omdat de week begint op ma 28 sep. Vandaag valt in oktober.
- Vermoedelijke oorzaak: `src/pages/Week.tsx` (MonthCalendar `anchor={weekStart}`).
- Screenshot: `shots/week_month.png`

### 22. Coach-advies "laten vallen" ongedaan maken laat het advies niet terugkomen
- Stappen: coach, Akkoord bij "Upper B van vr 2 oktober gemist", dan "Ongedaan maken".
- Wat er gebeurt: Upper B staat weer op gepland, maar het advies blijft weg, omdat het antwoord in `adviceResponses` bewaard blijft.
- Vermoedelijke oorzaak: `src/state/AppDataContext.tsx` `respondToAdvice` en `undoRecentChange`.
- Screenshot: `shots/today_after_akkoord.png`

### 23. Getallen met een punt in plaats van een komma, en zonder scheidingsteken voor duizendtallen
- History-lijst: "8.5 km" (de statistiek erboven zegt "8,5 km"), en D+ als "1200 D+". Bron: `src/pages/History.tsx` regel 137-143.
- Trainingsplekken: "dan ±1.6 km lopen". Bron: `src/engine/trainingSpots.ts` regel 47.

### 24. Een losse training (en een dubbele log) kun je niet meer verwijderen
- Wat er gebeurt: een log zonder `plannedSessionId` heeft nergens een knop voor ongedaan maken of verwijderen. LogDetailSheet in History heeft alleen "Sluiten". Een verkeerd gekozen losse training blijft dus voor altijd staan.

### 25. Back-upbanner zegt "al een tijdje" direct na de eerste log
- Wat er gebeurt: na de eerste afgevinkte sessie in een verse installatie staat er "Je hebt al een tijdje geen back-up gemaakt".
- Vermoedelijke oorzaak: `src/pages/Today.tsx` (`showExportReminder` zonder referentiedatum).

### 26. In de doelwizard verdwijnt het rugzakgewicht na wisselen tussen Fietsen en Hiken
- Stappen: + NIEUW DOEL, Meerdaagse tocht, vul Rugzak 12,5 in, kies Sport Fietsen en dan weer Hiken.
- Wat er gebeurt: het rugzakgewicht is leeg en de gemiddelde loopdag toont geen kilo's meer.
- Vermoedelijke oorzaak: `src/components/GoalRouteEditor.tsx` (de Segmented "Sport" filtert `packWeight` weg).

### 27. Datums zonder jaartal bij doelen in een ander jaar
- Wat er gebeurt: de doelpreview toont "Doeldatum 1 juli" en "Doeldatum 11 april" voor 2027.
- Vermoedelijke oorzaak: `formatDateNL` zonder jaar in `GoalSetupWizard.tsx` PreviewStep.

### 28. Lijsten niet op datum gesorteerd
- Coach-blessureadvies: "Lower A (wo 7 oktober), Heuvel (za 3 oktober), Lange Duurloop (zo 4 oktober)". Bron: `src/engine/adviceEngine.ts` `injuryAdvice`.
- Het overzicht "PLANNING AANPASSEN?" na het uitzetten van een sport toont 17 okt, 21 nov, 19 nov, 3 okt door elkaar (`describeChanges`).

### 29. De terugknop op Bronnen, Trainingsplekken en Blessures verlaat de app als je de pagina direct opent
- Stappen: open `/ascend/#/plekken` direct en tik op "‹".
- Wat er gebeurt: `navigate(-1)` gaat naar about:blank.
- Vermoedelijke oorzaak: `src/pages/TrainingSpots.tsx`, `Sources.tsx` en `Injuries.tsx`.

### 30. "Liever niet" loopt op 360 px breed over twee regels in de coachkaart
- Screenshot: `shots/w360_today.png`. Op 390 px past het wel. Er is geen horizontale scroll op welke pagina dan ook.

### 31. Een krachtsessie zonder ingevulde sets slaat lege sets op
- Wat er gebeurt: "VOLTOOIEN" zonder invoer slaat `sets: [{reps:0},{reps:0},…]` op, zonder gewicht. Dat vervuilt de krachtprogressie.
- Vermoedelijke oorzaak: `src/components/ExerciseLogger.tsx` `handleSave`.

---

## Onzeker

- Handmatig verplaatsen naar een dag waar al een sessie staat, stapelt twee trainingen zonder melding (bijvoorbeeld Heuvel bij Upper B op vrijdag, of Lower A bij Upper B). Tegelijk zegt de app elders "Zonder ingestelde trainingstijd plant ASCEND maximaal één training per dag". Dat kan bewust zijn, omdat de gebruiker zelf kiest.
- De kaart "SESSIE VOLTOOID" blijft midden in beeld staan op elke pagina tot je erop tikt. Ze kan daardoor knoppen afdekken (bij mij de exportknop in een script). Volgens het commentaar is dat bewust.
- `TodayMissionCard` heeft geen `key`. Bij twee sessies op één dag kunnen de duur uit de MacroFactor-modus en de open "Verplaatsen"-sectie van de eerste sessie doorlopen naar de tweede. Dit heb ik alleen in de code gezien (codeanalyse), niet gereproduceerd.
- De debrief na een krachtsessie zegt "Telt mee voor: Algemene conditie 1 u 15 min". Dat is mogelijk niet bedoeld voor kracht.
- Trainingstijd per dag op 30 min voor woensdag (Lower A duurt 75 min) geeft "Je huidige planning past al binnen de nieuwe instelling". Volgens de uitleg telt het budget alleen voor een tweede sessie, maar de melding leest misleidend.
- Een krachtblok van 4x per week haalt Easy Run (en met "nu al" ook de heuvelintervallen van vandaag) weg met "draagt niet aantoonbaar bij aan een actief doel". Hardlopen verdwijnt daarmee volledig uit de week. Dit is een ontwerpkeuze, maar het voelt onverwacht.
- `runStrengthReviewCheck` vergelijkt `n.date` (YYYY-MM-DD) met `currentStrategy.updatedAt` (ISO-datumtijd) als strings. Een blessure op dezelfde dag als de blokwijziging telt dan niet mee (codeanalyse).

---

## Getest en goed bevonden

- Opstarten met splash en het seeden van het demoprogramma, zonder dubbele seed. HashRouter-routes, ook de directe links /#/bronnen, /#/plekken, /#/gids, /#/garmin, /#/stretches en /#/blessures.
- Today: SESSIE STARTEN, de logger (variant, modaliteit, ASCEND/GARMIN/VRIJ), VOLTOOIEN, de viering, de debrief, de weektelling, de reeks, de mijlpaal na een losse training van 45 min (MIJLPAAL BEHAALD en voortgang in de ladder).
- Overslaan met bevestigdialoog, de melding met "Ongedaan maken" voor verplaatsen, overslaan en cascades.
- Coachkaart: waarom uitklappen, "nog 2 tonen" en "minder tonen", Akkoord met inhalen. Inhaaladviezen stapelen niet dubbel op dezelfde dag (getest).
- Ziek melden (drie soorten), "weer beter" met opbouwfase, en het rustig opbouwen dat zware sessies schrapt.
- Gewichtsherinnering, gewicht in Instellingen, herinneringsinterval.
- Trainingsuitleg (i-knop): de opbouw telt op tot 35 min, de Garmin-stappen kloppen. Timer, rekmenu naar probleemzone, afvinken van avondrekken (wordt bewaard).
- Week: bladeren, het actiesheet voor verleden en toekomst, een log ongedaan maken met bevestiging (verwijdert de log), een cascade bij een enkele botsing (Lower A naar vrijdag schuift Heuvel netjes) en het ongedaan maken daarvan.
- DST-zondag 25 okt, jaargrens 31 dec en 1 jan en de deload-week geven geen fouten in de datums of weeknummers.
- Ascend: nieuw doel "Meerdaagse tocht" met totale tocht (30.000 als 30000 gelezen, 12,5 kg), gemiddelde loopdag (20 km, 1.000 D+, 1.000 D-), trainingsdag instellen, "klaar", "Trainingsdag verwijderen", aaneengesloten of etappes, validatie van de langste etappe, preview met DIN-looptijd (8 u 55 min klopt) en activeren. Krachtblok 2x per week aanpassen.
- History: maandnavigatie, statistieken en deltas.
- Settings: alle vier tabbladen, sporten aan en uit met impactsheet, export (download) en import "Volledig herstellen" (logs en planning komen goed terug), schone start volgende week en "alleen de weektelling", herbouw aanbevelingen, update zoeken.
- Bronnen: 272 bronnen, categoriechips met de juiste aantallen, zoeken (ook zonder resultaat). Trainingsplekken: woonplaats kiezen (wordt bewaard), sorteren op afstand, filters, "Mijn locatie" met en zonder toestemming.
- Layout op 360 en 390 px: geen horizontale scroll op alle pagina's en tabbladen. De chiprijen scrollen binnen hun eigen container.
