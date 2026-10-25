# Het krachtmodel van ASCEND krijgt eigen regels

Datum: 2026-10-25
Status: aangenomen

## Besluit

Het eigen krachtmodel (`engine/strengthModel.ts`) verandert op vijf punten. Het past daarmee drie regels uit `docs/onderzoek/Kracht loggen en progressie.md` aan: KR-2, KR-3 (na een pauze) en KR-5. De rest van het onderzoek blijft zoals het staat.

1. KR-2, de beste set telt. De geschatte kracht van een training is de hoogste schatting onder de sets met vol gewicht (RIR tot en met 3). Is er geen zo'n set, dan de hoogste onder de sets met half gewicht. Het gemiddelde van de twee hoogste vervalt.
2. KR-5 remt de kracht, niet het gewicht. De kracht waarmee het voorstel rekent stijgt per training hooguit 5% en per week hooguit 10%, en daalt per training hooguit 10%, vergeleken met de gladgestreken kracht van vóór de vorige training. Het gewicht volgt daarna vrij uit die kracht en het doel van deze keer (KR-4). De regel "het gewicht gaat niet omlaag als je vorige keer de onderkant met genoeg over haalde" geldt alleen bij hetzelfde doel. Het doel van vorige keer staat niet bij een set; het model leidt het af uit de herhalingen van die training.
3. Na meer dan 28 dagen zonder de oefening rekent het voorstel met 5% minder kracht, met een zin die dat zegt. Dat geldt alleen als er in die weken helemaal geen krachttraining was: rustte alleen deze oefening terwijl je wel trainde (een nieuw programma), dan begint hij op het laatste niveau. Na zo'n pauze gaat het gewicht ook niet boven het vorige, zelfs als het doel van de week minder herhalingen vraagt: de training zelf stuurt dan bij. Tussen 22 en 28 dagen begint het voorstel op het laatste niveau, zoals voorheen. Nieuwe instelling "Na een pauze lichter beginnen", standaard aan.
4. Dumbbells als totaal. Nieuwe instelling "Dumbbells in je log" met "Vanzelf herkennen" (het advies), "Per dumbbell" en "Totaal van twee". Vanzelf leest een oefening als totaal van twee zodra het logboek een gewicht heeft dat zwaarder is dan de zwaarste dumbbell van het rek en niet meer dan twee keer die. Een gewicht dat het rek net niet kent (12 of 16 kg per dumbbell bij een rek in stappen van 2,5 kg) blijft per dumbbell, omdat een sportschool vaak meer dumbbells heeft dan het profiel noemt; wie ook lichtere oefeningen als totaal logt, kiest "Totaal van twee". De gewichten zijn dan de sommen van twee gelijke dumbbells uit het rek, in stappen van twee keer de stap. Oefeningen met één dumbbell (`oneDumbbell` in `data/exercises.ts`, zoals de goblet squat) worden nooit verdubbeld. De last voor de schatting blijft wat er gelogd is, zodat een oefening binnen zichzelf dezelfde maat houdt. Het gewicht staat er met twee dumbbells bij, bijvoorbeeld "60 kg (2 x 30)".
5. Gewichten van toestellen. De schakelaar "Gewichten van toestellen leren" wordt één keuze "Gewichten van toestellen": "Geleerd en geschat" (het advies, het oude gedrag met de schakelaar aan), "Alleen wat je gebruikte" en "Stappen van je profiel" (het oude gedrag met de schakelaar uit). Bij "Alleen wat je gebruikte" stelt ASCEND op een kabel of toestel nooit een gewicht voor dat je er nog niet pakte, ook geen opgevulde gaten. Vraagt je kracht om zwaarder dan je zwaarste gebruikte gewicht, dan blijft het gewicht staan en gaan de herhalingen omhoog binnen het bereik; haal je de bovenkant met genoeg over, dan zegt de zin dat je klaar bent voor zwaarder en dat je het eerstvolgende gewicht op het toestel kiest. Voor lichter dan het lichtste gebruikte gewicht geldt hetzelfde omgekeerd. Zonder gebruikte gewichten vallen de kandidaten terug op de stappen van het profiel. De keuze werkt via `candidatesFor` (`stackWeights` in de context), dus ook voor het bijsturen in de training.

De oude opgeslagen schakelaar `learnStacks` wordt gelezen: uit wordt "Stappen van je profiel", aan of afwezig het advies. Dat gebeurt in `normalizeStrengthSettings` (die de back-up bij het importeren ook gebruikt), dus oude back-ups blijven importeerbaar. De nieuwe velden zijn optioneel met een standaard via `resolveStrengthSettings`; een aparte migratiestap is daarom niet nodig.

## Reden

KR-2. De set het dichtst bij falen is de betrouwbaarste (Halperin 2022). Het gemiddelde van de twee hoogste mengde een lagere, vermoeidere set in het getal. De toets "raak" (`engine/prescriptionCheck.ts`) neemt al de beste set van de dag; het model meet nu met dezelfde maat. Schermen die de geschatte kracht tonen (de lijn op de Kracht-pagina, de geschatte 1RM op Forge en de vergelijking met 4 en 8 weken terug) laten daardoor iets hogere getallen zien. Het voorstel zelf wordt iets zwaarder waar de latere sets lager uitvielen.

KR-5. In een golvend programma wisselt het herhalingenbereik per week, bijvoorbeeld 4 tot 6, dan 7 tot 9, dan 2 tot 4. Golvend periodiseren is een gewone, verdedigbare vorm (Moesgaard 2022). Een rem op het gewicht meet dan tegen het verkeerde ijkpunt: van 4 tot 6 naar 7 tot 9 hoort het gewicht flink omlaag, en van 7 tot 9 naar 2 tot 4 flink omhoog. Wat een sprong in de uitkomst moet temperen is een uitschieter in de kracht (een toevallig goede of slechte dag). De grenzen van 5% per training en 10% per week blijven de band van 2 tot 10% uit het onderzoek (ACSM, expert) en de vuistregel dat 5% ongeveer anderhalve herhaling is.

KR-3, pauze. Tot ongeveer vier weken is het krachtverlies klein, daarna groter (Bosquet 2013, matig bewijs). Dat onderzoek gaat over stoppen met trainen, niet over een oefening die even niet in het programma zit terwijl de spieren met andere oefeningen bezig blijven; daarom telt alleen een pauze in alle krachttraining. Voor de eerste vier weken blijft het voorstel dus op het laatste niveau, daarna begint het iets lichter en kijkt het na de training opnieuw. De 5% is een keuze van het model, geen uitkomst van het onderzoek.

Dumbbells. Wie bij duwoefeningen het totaal van twee dumbbells logt, liep vast op de bovenkant van het rek en kreeg "bereik tijdelijk verbreed" of de melding dat het gewicht niet bij de sportschool past. Per oefening herkennen houdt het logboek leidend en laat gewone per-dumbbell oefeningen met rust.

Gewichten van toestellen. Het geschatte gewicht bestaat soms niet op het toestel, en wie het voorstel trouw volgt, loopt daar tegenaan. Een eigen keuze geeft de strengste vorm voor wie dat wil, zonder het advies te veranderen.

## Alternatieven

De rem op het gewicht houden en alleen verruimen bij een ander bereik. Valt af: dat blijft een rem op het verkeerde getal en vraagt het doel van vorige keer als vaste invoer.

Het doel van vorige keer opslaan bij elke set. Valt af: een opgeslagen vorm verandert dan, en oude logs hebben het niet. Het afleiden uit de herhalingen is de eenvoudigste vorm die te toetsen is.

Dumbbells altijd als totaal lezen, of altijd per dumbbell. Valt af: beide gewoonten komen voor, soms per oefening verschillend.

## Bron

`docs/onderzoek/Kracht loggen en progressie.md` (KR-2 tot en met KR-6), Halperin e.a. 2022 (nabijheid van falen en de betrouwbaarheid van RIR), Moesgaard e.a. 2022 (golvend periodiseren), Bosquet e.a. 2013 (krachtverlies bij stoppen met trainen), en een gesprek met de eigenaar op 25 oktober 2026 over de gewichten van toestellen.

## Vervangt

Het deel van KR-2 over het gemiddelde van de twee hoogste schattingen, het deel van KR-3 over de pauze (na meer dan vier weken iets lichter, tussen drie en vier weken zoals voorheen) en KR-5 (de rem op het gewicht, nu een rem op de kracht). Het vult `2026-10-24-kracht-stil-toetsen.md` en `2026-10-25-macrofactor-workouts-tijdelijk.md` aan: wat de eigen engine verandert, staat hier met een eigen onderbouwing.

## Terugdraaien

De regels zitten in `strengthModel.ts` (`sessionStrength`, het blok "KR-5" in `prescribe`, `LIGHTER_AFTER_DAYS`) en zijn los terug te zetten. "Na een pauze lichter beginnen" kan in de instellingen uit. "Dumbbells in je log" op "Per dumbbell" en "Gewichten van toestellen" op "Stappen van je profiel" geven het oude gedrag terug.
