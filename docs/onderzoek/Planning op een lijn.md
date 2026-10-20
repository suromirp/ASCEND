# Planning op een lijn

Hoe de planningssystemen van ASCEND op elkaar inwerken, waar ze elkaar tegenspreken, en een voorstel voor één vaste volgorde met een weekcontrole aan het eind.

Code bekeken op commit 24d4ddf (20 oktober 2026). Alles wat hieronder "nagespeeld" heet, is gedraaid op een back-up uit oktober 2026 met een tijdelijk testbestand en een nagebootste datum. Dat bestand is weer verwijderd. De ruwe uitkomsten staan in research_notes/Planning op een lijn/notities.md.

## In het kort

ASCEND heeft niet één planner maar een stuk of tien schrijvers die elk een deel van de planning aanpassen. Ze draaien op verschillende momenten (bij openen, eenmaal per dag, na Akkoord, na een instelling), ze lezen elk de opgeslagen planning op hun eigen moment, en geen van hen kijkt na afloop of de week als geheel nog klopt. Elke schrijver heeft een eigen idee van wat "van jou" is en dus niet aangeraakt mag worden. Dat idee zit in de status van een sessie ('planned', 'moved', 'skipped'), maar die status betekent per systeem iets anders.

De vier bekende bugs komen alle vier daaruit voort, en er zijn er meer. De belangrijkste nieuwe vondsten:

- De weekprescriptie haalt met de huidige code nog steeds de bergtochten van Expeditieklaar weg (zondag 27 juni tot en met 18 juli 2027, het dubbele wandelweekend vlak voor de GR5). In de nagespeelde back-up staan bovendien alle zeven tempolopen en alle zeven intervaltrainingen van het wedstrijdblok op overgeslagen, en niets haalt ze terug.
- Een testloop die je zelf overslaat, komt de volgende dag vanzelf terug. Dat geldt voor de drie tests die de prescriptie ooit weghaalde.
- Een inhaaltraining "korter, 45 minuten" wordt opgeslagen als de volle training: de korte duur gaat verloren bij het toepassen.
- De planner en de kaart rekenen de beenvermoeidheid op 14 januari uit als 11,5 en 7,8. De een zegt niet fris, de ander fris. Niet alleen door de duur (bug 4), ook doordat de planner alleen de laatste 10 dagen aan geplande sessies meegeeft, waardoor de korting voor herhaalde prikkels kleiner uitvalt.

Het voorstel: één pure functie die de planning in een vaste volgorde opbouwt, met vier niveaus van "vastzitten" (geschiedenis, jij, ankers, systeem), en een weekcontrole die aan het eind elke week toetst aan een vaste lijst regels. De controle herstelt alleen wat van het systeem is, en meldt de rest als voorstel. De fix voor bug 2 staat aan het eind, met de precieze oorzaak.

## Deel 1: wie schrijft er in de planning

Per systeem: wanneer het draait, wat het leest, wat het schrijft, en wat het stilzwijgend aanneemt over de anderen.

### 1. Het weekpatroon (database.ts, patternSessions)

- Wanneer: bij de eerste installatie (seedIfEmpty), bij een nieuwe schemaversie (syncTemplateAndScheduleDefinitions), bij "Schema opnieuw laden" (resetScheduleToDefault), "Schone start vanaf week 1" (rebuildPlanningFromWeekOne), "Opnieuw beginnen bij week 1" (restartProgramAtWeekOne), en in de sync voor elke programmaweek zonder sessies.
- Leest: de sjablonen met een vaste weekdag, de sporten die aan staan, de rustdag (arrangeWeekForRestDay in restDay.ts), de fasewissels (PATTERN_SWAPS: lange duurloop wordt bergtocht vanaf Bergcapaciteit, heuvels worden wandeldag 1 in Expeditieklaar), de hoofddoeldatum.
- Schrijft: nieuwe PlannedSessions met status planned.
- Neemt aan: dat een sessie haar sjabloon houdt. Wat later met de sessie gebeurt (een rustige duurloop die een tempoloop of test wordt) weet het patroon niet meer. Er wordt nergens opgeslagen welke plek in het patroon een sessie invult.

### 2. De dagelijkse sync (database.ts, syncProgramHorizon)

- Wanneer: in elke refresh(), maar alleen als de sleutel verandert: de datum van vandaag, week 1, de fases, de doeldatum, de lange zondag, de sporten, de faselengtes, de rustdag, de ambitie en de doelen. Geplande sessies zitten niet in de sleutel. In de praktijk dus eenmaal per dag bij het eerste openen, en direct na een instelling of doel dat in de sleutel zit. Niet na een Akkoord.
- Volgorde binnen de sync:
  1. De fases opnieuw terugrekenen vanaf de hoofddoeldatum.
  2. Testlopen terugzetten die de weekprescriptie ooit weghaalde (revivePrescriptionRemovedTests in raceBlock.ts). Wordt meteen per sessie opgeslagen.
  3. Alles wat open is op of na de hoofddoeldag: weg (echt verwijderd).
  4. Fasewissel per sessie (templateForPhase): lange duurloop wordt bergtocht en terug. Geldt ook voor sessies met status moved.
  5. Rustdag gewijzigd (meta appliedRestDay tegen settings.restDay): sessies die nog op hun oude patroondag staan, gaan naar hun dag in de nieuwe verdeling. Alleen status planned, en alleen sjablonen uit het patroon of uit PATTERN_SWAPS.
  6. Lege weken krijgen het patroon.
  7. Het wedstrijdblok (applyRaceBlocks in raceBlock.ts): wedstrijd erbij of eraf, de rustige duurloop wordt tempoloop of test, de zaterdag wordt intervallen of heuvels op en af, op de wedstrijddag niets anders, in de twee dagen ervoor geen heuvels, intervallen of beenkracht, de wedstrijdweek kort (taper), de dag erna de lange training kort. Daarna eerst restoreLegSwaps (eerdere ruil terugdraaien als de loop weg is) en dan swapLegsBeforeHardRuns (beenkracht ruilen met een bovenlichaamdag als die binnen 48 uur voor een tempoloop of 72 uur voor een test valt, en bij een test ook de korte versie). Alles alleen voor status planned; als "harde loop" telt alleen een tempoloop of test met status planned.
  8. Alles in één transactie opslaan.
- Leest: programma, sessies, logs, sjablonen, doelen, mijlpalen, instellingen, de lijst met plan-voorstellen (voor stap 2).
- Neemt aan: dat moved betekent "door jou geplaatst, niet aankomen" (stap 5 en 7), maar stap 4 negeert dat. Dat een skipped sessie niet meer meedoet: een overgeslagen wedstrijd telt als afwezig en er komt een nieuwe bij. Dat niemand anders na de sync nog schrijft.

### 3. De beschikbaarheidsstap (adaptiveReplanner.ts, runForecastReplan)

- Wanneer: eenmaal per page load, na de splash, tegelijk met 4 en 5.
- Leest: sessies vanaf week +2, beschikbaarheid (toegestane dagen, uitzonderingen).
- Schrijft: verplaatsen naar de eerstvolgende dag met ruimte in de week (proposeNoTimeToday, met de 48-uursregel), of overslaan. Zet status moved.
- Neemt aan: dat de doeldag beschikbaar is (wordt niet gecontroleerd), dat de sync later de wedstrijdregels nog toepast (gebeurt pas de volgende dag, en dan niet meer voor deze sessie, want die is nu moved).

### 4. De krachtplanning (strengthScheduling.ts via weekReconciliation.ts)

- Wanneer: bij het starten of wijzigen van een krachtschema, en bij "toepassen op deze en volgende week".
- Leest: het krachtschema, de sessies, beschikbaarheid, de 48-uursregel en de testindex (respectsHeavySpacing).
- Schrijft: kracht toevoegen, weghalen, en het hele krachtblok herverdelen (status moved).
- Neemt aan: dat zijn verplaatsingen daarna met rust gelaten worden. Dat klopt, maar daardoor verliest de wedstrijdblokstap ook elke greep op die sessies.

### 5. De weekprescriptie (weeklyPrescriptionEngine.ts, weekReconciliation.ts, runWeeklyPrescriptionBuild)

- Wanneer: eenmaal per page load, na de splash, tegelijk met 3. Bij de instelling "altijd eerst vragen" wordt het een coachkaart.
- Leest: doelen, logs, bewijs, readiness, capaciteit, beslissingen per vermogen, alle sessies vanaf week +2, de vorige prescripties.
- Schrijft: per week sessies erbij (add), sessies weg (remove, dus status skipped) als ze "niet bij de berekende samenstelling horen", en volumes via een TrainingPrescription. Filtert alleen adds en moves op de hoofddoeldag en op een wedstrijddag eruit.
- Neemt aan: dat alles met een vaste weekdag (defaultDayOfWeek) of in de lijst testloop, wedstrijd en extra's van jou is (keepsInPlace). Alles anders is vrij om weg te halen, ook als het een plek in je weekpatroon invult. Neemt aan dat de sync daarna niets meer omgooit, en weet niets van de rustdag.

### 6. De adviezen met Akkoord (adviceEngine.ts, respondToAdvice en commitPlanChange in AppDataContext.tsx, applyPlanChangeItems in proposalEngine.ts)

- Wanneer: berekend bij elke render uit de huidige planning; toegepast als je op Akkoord drukt.
- Regels die de planning wijzigen: MISSED-CATCH-UP (inhalen of laten gaan), TEST-MAKE-ROOM (testloop verplaatsen, kracht opzij, of iets laten vervallen), HARD-THEN-SPACE (extra herstel), SAME-MUSCLE-SPACING (48 uur tussen gelijke spieren), REST-SWAP en REST-PULL (rustdag schuiven), SKIPPED-KEY-TO-REST (sleuteltraining op de rustdag), EXTRA-SESSION (extra training), MORNING-CHECK (iets later na een slechte ochtend), REST-WEEK-SKIP (rustweek doortrainen, wijzigt het programma).
- Schrijft: via applyPlanChangeItems. Een move zet status moved, een remove zet skipped, een add maakt een nieuwe planned sessie. Daarna refresh(), maar de sync draait dan niet (sleutel gelijk).
- Neemt aan: dat wat het voorstel laat zien zo blijft. Dat geldt alleen voor wat in de changes staat. Wat het voorstel als context noemt ("Benen A erna") staat er niet in en is dus niet beschermd. Sommige regels gebruiken een eigen spreidingsregel (SAME-MUSCLE-SPACING: twee dagen tussen elk zwaar paar) in plaats van de gedeelde (respectsHeavySpacing met de testindex). Geen regel controleert de hoofddoeldatum.

### 7. Wat je zelf doet (Week: verplaatsen, overslaan, geen tijd vandaag)

- Wanneer: direct na bevestigen (applyProposal, applyNoTimeToday).
- Schrijft: status moved met movedFromDate, of skipped. Terug naar de oorspronkelijke dag maakt de sessie weer planned.
- Neemt aan: dat moved en skipped van jou zijn. De sync respecteert moved meestal, maar de herstelstap voor tests zet jouw skipped weer terug op planned.

### 8. Ziekte (illness.ts)

- Wanneer: bij ziek melden en weer beter melden.
- Schrijft: sessies tijdens de ziekte en zware sessies in de opbouw erna op skipped.
- Neemt aan: dat niemand die skipped sessies terugzet. Voor een testloop die eerder door de prescriptie was weggehaald, doet de sync dat wel.

### 9. Schema-afwijking (scheduleAnomalies.ts)

- Wanneer: als je de voorgestelde oplossing voor meerdere rustdagen op rij toepast.
- Schrijft: verplaatsingen (status moved).

### 10. De duur van een sessie (substitutions.ts, raceBlock.ts, adviceEngine.ts)

Geen sessies verplaatsen, wel bepalen hoe zwaar ze zijn, en daarmee of ze passen en hoe fris je benen zijn.

- resolveEffectiveFullDuration: opbouw per week, ambitie, geleerde krachtduur, de 110 procent van je langste in 30 dagen, minder volume na ziekte, en een vaste duur (plannedMinutes). Werkt met registers die alleen in refresh() worden gezet.
- De wedstrijdblokstap zet plannedMinutes (taper, korte beenkracht in een testweek) en haalt ze weer weg bij terugdraaien.
- De inhaalregels beloven een korte versie via plannedMinutes op een move.
- De beenvermoeidheid in de planner (freshnessAt in scheduler.ts) gebruikt de sjabloonduur; de kaart (LegFatigueCard) en het voorstelpaneel (ProposalSheet) gebruiken resolveVariantDuration.

### 11. Eenmalige reparaties en ongedaan maken

- restorePatternSessionsRemovedByPrescription (eenmalig, alleen sjablonen met vaste weekdag), fixV1WeekFragmentation, normalizePlannedSessionWeeks.
- undoRecentChange zet de geraakte rijen terug zoals ze waren en verwijdert wat erbij kwam.

### De volgorde bij het openen van de app

1. Eenmalige migraties en reparaties.
2. refresh(): eerst de sync (als de sleutel veranderd is), dan alles inlezen en de registers zetten.
3. Splash weg.
4. Tegelijk, zonder op elkaar te wachten: beschikbaarheidsstap, krachtcontrole, weekprescriptie. Elk leest aan het begin, schrijft aan het eind, en roept refresh() aan. De sync draait daarna niet meer (sleutel gelijk).
5. Adviezen worden berekend uit wat er dan staat.

Dus: wat de prescriptie en de beschikbaarheidsstap schrijven, wordt pas de volgende dag door de wedstrijdblokstap en de rustdagstap bekeken. Wat jij met Akkoord accepteert, ook. Een correctie van de sync komt dus altijd een dag later en zonder melding.

## Deel 2: waar ze elkaar tegenspreken

Gerangschikt op kans maal ernst, de ergste eerst. Bij elk: wat er gebeurt, een concreet geval, waarom, en hoe waarschijnlijk en hoe erg.

### 1. De weekprescriptie haalt sessies weg die een plek in je patroon invullen

- Wat: keepsInPlace beschermt een sessie als haar sjabloon een vaste weekdag heeft, of als het een testloop, wedstrijd of extra is. Maar de sessies die het wedstrijdblok en de fasewissel in een patroonplek zetten, hebben zelf geen vaste weekdag: tempoloop, intervallen, heuvels op en af, bergtocht, wandeldag 1. Die zijn vrij om weg te halen.
- Nagespeeld met de huidige code: na het terugzetten van de overgeslagen sessies haalt de prescriptie in de eerste run de bergtochten van 27 juni, 4 juli, 11 juli en 18 juli 2027 weg. Dat is de zondag van het dubbele wandelweekend in Expeditieklaar, de training die het dichtst bij de GR5 zelf komt.
- In de nagespeelde back-up: alle zeven tempolopen en alle zeven intervaltrainingen van het wedstrijdblok zijn door de prescriptie weggehaald en staan nog op overgeslagen. De bergtochten van juni en juli al langer. De herstelstap haalt alleen testlopen terug. Het wedstrijdblok heeft daardoor in dat plan geen enkele tempoloop en geen intervallen meer.
- Waarom: de bescherming kijkt naar het sjabloon, niet naar de plek in de week. Hetzelfde gat als bij bug 1, maar breder.
- Kans: zeker, het is al gebeurd. Ernst: hoog. Dit zijn de sleuteltrainingen voor beide doelen.

### 2. Een geaccepteerd voorstel wordt de volgende dag stil teruggedraaid (bug 2 en verwanten)

- Wat: de sync en de wedstrijdblokstap weten niet welk voorstel je hebt geaccepteerd. Ze beschermen alleen sessies met status moved. Wat een voorstel als context laat zien, is niet beschermd. Zie deel 4 voor de volledige trace van bug 2.
- Verwante gevallen:
  - Een inhaaltraining die MISSED-CATCH-UP op de dag van de GR5-start zet (de inhaalregel kijkt niet naar de doeldatum), wordt bij de volgende sync verwijderd.
  - De herstelstap voor tests zet een test terug die je na het accepteren van een voorstel had laten vervallen (zie 3).
  - Een geaccepteerde krachtverschuiving van TEST-MAKE-ROOM (moveStrengthFor) zet de verplaatste beenkracht op moved, maar de partner van een eerdere ruil staat nog op planned met een markering, en die wordt teruggezet naar zijn oude dag, ongeacht wat daar nu staat.
- Kans: hoog, elke keer dat een advies leunt op een eerdere ruil van het wedstrijdblok. Ernst: middel. Het resultaat is meestal niet gevaarlijk, maar wat je zag is niet wat je krijgt, en dat ondermijnt het vertrouwen in elk voorstel.

### 3. Je kunt een herstelde testloop niet zelf overslaan

- Wat: revivePrescriptionRemovedTests zet elke overgeslagen testloop terug die ooit in een geaccepteerd weekprescriptievoorstel als remove stond. Er is geen vlag "al eens teruggezet". Het commentaar zegt "once", de code doet het elke sync.
- Nagespeeld: test van 29 oktober wordt op 20 oktober teruggezet, jij slaat hem over, op 21 oktober staat hij weer op gepland. Elke dag opnieuw, voor de tests van 29 oktober, 14 januari en 18 februari.
- Kans: hoog zodra je een van die drie tests wilt overslaan. Ernst: middel. Je keuze wordt overschreven, en TEST-MAKE-ROOM kan daardoor rare voorstellen doen rond een test die je niet wilde.

### 4. De rustdag landt op de test, de tempoloop en op geruilde krachtdagen (bug 3, breder)

- Wat: de rustdagstap koppelt sjabloon aan weekdag via het patroon. Een testloop of tempoloop is in de opslag al een ander sjabloon dan de rustige duurloop waarvan hij de plek inneemt, dus hij heeft geen oude en nieuwe dag en blijft staan. Ook een krachtdag die door het wedstrijdblok geruild is, staat niet op zijn patroondag en blijft staan. En alleen status planned doet mee, dus een test die op dat moment overgeslagen was (bug 1) bleef ook liggen.
- In de nagespeelde back-up, met een vaste rustdag midden in de week: de drie testlopen (29 oktober, 14 januari, 18 februari) en zeven tempolopen staan op de rustdag naast Herstel. In die weken is er op maandag niets.
- Nagespeeld, rustdag naar woensdag: Herstel gaat naar woensdag, maar Bovenlichaam A staat daar al door een ruil van het wedstrijdblok. In elf weken staat er nu kracht op je rustdag.
- Kans: hoog bij elke wijziging van de rustdag met een tussendoel. Ernst: middel. TEST-MAKE-ROOM vangt de test binnen 14 dagen op, de tempolopen niet.

### 5. Planner, kaart en voorstelpaneel rekenen een andere beenvermoeidheid uit (bug 4, breder)

- Wat: drie plekken rekenen de index uit, met verschillende invoer.
  - Duur: de planner (freshnessAt) neemt de sjabloonduur (Benen A 75, lange duurloop 75), de kaart de echte geplande duur (Bovenlichaam A 50 geleerd, lange duurloop 93 met opbouw en ambitie stevig).
  - Geschiedenis: de planner geeft alleen geplande sessies van de laatste 10 dagen door. De korting voor herhaalde prikkels (adaptationFactor, kijkt 42 dagen terug) ziet daardoor minder eerdere krachtdagen en lange lopen. Dezelfde Benen A van 45 minuten telt in de planner 6,4 en op de kaart 5,5.
  - Lichaamsgewicht: de kaart neemt je laatste weging, de planner 80 kilo (telt bij een rugzak).
  - Pijn en spierpijn: de kaart en het voorstelpaneel tellen ze mee, de planner haalt ze er bewust uit.
- Nagespeeld: test 14 januari planner 11,5 (niet fris, grens 8), kaart 7,8 (fris). Test 18 februari 11,4 tegen 7,3. Wedstrijd 20 maart 6,6 tegen 4,4 (grens 5).
- Gevolg: de adviezen kiezen opties met de plannerindex, het voorstelpaneel toont bij elke optie de kaartindex. Een optie die de planner afwees omdat de benen niet fris zouden zijn, kan op de kaart groen zijn, en omgekeerd.
- Kans: altijd. Ernst: middel. Verkeerde keuzes rond test en wedstrijd, en uitleg die niet klopt met het besluit.

### 6. Niemand controleert test en wedstrijd als geheel

- Wat: de wedstrijdblokstap gebruikt vaste dagen (48 uur, 72 uur, 2 dagen voor de wedstrijd), TEST-MAKE-ROOM gebruikt de index, maar alleen binnen 14 dagen en alleen als de test gemist of op je rustdag staat. Een test verder weg die volgens de eigen index van de planner niet fris is, krijgt geen signaal.
- Nagespeeld: test 14 januari (Benen A twee dagen ervoor, ingekort, plus het zware weekend) planner 11,5; wedstrijd 20 maart 6,6 door Benen A op woensdag 17 maart, drie dagen ervoor, buiten de twee dagen die de wedstrijdblokstap vrijhoudt.
- Kans: hoog. Ernst: middel. Het wordt pas twee weken van tevoren zichtbaar, als er nog weinig ruimte is.

### 7. De korte versie van een inhaaltraining gaat verloren

- Wat: MISSED-CATCH-UP en SKIPPED-KEY-TO-REST zetten plannedMinutes op een move en beloven "korter, 45 minuten: deze week staat er al een lange training". applyPlanChangeItems neemt plannedMinutes alleen over bij een swap, niet bij een move. Commit 6a6ba12 zette de regel in het verkeerde case-blok.
- Nagespeeld: een move met plannedMinutes 45 levert een sessie zonder plannedMinutes op.
- Kans: middel (elke inhaal naar een week met een eigen lange training). Ernst: middel. Twee volle lange trainingen in een week, precies wat de regel wilde voorkomen.

### 8. Status moved betekent twee dingen

- Wat: moved wordt gezet door jou, door elk geaccepteerd advies, maar ook door de beschikbaarheidsstap, de krachtherverdeling en de weekprescriptie. De wedstrijdblokstap en de rustdagstap behandelen elke moved als onaanraakbaar, de fasewissel en de weekprescriptie niet.
- Gevallen: een rustige duurloop die de beschikbaarheidsstap in een blokweek verschuift, wordt nooit meer een tempoloop. Een verschoven heuvelintervaltraining twee dagen voor de wedstrijd wordt niet weggehaald. Een beenkrachtdag die de krachtherverdeling de dag voor een test zet, wordt niet meer geruild. Omgekeerd kan de weekprescriptie een sessie die jij verplaatste toch weghalen als die niet in de samenstelling past.
- Kans: middel. Ernst: middel.

### 9. Correcties komen een dag later en stil

- Wat: de sync draait alleen bij een nieuwe sleutel, dus niet na een Akkoord en niet na de prescriptie. De bootjobs draaien na de sync.
- Gevolg: wat je vandaag accepteert of wat de prescriptie vandaag toevoegt, wordt morgen door de wedstrijdblokstap of de doeldatum gecorrigeerd, zonder melding en zonder ongedaan maken. Het eerste openen van de dag geeft een andere volgorde dan een tweede keer openen.
- Kans: hoog. Ernst: laag tot middel, maar het is de reden dat bug 2 als "de volgende dag ineens anders" voelt.

### 10. De registers hangen af van wanneer refresh() liep

- Wat: dayHasRoomFor en de duur van sessies gebruiken modulebrede registers (geleerde duur, vaste duur, ambitie, Zware dingen op een dag). Die worden in refresh() gezet, na de sync. De sync en de bootjobs rekenen dus met de stand van de vorige refresh.
- Nagespeeld: de optie "Testloop di 27 oktober, Benen A erna" verschijnt alleen als de vaste duur (45 minuten, uit de ruil van het wedstrijdblok) al in het register staat. Met de registers van voor de sync waren de opties ma 2 november, di 3 november en vrijdag met heuvels vervallen.
- Kans: middel. Ernst: laag tot middel, maar het maakt fouten moeilijk na te spelen.

### 11. Adviesregels met een eigen spreidingsregel

- Wat: SAME-MUSCLE-SPACING kiest een dag met twee dagen afstand tot elk zwaar paar, maar kent de testindex en de regel "geen harde loop binnen 48 uur na beenkracht" niet.
- Geval: Bovenlichaam B en Benen A op opeenvolgende dagen; het advies zet Benen A op de dag voor een tempoloop of test. Na Akkoord is Benen A moved, dus de wedstrijdblokstap ruilt hem niet meer.
- Kans: laag tot middel. Ernst: middel.

### 12. De bootjobs schrijven door elkaar

- Wat: beschikbaarheidsstap, krachtcontrole en weekprescriptie starten tegelijk, lezen elk dezelfde stand en schrijven hele sessies terug.
- Geval: de beschikbaarheidsstap verschuift een rustige duurloop in week +3, de prescriptie haalt dezelfde sessie weg en schrijft haar terug met de oude datum en status skipped. De verschuiving is weg.
- Kans: laag (alleen met niet-beschikbare dagen; in de nagespeelde back-up staan alle dagen aan). Ernst: middel.

### 13. Duplicaten en wezen blijven liggen

- Wat: de wedstrijdblokstap kijkt alleen naar open sessies. De acht overgeslagen wedstrijdrijen op 20 maart (uit bug 1) staan nog in de nagespeelde data. Niets ruimt ze op.
- Kans: zeker in de nagespeelde data. Ernst: laag (ruis in week en geschiedenis, en voer voor toekomstige regels die skipped sessies tellen).

### 14. De weekprescriptie kent je rustdag niet

- Wat: de plaatsing kijkt naar beschikbaarheid en tijdsbudget, niet naar settings.restDay. In de nagespeelde back-up houdt het kleine tijdsbudget op de rustdag het tegen, bij iemand met meer budget op de rustdag niet.
- Kans: laag. Ernst: laag tot middel.

### 15. Twee harde lopen op een dag

- Wat: findHeavyConflicts heeft alleen voor een test of wedstrijd een regel over een harde loop op dezelfde dag. Een fartlek naast een tempoloop wordt alleen door het tijdsbudget tegengehouden.
- Kans: laag. Ernst: middel.

### 16. Import past de rustdag nog eens toe

- Wat: appliedRestDay zit niet in de backup. Na een import of op een nieuw toestel is hij 1, en de rustdagstap draait opnieuw.
- Nagespeeld: in de nagespeelde data verschoof daardoor niets, omdat alles al op de nieuwe dagen staat. Wel niet gegarandeerd idempotent.
- Kans: laag. Ernst: laag.

## Deel 3: één vaste volgorde met een weekcontrole

### Het principe

Eén schrijver voor de automatische planning: een pure functie die de hele planning vanaf vandaag in een vaste volgorde opbouwt. Alle andere systemen zijn ofwel invoer (wat jij doet en wat je accepteert, wordt vastgezet) of voorsteller (adviezen maken voorstellen, maar die gaan eerst door dezelfde functie voordat je ze ziet). Aan het eind van elke run toetst een weekcontrole elke week aan een vaste lijst regels.

### Wat vastzit: vier niveaus

Elke sessie krijgt bij elke run een niveau. Dat niveau, en niet de status, bepaalt wie haar mag aanraken.

- Niveau 0, geschiedenis: er is een log, of de dag is voorbij. Niemand raakt haar aan. Ze telt alleen mee voor de vermoeidheid.
- Niveau 1, jij: je hebt haar zelf verplaatst of overgeslagen, of je hebt een voorstel geaccepteerd dat haar verplaatst, toevoegt, weghaalt of laat zien op deze dag. De automatische planning verplaatst, ruilt, verkort of herschrijft haar nooit. De weekcontrole mag alleen melden en een voorstel doen.
- Niveau 2, ankers: de testlopen en de wedstrijd. Het systeem maakt ze aan of haalt ze weg als het doel verandert, maar verplaatst ze nooit op eigen houtje. Verplaatsen gaat via een voorstel aan jou. Een gewijzigde rustdag mag ze wel langs hun plek in de week meenemen, want dan heb jij de verandering veroorzaakt.
- Niveau 3, systeem: al het andere. Vrij voor de stappen hieronder, in de volgorde hieronder.

Opslag: een nieuw optioneel veld op PlannedSession, lock met by ('user' of 'proposal'), het id van het voorstel en de tijd. Status moved blijft alleen een weergave ("verplaatst"), en wordt niet meer gebruikt om te beslissen of iets vastzit. Systeemverplaatsingen (beschikbaarheid, krachtherverdeling, prescriptie) zetten geen lock. Een sessie die jij teruglegt op haar oorspronkelijke dag, verliest het lock.

Daarnaast de plek in het patroon: patternSlotOf(templateId) geeft voor tempoloop, testloop en rustige duurloop de plek van de rustige duurloop, voor heuvels, intervallen, heuvels op en af en wandeldag 1 de plek van de zaterdag, voor bergtocht en lange duurloop de plek van de zondag, en voor de patroonsjablonen zichzelf. Eerst afgeleid uit het sjabloon (geen schemawijziging), later eventueel opgeslagen als slot op de sessie bij het aanmaken.

### De volgorde

Elke stap mag alleen de niveaus en handelingen die erbij staan. Een latere stap mag een eerdere alleen overschrijven voor niveau 3, en alleen op de genoemde manier.

1. Momentopname en niveaus. Alles inlezen, de duurbron en de registers voor deze run vastleggen (niet uit een vorige refresh), elk sessieniveau bepalen.
2. Horizon. Fases terugrekenen. Op of na de hoofddoeldag: niveau 2 en 3 weg; niveau 1 blijft staan en wordt gemeld met een voorstel om eerder te plannen.
3. Skelet. Lege weken krijgen het patroon. Bij een gewijzigde rustdag: niveau 2 en 3 verhuizen langs hun plek in het patroon (patternSlotOf), niet langs hun sjabloon. Niveau 1 blijft.
4. Fasewissel. Niveau 3 krijgt het sjabloon van zijn fase (lange duurloop of bergtocht).
5. Wedstrijdblok. Wedstrijd en testlopen aanmaken of weghalen (niveau 2), precies één open wedstrijdrij, overgeslagen systeemduplicaten opruimen. Niveau 3 krijgt het sjabloon van zijn blokweek (rustig, tempo, test, intervallen, heuvels op en af) en de taperduur.
6. Beschikbaarheid. Niveau 3 van een niet-beschikbare dag af (verplaatsen of overslaan). Niveau 2 alleen als voorstel.
7. Weekprescriptie (week +2 en verder). Mag toevoegen en volume zetten. Mag alleen weghalen wat ze zelf eerder toevoegde (niveau 3 zonder plek in het patroon). Haalt nooit een sessie met een plek in het patroon weg, nooit niveau 1 of 2. Bij "altijd eerst vragen" levert deze stap een voorstel op in plaats van wijzigingen, en dat voorstel gaat in een proefrun door stap 8 tot en met 10, zodat je de week ziet zoals hij echt wordt.
8. Spreiding. Beenkracht en harde lopen uit elkaar (de huidige ruil van het wedstrijdblok), maar gestuurd door de index en alleen door niveau 3 te verschuiven of te verkorten. Als anker telt elke niet-overgeslagen harde loop, ongeacht status of niveau.
9. Weekcontrole. Elke week van vandaag tot de hoofddoeldag tegen de regels hieronder. Herstellen alleen met niveau 3, in een vaste volgorde. Wat niet lukt, wordt een melding.
10. Opslaan. Alle wijzigingen in één transactie, plus één auditregel (een PlanChangeProposal met trigger plan_sync) en een melding "Planning bijgewerkt" met ongedaan maken als er iets zichtbaars veranderde. Een tweede run op het resultaat moet nul wijzigingen geven.

De pijplijn draait bij het eerste openen van de dag, na elke instelling of doelwijziging, en direct na elk Akkoord of eigen verplaatsing (niet een dag later).

### De weekcontrole: de regels

Per regel: wat wordt gecontroleerd, wat de controle zelf mag herstellen, en wat ze meldt.

1. Niets op of na de hoofddoeldag. Herstel: niveau 2 en 3 weg. Melden: niveau 1, met voorstel naar de laatste dag ervoor die past.
2. Test en wedstrijd aanwezig. Precies één open wedstrijd op de wedstrijddag, een testloop in elke testweek (20, 9 en 4 weken voor de wedstrijdweek), tenzij jij hem oversloeg (niveau 1). Herstel: aanmaken, dubbele open rijen samenvoegen, overgeslagen systeemduplicaten verwijderen (nooit iets met een log).
3. Test en wedstrijd fris volgens de index. Test op of onder 8, wedstrijd op of onder de grens die de planner gebruikt (nu 5). Eén indexfunctie, dezelfde als de kaart. Herstel: beenkracht van niveau 3 in de dagen ervoor ruilen of verkorten, zware heuvels of intervallen van niveau 3 verschuiven. Melden: als niveau 1 of 2 de oorzaak is, met een concreet voorstel.
4. Rustdag vrij. Op settings.restDay geen training van niveau 2 of 3 behalve herstel. Herstel: verhuizen langs de plek in het patroon. Niveau 1 op de rustdag is jouw keuze en wordt niet gemeld.
5. Hooguit één harde loop per dag, en geen harde loop of zware beendag de dag na een test.
6. Beenspreiding. Elk paar in de week en de weken ernaast tegen findHeavyConflicts (legSpacingDays, de 48 uur na beenkracht voor een tempoloop, de intentionele zaterdag-zondag). Herstel: niveau 3 ruilen. Melden: de rest.
7. De 10 procentregel per loop. In deze en volgende week geen loop of tocht langer dan 110 procent van je langste van dat soort in de laatste 30 dagen, gemeten met dezelfde duurbron als het scherm. Herstel: plannedMinutes begrenzen op niveau 3. Melden: niveau 1 met een eigen duur.
8. Eén volle sleuteltraining per week. Een tweede lange duurloop of bergtocht in dezelfde week (bijvoorbeeld een inhaaltraining) is de korte versie. Herstel: plannedMinutes op de korte versie zetten voor niveau 3; voor een geaccepteerd inhaalvoorstel draagt het voorstel die duur zelf (zie de fix in deel 2, punt 7).
9. Het patroon is compleet. Elke plek in het patroon van die week is gevuld door een sessie van die plek (ongeacht sjabloon), of is bewust leeg: door jou overgeslagen, ziekte, de wedstrijdregels, de taper. Dit vangt de verdwenen bergtochten, tempolopen en intervallen. Herstel: een sessie die het systeem zelf op overgeslagen zette (generatedBy weekprescriptie of wedstrijdblok) terug op gepland, anders opnieuw aanmaken.
10. Wedstrijdregels. Op de wedstrijddag niets anders, in de twee dagen ervoor niets zwaars voor de benen, de wedstrijdweek kort, de dag erna de lange training kort. Herstel: niveau 3. Melden: niveau 1.
11. Geaccepteerde voorstellen staan er nog. Voor elk geaccepteerd voorstel met locks: de vastgezette sessies staan waar het voorstel ze zette, met de duur die het liet zien. Dit hoort nooit te falen. Faalt het toch, dan is dat een fout in een stap: terugzetten en in de console melden.
12. Gezonde data. weekStartDate klopt met de datum, geen twee open sessies van hetzelfde sjabloon op dezelfde dag tenzij bedoeld.

De meldingen worden een adviesregel (PLAN-CHECK) met een concreet voorstel, dat na Akkoord niveau 1 wordt. Zo blijft er altijd maar één route waarlangs iets van jou verandert: jouw Akkoord.

### Zo past het op de huidige code

Met zo weinig mogelijk breuk, want bijna alle logica bestaat al als pure functie.

- Nieuw: src/engine/planLocks.ts. lockLevel(session, logs, today) geeft 0 tot en met 3. De enige plek waar "mag ik dit aanraken" wordt beslist.
- Nieuw, of in programLayout.ts: patternSlotOf(templateId).
- Nieuw: src/engine/weekValidator.ts. validateWeeks(snapshot) geeft een lijst bevindingen; repairWeeks(snapshot) geeft wijzigingen voor niveau 3 plus wat overblijft.
- Nieuw: src/engine/planPipeline.ts. runPlanPipeline(snapshot, trigger) roept de bestaande functies in de volgorde hierboven aan: layoutPhases, patternSessions (verhuist uit database.ts naar engine, is al puur), arrangeWeekForRestDay, templateForPhase, applyRaceBlocks, computeForecastReplan, computeWeeklyPrescriptionPlan met applyPlanChangeItems, en de validator. Geeft terug: het programma, de te schrijven en te verwijderen sessies, de auditregels, de bevindingen en de nieuwe appliedRestDay.
- storage/database.ts: syncProgramHorizon houdt naam en aanroep, maar leest alleen de momentopname in, roept runPlanPipeline aan en schrijft het resultaat in één transactie. appliedRestDay gaat mee in de backup (meta).
- engine/raceBlock.ts: overal waar nu status planned staat als "mag ik aanraken", komt lockLevel 3. runs telt elke niet-overgeslagen tempoloop en test. restoreLegSwaps draait een paar nooit terug als een van beide vastzit; dan vervallen de markeringen van beide. Duplicaten opruimen.
- engine/weeklyPrescriptionEngine.ts: keepsInPlace kijkt naar de plek in het patroon en naar het niveau, niet naar defaultDayOfWeek.
- engine/proposalEngine.ts: move neemt plannedMinutes over. Een keep met plannedSessionId zet een lock. applyPlanChangeItems krijgt een optionele parameter met het lock dat moves, adds, swaps en keeps meekrijgen.
- engine/adviceEngine.ts: TEST-MAKE-ROOM zet een keep voor de beenkracht die het voorstel "erna" noemt. SAME-MUSCLE-SPACING gebruikt respectsHeavySpacing. Inhaalregels controleren de hoofddoeldatum.
- engine/scheduler.ts en engine/legFatigue.ts: één functie voor de index bij het plannen, met de echte duur (resolveVariantDuration of plannedMinutes), alle geplande sessies van de laatste 42 dagen voor de herhaalde-prikkelkorting (alleen de bijdrage telt de laatste 10 dagen), en het lichaamsgewicht. De kaart en het voorstelpaneel gebruiken dezelfde functie en tonen pijn en spierpijn er apart bovenop ("met je ochtendmelding erbij").
- state/AppDataContext.tsx: bij openen eerst de migraties, dan de pijplijn (in de bestaande horizonQueue, met beschikbaarheid en prescriptie erin, niet meer los en tegelijk), dan refresh(). commitPlanChange en applyProposal schrijven met een lock en roepen daarna de pijplijn aan zonder de sleutelcontrole. runForecastReplan en runWeeklyPrescriptionBuild worden dunne doorgeefluiken of verdwijnen.
- models/training.ts: lock (en later eventueel slot) als optionele velden. storage/migrations.ts: optionele, toegevoegde velden hebben geen migratiestap nodig, maar noteer het in de lijst met wijzigingen van het opgeslagen model, zoals CLAUDE.md vraagt.

### Stappenplan

Elke stap is los te leveren en laat de app werkend achter.

1. Direct, klein. De fix voor bug 2 (deel 4), plannedMinutes bij een move, en de herstelstap voor tests echt eenmalig maken: alleen terugzetten als er na de remove van de prescriptie geen latere skip van jou is (de laatste wijziging aan die sessie in de auditlijst is de remove van de prescriptie), of met een meta-vlag per sessie-id. Tests: raceBlock.test.ts "geaccepteerde testplek met benen erna blijft staan"; proposalEngine.test.ts "move neemt plannedMinutes over"; raceBlock.test.ts "een test die je zelf overslaat blijft overgeslagen".
2. Plek in het patroon. patternSlotOf, keepsInPlace op plek, de rustdagstap op plek, en een eenmalige reparatie (zoals restorePatternSessionsRemovedByPrescription, met een nieuwe meta-vlag) die tempolopen, intervallen, heuvels op en af, bergtochten en wandeldagen terugzet die de prescriptie op overgeslagen zette, vanaf vandaag en zonder log, en de overgeslagen wedstrijdduplicaten verwijdert. Tests: weeklyPrescriptionEngine.test.ts "haalt geen bergtocht, tempoloop of intervallen weg"; database.test.ts "rustdag wijzigen neemt test, tempoloop en geruilde krachtdag mee"; database.test.ts "reparatie zet blokweken weer compleet en ruimt wedstrijdduplicaten op".
3. De weekcontrole, eerst alleen melden. validateWeeks na elke sync, bevindingen in de console. Tests: weekValidator.test.ts per regel een geval dat faalt en een dat slaagt; een test die het standaardprogramma met een tussendoel door vijf gesimuleerde weken laat lopen en nul bevindingen verwacht.
4. Eén index. Tests: legFatigue.test.ts "kaart en planner geven dezelfde index voor dezelfde week"; adviceEngine.test.ts "de index die het paneel per optie toont is de index waarmee de optie gekozen is".
5. Locks en herkomst. Het veld lock, lockLevel, en de wedstrijdblok- en rustdagstap op niveaus in plaats van status. Tests: raceBlock.test.ts "een door de beschikbaarheid verschoven rustige duurloop wordt in het blok wel een tempoloop"; "een verschoven heuvelintervaltraining twee dagen voor de wedstrijd wordt gemeld, niet stil weggehaald"; weeklyPrescriptionEngine.test.ts "haalt nooit een sessie van niveau 1 weg".
6. De pijplijn. runPlanPipeline, syncProgramHorizon erom heen, beschikbaarheid en prescriptie erin, bootvolgorde in de rij, pijplijn direct na Akkoord. Tests: planPipeline.test.ts "twee runs achter elkaar: de tweede schrijft niets"; "een geaccepteerd voorstel overleeft zeven dagen sync"; "de volgorde van openen (eerste of tweede keer die dag) geeft dezelfde planning"; "de prescriptie die een sessie toevoegt twee dagen voor de wedstrijd wordt in dezelfde run gecorrigeerd".
7. Herstellen aan. repairWeeks voor niveau 3, PLAN-CHECK-advies voor de rest, en voorstellen van de adviezen eerst door een proefrun van stap 8 tot en met 10. Tests: adviceEngine.test.ts "een optie die na de proefrun een sessie in de getoonde week verandert, laat die verandering zien of wordt niet aangeboden".

## Deel 4: de fix voor bug 2

### Wat er precies gebeurt

Nagespeeld op de backup, met de registers zoals de app ze na de sync heeft.

1. Sync op 20 oktober. De herstelstap zet de test van 29 oktober terug op gepland. Het wedstrijdblok ziet Benen A op woensdag 28 oktober binnen 72 uur voor de test en ruilt hem met Bovenlichaam A: Benen A naar dinsdag 27 oktober in de korte versie (45 minuten), Bovenlichaam A naar woensdag 28. Beide krijgen een markering: Benen A van 28 naar 27, Bovenlichaam A van 27 naar 28.
2. De test staat op de rustdag (naast Herstel). TEST-MAKE-ROOM biedt als eerste optie "Testloop di 27 oktober, Benen A (zwaar) erna". Die optie bestaat alleen omdat Benen A daar de korte 45 minuten heeft: 45 plus 45 past in het dinsdagbudget van de back-up (90 plus 15 minuten), 75 plus 45 niet.
3. Het voorstel bevat één wijziging: de test naar 27 oktober. Benen A staat in de tekst, niet in de wijzigingen.
4. Akkoord. De test krijgt status moved. Benen A en Bovenlichaam A blijven op planned, met hun markering.
5. Sync op 21 oktober (nieuwe dag, nieuwe sleutel). In restoreLegSwaps:
   - runs zijn alleen tempolopen en testlopen met status planned. De test is moved, dus telt niet. Er is in die week geen enkele run.
   - Voor het paar van Benen A (from 28 oktober) is de vraag "staat er een run binnen 3 dagen na de oude plek?". Zonder runs: nee. Dus terugzetten: Benen A van 27 naar 28 oktober, de korte duur eraf; Bovenlichaam A van 28 naar 27.
   - Ook als de verplaatste test wel als run zou tellen, gebeurt hetzelfde: de oude plek van Benen A (28) ligt na de test (27), dus de afstand is min 1 dag en "nodig" blijft onwaar.
   - swapLegsBeforeHardRuns ziet daarna niets: de test telt niet, en Benen A ligt na de test.
6. Resultaat: test en Bovenlichaam A op dinsdag, Benen A in de volle versie op woensdag. Er komt geen nieuw testadvies, want het advies voor deze test is al beantwoord.

Twee oorzaken dus, die elk op zich genoeg zijn. Ten eerste: wat het voorstel laat zien (Benen A die dag, na de test, kort) is nergens vastgelegd, alleen de test. Ten tweede: de terugdraairegel kijkt alleen of de oude plek nog in de buurt van een geplande run ligt, niet of jij of een voorstel de week inmiddels anders hebt ingericht.

### Waarom status moved niet genoeg is

De test had al status moved. Benen A is door het voorstel niet verplaatst, dus moved zetten zou in Week "verplaatst" tonen voor een sessie die niet verplaatst is. En moved wordt ook gezet door de beschikbaarheidsstap, de krachtherverdeling en de prescriptie, dus het zegt niet dat jij iets geaccepteerd hebt. Daarom een apart lock.

### De fix

1. models/training.ts: een optioneel veld op PlannedSession.

   ```ts
   // You placed this session yourself, or accepted a proposal that shows it
   // here. The automatic planning never moves, swaps, shortens or retemplates
   // it; the week check only reports.
   lock?: { by: 'user' | 'proposal'; proposalId?: string; at: string };
   ```

2. engine/adviceEngine.ts, TEST-MAKE-ROOM, de kandidaat "vrije dag met beenkracht erna": naast de move van de test een keep voor elke beenkrachtsessie die het voorstel noemt.

   ```ts
   const items: PlanChangeItem[] = [
     moveItem(date),
     ...sameDayLegs.map((l): PlanChangeItem => ({ plannedSessionId: l.id, action: 'keep', reason: `${legsName} blijft die dag, na de test.`, generatedBy: ['engine/adviceEngine.ts', 'TEST-MAKE-ROOM'] })),
   ];
   ```

   Hetzelfde voor elke regel waarvan de tekst een sessie noemt die niet verandert.

3. engine/proposalEngine.ts, applyPlanChangeItems: een optionele vierde parameter lock. Een move, swap of add krijgt dat lock mee; een keep met plannedSessionId zet alleen het lock en verandert verder niets. In dezelfde wijziging: case 'move' neemt plannedMinutes over (deel 2, punt 7).

4. state/AppDataContext.tsx, commitPlanChange: applyPlanChangeItems(proposal.changes, planned, undefined, { by: 'proposal', proposalId: proposal.id, at: nu }). De geraakte id's bevatten de keeps al (touchedIds komt uit alle changes), dus Benen A wordt mee opgeslagen. Daarna de sync direct laten draaien (de sleutel leegmaken) in plaats van morgen. applyProposal (eigen verplaatsing en overslaan) zet { by: 'user' } en haalt het lock weg als je een sessie terugzet op haar oude dag.

5. engine/raceBlock.ts:
   - een hulpje free(s): status planned en geen lock. Gebruik het overal waar nu status planned staat als voorwaarde om te verplaatsen, te herschrijven of te verkorten;
   - runs in restoreLegSwaps en swapLegsBeforeHardRuns: elke tempoloop of test die niet overgeslagen is, ongeacht status of lock. Een test die jij verplaatste is nog steeds een test waar de benen rekening mee moeten houden;
   - in restoreLegSwaps: als een lid van een paar niet free is, niets terugzetten en de markering van beide leden laten vervallen. De week is dan van jou.

Na deze fix geeft dezelfde nagespeelde reeks: test en Benen A (kort, na de test) op dinsdag 27, Bovenlichaam A op woensdag 28, op 21 oktober en elke dag erna. Precies wat het voorstel liet zien.

Als het lock-veld nu te groot is: een tijdelijke fix zonder schemawijziging is in restoreLegSwaps geen paar terugzetten in een week waarin een tempoloop of test met status moved staat, en die runs wel als anker meetellen. Dat lost bug 2 op, maar niet de algemene les dat alles wat een voorstel laat zien, vast moet komen te zitten.

### Tests voor bug 2

- raceBlock.test.ts: open sessies zoals na het Akkoord (test moved op 27, Benen A met lock op 27 met markering van 28 naar 27 en kort, Bovenlichaam A op 28 met markering). applyRaceBlocks verplaatst niets en haalt de markeringen weg.
- raceBlock.test.ts: hetzelfde zonder lock (systeemsituatie): een run die naar voren is gehaald wordt als anker gezien, en beenkracht van niveau 3 blijft buiten de 72 uur ervoor.
- database.test.ts: met fake-indexeddb het standaardprogramma met een tussendoel, sync, het voorstel accepteren, dan de sync zeven dagen achter elkaar draaien met een opschuivende datum. De week blijft gelijk aan wat het voorstel toonde, inclusief de 45 minuten van Benen A.
- adviceEngine.test.ts: de optie "Benen A erna" bevat een keep voor Benen A.
