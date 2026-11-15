# Herstelopdracht Weer van de plek, rest (I-37)

Warden, 15 november. Branch `claude/weer-plek-rest` op 2fb65cc (vier eigen commits: 841fbe5, 0aa76b3, 27a417d, 2fb65cc). Besluit `docs/beslissingen/2026-11-15-avond-ervoor-kent-de-plek.md`.

Oordeel: AKKOORD. Geen blokkerend punt. Twee moet-punten voor de squash, zes mag-punten.

## Wat klopt

- Weercache per plek: zes blijven, de zevende duwt de oudste eruit, de oude vorm (één `forecast`) leest nog zonder aanroep en gaat bij het volgende bewaren mee in de nieuwe vorm. Rommel in de sleutel is een lege cache, nooit een fout. Twee plekken tegelijk staan er allebei in (één rij). Nu verversen haalt altijd op, twee tikken delen één aanroep, een mislukte verversing laat het oude weer staan.
- `startPlaceChoices` is een meta-sleutel op dit toestel, net als `trainingPlaces`: niet in de export (proeftest, ook het weer van de plek niet), `DB_VERSION` blijft, lezen is verdedigend (`cleanChoices`). Geen migratiestap nodig: de regel in CLAUDE.md gaat over een bewaarde vorm die verandert en over back-ups, en hier verandert geen bestaande vorm en gaat niets de back-up in. `rememberStartPlace` is optioneel en erbij, met de controle op type in `backupClean.ts`.
- De dag: de keuze telt tot en met 23:59 op de klok van de telefoon en is om 00:00 weg. Gedraaid in Amsterdam, Lissabon, Auckland en Los Angeles. Alles rekent met de plaatselijke dag (`toISODate`), dezelfde als de planning. Opruimen laat één dag speling.
- Verplaatsen: een andere dag begint zonder plek. Overslaan: de haak en de engine laten een overgeslagen training allebei weg.
- Privacy: bewaard wordt alleen een bewaarde of gezochte plek. Waar je nu bent, Thuis, Start hier en Opnieuw wissen de keuze. Het weerdoel is op twee decimalen, de aanroep draagt geen naam. Binnen 10 km van huis of met een van de instellingen uit gaat er niets uit.
- De avond ervoor en de melding lezen dezelfde invoer; de melding wordt opnieuw gezet als de keuze verandert. De lamp en het drinken lezen dezelfde voorspelling als de weerregel.
- Instelling Gekozen plek onthouden: `settingsDefs/vandaag.ts`, `order.ts`, `settingsSummary.ts` (rij en de telling 14), `settingsDiff.ts`, `VandaagGroup.tsx`, één zin uitleg.
- Logica staat in `engine/`, opslag in `storage/`. Geen log geraakt, geen vlag voor voltooid, de planning verandert niet. Geen losse kleuren, geen gedachtestreepjes, geen persoonsgegevens (Verwegdal is verzonnen).

## Moet

1. `src/engine/startPlaceChoice.ts:120` (`eveningPlaceTarget`) en `src/components/useEveningBefore.ts:59`: De avond ervoor leest de bewaarde keuze zonder de lijst met plekken. Wis je de bewaarde plek na het kiezen, dan zet de Briefing hem niet terug (`restoredStart`), maar toont De avond ervoor en de avondmelding nog "In <plek>: ..." en haalt het weer van de gewiste plek op. Hernoem je hem, dan heet hij in de Briefing nieuw en op de kaart oud. Het besluit zegt: een gewiste plek komt niet stil terug, en één keuze die overal gelijk is. Voorstel: `eveningPlaceTarget` krijgt de plekken mee en gaat door `restoredStart` (naam en punt uit de plek, niets als hij weg is of de lijst niet gelezen kon worden); de haak leest `readPlaceStore` binnen dezelfde grens. Daarbij: `removePlace` wist ook de keuzes met dat `placeId`, anders blijven naam en punt van een gewiste plek op het toestel staan tot de dag voorbij is. Proeftests "ROOD NU (moet 1)", twee stuks.

2. `docs/werkbriefjes/koppelingen-en-data.md:16` en `:36`: het briefje is niet bijgewerkt en zegt nu iets onwaars: "Vandaag en De avond ervoor blijven thuis" en "een tik geldt voor deze training". De nieuwe bestanden staan er niet in (`engine/startPlaceChoice.ts`, `storage/startPlaceChoice.ts`, `engine/briefingReturn.ts`, `utils/briefingReturn.ts`, de cache per plek). Onder Nooit hoort de gekozen plek per training bij wat niet in een back-up mag. Daarbij een keuze die nu nergens staat: met een onthouden plek gaat de aanroep voor het weer van die plek uit bij het openen van de Briefing, ook met Lus zoeken op Na een tik en op een dag later dan morgen (`TrainingBriefing.tsx:142` staat niet achter `searchOn`), en vanaf Vandaag en de meldingshost zonder tik. De valkuil zegt: elke nieuwe uitgaande aanroep hoort achter `enabled`. Het is te verdedigen (alleen het weer, twee decimalen, een plek die je zelf koos), maar dan als uitzondering in het besluit en het briefje. Zet ook `2026-11-12-weer-op-de-plek.md` onder Vervangt en in de kennisindex op deels: zijn regels 16, 34 en 38 gelden niet meer.

## Mag

3. `src/components/useRouteSearch.ts:214`: de plek wordt teruggezet als de opslag antwoordt. Tik je in die tijd al op een chip (op een trage opslag tot de grens), dan schrijft het terugzetten daar overheen terwijl de opslag al gewist is. Voorstel: alleen terugzetten als er sinds het openen niets gekozen is (een ref die elke tik zet).
4. Een training die verplaatst is en weer terug naar de oude dag gaat, heeft de oude plek weer. De keuze blijft ook staan als de instelling uit gaat (er wordt dan niets meer geschreven, dus ook niet opgeruimd). Voorstel: uitzetten wist de sleutel; het terug verplaatsen alleen vastleggen.
5. `src/engine/startPlaceChoice.ts:86`: het plafond van zestig houdt de laatste dagen en gooit de dichtste weg, dus ook de keuze van zojuist. In gewoon gebruik niet te halen. Voorstel: sorteer op de vroegste dag eerst.
6. `src/storage/startPlaceChoice.ts:34`: na Alles wissen geeft `peekStartPlaceChoices` nog de oude keuzes tot de volgende leesactie, en een mislukte leesactie valt daarop terug. Voorstel: `wipeAllData` zet het geheugen leeg, of lezen dat mislukt geeft niets. Proeftest "ROOD NU (mag 6)".
7. Twee trainingen morgen met elk een verre plek: alleen de eerste krijgt zijn weer, de tweede leest het weer van huis zonder naam. Het besluit zegt "de eerste"; een regel "Weer thuis:" bij de tweede zou eerlijker zijn.
8. Terug naar de Briefing (0aa76b3) opent hem opnieuw en zoekt dan opnieuw als Lus zoeken op Bij openen staat. Het antwoord zit meestal nog in het geheugen; alleen vastleggen.

## Voorgestelde regels voor het briefje

- `docs/werkbriefjes/koppelingen-en-data.md`, Valkuilen: "Een bewaarde keuze die naar een plek wijst (`startPlaceChoices`) lees je altijd samen met de lijst van plekken, op elk scherm met dezelfde functie (`restoredStart`): een gewiste plek geeft niets, een hernoemde zijn nieuwe naam. Wie een plek wist, wist ook wat ernaar wijst."
- Zelfde plek: "Het weer van een onthouden plek is de enige aanroep die zonder tik uitgaat (Briefing, De avond ervoor, de avondmelding): op twee decimalen, zonder naam, hoogstens eens per uur per plek. Elke andere aanroep blijft achter `enabled`."
- Zelfde plek: "Een keuze per geplande training geldt op de dag in de tijdzone van de telefoon en vervalt bij verplaatsen; toets middernacht en een tweede tijdzone."

## Controles

- Op de branch (2fb65cc): `npx tsc -p tsconfig.app.json --noEmit` groen, `npm run lint` groen (één bestaande waarschuwing in `LegFatigueCard.tsx`), `npx vitest run` 734 bestanden en 10862 tests groen, `npm run build` groen.
- Proefmerge: de vier commits met cherry-pick op origin/main (09c716d). Eén botsing, in `docs/kennisindex/` bij 27a417d: in `bronnen.json` beide regels houden (het besluit van de avond ervoor en dat van de back-up), daarna `npm run kennisindex`; de vergelijking zegt geen verschil. Daarna groen: tsc, lint, build, 737 bestanden en 10943 tests.
- Proeftests: `src/storage/wardenWeerPlek.proef.test.ts` op deze branch, twintig tests: zeventien groen, drie met opzet rood (twee keer moet 1, één keer mag 6). Ook gedraaid met TZ Europe/Lisbon, Pacific/Auckland en America/Los_Angeles, samen met de bestaande tests van weer en plek: zelfde uitslag.
- Niet gedraaid: `npm run kaart:vergelijk` (coördinator) en de doorloop in Chromium. De haken (`useRouteSearch`, `useEveningBefore`) en de race van mag 3 heb ik alleen in de bron gelezen, niet in een browser gezien.
