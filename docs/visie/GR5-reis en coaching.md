# De GR5-reis en coaching: van trainingsapp naar reisgenoot

Onderwerp: de Grande Traversée des Alpes vanaf 1 augustus 2027, alleen en grotendeels met tent, en hoe ASCEND hem daar naartoe en overheen brengt. Geschreven op 21 oktober 2026, 41 weken voor vertrek.

## 1. In het kort

1. De app is gebouwd voor een hut-tot-huttocht met 12 kg, maar hij loopt alleen en met tent. Daardoor kloppen het rugzakdoel, de paklijst en een deel van de kennisteksten niet meer: met bivak vertrek je uit een dorp met 12 tot 15 kg, niet met 12.
2. De GR5 met tent is goed te doen, maar de regels verschillen per gebied: in het hart van de Vanoise alleen bij bepaalde refuges en op reservering, in de Mercantour van 19.00 tot 9.00 uur op meer dan een uur van weg en parkgrens, in drie reservaten in de Haute-Savoie via een reserveringssite. Dat hoort in een etappeplan, niet in zijn hoofd.
3. Wat de app het meest mist is een reisplanner: een tijdlijn van nu tot 1 augustus met de niet-trainingstaken (uitrusting kopen en testen, eerste nacht alleen buiten, bivakplekken reserveren, satellietcommunicator, vertrekbrief), en een uitrustingslijst met gewichten die meegroeit met zijn testtochten.
4. Motivatie zonder RPG: momenten van trots die de app zelf herkent ("je eerste nacht alleen buiten"), een weekterugblik met één stoïcijnse vraag, en geen nadruk op reeksen die breken. Dat is allemaal deterministisch en lokaal te bouwen.
5. Een AI-laag is technisch mogelijk zonder backend, maar voegt nu weinig toe dat een goede knop niet ook kan. De tijd gaat beter naar de reisplanner, het bivakprofiel en het etappeplan.

## 2. Wat er nu is en waar het knelt

### 2a. In de app

- Het hoofddoel staat op 620 km, 30.000 m D+ en D−, 30 loopdagen en 12 kg ("Gemiddelde loopdag: 20,7 km · 1.000 m D+ · 1.000 m D− · 12 kg", schermafdruk van Ascend met zijn back-up). Twaalf kilo is een hutgewicht. Met tent, slaapzak, matje en kookspul plus eten voor twee tot vier dagen ligt het vertrekgewicht hoger (zie 2b). Dertig loopdagen zonder rustdag botst bovendien met de regel uit het eerdere onderzoek: elke 5 tot 7 etappes een rust- of korte dag (`docs/onderzoek/Aanvullend onderzoek GR5 voorbereiding.md`, regel B7).
- Mijlpaal 11 vraagt "het daadwerkelijk geplande GR5-rugzakgewicht (rond 12 kg)" (`src/data/gr5Details.ts:227`). De kennistekst over pakken rekent met 12 kg en zegt "Voor een hut- en gîtetocht is 35 tot 45 liter genoeg" (`src/data/knowledge/uitrusting-pakken.ts:5` en `:12`). De weektip bij slapen gaat over hutten reserveren, niet over bivakplekken (`src/data/knowledge/slapen-hutten-bivak.ts`, weeklyTip).
- De paklijst op Ascend is een vaste lijst van zeventien woorden zonder gewichten, ingeklapt, met de tekst "Nu nog niet nodig" (`src/pages/Ascend.tsx:282`, `src/data/gr5Details.ts:59`). Voor een bivaktocht is dat precies verkeerd om: tent, slaapzak en matje moet hij deze winter kiezen, kopen en in het voorjaar testen.
- Er is geen enkele plek voor taken die geen training zijn. Hutten of bivakplekken reserveren, de trein boeken, een satellietcommunicator regelen, schoenen inlopen: niets daarvan heeft een datum of een vinkje. Het dichtstbij komt de les van de week (`src/engine/weeklyLesson.ts`), die per week een kennisonderwerp kiest binnen een venster van weken voor het doel. Dat mechanisme is goed en herbruikbaar.
- Het onderwerp "mentaal-lange-dagen" gaat over "samen beslissen" en groepsdynamiek (`src/data/knowledge.ts:78`), terwijl hij alleen loopt. Alleen lopen vraagt andere dingen: een vaste check-in met thuis, een eigen omkeerregel, omgaan met eenzaamheid op dag 12.
- Wat wel sterk is: de vergelijking "een GR5-dag naast je beste" bestaat al (`src/engine/standing.ts:283` tot `:317`, tijd, stijgen, dalen, rugzak, dagen achter elkaar). Dat is de kern van een etappeplan, alleen nu met één gemiddelde dag in plaats van 36 echte etappes.
- Motivatie zit nu in een quote na elke training (`src/components/CompletionMoment.tsx`), een reeks "OP RIJ" op Je stand (`src/engine/streak.ts`, getoond in `src/pages/Standing.tsx:73`), de ladder met 13 kampen en de weekterugblik (`src/engine/weekReview.ts`). De weekterugblik is een overzicht, geen gesprek: hij vertelt, hij vraagt niets.
- Op Ascend staat "RUGZAK 0%" en "KLIMMEN / D+ 19%" zonder dat erbij staat wat de volgende stap is (schermafdruk). Hij vond eerder dat getallen zonder uitleg te vaag waren.

### 2b. De GR5 zelf, met tent en alleen

Hieronder alleen wat nog niet in de bestaande rapporten en kennisteksten staat. Hoogte, hitte, eten op hoofdlijnen, blaren en stokken zijn al onderzocht in `Aanvullend onderzoek GR5 voorbereiding.md`.

**De route in cijfers.** De GTA telt officieel 36 etappes, ongeveer 600 tot 620 km en 30.000 m D+, in vier stukken: Léman naar Mont-Blanc (7 etappes), Mont-Blanc naar de Maurienne (10), Maurienne naar de Haute-Ubaye (10) en Haute-Ubaye naar Nice (9) ([FFRandonnée](https://www.ffrandonnee.fr/s-informer/actualites/la-grande-traversee-des-alpes-gta-gr-5-une-aventure-a-vivre-a-pied-dans-les-alpes); [GTA, itinéraire par tronçons](https://www.grande-traversee-alpes.com/en/litineraire-par-troncons/)). De officiële site geeft per etappe afstand, D+, D−, tijd en een GPX. Een voorbeeld uit het tweede stuk: van Peisey-Nancroix naar het Refuge du Col du Palet is 14,7 km met +1.297 m, van de Balme naar Peisey 22,2 km met −1.398 m, en van Plan Sec naar Modane 16,2 km met −1.656 m ([GTA, tronçon 2](https://www.grande-traversee-alpes.com/gr5-troncon-2-du-mont-blanc-maurienne/)). De officiële etappes zijn gemiddeld korter dan zijn "gemiddelde loopdag" van 20,7 km: wie in 30 dagen loopt, plakt etappes aan elkaar. De site meldt ook dat het oude pad naar Peisey niet meer begaanbaar is en er een omleiding ligt; de route verandert dus, en de GPX van vorig jaar is niet vanzelf de goede. Een expeditie van Imperial College liep de route in augustus 2024 in 28 dagen, 590 km en 32.700 m D+, met tent, en koos de GR55 door de Vanoise en de GR52 naar Menton ([Imperial College, 2024](https://www.imperial.ac.uk/be-inspired/exploration-board/previous-expeditions/2020s/2024-france-gr5-trekking/)). Ter vergelijking: het hele GR5 is 2.500 km lang, van Rotterdam tot Nice (FFRandonnée, zelfde pagina).

**Seizoen en weer.** De meeste refuges zijn open van 15 juni tot 15 september, en in sommige dorpen sluiten winkels al eind augustus ([GTA, quand partir](https://www.grande-traversee-alpes.com/en/portfolio-item/periode-conseillee/)). Begin augustus is dus goed, maar het zuidelijke deel loopt hij eind augustus, als de eerste winkels dichtgaan. Briançon (1.324 m) heeft in augustus een gemiddelde minimumtemperatuur rond 10 °C ([areq.net, normalen Briançon](https://areq.net/lang/fr/Brian%C3%A7on.html); [Climats et Voyages](https://www.climatsetvoyages.com/climat/france/briancon)). Met ongeveer 0,6 °C per 100 m komt dat op rond 4 °C op 2.300 m, en op een heldere windstille nacht lager, tot rond het vriespunt (afgeleid). Een slaapzak met een comforttemperatuur rond 0 °C is daarom de redelijke keuze. Onweer komt in de zomer vooral laat op de middag ([partir.com](https://www.partir.com/Alpes/quand-partir.html)); de praktische regel is vroeg vertrekken en de hoge col voor de middag over zijn. Weer en onweer staan al uitgebreid in de kennisteksten.

**Bivakregels per gebied.** Dit is het belangrijkste nieuwe onderdeel, omdat het per etappe bepaalt waar hij mag slapen. Bronnen zijn van 2024 tot 2026; regels veranderen, dus de app moet bij elk gebied "controleer voor vertrek" tonen met de link.

- Haute-Savoie, drie natuurreservaten. Sinds 2023 reserveer je bivakplekken in de reservaten Aiguilles Rouges, Contamines-Montjoie en Sixt-Fer-à-Cheval/Passy via [bivouac.nature-haute-savoie.fr](https://bivouac.nature-haute-savoie.fr) ([FFRandonnée, augustus 2025](https://www.ffrandonnee.fr/s-informer/actualites/reserver-sa-place-de-bivouac-c-est-dans-les-reserves-naturelles-de-haute-savoie)). In de Contamines mag je alleen op de bivakplekken La Rollaz en La Balme, van 19.00 tot 9.00 uur ([FFRandonnée, oktober 2024](https://www.ffrandonnee.fr/s-informer/actualites/le-bivouac-sur-la-grande-traversee-des-alpes-gr-5-gta)). In Passy (rond Anterne) noemt het toerismebureau 19.00 tot 9.00 uur, van half juni tot eind september; honden zijn er verboden ([Haute-Savoie Tourisme, Lac d'Anterne](https://www.haute-savoie-tourisme.org/nature/itineraires-randonnees/5667450-montee-au-lac-d-anterne)). In de Aiguilles Rouges is bivak bij sommige meren in juli en augustus verboden en bij andere alleen op reservering ([Asters-CEN74, presentatie 2025](https://www.biodiversite-auvergne-rhone-alpes.fr/wp-content/uploads/2025/04/8_2025-03-20-Presentation-AstersCEN74.pdf)). De bronnen spreken elkaar over de precieze periodes tegen; dat is een taak voor het voorjaar van 2027.
- Het korte Zwitserse stuk bij de Portes du Soleil. Volgens het merkblad van de SAC is één nacht van een kleine groep boven de boomgrens meestal geen probleem, buiten beschermde gebieden en wildrustzones ([SAC-merkblad](https://ascona-locarno.com/dam/jcr:964ca17a-0ddc-404f-93b7-a78dc2dc52b1/SAC_Campieren_Biwakieren_d.pdf); [DAV](https://www.alpenverein.de/uebernachten-am-berg)).
- Vanoise. In het hart van het park mag je alleen bivakkeren vlak bij bepaalde bemande refuges, van 1 juni tot 30 september, van 19.00 tot 8.00 uur, op reservering bij de refuge en tegen een kleine vergoeding ([FFRandonnée, mei 2024](https://www.ffrandonnee.fr/s-informer/actualites/le-bivouac-dans-le-cœur-du-parc-national-de-la-vanoise); [FFRandonnée, oktober 2024](https://www.ffrandonnee.fr/s-informer/actualites/le-bivouac-sur-la-grande-traversee-des-alpes-gr-5-gta)). Het park noemt zo'n 20 plekken; voorbeelden zijn 6 euro bij Rosuel en 5 euro bij de Martin ([Cirkwi, Refuge de Rosuel](https://www.cirkwi.com/fr/point-interet/966525-refuge-de-rosuel-pnv); [Outtrip, Refuge de la Martin](https://outtrip.fr/refuge-garde/refuge-de-la-martin); [brochure Vanoise 2025](https://www.savoie.fr/upload/docs/application/pdf/2025-06/brochure_bivouac_-_parc_national_de_la_vanoise.pdf.pdf)). Chris Townsend vond op zijn GR5 geen enkele refuge met bivakplek op zijn lijn en sliep twee nachten net buiten het park ([Townsend, 2018](https://www.christownsendoutdoors.com/2018/10/camping-on-gr5-trail-through-french-alps.html)). De Vanoise is daarmee het stuk waar hij met tent het meest moet plannen.
- Queyras. Sinds 2023 hebben de tien gemeenten bivak per besluit geregeld: getolereerd op meer dan een uur lopen van dorp en gehuchten, en verboden in de Vallon de Bouchouse ([FFRandonnée, Queyras](https://www.ffrandonnee.fr/s-informer/actualites/queyras-harmonisation-de-la-reglementation-des-espaces-naturels)). Voor Ceillac en de Col Girardin heb ik het precieze besluit niet gevonden.
- Mercantour. Bivak mag van 19.00 tot 9.00 uur, op meer dan een uur lopen van de parkgrens of de laatste weg, met een lage tent en één nacht per plek; de boete kan oplopen tot 1.500 euro ([Mercantour, folder 2022](https://www.mercantour-parcnational.fr/sites/mercantour-parcnational.fr/files/2023-11/plaquette%20FR%202022-05-13-VF-VD-light.pdf); [Mercantour, aanvraagpagina](https://demarche.numerique.gouv.fr/commencer/demande-d-autorisation-de-campement-en-coeur-de-pa)). In de Vallée des Merveilles (GR52) alleen op de plekken bij de refuges des Merveilles en Fontanalba.
- Écrins. De hoofdroute gaat niet door het hart van de Écrins; mocht hij uitwijken, dan geldt 19.00 tot 9.00 uur en een uur van weg en grens (FFRandonnée, oktober 2024).
- Overal: geen vuur, en veel refuges bieden bivakkers een maaltijd, douche of soms een huurtent tegen betaling (FFRandonnée, oktober 2024). Voor een sologanger met tent is "slapen in je tent, eten in de hut" vaak de beste combinatie: minder eten dragen, en mensen spreken.

**Water.** In het noorden is water ruim. In het zuiden liggen bronnen soms uren uit elkaar ([Townsend](https://www.christownsendoutdoors.com/2018/10/camping-on-gr5-trail-through-french-alps.html)), en in een droge zomer staan veel bronnen droog en ben je aangewezen op dorpen en refuges ([randonner-leger.org](https://www.randonner-leger.org/forum/viewtopic.php?id=22334)). Townsend vulde zijn flessen laat in de middag en droeg water mee voor het laatste uur naar een droge kampplek. Op alpenweiden met koeien en schapen filter je altijd. De kennistekst "Water en eten onderweg" dekt filteren al.

**Bevoorrading en koken.** Er liggen genoeg dorpen dat je zelden meer dan twee tot drie dagen eten hoeft te dragen ([Gestalten, Wanderlust Alps](https://news.gestalten.com/sites/default/files/press/pdf/p.26-27_WanderlustAlps%2Cgestalten2021.pdf)), maar het aanbod in dorpswinkels is beperkt en na half september gaat veel dicht ([Townsend, eten op de GR5](https://www.christownsendoutdoors.com/2018/12/food-on-gr5-trail-through-alps.html)). Grote plaatsen op of vlak bij de route zijn Thonon, Les Houches en Chamonix, Bourg-Saint-Maurice (bus naar Tignes en Val-d'Isère), Modane, Briançon en Guillestre; in het zuiden worden de gaten groter. Gas: een brander met schroefdraad (EN417) is het breedst bruikbaar, maar in kleine dorpen ligt soms alleen Campingaz met eigen aansluiting ([Bricomarché, EN417](https://www.bricomarche.com/p/cartouche-de-gaz-450g-butane-propane-valve-7/16-en417-rechaud-bruleur-lampe-grill-alpen-camping/5903240385775); [Packstack, Campingaz CV300](https://www.packstack.io/reviews/cookware/campingaz-cv-300-plus-gas-cartridge)). Koop gas in de grote plaatsen. Voor één warme maaltijd en één warme drank per dag gaat een cartouche van 230 g ongeveer 8 tot 10 dagen mee (afgeleid, bij 20 tot 25 g per dag). Gas mag niet mee in het vliegtuig; met de trein kan hij het pas bij de start kopen.

**Eten met een zware rugzak.** Het eerdere rapport schatte 3.500 tot 4.500 kcal per dag voor iemand van 75 tot 80 kg met 12 kg. Met tent draag je meer; een ruwe optelsom voor iemand van 80 kg met 14 kg (rust- en dagverbruik rond 2.200 kcal, 20 km lopen met 94 kg totaalmassa rond 1.100 kcal, 1.000 m stijgen rond 850 kcal, plus het afdalen) komt op 4.000 tot 5.000 kcal (afgeleid, onzeker). Dat ga je niet allemaal dragen. Reken op 0,8 tot 1,0 kg droog eten per dag bij 400 tot 500 kcal per 100 g, eet bij elke refuge of elk dorp extra, en accepteer een tekort van 500 tot 1.000 kcal per dag (zelfde rapport, regel B4).

**Een concrete paklijst met gewichten.** Een solo bivakopzet voor augustus, "licht maar comfortabel", met afgeronde gewichten van gangbare modellen. Tussen haakjes de ultralichte en de comfortabele variant.

Slapen en dragen, samen ongeveer 3,8 kg:
- eenpersoons dubbelwandige tent, laag model (vereist in Vanoise en Mercantour): 1.100 g (700 tot 1.500)
- donzen slaapzak of quilt, comfort rond 0 °C: 850 g (600 tot 1.100)
- opblaasbaar matje met R-waarde 3 tot 4: 450 g (350 tot 600)
- opblaasbaar kussen: 60 g
- rugzak 50 tot 60 liter met stevige heupband, gemaakt voor 15 kg: 1.300 g (900 tot 1.900)
- waterdichte binnenzak: 60 g

Koken en water, samen ongeveer 0,8 kg:
- brander met schroefdraad, titanium pan van 750 ml, lepel, aansteker: 235 g
- volle gascartouche van 230 g: 370 g
- waterfilter, twee flessen van 1 liter en een zak van 2 liter: 195 g

Kleding die mee gaat (niet wat je aan hebt), samen ongeveer 1,9 kg:
- regenjas 350 g, regenbroek 220 g
- isolatiejas, dons of synthetisch: 350 g
- dunne fleece: 250 g
- droog thermoshirt en lange onderbroek voor de nacht: 350 g
- twee paar sokken, een onderbroek, muts, handschoenen, pet: 380 g

Elektronica en navigatie, samen ongeveer 0,6 kg:
- powerbank 10.000 mAh 190 g, kabels en stekker 80 g
- hoofdlamp 60 g
- satellietcommunicator 115 g
- kaartuitsnede en kompas 120 g

Verzorging en veiligheid, samen ongeveer 0,75 kg:
- EHBO- en voetenset met papiertape: 200 g
- toilettas met troffel en wc-papier: 180 g
- zonnebrand en lippenbalsem: 100 g
- reparatiesetje, mes, oordoppen en oogmasker, zakken: 270 g

Basisgewicht samen ongeveer 7,8 kg (ultralicht rond 5,5 kg, comfortabel rond 9,5 kg). Daar komen eten en water bij. Vertrek uit een dorp met drie dagen eten en 2 liter water: ongeveer 12,5 kg. Met vier dagen eten en 3 liter in het droge zuiden: ongeveer 14,5 kg. Bij een lichaamsgewicht van 80 kg is dat 16 tot 18 procent, binnen de 20 procent uit het eerdere rapport (regel B8). De trainingspiek hoort dus rond 14 kg te liggen, met een paar korte tochten alleen bergop met 15 tot 16 kg als marge.

**Vervoer.** De officiële site noemt treinstations in Thonon-les-Bains, Lausanne (met de boot over het meer naar Saint-Gingolph), Les Houches, Landry, Modane, Briançon, Guillestre, Menton en Nice, en bussen naar vrijwel elke etappeplaats ([GTA, les accès](https://www.grande-traversee-alpes.com/en/portfolio-item/les-transports/)). Vanuit Nederland is de trein via Parijs of via Genève en de Léman Express naar Thonon de logische heenreis, en de TGV vanaf Nice de terugreis (dienstregelingen niet gecontroleerd). Dezelfde bussen zijn zijn uitwijkroute bij slecht weer of een blessure.

**Alleen onderweg.** Het alarmnummer is 112. Bergredding door de overheid is in Frankrijk buiten skigebieden in de regel gratis, al kan een gemeente bij grove nalatigheid kosten verhalen en wordt er politiek over gesproken ([Presse-citron](https://www.presse-citron.net/appeler-les-secours-en-montagne-frais/)). In Zwitserland is een heli wel duur. Een Garmin-horloge heeft vaak ongevaldetectie en LiveTrack, maar alleen via de telefoon met mobiel bereik, en Garmin belt zelf geen hulpdiensten ([Garmin, veiligheidsfuncties](https://www8.garmin.com/manuals/webhelp/GUID-9D99A9D4-467A-4F1A-A0EA-023184FEA3DD/EN-US/GUID-64F677A5-03E0-453F-BFE3-E1B93D6FA3FC.html)). Voor dalen en kampplekken zonder bereik is een satellietcommunicator het echte vangnet. De abonnementen van Garmin inReach zijn sinds juni 2025 per maand opzegbaar; Essential kost rond 18 euro per maand plus eenmalig rond 50 euro activering ([Garmin Italië](https://www.garmin.com/it-IT/blog/sicurezza-costi-abbonamento-garmin-inreach/); [GPS Training UK](https://gpstraining.co.uk/blogs/news/garmin-simplifies-inreach-subscription-plans-june-2025-update)). Voor een tocht van een maand is dat dus twee maanden abonnement (de laatste testweken en de tocht). Heeft hij een recente iPhone, dan kan die via satelliet een noodoproep doen; dat moet hij zelf nagaan. Verzekering: een gewone reisverzekering dekt bergwandelen buiten gebaande paden lang niet altijd ([Consumentenbond](https://www.consumentenbond.nl/reisverzekering/bergwandelen-niet-altijd-verzekerd)); de NKBV biedt leden een reisverzekering met bergsportdekking inclusief opsporing en redding ([In de bergen, over de NKBV](https://www.indebergen.nl/weblog/54439-alles-over-de-nkbv/)). Kuddes worden bewaakt door beschermhonden (patous); de parken zetten in juli en augustus bemiddelaars op de paden om uit te leggen hoe je je gedraagt ([Vanoise, persbericht 2024](https://vanoise-parcnational.fr/sites/vanoise-parcnational.fr/files/2024-07/CP%20PN%20Vanoise%20-%20Animateurs%20pastoraux%20en%20Maurienne.pdf)). Alleen lopen betekent vooral: iemand thuis die weet waar je slaapt, een vaste check-in, en een omkeerregel die je vooraf hebt vastgelegd, omdat er niemand naast je staat die zegt dat het zo niet verder gaat.

**Wat beginners verkeerd doen** (uit de bronnen hierboven en de ervaringsverhalen, deels expertadvies): te zwaar pakken; de eerste dagen te lang maken; geen rustdagen plannen; nieuwe schoenen of een nooit geteste tent meenemen; denken dat je in de Vanoise overal je tent kunt neerzetten; water in het zuiden onderschatten; laat vertrekken en in de middag op een col in het onweer staan; de tijden uit de gids als vast gegeven nemen (een wandelaar op het Vogezendeel van de GR5 merkte dat de gidstijden niet klopten voor hem, [Backpacking Light](https://backpackinglight.com/forums/topic/69163/)); geen contant geld voor refuges; en vergeten dat rond 15 augustus (Assomption) alles vol en dicht tegelijk kan zijn.

## 3. Ideeën, gerangschikt op waarde voor hem

### 1. Een bivakprofiel: het doel en de teksten kloppen weer

- **Wat.** Bij het GR5-doel een keuze "hutten", "tent" of "gemengd" en "alleen" of "samen". Bij "tent, alleen" zet de app het rugzakdoel op 14 kg (in plaats van 12), stelt 32 tot 35 dagen voor in plaats van 30 (met een rustdag per 5 tot 7 etappes), en passen de teksten zich aan: mijlpaal 11 wordt "15 tot 20 km en 750 tot 1.000 m D+ met je bivakrugzak, rond 14 kg", de kennistekst over pakken krijgt een bivakvariant, de weektip over slapen gaat over bivakplekken reserveren, en het mentale onderwerp krijgt een solodeel (check-in, omkeerregel, alleen beslissen).
- **Waarom.** Alles wat de app nu over gewicht en slapen zegt, gaat uit van hutten (2a). Met de verkeerde 12 kg rekent de rugzakas in "Wat je al aankunt" en "Een GR5-dag naast je beste" tegen een te laag doel.
- **Werk.** Klein tot middel. Het doel heeft al een `packWeight`-eis en een aantal loopdagen; het profiel is één veld erbij, en de teksten zijn data. Een nieuw veld op het doel vraagt een migratiestap in `storage/migrations.ts`.
- **Risico.** Laag. Het rugzakdoel omhoog betekent dat de opbouw langer duurt; de bestaande regel "volle rugzak vanaf 8 weken voor vertrek" blijft gelden.
- **Lokaal.** Ja, volledig.

### 2. De reisplanner: "Op weg naar 1 augustus"

- **Wat.** Een eigen scherm vanaf Ascend met een tijdlijn van nu tot vertrek, met taken die geen training zijn. Elke taak heeft een venster in weken voor het doel (net als de kennisonderwerpen), een korte uitleg waarom, een link waar nodig, en een vinkje. Op Vandaag verschijnt hooguit één regel: "Deze week voor je reis: kies je slaapzak." Een voorstel voor de tijdlijn bij een bivaktocht:
  - oktober tot december 2026: besluit over aantal dagen en verlof; NKBV-lid en verzekering; tent, slaapzak en matje kiezen en kopen (de grote drie bepalen de helft van je basisgewicht); alles één keer wegen.
  - januari 2027: schoenen kiezen en beginnen met inlopen (minstens 6 weken en 100 km voor vertrek, eerder rapport regel B5, maar met tent liever drie maanden); controleren wanneer refuges in de Vanoise en de reserveringssite in de Haute-Savoie open gaan; offline kaarten en de officiële GPX per etappe binnenhalen.
  - februari en maart: rugzak naar 10 kg op lange wandelingen; brander en filter thuis testen; 20 maart de 10 km.
  - april: eerste nacht alleen buiten, dichtbij huis; satellietcommunicator kopen en een keer testen met een bericht naar thuis.
  - mei: eerste bivakweekend, twee dagen met 12 kg en zelf koken; bivakplekken in de Vanoise en de Haute-Savoie reserveren zodra dat kan; trein heen boeken.
  - juni: generale repetitie van drie dagen met volle uitrusting en 14 kg in heuvels (Eifel, Ardennen of de Vogezen); daarna de paklijst definitief maken.
  - juli: hitteblok (regel B2 uit het eerdere rapport), taper, vertrekbrief naar thuis, abonnement satellietcommunicator aan, weer en sneeuw op de hoge cols checken, gas niet vergeten bij de start.
- **Waarom.** De vraag van het scherm is "wat is mijn missie vandaag", en voor de GR5 is die missie de komende maanden net zo vaak "regel dit" als "train dit". Implementatie-intenties (een concreet wanneer en waar bij een taak) vergroten de kans dat je het doet, met een middelgroot effect over 94 studies ([Gollwitzer en Sheeran 2006](https://doi.org/10.1016/S0065-2601(06)38002-1)). Een taak met een week en een vinkje is precies dat.
- **Werk.** Middel. De taken zijn statische data per doeltype; welke taak deze week getoond wordt is een pure functie in `engine/` naar het voorbeeld van `weeklyLesson.ts`; afgevinkte taken worden een append-only lijst, zoals `MilestoneProgress`. Nieuwe opslag vraagt een migratiestap en opname in de export.
- **Risico.** Te veel taken voelt als een takenlijst van het werk. Daarom: hooguit één taak per week op Vandaag, de rest alleen op het eigen scherm, en nooit rood of "achterstallig".
- **Lokaal.** Ja.

### 3. Een uitrustingslijst met gewichten die meegroeit

- **Wat.** In plaats van de vaste lijst van zeventien woorden: zijn eigen uitrusting met gewicht in grammen, gegroepeerd zoals in 2b. De app telt het basisgewicht op, laat zien wat eten en water erbij doen voor 2, 3 en 4 dagen, en zet dat naast zijn lichaamsgewicht (regel B8). Elk onderdeel heeft een status: "nog kiezen", "gekocht", "getest". Na een tocht met rugzak vraagt de app één ding: "Wat had je mee en niet gebruikt, en wat miste je?" Zo wordt de lijst na elke testtocht beter, en ziet hij op 1 augustus dat alles minstens één keer buiten is geweest. De voorbeeldlijst uit 2b is het startpunt, die hij aanpast.
- **Waarom.** Bij bivak is het basisgewicht de grootste knop die hij zelf in handen heeft: 2 kg verschil tussen comfortabel en licht is meer dan een dag eten. De mijlpalen "rugzak getest", "slaapsysteem getest" en "watermanagement getest" (`src/data/gr5Details.ts`, mijlpaal 13) worden dan echt aftoetsbaar in plaats van een gevoel.
- **Werk.** Middel. Een kleine eigen opslag met migratie; de som en de status zijn pure functies. Het gewicht van de rugzak bij een log bestaat al (`backpackWeightKg`).
- **Risico.** Handwerk: hij wil weinig typen. Daarom met een ingevulde voorbeeldlijst beginnen en alleen afwijkingen laten aanpassen.
- **Lokaal.** Ja.

### 4. Bivaktestweekenden in het schema, met plekken dichtbij

- **Wat.** Een trainingstype "bivakweekend" (dag 1 met rugzak, nacht buiten, dag 2 met rugzak) dat de planner via een voorstel met Akkoord inplant, met een oplopend gewicht: april 10 tot 12 kg, mei 12 kg met zelf koken, juni drie dagen met 14 kg. Bij Trainingsplekken komt een categorie "Overnachten", met wat er legaal kan dicht bij huis:
  - natuurkampeerterreinen, bijvoorbeeld Beek en Hei in Otterlo op de Veluwe met trekkershutten ([Camplinq](https://camplinq.com/nl/campings/natuurcampeerterrein-beek-en-hei)), met de natuurkampeerkaart;
  - paalkamperen bestaat bijna niet meer: Staatsbosbeheer sloot zijn plekken in 2020, er zijn er nog een paar in Twente en de Biesbosch ([Kampeermeneer](https://www.kampeermeneer.nl/paalkamperen/); [OpenStreetMap-forum](https://community.openstreetmap.org/t/paalkamperen/90067));
  - België: in Vlaanderen ongeveer 30 gratis bivakzones, onder meer rond de Hoge Kempen, voor één nacht of hooguit 48 uur ([Stad Gent, maart 2025](https://raadpleegomgeving.stad.gent/document/67e3d5ca3874474f7dff9a56); [Natuur en Bos, Haspengouw](https://natuurenbos.be/sites/default/files/2023-06/Bivakzones_in_Haspengouw.pdf)), en in Wallonië zo'n 29 gratis bivakzones van het DNF, bijvoorbeeld bij Botrange in de Hoge Venen, nooit twee nachten achter elkaar ([RTBF](https://www.rtbf.be/article/se-balader-en-foret-ou-en-pleine-nature-sans-faux-pas-11691721); [Botrange](https://botrange.be/en/bivouacs/area-b-bergerie/));
  - Eifel: trekkingplekken met een composttoilet, alleen te voet bereikbaar, 10 tot 15 euro per tent per nacht, te boeken via de Eifel-sites ([Eifel Tourismus](https://www.eifel.info/en/book/trekking-sites); [Nordeifel Tourismus](https://www.nordeifel-tourismus.de/en/activities/eifel-trekking)). Met hoogteverschil en echt terrein het beste testgebied binnen drie uur rijden.
  
  Een mooi detail voor het verhaal: het GR5 loopt van Rotterdam tot Nice (FFRandonnée). Een testweekend op het Belgische of Luxemburgse stuk van het GR5 is letterlijk een stuk van dezelfde lijn (het precieze verloop moet hij op de Belgische GR-site nagaan).
- **Waarom.** Mijlpaal 12 (2 tot 3 dagen met volledige uitrusting) is nu één regel tekst, terwijl het voor een bivaktocht de belangrijkste test is: slapen, koken, water, vochtige kleding en de ochtend daarna weer op pad. De ladder heeft dan een concrete, ingeplande weg ernaartoe.
- **Werk.** Middel. Een nieuw sjabloon met twee dagen en een nacht moet de beenregels en de weekcontrole goed doorlopen (twee beenzware dagen achter elkaar is hier juist de bedoeling); de plekkenlijst is data.
- **Risico.** Regels en prijzen van de plekken veranderen; altijd met link en "controleer". Een weekend weg botst met kracht in MacroFactor; dat lost de bestaande voorstelflow op.
- **Lokaal.** Ja.

### 5. Een etappeplan naast je capaciteit, offline

- **Wat.** De 36 officiële etappes als vaste data in de app (afstand, D+, D−, tijd, overnachtingsplaats), met daaroverheen zijn eigen plan: welke etappes hij samenvoegt, waar hij rust, waar hij slaapt (tent, bivak bij refuge, camping, gîte). Per dag laat de app zien: de dag naast zijn beste van de laatste acht weken (de bestaande `routeDayRows`), het bivakregime van dat gebied met link, of er onderweg water en een winkel is, en of het een "vroeg vertrekken"-dag is (hoge col). Bovenaan: "je vijf zwaarste dagen" en "deze dag kun je nu al aan". In de laatste weken voor vertrek wordt dit zijn boek voor onderweg, ook zonder bereik.
- **Waarom.** "Een GR5-dag naast je beste" met één gemiddelde dag verbergt dat dag 1 tot en met 3 licht moeten zijn (regel B7) en dat een afdaling van 1.656 m naar Modane iets anders vraagt dan een dag met +1.297 m naar de Col du Palet. Het geeft ook antwoord op de vraag die hij op Ascend zou willen stellen: "Kan ik het al?" met een echte etappe als maat in plaats van een percentage.
- **Werk.** Groot. De etappedata moet één keer zorgvuldig overgenomen worden van de officiële site (die zelf op een paar plekken tegenstrijdig is, zie 2b) en jaarlijks gecontroleerd. GPX-bestanden of kaarten in de app opslaan is niet nodig: links naar de officiële GPX per etappe, en de kennistekst over offline kaarten volstaan. Zijn eigen plan is nieuwe opslag met migratie.
- **Risico.** Verouderde routedata. Daarom bij elke etappe de bron en de datum van overname tonen.
- **Lokaal.** Ja; de app werkt als PWA al offline, dus het etappeplan ook.

### 6. Solo-veiligheid en de vertrekbrief

- **Wat.** Een kaart "Alleen onderweg" met: zijn check-in-afspraak (bijvoorbeeld elke avond rond 20.00 uur een bericht, en wat thuis doet als het uitblijft: na twee uur bellen, na zes uur 112 met het etappeplan), het alarmnummer, zijn satellietcommunicator en abonnementsperiode, zijn verzekering met polisnummer, en zijn persoonlijke omkeerregels ("onweer voorspeld na 14.00 uur: hoge col voor 12.00 uur over, anders lage variant"). Daarbij een knop "Vertrekbrief": de app maakt van het etappeplan een leesbare tekst met data, slaapplekken en uitwijkroutes, en deelt die via de deelknop van de telefoon met thuis.
- **Waarom.** Alleen lopen haalt het vangnet van een tochtgenoot weg. Het onderwerp "Als het misgaat" (`src/data/knowledge/noodgevallen.ts`) legt uit wat je doet; deze kaart legt vast wat hij en zijn thuisfront hebben afgesproken. Een omkeerregel die je vooraf opschrijft is weer een implementatie-intentie.
- **Werk.** Klein. Tekst en een paar velden; delen kan met de standaard deelfunctie van de browser, zonder server.
- **Risico.** De app mag niet doen alsof hij zelf iemand alarmeert. Het is een afspraak en een brief, geen noodsysteem.
- **Lokaal.** Ja.

### 7. Momenten van trots en het verhaal van je voorbereiding

- **Wat.** De app herkent zelf een handvol eerste keren en zet ze in het Logboek als "Moment": je eerste 1.000 m D+ op een dag, je eerste 14 kg-tocht, je eerste nacht alleen buiten, je eerste twee dagen achter elkaar met rugzak, de 10 km op 20 maart, de dag dat je zwaarste GR5-etappe onder je beste ligt. Bij elk moment één zin van hem, als hij wil ("Koud, maar ik sliep."). Per fase maakt de app er een hoofdstuk van: wat je deed, wat je voor het eerst deed, en zijn eigen zinnen. Op 31 juli leest hij zijn eigen voorbereiding terug, als verhaal en niet als grafiek.
- **Waarom.** Kleine, zichtbare vooruitgang is volgens onderzoek naar dagboeken de sterkste dagelijkse motivator ([Amabile en Kramer 2011](https://hbr.org/2011/05/the-power-of-small-wins)), en motivatie houdt langer stand als ze gaat over bekwaamheid en eigen keuze in plaats van beloningen van buitenaf ([Teixeira e.a. 2012, zelfdeterminatietheorie en bewegen](https://doi.org/10.1186/1479-5868-9-78); [Deci, Koestner en Ryan 1999](https://doi.org/10.1037/0033-2909.125.6.627)). Een moment dat zegt wat je kunt is geen badge: geen punten, geen niveaus, geen confetti. Dat houdt het stoïcijns en ver van een RPG.
- **Werk.** Middel. De herkenning is een pure functie over de logs; de momenten zelf zijn afleidbaar en hoeven niet opgeslagen, alleen zijn eigen zin wel (append-only).
- **Risico.** Te veel momenten maken ze goedkoop. Hooguit een stuk of vijftien voor de hele voorbereiding.
- **Lokaal.** Ja.

### 8. De weekterugblik als gesprek, met één stoïcijnse vraag

- **Wat.** De bestaande weekterugblik vertelt wat er gebeurde. Daar komt één vraag bij, die wisselt en kort is, en waarvan het antwoord in het verhaal belandt. Voorbeelden: "Wat lag deze week buiten je macht, en wat deed je ermee?", "Wat kan volgende week misgaan, en wat doe je dan?" (vooraf kwaad bedenken, de premeditatio van Seneca, in moderne vorm de pre-mortem van [Klein 2007](https://hbr.org/2007/09/performing-a-project-premortem)), "Waar was je deze week trots op?" De laatste vraag is altijd een als-dan: "Welke training is volgende week het lastigst om te doen, en wanneer en waar doe je hem?"
- **Waarom.** Een vraag maakt van een rapport een gesprek, zonder AI. De als-dan-vraag is weer een implementatie-intentie. Zo blijft de stoïcijnse laag licht: geen citaten uitleggen, alleen de vraag die een stoïcijn zou stellen.
- **Werk.** Klein. Een lijst vragen en een tekstveld; het antwoord als append-only notitie bij de week.
- **Risico.** Het mag niet verplicht voelen. Overslaan zonder gevolgen.
- **Lokaal.** Ja.

### 9. Wat juist demotiveert, en wat je weghaalt

- **Wat.** De reeks "OP RIJ" op Je stand vervangen door iets wat niet breekt, bijvoorbeeld "sleuteltrainingen deze fase: 6 van 7". Percentages op Ascend altijd met één zin over de volgende stap ("RUGZAK 0%: je eerste tocht met 8 kg staat op 7 november"). Geen meldingen die een gemiste training benadrukken.
- **Waarom.** Een gebroken reeks verlaagt de motivatie meer dan dat hij aanmoedigt, en berichten die je op een gemiste dag wijzen werken volgens dezelfde studie meestal niet ([Silverman en Barasch 2023](https://doi.org/10.1093/jcr/ucac029)). Bij een voorbereiding van 41 weken met ziekte, vakantie en werk breekt elke reeks een keer. Het begin van een nieuwe week of fase is juist een goed moment om opnieuw te beginnen ([Dai, Milkman en Riis 2014](https://doi.org/10.1287/mnsc.2014.1901)); de FreshStartCard doet dat al goed. En hoe dichter het doel, hoe harder mensen werken ([Kivetz, Urminsky en Zheng 2006](https://doi.org/10.1509/jmkr.43.1.39)): de aftelling in weken en de ladder doen dat al, de reisplanner versterkt het.
- **Werk.** Klein.
- **Risico.** Geen noemenswaardig.
- **Lokaal.** Ja.

Ter vergelijking met andere apps: WHOOP stuurt elke maandag een wekelijkse terugblik over trainingstoestand en slaap ([WHOOP](https://whoop.com/thelocker/new-feature-weekly-performance-assessment)), Oura zet een week- en maandoverzicht op het startscherm ([Oura](https://support.ouraring.com/hc/lv/articles/360046061373)), en Runna heeft een vakantiestand en een knop "Niet 100 procent fit" die het plan voor een periode aanpast ([Runna, holiday mode](https://intercom.help/runna/en/articles/10225691-what-is-holiday-mode); [Tom's Guide](https://www.tomsguide.com/wellness/fitness/im-deep-into-marathon-training-fighting-the-flu-and-runnas-new-not-feeling-100-percent-tool-couldnt-be-more-timely)). ASCEND heeft de terugblik en de ziekteknop al. Een vakantieknop ("ik ben van 12 tot 19 april weg, met of zonder wandelen") die een voorstel met Akkoord oplevert, is het logische volgende stuk, en kan volledig deterministisch.

### 10. Een AI-coachlaag, kort

Technisch kan het zonder backend: Anthropic staat directe aanroepen vanuit de browser toe met een eigen sleutel en een speciale header voor browsertoegang, en CLAUDE.md laat ruimte voor een AI-laag die vrije tekst omzet in beperkingen, zolang de functies in `engine/` het enige zijn dat plant (`CLAUDE.md:183`). De nadelen zijn echter reëel: zijn trainings- en gezondheidsgegevens gaan dan naar een externe dienst, de sleutel staat op zijn telefoon, er zijn kosten per gebruik, het werkt niet offline in de bergen, en een taalmodel kan zelfverzekerd iets verzinnen over bivakregels of zijn belasting. Wat hij in de praktijk zou vragen ("ik ben volgende week op vakantie", "hoe sta ik ervoor") is met een vakantieknop, de weekterugblik en het etappeplan deterministisch en beter te beantwoorden. Advies: nu niet bouwen, en pas heroverwegen als de reisplanner, het bivakprofiel en het etappeplan er staan.

### 11. Na de GR5

- **Wat.** Na terugkomst een herstelblok van twee tot vier weken dat de app zelf voorstelt (veel spierschade van een maand afdalen, en een lichaam dat een tekort heeft gehad), dan een terugblik op de hele reis: het verhaal uit idee 7, aangevuld met de dagen onderweg (die hij op de tocht met één zin per dag kan vastleggen, offline). Daarna de vraag "wat nu?", met een paar richtingen die bij hem passen: de marathon (die volgens het eerdere onderzoek logisch na de GR5 komt), een volgende lange tocht (het GR20 op Corsica, de Haute Route Pyrénées, de Via Alpina of het GR5 verder naar het noorden, richting huis), of een seizoen zonder groot doel met onderhoud van wat hij heeft opgebouwd.
- **Waarom.** Na een groot doel valt de structuur weg; een app die dan alleen "geen doel ingesteld" toont, verliest hem. Een partner voor jaren is een app die helpt kiezen en het verhaal bewaart.
- **Werk.** Klein voor het herstelblok en de vraag; het reisverhaal bouwt voort op idee 7.
- **Risico.** Laag.
- **Lokaal.** Ja.

## 4. Voorstel voor de eerste drie stappen

1. **Bivakprofiel en rugzakdoel rechtzetten (idee 1).** Het GR5-doel krijgt "tent, alleen", het rugzakdoel gaat naar 14 kg, het aantal dagen wordt een voorstel van 32 tot 35 met rustdagen, en de vier teksten die nu van hutten uitgaan (mijlpaal 11, de kennistekst over pakken, de weektip over slapen, het mentale onderwerp) krijgen een bivak- en solovariant. Klein, en daarna rekent alles wat al bestaat tegen het juiste doel.
2. **De reisplanner met de uitrustingslijst (idee 2 en 3).** Een eerste versie met de tijdlijn uit idee 2 als vaste data, één taak per week op Vandaag, en de voorbeeldpaklijst met gewichten uit 2b die hij kan aanpassen en afvinken. Dit is het stuk dat deze winter al nodig is, omdat de grote drie (tent, slaapzak, matje) nu gekozen moeten worden.
3. **Het eerste bivakweekend inplannen (idee 4).** Een sjabloon "bivakweekend" en de plekkenlijst bij Trainingsplekken, zodat in april een eerste nacht buiten via een voorstel in zijn schema staat. Daarna, in het voorjaar, het etappeplan (idee 5).

## 5. Wat hij zelf moet beslissen

1. Hoeveel dagen heb je echt? Dertig loopdagen zonder rustdag is met tent en 12 tot 15 kg krap; 32 tot 35 dagen met een rustdag per week is veiliger. Hoeveel verlof kun je krijgen, inclusief reisdagen?
2. Hoe streng is "grotendeels bivak"? Slaap je in de Vanoise ook op de bivakplekken bij refuges (reserveren), of neem je daar een paar nachten een hut of gîte? En wil je bij refuges eten om minder te dragen?
3. Hoofdroute of varianten? De GR55 door de hoge Vanoise en de GR52 naar Menton zijn mooier en hoger, maar de bivakregels en de bevoorrading zijn anders. Beslis je dat vooraf of onderweg?
4. Welke telefoon heb je, en wil je een satellietcommunicator kopen (rond 300 tot 400 euro plus abonnement) of vertrouw je op de satellietfunctie van je telefoon, als die die heeft?
5. Wie is je thuisfront, en wat spreek je met die persoon af over de dagelijkse check-in en wat er gebeurt als die uitblijft?
6. Welke uitrusting heb je al? Dan begint de paklijst bij jouw spullen in plaats van bij een voorbeeld.
7. Wil je de weekvraag en de momenten (idee 7 en 8), of liever alleen de cijfers? Een stoïcijnse vraag per week werkt alleen als jij hem prettig vindt.

## Bronnen

Route, seizoen, vervoer
- [FFRandonnée: La Grande Traversée des Alpes, GR 5](https://www.ffrandonnee.fr/s-informer/actualites/la-grande-traversee-des-alpes-gta-gr-5-une-aventure-a-vivre-a-pied-dans-les-alpes)
- [GTA: l'itinéraire par tronçons](https://www.grande-traversee-alpes.com/en/litineraire-par-troncons/)
- [GTA: tronçon 2, du Mont-Blanc à la Maurienne](https://www.grande-traversee-alpes.com/gr5-troncon-2-du-mont-blanc-maurienne/)
- [GTA: quand partir](https://www.grande-traversee-alpes.com/en/portfolio-item/periode-conseillee/)
- [GTA: les accès](https://www.grande-traversee-alpes.com/en/portfolio-item/les-transports/)
- [GTA: les hébergements](https://www.grande-traversee-alpes.com/en/portfolio-item/refuges-et-hebergements-2/)
- [Imperial College: GR5 trekking 2024](https://www.imperial.ac.uk/be-inspired/exploration-board/previous-expeditions/2020s/2024-france-gr5-trekking/)
- [areq.net: klimaat Briançon](https://areq.net/lang/fr/Brian%C3%A7on.html), [Climats et Voyages: Briançon](https://www.climatsetvoyages.com/climat/france/briancon), [partir.com: klimaat Alpen](https://www.partir.com/Alpes/quand-partir.html)

Bivakregels
- [FFRandonnée: le bivouac sur la GTA, GR 5 (oktober 2024)](https://www.ffrandonnee.fr/s-informer/actualites/le-bivouac-sur-la-grande-traversee-des-alpes-gr-5-gta)
- [FFRandonnée: bivak in het hart van de Vanoise (mei 2024)](https://www.ffrandonnee.fr/s-informer/actualites/le-bivouac-dans-le-cœur-du-parc-national-de-la-vanoise)
- [Brochure bivak Parc national de la Vanoise (2025)](https://www.savoie.fr/upload/docs/application/pdf/2025-06/brochure_bivouac_-_parc_national_de_la_vanoise.pdf.pdf)
- [Cirkwi: Refuge de Rosuel](https://www.cirkwi.com/fr/point-interet/966525-refuge-de-rosuel-pnv), [Outtrip: Refuge de la Martin](https://outtrip.fr/refuge-garde/refuge-de-la-martin)
- [FFRandonnée: bivak reserveren in de reservaten van de Haute-Savoie (augustus 2025)](https://www.ffrandonnee.fr/s-informer/actualites/reserver-sa-place-de-bivouac-c-est-dans-les-reserves-naturelles-de-haute-savoie), [reserveringssite](https://bivouac.nature-haute-savoie.fr)
- [Asters-CEN74: presentatie reglementering (2025)](https://www.biodiversite-auvergne-rhone-alpes.fr/wp-content/uploads/2025/04/8_2025-03-20-Presentation-AstersCEN74.pdf)
- [Haute-Savoie Tourisme: Lac d'Anterne](https://www.haute-savoie-tourisme.org/nature/itineraires-randonnees/5667450-montee-au-lac-d-anterne)
- [FFRandonnée: Queyras, harmonisatie van de regels](https://www.ffrandonnee.fr/s-informer/actualites/queyras-harmonisation-de-la-reglementation-des-espaces-naturels)
- [Parc national du Mercantour: folder 2022](https://www.mercantour-parcnational.fr/sites/mercantour-parcnational.fr/files/2023-11/plaquette%20FR%202022-05-13-VF-VD-light.pdf), [aanvraag kamperen in het hart](https://demarche.numerique.gouv.fr/commencer/demande-d-autorisation-de-campement-en-coeur-de-pa)
- [SAC: Campieren und Biwakieren](https://ascona-locarno.com/dam/jcr:964ca17a-0ddc-404f-93b7-a78dc2dc52b1/SAC_Campieren_Biwakieren_d.pdf), [DAV: Übernachten am Berg](https://www.alpenverein.de/uebernachten-am-berg)
- [Parc national de la Vanoise: pastorale bemiddelaars (2024)](https://vanoise-parcnational.fr/sites/vanoise-parcnational.fr/files/2024-07/CP%20PN%20Vanoise%20-%20Animateurs%20pastoraux%20en%20Maurienne.pdf)

Ervaringen, water, eten, gas
- [Chris Townsend: kamperen op de GR5](https://www.christownsendoutdoors.com/2018/10/camping-on-gr5-trail-through-french-alps.html), [eten op de GR5](https://www.christownsendoutdoors.com/2018/12/food-on-gr5-trail-through-alps.html)
- [randonner-leger.org: GR5 in autonomie](https://www.randonner-leger.org/forum/viewtopic.php?id=22334)
- [Gestalten: Wanderlust Alps, GR5](https://news.gestalten.com/sites/default/files/press/pdf/p.26-27_WanderlustAlps%2Cgestalten2021.pdf)
- [Backpacking Light forum: GR5](https://backpackinglight.com/forums/topic/69163/)
- [Bricomarché: gascartouche EN417](https://www.bricomarche.com/p/cartouche-de-gaz-450g-butane-propane-valve-7/16-en417-rechaud-bruleur-lampe-grill-alpen-camping/5903240385775), [Packstack: Campingaz CV300](https://www.packstack.io/reviews/cookware/campingaz-cv-300-plus-gas-cartridge)

Veiligheid en verzekering
- [Garmin: veiligheids- en volgfuncties](https://www8.garmin.com/manuals/webhelp/GUID-9D99A9D4-467A-4F1A-A0EA-023184FEA3DD/EN-US/GUID-64F677A5-03E0-453F-BFE3-E1B93D6FA3FC.html)
- [Garmin Italië: kosten inReach](https://www.garmin.com/it-IT/blog/sicurezza-costi-abbonamento-garmin-inreach/), [GPS Training UK: nieuwe abonnementen juni 2025](https://gpstraining.co.uk/blogs/news/garmin-simplifies-inreach-subscription-plans-june-2025-update)
- [Presse-citron: kosten bergredding in Frankrijk](https://www.presse-citron.net/appeler-les-secours-en-montagne-frais/)
- [Consumentenbond: bergwandelen niet altijd verzekerd](https://www.consumentenbond.nl/reisverzekering/bergwandelen-niet-altijd-verzekerd), [In de bergen: alles over de NKBV](https://www.indebergen.nl/weblog/54439-alles-over-de-nkbv/)

Testen dicht bij huis
- [Kampeermeneer: paalkamperen](https://www.kampeermeneer.nl/paalkamperen/), [OpenStreetMap-forum: paalkamperen](https://community.openstreetmap.org/t/paalkamperen/90067)
- [Camplinq: Natuurcampeerterrein Beek en Hei](https://camplinq.com/nl/campings/natuurcampeerterrein-beek-en-hei)
- [Stad Gent: bivakzones in Vlaanderen (2025)](https://raadpleegomgeving.stad.gent/document/67e3d5ca3874474f7dff9a56), [Natuur en Bos: bivakzones Haspengouw](https://natuurenbos.be/sites/default/files/2023-06/Bivakzones_in_Haspengouw.pdf)
- [RTBF: bivakzones in Wallonië](https://www.rtbf.be/article/se-balader-en-foret-ou-en-pleine-nature-sans-faux-pas-11691721), [Botrange: bivakzone Bergerie](https://botrange.be/en/bivouacs/area-b-bergerie/)
- [Eifel Tourismus: trekkingplekken](https://www.eifel.info/en/book/trekking-sites), [Nordeifel Tourismus: Eifel trekking](https://www.nordeifel-tourismus.de/en/activities/eifel-trekking)

Motivatie en gedrag
- [Gollwitzer en Sheeran 2006: implementatie-intenties, meta-analyse](https://doi.org/10.1016/S0065-2601(06)38002-1)
- [Teixeira e.a. 2012: zelfdeterminatietheorie en bewegen](https://doi.org/10.1186/1479-5868-9-78)
- [Deci, Koestner en Ryan 1999: beloningen en intrinsieke motivatie](https://doi.org/10.1037/0033-2909.125.6.627)
- [Amabile en Kramer 2011: The power of small wins](https://hbr.org/2011/05/the-power-of-small-wins)
- [Silverman en Barasch 2023: gebroken reeksen](https://doi.org/10.1093/jcr/ucac029)
- [Dai, Milkman en Riis 2014: het fresh-start-effect](https://doi.org/10.1287/mnsc.2014.1901)
- [Kivetz, Urminsky en Zheng 2006: het doelgradiënteffect](https://doi.org/10.1509/jmkr.43.1.39)
- [Klein 2007: de pre-mortem](https://hbr.org/2007/09/performing-a-project-premortem)
- [WHOOP: weekly performance assessment](https://whoop.com/thelocker/new-feature-weekly-performance-assessment), [Oura: week- en maandrapporten](https://support.ouraring.com/hc/lv/articles/360046061373), [Runna: holiday mode](https://intercom.help/runna/en/articles/10225691-what-is-holiday-mode), [Tom's Guide: Runna "Not feeling 100%"](https://www.tomsguide.com/wellness/fitness/im-deep-into-marathon-training-fighting-the-flu-and-runnas-new-not-feeling-100-percent-tool-couldnt-be-more-timely)

Eerder onderzoek in deze repo
- `docs/onderzoek/Aanvullend onderzoek GR5 voorbereiding.md` (hoogte, hitte, eten, voeten, stokken, rugzak, regels B1 tot B8)
