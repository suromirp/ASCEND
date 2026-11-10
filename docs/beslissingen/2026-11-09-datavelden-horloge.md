# Datavelden voor je horloge

Datum: 2026-11-09
Status: aangenomen

## Besluit

ASCEND tekent per soort training (Zone 2, Heuvels, Intervallen, Lange duurloop, Tocht met rugzak) welke datapagina's je op je horloge zet, met één zin waarom. Je kunt een veld wisselen en twee eigen versies naast het advies zetten. Het is uitleg: het plant niets, verandert geen training en stuurt niets naar je horloge.

Hoe het in elkaar zit:

- De velden en indelingen zijn data per model (`src/data/watchModels.ts`), eerst alleen de Forerunner 255. Een model erbij is een lijst erbij. De veld-id's zijn algemeen (`heartRate`, `lapPace`), zonder naam van een leverancier.
- Het advies is een functie in de engine (`src/engine/watchFields.ts#watchAdvice`), deterministisch. Een veld dat een model niet kent valt uit het advies.
- De eigen versies staan in `AppSettings.watchFieldVersions` (optioneel, per soort hoogstens Versie 2 en Versie 3) en gaan mee in export en import. Een kapotte waarde valt weg in `storage/backupClean.ts`. Geen migratiestap: het veld is nieuw en optioneel.
- Een bewaard veld dat het model niet (meer) kent blijft bewaard en wordt bij het lezen vervangen door het veld uit het advies op die plek, met een regel op het scherm.
- Terug naar advies is één tik en haalt die versie weg, met Ongedaan maken.
- De pagina staat op `/horloge/datavelden`. Ingangen: Je horloge instellen (bij Garmin koppelen) en de uitleg bij een training. Niets op Vandaag.
- Instellingen: Datavelden voor je horloge (standaard aan) en Model, onder Geavanceerd van Koppelingen.

## Reden

Wens van de eigenaar (9 november): de datapagina's zien zoals ze op zijn horloge staan, per soort training, met het advies en de reden, en zelf kunnen wisselen en vergelijken.

## Eigen keuzes buiten de opdracht

- Het horloge kan volgens recensenten tot 6 velden per scherm. ASCEND biedt 1 tot en met 4 aan, omdat je er tijdens het lopen 3 of 4 leest. De tekst zegt nergens dat het horloge er maar 4 kan.
- De ligging van de velden op het ronde scherm is nergens bevestigd. De tekening is die van ASCEND (2 velden boven en onder, 3 velden in drie rijen met de middelste het grootst, 4 velden als boven, twee in het midden, onder). Bij de stappen staat dat je horloge een veld op een andere plek kan zetten.
- De maten uit het ontwerp van Cartographer vielen bij 2 en 3 velden buiten de cirkel. De maten in de data zijn opnieuw gerekend en een test bewaakt dat elke plek binnen het ronde scherm valt, elkaar niet overlapt en minstens 44 bij 44 is.
- Het advies zelf is niet te wijzigen. Een tik op een veld in het advies maakt een kopie in de eerste vrije versie.
- Het advies zet het veld waar je op stuurt op de plek met het grootste cijfer van de indeling.
- De rijen in Instellingen staan onder Geavanceerd van Koppelingen, niet op de pagina zelf: die pagina zit aan haar plafond van 12 rijen. Het ontwerp vroeg een rij bij Garmin.
- In de zoekindex heet de rij "Datavelden" (op de pagina "Datavelden voor je horloge"): met de volle titel zakte Garmin bij het zoeken op "horloge" uit de eerste vijf, en dat bewaakt een bestaande test.
- Het model is als keuze gebouwd, met nu één optie. Het telt niet mee in "anders dan het advies" (`settingsDiff`), omdat er niets anders te kiezen is.
- "Vraagt een borstband" uit het ontwerp geldt alleen voor de vier velden van de balans grondcontacttijd. De regel is "Vraagt een borstband met loopdynamiek of een pod."
- De tekstkaart "Dataschermen per activiteit" bij Je horloge instellen is vervangen door de rij naar de pagina. Die kaart noemde RPE als dataveld; dat bestaat niet.
- Voor een test, een wedstrijd, kracht en fietsen is er geen advies. De pagina zegt dat en biedt de vijf soorten aan.
- Een eigen training krijgt haar soort uit haar rollen (`watchKindOf`).
- `GARMIN_DATA_SCREENS` blijft in `src/data/garminGuide.ts` staan, omdat de bronnenpagina er haar bronnen uit leest; alleen "RPE" is uit het rijtje velden gehaald en de kaart wordt niet meer getoond.
- "Terug naar advies voor dit veld" uit het ontwerp is niet gebouwd: Terug naar advies voor de hele versie is de ene tik uit de opdracht.
- Een versie die gelijk is aan het advies zegt dat: "Je versie is gelijk aan het advies."
- Het horloge in de tekening is nooit smaller dan 256 px, zodat de kleinste tekst 12 px blijft.
- De pagina staat in de tekstkaart als scherm `datavelden`.
- Na de review: wat een tik doet staat in de engine (`pickField`, `canPickField`, `restoreVersion`), niet in de pagina. Ongedaan maken na Terug naar advies zet nooit iets terug over een versie die er intussen bij kwam, en vervalt bij elke nieuwe opslag. Er is één opslag tegelijk: een tweede tik voordat de eerste bewaard is doet niets.
- De regel over Garmin Connect noemt geen menunamen: die zijn gemeld, niet bevestigd.
- De stappen zeggen "Pagina 1", zoals de rest van de pagina; het menu van het horloge zegt Gegevensschermen, en dat woord staat alleen in het pad.
- De terugknop van de pagina valt zonder geschiedenis terug op Garmin koppelen.
- Eén mint accent: de gekozen chip en het gekozen segment zijn de bestaande opmaak van `Chip` en `Segmented`; er staat geen hoofdknop op de pagina. Lookout telde ze wel als meer dan één mint element.

## Alternatieven

Het advies als tekst laten staan (de oude kaart): geen tekening, niet te wisselen. Een blad in de uitleg van een training: een tekening van 288 px hoort niet in een blad in een blad. Een ingang op Vandaag: verdringt de missie. Vanzelf naar het horloge sturen: kan niet zonder een eigen Connect IQ-app en valt buiten de opzet.

## Bron

`docs/onderzoek/Datavelden voor je horloge.md` (Scout, 9 november) en `docs/ontwerp/datavelden-horloge.md` (Cartographer). De veldnamen en het pad op het horloge komen uit de Nederlandse handleiding. Het advies per soort is praktijkadvies, geen studie.

Niet bevestigd: de ligging per indeling, of 6 velden en 8 indelingen kloppen, welke velden bij Hiken en Wandelen ontbreken, en de Nederlandse menunamen in Garmin Connect. Niemand van ons heeft het echte horloge gezien.

## Vervangt

Niets. De kaart `GARMIN_DATA_SCREENS` wordt bij Je horloge instellen niet meer getoond.

## Terugdraaien

Zet de instelling Datavelden voor je horloge uit: de pagina en de ingangen zijn dan weg. Helemaal weg: verwijder de route, de pagina, `src/components/watch/`, `src/engine/watchFields.ts` en `src/data/watchModels.ts`, en de regels in de instellingenbestanden. De drie optionele velden in de instellingen mogen blijven staan; een oude back-up blijft leesbaar.
