# Vermoeidheid per oefening, de grove stap en de zin bij een lichter gewicht

Datum: 2026-10-26
Status: aangenomen

## Besluit

Drie wijzigingen in het krachtmodel (`engine/strengthModel.ts`, `engine/forgeWorkout.ts`, `engine/forgeAdjust.ts`).

Eén: de daling van kracht van set tot set is niet meer voor elke oefening 3%, maar wordt per oefening geleerd uit je eigen werksets. Instelling "Vermoeidheid per set" met "Leren per oefening" (het advies) en "Vast 3%" (het oude gedrag).

Twee: als de stap van een toestel of dumbbell te grof is om in het bereik te blijven, vergelijkt het model voor de eerste set het lichtere gewicht met het zwaardere en kiest de kant met de kleinste verwachte misser in herhalingen. Bij een gelijke misser blijft het de lichte kant.

Drie: de zin bij een lichter gewicht beschrijft niet langer "vorige keer onder het bereik van nu" als het doel vorige keer anders was. Bij een ander doel gaat de zin over het doel van deze keer.

## Hoe het leren werkt

`learnFatigue` neemt per training de werksets in volgorde. Van elke set met een schatting (herhalingen plus RIR, KR-1) wordt de relatieve daling ten opzichte van de vorige set bepaald. Opwarmsets, sets zonder schatting en sets ver van falen (half gewicht, RIR 4 of meer) tellen niet en onderbreken een paar, er wordt dus nooit over zo'n set heen gerekend.

Het getal is de mediaan van die dalingen, omdat één rare set dan weinig doet. Bij weinig paren wordt hij naar 3% getrokken: (n x gemeten + 8 x 3%) / (n + 8). Met twee paren ligt hij dus vlak bij 3%, met twintig paren ruim bij het gemeten getal. Daarna blijft hij tussen 1% en 12%. De 8 en de grenzen zijn keuzes van het model, geen uitkomsten van onderzoek, en zijn niet afgestemd op een kleine hoeveelheid eigen data.

Bij "Werksets gelijk" (alle sets hetzelfde gewicht) tellen alleen paren met hetzelfde gewicht, want dan meet de daling echt vermoeidheid bij dezelfde taak. Bij aflopende sets tellen alle paren. Dat is de eenvoudigste vorm die te toetsen is. Het nadeel: waar het gewicht omlaag gaat, schat Epley met meer herhalingen dan er komen, dus de daling in geschatte kracht valt daar groter uit dan bij hetzelfde gewicht. Dat is een bekende zwakte van de schatting, en het getal wordt er niet door gecorrigeerd. Wie dat niet wil, kiest "Vast 3%".

Het geleerde getal (`Prescription.fatiguePerSet`, ook op `WorkoutExercise.fatiguePerSet`) vervangt `FATIGUE_PER_SET` bij de latere sets van het voorschrift, bij de verwachte herhalingen per rij in de training en bij `suggestLighter` in `forgeAdjust.ts`. Het bijsturen rekent nog steeds vanuit de laatste set; alleen de daling erna is die van de oefening. Een oefening zonder voorschrift (nog geen geschiedenis) houdt 3%.

## Hoe de grove stap werkt

Een grove stap is de situatie waarin voor de eerste set geen gewicht in het bereik valt: het zwaarste gewicht dat de onderkant nog haalt, geeft meer herhalingen dan de bovenkant. Voorheen kreeg dat gewicht een verbreed bereik naar boven ("bereik tijdelijk verbreed"). Is de schatting al aan de lichte kant, dan stapelt dat een fout op.

Nu telt het model voor het lichtere gewicht hoeveel herhalingen het verwacht boven de bovenkant, en voor het eerstvolgende zwaardere gewicht hoeveel eronder de onderkant. De kleinste misser wint. Bij een gelijke misser blijft het de lichtere kant, zoals voorheen. Wint de zware kant, dan gaat de onderkant voor die eerste set omlaag naar wat verwacht wordt, niet verder dan nodig, en staat er een zin bij zoals "De stap is hier te grof voor 14 tot 16 herhalingen; met 55 kg haal je er naar verwachting 13, dat zit dichter bij je doel dan 50 kg." De latere sets houden de onderkant van het doel, behalve bij "Werksets gelijk": daar nemen ze set 1 over, ook de verlaagde onderkant, omdat alle sets dan hetzelfde zijn. Een nieuw soort voorschrift `coarse_heavier` draagt die zin.

De keuze geldt alleen waar het bereik mag meebewegen, dus met "Bereik verbreden" aan. Staat die uit, dan blijft het bereik zoals het is en blijft het lichtere gewicht met meer herhalingen in reserve (`shownRir`) staan, zoals voorheen; beide keuzes blijven werken. De zware kant wordt ook niet gekozen als er een rem op het gewicht staat: twee zwakke trainingen achter elkaar, een begin na een pauze (het gewicht gaat dan niet boven het vorige) of een dalende kracht die door de rem van KR-5 vastgehouden is. In "Alleen wat je gebruikte" kan de zware kant alleen een gewicht zijn dat je al pakte, want de kandidaten blijven dezelfde.

## De zin bij een lichter gewicht

`sameGoal` (het doel van vorige keer, afgeleid uit de herhalingen) bepaalde al of de rem op het gewicht gold. Nu bepaalt het ook de zin. Bij hetzelfde doel blijft het "Vorige keer zat je onder de 11 tot 13 herhalingen, dus iets lichter om in het bereik te blijven". Bij een ander doel staat er "Deze keer vraagt het programma 11 tot 13 herhalingen, meer dan vorige keer, dus een lichter gewicht." Vroeg vorige keer juist meer, dan staat er "minder dan vorige keer, dus een ander gewicht".

## Reden

Hoeveel herhalingen je van set tot set verliest, hangt af van de oefening, de last en de rust. Onderzoek naar rust tussen sets (het werk van Willardson en collega's) laat steeds zien dat het aantal herhalingen over opeenvolgende sets daalt, meer bij korte rust en meer bij oefeningen met veel spiermassa, en dat de daling per oefening en per persoon verschilt. De bewijssterkte is matig: kleine studies, vooral bij getrainde jonge mannen, en de cijfers zijn niet rechtstreeks over te zetten op een daling in geschatte kracht. Daarom blijft 3% de startwaarde en trekt het model een geleerd getal bij weinig data terug naar die start, in plaats van een vast getal als waarheid te nemen.

De kleinste misser volgt uit de rekenregel van KR-1 en KR-4: een gewicht dat een herhaling te zwaar is, is geen slechtere keuze dan een gewicht dat twee herhalingen te licht is. Een te lichte schatting twee keer corrigeren (lichter gewicht en een breder bereik naar boven) liet de voorgestelde herhalingen verder van het doel liggen dan nodig.

De zin bij een lichter gewicht moest kloppen met wat er gebeurt. Het model zei "vorige keer zat je onder het bereik" met het bereik van nu, ook als vorige keer een ander bereik gevraagd werd, zoals in een golvend programma.

## Alternatieven

Een vaste daling per type oefening (duwen, trekken, benen). Valt af: de lijst heeft daar geen betrouwbare indeling voor en je eigen sets zeggen het beter.

Het gemiddelde in plaats van de mediaan. Valt af: één set met een slecht ingevulde RIR trekt het gemiddelde ver weg.

Altijd de zware kant bij een grove stap, of altijd de lichte. Valt af: de misser in herhalingen is de eerlijke maat, en bij een gelijke misser is lichter de veiligere kant.

Het geleerde getal zonder krimp naar 3%. Valt af: na een of twee trainingen is het te onzeker.

## Bron

`docs/onderzoek/Kracht loggen en progressie.md` (KR-1 voor de schatting, KR-4 voor het gewicht bij een doel, KR-8 voor het bijsturen), het werk van Willardson en collega's over rust tussen sets en herhalingsverlies (algemeen bekend onderzoek, matig bewijs), en `2026-10-25-kracht-eigen-regels.md` en `2026-10-25-bijsturen-in-forge.md`.

## Vervangt

Niets. De vaste 3% van `2026-10-25-bijsturen-in-forge.md` blijft de startwaarde en de keuze "Vast 3%". Het gedrag "bereik tijdelijk verbreed" blijft bestaan voor de gevallen waarin de lichte kant de kleinste misser heeft.

## Terugdraaien

"Vermoeidheid per set" op "Vast 3%" geeft het oude gedrag voor de latere sets, de verwachte herhalingen en het bijsturen. "Bereik verbreden" uit zet de keuze voor de zware kant uit. De regels zitten in `learnFatigue` en in het blok rond `coarseHeavier` in `prescribe` en zijn los terug te zetten. De zin bij een lichter gewicht staat in `whyLighter`.
