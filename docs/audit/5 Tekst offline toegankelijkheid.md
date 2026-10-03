# ASCEND: controle van de buitenkant

Datum: 3 oktober 2026. Gecontroleerd op commit d8e19d3, gebouwd in een eigen map met `vite build` (zonder `tsc -b`) en geserveerd met `vite preview` op poort 5177 onder `/ascend/`. In de repo is niets gewijzigd.

Werkwijze in het kort:

- Alle string-literals en JSX-teksten uit `src` (zonder tests) zijn met de TypeScript-parser uitgelezen (ruim 9.600 stuks) en doorgelopen. Daarnaast is met Playwright de zichtbare tekst van alle schermen en een aantal sheets opgehaald.
- Offline, installatie en updates zijn getest met Playwright (Chromium), inclusief een tweede build om een echte update te simuleren.
- Toegankelijkheid is getest op 390x844 en 360x740, met root font-size 130% en met CSS-zoom 130%, plus axe-core 4.10.2 op alle elf routes.

Scripts, ruwe uitvoer en schermafbeeldingen staan in dezelfde map als dit rapport (`t1.cjs` t/m `t9.cjs`, `strings.txt`, `visible-text*.txt`, `a11y.json`, `shots/`).

In citaten uit de app is een em-dash weergegeven als [em-dash], zodat dit rapport er zelf geen bevat.

Moeite: klein is minder dan een uur, middel is een paar uur tot een dag, groot is meer dan een dag of raakt opgeslagen gegevens.

---

## 1. Tekst

Wat goed gaat: de meeste schermteksten zijn rustig en menselijk geschreven. Datums via `formatDateNL` staan netjes in het Nederlands ("wo 30 september"), getallen via `formatNumberNL` gebruiken de komma, en invoervelden waarschuwen zelfs als iemand een punt typt ("Bedoel je 12,5? Gebruik een komma voor decimalen.").

### 1.1 Interne en technische teksten zijn zichtbaar voor de gebruiker

- Vindplaats:
  - `src/engine/adviceEngine.ts` regels 127, 138, 164, 169, 175, 201, 228, 252 en 298, en `src/state/AppDataContext.tsx:553`. Bij elk Coach-advies toont "waarom" letterlijk "Trigger: geen log voor deze sessie. Regel: ...". In de app gezien bij alle vier de adviezen op Vandaag.
  - `src/components/StrengthProgramCard.tsx:93` en `src/components/StrengthProgramWizard.tsx:539` tonen de ruwe sleutel: "3x/week [em-dash] upper_lower" (gezien op het Ascend-scherm).
  - `src/components/StrengthProgramWizard.tsx` regels 196, 199, 556 en 561 tonen ruwe ISO-datums (`{c.fromDate}` geeft bijvoorbeeld "2026-10-05").
  - `src/engine/scheduleAnomalies.ts` regels 160 en 169: de reden met ISO-datums wordt getoond in `ScheduleAnomalyCard.tsx:38`.
  - `src/engine/strengthScheduling.ts` regels 86, 87, 136, 140, 141 en 154, en `src/engine/adaptiveReplanner.ts` regels 113, 126 en 127: "Krachtblok-plaatsing: ...", "forecast-bereik (week +2 en verder)", "bevestigde (committed) weken".
  - `src/engine/goalActivation.ts` regels 35 tot 38 en 165: "opbouw-range", "guardrails", "stressor", "Session Contribution". `src/engine/goalArbiter.ts` regels 74, 88 en 133 en `src/pages/Ascend.tsx:48`: "Goal Focus", "tapering". Op het scherm heet hetzelfde "DOELFOCUS" (`GoalFocusCard.tsx:39`).
  - `src/engine/candidatePlacement.ts` regels 590 en 619: "(axis, 2 dag(en) apart)", "totale cost 1.25". De punt-decimaal komt uit `toFixed(2)`. Via `scheduler.ts:339` belandt `compromisedReason` in de RescheduleDialog.
  - `src/engine/illness.ts:120`: "Neck check: ...".
  - `src/data/researchSources.ts` en `src/engine/sourceLibrary.ts:137`: op de Bronnen-pagina staat "Planningsregel: progression readiness gate" (een Engelse regel-id).
- Wat is er mis: de gebruiker ziet ontwikkelaarstaal, Engelse sleutels en ISO-datums. Dat is de grootste breuk met de premium-toon.
- Voorstel:
  - Splits "waarom" in een menselijke zin. Voorbeeld voor gemist: "Je hebt deze training niet afgevinkt. ASCEND haalt een gemiste training alleen in op een vrije dag in dezelfde week, en nooit twee zware beendagen binnen 48 uur. Lukt dat niet, dan laten we hem schieten."
  - Laat de split via `SPLIT_PRESET_LABEL` lopen ("3× per week · boven/onder").
  - Formatteer alle datums met `weekdayShortNL` en `formatDateNL` ("ma 5 oktober").
  - Vertaal of schrap de technische termen: "forecast-bereik" wordt "vanaf over twee weken", "committed" vervalt, "Goal Focus" wordt "doelfocus", "tapering" wordt "afbouwen voor de tocht", "Neck check" wordt "Vuistregel".
  - Toon de cost-score niet.
  - Geef planningsregels in Bronnen een leesbare naam via `readableRule`.
- Moeite: middel.

### 1.2 Engelse resten in navigatie en vaste labels

- Vindplaats:
  - `src/App.tsx` regels 41 tot 45: TODAY, WEEK, ASCEND, HISTORY, MORE.
  - `src/components/AscentLadder.tsx:41`: SUMMIT.
  - `src/pages/Ascend.tsx:136` "ASCEND READINESS" en `:149` "READINESS TREND [em-dash] 8 WEKEN".
  - `src/components/DebriefSheet.tsx:42` DEBRIEF, `CoachCard.tsx:73` COACH, `CountdownTimer.tsx:125` RESET.
  - `src/components/BaselineEvidenceCard.tsx:49` "BASELINE / CAPACITEITSCHECK", `src/pages/Settings.tsx:489` "BASELINE HANDMATIG INVULLEN", `StrengthProgramCard.tsx:121` "KRACHTBLOK REVIEW".
  - `src/components/LogDetailSheet.tsx:11` en `src/pages/History.tsx:132` "Treadmill", `LogDetailSheet.tsx:25` "ASCEND Guided", `ExerciseLogger.tsx:393` "Machine-vertical (optioneel)".
  - `src/components/StrengthProgramWizard.tsx` regels 32 tot 34 en 300: "Upper / Lower", "Full Body", "Push / Pull / Legs", "Split", met placeholder "bijv. bro_split" op regel 306.
  - `src/components/GoalSetupWizard.tsx:131` "evidence".
  - `src/pages/Settings.tsx:277` "metrics", `:310` "chime", `:296` "UTC".
- Wat is er mis: Engels in kernnavigatie en koppen. ASCEND is de merknaam en mag blijven.
- Voorstel:
  - Tabbalk: VANDAAG, WEEK, ASCEND, LOGBOEK, MEER. "LOGBOEK" past beter in 68 tot 74 px dan "GESCHIEDENIS", en de paginatitel van Meer heet al "MEER".
  - SUMMIT wordt TOP.
  - READINESS wordt PARAATHEID, of "KLAAR VOOR VANDAAG" en "PARAATHEID, AFGELOPEN 8 WEKEN".
  - DEBRIEF wordt TERUGBLIK, COACH wordt ADVIES, RESET wordt OPNIEUW.
  - BASELINE wordt "STARTNIVEAU".
  - "KRACHTBLOK REVIEW" wordt "KRACHTBLOK EVALUEREN".
  - Treadmill wordt loopband.
  - "ASCEND Guided" wordt "Volgens ASCEND".
  - "Machine-vertical" wordt "Hoogtemeters op toestel".
  - De splits worden "Boven / onder", "Hele lichaam" en "Duwen / trekken / benen", en "Split" wordt "Indeling".
  - "evidence" wordt "meting".
  - "metrics" wordt "meetwaarden".
  - "chime" wordt "klank".
  - De versietijd toon je in lokale tijd, zonder "UTC".
- Moeite: klein.

### 1.3 Decimale punt in plaats van komma

- Vindplaats:
  - `src/pages/TrainingSpots.tsx:183` toont "Station: Amersfoort Centraal, ±1.3 km hemelsbreed" (data in `src/data/trainingSpots.ts`, bijvoorbeeld regel 52 met `km: 1.3`).
  - `src/engine/trainingSpots.ts:47` geeft "dan ±1.4 km lopen".
  - `src/components/LogDetailSheet.tsx` regels 29 tot 39 (`${activity.distanceKm} km`, rugzakgewicht, hoogtemeters).
  - `src/pages/History.tsx` regels 142 en 143 (`${log.outdoorData.distanceKm} km`).
  - `src/engine/candidatePlacement.ts` regels 619 en 620 (`toFixed(2)`).
  - `src/engine/preparationTarget.ts:53` (`${d.demand.amount} ${d.demand.unit}`: ruwe eenheid zoals `m_elevation_gain`).
- Wat is er mis: zodra een waarde een decimaal heeft, staat er een punt ("12.5 km"). Op Trainingsplekken is dat nu al zichtbaar.
- Voorstel: overal `formatNumberNL(x, 1)` gebruiken, en voor eenheden `formatMeasuredValue`. Voeg een lintregel of test toe die `${...} km` en `${...} kg` zonder formatter afkeurt.
- Moeite: klein.

### 1.4 Citaten volledig in het Engels, deels militair van toon

- Vindplaats: `src/data/quoteLibrary.ts` (72 citaten), getoond via `src/components/QuoteCard.tsx` op Vandaag en bij voltooien. Gezien: "Finis coronat opus." met "[em-dash] Latin proverb tradition" en een link "Traditional proverb ↗". Verder onder meer "The Only Easy Day Was Yesterday." (U.S. Navy SEALs, regel 78), "Life is a warfare." (Seneca) en Spartaanse en militaire tradities (regel 2).
- Wat is er mis: Engels op het hoofdscherm, Engelse bronlabels ("tradition", "translation"), en SEAL- en oorlogscitaten die richting sportschoolbluf gaan in plaats van stoïcijnse rust.
- Voorstel:
  - Voeg een veld `quoteNl` toe met een eigen Nederlandse vertaling, en laat Latijn staan met de vertaling eronder ("Het einde kroont het werk.").
  - Vertaal `author` en `sourceLabel` ("Latijns spreekwoord", "Marcus Aurelius, Overpeinzingen 5.1").
  - Schrap de militaire en Spartaanse citaten, of zet ze op `recommended: false` en filter ze weg. Houd Marcus Aurelius, Seneca, Epictetus en Laozi.
- Moeite: groot (vertaalwerk), technisch klein.

### 1.5 Trainingsnamen en ladderlabels in het Engels of gemengd

- Vindplaats:
  - `src/data/defaultProgram.ts`: regel 36 "Upper A", 60 "Lower A [em-dash] Zware Beendag", 89 "Upper B", 110 "Lower B", 141 "Easy Run", 185 "Heuvel-/Incline-Intervallen", 213 "Lange Duurloop", 388 "GR5 / ALPINE READINESS". Focusregels zijn ook Engels: regel 62 "Squat • RDL • Hamstrings • Single-leg", 165 "Incline of hike [em-dash] D+ opbouw".
  - `src/data/gr5Details.ts` subtitels op regels 93, 108, 124, 140, 153, 162, 181, 195, 208 en 225: "Aerobic Base", "Uphill Endurance", "Time on Feet", "Back-to-Back [em-dash] Licht", "Vertical Base I [em-dash] Ascent", "Load Carriage I [em-dash] Licht", "Mountain Endurance", "Alpine Climbing & Descent", "Alpine Day", "met GR5-pack".
  - `src/data/trainingGuide.ts:192` "Alpine Base • Uphill Endurance", en in de Trainingsgids "Recovery • Rustige beweging".
- Wat is er mis: de namen die je elke dag ziet zijn half Engels, en Engelse hoofdletters per woord ("Lange Duurloop") zijn geen Nederlandse spelling.
- Voorstel:
  - Bovenlichaam A en B, Benen A (zwaar), Benen B, Rustige duurloop, Heuvelintervallen, Lange duurloop, "GR5 / ALPENKLAAR".
  - Ladder: Aerobe basis, Bergop uithouding, Uren op de been, Twee dagen achter elkaar (licht), Hoogtemeters I, Rugzak I (licht), Berguithouding, Alpien klimmen en dalen, Alpiene dag, "met volle GR5-rugzak".
  - Let op: templates en doelen staan in IndexedDB. Volgens `CLAUDE.md` vraagt een naamswijziging om een migratiestap in `storage/migrations.ts`, of om weergavenamen via een id-map, zodat bestaande logs niet worden herschreven.
- Moeite: groot.

### 1.6 Hetzelfde ding met verschillende woorden

- Vindplaats en voorstel:
  - Wandelen: Instellingen en het doelformulier zeggen "Hiken" (`src/engine/sports.ts:12`, `GoalRouteEditor.tsx:36`), Geschiedenis zegt "Wandelen" (`History.tsx:97`), Ascend zegt "echte hike" en "hiking-specificiteit" (`Ascend.tsx` regels 201 tot 208), en het doel zegt "loopdagen". Kies "Wandelen" en "wandeldag" overal.
  - Hoogtemeters: "Stijging" (`ExerciseLogger.tsx:377`), "Stijging (D+)" (`GoalSetupWizard.tsx:49`), "Hoogtemeters D+" (`LogDetailSheet.tsx:31`), "Hoogtemeters" (Geschiedenis), "KLIMMEN / D+" (`Ascend.tsx:165`) en "D+" zonder "m" (`History.tsx` regels 137 en 140: "• 350 D+"). Kies het label "Stijging" en "Daling" met de eenheid "m D+" en "m D−". Gebruik één minteken: nu staat er 33 keer "D-" (koppelteken) en 4 keer "D−".
  - Sessie, training en workout: "SESSIE STARTEN", "+ losse training loggen", "Geen sessie gepland", "Meerdere trainingen op één dag" en daaronder "twee sessies" (`Settings.tsx` regels 433 en 435). Kies voor de gebruiker "training" (TRAINING STARTEN, TRAINING VOLTOOID). "Workout" alleen in productnamen (MacroFactor Workouts).
  - Blok of fase: Vandaag toont "BLOK 1/4" (`Today.tsx:257`), Week toont "WEEK 1 • BASISFASE", en "krachtblok" is iets anders. Maak er "FASE 1/4" van.
  - Auto en Automatisch: `Settings.tsx:408` "Auto: ..." tegenover regel 35 "Automatisch". Kies "Automatisch".
  - Ascend en ASCEND: 107 strings schrijven "Ascend", 61 schrijven "ASCEND". Bijvoorbeeld `ExerciseLogger.tsx` regels 292 en 370, `adviceEngine.ts:251` ("Ascend-pagina") en `trainingGuide.ts` regels 81, 110, 149, 176 en 193. Kies "ASCEND".
  - Aantal per week: "x/week" (`StrengthProgramCard.tsx:93`), "x per week" (`Settings.tsx:194`) en "3× kracht" (`TrainingGuide.tsx:40`). Kies "3× per week".
  - BEVESTIG (`SessionActionSheet.tsx:90`) tegenover BEVESTIGEN. Kies BEVESTIGEN.
  - "OPSLAAN..." met drie punten (`ExerciseLogger.tsx:436`) tegenover "BEZIG…" elders. Kies "…".
  - "SCHEMA AANPASSING" (`RescheduleDialog.tsx:26`) tegenover "SCHEMA-AANPASSING" (`ForecastAdjustmentBanner.tsx:11`). Kies "SCHEMA-AANPASSING".
- Moeite: middel.

### 1.7 Em-dashes

- Vindplaats: 311 string-literals bevatten een em-dash. De meeste staan in `src/data/trainingGuide.ts` (56), `modalities.ts` (54), `gr5Details.ts` (39), `garminGuide.ts` (26), `defaultProgram.ts` (25), `algorithmRules.ts` en `garminSuggested.ts` (elk 11), `pages/Ascend.tsx` (9) en `engine/weeklyPrescriptionBuilder.ts` (9). Zichtbaar onder meer in:
  - `index.html:11` en de manifestnaam (`vite.config.ts:40`).
  - De trainingsnaam "Lower A [em-dash] Zware Beendag" en "Wennen [em-dash] 4-5 herhalingen" op Vandaag.
  - `AdventureCard.tsx:18`.
  - `ExerciseLogger.tsx` regels 224, 292, 361, 370, 384 en 443.
  - `ErrorBoundary.tsx:60`, `BaselineEvidenceCard.tsx:51`.
  - `Ascend.tsx` regels 138, 149, 201, 206, 207, 230, 522, 533 en 550.
  - `StrengthProgramCard.tsx` regels 93 en 101, `TrainingGuide.tsx:33`, `DailyStretchCard.tsx:25`.
  - De citaatregel "[em-dash] Latin proverb tradition".
- Wat is er mis: de gebruiker wil geen em-dashes.
- Voorstel: vervang per zin door een punt, komma, dubbele punt of "·". Voorbeelden:
  - "Wennen · 4 tot 5 herhalingen".
  - "Alle mijlpalen behaald. Klaar voor de expeditie."
  - "Doeltijd (uur)".
  - Citaatbron: "Latijns spreekwoord", zonder streep.
  - Voeg een kleine check toe aan `npm run lint` of een test die "[em-dash]" in niet-commentaar strings onder `src/` afkeurt.
- Moeite: middel.

### 1.8 Spelfouten en Nederlandse samenstellingen

- Vindplaats en voorstel:
  - `Ascend.tsx:297` "KRACHT PROGRESSIE" wordt KRACHTPROGRESSIE. `:338` "GR5 DOEL" wordt GR5-DOEL. `:468` "MARATHON DOEL" wordt MARATHONDOEL.
  - `Today.tsx` regels 283 en 290: "OCHTEND REKKEN" en "AVOND REKKEN" worden OCHTENDREKKEN en AVONDREKKEN, of "REKKEN, OCHTEND".
  - `Settings.tsx:35` "tijd-budget" wordt tijdbudget. `:447` "kracht-sessies" wordt krachttrainingen. `:520` "standaard programma" wordt standaardprogramma.
  - `Ascend.tsx:315` "loggings" wordt "registraties" of "logs".
  - `garminGuide.ts:71` "Ascend's eigen schatting" wordt "de eigen schatting van ASCEND". Een apostrof-s is hier geen Nederlands.
  - `defaultProgram.ts:126` "Lange-duur beenuithouding" wordt "beenuithouding over lange duur".
  - `index.html:11` en `vite.config.ts:42`: "training- en avontuur-commandocentrum" wordt "trainings- en avonturen-app" (zie ook 1.10).
  - Hoofdletters per woord in namen ("Lange Duurloop", "Zware Beendag", "Heuvel-/Incline-Intervallen") worden zinsletters.
- Moeite: klein.

### 1.9 Onduidelijke of te technische zinnen

- Vindplaats en voorstel:
  - `ExerciseLogger.tsx:292`: "Optioneel [em-dash] helpt Ascend signaleren als Bergconditie op vrijdag zaterdags Lower B twee weken op rij verstoort." Dit is een hardgecodeerde, onleesbare zin. Wordt: "Optioneel. Zo ziet ASCEND of een training je de dag erna zwaarder maakt."
  - `Today.tsx:219` "Je sessie(s) van vandaag staan op voltooid." wordt "Je training van vandaag zit erop." (meervoud apart afhandelen).
  - `Ascend.tsx:138` "Ben je er nu klaar voor [em-dash] herstel, consistentie, hoe recente sessies aanvoelden." wordt "Hoe klaar je nu bent, op basis van herstel, regelmaat en hoe je laatste trainingen voelden."
  - `ExerciseLogger.tsx:418` "RPE (1-10)" en `LogDetailSheet.tsx:41` "RPE" worden "Zwaarte (1 tot 10)", met een uitleg via de info-knop.
  - `ExerciseLogger.tsx:392` "Verdiepingen/stappen" wordt "Verdiepingen (trap)".
  - `GoalSetupWizard.tsx` regels 587, 621 en 635: "DOELINTERPRETATIE", "CAPACITEIT VS. VRAAG", "VERWACHTE PLANIMPACT" worden "JOUW DOEL", "WAT JE KUNT EN WAT HET VRAAGT", "WAT ER IN JE PLANNING VERANDERT". `GoalSetupWizard.tsx:63` "GAT / GROOT GAT" wordt "TEKORT / GROOT TEKORT".
  - `Settings.tsx:37`: label "Alleen indien nuttig" en uitleg "Alleen samenvoegen als er anders écht geen plek is" zeggen niet hetzelfde. Wordt: label "Alleen als het moet".
  - `Settings.tsx:659`: de uitleg bij Trainingstijd per dag is één alinea van vijf zinnen. Wordt: één zin met daaronder een "meer uitleg"-uitklap.
  - `StrengthProgramWizard.tsx:180` "Toegepast op deze en/of volgende week." wordt "Toegepast op deze week en de volgende."
  - `ImportWizard.tsx` regels 292 en 305: "conflict(en)" en "record(s)" worden enkelvoud en meervoud via een kleine helper.
  - `strengthScheduling.ts:136`: één zin met drie gedachtestreepjes en "dat is geen "geen wijzigingen nodig"". Herschrijven in twee korte zinnen.
- Moeite: middel.

### 1.10 Toon

- Vindplaats en voorstel:
  - `index.html:11` en `vite.config.ts:42` "commandocentrum" klinkt militair en spelachtig. Wordt: "Persoonlijke trainings-app voor kracht, conditie en bergtochten."
  - `adviceEngine.ts` regels 137 en 140: "Laten vallen. Deze week is er geen vrije dag zonder te stapelen." is kortaf. Wordt: "Deze laten we schieten. Er is deze week geen vrije dag zonder twee trainingen te stapelen."
  - `GoalFocusCard.tsx:17` "ONWAARSCHIJNLIJK" is hard. Wordt "NOG VER WEG".
  - `Settings.tsx:310` "Een paar dreunen" wordt "Een paar lage tonen".
  - `data/garminGuide.ts`: "casual wandeling", "tempo runs", "serieuze hikes", "Talk test", "HR". Wordt: "rustige wandeling", "tempolopen", "zware bergwandelingen", "praattest", "hartslag". Garmin-menunamen mogen Engels blijven, maar zet ze tussen aanhalingstekens als menupad.
- Moeite: klein.

### 1.11 Datums en tijden

- Vindplaats en voorstel:
  - Ruwe ISO-datums, zie 1.1.
  - `Week.tsx:94` en `History.tsx:101`: "6u 25m gepland" en "0u 0m" worden "6 uur 25 min".
  - `StretchList.tsx:39` "30s" wordt "30 sec".
  - `History.tsx:51`: "-1 t.o.v. vorige maand" wordt "1 minder dan vorige maand", of met een echt minteken.
  - `Settings.tsx:296`: de bouwtijd in UTC wordt lokale tijd.
- Moeite: klein.

### 1.12 Inhoudelijke tegenspraak

- Vindplaats: `Ascend.tsx:205`: "4× kracht / hypertrofie". Het krachtprogramma op hetzelfde scherm zegt "3x/week", en de Trainingsgids zegt "3× kracht".
- Voorstel: haal het getal uit het actieve krachtblok, of schrijf "3× kracht".
- Moeite: klein.

---

## 2. Offline en installatie

Wat goed gaat:

- De service worker registreert zich (scope `/ascend/`, status activated) en precachet 17 bestanden (947 KiB).
- Na herladen in offline-modus werken alle elf routes zonder fout: Vandaag, Week, Ascend, Geschiedenis, Meer, Rekoefeningen, Gids, Garmin, Bronnen, Trainingsplekken en Blessures. Een deep link (`index.html#/bronnen`) werkt ook offline.
- De updatemelding werkt: na een nieuwe build verscheen "Nieuwe versie van ASCEND", BIJWERKEN laadde de nieuwe JS-bundle, en daarna stond "Bijgewerkt naar de nieuwste versie" vier seconden in beeld.

### 2.1 Google Fonts blokkeert het eerste beeld, werkt niet offline en lekt gebruik naar Google

- Vindplaats: `src/index.css:1` (`@import url('https://fonts.googleapis.com/css2?...')`). `vite.config.ts` heeft geen `runtimeCaching` voor fonts.
- Wat is er mis:
  - De @import in CSS blokkeert het renderen. Gemeten in deze omgeving: First Contentful Paint na 4,9 tot 6,3 s mét Google Fonts, en na 0,2 s als fonts.googleapis.com geblokkeerd is. De absolute getallen komen door de proxy hier, maar het principe geldt op elk traag mobiel netwerk. Juist in de bergen met slechte dekking blijft het scherm leeg tot het font-verzoek opgeeft, terwijl de app zelf offline klaarstaat.
  - Offline zijn Marcellus en Inter niet beschikbaar (`document.fonts.check` geeft false). Koppen vallen terug op een Times-achtige serif, want "Iowan Old Style" bestaat alleen op Apple.
  - Elke keer dat de app opent gaat er een verzoek naar Google. Dat strijdt met "alles lokaal op je toestel".
- Voorstel: host de fonts zelf. Zet woff2-bestanden (Latin-subset, Inter variabel plus Marcellus) in `public/fonts`, of gebruik `@fontsource-variable/inter` en `@fontsource/marcellus`. Gebruik `@font-face` met `font-display: swap` en voeg `woff2` toe aan `globPatterns`. Dan zitten de fonts in de precache.
- Moeite: middel.

### 2.2 Geen persistente opslag aangevraagd

- Vindplaats: nergens in `src` staat `navigator.storage.persist()`.
- Wat is er mis: alle gegevens staan alleen in IndexedDB. Zonder persist-verzoek mag de browser die opruimen bij weinig opslagruimte. Safari wist scriptopslag van niet-geïnstalleerde sites na zeven dagen zonder gebruik. Voor een app zonder backend is dat het grootste dataverliesrisico.
- Voorstel: vraag bij de eerste start `navigator.storage.persist()` aan. Toon de uitkomst onder Instellingen, Gegevens ("Opslag is beschermd" of "Opslag kan door de browser gewist worden, maak regelmatig een back-up"). Wijs iOS-gebruikers erop de app op het beginscherm te zetten.
- Moeite: klein.

### 2.3 Lange start: vaste splash van 2,6 s en één grote bundle

- Vindplaats: `src/state/AppDataContext.tsx:861` (minimaal 2.600 ms splash bij elke koude start). Bundle in `dist/assets`:
  - JS 831 KB geminificeerd (237 KB gzip), in één chunk. Vite waarschuwt voor chunks boven 500 KB.
  - CSS 28,9 KB (6,6 KB gzip).
  - workbox-window 5,7 KB.
- Gemeten: met de service worker en zonder het fontprobleem staat de app er na ongeveer 3,0 s. Dat is vrijwel geheel de splash. `CLAUDE.md` vraagt dat je binnen twee seconden je missie ziet.
- Grote onderdelen, geschat: react-dom (ongeveer 180 KB geminificeerd) en react-router, plus veel inhoud die bij de eerste start niet nodig is. Zo zijn de bronbestanden `researchSources.ts` 71 KB, `quoteLibrary.ts` 25 KB, `trainingGuide.ts` 23 KB en `defaultProgram.ts` 23 KB, met daarnaast gr5Details, modalities, trainingSpots en stretches. Samen is `src/data` 259 KB broncode.
- Voorstel:
  - Toon de splash alleen bij de allereerste start, of maximaal 800 ms, en sla hem over bij `prefers-reduced-motion`.
  - Laad Bronnen, Trainingsgids, Garmin, Trainingsplekken, Rekoefeningen en de grote wizards met `React.lazy`. Workbox precachet de losse chunks toch, dus offline blijft het werken.
- Moeite: middel.

### 2.4 Externe links offline geven een kale browserfout

- Vindplaats:
  - `src/pages/TrainingSpots.tsx` regels 145, 187 en 193 ("Route ernaartoe ↗", Google Maps, en bronlinks).
  - `src/pages/Sources.tsx:99` ("Open bron ↗").
  - `QuoteCard.tsx` regels 18 en 32, `MilestoneDetailSheet.tsx:77`, `TrainingGuideSheet.tsx:149`, `ModalityPicker.tsx:84`, `StretchList.tsx:28` ("video ↗"), `Ascend.tsx` regels 215 en 251.
- Wat is er mis: offline opent een nieuw tabblad met de Chrome-foutpagina (`chrome-error://chromewebdata/`). De app waarschuwt niet en laat ook geen offline-status zien.
- Voorstel:
  - Maak een kleine `useOnline()`-hook (`navigator.onLine` plus `online`/`offline`-events). Toon offline bij externe links "Offline: opent zodra je weer verbinding hebt", en laat de link grijs.
  - Geef bij Trainingsplekken op Android ook een `geo:lat,lon?q=lat,lon(Naam)`-link. Die opent de kaarten-app, die offline kaarten kan hebben.
  - Optioneel: een rustige regel "Offline. Alles werkt, behalve links naar buiten." bovenaan Meer.
- Moeite: middel.

### 2.5 "Zoeken naar update" offline zegt dat je de nieuwste versie hebt

- Vindplaats: `src/utils/appUpdate.ts` regels 15 tot 21 en `src/pages/Settings.tsx` regels 213 tot 221.
- Wat is er mis: in de test gaf de knop met `setOffline(true)` "Je hebt de nieuwste versie.". Playwright's offline-modus raakt het update-verzoek van de service worker mogelijk niet. Maar de code controleert `navigator.onLine` ook niet en gaat ervan uit dat `update()` een fout gooit.
- Voorstel: controleer eerst `navigator.onLine` en meld dan "Je bent offline. Zoeken naar een update kan zodra je verbinding hebt."
- Moeite: klein.

### 2.6 Updatemelding: werkt, maar met kleine knoppen en zonder aankondiging

- Vindplaats: `src/components/UpdatePrompt.tsx` regels 38 tot 48 en 66.
- Wat is er mis:
  - BIJWERKEN is 103x28 px. Het sluitkruis "×" van de bevestiging is nog kleiner.
  - De melding heeft geen `role="status"` of `aria-live`, dus een schermlezer kondigt hem niet aan.
  - Er is geen "Later". De balk blijft staan tot je bijwerkt.
  - De herlaadtijd na BIJWERKEN was in de test 7,6 s. Daarvan is het grootste deel de Google Fonts-wachttijd uit 2.1.
- Voorstel: knoppen minimaal 44 px hoog, `role="status"` op de balk, een knop "Later" die de melding verbergt tot de volgende start, en het kruis vervangen door een knop van 44x44 met `aria-label="Sluiten"`.
- Moeite: klein.

### 2.7 Manifest: compleet, maar zonder taal en met em-dash

- Vindplaats: `vite.config.ts` regels 38 tot 54. Het gegenereerde `manifest.webmanifest` heeft `"lang":"en"`.
- Wat is goed: `name`, `short_name`, `description`, `start_url` en `scope` (`/ascend/`), `id`, `display: standalone`, `theme_color` en `background_color` (#0D0D0F), en iconen 192, 512 en 512 maskable (de veilige zone van de maskable is in orde). De apple-touch-icon is 180x180.
- Wat is er mis:
  - Taal is Engels.
  - De naam bevat een em-dash ("ASCEND [em-dash] Discipline, Progressie, Avontuur").
  - De beschrijving heeft een spelfout en "commandocentrum".
  - Er zijn geen `screenshots`, waardoor Chrome op Android het eenvoudige installatievenster toont.
  - Er zijn geen `shortcuts`.
- Voorstel:
  - Voeg `lang: 'nl'` toe.
  - Naam: "ASCEND: training, progressie, avontuur".
  - Een beschrijving zoals in 1.10.
  - Twee screenshots (390x844, `form_factor: 'narrow'`).
  - Eventueel shortcuts naar `#/` en `#/week`.
- Moeite: klein.

### 2.8 Kleine schoonheidsfouten in PWA-configuratie

- Vindplaats en voorstel:
  - De precache bevat vijf bestanden dubbel (apple-touch-icon, favicon en pwa-192, pwa-512 en pwa-512-maskable), omdat `includeAssets` en `globPatterns` overlappen. Haal `includeAssets` weg of beperk `globPatterns`.
  - `public/icon.svg` en `icon-maskable.svg` worden nergens gebruikt maar wel geprecachet. Weghalen of gebruiken.
  - `index.html:9` gebruikt alleen het verouderde `apple-mobile-web-app-capable`. Voeg `<meta name="mobile-web-app-capable" content="yes">` toe.
  - Er is geen eigen installatie-uitnodiging (`beforeinstallprompt`) en geen uitleg voor iOS ("Deel, Zet op beginscherm"). Een korte regel onder Meer, Gegevens helpt, ook voor 2.2.
  - Offline werkt `/ascend` zonder slash niet, alleen `/ascend/`. Online stuurt GitHub Pages door en de start_url heeft een slash, dus dit is alleen een randgeval.
- Moeite: klein.

---

## 3. Toegankelijkheid

Wat goed gaat:

- `html lang="nl"` is gezet.
- De tabbalk bestaat uit echte links met `aria-current` en is groot genoeg (68 tot 74 bij 51 px).
- Toetsenbordnavigatie bereikt alles in logische volgorde.
- De focusring is zichtbaar dankzij de standaardring van Chrome.
- De instellingentabs hebben `role="tablist"` en `aria-selected`.
- Invoervelden hebben gekoppelde labels.
- Op 390 en 360 px is er geen horizontale scroll, ook niet bij 130%.
- De globale `prefers-reduced-motion`-regel werkt: alle CSS-animaties lopen 0,01 ms en één keer.

### 3.1 Inzoomen is geblokkeerd

- Vindplaats: `index.html:7` (`maximum-scale=1.0`). axe meldt dit als kritiek op alle elf routes.
- Wat is er mis: slechtziende gebruikers kunnen niet met twee vingers inzoomen.
- Voorstel: haal `maximum-scale=1.0` weg. Wil je voorkomen dat iOS inzoomt bij het focussen van een veld, geef invoervelden dan minimaal 16 px tekst.
- Moeite: klein.

### 3.2 Veel tikdoelen kleiner dan 44x44 px

- Vindplaats, gemeten op 360x740:
  - Vandaag: 19 van de 27 tikdoelen zijn kleiner dan 44 px.
  - Trainingsplekken: 37 van de 42.
  - Bronnen: 280 van de 557.
  - Garmin: 12 van de 17.
- De ergste:
  - De terug- en bladerknoppen "‹" en "›" zijn 7x28 px: `Week.tsx:75` en de knop met "›", `History.tsx` regels 88 en 90, `GarminGuide.tsx:11`, `TrainingGuide.tsx:30`, `Stretches.tsx:11`, `StretchArea.tsx` regels 17 en 28, `Injuries.tsx:47`, `Sources.tsx:25` en `TrainingSpots.tsx:63`.
  - Tekstlinks van 16 tot 17 px hoog: "waarom" (`CoachCard.tsx:117`, 58x17), "nog 2 tonen", "later" (26x16, `WeightCard.tsx`), "+ losse training loggen", "Niet fit?", "tip, toegang en bronnen" en "Route ernaartoe ↗" (`TrainingSpots.tsx` regels 175 en 193), "Open bron ↗" (`Sources.tsx:99`, 272 keer) en de Garmin-bronlinks.
  - InfoButton 24x24 (`ui.tsx`, InfoButton). Het afvinkrondje bij Rekken is 24x24 (`DailyStretchCard.tsx`).
  - Akkoord en Liever niet zijn 28 px hoog (`CoachCard.tsx`, Pill). Filterchips zijn 26 px. De instellingentabs zijn 28 px. De schakelaar is 44x24 (`ui.tsx`, Toggle). Timer en Rekoefeningen bovenaan Vandaag zijn 36x36. BIJWERKEN is 28 px.
- Voorstel: geef `ui.tsx` een vaste minimale tikmaat (`min-h-11 min-w-11`) voor icoon- en pijlknoppen. Geef tekstlinks een groter tikvlak met padding (`py-3 -my-3`) zonder dat de layout verandert. Maak Pill en de chips minimaal 36 px hoog met 44 px tikvlak.
- Moeite: middel.

### 3.3 Knoppen en statussen zonder bruikbare naam

- Vindplaats:
  - Dezelfde "‹"- en "›"-knoppen als in 3.2 hebben geen `aria-label`, behalve Sources en TrainingSpots. Een schermlezer zegt "‹, knop".
  - `StatusDot` in `src/components/ui.tsx` regels 63 tot 78 toont alleen ✓, ●, ○, ↷, × en !. In Week staat bij gemiste trainingen alleen "!".
  - SVG-iconen in de tabbalk (`App.tsx`, NavIcon) hebben geen `aria-hidden`.
- Voorstel:
  - `aria-label="Terug"`, "Vorige week", "Volgende week", "Vorige maand" en "Volgende maand".
  - In StatusDot een verborgen label ("Voltooid", "Vandaag", "Gepland", "Verplaatst", "Overgeslagen", "Gemist") met `sr-only`, en het symbool `aria-hidden`.
  - `aria-hidden` op decoratieve SVG's.
- Moeite: klein.

### 3.4 Contrast van een aantal kleurparen te laag

Berekend uit de tokens in `src/index.css`. Norm WCAG AA: 4,5:1 voor normale tekst, 3:1 voor grote tekst en voor randen van bedieningselementen.

- In orde:
  - ink op card 14,5
  - ink-dim op card 5,42, op bg 6,27, op charcoal 6,03 en op surface 5,77
  - bronze op card 5,43
  - gold op card 6,91
  - sky op card 5,23
  - warning op card 5,20
  - stone op card 4,52 (net)
- Niet in orde:
  - danger (#8c3f3f) op card 2,32, op bg 2,68. Als tekst gebruikt in "verwijderen" (`BaselineEvidenceCard.tsx:67`), de verwijderregels in `StrengthProgramWizard.tsx` regels 196 en 556, en StatusDot ×. Voorstel: een teksttint zoals #c87272 (4,88 op card), of een apart token `--color-danger-text`.
  - success (#5c7a63) op card 3,53. Als 10 px tekst in Geschiedenis (axe). Voorstel: #7d9a83 (5,45) als teksttint.
  - Gemiste trainingen in Week zijn met opacity gedimd tot 2,4:1 (axe, 10 elementen; `WeekPlanner.tsx` en `SessionCard.tsx`). Voorstel: dim met ink-dim in plaats van opacity, en laat de tekst minstens 4,5:1.
  - Tekst op de primaire knop (#15130d op het verloop gold naar bronze-dark): 7,65 aan de goudkant, 4,73 in het midden en 2,70 aan de donkere kant. Lange labels lopen rechts onder de norm. Voorstel: laat het verloop eindigen op bronze (#b08d57, 6,01).
  - Randen van invoervelden, SecondaryButton en de uit-stand van Toggle (card-border #29292f op card): 1,16. Velden en de uitgeschakelde schakelaar zijn nauwelijks te zien. Voorstel: een randtoken van ongeveer #6e6a62 (ongeveer 3:1) voor bedieningselementen. Houd card-border voor kaarten.
- Moeite: klein tot middel (nieuwe tokens, zonder de visuele taal om te gooien).

### 3.5 Sheets en dialogen zijn geen echte dialogen

- Vindplaats: alle bottom sheets en overlays, onder meer SessionActionSheet, TrainingGuideSheet, ExerciseLogger, GoalSetupWizard, StrengthProgramWizard, ImportWizard, CountdownTimer, DebriefSheet, AdHocLogSheet, MilestoneDetailSheet en RescheduleDialog. Nergens staat `role="dialog"` of `aria-modal`.
- Wat is er mis:
  - In de test bleef de trainingsuitleg open na Escape.
  - De focus gaat niet de sheet in en blijft op de knop erachter.
  - De achtergrond blijft bereikbaar met Tab. Dat zie je ook in de tekst die Playwright ophaalt: de hele pagina staat onder de sheet nog in de toegankelijkheidsboom.
- Voorstel: één gedeeld `Sheet`-component met `role="dialog"`, `aria-modal="true"` en `aria-labelledby` (de Eyebrow-titel). Het component zet de focus op de eerste knop, sluit met Escape en zet de focus terug op de knop die de sheet opende. Gebruik `inert` op `#root > div` zolang de sheet open is.
- Moeite: middel.

### 3.6 Grotere tekst schaalt maar half, en knipt op 360 px

- Vindplaats: 63 plekken gebruiken vaste pixelgroottes: `text-[11px]` 44 keer en `text-[10px]` 19 keer, onder meer Eyebrow in `ui.tsx`, de tabbalk in `App.tsx` en de CoachCard-labels.
- Wat is er mis:
  - Met root font-size 130% groeit de gewone tekst, maar eyebrows ("VANDAAG", "COACH"), "4 adviezen" en de tablabels blijven 10 tot 11 px.
  - Met zoom 130% op 360 px valt "Geavanceerd" in de instellingentabs buiten beeld (`Settings.tsx:256`), en steekt "waarom" in CoachCard buiten de kaart.
  - In Week worden namen afgekapt tot "Lower A [em-dash] Zwar…" en "Kracht • Squat • RD…" (8 regels afgekapt, `truncate` in SessionCard).
  - De layout breekt verder niet en er is geen horizontale scroll.
- Voorstel:
  - Zet de vaste px om naar rem (`text-[0.6875rem]` en `text-[0.625rem]`).
  - Laat titels in SessionCard over twee regels lopen (`line-clamp-2` in plaats van `truncate`).
  - Maak de tablist horizontaal scrollbaar of laat de tabs op twee regels lopen.
  - Geef de CoachCard-actierij `flex-wrap`.
- Moeite: middel.

### 3.7 Geen landmarks en geen h1

- Vindplaats: axe meldt "landmark-one-main", "page-has-heading-one" en "region" op alle routes. `App.tsx` rendert de routes in een `div`, en paginatitels zijn Eyebrow-divs.
- Voorstel: vervang de scrollcontainer in `App.tsx` door `<main>`, geef de nav een `aria-label="Hoofdmenu"`, en maak de paginatitel per scherm een `h1`. Die mag er hetzelfde uitzien.
- Moeite: klein.

### 3.8 Focusstijl hangt af van de browser

- Vindplaats: in `src/index.css` en de componenten staat nergens `:focus-visible`.
- Wat is er mis: de standaardring van Chrome is zichtbaar, maar dun op de goudverlopende knop. Safari en Firefox tonen elk iets anders. Na het openen van de app zijn 21 Tab-stappen nodig om bij de tabbalk te komen. Op mobiel is dat acceptabel.
- Voorstel: één regel in `index.css`, bijvoorbeeld `:focus-visible { outline: 2px solid var(--color-gold); outline-offset: 2px; }`.
- Moeite: klein.

### 3.9 Reduced motion: twee gaten

- Vindplaats:
  - `src/components/AscendAnimatedLogo.tsx:53`: een SMIL `<animateTransform ... repeatCount="indefinite">` draait door bij `prefers-reduced-motion`, omdat de CSS-regel geen SMIL raakt. Gezien op Vandaag.
  - `src/index.css`, de reduced-motion-regel: `animation-delay` wordt niet op 0 gezet. Elementen met een vertraging, zoals het splash-woordmerk na 1,4 s, verschijnen daardoor nog steeds laat.
  - De splash duurt ook met reduced motion minstens 2,6 s (`AppDataContext.tsx:861`).
- Voorstel: laat het logo `animateTransform` weg als `matchMedia('(prefers-reduced-motion: reduce)')` waar is. Zet `animation-delay: 0s !important` in de regel, en sla de splash dan over.
- Moeite: klein.

### 3.10 Meldingen worden niet aangekondigd

- Vindplaats: alleen `ChangeNotice.tsx:28` heeft `role="status"`. Niet aangekondigd worden: UpdatePrompt en UpdatedNotice, de "Opgeslagen."-regels in `Settings.tsx` (functie `note`), CompletionMoment ("SESSIE VOLTOOID") en de foutmeldingen in de wizards.
- Voorstel: `role="status"` op bevestigingen en `role="alert"` op fouten.
- Moeite: klein.
