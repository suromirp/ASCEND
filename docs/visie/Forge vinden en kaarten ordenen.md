# Forge vinden en kaarten ordenen

Ontwerp van Cartographer. Geen code. Status: voorstel, wacht op de eigenaar.

Aanleiding: de eigenaar vindt Forge op Je stand "random" en moeilijk te vinden, en wil het slepen dat hij in Week (`docs/visie/Slepen in Week.md`, gebouwd in `useWeekDrag.ts`) en op Ascend (`GoalList.tsx`) fijn vindt overal gebruiken waar dat past.

## 1. Wat er nu is

Forge is een eigen pagina op `/forge` (`pages/Forge.tsx`, eyebrow "Stand", terugpad `/stand`). De enige ingang in de app is één rij op Je stand, midden in het blok "Belasting" (`pages/Standing.tsx`, regel 149 tot 157): na de grafieken Wekelijkse belasting, Intensiteit en Afdaling, vlak voor Krachtprogressie en Trainingsverdeling. De rij is een kaart met alleen het kopje "Forge" en een zin van 12 px, en staat er alleen als Kracht meerekenen aan staat (`strengthModelOn`). Verder wijst alleen het zoeken in de instellingen ernaar (`settingsIndex.ts`, route `/forge`), en `/kracht` stuurt door. Het trainingsscherm van Forge (`ForgeWorkout`) is een ander ding: dat opent via de missiekaart en het actieblad als je een krachttraining start.

Het probleem is dus tweeledig. De ingang staat tussen cijfers over belasting, terwijl Forge over kracht gaat, en ze is zo stil opgemaakt dat ze op een kopje lijkt. En kracht staat op Je stand verspreid: Forge, Krachtprogressie en Trainingsverdeling zijn drie losse dingen in één blok met afdaling en intensiteit.

De volgorde van kaarten is nu vast in code. Aan of uit gaat per kaart door een eigen instelling (`strengthModel.enabled`, `intensiteit tellen`, `OverviewSettings` voor Vandaag zoals weekterugblik, vraag van de week, ochtendcheck, weerregel). Er is geen instelling voor volgorde en geen algemeen aan/uit voor kaarten.

## 2. Waar Forge hoort

Er blijven vijf tabs. Dit zijn de opties.

### Optie A: een eigen groep "Kracht" op Je stand, Forge bovenaan

Je stand krijgt een blok met het kopje Kracht (`Eyebrow`) dat Forge, Krachtprogressie en Trainingsverdeling bij elkaar zet. Forge is de eerste kaart van het blok en krijgt het gewicht van een ingang: een gewone `Card` met de naam in Marcellus ("Forge"), onder de naam één regel die iets zegt over jouw kracht in plaats van een algemene uitleg, een pijl `Icon name="verder"` en een tikdoel van de hele kaart. De regel komt uit bestaande gegevens (`exerciseViews`/`comparisonRows`), droog feit eerst: "3 oefeningen gingen omhoog in 8 weken. Voorstel voor je volgende training staat klaar." Zonder gegevens: "Nog geen krachttrainingen ingelezen uit MacroFactor." Het blok staat bij Kracht, niet meer bij Belasting. Belasting houdt dan Wekelijkse belasting, Intensiteit en Afdaling.

Voor: wie Forge zoekt, zoekt kracht, en Je stand is waar de eigenaar het al verwacht (de pagina zelf zegt "Stand"). Het is één kleine verplaatsing plus een betere kaart, geen nieuw scherm. Tegen: Forge blijft een stap diep, en wie alleen een training wil starten, moet nog steeds via Je stand.

### Optie B: ingang op Vandaag bij de krachttraining

Op een dag met een krachttraining toont de missiekaart of het actieblad een rustige tekstknop "Forge" (`TextButton`) naast het voorschrift, met de regel "Wat ASCEND voorstelt en hoe je ervoor staat". Dat is context: je ziet het op het moment dat je het nodig hebt. Tegen: alleen op krachtdagen, dus Forge blijft onvindbaar op andere dagen, en Vandaag moet zijn ene vraag houden ("wat is mijn missie vandaag"); een tweede knop op de missiekaart schaadt dat. Als aanvulling kan het wel, als de knop alleen in het actieblad van een krachttraining staat.

### Optie C: een rij in het tandwielmenu of een plek in Logboek

In de instellingen staat Forge al als groep ("Forge", voor de instellingen). Dat is het verkeerde soort plek: instellingen zijn om dingen om te zetten, niet om je kracht te bekijken. Een plek in Logboek (bij een krachtlog de knop "Deze oefening in Forge", die `/forge` opent met de zoekterm ingevuld via `usePageState`) is goed als verwijzing vanuit een training, maar geen vaste plek: het Logboek is chronologisch en Forge is per oefening.

### Advies

Optie A als vaste plek, met als kleine aanvulling uit B een tekstknop "Forge" in het actieblad van een krachttraining en uit C de verwijzing in het logboek van een krachttraining, als aparte latere stappen. Waarom: één plek waar je Forge altijd vindt, bij de andere krachtcijfers, zonder zesde tab, zonder iets op Vandaag dat de missie verdringt. Het tandwiel blijft voor instellen.

Een tweede, klein advies voor Forge zelf: als Kracht meerekenen uit staat, verdwijnt de kaart nu helemaal, zodat Forge onvindbaar is voor wie hem nog niet heeft aangezet. De kaart blijft dan staan met de zin "Kracht meerekenen staat uit." en de knop "Aanzetten" (hetzelfde als de lege stand van de pagina zelf). Zo ontdek je Forge, en uitzetten verstopt hem niet stilletjes.

## 3. Slepen om kaarten te ordenen

### Waar het wel zin heeft

Slepen heeft zin waar de volgorde jouw voorkeur is en niets betekent voor de planning of de veiligheid.

Je stand is de duidelijke plek. De pagina is lang (zestien kaarten of meer in vier blokken), niet iedereen wil Benen eerst, en de eigenaar wil kracht bovenaan. Hier is de volgorde pure voorkeur.

Vandaag: nee, in de eerste versie. De volgorde is daar betekenis: bovenaan de missie, direct daaronder wat bevestigd moet worden (horloge, test), dan waarschuwingen, dan "Je dag". Die volgorde bepaalt in twee seconden wat je moet doen, en kaarten komen en gaan met de situatie (ochtend, rustdag, herstelsignaal). "Je dag" is een lijst van rijen op tijd en toestand (Ochtend, Training, Rekken, Morgen) en hoort niet versleept te worden. De kaarten onderaan (Stand in het kort, Losse training, citaat) zijn kleine voorkeur en niet de moeite waard.

Ascend (doelen) en Week (trainingen op dagen) hebben het al.

### Waar het niet hoort

De dagen van Week (de volgorde is de kalender). Logboek (tijd). De tabbalk (vijf vaste tabs: Vandaag, Week, Stand, Ascend, Logboek). Instellingsgroepen en rijen (je zoekt ze op vaste plek, en het zoeken vindt ze al). De oefeningen binnen een training (het programma en Forge bepalen de volgorde). De lijst in Forge zelf (die heeft een sorteerinstelling `listSort`, en de volgorde per oefening is een uitkomst, geen voorkeur). Kaarten in de weerregel of de ochtendcheck.

Ook niet slepen op de eerste kaart van Je stand: "Klaar voor het doel" (`Gr5ReadinessCard`) blijft bovenaan, omdat het het ene voortgangsgetal is dat de tab beantwoordt.

### Wat je sleept: blokken, niet losse kaarten

Je stand wordt een lijst van blokken, elk met een eigen vaste volgorde binnenin: Benen (Beenindex, Frisheidsgrafiek, Beenkalender, Indexcontrole), Belasting (Wekelijkse belasting, Intensiteit, Afdaling), Kracht (Forge, Krachtprogressie, Trainingsverdeling), Je stand in vier regels (het lucht-vlak), Lopen (Looptrends, Aerobe trend), Wat speelde er (`InfluenceCard`), Doel (Avontuurkaart, les). Zes tot zeven blokken is te overzien; zestien losse kaarten slepen op een telefoon is een gedoe en lost elke dag meer op dan het kost. Het lucht-vlak ("Je stand in vier regels", `SkyPanel`) volgt de afspraak: hoogstens één vlak lucht halverwege, nooit de eerste kaart. Het blok mag dus niet bovenaan komen: de regel "nooit de eerste, hoogstens één" geldt ook voor de volgorde. Zie de open keuzes.

### Hoe: een blad "Volgorde aanpassen", geen grepen op de pagina

De pagina zelf blijft rustig: geen grepen, geen stand. Onderaan Je stand staat een `TextButton` "Volgorde aanpassen" (44 px, gedempt). Hij opent een onderblad (`Sheet`, met `useSheetClose`, dus de terugknop sluit hem). Daarin staat een lijst met de blokken als compacte rijen van 52 px: links de naam van het blok, eronder één regel met wat erin zit ("Beenindex, frisheid, kalender"), rechts de greep van 44 bij 44 px (`Icon name="greep"`, zoals in `GoalCard`). De lijst past op één scherm, dus randscrollen is zelden nodig maar blijft werken via de gedeelde hook. Daaronder "Terug naar standaard" (`SecondaryButton`) en "Klaar" (`PrimaryButton`) als de enige mint gevulde knop.

Waarom een blad en geen slepen op de pagina zelf: blokken zijn hoog (een grafiek is 200 px), dus slepen op de pagina vraagt veel scrollen met een kaart in je vinger; de pagina zou onrustig worden met grepen overal; en "acties staan in het blad en nooit op de pagina" is al de afspraak in de instellingen. De vergelijking met Week en Ascend: daar zijn de rijen laag en de lijst kort, dus de greep op de plek zelf werkt. Hier is het blad de snellere hand.

Dezelfde hook en dezelfde greep: `useVerticalDrag` met `locate(y)` (welke rij ligt onder je vinger), `onChange`, `onDrop`, `onCancel`, drempel 6 px. Het blad is zelf een scrollbak, niet `#app-scroll`: de hook leest `#app-scroll`, dus krijgt een optionele `scroller` (element of selector) mee. Dat is een kleine uitbreiding, met de standaard zoals nu, zodat Ascend en Week niet veranderen.

Onderdelen: `Sheet`, `SettingsRow`-achtige rij (of eigen rij in `Card`-stijl), `Icon name="greep"`, `PrimaryButton`, `SecondaryButton`, `TextButton`, de mint lijn van `GoalList` voor de landingsplek. Geen nieuwe component in `ui.tsx` en geen nieuw token.

### Toetsenbord, schermlezer, beweging

Toetsenbord zoals `GoalList`: de greep is een `button` met `aria-pressed`, spatie of Enter pakt op, pijltjes omhoog en omlaag verplaatsen, spatie laat los, Escape of Tab annuleert. De aankondiging in een `aria-live="polite"`-regel: "Plek 3 van 6, Kracht." en bij loslaten "Kracht staat nu derde." Het label van de greep: "Verplaats Kracht, nu op plek 2. Spatie pakt op, pijltjes verplaatsen, spatie laat los, Escape annuleert."

Naast de greep krijgt elke rij voor TalkBack, waar de pointergebaren niet werken, twee knoppen "Hoger" en "Lager" in een actiemenu per rij (zoals het blad van een doel op Ascend al heeft). Zonder pointer-slepen kan je de volgorde dus altijd met knoppen aanpassen. Op een telefoon zonder toetsenbord en zonder schermlezer merk je ze niet.

Tikdoelen: greep 44 bij 44, rij 52. Kleuren: de greep gedempt (`--color-ink-dim`), mint als hij is opgepakt, de landingslijn mint, de rest marine. Eén mint accent: "Klaar" is de gevulde knop, de landingslijn is tijdelijk.

Beweging: het volgen van de vinger is directe bediening en blijft 1 op 1 in alle standen (Normaal, Rustig, Uit en `prefers-reduced-motion`), zoals bij Ascend en Week. Er komt geen extra animatie bij. Het blad opent zoals elk blad.

### Hoe de volgorde bewaard wordt

Een nieuwe instelling, `AppSettings.cardOrder?: { stand?: string[] }`, met de blok-id's als stabiele sleutels (`'benen' | 'belasting' | 'kracht' | 'vier-regels' | 'lopen' | 'invloed' | 'doel'`). Ontbreekt de sleutel, dan geldt de standaard, zodat niemand iets merkt tot hij het zelf verandert (zoals `OverviewSettings`).

Lezen is defensief, in een pure functie `resolveCardOrder(page, raw)`: onbekende id's vallen weg, dubbele id's tellen één keer, ontbrekende id's (een nieuw blok in een latere versie) komen op hun standaardplek terug, namelijk direct na het blok dat in de standaard voor hen stond. Zo blijft een oude back-up of een oud bewaard lijstje bruikbaar zonder migratie, en een nieuw blok verdwijnt niet.

Back-up: `storage/backup.ts` controleert bij het terugzetten dat `cardOrder` een record is met arrays van strings (zoals `overviews` op regel 450 al een `isRecord` doet) en gooit de sleutel weg als hij beschadigd is. Het gaat mee in de gewone instellingen van de back-up; er is geen schemaversie nodig, omdat de sleutel optioneel is. Een migratiestap hoort er niet bij: een oudere app die de sleutel niet kent, negeert hem. Dat noteren we in het besluit.

Instelling volgens de werkafspraak: een rij "Volgorde van Je stand" met als waarde "Standaard" of "Eigen volgorde", die hetzelfde blad opent, met uitleg achter de InfoButton ("Kies zelf in welke volgorde de blokken op Je stand staan. Het verandert niets aan je planning of je cijfers."). De rij komt in `settingsIndex.ts` (zoekwoorden: volgorde, ordenen, slepen, kaarten, stand, kracht), `settingsLayout.ts`, `engine/settingsSummary.ts` (de waarde), `settingsDiff.ts`, `settingsHelp.ts` en een groepspagina (voorstel: Vandaag en meldingen is een vreemde plek voor Je stand; liever Planning of een nieuwe vermelding onder Gidsen, zie de open keuzes). "Terug naar standaard" verwijdert de sleutel.

### Samen met bestaande aan/uit-instellingen

Volgorde en zichtbaarheid blijven gescheiden. Een blok dat door een eigen instelling uit staat (Kracht meerekenen uit, Intensiteit tellen uit, geen hoofddoel) toont niets en neemt geen ruimte in, maar houdt zijn plek in de volgorde. In het blad staat zo'n blok gedempt met één regel "Staat uit in de instellingen" en blijft sleepbaar, zodat je volgorde niet verloren gaat als je het later aanzet. Er komt in deze ronde geen tweede schakelaar "Verberg dit blok" naast de bestaande; dat zou twee manieren geven om hetzelfde te doen. Zie de open keuzes.

Blokken zonder gegevens (nog geen logs) tonen hun eigen lege stand zoals nu; de volgorde verandert dat niet.

## 4. Lege, laad en foutstand

Leeg: een nieuwe installatie met weinig gegevens toont Je stand zoals nu, met de lege standen van de kaarten. Het blad heeft altijd de zeven blokken, ook als sommige leeg zijn. "Volgorde aanpassen" staat onderaan de pagina en verdwijnt niet bij weinig gegevens.

Laden: de pagina toont eerst opgeslagen gegevens; de volgorde komt uit de instellingen en is er meteen. Geen draaier. De rest laadt zoals nu.

Fout: faalt het wegschrijven van de volgorde (`updateSettings` gooit), dan zet het blad de lijst terug naar de oude volgorde en toont onderaan de regel "Dat lukte niet. De volgorde staat nog zoals eerst." met `aria-live`. Een beschadigde bewaarde volgorde valt terug op de standaard (de pure functie zegt dat zonder fout). Een `pointercancel` annuleert het slepen zonder verandering.

## 5. Wat ik bewust niet doe

- Geen zesde tab en geen Forge in de tabbalk.
- Geen grepen op de pagina van Je stand zelf, geen "wiebel"-stand en geen lang drukken.
- Geen slepen op Vandaag, in Logboek, op de tabbalk, in de instellingen, in Forge of bij de oefeningen van een training.
- Geen losse kaarten slepen op Je stand, alleen blokken. Binnen een blok blijft de volgorde vast.
- Geen verbergen van een blok in het blad in de eerste versie; aan en uit blijft bij de bestaande instellingen.
- Geen nieuw token, geen nieuwe kleur, geen animatie, geen punten of beloning voor ordenen.
- Geen aanpassing van de planning; `planGolden.test.ts` verandert niet.
- Geen automatische herordening door ASCEND (geen "belangrijkste eerst"). De volgorde is van jou.

## 6. Bouwplan voor Sherpa

Kleine stappen, elk met `tsc`, `lint`, `vitest` en `build` groen en elk op zichzelf terug te draaien. Branch `claude/forge-vinden-en-ordenen`.

Stap 1, Forge vinden (geen volgorde). In `Standing.tsx` het blok Kracht maken met Forge bovenaan en Krachtprogressie en Trainingsverdeling erin, en het blok Belasting zonder die twee. De Forge-kaart wordt een eigen onderdeel `components/stand/ForgeEntryCard.tsx` met de naam in Marcellus, één regel uit een pure functie `forgeEntryLine(views, rows, enabled)` in een nieuw `engine/forgeEntry.ts` (droog feit eerst, vier standen: uit, geen gegevens, met stijgers, zonder verandering) met tests, inclusief dat er nergens een gedachtestreepje in een zin staat. De kaart blijft staan als Kracht meerekenen uit staat, met de zin en de knop Aanzetten. Lookout kijkt op 360 en 390 px.

Stap 2, de blokken als gegevens. Nieuw `engine/cardOrder.ts` met `STAND_BLOCKS` (id, naam, regel, standaardplek, `canBeFirst`), `resolveCardOrder(page, raw)` (defensief, onbekend weg, dubbel weg, nieuw op zijn standaardplek, het lucht-vlak nooit eerst), `moveBlock(order, id, to)` en `blockAtY(rects, y)`. Tests: lege invoer, beschadigde invoer (geen array, getallen in de array), een bewaard lijstje zonder nieuw blok, een blok dat niet meer bestaat, het lucht-vlak dat je naar plek 1 sleept (gaat naar plek 2), verplaatsen naar dezelfde plek, begin en eind, en dat het resultaat altijd elk blok precies één keer bevat.

Stap 3, Je stand leest de volgorde. `Standing.tsx` bouwt de blokken als een lijst van `{ id, render }` en zet ze in de volgorde van `resolveCardOrder('stand', settings.cardOrder)`. Zonder instelling is de uitkomst exact de huidige volgorde (een test of snapshot van de ids). `AppSettings.cardOrder` in `storage/database.ts`; de controle in `storage/backup.ts` met een test in de stijl van `weatherLocation.test.ts` (afwezig, beschadigd, geldig, rond een back-up en terug).

Stap 4, de gedeelde hook uitbreiden. `useVerticalDrag` krijgt een optionele `scroller` (de bak waarin gescrold wordt, standaard `#app-scroll`). `edgeScroll` blijft puur en krijgt een test voor de randen van een bak. Ascend en Week veranderen niet; Lookout vergelijkt beide voor en na op 360 en 390 px.

Stap 5, het blad. `components/stand/OrderSheet.tsx`: `Sheet` met `useSheetClose`, de rijen met greep, de landingslijn, het toetsenbord, de schermlezerzinnen uit een pure functie (`orderAnnouncement(order, id, to)` in `cardOrder.ts`, getest), Hoger en Lager per rij, "Terug naar standaard", "Klaar". De knop "Volgorde aanpassen" onderaan Je stand als `TextButton`. Falen van het wegschrijven wordt afgevangen met de zin uit paragraaf 4.

Stap 6, de instelling. De rij "Volgorde van Je stand" met `settingsIndex.ts`, `settingsLayout.ts`, `settingsSummary.ts` (waarde Standaard of Eigen volgorde), `settingsDiff.ts`, `settingsHelp.ts` en de groepspagina; de bestaande tests die bewaken dat elke instelling een plek heeft, vangen een gemiste stap.

Stap 7, kleine aanvullingen (optioneel, apart te vragen). Een tekstknop "Forge" in `SessionActionSheet` bij een krachttraining, en "Deze oefening in Forge" in het logboek van een krachtlog. Beide openen `/forge`, de tweede met de zoekterm via `usePageState`.

Stap 8, controle. Lookout loopt het door op 360 en 390 px met vertraagde processor, in Normaal, Rustig en Uit, met `prefers-reduced-motion` en met TalkBack (Hoger en Lager). Aandachtspunten: het blad dat zelf scrolt en de randscroll daarin, de terugknop die het blad sluit, de pagina die na Klaar niet verspringt, en dat de volgorde na een back-up terugkomt. Warden kijkt of een bewaarde volgorde nooit een blok kan laten verdwijnen en of `planGolden.test.ts` niet beweegt.

## 7. Samenvatting

1. Forge staat verstopt als stil kopje midden in Belasting en verdwijnt helemaal als Kracht meerekenen uit staat.
2. Advies: een eigen blok Kracht op Je stand met Forge als duidelijke ingangskaart bovenaan, bij Krachtprogressie en Trainingsverdeling, met een regel over jouw kracht.
3. De kaart blijft ook bij uit staan, met "Aanzetten", zodat Forge ontdekbaar blijft.
4. Slepen om te ordenen alleen op Je stand, en per blok in plaats van per kaart.
5. Het gebeurt in een blad "Volgorde aanpassen" met dezelfde greep en hook als Ascend en Week, niet met grepen op de pagina.
6. Vandaag, Logboek, tabbalk, instellingen en Forge zelf krijgen geen slepen, omdat de volgorde daar betekenis heeft.
7. De volgorde staat in `AppSettings.cardOrder`, wordt defensief gelezen, gaat mee in de back-up en heeft geen migratie nodig.
8. Aan en uit blijft bij de bestaande instellingen; een uitgezet blok houdt zijn plek in de volgorde.
9. Bouwplan: acht kleine stappen, met pure functies en tests voor de blokken, de volgorde en de zinnen.

## 8. Open keuzes voor de eigenaar

1. Waar hoort Forge: A (blok Kracht op Je stand), B (op Vandaag bij een krachttraining) of C (tandwiel of Logboek)? Advies: A, met later B en C als aanvulling in een actieblad en het logboek, niet als vaste plek.
2. Slepen op Je stand per blok in een blad, of direct op de pagina? Advies: een blad. Blokken zijn hoog, de pagina blijft rustig en het past bij "acties staan in het blad".
3. Ook slepen op Vandaag? Advies: nee. De volgorde daar is de missie en wat bevestigd moet worden. Wil je toch iets, dan alleen de kleine kaarten onderaan, in een tweede ronde.
4. Mag het lucht-vlak ("Je stand in vier regels") overal staan, of nooit bovenaan? Advies: nooit bovenaan, zoals de afspraak voor lucht halverwege.
5. Een blok kunnen verbergen in het blad? Advies: nu niet. Aan en uit bij de bestaande instellingen laten, om twee schakelaars voor hetzelfde te vermijden. Wil je het later, dan als aparte stap met één lezing: verborgen of uit een instelling is hetzelfde.
6. In welke groep komt de rij "Volgorde van Je stand" in de instellingen? Advies: Planning (naast "Trainingen slepen in Week"), omdat het over hoe de app voor jou is ingericht gaat. Alternatief: Vandaag en meldingen.
7. Moet "Hoger" en "Lager" naast de greep staan voor wie niet kan slepen? Advies: ja, in een actiemenu per rij, zodat het ook met TalkBack werkt.
8. De Forge-regel op de kaart ("3 oefeningen gingen omhoog in 8 weken") of een vaste uitleg? Advies: de regel met jouw gegevens, met de vaste uitleg als terugvaloptie als er niets te zeggen is.
