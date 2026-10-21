# Ontwerp en gebruik

Een strenge blik op hoe ASCEND eruitziet en hoe het voelt in de hand, met voorstellen om het rustiger, mooier en sneller te maken. Gemaakt op 21 oktober 2026 met jouw eigen back-up, op telefoonformaat (390 bij 844).

Alle schermafdrukken staan in `/tmp/claude-0/-home-user-ASCEND/ad6ded69-be17-5801-b543-86d3d2b5c25f/scratchpad/visie_ontwerp/`. Hieronder noem ik ze steeds met hun volledige pad.

## 1. In het kort

1. De basis is sterk: de kleuren, de Marcellus-koppen, de kaarten en de sheets voelen al premium. Het probleem is niet de stijl, het is de hoeveelheid. Vandaag kan tot achttien blokken tonen en op jouw beendag staat de knop om af te vinken onder de vouw.
2. De grootste winst: op Vandaag één missiekaart met één knop, het invulformulier pas na het tikken, en adviezen in één korte regel met een eigen scherm voor de uitleg.
3. Voortgang naar de GR5 wordt nu in vijf verschillende getallen uitgedrukt (kamp 3 van 13, 23% gereed, 42%, 57%, 92%) en de coach zegt "bijna op koers" terwijl Je stand "100% volgehouden" zegt. Eén voortgangstaal maakt de app meteen geloofwaardiger.
4. Kleine slordigheden stapelen op: knoppen soms in hoofdletters en soms niet, een meldingsbalk die over de inhoud blijft hangen, het icoon van Week en Meer lijken op elkaar, de klok betekent zowel Logboek als Timer.
5. Out of the box: een week als bergprofiel, een ochtendmoment van tien seconden, en snelkoppelingen en een badge op het app-icoon. Alles past binnen "lokaal, geen backend"; een paar dingen werken alleen op Android of alleen op iPhone.

## 2. Wat er nu is en waar het knelt

### Vandaag: te veel, en het belangrijkste staat te laag

Bewijs: `/tmp/claude-0/-home-user-ASCEND/ad6ded69-be17-5801-b543-86d3d2b5c25f/scratchpad/visie_ontwerp/vandaag_0.png`, `.../vandaagC_1.png`, `.../vandaagC_2.png` (alle drie in dezelfde map).

- `src/pages/Today.tsx` regel 183 tot 311 heeft achttien plekken voor een kaart of blok: nieuw begonnen, back-up herinnering, planning bijgesteld, afwijking in schema, herstelsignaal, volgorde van de dag, tip voor vandaag, ziek, de missie, ochtendcheck, advies, gewicht, de twee tekstlinks, extra sessies, je stand, weekterugblik, rekken en het citaat. Op een gewone woensdag zie je er zeven, en scrol je ruim twee schermen.
- Op jouw beendag is de missiekaart zelf al hoger dan het scherm. Omdat krachttraining in MacroFactor gelogd wordt, toont `TodayMissionCard.tsx` regel 72 en 73 meteen het hele invulformulier (duur, RPE 1 tot 10, herhalingen over, gevoel) nog voordat je getraind hebt. De gouden knop "GEDAAN IN MACROFACTOR" staat pas onder de vouw (zie `vandaag_0.png` tegen `vandaagC_1.png`). Op een nieuw toestel zonder MacroFactor-instelling ziet dezelfde kaart er rustig uit met "TRAINING STARTEN" in beeld (`/tmp/claude-0/-home-user-ASCEND/ad6ded69-be17-5801-b543-86d3d2b5c25f/scratchpad/visie_ontwerp/nieuw_0.png`). Het verschil laat zien wat de kaart kan zijn.
- Het advies is een muur tekst: tien regels grijs in een smalle kolom, en het "waarom" daaronder herhaalt letterlijk de laatste vier zinnen van die tekst (`/tmp/claude-0/-home-user-ASCEND/ad6ded69-be17-5801-b543-86d3d2b5c25f/scratchpad/visie_ontwerp/waarom.png`). Dat is dubbel lezen, en het is een uitklapblokje, wat je niet mooi vindt.
- "Je stand" toont "Fris 3,5", "2 / 6", "+43% tegen de 4 weken ervoor". Zonder schaal zegt 3,5 niets; +43% klinkt als een waarschuwing maar heeft geen kleur of oordeel.
- Het citaat staat in het Engels met een knop "Vertaling" en een bronlink. Mooi idee, maar het is het laatste wat je ziet en het kost een volle kaart.
- "Niet fit?" staat er op een nieuw toestel twee keer (in de ochtendcheck en in de linkregel), zie `/tmp/claude-0/-home-user-ASCEND/ad6ded69-be17-5801-b543-86d3d2b5c25f/scratchpad/visie_ontwerp/nieuw_1.png`.
- Het logo bovenin is 84 pixels groot en neemt met "WEEK 4 • BASISFASE" ongeveer een zesde van het scherm. Whoop, Oura en Runna gebruiken die plek voor de datum en het hoofdgetal.

### De meldingsbalk blijft hangen

`ChangeNotice` ("Weekplanning bijgewerkt, ongedaan maken") staat vast boven de tabbalk (`src/components/ChangeNotice.tsx` regel 24) en verdwijnt niet vanzelf. Op elke schermafdruk van Week, Je stand, Ascend, Doelen, Logboek en Meer bedekt hij de onderste 200 pixels inhoud, bijvoorbeeld `/tmp/claude-0/-home-user-ASCEND/ad6ded69-be17-5801-b543-86d3d2b5c25f/scratchpad/visie_ontwerp/week_1.png`. Het sluitkruisje is `px-1 text-sm` (regel 36), ongeveer 14 bij 20 pixels: ver onder de 44 punten die Apple aanraadt en de 48 dp van Google ([overzicht van de richtlijnen](https://blog.openreplay.com/improving-tap-targets-mobile-ux/), [WCAG-discussie met citaat van Apple](https://github.com/w3c/wcag/issues/1831)). De tekst wordt afgekapt ("De inhoud van 9 trainingen in de komende weken bi..."). Toen ik na het sluiten opnieuw naar Vandaag ging, stond hij er weer (`/tmp/claude-0/-home-user-ASCEND/ad6ded69-be17-5801-b543-86d3d2b5c25f/scratchpad/visie_ontwerp/verplaatsen_0.png`).

### Voortgang spreekt vijf talen en spreekt zichzelf tegen

- Ascend: "kamp 3 van 13", "Klaar voor meer? 92%", "Wat je al aankunt 42%" (`/tmp/claude-0/-home-user-ASCEND/ad6ded69-be17-5801-b543-86d3d2b5c25f/scratchpad/visie_ontwerp/ascend_1.png`).
- Je stand: "Volgend objectief 15 km wandeling, 23% gereed" (`.../stand_7.png`).
- Doelen: "Doelfocus GR5 57%, nog ver weg" en "Hardloopwedstrijd 43%, uitdagend" (`.../doelen_2.png`).
- Dezelfde mijlpaal heet "volgend kamp" op Ascend en "volgend objectief" op Je stand, en het lijstje heet "De beklimming" (`.../kampen_0.png`).
- De coach op Ascend zegt "Bijna op koers" en dat de rustige duurloop een paar weken wegviel (`.../ascend_0.png`, uit `engine/onCourse.ts` regel 127), terwijl Je stand zegt "Volgehouden 100%", alle trainingen gedaan (`.../stand_0.png`). Beide kunnen technisch kloppen (andere periode, andere telling), maar naast elkaar lees je: de app weet het zelf niet. Dat is precies het "te vaag" waar je eerder over viel.
- Op Vandaag heet het blok met voorstellen "ADVIES" (`CoachCard.tsx` regel 75), op Ascend en in de weekterugblik heet een ander blok "DE COACH". Twee namen voor één stem.

### Consistentie

- Knoppen: hoofdletters ("GEDAAN IN MACROFACTOR", "VERPLAATSEN", "AKKOORD" in de voorstel-sheet) naast zinsletters ("Akkoord", "Liever niet" op de adviesknop, "Tussendoel", "Alleen volgen"). In het invulscherm staan "Fris / Normaal / Zwaar" in zinsletters direct boven "BETER / NORMAAL / SLECHTER" in hoofdletters (`/tmp/claude-0/-home-user-ASCEND/ad6ded69-be17-5801-b543-86d3d2b5c25f/scratchpad/visie_ontwerp/loggerGuided_2.png`), en op Vandaag zijn het weer "Beter / Normaal / Slechter".
- Knoppen lopen uit hun vak: "AANPASSEN" raakt de rand (`.../doelen_1.png`), "MIJN SCHEMA IS AFGELOPEN" en "VOLGEND BLOK BEKIJKEN" breken over twee regels (`.../doelen_3.png`), "Geavanceerd" raakt de rand van de segmentknop in Meer (`.../meer_0.png`).
- Eyebrows: meestal hoofdletters met ruime spatiëring, maar in sheets staat "ZA 24 oktober", "MA 19 oktober" en "18 oktober" half in hoofdletters (`.../actiesheet_0.png`, `.../logdetail_0.png`).
- Iconen: in de code staan 18 svg's tegenover tientallen tekens als ✓ ○ ● × ⚑ › → ↗ ▾ (bijvoorbeeld 35 keer → en 16 keer ↗). Tekens renderen per toestel anders en voelen goedkoper dan getekende iconen. De tabbalk-iconen van Week (`M4 5h16M4 12h16M4 19h10`) en Meer (`M4 7h16M4 12h16M4 17h16`) zijn allebei drie horizontale streepjes (`src/App.tsx`, `NavIcon`). De klok is zowel het Logboek-icoon als de Timer-knop op Vandaag.
- Kleur zonder uitleg: in de voorstel-sheet staan gekleurde stipjes (groen, grijs, blauw) voor de sessies en "benen 4,6 fris" in klein groen (`.../voorstel_0.png`, `.../voorstel_1.png`). Wat de stipjes betekenen staat nergens.
- Uitklapblokjes, die je niet mooi vindt, zijn er nog: "waarom" (`src/components/Why.tsx`), "Verloop van de laatste weken" en "Trainingsverdeling richting GR5" als `<details>` in `src/pages/Ascend.tsx` regel 217 en 256 (met een kale witte driehoek, `.../ascend_3.png`), de fases in het jaaroverzicht, en "+ geavanceerd: velden direct aanpassen".
- Typografie in de code: 423 keer `text-xs` (12 px) en 131 keer 10 of 11 px. Dat is veel kleine tekst voor een app die je na een training met trillende handen gebruikt.

### Week

`/tmp/claude-0/-home-user-ASCEND/ad6ded69-be17-5801-b543-86d3d2b5c25f/scratchpad/visie_ontwerp/week_0.png` en `.../week_1.png`. Helder en rustig, maar een week van zeven dagen kost ruim twee schermen omdat elke dag een eigen kaart van 60 pixels hoog is plus een datumregel. De kaart "Rustweek overgeslagen" staat bovenaan en duwt de week naar beneden; hij hoort eigenlijk bij de week zelf, niet erboven. Je ziet niet in één oogopslag hoe zwaar de week is of waar de beendagen vallen; dat staat verderop in Je stand (beenkalender, weekbelasting). Het jaaroverzicht (`.../jaar_0.png`) is mooi, maar fasenamen zijn een mengsel van "Basisfase", "Opbouw", "Bergcapaciteit", "Expeditieklaar", "Naar de start" en week 4 heet daar "OPBOUW" terwijl het in een golf van vier de rustweek zou zijn.

### Actiesheet, voorstel, warming-up, invulscherm

- Actiesheet (`/tmp/claude-0/-home-user-ASCEND/ad6ded69-be17-5801-b543-86d3d2b5c25f/scratchpad/visie_ontwerp/actiesheet_0.png`): goed. Eén gouden knop, één verplaatsvoorstel, en "andere dag kiezen" en "overslaan" als tekstlinks. De suggestie "samen met Bovenlichaam B, 105 min" breekt lelijk af op "105 / min". De sheet van een gedane sessie (`.../actiesheetDone_0.png`) heeft alleen "ONGEDAAN MAKEN" als grote knop: de destructieve actie is het grootste element.
- Voorstel "Zo ziet je week eruit" (`.../voorstel_0.png` tot `.../voorstel_2.png`): het beste scherm van de app. Opties als radioknoppen, de week eronder, de wijziging gemarkeerd met "HIERHEEN" en een doorgestreepte oude plek, Akkoord en Liever niet vast onderin. Wat knelt: "benen 4,6 fris" is jargon, de stipjes zijn onverklaard, en maandag "Geen training gepland" heeft geen kaart terwijl de rest wel een kaart heeft.
- Warming-up (`.../warmup_0.png`, `.../warmup_1.png`): helder in drie genummerde stappen met de hoeveelheid rechts in brons. De koptekst van de sheet scrolt mee weg, dus na het scrollen weet je niet meer waar je bent en mis je het sluitkruisje. Het blok "Daarna" is één lange alinea.
- Invulscherm na de heuvelloop (`.../loggerGuided_0.png` tot `.../loggerGuided_3.png`, ingevuld `.../loggerFilled.png`): het plan en het formulier zijn één lange pagina van ruim drie schermen. "KLAAR, INVULLEN" staat vast onderin, maar het formulier staat er al onder, dus de knop doet iets wat je al ziet. De RPE-schaal toont 8 en 9 met een bronzen rand als "het plan"; dat lijkt op een keuze die al gemaakt is. Er zijn drie gevoelsvragen achter elkaar (pijn, benen bij het inlopen, ten opzichte van normaal) met drie verschillende schrijfwijzen.
- Na opslaan verschijnt "TRAINING VOLTOOID" met een citaat (`.../naOpslaan_0.png`). Het moment is goed bedoeld, maar de kaart is half doorzichtig en de weekkaarten schijnen erdoorheen (mogelijk midden in de animatie vastgelegd, dat is niet zeker), en de tekst "Gedaan zoals gepland" klopte niet met wat ik invulde.

### Je stand, Ascend, Doelen, Logboek, Meer

- Je stand is 4.833 pixels hoog, bijna zes schermen (`.../stand_0.png` tot `.../stand_7.png`). Elk blok begint met een uitleg van twee tot vier regels ("Elke training telt als minuten maal zwaarte..."). Uitleg is goed, maar staat nu elke keer in beeld, ook de honderdste keer. De grafieken zelf (frisheid, beenkalender, weekbelasting) zijn het mooiste visuele werk in de app.
- Ascend (`.../ascend_0.png` tot `.../ascend_3.png`) en Je stand overlappen: allebei het volgende kamp, allebei de GR5-dag, allebei een beoordeling. Doelen zit onder Ascend, Je stand onder Vandaag; logisch voor wie het bouwde, niet voor een nieuwe gebruiker.
- Doelen (`.../doelen_0.png` tot `.../doelen_3.png`) is een beheerscherm met acht knoppen en vier soorten knopstijl. "Marathondoel: halve / hele" staat zonder context. Krachtprogramma zegt "3× per week" terwijl jij 2 boven en 2 benen doet; dat ligt mogelijk aan de data, maar het valt op.
- Logboek (`.../logboek_0.png`): de maandtegels met Marcellus-cijfers zijn mooi. De vergelijking met vorige maand (trainingen en kilometers) is misleidend omdat die maand maar een paar dagen data had. "Gem. cadans" staat er zonder eenheid en zonder dat duidelijk is of het lopen of wandelen is. "Gemist 0" terwijl de weekterugblik 2 van 5 toont. De logregels kappen de omschrijving af ("Hardlopen, buiten op ...").
- Meer (`.../meer_0.png`, `.../meerTraining_0.png`, `.../meerGegevens_0.png`): vier subtabs, waarvan "Algemeen" vooral gidsen bevat. Drie integraties staan op "Binnenkort", wat elke keer belooft wat er niet is.

### Navigatie: kloppen de vijf tabs?

Vandaag en Week kloppen. Logboek klopt. Ascend is half doel, half stand, terwijl de echte "hoe sta ik ervoor" pagina (Je stand) geen tab heeft maar een link op Vandaag is. Meer is een lade met gidsen, instellingen en gegevens. Een nieuwe gebruiker zou niet raden dat de beenvermoeidheid onder "alles bekijken" op Vandaag zit en dat doelen beheren onder de tab met de berg zit.

### Wat een nieuwe gebruiker niet zou snappen

- Er is geen kennismaking: op een leeg toestel staat meteen een demo-programma met "Benen A (zwaar), zwaarte volgens MacroFactor" alsof het van jou is (`.../nieuw_0.png`).
- Begrippen zonder uitleg op de plek waar ze staan: RPE, D+, zone 2, beenindex, "fris 3,5", "sessie-respons", "kamp", "objectief", "basisfase week 4 van 4".
- Een getal als 92% zonder dat je weet of hoger beter is, waartegen het gemeten wordt, en wat je ermee moet.

## 3. Ideeën, gerangschikt op waarde voor jou

Elk idee past binnen "lokaal, geen backend", tenzij ik iets anders zeg.

### 1. Vandaag als één missie plus een rustige rest

- Wat: de missiekaart toont alleen wat je gaat doen en één knop. Het formulier "hoe ging het" verschijnt pas na het tikken, in een sheet. Adviezen worden één compacte regel met een eigen scherm voor de uitleg. Alles wat niet vandaag gaat (citaat, stand, rekken, gewicht) wordt kleiner of verhuist. Uitgewerkt in schets A hieronder.
- Waarom: de kernvraag van ASCEND is "wat is mijn missie vandaag, binnen twee seconden". Oura bracht vijf tabs terug naar drie en noemt Today "de voorpagina van een krant", met de scores bovenaan en een tijdlijn van de dag ([Oura](https://ouraring.com/blog/new-oura-app-experience/), [Droid Life](https://www.droid-life.com/?p=312235)). Runna zette in V3 alles van de training van vandaag op één plek ([Runna V3](https://runningindustryalliance.com/?p=20508)). Whoop herontwierp Home op basis van onderzoek om "helderheid" voorop te zetten ([Whoop](https://www.whoop.com/us/en/thelocker/the-all-new-whoop-home-screen/)). Calm technology zegt het scherp: vraag zo weinig mogelijk aandacht en laat informatie van de rand naar het midden en terug bewegen ([Calm Tech Institute](https://calmtech.institute/calm-tech-principles)).
- Werk: middel. Vooral `Today.tsx`, `TodayMissionCard.tsx`, `CoachCard.tsx`; de engine blijft gelijk.
- Risico: laag. Wat je nu inline invult moet in de sheet even snel blijven (één tik op "Gedaan", dan de drie vragen).

### 2. Eén voortgangstaal en één stem

- Wat: kies één maat voor "hoe ver ben ik richting de GR5" en laat de rest daaraan ondergeschikt zijn. Mijn voorstel: de kampen (3 van 13) als hoofdmaat, want die zijn concreet en bergachtig, en per kamp in woorden wat er nog mist. Haal "Klaar voor meer 92%", "Wat je al aankunt 42%" en "Doelfocus 57%" van de voorpagina's en zet ze, als je ze wilt houden, op één detailscherm met uitleg. Noem het volgende kamp overal "volgend kamp". Laat de coach en Je stand dezelfde periode en dezelfde telling gebruiken, of zeg bij beide in één regel waarover het gaat ("laatste 3 weken, ook verschoven trainingen die niet gedaan zijn"). Noem het blok op Vandaag ook "De coach" of noem beide "Advies", maar niet allebei.
- Waarom: Garmin noemt in Training Readiness precies welke zes dingen meetellen en geeft vaste banden met namen (Prime, High, Moderate) ([Garmin-handleiding](https://www8.garmin.com/manuals/webhelp/GUID-31D23DBB-57C2-4DF7-A0C9-8D1A00AB4BE7/EN-US/GUID-C21BE0C8-A08E-4DA1-B6C6-2E0E2DDDB372.html)). Whoop heeft drie wijzerplaten, geen tien. Jij vond getallen zonder uitleg "te vaag"; vijf getallen voor hetzelfde doel zijn erger dan één.
- Werk: middel. Tekst en opbouw in `Ascend.tsx`, `Standing.tsx`, `StandSummaryCard.tsx`; de telling in `engine/onCourse.ts` en `pages/Standing.tsx` gelijktrekken.
- Risico: middel. Er hangen tests aan de formules; het gelijktrekken van de tellingen raakt de engine.

### 3. Tabs herschikken: Je stand wordt een tab

- Wat: Vandaag · Week · Stand · Ascend · Logboek, en Meer als tandwiel rechtsboven op Vandaag (of als zesde ingang onder Ascend). Stand krijgt de bestaande chips Benen, Belasting, Doel. Ascend wordt puur het doel: de GR5, de kampen, de wedstrijd, uitrusting, doelen beheren. Alternatief met behoud van vijf tabs: Vandaag · Week · Stand · Doel · Meer, en Logboek als laatste chip binnen Stand ("Wat je deed"). Uitgewerkt in schets C.
- Waarom: nu heeft de belangrijkste "hoe sta ik ervoor" pagina geen eigen plek en overlappen Ascend en Je stand. Oura deed hetzelfde: van vijf tabs naar drie, met één duidelijke betekenis per tab ([Oura](https://ouraring.com/blog/new-oura-app-experience/)).
- Werk: middel. Routing in `App.tsx`, en inhoud verhuizen tussen `Ascend.tsx` en `Standing.tsx`. HashRouter blijft.
- Risico: laag tot middel. Je bent gewend aan de huidige plekken; doe het in één keer en niet in stapjes.

### 4. Een ontwerp-opruimronde: knoppen, eyebrows, meldingen, aanraakdoelen

- Wat: één regel per element en die overal toepassen.
  - Primaire knop: zinsletters, één regel, nooit afbreken ("Gedaan in MacroFactor", "Akkoord"). Hoofdletters bewaren voor eyebrows. Dat maakt het rustiger en het past beter bij Marcellus.
  - Secundaire acties als tekstlink of rand-knop, maximaal één van elk per kaart.
  - Eyebrow altijd via `Eyebrow`, altijd volledig in hoofdletters ("ZA 24 OKTOBER").
  - De meldingsbalk wordt een kleine pil die na 6 seconden inklapt tot een stipje bij Week, met een sluitknop van 44 bij 44. Ongedaan maken blijft bereikbaar via die stip of via Week.
  - Elk tikdoel minstens 44 bij 44.
  - Keuzes met dezelfde betekenis krijgen dezelfde schrijfwijze (Beter, Normaal, Slechter).
  - Geen `<details>` meer; "waarom" opent een sheet of verdwijnt waar de tekst het al zegt.
- Waarom: dit is wat "premium" maakt. Apple raadt 44 punten aan, Google 48 dp ([overzicht](https://blog.openreplay.com/improving-tap-targets-mobile-ux/)). Uitleg die je zelden nodig hebt hoort op een tweede scherm, niet uitgeklapt in de eerste ([NN/g over progressive disclosure](https://www.nngroup.com/videos/progressive-disclosure/)), en dat sluit aan bij jouw voorkeur voor aparte sheets.
- Werk: klein tot middel, verspreid over veel bestanden maar elk stukje simpel. Leg de regels vast in `CLAUDE.md` onder Design.
- Risico: laag.

### 5. Een eigen iconenset

- Wat: één set lijn-iconen van 1,6 px dik, ronde uiteinden, in de stijl van het bestaande berg-icoon in de tabbalk. Vervang de tekens ✓ ○ ● × ⚑ › → ↗ ▾. Voorstel voor de set: Vandaag een zon die net boven een bergkam komt; Week zeven verticale streepjes van ongelijke hoogte (een mini-bergprofiel, zie idee 6); Stand een hoogtemeter of een dubbele contourlijn; Ascend de bestaande top met vlag; Logboek een opengeslagen boekje; Meer een tandwiel of drie stipjes. Status: gedaan een vinkje in een cirkel, gepland een lege cirkel, vandaag een gevulde bronzen cirkel met een dunne ring, rustdag een vlakke lijn (een dal), verplaatst een gebogen pijl, wedstrijd of test een vlaggetje op een paal. Sporten: schoen (lopen), halter (kracht), wandelstok (wandelen), trap.
- Waarom: tekens renderen per toestel anders en de klok betekent nu twee dingen. Een eigen set is waar je Stoïcijns en alpine subtiel kunt laten doorklinken zonder RPG te worden.
- Werk: middel. Een `Icon`-component in `src/components/` met inline svg-paden; geen externe bibliotheek nodig.
- Risico: laag. Let op dat het niet speels wordt: geen kleur in iconen, alleen brons voor actief.

### 6. Week als bergprofiel

- Wat: bovenaan Week een strook waarin de zeven dagen een bergkam vormen: hoogte is de geplande belasting, beendagen in brons, de rustdag een dal, vandaag gemarkeerd. Daaronder compacte dagregels in plaats van zeven grote kaarten. Uitgewerkt in schets B.
- Waarom: je ziet in een seconde of de week in balans is en waar twee zware dagen te dicht op elkaar zitten, de regel die de scheduler bewaakt (48 uur tussen beendagen). Runna en TrainingPeaks tonen de week als kleurgecodeerde kalender; een profiel is de alpine versie daarvan en past bij het merk. De data bestaat al (weekbelasting en beenkalender in Je stand).
- Werk: middel. Eén svg-component, gevoed door wat `standing.ts` en `legFatigue.ts` al uitrekenen.
- Risico: laag. Een grafiek die niemand leest is ruis; houd hem 72 pixels hoog en zonder assen.

### 7. Het ochtendmoment van tien seconden

- Wat: bij het eerste openen vóór 12 uur een rustig volledig scherm: de datum, je missie in grote Marcellus, drie regels om in één tik je benen, energie en slaap te kiezen met een grote knop "Alles normaal", en onderaan het citaat van de dag in het Nederlands. Eén tik op "Begin de dag" of nergens op tikken en wegvegen. Daarna verschijnt die dag alleen nog "Vanochtend: alles normaal, aanpassen" op Vandaag.
- Waarom: de ochtendcheck bestaat al (`MorningCheckInCard`), maar is nu een van de zeven blokken. Garmin doet dit met de Morning Report bij het wakker worden: slaap, herstel, trainingsvooruitzicht en weer in één scherm ([Garmin Morning Report uitgelegd](https://www.shoulditrain.com/blog/garmin-morning-report-explained)). Het citaat krijgt zo een plek waar het betekenis heeft in plaats van onderaan de lijst. Dit is ook het "rustige ritueel" dat bij stoïcijns past: één keer per dag even stilstaan.
- Werk: klein tot middel. Een nieuwe sheet; opslag van "vandaag al gezien" in de bestaande meta-store.
- Risico: middel. Een scherm dat elke ochtend tussen jou en de app staat kan irriteren. Daarom: altijd wegvegen, nooit verplicht, en een schakelaar in Meer.

### 8. Snelkoppelingen, badge en delen naar ASCEND

- Wat:
  - App shortcuts in het manifest (`vite.config.ts`): lang drukken op het icoon geeft "Training van vandaag", "Losse training loggen" en "Week".
  - Een badge op het app-icoon met "1" als er een voorstel op je Akkoord wacht.
  - Web Share Target: vanuit de Garmin- of MacroFactor-app een activiteit of tekst "delen naar ASCEND", waarna het invulscherm al half gevuld opent.
- Waarom en waar het werkt: snelkoppelingen werken op Android in Chrome (maximaal drie zichtbaar) en niet op de iPhone ([web.dev](https://web.dev/articles/app-shortcuts), [caniuse](https://caniuse.com/mdn-manifests_webapp_shortcuts)). De badge werkt juist wel op de iPhone voor apps op het beginscherm vanaf iOS 16.4, maar alleen als je meldingen toestaat, en niet in Chrome op Android ([WebKit](https://webkit.org/blog/14112/badging-for-home-screen-web-apps/), [MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Display_badge_on_app_icon)). Share Target werkt alleen op Android voor geïnstalleerde apps; voor iOS heb ik geen ondersteuning gevonden ([Chrome-documentatie](https://developer.chrome.com/docs/capabilities/web-apis/web-share-target), [WebKit-verzoek](https://bugs.webkit.org/show_bug.cgi?id=194593)).
- Werk: klein voor shortcuts, klein tot middel voor de badge, middel voor Share Target (de service worker moet het gedeelde bestand of de tekst opvangen en lokaal doorgeven; geen server nodig).
- Risico: laag. Lokaal en zonder backend. Een badge zonder pushberichten wordt alleen bijgewerkt als de app open is, dus hij kan verouderd zijn; dat moet je weten.

### 9. Motion en haptiek die bij stoïcijns en alpine passen

- Wat:
  - Bewegingen kort en traag uitlopend (180 tot 240 ms, een ease-out zonder vering), nooit stuiteren.
  - Bij "Gedaan" een korte opstijgende lijn in de missiekaart, alsof een contourlijn van de kaart wordt ingekleurd, en dan rust.
  - Bij het halen van een kamp een vlagje dat één keer omhoog gaat.
  - Sheets met een vaste kop die niet wegscrollt.
  - Geen animatie op dingen die je vaak doet, zoals wisselen van tab.
  - Haptiek alleen op twee momenten: training opgeslagen en Akkoord op een voorstel.
- Waarom: Apple's richtlijn zegt beweging alleen met een doel toe te voegen, kort en precies te houden, en niet op handelingen die vaak voorkomen ([Apple HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion)). De bestaande `haptics` (`src/utils/haptics.ts`) gebruikt `navigator.vibrate`, en dat bestaat niet op de iPhone. Er is een omweg via een verborgen schakelaar-input in Safari 18, maar die is niet officieel en mogelijk door Apple dichtgezet in een latere versie ([overzicht](https://azukiazusa.dev/en/blog/ios-safari-web-haptics), [WebKit-bug](https://bugs.webkit.org/show_bug.cgi?id=285120)). Dat is onzeker; test het op je eigen telefoon voordat je erop bouwt.
- Werk: klein voor de motion, klein voor haptiek op Android, onzeker voor de iPhone.
- Risico: laag voor motion (de app respecteert al `prefers-reduced-motion`), middel voor de iPhone-omweg.

### 10. Het invulscherm in twee duidelijke stappen

- Wat: scherm 1 is "Het plan" (wat je gaat doen, met de bestaande mooie intervalbalk) en heeft onderaan één knop "Klaar, invullen". Scherm 2 is "Hoe ging het?" als eigen sheet. Bovenaan de dingen die van je horloge komen (duur, afstand, stijging, hartslag) in één blok, dan één gevoelsvraag met drie keuzes. Pijn als aparte schakelaar "Pijn op een plek?". De beenvraag alleen na een harde loop of test. "Het plan: 8 tot 9" als tekst onder de RPE-schaal en niet als rand om de knoppen.
- Waarom: nu zijn het plan en het formulier één pagina van drie schermen en zijn er drie gevoelsvragen. Je wilt weinig handwerk: eerst de getallen die je van je horloge overneemt, dan hooguit één vraag over gevoel.
- Werk: middel. `ExerciseLogger.tsx` splitsen; de opslag blijft gelijk (het blijft een `SessionLog`).
- Risico: laag.

### 11. Week Je stand korter: uitleg één keer, daarna een i-knop

- Wat: elk blok in Je stand begint met het getal en één zin in gewone taal ("Benen: fris. De testloop van deze week zit op de grens."). De lange uitleg van hoe het gemeten wordt gaat achter een kleine i-knop die een sheet opent (dezelfde knop als bij de missie).
- Waarom: de pagina is nu bijna zes schermen, waarvan een groot deel uitleg die je al kent. Dit is weer progressive disclosure via een apart scherm, wat je mooier vindt dan uitklappen ([NN/g](https://www.nngroup.com/videos/progressive-disclosure/)).
- Werk: klein tot middel.
- Risico: laag.

### 12. Een kennismaking voor een leeg toestel

- Wat: een korte welkomststroom (doel, datum, trainingsdagen, kracht in MacroFactor ja of nee) in plaats van een demo-programma dat eruitziet als echt.
- Waarom: voor jou nu niet belangrijk, wel als je de app ooit aan een vriend geeft of op een nieuwe telefoon begint. De bouwstenen bestaan al (`GoalSetupWizard`, `StrengthProgramWizard`, `FreshStartCard`).
- Werk: middel.
- Risico: laag. Laagste prioriteit van deze lijst voor jou.

## Schets A: Vandaag

Volgorde van boven naar beneden, op een telefoon van 390 breed, zonder te scrollen zichtbaar tot en met punt 4.

1. Kopregel, 56 px hoog. Links in klein brons "WO 21 OKTOBER", daaronder in grijs "Week 4 van de basis". Geen groot logo meer; het logo krijgt zijn moment in het ochtendscherm en bij het openen. Rechts twee ronde knoppen van 44 px: timer (zandloper-icoon, niet de klok) en rekken.
2. Missiekaart, met `topo-texture`.
   - Eyebrow "VANDAAG". Rechts de i-knop.
   - Titel in Marcellus: "Benen A (zwaar)".
   - Eén regel grijs: "Kracht · ongeveer 75 min · benen fris".
   - De coachregel met de bronzen streep links: "Zware beendag. Techniek eerst, de zwaarte volgens MacroFactor."
   - De warming-up-rij zoals nu.
   - De gouden knop "Gedaan in MacroFactor". Tik opent de sheet "Hoe ging het?" met de huidige drie vragen en duur al ingevuld; opslaan in die sheet.
   - Daaronder twee tekstlinks naast elkaar, 44 px hoog: "Verplaatsen" en "Niet fit?".
   - Na het afvinken wordt de kaart klein: vinkje, "Benen A gedaan, 75 min, zwaar 8", en de regel "Morgen: rustdag".
3. Wachtend besluit (alleen als er een voorstel is). Een smalle kaart met een bronzen rand links.
   - Eyebrow "EEN VOORSTEL".
   - Titel in één of twee regels: "Testloop naar dinsdag 27 oktober".
   - Eén zin: "De oude dag is je rustdag. Dinsdag eerst lopen, Benen A 6 uur later."
   - Knoppen "Bekijk" (opent "Zo ziet je week eruit", waar de volledige uitleg en de drie opties staan) en "Akkoord".
   - "Liever niet" staat in de sheet.
   - Bij meer voorstellen: "nog 2" rechtsboven, tik opent een lijst.
4. De dag als tijdlijn, een dunne verticale lijn met vier stipjes, elk één regel:
   - "Ochtend · Rekken, 6 oefeningen" met een vinkvakje.
   - "Overdag · Trap nemen waar het kan" als stille herinnering.
   - "Vanavond · Benen A".
   - "Morgen · Rustdag, wandelen mag".
   Dit vervangt de losse rekkaart en geeft het gevoel van een dag in plaats van een stapel kaarten.
5. Stand in één regel, tikbaar naar de Stand-tab: "Benen fris · 2 van 6 gedaan · week 43% zwaarder dan normaal". Kleur alleen op het oordeel: het woord "zwaarder" in waarschuwingsgeel als het boven de grens zit, anders alles grijs.
6. Onderaan, klein en gecentreerd: "+ losse training".

Verdwijnt van Vandaag:
- het citaat (naar het ochtendmoment en het voltooid-moment);
- de gewichtsherinnering (naar het ochtendmoment, eens per twee weken);
- de dubbele "Niet fit?";
- de losse kaart "Je stand" (wordt regel 5);
- de rekkaart (wordt een regel in de tijdlijn).

Blijven als ze nodig zijn, boven de missie: ziek gemeld, wedstrijd of test vandaag, back-up nodig.

Tekst voor een rustdag in de missiekaart: titel "Rustdag", één zin "Je lichaam bouwt op wat je deze week deed. Wandelen mag, traplopen telt ook.", geen knop, tekstlink "Toch een wandeling vastleggen".

## Schets B: Week als bergprofiel

1. Kop zoals nu: pijltjes links en rechts, "WEEK 4 · BASIS" in brons, daaronder "5 uur 35 gepland · 2 van 6 gedaan". "Jaaroverzicht" wordt een knop rechtsboven met een icoon (opent het bestaande jaaroverzicht als eigen scherm, niet uitklappen).
2. Het profiel, 72 px hoog, over de volle breedte binnen de marges.
   - Zeven punten, één per dag van ma tot zo, verbonden tot een bergkam (een gevulde vlakte met een lijn erover).
   - De hoogte per dag is minuten maal zwaarte; gedane dagen tellen met wat je echt deed, geplande dagen met de planning.
   - Gedaan is een doorgetrokken lijn, gepland een stippellijn.
   - Beendagen hebben een bronzen top, andere dagen steen-grijs, de rustdag is een dal tot de basislijn.
   - Vandaag krijgt een kleine gouden stip met een ring.
   - Liggen twee beendagen binnen 48 uur van elkaar, dan kleurt het zadel ertussen waarschuwingsgeel. Dit gebeurt in de praktijk zelden, omdat de scheduler het voorkomt, en juist daardoor valt het op.
   - Onder het profiel de letters M D W D V Z Z in 10 px grijs.
   - Tik op een top scrolt naar die dag.
3. De kaart "Rustweek overgeslagen" wordt één regel onder het profiel: "Je slaat deze rustweek over. Zware benen of slecht slapen? Rustweek terugzetten". Het laatste deel is een tekstlink.
4. Dagregels in plaats van kaarten, elk 56 px hoog, gescheiden door een dunne lijn binnen één kaart.
   - Links het status-icoon.
   - Dan de dag ("Wo 21").
   - Dan de naam ("Benen A (zwaar)").
   - Rechts de minuten.
   - Vandaag krijgt een bronzen rand om de regel.
   - De sportsoort als klein icoon voor de naam in plaats van "Kracht • Squat • RDL • Hamstrings • Single-leg" (die lijst staat in de actiesheet).
   - Zo past de hele week op één scherm.
5. Tik op een regel opent de bestaande actiesheet, die goed is zoals hij is.

## Schets C: Stand en Ascend zonder overlap

Tabbalk: Vandaag · Week · Stand · Ascend · Logboek. Meer wordt een tandwiel rechtsboven op Vandaag en op Stand.

Stand (nieuw als tab, gebouwd uit `Standing.tsx`):

1. Titel "Je stand" en één zin in gewone taal, samengesteld uit de engine: "Je benen zijn fris, de week is zwaarder dan normaal, je ritme is goed."
2. Chips zoals nu: Benen · Belasting · Ritme. "Doel" verhuist naar Ascend.
3. Benen: het getal met zijn woord ("fris") en de balk, dan de frisheidsgrafiek en de beenkalender. De uitleg achter een i-knop.
4. Belasting: de weekbalken en "Deze week 500 van 2.000, je gemiddelde is 1.500".
5. Ritme: één telling die ook de coach gebruikt: "Laatste 4 weken: 12 van 12 gedaan. Verschoven en daarna gedaan telt mee, overgeslagen niet." Daaronder "Op rij: 2 trainingsdagen".

Ascend (het doel):

1. Grote kop "GR5 Alpen", daaronder "1 augustus 2027 · nog 41 weken".
2. Eén voortgangsmaat: een profiellijn van de dertien kampen als een route, met een stip op kamp 3. Tekst: "Kamp 3 van 13. Volgend kamp: 15 km wandeling."
   - Tik op een kamp opent het detail met wat er nog mist, in woorden: "Nog 1 wandeling van 15 km. Je langste was ongeveer de helft."
3. De coach, één alinea, met dezelfde telling als Ritme in Stand.
4. "Ook onderweg naar: Hardloopwedstrijd, 20 maart 2027", met een voorspelde tijd zodra de testloop gedaan is.
5. Tempo bij zone 2.
6. Uitrusting.
7. Onderaan de knop "Doelen beheren".

"Klaar voor meer", "Wat je al aankunt" en "Doelfocus" verdwijnen van de voorpagina. Wil je ze houden, dan als één scherm "Hoe het gemeten wordt" achter de i-knop bij de coach.

## 4. Voorstel voor de eerste drie stappen

1. **De opruimronde (idee 4) plus de meldingsbalk.** Klein werk, direct zichtbaar, en het legt de regels vast waarop de rest bouwt.
   - Knoppen in zinsletters op één regel.
   - Eyebrows via `Eyebrow`.
   - Tikdoelen van minstens 44.
   - De meldingsbalk die na een paar seconden inklapt en een fatsoenlijke sluitknop heeft.
   - Dezelfde schrijfwijze voor dezelfde keuzes.
   - Het dubbele "waarom" weg.
   - De ontwerpregels in `CLAUDE.md` erbij.
2. **Vandaag volgens schets A.** Eerst alleen de missiekaart (formulier naar een sheet, knop boven de vouw) en de compacte voorstelkaart; daarna de tijdlijn en het verplaatsen van citaat en gewicht. Bekijk het een week op je telefoon voor de volgende stap.
3. **Eén voortgangstaal (idee 2) en daarmee de tabs (schets C).** Eerst de tellingen van de coach en Je stand gelijktrekken en de termen kiezen ("kamp", "coach"), dan de tabs omzetten. Het bergprofiel van Week en de iconenset komen daarna, als het skelet staat.

## 5. Wat jij moet beslissen

1. Mag het invulformulier van je krachttraining van de missiekaart af en pas na "Gedaan" in een sheet verschijnen? Dat is één tik meer, maar de knop staat dan wel meteen in beeld.
2. Welke maat wil je zien als "hoe ver ben ik richting de GR5": de kampen (3 van 13), of liever één percentage? En wil je "Klaar voor meer" en "Wat je al aankunt" nog ergens houden?
3. Vind je het goed dat Je stand een eigen tab wordt en Meer een tandwiel rechtsboven? Of houd je liever Meer als tab en zet je Logboek binnen Stand?
4. Wil je een ochtendmoment van tien seconden bij het eerste openen, of is dat voor jou juist een drempel?
5. Gebruik je ASCEND op een iPhone of op Android? Dat bepaalt of snelkoppelingen en "delen naar ASCEND" (Android) of de badge op het icoon (iPhone, met meldingen aan) de moeite waard zijn, en of trillen bij Gedaan überhaupt kan.
6. Het citaat: houden, en zo ja in het Nederlands als hoofdtekst en het origineel klein eronder, of liever weg?
7. Knoppen in hoofdletters of in zinsletters? Ik raad zinsletters aan voor knoppen en hoofdletters alleen voor de kleine bronzen kopjes, maar het is jouw smaak.
