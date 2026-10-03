# Trajectsimulatie ASCEND: van week 3 tot de GR5

Datum: 2026-10-03 (week 3 van het programma). Doel: GR5 op 2027-08-02, 600 km, 30.000 m D+ en D-, 35 loopdagen achter elkaar, rugzak 12 kg.

## Samenvatting

Ik heb de echte engine-functies uit `src/` een volledig traject laten draaien, van de programmastart (2026-09-14) tot de dag voor vertrek, in 14 scenario's met en zonder verstoringen. Een gesimuleerde sporter opent de app elke dag, laat de achtergrondplanning draaien zoals `state/AppDataContext.tsx` dat doet, en voert uit wat er staat.

De kern in vijf punten:

1. De planning houdt op na week 16. Zonder ingrijpen staan er vanaf 2027-01-04 nul sessies gepland, 30 van de 46 weken tot vertrek. Readiness zakt dan naar 33 en alle progressiebeslissingen worden "recover".
2. De fases en de taper hangen niet aan de doeldatum. "Expeditieklaar" valt in december 2026, 31 weken voor vertrek. Wie het programma opnieuw start om de leegte te vullen, krijgt in de week voor vertrek een opbouwweek (392 min, +7%, lange duurloop 74 min) in plaats van een taper.
3. De GR5-specifieke belasting groeit niet. In geen enkel scenario is er een sessie langer dan 87 minuten, meer dan 520 m D+, meer dan 496 m D- of met een rugzak. Een GR5-dag vraagt volgens de eigen demand-engine ongeveer 405 minuten, 860 m D+ en 860 m D- met 12 kg. De Ascent Ladder blijft na 46 weken perfecte naleving op 2 van 13 mijlpalen (15%) steken.
4. De 48-uursregel blijft overeind zolang de gebruiker niets verplaatst (0 conflicten in 9 scenario's), maar breekt bij verplaatsen. Bij 81 willekeurige verplaatsingen ontstonden 22 nieuwe conflicten, waarvan 19 door de engine zelf als "opgelost" werden gepresenteerd.
5. Na een week ziekte gaat het schema direct door met de zwaarste week van het blok (404 min na een week met 41 min). Readiness kan een sporter die alles traint maar de rustdag niet logt op 56% en "recover" zetten, en verbergt gemiste sessies zodra een advies wordt geaccepteerd.

Wat goed werkt: logs worden nooit herschreven (0 mutaties in 14 scenario's), status wordt altijd uit logs afgeleid, de engine gebruikt geen ACWR, de ziektelogica volgt de neck check, en dezelfde input geeft dezelfde output.

## Bevindingen, van ernstig naar klein

### 1. Na week 16 is er geen planning meer, terwijl het doel 44 weken weg ligt

Wat er gebeurt. Het programma telt 4 fases van 4 weken. Er worden alleen voor die 16 weken `PlannedSession`-rijen gemaakt. In scenario A (perfecte sporter, geen ingrepen) is de laatste geplande week 2026-12-28. Van 2027-01-04 tot en met 2027-07-26 staan er 0 sessies, 30 van de 46 weken. De readiness loopt in januari terug van 99 naar 90, 81, 71, 67 en vanaf februari 33 (consistentie 0 met basis 0, herstel 0, subjectief 100). De beslissingen voor de vier dimensies met data (endurance, mechanical, ascent, descent) zijn vanaf 2027-01-18 allemaal "recover", en in juli springen load_carriage en multi_day naar "taper" voor sessies die niet bestaan. Ook de weekplanning doet niets meer: `runWeeklyPrescriptionBuild` stopt als er geen forecastweken met sessies zijn.

Wat het onderzoek en de regels zeggen. Het eerste rapport beschrijft een opbouw over 16 weken die eindigt met een taper vlak voor vertrek. De rest van de tijd tot vertrek hoort dus vóór die 16 weken te liggen, niet erna. CLAUDE.md zegt dat elk scherm moet antwoorden op "wat is mijn missie vandaag"; in deze 30 weken is het antwoord leeg.

Waar in de code. `data/defaultProgram.ts#buildPlannedSessions` en `storage/database.ts#rebuildPlanningFromWeekOne` en `#resetScheduleToDefault` lussen over `totalWeeks` (16). `utils/dates.ts#resolveProgramWeek` geeft `null` na week 16, waardoor `engine/substitutions.ts#resolveEffectiveFullDuration` terugvalt op de vaste duur. `state/AppDataContext.tsx#runWeeklyPrescriptionBuild` stopt bij `forecastWeekStarts.length === 0` (de code verwijst zelf naar dit open punt).

Voorstel. Leid de programmalengte af van de doeldatum van het actieve doel. Tel de fases terug vanaf `targetDate` (taper en Expeditieklaar direct voor vertrek) en vul de weken daarvóór met een herhaalbare basis- of onderhoudscyclus. Genereer sessies rollend, bijvoorbeeld altijd 12 weken vooruit, zodat er nooit een lege week ontstaat.

### 2. Fases en taper staan los van de GR5-datum; de taper raakt alleen onzichtbare getallen, en dan dubbel

Wat er gebeurt. In scenario A heet week 13 tot 16 (7 december 2026 tot 3 januari 2027) "Expeditieklaar", 31 weken voor vertrek. Een realistische gebruiker herstart het programma om de leegte te vullen (scenario G: herstart op 2027-01-04 en 2027-04-26). Dan valt de GR5 in programmaweek 15. De laatste drie weken voor vertrek zijn dan Bergcapaciteit.4 (343 min), Expeditieklaar.1 (367 min, +7%) en Expeditieklaar.2 (392 min, +7%, lange duurloop 74 min). De week voor vertrek is dus een opbouwweek. De taperbeslissing van de engine ("taper" vanaf 2027-07-12) verandert alleen het verborgen D+-voorschrift. Dat gebeurt dubbel: 400 m × 0,86 in `deriveLine` en daarna nog eens × 0,86 in de specialist, met als uitkomst exact 295,84 m in de week van 2027-07-26.

Wat het onderzoek zegt. Rapport 1: de taper is het best onderbouwde onderdeel, ongeveer 2 weken met het volume 41 tot 60% omlaag en intensiteit en frequentie gelijk (Bosquet); week 16 moet een echte taper zijn. Rapport 2, regel A9: geen nieuwe excentrische prikkel in de laatste 7 tot 10 dagen.

Waar in de code. `data/defaultProgram.ts#buildProgram` (vaste fases, start = maandag van vandaag). `engine/substitutions.ts#resolveEffectiveFullDuration` kent geen doeldatum. Dubbele taper: `engine/weeklyPrescriptionBuilder.ts#deriveLine` (`volumeMultiplier = 1 - taperReductionFactor`) en `engine/specialists/mountainAdventure.ts` (`taperScale`) op dezelfde waarde, doorgegeven via `engine/weeklyPrescriptionEngine.ts#buildPrescriptionForLine`.

Voorstel. Laat de fase en de week-in-fase volgen uit de afstand tot de doeldatum, met de laatste 2 weken als taper (ongeveer 70% en daarna 50% van het volume). Laat de taper ook de getoonde duur verlagen, niet alleen een verborgen voorschrift. Pas de taperfactor op één plek toe: haal hem uit de builder of uit de specialist, niet uit allebei.

### 3. D+, D- en rugzakgewicht groeien niet richting de eisen van de GR5

Wat er gebeurt. Over alle 14 scenario's is de langste sessie 87 minuten (lange duurloop in de zwaarste week van de vierde cyclus, ongeveer 12,8 km). Gelogde D+ per week blijft zonder tijdbudget onder 700 m, D- per week onder 500 m, en het rugzakgewicht is in elke week 0 kg. De D+ die de engine voorschrijft blijft hangen tussen 448 en 520 m. Volgens `engine/goalRoute.ts` vraagt een gemiddelde GR5-dag 17,1 km, 860 m D+ en 860 m D-, ofwel ongeveer 405 minuten op de benen, met 12 kg. Er is nooit een sessie die "15 km wandeling" haalt, dus de Ascent Ladder staat na 46 weken in scenario G nog op mijlpaal 3 van 13 (15%). Mijlpalen die wel gehaald zijn, zoals 300 m D+ (de lange duurloop heeft 448 tot 496 m), blijven op "future" staan omdat de ladder strikt sequentieel is. Feasibility zegt 11 weken voor vertrek zelf "unlikely", met een major gap op elke dimensie. Het plan blijft toch gelijk.

Dat komt door drie dingen in de code:
- De templates hebben geen rugzak- of D- doel; de builder leest alleen `outdoorTarget.targetElevationM` (300 of 400 m) en vermenigvuldigt dat met hoogstens 1,3. `elevationLoss` is volgens de eigen commentaar "altijd undefined".
- Voor `load_carriage` en `multi_day_durability` bestaat geen enkel kandidaat-template (`targetSessionCount = 0`, kandidaat `undefined`). Die dimensies blijven 46 weken op "assess" staan.
- De voorgeschreven D+ verschijnt nergens: `TrainingPrescription`-rijen worden geschreven maar door geen enkele pagina of component gelezen. De sporter ziet alleen minuten (`resolveEffectiveFullDuration`) en de vaste templatetekst. In mijn model volgde de sporter het verborgen voorschrift alsof het zichtbaar was; in de echte app gebeurt zelfs dat niet.

Wat het onderzoek zegt. Rapport 1: in fase 3 verschuift de progressie naar buiten met 400 tot 600 m D± per tocht, in fase 4 een back-to-back weekend en een generale repetitie van ongeveer 1.000 m; de rugzak gaat in stappen van hoogstens 2 kg van 0 via 4, 6, 8 en 10 naar 12 kg; weektijd groeit naar 10 tot 11 uur. De app piekt op 418 geplande minuten (7,0 uur) inclusief 3 × 75 minuten kracht. Rapport 2, regels A1 tot A3: een afdaalklok (nooit meer dan 3 weken zonder afdaalprikkel), 100 tot 200 m D- per week erbij, doel 500 tot 700 m D- met 8 tot 10 kg en daarna 800 tot 1.200 m met tochtgewicht.

Waar in de code. `data/defaultProgram.ts` (geen `backpackWeightKg` of D- doel, Bergconditie zonder vaste dag), `engine/weeklyPrescriptionBuilder.ts#numericBaselineRanges` en `#computePlannedTrajectoryMultiplier` (maximaal ×1,3 op een vaste templatewaarde), `engine/progression.ts#computeGoalProgress` (sequentiële ladder), en het ontbreken van een lezer van `TrainingPrescriptionsRepo` in `src/pages` en `src/components`.

Voorstel. Maak D+, D- en rugzak expliciete ladders per week (zoals in rapport 1, sectie "Fase 2 tot en met 4 in getallen"), begrensd door de 30-dagenregels (D± hoogstens 125% van het 30-dagenmaximum, rugzak hoogstens +2 kg per stap, niet in dezelfde week als een D-stap). Voeg een buitentocht-template toe met D-, rugzak en duur als doel, en een back-to-back dag. Toon het voorschrift op de sessiekaart. Laat de ladder een behaalde mijlpaal als behaald tonen, ook als een eerdere nog open staat.

### 4. De 48-uursregel breekt bij verplaatsen, en de engine meldt het als opgelost

Wat er gebeurt. Zonder verplaatsingen is er in 9 scenario's geen enkel conflict, in het plan of in de uitgevoerde sessies. In scenario D (81 willekeurige verplaatsingen binnen de week, gebruiker bevestigt altijd) ontstonden 22 nieuwe 48-uursconflicten: 19 na een cascade die de engine als "opgelost" en zonder "Let op" presenteerde, 3 na een onopgelost voorstel dat de gebruiker toch bevestigde. In D2 (met tijdbudget) waren het er 18, allemaal na een "schone" cascade. Drie reproduceerbare gevallen in een gewone week (12 tot 18 oktober):
- Lange duurloop van zondag naar zaterdag: de engine schuift de heuvelintervallen naar zondag en meldt "schuift op". Resultaat: lange duurloop za, intervallen zo. `findHeavyConflict` keurt die volgorde zelf af.
- Lower A van woensdag naar zondag: de engine verplaatst de intervallen en meldt "opgelost", maar Lower A en de lange duurloop staan nu op dezelfde dag (0 dagen ertussen).
- Lange duurloop naar donderdag: Lower A schuift naar zondag, direct na de intervallen op zaterdag (1 dag ertussen), en de engine meldt "opgelost".

Er zijn drie oorzaken. `proposeMove` cascadeert alleen het eerste conflict dat `sessions.find` tegenkomt en controleert het eindresultaat niet opnieuw. De beam search in `candidatePlacement.ts` telt een zware beensessie op 1 dag afstand als boete 0,5 en op dezelfde dag als 1,0, beide onder de drempel 1,5 voor "compromised"; zo'n plaatsing heet dus "clean". En het paar heuvelintervallen plus lange duurloop wordt daar in elke volgorde vrijgesteld, terwijl `scheduler.ts` alleen de volgorde za-zo toestaat.

Twee bijeffecten. De uitkomst hangt af van de volgorde van de sessies in de array: dezelfde verplaatsing gaf met een omgekeerde array een andere cascade (bijvoorbeeld "Lower A + lange duurloop op zondag" tegenover "intervallen za, Lower A zo"). En een cascade kan een sessie naar een andere week schuiven zonder `weekStartDate` bij te werken. Reproductie: Lower A van volgende week naar maandag zetten verplaatst de lange duurloop van deze zondag (18-10) naar woensdag 21-10 met `weekStartDate` 2026-10-12. Die week heeft dan twee lange duurlopen. In scenario I leverde dit in de week voor vertrek 9 sessies en 528 geplande minuten op, de zwaarste week van het hele traject.

Ook `MISSED-CATCH-UP` negeert het bovenlichaam. Een gemiste Upper A werd 7 keer ingehaald op donderdag, direct voor Upper B op vrijdag (scenario B3). Pas de volgende ochtend stelde `SAME-MUSCLE-SPACING` voor om dat terug te draaien.

Wat de regel zegt. CLAUDE.md: twee zware sessies voor dezelfde spieren mogen niet binnen 48 uur vallen, en een verplaatsing die conflicteert geeft een cascadevoorstel "rather than applying silently". Rapport 1 en 2 (regel A5 en A8): Lower A minstens 48 uur voor lange duurloop, intervallen en tocht.

Waar in de code. `engine/scheduler.ts#proposeMove` en `#findHeavyConflict`, `engine/candidatePlacement.ts` (`LOAD_AXIS_CONFIG`, `SEVERE_FINDING_THRESHOLD = 1.5`, `hasPreferOverride`), `engine/adviceEngine.ts#findCatchUpDate` (alleen `isLegHeavyTemplate`).

Voorstel. Valideer na elke cascade de hele resulterende week (en de buurdagen) met `findHeavyConflict`. Verklaar het voorstel alleen "resolved" als er geen conflict meer over is, en cascadeer anders verder of meld het. Maak een zware-zware overlap binnen 1 dag in `candidatePlacement` een harde uitsluiting, of zet de boete minstens op de drempel. Gebruik in beide modules dezelfde volgorderegel voor de bedoelde back-to-back. Beperk cascades tot de eigen week of werk `weekStartDate` bij. Laat `findCatchUpDate` `findHeavyConflict` gebruiken voor beide assen. Kies het te verplaatsen conflict deterministisch, bijvoorbeeld op datum en template-id.

### 5. Na ziekte of een pauze gaat het schema direct verder met de zwaarste week

Wat er gebeurt. Scenario C: 7 dagen ziek onder de nek (9 tot 16 november). De neck check werkt zoals bedoeld: vandaag en morgen eraf, bij "weer beter" de gemiste sessies eraf (niet inhalen), en zware sessies eraf tot 2026-11-23. De week van 16 november heeft daardoor 41 geplande minuten. Maar de week van 23 november is Bergcapaciteit.3, de zwaarste week van het blok: 404 minuten (+885%), lange duurloop 81 minuten (107% van het 30-dagenmaximum, dat nog van vóór de ziekte is), en het gelopen volume springt van 6,3 naar 26,4 km (+319%). De opbouwperiode loopt tot 27 november, maar "korter en rustiger" is alleen tekst: de getoonde duur verandert niet. Hetzelfde patroon na twee weken "hiken uit" (scenario F): de lange duurloop gaat 58, 70 en 81 minuten, waarvan 81 minuten 116% van het 30-dagenmaximum is. Na losse missers (scenario B) stond er een lange duurloop van 87 minuten die 140% van het recente maximum was (week van 2027-04-12).

Ook valt op dat `planIllnessStart` alleen vandaag en morgen leegmaakt. Op dag 3 tot 7 van de ziekte staan de sessies, ook de zware, nog op de planning. In de week van 9 november stonden er 4 als "gemist" tot de sporter zich beter meldde.

Wat het onderzoek zegt. Rapport 2, regel C8: bij 6 tot 14 gemiste dagen herhaalt de app de belasting van 1 tot 2 weken eerder, de eerste week op 70 tot 80% van het volume, zonder maximale inspanningen. Rapport 1: een sessie hoort op of onder 110% van de langste sessie van hetzelfde type in de voorgaande 30 dagen te blijven.

Waar in de code. `engine/illness.ts#planIllnessEnd` en `#planIllnessStart` (verwijderen alleen), `engine/substitutions.ts#resolveEffectiveFullDuration` (kent geen ziekte, pauze of 30-dagenmaximum).

Voorstel. Laat na een episode van 6 dagen of meer de week-in-fase één tot twee stappen terugzetten, of schaal de getoonde duur naar 70 tot 80%. Begrens elk getoond duurloopdoel op 110% van de langste gelogde loop van de laatste 30 dagen. Haal bij een ziekmelding onder de nek ook de dagen erna van de planning, of laat ze in de UI duidelijk als "pauze" zien.

### 6. Readiness en consistentie meten vooral of er gelogd wordt

Wat er gebeurt.
- Herstel telt als sessie. Een sporter die alle trainingen doet maar de hersteldag niet logt (scenario J), heeft 46 weken lang een consistentie van 86%, herstel 0 en een totaal van 56 tot 62. De beslissingen zijn dan 181 keer "recover" en nooit "progress", en het verborgen D+-voorschrift zakt naar 320 m (400 × 0,8).
- Advies verbergt missers. In scenario B2 (20% missers, adviezen geaccepteerd) maakt het "laten vallen"-advies van een gemiste sessie een overgeslagen sessie, en overgeslagen sessies tellen niet als "due". De echte naleving was 80% (250 van 312), de gemiddelde consistentie 96%. Zonder advies (scenario B) lagen naleving en consistentie dicht bij elkaar: 87% en 86%.
- Zonder planning is de score onzinnig: subjectief 100 zonder data, consistentie 100 op basis van één sessie, daarna 0 met basis 0, totaal 33.
- Bij volledige naleving is readiness in elke fase 95 tot 100. Hij reageert niet op de belasting zelf: de zwaarste week (418 min) en de deload (351 min) geven dezelfde score.

Wat het onderzoek zegt. Rapport 1, beslisregel: naleving (C) is het percentage geplande sessies met een `SessionLog`, en naleving onder 80% betekent "vasthouden". Subjectieve signalen wegen het zwaarst (Saw e.a. 2016), maar ontbrekende data is geen signaal.

Waar in de code. `engine/readiness.ts#computeReadiness`: herstel = aantal gelogde recovery-sessies per week, consistentie sluit `skipped` uit, `subjectiveSignal` is 100 zonder data. `engine/progressionOrchestrator.ts` gebruikt `min(recovery, subjectiveSignal)` als poort.

Voorstel. Tel een rustdag nooit als gemist en laat herstel niet afhangen van het loggen ervan. Houd voor de consistentie een aparte teller bij voor sessies die "gemist en daarna laten vallen" zijn, en tel die als gemist. Toon "onvoldoende data" in plaats van 100 of 0 als er minder dan bijvoorbeeld 4 sessies due waren.

### 7. Opbouw week op week: totaal beheerst, sessiestappen te groot, en de 30-dagenregel werkt alleen achteraf

Wat er gebeurt. Het totaal aan geplande minuten stijgt per week 6 tot 7% en zakt in elke deloadweek 14 tot 16%. Dat is beheerst. Per sessie zijn de stappen groter:
- Lange duurloop: 50, 60, 70 en 45 minuten in cyclus 1 (+20%, +17%, -36%), daarna ×1,08, ×1,16 en ×1,24 per cyclus. De grootste stap is +21% (58 naar 70 minuten, week 10).
- Easy Run: 30, 35, 40 minuten (+17%, +14%), precies de stappen die rapport 1 als "kleine piek" aanmerkt.
- Ten opzichte van het 30-dagenmaximum: 120% in week 2 en 117% in week 3. In latere cycli blijft het binnen de grens (107 tot 109%), behalve na verstoringen (116 tot 140%, zie bevinding 5).
- Gelopen kilometers in een week tegenover twee weken eerder: na elke deload +33 tot +43%. Dat gebeurde 20 keer in scenario G, bijvoorbeeld 15,1 naar 21,5 km (+42%).
- De deload is in loopminuten 65% van de piek (193 naar 126 min), maar in totaal 84 tot 86%, omdat kracht (3 × 75 min) niet meezakt.

ACWR. De app gebruikt nergens een ACWR. Dat sluit aan bij rapport 1 ("de app moet dus geen ACWR gebruiken"). De sessiepiekregel van 30 dagen bestaat wel in `engine/progressionSpikes.ts`, maar alleen achteraf: hij zet een verborgen beslissing op "consolidate" en verbreedt de beenruimte naar 2 dagen. Hij begrenst nooit het doel dat de sporter ziet. De hardloopspecialist heeft een eigen pieksignaal (`RULE-RUN-SPIKE-001`), maar dat gaat nooit af, omdat `weeklyPrescriptionEngine` `recentLongestSessionKm` niet meegeeft en de templates geen afstandsdoel hebben.

Wat het onderzoek zegt. Rapport 1: een sessie meer dan 10% boven het 30-dagenmaximum geeft HRR 1,64; een vlakkere golf van 100, 105 en 110% van het 30-dagenmaximum, gevolgd door 60 tot 70% als deload; het weekvolume stijgt over 2 weken met hoogstens 30% (Nielsen 2014). Rapport 2, regel E3: geen loop langer dan 110% van de langste loop van de laatste 30 dagen.

Waar in de code. `data/defaultProgram.ts` (`weeklyProgression` van Easy Run, heuvelintervallen en lange duurloop), `engine/substitutions.ts` (`PROGRESSION_CYCLE_GROWTH_PER_REPEAT = 0.08`), `engine/weeklyPrescriptionEngine.ts#buildPrescriptionForLine`.

Voorstel. Bereken het getoonde doel als percentage van het 30-dagenmaximum uit de logs (100, 105, 110, dan 65%) in plaats van uit een vaste tabel, met een plafond van 110% per sessie. Geef `recentLongestSessionKm` mee aan de hardloopspecialist. Leg de 2-wekengrens van 30% op het loopvolume.

### 8. Herstarten van het programma zet alles terug naar week 1

Wat er gebeurt. Herstarten is in de huidige app de enige manier om na week 16 weer een planning te krijgen. Op 2027-01-04 (scenario G) worden 112 sessies aangemaakt, maar de inhoud begint opnieuw bij "Wennen": lange duurloop 50 minuten na 87 en 56 minuten (57% van het 30-dagenmaximum), Easy Run 30 minuten na 33 (deload) en 50 (piek). Over 47 weken komt de lange duurloop daardoor nooit boven 87 minuten, en drie keer doorloopt de sporter dezelfde 16 weken. Een tweede herstart op 2027-04-26 laat de GR5 in programmaweek 15 vallen (zie bevinding 2), en het programma loopt door tot 2027-08-15, voorbij de vertrekdatum. Er werden sessies gepland op de vertrekdag zelf (2027-08-02) en daarna.

Wat het onderzoek zegt. Rapport 2, overgangen: de 30-dagenmaxima starten bij een overstap opnieuw vanaf wat echt gelogd is. Dat is het tegenovergestelde van een vaste reset naar week 1.

Waar in de code. `storage/database.ts#rebuildPlanningFromWeekOne` en `#restartProgramAtWeekOne`, `engine/substitutions.ts` (cyclusvermenigvuldiger start weer bij 1,0).

Voorstel. Laat een herstart het startniveau baseren op de gelogde 30-dagenmaxima, plan nooit voorbij de doeldatum, en bied na het doel een herstelweek aan in plaats van een nieuwe opbouw.

### 9. Het verborgen D+-voorschrift hangt af van hoe ver de week van vandaag ligt

Wat er gebeurt. De lange duurloop van 29 november krijgt op 5 oktober een voorschrift van 520 m (400 × 1,3). Hoe dichter de week komt, hoe lager het wordt: 448 m (400 × 1,12) op 9 november. Elke uitgevoerde week krijgt dus het getal van "week +2", ongeacht de fase. Welke regel het voorschrift schrijft (ascent, descent of endurance), hangt af van de sorteervolgorde van de lijnen, zodat het getal per week wisselt tussen 448 en 496 m. Het voorschrift komt bovendien op de Lange Duurloop terecht (een hardloopsessie), omdat Bergconditie de dominante kandidaat is maar niet op de planning staat.

Waar in de code. `engine/weeklyPrescriptionBuilder.ts#computePlannedTrajectoryMultiplier` (`0.12 × weeksIntoForecast`, plafond 1,3) en `engine/weeklyPrescriptionEngine.ts#satisfyWithExistingSessions`.

Voorstel. Koppel de groei aan de programmaweek of aan het 30-dagenmaximum, niet aan de afstand tot vandaag. Schrijf per sessie één voorschrift dat alle relevante lijnen combineert.

### 10. De weekplanning voegt alleen sessies toe als er een tijdbudget is, en dan op de rustdag en tijdens de taper

Wat er gebeurt. Met de standaardinstellingen (geen dagbudget) staat er op elke dag al een sessie, ook maandag met Herstel. De weekplanning meldt dan "in 11 week(en) zit elke dag al vol" en voegt niets toe, ook niet in de bouwfase. Met een tijdbudget (scenario E2 en B3) voegt de engine vanaf 2027-05-31 elke week een Bergconditie toe, altijd op maandag, de dag na het zware weekend. De geplande minuten springen dan van 349 naar 425 (+22%) en de gelogde D+ per week van 629 naar 1.047 m (+66%). De Bergconditie blijft ook in de taper staan; de week voor vertrek telt 454 minuten, meer dan de 389 minuten twee weken eerder. Er staat zelfs een Bergconditie op de vertrekdag zelf (2027-08-02) en een week later.

Wat het onderzoek zegt. Rapport 1: maandag blijft een echte hersteldag, hoogstens 30 tot 45 minuten wandelen in zone 1. Rapport 2, regel A5: een tocht met 300 m D- of meer telt als leg-heavy.

Waar in de code. `engine/weeklyPrescriptionEngine.ts`, `engine/weekReconciliation.ts` (plaatsing via `candidatePlacement`; Herstel heeft geen belasting en remt dus niets af), en de Bergconditie-template met `lowerBodyLoad: 'moderate'`.

Voorstel. Bescherm de hersteldag als harde uitsluiting. Plan geen nieuwe sessies binnen de taper en nooit op of na de doeldatum. Laat een tocht met veel D- (of een voorschrift met `eccentricLoad: 'heavy'`) meetellen als zware beensessie. Nu leest `findHeavyConflict` alleen het basisprofiel van het template en negeert het het `stressProfileOverride` van het voorschrift.

### 11. De lange duurloop telt als hiken

Wat er gebeurt. `tpl_long_run` is van het type `hiking`. In scenario F haalde "hardlopen uit" de Easy Run en de intervallen weg, terwijl de lange duurloop gewoon doorliep (65 en 76 minuten). "Hiken uit" haalde juist de lange duurloop weg en liet alle looptrainingen staan. Elke gelopen lange duurloop telt als bewijs voor `endurance_duration:hiking` en `mechanical_tolerance:hiking`, dus de GR5-dimensies "vullen" zich met hardlopen.

Wat het onderzoek zegt. Rapport 1: hardlopen dekt beladen steil wandelen en lange afdalingen onvoldoende; specificiteit wint (Knapik 2012).

Waar in de code. `data/defaultProgram.ts` (`type: 'hiking'` zonder `sport`), `engine/sports.ts#templateSport`, `engine/capability.ts#extractEvidenceFromLog`.

Voorstel. Geef de lange duurloop `sport: 'running'` en laat een aparte buitentocht de hiking-dimensies voeden. Leid bij logs de sport af uit de gekozen modaliteit (`run_outdoor`).

### 12. Inhalen van gemiste sessies botst met het onderzoek

Wat er gebeurt. Het advies `MISSED-CATCH-UP` stelt voor om een gemiste sessie later in dezelfde week in te halen. In B2 en B3 kwam het 59 en 44 keer voor. Zonder tijdbudget is inhalen nooit mogelijk, omdat elke dag vol staat, en wordt het altijd "laten vallen". Met budget leidde het in B3 7 keer tot Upper A direct voor Upper B (zie bevinding 4).

Wat het onderzoek zegt. Rapport 2, regel C8: "Inhalen gebeurt nooit; alleen een sleuteltocht of sleutelduurloop mag binnen 2 weken opnieuw gepland worden, en alleen als die de leg-heavy-regel niet schendt."

Waar in de code. `engine/adviceEngine.ts#missedAdvice`.

Voorstel. Beperk inhalen tot sleutelsessies (lange duurloop of tocht) en laat de rest standaard vallen. Tel "laten vallen" in de naleving als gemist (bevinding 6).

### 13. "Geen tijd vandaag" kan een andere sessie naar vandaag schuiven

Wat er gebeurt. In scenario E2 (met tijdbudget) meldde de sporter op woensdag 2 december "geen tijd vandaag". De engine verplaatste Lower A naar vrijdag en schoof via de cascade de heuvelintervallen van zaterdag naar woensdag 2 december, de dag zonder tijd. Op donderdag 3 december gebeurde hetzelfde met Upper B (van zondag naar donderdag). In maart herhaalde het patroon zich precies. Daarnaast schuift Herstel elke dag een dag op (ma naar di, di naar wo, wo naar vr).

Wat de regel zegt. De functie belooft "move every one of today's sessions to the next free day", dus vandaag hoort leeg te worden.

Waar in de code. `engine/scheduler.ts#proposeNoTimeToday` roept `proposeMove` aan met `asOf = todayDate`. De cascade-filter in `proposeMove` gebruikt `d >= asOf`, waardoor vandaag zelf een geldige landingsplek is zodra er ruimte vrijkomt.

Voorstel. Sluit in de cascade van "geen tijd vandaag" de dag zelf uit (`d > todayDate`). Laat Herstel bij geen tijd gewoon vervallen in plaats van te verschuiven.

### 14. Kleine punten

- Door het accepteren van advies of een cascade kan `weekStartDate` niet meer bij de datum passen (1 keer in D, 2 keer in I). Wekelijkse tellingen (`computeBaselineCoverage`, `sessionsForWeek`) rekenen die sessie dan tot de verkeerde week.
- `computeReadiness` in `runWeeklyPrescriptionBuild` krijgt geen `excludeDate` voor ziektedagen, terwijl Today en Ascend die wel meegeven. De verborgen beslissingen kunnen daardoor anders zijn dan wat de gebruiker ziet.
- Een herstelweek of deload zet de capabilitytrend vaak op "declining", waardoor endurance- en ascentbeslissingen elke cyclus wisselen tussen progress en consolidate (bijvoorbeeld 33 keer consolidate in G). Dat is onschuldig, maar ruis.
- `undoLog` in `AppDataContext` verwijdert een `SessionLog`. Dat is een bewuste correctie direct na het loggen, maar formeel geen append-only gedrag.
- Het marathondoel (scenario H, 17 oktober 2027) ligt 11 weken na de GR5. De engine voegt de looplijnen toe zonder signaal; rapport 2, regel E7, adviseert in dat geval "tocht eerst" en 16 tot 18 weken marathonblok. De volgorde klopt hier, maar de app toetst het niet.

## Wat goed werkt

- Historische logs worden nooit herschreven. In alle 14 scenario's (112 tot 331 logs per scenario) was na afloop elke log byte-voor-byte gelijk aan het moment van aanmaken. Er is geen "completed"-veld op `PlannedSession`, geen log verwijst naar een ontbrekende sessie, en geen gelogde sessie is later verplaatst of overgeslagen. `deriveSessionStatus` leidt de status consequent af uit de logs.
- Het standaard weekpatroon houdt de 48-uursregel: Lower A op woensdag, intervallen op zaterdag en de lange duurloop op zondag geven 0 conflicten in alle scenario's zonder verplaatsingen (A, B, B2, C, E, E2, F, G, H, J), ook met ziekte, een drukke week en een sport uit en weer aan.
- "Geen tijd vandaag" in een drukke week slaat over in plaats van te stapelen als er geen ruimte is (E: 4 sessies per drukke week overgeslagen, 0 conflicten). Met budget schuift hij binnen de week zonder 48-uursconflict (E2), al zie je bij bevinding 13 een ander probleem.
- Een sport uitzetten haalt alleen toekomstige, niet-gelogde sessies weg (22 bij hardlopen, 10 bij hiken), en weer aanzetten zet ze op de vaste dag terug (18 en 8).
- De ziektelogica volgt de neck check uit rapport 2. Boven de nek gaan alleen zware sessies eraf (opbouw 2 dagen), onder de nek en bij buikgriep alles (opbouw 1,5 dag per zieke dag, maximaal 14). Gemiste sessies tijdens ziekte worden niet ingehaald en tellen niet mee in de consistentie (100% in scenario C).
- Er is geen ACWR, conform rapport 1, en de 30-dagenvorm voor afstand, D+, D- en rugzak bestaat al in `progressionSpikes.ts`.
- Determinisme. Hetzelfde scenario met dezelfde seed gaf twee keer exact dezelfde weekuitvoer en dezelfde conflictbronnen. De weekplanning gaf dezelfde inhoud bij andere id's en bij een omgekeerde volgorde van de sessies. De enige uitzondering is de volgordeafhankelijkheid van `proposeMove` (bevinding 4).
- De deloadweek valt elke vierde week, en het loopvolume zakt daarin naar ongeveer 65% van de piek, wat bij de deload van fase 1 uit rapport 1 past.

## Beperkingen van de simulatie

- Er draait geen browser en geen IndexedDB. De orkestratie van `AppDataContext.tsx` (forecast-replan, weekplanning, loggen, verplaatsen, ziekte, sport aan en uit, herstarten) heb ik in `harness.ts` in het geheugen nagebouwd, regel voor regel naar de bron. Boot-migraties (`seedIfEmpty`, `restorePatternSessionsRemovedByPrescription` en dergelijke) heb ik niet gedraaid; de weekplanning haalde nooit een patroonsessie weg, dus die laatste had niets te herstellen.
- De sporter is een model. Hij doet de getoonde minuten, loopt 6,5 tot 7 min/km, logt bij de lange duurloop de verborgen D+ alsof die zichtbaar was (anders 300 m geschaald naar duur), neemt D- gelijk aan D+ (lus), draagt nooit een rugzak omdat niets erom vraagt, logt RPE 4 tot 7 en meldt in 5% van de sessies "zwaarder dan normaal". Kracht is alleen afgevinkt, zonder gewichten (MacroFactor).
- De verstoringen zijn gekozen, niet gemeten: 15 tot 20% willekeurige missers, ziekte op vaste data, ongeveer 2 willekeurige verplaatsingen per week naar een willekeurige dag in dezelfde week (de gebruiker bevestigt altijd, ook onopgeloste voorstellen), drukke weken met "geen tijd vandaag" van maandag tot donderdag, en adviezen die automatisch worden geaccepteerd.
- Het GR5-doel heb ik zelf ingevuld (600 km, 30.000 m D+ en D-, 35 dagen achter elkaar, 12 kg, vertrek 2 augustus 2027). Het marathondoel (17 oktober 2027, 4 uur) is een aanname. Bij een etappegoal of andere aantallen verandert de typische dag.
- Herstarts op 4 januari en 26 april 2027 zijn mijn inschatting van wat een gebruiker doet als de planning leeg is. Zonder herstarts (scenario A) is de uitkomst nog slechter.
- De klok is een nep-`Date` en `Math.random` is geseed, zodat de runs reproduceerbaar zijn. Tijdzone: die van de container.
- Garmin, Health Connect, slaap en HRV zitten niet in de simulatie, omdat de engine ze nog niet gebruikt.

## Bestanden

Alles staat in `/tmp/claude-0/-home-user-ASCEND/ad6ded69-be17-5801-b543-86d3d2b5c25f/scratchpad/audit/simulatie/`:
- `harness.ts`: nepklok, in-memory state en de AppDataContext-flows rond de echte engine.
- `sim.ts`: sporter, scenario-driver en weekmetingen. `run_all.ts` draait de 14 scenario's.
- `analyze.mjs`: samenvattende metingen. Uitvoer in `out/ANALYSE.txt`, per scenario in `out/<naam>.txt` en `.json`.
- `cases_moves.ts`, `trace.ts`, `determinism.ts`, `ladder.ts`, `logcheck.ts`, `tptrack2.ts`, `nofree.ts`: gerichte reproducties.
- Uitvoeren: `JITI_FS_CACHE=false node /home/user/ASCEND/node_modules/jiti/lib/jiti-cli.mjs run_all.ts` (ongeveer 30 seconden, schrijft niets in de repo).
