# Eerst vragen, dan plannen

Datum: 2026-10-25
Status: aangenomen

## Besluit

Een nieuwe installatie plant niets. ASCEND zet alleen de bouwstenen klaar (de trainingssjablonen, zoals altijd bij de start bijgewerkt) en opent Vandaag met een welkom: "Back-up terugzetten" of "Nieuw beginnen". Nieuw beginnen stelt een paar vragen, één per scherm, met het advies als standaard: waar werk je naartoe (een tocht met rugzak, een hardloopwedstrijd, of fit en sterk blijven, met een datum als dat past), hoeveel dagen per week, welke dagen kunnen, en krachttraining ja of nee. Pas daarna maakt ASCEND het plan, met dezelfde planningsronde als altijd, en laat het zien als voorstel: "Zo ziet je eerste week eruit", met Akkoord of Liever niet. Na Akkoord staat het plan er. Liever niet laat de app leeg met het welkom. Een back-up terugzetten in een lege app zegt niets over trainingen die verdwijnen, want er is niets om te verwijderen.

Hoe een app als nieuw wordt herkend:

- Bij de eerste start (`seeded` ontbreekt in `meta`) vult `storage/database.ts#seedIfEmpty({ withProgram: false })` alleen de sjablonen. Geen programma, geen doel, geen planning, geen `seededAt`. De opstartstappen daarna doen niets met een programma dat er niet is: `syncProgramHorizon` stopt zonder programma, `migrateStrengthProgramDefault` wacht tot er een programma is.
- Vandaag toont het welkom zolang er geen programma en geen geplande training is (`engine/freshStart.ts#needsFirstPlan`), afgeleid uit de gegevens zelf, nooit uit een vlag die kan afwijken. Een installatie met een programma of een planning komt hier dus nooit. Daarom opent een bestaande database precies zoals voorheen (gecontroleerd: back-up terugzetten, herladen, gegevens naast die van de vorige versie gelegd).
- De samenvatting van het terugzetten gebruikt `isEmptyStart` (geen programma, geen planning, geen training, geen doel): dan staat er "Er staat nog niets op dit toestel. Alles uit je back-up komt erbij." in plaats van de waarschuwing en de kopie.

Hoe het plan ontstaat:

- De antwoorden worden omgezet in wat de planning al las (`engine/firstPlan.ts`): een doel (voor een tocht hetzelfde doel met de Ascent Ladder als altijd, voor een wedstrijd een afstandsdoel of het marathondoel, voor fit blijven geen doel), de rustdag, de beschikbare dagen (`availability.allowedDays`) en een krachtblok of geen.
- Het enige nieuwe is de vorm van je week (`AppSettings.weekShape`, `engine/weekShape.ts`): welke vaste trainingen in het weekpatroon blijven en op welke dag. Het patroon had alleen een rustdag en sporten aan of uit; "vier dagen op di, do, za en zo" kon niet. `weeklyPatternTemplates` leest het op dezelfde plek als de sporten. Zonder `weekShape` is het patroon zoals het was. De keuze minimaliseert de verplaatsing van de vaste dag, zet de lange training op het weekend als dat kan, houdt de 48 uur tussen zware beendagen (`respectsHeavySpacing`) en laat altijd een doordeweekse dag vrij voor de rust.
- Het voorstel gaat door `storage/horizonPlan.ts` (`computeHorizonPlan`, `applyHorizonPlanNow`), met als uitbreiding een nieuw programma, de ladder van een nieuw doel en wat erbij hoort (`firstPlan`): in het geheugen berekend, pas bij Akkoord opgeslagen, bij een fout alles terug (ook het programma, de ladder en het krachtblok), en `stale` als er intussen een programma is. Er komt geen melding met "Ongedaan maken" na het eerste plan: ongedaan maken liet een programma zonder planning achter, dat de planning daarna zonder te vragen weer vulde. Het plan op Vandaag is het antwoord.
- Een doel dat je al met de hand instelde op Ascend voordat je het eerste plan maakte, blijft staan; dan vraagt ASCEND alleen naar je week.

## Reden

De eigenaar zette na een nieuwe installatie zijn back-up terug en kreeg te horen dat er 109 trainingen verdwenen. Het standaardprogramma was meteen ingepland, met een GR5-doel, voordat hij iets had gezegd over zijn doel, hoe vaak hij wil trainen of op welke dagen. Dat is krom: een planning zonder vraag is precies wat `2026-10-23-planning-nooit-stil.md` wil voorkomen, en een back-up terugzetten hoort niets te verwijderen dat de gebruiker nooit koos.

## Alternatieven

- Het standaardprogramma laten staan en de waarschuwing bij het terugzetten verbergen als er geen training gelogd is. Niet gekozen: de planning blijft dan een keuze die ASCEND zonder vraag maakte.
- Een tweede, eenvoudiger planner voor de eerste week. Niet gekozen: dubbel werk en twee waarheden. De antwoorden gaan door de bestaande planningsronde.
- `seedIfEmpty` standaard leeg laten starten en alle tests het programma laten vragen. Niet gekozen: honderden tests omgooien. De aanroep zonder opties vult nog het volledige standaardprogramma (demo en tests), de app zelf start leeg (`withProgram: false`; in `runBootMigrations` kan een test `seedProgram: true` meegeven).
- Ongedaan maken na het eerste plan. Zie boven.

## Bron

Gesprek met de eigenaar na het terugzetten van zijn back-up op een nieuwe installatie. Onderzoek over fit blijven en wedstrijdblokken staat al in `docs/onderzoek/` (zie `Planning op een lijn.md`); er is geen nieuw onderzoek gedaan.

## Vervangt

Niets. Het vult `2026-10-23-planning-nooit-stil.md` aan: het eerste plan van een nieuwe installatie was de enige planning die ASCEND nog stil maakte, en gaat nu ook via een voorstel met Akkoord. De kaart "Nieuw begonnen" (`components/FreshStartCard.tsx`) blijft voor installaties die vroeger met het standaardprogramma begonnen en nog geen training hebben; nieuwe installaties zien het welkom.

## Terugdraaien

Laat `bootMigrations.ts` de stap `seedIfEmpty` weer zonder opties aanroepen: een nieuwe installatie begint dan weer met het standaardprogramma. De rest (het welkom, de vragen, `weekShape`) blijft dan ongebruikt staan; `weekShape` is optioneel en wordt zonder waarde genegeerd.

## Gevolgen en wat nog niet is gedaan

- Wil je later een andere week (meer of minder dagen, andere dagen, kracht aan of uit), dan is daar nog geen instelling voor: de rustdag, de sporten en "Trainingstijd per dag" werken zoals altijd, maar `weekShape` zelf is alleen bij het eerste plan te kiezen. Een latere wijziging moet bestaande weken omzetten en hoort dus in een eigen voorstel (zoals een sport aan of uit); dat is een vervolgtaak.
- "Alles verwijderen" (`resetToDemoData`) zaait nog het volledige standaardprogramma. Dat is een bewuste keuze van de gebruiker op een toestel met gegevens, en valt buiten dit besluit.
- "Schema opnieuw laden" en een nieuwe inhoudsversie van het schema leggen het gewone patroon neer zoals voorheen, maar gebruiken je gekozen week zodra je er een koos.
