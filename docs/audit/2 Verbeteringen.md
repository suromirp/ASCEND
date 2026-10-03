# ASCEND: UX- en productreview

Datum van de review: zaterdag 3 oktober 2026. Ik heb de app doorlopen als de gebruiker: iemand die traint voor de GR5 (augustus 2027), daarnaast een marathon wil lopen, kracht bijhoudt in MacroFactor en loopt met een Garmin.

Werkwijze: verse browser op 390x844, demoprogramma geseed, daarna een heuvelsessie van vandaag gelogd, een gemiste Easy Run van donderdag achteraf gelogd, het GR5-doel ingevuld en geactiveerd (1 augustus 2027, 600 km, 30.000 m D+ en D−, 40 loopdagen, 12 kg), MacroFactor-modus aangezet, en zondag en dinsdag gesimuleerd. Alle screenshots staan in `/tmp/claude-0/-home-user-ASCEND/ad6ded69-be17-5801-b543-86d3d2b5c25f/scratchpad/audit/ux/shots/`. Hieronder noem ik alleen de bestandsnaam.

Het gaat hier niet om bugs. Een paar dingen die ik zag, grenzen wel aan bugs. Die noem ik toch, omdat ze voor de gebruiker vooral onlogisch aanvoelen. Ik geef dan aan dat de bug-agent ze misschien al oppakt.

Eerst het goede nieuws. De trainingsuitleg per sessie (20-guide-sheet-full.png) is het sterkste scherm van de app: opbouw als grafiek, de stappen voor je Garmin, wat de sessie belast, de vier weken van de fase en een link naar trainingsplekken. Ook "Niet fit?" (23-niet-fit.png) en Trainingsplekken (08-plekken-top.png) zijn helder en passen goed bij de gebruiker. Het probleem van de app is niet dat er te weinig in zit. Er zit eerder te veel in, verspreid over te veel plekken, en de belangrijkste koppeling ontbreekt: die tussen het plan en de GR5-datum.


## 1. Eerste start en de koppeling met het doel

### 1.1 De app begint in het verleden en meldt meteen gemiste sessies

Wat ik zag: bij de allereerste opening staat de app al in "Week 1 • Basisfase", met een week die maandag 28 september begon. Maandag tot en met vrijdag staan in Week met een uitroepteken als gemist (02-week.png). De Coach opent met "4 adviezen": drie keer "gemist" en één keer "Kracht: 0 van 3 sessies afgevinkt. Past het huidige krachtblok nog bij je week?" (22-coach-all.png). History meldt "Gemist 2, -1 t.o.v. vorige maand" (04-history.png). Ook de getallen zijn niet eens consistent: Week toont vijf gemiste sessies, History twee voor oktober en drie voor september.

Waarom het beter kan: de eerste indruk is dat je al achterloopt, voordat je iets hebt kunnen doen. Dat botst met de Stoïcijnse rust die de app wil uitstralen. Bovendien moet de gebruiker drie keer op "Akkoord" tikken om iets op te ruimen wat hij niet heeft veroorzaakt.

Voorstel: tel sessies vóór de installatiedatum (of vóór de gekozen startdatum) nooit als gemist. Vraag bij de eerste opening in één scherm: "Wanneer begin je? Vandaag / Aanstaande maandag." De keuze "Volgende week is week 1" bestaat al onder Meer > Training (77-opnieuw-week1.png), maar een nieuwe gebruiker vindt die daar niet.

Moeite: klein. Impact: hoog.

### 1.2 Er is geen startgesprek, terwijl de app veel moet weten

Wat ik zag: een nieuwe gebruiker krijgt meteen het hele demoprogramma. Wat de app voor deze gebruiker moet weten, staat verspreid over vijf plekken:
- de GR5-datum: Ascend > Doel aanpassen
- dat kracht in MacroFactor zit: Meer > Training, onderaan
- het lichaamsgewicht: een kaart op Vandaag én Meer > Algemeen
- de woonplaats: Trainingsplekken
- de beschikbare tijd: Meer > Training

Waarom het beter kan: "slimmer, niet moeilijker" betekent dat de app één keer de juiste vragen stelt, in plaats van de gebruiker zelf te laten zoeken wat er nog ontbreekt.

Voorstel: een startgesprek van vier korte stappen dat je kunt overslaan:
1. GR5-datum
2. Kracht in MacroFactor? ja/nee
3. Trendgewicht
4. Welke dagen kun je trainen, en wat is je lange dag (zaterdag of zondag)?

Alles daarna blijft aanpasbaar in Meer.

Moeite: middel. Impact: hoog.

### 1.3 Het GR5-doel staat standaard op pauze en is leeg

Wat ik zag: op Ascend staat onder "GR5 DOEL": "Gepauzeerd, nog geen streefdatum ingesteld. Telt zo nog niet mee bij Goal Focus of het plannen van sessies." (03-ascend.png). In de wizard zijn 600 km en 30.000 m alleen grijze voorbeeldtekst (placeholder). Je moet ze zelf typen en zelf "Meerdere dagen (tocht)" kiezen in een keuzelijst "+ EIS TOEVOEGEN" (60-goalwiz-1.png, 61-goalwiz-multiday.png).

Waarom het beter kan: de app heet in de kern "GR5 / Alpine Readiness" en kent de GR5 al (src/data/gr5Details.ts). Toch begint het hoofddoel uit en leeg.

Voorstel: een GR5-sjabloon met ingevulde waarden (±600 km, ±30.000 m D+ en D−, ±40 loopdagen, 12 kg). De gebruiker hoeft dan alleen de datum te kiezen. Zonder datum zou het doel actief moeten zijn met "datum nog onbekend", niet gepauzeerd.

Moeite: klein. Impact: hoog.

### 1.4 Het plan stopt in januari, de GR5 is in augustus

Wat ik zag: Meer > Training zegt "Je staat nu in week 1 van 16, basisfase" (05-more-training.png). Ik heb door de weken geklikt: week 13 tot en met 16 heten "EXPEDITIEKLAAR" en lopen tot half januari 2027. Vanaf maandag 18 januari staat er niets meer in Week, ook niet nadat ik de GR5 op 1 augustus 2027 had geactiveerd (55-week-plus17.png, 56-week-plus42.png). Ascend zegt intussen "nog 302 dagen" (68-ascend-after-goal.png).

Waarom het beter kan: dit is de belangrijkste inhoudelijke breuk in de app. De gebruiker is volgens het plan "expeditieklaar" zeven maanden voor vertrek, en daarna is er niets. Het onderzoek (docs/onderzoek, "Fase 2 tot en met 4 in getallen") beschrijft juist een opbouw die naar de generale repetitie en de taper vóór vertrek toewerkt.

Voorstel: reken het programma terug vanaf de doeldatum. De laatste 16 weken worden de specifieke opbouw (fase 2 tot en met 4 plus taper). De weken daarvoor worden een herhalend basisblok, met ruimte voor het hardlopen. Toon overal hetzelfde getal, bijvoorbeeld "week 1 van 44". Zonder doeldatum blijft het huidige 16-wekenblok de standaard.

Moeite: groot. Impact: hoog.


## 2. Vandaag

### 2.1 De missie staat bovenaan, maar de Coach-kaart verdringt de rest

Wat ik zag: de missiekaart staat netjes bovenaan (01-today-first.png). Direct daaronder volgt een Coach-kaart met twee tot vier adviezen, elk met "Akkoord / Liever niet / waarom". De volgorde van het scherm is: back-up, missie, coach, gewicht, twee tekstlinks, vier tegels, weekterugblik, objectief, rekken, citaat (22-coach-all.png, 90-today-sunday.png). Op zondag staat in de Coach "Lange Duurloop op zo 4 oktober rustig houden (RPE 3-4)". Dat gaat over de sessie van vandaag, maar staat los van de missiekaart.

Waarom het beter kan: elke gemiste sessie vraagt een eigen beslissing. Dat is precies het soort bijhouden dat de gebruiker niet wil. En advies over de training van vandaag hoort bij die training.

Voorstel:
- Bundel gemiste sessies tot één regel: "3 sessies gemist deze week. ASCEND laat ze vallen. [Oké] [Toch inhalen]".
- Zet advies over de sessie van vandaag ín de missiekaart, als één regel onder de titel: "Vandaag rustig, RPE 3-4, na de zware heuvels."
- Laat de Coach-kaart weg als er niets te beslissen is.

Moeite: middel. Impact: hoog.

### 2.2 Coachteksten lezen als systeemlogboek

Wat ik zag: onder "waarom" staat "Trigger: geen log voor deze sessie. Regel: inhalen op een vrije dag in dezelfde week, zonder twee zware beendagen binnen 48 uur. Lukt dat niet, dan laten vallen." (22-coach-all.png). In de logger staat bij gevoel: "helpt Ascend signaleren als Bergconditie op vrijdag zaterdags Lower B twee weken op rij verstoort".

Waarom het beter kan: "Trigger" en "Regel" zijn ontwikkelaarstermen. De tweede zin is niet te volgen.

Voorstel: één gewone zin, bijvoorbeeld: "Je hebt deze sessie niet gelogd. Inhalen kan alleen als je benen er twee dagen rust omheen hebben, en die dag is er deze week niet."

Moeite: klein. Impact: middel.

### 2.3 "Was zwaar (RPE 8)" na een sessie die zwaar hoort te zijn

Wat ik zag: de heuvelintervallen vragen volgens de uitleg "Hard (RPE 8-9)" (20-guide-sheet-full.png). Ik logde RPE 8. Direct daarna zei de Coach "Heuvel-/Incline-Intervallen was zwaar (RPE 8)" en zette de lange duurloop van morgen op rustig (32-after-complete-1500.png). De regel in src/engine/adviceEngine.ts reageert op elke RPE van 8 of hoger, los van wat de bedoeling was.

Waarom het beter kan: wie precies doet wat er gevraagd wordt, krijgt een waarschuwing. Zo verliest de coach geloofwaardigheid. Het onderzoek ("Beslisregel voor de app") spreekt van RPE-drift: de gelogde RPE min de doel-RPE.

Voorstel: vergelijk de gelogde RPE met de doel-RPE van de sessie, en waarschuw pas bij +2 of meer. Bij een harde sessie kan de vraag ook anders: "Hoe zwaar was de sessie als geheel?"

Moeite: klein. Impact: hoog.

### 2.4 "Sessie starten" opent een formulier om af te ronden

Wat ik zag: de grote knop heet "SESSIE STARTEN". Hij opent een scherm dat "SESSIE VOLTOOIEN" heet, met velden voor afstand, stijging, hartslag, duur en RPE (30-logger-full.png). Wat je echt gaat doen, staat achter een klein (i)-icoon rechtsboven in de kaart (20-guide-sheet-full.png).

Waarom het beter kan: de gebruiker traint met zijn Garmin en logt achteraf. "Starten" belooft iets wat de app niet doet. Het nuttigste scherm, de uitleg, is het slechtst vindbaar.

Voorstel:
- Toon op de missiekaart de opbouw in één regel, bijvoorbeeld "10 min inlopen · 5× 1 min bergop · 10 min uitlopen", met een knop "Bekijk training".
- Noem de hoofdknop "Gedaan, invullen".
- Voeg daarnaast een knop "Gedaan zoals gepland" toe die met één tik logt (zie ontbrekende functies).

Moeite: klein. Impact: hoog.

### 2.5 Vier tegels die deels dubbel zijn

Wat ik zag: "WEEK 0 / 7", "CONSISTENTIE 0%", "BLOK 1/4" en "REEKS 0 dagen" (01-today-full.png). Bovenaan staat al "WEEK 1 • BASISFASE". Op zondag en maandag komt daar een "WEEKTERUGBLIK" bij, met opnieuw "Deze week 2 / 7 voltooid" en "Huidige reeks: 1 dag op rij" (90-today-sunday.png).

Waarom het beter kan: "Blok" is een derde woord voor wat elders "fase" en in de Trainingsgids "Maand 1" heet. Een reeks van opeenvolgende dagen beloont elke dag trainen. Dat botst met het principe dat rust en deload als trouw tellen, en het neigt naar gamification.

Voorstel: vervang de vier tegels door één rustige regel onder de missie: "Deze week 2 van 6 · Basisfase week 1 van 4 · GR5 over 302 dagen". Laat de reeks weg, of tel alleen weken waarin je het plan volgde.

Moeite: klein. Impact: middel.

### 2.6 De GR5-aftelling staat niet op Vandaag

Wat ik zag: "nog 302 dagen" staat alleen diep in Ascend (68-ascend-after-goal.png). Vandaag toont wel een "VOLGEND OBJECTIEF" van de ladder met "40 min makkelijk tempo...", maar niet het echte doel.

Waarom het beter kan: het doel is de reden voor elke sessie. Eén getal op het hoofdscherm geeft zonder extra moeite richting.

Voorstel: zet "GR5 · nog 302 dagen" in de kopregel naast het weeknummer.

Moeite: klein. Impact: middel.

### 2.7 Back-upmelding na de eerste log

Wat ik zag: direct na de allereerste gelogde sessie verschijnt bovenaan "Je hebt al een tijdje geen back-up gemaakt." (32-after-complete-1500.png).

Waarom het beter kan: de tekst klopt niet ("al een tijdje"), en de melding duwt de missie omlaag op het moment dat de gebruiker net iets goeds deed.

Voorstel: toon de melding pas als er een week aan data is. Bied in het startgesprek de vaste back-upmap aan (Meer > Gegevens > Map kiezen), zodat de melding meestal niet nodig is.

Moeite: klein. Impact: middel.

### 2.8 Gewichtskaart op dag één

Wat ik zag: "GEWICHT BIJWERKEN" staat op Vandaag tussen de Coach en de tegels (01-today-full.png). Hetzelfde veld staat in Meer > Algemeen (05-more.png).

Waarom het beter kan: op dag één is dat een extra taak tussen de missie en de rest van het scherm.

Voorstel: vraag het gewicht in het startgesprek. Daarna verschijnt de herinnering pas volgens de ingestelde frequentie. Komt de MacroFactor-import er (zie ontbrekende functies), dan kan de kaart helemaal weg.

Moeite: klein. Impact: laag.

### 2.9 Citaten in Latijn en Engels, zonder vertaling

Wat ik zag: "Finis coronat opus." met de bron "Latin proverb tradition" en "Traditional proverb" (01-today-full.png). Na het loggen verschijnt "Durate, et vosmet rebus servate secundis." (32-after-complete-1500.png). Op zondag staat er een Engelse vertaling van Marcus Aurelius (90-today-sunday.png).

Waarom het beter kan: de app is Nederlandstalig. Een citaat dat je niet begrijpt, voegt niets toe. Na het loggen wil je ook eerder zien wat je gedaan hebt dan een spreuk lezen.

Voorstel: Nederlandse vertaling met het origineel klein eronder, en bronlabels in het Nederlands. Een instelling om citaten uit te zetten.

Moeite: klein. Impact: laag.

### 2.10 "Losse training loggen" mist de echte wandeltocht

Wat ik zag: de lijst bevat Fietstocht, Easy Run, Heuvel-intervallen, Bergconditie, Lange Duurloop, vier krachtsessies en Herstel (24-losse-training.png). "Lange Duurloop" staat er als "Hiken". Een gewone wandeling of bergtocht met rugzak staat er niet tussen. Je kunt ook geen datum kiezen.

Waarom het beter kan: voor de GR5 is een spontane wandeling met rugzak juist de waardevolste losse activiteit.

Voorstel: voeg "Wandeling / bergtocht" en "Andere activiteit" toe, met een datumveld dat standaard op vandaag staat.

Moeite: klein. Impact: hoog.

### 2.11 Ziek en blessure staan op twee plekken

Wat ik zag: "Niet fit?" op Vandaag gaat alleen over ziekte (23-niet-fit.png). Blessures staan onder Meer > Algemeen > Gezondheid (78-blessure-toevoegen.png).

Waarom het beter kan: voor de gebruiker is het dezelfde vraag: "ik kan vandaag niet zoals gepland."

Voorstel: laat "Niet fit?" drie keuzes geven: ziek, blessure of pijn, of geen tijd/energie. De blessurepagina blijft bestaan als overzicht.

Moeite: klein. Impact: middel.


## 3. Sessie loggen, viering en debrief

### 3.1 Twee bijna gelijke vragen bovenaan het logformulier

Wat ik zag: "Hoe wil je trainen? ASCEND / GARMIN / VRIJ" en daaronder "Hoe train je vandaag?" met keuzes als "Heuvelherhalingen, buiten (Primair)", "Incline-intervallen, treadmill (Gelijkwaardig)" en "StairMaster-intervallen (Noodgreep)" (30-logger-full.png). Kies je GARMIN, dan verschijnen Engelse chips: Recovery, Base, Tempo, Threshold, VO2 Max, Sprint, Long, Bike (31-logger-garmin.png). In de logdetails staat later "ASCEND Guided" (51-logdetail.png).

Waarom het beter kan: achteraf maakt het voor de gebruiker niet uit of hij het "ASCEND-advies" of de "Garmin-suggestie" volgde. Het enige relevante is waar en hoe hij trainde. De tekst "Primair / Gelijkwaardig / Noodgreep" hoort bij de uitleg vooraf, niet bij het invullen achteraf.

Voorstel: schrap de vraag "Hoe wil je trainen?". Laat bij "Hoe train je vandaag?" de geplande vorm voorgeselecteerd en ingeklapt staan ("Buiten · wijzigen").

Moeite: klein. Impact: middel.

### 3.2 Rekoefeningen in het logformulier

Wat ik zag: "OPWARMING (voor), 8 tonen" bovenaan en "AFKOELING (na), 4 tonen" onderaan het invulformulier (30-logger-full.png).

Waarom het beter kan: opwarmen doe je vóór de training. In een formulier dat je achteraf invult, staat het in de weg.

Voorstel: verplaats opwarming en afkoeling naar de trainingsuitleg (de sheet achter de (i)).

Moeite: klein. Impact: laag.

### 3.3 Gevoel en pijn ontbreken bij hardlopen en wandelen

Wat ik zag: "Hoe voelde dit t.o.v. normaal? BETER / NORMAAL / SLECHTER" staat alleen bij kracht (src/components/ExerciseLogger.tsx, regel 273). Bij Easy Run, heuvels en de lange duurloop kun je alleen RPE invullen (41-logger-easyrun.png). Een vraag over pijn is er nergens. Toch kijkt het herstelsignaal op Vandaag naar lange duurlopen die "slechter" voelden (src/pages/Today.tsx).

Waarom het beter kan: volgens het onderzoek ("Weeg meerdere signalen") zijn gevoel en een pijnvlag de belangrijkste signalen, belangrijker dan elk Garmin-getal. Nu kan de gebruiker ze voor de sessies die het zwaarst wegen niet eens doorgeven.

Voorstel: onder elke log één rij met drie knoppen (beter, normaal, slechter) plus één schakelaar: "Pijn die je bewegen veranderde?"

Moeite: klein. Impact: hoog.

### 3.4 Achteraf loggen komt op de verkeerde dag terecht

Wat ik zag: de Easy Run van donderdag 1 oktober logde ik op zaterdag via Week. In History staat hij op "3 oktober" (50-history-data.png, 51-logdetail.png). Er is geen datumveld.

Waarom het beter kan: wie op zondag de week bijwerkt, krijgt een vertekende geschiedenis. Ook de 30-dagenpieken en de rustdagen kloppen dan niet meer. De bug-agent pakt dit misschien al op. Vanuit UX is het voorstel hoe dan ook een datumveld.

Voorstel: neem standaard de geplande datum over, met een veld "Wanneer?" om die te wijzigen.

Moeite: klein. Impact: hoog.

### 3.5 Velden zonder eenheid en met Engelse termen

Wat ik zag: "Cadans" zonder eenheid (30-logger-full.png). Elders in de code staat "Machine-vertical (optioneel)".

Voorstel: "Cadans (stappen/min)". Vervang "Machine-vertical" door "Hoogtemeters volgens toestel".

Moeite: klein. Impact: laag.

### 3.6 De debrief herhaalt hetzelfde getal drie keer

Wat ik zag: na de Easy Run toont de debrief "Algemene conditie: 33 min", "Uithoudingsvermogen (Hardlopen): 33 min", "Belastbaarheid van je benen (Hardlopen): 33 min", "Klimcapaciteit (D+): 20 m D+" en "Duurzaam tempo (Hardlopen): 6:07 min/km" (43-debrief.png). Daarvoor verschijnt een viering met een Latijns citaat die je eerst moet wegtikken (32-after-complete-1500.png).

Waarom het beter kan: drie keer "33 min" zegt niets. De gebruiker wil weten of de sessie goed ging ten opzichte van het plan, en wat er nu komt.

Voorstel: maak van de viering en de debrief één kort scherm: "Easy Run gedaan · 5,4 km · 33 min · RPE 4 (doel 3-4), precies goed. Volgende: zondag Lange duurloop 50 min." Een eventueel advies volgt daar in één regel onder.

Moeite: klein. Impact: middel.

### 3.7 MacroFactor-modus: de gevoelsknoppen slaan ook meteen op

Wat ik zag: met MacroFactor aan toont de missiekaart voor Upper A een duurveld en drie goudkleurige knoppen: BETER, NORMAAL, SLECHTER (91-today-tuesday-mf.png). Een tik op een van die knoppen logt de sessie direct.

Waarom het beter kan: het is niet te zien dat die knoppen opslaan. Ze lijken op een keuze, niet op een afronding.

Voorstel: één knop "Gedaan in MacroFactor", met de gevoelskeuze als optionele rij erboven.

Moeite: klein. Impact: middel.


## 4. Week

### 4.1 Gedaan en gemist zijn moeilijk te onderscheiden

Wat ik zag: gemist is een gedimde kaart met een oranje "!", gedaan een gewone kaart met een klein grijs vinkje. Bij een gedane sessie staat de geplande duur (30 min), niet wat er echt gebeurde (33 min, 5,4 km) (52-week-data.png). De kop toont "6u 25m gepland", maar niet hoeveel daarvan gedaan is.

Voorstel: toon bij gedane sessies het resultaat ("5,4 km · 33 min"). Zet in de kop "gedaan 1u 11m van 6u 25m · 11,6 km · 160 m D+".

Moeite: klein. Impact: middel.

### 4.2 Het venster voor een gemiste sessie biedt "Start volledige sessie" aan

Wat ik zag: tik je in Week op de gemiste Easy Run van donderdag, dan verschijnt "START VOLLEDIGE SESSIE" en "Verplaats naar: Vandaag, samen met Heuvel-intervallen, 65 min; Morgen, zondag, samen met Lange Duurloop, 80 min" (40-week-actionsheet-easyrun.png). Tegelijk zegt de Coach over dezelfde sessie "Laten vallen" (22-coach-all.png).

Waarom het beter kan: voor een sessie in het verleden is "starten" onlogisch. Dat je hem kunt "inhalen" naast de lange duurloop, spreekt ook nog de coach tegen.

Voorstel: voor sessies in het verleden twee knoppen: "Wel gedaan, invullen" en "Niet gedaan". Inhaalvoorstellen komen alleen van de Coach, op één plek.

Moeite: klein. Impact: middel.

### 4.3 Herstel telt als een sessie die je kunt missen

Wat ik zag: maandag "Herstel, 45 min" staat met een "!" als gemist (02-week.png). Hij telt mee in "0 / 7". Op Ascend staat "HERSTEL 0%", omdat er geen herstelsessie is gelogd (src/engine/readiness.ts, regel 59).

Waarom het beter kan: een rustdag wordt zo een taak die je kunt verzuimen. "Herstel 0%" leest bovendien als "je bent totaal niet hersteld".

Voorstel: maak Herstel optioneel. Tel het niet als gemist en niet mee in het weekdoel. Hernoem het percentage naar iets als "rustdagen genomen", of laat het weg.

Moeite: klein. Impact: middel.

### 4.4 De melding "Aangepast" blijft over de inhoud hangen

Wat ik zag: na het activeren van het doel verschijnt onderaan "AANGEPAST, Weekplanning bijgewerkt, Lange Duurloop op zo 18 oktober krijgt een andere invulling". Hij ligt over de onderste sessie in Week, over Trainingsplekken en over Bronnen, en kwam in mijn test na × en herladen terug (70-marathon-hele.png, 77-opnieuw-week1.png, 08-plekken-top.png). De zondagsessie in Week kon ik daardoor niet aantikken. Dat terugkomen kan een bug zijn.

Voorstel: laat de melding na een paar seconden zelf verdwijnen. Bewaar de wijziging in een klein logboek "Wijzigingen deze week" in Week, met "ongedaan maken" daar.

Moeite: klein. Impact: middel.

### 4.5 Het maandoverzicht opent op de verkeerde maand en zegt weinig

Wat ik zag: "maandoverzicht" opent op september in plaats van oktober, met alleen stippen (53-week-maand.png).

Voorstel: open op de maand van vandaag en kleur de stippen naar soort sessie en status. Of schrap het overzicht en laat History de maandweergave doen.

Moeite: klein. Impact: laag.

### 4.6 De lange duurloop heeft drie verschillende labels

Wat ik zag: in Week en op Vandaag heet hij "Avontuur" (02-week.png, 90-today-sunday.png), bij losse training "Hiken" (24-losse-training.png), in de gids "Uithouding × D+". Het is een duurloop. Dezelfde notatie met × staat ook bij de heuvels ("Snelheid × D+").

Voorstel: één indeling (Kracht, Hardlopen, Wandelen/berg, Fietsen, Herstel) en dezelfde labels overal. Vervang de notatie met × door gewone taal ("Uithouding en hoogtemeters").

Moeite: klein. Impact: middel.


## 5. Ascend

### 5.1 Te veel onderdelen op één pagina

Wat ik zag: van boven naar beneden staan er twaalf onderdelen:
1. Ascend Readiness met drie balken
2. Readiness-trend
3. Capaciteit met vijf balken
4. Krachtprogramma
5. Krachtblok-review met vier knoppen
6. GR5-doel
7. Marathondoel
8. Nieuw doel
9. Doelfocus
10. De Beklimming, met 13 mijlpalen
11. Trainingsverdeling
12. Later: GR5-materiaal

Bij elkaar is de pagina bijna 4.000 pixels hoog (68-ascend-after-goal.png).

Waarom het beter kan: de vraag "hoe sta ik ervoor richting de GR5?" vind je niet in twee seconden. Doelen beheren, de krachtinstellingen en uitleg staan tussen de voortgang in.

Voorstel: steun de richting uit BACKLOG.md. Bovenaan komt een overzicht: GR5-aftelling, status ("op schema" of "achter"), de volgende mijlpaal en drie tot vier vermogens. "Doelen beheren" wordt een eigen pagina. Het krachtprogramma verhuist naar Meer > Training. De trainingsverdeling en het materiaal gaan naar de Trainingsgids.

Moeite: groot. Impact: hoog.

### 5.2 Percentages waarvan niemand weet wat ze betekenen

Wat ik zag: bij een lege start staat "ASCEND READINESS 33%", terwijl Herstel 0% en Consistentie 0% zijn. Die 33% komt volledig uit "SESSIE-RESPONS 100%", wat standaard 100% is zonder data (03-ascend.png). Daarna volgen "CAPACITEIT 14%", "KLIMMEN / D+ 16%" en bij Doelfocus "100%" naast "ONWAARSCHIJNLIJK" (68-ascend-after-goal.png).

Waarom het beter kan: 14% capaciteit ten opzichte van wat? 100% van wat, als het onwaarschijnlijk is? De gebruiker kan met deze getallen niets beslissen.

Voorstel: vervang percentages door woorden en echte eenheden: "Klimmen: 160 m D+ in de laatste 4 weken, doel per dag 750 m". Toon readiness pas na twee weken data. Leg in één zin uit wat het getal betekent.

Moeite: middel. Impact: hoog.

### 5.3 "Onwaarschijnlijk" op dag één, met vertrouwen "hoog"

Wat ik zag: na het invullen van de GR5 zegt de app: "HAALBAARHEID: ONWAARSCHIJNLIJK. Doel vraagt 750 m; nu aantoonbaar 20 m (vertrouwen: hoog, meerdere recente metingen die elkaar bevestigen)". Dat oordeel is gebaseerd op twee sessies van één week (66-goalwiz-step3.png en de tekst bij 68-ascend-after-goal.png).

Waarom het beter kan: met 302 dagen te gaan hoort je huidige niveau ver onder het doel te liggen. Het oordeel ontmoedigt en is inhoudelijk onjuist: twee metingen geven geen hoog vertrouwen.

Voorstel: vergelijk met de verwachte lijn naar de doeldatum ("voor week 1 ligt 150 m D+ op schema"). Toon "te weinig data" onder vier weken.

Moeite: middel. Impact: hoog.

### 5.4 Twee voortgangsmodellen naast elkaar

Wat ik zag: "De Beklimming" is een vaste ladder van dertien mijlpalen, met Engelse ondertitels (Aerobic Base, Uphill Endurance, Vertical Base I, Load Carriage I) en "SUMMIT" onderaan. Daarnaast vergelijkt "Doelfocus" je capaciteit met de vraag van je eigen doel. De ladder zegt "15 km + 1000 D+" en "12 kg / 15 km", terwijl het ingevulde doel uitkomt op 15 km en 750 m D+ per dag (68-ascend-after-goal.png).

Waarom het beter kan: twee systemen geven twee verhalen over dezelfde vraag.

Voorstel: leid de ladder af van het ingevulde doel (gemiddelde loopdag, rugzak, aantal dagen achter elkaar), met Nederlandse namen. Houd één voortgangsmodel over.

Moeite: groot. Impact: middel.

### 5.5 Het doelvenster: "etappe" betekent iets anders dan op de GR5

Wat ik zag:
- In de wizard betekent "Meerdere etappes" een tocht in delen met tijd thuis ertussen, en "Langste etappe" wordt in dagen gevraagd (61-goalwiz-multiday.png). Op de GR5 en in de Trainingsgids is een etappe juist één dagtocht ("±600 km over circa 40 etappes", 06-gids.png).
- Een rugzak van 40 kg werd zonder waarschuwing geaccepteerd.
- "+ geavanceerd: velden direct aanpassen" toont "Startdatum", terwijl de wizard "Doeldatum" zegt (73-route-geavanceerd.png).
- Er zijn twee manieren om hetzelfde doel te bewerken.

Voorstel:
- Gebruik "In één keer" en "In delen (met pauzes thuis)", en "Langste deel achter elkaar".
- Geef een waarschuwing boven 20% van het lichaamsgewicht. Die grens staat ook in het onderzoek.
- Gebruik overal "Vertrekdatum".
- Schrap de geavanceerde bewerkweg.

Moeite: klein. Impact: middel.

### 5.6 Krachtprogramma: technische naam en een onduidelijke knop

Wat ik zag: "3x/week, upper_lower" (een interne code) en de knop "MIJN SCHEMA IS AFGELOPEN". Na het activeren van het doel verschijnt "KRACHTBLOK REVIEW" met vier knoppen: Volgend blok bekijken, Huidig blok herhalen, Voorkeuren aanpassen, Niet nu (68-ascend-after-goal.png).

Voorstel:
- "3× per week · Upper/Lower".
- "Mijn MacroFactor-schema is klaar, kies een nieuw blok".
- Toon de review alleen als het blok echt afloopt, niet na elke doelwijziging.

Moeite: klein. Impact: middel.

### 5.7 Marathon zonder context

Wat ik zag: "MARATHON DOEL" met twee knoppen, HALVE en HELE, zonder uitleg (68-ascend-after-goal.png). Kies je HELE, dan verschijnt opnieuw "Gepauzeerd, nog geen streefdatum" (70-marathon-hele.png).

Waarom het beter kan: volgens het onderzoek ("De GR5 eerst, dan de marathon") komt de marathon na de GR5.

Voorstel: stel de marathon voor als vervolgdoel, met de tekst "Na de GR5. ASCEND houdt je loopbasis tot dan op peil." Laat hem geen ruimte innemen naast het hoofddoel.

Moeite: klein. Impact: laag.


## 6. History

### 6.1 Alleen een maandtotaal, geen trend

Wat ik zag: per maand een blok met Krachtsessies, Hardlopen, Hoogtemeters, Wandelen, Trainingstijd en Gemist, met vergelijkingen ten opzichte van vorige maand, en daaronder de lijst (50-history-data.png).

Waarom het beter kan: voor de marathon tellen kilometers per week. Voor de GR5 tellen D+ en D−, de langste tocht en het rugzakgewicht per week. Precies die trends ontbreken. "Gemist" krijgt evenveel nadruk als wat je wel deed.

Voorstel: een kleine weekgrafiek over twaalf weken met drie keuzes: km, D+ en langste sessie. Haal "Gemist" uit het hoofdblok.

Moeite: middel. Impact: hoog.

### 6.2 Een log kun je niet aanpassen

Wat ik zag: het detailvenster van een log heeft alleen "Sluiten" (51-logdetail.png). Ongedaan maken kan alleen via het venster van de geplande sessie in Week.

Voorstel: "Bewerken" en "Verwijderen" in het detailvenster, inclusief de datum. Dat blijft append-only als je een correctie als nieuwe versie opslaat.

Moeite: middel. Impact: middel.


## 7. Meer (instellingen)

### 7.1 De indeling van de tabbladen is willekeurig

Wat ik zag: "Algemeen" bevat gidsen, blessures, lichaamsgewicht, de appversie, geluid en integraties (05-more.png). "Training" bevat het programma, sporten, wijzigingen toepassen, trainingstijd per dag, meerdere trainingen per dag en kracht (05-more-training.png). Rekoefeningen zijn alleen bereikbaar via een icoon op Vandaag, niet via Meer.

Voorstel: vier groepen:
- Gidsen: training, plekken, rekken, Garmin, bronnen
- Ik: gewicht, hartslag, blessures
- Planning: programma, dagen en tijd, sporten, kracht, wijzigingen
- Gegevens en app

Moeite: klein. Impact: middel.

### 7.2 Twee MacroFactor-schakelaars die niets van elkaar weten

Wat ik zag: Meer > Training heeft de schakelaar "Bijgehouden in MacroFactor", die standaard uit staat. Ascend > Schema aanpassen heeft "Bron: MacroFactor Workouts / Handmatig bijgehouden / Andere externe app" (72-schema-aanpassen.png). Alleen de eerste bepaalt of je sets en reps moet invullen (src/pages/Today.tsx, src/components/ExerciseLogger.tsx). Daardoor kreeg ik bij Upper A een lang formulier met kg × reps voor elke set (81-logger-strength.png), terwijl de bron al op MacroFactor stond.

Voorstel: één instelling, de bron in het krachtblok. MacroFactor als bron betekent automatisch afvinken met één tik.

Moeite: klein. Impact: hoog.

### 7.3 Vaste waarden die instelbaar moeten zijn

Wat ik zag:
- Hartslagwaarden staan vast in de code: "Max HR 204 bpm · LTHR 178 bpm · Resting HR 49 bpm" (07-garmin.png, src/data/garminGuide.ts).
- De weekindeling ligt vast: maandag herstel, zaterdag heuvels, zondag lange duurloop. Er is geen instelling voor welke dagen je kunt trainen of wat je lange dag is.
- "Trainingstijd per dag" kent geen "deze dag niet". Een lege dag "telt als vol zodra er één sessie op staat" (05-more-training.png).
- Verder vast: de programmalengte (16 weken), de rusttimer van 90 seconden (ExerciseLogger), de grens tussen ochtend- en avondrekken (12:00) en de back-upherinnering (7 dagen).

Waarom het beter kan: "alles wat vaststaat, moet instelbaar zijn." De hartslagwaarden zijn bovendien van één specifieke persoon.

Voorstel:
- "Mijn week": per dag beschikbaar ja/nee plus minuten, en de keuze lange dag zaterdag of zondag.
- "Mijn hartslag": max, LTHR en rust. Toon daarmee de zones in bpm in de trainingsuitleg ("zone 2 = 140 tot 155").
- Rusttimer en citaten bij app-voorkeuren.

Moeite: middel. Impact: hoog.

### 7.4 De uitleg bij trainingstijd per dag is te lang

Wat ik zag: een alinea van zeven regels voordat je bij de velden komt (05-more-training.png).

Voorstel: één zin, "Hoeveel minuten heb je per dag? ASCEND zet nooit meer op een dag dan dit.", met de rest achter "meer uitleg".

Moeite: klein. Impact: laag.

### 7.5 Drie keer "opnieuw beginnen"

Wat ik zag:
- "OPNIEUW BEGINNEN BIJ WEEK 1" onder Training, met de keuzes "Schone start" en "Alleen de weektelling" (77-opnieuw-week1.png).
- Onder Geavanceerd een kop "OPNIEUW BEGINNEN" met daarin "Herbouw aanbevelingen" en "Alles verwijderen en opnieuw beginnen" (05-more-geavanceerd.png).

Waarom het beter kan: de namen lijken op elkaar, en "Herbouw aanbevelingen" is een knop die de gebruiker niet zou moeten nodig hebben.

Voorstel: Training krijgt "Programma opnieuw plannen", Geavanceerd houdt alleen "Alles wissen". Haal "Herbouw aanbevelingen" weg of verstop het als hulpmiddel bij problemen.

Moeite: klein. Impact: laag.

### 7.6 Integraties: "Binnenkort" zonder iets te doen

Wat ik zag: Garmin, Health Connect en MacroFactor staan alle drie op "Binnenkort" (05-more.png). Onder Gegevens kun je alleen een eigen back-up importeren (05-more-gegevens.png).

Voorstel: vervang dit door bestandsimport (zie ontbrekende functies). Die werkt nu al, zonder backend.

Moeite: middel. Impact: hoog.


## 8. Gidsen, Bronnen en Trainingsplekken

### 8.1 De Trainingsgids is per weekdag ingedeeld, de planning schuift

Wat ik zag: "MAANDAG Herstel, DINSDAG Upper A, ..., FLEXIBEL Bergconditie, FLEXIBEL Lower B" met de kop "Maand 1, Basisfase, dag voor dag" (06-gids.png).

Waarom het beter kan: na het verplaatsen klopt "dinsdag" niet meer. "Maand 1" is een vierde benaming naast week, blok en fase.

Voorstel: deel de gids in per soort sessie (kracht, hardlopen, berg, herstel) en gebruik overal "fase" voor het blok van vier weken.

Moeite: klein. Impact: laag.

### 8.2 Terminologie in één oogopslag

Wat ik zag:
- De onderste navigatie is Engels: TODAY, WEEK, ASCEND, HISTORY, MORE.
- "Wennen / Opbouw / Zwaarste week / Deload" (20-guide-sheet-full.png).
- "Goal Focus" (03-ascend.png) en "Ascend Readiness".
- "Wennen, 4-5 herhalingen" naast "5× herhalen" en "30-90 sec" naast "Bergop 1 min" (20-guide-sheet-full.png, 30-logger-full.png).

Voorstel:
- Navigatie: Vandaag, Week, Doel, Logboek, Meer.
- "Deload" wordt "Herstelweek".
- Eén getal voor herhalingen en duur per week, overal hetzelfde.

Moeite: klein. Impact: middel.

### 8.3 Bronnen en Trainingsplekken

Wat ik zag: Bronnen is een doorzoekbaar archief van 272 bronnen (09-bronnen-top.png). Trainingsplekken is helder, onthoudt je woonplaats en wordt vanuit de trainingsuitleg gelinkt (08-plekken-top.png).

Voorstel: bij Trainingsplekken alleen een kleine aanvulling. Toon in de trainingsuitleg direct de dichtstbijzijnde passende plek ("Dichtstbij: Amersfoortse Berg, 12 min"), in plaats van alleen een link naar de lijst. Aan Bronnen hoeft niets te veranderen.

Moeite: klein. Impact: laag.


## Ontbrekende functies

Alles hieronder maakt de app slimmer zonder dat de gebruiker meer hoeft bij te houden.

### A. Garmin-activiteit importeren uit een bestand

Wat: deel of kies een .fit-, .gpx- of .tcx-bestand uit Garmin Connect. ASCEND koppelt het aan de geplande sessie van die dag en vult afstand, duur, D+, D−, gemiddelde hartslag en datum in. Wat overblijft is gevoel, RPE en pijn. Het past achter de bestaande DataSourceAdapter met `source: 'garmin'`, en er is geen backend voor nodig.

Waarom: nu typt de gebruiker vijf getallen over die zijn horloge al heeft. Dat is precies "moeilijker bijhouden".

Moeite: middel tot groot. Impact: hoog.

### B. "Gedaan zoals gepland" met één tik

Wat: een knop op de missiekaart die de sessie logt met de geplande waarden, plus één rij gevoel. Details zijn optioneel.

Waarom: de meeste sessies gaan gewoon zoals gepland. De volledige logger is dan overbodig.

Moeite: klein. Impact: hoog.

### C. MacroFactor-export importeren

Wat: de CSV-export van MacroFactor inlezen. Workouts vinken krachtsessies af met de echte duur, en het trendgewicht vult het gewicht in.

Waarom: dan verdwijnen de gewichtsherinnering en het handmatig afvinken van kracht grotendeels.

Moeite: middel. Impact: middel.

### D. Een echt weekoverzicht op zondag

Wat: de huidige "Weekterugblik" (2/7, reeks) wordt een kaart met:
- gedaan tegenover gepland: tijd, km, D+, de langste sessie, het rugzakgewicht
- drie snelle vragen: energie, spierpijn, pijn ja/nee
- één beslissing voor volgende week, volgens de beslisregel uit het onderzoek: opbouwen, vasthouden of terugschalen, met één zin waarom
- de wijzigingen voor volgende week

Waarom: de gebruiker beslist één keer per week, in plaats van per gemiste sessie. Het onderzoek zegt ook: evalueer wekelijks.

Moeite: middel. Impact: hoog.

### E. Tijdlijn naar de GR5

Wat: een eenvoudige lijn van nu tot augustus 2027 met de fasen en de grote mijlpalen: eerste rugzaktocht, eerste back-to-back-weekend, generale repetitie, taper. Mijlpalen die een weekend buiten vragen, verschijnen weken vooraf als "plan dit weekend in".

Waarom: buitentochten moet je vooruit plannen. De app weet wanneer ze nodig zijn.

Moeite: middel. Impact: middel.

### F. GR5-voorbereiding buiten de training, op het juiste moment

Wat: korte herinneringen in de laatste acht weken, gebaseerd op het onderzoek ("Op de GR5 beslissen voeten, eten en hitte"):
- hittegewenning twee weken vooraf
- schoenen en sokken testen op lange tochten
- eten per uur oefenen tijdens de generale repetitie

Waarom: dit zit al in het onderzoek, en de app kan het op het goede moment tonen.

Moeite: klein tot middel. Impact: middel.

### G. Weekplanning naar je agenda

Wat: een .ics-bestand van de komende week of het hele plan exporteren naar de telefoonagenda.

Waarom: dan ziet de gebruiker zijn training naast werk en afspraken, zonder de app te openen.

Moeite: klein. Impact: middel.


## Top 10

1. **Laat het plan doorlopen tot de GR5.** Het plan van 16 weken eindigt nu op 17 januari 2027 als "Expeditieklaar". Daarna is Week leeg tot augustus. Reken het programma terug vanaf de vertrekdatum. Groot, hoog. (55-week-plus17.png, 05-more-training.png)
2. **Voeg een startgesprek toe en tel niets als gemist vóór de start.** Vraag de GR5-datum (met een ingevuld GR5-sjabloon), MacroFactor ja/nee, het gewicht en de trainingsdagen. Er zijn nu vijf "gemiste" sessies op dag één, en het hoofddoel staat gepauzeerd en leeg. Middel, hoog. (02-week.png, 22-coach-all.png, 03-ascend.png)
3. **Garmin-bestandsimport plus "Gedaan zoals gepland" met één tik.** Zo hoeft de gebruiker geen getallen meer over te typen die zijn horloge al heeft. Middel tot groot, hoog.
4. **Een rustigere Coach.** Bundel gemiste sessies tot één beslissing, zet advies over vandaag in de missiekaart, vervang "Trigger/Regel" door gewone taal, en laat het venster van een sessie de Coach niet tegenspreken. Middel, hoog. (22-coach-all.png, 40-week-actionsheet-easyrun.png)
5. **Gevoel en pijnvlag bij elke sessie, en RPE vergelijken met het doel.** Er komt geen "was zwaar" meer na een sessie die zwaar hoorde te zijn. Klein, hoog. (32-after-complete-1500.png, 41-logger-easyrun.png)
6. **Maak de missiekaart concreet.** Toon de opbouw in één regel en "Bekijk training" in plaats van een verstopte (i). Gebruik "Gedaan, invullen" in plaats van "Sessie starten", en zet de GR5-aftelling in de kop. Klein, hoog. (01-today-first.png, 20-guide-sheet-full.png)
7. **Ascend opschonen en percentages vervangen door begrijpelijke status.** Geen 33% readiness zonder data en geen "onwaarschijnlijk" met "vertrouwen hoog" na twee sessies. Volg de backlog: een overzicht per doel en een aparte pagina voor doelen beheren. Groot, hoog. (68-ascend-after-goal.png)
8. **Maak vaste waarden instelbaar.** Beschikbare dagen, de lange dag, hartslagwaarden (nu 204/178/49 in de code) en de programmalengte. Middel, hoog. (07-garmin.png, 05-more-training.png)
9. **Eén MacroFactor-instelling.** De bron in het krachtblok bepaalt het afvinken met één tik. Nu staan er twee losse schakelaars en krijgt de gebruiker toch een formulier per set. Klein, hoog. (72-schema-aanpassen.png, 81-logger-strength.png)
10. **Een echt weekoverzicht op zondag en weektrends in History.** Km, D+, langste sessie en één beslissing voor volgende week (opbouwen, vasthouden of terugschalen). Achteraf loggen krijgt een datumveld. Middel, hoog. (90-today-sunday.png, 50-history-data.png)
