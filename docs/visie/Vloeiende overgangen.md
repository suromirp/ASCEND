# Vloeiende overgangen

Ontwerp van Cartographer. Geen code. Status: voorstel, wacht op de eigenaar.

Aanleiding: de eigenaar wil een premium gevoel. Beweging die vloeit en de werking nooit in de weg zit. Drie dingen: dingen die in elkaar overgaan (een rij groeit uit tot het blad, een verplaatste training schuift naar zijn dag), een korte tik in de hand, en bladen die je vinger volgen.

Dit sluit aan op het besluit `docs/beslissingen/2026-10-24-beweging.md` (150 tot 400 ms, ease-out, nooit stuiteren, CSS en kleine hooks, geen bibliotheek, instelling Beweging met Normaal, Rustig en Uit) en op `docs/visie/Slepen in Week.md`, dat nu gebouwd is.

## 0. Uitgangspunten voor alles

Beweging is een bevestiging van wat je deed, geen show. Het eerste antwoord blijft de missie van vandaag. Een overgang mag nooit een tik tegenhouden: tijdens elke animatie in dit ontwerp blijft het scherm bedienbaar, en een tweede tik of de terugknop maakt de animatie meteen af.

Vaste regels, voor elk onderdeel hieronder:

- Duur 150 tot 400 ms, ease-out. De bestaande curve van de bladen (`cubic-bezier(0.16, 1, 0.3, 1)`, in `.animate-rise-in` en `.animate-sheet-in`) is de standaard. Nooit stuiteren, nooit veren met overshoot.
- Alleen verschijnen of na een handeling. Geen lus. Nooit bij een gewone render, nooit bij een synchronisatie op de achtergrond.
- Alleen `transform` en `opacity`. Geen animatie van hoogte, breedte, top, `clip-path` of schaduw. Zo blijft het soepel op een trage telefoon.
- Alleen tokens. Kleuren komen uit `src/index.css`, geen losse hex of rgba in code.
- Normaal doet alles. Rustig laat de verplaatsingen weg die over het scherm reizen (de uitgroei en het schuiven naar een dag) en houdt het blad zoals het nu is. Uit en `prefers-reduced-motion: reduce` staan meteen op de eindstand. De vinger volgen (deel 3) blijft in elke stand 1 op 1, want dat is bediening en geen animatie.
- Code die met `element.animate()` of met een eigen hook werkt, leest de stand zelf (`useMotionMode` in `components/motion.ts`), want de CSS-regels voor `data-motion` en `prefers-reduced-motion` raken die niet. Dat is een vaste regel voor Sherpa, met een pure functie en een test (stap 1).
- De richtlijn uit `docs/visie/Ontwerp en gebruik.md` blijft gelden: geen animatie op dingen die je vaak doet, zoals een tab wisselen. Een training openen doe je vaak. Daarom is de uitgroei kort (280 ms), blokkeert hij niets en is hij uit te zetten via Beweging.

## 1. Dingen vloeien in elkaar over

### 1a. De rij groeit uit tot het blad

Wat er nu is. Elk blad schuift van onderen omhoog (`.animate-sheet-in`, 280 ms) met een waas erachter (`.animate-backdrop-in`, 200 ms) en schuift terug bij sluiten (`.animate-sheet-out`, 200 ms). Ruim veertig bestanden bouwen hun eigen blad (`Sheet.tsx` van de instellingen en alles wat daarop rust, `TodaySheet`, `SessionActionSheet` met zijn `SheetFrame`, `ProposalSheet`, `RescheduleDialog`, `LogDetailSheet`, `GoalSheet` via `Sheet` en meer), maar ze delen de klassen en allemaal `useSheetClose` (`src/utils/useSheetClose.ts`), dat de uitloop van 200 ms en de terugknop regelt. Dat gedeelde is de haak voor dit ontwerp. Er is geen enkele plek die weet vanuit welke rij een blad geopend werd.

Wat er nieuw komt. Een tik op een training (Vandaag, Week, Logboek) of een doel (Ascend) laat het blad uit die rij groeien. Sluiten met het kruisje, een tik naast het blad of de terugknop krimpt het weer terug naar de rij. Is de rij niet meer te zien (weggescrold, weggehaald, of het blad werd geopend zonder tik op een rij), dan doet het blad wat het nu doet.

#### De keuze: View Transitions API of eigen FLIP

De View Transitions API (`document.startViewTransition`, `view-transition-name`) werkt in Chrome op Android en in Safari 18 en nieuwer. Ze is aantrekkelijk omdat de browser het rekenwerk doet. Voor ASCEND is ze om deze redenen niet de goede keuze:

1. Ze maakt een beeld van de hele pagina, voor en na, en bevriest tijdens de overgang het tekenen en het bedienen van de pagina. Op een trage telefoon is dat precies het soort haperen dat we willen vermijden, en het strijdt met "de werking nooit in de weg".
2. De naam moet op één element tegelijk staan. Bij een blad staat de rij er nog gewoon onder, dus de naam moet net voor het nieuwe beeld van de rij af en op het blad, en bij sluiten andersom. Met React 19 betekent dat `flushSync` op de goede plek in elke tikafhandeling, in een app waar het blad door ruim veertig bestanden wordt geopend. Dubbele namen laten de overgang stilzwijgend mislukken.
3. De browser rekt de afbeelding van de rij op naar het blad. Tekst wordt dan uitgerekt en wazig. Daar valt weinig aan te sturen.
4. Het botst met de lagen in `utils/backLayers.ts`: sluiten via de terugknop komt uit een `popstate`, buiten de tikafhandeling om, waar je niet makkelijk een overgang omheen zet.
5. Er moet toch een tweede pad komen voor browsers zonder ondersteuning. Twee wegen zijn meer onderhoud dan één.

Een eigen FLIP (meten, omkeren, spelen) met `transform` en `opacity` werkt in elke browser, blokkeert niets, en laat zich in een pure functie vangen en testen. Keuze: eigen FLIP. De View Transitions API laten we liggen. Een terugval zonder ondersteuning is er niet nodig, want de FLIP werkt overal; de terugval is alleen "het huidige blad" voor Rustig, Uit en een rij die niet te vinden is.

#### Hoe het eruitziet

Het blad zelf gaat niet schalen, want tekst die uitrekt ziet er goedkoop uit. In plaats daarvan komt er een stil vlak in de kleur van het blad, zonder inhoud, dat van de rij naar het blad groeit.

Openen, in 280 ms:

1. Het vlak (achtergrond `--color-card`, rand `--color-card-border`) staat op de plek en maat van de rij en groeit met een transform naar de plek en maat van het blad. De waas komt er gelijktijdig bij, zoals nu.
2. Het blad zelf schuift niet meer van onderen in. Het staat op zijn eindplek en verschijnt met een fade (opacity, 180 ms, na 100 ms vertraging), zodat de inhoud pas zichtbaar wordt als het vlak er bijna is.
3. Het vlak zelf wordt in de laatste 100 ms doorzichtig en wordt daarna weggehaald.

Sluiten, in 240 ms: de inhoud van het blad fadet uit (120 ms), het vlak staat op de plek van het blad en krimpt naar de rij, de waas gaat weg. Daarna wordt het vlak weggehaald.

Het vlak is een gewone `div` die de hook zelf maakt en weer weghaalt, `aria-hidden`, `pointer-events: none`, vast aan het scherm. Het wordt aangestuurd met `element.animate()` op `transform` (verschuiven en schalen vanaf linksboven) en `opacity`. De rand en de hoeken schalen een beetje mee; bij een rij van 64 px naar een blad van 500 px is dat nauwelijks te zien. Lookout beoordeelt dat op 360 px.

Eén ding om op te letten, en het eerste wat Lookout nakijkt: de rij onder het vlak is een rij met inhoud. Het vlak is effen. In de eerste 60 ms komt het vlak op 0 tot 100 procent dekking, zodat de tekst van de rij niet in één beeld verdwijnt. Valt dat tegen op de telefoon, dan is de terugval een kleine aanpassing, geen herontwerp.

#### Waar het mechanisme zit

1. Een rij of kaart die een blad opent, krijgt het attribuut `data-sheet-from`. Dat is declaratief: er verandert geen tikafhandeling. Het komt op de tikknop van een rij in Week (`SessionRow` en `LooseRow` in `WeekPlanner.tsx`), op de trainingskaarten van Vandaag, op de rijen van het Logboek en op de doelkaart van Ascend (`GoalCard`).
2. Eén luisteraar op `document` (capture, passief) onthoudt bij een `click` het dichtstbijzijnde `[data-sheet-from]` en het tijdstip. Hij is maximaal 600 ms geldig en wordt bij de eerste gebruiker opgebruikt.
3. `useSheetClose` krijgt de rol van haak: het geeft nu al `closing` en `requestClose` terug en krijgt er een `sheetRef` bij. De sheet zet die ref op zijn paneel (één regel per blad, zie deel 3 want dezelfde ref is nodig voor het naar beneden slepen). In een `useLayoutEffect` bij het openen leest de haak de rij en de maat van het paneel, vraagt de pure functie `growPlan` of het mag, en speelt het vlak.
4. Bij sluiten gebruikt dezelfde haak de eerder bewaarde rij, mits die nog `isConnected` en zichtbaar is. De uitloop van `useSheetClose` is nu 200 ms. Met een uitgroei-sluiting wordt dat 240 ms. Alleen in dat geval; de andere bladen blijven 200.
5. Het paneel krijgt het attribuut `data-grow`. De CSS (`.animate-sheet-in[data-grow]` en `.animate-sheet-out[data-grow]`) vervangt dan de slide door een fade. Een data-attribuut, geen klasse, omdat React `className` bij elke wisseling van `closing` opnieuw zet en een zelf toegevoegde klasse zou verliezen.

Bladen die niet via een rij worden geopend (de instellingen, een knop in een kaart) hebben geen `data-sheet-from`-bron en doen niets nieuws. Bladen die het paneel niet aan de haak geven, doen ook niets nieuws. Dat maakt een gefaseerde uitrol mogelijk.

Eén uitzondering om te weten: Week sluit het actieblad op veel plekken met `setSelected(null)` direct na een handeling (Gedaan, Verplaatsen, Overslaan), niet met `requestClose`. Daar is nu geen uitloop en dat blijft zo. De krimp naar de rij hoort bij sluiten via het kruisje, de waas, de terugknop en "Annuleren".

#### Pure functies met tests

`src/components/growPlan.ts` (of in `engine/` als het naamgeving en structuur van de repo beter past; geen React, geen DOM):

- `growPlan(mode, from, to, viewport)` geeft `null` als er niets moet gebeuren (mode is niet `full`, een rechthoek heeft geen maat, de rij ligt buiten het scherm, of de rij is groter dan het paneel) en anders `{ from, to, durationMs, delayContentMs }`.
- `growKeyframes(from, to)` geeft de twee transformaties: translate en scale rond de linkerbovenhoek, zodat het vlak exact op de rij begint en op het paneel eindigt.
- `isFreshOrigin(origin, now, el)` zegt of een onthouden rij nog geldig is (ouder dan 600 ms, losgekoppeld of onzichtbaar is niet geldig).

Tests: elke stand (full, calm, off), een rij onder het scherm, een nulrechthoek, een rij hoger dan het blad, de uitkomst van de twee transformaties voor een gegeven paar rechthoeken, en dat er in geen enkele tekst een gedachtestreepje staat.

#### Wat er al bestaat en wat nieuw is

Bestaat: `useSheetClose`, `Portal`, de blad- en waasanimaties, `useMotionMode`. Nieuw: `data-sheet-from`, de luisteraar, `sheetRef` in `useSheetClose`, de uitgroei-hook, `growPlan` met tests, twee kleine CSS-regels voor `data-grow`.

#### Lege, laad en foutstand

Leeg: geen rij onthouden betekent het huidige blad. Laden: een blad dat opent voordat zijn inhoud er is (Logboek, Ascend) groeit gewoon naar de maat van het paneel op dat moment; wordt het paneel hoger doordat de inhoud binnenkomt, dan is dat gewoon een blad dat groeit, zoals nu. Fout: kan de hook iets niet meten of faalt `animate()`, dan wordt het vlak weggehaald en blijft het blad zoals het is. Er is geen fout die de gebruiker ziet.

### 1b. Een verplaatste training schuift naar zijn nieuwe dag

Wat er nu is. Na een verplaatsing (slepen, actieblad, Akkoord op een voorstel, Ongedaan maken) verdwijnt de rij op zijn oude dag en verschijnt hij op de nieuwe. In Normaal krijgt de verplaatste rij daar `animate-rise-in` (`rise` in `WeekPlanner.tsx`, 300 ms), een fade met 10 px beweging. De rij heeft al `data-session-row` met het id van de training, en de dagblokken hebben `data-week-day`. Dat is precies wat een FLIP nodig heeft.

Wat er nieuw komt. De rij schuift zichtbaar van de oude plek naar de nieuwe, en de rijen eromheen schuiven mee om de ruimte te vullen of op te geven. Na het slepen begint de beweging op de plek waar de zwevende rij los werd gelaten, niet op de oude plek: dat voelt als neerzetten.

#### Hoe het werkt

Een klassieke FLIP over de lijst, met de rijen op hun id:

1. Meten vooraf. Op het moment van de handeling wordt van elke zichtbare rij (`[data-session-row]`) de plek bewaard, in paginaruimte (rechthoek plus de scrol van `#app-scroll`), zodat scrollen geen valse verschillen geeft.
2. Handeling uitvoeren, de gegevens veranderen, React tekent opnieuw. Dezelfde id staat nu in een ander dagblok: dat is een nieuw element, dus er wordt op id gekoppeld, niet op element.
3. In een `useLayoutEffect` na het tekenen: de nieuwe plekken meten, per rij het verschil uitrekenen met `flipDeltas`, en de rijen die minstens 4 px zijn verschoven meteen terugzetten naar de oude plek met een transform (omkeren), nog voor het eerste beeld.
4. Afspelen. Elke rij animeert met `element.animate()` van de omgekeerde transform naar `none`. De duur hangt af van de afstand: 220 ms voor een korte stap, oplopend naar maximaal 400 ms voor een afstand van een heel scherm. Ease-out, geen stuiteren. De verplaatste rij krijgt tijdelijk een hogere laag zodat hij niet achter een buurrij schuift.

Alleen na een handeling. Het meten vooraf gebeurt alleen als iets `armFlip()` aanroept. Dat doen de vier wegen: `moveTo` in `Week.tsx` (slepen en actieblad), `applyProposal` na Akkoord (ook het voorstel van de weekcontrole en de weekmelding), en de knop Ongedaan maken in de melding. Een vergrendeling vervalt na een seconde, zodat een achtergrondsynchronisatie die later de gegevens aanpast nooit animeert.

Wachten tot het blad weg is. Bij Akkoord op een voorstel ligt `ProposalSheet` nog over de pagina terwijl de gegevens al veranderen. De rijen worden dan wel meteen omgekeerd (ze blijven visueel waar ze waren), maar het afspelen wacht tot er geen `.animate-sheet-in` of `.animate-sheet-out` meer in het document staat, met een grens van 600 ms. Dan zie je de beweging op een rustige pagina en niet achter de waas. Na die grens zetten we de rijen gewoon op de eindplek; er blijft nooit een transform achter.

Vanaf de zwevende rij. `armFlip` neemt een optioneel gewenst beginpunt voor één id: de bovenkant van de zwevende rij uit `useWeekDrag` (`ghost.top`). De rij die je losliet schuift vanaf je vinger naar zijn dag.

Stand. Normaal: schuiven. Rustig: de verplaatste rij krijgt alleen een korte fade van 150 ms, de rest staat meteen. Uit: niets. Dat past bij de eerdere afspraak in Slepen in Week dat het teken "verplaatst" in alle standen zichtbaar blijft. De huidige `rise` (`animate-rise-in` bij `movedId`) vervalt in Normaal, want die zou met de FLIP om dezelfde transform vechten.

Scope. Alleen Week, want alleen daar bestaat `data-session-row`. Vandaag toont een of twee trainingen; verplaatsen vanaf Vandaag loopt via het actieblad en de rij is daar anders. Dat blijft een open vervolg.

#### Pure functies met tests

`src/components/flip.ts`, zonder DOM:

- `flipDeltas(before, after, minPx)` krijgt twee `Map<string, Rect>` en geeft per id `{ dx, dy }`, alleen als de verschuiving groot genoeg is. Een id die nieuw is of verdween krijgt niets.
- `flipDuration(distancePx)` geeft 220 tot 400 ms en is monotoon stijgend.
- `applyOverride(before, id, top)` zet het beginpunt van één id op de plek van de zwevende rij.

Tests: een rij die een dag opschuift, een rij die niet beweegt, een rij die nieuw is, twee rijen die van plaats wisselen, de ondergrens van 4 px, de bovengrens van de duur, het beginpunt van de zwevende rij, en dat de scrol van de pagina niet als verschuiving telt (dezelfde rechthoek in paginaruimte, andere scrolstand: geen delta).

Een hook `useFlipList` in `components/` doet het meten en afspelen met `useLayoutEffect`, `useMotionMode` en een sleutel die de lijst identificeert; `armFlip` is een kleine module-functie die de hook leest.

#### Risico's

- Scroll. Meten in paginaruimte voorkomt valse beweging. Tijdens het afspelen mag de pagina scrollen; de transform blijft aan het element hangen en het scrollen blijft soepel.
- Focus. Na een verplaatsing krijgt de greep van de verplaatste rij de focus terug (`later(() => ... focus(...)` in `useWeekDrag`). Dat blijft werken; `preventScroll` staat er al. De focus zet niets in beweging.
- Schermlezer. De aankondiging ("Verplaatst naar ...") komt uit `useWeekDrag` en verandert niet. De animatie voegt niets toe en haalt niets weg; rijen zijn `aria` onaangetast.
- Terugknop. Er komt geen laag en geen geschiedenisstap bij. Het wachten op het blad kijkt alleen naar de aanwezigheid van het blad in de DOM.
- De `mx-stagger` op de kaart van de week speelt alleen bij het verschijnen van de pagina en raakt de rijen niet.
- De rijen staan in een kaart met `overflow-hidden`. Een rij die naar een verre dag schuift wordt onderweg binnen de kaart afgeknipt, wat netjes oogt. Zou de kaart een rij abrupt wegknippen aan een rand, dan is de oplossing de afstand begrenzen tot de kaart zelf.
- Tijdens het slepen zelf verandert er niets aan de FLIP: de lijst beweegt niet tijdens het slepen (zie Slepen in Week).

## 2. Een korte tik in de hand

### Wat er al is

Er is al een helper: `src/utils/haptics.ts` met `tap` (10 ms), `success` (12, 50, 18), `alarm` (het vaste patroon van de afteltimer) en `pattern` (voor het eigen ritme van het rustgeluid in Forge). Op iOS Safari bestaat `navigator.vibrate` niet en doet elke aanroep stil niets; de eigenaar gebruikt Android. Er is geen instelling die de tikken uitzet. De rusttimer in Forge heeft zijn eigen keuze ("Signaal als de rust om is": Geluid en trillen, Alleen trillen, Alleen geluid, Uit).

Waar de tik nu al zit: de schakelaar (`Toggle` en de schakelaar in `SettingsRow`), de keuzeknop `Chip`, `Segmented`, `Stepper` (in `ui.tsx`), `ChoiceStrip`, de stappen en het toetsenblok in Forge (`InputDock`), een set afvinken, "Alles afvinken", "Neem over" en "Lichter" in Forge (`ForgeWorkout`), de lange druk in `forge/parts.tsx`, de start-wizard, de fasestappen van het doel, het slepen in Week (`useWeekDrag`, bij oppakken), en `success` bij een opgeslagen moment en een behaalde mijlpaal (`AppDataContext`).

Eén ding om te weten voor de tik zelf. In `engine/restVibration.ts` staat dat veel Android-motoren een trilstoot korter dan ongeveer 70 ms weglaten. De `tap` is 10 ms. Op een telefoon met een goede trilmotor voel je dat prima, op een eenvoudiger motor kan het niets doen. Lookout kan dat niet voelen, dus de eigenaar moet het op zijn eigen telefoon beoordelen. Advies: begin bij 15 ms en maak de duur één constante, zodat hij op één plek te verstellen is.

### Welke momenten, zuinig

Wees zuinig. Liever te weinig dan een telefoon die de hele tijd zoemt. Het advies:

- Oppakken van een training bij slepen: ja, bestaat al (`tap`).
- Loslaten op een dag: nee. De beweging van de rij die neerkomt is de bevestiging, en een tweede tik direct na het oppakken voelt als zoemen.
- Akkoord op een voorstel: ja, nieuw, één `tap` op de knop zelf (niet bij het resultaat), in `ProposalSheet` en `RescheduleDialog`. Dit is een bewuste beslissing die je neemt, dus dit is een moment waar een tik past.
- Een set afvinken in Forge: ja, bestaat al.
- Een schakelaar omzetten: ja, bestaat al. Je voelt het bevestigen zonder te kijken.
- Een blad wegslepen voorbij de drempel: nee. De beweging is de bevestiging.
- De uitgroei van een blad en het schuiven van een rij: nee.
- `success` (twee korte stoten) blijft voor een opgeslagen training en een mijlpaal. Niet voor Akkoord.

Wat bewust niet: geen tik bij elke dag die je tijdens het slepen passeert, geen tik bij elke tab, geen tik bij elk bladsluiten, geen trilling bij een melding.

Bestaande tikken die je zou kunnen schrappen om zuiniger te zijn (`Chip`, `Segmented`, `Stepper`, `ChoiceStrip`): dat zijn er veel en ze staan nu overal. Advies: laten staan zoals ze zijn en niets nieuws toevoegen op dat soort plekken. Wil de eigenaar het stiller, dan is de instelling hieronder de schakelaar, en dit is een open keuze.

### De instelling "Trillen"

Een schakelaar, aan of uit, standaard aan, in de groep Vandaag en meldingen, vlak onder Beweging (die gaat ook over hoe de app aanvoelt). Het is een schakelaar in de rij, mint gedempt, zoals de afspraak voor instellingen.

Uitleg achter de InfoButton, één zin met korte punten: "Een korte tik in je hand als je iets doet: een schakelaar, een set afvinken, een training oppakken, Akkoord geven." Punten: "Wat" (de lijst van de momenten, kort), "Rusttimer" (het signaal als de rust om is staat apart in Forge onder Signaal; deze schakelaar gaat daar niet over), "iPhone" (op een iPhone bestaat trillen in de browser niet, dan doet deze schakelaar niets).

Zo past het in de werkafspraak, de instelling heeft een plek op alle zes plaatsen:

- `AppSettings.haptics?: boolean` in `src/storage/database.ts`; afwezig betekent aan (zoals `weekFixProposal` en `dragWeek`). Een naam die niet botst met `haptics` als module: bijvoorbeeld `vibrate` of `hapticTap`. Sherpa kiest op basis van wat het bestand al heeft.
- `src/storage/backup.ts`: de sleutel bij de lijst van booleans die bij het terugzetten gecontroleerd worden (de regel met `weekFixProposal`, `dragWeek`).
- `src/data/settingsIndex.ts`: `{ id: 'trillen', title: 'Trillen', group: 'vandaag', note: 'Een korte tik in je hand bij een schakelaar, een afgevinkte set, een training oppakken en Akkoord.', keywords: ['trillen', 'trilling', 'haptisch', 'tik', 'vibratie', 'feedback'] }`.
- `src/data/settingsLayout.ts`: `'trillen'` achter `'beweging'` in `PAGE_ROWS.vandaag.rows`.
- `src/engine/settingsSummary.ts`: `case 'trillen': return { checked: s.<sleutel> !== false }`, en `src/engine/settingsDiff.ts`: `flag('trillen', 'Trillen', 'vandaag', '<sleutel>')`.
- `src/data/settingsHelp.ts`: de uitleg, sleutel `trillen`.
- `src/components/settings/groups/VandaagGroup.tsx`: `<SummaryRow id="trillen" title="Trillen" facts={facts} info="trillen" onChange={(on) => void updateSettings({ <sleutel>: on })} />`.

De bestaande test die bewaakt dat elke instelling een plek heeft, vangt een gemiste stap.

### Hoe de instelling werkt

De helper kent nu geen instelling en de aanroepen staan verspreid over een tiental bestanden. Daarom komt de poort in de helper zelf, en blijven de aanroepen zoals ze zijn.

`haptics.ts` krijgt een module-variabele `enabled` (standaard `true`) en een functie `setHapticsEnabled(on)`. `tap` en `success` kijken daarnaar. `alarm` en `pattern` niet, want dat is het signaal van de rusttimer, dat zijn eigen keuze heeft. Net zoals `useMotionAttribute` de Beweging op `<html>` zet, zet een kleine hook (`useHapticsSetting`, aangeroepen waar nu `useMotionAttribute` staat) de waarde uit `settings` in de helper. De helper krijgt ook één constante voor de duur van de tik.

Een pure functie in `engine/` of `utils/` (`resolveHaptics(raw)`, zoals `resolveMotion`) leest de instelling defensief: alles behalve `false` is aan. Daar komt een test voor, en een test dat `tap` niets aanroept als de poort dicht is (met een nagemaakte `navigator.vibrate`).

Trillen volgt Beweging niet. Wie Beweging op Uit zet, wil geen animatie, maar niet noodzakelijk geen tik. `prefers-reduced-motion` gaat over beweging op het scherm, niet over trillen.

### Lege, laad en foutstand

Geen ondersteuning (iPhone, een desktop, een telefoon op stil zonder trilmotor): de aanroep doet niets, er is niets om te tonen. Er is geen foutstand; `navigator.vibrate` mag zonder foutmelding mislukken. Tot de instellingen geladen zijn staat de poort open (standaard aan); dat is een enkele tik hoogstens.

## 3. Bladen volgen je vinger

### Wat er al is

Elk blad sluit nu met het kruisje, een tik op de waas of de terugknop. `useSheetClose` regelt de uitloop van 200 ms (`closing` zet de uitgaande klassen) en roept `useBackToClose` aan, dat via `utils/backLayers.ts` één geschiedenisstap neerzet, de terugknop afhandelt en `canClose` respecteert. `ProposalSheet` geeft `() => !busy` mee zodat het niet sluit terwijl Akkoord bezig is. Er is geen sleepgebaar op een blad. Het gedeelde stuk voor het slepen met de vinger, `useVerticalDrag`, is voor een lijst met doelen (met `pointer`-events op `window`) en niet geschikt voor een blad dat scrolt, zie de risico's.

De algemene regel `.animate-sheet-in, .animate-sheet-out` zet `max-height`, `overflow-y: auto` en `overscroll-behavior: contain` op het paneel. Sommige bladen scrollen binnenin (`st-sheet-body`, de inhoud van `TodaySheet`, `SheetFrame`), andere niet.

### Wat er nieuw komt

Een blad omlaag slepen om te sluiten. Het blad volgt je vinger 1 op 1. Laat je los, dan gaat het dicht als je ver genoeg of snel genoeg ging; anders veert het zachtjes terug op zijn plek. Het gaat door de bestaande sluitweg, zodat de terugknop, de geschiedenisstap en `canClose` hetzelfde doen als bij het kruisje.

#### Waar je kunt beginnen

- Aan de greep bovenaan (het streepje) en aan de kop. Dat is een zone van de bovenste 72 px van het paneel. Daar valt niets te scrollen, dus het gebaar is altijd van het blad.
- In de inhoud alleen als de inhoud bovenaan staat (alle scrollende voorouders tot aan het paneel hebben `scrollTop` 0) en de eerste beweging omlaag is. Is de inhoud al een stukje gescrold, dan scrolt de inhoud en doet het blad niets. Dat besluit valt bij het begin van het gebaar en verandert niet halverwege: begin je met scrollen en kom je bovenaan, dan neemt het blad het niet over. Dat voorkomt dat een flinke veeg omhoog en omlaag per ongeluk het blad sluit.
- Niet beginnen op velden en bedieningen die zelf slepen: invoervelden, schuifbalken en wat een `data-no-sheet-drag` krijgt (het toetsenblok van Forge `InputDock`, horizontale kiezers). Een gebaar dat vooral horizontaal is, wordt nooit overgenomen.

#### Hoe het gaat

- Volgen. Tijdens het slepen krijgt het paneel de eigenschap `translate` (geen `transform`) met de afstand omlaag. Naar boven past het niet mee (de afstand is minimaal 0), er is geen rek. De eigenschap `translate` staat los van `transform`, dus ze valt niet samen met de bladanimatie en hoeft die niet te onderbreken; dat voorkomt dat de ingang van het blad opnieuw begint.
- Loslaten. De pure functie `sheetRelease({ dy, velocity, height })` beslist: sluiten als het blad meer dan 30 procent van zijn hoogte omlaag is, of sneller dan 0,5 px per ms met minimaal 24 px afstand; anders terug.
- Terug. Onder de drempel gaat `translate` in 200 ms met ease-out terug naar 0. Geen stuiteren, geen overshoot.
- Sluiten. Voorbij de drempel roept de haak `requestClose` aan en laat de `translate` staan. De bestaande uitgang (`.animate-sheet-out`, `transform` van 0 naar 100 procent) loopt er dan overheen en het blad vervolgt zijn weg vanaf waar je vinger was, zonder sprong. Bij een snelle veeg is de uitgang 160 ms in plaats van 200, zodat het gebaar niet vertraagt.
- Waas. De waas volgt niet mee tijdens het slepen. Dat zou een eigen animatiepad nodig hebben, want de waas heeft een animatie met `both`. Hij fadet gewoon uit bij sluiten, zoals nu. Dat is een bewust gemis; zie de open keuzes.

#### Waar het zit

`useSheetClose` krijgt `sheetRef` en bindt in een effect de luisteraars aan het paneel zodra de ref er staat. De haak kent al `requestClose`, `closing` en `canClose`, dus alles wat de sluitweg moet respecteren zit al op één plek. Als `canClose` onwaar is (een import bezig, Akkoord loopt), dan wordt het gebaar niet opgepakt; het blad blijft staan zoals bij de terugknop.

Een blad hoeft maar één regel te krijgen: `ref={sheetRef}` op het paneel. Dat is de reden om het in `useSheetClose` te doen en niet in een nieuw los onderdeel. Er zijn ongeveer veertig bladen. Uitrol in golven, zodat elke golf getest kan worden:

1. De gedeelde bladen: `Sheet` en `ChoiceSheet` en `InfoSheet` in `settings/Sheet.tsx` (dat dekt de instellingen, de doelbladen en alle keuzes), `TodaySheet`, `SessionActionSheet`, `ProposalSheet`, `RescheduleDialog`.
2. De rest van de bladen, mechanisch: `LogDetailSheet`, `StageSheet`, `RunInsightSheet`, `MilestoneDetailSheet` en de andere.
3. Een eenvoudige controletest (bestand-scan) die faalt als een bestand `animate-sheet-in` gebruikt zonder `sheetRef`, zodat een nieuw blad dit niet kan vergeten. Bladen die bewust niet mogen sluiten door slepen (het toetsenblok van Forge, een wizard die eerst moet worden afgerond) markeren zichzelf met een uitzondering in dezelfde test.

#### Touch en events

Het blad scrollt zelf. Daarom werkt een `pointer`-gebaar met `touch-action: none` niet voor de inhoud: dat zou het scrollen in het hele blad weghalen. Het gebaar gebruikt `touchstart`, `touchmove` en `touchend` op het paneel, met `touchmove` als niet-passieve luisteraar die alleen bij een gebaar dat het blad overneemt `preventDefault` aanroept. Dat luisteren zit op het paneel zelf, niet op het document, zodat de rest van de app niet wordt vertraagd. `overscroll-behavior: contain` staat er al, dus de pagina eronder rekt of ververst niet.

De zone van greep en kop heeft geen scrollende inhoud, dus daar werkt het ook met de muis (pointer-events), handig om op een computer te testen. Het is dezelfde rekensom.

#### Pure functies met tests

`src/components/sheetDrag.ts`, zonder DOM:

- `sheetFollow(dy)` geeft `max(0, dy)`.
- `sheetRelease({ dy, velocity, height })` geeft `'close'` of `'back'`, met de drempels hierboven.
- `velocityOf(samples)` rekent de snelheid uit de laatste paar metingen (tijd en afstand), tolerant voor een enkel meetpunt.
- `canStartInContent(chain)` krijgt voor elke scrollende voorouder `{ scrollTop }` en geeft `true` alleen als ze allemaal 0 zijn.
- `dragIntent(dx, dy)` zegt of het gebaar verticaal genoeg is om over te nemen (`dy` minstens 8 px en `|dy|` groter dan `|dx|`).

Tests: net onder en net boven de afstandsdrempel, een snelle korte veeg, een langzame lange veeg, omhoog slepen (nul), een scrolstand van 1 px (geen overname), horizontaal gebaar, en een enkel meetpunt.

#### Ook ChoiceSheet en ProposalSheet

`ChoiceSheet` is een `Sheet` en krijgt dit dus vanzelf met de eerste golf. Het blad sluit nu na een keuze met een eigen timer van 240 ms (`closeRef.current?.()`), die blijft zoals hij is.

`ProposalSheet` heeft een eigen opbouw: een greep, een scrollende inhoud (`overflow-y-auto`) en knoppen onderaan die buiten de scroll staan. Beginnen mag aan de greep en aan de bovenkant van de inhoud (de titel staat in de scroll, dus de zone wordt de bovenste 72 px van het paneel); in de lijst met wijzigingen alleen als die bovenaan staat. Tijdens Akkoord (`busy`) is het gebaar uit, net als de tik op de waas.

#### Risico's

- Scroll. Het grootste risico en het eerste wat Lookout controleert: een blad met lange inhoud moet gewoon scrollen, ook als je er snel en schuin overheen veegt. Daarom beslist het gebaar bij het begin, en alleen bij een stand op `scrollTop` 0 plus een duidelijke beweging omlaag.
- Pull-to-refresh van Chrome Android. Die is al onderdrukt in de paneel via `overscroll-behavior: contain`; Lookout bevestigt dat de pagina eronder niet ververst bij een veeg omlaag op de bovenkant van een blad.
- Focus. Slepen verandert de focus niet. Na sluiten gebeurt wat er nu gebeurt. Een open toetsenbord (een invoerveld in een blad) blijft bij een veeg op de kop open totdat het blad dicht is.
- Schermlezer. Een veeg is geen vervanging voor het kruisje, want bij TalkBack is een veeg met één vinger anders. Het kruisje, de waas en de terugknop blijven de toegankelijke wegen en veranderen niet. De greep krijgt geen rol of label, want hij is versiering voor het gebaar.
- Terugknop. Het slepen is zelf geen laag. Sluiten door slepen gaat precies via `requestClose`, dus de laag in `backLayers` wordt op de gewone manier afgemeld. Een blad dat niet dicht mag (`canClose` onwaar) wordt niet opgepakt.
- Het blad dat net opent. Slepen tijdens de ingang van 280 ms is toegestaan: `translate` komt bovenop de lopende animatie en de afstand wordt niet verkeerd gemeten, want `translate` is los van `transform`.
- Gelaagde bladen (een blad over een blad). Het gebaar luistert alleen op het paneel waar de vinger op staat; het bovenste blad is dat altijd, want de waas van het bovenste dekt de rest.
- Uitgroei uit deel 1a. Het slepen werkt met de uitgroei samen: het paneel staat bij het slepen op zijn eindplek en het vlak is weg of in een fade. Een veeg in de eerste 100 ms van de uitgroei laat het vlak direct verdwijnen. Sherpa bouwt eerst deel 3 en pas dan deel 1a, zodat het slepen op zichzelf getest is.

#### Lege, laad en foutstand

Leeg: een blad met weinig inhoud heeft geen scroll, dus de hele inhoud is een zone voor het gebaar. Laden: een blad dat nog laadt (een draaier in een blad) is gewoon veegbaar. Fout: als het gebaar halverwege wordt onderbroken (`touchcancel`, de app gaat naar de achtergrond), veert het blad terug zoals bij een te korte veeg; er verandert niets.

## 4. Wat ik bewust niet doe

- Geen View Transitions API. Zie 1a voor de reden.
- Geen bibliotheek voor animatie, gebaren of veerkracht.
- Geen stuiteren of overshoot, ook niet bij terugveren.
- Geen animatie van hoogte, breedte of schaduw. Geen `clip-path` (niet overal door de grafische kaart versneld).
- Geen tik bij elke dag die je tijdens het slepen passeert, bij het loslaten, bij bladen die sluiten, of bij een melding.
- Geen trillen dat het signaal van de rusttimer in Forge overneemt of aanpast; dat blijft zijn eigen keuze.
- Geen animatie van de tabbalk en geen animatie op een tabwissel (blijft een korte fade, zoals nu).
- Geen uitgroei voor kleine menu's of dropdowns; alleen voor bladen die uit een rij of kaart komen.
- Geen verplaatsing van rijen op Vandaag in deze ronde.
- Geen nieuw token, geen nieuwe kleur, geen losse hexwaarde.
- Geen scherm dat langer op een animatie wacht dan 400 ms, en niets dat de tik van een gebruiker negeert.
- Geen wijziging aan de planning, het slot, het voorstelblad of `planGolden.test.ts`. Dit ontwerp raakt alleen de presentatie.

## 5. Bouwplan voor Sherpa

Kleine stappen, elk met eigen controles (`tsc`, `lint`, `vitest`, `build`) en elk op zichzelf terug te draaien. Branch `claude/vloeiende-overgangen`. Volgorde: eerst de tik (klein en zonder risico), dan het blad volgen (dat levert `sheetRef`), dan het schuiven van rijen, en als laatste de uitgroei. Zo bouwt elke stap op iets dat al getest is.

Stap 1, de poort voor beweging in code. Een kleine pure functie `allowsTravel(mode)` (true alleen bij `full`) en `allowsFade(mode)` (true bij `full` en `calm`), naast `resolveMotion` in `engine/motionSettings.ts`, met tests. Dit is de ene plek waar `element.animate()`-code zijn toestemming haalt.

Stap 2, de instelling Trillen. De zes plekken uit deel 2, `resolveHaptics` met test, de poort in `utils/haptics.ts` met `setHapticsEnabled`, één constante voor de duur van de tik, de hook die de instelling doorgeeft op de plek waar `useMotionAttribute` staat, en een test dat `tap` en `success` stil zijn met de poort dicht terwijl `alarm` en `pattern` doorgaan. Daarna één nieuwe tik: Akkoord in `ProposalSheet` en `RescheduleDialog`.

Stap 3, de rekensom van het bladgebaar. `components/sheetDrag.ts` met `sheetFollow`, `sheetRelease`, `velocityOf`, `canStartInContent` en `dragIntent`, en hun tests. Alleen pure functies, nog geen scherm.

Stap 4, de haak. `sheetRef` in `useSheetClose` met de luisteraars (`touchstart`, niet-passieve `touchmove`, `touchend`, `touchcancel`, plus pointer voor de kopzone), `translate` volgen, terugveren, `requestClose` voorbij de drempel, `canClose` respecteren. Een test voor de haak met nagemaakte events (de bestaande tests voor `backLayers` geven het voorbeeld voor een nagemaakte omgeving). Nog geen blad gebruikt hem.

Stap 5, eerste golf bladen: `Sheet` (dekt `ChoiceSheet`, `InfoSheet` en alle doelbladen), `TodaySheet`, `SessionActionSheet` (in `SheetFrame`), `ProposalSheet`, `RescheduleDialog`. Een regel per blad. Daarna een Lookout-ronde: op 360 en 390 px met vertraagde processor, in Normaal, Rustig en Uit, met een blad van lange inhoud (de Uitleg van een instelling, het actieblad met voorgestelde dagen), met TalkBack en de terugknop, en met een blad waarvan `canClose` onwaar is.

Stap 6, tweede golf: de overige bladen, mechanisch, met de controletest die een blad zonder `sheetRef` vangt en een lijst met bewuste uitzonderingen (het toetsenblok van Forge, wizards).

Stap 7, het schuiven van rijen (1b). `components/flip.ts` met `flipDeltas`, `flipDuration` en `applyOverride` en hun tests. Dan `useFlipList` met `armFlip`, het wachten op het blad, en de uitzondering voor Rustig en Uit. Aansluiten in `Week.tsx` (`moveTo`, `applyProposal` na Akkoord, Ongedaan maken) en `useWeekDrag` (het beginpunt van de zwevende rij), en de `rise` in `WeekPlanner.tsx` vervangen in Normaal. Lookout controleert: een verplaatsing met slepen, met het actieblad, Akkoord op een voorstel van de weekcontrole en Ongedaan maken, op 360 px met vertraagde processor, en dat een achtergrondsynchronisatie nooit beweegt.

Stap 8, de uitgroei (1a). `data-sheet-from` op de rijen en kaarten, de luisteraar die de laatst aangetikte rij onthoudt, `growPlan` en `growKeyframes` met tests, de hook in `useSheetClose` (open en dicht, met 240 ms uitloop alleen bij uitgroei), de twee CSS-regels voor `data-grow`. Begin met Week, controleer, en voeg dan Vandaag, Logboek en Ascend toe. Lookout kijkt vooral naar: het beeld in de eerste 60 ms, een rij vlak onder het scherm of onder de lucht, een rij die tijdens het openen wegscrolt, de terugknop midden in de uitgroei, en dat het uit staat in Rustig en Uit.

Stap 9, beschrijving en afronding. Een besluit in `docs/beslissingen/` (`JJJJ-MM-DD-vloeiende-overgangen.md`) volgens het sjabloon, een korte regel in het blok Beweging van `CLAUDE.md`, de helptekst van Beweging (`settingsHelp.ts`) bijwerken met wat Rustig nu weglaat, en de uitslag van de controles. Warden kijkt of `backLayers` en `canClose` niet zijn omzeild, of er nergens `className`-gokken zijn die bij een wisseling van `closing` verloren gaan, en of `planGolden.test.ts` niet beweegt.

## 6. Samenvatting

1. De uitgroei uit een rij bouwen we met een eigen FLIP (een stil vlak in `--color-card` dat van rij naar blad groeit, alleen transform en opacity). De View Transitions API laten we liggen: ze bevriest het scherm, vecht met de lagen en de terugknop en rekt tekst op.
2. De uitgroei hangt aan `useSheetClose` en aan een attribuut `data-sheet-from` op rijen en kaarten, zodat de veertig bladen niets of één regel hoeven te krijgen. Geen rij gevonden, Rustig of Uit: het huidige blad.
3. Een verplaatste training schuift via een FLIP over de lijst, op id, na een handeling (slepen, actieblad, Akkoord, Ongedaan maken), vanaf de plek waar je losliet, en wacht tot een blad weg is. Alleen Week.
4. De helper `haptics` bestaat al en wordt al op veel plekken gebruikt, zonder instelling. Nieuw is de schakelaar "Trillen" (standaard aan) met alle zes plekken, de poort in de helper, en één nieuwe tik: Akkoord. Oppakken bij slepen, afvinken en schakelaars bestaan al.
5. Bladen volgen je vinger: omlaag slepen aan greep en kop, in de inhoud alleen bovenaan, drempel 30 procent of een snelle veeg, terugveren in 200 ms, sluiten via `requestClose` zodat de terugknop en `canClose` hetzelfde doen. Het gebaar gebruikt de eigenschap `translate`, los van de bladanimatie.
6. Alles 150 tot 400 ms, ease-out, zonder stuiteren, alleen transform en opacity, geen lus. Normaal alles, Rustig zonder reizende beweging, Uit en beperkte beweging op de eindstand.
7. Bouwvolgorde: eerst de poort, de tik en het bladgebaar, daarna de rijen, dan de uitgroei. Zo is elk deel getest voordat het volgende erop rust.

## 7. Open keuzes voor de eigenaar

1. Een uitgroei die in Rustig wegvalt, of ook in Rustig? Advies: wegvallen. Rustig bewaart de bestaande bladen en de korte fade; wat over het scherm reist is voor Normaal. Wil je dat anders, dan is het één regel in `allowsTravel`.
2. Zijn de tikken die er al zijn (`Chip`, `Segmented`, `Stepper`, `ChoiceStrip` en dergelijke) genoeg of te veel? Advies: laten staan en alleen Akkoord toevoegen. Vind je het op je telefoon te veel, dan haal je er een paar weg in plaats van de hele schakelaar uit te zetten.
3. De duur van de tik: 10 ms is op veel Android-motoren te kort om te voelen. Advies: 15 ms als begin, en jij beoordeelt het op je eigen telefoon. Dit kan Lookout niet voelen.
4. Moet "Trillen" ook het trilsignaal van de rusttimer uitzetten? Advies: nee, dat blijft onder Signaal in Forge. Anders zou een schakelaar in Vandaag en meldingen stilletjes een keuze in Forge overrulen.
5. Moet de waas meebewegen bij het wegslepen van een blad? Advies: nee in de eerste versie, hij fadet uit bij sluiten. Het is een extra animatiepad voor een klein effect. Valt het op je telefoon tegen, dan komt het erbij.
6. Zijn de bladen die in één keer dicht gaan (Week sluit het actieblad met `setSelected(null)` na een handeling) genoeg zonder krimp naar de rij? Advies: ja. De krimp is voor sluiten met het kruisje, de waas of de terugknop; na een handeling is het scherm dat verandert de bevestiging.
7. Ook Vandaag laten schuiven bij het verplaatsen van een training? Advies: later, na een kijkronde op Week. Vandaag toont weinig rijen en de huidige weg is vooral het actieblad.
8. De uitgroei is het onderdeel met de meeste kans dat het op de telefoon minder mooi is dan op papier (het effen vlak onder de tekst van de rij). Wil je dat Sherpa dat laatst bouwt en dat jij het eerst op je telefoon beoordeelt voordat het voor alle bladen aan gaat? Advies: ja, zo staat het in het bouwplan: stap 8, eerst alleen Week.
