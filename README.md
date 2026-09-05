# ASCEND

**Discipline. Progressie. Avontuur.**

ASCEND is geen workout logger. Het is een persoonlijk training- en
avontuur-commandocentrum: het verbindt dagelijkse krachttraining en cardio
aan een groter doel — hardlopen, wandelen, hoogtemeters, rugzakcapaciteit en
uiteindelijk meerdaagse Alpine tochten zoals de GR5.

Elke keer dat je de app opent, beantwoordt hij binnen twee seconden: **wat is
mijn missie vandaag?**

---

## Inhoud

- [Visie](#visie)
- [Technologie](#technologie)
- [Aan de slag](#aan-de-slag)
- [Build & deployment (GitHub Pages)](#build--deployment-github-pages)
- [Architectuur](#architectuur)
  - [Data-architectuur](#data-architectuur)
  - [Scheduling-architectuur](#scheduling-architectuur)
  - [Progressie- en Ascent Ladder-architectuur](#progressie--en-ascent-ladder-architectuur)
  - [Avontuur / objectieven-architectuur](#avontuur--objectieven-architectuur)
  - [Import / export](#import--export)
- [Toekomstige integraties](#toekomstige-integraties)
- [Roadmap](#roadmap)

---

## Visie

ASCEND draait om één doorlopende lijn:

```
MISSIE → TRAINING → CAPACITEIT → PROGRESSIE → OBJECTIEF → AVONTUUR → ASCENT
```

Elke sessie in de sportschool bouwt aan iets dat groter is dan de sessie zelf.
Duurlopen bouwen uithoudingsvermogen. Stijgingstraining bouwt hoogtemeters.
Consistentie bouwt richting een concreet objectief: de volgende mijlpaal op de
**Ascent Ladder**, oplopend tot "GR5 KLAAR".

Het standaard schema dat ASCEND meelevert (`src/data/defaultProgram.ts`) is
niet langer generieke demo-data — het is het echte **Maand 1 / BASISFASE**
schema: Herstel, Easy Run, Lower A (zware beendag), Upper B, Upper A, en een
weekend-beenblok van Heuvel-/Incline-Intervallen (zaterdag) gevolgd door een
Lange Duurloop (zondag) — bewust aaneengesloten, gericht op zowel
hardloopprogressie als GR5-specifieke D+. Lower B en Bergconditie zijn als
losse wekelijkse sessies vervangen door dat weekend-blok; hun templates
blijven wel gedefinieerd zodat oudere geschiedenis nog gewoon oplost. Elke
sessie volgt de exacte week-op-week progressie (wennen → opbouw → zwaarste
week → deload) uit dat schema. Maand 2-4 zijn nog placeholders die
hetzelfde patroon hergebruiken totdat die maanden zijn uitgewerkt — zie
Roadmap.

> **Als je de app al eerder had geopend:** je browser heeft de oude demo-data
> al lokaal opgeslagen. Ga naar **Meer → Schema opnieuw laden** om over te
> schakelen naar het echte Maand 1-schema. Dit wist eventuele voortgang die
> op de oude demo-data was gelogd.

## Technologie

- **React 19 + TypeScript (strict) + Vite**
- **Tailwind CSS v4** voor styling, met een custom thema dat het ASCEND
  kleurenpalet en typografie als design tokens registreert
- **IndexedDB** (via de lichte [`idb`](https://github.com/jakearchibald/idb)
  wrapper) voor volledig lokale, offline-first opslag
- **react-router-dom** (`HashRouter`, zodat routing zonder server-config werkt
  op GitHub Pages)
- **vite-plugin-pwa** voor installeerbaarheid, offline caching en het manifest
- Geen backend. Geen account. Alles staat op het apparaat van de gebruiker.

## Wijzigingen in deze update

- **Bug:** op langere pagina's (bijv. Instellingen) kon de onderste
  navigatiebalk buiten beeld vallen, omdat de scrollende flex-container geen
  `min-height: 0` had en daardoor de hele pagina liet meegroeien in plaats van
  zelf te scrollen. Opgelost in `App.tsx`.
- **Bug:** een sessie in het verleden die niet gelogd én niet expliciet
  overgeslagen was, toonde zich als een gewone (nog te plannen) sessie. Er
  bestaat nu een aparte `missed`-status (`engine/sessionStatus.ts`), zichtbaar
  in Week en meegeteld in Geschiedenis.
- **Bug:** hoogtemeters van een Bergconditie/incline-sessie stonden wel in de
  maandtotalen maar niet op de losse regel in Geschiedenis. Gefixed.
- **Inconsistentie:** "CONSISTENTIE" op Today toonde een andere berekening
  (alleen deze week) dan op Ascend (rollend 28 dagen), wat op maandagochtend
  een verwarrende 0% gaf. Today gebruikt nu dezelfde rollende berekening.
- Het standaard schema is vervangen door je echte Maand 1-schema (zie Visie
  hierboven).

## Aan de slag

```bash
npm install
npm run dev
```

De app draait dan op `http://localhost:5173`.

### Productie-build

```bash
npm run build
npm run preview   # lokaal de productie-build bekijken
```

## Build & deployment (GitHub Pages)

De repo bevat een kant-en-klare workflow:
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). Die bouwt de
app bij elke push naar `main` en publiceert `dist/` naar GitHub Pages via de
officiële `actions/deploy-pages` action.

**Belangrijk: het base path.** Vite moet weten onder welk sub-pad de app
draait op GitHub Pages (`https://<gebruiker>.github.io/<repo-naam>/`). De
workflow zet dit automatisch via de `ASCEND_BASE_PATH` environment variable,
afgeleid van de officiële `actions/configure-pages` action — die leest de
daadwerkelijke Pages-configuratie van de repo, dus dit werkt vanzelf voor
zowel een project page als een custom domain (geen sub-pad). Deploy je
liever handmatig? Stel de variabele dan zelf in:

```bash
# Project page onder /mijn-repo/
ASCEND_BASE_PATH=/mijn-repo/ npm run build

# Root domain of custom domain
ASCEND_BASE_PATH=/ npm run build
```

Om GitHub Pages te activeren: **Settings → Pages → Source: GitHub Actions** in
de repository-instellingen. Daarna publiceert elke push naar `main`
automatisch een nieuwe versie.

## Architectuur

```
src/
  components/      Herbruikbare UI-componenten (geen business-logica)
  pages/            De vijf schermen: Today, Week, Ascend, History, Settings
  engine/           Alle business-logica: scheduler, progressie, readiness
  models/           TypeScript domeinmodellen (geen React, geen IndexedDB-code)
  storage/          IndexedDB-laag, export/import, schema-migraties
  integrations/     Adapter-interface voor toekomstige Garmin/Health Connect/MacroFactor
  data/             Het standaard demo-programma (templates, GR5-ladder, seed-historie)
  state/            AppDataContext — verbindt storage + engine met de UI
  utils/            Datum-wiskunde, id-generatie
```

De kernregel: **React-componenten bevatten geen trainingslogica.** Een
component roept een functie aan in `engine/` of `storage/` en rendert het
resultaat. Dat betekent dat de scheduler, de progressieberekening en de
readiness-formules volledig los getest kunnen worden van de UI.

### Data-architectuur

Domeinmodellen zijn nooit gekoppeld aan een externe dienst. We modelleren
`OutdoorMetric` met een `source`-veld (`manual` | `garmin` | `health-connect`
| `macrofactor` | `import`), niet `garminElevation`. Wanneer een Garmin- of
Health Connect-adapter er later bijkomt, schrijft die exact dezelfde vormen
weg — geen enkel scherm of engine-bestand hoeft te veranderen.

### Scheduling-architectuur

Drie aparte concepten, nooit samengevoegd:

| Concept | Betekenis | Verandert het verleden? |
|---|---|---|
| `SessionTemplate` | De herbruikbare definitie van een training ("Bovenlichaam A") | — |
| `PlannedSession` | Een template ingepland op een datum | Ja, aanpasbaar (verplaatsen/overslaan) |
| `SessionLog` | Wat er daadwerkelijk gebeurd is | **Nooit** — append-only |

Voltooiing wordt nergens als vlag opgeslagen. Een sessie is "voltooid" zodra
er een `SessionLog` bestaat die naar de `PlannedSession` verwijst
(`engine/sessionStatus.ts`). Het plan wijzigen kan dus nooit de historie
overschrijven.

De scheduler (`engine/scheduler.ts`) is **deterministisch**: geen AI, geen
gokwerk. V1 handhaaft concreet één regel — twee "beenzware" sessies
(Onderlichaam of een wandeling) mogen niet binnen 48 uur van elkaar vallen.
Wanneer je een sessie verplaatst en dat een conflict veroorzaakt, stelt de
engine een **cascade-voorstel** voor: de conflicterende sessie verschuift mee
naar de eerstvolgende vrije, conflictvrije dag in dezelfde week. Dat voorstel
wordt getoond in een dialoog (`RescheduleDialog`) — niets wordt toegepast
zonder bevestiging. Andere regels uit de oorspronkelijke briefing (niet te
veel zware dagen achter elkaar, optionele sessies als eerste laten vervallen)
zijn bewust nog niet geautomatiseerd; de architectuur is er wel klaar voor
— zie Roadmap.

**Week-op-week progressieve targets.** Easy Run en Bergconditie hebben geen
vast aantal minuten — ze volgen `SessionTemplate.weeklyProgression`, een
lijst van `{ weekInPhase, targetMinutes, note }`. `engine/substitutions.ts
#resolveEffectiveFullDuration` zoekt de juiste stap op basis van de datum van
de sessie (via `resolveProgramWeek`) en valt terug op de statische duur als
er geen match is. Dit is generiek: elke toekomstige sessie met een
week-afhankelijk doel (bijv. rugzakgewicht dat per week oploopt) kan dezelfde
structuur gebruiken zonder nieuwe UI.

### Progressie- en Ascent Ladder-architectuur

Doelen volgen hetzelfde patroon als sessies — sinds Phase 1 van de
Technical Architecture (v0.3.1 REVISED) generiek voor elk toekomstig doel,
niet meer hardcoded op GR5:

- `TrainingGoal` (`models/goals.ts`) — het doel zelf (naam, status,
  streefdatum, `GoalRequirement[]`)
- `GoalMilestone[]` (eigen store, `by-goal` geïndexeerd) — de statische
  ladder ("wat zou het kosten")
- `GoalMilestoneProgress` — append-only records van *wanneer* een mijlpaal
  daadwerkelijk gehaald is

`engine/progression.ts#computeGoalProgress` berekent voor elke mijlpaal of
hij voldaan is: via een expliciete `GoalMilestoneProgress`-rij, óf
automatisch doordat een `SessionLog` al aan de eis voldoet (bijv. een
wandeling met 750+ D+). Mijlpalen met een handmatige eis (`kind: 'manual'`,
zoals "Weekend bergsimulatie" of "GR5 KLAAR") kun je expliciet markeren op
het Ascend-scherm.

De oude `Objective`/`MilestoneDefinition`/`MilestoneProgress`-stores
(`models/objectives.ts`) bestaan nog in de database, maar zijn na de
eenmalige migratie (`storage/goalMigration.ts`) leeg — ze blijven puur zodat
een export van vóór Phase 1 nog importeert. Nergens in de actieve code leest
of schrijft nog iets naar die stores.

Readiness-percentages (`engine/readiness.ts` — kracht, cardio, klimmen/D+,
uithouding, herstel, consistentie, rugzakcapaciteit) zijn in V1 bewust
eenvoudige, geïsoleerde formules op basis van de laatste 28 dagen aan logs.
Elke formule staat in zijn eigen sectie met commentaar, zodat een formule
later vervangen kan worden (bijv. HRV-gecorrigeerd herstel via Garmin) zonder
de rest aan te raken.

### Avontuur / objectieven-architectuur

Het standaard objectief is **GR5 / ALPINE READINESS**, met een ladder van 13
mijlpalen (30 min Zone 2 → … → 15 km + 1000 D+ → rugzaksessie → twee
aaneengesloten dagen → weekendsimulatie → GR5 KLAAR). Dit is bewerkbare
demo-data (`data/defaultProgram.ts`) — de architectuur ondersteunt meerdere
gelijktijdige objectieven naast elkaar.

### Import / export

**Instellingen → Exporteer data** downloadt een leesbaar JSON-bestand met
`schemaVersion`, `exportDate`, het programma, alle templates, ingeplande
sessies, logs, objectieven en mijlpaal-voortgang. **Importeer data** leest
zo'n bestand terug in en vervangt de huidige data.
`storage/migrations.ts` bevat nu een minimale doorgeefstructuur voor
`schemaVersion: 1` — toekomstige schemawijzigingen krijgen hier hun eigen
`migrateV1toV2`-stap, zodat een export van vandaag over jaren nog steeds
importeert.

## Toekomstige integraties

**Nog niet geïmplementeerd — de architectuur ligt klaar:**

- **Garmin** (`integrations/garmin.ts`, nog toe te voegen) — activiteiten,
  hartslag, rustpols, slaap, HRV, stress, Body Battery, trainingsbelasting.
  Elke waarde landt in de bestaande `RecoveryMetric` / `SessionLog`-vormen met
  `source: 'garmin'`.
- **Health Connect / MacroFactor** (`integrations/healthConnect.ts`,
  nog toe te voegen) — lichaamsgewicht, voedingsinname, gewichtstrend.
- **AI-planning**: een toekomstige AI-laag vertaalt vrije tekst ("ik heb
  woensdag maar 30 minuten") naar constraints; de deterministische scheduler
  blijft de enige plek die daadwerkelijk plant. AI is nooit gezaghebbend over
  het schema zelf.
- **Adventure AI**: vragen als "kan ik een tocht van 15 km met 900 D+ aan dit
  weekend?" kunnen later beantwoord worden puttend uit dezelfde
  readiness-data die nu al berekend wordt.

Zie `integrations/types.ts` voor de exacte adapter-interface waar deze
integraties tegenaan bouwen.

## Roadmap

Prioriteit zoals in de oorspronkelijke briefing, met status:

- [x] Architectuur / domeinmodel
- [x] Visueel ontwerpsysteem (donker, brons, Marcellus/Inter)
- [x] Today-missiescherm
- [x] Week-planner
- [x] Sessie voltooien / loggen (kracht, cardio, wandelen, herstel)
- [x] Korte versie / verplaats / oversla-workflow
- [x] Scheduling engine (48-uurs beenherstel-regel + cascade-voorstel)
- [x] Ascent Ladder
- [x] Avontuur-objectieven (GR5-ladder)
- [x] Progressie-dashboard (readiness)
- [x] Geschiedenis
- [x] IndexedDB
- [x] Import/export
- [x] PWA
- [ ] Extra scheduler-regels: max. opeenvolgende zware dagen, optionele
      sessies laten vervallen vóór kernsessies
- [ ] Drag-and-drop in de weekplanner (de datamodel-scheiding tussen
      `PlannedSession` en `SessionLog` maakt dit een pure UI-toevoeging)
- [ ] Garmin-integratie
- [ ] Health Connect / MacroFactor-integratie
- [ ] AI-planningslaag bovenop de bestaande scheduler
- [ ] Sterkte-progressie-aanbevelingen op basis van geschiedenis (1RM-trend)

---

*Built for the ascent.*
