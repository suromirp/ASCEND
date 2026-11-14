# Profielendoorloop: iemand die meerdere sporten doet

Datum van de doorloop: 14 november 2026, door Lookout en Pathfinder. Gebouwd vanaf origin/main (52e607eb), Chromium op 412 px (schaal 1), processor 4 keer vertraagd, echte touch, Europe/Amsterdam, klok vast met Playwright `page.clock`. Start met een lege app op maandag 16 november 2026, daarna dag voor dag tot en met maandag 30 november (16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 29 en 30 november). Alles nagemaakt, geen back-up van de eigenaar. Schermafdrukken staan in de scratchpad (`.../scratchpad/lk/shots/`), niet in de repo.

Het profiel: intake met Fitter worden, 4 dagen, "Nee, ik sport geregeld", met kracht. Daarnaast: zwemmen (ma 16 en vr 27), kracht in Forge (di 17, wo 18, di 24, wo 25), hardlopen (planning en een inhaalloop), padel (vr 20), een fietstocht van 2,5 uur (za 21), een herstelwandeling (zo 22), voetbal (di 24, op dezelfde dag als Forge), en een week later weer de planning.

Kort oordeel: de planning en de weekcheck doen met meerdere sporten wat het ontwerp belooft (padel en voetbal tellen mee voor de benen, na een zware voetbalavond komt er een voorstel met Akkoord). Maar een sport die je met Losse training logt wordt als hardlopen opgeslagen, en daar breekt het verhaal: het Logboek, de Stand, de Terugblik en de aanmoediging kloppen niet meer.

Eerder gemeld en hier niet opnieuw uitgewerkt: de Forge-tikdoelen van 24 en 32 px (gr5, bevinding 4 en 8), "Zwaarte volgens MacroFactor" zonder MacroFactor (beginner 6), "Gevoel: Gaat goed" zonder dat je iets zei (beginner 10), de duur in Je dag (gepland) tegenover de kaart (gelogd), bijvoorbeeld "Gedaan · 75 min" naast "gedaan, 90 min" (hardloper 6, dwarsligger 2), "Gedaan zoals gepland" na een training zonder een ingevulde kg (beginner 3), en de week die op drie plekken anders telt (beginner 2). Die zie ik hier ook, zelfde oorzaak.

## Moet

### 1. Een zwemmen, padel of voetbal uit Losse training wordt als hardlopen bewaard

Dag: elke dag waarop ik een sport logde (ma 16, vr 20, di 24, vr 27 november).
Scherm: Logboek, Stand, de Terugblik na het opslaan, Week.
Wat ik zag: in het Logboek staat "Zwemmen, Hardlopen · 40 min", "Padel, Hardlopen · 90 min" en "Voetbal, Hardlopen · 90 min · voelde slechter". De tegel Lopen telt "8 keer" terwijl ik maar 4 keer liep (twee keer zwemmen, padel en voetbal komen erbij). In de Terugblik na padel en voetbal staat "Telt mee voor: Uithoudingsvermogen (Hardlopen): 1 u 30 min" en "Belastbaarheid van je benen (Hardlopen): 1 u 30 min". Het opgeslagen log (IndexedDB, `sessionLogs`) heeft `templateId: "sport_swimming"`, `type: "cardio"`, maar geen `countedSport` en geen `sport`.
Wat ik verwachtte: Zwemmen, Padel en Voetbal als eigen sport (zoals in de besluiten van 2 november: "Het log krijgt `countedSport` en is nooit hardlopen"), niet in Lopen, en geen bewijs voor hardloopuithoudingsvermogen.
Bestand en regel: `src/components/logForm/manualLog.ts:30-37` bouwt de invoer van een handmatig log zonder `countedSport` of `customSport`; `src/state/logSession.ts:102` zou ze bewaren. Zonder het veld valt `src/engine/sports.ts:84` terug op `type === 'cardio'`, dus 'running', en `src/engine/capability.ts:98-104` telt het als hardlopen. Alleen een import (`activityImport.ts`, `healthConnect.ts`) zet het veld. Een Fietstocht gaat wel goed (die heeft een eigen modaliteit).
Naspelen: Instellingen, Planning, Sporten, Zwemmen, Telt mee als ik het doe. Terug naar Vandaag, Losse training, Zwemmen, 40 min, zwaarte 5, Nee, Gedaan invullen, Opslaan. Open Logboek.
Mag het later tellen? Nee: het log is append-only, dus oude logs blijven fout tot er een eigen herstelstap komt.

### 2. Zwemmen, padel en voetbal staan niet in Losse training zolang je geen rol koos

Dag: ma 16 november (eerste dag), en vr 20 (padel), di 24 (voetbal).
Scherm: Vandaag, Losse training.
Wat ik zag: de lijst bevat fietsen, alle loopjes, wandelingen en kracht, maar geen zwemmen, padel, voetbal of yoga. Pas nadat ik in Instellingen, Planning, Sporten (drie tikken vanaf het tandwiel) per sport "Telt mee als ik het doe" koos, verschijnen ze. De intake zegt zelf: "Andere sporten die je doet tellen straks gewoon mee."
Wat ik verwachtte: dat je een zwempartij kwijt kunt waar je ook de rest kwijt kunt, of dat Losse training zegt waar je een sport aanzet ("Zwemmen of padel? Kies eerst bij Sporten hoe het telt").
Bestand en regel: `src/engine/sportTemplate.ts:5-6` en `:47-50` (het sjabloon staat "alleen in de lijst zolang de sport meetelt"); de lijst komt uit `templates` in `src/pages/Today.tsx:643-648` en `src/state/AppDataProvider.tsx:118`. Het besluit noemt dit bedoeld, maar voor een nieuwe gebruiker is er geen weg: geen uitleg, geen knop "Iets anders".
Naspelen: verse app, Losse training, lees de lijst.

### 3. De aanmoediging na een zware sport zegt het tegenovergestelde

Dag: vr 20 (padel, 90 min, zwaarte 7), za 21 (fietstocht 150 min), di 24 (voetbal, 90 min, zwaarte 8, "voelde slechter").
Scherm: het blad Gedaan na het opslaan.
Wat ik zag: bij padel en voetbal: "Goed dat je bewoog. Licht en rustig is precies de bedoeling van vandaag." In hetzelfde blad: "Morgen Benen A (zwaar). Je benen zijn dan vermoeid. Beenindex 41,8: tot 8 is fris, boven 12 vermoeid." Bij de fietstocht: "Gedaan zoals gepland. Zo bouw je op." en twee regels verder "Deze training stond niet in je planning."
Wat ik verwachtte: voor een zware, ongeplande sport een zin die bij de zwaarte past (of geen zin).
Bestand en regel: `src/engine/coach.ts:141` (zonder gevonden sjabloon, of een herstelsjabloon, altijd de herstelzin); de fietszin komt uit dezelfde `coachReaction` verderop en kijkt niet of er een planning was.
Naspelen: padel of voetbal loggen met zwaarte 7 of 8.

### 4. "Hoe zat je kleding?" en Zweetverlies na een zwempartij of padel

Dag: ma 16 (zwemmen), vr 20 (padel), di 24 (voetbal).
Scherm: het blad Gedaan.
Wat ik zag: "Hoe zat je kleding? Te warm, Goed, Te koud" en "Zweetverlies: Gewicht voor (kg), Gewicht na (kg), voor je plast, in dezelfde kleding" na zwemmen. Dat zijn weer en loopkleding. Het Zweetverlies kwam erbij na zwemmen, padel en voetbal; bij een binnensport zonder wind is "te koud" geen vraag, bij zwemmen is het wegen in kleding onzin.
Bestand en regel: `src/components/CompletionMoment.tsx:143` toont `ClothingFeedback` bij elke sessie met één log, en `:70-76` het zweetverlies; geen controle op sport of `placeIsOutdoor` (`src/engine/trainingPlace.ts`).
Naspelen: zwemmen loggen met Telt mee, kijk naar het blad.

## Mag

### 5. "Golven, week 1 van 16" tegenover "Week 1 van 4 van je golf"

Dag: ma 16 november.
Scherm: het trainingsscherm van een losse training (Zwemmen) tegenover Vandaag en Week.
Wat ik zag: boven het formulier "Ma 16 november · Golven, week 1 van 16"; Vandaag en Week zeggen "Week 1 van 4 van je golf".
Bestand en regel: `src/engine/sessionBrief.ts:77` en `src/engine/sessionActions.ts:110` gebruiken `weekPositionLabel` zonder `waveHeader` (zoals `src/pages/Today.tsx:531` wel doet).
Naspelen: Losse training, Zwemmen, kijk onder de titel.

### 6. Een zwempartij krijgt hartslagzone en praattest

Dag: ma 16.
Scherm: het trainingsscherm van Zwemmen.
Wat ik zag: "60 minuten totaal, Zone 2 hartslag, Praten kan hele zinnen". De 60 minuten is een standaard van het afgeleide sjabloon; ik koos 40. De vakjes zijn voor lopen. [Likely] hetzelfde voor padel en voetbal (niet gezien).
Bestand en regel: `src/engine/sportTemplate.ts:33-37` (`durationVariants: { full: 60 }`, type cardio).
Naspelen: zie 2.

### 7. Een tikje op de plank wordt niet bewaard

Dag: wo 18 november (Benen A (zwaar)).
Scherm: Forge, Afronden, daarna het blad Gedaan.
Wat ik zag: bij Afronden "22 van 22 werksets gedaan", na Opslaan "6 oefeningen · 19 sets". Het log bevat zes oefeningen; Plank (drie sets, voorschrift 45 seconden) ontbreekt. Ik had de sets afgevinkt zonder getal; bij de andere oefeningen vult Forge de voorgeschreven herhalingen in, bij Plank niet. Of het veld voor de plank een getal toonde heb ik niet apart bekeken.
Wat ik verwachtte: een afgevinkte set bewaard, of een waarschuwing dat een hold-set zonder seconden niet telt.
Bestand en regel: `src/components/logForm/manualLog.ts:107` (`.filter((set) => set.reps > 0)`).
Naspelen: Benen A (zwaar), alle sets afvinken, Afronden, Opslaan, tel het aantal oefeningen.

### 8. Een gemiste loop wordt ingehaald "want gisteren deed je geen training", terwijl je liep

Dag: ma 23 november.
Scherm: Vandaag, kaart Advies, gemist.
Wat ik zag: "Lange duurloop doe je vandaag in plaats van je rustdag, want gisteren deed je geen training." Zondag 22 had ik een herstelwandeling van 60 minuten gelogd, en vr en za padel en fietsen (het voorstel bleef 45 min, dus redelijk). Het voorstel is niet fout, maar de reden klopt niet met wat ik zag in het Logboek.
Bestand en regel: `src/engine/adviceShared.ts:232` (`type !== 'recovery'` telt een herstelwandeling niet als training) en `src/engine/adviceWeek.ts:77`. Bedoeld, maar de zin zegt het niet.
Naspelen: een loop laten liggen, zondag alleen Herstelwandeling loggen, maandag Vandaag.

### 9. De lange duurloop van zondag werd stil korter (82 naar 50 minuten)

Dag: ma 23 november, na het loggen van de ingehaalde loop van 45 min.
Scherm: Week, zondag 29.
Wat ik zag: na Akkoord op het voorstel (Week, "2 trainingen aangepast") stond zondag op 82 min; na het loggen van de loop van 45 min stond hij op 50 min, zonder "aangepast" op die rij en zonder nieuw voorstel. Het eerdere voorstel noemde 76 minuten. Gevonden door dezelfde stand op drie momenten te openen (na Akkoord, na het loggen, dinsdag).
Wat ik verwachtte: een wijziging van de planning alleen via een voorstel met Akkoord.
Bestand en regel: niet gevonden; de regel "twee volle lange duurlopen in één week is te veel" in `src/engine/adviceWeek.ts` wordt als tekst genoemd, maar de verandering van de zondagsduur zelf heb ik niet gelokaliseerd. [Likely] een gevolg van de planningsronde na het loggen; zeker is alleen het verschil in de Week-tab.
Naspelen: zie 8, accepteer het voorstel, log de loop op maandag, open Week.

### 10. Het voorstel na de zware voetbalavond is de volgende ochtend weg

Dag: di 24 (avond) en wo 25 november (ochtend).
Scherm: Vandaag en Week.
Wat ik zag: di avond "Advies, zwaar: Voetbal was zwaar (zwaarte 8 van 10). Benen A (zwaar) naar vr 27 november" met Akkoord, zowel in het blad als op Vandaag. Wo ochtend: geen kaart, geen voorstel in Week, Benen A (zwaar) staat gewoon op vandaag met de tekst "Voetbal voelde gisteren zwaar. Begin rustig; gaat het vandaag niet, neem dan de korte versie." Benen "Vermoeid" (beenindex 41,8 de avond ervoor). Ik sloot het blad met Begrepen; of dat het voorstel liet vervallen heb ik niet nagegaan.
Wat ik verwachtte: het voorstel blijft staan tot ik kies, of de ochtendkaart zegt dat het vervallen is.
Bestand en regel: niet gelokaliseerd.
Naspelen: voetbal 90 min zwaarte 8 loggen op dinsdagavond, Begrepen, woensdagochtend Vandaag.

### 11. Een losse training is op Vandaag en in de weekbalk onzichtbaar

Dag: ma 16 (zwemmen), vr 20 (padel), za 21 (fiets).
Scherm: Vandaag.
Wat ik zag: na een zwempartij op een rustdag blijft de kaart "Rustdag" en de weekbalk toont op maandag nog het hangmatje. Na padel op vrijdag blijft "Rust of vrije dag, vandaag staat er niets gepland", zonder dat er iets staat over wat je deed; Je dag noemt een geplande training als Gedaan, een losse niet. Alleen de "Terugblik" en een melding in de back-upkaart ("Je 2 trainingen") verraden dat er iets is opgeslagen. Op di 24 wel goed: "Bovenlichaam A en Voetbal gedaan, 160 min" (twee trainingen op één dag).
Bestand en regel: niet gelokaliseerd (`src/pages/Today.tsx` en de weekstrip).
Naspelen: zwemmen loggen op de rustdag, kijk naar Vandaag.

### 12. De Stand spreekt zichzelf tegen over je benen en je week

Dag: ma 23, ma 30, zo 22 november.
Scherm: Stand.
Wat ik zag: "Benen Fris, 6 trainingen werken nog door" (ma 30) en "Benen Fris, 4 trainingen werken nog door" (ma 23), terwijl het blad van zondagavond zei: "Morgen is een rustdag. Je benen zijn dan vermoeid. Beenindex 21,2." Dezelfde dag, twee oordelen. En "Je week 414 van 120 minuten" (zo 22) terwijl Week 8:04 uur noemt; 70 minuten (Benen A) ontbreekt, op di 17 ontbrak Bovenlichaam A (Stand 40, Week 2:10 uur). Voor een week met alleen losse sporten klopt het, met kracht niet.
Bestand en regel: niet gelokaliseerd.
Naspelen: zie dag 22 november, openen Stand.

### 13. De intake vraagt niet naar je andere sporten

Dag: ma 16 november.
Scherm: de start.
Wat ik zag: Fitter worden, dagen, welke dagen, kracht of niet, herstart of niet. Geen vraag "doe je ook zwemmen, fietsen, een balsport?". Het plan eindigt met "Je week bestaat uit kracht en lopen. Andere sporten die je doet tellen straks gewoon mee." en "Je week: 120 minuten en 2 keer kracht" terwijl het plan 270 minuten bevat. Pas in Instellingen kan je ze aanzetten, en een fietstocht wordt zonder rol al "Telt mee".
Bestand en regel: niet gelokaliseerd (de start staat in `src/components/onboarding/`).

## Wat goed ging

- Padel en voetbal tellen mee voor de beenindex: na padel 23,3, na voetbal 41,8; de Week toont ze in de belastingbalk, "Zaterdag is je zwaarste dag", en waarschuwt "tussen Lange duurloop en Voetbal zit geen hele dag, liefst 48 uur".
- Na een zware voetbalavond komt er een voorstel met Akkoord om Benen A (zwaar) te verplaatsen (alleen via een voorstel, nooit stil), en de woensdag zegt dat je rustig moet beginnen.
- Twee trainingen op één dag (Bovenlichaam A en voetbal, 24 november): Vandaag zegt "Bovenlichaam A en Voetbal gedaan, 160 min"; de Week toont beide als gedaan; geen tegenstrijdige melding.
- Een gemiste lange duurloop wordt als voorstel met Akkoord ingehaald en kan ongedaan gemaakt worden; het voorstel respecteert het weekbudget.
- De fietstocht heeft een eigen sport (Fietsen, Buiten) in het Logboek en telt apart.
- Geen horizontale overloop op 412 px, geen tekst onder 12 px, alleen de Forge-tikdoelen onder 44 px (bekend). De "Uitleg" cirkels in Instellingen meten 20 bij 20 maar hebben een onzichtbare rand tot 44 px (`ui.tsx:117-123`); dat is geen fout. Geen console-fouten, geen Engels in het gebruikte pad (behalve de Forge-oefeningnamen, bekend), geen gedachtestreepjes gezien.

## Niet gecontroleerd

- Echte telefoon en vinger; de klok was vast, dus de Forge-timer en datumvelden (US-notatie "11/16/2026" in het datumveld) kunnen een artefact zijn.
- Garmin, intervals.icu, Strava of Health Connect: een zwempartij of padelpartij die via import binnenkomt (die zet wel `countedSport`) heb ik niet gevolgd.
- Een doel met een datum (bergtocht) en de rugzakladder; alleen de richting Fitter worden.
- Een vaste dag voor een sport (Vaste dag) en Hoeveel per soort (Minder, Meer).
- De sets van Forge met echte kilo's en herhalingen; ik vinkte alles af zonder getallen.
- 360 en 390 px; alleen 412.

## De drie belangrijkste punten

1. Een sport uit Losse training wordt als hardlopen bewaard (bevinding 1): Logboek, Lopen-tegel en capaciteitsbewijs kloppen niet, en dat valt niet meer te herstellen omdat een log append-only is. Eén veld in `manualLog.ts` lost het op voor nieuwe logs.
2. Een nieuwe gebruiker kan zwemmen, padel of voetbal niet kwijt zonder eerst in Instellingen een rol te kiezen (2), en de aanmoediging, kleding- en zweetvragen na zo'n sport passen er niet bij (3, 4).
3. Na een zware sport doet de planning iets verstandigs (voorstel met Akkoord, dagtekst), maar het voorstel verdwijnt zonder keuze (10), een sessieduur verandert zonder voorstel (9) en Stand, Vandaag en Week zeggen over je benen en je week verschillende dingen (11, 12).
