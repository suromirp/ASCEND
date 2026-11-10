# Datavelden voor je horloge

Voorstel van Cartographer. Niets hiervan staat in `src/`. De pagina plant niets en verandert geen training.

## 1. Waar het staat

Eén eigen pagina, `/horloge/datavelden`, met twee ingangen en één instelling.

- Garmin koppelen, onderaan bij Je horloge instellen: de ingeklapte rij "Dataschermen per activiteit" (`GARMIN_DATA_SCREENS` in `WatchSetupGuide.tsx`) wordt vervangen door een gewone rij "Datavelden" die de pagina opent (`data-sheet-from`, pijltje `verder`). De drie andere rijen blijven staan. De treadmill-notitie uit het oude blok verhuist naar de pagina (zie 5).
- De training: in `TrainingGuideSheet` een rij zoals "Waar kun je dit doen?" (sluit het blad, navigeert), tekst "Datavelden voor dit horloge", met `?soort=` in het adres. De rij staat alleen bij de vijf soorten met advies. Geen Fold: een tekening van 288 px hoort niet in een uitklapblokje in een blad.
- Instellingen: alleen de schakelaar "Datavelden voor je horloge" (zie 6), niet de editor.

Niet: een ingang op Vandaag (de missie blijft vrij), een zesde tab, en een blad in het blad bij de training.

## 2. De pagina, van boven naar beneden

Zelfde `SkyBand` als Garmin koppelen, met terugknop. Eyebrow "Je horloge", titel "Datavelden".

1. Soort: `Chip`s in een rij die omslaat, vijf stuks: Zone 2, Heuvels, Intervallen, Lange duurloop, Tocht met rugzak. Gekozen chip is mint (een gekozen keuze mag). Komt de pagina uit een training, dan staat die soort al aan.
2. Versies: `Segmented` met `tall`, drie segmenten: Advies, Versie 2, Versie 3. De pagina waar je op staat blijft gelijk als je van versie wisselt. Naast elkaar zetten past niet op 360 px (een horloge is 288 breed en kleinere tekening haalt geen 12 px), dus vergelijken is wisselen met één tik, plus de lijst onder punt 7.
3. De zin waarom, boven het horloge, 16 px in `--color-ink`, één zin per pagina: "Hartslag groot, want daar stuur je op." In een versie staat ervoor een regel in `--color-ink-dim`: "Jouw versie. Advies voor deze pagina:".
4. Het horloge (zie 4). Pagina's staan naast elkaar met horizontaal vegen (CSS scroll-snap, zoals op het horloge), zodat je het ritme van het echte ding oefent. Eronder de puntjes: elk puntje een knop van 44 bij 44 px, met de tekst "Pagina 2 van 3" in `--color-ink-dim`. Onder de tekening: "De cijfers zijn voorbeelden." in 12 px.
5. Alleen in Versie 2 en 3: "Velden op deze pagina", `Segmented` 1 2 3 4 (tall). Minder velden bewaart de eerste velden; meer velden vult aan met het eerstvolgende veld uit het advies, anders Tijd.
6. Alleen in een versie: "Pagina erbij" (`SecondaryButton`, hoogstens 5 pagina's) en "Pagina weghalen" (`TextButton`, gedempt, niet bij de laatste pagina). Onderaan "Terug naar advies" (`TextButton` mint, één tik, zet de hele versie terug). Daarna een regel "Teruggezet." met "Ongedaan maken" die zes seconden blijft.
7. Alleen in een versie: "Anders dan het advies", korte regels in 14 px: "Pagina 1, veld 3: Cadans in plaats van Afstand." Zo vergelijk je zonder naast elkaar te zetten.
8. "Zo zet je het op je horloge": genummerde stappen (zie 5).

Het Advies blijft het advies. Tik je daar een veld aan, dan opent Veld kiezen; kies je iets, dan wordt de pagina gekopieerd naar de eerste vrije versie (2, dan 3), die komt in beeld, en er staat een regel "Dit staat nu in Versie 2. Het advies blijft zoals het was." Zijn Versie 2 en 3 allebei in gebruik, dan opent er geen blad maar staat er een regel: "Het advies blijft zoals het is. Pas Versie 2 of 3 aan, of zet er een terug naar advies." Een lege versie toont de knop "Begin met een kopie van het advies" in plaats van een horloge. Zo overschrijft niets stil.

## 3. Het blad Veld kiezen

Gebouwd op `Sheet` uit `settings/Sheet.tsx` (dus `useSheetClose`, `ref={sheetRef}`, `<SheetGrip />`). Eyebrow "Pagina 1, veld 2", titel "Veld kiezen", regel "Nu: Afstand."

- Groepen als `Eyebrow`: Hartslag, Tempo, Afstand, Hoogte, Timer, Loopvorm, Overig (de lijst komt uit onderzoek, als data). Eén lange lijst, geen uitklap; de koppen blijven plakken tijdens het scrollen.
- Elke rij is 48 px hoog: naam in `--color-ink`, eronder één korte uitleg in 12 px `--color-ink-dim` ("Cadans: stappen per minuut."). Het huidige veld krijgt het vinkje (`Icon`) en mint tekst; het advies voor dit veld krijgt de tag "Advies", zoals `ChoiceList` dat al doet.
- Een veld dat een borstband vraagt krijgt een tweede regel "Vraagt een borstband" met het borstbandicoon, in gedempt. Het blijft kiesbaar: het horloge toont het veld ook leeg.
- Kiezen past meteen toe en sluit na 240 ms (gedrag van `ChoiceSheet`). Onderaan "Annuleren", en als dit veld van het advies afwijkt "Terug naar advies voor dit veld".

## 4. De tekening

Eén SVG, viewBox 288 bij 288, weergegeven op 288 CSS-px: op 360 px breed is de kaart binnenin 296, dus het past zonder schalen. Teksten in de tekening zijn 14 (label) en 28 tot 64 (waarde) eenheden; dat blijft boven 12 px tot 320 px breed (schaal 0,89). Onder 320 px scrolt de tekening niet maar krimpt tot dat punt.

- Buitenste ring: cirkel r 144, `stroke --color-control-border` 4, `fill --color-bg`. Wijzerplaat: r 136, `fill --color-charcoal`.
- Geen vakjes: haarlijnen tussen de rijen in `--color-card-border`. Label in `--color-ink-dim`, waarde in `--color-ink`, Inter `tabular-nums` semibold. Eenheid 14 gedempt.
- Waardegrootte volgt het aantal velden: 1 veld 64, 2 velden 48, 3 velden 36, 4 velden 28 (de middelste twee) en 36 (boven en onder).
- Geselecteerd veld (terwijl het blad open is): rand `--color-action` 2, afgeronde hoeken 12, 150 ms. De enige mint op de tekening.
- Bovenop elke tekening liggen echte onzichtbare `button`s op dezelfde plek (toetsenbord, schermlezer, tikdoel). Het label is "Pagina 1, veld 2, Afstand. Tik om te veranderen."

De indeling is data (`src/data/watchLayouts.ts`, voorstel): per aantal velden een lijst rijen met `cells`, `top`, `height` en `inset`.
- 1 veld: één rij, top 64, hoogte 160, inset 40.
- 2 velden: twee rijen, top 24 en 144, elk 120 hoog, inset 66.
- 3 velden: drie rijen, hoogtes 76, 88, 76 vanaf top 24, inset 66, 16 en 66.
- 4 velden: zoals 3, maar de middelste rij heeft 2 cellen van 128 breed.
Elke cel is minstens 44 bij 44 px (kleinste is 156 bij 76). Een test controleert dat elke hoek van elke cel binnen r 136 ligt en dat elke cel 44 of meer meet, zodat een wijziging uit onderzoek niet kan afknippen.

Beweging: wisselen van versie is een kruisfade van 150 ms, de selectierand 150 ms, het vegen is native scroll-snap. In Rustig en Uit springt alles direct naar de eindstand (`data-motion`).

## 5. Lege stand, uit, laden, fout, uitleg

- Soort zonder advies (opent met een andere training): geen horloge, wel een kaart "Voor deze training heb ik geen advies." met de vijf chips eronder: "Kies een soort die erop lijkt."
- Instelling uit: de pagina toont één kaart "Datavelden staan uit." met "Zet ze aan bij Instellingen." en een `SecondaryButton` "Naar Instellingen". De rijen in Garmin koppelen en in de training zijn dan weg.
- Laden: de versies komen lokaal uit opslag. Het horloge staat meteen met het advies; de versies voegen zich erbij binnen 1,5 s. Geen spinner. Lukt het lezen niet: "Je versies konden niet worden gelezen. Het advies werkt wel." met "Opnieuw proberen". Lukt opslaan niet: "Opslaan lukte niet. Je wijziging staat er nog, tot je de pagina verlaat."
- Uitleg in stappen: een `Card`, genummerd, elke stap één zin, gemaakt uit de gekozen versie: stap 1 en 2 het menupad naar Dataschermen (komt per model uit data), dan per pagina "Pagina 1: zet 3 velden: Hartslag, Tempo, Afstand." Daaronder de treadmill-notitie uit het oude blok in een gedempte kaart, in 14 px.
- Model horloge: later een `Segmented` of keuzeblad onder de soortchips ("Horloge: ..."); nu één model, dus niets op het scherm. De data heeft al een `model`-sleutel.

Niet: foto, logo, merkbeeld, een plan of voorstel met Akkoord, een melding op Vandaag, een tweede mint knop, een uitklapblokje.

## 6. Teksten

Bestaande woorden hergebruikt: Advies, Meer uitleg, Annuleren, Begrepen, Opnieuw proberen, "Naar Instellingen". Nieuw: "Datavelden", "Veld kiezen", "Pagina erbij", "Pagina weghalen", "Terug naar advies", "Begin met een kopie van het advies", "Ongedaan maken", "Zo zet je het op je horloge".

Instelling "Datavelden voor je horloge" (Aan of Uit, standaard Aan): "Laat per soort training zien welke datapagina's je op je horloge zet. Er verandert niets aan je planning." Waarde in de rij: Aan of Uit. Zoektermen: datavelden, dataschermen, horloge, pagina's, hartslag, tempo, Garmin, scherm. Rij komt in `settingsIndex.ts`, `settingsLayout.ts` (bij de groep van Garmin koppelen), `settingsSummary.ts` en `settingsHelp.ts`.

## Samenvatting

Eén eigen pagina met soortchips, een versiestrook (Advies, Versie 2, Versie 3), een veegbaar rond horloge van 288 px met knoppen eroverheen, en stappen om het op te zetten. Ingangen: Garmin koppelen (vervangt het ingeklapte blok) en een rij in de uitleg van een training. Het advies is nooit te overschrijven: een tik maakt een kopie in een versie.

## Vragen voor de eigenaar

1. Mag het Advies zo onaantastbaar blijven, met de kopie in Versie 2 of 3, en is "twee versies naast het advies" genoeg?
2. Welk model horloge heb je, en mag de tekst bij de stappen de merknaam noemen (alleen in woorden, niet als beeld)?
3. Heb je een borstband? Zo ja, dan kan "Vraagt een borstband" amber worden als de instelling zegt dat je er geen gebruikt.
4. Zijn vijf pagina's per versie en vier velden per pagina genoeg?
5. Staat de schakelaar goed bij Garmin koppelen, of liever bij Vandaag?
