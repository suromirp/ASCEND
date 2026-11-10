# Ontwerp: het uitlegblad van een training

Status: voorstel van Cartographer, 10 november. Er is geen code gewijzigd.
Aanleiding: de eigenaar vindt het onderste deel van het uitlegblad "lelijk en onoverzichtelijk". Het gaat om `src/components/TrainingGuideSheet.tsx` met de inhoud uit `src/data/trainingGuide.ts`.

## Hoe het nu is

Boven de rijen staan de kop (`SheetHeader`, `SessionHeader`), de regels voor weer, heuvels, route en kleding en vier korte delen: Waarom, Je tempo, Zo voelt elk tempo en Wat het vraagt van je lichaam. Daaronder staan acht rijen in één lijst, zonder kopjes en zonder vaste volgorde van soort. Zes klappen open in het blad ("openen" of "sluiten" rechts, onderdeel `Fold`), twee gaan met een pijl naar een andere pagina. Open je een deel, dan schuift de rest weg en moet je terugscrollen.

De acht rijen, in de volgorde van nu, met de voorwaarde waaronder ze verschijnen:

1. De stappen, zoals op je trainingsscherm. Klapt open. Alleen als de training een uitgewerkt plan heeft (`plan`, uit `buildWorkoutPlan`). Toont de grafiek en de stappen met intensiteit.
2. Stappen voor je Garmin. Klapt open. Alleen als `plan.garmin` bestaat. Toont de stappen om in Garmin Connect na te bouwen.
3. Deze fase, week voor week. Klapt open. Alleen als `plan.weeks` niet leeg is. Toont een raster van de weken met minuten en een notitie, de huidige week gemarkeerd.
4. Te zwaar? Zo pas je het aan. Klapt open. Alleen als de gids delen heeft waarvan de kop ZWAAR, TE HARD of TE VEEL bevat. Zo pas je het aan.
5. Waar train je het best? Klapt open. Alleen als de training varianten (modaliteiten) heeft, `ModalityGuide`.
6. Waar kun je dit doen? Pijl naar `/plekken` (met `?training=<id>` als er een filter is). Alleen bij een training met een plekkenfilter, een D+-training of een wandeltraining.
7. Datavelden voor je horloge. Pijl naar `/horloge/datavelden?soort=<soort>`. Alleen als de instelling Datavelden voor je horloge aan staat en de soort advies heeft (`watchFieldsShown`, `watchKindOf`).
8. Achtergrond en bronnen. Klapt open. Altijd aanwezig. Toont de overige delen van de gids, materiaal, de Garmin-opmerking (die zelf naar Garmin koppelen gaat) en de bronnen.

Wat de eigenaar ziet is dus een willekeurig mengsel van twee soorten rij, zonder kopje, van twee tot acht rijen afhankelijk van de training.

## De keuze: alles als pijl naar een eigen blad

Elke rij wordt dezelfde soort rij: titel links, pijl rechts, tik opent een onderblad. De twee pagina-rijen blijven pijl-rijen, ze zien er alleen anders uit omdat ze het blad verlaten (zie verderop).

Waarom niet alles openklappen:
- Een open deel duwt de rest van de lijst uit beeld. De rasters en Garmin-regels zijn lang. Je raakt het overzicht kwijt, en dat is precies de klacht.
- De terugknop van het toestel kent een openklapdeel niet. Het werkbriefje bediening zegt dat terug eerst een open deel of blad sluit. Een `Fold` registreert geen laag, dus terug sluit nu het hele uitlegblad. Een onderblad gaat wel door `useSheetClose`, dus daar klopt het vanzelf.
- Een lijst waarin elke rij hetzelfde doet, leest sneller: je hoeft per rij niet te raden of er iets opent, uitklapt of wegspringt.
- De Instellingen werken al zo (rij, pijl, onderblad), dus de eigenaar kent het gebaar.

Waarom niet alles als pagina: het uitlegblad is een blad boven Vandaag of Week. Een pagina zou je uit je context halen en de terugknop laat je dan op de dagkaart landen in plaats van in het blad. Onderbladen houden het uitlegblad eronder gewoon staan, met dezelfde scrollstand.

Kost: elke inhoud krijgt een eigen blad. Dat zijn dezelfde inhoudscomponenten als nu, alleen in een andere omhulling. Er komt geen nieuwe inhoud bij.

## De drie groepen

De kop is een `Eyebrow` (24 px lucht erboven, 8 px eronder, zoals de Instellingen), de rijen staan in een lijst met haarlijnen. Een groep zonder zichtbare rijen tekent ook de kop niet.

Groep 1, "Wat je doet" (richting: wat je doet)
- De stappen. Titel blijft "De stappen, zoals op je trainingsscherm", korter in de rij: "De stappen". Het blad heet "De stappen" met de eyebrow "Uitleg" en de bestaande inhoud (`WorkoutSteps` compact). Regel eronder: "±45 min, 6 stappen" uit `plan.totalMinutes` en het aantal stappen.
- Te zwaar? Titel blijft "Te zwaar? Zo pas je het aan". Het blad toont `Sections` met de delen uit `easeOff`. Geen regel eronder.

Groep 2, "Waar en waarmee"
- Waar train je het best? Titel ongewijzigd. Blad met `ModalityGuide`. Regel eronder: het aantal opties, bijvoorbeeld "3 opties".
- Waar kun je dit doen? Titel ongewijzigd. Pagina `/plekken`. Rechts het woord "Pagina" in gedimde letter, daarna de pijl.
- Stappen voor je Garmin. Titel ongewijzigd. Blad met de uitleg en de regels, zoals nu.
- Datavelden voor je horloge. Titel ongewijzigd. Pagina `/horloge/datavelden`. Rechts "Pagina" en de pijl.

Groep 3, "Achtergrond"
- Deze fase, week voor week. Titel ongewijzigd. Blad met het weekraster. Regel eronder: "Week 3 van 8" (uit `plan.weeks`, de rij met `current`). Staat hier omdat het context is en geen opdracht van vandaag.
- Achtergrond en bronnen. Titel ongewijzigd. Blad met `Sections`, materiaal, de Garmin-opmerking en de bronnen. Regel eronder: het aantal delen en bronnen, bijvoorbeeld "4 delen, 2 bronnen".

Zo zijn het er twee, vier en twee, en geen groep heeft er meer dan vier. De titels komen allemaal uit de bestaande code; alleen de eerste is ingekort. De groepskoppen zijn nieuwe woorden en passen in de stem: kort, het droge feit.

De groepsvolgorde is bewust: eerst wat je nu moet doen, dan hoe je het voorbereidt en waar, en als laatste wat je kunt lezen als je tijd hebt. Een training zonder plan (bijvoorbeeld zonder `template`) toont alleen groep 3 met de rij Achtergrond en bronnen; dat is genoeg.

## Hergebruik

- `Eyebrow` uit `ui.tsx` voor de groepskop.
- `SettingsList` en `SettingsRow` uit `src/components/settings/SettingsList.tsx` voor de lijst en de rij (titel links, `value` rechts, `sub` als regel eronder, pijl, hele rij is het tikdoel). Rij 52 px, met regel 68 px. `SummaryRow` past niet: die haalt waarde en regel uit `engine/settingsSummary.ts` voor instellingen, en dit zijn geen instellingen. Geef `sub` en `value` dus direct mee aan `SettingsRow`. Let op: `SettingsRow` vraagt een `id` en zet daarmee een anker `instelling-<id>` op de pagina. Gebruik hier een voorvoegsel (`uitleg-stappen`) en laat de bouwer controleren dat de contexten (`SettingsAdjustedContext`, `SettingsAdvancedContext`) buiten de Instellingen een veilige standaard hebben. Zo niet, dan volstaat een kleine `GuideRow` in dezelfde map die dezelfde `st-row` klassen gebruikt; geen eigen opmaak.
- `Sheet` uit `src/components/settings/Sheet.tsx` voor de onderbladen: greep, eyebrow, titel in Marcellus, sluitknop van 44 px, scrollende inhoud, al gebouwd op `useSheetClose` met `sheetRef` en `SheetGrip`. De eyebrow is "Uitleg", of de dagnaam (`dayLabel`) als dat beter leest; vraag staat onderaan. De Instellingen openen er al een `InfoSheet` mee vanuit een blad, dus een blad boven een blad is een bestaand patroon.
- De inhoud van elk blad is de bestaande code: `WorkoutSteps`, `Sections`, `ModalityGuide`, het weekraster en de Garmin-regels. Die verhuizen alleen van `Fold` naar een blad.
- Het uitlegblad zelf blijft de `Card` met `SheetHeader`, `SessionHeader` en de bovenste delen. Daar verandert niets aan.

Er komt geen nieuwe kleur, letter of token. De pijl is `Icon name="verder"` in de gedimde inktkleur van de Instellingen (de mintkleur van de huidige pijl vervalt, zodat het blad één mint accent houdt: het kleine accent in de bovenste delen blijft over).

## De twee pagina-rijen

Ze zijn dezelfde rij met dezelfde pijl, maar met het woord "Pagina" als waarde rechts. Dat is de enige aanwijzing dat je het blad verlaat, in woorden en niet in kleur. Tik: `onClose()` en dan `navigate(...)`, zoals nu. Het blad sluit met zijn gewone animatie (`requestClose` verdient de voorkeur boven `onClose` zodat de uitgaande beweging speelt; de bouwer test dat de navigatie pas na het sluiten start of anders niets doet wat het adres omschrijft terwijl een laag open is, zie Nooit in het werkbriefje).

Terug vanaf die pagina brengt je naar het scherm eronder (Vandaag of Week), niet naar het uitlegblad. Dat is nu ook zo en blijft zo. Het terugbrengen van het blad zelf is een grotere ingreep (het is een toestand die een pagina-bezoek moet overleven, `usePageState`); ik stel dat niet voor, zie de vragen.

## De staten

- Leeg: een groep zonder rijen toont geen kop. Een training zonder plan en zonder gids-delen toont alleen de rij Achtergrond en bronnen. Is ook daar niets (geen delen, geen materiaal, geen bronnen), dan verdwijnt de rij en blijft het blad bij kop en bovenste delen. Een blad zelf is nooit leeg, want de rij verschijnt alleen als er inhoud is.
- Laden: alle inhoud wordt lokaal berekend, er is geen wachttijd. De regels voor weer, heuvels en route laden zoals nu en houden de rijen niet tegen. De rijen staan er meteen.
- Fout: er is geen netwerk in de rijen. Een mislukte route of weerregel blijft zoals die nu is, boven de rijen. Een pagina-rij waarvan de bestemming ontbreekt kan niet voorkomen; de voorwaarden hierboven bewaken dat.

## Maten op 360 en 390 px

Het blad is `max-w-md`, dus op beide breedtes de volle breedte min de rand.
- Rij: 52 px hoog, met regel 68 px. Hele rij is het tikdoel, dus breed genoeg en minstens 44 px hoog. Op 360 px blijft voor de titel ongeveer 240 px over. "Te zwaar? Zo pas je het aan" past daarin op één regel. Bij een pagina-rij nemen "Pagina" en de pijl rechts ongeveer 80 px; "Datavelden voor je horloge" past daar nog net naast, en breekt anders netjes naar een tweede regel (de rij groeit mee, het tikdoel blijft minstens 52 px). "De stappen, zoals op je trainingsscherm" past niet op één regel, vandaar de inkorting. De bouwer controleert dit op 360 px.
- Letters: titel 15 px, regel eronder 13 px, "Pagina" 15 px, groepskop de bestaande Eyebrow. Niets onder 12 px. De sluitknop onderin (nu 12 px, 44 px hoog) blijft toegestaan, maar is overbodig naast het kruisje in de kop; ik laat hem staan om niets te verschuiven.
- Boven de vouw: het blad is hoogstens 90 procent van het scherm, op een telefoon van ongeveer 780 px hoog dus circa 700 px. Kop, weer-, heuvel- en kledingregels en de vier bovenste delen nemen daar al het grootste deel van. Alle acht rijen met drie koppen zijn ongeveer 8 × 52 + 3 × 40 = 540 px (met regels erbij meer), nu zijn er in dichtgeklapte stand 8 × 48 = 384 px. De lijst wordt dus iets hoger maar telkens even hoog en nooit groter dan het blad, en elke rij is op dezelfde hoogte. Wat boven de vouw staat blijft de kop met de missie (titel, sporttype, tijd) en minstens de eerste groep bij een kort blad (dat meet Lookout, ik kan dat zonder browser niet bevestigen). De eerste groep, "Wat je doet", staat daarom direct onder de bovenste delen.

## Beweging en terugknop

- Elk onderblad komt met `animate-sheet-in` en gaat weg met `animate-sheet-out`, 200 ms, ease-out, precies als alle bladen. Geen lus, geen nieuwe animatie. In Rustig en Uit en bij `prefers-reduced-motion` staat het blad meteen op de eindstand, want dat regelen de bestaande klassen.
- Elke rij die een blad opent krijgt `data-sheet-from` (werkbriefje: nieuwe rij die een blad opent). Zo groeit het blad uit de rij. De twee pagina-rijen openen geen blad en krijgen het niet.
- Terugknop van het toestel: `useSheetClose` regelt `useBackToClose`, één geschiedenisstap per laag. Terug sluit dus eerst het onderblad en daarna het uitlegblad. Dit lost ook het huidige gedrag op waarbij terug het hele blad sluit terwijl een deel openstaat.
- Het uitlegblad blijft gemonteerd onder het onderblad, zodat de scrollstand klopt na het sluiten.
- Haptiek: niets nieuws.

## Schets op 390 px

Het uitlegblad (bovenste deel ongewijzigd):

```
[ greep ]
[ dagnaam                            X ]
[ Titel van de training                 ]
[ sporttype · duur                      ]
[ weer / heuvels / route / kleding      ]

WAAROM
[ korte uitleg                          ]
JE TEMPO
[ jouw tempo                            ]
ZO VOELT ELK TEMPO
[ ... ]
WAT HET VRAAGT VAN JE LICHAAM
[ ... ]

WAT JE DOET
+--------------------------------------+
| De stappen                         > |
| ±45 min, 6 stappen                   |
|--------------------------------------|
| Te zwaar? Zo pas je het aan        > |
+--------------------------------------+

WAAR EN WAARMEE
+--------------------------------------+
| Waar train je het best?            > |
| 3 opties                             |
|--------------------------------------|
| Waar kun je dit doen?     Pagina   > |
|--------------------------------------|
| Stappen voor je Garmin             > |
|--------------------------------------|
| Datavelden voor je horloge Pagina  > |
+--------------------------------------+

ACHTERGROND
+--------------------------------------+
| Deze fase, week voor week          > |
| Week 3 van 8                         |
|--------------------------------------|
| Achtergrond en bronnen             > |
| 4 delen, 2 bronnen                   |
+--------------------------------------+

            Sluiten
```

Een onderblad (bijvoorbeeld De stappen):

```
[ greep ]
UITLEG                               X
De stappen
+--------------------------------------+
| grafiek van de opbouw                |
| stap 1 ... stap 2 ...                |
+--------------------------------------+
```

## Wat dit bewust niet doet

- Geen nieuwe inhoud, geen tekst herschreven behalve de ene ingekorte titel.
- De bovenste delen (Waarom, Je tempo, Zo voelt elk tempo, Wat het vraagt) blijven staan en verplaatsen niet. Een verdere versobering is een open vraag.
- Geen uitklapregel meer in dit blad. Een ingeklapte regel mag alleen waar de eigenaar daarom vroeg, en hier vroeg hij om een rustiger menu.
- Geen nieuwe kleur, letter, token of eigen kaart- en knopopmaak.
- Geen instelling: het is geen keuze van de app voor de gebruiker maar de opbouw van een blad.
- Het blad onthoudt niet welke rij je laatst opende.
- Geen terugkeer naar het uitlegblad vanaf de twee pagina's.

## Voor de bouwer

Bestanden:
- `src/components/TrainingGuideSheet.tsx`: de `Fold` weg, de `button`s voor plekken en datavelden vervangen door rijen, groepskoppen toevoegen, onderbladen met toestand per rij (een enkele `useState<'stappen' | 'garmin' | ... | null>`). Het sluiten van het uitlegblad terwijl een onderblad openstaat kan niet, want het onderblad ligt eroverheen.
- `src/components/settings/SettingsList.tsx` en `src/components/settings/Sheet.tsx`: alleen lezen en hergebruiken. Raak ze niet aan. Hoogstens een kleine `GuideRow` ernaast, als de contexten buiten de Instellingen niet veilig zijn.
- `src/data/trainingGuide.ts`: geen wijziging nodig. De selectie `easeOff` en `background` blijft in de component.
- Het gebruik in `TodayMissionCard.tsx`, `SessionActionSheet.tsx`, `ExerciseLogger.tsx` en `forge/ForgeSheets.tsx` verandert niet; de properties van `TrainingGuideSheet` blijven gelijk.

Tests:
- Er is geen component-test van `TrainingGuideSheet` of van de rijen. De bestaande test die `TRAINING_GUIDES` raakt is `src/engine/workoutPlan.test.ts` (elke gids heeft een workout); die moet groen blijven.
- Altijd mee: `src/components/sheetDrag.scan.test.ts` (elk blad met `animate-sheet-in` heeft `ref={sheetRef}` en `SheetGrip`; `Sheet` doet dat al), `src/components/randOnder`, `silentCatch`, `src/utils`.
- Nieuw: een kleine test die de voorwaarden van de acht rijen vastlegt (welke rij verschijnt bij welke training, en dat een lege groep geen kop geeft). Zet die voorwaarden dan in een kleine functie in `src/engine/` die de zichtbare rijen teruggeeft, zodat de component alleen tekent (logica niet in componenten).
- `npm run kaart:vergelijk`: de tekstkaart verandert; elk verschil verklaren. Lookout bekijkt 360 en 390 px, met de terugknop en met Rustig en Uit.

Wat niet mag bewegen:
- `src/storage/planGolden.test.ts`: dit raakt de planning niet.
- De inhoud van `trainingGuide.ts` en `buildWorkoutPlan`.
- De instellingen en de Instellingen-pagina's (`SettingsList` en `Sheet` mogen niet veranderen).
- De routes `/plekken` en `/horloge/datavelden?soort=` en de voorwaarden `showSpots`, `watchFieldsShown`, `hasModalities`.
- Het gedrag van `onClose` voor de aanroepers, en de bovenste delen van het blad.

## Samenvatting

Acht rijen worden drie groepen met korte koppen (twee, vier, twee), allemaal dezelfde pijl-rij die een onderblad opent, met twee uitzonderingen die een pagina openen en dat zeggen met het woord "Pagina". Alles komt uit bestaande onderdelen en tokens.

## Vragen aan de eigenaar

1. Moet "Deze fase, week voor week" onder Achtergrond, of hoort het bij Wat je doet?
2. Wil je ook de vier delen bovenaan (Waarom, Je tempo, Zo voelt elk tempo, Wat het vraagt van je lichaam) naar het menu verhuizen, zodat het blad boven de vouw rustiger is? Dat is meer verandering dan je vroeg.
3. Moet je na een pagina (plekken, datavelden) terugkomen in het uitlegblad, of is het goed dat je op Vandaag of Week landt zoals nu?
4. Eyebrow van de onderbladen: "Uitleg" of de dag van de training?

## Gebouwd op 10 november

Gebouwd zoals ontworpen, met de beslissingen: Deze fase staat onder Achtergrond, de vier bovenste delen blijven staan, de eyebrow van de onderbladen is "Uitleg", terug komt op het scherm eronder. Afwijkingen: een eigen `GuideRow` (`src/components/GuideRow.tsx`) in plaats van `SettingsRow`, want die zet een anker `instelling-<id>` en kent geen `data-sheet-from`; de rijen zelf zijn hetzelfde (`st-row`). De voorwaarden en regels staan in `src/engine/guideMenu.ts`. "Achtergrond en bronnen" verdwijnt nu als er niets te lezen is (eerder altijd aanwezig). De groepskop staat links uitgelijnd met de andere kopjes in het blad, niet ingesprongen zoals in de Instellingen. Alle onderbladen gaan door `Sheet`; de sluitknop onderaan blijft.
