# Sporten die meetellen

Ontwerp voor de ronde "sporten die meetellen": zwemmen, padel, voetbal en fietsen tellen mee in belasting en beenindex, een sportenscherm met een rol per sport, de hoeveelheid Minder, Normaal of Meer per soort training, en de profielen "Kaarten op Vandaag". Cartographer, 27 oktober 2026. Een voorstel, geen besluit. Er is niets in `src` gewijzigd.

Bronnen: `docs/onderzoek/ASCEND voor iedereen.md` (deel 3, 4 en 6), `docs/visie/Ascend-tab als doelen.md` (deel 10, het scherm Sporten), `docs/beslissingen/2026-10-26-kracht-en-berg-voor-iedereen.md` en `2026-10-26-instellingen-opruimen.md`, en de code van `data/sports.ts`, `data/templateRoles.ts`, `engine/templateRoles.ts`, `engine/sports.ts`, `engine/legFatigue.ts`, `engine/weekValidator.ts` en `engine/settingsProfiles.ts`.

## 1. In het kort

1. De vier rollen die de eigenaar koos zijn de vaste woorden: "Plan dit voor mij", "Vaste dag", "Telt mee als ik het doe", "Negeren". Ze staan al als `SportRole` in `data/sports.ts` ('plan', 'fixed', 'count', 'off').
2. Zwemmen, padel en voetbal komen als gegevensrijen in `data/sports.ts`, met de vijf kenmerken. Fietsen staat er al. Wat ze met je benen doen volgt uit die kenmerken, niet uit nieuwe code per sport.
3. Eén munt voor belasting: minuten maal hoe zwaar het voelde. Ontbreekt dat gevoel, dan neemt ASCEND een waarde aan en zegt dat.
4. Een sport die meetelt telt mee voor je benen: na een zware voetbalwedstrijd staat er geen zware beenkracht binnen 72 uur. Een vaste afspraak (voetbal op dinsdag en zaterdag) wordt een vaste rij in je week waar de rest omheen wordt gepland.
5. Het scherm Sporten staat bij Instellingen, groep Planning. Per sport een kaart, een tik opent een blad met de rol. Geen uitklapblokjes.
6. Per soort training kies je Minder, Normaal of Meer, in een eigen scherm. De wens blijft bewaard.
7. "Kaarten op Vandaag" met Alles, Alleen het belangrijkste en Alleen je training bestaat al sinds ronde 1. Hier verandert alleen dat de nieuwe vraag over een nieuwe sport er netjes in past.
8. Een gebruiker met een GR5-doel ziet niets veranderen tot hij zelf iets kiest. Een nieuwe sport telt pas mee nadat hij heeft geantwoord.

## 2. Wat de gebruiker ziet en kiest

### 2.1 Het scherm Sporten

Waar: Instellingen, groep Planning, rij "Sporten" (`SettingsRow`, 68 px; waarde "2 gepland, 1 vaste dag, 1 telt mee"; InfoButton met uitleg). De rij opent een eigen pagina (`/more/planning/sporten` volgens de bestaande groepsroutes). Ook bereikbaar met `TextButton` "Welke sporten tellen mee?" op het blad Je week (zie `Zonder doel.md`) en vanuit het logboekblad van een training van een sport.

Van boven naar beneden:

1. Kop zoals elke instellingenpagina (terugpijl, `Eyebrow` "Planning", titel "Sporten"). Eronder één zin: "Kies per sport hoe ASCEND ermee omgaat. Sporten die je doet tellen mee voor je benen en je week."
2. Een lijst `Card`s, één per sport, in vaste volgorde: Hardlopen, Wandelen, Fietsen, Zwemmen, Padel, Voetbal. Elke kaart is één groot tikdoel (minstens 44 px, de hele kaart). Opbouw van een kaart: links het pictogram en de naam (Marcellus alleen voor de naam), rechts de gekozen rol als korte pil. Daaronder één regel met het voorbeeld van deze sport en, onderaan, een weekstrook van maandag tot zondag met zeven puntjes: gevuld mint is een vaste dag, mint omlijnd is een dag waarop ASCEND de sport plant, een grijze ring is een dag die ASCEND rustig houdt voor je benen (de dag na een zware sport), leeg is niets. Onder de strook staat de legenda niet; de pil en de zin zeggen het al. De strook krijgt `aria-label` met de dagen in woorden.
3. Onderaan één `SettingsRow` "Hoe sporten meetellen" (blad, zie 4) en één rij "Hoeveel per soort" (eigen scherm, zie 2.4).

Voorbeelden van de regel onder de naam (de stem: kort, je/jij, droog feit eerst):

- Hardlopen, Plan dit voor mij: "Drie keer per week. ASCEND kiest de dagen."
- Voetbal, Vaste dag: "Dinsdag en zaterdag. De zaterdag telt als zwaar: de 72 uur erna blijven je benen vrij van zware kracht."
- Padel, Telt mee als ik het doe: "Je plant het zelf. Log je het, dan blijft de dag erna lichter."
- Zwemmen, Negeren: "Doet niet mee in je planning en je benen. Je kunt het wel loggen."
- Fietsen, Telt mee als ik het doe: "Telt mee voor je benen en je week. ASCEND plant het niet."

Een sport waarvoor ASCEND geen training kent (nu zwemmen, padel, voetbal) toont "Plan dit voor mij" niet als keuze. In het blad staat dan één regel: "ASCEND kan dit nog niet voor je plannen. Een vaste dag of meetellen kan wel." Dat is eerlijk; de rol 'plan' hoort bij `plannable: true` in `data/sports.ts`.

### 2.2 Het blad per sport

Tik op een kaart: een `Sheet` via `useSheetClose` (de terugknop sluit het eerst), `Eyebrow` "Sporten", titel de naam van de sport (Marcellus), één regel "Wat past bij jou?". Daaronder de keuzes onder elkaar als `ChoiceSheet`-rijen met een mint vinkje bij de gekozen:

- Plan dit voor mij: "ASCEND zet het in je week, op dagen die bij je benen passen."
- Vaste dag: "Jij kiest de dag. ASCEND plant de rest eromheen."
- Telt mee als ik het doe: "Je plant het zelf. Wat je doet telt mee in je benen en je week."
- Negeren: "ASCEND doet er niets mee."

Het voorbeeld dat bij de keuze past staat als tweede regel, in `ink-dim`. Wijzig je de rol, dan:

- verandert je planning inhoudelijk (Plan dit voor mij of Vaste dag aan of uit, of Negeren voor een sport waarvan recente logs de benen nu belasten), dan opent het voorstel met Akkoord en de preview van dezelfde planningsronde. Akkoord bewaart de rol en de planning, "Liever niet" laat alles. Het voorstel zegt het in een zin: "Voetbal staat vast op dinsdag en zaterdag. Je krachttraining van vrijdag verschuift naar donderdag."
- verandert er niets aan de planning (bijvoorbeeld Telt mee naar Negeren zonder recente logs), dan wordt de keuze direct bewaard met een `ChangeNotice` "Opgeslagen" en "Ongedaan maken".

### 2.3 Vaste dag

Kiest iemand "Vaste dag", dan opent het blad een tweede stap in dezelfde `Sheet`: "Wanneer doe je het?".

1. `Eyebrow` "Vaste afspraak". Een rij `Chip`s ma tot zo, meerdere dagen kiesbaar. Een tik kiest of wist een dag. Tikdoel 44 px.
2. Per gekozen dag een regel met drie kleine keuzes: "Hoe zwaar is het meestal?" Rustig, Pittig, Zwaar. Het advies komt uit `typicalIntensity` van de sport (voetbal Pittig, padel Pittig, zwemmen Pittig). Een wedstrijd kies je zelf op Zwaar. Uitleg: "Zwaar telt als zware beendag en als harde dag. Pittig telt voor je benen, niet als harde dag."
3. Eén regel "Hoe lang?" met kiesbare stappen (45, 60, 90, 120 minuten) per dag. Dit is het gepland aantal; wat je werkelijk doet staat straks in het log.
4. `PrimaryButton` "Bekijk wat er verandert": opent het voorstel met de preview van de planning. Het is de enige gevulde mint knop van het blad.

In Week staat een vaste afspraak als gewone rij met het label "Vaste afspraak" en het slotpictogram uit de lijnset. Hij heeft geen "Verplaatsen" voor het systeem, wel voor jou (je eigen verplaatsing vervangt de vaste dag voor die week, via een voorstel). In een week met vrije dagen, vakantie of tocht staat bij die afspraak een noot in het voorstel: "Voetbal op dinsdag valt in je vrije dagen. Laten vervallen?" met als keuze per afspraak "Laten vervallen" (advies) of "Laten staan". Nooit stil.

### 2.4 Hoeveel per soort

Eigen scherm bij Instellingen, groep Planning, rij "Hoeveel per soort" (waarde "Alles normaal" of "2 anders"). Een lijst rijen, geen uitklapblokjes. Elke rij is een soort training met rechts drie `Chip`s: Minder, Normaal, Meer (Normaal gekozen). Onder de naam één regel met wat het vandaag betekent in minuten: "Normaal: 45 minuten, 2 keer per week. Meer: 52 minuten."

De soorten zijn de bouwstenen van het plan, niet de sjablonen: Kracht, Rustige duur, Lange duur, Harde training, Rugzakwandeling (alleen zichtbaar bij een tocht als doel, zoals SHOW_WHEN dat doet), en per sport met rol "Plan dit voor mij" één rij (Fietsen). Een soort die er niet is, bestaat niet; geen uitgegrijsde rijen.

Wat Minder en Meer doen, in volgorde: eerst de duur (Minder 15% korter, Meer 15% langer, afgerond op 5 minuten, begrensd door de sessiepiek van 110% van je langste training van dezelfde soort in 30 dagen), daarna pas het aantal (Meer een extra training op een vrije dag waar de regels het toelaten, Minder een training minder als er meer dan het minimum staan). De wens blijft bewaard, ook na een lichte week of een nieuw blok. Het advies is Normaal.

Grenzen in drie lagen, zoals eerder besloten:

1. Veiligheid schuift nooit: 48 uur tussen zware beendagen, 72 uur na een bergtocht of een zware voetbalwedstrijd, de sessiepiek, het maximum aan harde dagen, minstens een rustdag. Raakt een wens zo'n grens, dan zegt de app welke: "Een extra harde training past niet: dat wordt je derde harde dag."
2. Wat je doel minstens vraagt: een wens eronder kan, maar alleen als voorstel dat zegt wat het kost ("Met één rugzaktocht per maand is de stap naar je volle rugzak groot. Toch doen?") en met Akkoord. De ondergrenzen komen uit `data/goalKinds.ts` (het wekelijks minimum per doelsoort).
3. Vrij: daarboven doe je wat je wilt, zonder waarschuwing.

Zonder doel vervalt laag 2; de richtlijn uit `Zonder doel.md` is een waarschuwing, geen blokkade.

### 2.5 Een nieuwe sport: één vraag

Komt er een activiteit binnen van een sport zonder gekozen rol (zwemmen, padel of voetbal van het horloge of van intervals.icu), dan telt hij nog niet mee. Op Vandaag verschijnt een stille regel (zoals `TestPendingLine`, geen kaart): "Je deed zwemmen. Hoe telt dit?" Een tik opent een blad met de vier rollen (zonder Plan dit voor mij) en bij Telt mee de vraag "Hoe zwaar voelde het?". Wie antwoordt, past het meteen toe op de activiteiten van de laatste weken die nog binnen te halen zijn. Wie niet antwoordt, houdt de regel; er verandert niets in de planning. De regel is geen Vandaag-kaart van het profiel en blijft dus onder "Alleen je training" gewoon bestaan, want het is een vraag, geen overzicht. Bij de eerste keer kiest het blad "Telt mee als ik het doe" voor, als advies.

Een nieuwe installatie vraagt dit ook de eerste keer: de wensen van een nieuwe gebruiker kennen we niet.

### 2.6 Hoe zwaar voelde het

Onder een log van een sport die meetelt, in het bestaande logboekblad: `Eyebrow` "Hoe zwaar voelde het?" met vier kiesbare woorden: Rustig, Pittig, Zwaar, Heel zwaar (het bestaande `SessionLog.rpe` van 0 tot 10; de woorden zetten 3, 5, 7 en 9). Onder de keuze een regel met de uitleg: "Zwaar telt twee keer zo zwaar als pittig voor je benen." Heb je niets gekozen, dan staat er "ASCEND nam aan: pittig. Aanpassen." in kleine letters. Dat is de aangenomen waarde, gemarkeerd zoals `SetLog.rirAssumed`. Een voorgekozen waarde die je niet aanraakte wordt als aangenomen opgeslagen en telt iets voorzichtiger mee (hoger gerekend, aan de veilige kant).

### 2.7 Lege, laad- en foutstand

- Leeg: zonder enige activiteit toont het scherm Sporten alle zes kaarten met de rollen van nu. Hardlopen en Wandelen staan op "Plan dit voor mij", Fietsen op "Telt mee als ik het doe", de rest op "Nog niet gekozen" (pil in `ink-dim`, zonder stip) met de regel "Zodra je dit doet, vraag ik hoe het telt."
- Laden: de kaarten staan er meteen (de rollen zijn lokale instellingen). Het voorstel toont zijn eigen wachtstand ("Je planning wordt bekeken") met een grens in tijd en een zichtbare uitkomst, zoals `ProposalSheet` nu.
- Fout: lukt de preview niet, dan staat er "Dit lukte niet. Je planning is niet veranderd." met `TextButton` "Opnieuw proberen". De rol wordt dan niet bewaard.
- Een activiteit van een sport met rol Negeren staat wel in het logboek (met het label "Telt niet mee") en kan per activiteit alsnog meetellen via "Toch laten meetellen" in het logblad.

### 2.8 Waar de sporten verder opduiken

- Logboek en Week: pictogram per sport, "Telt mee" of "Vaste afspraak" als label. Pictogrammen voor zwemmen, padel en voetbal bestaan nog niet in stijl C; zie bouwstap 1. Tot dan staat er niets (`pictogram: undefined` is toegestaan), nooit een emoji.
- Je stand, beenindex: "Je benen: Zwaar." met de regel erbij "Voetbal van zaterdag telt mee." en een uitleg wat de index is. De weekbelasting blijft per soort, nooit één getal over alle sporten.
- Vandaag: de missie verandert alleen als de benen erom vragen: "Je speelde gisteren padel. Benen B naar zaterdag?" is een voorstel op de plek waar dat nu gebeurt, met Akkoord en "Liever niet".

### 2.9 Het profiel "Kaarten op Vandaag"

Bestaat al: de rij in groep Vandaag en meldingen, `engine/settingsProfiles.ts`, acht schakelaars (ochtendcheck, ochtendkaart, weer, weekterugblik, weekvraag, afrondmoment, geluid, lijfcheck) en de namen Alles laten zien, Alleen het belangrijkste, Alleen je training, met "Aangepast" als je daarna één schakelaar wijzigt. Dit ontwerp voegt hier niets aan toe, op twee punten na:

- De nieuwe sportenvraag (2.5) staat bewust buiten het profiel, want het is een vraag.
- Komt er in een latere ronde een nieuwe Vandaag-kaart bij, dan hoort die in `TodayCardValues` en in elk van de drie profielen, met een test. Dat staat in de bouwafspraken.

### 2.10 Wat dit bewust niet doet

- Geen uitklapkaarten in het scherm Sporten (het eerdere voorbeeld klapte open): een tik opent een blad.
- Geen belastinggetal over alle sporten. Per soort, en voor de benen één index.
- Geen planning van zwemmen, padel of voetbal door ASCEND. Dat vraagt eigen trainingen en onderzoek.
- Geen kracht in de sportenlijst: kracht heeft zijn eigen blok.
- Geen medische claim: de teksten zeggen "kan helpen" en noemen de sterkte van het bewijs.
- Geen stille wijziging in je planning als een sport erbij komt.
- Geen eigen sport met eigen kenmerken in de eerste stappen (zie bouwstap 9).

## 3. Wat de engine moet doen

### 3.1 Hergebruikt

- `data/sports.ts`: `SportDefinition`, de vijf kenmerken, `typicalIntensity`, `plannable`, `roles`, `externalKinds`, `sportOfExternalType`. De rollen bestaan al als type.
- `engine/templateRoles.ts` en `data/templateRoles.ts`: de rollen op sjablonen. Het gedrag blijft per rol, niet per sjabloon-id.
- `models/prescription.ts#SessionStressProfile` (`lowerBodyLoad`, `impact`, `eccentricLoad`, `intensity`, `upperBodyLoad`, `cardioLoad`) en `baseStressProfile` op het sjabloon: de beenindex, de 48-uursregel, de weekbelasting en de intensiteit lezen dit al voor elke sport.
- `engine/legFatigue.ts` (`fatigueEvents`, `sessionImpulse`, `legFatigueOn`, `PLANNED_RPE` met laag 4, middel 6, hoog 8) en `SessionLog.rpe`.
- `engine/sports.ts` (`enabledSports`, `sportFrequency`, `isTemplatePlannable`, `logSport`), `engine/activityImport.ts#isImportable` en `engine/autoTick.ts`.
- De planningsronde `engine/planPass.ts`, de weekcheck `engine/weekValidator.ts` (`LEG-SPACING`, `TWO-HARD-RUNS`, `LEAVE-*`), `engine/scheduler.ts#respectsHeavySpacing`, `lockLevel` en `PlannedSession.lock`, `engine/leaveProposal.ts` en `ProposalSheet`.
- `engine/intensityMinutes.ts` en `engine/onCourse.ts#recentAdherence`.

### 3.2 Nieuw

Gegevens:

- Drie rijen in `data/sports.ts`: Zwemmen ('swimming'), Padel ('padel'), Voetbal ('football'), elk met label, werkwoord, kleur, pictogram (eerst `undefined`), `plannable: false` en `roles: ['fixed', 'count', 'off']`. De kenmerken zijn afgeleid uit het onderzoek (impact, remmen, stop en start, bovenlichaam, techniek): zwemmen 0, 0, 0, 3, 3; padel 2, 2, 3, 2, 2; voetbal 3, 3, 3, 1, 2. De zwaarte is gebruikelijk Pittig (zwemmen Pittig, padel Pittig, voetbal Zwaar). Alles met label "afgeleid, niet getoetst", bijstelbaar met je eigen logs.
- `externalKinds`: zwemmen 'Swim', 'OpenWaterSwim'; voetbal 'Soccer'; padel 'Padel'. De exacte typenamen van intervals.icu worden bij de bouw gecontroleerd. 'Tennis' hoort niet bij padel zolang er geen bewijs is (vraag 4).
- `SportDefinition.stressOverride?: Partial<SessionStressProfile>` voor sporten waarvan de omrekening uit kenmerken niet klopt. Fietsen krijgt zo zijn huidige profiel (de benen werken, maar zonder impact), zodat de beenindex voor wie nu fietst gelijk blijft.
- `data/trainingKinds.ts`: de soorten uit 2.4 met de rollen (`TemplateRole`) die erbij horen. Daarvoor krijgt `TemplateRole` twee waarden erbij: 'strength' en 'ruck', in de tabel van `data/templateRoles.ts` (nu staat kracht alleen als lijst in `WEEK_SHAPE_STRENGTH`).

Functies:

- `engine/sportStress.ts#stressProfileOf(sport, intensity)`: de omrekening kenmerken naar `SessionStressProfile`. De hoogste van impact, remmen en stop en start bepaalt `lowerBodyLoad` (0 geen, 1 licht, 2 middel, 3 zwaar); `impact`, `eccentricLoad` en `upperBodyLoad` volgen hun kenmerk; `intensity` is de gekozen zwaarte; `cardioLoad` volgt de zwaarte. `stressOverride` gaat voor. Pure functie met tests per sport.
- `engine/legRest.ts#legRestHours(profile)`: 72 uur voor een profiel met zware remmen én zware impact (bergtocht, voetbalwedstrijd), 48 uur voor een zware beendag, anders 0. Dit generaliseert de bestaande regel "72 uur na een bergtocht" en moet voor de bestaande bergtocht exact dezelfde uitkomst geven (de golden test bewaakt dat).
- `engine/sportRole.ts#sportRole(settings, sport)`: leest `AppSettings.sportHandling` en valt terug op de oude instellingen (`enabledSports` aan is 'plan', uit is 'off'). Eén bron.
- `engine/sessionLoad.ts#sessionLoad(log)`: minuten maal RPE (belasting), met `assumedRpe(sport, intensity)` uit `PLANNED_RPE` en `SessionLog.rpeAssumed?: boolean`. De RPE-omzetting van het logblad staat hier ook (3, 5, 7, 9).
- Een synthetisch sjabloon per sport (`sportTemplate(sport, intensity)`, niet opgeslagen) zodat `fatigueEvents` een log van een sport zonder gepland sjabloon kan lezen. Hoe `fatigueEvents` nu logs zonder sjabloon behandelt, wordt bij de bouw gelezen en getest.
- `engine/fixedSports.ts#fixedSessionsForWeek(weekStart, handling, leave)`: de vaste rijen van een week.
- `engine/sportAsk.ts#pendingSports(importedActivities, handling)`: afgeleid, nooit opgeslagen. Een sport zonder entry in `sportHandling` waarvan een activiteit binnenkwam.

Opslag:

- `AppSettings.sportHandling: Partial<Record<SportId, { role: SportRole; fixed?: FixedSlot[] }>>` met `FixedSlot { day: 1..7; minutes: number; intensity: 'low' | 'moderate' | 'high' }`.
- `AppSettings.kindAmount: Partial<Record<TrainingKindId, 'less' | 'more'>>` (afwezig is Normaal).
- `SessionLog.rpeAssumed` (optioneel). Een vaste rij krijgt `PlannedSession.fixed?: { sport; slot }` en een lock (zie 3.4).
- Beide settings worden defensief gelezen (`parseSportHandling`, zoals `parseWeekShape`) en samengevoegd per sport bij terugzetten van een back-up.

### 3.3 Voorbeelden: wat telt waarvoor

- Zwemmen 45 minuten, Pittig: belasting 45 maal 5. Benen: geen impact, geen remmen, dus vrijwel geen schade; alleen het cardiale deel. Een uur zwemmen maakt je benen niet zwaar. Telt wel als 45 matige minuten in Je week.
- Padel 90 minuten, Pittig: `lowerBodyLoad` zwaar door stop en start (3), remmen 2, dus een zware beendag met 48 uur rust. Als Zwaar telt hij ook als harde dag.
- Voetbal wedstrijd 90 minuten, Zwaar: impact 3, remmen 3, stop en start 3: een zware beendag met 72 uur rust, en een harde dag. Een training op dinsdag kan Pittig zijn: zware beendag, 48 uur.
- Fietsen: de benen werken, geen impact, geen remmen. Telt mee in Je week en in de intensiteit; de 48 uur tussen zware beendagen verandert niet voor een rustige rit.

### 3.4 Regels voor de weekcheck

De regel die alles bepaalt: een sport die meetelt gedraagt zich als een sjabloon met een profiel. Er komt dus weinig nieuws bij.

- `LEG-SPACING`: leest ook vaste rijen en gelogde sportdagen (het zijn gewone events in de beenindex). Een systeemtraining met zware beenbelasting binnen `legRestHours` van een zware sportdag, ervoor of erna, is een bevinding. Het systeem verplaatst alleen zijn eigen training, nooit de vaste afspraak en nooit wat er al gelogd is.
- Voetbal als zware beendag: de zaterdagwedstrijd (Zwaar) houdt 72 uur lang zware beenkracht (Benen A of B) en een harde loop weg. Met een vaste dinsdag (Pittig) en zaterdag (Zwaar): zware beenkracht komt op donderdag niet te dicht op zaterdag (48 uur voor een zware beendag), dus woensdag of maandag, en de dag na de wedstrijd blijft vrij. Dit is een bevinding van `LEG-SPACING`, geen aparte regel.
- `TWO-HARD-RUNS` blijft de regel "hoogstens één harde loop per dag". Er komt `HARD-DAYS`: een limiet op het aantal harde dagen per week over alle sporten (2 bij vier dagen of minder, 3 bij vijf of zes, 1 voor een beginner). Een Zware vaste of gelogde sport telt mee. Cruciaal voor de migratie: `HARD-DAYS` doet niets zolang er in die week geen Zware sport buiten ASCEND staat. Een GR5-gebruiker zonder zulke sport krijgt dus exact dezelfde weekcheck als nu.
- Overschrijdt een vaste afspraak de limiet, dan repareert de weekcheck de eigen harde training van het systeem naar een rustige en meldt het ("Planning bijgewerkt", met ongedaan maken). De afspraak zelf blijft, met een noot in het voorstel: "Met voetbal op zaterdag past er deze week één harde training van ASCEND, niet twee."
- Een log van een sport die meetelt (je speelde padel op donderdag, Pittig of Zwaar) werkt vanaf het moment van loggen: de planningsronde draait, en een systeemtraining die nu te dicht staat verschuift als voorstel met Akkoord ("Je speelde gisteren padel. Benen B naar zaterdag?"). Geen stille verplaatsing. Wat je zelf vastzette (lock) en wat in het verleden ligt, blijft.
- `LEAVE-OFF` en `LEAVE-LIGHT`: de vaste afspraken in een periode zijn jouw eigen sessies en komen als noot in het leave-voorstel met de keuze Laten vervallen of Laten staan (zie 2.3). Een tocht laat de dag ervoor en erna licht: een vaste voetbalwedstrijd op die dag is daarvoor een noot, geen verplaatsing.
- Rond een Top-doel (de race): staat er een vaste Zware sport in de laatste twee weken, dan vraagt het voorstel "Padel tot na de wedstrijd laten rusten?" met Ja of Nee. Standaard blijft hij staan; jij kiest.
- Zonder doel telt een vaste of gelogde sport mee in het weekbudget van `Zonder doel.md` (de minuten gaan van wat ASCEND zelf nog plant af). Met een doel is er geen budget en gelden alleen de beenregels.
- `Volgehouden` (`recentAdherence`): vaste afspraken tellen niet mee in de teller, want ASCEND beoordeelt geen teamrooster. Ze tellen wel mee voor Je week. Een vaste rij wordt "gedaan" door de gelogde activiteit van dezelfde sport op dezelfde dag (`autoTick`).

### 3.5 Hoe dit via een voorstel met Akkoord in de planning komt

Alles wat de planning inhoudelijk verandert gaat door `planHorizonChange` en `computeHorizonPlan`, met dezelfde `planPass` voor de preview:

- Rol wijzigen of een vaste dag toevoegen, wijzigen of weghalen: trigger 'sport_changed'. Nieuw: een vaste dag gaat als eerste in de planningsronde (vóór het racebloks), als vaste rij met lock `fixed`, zodat het blok, de vrije dagen en de weekcheck eromheen werken. Verwijderen haalt de toekomstige rijen weg die erbij horen (herkenbaar aan `fixed`), nooit wat gelogd of voorbij is.
- Een log van een sport die meetelt: trigger 'sport_logged', alleen als de planning verandert.
- Minder, Normaal of Meer: trigger 'amount_changed'. De preview toont de duur en het aantal per week voor en na.
- Elke wijziging heeft "Ongedaan maken" via de bestaande `ChangeNotice`, en past `AppSettings` en planning samen terug.
- Een wijziging die niets aan de planning verandert (rol Negeren zonder logs, de rij Hoe sporten meetellen) wordt direct bewaard.

## 4. Instellingen

Volgens de werkafspraak is elke keuze instelbaar, met het advies als standaard en één zin uitleg achter de InfoButton in `data/settingsHelp.ts`. Elke rij komt in `settingsIndex.ts`, `settingsLayout.ts` en `engine/settingsSummary.ts`. In groep Planning, onder het plafond van 12 rijen en 6 onder Geavanceerd (test uit ronde 1):

- Sporten. Waarde: "2 gepland, 1 vaste dag, 1 telt mee" (uit `settingsSummary`). Opent de pagina uit 2.1. De pagina zelf bevat geen aparte `SettingsRow` per sport: de kaart is de rij. Voor zoeken staat elke sport als aparte zoekterm ("Voetbal", "Padel") die naar de pagina leidt, met de reden bij een verborgen kaart.
- Hoeveel per soort. Waarde: "Alles normaal" of "Kracht meer, Lange duur minder". Opent het scherm uit 2.4. Terug naar advies per soort via "Anders dan het advies".
- Hoe sporten meetellen. Een blad met drie keuzes: "Vragen bij een nieuwe sport" (aan; uit betekent dat een nieuwe sport met "Telt mee als ik het doe" begint), "Vragen hoe zwaar het was" (aan; uit betekent dat ASCEND de zwaarte aanneemt), en "Rust na een zware sport" met Ruim (72 en 48 uur, advies) of Korter (48 en 24 uur) en de zin: "Dan staat er na voetbal eerder weer zware beenkracht. Het bewijs voor recreanten is matig; de 72 uur komt van onderzoek bij profs."
- De vier rollen zelf staan in het sportenscherm en nooit als schakelaar op de pagina.

Het profiel "Kaarten op Vandaag" is al ingesteld (2.9). Uitleg en zoekwoorden voor de nieuwe rijen volgen het patroon van de bestaande.

## 5. Migratie

- Zonder `sportHandling` verandert er niets: hardlopen en wandelen zijn 'plan' als `enabledSports` aan staat, fietsen 'off' zoals nu, en de drie nieuwe sporten hebben geen keuze. Een activiteit van zwemmen, padel of voetbal wordt tot een antwoord niet geïmporteerd, precies zoals nu. Pas als de gebruiker antwoordt op de vraag of de rol kiest, verandert er iets.
- Fietsen: `stressOverride` borgt dat een bestaande fietsrit voor wie fietsen aan heeft gelijk blijft. Zet iemand fietsen op "Telt mee als ik het doe" terwijl het nu uit staat, dan verandert zijn benenbeeld pas vanaf die keuze, en alleen via het voorstel als de planning verandert. Wat de beenindex nu met fietsen doet, wordt in bouwstap 2 vastgelegd in een test.
- Een gebruiker met een GR5-doel: de golden test (`storage/planGolden.test.ts`) staat na elke stap groen voor de drie bestaande gevallen. `HARD-DAYS` en de nieuwe `LEG-SPACING`-bronnen doen niets zonder vaste of gelogde sport buiten ASCEND. Wie zwemt of padelt ziet alleen de vraag "Hoe telt dit?" en kan "Negeren" kiezen.
- Backup: nieuwe velden zijn optioneel, defensief gelezen; `migrateSportHandling` in `storage/migrations.ts`; samenvoegen per sport bij terugzetten; een oud bestand importeert zoals het was; nieuw schemanummer volgens de gewone gang. `enabledSports` en `sportFrequency` blijven bestaan en blijven in sync: de nieuwe schermen schrijven `enabledSports[sport] = (rol is 'plan')` mee, zodat bestaande plekken die ze lezen niet hoeven te veranderen.
- De rol 'fixed' voor hardlopen of wandelen bestaat in het model (en in `roles` van de data). Een eerdere keuze `sportFrequency` voor een sport blijft een eenmalig voorstel zoals nu; er verandert niets zolang de gebruiker de nieuwe rol niet kiest.

## 6. Bouwvolgorde

Elke stap kan apart live, met tests, door de vaste poorten, en laat een bestaande planning ongemoeid.

1. Pictogrammen. Zwemmen, padel en voetbal in stijl C (`pictograms.tsx`): aparte opdracht aan Cartographer pictogrammen. Parallel aan stap 2 tot 4; nodig voor stap 5. Zonder pictogram toont de app niets in plaats van een emoji.
2. Gegevens en omrekening. De drie sportrijen, `externalKinds`, `stressProfileOf`, `legRestHours`, `stressOverride` voor fietsen, en tests (kenmerken naar profiel per sport, fietsen blijft gelijk, bergtocht blijft 72 uur). Niets zichtbaar; het importeren van de nieuwe sporten blijft uit.
3. De instelling en de belasting. `sportHandling`, `sportRole`, `parseSportHandling` en de migratie, `sessionLoad`, `rpeAssumed`, de aangenomen RPE. Nog zonder scherm. De golden test blijft groen.
4. Importeren en meetellen. De vraag "Je deed zwemmen. Hoe telt dit?" op Vandaag, de rol Telt mee, de RPE-vraag in het logblad, en de sportlog als event in de beenindex. De rij "Hoe sporten meetellen". Eerste zichtbare stap. Tests: een padel-log verhoogt de beenindex, een zwemlog nauwelijks, een gelogde sport met rol Negeren niet.
5. Het scherm Sporten. Kaarten, blad per sport, de rollen Plan dit voor mij (alleen waar het kan), Telt mee en Negeren, de voorstellen met Akkoord waar de planning verandert. Zoeken en samenvatting. Zonder Vaste dag.
6. Weekcheck met meetellende sporten. `LEG-SPACING` leest sportlogs en `legRestHours`, het voorstel "Je speelde gisteren padel. Benen B naar zaterdag?" met Akkoord, en de uitleg. Tests met het voorbeeld uit het onderzoek (padel donderdag, zware beenkracht vrijdag).
7. Vaste dag. De tweede stap in het blad, `fixedSessionsForWeek`, de lock en de plek vooraan in `planPass`, de noten bij vrije dagen en tochten, `autoTick` voor het afvinken, `Volgehouden` zonder vaste afspraken, en `HARD-DAYS` (alleen actief met een Zware sport buiten ASCEND). Tests: voetbal dinsdag en zaterdag met vijf dagen, een tocht in dezelfde week, een Top-race in twee weken.
8. Hoeveel per soort, in twee stappen. Eerst de duur (Minder en Meer met de sessiepiek), dan het aantal en de grenzen in drie lagen met het kostenzinnetje. `TemplateRole` krijgt 'strength' en 'ruck'.
9. Een eigen sport (optioneel, later): "Je deed iets nieuws. Hoe telt dit?" met de vraag "Merk je dit vooral in je benen, in je armen en schouders, of in je hele lijf?" die de kenmerken invult. Hier hoort ook yoga als gegevensrij thuis, zonder code.

## 7. Open vragen voor de eigenaar

1. Voetbal en padel als zware beendag. Advies: voetbalwedstrijd (Zwaar) houdt 72 uur lang zware beenkracht weg, zware padel en een voetbaltraining 48 uur, in Instellingen te verkorten naar 48 en 24. Het bewijs is matig en komt van profs.
2. Vaste afspraken in "Volgehouden". Advies: niet meetellen, wel in Je week. ASCEND oordeelt dan niet over je teamrooster.
3. Een nieuwe sport tot je antwoordt. Advies: nog niet meetellen, een stille vraag op Vandaag, "Telt mee als ik het doe" voorgekozen. Het alternatief is direct meetellen met het advies.
4. Tennis. Advies: niet bij padel indelen. Tennis volgt als eigen gegevensrij zodra we er kenmerken voor hebben; tot dan komt het via de vraag "Je deed iets nieuws" in stap 9.
5. Fietsen als rol 'plan'. Advies: laat het in het scherm zien, maar zet het standaard op "Telt mee als ik het doe"; ASCEND plant fietsen pas als er trainingen en onderzoek voor zijn.
6. Eigen sport en yoga in deze ronde? Advies: nee, laatste stap, want zwemmen, padel en voetbal dekken wat je koos.
7. Minder en Meer is 15% en één training. Advies: akkoord, instelbaar onder Geavanceerd als getal, met drie standen als standaard.
8. De vraag "Hoe zwaar voelde het?" met vier woorden (Rustig, Pittig, Zwaar, Heel zwaar). Advies: ja, en alleen bij sporten die meetellen en nog geen RPE hebben.
