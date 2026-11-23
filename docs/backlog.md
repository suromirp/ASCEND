# Backlog

Wat nog op de lijst staat, zodat een nieuwe sessie het niet uit het gesprek hoeft te halen. De
coördinator houdt dit bij: iets wat live staat gaat eruit, iets nieuws komt erbij met een regel uitleg.
Opnieuw opgebouwd op 11 november 2026 tegen main (2a333d5): alles wat live staat is eruit, wat eruit ging
en waarom staat in `docs/onderhoud/2026-11-11-backlog-opnieuw.md`. De geschiedenis staat in git en in
`docs/beslissingen/`.

## Inbox
Hoogste code: I-130. Een nieuw punt krijgt het volgende nummer (zet het getal hier mee op). Een bouwer zet `Klaar: I-<n>` in zijn commit; na de squash naar main zet `npm run backlog:bij` het punt onder Pas live.
- [I-130] (23 november, Warden route, mag) Werkbriefje planning: BEGINNER_SWAPS splitsen beschrijven (rest van I-51), en de zin bij Opbouw van de start eindigt op "Telt alleen bij Rustig beginnen".
- [I-129] (23 november, Warden route, mag) Werkbriefje lopen-en-tests: één zin over het toevoegen van een nieuwe Overpass-soort (terrein bij Andere lus).
- [I-128] (23 november, Warden route, mag) BigRouteSheet: `cancelVia` ook in `onClose`, en `viaChoosing` wissen bij een nieuwe zoeksleutel, zodat de kiesstand nooit blijft hangen.
- [I-127] (23 november, Warden route, mag) Teksten "heuvels en paden" noemen ook water en bos (uitleg/vandaag.ts rond 238 en 248, RoutePanel.tsx rond 184, HillsNearbyLine.tsx rond 57).
- [I-126] (23 november, Warden route, mag) Uitleg van de wind bij de lus noemt de grens van 25 km en dat het om het uur van nu gaat (uitleg/vandaag.ts rond 270, vandaag.ts rond 716).
- [I-125] (23 november, Warden route, mag) Opmaak van `docs/kennisindex/bronnen.json` gelijk trekken (inspringen en volgorde van de nieuwe regels).
- [I-124] (23 november, eigenaar, hoog, Opus plus Warden) Terugkeer na pauze: na bijna twee weken vrij en ziek een volle week zonder voorstel om rustiger terug te komen (`engine/reentry.ts` waarschijnlijk verlopen). Naspelen, dan: pauze telt vanaf de laatste echte training, voorstel verloopt niet voor de eerste week na terugkomst voorbij is of gekozen is, Forge iets lichter na meer dan 10 dagen zonder kracht, één kaart met het droge feit eerst en Akkoord of Liever niet. Instelbaar. Besluit 2026-11-23-terugkeer-na-pauze.md. Aanvulling eigenaar: een vrije periode mag achteraf vastgelegd of verlengd worden (advies tot 4 weken terug, instelbaar; nu weigert `validateLeaveDraft` in `engine/leave.ts` met "Deze periode is al voorbij."); voor voorbije dagen verplaatst het voorstel niets, het zegt alleen welke dagen als weg tellen (niet gemist; een dag met een log blijft gedaan); de periode telt mee voor de terugkeer; de melding bij een te oude periode zegt wat wel kan.
- [I-113] (22 november, Warden en Sherpa forge, mag) Heropen je een training terwijl Lichter aan staat en de aangenomen ijkset al weg is, dan weet het scherm het Akkoord niet meer (`calAccepted` leeft in het geheugen van `ForgeWorkout.tsx`); de set blijft dan weg. Klein, kost hooguit één ijkset.
- [I-105] Label "Ziek gemeld: koorts" (I-56) niet op 360 px gezien: Lookout vond het voorstel met die titel niet in de testdata. Bij de volgende Lookout meenemen.
- [I-104] Zin "Je rustige loop van <dag> krijgt dan geen korte test meer." (I-99) niet op het scherm gezien; alleen in tests. Bij de volgende Lookout meenemen.
- [I-103] Token voor de zachte mint vulling (Warden 21 november, mag): de 18%-vulling van Akkoord staat nu in StepProposalNotice en CalibrationNotice; komt hij een derde keer terug, maak dan een token `--color-action-soft` in `src/index.css`.
- [I-87] Lookout Drempel 17 november (mag, bestaand): de uitlegknoppen (i) in de rijen van het blad Testloop zijn 20 bij 20 px (de rij zelf 44 px), en de voorstelkaart heeft vier mint Straks-regels naast de mint knoppen. Bij een volgende ronde in die rij en kaart meenemen. (nakijken 23 november: tikvlak is 20 px plus inset 13, samen 46 px; lijkt opgelost)
- [I-82] (22 november deels gebouwd, c19bfb5: punt 2 en 4, van punt 1 alleen goalSetupAssist; stageAt.ts en traitsProfile.ts bewust gelaten als voorbereiding; over: punt 3) Opruimen na de onderhoudsronde (16 november, `docs/onderhoud/2026-11-16-onderhoudsronde.md`): eerst punten 1, 2 en 4 (drie bestanden alleen voor tests, 11 dode exports, guards naar `utils/guards.ts`), daarna Zonder sportschool overal via `dayRules.ts` (punt 3, planning, Warden Fable). Geen gedragswijziging; tekstkaart gelijk.
- [I-78] Vroeg zien dat je ziek wordt, scherper (eigenaar 16 november 09:05, "ja"): de regel in `engine/illnessSigns.ts` sloeg bij de verkoudheid van 15 november terecht niet aan (rusthartslag 46/51/50 tegen 49, HRV één ochtend 58 tegen 72 na 3,5 uur slaap). Uitzoeken (Scout, `docs/onderzoek/Kansen met gegevens.md` kans B): slaapduur als derde signaal of als ruisfilter; één ochtend met een heel duidelijke afwijking; welke extra velden via intervals.icu wel komen (avgSleepingHR, respiration) op een Forerunner 255. Ook (eigenaar 09:05): welke extra velden van intervals.icu we per training en per ochtend nog niet lezen en wat ze opleveren (tijd per zone, belasting, hartslagherstel `icu_hrr`, temperatuur van het horloge, beste tempo's, avgSleepingHR); Body Battery, stress, ademhaling, SpO2 en VO2max komen niet door (Garmin filtert). Daarnaast: in de back-up staat elke ochtend twee keer (`mornings`, zelfde id, één zonder HRV): nakijken in de onderhoudsronde of dat de telling van de gemiddelden raakt.
- [I-77] Hoogtemeters van één loop: twee getallen (eigenaar 16 november 08:53, naspelen met zijn back-up van 08:45): een lange duurloop toont in het logblad Stijging 133 m (samenvatting van het horloge via intervals.icu, `outdoorData.elevationGainM`), maar de km's in Run in detail (`runDetail.kms[].gainM`) en `detail.slices` tellen samen 85 m; bij afronden zag de eigenaar het lagere getal. De reeks is gladgestreken of grover bemonsterd en mist kleine klimmetjes. Voorstel: overal het getal van het horloge als totaal; de km's naar verhouding schalen of zeggen dat ze uit de reeks komen; één bron per getal, en een invariant in de tekstkaart dat totaal en som van de km's niet meer dan 10 procent uit elkaar liggen. Uitzoeken waar Training afronden het getal vandaan haalt. Opslag niet herschrijven (historie).
- [I-76] Luchtfoto buiten Nederland en Frankrijk (eigenaar 16 november 08:51): "waarom hebben we geen betere satellietfoto hier, je kan echt niet inzoomen". Buiten NL en FR valt de luchtfoto terug op EOX (Sentinel-2, ongeveer 10 m per pixel). Onderzoek per land een open nationale luchtfoto zoals PDOK en IGN (Portugal: de orthofoto van DGT; Spanje: PNOA van IGN-ES), met licentie, naamsvermelding en grensvlak volgens de valkuilen in koppelingen-en-data; daarna een vlak per land zoals NL en FR. Scout eerst, dan Sherpa.
- [I-74] Na I-67 (Warden, Pathfinder en Lookout 16 november, mag): een test of wedstrijd op een koortsdag staat nergens in Let op (ILL meldt alleen niveau 1); het voorstel bij ILL biedt alleen laten vervallen, "naar een rustige dag verplaatsen" is vriendelijker bij verkouden; `qualifiesForCatchUp` krijgt in `src/state/moveActions.ts:188` geen pause mee; de chip van de doeldag zit bij slepen deels achter de sleepkaart (412 px); stap 5 (de ronde) en de dagkeuze binnen voorstellen lezen dayRules nog niet (lijst in dayRulesScan.test.ts).
- [I-73] Wandeling van het horloge (Warden 16 november, mag): een horlogewandeling zonder hoogtemeters wordt nog Herstelwandeling (`src/engine/activityImport.ts:313`, manier op regel 366), terwijl los loggen nu Wandeling kiest (I-70). Twee namen voor hetzelfde; raakt vanzelf afvinken, dus Warden op Fable.
- [I-72] (22 november deels gebouwd: dag één keer in de sleepregel, naam in het ruilblad, korte chip, één punt op de rustdag; over: de twee TAKEN_LINE-punten) Week: sleepregel en ruilblad netter (Lookout en Pathfinder 16 november, mag): de sleepregel noemt de dag twee keer ("Woensdag 18 november. Bovenlichaam A op woensdag 18 november: ..."); het ruilblad zegt "Deze training werd korter" over de andere training zonder die bij naam te noemen en herhaalt de dag; de chip "Ruilen met" valt op 360 px over de titel van de rij eronder (al op main); op je rustdag in een periode zonder sportschool kan één training twee punten in Let op geven (REST-DAY en NO-GYM, weekConcerns.ts:77/104); TAKEN_LINE bepaalt gedekt op gedeelde id's (weekFixProposal.ts:339/364).
- [I-60] Hoe ging het? (Warden 15 november, mag): hetzelfde "loopt nog"-gat als op het oude trainingsscherm: een tweede poging terwijl de eerste loopt. En bij een losse training heet de knop links Annuleren terwijl de wachtzin "Sluit en probeer opnieuw; je invulling blijft bewaard" zegt (Lookout); Forge zegt bij hetzelfde "sluit de app" (Pathfinder): één uitweg kiezen.
- [I-58] (eigenaar 23 november: minuten tellen in de week van uitvoeren, geplande week blijft gelijk) Week, log in een andere week (Warden Fable 15 november, bestond al, mag): staat het log van een training een week later dan gepland, dan zegt de geplande week "2 van 2 gedaan · 45 min" terwijl de minuten in de week van het log staan. Kiezen: de minuten mee naar de geplande week, of bij gedaan zeggen dat het in een andere week was. Vastgelegd in `src/engine/wardenWeekProef.test.ts`.
- [I-59] Week (Pathfinder 15 november, later): bij een gemiste sleuteltraining belooft de terugblik een inhaal na Akkoord en verwijst dan naar Week opnieuw plannen, dat ook de inhaal terugzet (`weekGlance.ts:97-103`, `replanWeek.ts:203`); en valt Gemist buiten de twee regels van Let op, dan staat hij zonder verwijzing (`weekGlance.ts:48`, `:108`). Schermlezer: "gedaan" en "di 27" zijn twee spans zonder spatie.
- [I-52] Eerste week bij heel licht (Lookout 15 november): Herstelwandeling 45 min staat langer dan de lange wandeling van 30 min, en kracht 75 min past slecht bij "alleen makkelijk"; de wandelkaart op Vandaag heeft het etiket "Vandaag · Hardlopen". Hoort bij I-18 stap 3.
- [I-53] Routes op reis (Pathfinder 15 november, later): zoekt hij zonder actuele kaart, zeg dat in één regel (`routeProposal.ts:135`); bij een time-out een snelle weg naar een andere plek naast Opnieuw.
- [I-54] Twee tabbladen (Warden 15 november): dezelfde geplande training tegelijk opslaan of afvinken in twee tabbladen schrijft twee logs (`src/state/logSession.ts:92-127`, kijken en schrijven niet in één transactie). Opslag, Warden op Fable.

- [I-10] Profielendoorloop 14 november (verslagen in `docs/profielen/2026-11-14-*.md` op de branches `claude/profiel-*`; vier van vijf binnen, ziek-vakantie loopt). Moet, gegroepeerd, in volgorde van bouwen:
  - [I-14] D. Eén plan: het eerste voorstel noemt een herstelwandeling die daarna nergens staat en 2 keer kracht bij 1 in het plan (beginner 1, GR5 7); Vandaag, Week en de weekbalk noemen verschillende trainingen (hardloper 1); het voorstel Deze week nog een keer? noemt 60, 55 en 50 min voor dezelfde loop (GR5 5); na een zware test "je benen zijn dan fris" naast "rustig houden" (hardloper 2). Planner, Opus met Warden op Fable; eerst naspelen. (nakijken)
  - [I-18] H. Beginner: "de eerste vier weken alleen makkelijk" maar week 1 heeft 75 min kracht met 23 sets en een lange loop van 60 min; vaktaal (RIR, RPE, Zone 2, Voorschrift) zonder uitleg (beginner 4, 5). Eerst Cartographer en Scout op Fable, dan planner. Ontwerp klaar (`docs/visie/Ontwerp beginner heel licht.md`); eigenaar 15 november: alle drie de keuzes het advies (`docs/beslissingen/2026-11-15-beginner-tien-procent.md`). Stap 0 en 1 lopen.
  - [I-20] J. Tikdoelen, rest: Jaaroverzicht 38 px breed (GR5 3). Forge en de start staan live (e2260329, e99104c). (nakijken 23 november: Jaaroverzicht is nu een volle SheetRow; lijkt opgelost)
  - [I-23] M. Sport uit Losse training, rest (oude logs lezen al via `sportOfLog`, 2ee2f6f): zwemmen, padel en voetbal niet te kiezen zonder eerst een rol in Instellingen (2); na zo'n sport passen aanmoediging, kleding- en zweetvragen niet (3, 4); een voorstel na een zware sport verdwijnt de volgende ochtend zonder keuze (10); een sessieduur verandert zonder voorstel (9). Opus, Warden Fable voor 9 en 10.
  Mag: zie de verslagen (back-upkaart op dag 1, dubbele zin na afronden, Kies je plaats landt op Weer en kleding, 0 km voor onbekend, afronding van weken).
- [I-30] Samen 14 november, rest (Lookout, Pathfinder en Sherpa Opslaan, mag): het oude trainingsscherm (`ExerciseLogger.tsx`) toont bij een losse training nog de wachtzin zonder uitweg; de wachtzin bij opslaan is lang voor 360 px (Lookout zag hem niet live); de uitleg van "Vragen na je loop" zegt dat de rij na 72 uur verdwijnt; een bron geruild voor een oefening op hetzelfde patroon geeft een gewone opwarmset in plaats van een gedempte (zin in het besluit); `src/engine/warmupLater` in de testregel van `docs/werkbriefjes/forge.md`. Klein.
- [I-31] Les samenvoegen (14 november): twee branches die elk groen zijn, kunnen samen stuk gaan zonder conflict (`question` weg in de ene, gelezen in de andere; Vandaag crashte). Altijd tsc op de proefmerge, voor Lookout.
- [I-33] Hoogtemeters, na stap 1, rest (Warden 14 november): de bodem van 20 m naspelen met de zes vlakke lopen uit het onderzoek (skill `naspelen`, back-up nodig): verliest een nieuw vlak log met eigen telling ruim boven het horloge (57 tegen 33 m) zijn horlogegetal en daarmee zijn oude vergelijkbare lopen? Zo ja, de bodem in m per km tegen `SIMILAR_CLIMB_M_PER_KM`. Een test voor de bodem in `aerobicTrend.ts#climbPerKm` (mutatie bleef groen); `runMetrics` leidt het horlogegetal af uit een afgerond percentage, de andere twee lezen het log; `aerobicTrend.ts:234` geeft 0 door waar `undefined` bedoeld is; `HILLY_M_PER_KM` en de terugval in `aerobicTrend` lezen het merk nog niet; stap 2: `places.ts#routeLine` en `proposalFacts` gelijktrekken.
- [I-34] Verborgen schermen, rest (Pathfinder 12 en 14 november): ontwerp later: na een loop zes tot acht lagen (Debrief, CompletionMoment, RunInsight, RunDetail, WatchActivity, LogDetail, DaySheet) naar één moment; groep Gidsen uit het tandwiel naar ingangen op hun moment; Forge-instellingen tijdens het trainen in een blad; instellingen samenvoegen per onderwerp; Alleen onderweg samen met Als het misgaat. Mag: een trekdoel dat geen hoofddoel is krijgt geen Reis-regel (`useJourney.ts:30` neemt de datum van het hoofddoel; ook nagaan of de Reisplanner dan een verkeerde afteldatum toont); de regel op Etappes "Nog geen tocht om mee te vergelijken" wordt "Nog geen gelopen dag om mee te vergelijken"; telt een gepauzeerd of afgerond trekdoel mee in `hasTrekGoal`; de Kennisbank toont zonder doel "De GR5 in etappes" en "Je rugzak pakken" (les van de week nagaan).
- [I-35] Grens van intervals.icu meten (Warden 14 november, mag): kop en inhoud delen nu één grens van 15 s; meet met een vertraagde lijn en een lange activiteit of een groot antwoord dan nog binnenkomt. Een herstelstap die elke start faalt staat alleen in de console (teller in meta voor de diagnose?).
- [I-36] (Scout klaar 15 november: alles houden behalve het windjack, zie I-49) Kleding en wind, vervolg (Pathfinder en Warden 13 november, mag): de windgrens van de weerzin (15 km/u, 2 graden gevoel) en die van het windjack (25 km/u) en de warmtebonus van de lange duurloop toetsen aan bronnen met een korte Scout; staat Weer uit en Kledingadvies aan, dan noemt de kledingzin de wind niet (`briefing.ts` rij Weer, `ClothingAdvice.tsx`, `eveningBefore.ts`); een zin na een tik tegen de bestaande richting in leest vreemd (`feedbackSentence`).







Wat de eigenaar tussendoor meldt, voor het volgende bouwmoment (maandag, woensdag, vrijdag; skill `bouwmoment`).
Vast punt, elk bouwmoment: na de punten hieronder de eerstvolgende open ronde uit het rooster hieronder. Een opmerking over hetzelfde komt bij het bestaande punt. Meteen, tussendoor: iets dat nu stuk is (de app werkt niet, verkeerde getallen in je training, data die verloren kan gaan) en kleine fixes die de coördinator zelf in een paar minuten doet, zonder helper (een tekst, een regel, een getal). De rest gaat in de Inbox.

Leeg: alles van 11 november staat in de Bouwrij hieronder, die de coördinator deze week zelf bouwt.

## Bouwrij deze week (coördinator, tot en met 15 november)

Het bouwmoment slaat deze rij en het rooster over: de coördinator start de bouwers zelf, hoogstens drie tegelijk, nooit twee aan dezelfde bestanden, model volgens skill werkverdeling "Deze week". Volgorde is de volgorde van starten zodra er plek is.

- Profielen, vervolg (coördinator 14 november, eigenaar vroeg of er meer nodig zijn): niet nu. Eerst D, H en Q op main. Dan de negen profielen van 14 november opnieuw als herhaling (werken de reparaties, brak er niets). Daarna een derde ronde op wat nog niemand bekeek: lange termijn (zes weken Forge, een GR5-doel over maanden met de Ascend-tab en de rugzakladder), de echte Android-app (installeren, back-up in de map, meldingen), toegankelijkheid (grote letters, één hand), lang offline (meerdaagse tocht). Sonnet, hoogstens drie tegelijk.
- Volgorde na de huidige rij (eigenaar 14 november: "kies jij"): vaste ijktocht (routes voor wandelen staan live: 6517ccf, bf7acc7). MacroFactor eruit na deze week (eigenaar), als opruimklus; oude logs blijven leesbaar.
- Instellingen op één plek (nakijken: stap 0 tot 3 staan op nacht, 1513c3f en e6baef5, besluit `2026-11-15-instellingen-op-een-plek.md`) (eigenaar 14 november: "Allebei"): elke instelling staat nu in vijf bestanden (settingsIndex, settingsLayout, settingsSummary, settingsHelp, een groepspagina) en dat zijn de bestanden met de meeste conflicten. Eén verklaring per instelling (id, titel, groep, uitleg, advies, samenvatting) waaruit de andere vormen worden afgeleid; geen gedrag of tekst verandert; de tekstkaart blijft gelijk. Eerst Cartographer of Scout op Fable voor de vorm, dan bouwen op Opus, Warden Fable. Een tijdstip zonder andere bouwers aan instellingen.
- Plekken en routes (spoor 1 en 2 live, 7079480 en 073080f; Andere plek met zoeken op naam live, 1af978e en Photon 41587a4; de rest open) (besluit `2026-11-11-plekken-en-routes.md`, eigenaar "Ja go" 11 november): na Briefing 5 en 6. Sporen volgen uit `docs/visie/Ontwerp Plekken en routes.md`; antwoorden van de eigenaar in `2026-11-11-plekken-antwoorden.md` (afstand hangt af van de training: 75 km, korter dan 90 min hoogstens 25 km). Eerst Plekken als opgeslagen vorm met migratie (Vast punt wordt Thuis), export en import, op Fable; dan route bewaren; dan plek voorstellen in de Briefing; dan Nieuwe plek vooraf (zoeken op plaatsnaam, pin op de kaart met tegels). Garmin vooraf: `docs/onderzoek/Garmin koers vooraf klaarzetten.md`. Niet door het bouwmoment. Na spoor 1 (Warden 11 november), voor spoor 2 en 3: het voorbeeld van een import noemt plekken; Wis startpunt vraagt eerst als Thuis routes heeft, al voor spoor 2 routes laat bewaren.
- Zoeken op de kaart en avontuurlijke plekken (zoeken op naam live, 1af978e en 41587a4; avontuurlijke plekken open) (eigenaar 11 november avond): een plek intypen of zoeken (spoor 7 van Plekken, `integrations/openMeteo.ts#searchPlaces`, naar voren halen na de startkeuzes), en voorstellen van heuvels, bossen en natuurgebieden binnen de afstand van de training (25 of 75 km). Geen eigen lijst: die veroudert en dekt alleen wat iemand intypte. Bron: OpenStreetMap via Overpass (al in gebruik bij heuvels en paden) plus hoogtetegels voor hoogtemeters, met één zin waarom de plek past. Scout eerst: welke OSM-kenmerken (natural=peak, ridge, wood, boundary=protected_area, leisure=nature_reserve, route=hiking), grenzen van Overpass, en hoe het in Nederland werkt waar toppen laag zijn. Daarna ontwerp met Pathfinder, dan bouwen. Geen plaatsnamen van de eigenaar in tests of docs. Scout klaar (12 november, `docs/onderzoek/Avontuurlijke plekken uit OpenStreetMap.md`): de app heeft geen hoogtetegels, dus reliëf via één Open-Meteo-aanroep; alleen benoemde toppen, uitzichtpunten en natuurgebieden; hoogstens drie voorstellen; startpunt pas na een tik. Eerst ijken van de grove hoogtemetermaat tegen bewaarde routes en een proefaanroep (tijdgrens, CORS van de tweede server). Zoeken op naam bouwt Sherpa Zoeken op naam nu.
- De avond ervoor, plek (Sherpa 14 november, advies): de kaart direct onder de missie op de avond; eigen besluit van de coördinator. Klein.
- Spieren voor de berg, rest (Warden 14 november, mag): één dag verlof haalt de hele week weg, ook als er die week getraind is (noemen of een week met krachtwerk laten meetellen); de doorgifte van `leave` in `ForgeMenus.tsx` aan Ruilen bewaken met een test. Klein.
- Spieren voor de berg: tekeningen voor de vier evenwichtsoefeningen; een test op de Forge-weergave van een houding met reps 4-6; Ruilen zegt "de laatste vier weken" ook als er door een rustweek of vakantie minder weken meetelden (`swapReason`). Klein.
- Kansen 11 november, door de eigenaar gekozen (alle met het advies; bronnen in `docs/visie/Kansen 11 november app.md` en `docs/onderzoek/Kansen 11 november training.md`):
  - Vaste ijktocht elke zes tot acht weken als kompas voor de berg, inplannen via Akkoord. Planning, Fable.
  - De beenindex leert van je ochtendantwoorden (`learning.ts#indexChecks`), begrensd, veiligheidsregels nooit soepeler, met migratiestap. Fable.
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
