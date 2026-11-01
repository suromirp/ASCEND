# RPE bij een testloop

De vraag van de eigenaar: telt ASCEND de belasting van een korte, maximale inspanning te streng? Het gaat om een testloop van 5 km, ongeveer 25 tot 36 minuten op RPE 9 tot 10. Dit rapport bouwt voort op `Spierbelasting en beenvermoeidheid.md` (de index en zijn onderbouwing) en `Betrouwbaarheid beenvermoeidheid-index.md` (hoeveel elke invoer de index beweegt). Wat daar al staat, herhaal ik niet; ik verwijs ernaar.

Bewijskracht staat tussen haakjes: sterk (meta-analyse of meerdere consistente studies), matig (een goede gecontroleerde studie of een review van kleine studies), zwak (klein, observationeel of secundair) en afgeleid (mijn eigen redenering of berekening). Bijna alle studies gaan over jonge, getrainde mannen. Voor een recreatieve loper geldt de richting waarschijnlijk wel, de precieze getallen minder.

Dit is geen medisch advies. Wie na een test pijn houdt die niet binnen een paar dagen wegtrekt, of pijn op één plek op het bot, laat dat bekijken door een arts of fysiotherapeut.

## Kort antwoord

Grotendeels niet. ASCEND telt een testloop niet te streng, en op één punt eerder iets te licht dan te zwaar.

- In de beenvermoeidheid-index telt een test van 30 minuten op RPE 10 de dag erna ongeveer 4,4 punten en twee dagen erna 1,3 (afgeleid, nagerekend met de code). Ter vergelijking: een gewende Benen A van 60 minuten telt de dag erna 13,4, en de drempel voor harde training is 12. De test houdt dus geen enkele training tegen behalve via de vaste regel "de dag na een test rustig".
- De factor die de eigenaar noemt (`effortFactor`, 1,3 bij RPE 9 en 1,5 bij RPE 10) geldt in de code alleen voor krachttraining. Voor een loop wordt hij niet gebruikt. Daar telt alleen de begrensde verhouding tussen gelogde en geplande RPE.
- De 48-uursregel tussen zware beendagen raakt een test niet: de testloop staat als `lowerBodyLoad: 'moderate'` en is dus geen zware beendag. Alleen een wedstrijd is dat wel.
- Minuten maal RPE (session RPE) weegt een maximale minuut ongeveer 2,5 tot 3,3 keer zo zwaar als een rustige minuut. Dat ligt in dezelfde orde als de hartslagmodellen (TRIMP), die een harde minuut 2 tot 3 keer zo zwaar wegen (afgeleid). Eén studie bij lopers laat zien dat session RPE korte maximale sessies juist lager telt dan methoden die alleen naar de zwaarte kijken ([Desgorces e.a. 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7398532/)) (zwak tot matig).

Waar de eigenaar wel gelijk heeft, op drie kleine punten:

1. Een RPE van 10 bij een test telt nu als "zwaarder dan gepland" (gepland is 8), en dus 25% zwaarder. Dat klopt logisch niet: bij een test is 10 de bedoeling, geen teken van vermoeidheid. Het effect is klein (de dag erna 4,4 in plaats van 3,5).
2. De "gem. zwaarte" in de weekterugblik is een gemiddelde van RPE-getallen zonder minuten. Eén test van 30 minuten op 10 trekt dat gemiddelde net zo hard omhoog als een loop van 2 uur op 10 zou doen. Dat getal is misleidend.
3. Een RPE van 9 of 10 bij een test zegt weinig over de belasting, want hij is bijna altijd 9 of 10. Hij zegt wel iets over of de test echt maximaal was, en de ochtend erna zegt meer over je benen dan de RPE.

## Wat de code nu doet

Dit is nagelezen in de code, niet gemeten bij de gebruiker.

- `engine/sessionLoad.ts` en de weekbalk in Stand (`engine/standing.ts#weeklyLoad`) rekenen belasting als minuten maal RPE, de session RPE van Foster. Een test die alleen de 5 km logt, 30 minuten op RPE 10, telt 300 punten; 25 minuten op 10 telt 250 en 36 minuten op 9 telt 324. Gepland staat de test op 45 minuten maal RPE 8, dus 360. De gelogde test telt dus minder dan de geplande, omdat het in- en uitlopen niet in de log zit. Een rustige loop van 45 minuten op 4 telt 180, een lange duurloop van 100 minuten op 5 telt 500.
- `engine/legFatigue.ts#sessionImpulse` geeft een loop drie bakken. De test heeft `intensity: 'high'` (24 punten per uur), `impact: 'moderate'` (2 per uur) en krijgt spierschade alleen uit de daling in meters, op een vlakke route dus bijna nul. Beide eerste bakken worden vermenigvuldigd met `rpeFactor`, de gelogde RPE gedeeld door de geplande (8 voor `high`), begrensd tussen 0,75 en 1,5.
- Uitgerekend voor 30 minuten op RPE 10: intensiteit 24 maal 0,5 uur maal 1,25 is 15 punten, impact 2 maal 0,5 maal 1,25 is 1,25 punt. De dag erna is daarvan 25% en 50% over: 3,75 plus 0,63 is 4,4. Twee dagen erna 1,3, drie dagen erna 0,4. Met RPE 9 is het de dag erna 3,9. Met 36 minuten op RPE 10 is het 5,3 (afgeleid, eigen berekening met de formules uit de code).
- `effortFactor` (de ankers 0,7 tot 1,5) staat alleen in de tak `template.type === 'strength'`. Een loop gebruikt hem niet.
- De regels rond een test: de index bepaalt of je benen fris genoeg zijn vóór de test (drempel 8); de dag ná de test geen harde loop en geen beenzware duursessie (`AFTER-TEST` in `engine/weekValidator.ts`), krachttraining mag wel; de 48 uur tussen zware beendagen geldt niet, omdat de test geen zware beendag is (`isLegHeavyTemplate` kijkt naar `lowerBodyLoad === 'heavy'`).
- "Zwaarder dan gepland" in `engine/coach.ts` en de weekterugblik vergelijkt met de bovenkant van de geplande zwaarte. Voor een test is dat "Hard, RPE 8-9", dus 9. Een 10 is niet twee punten hoger, en de test krijgt dus geen onterechte "Volgende keer iets rustiger?". Dat is in orde.
- `engine/weekReview.ts` rekent `avgRpe` als het gewone gemiddelde van alle gelogde RPE's van de week, zonder minuten, en `WeekReview.tsx` toont dat als "gem. zwaarte".

## Vraag 1: klopt minuten maal RPE voor een korte, maximale inspanning?

**Wat het onderzoek zegt.** Session RPE (de RPE van de hele sessie maal de minuten) is in een review van 36 validatiestudies valide en betrouwbaar gebleken over veel sporten en niveaus ([Haddad e.a. 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5673663/)) (matig tot sterk), en bij lopers voorspelde het prestatie en vermoeidheid ongeveer even goed als hartslagmodellen ([Wallace e.a. 2014](https://opus.lib.uts.edu.au/handle/10453/122356)) (matig, zeven lopers). Bij recreatieve lopers onderscheidde session RPE de soorten loopsessies beter dan TRIMP of biomechanische belasting, en de maten hingen maar matig samen (r = 0,49) ([Sports Medicine Open 2025](https://link.springer.com/article/10.1186/s40798-025-00969-9)) (matig).

Voor korte, maximale sessies zijn er twee studies die de richting aangeven, en ze wijzen allebei dezelfde kant op: session RPE overschat zulke sessies niet.

- Tien recreatieve middellange-afstandslopers liepen een maximale 800 m en vier intervalsessies tot uitputting. Methoden die alleen naar zwaarte en uitputting kijken gaven alle sessies ongeveer dezelfde belasting. Session RPE gaf de korte maximale sessie maar 76% van de langste intervalsessie, omdat de minuten zo zwaar wegen. De auteurs concluderen dat de klassieke methoden lange sessies relatief zwaar en korte, maximale sessies relatief licht tellen ([Desgorces e.a. 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7398532/)) (zwak tot matig: tien personen, geen gouden standaard om tegen te meten).
- Bij acht getrainde mannen kreeg een all-out sessie met session RPE ruim twee keer zoveel punten als een sessie op RPE 6 (92 tegen 43), terwijl de Banister-TRIMP maar 10% verschil zag (61 tegen 56). Alleen session RPE hing samen met het lactaat na afloop ([Falk Neto e.a. 2020](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2020.00919/full)) (zwak tot matig, functionele fitness en geen loop).

**Hoe TRIMP zich verhoudt.** De Banister-TRIMP weegt een minuut met een exponentiële factor op de hartslagreserve (voor mannen 0,64 maal e tot de macht 1,92 maal die fractie; formule in [Spierbelasting en beenvermoeidheid.md](Spierbelasting%20en%20beenvermoeidheid.md)). Uitgerekend (afgeleid): een rustige minuut op 65 tot 70% van de hartslagreserve weegt 1,4 tot 1,7, een minuut op 92 tot 95% weegt 3,4 tot 3,8. Een harde minuut telt dus 2 tot 2,6 keer zo zwaar als een rustige. De Edwards-zones geven 5 tegen 2, dus 2,5 keer, en de Lucia-zones 3 tegen 1, dus 3 keer. Session RPE geeft 10 tegen 3 of 4, dus 2,5 tot 3,3 keer. Per minuut weegt de app een testminuut dus ongeveer even zwaar als de hartslagmodellen, hooguit iets zwaarder dan Banister. In een echte 5 km loopt de hartslag de eerste minuten bovendien achter, zodat een TRIMP de test nog iets lichter zou tellen (afgeleid). Dat TRIMP bij heel hoge intensiteit slecht werkt, is een bekend bezwaar ([Foster e.a. 2001](https://paulogentil.com/pdf/A%20New%20Approach%20to%20Monitoring%20Exercise%20Training.pdf)) (matig).

**Hoe zeker.** Matig voor de bewering dat session RPE een maximale sessie niet overschat. Er is geen studie gevonden die precies een 5 km-tijdrit met session RPE en een harde uitkomst (zoals prestatie de dagen erna) vergelijkt.

**Een valkuil, wel in de app.** Foster vraagt de RPE van de hele sessie, ongeveer een half uur na afloop. Later onderzoek vond dat het moment weinig uitmaakt: direct na afloop, na 10 of na 30 minuten gaf ongeveer hetzelfde getal ([Fanchini e.a. 2015](https://iris.univr.it/handle/11562/926388); [een studie bij boksers](https://opus.lib.uts.edu.au/handle/10453/26758)) (matig). De app vraagt bij de test bewust alleen de 5 km in te vullen. Dan horen de minuten en de RPE bij elkaar en klopt minuten maal RPE. Komt de test ooit als hele activiteit binnen (inlopen, 5 km, uitlopen samen, bijvoorbeeld via een horlogekoppeling), dan telt 45 minuten maal 10 als 450, terwijl 20 minuten inlopen op 3 en 25 minuten test op 10 samen 310 zijn. Dan zou de app de test 45% te zwaar tellen (afgeleid). Ik heb niet kunnen nagaan of een gekoppelde test zo binnenkomt.

**Waar de eigenaar gelijk heeft en waar niet.** Niet: minuten maal RPE is voor een korte maximale loop geen strenge maat. Wel, in principe: de `rpeFactor` in de index telt een 10 op een test als "25% zwaarder dan gepland". De gedachte achter die factor is dat een hogere RPE bij hetzelfde werk een teken van restvermoeidheid is ([Doma en Deakin 2013](https://researchonline.jcu.edu.au/28717/); [Nuuttila e.a. 2021](https://doi.org/10.1055/a-1263-1034)) (matig). Bij een test ligt het andersom: de zwaarte staat vast op maximaal en het tempo varieert. Een 10 op een test is dus geen signaal.

## Vraag 2: hoe lang duurt herstel na een maximale 5 km?

**Wat het onderzoek zegt.**

- **Prestatie.** Twaalf goed getrainde lopers liepen een 5 km-tijdrit en na 24 of na 72 uur rust een tweede. Na 24 uur waren ze gemiddeld 10 seconden trager (19:49 naar 19:59, ongeveer 0,8%), negen van de twaalf waren trager. Na 72 uur was er geen verschil. De auteurs wijzen op grote verschillen tussen lopers ([Bosak e.a. 2009](https://thesportjournal.org/article/comparison-of-5km-running-performance-after-24-and-72-hours-of-passive-recovery/)) (zwak tot matig). Voor de duidelijkheid: 0,8% valt binnen de gewone schommeling van een 5 km, die voor getrainde lopers 1 tot 2% en voor recreanten 2 tot 3% is (zie `Betrouwbaarheid beenvermoeidheid-index.md`).
- **Kracht en sprong.** Na een 10 km bij tien ervaren lopers was de sprongkracht 48 uur later nog verlaagd en waren de hamstrings niet helemaal terug. De auteurs adviseren minstens 48 uur tussen twee maximale 10 km-pogingen ([Gómez e.a. 2002](https://www.bisp-surf.de/Record/PU201206004253)) (zwak tot matig). Een 5 km is korter, dus dit is eerder een bovengrens voor de test (afgeleid).
- **Soort vermoeidheid.** Bij wielrenners gaf een korte, maximale tijdrit (4 km) de meeste vermoeidheid in de spier zelf (40% minder opgewekte spierkracht direct erna), langere tijdritten meer vermoeidheid in het zenuwstelsel ([Thomas e.a. 2015](https://researchportal.northumbria.ac.uk/en/publications/central-and-peripheral-fatigue-in-male-cyclists-after-4-20-and-40/)) (matig, alleen direct na afloop gemeten). Na harde intervallen op de vlakte was de sprongkracht binnen 24 uur terug, maar voelde een vaste looptest 24 uur later nog zwaarder ([Nuuttila e.a. 2021](https://doi.org/10.1055/a-1263-1034)) (matig).
- **Spierschade.** Ik vond geen goede studie naar CK of spierpijn na een 5 km. Na langere lopen piekt CK rond 24 tot 48 uur en blijft hij langer hoog naarmate de afstand groter is; voor een vlakke 5 km is de schade waarschijnlijk klein (zwak, afgeleid uit studies naar langere afstanden). Dat sluit aan bij de lijn uit het eerdere rapport: spierschade komt vooral van afdalen en zware excentrische kracht, niet van vlak hardlopen.

**Hoe zeker.** Zwak tot matig. De richting is consistent: de dag erna ben je iets minder, na 48 uur grotendeels hersteld en na 72 uur volledig, met grote verschillen tussen mensen.

**Klopt de 48-uursregel?** Die vraag is voor de test eigenlijk niet aan de orde, want de app legt na een test geen 48 uur op. Wat de app wel doet, past bij het bewijs:

- De dag na de test geen harde loop: past bij Bosak (24 uur is nog iets trager) en bij Nuuttila (de dag erna voelt een loop zwaarder). Dit is een milde regel; er is geen bewijs dat hij te streng is.
- Krachttraining de dag na de test mag: past bij het eerdere rapport (kracht is na 24 uur terug na een loop, [Sporer en Wenger 2003](https://dspace.library.uvic.ca/items/d9c6f404-d74b-453e-99b0-816a42a46e45)).
- Twee dagen na de test telt hij 1,3 punt; een harde sessie mag dan. Past bij Gómez (ongeveer 48 uur).
- Een wedstrijd is wel een zware beendag (`lowerBodyLoad: 'heavy'`) en valt onder de 48 uur. Voor 10 km of meer is dat redelijk (Gómez).

Wat de app niet heeft, en wat het bewijs wel suggereert: een volgende maximale poging (test of wedstrijd) liefst niet binnen ongeveer 72 uur na een test ([Bosak e.a. 2009](https://thesportjournal.org/article/comparison-of-5km-running-performance-after-24-and-72-hours-of-passive-recovery/)). In de praktijk staan tests weken uit elkaar, dus dit speelt bijna nooit.

**Waar de eigenaar gelijk heeft en waar niet.** De herstelregels rond een test zijn niet te streng. De index telt de test eerder aan de lichte kant: de bak voor spierschade blijft op een vlakke route leeg, terwijl de hamstrings na een maximale 10 km twee dagen nodig hadden. Voor een 5 km is dat verschil klein.

## Vraag 3: is de inspanningsfactor van 1,3 en 1,5 redelijk voor een duurinspanning?

**Wat de code doet.** De factor wordt bij een loop niet gebruikt (zie hierboven). De vraag is dus eigenlijk: moet dat zo blijven?

**Wat het onderzoek zegt.** De factor komt uit krachttraining: sets tot falen werken veel langer door dan sets met herhalingen over (sprongkracht pas na 72 uur terug tegenover 6 uur bij gelijk volume) ([Morán-Navarro e.a. 2017](https://pubmed.ncbi.nlm.nih.gov/28965198/)) (matig). Bij krachttraining betekent RPE 9 of 10 "nog één of nul herhalingen over" (de RIR-schaal, [Zourdos e.a. 2016](https://pubmed.ncbi.nlm.nih.gov/26049792/)) (matig), en dichter bij falen geeft meer mechanische schade in de spier. Bij een duurloop betekent RPE 10 iets anders: tijdens een zelf ingedeelde tijdrit stijgt de RPE ongeveer lineair, en hoe korter de tijdrit hoe steiler, zodat hij tegen het eind hoog uitkomt; lopers delen hun tempo daarop in ([Crewe, Tucker en Noakes 2008](https://link.springer.com/article/10.1007/s00421-008-0741-7); [Nicolò, Marcora en Sacchetti 2016](https://cris.unibo.it/handle/11585/671278)) (matig). Een 10 aan het eind van een 5 km zegt dus "ik heb goed ingedeeld", niet "mijn spieren zijn beschadigd". De vermoeidheid na een korte tijdrit is grotendeels metabool en in de spier, en herstelt sneller dan schade na falen (Thomas e.a. 2015; Nuuttila e.a. 2021; Bosak e.a. 2009).

**Hoe zeker.** Matig voor het verschil in betekenis; er is geen studie die dezelfde RPE in kracht en lopen direct vergelijkt op herstel.

**Advies.** Een testloop moet anders wegen dan een krachtsessie op dezelfde RPE, en dat doet de code al. Laat `effortFactor` alleen voor kracht gelden. De vraag of 1,3 en 1,5 voor krachttraining juist zijn, valt buiten dit rapport; de ankers zijn in `Betrouwbaarheid beenvermoeidheid-index.md` al zacht gemaakt.

**Waar de eigenaar gelijk heeft en waar niet.** De zorg is terecht als principe, maar de app maakt deze fout niet.

## Vraag 4: zegt een RPE bij een test nog iets?

**Wat het onderzoek zegt.**

- Als belastingmaat weinig: bij een maximale test ligt de RPE bijna altijd op 9 of 10 (Crewe e.a. 2008). De belasting van de test wordt dan vooral bepaald door de minuten, en die liggen ook vast (afgeleid).
- Als controle van de test wel: een test is alleen een goede meting als hij echt maximaal was. Een RPE van 7 of lager bij een test is een teken dat het geen volle poging was, en dat de berekende tempo's dan te traag uitvallen (afgeleid). `engine/testJudgment.ts` en `engine/racePrediction.ts` gebruiken de RPE nu niet.
- Een vraag de ochtend erna zegt meer over herstel. De Perceived Recovery Status-schaal (een cijfer voor "hoe hersteld voel je je") hing matig samen met de prestatie in de volgende sessie (r = -0,63) bij herhaalde sprints met 24, 48 of 72 uur ertussen ([Laurent e.a. 2011](https://pubmed.ncbi.nlm.nih.gov/20581704/)) (matig, zestien personen). Subjectieve maten reageren in het algemeen gevoeliger op belasting dan objectieve ([Saw, Main en Gastin 2016](https://bjsm.bmj.com/content/50/5/281)) (matig tot sterk). Spierpijn is daarbij een signaal en geen maat voor de omvang van schade ([Nosaka, Newton en Sacco 2002](https://ro.ecu.edu.au/ecuworks/4145)) (matig).

**Hoe zeker.** Matig.

**Advies.** De RPE bij een test niet weghalen: hij is goedkoop, de weekbalk gebruikt hem, en hij kan een niet-maximale test opsporen. De betere vraag na een test is de ochtendvraag die de app al heeft (Lichaam, spierpijn en de ochtendcheck in `engine/bodyCheck.ts` en `engine/legSoreness.ts`). Die zet de index al op een ondergrens als je spierpijn meldt. Die vraag de ochtend na een test actief aanbieden is zinniger dan een tweede vraag direct na de test.

**Waar de eigenaar gelijk heeft.** Ja: als maat voor hoe zwaar de test was, zegt de RPE bijna niets meer.

## Vraag 5: is een gemiddelde RPE over een week zonder minuten misleidend?

**Wat het onderzoek zegt.** Foster legde de weekmaat vast als de som van minuten maal RPE, met daarnaast de eentonigheid (het weekgemiddelde gedeeld door de spreiding) ([Foster 1998](https://pubmed.ncbi.nlm.nih.gov/9662690/)) (matig). Een gemiddelde RPE zonder minuten komt in die literatuur niet voor als weekmaat. Voor duursporters is de verdeling van de tijd over rustig en hard de gangbare maat: goed presterende duursporters doen het grootste deel van hun minuten rustig ([Seiler 2010](https://pubmed.ncbi.nlm.nih.gov/20861519/)) (matig, vooral beschrijvend bij getrainde sporters).

**Waarom het misleidt (afgeleid).** Een week met drie rustige lopen van 45 minuten op RPE 3 en een test van 30 minuten op 10 heeft een gemiddelde van 4,8. Dezelfde week met een rustige herstelloop van 20 minuten op 2 erbij zakt naar 4,2, terwijl je meer deed. En een week met één lange loop van 2 uur op 5 en een korte loop van 20 minuten op 5 heeft hetzelfde gemiddelde als twee korte lopen. Het getal beweegt vooral met het aantal korte sessies, niet met de belasting. Een test maakt de week in dit getal "zwaar" terwijl hij in minuten maal RPE gewoon een middelgrote sessie is.

**Hoe zeker.** Matig voor de keuze van de maat (Foster en Seiler zijn standaard); het rekenvoorbeeld is afgeleid.

**Advies, in volgorde van voorkeur.**

1. Toon in de weekterugblik in plaats van "gem. zwaarte" de minuten rustig en hard, bijvoorbeeld "160 min, waarvan 30 hard". Dat is wat een loper kan bijsturen, en Stand heeft met `IntensityMixCard` al een verwante maat (`engine/standing.ts`, `easyTooHard`).
2. Of: het met minuten gewogen gemiddelde, dus de som van minuten maal RPE gedeeld door de som van de minuten. Dat is de gemiddelde zwaarte per minuut, en een korte test trekt die maar weinig omhoog. In het voorbeeld hierboven 4,4 in plaats van 4,8.
3. De weekbelasting zelf staat al in Stand (`WeeklyLoadChart`). Die hoeft niet in de terugblik herhaald te worden. Een verhouding tussen deze week en de vier weken ervoor (de ACWR) is als risicomaat afgewezen ([Impellizzeri e.a. 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7534938/)) (matig tot sterk) en is geen goed alternatief.

**Waar de eigenaar gelijk heeft.** Ja, hier wel.

## Voorstellen voor de engine

Dit zijn voorstellen, geen besluiten. Wat de getoonde tekst of een getal in de planning verandert, hoort volgens de werkafspraken bij een instelling met dit advies als standaard.

1. **Geplande RPE van een test en wedstrijd op 10 in `rpeFactor`** (`engine/legFatigue.ts`, herkend via de rol `test` of `race`, niet via een id). Een 9 of 10 telt dan als gepland en niet als 25% zwaarder; een 7 op een test telt dan lichter (factor 0,75). Effect: de dag na een test van 30 minuten op 10 van 4,4 naar 3,5. Klein, maar logisch juister. De andere geplande RPE's (4, 6, 8 en kracht 8) blijven. Laag in prioriteit; controleer `planGolden.test.ts`.
2. **`effortFactor` blijft alleen voor kracht.** Geen wijziging, wel een test die vastlegt dat een loop hem niet gebruikt, zodat dat niet ongemerkt verandert.
3. **"Gem. zwaarte" in `engine/weekReview.ts` vervangen** door de minuten rustig en hard (voorkeur) of het met minuten gewogen gemiddelde. Als grens voor hard ligt RPE 7 of hoger voor de hand, dezelfde grens als `easyTooHard` in `engine/standing.ts`.
4. **Een testlog die de hele activiteit bevat, splitsen in de belasting** (`engine/sessionLoad.ts`, `engine/standing.ts#weeklyLoad`): de minuten van de 5 km maal de RPE, de rest maal 3. Alleen nodig als een gekoppelde test met in- en uitlopen binnenkomt; eerst nagaan of dat gebeurt.
5. **Een niet-maximale test benoemen.** Bij een test met RPE 7 of lager zegt `engine/testJudgment.ts` dat de test waarschijnlijk geen volle poging was en dat de tempo's daardoor voorzichtig zijn. Als getoonde tekst een voorstel voor later.
6. **De ochtendvraag na een test.** De ochtend na een test of wedstrijd biedt de app de bestaande vraag "Hoe voelen je benen?" (Lichaam) actief aan. Geen nieuwe vraag direct na de test.
7. **Wat zo blijft.** De rustige dag na een test (`AFTER-TEST`), krachttraining de dag na een test toegestaan, de test geen zware beendag, de wedstrijd wel, de drempels 8, 3 en 12, de halfwaardetijden, en minuten maal RPE als belastingmaat.
8. **Niet nu: spierschade voor een vlakke maximale loop.** De index geeft een vlakke test geen spierschade. Een kleine bijdrage (bijvoorbeeld 4 punten per uur in de schadebak, alleen bij test en wedstrijd) zou de dag erna ongeveer 2 punten toevoegen. Het bewijs daarvoor is zwak (Gómez e.a. 2002, voor een 10 km) en het verandert geen beslissing, dus ik raad het nu niet aan.

## Wat het onderzoek zegt

Minuten maal RPE is een valide maat voor de belasting van een sessie, ook bij hoge intensiteit, en overschat een korte maximale inspanning niet; per minuut weegt het een harde minuut ongeveer even zwaar als de hartslagmodellen, en een kleine studie bij lopers laat zien dat het korte maximale sessies eerder licht telt. Na een maximale 5 km is de prestatie de dag erna iets minder (ongeveer 1%), na 48 uur grotendeels en na 72 uur volledig terug, met grote verschillen tussen mensen; de schade in de spier is bij een vlakke 5 km waarschijnlijk klein. Een RPE van 10 betekent bij een tijdrit iets anders dan bij een krachtset tot falen, en een gemiddelde RPE zonder minuten is geen gangbare of zinvolle weekmaat.

## Wat het betekent voor de app

De app telt een testloop niet te streng: de dag erna 4,4 punten tegen een drempel van 12, geen 48 uur, krachttraining de dag erna toegestaan. De krachtfactor van 1,3 en 1,5 raakt een loop niet. Er zijn twee kleine verbeteringen die de eigenaar gelijk geven: een 10 op een test niet als "zwaarder dan gepland" tellen, en "gem. zwaarte" in de weekterugblik vervangen door minuten rustig en hard. Daarnaast is het de moeite waard om na te gaan of een gekoppelde test met in- en uitlopen als één blok op RPE 10 binnenkomt, want dan telt hij wel te zwaar.

## Wat nog onzeker is

- Er is geen studie naar session RPE bij precies een 5 km-tijdrit tegenover een harde uitkomst; de twee studies naar korte maximale sessies zijn klein (acht en tien personen).
- Er is geen goede studie naar spierschade of krachtherstel na een 5 km; de 48 uur komt van een 10 km, de 24 en 72 uur van één kleine 5 km-studie bij goed getrainde lopers.
- De TRIMP-vergelijking is mijn eigen berekening met aangenomen hartslagen (65 tot 70% en 92 tot 95% van de hartslagreserve).
- Alle punten van de index blijven eigen afleidingen; de berekening van 4,4 punten is nagerekend met de formules uit de code, niet met de echte logs van de gebruiker.
- Ik heb niet gecontroleerd hoe een test binnenkomt via een horlogekoppeling, en dus niet of voorstel 4 nodig is.
- Herstel verschilt sterk tussen mensen ([Bosak e.a. 2009](https://thesportjournal.org/article/comparison-of-5km-running-performance-after-24-and-72-hours-of-passive-recovery/)); voor oudere lopers is het trager.

## Bronnen

- [Bosak e.a. 2009, 5 km na 24 en 72 uur rust](https://thesportjournal.org/article/comparison-of-5km-running-performance-after-24-and-72-hours-of-passive-recovery/)
- [Crewe, Tucker en Noakes 2008, RPE tijdens tijdritten](https://link.springer.com/article/10.1007/s00421-008-0741-7)
- [Desgorces e.a. 2020, belasting van maximale sessies](https://pmc.ncbi.nlm.nih.gov/articles/PMC7398532/)
- [Doma en Deakin 2013](https://researchonline.jcu.edu.au/28717/)
- [Falk Neto e.a. 2020, session RPE tegenover TRIMP](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2020.00919/full)
- [Fanchini e.a. 2015, moment van de session RPE](https://iris.univr.it/handle/11562/926388)
- [Foster 1998, weekbelasting en eentonigheid](https://pubmed.ncbi.nlm.nih.gov/9662690/)
- [Foster e.a. 2001, session RPE](https://paulogentil.com/pdf/A%20New%20Approach%20to%20Monitoring%20Exercise%20Training.pdf)
- [Gómez e.a. 2002, kracht en sprong na 10 km](https://www.bisp-surf.de/Record/PU201206004253)
- [Haddad e.a. 2017, review session RPE](https://pmc.ncbi.nlm.nih.gov/articles/PMC5673663/)
- [Impellizzeri e.a. 2020, kritiek op de ACWR](https://pmc.ncbi.nlm.nih.gov/articles/PMC7534938/)
- [Laurent e.a. 2011, Perceived Recovery Status](https://pubmed.ncbi.nlm.nih.gov/20581704/)
- [Morán-Navarro e.a. 2017, sets tot falen](https://pubmed.ncbi.nlm.nih.gov/28965198/)
- [Nicolò, Marcora en Sacchetti 2016, RPE en ademfrequentie in tijdritten](https://cris.unibo.it/handle/11585/671278)
- [Nosaka, Newton en Sacco 2002, spierpijn en schade](https://ro.ecu.edu.au/ecuworks/4145)
- [Nuuttila e.a. 2021, herstel na hard lopen](https://doi.org/10.1055/a-1263-1034)
- [Saw, Main en Gastin 2016, subjectieve en objectieve maten](https://bjsm.bmj.com/content/50/5/281)
- [Seiler 2010, verdeling van intensiteit bij duursporters](https://pubmed.ncbi.nlm.nih.gov/20861519/)
- [Sporer en Wenger 2003](https://dspace.library.uvic.ca/items/d9c6f404-d74b-453e-99b0-816a42a46e45)
- [Sports Medicine Open 2025, belastingmaten bij recreatieve lopers](https://link.springer.com/article/10.1186/s40798-025-00969-9)
- [Thomas e.a. 2015, vermoeidheid na tijdritten van 4, 20 en 40 km](https://researchportal.northumbria.ac.uk/en/publications/central-and-peripheral-fatigue-in-male-cyclists-after-4-20-and-40/)
- [Moment van de session RPE bij boksers](https://opus.lib.uts.edu.au/handle/10453/26758)
- [Wallace e.a. 2014, belastingmaten bij lopers](https://opus.lib.uts.edu.au/handle/10453/122356)
- [Zourdos e.a. 2016, RIR-schaal](https://pubmed.ncbi.nlm.nih.gov/26049792/)
