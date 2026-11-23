# Ontwerp Losse sport

Ontwerp voor de rest van backlogpunt I-23 (M): zwemmen, padel en voetbal in Losse training, de teksten na zo'n sport, een voorstel dat niet stil verdwijnt en een duur die niet stil verandert. Cartographer Losse sport, 23 november 2026. Een voorstel, geen besluit; `src/` is niet aangeraakt. Bouwt op `docs/visie/Sporten die meetellen.md` (rollen, vraag bij een nieuwe sport, 2.5) en op `docs/onderzoek/Zweetverlies en water.md` en `Kleding bij het weer.md`, die alleen lopen en wandelen onderzochten. Oude logs lezen al via `sportOfLog` (2ee2f6f).

## Stand per deelpunt (code van main, 23 november)

- 2, nog aanwezig. Losse training krijgt de sjablonen uit `state/AppDataProvider.tsx:123` (`withCountingSports`). Daarin staat een sport alleen als hij meetelt (`engine/sportTemplate.ts:44`), en zonder rol is de rol leeg zolang Vragen bij een nieuwe sport aan staat (`engine/sportRole.ts:111`). Dus geen Zwemmen, Padel of Voetbal onder Anders (`engine/adHocGroups.ts:43`, `:62`) tot je in Instellingen een rol kiest. De vraag "Je deed zwemmen. Hoe telt dit?" leest alleen horlogeactiviteiten (`components/sports/SportAskLine.tsx:56`), nooit een handlog.
- 3, nog aanwezig. Na Gedaan zoekt `state/logSession.ts:159` het sjabloon alleen in de opgeslagen sjablonen; het afgeleide sjabloon van een sport wordt nooit opgeslagen (`engine/sportTemplate.ts:4`). Elke padelpartij of voetbalwedstrijd krijgt dus `engine/coach.ts:159`: "Goed dat je bewoog. Licht en rustig is precies de bedoeling van vandaag." Met sjabloon zou `coach.ts:172` een zwembeurt van 25 minuten "Een korte training. Dat telt ook." noemen, tegen de 60 minuten van `sportTemplate.ts:33`.
- 4, deels opgelost. Na afloop klopt het: Hoe zat je kleding? valt weg (`components/ClothingFeedback.tsx:25`) en de zweetrij ook (`components/useSweatAfter.ts:48`), want beide krijgen het hele log en dus `sportOfLog`. Vooraf niet: `engine/sweatMoments.ts:24-25` geeft het sjabloon zonder `countedSport` door, `logSport` maakt er hardlopen van, en `components/SweatBeforeRow.tsx:27` vraagt op de missiekaart (`TodayMissionCard.tsx:229`) om je te wegen voor een vaste afspraak zwemmen, padel of voetbal. Kledingadvies vooraf blijft terecht leeg (`engine/clothing.ts:72-80`).
- 10, aanwezig in opzet. Het voorstel "Je speelde gisteren padel. Benen B staat er vlak na." wordt bij elke opening opnieuw afgeleid (`engine/weekConcerns.ts:62-68`, `:154-171`; `engine/weekFixProposal.ts:416-427`) en nergens bewaard. Het leeft zolang de bevinding leeft: de training vanaf vandaag en zonder log (`engine/weekValidator.ts:149`), de sport hoogstens 4 dagen terug (`engine/sportDays.ts:17`, `:51`), en niet gedekt door een voorstel op Vandaag (`weekFixProposal.ts:422`; de ochtend van de beendag zelf kan Lichter of een dag later daar staan). Valt een van die drie weg, dan is het voorstel weg zonder keuze en zonder spoor. Welke het in het verslag was, speelt stap 0 na.
- 9, waarschijnlijk aanwezig, eerst naspelen. Stil van duur of soort veranderen doet alleen de weekcontrole op trainingen van het systeem: ONE-LONG zet de korte versie (`engine/weekValidator.ts:633-637`), HARD-DAYS maakt van een harde loop een rustige naast een zware vaste afspraak (`:626-631`). De melding Planning bijgewerkt bestaat alleen in het geheugen (`state/AppDataProvider.tsx:232`), komt er niet bij een installatie zonder logs (`:217`) en het auditrecord heeft geen wijzigingen (`:221`, `changes: []`). Na een herlading is niet meer te zien dat een duur veranderde.

## Ontwerp 2: elke sport te kiezen in Losse training

- Scherm: Losse training, knop Anders (`AdHocLogSheet`). De lijst toont Zwemmen, Padel en Voetbal altijd, en een eigen sport zodra hij bestaat, met het pictogram uit `pictograms.tsx`. Bron voor de lijst: `withSportNames` (alleen weergave), nooit voor beenindex of planning.
- Zonder rol: onder de titel van het invulblad één regel in `ink-dim`: "Padel telt nog niet mee. Na opslaan kies je hoe."
- Na opslaan, alleen zonder rol: hetzelfde blad als de vraag op Vandaag (`SportAskLine`, `ASK_ROLES`): "Hoe telt padel?" met Telt mee als ik het doe (voorgekozen, advies) en Negeren, plus `TextButton` "Een vaste dag kiezen" naar Sporten. Niet nu sluit; het log blijft staan en telt niet mee. De keuze gaat via `saveLogThenChoice`: een keuze hoort alleen bij een log dat er staat, en bij `LogNotSaved` wordt niets weggegooid.
- Engine: `engine/sportAsk.ts` krijgt `pendingSportLogs(logs, settings)`: een handlog van een sport zonder rol, gelezen met `sportOfLog`. De regel op Vandaag leest die naast de horlogeactiviteiten. Een log zonder rol telt nergens mee, zoals nu (`sportDays.ts:52-53`).

## Ontwerp 3: aanmoediging die bij de sport past

- `logSession` zoekt het sjabloon in `withCountingSports` van de opgeslagen sjablonen, net als de rest van de app.
- `coach.ts` krijgt een eigen tak voor een log met `countedSport` of `customSport`, na pijn en voor alles over plan, loop of duur. Nooit "korte training", "zoals gepland", "loop" of "licht en rustig".
- Teksten: zware partij (RPE 7 of meer) en telt mee: "Zwaar gespeeld. Morgen liever geen zware beendag." Telt mee, niet zwaar: "Opgeslagen. Padel telt mee voor je benen en je week." Zwemmen: "Opgeslagen. Zwemmen telt mee voor je week, nauwelijks voor je benen." (uit `lowerBodyLoad` van het profiel, niet per sport). Telt niet mee: "Opgeslagen. Voetbal telt nog niet mee." Gedaan op een vaste afspraak: "Gedaan zoals afgesproken."

## Ontwerp 4: geen kleding- of zweetvraag die niet past

- `sweatActivityOfTemplate` geeft `countedSport` en `customSport` mee aan `sweatActivityOfLog`; dan geen weegherinnering voor zwemmen, padel, voetbal of een eigen sport.
- Bewust niet: zweetmeting of kledingadvies voor deze sporten. Het onderzoek dekt alleen lopen en wandelen; zwemmen kan niet gewogen worden. Uitbreiden vraagt eerst een Scout (vraag 3).

## Ontwerp 10: een voorstel na een zware sport blijft tot je kiest

- Opslag: een nieuwe lijst `AppSettings.sportRestOffers`, één regel per aanleiding met vaste id `sportrest:<logId>:<sessionId>`, de dag van eerst tonen, en later een tweede regel met de uitkomst: akkoord, liever niet of vervallen. Alleen toevoegen, nooit omschrijven; de laatste regel per id geldt. Defensief gelezen (`parseSportRestOffers`), migratiestap in `src/storage/migrations.ts` die oude back-ups ongemoeid laat, mee in de back-up met `onlyNew`. Ouder dan 30 dagen valt bij het lezen weg, zoals `sweatPre`.
- Gedrag: ziet Week het voorstel, dan schrijft hij de eerste regel. Verdwijnt de bevinding zonder keuze, dan staat er op Vandaag één rustige regel (groep yesterday, zoals de sportvraag): "Je voorstel na padel is vervallen. Benen B was gisteren." met Begrepen, en die schrijft vervallen. Is de beendag vandaag, dan staat het voorstel op Vandaag: "Benen B vandaag, een dag na je voetbal. Een dag later?" met Akkoord en Liever niet, plus de vaste zin "Eerst een voorstel, pas na Akkoord verandert er iets." Liever niet stelt het voor die aanleiding niet opnieuw voor.
- Instelbaar in het blad Hoe sporten meetellen (`SportCountingSheet`): "Voorstel na een zware sport" met Blijft tot je kiest (advies) of Vervalt vanzelf. Uitleg: "Anders verdwijnt een voorstel als de dag voorbij is, zonder dat je het zag." Verklaring in `settingsDefs/planning.ts`, waarde in `settingsSummary.ts`.
- Lege stand: geen sport, geen regel. Fout bij opslaan: "Dit lukte niet. Je planning is niet veranderd." met Opnieuw proberen.

## Ontwerp 9: een duur verandert niet stil

- Een reparatie van de weekcontrole die duur of soort verandert in deze of volgende week, met een sport in de bevinding (vaste afspraak of gelogde sportdag; HARD-DAYS, ONE-LONG, LEG-SPACING), gaat niet meer vanzelf maar als voorstel met Akkoord in Week, zoals `fromSport` al doet (`weekValidator.ts:609`). Tekst: "Met voetbal op zaterdag past er deze week een harde training minder. Heuvelintervallen wordt een rustige loop van 40 minuten." De voor en na staan er in minuten bij.
- Elke andere reparatie die een duur raakt houdt Planning bijgewerkt, maar het auditrecord krijgt de wijzigingen zelf (training, oude en nieuwe minuten), zodat het Logboek van voorstellen het later nog laat zien. Append-only: een nieuw record per ronde.
- Instelbaar: "Duur aanpassen na een sport" met Eerst een voorstel (advies) of Vanzelf, met melding. Zonder sport verandert er niets: golden A en C bewegen niet, `planGolden.test.ts` blijft.

## Stappen, elk een eigen branch

0. `claude/losse-sport-naspelen`: 9 en 10 naspelen met de skill naspelen (`primePlanningRegisters`, `TZ=Europe/Amsterdam`), welke weg het was. Alleen een test die faalt; geen poort.
1. `claude/losse-sport-teksten` (3 en 4): coach-tak, sjabloon in `logSession`, `sweatActivityOfTemplate`. Tests: `coach.test.ts` per sport en zwaarte, `sweatMoments.test.ts` met een vaste padelrij. Engine klein: Warden en Lookout.
2. `claude/losse-sport-kiezen` (2): lijst onder Anders, regel en blad na opslaan, `pendingSportLogs`. Tests: `adHocGroups` zonder rol, een log zonder rol telt niet in beenindex en `sportLogDays`, keuze na `LogNotSaved` gooit niets weg. Warden en Lookout; tekstkaart.
3. `claude/sport-voorstel-blijft` (10): opslag, migratie, regel op Vandaag, instelling. Tests: grensdag (de dag na het venster, met eerder Liever niet en eerder Akkoord), back-up oud en nieuw, twee tabbladen. Warden en Lookout.
4. `claude/sport-duur-voorstel` (9): planner. Tests: drie openingen achter elkaar (`openingPingpong`), twee keer `planPass`, golden ongemoeid. Warden en Lookout.

## Bewust niet

Geen planning van zwemmen, padel of voetbal door ASCEND; geen nieuwe kleur of token; geen uitklapblok; geen log dat herschreven wordt; geen stille rol voor een sport zonder keuze.

## Vragen voor de eigenaar

1. Losse sport zonder rol. Advies: na opslaan één vraag, Telt mee voorgekozen. Anders: meteen meetellen zonder vraag. Zonder antwoord: het advies.
2. Een voorstel na een zware sport. Advies: blijft tot je kiest, met een regel als het vervalt. Anders: vervalt stil zoals nu. Zonder antwoord: het advies, instelbaar.
3. Kleding en zweet bij voetbal en padel buiten. Advies: niet, tot er onderzoek is. Anders: eerst een Scout. Zonder antwoord: niet.
4. Duur door de weekcontrole na een sport. Advies: eerst een voorstel. Anders: vanzelf met een melding die bewaard blijft. Zonder antwoord: het advies.
