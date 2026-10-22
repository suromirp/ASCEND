# Visuele upgrade en nieuwe ideeën

Een ochtendrapport over hoe ASCEND er mooier, rustiger en sneller uit kan zien, met nieuwe mogelijkheden die passen bij hoe jij de app gebruikt. Gemaakt op 22 oktober 2026, na de bouwnacht. Het bouwt voort op `docs/visie/Ontwerp en gebruik.md` en herhaalt daar niets uit wat al goedgekeurd of in aanbouw is.

Alle voorbeelden zijn nagemaakt en staan als losse HTML-bestanden met een schermafdruk op telefoonformaat (390 bij 844) in `/tmp/claude-0/-home-user-ASCEND/ad6ded69-be17-5801-b543-86d3d2b5c25f/scratchpad/mockups/`. Ze gebruiken de echte kleuren uit `src/index.css` en de echte lettertypen (Marcellus en Inter). Ter vergelijking staan schermafdrukken van de huidige app met het demoprogramma in `/tmp/claude-0/-home-user-ASCEND/ad6ded69-be17-5801-b543-86d3d2b5c25f/scratchpad/mockups/huidig/`.

## 1. In het kort

1. De stijl van ASCEND is goed; wat ontbreekt is één strenge regel per onderdeel. Mijn voorstel heet "steen en contour": rustige stenen vlakken, per scherm één gouden accent, contourlijnen als enige versiering, Marcellus voor namen en Inter voor getallen.
2. Het opvallendste nieuwe beeld is de week als bergkam, met vorige week als schaduw erachter. Je ziet in één blik waar de zware dagen vallen en of er genoeg lucht tussen de beendagen zit.
3. De nuttigste nieuwe mogelijkheid is dat je geplande trainingen via intervals.icu op je Garmin verschijnen, met de tempo's uit je testloop. Dan hoef je onderweg niets op je telefoon te doen, en vinkt de app de training daarna vanzelf af.
4. Voor de GR5-voortgang laat ik vier echt verschillende opties zien. Mijn advies: kampen als het ene getal ("3 van 13"), met daarachter het scherm "wat de GR5 vraagt" in vier concrete meters. Geen percentage.
5. Je stand wordt een eigen tab, Meer wordt een tandwiel rechtsboven op elke tab. Alles past binnen lokaal en zonder eigen server.

## 2. De visuele upgrade: steen en contour

De richting in één zin: ASCEND moet aanvoelen als een goede kaart en een goed horloge, niet als een spel en niet als een sportschool. Dat betekent weinig kleur, veel rust, en versiering die iets betekent (een contourlijn is een hoogtelijn, een driehoekje is een beendag, een dal is een rustdag).

### Typografie en schaal

Wat ik zag: de code gebruikt 59 bestanden met tekst van 10 of 11 pixels, en Marcellus wordt ook voor getallen gebruikt. Dat laatste gaat mis bij kleine maten: in de huidige app en in mijn eerste voorbeelden leest "1" als een hoofdletter I en "13" als "l3" (zie Je stand, "0 van 4", in `/tmp/claude-0/-home-user-ASCEND/ad6ded69-be17-5801-b543-86d3d2b5c25f/scratchpad/mockups/huidig/stand_0.png`).

Voorstel:

- Vijf maten, niets onder de 12 pixels: 34 voor paginatitels, 26 tot 30 voor de missie, 20 voor kaarttitels, 15 voor gewone tekst, 13 voor toelichting, 12 voor kleine labels.
- Marcellus alleen voor woorden: paginatitels, de naam van de training, "Fris", "Op schema", het citaat. Eén groot getal mag in Marcellus als het minstens 40 pixels is (de "3" van de kampen).
- Alle andere getallen in Inter met vaste cijferbreedte, zodat 7:05 en 7:35 netjes onder elkaar staan.
- Knoppen in zinsletters ("Gedaan", "Vastleggen"), hoofdletters alleen in de kleine bronzen kopjes.

Kosten: klein tot middel. De maten worden tokens in `@theme`, daarna kun je per scherm overzetten. Het risico is laag.

### Iconen

Wat ik zag: de tabbalk heeft voor Week en Meer allebei drie streepjes, en de app gebruikt veel losse tekens (✓ → ↗ ▾) die per toestel anders worden getekend.

Voorstel: één eigen set van ongeveer twintig lijn-iconen, 1,6 pixel dik, met ronde uiteinden, zonder kleur behalve brons of goud voor wat actief is. Zie `/tmp/claude-0/-home-user-ASCEND/ad6ded69-be17-5801-b543-86d3d2b5c25f/scratchpad/mockups/05_tabbalk_iconen.png`.

- Vandaag: een zon die boven de horizon komt.
- Week: een kalenderblad met een kleine bergkam erin.
- Stand: gelaagde hoogtelijnen.
- Ascend: de bestaande top, nu met vlag.
- Logboek: een open boekje.
- Status: gedaan is een vinkje in een cirkel, gepland een lege cirkel, vandaag een gouden stip met ring, een rustdag is een dal.
- Verder: verplaatst, test, lopen, kracht, wandelen, rugzak, bivak, horloge, timer (een zandloper in plaats van de klok die nu ook het Logboek is), rekken en het tandwiel.

Kosten: middel. Eén `Icon`-component met inline svg in `src/components/`, geen bibliotheek. Daarna de tekens per scherm vervangen.

### Kaarten

Voorstel: drie soorten en niet meer.

1. De missiekaart: de enige kaart met de contourtextuur en een zachte gouden gloed in de hoek. Eén per scherm.
2. De gewone kaart: effen, rand van 1 pixel, ronding 16, binnenmarge 16.
3. De lijstkaart: één kaart met regels van 52 tot 60 pixels hoog, gescheiden door een haarlijn, in plaats van een kaart per regel. Zo past een hele week op één scherm.

Geen kaarten in kaarten. Uitleg die je zelden nodig hebt achter een i-knop die een sheet opent.

Kosten: klein. Vooral `Card` in `src/components/ui.tsx` uitbreiden met een lijstvariant.

### Beweging

Voorstel:

- Kort en zonder vering: 180 tot 240 milliseconden, vertragend uitlopen.
- Geen animatie bij het wisselen van tab. Nu stijgt elke pagina op bij navigatie (`animate-page-in`); bij iets wat je tien keer per dag doet voelt dat traag.
- Wel beweging op twee momenten die ertoe doen: na Gedaan wordt een contourlijn rond het vinkje ingekleurd, en bij een gehaald kamp gaat het vlagje één keer omhoog.
- Een korte trilling (Android) alleen bij Gedaan en bij Akkoord.
- Sheets houden hun kop vast als je scrolt.

Kosten: klein. Alles valt onder de bestaande regel voor `prefers-reduced-motion`.

### De missiekaart op Vandaag

Zie `/tmp/claude-0/-home-user-ASCEND/ad6ded69-be17-5801-b543-86d3d2b5c25f/scratchpad/mockups/01_vandaag.png` en het vervolg onder de vouw in `/tmp/claude-0/-home-user-ASCEND/ad6ded69-be17-5801-b543-86d3d2b5c25f/scratchpad/mockups/01_vandaag_onder.png`. Vergelijk met de huidige `/tmp/claude-0/-home-user-ASCEND/ad6ded69-be17-5801-b543-86d3d2b5c25f/scratchpad/mockups/huidig/vandaag_0.png`.

- De kop is één regel datum in brons en één regel "Week 4 van de basis". Het grote logo verdwijnt van Vandaag; rechts staan de timer en het tandwiel.
- De missie: de naam groot in Marcellus, daaronder drie chips met de feiten (40 min, zone 2, 7:05 tot 7:35 per km), de coachregel met de bronzen streep, en één gouden knop "Gedaan". Daaronder alleen "Verplaatsen" en "Niet fit?" als tekst.
- Een kaart "Van je horloge" als intervals.icu iets vond wat niet gepland was, met één knop.
- "Je dag" als tijdlijn: rekken, de reistaak van de week, de training van vanavond, morgen.
- Je stand in één tikbare regel: "Benen fris · 2 van 5 gedaan · week iets lichter".

Kosten: middel. `Today.tsx` en `TodayMissionCard.tsx`; de engine blijft gelijk.

### Week als bergprofiel

Zie `/tmp/claude-0/-home-user-ASCEND/ad6ded69-be17-5801-b543-86d3d2b5c25f/scratchpad/mockups/02_week_bergprofiel.png`, en de huidige Week in `/tmp/claude-0/-home-user-ASCEND/ad6ded69-be17-5801-b543-86d3d2b5c25f/scratchpad/mockups/huidig/week_0.png`.

- Bovenaan een bergkam van zeven punten. De hoogte is minuten maal zwaarte (dat rekent `plannedEffort` in `engine/standing.ts` al uit). Gedaan is een doorgetrokken gouden lijn, gepland een stippellijn, vandaag een gouden stip met ring.
- Beendagen krijgen een bronzen driehoekje als top, een rustdag is een dal tot de grond.
- Nieuw ten opzichte van het eerdere rapport: vorige week als grijze schaduwkam erachter. Zo zie je zonder getal of deze week zwaarder of lichter is.
- Eén zin eronder, uit de engine: "Zaterdag is je zwaarste dag. Tussen Benen A en de rugzaktocht zitten vijf dagen, ruim genoeg." Dat is de 48-uursregel in mensentaal.
- De dagen als lijstkaart, met icoon voor de sport en een ruitje voor beendagen. De hele week past op één scherm.

Kosten: middel. Eén svg-component en een kleine engine-functie voor de zin. Risico laag.

### Lege toestanden

Zie `/tmp/claude-0/-home-user-ASCEND/ad6ded69-be17-5801-b543-86d3d2b5c25f/scratchpad/mockups/07_rustdag_leeg.png`.

De regel: een leeg scherm zegt wat het gaat vullen, en biedt hooguit één actie. Een rustdag is geen leeg vak maar een dal: groene hoogtelijnen met een gouden stip onderin, één zin, "Toch gewandeld?" en wat morgen komt. Een leeg logboek zegt "Hier komt je eerste stap" en dat je horloge het vanzelf vult, met de knop "Horloge koppelen".

Kosten: klein. Een handvol vaste illustraties van één lijn.

### Het moment na Gedaan

Zie `/tmp/claude-0/-home-user-ASCEND/ad6ded69-be17-5801-b543-86d3d2b5c25f/scratchpad/mockups/06_na_gedaan.png`.

Het huidige moment is een halfdoorzichtige kaart met een citaat. Voorstel: een rustig volledig scherm.

- Het vinkje in een gouden ring, met contourlijnen eromheen waarvan er twee worden ingekleurd.
- De naam en de feiten van je horloge (41 min, 6,2 km, 7:12 per km).
- Drie regels die iets betekenen: hoe het ging tegen het plan ("92% van de tijd in zone 2"), wat het voor de GR5 betekent ("Kamp 4 is het weekend van 14 november") en wat morgen komt.
- Het citaat in het Nederlands, met bron.
- Eén knop "Klaar" en "Gevoel aanpassen" als tekst.

Eerlijk: de regel over de zone kan alleen als je horloge de hartslag doorgeeft via intervals.icu. Zonder die gegevens valt die regel weg, niet vervangen door een gok.

Kosten: klein tot middel. `CompletionMoment.tsx` herschrijven; de regels komen uit bestaande engine-functies.

## 3. Nieuwe mogelijkheden en verbeteringen

Gerangschikt op waarde voor jou: Android, de webapp in Edge, de GR5 met tent en vaak alleen, de 10 km in maart, en weinig handwerk. Wat al gebouwd is of nu gebouwd wordt (vakanties, de weekvraag, MacroFactor-import, de rugzakladder, het etappeplan, de solokaart) laat ik weg.

### 1. Je geplande trainingen op je Garmin

- Wat: ASCEND zet de trainingen van de komende week in je intervals.icu-agenda, met de tempo's uit je testloop als doel. intervals.icu stuurt geplande trainingen door naar Garmin Connect, en dan staat de duurloop van vanavond op je horloge, met piepjes als je te snel gaat.
- Waarom: dit is het grootste "nuttig en snel". Je hoeft de app onderweg niet te openen, en de tempo's die nu alleen in de app staan komen op je pols. Achteraf kan ASCEND de activiteit herkennen omdat hij zelf de training heeft klaargezet.
- Grootte: middel. Een schrijfstap naast de bestaande leesstap in `src/integrations/intervalsIcu.ts`, plus een vertaling van een `SessionTemplate` naar de tekstvorm die intervals.icu voor trainingen gebruikt.
- Lokaal: ja, net als het ophalen nu; alleen jouw eigen sleutel, rechtstreeks vanuit de browser. Wat ik niet getest heb: of intervals.icu ook schrijfverzoeken uit de browser toestaat (lezen werkt, dat is getest) en of de doorstuuroptie naar Garmin in jouw account aan staat. Dat moet eerst met één proef blijken.

### 2. Vanzelf afvinken als je horloge het al weet

- Wat: als intervals.icu een activiteit heeft die past bij de training van vandaag (zelfde soort, duur binnen een redelijke marge), verandert de missiekaart in "Gedaan volgens je horloge, 41 min. Klopt dat?" met één tik. Bij twijfel blijft het een voorstel zoals nu.
- Waarom: nu staat een gevonden activiteit als losse kaart op Vandaag en moet jij hem koppelen. Bij de meeste dagen is er maar één logische match.
- Grootte: klein tot middel. Een pure matchfunctie in `engine/` met tests; de opslag blijft een gewone `SessionLog`.
- Lokaal: ja.

### 3. De ochtendcheck vooraf ingevuld uit je horloge

- Wat: intervals.icu krijgt van Garmin ook je slaap, rusthartslag en HRV (als je die synchronisatie aanzet). ASCEND leest die en vult de ochtendcheck alvast in: "Slaap 5 uur 40, rusthartslag 4 hoger dan normaal. Energie: moe?" Jij tikt alleen "Klopt" of past één ding aan.
- Waarom: de ochtendcheck is nu handwerk, en het trainingswetenschapsrapport noemt de ochtendregel half af. Dit maakt hem af zonder extra vragen.
- Grootte: middel. Ophalen is klein; de vertaling naar "normaal voor jou" vraagt een paar weken eigen gegevens en een eerlijke uitleg erbij.
- Lokaal: ja. Eerlijk: horlogewaarden voor slaap zijn schattingen; de app moet ze als hint tonen, nooit als oordeel.

### 4. Weer en daglicht bij je training en je tochten

- Wat: bij de missie één regel "Vanavond 9 graden, droog, donker vanaf 18:21, neem een lampje". Voor de rugzaktocht van zaterdag: als het op zaterdag hard regent en zondag droog is, komt er een voorstel om te ruilen, via het gewone voorstel met Akkoord.
- Waarom: je traint buiten, in de winter vaak in het donker, en de tochten zijn lang. Het ruilvoorstel past precies bij hoe de planner al werkt.
- Grootte: middel. Open-Meteo is gratis, heeft geen sleutel nodig en werkt vanuit de browser. Je locatie kan grof en lokaal blijven (een stad, geen adres).
- Lokaal: ja, met een externe weerbron. Het ruilvoorstel loopt via de bestaande planner, dus de 48-uursregel blijft gelden.

### 5. Snelkoppelingen op het app-icoon

- Wat: lang drukken op het ASCEND-icoon geeft "Training van vandaag", "Losse training" en "Paklijst".
- Waarom: twee tikken van beginscherm naar wat je wilt.
- Grootte: klein. Een `shortcuts`-lijst in het manifest in `vite.config.ts`, waar de deelknop voor MacroFactor al staat.
- Lokaal: ja. Eerlijk: dit werkt zeker in Chrome op Android. In Edge op Android is het niet zeker; de deelknop werkt daar al, wat hoopvol is, maar test het op je eigen telefoon.

### 6. Rekken en intervallen met stem en het scherm aan

- Wat: bij het rekken houdt de telefoon het scherm aan en zegt een Nederlandse stem "Wissel van been" en "Nog tien seconden". Hetzelfde voor heuvelintervallen als je die zonder horloge doet.
- Waarom: je hoeft niet naar je telefoon te kijken met je handen op de grond.
- Grootte: klein. De browser kan het scherm aan houden en heeft een ingebouwde spraakstem.
- Lokaal: ja. Eerlijk: de stem gebruikt de stemmen die op je telefoon staan; een Nederlandse stem is op Android meestal aanwezig, maar niet gegarandeerd.

### 7. Reismodus vanaf 1 augustus

- Wat: op de dag dat de GR5 begint verandert Vandaag van trainingsapp in reisgenoot: de etappe van vandaag, het water onderweg, de bivakregel van dit gebied, je solokaart. Training verdwijnt, het logboek wordt een reisdagboek.
- Waarom: het etappeplan en de solokaart worden nu gebouwd; dit is de plek waar ze samenkomen. Zonder deze modus blijft de app op de GR5 trainingen tonen die niet meer gelden.
- Grootte: middel, maar pas nodig in het voorjaar van 2027.
- Lokaal: ja, en dat is hier juist belangrijk: op de GR5 heb je vaak geen bereik. Alles moet vooraf op het toestel staan.

### 8. Een kaart bij elk gehaald kamp

- Wat: bij een gehaald kamp maakt de app een rustig beeld in de stijl van de bergkam: het kamp, de datum en wat je deed ("2 keer 15 km, 14 en 15 november"). Je kunt het bewaren of delen.
- Waarom: motivatie zonder RPG. Geen punten of badges, wel een herinnering aan iets wat je echt deed. Het GR5-rapport noemt "momenten van trots" als motivatie die werkt.
- Grootte: klein tot middel. Tekenen op een canvas in de browser en als afbeelding opslaan.
- Lokaal: ja.

### Wat niet kan, eerlijk

- Een widget op je beginscherm: Android ondersteunt geen widgets voor webapps.
- Een betrouwbare herinnering als de app dicht is ("vanavond duurloop") zonder eigen server: daarvoor zijn pushberichten nodig, en die vragen een server. De browser kent een periodieke achtergrondtaak, maar die draait alleen als het toestel dat zelf wil en is daarom onbetrouwbaar. Idee 1 lost dit beter op: je horloge herinnert je.
- Health Connect: een webapp kan er niet bij; dat stond al in het rapport over data zonder handwerk.

## 4. GR5-voortgang en de tabbalk

### Vier opties voor de GR5-voortgang

Alle vier tonen dezelfde nagemaakte stand: drie kampen gehaald, het vierde gepland op 14 en 15 november, nog 40 weken. Onder elke optie staat hetzelfde blok "Ook onderweg", zodat je alleen de voortgang vergelijkt.

**Optie A: kampen op de berg.** `/tmp/claude-0/-home-user-ASCEND/ad6ded69-be17-5801-b543-86d3d2b5c25f/scratchpad/mockups/03a_gr5_kampen.png`

Een groot "3 van 13 kampen" en een bergsilhouet met de dertien kampen als stippen op een pad naar de top, jij als gouden stip. Daaronder het volgende kamp in woorden en één regel "Op schema". Sterk: concreet, het past bij het merk, en elk kamp is iets wat je echt deed. Zwak: dertien gelijke stappen suggereren dat elk kamp even zwaar is, terwijl de laatste kampen veel meer vragen dan de eerste.

**Optie B: één percentage.** `/tmp/claude-0/-home-user-ASCEND/ad6ded69-be17-5801-b543-86d3d2b5c25f/scratchpad/mockups/03b_gr5_percentage.png`

Een boog met "45%" en "+6 in oktober", en één zin waaruit het bestaat: het gemiddelde van vier dingen die de GR5 vraagt (rugzak, langste dag, stijging, dagen achter elkaar). Sterk: één getal, je ziet het stijgen. Zwak: het getal hangt af van een weging die ik zelf kies. Met dezelfde gegevens is het "45%" als gemiddelde, "17%" als je naar het zwakste punt kijkt, en "23%" als je kampen telt. Dat is precies het "te vaag" waar je eerder over viel. Een boog lijkt bovendien op de ringen van gewone fitnessapps.

**Optie C: op schema.** `/tmp/claude-0/-home-user-ASCEND/ad6ded69-be17-5801-b543-86d3d2b5c25f/scratchpad/mockups/03c_gr5_opschema.png`

Geen hoeveelheid maar een oordeel: "Op schema", met een tijdlijn van september tot augustus waarin jouw kampen naast het plan lopen. Sterk: het beantwoordt de vraag die je eigenlijk stelt (gaat het goed?), en het blijft eerlijk ook als je achterloopt. Zwak: in het begin is het beeld vooral leeg, en "een week voor" is een afgeleide waarde die alleen zo goed is als het plan zelf.

**Optie D: wat de GR5 vraagt.** `/tmp/claude-0/-home-user-ASCEND/ad6ded69-be17-5801-b543-86d3d2b5c25f/scratchpad/mockups/03d_gr5_vermogen.png`

Geen totaal, maar vier meters: rugzak 8 van 14 kg, langste dag 15 van 22 km, stijging 450 van 1.200 m, dagen achter elkaar 1 van 6, elk met één zin waarom. Sterk: het meest eerlijk en het meest bruikbaar, want je ziet meteen waar het gat zit (dagen achter elkaar). En het is goedkoop: `routeDayRows` in `engine/standing.ts` rekent deze vergelijking al uit voor de kaart onder "Doel" in Je stand. Zwak: vier getallen zijn geen kopregel; dit is een detailscherm, geen voorpagina.

**Mijn advies: A als kopregel, D als detail, geen percentage.** Overal heet het "kamp 3 van 13", ook op Vandaag en in het moment na Gedaan. Een tik op de berg opent de vier meters van D, zodat je ziet wat er nog mist. De regel "Op schema" uit C komt onder de berg, in één zin. "Klaar voor meer", "Wat je al aankunt" en "Doelfocus" verdwijnen van de voorpagina's; in het huidige demoprogramma staan ze nog tegenstrijdig naast elkaar ("kamp 0 van 13", "Klaar voor meer 100%", "Wat je al aankunt 0%", zie `/tmp/claude-0/-home-user-ASCEND/ad6ded69-be17-5801-b543-86d3d2b5c25f/scratchpad/mockups/huidig/ascend_0.png`).

### Je stand als tab, Meer als tandwiel

Zie `/tmp/claude-0/-home-user-ASCEND/ad6ded69-be17-5801-b543-86d3d2b5c25f/scratchpad/mockups/04_stand_tab.png` en de vergelijking van de tabbalken in `/tmp/claude-0/-home-user-ASCEND/ad6ded69-be17-5801-b543-86d3d2b5c25f/scratchpad/mockups/05_tabbalk_iconen.png`.

De tabbalk wordt Vandaag, Week, Stand, Ascend, Logboek.

- Stand opent met de titel, één zin in gewone taal ("Je benen zijn fris, de week is iets lichter dan normaal en je ritme is goed") en de chips Benen, Belasting, Ritme.
- Per blok eerst het woord en het getal, dan de grafiek, en de lange uitleg achter de i-knop. De huidige Stand begint elk blok met twee tot vier regels uitleg (zie `/tmp/claude-0/-home-user-ASCEND/ad6ded69-be17-5801-b543-86d3d2b5c25f/scratchpad/mockups/huidig/stand_0.png`).
- Het blok "Doel" verhuist naar Ascend, waar het optie D wordt.
- Meer wordt een tandwiel van 44 bij 44 rechtsboven, op elke tab op precies dezelfde plek. Daarachter: instellingen, gegevens en back-up, koppelingen (Garmin, MacroFactor), gidsen en kennis.

Waarom: de pagina die zegt hoe je ervoor staat heeft nu geen eigen plek, en Ascend en Je stand overlappen. Instellingen open je zelden; een tab is daar te veel eer voor.

Het alternatief, ook in de vergelijking: Vandaag, Week, Stand, Doel, Meer, met Logboek als onderdeel van Stand ("Wat je deed"). Dat houdt Meer als tab, maar het logboek is iets wat je vaak opent, en het wordt dan een tik dieper. Ik raad het eerste voorstel aan.

Kosten: middel. Routing in `src/App.tsx` (HashRouter blijft), inhoud verhuizen tussen `Ascend.tsx` en `Standing.tsx`, en het tandwiel als gedeeld onderdeel in de kop.

## 5. Wat jij moet kiezen

1. GR5-voortgang: A als kopregel met D als detail (mijn advies), of liever één van de vier op zichzelf? Wil je het percentage echt houden, dan alleen met de zin erbij waaruit het bestaat.
2. Tabbalk: Stand als tab met Meer als tandwiel (mijn advies), of het alternatief met Meer als tab en Logboek binnen Stand?
3. Mag de richting "steen en contour" de regel worden, met Marcellus alleen voor woorden en Inter voor getallen, en niets kleiner dan 12 pixels?
4. Welke van deze drie wil je eerst gebouwd zien: Vandaag met de nieuwe missiekaart, Week als bergkam, of het moment na Gedaan?
5. Mag ASCEND trainingen in je intervals.icu-agenda zetten, zodat ze op je Garmin komen? Dan test ik eerst met één training of het werkt voordat er iets gebouwd wordt.
6. Mag de app het weer ophalen bij Open-Meteo, met alleen een stad als locatie?
7. Wil je dat de ochtendcheck je slaap en rusthartslag van je horloge laat zien? Dan moet je in intervals.icu de synchronisatie van die gegevens met Garmin aanzetten.
