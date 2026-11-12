# Ontwerp Je week tot nu

Ontwerpvoorstel van Cartographer, 12 november 2026. Geen code. Aanleiding: een afdruk op 412 px van het blad Je week tot nu. De eigenaar vindt het te druk, met te veel tekst, onduidelijk wat het zegt, en het voorstel midden in het blad onduidelijk. Hij wil minimaal en vernieuwend, mooi en makkelijk.

Gelezen: `CLAUDE.md`, `docs/architectuur/ontwerp-en-tokens.md`, `docs/beslissingen/2026-11-09-stem-van-ascend.md`, `docs/visie/Ontwerp Je dag.md`, `docs/beslissingen/2026-11-12-je-dag.md`, `docs/visie/Ontwerp trainingsscherm minimaal.md` (de vier regels voor de hele app in hoofdstuk 6, die ik hier volg), de kern van `docs/onderzoek/Programma, fasen en weekindeling 2026-11-11.md`, en de code: `src/components/WeekReview.tsx`, `src/components/MountainMuscleNotice.tsx`, `src/engine/weekHighlights.ts`, `src/engine/weekEffort.ts`, `src/engine/mountainMuscles.ts`, `src/engine/weekLabel.ts`, delen van `src/engine/weekReview.ts`, `src/engine/bodyCheck.ts` (`weeklyCheckLine`), `src/engine/addedExercises.ts` en de oefening in `src/data/exercises.ts`.

Niet nagelopen: `docs/onderhoud/2026-11-12-pathfinder-totaalplaatje-ui.md` noemt dit blad niet (gezocht op de naam, niet heel gelezen). `WeekStrip`, `SheetRow` en `SheetHeader` heb ik niet geopend; ik ga uit van hoe `WeekReview.tsx` ze aanroept. Of volgende week echt een rustweek is heb ik afgeleid uit de afdruk, niet uit het programma.

## 1. Wat dit blad is

Je week tot nu is de stand van deze week in één blik: wat je deed, waar je op moet letten en wat er volgende week komt.

Het is geen plek om iets te beslissen, geen uitleg van het programma en geen tweede Stand. Wat een besluit vraagt krijgt een eigen weergave achter een rij. Wat uitleg is staat achter de i.

## 2. Het nieuwe blad, voor deze week

Van boven naar onder. Elk feit staat één keer. Boven de lijst staan hoogstens drie blokken, zonder koppen in hoofdletters: alleen het kopje in de kop van het blad blijft een `Eyebrow`.

De kop (`SheetHeader`, ongewijzigd van vorm): het kopje "Week van 9 november", de titel "Je week tot nu", en de regel "Opbouw, week 3 van 18" (zie 5).

Blok 1, de week. De dagstrip van maandag tot zondag (`WeekStrip plain`), zoals nu. Dit is het hart van het blad en het enige beeld. Eronder één regel in gewone inkt: "1 gedaan · 1:04 uur". Meer niet. Dat er vandaag nog een training staat laat de strip al zien op de gemarkeerde dag, dus "vandaag staat er nog 1" vervalt. De regel "1:04 uur hard" vervalt (zie 4). De verdeling per sport verhuist naar de weergave Je trainingen.

Blok 2, let op. Alleen als er iets is. Eén regel in de vorm van het blok Stand en morgen uit Je dag: een amber stip vooraan, links het vaste woord gedempt, rechts de waarde in gewone inkt. Voor deze week: "Knie" en daarnaast "Lichte klacht. Zakt hij niet, meld hem volgende week weer." De zin is de bestaande zin, korter; de waarschuwing zelf blijft volledig en op het scherm. De losse regel "Lijf: pijn aan je knie (licht)." vervalt, want dat is hetzelfde feit. Zijn er twee dingen (bijvoorbeeld pijn in een log en een training die bleef liggen), dan zijn het twee regels onder elkaar, hoogstens twee, zoals `weekHighlights` nu al afkapt. Een regel zonder zorg (lichter gevoeld, bleef liggen) heeft geen stip.

Blok 3, volgende week. Eén regel in dezelfde vorm, zonder stip: "Volgende week" en daarnaast "Rustweek · 4:20 uur". Eronder in 12 px gedempt: "Belangrijkste: lange duurloop, 55 min". De schijf met het weekicoon en de haarlijn erboven vervallen; de regel staat in dezelfde lijstvorm als blok 2, zodat het blad één ritme heeft.

De lijst (`SheetRows` met `SheetRow`, zoals nu):

- "Voorstel" met eronder "Op één been staan erbij in Benen B". Alleen als er een voorstel is. Opent de weergave Voorstel in hetzelfde blad (zie 3).
- "Je trainingen" met eronder "1 training".
- "Wat ASCEND aanpaste" met eronder "4 aanpassingen in je planning". Het kale getal krijgt zijn woord.
- "Je antwoord deze week", alleen als er een antwoord is, zoals nu.

Daaronder de bestaande rij naar Instellingen (`SettingsLinkRow`).

Geteld tegen de afdruk: 1:04 uur van twee keer naar één, de knie van twee keer naar één, drie koppen in hoofdletters naar nul, ongeveer 75 woorden lopende tekst naar ongeveer 25, en de twee knoppen midden in het blad zijn weg.

Standen:

- Leeg: een week zonder iets gedaan toont de strip en de bestaande zin "Geen trainingen deze week. Volgende week volgt het plan." Zonder iets om op te letten is er geen blok 2 en geen vervangende zin. Zonder planning voor volgende week geen blok 3. Zonder rijen geen lijst.
- Laden: alles komt uit de opslag op het toestel en staat er meteen als het blad opent. Geen laadteken, niets springt later in.
- Fout: het blad zelf slaat niets op. De enige plek waar iets kan mislukken is Akkoord in de weergave Voorstel; daar blijft de bestaande melding met de tijdgrens van acht seconden.
- Afgelopen week (titel "Je week"): dezelfde opbouw, de regel onder de strip wordt "4 van 5 gedaan · 5:10 uur".

Vernieuwend zonder drukte: de strip wordt het bedieningsvlak. Een tik op een dag met een gedane training opent die training (`LogDetailSheet`), zodat je niet eerst naar een lijst hoeft. Elke dag is dan een tikdoel van minstens 44 px hoog. Dit is een later spoor; de rij Je trainingen blijft tot dan de weg.

Hergebruik: `SheetHeader`, `SheetGrip`, `Card`, `WeekStrip`, `SheetRows`, `SheetRow`, `SettingsLinkRow`, `LogDetailSheet`, `InfoButton`, `PrimaryButton`, `SecondaryButton`, en de regelvorm van het blok Stand en morgen. Geen nieuw onderdeel met eigen opmaak.

## 3. Het voorstel

Waar het hoort. Het voorstel verandert één krachttraining, dus zijn eerste plek is die training: in Forge staat het al in de kop van Benen B (`ForgeIntro` met `onlyFor`). Dat blijft. In de terugblik staat het niet meer als blok met knoppen tussen de feiten, maar als de eerste rij van de lijst, met een eigen weergave in hetzelfde blad. Zo blijft het vindbaar voor wie Benen B niet in Forge doet, en is de terugblik zelf weer alleen lezen. Niet op Vandaag: het gaat niet over vandaag. Niet in Week: het verplaatst geen sessie.

De weergave Voorstel (titel in de kop van het blad: "Voorstel", met de terugpijl zoals de andere weergaven), van boven naar onder:

- Wat, als kaarttitel van 20 px: "Op één been staan erbij in Benen B".
- Waarom, één zin: "Je deed de laatste 2 weken geen werk op één been; voor ongelijke paden en afdalingen kan dat helpen."
- Wat het kost, één regel gedempt: "3 sets per been, zo lang je stil kunt staan. Een paar minuten per training."
- De vaste zin: "Eerst een voorstel, pas na Akkoord verandert er iets. Weghalen kan later in het blad van de oefening."
- Twee knoppen naast elkaar: Liever niet (`SecondaryButton`) en Akkoord (`PrimaryButton`). Dit is het ene mint accent van deze weergave.
- Rechtsboven een i met de rest: welke weken meetelden ("een rustweek en een week met vakantie of een tocht tellen niet mee"), dat Liever niet acht weken stilte geeft, en de regel over sets die niet gekoppeld konden worden als die er is.

"Een paar minuten" is mijn schatting, geen getal uit de code. De bouwer laat het weg als hij het niet kan onderbouwen; dan blijft "3 sets per been, zo lang je stil kunt staan."

Na Akkoord: de weergave toont "Op één been staan staat in Benen B. Je ziet hem bij je volgende training." zonder knoppen, zoals nu. De rij in de lijst verdwijnt bij de volgende keer openen, zoals het blok nu ook doet. Na Liever niet: terug naar de hoofdweergave, de rij is weg.

De naam. De oefening heet in de data "Single Leg Stance" met de alias "Op één been staan" (`src/data/exercises.ts`), en de uitleg in instellingen zegt al "op één been staan". De melding gebruikt de Nederlandse naam. Er is nu geen functie die een Nederlandse naam teruggeeft; de bouwer maakt er één kleine in `engine/` die alleen de tekst van de melding raakt. De naam in Forge, in logs en in MacroFactor blijft wat hij is. Voor de drie spieren (kuiten, scheenspier, bilspieren) geldt dezelfde regel: de Nederlandse alias als die er is, anders de bestaande naam.

De nieuwe tekst voor de spieren volgt hetzelfde patroon: "Kuitheffen erbij in Benen B" en "Je kuiten kregen de laatste vier weken gemiddeld 2 harde sets per week; voor bergop en bergaf met een rugzak kan kuitwerk helpen." en "3 sets van 10 tot 15 herhalingen."

In Forge krijgt de melding dezelfde woorden. De opmaak daar valt buiten dit voorstel.

## 4. De telling

Wat "1:04 uur hard" bedoelt. `engine/weekEffort.ts` verdeelt de minuten van de week in rustig (zone 2 of lager) en hard (alles erboven). Een krachttraining heeft geen hartslagzones; die telt in zijn geheel als hard zodra je eigen zwaarte hoger is dan 4, en anders als rustig. Deze week is er één krachttraining van 1:04 uur met een zwaarte boven 4, dus de hele week is "hard" en het getal is gelijk aan het totaal erboven. Het zegt hier niets nieuws en het woord hard legt zichzelf niet uit.

Voorstel: weg uit dit blad. De verdeling rustig en hard staat al op Stand onder Intensiteit, met uitleg, en daar hoort hij. Volgens regel 1 van de hele app verwijst een tweede plek, hij herhaalt niet. De functie `effortLine` blijft bestaan voor wie hem elders gebruikt; alleen de regel in het blad vervalt.

Mocht de eigenaar de verdeling hier toch willen zien, dan komt hij in de weergave Je trainingen als één regel onderaan, "Rustig 1:20 uur · stevig 36 min", met een i, en alleen als beide delen groter zijn dan nul.

## 5. Volgende week en de weektelling

"Opbouw, week 4 · rustweek" is niet tegenstrijdig maar leest zo: week 4 is de rustweek binnen de fase Opbouw. De lezer heeft één woord nodig. Is volgende week een rustweek, dan zegt de regel "Rustweek · 4:20 uur" en verdwijnen fase en weeknummer. Is het een gewone week, dan zegt hij "Opbouw, week 4 · 4:20 uur". De bouwer leest de rustweek uit het programma (`isRestWeekAt`) en niet uit een woord in de notitie.

"Week 3 van 18" wordt "Opbouw, week 3 van 18", met de fase voorop. Dat is het eerste advies uit het onderzoek naar het programma: de 18 is de lengte van de fase, en met de fase voorop lees je dat ook zo. De puntkomma-vorm met het middenpunt ("Week 3 van 18 · opbouw") vervalt. Het hele programma ("week 3 van 39 naar je doel") hoort niet in dit blad; dat staat bij Programma in instellingen en is een eigen besluit voor Vandaag of Week.

## 6. Regels

- Eén mint accent: in de hoofdweergave is er geen mint knop meer; mint is alleen het vinkje in de strip (voortgang). In de weergave Voorstel is Akkoord de ene gevulde knop.
- IJsblauw alleen voor vandaag in de strip, zoals nu.
- Amber alleen als stip vooraan in blok 2. Geen amber tekst meer: de zin staat in gewone inkt. Volgende week en het voorstel krijgen nooit amber.
- Alleen tokens uit `src/index.css`. Geen nieuwe token, geen nieuwe kleur.
- Niets kleiner dan 12 px. De regel onder de strip is 14 px, de tweede regels 12 px.
- Tikdoelen minstens 44 bij 44 px: elke rij, de i, de terugpijl, de twee knoppen.
- Zinsletters overal. Hoofdletters alleen in het kopje van `SheetHeader`. De koppen Wat telt en Kracht voor de berg verdwijnen van het blad; de `aria-label` "Kracht voor de berg" op de groep mag blijven.
- Het blad blijft door `useSheetClose` gaan, met `ref={sheetRef}` en `<SheetGrip />`. De weergave Voorstel is een weergave in hetzelfde blad, geen tweede blad; de terugknop van het toestel gaat eerst terug naar de hoofdweergave. De rij Voorstel krijgt `sheetFrom`, zoals de andere rijen.
- Geen nieuwe beweging.
- Teksten zonder gedachtestreepjes, je/jij, het feit eerst, de vaste woorden Liever niet en Akkoord.

Wat ik bewust niet doe: geen score of cijfer voor de week, geen ring, geen grafiek, geen uitklapblok, geen beloning bij een volle week, geen kleur per regel, geen voorstel op Vandaag, en geen wijziging aan de kaart Weekterugblik op Vandaag of de kop in het Logboek.

## 7. Voor de bouwer

Sporen, elk alleen weergave en met een eigen einde.

1. De hoofdweergave: de regel onder de strip korter (een nieuwe korte vorm naast `weekSummaryLine`, of een optie erop), `effortLine` uit het blad, de koppen weg, blok 2 als regels met stip, de regel `weeklyCheckLine` alleen nog als het feit niet al in blok 2 staat. Einde: elk feit één keer op de tekstkaart.
2. Blok 3 in de nieuwe vorm, met de rustweek uit het programma. De sub van Wat ASCEND aanpaste met het woord erbij.
3. Het voorstel als rij en weergave. `MountainMuscleNotice` krijgt een tweede vorm of wordt gesplitst in de berekening (een hook die het voorstel, `accept` en `decline` geeft) en twee weergaven. De berekening zelf verandert niet.
4. De tekst van het voorstel: `muscleNoticeText` levert wat, waarom, kost en de uitleg voor de i, met de Nederlandse naam. Forge leest dezelfde functie.
5. "Opbouw, week 3 van 18": na de keuze op vraag 2 in `weekPositionLabel` (overal) of alleen in dit blad.
6. Later: een tik op een dag in de strip opent de training.

Wat niet mag bewegen:

- Het voorstel zelf: wanneer het komt, welke oefening, in welke training, de ondergrenzen, de weken die meetellen, de stilte van acht weken na Liever niet (`mountainMuscleProposal`, `balanceShort`, `rememberMuscleDecline`). Alleen de woorden en de plek veranderen.
- Akkoord: `withAddedExercise` via `updateSettings`, de tijdgrens van acht seconden, dat een late gelukte opslag als gelukt telt, en dat de oefening er hoogstens één keer in komt. Pas na Akkoord verandert er iets.
- Logs en historie: het blad leest alleen. Geen log, geen `PlannedSession` en geen antwoord op de lijfvraag wordt geschreven of herschreven. De oefennaam in bestaande logs blijft Engels als hij dat was.
- `buildWeekReview`: wat het levert blijft gelijk; de kaart Weekterugblik op Vandaag en `weekReviewCardShown` leunen erop. De eerste regel van die kaart (`weekHighlights(review)[0]`) mag meekorten met blok 2, maar dat is zichtbaar op Vandaag en moet dan bewust.
- De waarschuwing bij pijn of een klacht: nooit achter een rij of een i.
- De instelling Weekterugblik en haar rij; er komt geen nieuwe instelling bij, want er komt geen nieuwe keuze van de app bij.
- `src/storage/planGolden.test.ts`. Er verandert niets aan de planning.

Testen:

- Tellen op de tekstkaart voor de week van de afdruk: de uren één keer, de knie één keer, geen regel met "hard".
- Blok 2: pijn in een log, een lichte klacht, een matige klacht, minder kunnen trainen, niet kunnen trainen, een training die bleef liggen, niets. De volledige waarschuwing staat er bij elke klacht.
- Blok 3: een rustweek, een gewone week, geen planning voor volgende week, een week zonder sleuteltraining.
- Het voorstel: de rij staat er alleen met een voorstel; Akkoord zet de oefening erin en toont de bevestiging; Liever niet haalt de rij weg en houdt acht weken stil; opslaan dat te laat is toont de melding en laat opnieuw proberen toe; het blad sluiten tijdens opslaan laat geen halve stand achter. Dezelfde uitkomst via Forge.
- De naam: Nederlands in de melding voor evenwicht en voor de drie spieren, en ongewijzigd in Forge en in een bestaand log.
- De drie titels: Je week tot nu, Je week (afgelopen week), en het blad vanuit het Logboek voor een oude week.
- Terug: van Voorstel, Je trainingen en Wat ASCEND aanpaste naar de hoofdweergave, daarna pas dicht.
- Op 360 en 390 px met vertraagde processor: de strip, de regel en blok 2 boven de vouw, niets afgekapt, geen tikdoel onder 44 px.
- Vast: `npx vitest run src/engine/weekHighlights src/engine/weekReview src/engine/mountainMuscles src/engine/weekLabel src/components/sheetDrag`, daarna `npm run kaart:vergelijk` met elk verschil verklaard. Welke van die testbestanden bestaan heb ik niet nagekeken.

## Samenvatting

Het blad wordt drie rustige blokken en een lijst: de strip met één regel, één regel om op te letten met een amber stip, en één regel over volgende week. Het voorstel gaat uit de feiten naar een eigen rij met een eigen weergave, in het Nederlands, met wat, waarom en wat het kost, en Akkoord als enige mint knop. "1:04 uur hard" verdwijnt omdat het hetzelfde getal is en op Stand thuishoort. Geen nieuwe kleur, token of instelling, en het voorstel, zijn Akkoord, de logs en de planning bewegen niet.

## Vragen voor de eigenaar

1. Het voorstel: als rij met een eigen weergave in dit blad en daarnaast in Forge bij de training zelf, in plaats van als blok met knoppen tussen de feiten? Mijn advies: ja. De terugblik is dan alleen lezen, en het voorstel blijft vindbaar voor wie niet in Forge traint.
2. "Opbouw, week 3 van 18" met de fase voorop: alleen in dit blad, of overal waar de app de week noemt (Vandaag, Week, Stand)? Mijn advies: overal in één keer, via de ene functie die de tekst maakt, zodat dezelfde week nergens anders heet. Het hele programma ("week 3 van 39") blijft een apart besluit.
