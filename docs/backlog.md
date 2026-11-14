# Backlog

Wat nog op de lijst staat, zodat een nieuwe sessie het niet uit het gesprek hoeft te halen. De
coördinator houdt dit bij: iets wat live staat gaat eruit, iets nieuws komt erbij met een regel uitleg.
Opnieuw opgebouwd op 11 november 2026 tegen main (2a333d5): alles wat live staat is eruit, wat eruit ging
en waarom staat in `docs/onderhoud/2026-11-11-backlog-opnieuw.md`. De geschiedenis staat in git en in
`docs/beslissingen/`.

## Inbox

- StairMaster en wandelen naar het horloge (eigenaar 14 november, schermafdrukken van intervals.icu): intervals.icu kent alleen Fietsen, Hardlopen, Zwemmen en Andere; wandelen valt onder Andere, en daar zijn geen eigen hartslagzones zichtbaar. Een workout met doelen in zones heeft dan geen goede maat. Stuur doelen voor wandelen en StairMaster als vaste slagen per minuut (afgeleid van de hardloopzones), niet als zone; zeg in de Briefing welke bpm. Opus, Warden Sonnet. Geen hartslagwaarden van de eigenaar in tests of docs.
- Routes op reis ((1) en (2) live 14 november, 19f4f22; (3) open) (eigenaar 14 november, in het buitenland, twee schermafdrukken): (1) moet: lukt de precieze plek niet, dan zegt de app "De lus begint bij Thuis" en zoekt een lus bij Thuis, ook als je ver weg bent; nooit stil terugvallen op een Thuis die ver weg kan zijn: vraag "Je plek lukte niet. Opnieuw, Thuis of Andere plek?" zonder te zoeken; (2) moet: de time-out zegt niet welke stap het was en niet of je offline bent; zeg de stap (plek, heuvels en paden, lussen) en bij `navigator.onLine === false` "Je hebt geen verbinding"; (3) nagaan: de routeplanners antwoorden vanaf hier in Portugal binnen een seconde (BRouter, Valhalla, 14 november), dus waarschijnlijk zwak bereik met meerdere aanvragen na elkaar binnen de grens van 30 s; overweeg minder aanvragen of de grens per stap. Opus, Warden Fable (zelfde bestanden als Route-kaart vervolg: na die branch).
- Klein deel 2, rest (Pathfinder en Warden 14 november, mag): op het oude trainingsscherm (`ExerciseLogger.tsx:443` en `:465`) is "Waarom deze training" naast "Gedaan, invullen" op 360 px waarschijnlijk te breed (op 412 past het net); bekijken en zo nodig de knoppen laten verdelen; het onderblad Zelf nabouwen in Je horloge heeft nog eyebrow "Uitleg" (`WatchSheet.tsx:109`), advies "Je horloge"; de scan in `infoBlad.scan.test.ts` zoekt het einde van het blok met `indexOf(')}')`, een ankertekst is steviger. Klein.
- Profielendoorloop 14 november (verslagen in `docs/profielen/2026-11-14-*.md` op de branches `claude/profiel-*`; vier van vijf binnen, ziek-vakantie loopt). Moet, gegroepeerd, in volgorde van bouwen:
  - A. Je dag noemt de geplande duur, de kaart de gelogde (beginner 2, hardloper 6, dwarsligger 2): overal de duur van het log. Klein, Opus.
  - B. Duur 0 of negatief wordt stil een log van 0 min en telt als gedaan (dwarsligger): Opslaan uit onder 1 minuut of eerst vragen. Klein, Opus.
  - C. Een training met 2 van 23 sets krijgt "Gedaan zoals gepland" en de weekterugblik "Alles gedaan" (beginner 3): oordeel naar wat er gebeurde. Klein, Opus.
  - D. Eén plan: het eerste voorstel noemt een herstelwandeling die daarna nergens staat en 2 keer kracht bij 1 in het plan (beginner 1, GR5 7); Vandaag, Week en de weekbalk noemen verschillende trainingen (hardloper 1); het voorstel Deze week nog een keer? noemt 60, 55 en 50 min voor dezelfde loop (GR5 5); na een zware test "je benen zijn dan fris" naast "rustig houden" (hardloper 2). Planner, Opus met Warden op Fable; eerst naspelen.
  - E. De taperweek en de racedag beschermen tegen inhaaladvies, en Nog open ouder dan een week weg (hardloper 3, 4, 7; GR5 9: twee kaarten voor gemist met andere woorden). Planner, Opus, Warden Fable.
  - F. Tempoloop: de kaart zegt "hele zinnen praten", de Briefing "korte zinnen" (hardloper 5). Klein.
  - G. Reisplanner begint in juli met taken uit het verleden; doelkop zegt hutten, paklijst is bivak voor augustus bij start in maart (GR5 1, 2). Opus.
  - H. Beginner: "de eerste vier weken alleen makkelijk" maar week 1 heeft 75 min kracht met 23 sets en een lange loop van 60 min; vaktaal (RIR, RPE, Zone 2, Voorschrift) zonder uitleg (beginner 4, 5). Eerst Cartographer en Scout op Fable, dan planner.
  - I. De chip "Zwaarte volgens MacroFactor" en "Nog geen krachttrainingen ingelezen uit MacroFactor" zonder koppeling (beginner 6, GR5 11): alleen met koppeling. Klein.
  - J. Tikdoelen: Jaaroverzicht 38 px breed, Forge 32 en 24 px (GR5 3, 4); de start: vraagnummer verspringt en een dubbele tik op Volgende slaat een vraag over (dwarsligger). Klein.
  - K. Na ziekte en een vakantieweek springt het plan naar een volle week (bergtocht 165 min, laatste loop 33 min) en loopt het blok door alsof alles gedaan is (ziek-vakantie 1): een rustiger instap of het blok verschuiven, via een voorstel met Akkoord. Planner, Opus, Warden Fable.
  - L. Een zelf gemelde vakantie heet daarna "bleef liggen" en "0 van 5" met een advies Deze week nog een keer?; bij een ziekmelding of vakantie blijven oude Niet gedaan?-vragen en een gemiste bergtocht staan (ziek-vakantie 2, 3). Samen met E bouwen.
  - M. Sport uit Losse training werd als hardlopen bewaard (meerdere sporten 1): voor nieuwe logs hersteld op 14 november (manualLog.ts draagt countedSport en customSport mee). Open: oude logs met `templateId` `sport_*` zonder `countedSport` tellen nog als hardlopen; een herstelstap die alleen bij het lezen de sport afleidt uit het templateId (geen log herschrijven), met test. Daarnaast: zwemmen, padel en voetbal niet te kiezen zonder eerst een rol in Instellingen (2); na zo'n sport passen aanmoediging, kleding- en zweetvragen niet (3, 4); een voorstel na een zware sport verdwijnt de volgende ochtend zonder keuze (10); een sessieduur verandert zonder voorstel (9). Opus, Warden Fable voor 9 en 10.
  - N. Starter en afbreker: een begonnen, niet afgeronde training is voor de planning onzichtbaar ("blijven liggen", "vervalt" en "Niet gedaan?" naast een pil die dagen doorloopt); direct Afronden geeft 75 minuten "Gedaan zoals gepland" (deels in C); een vergeten lopende sessie blokkeert de volgende dag zonder uitweg. Opus.
  - O. Horloge: een horlogelog wordt niet aan duur en intensiteit getoetst (te kort krijgt "zoals gepland", hard wordt "rustig", een wandeling wordt een duurloop); bij twee activiteiten op één dag kiest de kaart de nieuwste; de koppelkaart achteraf weet niets van de grootte van de loop. Opus, Warden Fable.
  - P. Routes (eigenaar 14 november, schermafdruk): een route "1 × de helling op en af" tekende een Y met twee doodlopende takken; een route met meer dan één doodlopend stuk heet anders of valt af; grote wegen en knooppunten van snelwegen vermijden bij lopen; bij heuvelintervallen het stuk voor de herhalingen op de kaart ("hier 6 keer op"). Na Route-kaart vervolg.
  - Q. (kracht uit: ja, met waarschuwing, besluit `2026-11-14-keuzes-avond.md`) Instellingen (profiel instellingen): moet: "Alles terug naar het advies" verandert lengtes in de planning zonder voorstel en zegt "hoeft niet te veranderen" (tegen de harde regel: planning alleen via een voorstel met Akkoord). Verder: het zoekveld toont bij 189 van 281 instellingen de waarde van de rij eromheen in plaats van de eigen waarde; een antwoord uit de start telt als aangepaste instelling; kracht uitzetten kan nergens. Planner-deel: Opus, Warden Fable.
  - M2. Na Oude sportlogs (Warden 14 november, mag): `sportDays.ts:48`, `weekConcerns.ts:105` en `weekValidator.ts:419` lezen `countedSport` nog kaal; laat ze `sportOfLog(log)` lezen. Verandert wanneer de melding over benen tussen sporten komt, dus eigen change met tests en een planGolden-controle. Planner, Opus, Warden Fable.
  - R. De dag na een race (Warden planner 14 november): MISSED-CATCH-UP voor een training uit de afbouw en de vraag Niet gedaan? komen nog; de week na een race is herstel. Planner, na planner-gemist.
  Mag: zie de verslagen (back-upkaart op dag 1, dubbele zin na afronden, Kies je plaats landt op Weer en kleding, 0 km voor onbekend, afronding van weken).
- Samen 14 november, rest (Lookout, Pathfinder en Sherpa Opslaan, mag): het oude trainingsscherm (`ExerciseLogger.tsx`) toont bij een losse training nog de wachtzin zonder uitweg; de wachtzin bij opslaan is lang voor 360 px (Lookout zag hem niet live); de uitleg van "Vragen na je loop" zegt dat de rij na 72 uur verdwijnt; Forge heeft kleine tikdoelen (afvinkvakjes 32 px, Voorschrift 24 px, Toon vorige keer 16 px hoog, i-icoontjes 20 px), nagaan of dat al op main stond; een bron geruild voor een oefening op hetzelfde patroon geeft een gewone opwarmset in plaats van een gedempte (zin in het besluit); `src/engine/warmupLater` in de testregel van `docs/werkbriefjes/forge.md`. Klein.
- Les samenvoegen (14 november): twee branches die elk groen zijn, kunnen samen stuk gaan zonder conflict (`question` weg in de ene, gelezen in de andere; Vandaag crashte). Altijd tsc op de proefmerge, voor Lookout.
- Opslaan, rest van de rest (Sherpa Opslaan rest, 14 november, branch `claude/opslaan-rest`, besluit `2026-11-14-opslaan-rest.md`; mag): het oude trainingsscherm (`ExerciseLogger.tsx`) heeft nog bronscans in plaats van gedragstests; de sportvraag telt tijdens zijn sluitanimatie nog als in beeld; Today en Week lezen het antwoord van een afgevinkte rustdag of krachttraining niet; het blad Hoe ging het? toont bij "stond er al" de zin voor mislukt.
- Hoogtemeters, na stap 1, rest (Warden 14 november): de bodem van 20 m naspelen met de zes vlakke lopen uit het onderzoek (skill `naspelen`, back-up nodig): verliest een nieuw vlak log met eigen telling ruim boven het horloge (57 tegen 33 m) zijn horlogegetal en daarmee zijn oude vergelijkbare lopen? Zo ja, de bodem in m per km tegen `SIMILAR_CLIMB_M_PER_KM`. Een test voor de bodem in `aerobicTrend.ts#climbPerKm` (mutatie bleef groen); `runMetrics` leidt het horlogegetal af uit een afgerond percentage, de andere twee lezen het log; `aerobicTrend.ts:234` geeft 0 door waar `undefined` bedoeld is; `HILLY_M_PER_KM` en de terugval in `aerobicTrend` lezen het merk nog niet; stap 2: `places.ts#routeLine` en `proposalFacts` gelijktrekken.
- Verborgen schermen, rest (Pathfinder 12 en 14 november): ontwerp later: na een loop zes tot acht lagen (Debrief, CompletionMoment, RunInsight, RunDetail, WatchActivity, LogDetail, DaySheet) naar één moment; groep Gidsen uit het tandwiel naar ingangen op hun moment; Forge-instellingen tijdens het trainen in een blad; instellingen samenvoegen per onderwerp; Alleen onderweg samen met Als het misgaat. Mag: een trekdoel dat geen hoofddoel is krijgt geen Reis-regel (`useJourney.ts:30` neemt de datum van het hoofddoel; ook nagaan of de Reisplanner dan een verkeerde afteldatum toont); de regel op Etappes "Nog geen tocht om mee te vergelijken" wordt "Nog geen gelopen dag om mee te vergelijken"; telt een gepauzeerd of afgerond trekdoel mee in `hasTrekGoal`; de Kennisbank toont zonder doel "De GR5 in etappes" en "Je rugzak pakken" (les van de week nagaan).
- Grens van intervals.icu meten (Warden 14 november, mag): kop en inhoud delen nu één grens van 15 s; meet met een vertraagde lijn en een lange activiteit of een groot antwoord dan nog binnenkomt. Een herstelstap die elke start faalt staat alleen in de console (teller in meta voor de diagnose?).
- Kleding en wind, vervolg (Pathfinder en Warden 13 november, mag): de windgrens van de weerzin (15 km/u, 2 graden gevoel) en die van het windjack (25 km/u) en de warmtebonus van de lange duurloop toetsen aan bronnen met een korte Scout; staat Weer uit en Kledingadvies aan, dan noemt de kledingzin de wind niet (`briefing.ts` rij Weer, `ClothingAdvice.tsx`, `eveningBefore.ts`); een zin na een tik tegen de bestaande richting in leest vreemd (`feedbackSentence`).
- Weer van de plek, rest (Pathfinder en Lookout 13 november, mag): De avond ervoor kent de plek niet (eigen besluit nodig); een cache per plek; de pagina rekent de duur met `resolveEffectiveFullDuration` en de Briefing met de minuten van de rij, bij een aangepaste duur kan de kop verschillen (duur meegeven in `WeatherPageLink`); "Nu verversen" in Je plaats ververst thuis, niet de plek; Terug vanaf de pagina Weer komt op Week uit, niet op de Briefing (al zo voor deze wijziging, `TrainingBriefing.toPage`).
- Audit 13 november (Warden met ponytail-audit, `docs/onderzoek/Ponytail en Graphify.md`), nog open na Sherpa Opstarten: een import schrijft alle logs terug uit een kopie (`backupApply.ts:125`, `backupMerge.ts:118`; alleen nieuwe of gewijzigde rijen schrijven); `SettingsRepo.set` en twee andere set-functies lezen en schrijven in losse transacties; `loadState` zonder volgnummer; dubbele mijlpaalregels bij twee schrijvers (vast id); `wipeAllData` en `resetToDemoData` lopen uiteen en zijn niet atomair; vier kopieën van dezelfde stringhash. Eerst zelf naspelen voor een bouwer.







Wat de eigenaar tussendoor meldt, voor het volgende bouwmoment (maandag, woensdag, vrijdag; skill `bouwmoment`).
Vast punt, elk bouwmoment: na de punten hieronder de eerstvolgende open ronde uit het rooster hieronder. Een opmerking over hetzelfde komt bij het bestaande punt. Meteen, tussendoor: iets dat nu stuk is (de app werkt niet, verkeerde getallen in je training, data die verloren kan gaan) en kleine fixes die de coördinator zelf in een paar minuten doet, zonder helper (een tekst, een regel, een getal). De rest gaat in de Inbox.

Leeg: alles van 11 november staat in de Bouwrij hieronder, die de coördinator deze week zelf bouwt.

## Bouwrij deze week (coördinator, tot en met 15 november)

Het bouwmoment slaat deze rij en het rooster over: de coördinator start de bouwers zelf, hoogstens drie tegelijk, nooit twee aan dezelfde bestanden, model volgens skill werkverdeling "Deze week". Volgorde is de volgorde van starten zodra er plek is.

- Zonder "ASCEND doet" (eigenaar 14 november, besluit `2026-11-14-zonder-ascend-als-onderwerp.md`, gekozen: feit zonder onderwerp, na planner en horloge): eerst een invariant in de tekstkaart die "ASCEND" plus werkwoord in schermtekst telt en alleen mag dalen; dan drie rondes (Vandaag en Briefing; Week en Stand; Instellingen en de rest). Opus, Pathfinder per ronde, Lookout op 360 px voor regellengte. Uitzonderingen: toestemmingen van de telefoon, de map ASCEND, het merk.
- Instellingen op één plek (eigenaar 14 november: "Allebei"): elke instelling staat nu in vijf bestanden (settingsIndex, settingsLayout, settingsSummary, settingsHelp, een groepspagina) en dat zijn de bestanden met de meeste conflicten. Eén verklaring per instelling (id, titel, groep, uitleg, advies, samenvatting) waaruit de andere vormen worden afgeleid; geen gedrag of tekst verandert; de tekstkaart blijft gelijk. Eerst Cartographer of Scout op Fable voor de vorm, dan bouwen op Opus, Warden Fable. Een tijdstip zonder andere bouwers aan instellingen.
- Plekken en routes (spoor 1 en 2 live, 7079480 en 073080f; Andere plek met zoeken op naam live, 1af978e en Photon 41587a4; de rest open) (besluit `2026-11-11-plekken-en-routes.md`, eigenaar "Ja go" 11 november): na Briefing 5 en 6. Sporen volgen uit `docs/visie/Ontwerp Plekken en routes.md`; antwoorden van de eigenaar in `2026-11-11-plekken-antwoorden.md` (afstand hangt af van de training: 75 km, korter dan 90 min hoogstens 25 km). Eerst Plekken als opgeslagen vorm met migratie (Vast punt wordt Thuis), export en import, op Fable; dan route bewaren; dan plek voorstellen in de Briefing; dan Nieuwe plek vooraf (zoeken op plaatsnaam, pin op de kaart met tegels). Garmin vooraf: `docs/onderzoek/Garmin koers vooraf klaarzetten.md`. Niet door het bouwmoment. Na spoor 1 (Warden 11 november), voor spoor 2 en 3: het voorbeeld van een import noemt plekken; Wis startpunt vraagt eerst als Thuis routes heeft, al voor spoor 2 routes laat bewaren.
- Zoeken op de kaart en avontuurlijke plekken (zoeken op naam live, 1af978e en 41587a4; avontuurlijke plekken open) (eigenaar 11 november avond): een plek intypen of zoeken (spoor 7 van Plekken, `integrations/openMeteo.ts#searchPlaces`, naar voren halen na de startkeuzes), en voorstellen van heuvels, bossen en natuurgebieden binnen de afstand van de training (25 of 75 km). Geen eigen lijst: die veroudert en dekt alleen wat iemand intypte. Bron: OpenStreetMap via Overpass (al in gebruik bij heuvels en paden) plus hoogtetegels voor hoogtemeters, met één zin waarom de plek past. Scout eerst: welke OSM-kenmerken (natural=peak, ridge, wood, boundary=protected_area, leisure=nature_reserve, route=hiking), grenzen van Overpass, en hoe het in Nederland werkt waar toppen laag zijn. Daarna ontwerp met Pathfinder, dan bouwen. Geen plaatsnamen van de eigenaar in tests of docs. Scout klaar (12 november, `docs/onderzoek/Avontuurlijke plekken uit OpenStreetMap.md`): de app heeft geen hoogtetegels, dus reliëf via één Open-Meteo-aanroep; alleen benoemde toppen, uitzichtpunten en natuurgebieden; hoogstens drie voorstellen; startpunt pas na een tik. Eerst ijken van de grove hoogtemetermaat tegen bewaarde routes en een proefaanroep (tijdgrens, CORS van de tweede server). Zoeken op naam bouwt Sherpa Zoeken op naam nu.
- De avond ervoor, plek (Sherpa 14 november, advies): de kaart direct onder de missie op de avond; eigen besluit van de coördinator. Klein.
- Spieren voor de berg, rest (Warden 14 november, mag): één dag verlof haalt de hele week weg, ook als er die week getraind is (noemen of een week met krachtwerk laten meetellen); de doorgifte van `leave` in `ForgeMenus.tsx` aan Ruilen bewaken met een test. Klein.
- Spieren voor de berg: tekeningen voor de vier evenwichtsoefeningen; een test op de Forge-weergave van een houding met reps 4-6; Ruilen zegt "de laatste vier weken" ook als er door een rustweek of vakantie minder weken meetelden (`swapReason`). Klein.
- Kansen 11 november, door de eigenaar gekozen (alle met het advies; bronnen in `docs/visie/Kansen 11 november app.md` en `docs/onderzoek/Kansen 11 november training.md`):
  - Vaste ijktocht elke zes tot acht weken als kompas voor de berg, inplannen via Akkoord. Planning, Fable.
  - De beenindex leert van je ochtendantwoorden (`learning.ts#indexChecks`), begrensd, veiligheidsregels nooit soepeler, met migratiestap. Fable.
  - Routes ook voor wandelen en rugzaktraining, met klimtempo. Na de twee route-bouwers. Opus, engine op Fable.
- Vervallen door de Briefing (spoor 7), alleen nog als bron: Info-blad spoor 3 en 4: Uitleg opschonen (De stappen eruit, namen gelijk: "Meer over deze training" en de i), daarna Datavelden bekijken naar Gidsen. Plus van Warden: de rij Je horloge op Vandaag met de stand eronder zoals in Week; garmin in useWatchSheet zelf ophalen in plaats van buildWorkoutPlan in drie componenten. Opus.
- Back-up kleiner zonder dataverlies (eigenaar 12 november): 2,5 MB, waarvan ongeveer 0,7 MB alleen inspringing. Van de inhoud is 49 procent horlogedata per seconde (nodig voor Run in detail), 21 procent logs, 20 procent voorstellen: 186 stuks, waarvan 88 weekcontroles zonder wijziging, en de uitleg is 22 vaste teksten die bij elk voorstel opnieuw staan. Richting: vaste teksten als sleutel bewaren en bij tonen invullen, weekcontroles zonder wijziging samenvatten (naspelen gebruikt ze, dus een teller per dag behouden), inspringing van de horlogereeksen weg, rest leesbaar. Eisen: migratiestap, elke oude back-up blijft te importeren, een test die een back-up heen en terug zet en alles van de gebruiker gelijk vindt, vooraf naspelen met de back-up van de eigenaar. Fable voor opslag, Warden op fable.
- Hoogtemeters met precisie (eigenaar 12 november, `docs/onderzoek/Hoogtemeters met precisie.md`). Stap 1 live op 12 november (zie Pas live). Stap 1 was: één teller voor plan en log met echte hysterese (`routeGeometry.ts#ascentOf` en `activityDetail.ts#deadBand` verliezen een drempel per klim), drempel per bron (horloge 2 m, Lidar 2 m na gladmaken, model van 30 m 5 m, bergen 10 m), onder ongeveer 40 m "vrijwel vlak"; test met nagemaakte reeksen en naspelen met de zes lopen uit de back-up (Garmin samen 132 m). Stap 2: proef met de tegels van Mapterhorn (CORS in PWA en Android, zuiver uitlezen) en PDOK, één bekende heuvellus naast het horloge. Stap 3: ijking per log (model en horloge als twee getallen), marge in de tekst. Stap 4: plekken rangschikken met één tegel, getal pas na een echte lus. Instelling (eigenaar 12 november, hij zag een paar keer te kort plannen): "Hoogtemeters bij twijfel" met Liever iets meer (standaard), Zo precies mogelijk, Liever iets minder; Liever iets meer kiest een lus waarvan de onderkant van de marge het doel haalt, hoogstens 10 procent boven het doel; verandert alleen de keuze van de lus, niet de planning of de weekbelasting. Pas na stap 1, zodat de marge geen telfout verstopt. Elke stap een besluit; de planning verandert alleen via een voorstel.
- Trainingsscherm en ontwerpregels (sporen 1 tot 4 live, 86be2a9; Route-blok 7fa66cc; Briefing per manier 540d0de; de rest open) (besluit `2026-11-12-trainingsscherm-en-ontwerpregels.md`, ontwerp `docs/visie/Ontwerp trainingsscherm minimaal.md`): sporen 1 tot 4 zodra Andere plek op main staat (zelfde bestanden van de Briefing), spoor 5 en 6 na Je dag, 7 tot 9 daarna, spoor 10 per regel met eigen besluit. Daarna Je week tot nu (Cartographer bezig) en dan Week, Stand en Logboek met dezelfde regels.
- Je week tot nu, spoor 6 (later volgens het ontwerp; sporen 1 tot 5 live, ab5294d): een tik op een dag in de strip opent die training (`WeekStrip.tsx` heeft nog geen tik).
- Lookout-kit (14 november): de stand kracht begint niet meer rustig; er verschijnt "Weekplanning bijgewerkt" over de afdrukken. Standen opnieuw maken met `npm run kaart:standen`.
- Week minimaal (spoor 1 tot 6 live, 2eaa81d en 2eda701; Stand live, 26c0816 en 39baf86; Ascend en Logboek open) (besluit `2026-11-12-week-minimaal.md`, ontwerp `docs/visie/Ontwerp Week minimaal.md`): spoor 2 en 3 na `claude/week-na-gemiste-dagen`; eerst een `changeLog.test.ts`; de volle week als punt in `weekConcerns` met een amber stip op de dag (nu een losse regel), en een kop Let op zonder knop niet meer laten beloven dan hij is (Pathfinder Volle week). Stand (besluit `2026-11-12-stand-minimaal.md`, zeven sporen; spoor 3 na zone 2 op main, spoor 6 na Je dag, spoor 5 eerst Forge nakijken) en daarna Ascend en Logboek in dezelfde lijn.


## Rooster voor de bouwmomenten

Deze week (tot en met 15 november) bouwt de coördinator het rooster zelf; het bouwmoment slaat het over. Per bouwmoment eerst de Inbox, daarna de volgende ronde hieronder. Een ronde heeft tot drie sporen die elkaars bestanden niet raken; ze lopen tegelijk, elk met een eigen helper in een eigen worktree, en gaan samen in één keer naar main. Nooit twee Forge-sporen tegelijk (zelfde bestanden), nooit twee planner-sporen tegelijk. Afgerond: uit dit rooster en uit de groepen hieronder, met een regel onder Pas live.

1. Buiten: UV en hoogte van je plek (Licht tot is live, `weather.ts#daylightPhrase`).
2. Voorstel squat op één been en L-sit (planner) ‖ Uitleg bij oefeningen, batch 5 (Forge-data).
3. Feestdagen als voorstel (planner) ‖ Forge herinrichting, de rest.
4. Klein en fouten, deel 2 (Forge en Calisthenics) ‖ R10, de teksten van Forge.

## Pas live
- Avond 14 november (Portugese tijd): route bijsturen, UV en hoogte buiten, korte training eerlijk benoemd (e99104c); een losse sport telt nooit meer als hardlopen, ook oude logs bij het lezen (9f0b971, 2ee2f6f); geen stille Thuis: lukt je plek niet, dan een vraag (19f4f22). Profielen klein (A, B, C, F, I, J-start) in e99104c.

- Klein deel 2 (14 november): Volle week zegt "2 dagen met elk twee trainingen", telt "Nog n voorstel(len) open" en een gedane training krijgt geen stip; het blad heet overal "Waarom deze training"; de rij Racedag blijft onder de ochtendvraag (besluit `2026-11-14-racedag-plek-en-weer.md`).
- Samen 14 november 17:25 (52e607e): Opwarmset later volgt wat je afvinkte; Hoe ging het? bovenaan Je dag na een vanzelf afgevinkte training; een losse training nooit twee keer gelogd.
- Klein 14 november (branch `claude/klein-14-nov`): de sleuteltrainingen in één zin met één "of"; de cache van heuvels leest en schrijft in één wachtrij, zodat een gewist startpunt niet terugkomt; beide voorstellen van de krachtwizard met de knop Akkoord en de vaste voorstelzin. Besluit `2026-11-14-sleuteltraining-terugkijken.md`.
- Voorstel begrijpelijk (14 november, eigenaar: "ik snap echt niet wat we hier mee bedoelen"): het voorstel van Spieren voor de berg in de weekterugblik en in Forge zegt de oefening met Nederlandse naam, wat je doet, waarom in één zin en wat Akkoord doet; "evenwichtsoefening" in plaats van "werk op één been"; wat niet meetelde per rij achter de i; niet gekoppelde sets op het scherm; "In Forge heet hij ..." als de naam verschilt. Besluit `2026-11-14-voorstel-begrijpelijk.md`.
- Nee van logSession (14 november): bij een mislukte of trage opslag houden het oude trainingsscherm, het blad Hoe ging het?, de kaart Van je horloge en de sportvraag je invoer en zeggen één zin; dezelfde activiteit wordt nooit twee keer gelogd; is het scherm weg, dan komt de melding bovenin. Besluit `2026-11-14-nee-van-logsession.md`.
- Efficiëntie-blad (14 november): niet gebouwd naar main; de rij Efficiëntie staat sinds 12 november niet meer op Je stand (commit 26c08167), de weekgrafiek staat op de kaart Tempo bij zone 2. Branch `claude/efficientie-blad` blijft liggen.
- Hoogtemeters na stap 1 (14 november): elk oordeel over tempo, loopvorm en vergelijkbare lopen leest het merk van de teller; het horlogegetal geldt pas niet als het buiten 60 tot 140 procent en 20 m of meer afwijkt. Besluit `2026-11-14-hoogtemeters-na-stap-1.md`.
- Verborgen schermen (14 november): tochtschermen, Reis-regel en zoekresultaten alleen met een trekdoel; geen valse belofte in de Kennisbank; AdventureCard, LessonCard en Soon weg; laadfout offline in het Nederlands. Besluit `2026-11-14-verborgen-schermen.md`.
- Opstarten en intervals.icu (14 november): de grens van 15 s geldt tot het antwoord gelezen is; een herstelstap die een fout gooit wordt alleen zelf overgeslagen, opruimen wacht als samenvoegen mislukte. Besluit `2026-11-14-opstarten-en-intervals-grens.md`.
- Kleding en wind (13 november): de weerzin en de rij Weer in de Briefing noemen gevoel en wind vanaf 15 km/u; de eerste tik Te koud of Te warm is een graad, daarna een halve, met een zin wat er verandert. Besluit `2026-11-13-kleding-en-wind.md`.
- Weer van de plek, vervolg (13 november): een tik op de rij Weer in de Briefing opent de pagina Weer met het weer van de gekozen plek. Besluit `2026-11-13-weer-van-de-plek-pagina.md`.

Opgeschoond 13 november (coördinator, elk punt met een commit op main nagegaan): Briefing per manier (540d0de); Week na gemiste dagen, vragen met advies (0e73e48); Tempo bij zone 2, stip per week en eindlabel bij de stip (edfa8a9); Missiekaart, hoogstens twee kaarten boven de missie (5f5b528); Route voorstellen, Start bij en laadbalk (ff18625); Luchtfoto op de kaart (834918e); Forge kern zichtbaar, RIR en Verloop van de training (10ff510, ada4fc3); Rusttimer, nieuwe geluiden (374625a); Afdaalklok (besluit 2026-11-11-afdaalklok); Missiekaart (5f5b528); Stand opgeschoond (39baf86); Je week tot nu, weeklabel met de fase voorop (ab5294d); Wat ASCEND aanpaste heeft één thuis in Week (2eaa81d).

Opgeschoond 14 november (coördinator): de regels van 11 en 12 november staan in de git-geschiedenis van dit bestand; nog open daaruit: StairMaster op het horloge (eigenaar: staat de workout bij Wandelen, en welke zones heeft Wandelen in intervals.icu) en Photon in de browser nog niet gezien.

## De Briefing (eigenaar akkoord 11 november, besluit `2026-11-11-briefing.md`)

Elf sporen uit `docs/visie/Ontwerp Route en trainingsscherm.md`, hoofdstuk 7, allemaal Opus, geen planning. Volgorde:
- Live 11 november: spoor 1, 3 en 4 (Briefing A).
- Live 11 november: spoor 2 (het blad Route met de kaart bovenaan).
- Live 11 november: spoor 5 en 6 (scherm Briefing, knop Briefing op Vandaag en in Week).
- Daarna spoor 7 (namen gelijk, Waarom deze training, het dubbele weg), 8 (past het best), 9 (de lus onthouden tot middernacht), 10 (hoogteprofiel), 11 (wandelen en rugzak).
- Het oude Info-blad spoor 3 en 4 vervallen: spoor 7 hier vervangt ze.

## Werkwijze (onderzoek autonome agents, 11 november)

- Proefversie per branch die de eigenaar op zijn telefoon kan openen vóór main: een debug-APK met `applicationIdSuffix` en eigen opslag, via de Android-workflow per branch. Native: eerst een proefbouw. Opus.
- Een Stop-hook die een bouwer pas laat stoppen als tsc en de gerichte tests groen zijn (instellingen van Claude Code: alleen met akkoord van de eigenaar).

## Samenhang (Pathfinder)

- Hoe ging het? spoor 6 gebouwd op `claude/trainingsscherm-5-6` (besluit `2026-11-14-hoe-ging-het-horloge.md`): een rij in Je dag en het blad `WatchAskSheet` met dezelfde vragen; nog open is `SportFeltBlock` en Hoe ging het? vanuit het Logboek (derde ingang van regel 7), eigen spoor.
- Andere plek (Pathfinder, mag): de terugknop van Je plekken gaat naar Vandaag en meldingen, niet terug naar het blad Weer en kleding; het blad weer openen of de rij een gewone ingang maken.
- Andere plek (Pathfinder, mag): Thuis wissen kan bij Wis startpunt en op Je plekken; later Wis startpunt naar Je plekken laten verwijzen.
- Andere plek (coördinator, mag): de schuifrij Start bij knipt de laatste chip hard af ("Thu" op 360 px, een randje op 412 px); een zachte rand of een vaste breedte oogt rustiger. Op Je plekken staat bij Thuis twee keer Thuis (naam en soort).
- Andere plek (Pathfinder, mag): de rij Je plekken zegt alleen Bekijken, niet hoeveel plekken er zijn (afgewezen voor de laadproef van Instellingen; opnieuw bekijken).
- Briefing 5 en 6 (Pathfinder, mag): de knop op Vandaag staat onder de vouw doordat de ochtendkaart erboven staat; Vandaag zegt de missie niet in twee seconden als de ochtendvraag open is.
- Briefing 5 en 6 (Pathfinder, mag): na de log staan twee getallen voor één loop op Vandaag (52 min in Zit erop, 50 min in Je dag).
- Briefing 5 en 6 (Pathfinder, mag): de plekkeuzes heten per training anders (Hardlopen, buiten of Buiten); op 360 px is de tweede keuze afgesneden zonder schuifhint.
- Briefing 5 en 6 (Warden, moet klein): Health Connect telt niet als horloge dat afvinkt; nagaan of Vanzelf afvinken Health Connect-activiteiten afvinkt, en zo ja meetellen.

- Briefing spoor 2 (Pathfinder, moet op 360 bij 640): de hoofdknop van het blad Route valt daar net onder de vouw. Voorstel: rijen compacter (één regel per lus) of de knop als vaste onderrand van het blad. Op 412 (telefoon eigenaar) staat hij erboven.

- Briefing spoor 2 (Warden, moet, later): `engine/routeSheet.ts#loopLines` herkent de korter-zin aan de tekst van proposalNotes; laat de planner de notes als {text, warn} teruggeven zodra routePlanner.ts mag bewegen (spoor 8).
- Briefing spoor 2 (Pathfinder, moet, spoor 6): mint Gedaan op Vandaag en Gedaan, invullen op het trainingsscherm bij een Garmin-loop; Route voorstellen staat op Vandaag onder de vouw en is via Week vier tikken. Spoor 5 en 6 lossen dit op; pas dan is de klacht weg.
- Briefing spoor 2 (Pathfinder, mag): de eerste vraag van de route is een lange tekstmuur zonder mint knop.
- Werkwijze (coördinator): Warden en Pathfinder zetten soms de hoofdmap op een andere commit (git checkout); in hun opdracht expliciet "alleen in een eigen worktree, nooit checkout in /home/user/ascend".

- Briefing A (Warden, mag): De avond ervoor laat de route-regel weg zolang de plekkeuzes nog niet gelezen zijn (nu telt dan de standaard; alleen als lezen langer dan 1 s duurt).
- Briefing A (Warden, mag): readMap in storage/trainingPlace.ts neemt een lezing alleen over als er sinds de start geen save klaar is (versieteller).
- Eigen gewicht (Sherpa Afdaalklok): tpl_bodyweight en tpl_hill_easy hebben geen SESSION_STYLE; Eigen gewicht toont daardoor "Zone 2, praten kan" bij een krachttraining.
- Afdaalklok (Warden, mag): een weerruil of slepen kan Trap af uit het venster van de klok halen; de klok controleert dat niet. Test voor een ruil met Trap af als partner, en een test voor de duur bij een andere nieuwe rij in een voorstel.

- Afdaalklok (Pathfinder, mag): bij 21 dagen of meer mag de afdaalregel niet wegzakken achter "nog 3" in de adviezenkaart.
- Afdaalklok (Pathfinder, mag): na de afgevinkte duurloop wordt Trap af de missie, zoals elke tweede training op een dag.
- Afdaalklok (Pathfinder, mag): telt het blad Gemist een vervallen Trap af mee als gemiste training? Nagaan en zo ja niet meetellen.
- Afdaalklok (Pathfinder, mag): de naam Trap af dekt geen duin of helling; pas als de uitleg in het scherm niet genoeg is.
- Afdaalklok (Pathfinder, mag): een korte Garmin-wandeling op een dag met duurloop en Trap af mag niet aan Trap af koppelen als de loop bedoeld is; testen met één dag.

Wat Pathfinder vindt en niet meteen terug naar een bouwer gaat. Eerste lijst (coördinator, 11 november): de horlogestand staat twee keer in het blad van een training in Week; de route staat ook bij de loopband; geen route in het blad in Week; de avondkaart staat onder Advies, Nog open en Back-up; het trainingsscherm van een Garmin-loop heeft "Gedaan, invullen" als hoofdknop. De redesign (Cartographer, `docs/visie/Ontwerp Route en trainingsscherm.md`) neemt de eerste vier mee.
- Twee invarianten in de tekstkaart: dezelfde zin twee keer op één scherm of in één blad is een schending; het aantal tikken van Vandaag tot de route en tot de datavelden staat in de kaart en mag niet stil groeien. Eerst de dubbele horlogeregel weg, anders faalt de vergelijking. Opus.

## Groot

- Later, alleen voor de toekomst (eigenaar 11 november): andere horloges. Samsung Galaxy Watch komt via Samsung Health en Health Connect al binnen; telt mee zodra Health Connect als horloge dat afvinkt telt (zie Samenhang); een route naar een Samsung-horloge vraagt een app van derden. Apple Watch: gegevens zitten in Apple Health op de iPhone, daar kan een webapp niet bij; eerste stap is de omweg via intervals.icu (bijvoorbeeld HealthFit stuurt Apple Watch-trainingen door; Scout gaat eerst na of dat werkt), een eigen iOS-app (Mac, Apple-ontwikkelaarsaccount, TestFlight, WorkoutKit voor een loop naar het horloge) pas als iemand de app op een iPhone gaat gebruiken. Nieuwe bron altijd als adapter in `src/integrations/` met `source`, nooit velden per merk. Niet bouwen zonder vraag van de eigenaar.

- Herinrichting uit de ontwerprapporten (`docs/visie/Ontwerprapport gegevens.md`, `instellingen.md`): Stand met Ritme, de weekterugblik, het Logboek, Geavanceerd als eigen pagina, één notatie voor tijden ("13.05" bij het weer tegenover "06:11" in Instellingen). Een eigen ronde van een uur of meer met Cartographer. De keuzes uit de rapporten maakt de coördinator met het advies.
- Forge herinrichting, de rest (deel 1 live sinds 2 november, besluit `2026-11-02-forge-herinrichting.md`; uit `docs/visie/Ontwerprapport Forge.md`): de kolom Voorschrift weg, RIR-bolletje en vinkvak naar minstens 44 px (45 kleine tikdoelen in de Lookout-doorloop), Kleiner maken en Afronden niet dubbel in het menu, de naam van een oefening in Marcellus, het blad Set met lang drukken zichtbaar, de regel "per kant ..." onder elke set en het percentage van je maximum. `components/forge/`. Eén bouwer.
- Teksten stap 4: de teksten uit de code naar een vertaalbestand per taal, daarna Engels, te kiezen in Instellingen. Groot werk in alle componenten; de engine geeft ook zinnen terug. Pas na R10. Wacht: "Engels wacht" (plan van de coördinator, 9 november).
- Routeplanner na het kaartje: startpunt kiezen, huidige locatie en bijsturen (zie Inbox). `engine/route*`, `integrations/`.

## Middelgroot

- Buiten (akkoord eigenaar 7 november): UV-index als regel bij een lange loop of tocht vanaf UV 6 (de waarde zit al in `engine/weather.ts`, de regel niet), en de hoogte van je plek of vakantieadres (de hoogteaanroep staat nu in `integrations/overpass.ts`, kan naar `openMeteo.ts`). Instelbaar, alleen tekst. Sonnet.
- Feestdagen als voorstel (akkoord 7 november, bleef liggen in ronde 3): Nager.Date, Nederland en het land van een vakantie, eens per jaar ophalen, een feestdag is een voorstel met Akkoord. Raakt de planning: engine op Fable, niet tegelijk met een andere planner-sessie.
- Voorstel squat op één been en L-sit (akkoord eigenaar 9 november avond): bij Calisthenics algemeen één keer een voorstel met Akkoord dat ze in een training zet als ze nergens staan; de kaart zegt nu "Staat nog niet in je trainingen." Planner, Fable, niet tegelijk met een andere planner-sessie. De kaart onthoudt geen hoogste stap: zo laten.
- Uitleg bij oefeningen: nog 59 oefeningen zonder uitleg, in batches van twintig (Scribe schrijft, Scout toetst de techniek, bron in `docs/onderzoek/`). `src/data/exercises.ts`. Sonnet.
- R10: de teksten van de Forge-tab volgens de stemgids. Daarna de uitleg in Instellingen inkorten (nu gemiddeld ongeveer 66 woorden, doel ongeveer 40).
- Forge, wens 3 november: (1) herhalingen schatten bij een ander gewicht is live (`forgeReckon.ts#estimateRepsAt`); (2) nakijken of `reckonAfterTick` dit al doet: na afvinken de volgende open werkset bijstellen naar wat Forge nu verwacht, beide kanten op, instelbaar. Nu stelt `engine/forgeAdjust.ts` alleen lichter voor, met een tik; `forgeInput.ts#carryChange` schuift alleen een gelijke waarde door.
- Heuvels en de periode: de OpenStreetMap-regel op een vakantieadres of in een periode Zonder sportschool. Een periode heeft geen eigen plek; vraagt een nieuwe opgeslagen vorm met migratie (Fable).
- Health Connect, de rest: een ronde start alleen als je terugkomt in de app (niet na urenlang open staan); het blad Lichaamsgewicht toont heel even "Gewicht: staat uit" na weer aanzetten.
- Zonder doel: de vorm van de week veranderen bij een andere richting (de kaart Je week op Je stand staat er al, `components/stand/YourWeekStandCard.tsx`).

## Klein en fouten

Deel 2 (Forge en Calisthenics):
- Regel 4 en 5 van de afvinkregels lezen gelijk (besluit `2026-11-09-forge-review-afvinken.md`).
- Spieren voor de berg heeft in Forge geen eigen schakelaar (Forge zit op het maximum van 6 rijen).
- Toestelstanden: de formulier-`key` in `components/forge/MachineWeights.tsx`; standen in pond, plaatjesnummers en optrekhulp; het strookje "Ook tussenin en erboven schatten" breekt op 390 px; Rustig niet gezien.
- Reverse Lunge staat als dumbbell-oefening in de catalogus; een variant met eigen gewicht ontbreekt.
- De terugknop van het toestel sluit het uitlegblad ook na Lichter of Zwaarder; alleen Terug naar gaat een stap terug.
- Calisthenics: de toets van de straddle front lever is hoog; Ongedaan maken verdwijnt na Akkoord op een andere training; bij het maximum van 20 trainingen meldt Akkoord gelukt terwijl de stap niet geldt; een back-up uit een nieuwere versie met een onbekende ladder bewaart die vaardigheid verborgen; Liever niet bij een stapvoorstel staat alleen in localStorage; 17 nieuwe tekeningen niet allemaal bekeken; een stopwatch bij een houding.
- IJkset: de rij van de extra set heet nog "eigen set" (`engine/forgeRows.ts`, `ExerciseBlock.tsx`); Niet nu geldt alleen voor deze keer.
- Toevoegingen van Spieren voor de berg gaan nog niet mee in het concept van een lopende sessie; Ruilen op een toegevoegde bergspieroefening die na Uit deze training halen met afgevinkte sets blijft, doet stil niets.
- Tempo: de stippen in de tempografiek zijn niet tikbaar; het blad gebruikt 8 weken, de kaart 12.

Overig:
- De info-knop van een instellingsrij meet 20 bij 20 px (gedeeld onderdeel).
- Een helling zonder bekende hoogte telt mee in het aantal maar niet voor de hoogste (Route voorstellen).
- De kaart Let op op Vandaag verschijnt na het ophalen en kan de ochtendkaart onder de missie schuiven; mogelijk dubbel onweer met het bergweer.
- De periode Zonder sportschool geeft de 3 dagen na een tocht dezelfde lengteregel als de 72 uur rust.
- Overzicht Gewicht: met precies twee wegingen in twee weken kan het eind van de lijn een paar tienden afwijken van het grote getal.
- Nagekomen uit ronde 2b: een eigen sport telt niet in de weekcheck; "Laten staan" bij een vakantie en "laten rusten?" rond een Top-race voor vaste sporten; de waarde "Alles normaal" valt af in de rij Hoeveel per soort op 360 px; een test die alle Android-XML vooraf leest (een dubbel streepje in commentaar brak de APK-bouw).
- Weekvoorschrift: `consecutiveKeepWeeks` telt openingen in plaats van weken (elke week neemt de opgeslagen teller van de week ervoor plus één, `engine/weeklyPrescriptionEngine.ts`). De eerste tien tot vijftien openingen na een verandering schrijft de stap daardoor elke keer voorschriften weg en leest de app een keer extra. Geen melding; de teller wordt nergens gelezen (Sherpa Weekplan, 12 november).
- Krachtblok: `engine/strengthScheduling.ts` regel 138 zegt nog "staat er al op elke dag een training"; een week telt ook mee als er een dag vrij is waar het niet mag. De zin van het weekvoorschrift is al aangepast (Sherpa Weekplan, 12 november).

## Nakijken

- Route-start na main (Warden 12 november, mag): dode `hereStart`, `hereStartLine`, `startFailureLine` weg met hun tests; zonder Thuis en zonder plek de reden ervoor zetten (geweigerd, te grof, te laat); bij een getikt punt na een terugval de chip van de terugval aanhouden; het raakvlak van de naamsvermelding (RouteMap r. 270) vangt een tik voor Start hier in de hoek, op 360 px nakijken; een scantoets voor Rustig en Uit zonder overgang in RouteSearching; valkuil: "Een nieuwe vraag om je plek komt alleen uit een tik, nooit uit een terugval."

- Forge RIR (Warden, 11 november, mag): `firstAtTop` vraagt bij de eerste set op de bovenkant, `topSetOf` leest de zwaarste set; bij een lichtere eerste set of een bijgesteld gewicht kan de stap zwaarder een keer gemist worden. Test met ongelijke gewichten en zo nodig dezelfde set kiezen.

- Leg press zonder opgeslagen standen (Sherpa Forge verloop, 11 november): Forge leert de stappen uit gebruikte gewichten, laat 91,6 vallen omdat het op 202 pond lijkt, en vult het gat met 94,4, 99,4 en 104,4 kg die niet op het toestel staan. Bestaand gedrag. Nagaan met de back-up (skill naspelen) of dat toestel standen heeft; zo niet, mag Forge dan gewichten voorstellen die niet op het toestel staan?

Twijfel of het af is; eerst kijken, dan schrappen of bouwen.
- Rustdag terug: een training die je zelf oversloeg of waarvan je het inhaalvoorstel afwees, kan de rustdag tot zeven dagen tegenhouden. `trainedOn` volgt nu `dayLoads` (af), maar `catchUpFits` in `engine/restDayBack.ts` kijkt niet naar een afgewezen inhaalvoorstel.
- Tempo bij zone 2, kleine rest: een oude `aerobicProgressCelebrated` na 14 dagen negeren; het dauwpunt per loop (`dewPoint` zit in `heatPace.ts` en het weer); de regel voor benen die niet uitgerust zijn (hoofdstuk 5 van het verslag). Niet in de code teruggevonden of bevestigd.
- Geavanceerd als eigen pagina in Instellingen (akkoord eigenaar 2 november): er is een Geavanceerd per groep (bijvoorbeeld Koppelingen, Geavanceerd); of dat de bedoelde pagina is, is niet nagegaan.
- Eén notatie voor tijden: niet nagegaan of "13.05" en "06:11" nog naast elkaar staan.
- Jaaroverzicht: "Testloop 5 km: 14 jan en 15 jan", twee dagen voor één test. Fout in de gegevens of in de telling?
- De vaste doorloop van Lookout gaf Stand helemaal leeg; een eigen afdruk was vol. Drukt de kit te vroeg af?
- Startvragen: standaard is "Een tocht of wedstrijd"; is "Fit blijven" logischer voor iemand zonder plan?
- Op een toestel of in een echte browser nog niet gezien: de echte Overpass- en hoogteaanroep, live Open-Meteo-waarschuwing en EAWS, opslaan in Documenten/ASCEND, een GPX als koers in Garmin Connect en op het horloge, de keuzelijst van Android, lussen boven ongeveer 18 km (de heuvelcache is 3 km), de locatievraag bij Precies, plakken in de echte Strava-app, de tempoband met 8 of meer lopen over 4 weken, het bolletje gewicht en aandeel met een echte weging, 34 van de 40 uitlegteksten van batch 3 en 4.
- Routeplanner: in de afdruk waren beide lussen korter dan de training (4,2 en 4,6 km bij 6 km); nakijken met echte lussen van de eigenaar.
- Feiten om te toetsen (Scout): de factor 0,98 voor de drempelhartslag na een 5 km; Sporten lezen echte intervals.icu-types (Swim, Padel, Soccer, Yoga) alleen met nagemaakte data getest; de drempels van vermoeidheid tussen oefeningen niet op echte trainingen getoetst.

## Wacht op de eigenaar

- Melding in Week nadat je op Vandaag "Benen fris, blijft staan" koos (open vraag uit de overdracht van een eerdere coördinator, niet beantwoord): wegblijven, of zeggen dat jij koos. Advies: zeggen dat jij koos.
- (Ontvangen 14 november, back-up van 18:00 in de scratchpad) Een verse back-up in de scratchpad van de coördinator, voor de punten die naspelen vragen (bodem van 20 m, audit 13 november).

## Later

- GR5: hutten via refuges.info (eigenaar 14 november: overslaan voor nu, hij gebruikt Komoot). Grenzen ver van het spoor nakijken blijft open.
- MacroFactor gaat uit de app zodra ASCEND op eigen benen staat (voornemen van de eigenaar, 14 november); nu niets aan bouwen of afbreken.

- Los van MacroFactor Workouts (doel eigenaar 9 november; de voedingsapp blijft): criteria en stand in `docs/visie/Los van MacroFactor.md`, de weekbriefing meldt elke maandag hoe het ervoor staat. De MacroFactor-code pas weg als het moment er is.
- Helemaal aan het eind, als alles klaar is (toestemming eigenaar, 1 november): de vakantiedata van de eigenaar uit de geschiedenis van git halen (oude commits van `docs/onderhoud/2026-11-01-aanpak-backlog.md` en c305cb1). Herschrijft geschiedenis op main en de werkbranch; eerst alle helpers stoppen, daarna de deploy controleren.
- Gebruikerstest met vier nagemaakte personen en de herstelronde erna, in een eigen sessie (eigenaar, 2 november).
- Kansen: de bestandsroute voor FIT-bestanden als vangnet (stap 0c van het onderzoek).
- Ochtendkaart: de kaart leert van jou (hoe ging de training na "moe" of "slecht geslapen"); een melding op de telefoon met de vier keuzes, zodat je de app niet hoeft te openen.
- Oefeningendatabase wger (CC-BY-SA) als bron bij het schrijven van uitleg en vervangers; nooit letterlijk, met bron in `ATTRIBUTION.md`. Geen koppeling in de app.
- Na de Android-app, nog niet (eigenaar, 1 november): trainingen in je agenda inplannen met kaders voor ochtend, middag en avond; gesproken signalen, vergrendelen met vingerafdruk, 's nachts horlogegegevens ophalen, delen met één tik.
- Repo privé en zuiniger bouwen (eigenaar 11 november: "zet dat echt ver op de backlog, pas na afstemming en toestemming"). Niets aan doen zonder dat de eigenaar het zelf opnieuw aankaart en akkoord geeft. Wat er ligt: privé is gratis, GitHub Pages vanuit privé vraagt GitHub Pro (ongeveer $4 per maand), en de bouwminuten gaan van onbeperkt naar 3.000 per maand terwijl we er nu naar schatting ruim 10.000 gebruiken; eerst de bouwtaken zuiniger (geen controle bij alleen docs, de Android-app alleen bij een nieuwe versie). Verkopen is een aparte vraag voor later. Alternatief bij privé (coördinator 11 november): de website via Cloudflare Pages (gratis bouwbeurten, ook privé), de APK alleen bij een nieuwe versie, de controles alleen bij een codewijziging; een eigen runner op een eigen pc kan ook, maar die moet aan staan en de Android SDK hebben.

## Bewust niet

- Voeding naast gewicht en kracht (kans E): de eigenaar laat dit liggen (1 november).
- Hartslagband via Bluetooth (eigenaar).
- Camera en een gps-route of spoor van tochten, tenzij de eigenaar het vraagt (afgeraden om batterij en privacy).
- Spraakloggen en een getal op het icoon (afgeraden).
- Meteoalarm: niet leesbaar vanuit een webapp (geen CORS); de waarschuwingen draaien op drempels van Open-Meteo.

## Geparkeerd

- Spierindex stap 3.

## Werkwijze, voor de coördinator

- Een controle op echte data: een script dat een back-up van de eigenaar (alleen in de scratchpad, nooit in de repo) door de engine haalt en dezelfde invarianten toetst. Draaien zodra de eigenaar een back-up stuurt.
- Afspraken die nu alleen in het gesprek staan: de eigenaar stuurt elke zondag een verse back-up; de coördinator wisselt dagelijks (skill `coordinator-wissel`), de overdracht staat in `.claude/coordinator/overdracht.md`.
- Bij een opruiming als deze: een punt is pas af als de code het doet, niet omdat een tekst het zegt; twijfel gaat onder Nakijken.

## Werkwijze, overig

- Het wekelijkse onderhoud en de appscan op Sonnet laten draaien en na een paar weken kijken wat ze vinden en kosten.
