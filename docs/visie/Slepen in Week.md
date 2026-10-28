# Slepen in Week

Ontwerp van Cartographer. Geen code. Status: voorstel, wacht op de eigenaar.

Aanleiding: de eigenaar vindt het slepen van doelen op de Ascend-tab mooi en soepel (`src/components/ascend/GoalList.tsx`, besluiten `docs/beslissingen/2026-10-26-ascend-tab-als-doelen.md` en `-gebouwd.md`) en wil hetzelfde op Week: een training naar een andere dag slepen in plaats van het actieblad te openen, "Verplaatsen" te kiezen en een dag te zoeken.

## 1. Uitgangspunten

Slepen is een snellere hand, geen nieuwe regel. Wat er na het loslaten gebeurt, is precies wat er nu gebeurt na "Verplaatsen": dezelfde functie, hetzelfde slot, dezelfde melding met Ongedaan maken. Alles wat de planning verder verandert dan jouw eigen verplaatsing, blijft een voorstel met Akkoord.

Wat er tijdens het slepen te zien is, komt uit de bestaande regels, niet uit nieuwe. De 48 uur tussen zware beendagen, de rustdag, de weekmelding en de stille regel met de beenindex bestaan al. Slepen laat ze alleen eerder zien, op het moment dat het nog niets kost.

Het eerste antwoord blijft de missie van vandaag. Slepen is een gebaar op de Week-tab en verandert niets aan Vandaag.

## 2. Wat er nu is

Een tik op een rij opent `SessionActionSheet`. Daar kies je "Verplaatsen" en zie je tot drie voorgestelde dagen (`engine/moveSuggestions.ts#suggestMoveDates`) of "Andere dag kiezen" met een datumveld. Beide eindigen bij `Week.tsx` in dezelfde twee regels: `moveSession(id, datum)` rekent het voorstel uit (`scheduler.ts#proposeMove`, met de buurweken erbij) en `applyProposal` schrijft het weg, met `lock: { by: 'user' }`, `status: 'moved'`, `movedFromDate` en de melding `ChangeNotice` met Ongedaan maken. Is het voorstel schoon (`resolved` en één wijziging), dan gaat het meteen. Is er een botsing, dan opent `RescheduleDialog`: bij een cascade met "Liever niet" en "Akkoord", bij een botsing die niet op te lossen is met "Liever niet" als hoofdknop en "Toch verplaatsen" als tweede. In dat blad staat ook de stille regel met de beenindex (`useLegMoveNotes`, `engine/legDayEase.ts#moveLegNote`).

De weekcontrole (`weekNoticeFor`, `engine/weekConcerns.ts`) leest de getoonde week met `reportYours`, dus ook wat jij zelf verplaatst hebt. Zet je een training op je rustdag, dan zegt de kaart "Let op" dat achteraf, met de tekst "op je rustdag" in de rij en eventueel "Bekijk voorstel".

`GoalList` doet het slepen zo: een greep van 44 bij 44 px (`Icon name="greep"`, `touchAction: 'none'`), pointer events op `window` zodra je de greep aanraakt, een `requestAnimationFrame`-lus die de pagina (`#app-scroll`) 10 px per beeld laat scrollen binnen 90 px van de bovenkant of 130 px van de onderkant, de kaart die met `translateY` meekomt (met correctie voor de scrolpositie), een mint lijn op de plek waar hij landt en een toetsenbordweg (spatie pakt op, pijltjes verplaatsen, spatie laat los, Escape of Tab annuleert) met een `aria-live`-regel. De kaarten schuiven tijdens het slepen niet. Er is geen aparte animatie, dus er valt voor Rustig en Uit niets uit te zetten. Het slepen is geen laag in de terugknop; het loslaten opent hoogstens een blad, en dat is wel een laag.

## 3. Hoe het voelt en eruitziet

### De rij met een greep

Een training die je mag verslepen krijgt rechts in de rij de greep, dezelfde als op Ascend: `Icon name="greep"` van 22 px in een tikdoel van 44 bij 44 px, gedempt (`--color-ink-dim`), met `-mr-2` zodat hij niet breder maakt. De lege cirkel "Gepland" die op deze plek stond, vervalt voor deze rijen; de schermlezertekst "Gepland" gaat naar het label van de greep. Alle andere rechterelementen blijven: het horloge-icoontje, de pil "Vandaag", het vinkje van een gedane training. Een rij die je niet mag verslepen (gedaan, voorbij, rustdag, wedstrijd) heeft geen greep, en zo ziet de lijst in één blik wat beweegt.

Op 360 px breed is de kaart 328 px, binnen de rij blijft dan ruim 120 px voor de naam naast de pil "Vandaag" (schijf 44, twee tussenruimtes van 12, greep 36 zichtbaar, pil rond 64). De naam mag al afbreken (`break-words`), dus het past, maar dit is het eerste wat Lookout op 360 px nakijkt.

De rij zelf blijft een tikdoel van minstens 64 px en opent het actieblad zoals nu. De greep alleen laat slepen. Een korte tik op de greep, zonder te slepen, opent het actieblad direct op de stap "Verplaatsen". Dat is ook de weg voor wie met TalkBack dubbel tikt.

### Oppakken

Aanraken van de greep en meer dan 6 px verticaal bewegen pakt de training op. Eerder loslaten telt als tik. Er is bewust geen lang drukken nodig: de greep heeft `touch-action: none`, dus de browser pakt het gebaar niet af, precies als bij Ascend. Lang drukken op de hele rij is aantrekkelijk maar riskant op Android (tekstselectie, contextmenu, de browser die het scrollen overneemt en een `pointercancel` stuurt). Zie de open keuzes.

Bij het oppakken doet de app vier dingen, zonder dat de lijst ook maar een pixel verspringt:

1. De rij blijft op zijn plek staan als stille plaatshouder: de inhoud verdwijnt (onzichtbaar, de hoogte blijft) en er staat een gestippelde cirkel in `--color-control-border`, dezelfde als de rij "Vrij". Zo is te zien waar hij vandaan komt.
2. Een zwevende kopie van de rij volgt je vinger. Dit verschilt met Ascend, waar de kaart zelf meeschuift. De week staat in een kaart met `overflow-hidden` en rijen die afgeknipt zouden worden, daarom is de kopie een vast element in een `Portal` (bestaand onderdeel) met dezelfde breedte en dezelfde linkerkant als de rij, alleen verticaal bewegend. Hij heeft de achtergrond `--color-raised`, een rand in `--color-action` en dezelfde schaduw als de opgepakte `GoalCard`. Omdat hij aan het scherm vastzit, is de correctie voor scrollen niet meer nodig.
3. De dagen die niet kunnen worden gedempt tot 45 procent: voorbije dagen, vakantie en tocht, de dagen na je doel en de dagen dat je ziek bent. Dagen waar het wel kan blijven zoals ze zijn.
4. Een korte tik in de vinger (`haptics.tap`, bestaat al; op iPhone gebeurt niets). Alleen bij oppakken, niet bij elke dag die je passeert.

### Het doelvak: de dag onder je vinger

Waar GoalList een lijn toont tussen twee kaarten, is het doel hier een hele dag. De dag onder je vinger krijgt een doelvak: een ring van 2 px in `--color-action` (mint) binnen het dagblok, met een lichte mint tint (`--color-action-muted`) erachter. Het is hetzelfde mint als de lijn op Ascend, en het is het ene accent van het scherm, dus er is nooit meer dan één doelvak.

Wat de dag onder je vinger zegt, staat op twee plekken.

Op de dag zelf een klein label van hoogstens 28 tekens, rechtsboven op de rand van het dagblok, 12 px, `--color-ink` op `--color-raised` met een rand in de toonkleur. Het legt niets over de rij heen en verschuift niets. Voorbeelden: "Vrije dag", "Samen met Benen A", "Dicht op Benen A", "Je rustdag", "Vakantie", "Dag is voorbij", "Vol".

Onderaan het scherm, boven de tabbalk, één vaste regel van hoogstens twee regels, in de stijl van `Card` met 14 px tekst. Daar staat de hele zin, met het droge feit eerst (stem van ASCEND). Staat je vinger in het onderste derde van het scherm, dan springt de regel naar boven onder de lucht, zodat je vinger hem nooit bedekt. Dit is het onderdeel dat het meest op een echte telefoon beoordeeld moet worden; valt het tegen, dan blijft alleen het label op de dag over.

De toon van het doelvak:

- Mint: de dag past. "Dinsdag 28 oktober. Vrije dag." Of "Dinsdag 28 oktober. Samen met Rustige duurloop, samen 105 min." Is de combinatie volgens `engine/dayOrder.ts` beter niet op één dag, dan staat daar ook "Beter niet op één dag."
- Amber (`--color-warning`, de ring en het label): er klopt iets niet, maar het is jouw keuze of er volgt een voorstel. "Donderdag 30 oktober. Dicht op Benen A, ook zwaar voor benen. Liefst 48 uur ertussen. Als je loslaat, krijg je een voorstel." Of "Dit is je rustdag. Als je loslaat, vraagt ASCEND eerst of je dat echt wilt." Of de stille regel met de beenindex, letterlijk die van `moveLegNote`: "Op vrijdag is je beenindex ongeveer 14. Dat is moe. Je kunt hem zo plannen, of een dag later." Of een nieuwe melding van de weekcontrole op de nieuwe stand: "Twee harde loopjes op dinsdag."
- Gedempt gestippeld in `--color-control-border` (geen kleur): de dag kan niet. De zin zegt waarom: "Zaterdag is een vakantiedag." "Die dag is al voorbij." "Die dag zit vol." Loslaten doet niets.

Rood wordt niet gebruikt. In deze app is amber "let op" en rood is een fout (`--color-danger`); een botsing is geen fout, het is een afweging waarvoor ASCEND een voorstel doet.

De dag van de training zelf toont "Hier staat hij nu". Loslaten daar verandert niets en zegt niets.

### Scrollen tijdens het slepen

Dezelfde lus als GoalList, met dezelfde grenzen (90 px boven, 130 px onder, 10 px per beeld), in de gedeelde hook (zie het bouwplan). De dagen worden elk beeld opnieuw gemeten met `getBoundingClientRect`, zodat het doelvak ook goed is terwijl de pagina scrolt. Tijdens het slepen verandert er niets aan de hoogte van de pagina (geen label in de stroom, geen kaart die opent), dus de pagina verspringt niet.

De dag onder je vinger bepaalt het doel: valt de vinger in een dagblok, dan is dat de dag; tussen twee blokken de dichtstbijzijnde. Boven de eerste dag of onder de laatste kom je op maandag of zondag, tot 48 px erbuiten. Verder weg is annuleren: het doelvak verdwijnt, de zin onderaan zegt "Loslaten laat hem staan", en loslaten doet niets. Zo is er een manier om te stoppen zonder Escape.

### Beweging

De vinger volgen is directe bediening en blijft in elke stand 1 op 1, zoals bij Ascend. Verder is er niets dat beweegt: het doelvak en het label verschijnen en verdwijnen meteen. Na het loslaten krijgt de verplaatste rij in Normaal één keer `animate-rise-in` (kort, ease-out, geen transform die achterblijft) op zijn nieuwe dag. In Rustig en Uit, en bij `prefers-reduced-motion`, staat hij zonder animatie op zijn plek. Het teken dat hij is verplaatst blijft in alle standen zichtbaar: de rij zegt al "verplaatst" in ijsblauw (`note` in `SessionRow`). Een nieuwe klasse in `src/index.css` is dus niet nodig.

## 4. Wat sleepbaar is

Het criterium komt uit `engine/weekValidator.ts#lockLevel` en de rol van het sjabloon.

Nooit: niveau 0, een training die gelogd is of waarvan de dag voorbij is (`lockLevel` geeft 0). Geschiedenis wordt niet herschreven. Ook niet: een overgeslagen training (die komt terug met "Toch doen" in het actieblad), een rustdag of herstelwandeling (`template.type === 'recovery'`, het actieblad biedt daar ook niets aan), en een training die een vakantie of tocht heeft neergezet (`PlannedSession.leave`; de periode is de eigenaar, die verwijder je daar).

Ja, zonder meer: niveau 3, wat het systeem plande, en niveau 1, wat van jou is of door een voorstel vastgezet werd. Die van jou mag je opnieuw verslepen; het slot blijft `by: 'user'`. Een training die terug op zijn eigen dag komt (`movedFromDate`) wordt weer van het systeem, zoals `applyProposal` het al doet.

Een test: sleepbaar, maar loslaten opent altijd het blad met Akkoord, ook als alles schoon is. Zo blijft het "alleen via voorstel" van niveau 2, en de reden staat in het blad: "Een testloop verplaats je alleen met Akkoord."

Een wedstrijd: niet sleepbaar, geen greep. De dag van de wedstrijd hoort bij het doel, en het blok eromheen (afbouw, herstel) hangt aan die dag. Je verplaatst haar via het doel op de Ascend-tab, waar dat al een voorstel is. Het is de enige uitzondering op de opdracht om ook wedstrijden mogelijk te maken; zie de open keuzes.

Twee trainingen op één dag zijn mogelijk, onder dezelfde grens als de voorgestelde dagen: een derde training op een dag kan nooit ("Die dag zit vol", gedempt, kan niet), en past de tijd (`dayHasRoomFor`) dan staat de training erbij en zegt het label "Samen met ...". Past de tijd niet, of heb je ingesteld dat je geen twee trainingen per dag wilt, dan is de dag amber en vraagt loslaten het eerst: "Samen 140 min, meer dan je die dag wilt trainen." De volgorde binnen de dag blijft zoals ASCEND hem adviseert (`dayOrder`); slepen om de volgorde op een dag te wisselen is er niet.

De rustdag is een dag die mag, maar niet stil. Hij is amber en loslaten opent `RescheduleDialog` in de stand "kan niet zonder jouw woord": "Liever niet" is de hoofdknop en "Toch verplaatsen" de tweede. Dat is dezelfde afspraak als bij een botsing die niet op te lossen is. Het blad herhaalt de reden: "Dit is je rustdag. Een rustdag is er om te herstellen." Dagen die de planning vrij houdt (vakantie, tocht, de dag van je doel en later, je ziekte) kunnen niet, in lijn met de voorgestelde dagen van `suggestMoveDates`. Een zware training op de lichte dag voor of na een tocht ook niet, om dezelfde reden als daar.

Een andere week: nee, niet met slepen. Mijn advies is om de dagen van de getoonde week het doel te laten zijn. Een week laten omslaan terwijl je een training vasthoudt is lastig te besturen en maakt de dagen onder je vinger onvoorspelbaar. Het kleine geval dat het echt nodig heeft, zondag naar maandag, blijft kunnen via het actieblad, dat dagen in de volgende week voorstelt. De engine (`moveSession` kijkt al naar de buurweken) kan het later zonder aanpassing; zie de open keuzes voor wat daarvoor nodig is.

## 5. Wat er bij loslaten gebeurt

Er is één besluit, in de engine, en het wordt gebruikt voor het slepen én voor het actieblad, zodat beide wegen niet uit elkaar kunnen lopen: `decideMove(proposal, { askAlways, ask })` geeft `'none'`, `'apply'` of `'ask'`.

Schoon: dezelfde dag, niets te doen, `'none'`. Zelfde dag laat de rij staan, zonder melding.

Een gewone verplaatsing: `moveSession(id, datum)` geeft een schoon voorstel met één wijziging, `'apply'`. Dan `applyProposal(proposal)`, precies de regel die nu in `Week.tsx` staat. Het slot (`lock: { by: 'user', at }`), `status: 'moved'` en `movedFromDate` zijn die van `applyProposal`, en `ChangeNotice` toont "X verplaatst" met Ongedaan maken, klapt in en verdwijnt na tien minuten zoals altijd. Er komt geen eigen melding bij.

Een botsing van twee zware beendagen binnen 48 uur: `moveSession` geeft een cascade (twee wijzigingen) of een voorstel dat niet te herstellen is. Dat is `'ask'`: `RescheduleDialog` opent met beide verplaatsingen, de reden uit `proposeMove`, de stille regel met de beenindex, en "Liever niet" / "Akkoord" (cascade), of "Liever niet" als hoofdknop met "Toch verplaatsen" (niet te herstellen). Tijdens het slepen stond de botsing al amber in beeld, dus het blad is geen verrassing. Bij "Liever niet" staat de training waar hij stond, want er is niets weggeschreven. Wat in de cascade meeverhuist, ook een training die van jou was, staat met naam in het blad en gaat alleen met jouw Akkoord. Er is hier geen nieuw blad; dit is het bestaande.

Een rustdag, een dag waar de tijd niet past, of een test: `'ask'` met `RescheduleDialog`, met een eigen reden in plaats van de cascade-reden (de engine zet `resolved: false` en de zin). Voor de test is het voorstel wel schoon, dus daar staan "Liever niet" en "Akkoord" naast elkaar.

Een melding van de weekcontrole die door jouw verplaatsing ontstaat (twee harde loopjes op een dag, twee volle lange trainingen, een zware training na je test): die verplaatsing blijft jouw keuze en wordt niet tegengehouden. Je zag het tijdens het slepen in de zin onderaan. Na het loslaten verschijnt de bestaande kaart "Let op" met de tekst in de rij en de knop "Bekijk voorstel", via `WeekNotice` en `ProposalSheet`. Dat voorstel is het bestaande `planWeekFix`, met Akkoord. Daarmee verandert er bij slepen niets aan hoe de weekcontrole omgaat met wat van jou is: ze rapporteert, ze verandert niets stil.

De kaart "Let op" kan boven de lijst verschijnen en de lijst een stuk omlaag duwen op het moment dat je loslaat. Dat is storend omdat de rij die je net verzette dan wegschuift. Het wordt bij de bouw nagekeken (scroll-verankering, of de kaart pas een beeld later laten verschijnen). Zie het bouwplan.

Mislukt het wegschrijven of het uitrekenen (`moveSession` gooit, `applyProposal` faalt), dan staat de training nog op zijn oude dag, want er is niets bewaard. De zin onderaan zegt vier seconden "Dat lukte niet. De training staat nog op zijn dag." en `aria-live` leest hem voor. Er komt geen stille mislukking.

## 6. Toegankelijkheid

Toetsenbord (en schakelaars en een extern toetsenbord), zoals GoalList: de greep is een `button` met `aria-pressed`. Spatie of Enter pakt op en zegt "Dinsdag 28 oktober, vrije dag". Pijl omlaag en omhoog gaan naar de volgende dag die kan, en slaan dagen die niet kunnen over (zoals `landingIndex` in GoalList plekken overslaat); elke stap zegt dag, datum en uitkomst, ook de amberzinnen ("Donderdag 30 oktober, dicht op Benen A, liefst 48 uur ertussen, je krijgt een voorstel"). Spatie laat los en doet wat loslaten met de vinger doet. Escape of Tab annuleert en zegt "Niet verplaatst". Is er geen dag die kan, dan zegt de aankondiging dat. Alle zinnen zijn dezelfde als die onderaan het scherm: een bron, twee uitingen.

Het label van de greep: "Verplaats Benen A, nu op maandag. Spatie pakt op, pijltjes kiezen een dag, spatie laat los, Escape annuleert." Voor een rij die al verplaatst is staat "verplaatst" erbij zoals nu in de rij.

Schermlezer: de vaste regel met de uitleg is `aria-live="polite"` en `aria-atomic`, de plaatshouder en het doelvak zijn `aria-hidden`. TalkBack stuurt bij dubbel tikken een klik, geen pointer-gebaar, daarom opent een klik op de greep het actieblad op "Verplaatsen" (zie hierboven). Na het loslaten krijgt de greep van de verplaatste rij op zijn nieuwe plek de focus terug, zodat toetsenbordgebruikers niet bovenaan beginnen.

Het actieblad blijft de tweede weg en dus de volledige: met drie voorgestelde dagen, "Andere dag kiezen", de volgende week, en "Toch doen" voor overgeslagen trainingen. Wie het slepen uitzet, merkt niets anders dan dat de grepen weg zijn.

Kleur is nooit het enige signaal: elk doelvak heeft ook een label en een zin, elke dimming heeft een reden in woorden als je er boven hangt.

## 7. De instelling

Alles is instelbaar, dus: "Trainingen slepen in Week", aan of uit, standaard aan. Eén zin uitleg achter de InfoButton: "Sleep een training met het greepje naar een andere dag. Het gaat zoals Verplaatsen in het actieblad. Uit haalt de grepen weg." En korte punten: wat een botsing met je doet, dat een test altijd om Akkoord vraagt, dat de wedstrijd er niet bij hoort.

Een schakelaar in de rij, mint gedempt, volgens de afspraak voor instellingen. De plek is de groep Planning, direct onder "Voorstel bij een probleem in de week" (`weekvoorstel`), omdat het over hoe je met je planning omgaat gaat.

Wat daarvoor moet gebeuren, volgens de werkafspraak:

- `AppSettings.dragWeek?: boolean` in `src/storage/database.ts`; afwezig betekent aan (zoals `weekFixProposal`).
- `src/storage/backup.ts`: de sleutel bij de lijst booleans die bij het terugzetten gecontroleerd worden (de regel met `weekFixProposal`).
- `src/data/settingsIndex.ts`: `{ id: 'slepen-week', title: 'Trainingen slepen in Week', group: 'planning', note, keywords: ['slepen', 'verplaatsen', 'verslepen', 'greep', 'week', 'dag'] }`.
- `src/data/settingsLayout.ts`: `'slepen-week'` achter `'weekvoorstel'` in `PAGE_ROWS.planning.rows`.
- `src/engine/settingsSummary.ts`: `case 'slepen-week': return { checked: s.dragWeek !== false }` (zoals `weekvoorstel`), en `settingsDiff.ts`: `flag('slepen-week', ...)`.
- `src/data/settingsHelp.ts`: de uitleg, sleutel `slepenWeek`.
- `src/components/settings/groups/PlanningGroup.tsx`: `<SummaryRow id="slepen-week" title="Trainingen slepen in Week" facts={facts} info="slepenWeek" onChange=... />`.

De bestaande test die bewaakt dat elke instelling een plek heeft, vangt een gemiste stap. De Beweging-instelling hoeft niet te veranderen, het slepen leest haar niet.

## 8. Lege, laad en foutstanden

Leeg: een week waarin niets te slepen valt (alles gedaan of voorbij, of alleen rustdagen) toont gewoon de lijst zoals nu, zonder grepen en zonder hint. Een uitgezette instelling doet hetzelfde. Er komt geen uitlegtekst in beeld; de greep is dezelfde als op Ascend en de instelling noemt hem. Een toekomstige week zonder planning toont de rijen "Vrij", die geen greep hebben.

Laden: de pagina toont eerst de opgeslagen gegevens en synchroniseert op de achtergrond (zie CLAUDE.md). Zolang er nog niets staat, zijn er geen rijen en dus geen grepen. De dagoordelen voor het doelvak worden bij het oppakken in één keer uitgerekend (zeven dagen, dezelfde functies als de voorgestelde dagen) en zijn direct klaar. De melding van de weekcontrole voor de dag onder je vinger is ongeveer 10 ms (zie de opmerking bij `weekNoticeFor`); de stille regel met de beenindex wordt pas berekend als je vinger 200 ms op een dag blijft, en komt dan aan de zin toe. Er is geen draaier: de eerste zin staat er meteen, de rest komt erbij.

Fout: faalt de uitgebreide berekening, dan blijft de eerste zin staan en wordt alleen het extra stuk weggelaten (net als `useLegMoveNotes`, dat de fout in de console zet en niets blokkeert). Faalt het wegschrijven, dan staat de zin uit paragraaf 5 er. Een `pointercancel` (de browser pakte het gebaar toch af, de app ging naar de achtergrond) annuleert zonder verandering. Een pagina die verdwijnt of een andere week die je kiest terwijl je sleept, ruimt de luisteraars op (dezelfde `cleanup` als GoalList).

Terugknop en scrollen: het slepen zelf is geen laag, zoals bij Ascend. Het blad na het loslaten wel (`useSheetClose` in `RescheduleDialog`). Tijdens het slepen schrijft niets het adres om en de scrolpositie wordt niet aangeraakt door de hook voor herstel. De pagina scrolt in `#app-scroll`, dus de hook leest die, niet het venster.

## 9. Wat ik bewust niet doe

- Geen lang drukken op de hele rij in de eerste versie. Het botst op Android met tekstselectie en het scrollen, en de greep werkt al betrouwbaar.
- Geen slepen naar een andere week, geen week die omslaat terwijl je sleept.
- Geen slepen om de volgorde binnen één dag te wisselen; dat adviseert `dayOrder`.
- Geen wedstrijd, geen overgeslagen training, geen rustdag, geen vakantie- of tochttraining en niets uit het verleden.
- Geen nieuw voorstelblad, geen nieuw slot, geen nieuwe melding. Alleen `RescheduleDialog`, `ProposalSheet`, `ChangeNotice` en `WeekNotice`.
- Geen rood, geen nieuwe kleur, geen nieuw token. Mint voor "past", amber voor "let op", ijsblauw alleen voor "verplaatst", gedempt voor "kan niet".
- Geen vastzetten van de rij boven aan de pagina of gedeeltelijk verschuiven van andere rijen tijdens het slepen. Alleen het doelvak beweegt.
- Geen punten, rang of beloning voor het verplaatsen. Dit is gereedschap.
- Geen aanpassing van de planningsregels, `planGolden.test.ts` en de snapshots blijven onaangeroerd.
- Geen sleepgebaar op Vandaag. De missie van vandaag blijft één kaart met één knop.
- Geen hint of rondleiding bij het eerste gebruik.

## 10. Bouwplan voor Sherpa

Kleine stappen, elk met eigen controles (`tsc`, `lint`, `vitest`, `build`) en elk op zichzelf terug te draaien. Branch `claude/slepen-in-week`.

Stap 1, de regel wie mag, puur en getest. Nieuw bestand `src/engine/weekDrag.ts` met `dragEligibility(session, template, { logged, today })`: geeft `{ ok: true, askAlways }` of `{ ok: false, reason }` met reden `'history' | 'skipped' | 'rest' | 'race' | 'leave'`. Gebruikt `lockLevel`, `template.type` en `hasRole(template, 'race' | 'test')`. Tests: gelogd, vandaag niet gelogd, gisteren, overgeslagen, herstelwandeling, wedstrijd, test (ok met `askAlways`), vakantietraining, een eigen verplaatste training (ok).

Stap 2, het oordeel per dag, puur en getest. In `src/engine/moveSuggestions.ts` de gesloten functie `kept` (vakantie, tocht, lichte dag, rustdag, dag van het doel, ziekte) omzetten naar een geëxporteerde `keptDayReason(context, template, date, asOf)` die de reden teruggeeft, met `suggestMoveDates` die er hetzelfde mee blijft doen (de bestaande tests blijven groen en bewijzen dat). Daarna `dayVerdicts(...)` in `weekDrag.ts`: voor elke dag van de week `{ date, kind: 'origin' | 'free' | 'shared' | 'tight' | 'clash' | 'rest' | 'blocked', droppable, tone, chip, line, ask }`. Het gebruikt `findHeavyConflicts` (de botsing met naam en spieren), `dayHasRoomFor` en `dayOrder` voor de combinatie, en `keptDayReason`. Een dag met al twee andere trainingen is `blocked`. De zinnen zijn hier gemaakt, zodat de tekst op één plek staat en getest wordt. Tests: elke soort, een training op een dag met een andere, een derde, de rustdag, een tocht, een dag in het verleden, de dag van het doel, ziek, een botsing met twee beendagen, en dat nergens een gedachtestreepje in een zin staat.

Stap 3, het besluit bij loslaten, puur en getest. `decideMove(proposal, { askAlways, verdict })` in `weekDrag.ts` geeft `'none' | 'apply' | 'ask'` en, bij `'ask'` zonder cascade, het voorstel met `resolved: false` en de reden van de rustdag of de tijd. In `Week.tsx` de twee regels `moveSession`/`applyProposal` uit `onMove` verhuizen naar één functie `moveTo(id, datum)` die `decideMove` gebruikt, en het actieblad laten dezelfde functie aanroepen, zodat er maar één weg is (gedrag van het actieblad blijft gelijk: de tests van stap 3 tonen dat voor een gewone verplaatsing, een cascade en een niet-te-herstellen botsing). Alleen `Week.tsx`; `Today.tsx` heeft dezelfde twee regels en blijft in deze ronde ongemoeid.

Stap 4, de context. Twee kleine functies in `AppDataContext` naast `suggestMoves`, met dezelfde afhankelijkheden: `dragVerdicts(sessionId, weekStart)` en `previewDrop(sessionId, date)`. De tweede rekent `weekConcerns` op de week met de verplaatste training (met `lock: { by: 'user' }` en `status: 'moved'`, zodat `reportYours` hem meetelt) en geeft alleen de meldingen die er nu nog niet zijn; ze slaat LEG-SPACING over als `dayVerdicts` de botsing al meldt. De stille regel komt van het bestaande `useLegMoveNotes`.

Stap 5, de gedeelde hook. `src/components/useVerticalDrag.ts` uit `GoalList.tsx` trekken: de pointer-luisteraars op `window`, de `requestAnimationFrame`-lus voor het scrollen, het opruimen, de drempel van 6 px en het annuleren. De hook krijgt `locate(y)` (welk doel hoort bij dit y), `onChange(target, dy)`, `onDrop(target)` en `onCancel()`. De rekensom voor het scrollen (`edgeScroll(y, top, height)` geeft min 10, 0 of 10) wordt een kleine pure functie met test. `GoalList` gebruikt de hook zonder zichtbare verandering; dit is de enige stap die bestaand werk aanraakt, dus Lookout vergelijkt Ascend voor en na op 360 en 390 px. De toetsenbordafhandeling blijft per lijst, want de doelen zijn plekken en hier zijn het dagen, maar de zin voor de aankondiging komt uit dezelfde bron als de zin onderaan.

Stap 6, het scherm. `WeekPlanner.tsx`: `data-day` op elk dagblok, de greep in `SessionRow` (alleen als `dragEligibility.ok`, de instelling aan en geen blad open), de plaatshouder, het doelvak en het label, dimming van de dagen die niet kunnen. Twee kleine nieuwe onderdelen in `src/components/`: `WeekDragGhost.tsx` (de zwevende rij in een `Portal`) en `WeekDragNote.tsx` (de vaste zin met `aria-live`). Alleen `Card`-stijl, tokens en `Icon name="greep"`; geen nieuwe component in `ui.tsx` nodig. `Week.tsx` geeft de sleepstatus door en zet bij het oppakken `monthView` buiten spel.

Stap 7, het toetsenbord, de focus en de tik. Spatie, pijltjes, Escape en Tab zoals in `GoalList`. Na het loslaten de focus terug naar de greep van die training (op `data-session-id`). Een korte tik op de greep opent `SessionActionSheet` met een nieuwe optionele prop `startStep?: 'move'`.

Stap 8, de instelling uit paragraaf 7, met de test voor de plek van elke instelling.

Stap 9, controle. Lookout loopt het op 360 en 390 px door met een vertraagde processor, in Normaal, Rustig en Uit, met `prefers-reduced-motion` en met TalkBack. Aandachtspunten: de breedte van de rij met de pil "Vandaag", het springen van de zin onderaan, de kaart "Let op" die de lijst verschuift na loslaten, `overflow` en hoeken van de kaart, scrollen aan de randen op Android Chrome (geen pull-to-refresh, geen terugnavigatie), en dat de berekening van het label bij iedere dag onder de 16 ms blijft. Warden kijkt of het slot en `movedFromDate` hetzelfde zijn als bij het actieblad, en of `planGolden.test.ts` niet beweegt.

Een optionele stap 10 hangt van de eigenaar af: lang drukken op de rij (400 ms zonder beweging, met `touchmove`-onderdrukking en `contextmenu` uit), en slepen naar een andere week.

## 11. Samenvatting

Een training krijgt rechts een greep zoals op Ascend. Pak hem op, en je ziet de dagen waar het kan, het doelvak mint onder je vinger, amber bij een botsing met de 48 uur of een rustdag, en onderaan één zin die zegt wat loslaten doet, met de beenindex erbij. Loslaten gaat via dezelfde weg als "Verplaatsen": schoon is meteen klaar met Ongedaan maken, een botsing, een rustdag, een volle dag en een test openen het bestaande blad met Akkoord. Gelogd, voorbij, overgeslagen, rustdag, wedstrijd en vakantietrainingen zijn niet sleepbaar. Geen andere week in de eerste versie. Eén instelling, "Trainingen slepen in Week", in Planning. De mechaniek van GoalList verhuist naar één gedeelde hook, en de beslissing "mag het, en wat gebeurt er" wordt pure engine met tests.

## 12. Open keuzes voor de eigenaar

1. Oppakken met een greep of ook met lang drukken op de rij? Advies: alleen de greep. Het is betrouwbaar op Android en werkt zoals Ascend. Lang drukken komt in stap 10 als je het op je eigen telefoon toch mist.
2. Naar de vorige of volgende week slepen? Advies: nee. Zondag naar maandag kan via het actieblad. Wil je het toch, dan zijn twee stroken "Naar volgende week" en "Naar vorige week" boven en onder de lijst de rustigste manier, geen week die vanzelf omslaat.
3. Wedstrijd verplaatsen met slepen? Advies: nee, de dag hoort bij het doel en gaat via Ascend. Een test mag wel, altijd met Akkoord.
4. De rustdag als doel: amber met een vraag, of helemaal dicht? Advies: amber met een vraag. Het datumveld laat het nu ook toe, en dicht maken zou het slepen strenger maken dan het actieblad.
5. Een verplaatsing die een weekmelding oplevert, tegenhouden of toestaan? Advies: toestaan. Je zag het al tijdens het slepen, en daarna zegt de kaart "Let op" het met een voorstel. Alleen de 48 uur tussen zware beendagen vraagt al vooraf om een voorstel.
6. Een tik in de vinger bij het oppakken? Advies: ja, alleen bij het oppakken. Er is geen trilinstelling in de app; wil je er een, dan wordt dat een eigen besluit.
7. De zin onderaan het scherm die naar boven springt als je vinger laag staat: goed, of liever alleen het label op de dag? Advies: proberen op jouw telefoon. Valt het onrustig, dan blijft het label over en gaat de lange zin naar het blad na het loslaten.
8. Standaard aan of uit? Advies: aan, met de schakelaar in Planning.
