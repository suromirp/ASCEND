# Backlog

Wat nog op de lijst staat, zodat een nieuwe sessie het niet uit het gesprek hoeft te halen. De
coördinator houdt dit bij: iets wat live staat gaat eruit, iets nieuws komt erbij met een regel uitleg.
Opnieuw opgebouwd op 11 november 2026 tegen main (2a333d5): alles wat live staat is eruit, wat eruit ging
en waarom staat in `docs/onderhoud/2026-11-11-backlog-opnieuw.md`. De geschiedenis staat in git en in
`docs/beslissingen/`.

## Inbox
Hoogste code: I-172. Een nieuw punt krijgt het volgende nummer (zet het getal hier mee op). Een bouwer zet `Klaar: I-<n>` in zijn commit; na de squash naar main zet `npm run backlog:bij` het punt onder Pas live.
- [I-167] (26 november, Warden en Lookout rooster ronde 2, mag) Voorstel squat op één been en L-sit: `ladderAddProposal.ts` r. 77 kiest de training met het meeste beenwerk, niet eerst een zware beendag (`isLegHeavyTemplate`), en de regel van 48 uur leest alleen het sjabloon; leg-heavy eerst sorteren met een test. Een test die vastlegt dat Spieren voor de berg geen ladderoefening kiest (de nieuwe startdosis 3 keer 5 geldt anders ook daar). `useLadderAddProposal.ts` r. 75: Ongedaan maken zet een snapshot terug en kan een tussentijdse wijziging in dezelfde training wissen; liever `withoutAddedSlot`, en de valkuil in het werkbriefje doelen. Een toegevoegde ladderstap krijgt geen stapvoorstel (`skillStepProposal` slaat `plus:` over). Op Ascend staan nu de mint rand van het hoofddoel (`GoalCard.tsx` r. 115) en de getinte Akkoord samen (Lookout zag één accent; nog eens bekijken). Catalogus: `side-lying-hip-abduction` heeft de alias Clamshell (andere beweging); `farmers-carry` staat als dumbbell bij een tekst met twee zware gewichten. Uitleg: welk been bij het toestel staat bij de kabelabductie is nu benoemd, de rest van batch 5 is nog niet door Scout getoetst. Lookout: een eerder weekblad Rustiger instap houdt de tikken vast tot je het sluit; Pallof Press en Close Grip Bench niet op het scherm gezien, de uitleg op 390 en 412 px ook niet.
- [I-168] (26 november, Warden en Lookout rooster ronde 3, mag) Feestdagen: `storage/publicHolidays.ts` bewaart `failure` in de meta-opslag maar niets leest hem voor het scherm, toon hem of laat hem weg; `publicHolidaysAdapter` (`integrations/publicHolidays.ts` r. 64) wordt nergens gebruikt, de opslag roept `fetchPublicHolidays` rechtstreeks aan, laat de opslag via de adapter lopen. Forge: `forgeRest.render.test.ts` toetst het oude concept met `column` alleen in de broncode, een render-test die zo'n concept herstelt zonder verloren invoer is sterker. Lookout: de kolom Vorige keer is alleen leeg gezien (geen historie in de demo), gevuld en met lange waarden op 360 px nog bekijken; terug van Uitleg naar Ruilen niet gemeten. Regel voor het briefje planning: wie een rij in een kaartscherm zet, commit de bijgewerkte app-kaart in dezelfde commit.
- [I-169] (26 november, Warden en Lookout rooster ronde 4, mag) `StepProposalNotice.tsx` r. 132: de stand `full` gaat niet terug zolang het scherm open is; zet je elders een stap terug, dan blijft Akkoord grijs tot je opnieuw opent (terug naar `open` als het voorstel of `stepSwaps` verandert). De stapkaart bij het maximum van 20 trainingen is niet op een scherm gezien, alleen in tests. Zoeken: "ziek" en "per week" vinden de IJkset niet meer na R10. Lookout zag de herschreven bladen (Training verwijderen, Ruilen, MacroFactor), Hoe goed kent Forge je en de weekterugblik niet op het scherm, ook Rustig niet; de kit-standen tonen op de huidige datum een blad Rustiger instap over elk scherm. Forge-uitleg in Instellingen is van 98 naar 77 woorden gemiddeld, nog niet de 40 van R10 (onderwerpen met getallen blijven langer).
- [I-172] (28 november, eigenaar, screenshot route Heuvel bij Waar je nu bent) De lussen zijn zonder kaart van de omgeving gezocht: "Er is geen actuele kaart van de omgeving", Opnieuw proberen helpt niet. De echte Overpass-aanroep is nooit op een toestel gezien. `integrations/overpass.ts` slikt de reden (`request` geeft bij 429, 504, tijdgrens en CORS allemaal `undefined`), dus de app weet niet waarom. Vermoedens, niet getoetst: de tijdgrens van 12 s is korter dan de `[timeout:15]` van de vraag zelf, de vraag is zwaar (twee blokken, 3 km, velden, water en parken in een dichte wijk), en de openbare server overpass-api.de weigert vaak met 429 of 504 als hij druk is of als veel telefoons hetzelfde adres delen. Eerst meten (echte aanroep, status en duur), dan bouwen: de reden bewaren, een tweede server als terugval, de tijdgrens boven die van de vraag, de vraag lichter of in twee stappen, en het blad zegt welke reden het was. Let op: ook met kaart haalt een vlakke plek de 120 m van de training niet; dan hoort de zin te zeggen dat er in de buurt geen heuvel is, niet dat de kaart ontbreekt.
- [I-171] (26 november, Warden en Lookout rooster ronde 6, mag) Beenindex leert: de test "langdurig eenzijdig" in `legIndexSafety.test.ts` loopt na een paar rondes van 29 dagen voorbij de antwoorden (verwacht 'zwaar' in stappen van 0,15 tot 1,4 en 'fris' tot 0,7, met minstens drie Akkoord-rijen); `migrationsLegIndex.ts` laat elke `at` toe die `Date.parse` slikt terwijl daarna op tekst gesorteerd wordt (eis een ISO-tijdstip, tel de rest als overgeslagen); `SettingsRepo.set` archiveert niet als een patch zowel `morningCheckIns` als `legAnswers` bevat (commentaar of assert). Niet op een scherm gezien: een Akkoord, Uit of Standaard dat de planning echt verandert en dus eerst het voorstelblad geeft (alleen in de code en de tests).
- [I-170] (26 november, Warden en Lookout rooster ronde 5, mag) IJktocht: een ijktocht die niet gepland stond en via het horloge binnenkomt telt niet (`ijktocht.ts` kijkt alleen naar het sjabloon; een import valt op Wandeling of Bergtocht), dan komt de nulmeting na 14 dagen terug; de import koppelt tot zes dagen naast de geplande dag, zodat een gewone wandeling de ijktocht kan worden (voor rol calibration alleen dezelfde dag?); geen voorbehoud als de ene keer kort (45) en de andere keer volledig (60) is gelopen; klimtempo over de hele tocht vergelijkt tijd in beweging met tijd inclusief pauzes. De instelling IJktocht staat alleen bij een hoofddoel of tocht, het voorstel komt ook bij een bergdoel dat geen hoofddoel is (zelfde regel als de afdaalklok). Niet op een scherm gezien: hartslag en benen met echte waarden, het temperatuurvoorbehoud.
- [I-166] (26 november, Warden en Lookout bouwmoment 26 november derde vervolg, mag) Na I-165, I-20 en I-36: de melding onderin (`ChangeNotice.tsx`, SHOW_MS 6 s) telt ook terwijl een blad erboven open staat en is na Begrepen vaak al een rond chip; laten tellen vanaf het moment dat het blad dicht is (de zin na Akkoord in het blad Belangrijk advies is daarom neutraal: "Onderin vind je"); valkuil voor het werkbriefje bediening-en-beweging; het klimprofiel in het jaaroverzicht haalt 44 px vanaf 360 px, niet smaller (bewust, 360 is de smalste maat); niet in de browser gezien: een afbrekende tweede regel in Week zonder losse "·" (geen nagemaakte stand breekt af, een stand met een lange tweede regel maken), de kop van de Briefing bij Wandelen en dribbelen (geen stand met die training), en uit I-165 Opslaan na de grens in Hoe ging het?, Straks-regels in de Testloopkaart, Opnieuw proberen van de route, Rustig bij Beweging.
- [I-104] Zin "Je rustige loop van <dag> krijgt dan geen korte test meer." (I-99) niet op het scherm gezien; alleen in tests. Bij de volgende Lookout meenemen.
- [I-103] Token voor de zachte mint vulling (Warden 21 november, mag): de 18%-vulling van Akkoord staat nu in StepProposalNotice en CalibrationNotice; komt hij een derde keer terug, maak dan een token `--color-action-soft` in `src/index.css`.
- [I-76] Luchtfoto buiten Nederland en Frankrijk (eigenaar 16 november 08:51): "waarom hebben we geen betere satellietfoto hier, je kan echt niet inzoomen". Buiten NL en FR valt de luchtfoto terug op EOX (Sentinel-2, ongeveer 10 m per pixel). Onderzoek per land een open nationale luchtfoto zoals PDOK en IGN (Portugal: de orthofoto van DGT; Spanje: PNOA van IGN-ES), met licentie, naamsvermelding en grensvlak volgens de valkuilen in koppelingen-en-data; daarna een vlak per land zoals NL en FR. Scout eerst, dan Sherpa.

- [I-10] Profielendoorloop 14 november (verslagen in `docs/profielen/2026-11-14-*.md` op de branches `claude/profiel-*`; vier van vijf binnen, ziek-vakantie loopt). Moet, gegroepeerd, in volgorde van bouwen:
  Mag: zie de verslagen (back-upkaart op dag 1, dubbele zin na afronden, Kies je plaats landt op Weer en kleding, 0 km voor onbekend, afronding van weken).
- [I-30] (23 november: uitleg Vragen na je loop gebouwd op claude/forge-logs-23; wachtzin ExerciseLogger en testregel stonden al op main; gedempte opwarmset na ruil niet gebouwd, besluit 14 november, vraag aan de eigenaar) Samen 14 november, rest (Lookout, Pathfinder en Sherpa Opslaan, mag): het oude trainingsscherm (`ExerciseLogger.tsx`) toont bij een losse training nog de wachtzin zonder uitweg; de wachtzin bij opslaan is lang voor 360 px (Lookout zag hem niet live); de uitleg van "Vragen na je loop" zegt dat de rij na 72 uur verdwijnt; een bron geruild voor een oefening op hetzelfde patroon geeft een gewone opwarmset in plaats van een gedempte (zin in het besluit); `src/engine/warmupLater` in de testregel van `docs/werkbriefjes/forge.md`. Klein.
- [I-31] Les samenvoegen (14 november): twee branches die elk groen zijn, kunnen samen stuk gaan zonder conflict (`question` weg in de ene, gelezen in de andere; Vandaag crashte). Altijd tsc op de proefmerge, voor Lookout.
- [I-34] Verborgen schermen, rest (Pathfinder 12 en 14 november): ontwerp later: na een loop zes tot acht lagen (Debrief, CompletionMoment, RunInsight, RunDetail, WatchActivity, LogDetail, DaySheet) naar één moment; groep Gidsen uit het tandwiel naar ingangen op hun moment; Forge-instellingen tijdens het trainen in een blad; instellingen samenvoegen per onderwerp; Alleen onderweg samen met Als het misgaat. Mag: een trekdoel dat geen hoofddoel is krijgt geen Reis-regel (`useJourney.ts:30` neemt de datum van het hoofddoel; ook nagaan of de Reisplanner dan een verkeerde afteldatum toont); de regel op Etappes "Nog geen tocht om mee te vergelijken" wordt "Nog geen gelopen dag om mee te vergelijken"; telt een gepauzeerd of afgerond trekdoel mee in `hasTrekGoal`; de Kennisbank toont zonder doel "De GR5 in etappes" en "Je rugzak pakken" (les van de week nagaan).







Wat de eigenaar tussendoor meldt, voor het volgende bouwmoment (maandag, woensdag, vrijdag; skill `bouwmoment`).
Vast punt, elk bouwmoment: na de punten hieronder de eerstvolgende open ronde uit het rooster hieronder. Een opmerking over hetzelfde komt bij het bestaande punt. Meteen, tussendoor: iets dat nu stuk is (de app werkt niet, verkeerde getallen in je training, data die verloren kan gaan) en kleine fixes die de coördinator zelf in een paar minuten doet, zonder helper (een tekst, een regel, een getal). De rest gaat in de Inbox.

Leeg: alles van 11 november staat in de Bouwrij hieronder, die de coördinator deze week zelf bouwt.

## Bouwrij (open punten)

Het bouwmoment bouwt na de Inbox de eerstvolgende open ronde van het Rooster hieronder. Deze rij start de coördinator zelf, hoogstens drie bouwers tegelijk, nooit twee aan dezelfde bestanden, model volgens skill werkverdeling. Volgorde is de volgorde van starten zodra er plek is.

- Profielen, vervolg (coördinator 14 november, eigenaar vroeg of er meer nodig zijn): niet nu. Eerst D, H en Q op main. Dan de negen profielen van 14 november opnieuw als herhaling (werken de reparaties, brak er niets). Daarna een derde ronde op wat nog niemand bekeek: lange termijn (zes weken Forge, een GR5-doel over maanden met de Ascend-tab en de rugzakladder), de echte Android-app (installeren, back-up in de map, meldingen), toegankelijkheid (grote letters, één hand), lang offline (meerdaagse tocht). Sonnet, hoogstens drie tegelijk. (nakijken: of de herhaalronde en de derde ronde gedraaid zijn is niet uit de code vast te stellen)
- Volgorde na de huidige rij (eigenaar 14 november: "kies jij"): de vaste ijktocht staat live (Rooster ronde 5; routes voor wandelen staan live: 6517ccf, bf7acc7). Open: MacroFactor eruit (eigenaar), als opruimklus; oude logs blijven leesbaar. Op main staan nog MacroFactorCard, MacroFactorLinkCard en MacroFactorDurationSheet.
- Instellingen op één plek, rest (stap 0 tot 3 live, 1513c3f en e6baef5, besluit `2026-11-15-instellingen-op-een-plek.md`; id, groep, uitleg en advies komen uit `src/engine/settingsDefs/`): open is de samenvatting, die `engine/settingsSummary.ts` nog los bijhoudt (geen verwijzing naar `settingsDefs`), en de groepspagina's in `components/settings/groups/`, die nog eigen `info=` hebben. Geen gedrag of tekst verandert; de tekstkaart blijft gelijk. Een tijdstip zonder andere bouwers aan instellingen.
- Plekken en routes (spoor 1 en 2 live, 7079480 en 073080f; Andere plek met zoeken op naam live, 1af978e en Photon 41587a4; de rest open) (besluit `2026-11-11-plekken-en-routes.md`, eigenaar "Ja go" 11 november): na Briefing 5 en 6. Sporen volgen uit `docs/visie/Ontwerp Plekken en routes.md`; antwoorden van de eigenaar in `2026-11-11-plekken-antwoorden.md` (afstand hangt af van de training: 75 km, korter dan 90 min hoogstens 25 km). Eerst Plekken als opgeslagen vorm met migratie (Vast punt wordt Thuis), export en import, op Fable; dan route bewaren; dan plek voorstellen in de Briefing; dan Nieuwe plek vooraf (zoeken op plaatsnaam, pin op de kaart met tegels). Garmin vooraf: `docs/onderzoek/Garmin koers vooraf klaarzetten.md`. Niet door het bouwmoment. Na spoor 1 (Warden 11 november), voor spoor 2 en 3: het voorbeeld van een import noemt plekken; Wis startpunt vraagt eerst als Thuis routes heeft, al voor spoor 2 routes laat bewaren. (nakijken: in de opruimronde van 26 november niet getoetst tegen main)
- Zoeken op de kaart en avontuurlijke plekken (zoeken op naam live, 1af978e en 41587a4; avontuurlijke plekken open) (eigenaar 11 november avond): een plek intypen of zoeken (spoor 7 van Plekken, `integrations/openMeteo.ts#searchPlaces`, naar voren halen na de startkeuzes), en voorstellen van heuvels, bossen en natuurgebieden binnen de afstand van de training (25 of 75 km). Geen eigen lijst: die veroudert en dekt alleen wat iemand intypte. Bron: OpenStreetMap via Overpass (al in gebruik bij heuvels en paden) plus hoogtetegels voor hoogtemeters, met één zin waarom de plek past. Scout eerst: welke OSM-kenmerken (natural=peak, ridge, wood, boundary=protected_area, leisure=nature_reserve, route=hiking), grenzen van Overpass, en hoe het in Nederland werkt waar toppen laag zijn. Daarna ontwerp met Pathfinder, dan bouwen. Geen plaatsnamen van de eigenaar in tests of docs. Scout klaar (12 november, `docs/onderzoek/Avontuurlijke plekken uit OpenStreetMap.md`): de app heeft geen hoogtetegels, dus reliëf via één Open-Meteo-aanroep; alleen benoemde toppen, uitzichtpunten en natuurgebieden; hoogstens drie voorstellen; startpunt pas na een tik. Eerst ijken van de grove hoogtemetermaat tegen bewaarde routes en een proefaanroep (tijdgrens, CORS van de tweede server). Zoeken op naam bouwt Sherpa Zoeken op naam nu. (nakijken: in de opruimronde van 26 november niet getoetst tegen main)
- De avond ervoor, plek (Sherpa 14 november, advies): de kaart direct onder de missie op de avond; eigen besluit van de coördinator. Klein.
- Spieren voor de berg, rest (Warden 14 november, mag): één dag verlof haalt de hele week weg, ook als er die week getraind is (noemen of een week met krachtwerk laten meetellen); de doorgifte van `leave` in `ForgeMenus.tsx` aan Ruilen bewaken met een test. Klein.
- Spieren voor de berg: tekeningen voor de vier evenwichtsoefeningen; een test op de Forge-weergave van een houding met reps 4-6; Ruilen zegt "de laatste vier weken" ook als er door een rustweek of vakantie minder weken meetelden (`swapReason`). Klein. Op main nog open: de vier ids (`single-leg-stance`, `-eyes-closed`, `-cushion`, `star-excursion-reach`) staan niet in `data/exerciseArt.ts`; geen weergavetest voor reps 4-6; `swapReason` in `mountainMuscles.ts` zegt vast "de laatste vier weken".
- Vervallen door de Briefing (spoor 7), alleen nog als bron: Info-blad spoor 3 en 4: Uitleg opschonen (De stappen eruit, namen gelijk: "Meer over deze training" en de i), daarna Datavelden bekijken naar Gidsen. Plus van Warden: de rij Je horloge op Vandaag met de stand eronder zoals in Week; garmin in useWatchSheet zelf ophalen in plaats van buildWorkoutPlan in drie componenten. Opus. (nakijken: niet getoetst in de opruimronde van 26 november)
- Hoogtemeters met precisie, rest (eigenaar 12 november, `docs/onderzoek/Hoogtemeters met precisie.md`; stap 1 en "na stap 1" live, zie Pas live). Open: stap 2, een proef met de tegels van Mapterhorn (CORS gemeten, `2026-11-14-route-kaart-vervolg.md`; geen tegelcode in `src/`) en PDOK, één bekende heuvellus naast het horloge; stap 3, ijking per log met model en horloge als twee getallen (nakijken: besluit `2026-11-23-hoogte-en-ziek-signalen.md` koos één getal per loop, dus eerst beslissen of stap 3 nog geldt); stap 4, plekken rangschikken met één tegel; de instelling "Hoogtemeters bij twijfel" (Liever iets meer als standaard, Zo precies mogelijk, Liever iets minder; hoogstens 10 procent boven het doel; verandert alleen de keuze van de lus), nog niet in `settingsDefs`. Elke stap een besluit; de planning verandert alleen via een voorstel.
- Trainingsscherm en ontwerpregels (sporen 1 tot 4 live, 86be2a9; Route-blok 7fa66cc; Briefing per manier 540d0de; de rest open) (besluit `2026-11-12-trainingsscherm-en-ontwerpregels.md`, ontwerp `docs/visie/Ontwerp trainingsscherm minimaal.md`): sporen 1 tot 4 zodra Andere plek op main staat (zelfde bestanden van de Briefing), spoor 5 en 6 na Je dag, 7 tot 9 daarna, spoor 10 per regel met eigen besluit. Daarna Je week tot nu (Cartographer bezig) en dan Week, Stand en Logboek met dezelfde regels. (nakijken: niet getoetst in de opruimronde van 26 november)
- Je week tot nu, spoor 6 (later volgens het ontwerp; sporen 1 tot 5 live, ab5294d): een tik op een dag in de strip opent die training (`WeekStrip.tsx` heeft nog geen tik).
- Lookout-kit (14 november): de stand kracht begint niet meer rustig; er verschijnt "Weekplanning bijgewerkt" over de afdrukken. Standen opnieuw maken met `npm run kaart:standen`. (nakijken: niet getoetst in de opruimronde van 26 november)
- Week minimaal, rest (spoor 1 tot 6 en Stand live; de volle week als punt in `weekConcerns` met amber stip live, `fullWeekConcern`): open zijn Ascend en Logboek in dezelfde lijn. Er is nog geen ontwerp of besluit voor (besluit Stand: `2026-11-12-stand-minimaal.md`).


## Rooster voor de bouwmomenten

Het bouwmoment bouwt na de Inbox de eerstvolgende open ronde hieronder. Een ronde heeft tot drie sporen die elkaars bestanden niet raken; ze lopen tegelijk, elk met een eigen helper in een eigen worktree, en gaan samen in één keer naar main. Nooit twee Forge-sporen tegelijk (zelfde bestanden), nooit twee planner-sporen tegelijk. Afgerond: uit dit rooster en uit de groepen hieronder, met een regel onder Pas live.

Geen open ronde.

## Pas live
- Rooster ronde 6: de beenindex leert van je ochtenden, een eigen factor (0,7 tot 1,4) als voorstel met Akkoord in Je stand, Benen; de planning rekent nooit soepeler dan het model; instellingen in Lichaam, Signalen (26 november)
- Rooster ronde 5: de vaste ijktocht, met een bergdoel of bergtocht om de zes weken een voorstel met Akkoord op een vrije dag, uitkomst als rij IJktocht in Je stand, Belasting, instelling IJktocht in Doel (26 november)
- Rooster ronde 4: Klein en fouten deel 2 (Akkoord bij het maximum van 20 trainingen zegt eerlijk dat je plan niet veranderde; toevoegingen van Spieren voor de berg blijven in een lopende sessie) en R10, de teksten van Forge (29 schermzinnen, Forge-uitleg korter) (26 november)
- Rooster ronde 3: feestdagen als voorstel voor een vrije dag (Nager.Date, instellingen in Rond een vakantie), Forge herinrichting de rest (kolom Voorschrift weg, Kleiner maken en Afronden alleen in de kop, naam in Marcellus, setnummer opent het blad Set) (26 november)
- Rooster ronde 2: voorstel squat op één been en L-sit op de kaart Calisthenics algemeen, uitleg bij oefeningen batch 5, uitleg boven het blad Ruilen (26 november, 96f7ab1)
- [I-36] Kleding en wind, vervolg (26 november, b8a6800)
- [I-20] J. Tikdoelen, rest (26 november, b8a6800)
- [I-165] Na I-164 (26 november, b8a6800)
- Opruimronde 26 november, bewijs op main 9feda395: Buiten, UV en hoogte van je plek (`engine/outdoorSun.ts`, regel in `briefing.ts`, instelling `uv-hoogte`; de drempel is UV 3, de pet en zonnebril vanaf UV 6; ook 14 november, e99104c)
- Opruimronde 26 november, bewijs op main 9feda395: Back-up kleiner zonder dataverlies (I-63, 23e36ab; `storage/backupFile.ts`, `unpackProposalTexts`, test `backupCompact.test.ts`)
- Opruimronde 26 november, bewijs op main 9feda395: Forge, wens 3 november, de volgende open werkset bijstellen na afvinken, beide kanten op (`forgeReckon.ts#reckonAfterTick` en `estimateRepsAt`, aangeroepen in `ForgeWorkout.tsx`)
- Opruimronde 26 november, bewijs op main 9feda395: afvinkregels 4 en 5 lezen gelijk (`assumedSets.ts#confirmedRir`), geen `key` meer op het toestelformulier (`MachineWeights.tsx`, `standen.scan.test.ts`), de info-knop van een instellingsrij heeft een tikvlak van 44 bij 44 px (`settings.css` `.st-info`)
- Opruimronde 26 november, bewijs op main 9feda395: Geavanceerd als eigen pagina (route `/more/:groep/geavanceerd`, `App.tsx`), één notatie voor tijden (`utils/clock.ts#formatClock`, besluit `2026-11-02-instellingen-ronde3.md`)
- Opruimronde 26 november, bewijs op main 9feda395: Route-start na main, dode `hereStart`, `hereStartLine` en `startFailureLine` weg, de reden bij een mislukte plek (`engine/routeStart.ts#planStart`) en de valkuil dat een nieuwe vraag om je plek alleen uit een tik komt (`useRouteSearch.ts`)
- Opruimronde 26 november, bewijs op main 9feda395: mint Gedaan op Vandaag bij een loop met een horloge dat afvinkt (`engine/briefing.ts#missionButton`, `HowDidItGoSheet`), de horlogestand staat niet meer twee keer in het blad van een training, de route staat niet bij de loopband (`trainingPlace.ts#routeShownFor`), geen route in het blad in Week (`WeekPlanner.tsx#routeLineOf`)
- [I-105] Label "Ziek gemeld (26 november, cb082ce)
- [I-52] Eerste week bij heel licht (26 november, cb082ce)
- [I-139] Valkuil in een werkbriefje (26 november, cb082ce)
- [I-140] SessionLogsRepo.add leest bij elk nieuw log twee keer alle logs; op termijn een index op… (26 november, cb082ce)
- [I-87] Lookout Drempel 17 november (26 november, cb082ce)
- [I-141] Week op 360 px (26 november, cb082ce)
- [I-164] Na I-157, de planningpunten en I-163 (26 november, cb082ce)
- [I-163] Na het routepakket en I-162 (26 november, c14ca75)
- [I-156] In het voorstel "Intervallen rustiger" staan vaste afspraken voorbij de planhorizon doorgestreept… (26 november, c14ca75)
- [I-151] In engine/dayPlan.ts rekenen primary en rest van andere dagen dan vandaag met de ziekte van… (26 november, c14ca75)
- [I-148] Het weekvoorschrift zet bij een wedstrijd na de eerste opening rustige duurlopen in de vervolgweken… (26 november, c14ca75)
- [I-147] De opstartstap beschikbaarheid kiest een latere dag zonder te kijken of die open is (26 november, c14ca75)
- [I-146] Een training die Hoeveel per soort op Meer in de startweken erbij zet, krijgt na Akkoord een vaste… (26 november, c14ca75)
- [I-155] Twee kaarten voor dezelfde training kunnen naast elkaar staan (26 november, c14ca75)
- [I-157] Belangrijk advies in je gezicht (26 november, c14ca75)
- [I-153] "RIR" staat nog in de importmelding van ExerciseRow, de lege stand van Forge en de instelling "RIR… (26 november, 6e00642)
- [I-152] "RPE 3-4/10" is nog zichtbaar in de sportkeuze, de trainingsgids, de weekterugblik en… (26 november, 6e00642)
- [I-149] In de stand Hersteldag zeggen "Rustdag (26 november, 6e00642)
- [I-161] In het blad voor een meerdaagse tocht, bij "Hoe belangrijk is deze tocht?", staat vast een… (26 november, 6e00642)
- [I-158] Op de missiekaart in Vandaag staat "Zwaarte volgens MacroFactor" terwijl hij MacroFactor niet meer… (26 november, 6e00642)
- [I-150] Doe je vandaag een training van een andere dag op een rustdag, dan zegt de rij van vandaag in Week… (26 november, 6e00642)
- [I-162] In Week staat op di 24 november zowel de Rustige duurloop als de Rustdag "bewust herstel"; do 26… (26 november, 6e00642)
- [I-159] Na een pauze zonder ziekte stelt de terugkeer voor om de eerste rustdag van de instap te gebruiken… (26 november, 6e00642)
- [I-160] Een lange duurloop van 10 km en 300 hm haalt de hoogtemeters niet (26 november, 6e00642)
- [I-154] Geen suggestie om je rustdag te verplaatsen na een lange pauze (23 november, f61b85b)
- [I-23] M. Losse sport, alle stappen: elke sport te kiezen, passende woorden, een voorstel na een zware sport blijft tot je kiest en een duur verandert niet stil (23 november)
- [I-18] H. Beginner heel licht, alle stappen: de ladder, Akkoord, de belofte en de gewone woorden in Forge (23 november, 40a3c67)
- [I-14] D. Eén plan, alle stappen: C en D, eerste voorstel en dagbeeld (23 november, 5cd027b)
- [I-145] Losse sport (23 november, d99eb30)
- [I-143] Beginnersladder (23 november, d99eb30)
- [I-142] Vier kleine punten uit Verborgen schermen, alle vier nog op main (23 november, d99eb30)
- [I-144] Na een pauze van twaalf dagen zonder training staat op Vandaag de vaste Herstelwandeling als… (23 november, 7be515c)
- [I-138] De chip van de doeldag zit bij slepen achter de sleepkaart op 412 px; vraagt een andere indeling en… (23 november, 9f6c67f)
- [I-137] Bij verkouden zegt de uitleg bij een test of wedstrijd "Ziek train je niet" onder de kop "Je bent… (23 november, 9f6c67f)
- [I-136] Hoogte (23 november, 9f6c67f)
- [I-135] Forge zegt bij een opslag die nog loopt "sluit de app" met Annuleren, Hoe ging het? nu Sluiten (23 november, 9f6c67f)
- [I-134] Blad Versie noemt de stapnaam in de zin (23 november, 9f6c67f)
- [I-133] Run in detail toont geen totaal van de stijging, alleen het bereik; rules ?? rd in… (23 november, 9f6c67f)
- [I-132] De belastingkaart van een vorige week zegt "Deze week staat er geen training" bij een week met… (23 november, 9f6c67f)
- [I-131] Weekterugblik (23 november, 9f6c67f)
- [I-130] Werkbriefje planning (23 november, 9f6c67f)
- [I-125] Opmaak van docs/kennisindex/bronnen.json gelijk trekken (23 november, 9f6c67f)
- [I-82] Opruimen na de onderhoudsronde (23 november, 121f9c1)
- [I-74] Na I-67 (23 november, 121f9c1)
- [I-73] Wandeling van het horloge (23 november, 121f9c1)
- [I-60] Hoe ging het? (23 november, 121f9c1)
- [I-113] Heropen je een training terwijl Lichter aan staat en de aangenomen ijkset al weg is, dan weet het… (23 november, 121f9c1)
- [I-53] Routes op reis (23 november, fec6c45)
- [I-78] Vroeg zien dat je ziek wordt, scherper (23 november, fec6c45)
- [I-33] Hoogtemeters, na stap 1, rest (23 november, fec6c45)
- [I-77] Hoogtemeters van één loop (23 november, fec6c45)
- [I-72] Week: sleepregel en ruilblad netter (23 november, fec6c45)
- [I-59] Week: bij een gemiste sleuteltraining belooft de terugblik een inhaal na Akkoord en verwijst dan… (23 november, fec6c45)
- [I-58] Week, log in een andere week (23 november, fec6c45)
- [I-35] Grens van intervals.icu meten (23 november, 3654289)
- [I-54] Twee tabbladen (23 november, 3654289)
- [I-51] Opbouw van de start (23 november, 545d5a7)
- [I-123] Wind bij de lus (23 november, 545d5a7)
- [I-122] Na het omdraaien van de lus blijft de amber regel "Deze lus stijgt X m" op de oude hoogtemeters… (23 november, 545d5a7)
- [I-121] Andere lus, een richting waar niets ligt (23 november, 545d5a7)
- [I-120] Instelling Terug voor het donker heeft nog geen uitleg-knop; één zin uitleg erbij (23 november, 545d5a7)
- [I-112] Op de vraag of er ook langs water of bos en meer onverhard bij moet (23 november, 545d5a7)
- [I-118] Afhaken (22 november, ef1a92b)
- [I-117] Ondergrond (22 november, ef1a92b)
- [I-116] Hoogteprofiel onder de kaart van de lus, steile stukken in amber, uit de hoogtes die de lus al heeft (22 november, ef1a92b)
- [I-115] Terug voor het donker (22 november, ef1a92b)
- [I-114] Wind bepaalt de richting (22 november, ef1a92b)
- [I-111] "Ik mis hier een knop om een alternatieve andere route te maken  (22 november, ef1a92b)
- [I-71] IJkset Vragen en Lichter (22 november, d64572c)
- [I-108] Na bundel 22 november, Week (22 november, d64572c)
- [I-57] Week, rij van voor de start van het programma (22 november, d64572c)
- [I-69] Back-up automatisch, laat antwoord na de tweede poging (22 november, d64572c)
- [I-47] Richting Sterker worden met kracht uit (22 november, 40634d8)
- [I-110] Sterker worden met kracht uit (22 november, 40634d8)
- [I-109] Na I-46 en I-82 (22 november, 4302e8b)
- [I-46] Vaste notitie en uitleg bij de rij Weekbudget zeggen "2 keer kracht", ook met kracht uit; vraagt… (22 november, c19bfb5)
- [I-106] Back-up, na I-101 (22 november, 0eb7bce)
- [I-107] Koppelkaart, na bundel 22 november (22 november, 74855bb)
- [I-85] Vervallen training in het verleden (22 november, 2950cb7)
- [I-56] Ziek gemeld-melding (22 november, 2950cb7)
- [I-102] Koppelkaart springt als de knoppen aangaan (22 november, 2950cb7)
- [I-101] Strengere variant voor een tijdstip zonder bijpassende lijst (22 november, 2950cb7)
- [I-100] Gedeelde hook useShortTestStreams (22 november, 2950cb7)
- [I-99] Koppelvoorstel zegt niet dat een loop later in de week zijn korte test verliest (22 november, 2950cb7)
- [I-98] Import filtert manual:, garmin (22 november, 2950cb7)
- [I-97] Back-up importeren haalt uitgezette soorten voorgoed uit een ochtend zonder bron (22 november, 223614f)
- [I-96] Niet goed gemeten, tests en uitleg (22 november, 223614f)
- [I-95] Koppelvoorstel noemt niet dat de testloop verschuift (22 november, 223614f)
- [I-94] IJksetkaart, Akkoord als hoofdknop (22 november, 223614f)
- [I-93] Back-up, kopie van voor een import (22 november, 223614f)
- [I-91] Korte test, rest na de bouw van 18 november (20 november, ad2e4b9)
- [I-84] Ochtend dubbel na een oude back-up (20 november, 16f634a)
- [I-92] Niet goed gemeten, restpunten (20 november, 0daf3af)
- [I-83] IJkset te diep (20 november, 9c9e2dc)
- [I-68] Back-up terugzetten (20 november, c387de5)
- [I-90] Slaap niet goed gemeten kun je alleen zeggen als de app het vraagt (18 november, 83ed059)
- [I-89] Ochtendkaart zonder enig horlogegetal (18 november, 83ed059)
- [I-88] Week opnieuw plannen maakt een dubbele Heuvelsprints (18 november, 5ecd92c)
- [I-86] Drempel zonder voorstel zegt niets (18 november, 5ecd92c)
- [I-79] Eigen submaximale test (18 november, 5ecd92c)
- [I-66] Onderhoudsronde maandag 16 november (16 november, 23e36ab)
- [I-81] Wandeling plannen zegt doodlopend drie keer (16 november, 23e36ab)
- [I-49] Windjack vanaf 20 km/u (16 november, 23e36ab)
- [I-80] Blad van een overgeslagen training zegt niet waarom (16 november, 23e36ab)
- [I-63] Back-up kleiner zonder dataverlies (16 november, 23e36ab)
- [I-75] Wandeling plannen, route klopt niet met de vraag (16 november, e152f17)
- [I-67] Eén regel voor alle uitzonderingen (16 november, 4f5d722)
- [I-70] Wandelen loggen (16 november, f9039a7)
- [I-62] Wandeling plannen zonder training (16 november, 4cf7beb)
- [I-61] Waar je nu bent (16 november, af7fda7)
- [I-55] Trainingen sinds je back-up (16 november, b5b210d)
- [I-50] Back-up automatisch (16 november, b5b210d)
- [I-37] Weer van de plek, rest (15 november, 5d68b87)
- [I-32] Opslaan, rest van de rest (15 november, 9d035be)
- [I-9] Klein deel 2, rest (15 november, 9d035be)
- [I-38] Audit 13 november, nog open na Sherpa Opstarten (15 november, 9cdc1fb)
- [I-45] Forge Afronden (15 november, 701578c)
- [I-44] Forge Afronden (15 november, 701578c)
- [I-43] Week: een training op een andere dag gedaan dan gepland telt in Week op de geplande dag; de rij… (15 november, dee69d9)
- [I-42] Week: de kaart "Je hebt n trainingen gemist (15 november, dee69d9)
- [I-41] Inhaaladvies en kaart tellen anders (15 november, dee69d9)
- [I-40] Weekterugblik noemt alleen gemist (15 november, dee69d9)
- [I-48] Ziek melden (15 november, 91a4419)
- [I-8] Routes op reis (15 november, 09c716d)
- [I-39] Weekbudget bij kracht uit (15 november, 8cce377)
- [I-4] Afbreker randgevallen (15 november, 49eca57)
- [I-1] Week telt anders dan hij toont (15 november, 49eca57)
- [I-3] Q instellingen en wandelen in bpm, later (15 november, b243965)
- Zonder ASCEND als onderwerp, ronde 1 tot 3 (15 november, 969d2984, 4aa93017, 04c20065; besluit `2026-11-14-zonder-ascend-als-onderwerp.md`). Routes voor wandelen en rugzaktraining met klimtempo, stap 1 tot 3 (6517ccf, bf7acc7).
- [I-2] Kennisindex voor de documenten (15 november, 2d4ce3d)
- [I-27] Q. Instellingen (15 november, bba3a91)
- [I-7] StairMaster en wandelen naar het horloge (15 november, e78388d)
- [I-24] N. Starter en afbreker (15 november, 389d4c9)
- [I-6] Afbreker vervolg (15 november, 389d4c9)
- [I-17] G. Reisplanner begint in juli met taken uit het verleden; doelkop zegt hutten, paklijst is bivak… (15 november, 1fd6931)
- [I-29] R. De dag na een race (15 november, 4c6e911)
- [I-28] M2. Na Oude sportlogs (15 november, 0ad7ac8)
- [I-5] Tekstkaart ziet instellingenteksten niet (15 november, df46104)
- [I-26] P. Routes (14 november, 843aa4e)
- [I-25] O. Horloge (14 november, ca4c2dc)
- [I-22] L. Een zelf gemelde vakantie heet daarna "bleef liggen" en "0 van 5" met een advies Deze week nog… (14 november, 1861809)
- [I-21] K. Na ziekte en een vakantieweek springt het plan naar een volle week en loopt het blok door alsof… (14 november, 1861809)
- [I-15] E. De taperweek en de racedag beschermen tegen inhaaladvies, en Nog open ouder dan een week weg (14 november, 1861809)
- [I-19] I. De chip "Zwaarte volgens MacroFactor" en "Nog geen krachttrainingen ingelezen uit MacroFactor"… (14 november, e99104c)
- [I-16] F. Tempoloop (14 november, e99104c)
- [I-13] C. Een training met 2 van 23 sets krijgt "Gedaan zoals gepland" en de weekterugblik "Alles gedaan" (14 november, e99104c)
- [I-12] B. Duur 0 of negatief wordt stil een log van 0 min en telt als gedaan (14 november, e99104c)
- [I-11] A. Je dag noemt de geplande duur, de kaart de gelogde (14 november, e99104c)
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

- Hoe ging het? vanuit het Logboek en `SportFeltBlock` (spoor 6, het horloge, is live: `WatchAskSheet` in `Today.tsx`, besluit `2026-11-14-hoe-ging-het-horloge.md`): `components/sports/SportFeltBlock.tsx` vraagt alleen de zwaarte, en `LogDetailSheet.tsx` heeft geen Hoe ging het?; eigen spoor.
- Andere plek (Pathfinder, mag): de terugknop van Je plekken gaat naar Vandaag en meldingen, niet terug naar het blad Weer en kleding; het blad weer openen of de rij een gewone ingang maken.
- Andere plek (Pathfinder, mag): Thuis wissen kan bij Wis startpunt en op Je plekken; later Wis startpunt naar Je plekken laten verwijzen.
- Andere plek (coördinator, mag): op Je plekken staat bij Thuis twee keer Thuis (naam en soort, `PlacesPage.tsx`). Het afknippen van de schuifrij Start bij is weg (`RoutePanel.tsx#StartChips` wrapt).
- Andere plek (Pathfinder, mag): de rij Je plekken zegt alleen Bekijken, niet hoeveel plekken er zijn (afgewezen voor de laadproef van Instellingen; opnieuw bekijken).
- Briefing 5 en 6 (Pathfinder, mag): de knop op Vandaag staat onder de vouw doordat de ochtendkaart erboven staat; Vandaag zegt de missie niet in twee seconden als de ochtendvraag open is. (nakijken: `todayCards.ts` laat de ochtendkaart nog `lead: true`; of de knop onder de vouw valt is zonder scherm niet te meten)
- Briefing 5 en 6 (Pathfinder, mag): na de log staan twee getallen voor één loop op Vandaag (52 min in Zit erop, 50 min in Je dag). (nakijken: geen code of test gevonden die de twee getallen gelijktrekt; behandel als open)
- Briefing 5 en 6 (Pathfinder, mag): de plekkeuzes heten per training anders (Hardlopen, buiten of Buiten); op 360 px is de tweede keuze afgesneden zonder schuifhint. (nakijken: `shortPlaceLabels` en `PLACE_ROW_MAX = 3` bestaan, `engine/trainingPlace.ts`; of de namen overal gelijk zijn en op 360 px niets afvalt is niet gecontroleerd)
- Briefing 5 en 6 (Warden, moet klein): Health Connect telt wel mee bij Vanzelf afvinken (`WatchActivityCard.tsx`, alleen met de intervals.icu-stand `autoTick`), maar niet voor de Briefing-knop en de stand: `storage/sourceWatch.ts#readWatchLink` en `engine/briefing.ts#standOf` kijken alleen naar intervals.icu.

- Briefing spoor 2 (Pathfinder, moet op 360 bij 640): de hoofdknop van het blad Route valt daar net onder de vouw. Voorstel: rijen compacter (één regel per lus) of de knop als vaste onderrand van het blad. Op 412 (telefoon eigenaar) staat hij erboven. (nakijken: `routeSheet.ts` zet de kaarthoogte op `clamp(180px, 34vh, 340px)`; zonder scherm niet vast te stellen of de knop nu boven de vouw staat)

- Briefing spoor 2 (Warden, moet, later): `engine/routeSheet.ts#loopLines` herkent de korter-zin aan de tekst van proposalNotes; laat de planner de notes als {text, warn} teruggeven zodra routePlanner.ts mag bewegen (spoor 8).
- Briefing spoor 2 (Pathfinder, mag): de eerste vraag van de route is een lange tekstmuur zonder mint knop.
- Werkwijze (coördinator): Warden en Pathfinder zetten soms de hoofdmap op een andere commit (git checkout); in hun opdracht expliciet "alleen in een eigen worktree, nooit checkout in /home/user/ascend".

- Briefing A (Warden, mag): De avond ervoor laat de route-regel weg zolang de plekkeuzes nog niet gelezen zijn (nu telt dan de standaard; alleen als lezen langer dan 1 s duurt). (op main 9feda395 nog open: `useEveningBefore.ts` wacht niet op `useTrainingPlaces`)
- Briefing A (Warden, mag): readMap in storage/trainingPlace.ts neemt een lezing alleen over als er sinds de start geen save klaar is (versieteller).
- Eigen gewicht (Sherpa Afdaalklok): tpl_bodyweight en tpl_hill_easy hebben geen SESSION_STYLE; Eigen gewicht toont daardoor "Zone 2, praten kan" bij een krachttraining.
- Afdaalklok (Warden, mag): een weerruil of slepen kan Trap af uit het venster van de klok halen; de klok controleert dat niet. Test voor een ruil met Trap af als partner, en een test voor de duur bij een andere nieuwe rij in een voorstel.

- Afdaalklok (Pathfinder, mag): bij 21 dagen of meer mag de afdaalregel niet wegzakken achter "nog 3" in de adviezenkaart. (nakijken: geen gerichte aanpassing of test gevonden, `adviceCompute.ts`)
- Afdaalklok (Pathfinder, mag): na de afgevinkte duurloop wordt Trap af de missie, zoals elke tweede training op een dag. (nakijken: `descentRowNotes` doet alleen de aanwijzing in Week; voor de missie op Vandaag geen regel gevonden)
- Afdaalklok (Pathfinder, mag): telt het blad Gemist een vervallen Trap af mee als gemiste training? Nagaan en zo ja niet meetellen.
- Afdaalklok (Pathfinder, mag): de naam Trap af dekt geen duin of helling; pas als de uitleg in het scherm niet genoeg is.
- Afdaalklok (Pathfinder, mag): een korte Garmin-wandeling op een dag met duurloop en Trap af mag niet aan Trap af koppelen als de loop bedoeld is; testen met één dag.

Wat Pathfinder vindt en niet meteen terug naar een bouwer gaat. Eerste lijst (coördinator, 11 november), nog open: de avondkaart staat onder Advies, Nog open en Back-up (`Today.tsx`, `underDay` komt voor `EveningBeforeCard`). De redesign (Cartographer, `docs/visie/Ontwerp Route en trainingsscherm.md`) nam de rest mee; zie Pas live.
- Twee invarianten in de tekstkaart, open: dezelfde zin twee keer op één scherm of in één blad is een schending (`scripts/app-kaart/invarianten.mjs` kent dit alleen voor de Briefing); het aantal tikken van Vandaag tot de route en tot de datavelden staat in de kaart en mag niet stil groeien (geen invariant). De dubbele horlogeregel is weg. Opus.

## Groot

- Later, alleen voor de toekomst (eigenaar 11 november): andere horloges. Samsung Galaxy Watch komt via Samsung Health en Health Connect al binnen; telt mee zodra Health Connect als horloge dat afvinkt telt (zie Samenhang); een route naar een Samsung-horloge vraagt een app van derden. Apple Watch: gegevens zitten in Apple Health op de iPhone, daar kan een webapp niet bij; eerste stap is de omweg via intervals.icu (bijvoorbeeld HealthFit stuurt Apple Watch-trainingen door; Scout gaat eerst na of dat werkt), een eigen iOS-app (Mac, Apple-ontwikkelaarsaccount, TestFlight, WorkoutKit voor een loop naar het horloge) pas als iemand de app op een iPhone gaat gebruiken. Nieuwe bron altijd als adapter in `src/integrations/` met `source`, nooit velden per merk. Niet bouwen zonder vraag van de eigenaar.

- Herinrichting uit de ontwerprapporten (`docs/visie/Ontwerprapport gegevens.md`, `instellingen.md`): Stand met Ritme, de weekterugblik, het Logboek, Geavanceerd als eigen pagina, één notatie voor tijden ("13.05" bij het weer tegenover "06:11" in Instellingen). Een eigen ronde van een uur of meer met Cartographer. De keuzes uit de rapporten maakt de coördinator met het advies.
- Teksten stap 4: de teksten uit de code naar een vertaalbestand per taal, daarna Engels, te kiezen in Instellingen. Groot werk in alle componenten; de engine geeft ook zinnen terug. Pas na R10. Wacht: "Engels wacht" (plan van de coördinator, 9 november).
- Routeplanner na het kaartje: startpunt kiezen, huidige locatie en bijsturen (zie Inbox). `engine/route*`, `integrations/`. (nakijken: startpunt kiezen en huidige locatie staan deels live via route-start; `engine/route*` niet doorgelezen in de opruimronde van 26 november)

## Middelgroot

- Uitleg bij oefeningen: nog 28 oefeningen zonder uitleg (159 in `exercises.ts`, 131 in `exerciseGuides.ts`), in batches van twintig (Scribe schrijft, Scout toetst de techniek, bron in `docs/onderzoek/`; batch 5 live 26 november, 96f7ab1, batch 6 is de volgende; Scout heeft batch 5 nog niet getoetst). `src/data/exercises.ts`. Sonnet.
- Heuvels en de periode: de OpenStreetMap-regel op een vakantieadres of in een periode Zonder sportschool. Een periode heeft geen eigen plek; vraagt een nieuwe opgeslagen vorm met migratie (Fable).
- Health Connect, de rest: een ronde start alleen als je terugkomt in de app (niet na urenlang open staan); het blad Lichaamsgewicht toont heel even "Gewicht: staat uit" na weer aanzetten. (nakijken: `boot.ts` en `adviceAndWeek.ts` hebben een visibilitychange-luisteraar, maar of urenlang open staan gedekt is, en de tekst "Gewicht: staat uit", is niet vastgesteld)
- Zonder doel: de vorm van de week veranderen bij een andere richting (de kaart Je week op Je stand staat er al, `components/stand/YourWeekStandCard.tsx`). (nakijken: `engine/direction.ts` en de instelling richting bestaan; of de vorm van de week zelf verandert is niet vastgesteld)

## Klein en fouten

Deel 2 (Forge en Calisthenics):
- Spieren voor de berg heeft in Forge geen eigen schakelaar (Forge zit op het maximum van 6 rijen).
- Toestelstanden: standen in pond zijn alleen een omrekenvoorstel ("In pond"), geen vrije invoer; plaatjesnummers en optrekhulp; het strookje (nu "Ook schatten") op 390 px niet gezien; Rustig niet gezien.
- Reverse Lunge staat als dumbbell-oefening in de catalogus; een variant met eigen gewicht ontbreekt.
- De terugknop van het toestel sluit het uitlegblad ook na Lichter of Zwaarder; alleen Terug naar gaat een stap terug. (nakijken: `ForgeWorkout.tsx` noemt de weg "dezelfde weg als Ruilen", maar of het blad dicht blijft is niet vastgesteld)
- Calisthenics (maximum van 20 trainingen live in ronde 4): de toets van de straddle front lever is hoog; Ongedaan maken verdwijnt na Akkoord op een andere training; een back-up uit een nieuwere versie met een onbekende ladder bewaart die vaardigheid verborgen; Liever niet bij een stapvoorstel staat alleen in localStorage; 17 nieuwe tekeningen niet allemaal bekeken; een stopwatch bij een houding. (nakijken: niet uit de code vast te stellen: de toets van de straddle front lever, Ongedaan maken na Akkoord op een andere training, Liever niet in localStorage, de 17 tekeningen; open op main: onbekende ladder uit een nieuwere back-up, stopwatch bij een houding)
- Tempo: de stippen in de tempografiek zijn niet tikbaar; het blad gebruikt 8 weken, de kaart 12. (nakijken: tempograf-component niet teruggevonden in de opruimronde van 26 november)

Overig:
- Een helling zonder bekende hoogte telt mee in het aantal maar niet voor de hoogste (Route voorstellen).
- De kaart Let op op Vandaag verschijnt na het ophalen en kan de ochtendkaart onder de missie schuiven; mogelijk dubbel onweer met het bergweer.
- De periode Zonder sportschool geeft de 3 dagen na een tocht dezelfde lengteregel als de 72 uur rust.
- Overzicht Gewicht: met precies twee wegingen in twee weken kan het eind van de lijn een paar tienden afwijken van het grote getal. (nakijken: `weightTrend.ts` niet nagelopen)
- Nagekomen uit ronde 2b: een eigen sport telt niet in de weekcheck; "Laten staan" bij een vakantie en "laten rusten?" rond een Top-race voor vaste sporten; de waarde "Alles normaal" valt af in de rij Hoeveel per soort op 360 px; een test die alle Android-XML vooraf leest (een dubbel streepje in commentaar brak de APK-bouw). (nakijken: een eigen sport in de weekcheck en "Alles normaal" op 360 px niet vastgesteld; open op main: Laten staan bij een vakantie, en een test die alle Android-XML vooraf leest)
- Weekvoorschrift: `consecutiveKeepWeeks` telt openingen in plaats van weken (`engine/weeklyPrescriptionBuilder.ts` r. 470, onveranderd: de opgeslagen teller van de week ervoor plus één; de engine kiest in `weeklyPrescriptionEngine.ts` een opgeslagen waarde voor een verse). De eerste tien tot vijftien openingen na een verandering schrijft de stap daardoor elke keer voorschriften weg en leest de app een keer extra. Geen melding; de teller wordt nergens gelezen (Sherpa Weekplan, 12 november).

## Nakijken

- Route-start na main, rest (Warden 12 november, mag; de dode `hereStart`, `hereStartLine` en `startFailureLine` zijn weg, de reden bij een mislukte plek staat in `engine/routeStart.ts#planStart`): het raakvlak van de naamsvermelding (RouteMap r. 270) vangt mogelijk een tik voor Start hier in de hoek, op 360 px nakijken (nakijken: `routeStart.scan.test.ts` toetst alleen de afmetingen); een scantoets voor Rustig en Uit zonder overgang in RouteSearching (de code is goed, `transition: 'none'` op r. 73, de toets ontbreekt).

- Forge RIR (Warden, 11 november, mag): `firstAtTop` vraagt bij de eerste set op de bovenkant, `topSetOf` leest de zwaarste set; bij een lichtere eerste set of een bijgesteld gewicht kan de stap zwaarder een keer gemist worden. Test met ongelijke gewichten en zo nodig dezelfde set kiezen.

- Leg press zonder opgeslagen standen (Sherpa Forge verloop, 11 november): Forge leert de stappen uit gebruikte gewichten, laat 91,6 vallen omdat het op 202 pond lijkt, en vult het gat met 94,4, 99,4 en 104,4 kg die niet op het toestel staan. Bestaand gedrag. Nagaan met de back-up (skill naspelen) of dat toestel standen heeft; zo niet, mag Forge dan gewichten voorstellen die niet op het toestel staan? (op main: `legPressStands.test.ts` legt het gedrag vast, instelling `stackWeights` met standaard 'learned'; nakijken: of het toestel van de eigenaar standen heeft kan alleen met zijn back-up)

Twijfel of het af is; eerst kijken, dan schrappen of bouwen.
- Rustdag terug, rest: `catchUpFits` in `engine/restDayBack.ts` kijkt niet naar een afgewezen inhaalvoorstel, zodat dat de rustdag tot zeven dagen kan tegenhouden (het deel over `trainedOn` en `dayLoads` is af).
- Tempo bij zone 2, kleine rest: een oude `aerobicProgressCelebrated` na 14 dagen negeren (`aerobicTrend.ts#progressMoment` weegt een oude vermelding nog mee); de regel voor benen die niet uitgerust zijn (hoofdstuk 5 van het verslag), niet in de code teruggevonden. Het dauwpunt per loop is gebouwd (`heatPace.ts`, `WeatherLine.tsx`).
- Jaaroverzicht: "Testloop 5 km: 14 jan en 15 jan", twee dagen voor één test. Fout in de gegevens of in de telling?
- De vaste doorloop van Lookout gaf Stand helemaal leeg; een eigen afdruk was vol. Drukt de kit te vroeg af?
- Startvragen: standaard is "Een tocht of wedstrijd"; is "Fit blijven" logischer voor iemand zonder plan?
- Op een toestel of in een echte browser nog niet gezien: de echte Overpass- en hoogteaanroep, live Open-Meteo-waarschuwing en EAWS, opslaan in Documenten/ASCEND, een GPX als koers in Garmin Connect en op het horloge, de keuzelijst van Android, lussen boven ongeveer 18 km (de heuvelcache is 3 km), de locatievraag bij Precies, plakken in de echte Strava-app, de tempoband met 8 of meer lopen over 4 weken, het bolletje gewicht en aandeel met een echte weging, 34 van de 40 uitlegteksten van batch 3 en 4.
- Routeplanner: in de afdruk waren beide lussen korter dan de training (4,2 en 4,6 km bij 6 km); nakijken met echte lussen van de eigenaar. (nakijken: `routePlanner.ts` heeft `SHORT_LIMIT = 0.1` en een korter-regel, maar zonder echte lussen niet te beoordelen)
- Feiten om te toetsen (Scout): de factor 0,98 voor de drempelhartslag na een 5 km; Sporten lezen echte intervals.icu-types (Swim, Padel, Soccer, Yoga) alleen met nagemaakte data getest; de drempels van vermoeidheid tussen oefeningen niet op echte trainingen getoetst.

## Wacht op de eigenaar

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
