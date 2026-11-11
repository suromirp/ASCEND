# Programma, fasen en weekindeling

Datum: 11 november 2026. Vraag van de eigenaar: kijk nog een keer naar de totale duur van een programma, de weekindeling en de etappes, en naar de start. Alleen gelezen in de code, niets gebouwd. Voorbeelden komen uit de golden scenario's (`src/storage/planGolden.test.ts` en de snapshot ernaast), niet uit echte gegevens. Er is geen nieuwe literatuur gezocht: alle bronnen staan al in `docs/onderzoek/` en zijn hier met hun link herhaald.

Zekerheid per bewering: zeker (in de code gelezen of in de snapshot gezien), waarschijnlijk (volgt uit de code, niet gedraaid), onzeker (aanname).

## Eerst dit: 18 is niet de totale duur

"Week 3 van 18, opbouw" op Vandaag is de week binnen de fase, niet binnen het programma. `src/engine/weekLabel.ts#weekPositionLabel` schrijft `weekInPhase` van `phase.weekCount`. De 18 is dus de lengte van de fase Opbouw (zeker). De totale duur staat alleen in Instellingen, Programma ("Week X van Y, teruggerekend vanaf je doel", `src/components/settings/groups/DoelSheets.tsx`, `src/engine/settingsSummary.ts`).

Een Opbouw van 18 weken komt nooit uit de automatische indeling: die geeft 4, 8 of 12 weken. Achttien ontstaat alleen als een faselengte met de hand is gezet in Programma: of de basis staat vast en de Opbouw vult de rest, of de Opbouw staat op 20 of 24 en er pasten er maar 18 (zeker voor de code in `src/engine/programLayout.ts#layoutPhasesForGoal`; welke van de twee bij de eigenaar speelt is onzeker, dat kon ik niet zien).

## 1. De totale duur

Huidige stand. Er is geen vaste duur. Het programma loopt van de maandag van de startweek tot de doeldatum van het hoofddoel (`programLayout.ts#weeksUntilGoal`, `programAnchorDate`). De fasen worden vanaf het doel teruggeteld: afbouw 2 weken (1 week onder 8 weken totaal, geen onder 3), Expeditieklaar 4, Bergcapaciteit 8 (4 als er minder dan 20 weken over zijn), Opbouw 12, 8 of 4, en de basis krijgt wat overblijft. De beginstand speelt geen rol. Golden A (start 26 oktober 2026, tocht 25 juli 2027) geeft 39 weken: basis 13, Opbouw 12, Bergcapaciteit 8, Expeditieklaar 4, afbouw 2 (zeker).

Wat het onderzoek zegt. Voor een tocht van meer dan tien dagen is de specifieke periode minstens 16 weken, aanbevolen 20 (`Doelsoorten berg en buiten.md`, 6 (2); afgeleid, de 12 weken eronder komen uit de peesaanpassing, [Bohm 2015](https://link.springer.com/article/10.1186/s40798-015-0009-9), matig tot sterk). De rugzakladder naar 14 kg vraagt minstens 5 en liever 10 weken (zelfde rapport, 2.4; expert). Voor een 10 km als tussendoel is 8 weken blok genoeg (`Tussendoel hardloopwedstrijd.md`; matig).

Oordeel. Met Bergcapaciteit, Expeditieklaar en afbouw zijn er 14 weken met echte tochten, plus rugzakwandelingen in de winter. Dat zit net onder de aanbevolen 16 tot 20, maar de ladder van 7 naar 15 kg heeft 12 weken en dat is ruim (waarschijnlijk goed genoeg; het getal 16 is zelf afgeleid). Het blok van 8 weken voor de 10 km klopt.

Doel dichterbij. Er is geen ondergrens. Bij 6 weken tot het doel krijg je 1 week Bergcapaciteit, 4 weken Expeditieklaar en 1 week afbouw: iemand begint dan vrijwel direct met twee wandeldagen achter elkaar en een rugzak die naar tochtgewicht klimt (zeker, uit `layoutPhasesForGoal`). Het minimum uit het onderzoek staat wel als gegeven in `src/data/goalKinds.ts` (`buildWeeks`, 16 en 24 voor een lange trektocht), maar `buildWeeksFor` heeft buiten de tests geen aanroeper gevonden (waarschijnlijk: de waarschuwing "dit is te kort" bestaat nog niet).

Doel verder weg. Alle extra weken gaan naar de basis. Die herhaalt golven van vier weken en groeit 8% per golf tot 1,3 maal, dus na ongeveer 17 weken is de basis vlak tot de Opbouw begint (zeker, `cycleMultiplier`). Dat is rustig en verdedigbaar, maar een basis van een half jaar of langer voelt als stilstand (afgeleid).

Alleen een hardloopwedstrijd als doel (golden C). Dan telt het programma niet terug vanaf de wedstrijd: `src/engine/firstPlan.ts` geeft alleen een tocht een anker. Het plan krijgt de vier oude blokken van vier weken, met de namen Bergcapaciteit en Expeditieklaar, en in de snapshot staan bergtochten van 270 en 300 minuten met 15 kg op 31 januari en 7 februari, vijf en zes weken voor een 10 km op 13 maart (zeker). Dat past niet bij het onderzoek (`Doelsoorten berg en buiten.md`, 2.5: andere doelsoorten krijgen eigen of neutrale namen) en niet bij de regel dat een plan zonder tocht geen bergtocht en rugzak krijgt. Golden C legt dit gedrag nu vast.

## 2. De fasen

Huidige stand. Basisfase, Opbouw, Bergcapaciteit, Expeditieklaar, Naar de start (`programLayout.ts`, `PHASE_TEXT`). In elke fase een golf van vier weken: wennen, opbouw, zwaarste week, rustweek (`WAVE_LENGTH` in `src/models/program.ts`). De rustweek ligt rond 65% van de zwaarste week (lange duurloop 45 tegen 70 minuten, `src/data/defaultProgram.ts`). Afbouw: eerste week ongeveer 70%, laatste 50% van een gewone opbouwweek, tempo gelijk (`taperFactor`). De rustweek overslaan of een week herhalen gaat via een voorstel (`engine/restWeek.ts`, `engine/repeatWeek.ts`).

Wat het onderzoek zegt. De afbouw heeft goed bewijs: ongeveer twee weken, volume 41 tot 60% omlaag, intensiteit en frequentie gelijk ([Bosquet 2007](https://coachsci.sdsu.edu/csa/vol131/bosquet.htm), sterk voor het principe). De rustweek is gewoonte, geen bewijs: in een krachtstudie leverde ze niets extra op ([Coleman 2024](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10809978/), zwak, geen duursport); coaches halen elke derde of vierde week ongeveer de helft eraf ([Uphill Athlete](https://uphillathlete.com/mountaineering/training-for-mountaineering/), expert). De volgorde basis, opbouw, specifiek is praktijk van aanbieders (expert). Elke 7 tot 14 dagen een afdaalprikkel, tot aan vertrek ([Maeo 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5348007/), matig).

Oordeel. Namen, volgorde, de golf van drie op één en de afbouw kloppen met het onderzoek (zeker voor de afbouw, expert voor de rest). Drie dingen kloppen minder goed.

Een fase die de rest opvangt eindigt midden in een golf. De golf telt per fase opnieuw (`waveWeek` leest `weekInPhase`). Bij 18 weken Opbouw zijn week 4, 8, 12 en 16 rustweken; week 17 en 18 zijn wennen en opbouw, en daarna begint Bergcapaciteit weer bij wennen. In golden A heeft de basis 13 weken: rustweek, dan een losse week wennen, dan Opbouw week 1, opnieuw wennen. Drie lichte weken op rij (zeker uit de code). Het is niet schadelijk, wel een verloren opbouwweek, en de groei per golf (`cycleMultiplier`, telt per programmaweek) loopt dan niet meer gelijk met de golf van de fase.

De afbouw geldt voor duur, niet voor kracht en heuvels. In golden A staat Benen A (zwaar, 75 minuten) op woensdag 21 juli, vier dagen voor vertrek op 25 juli, en Heuvelintervallen op zaterdag 24 juli, de dag ervoor (zeker, snapshot). Het eerdere rapport raadt aan dat kracht en loopintensiteit in de laatste twee weken krimpen (`Trainingsopbouw voor GR5 en hardlopen.md`, weekindeling per fase; afgeleid). Vier dagen is ruim boven de 72 uur, dus het is geen fout, maar een heuveltraining op de laatste dag voor een tocht van weken is onnodig. Of Forge de sets in de afbouw zelf verlaagt heb ik niet nagegaan.

Expeditieklaar oefent alleen weekenden van twee dagen. Het visierapport vroeg om een paar blokken van drie dagen (`docs/visie/Trainingswetenschap.md`, knelpunt 8; expert). Zo'n blok kan als eigen tocht worden gepland, maar het programma zet het er niet zelf in (waarschijnlijk).

## 3. De weekindeling

Huidige stand (golden A, rustdag maandag). Maandag herstelwandeling 45 minuten, dinsdag Bovenlichaam A, woensdag Benen A zwaar, donderdag rustige duurloop 30 tot 40, vrijdag Bovenlichaam B, zaterdag heuvels (om de week met afdalen), zondag lange duurloop 50 tot 70. Zes trainingen plus een wandeling, ongeveer 6,5 uur in de basis. Vanaf Bergcapaciteit wordt de zondag een bergtocht, in Expeditieklaar de zaterdag de eerste wandeldag: het zwaarste weekend is 180 plus 300 minuten met 15 kg, de week komt dan rond 12 uur (zeker). Regels: 48 uur tussen beenzware dagen, 72 uur na een tocht met afdalen, het weekendblok heuvels en lange loop is de enige bewuste uitzondering (`src/engine/scheduler.ts#legSpacingDays`, `docs/beslissingen/2026-11-02-48-uur-lange-duurloop.md`). Bij het eerste plan is het advies 5 dagen voor een tocht, 4 voor een wedstrijd (`src/engine/weekShape.ts#adviceDays`).

Wat het onderzoek zegt. Kracht, duur en specifiek rugzakwerk samen werken het best ([Knapik 2012](https://pubmed.ncbi.nlm.nih.gov/22130400/), matig). Ongeveer 80% rustig, bij drie loopjes één harde ([Oliveira 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11329428/), matig). Zware benen 48 tot 72 uur voor de grootste tocht van de week ([Orr 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8069713/), zwak tot matig). Tien tot twaalf uur per week in de zwaarste weken is wat aanbieders voor zware tochten noemen ([Uphill Athlete](https://uphillathlete.com/trekking/training-for-trekking-and-hiking/), expert). Twee dagen achter elkaar is specifiek maar nooit getoetst (expert).

Oordeel. De week is verstandig. Benen A op woensdag ligt 72 uur voor de zaterdag en 72 uur na de zondag: beter kan het niet in zeven dagen (zeker). Eén harde looptraining op drie klopt. Zes dagen is veel voor wie net begint, maar het advies van 5 vangt dat op. Eén ding viel op in de snapshot: in de wedstrijdweek van golden A staan Benen A en Bovenlichaam A samen op dinsdag 9 maart (elk 45 minuten), en op 18 maart een rustige loop en Benen A op één dag. Dat volgt uit de rust rond de wedstrijd; of het zo bedoeld is weet ik niet (onzeker).

## 4. De start

Huidige stand. Een nieuwe app plant niets en vraagt eerst (`docs/beslissingen/2026-10-25-eerst-vragen-dan-plannen.md`). `firstPlan.ts#buildFirstPlan` zet de startdatum op de maandag van de week waarin je begint; trainingen komen pas vanaf vandaag (`src/storage/databaseHorizon.ts`, `from: today`). Week 1 is altijd de week wennen. Er is geen instaptest voor een tocht; alleen een hardloopdoel plant een testloop (20, 9 en 4 weken voor de wedstrijd, `src/engine/raceBlock.ts`). De beginnersstart (vier weken zonder harde training, hoogstens vier dagen) bestaat alleen zonder doel (`PHASE_GOLF_START`, `docs/beslissingen/2026-10-31-zonder-doel-beginnersstart.md`). Later opnieuw instappen kan met "Opnieuw bij week 1" in Programma, deze week of volgende week, schoon of alleen de telling (`src/storage/databaseSeed.ts`); omdat de fasen vanaf het doel tellen wordt dan alleen de basis korter (zeker).

Wat het onderzoek zegt. Wie de laatste acht weken weinig deed heeft eerst vier weken basis nodig met beginnersregels: hoogstens vier dagen, de eerste twee weken geen harde dag (`Doelsoorten berg en buiten.md`, 2.4; afgeleid). Elke loop hoogstens 10% langer dan je langste van de laatste 30 dagen ([Frandsen 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12421110/), matig); die rem zit er al in (`src/engine/substitutions.ts`).

Oordeel. De start is netjes, met twee gaten. Begin je op vrijdag of zaterdag, dan is week 1 al voorbij na een of twee trainingen en begint maandag week 2: de makkelijkste week valt weg (zeker). En een beginner met een tocht als doel krijgt geen beginnersstart: de eerste zaterdag staan er meteen heuvelintervallen (waarschijnlijk; de 110%-rem beschermt de duur, niet de intensiteit).

## 5. Advies, op volgorde van belang

Elk punt is een voorstel voor een regel, geen besluit. Niets hiervan mag de planning stil veranderen, en punt 2 tot en met 5 bewegen een golden scenario: daar hoort eerst een besluit bij.

1. Maak de kop eenduidig. "Opbouw, week 3 van 18" met de fase voorop, en ergens op Vandaag of Week de totale stand ("week 3 van 39 naar je doel"). Reden: de kop wordt nu gelezen als de totale duur, ook door de eigenaar. Raakt alleen tekst: `engine/weekLabel.ts`, `engine/sessionBrief.ts`, de tekstkaart en hun tests. De planning merkt er niets van.

2. Afbouw ook voor benen en heuvels. Voorstel: in de laatste week voor een hoofddoel de beendag in de korte versie en geen heuveltraining op de laatste twee dagen (afgeleid, richting uit Bosquet en het eerdere rapport). Raakt `programLayout.ts` of `weekValidator.ts`, en golden A.

3. Laat een fase op een rustweek eindigen. Voorstel: de weken die niet in hele golven passen aan het begin van de restfase zetten, of de golf over de fasegrens laten doorlopen, zodat er geen losse wenweken ontstaan. Raakt `programLayout.ts` (`waveWeek`, `layoutPhasesForGoal`), de rugzakladder (`ladderWeeks`) en golden A. Voor de eigenaar: 18 weken Opbouw terugzetten op 16 of 20 lost het voor nu op, via het voorstel dat Programma al geeft.

4. Een hardloopplan zonder tocht krijgt geen bergfasen. Voorstel: bij alleen een wedstrijd terugtellen vanaf de wedstrijd met neutrale namen (basis, opbouw, specifiek, afbouw) en zonder bergtocht of rugzak. Raakt `firstPlan.ts`, `programLayout.ts` en golden C; vraagt een eigen besluit omdat C nu bewust vaststaat.

5. Zeg het als het doel te dichtbij is. Voorstel: onder het minimum uit `goalKinds.ts` (`buildWeeks.min`) een voorstel met Akkoord zoals het onderzoek al beschrijft: latere datum, kleiner doel of meedoen. Onder ongeveer 8 weken geen Expeditieklaar op volle zwaarte. Raakt een nieuwe controle in `engine/` en het doelblad; de indeling zelf pas na een besluit.

6. Twee kleine dingen bij de start. Begin je op vrijdag tot en met zondag, bied dan "start volgende maandag" aan in het eerste voorstel (de keuze bestaat al bij Opnieuw bij week 1). En geef de beginnersstart ook aan een plan met een doel als de laatste acht weken leeg zijn. Raakt `firstPlan.ts` en `engine/beginnerStart.ts`; alleen nieuwe plannen, bestaande bewegen niet.

Wat ik niet zou veranderen: de golf van drie op één, de afbouw van twee weken, de weekindeling met Benen A op woensdag, en het blok van 8 weken voor de 10 km.

## Tot slot

Wat het onderzoek zegt. De afbouw van twee weken is het enige onderdeel met sterk bewijs. De 10% per loop en de combinatie van kracht, duur en rugzak hebben matig bewijs. De lengte van fasen, de rustweek, de wekengetallen per doel en twee dagen achter elkaar zijn praktijk van coaches en eigen afleiding.

Wat het betekent voor de app. De opzet klopt: terugtellen vanaf het doel, golven van vier, een echte afbouw, een week met 72 uur rond de beendag. De 18 is een faselengte en geen programmaduur, en de kop zegt dat niet duidelijk genoeg. De randen zijn zwak: een fase die midden in een golf eindigt, kracht en heuvels in de laatste week, een doel dat te dichtbij ligt, een hardloopplan met bergfasen, en een start laat in de week.

Wat nog onzeker is. Hoe de 18 weken bij de eigenaar zijn ontstaan en hoe lang zijn hele programma is. Of Forge kracht in de afbouw al lichter maakt. Of de twee trainingen op één dag in de wedstrijdweek bedoeld zijn. Of de 110%-rem ook voor tochten geldt. Er is niets gedraaid: alles komt uit lezen van de code en de snapshot. Bij pijn of klachten hoort een arts of fysiotherapeut, niet dit rapport.
