# Ontwerp trainingsscherm minimaal

Ontwerpvoorstel van Cartographer, 12 november 2026. Geen code. Aanleiding: een afdruk van het trainingsscherm voor de Lange duurloop op 412 px. De eigenaar vindt de bovenkant met de zonebalk mooi. De rest vindt hij niet mooi, onoverzichtelijk, in een onlogische volgorde en te ingewikkeld. Hij wil minimaal en innovatief.

Gelezen: `CLAUDE.md`, `docs/architectuur/ontwerp-en-tokens.md`, `docs/werkbriefjes/bediening-en-beweging.md`, `docs/beslissingen/2026-11-09-stem-van-ascend.md`, `docs/beslissingen/2026-11-11-briefing.md`, `docs/beslissingen/2026-11-11-briefing-sporen-5-6.md`, `docs/visie/Ontwerp Route en trainingsscherm.md`, `docs/visie/Ontwerp Je dag.md`, `docs/visie/Ontwerp en gebruik.md`, en de code: `src/components/ExerciseLogger.tsx` (het trainingsscherm met het formulier), `src/components/TrainingBriefing.tsx`, `src/engine/briefing.ts`, `src/engine/sessionActions.ts`, `src/engine/trainingPlace.ts`, `src/components/duur/DuurParts.tsx`, `src/components/SessionHeader.tsx`, `src/components/WatchAskCard.tsx`, `ZoneBar` en `Chip` in `src/components/ui.tsx`, `src/engine/heartRateZones.ts`.

Niet nagelopen: langs welke weg de eigenaar voor deze loop op het oude scherm kwam in plaats van op de Briefing. Mogelijk via Zelf invullen of Vandaag al doen, of omdat de knop op Gedaan stond (koppeling niet gelezen binnen drie seconden). De bouwer zoekt dat eerst uit; het verandert het ontwerp niet.

## 1. Wat dit scherm is

De Briefing is het ene scherm vooraf: wat je gaat doen, waar, en wat je regelt voor je vertrekt.

Ja, Briefing en trainingsscherm worden één scherm, voor elke training te voet. Nu zijn er twee schermen die grotendeels hetzelfde vertellen, elk in een eigen volgorde. De Briefing blijft en krijgt het mooie deel van het oude scherm erbij: de kaart met de grote getallen en de zonebalk. Het oude scherm verdwijnt voor lopen en wandelen als plek om te lezen.

Zelf invullen wordt geen scherm meer maar een blad met de naam Hoe ging het?. Het bevat alleen de vragen, zonder de uitleg erboven. Je opent het met Gedaan (zonder horloge dat afvinkt) of met de tekstknop Zelf invullen (met horloge). Wat het opslaat blijft precies gelijk.

Buiten dit voorstel: Forge, kracht in MacroFactor, kracht in ASCEND en de rustdag. Die houden hun scherm. De regels van hoofdstuk 6 gelden daar later ook.

## 2. Het scherm vooraf, voor deze Lange duurloop

Van boven naar onder. Elk feit staat één keer.

1. De lucht met bergen (`SkyBand variant="low"`), zoals op de afdruk: terugknop, het kopje "HARDLOPEN · LANG", de naam Lange duurloop, één zin uitleg, de regel "Zo 15 november · Week 3 van 18, opbouw · zwaarste week", rechts de i. Verandert: de zin is altijd één zin, zonder Meer erachter. De rest van de uitleg staat in het blad Waarom deze training achter de i.

2. De hartkaart, zoals op de afdruk: groot "75 minuten totaal" en "±300 m omhoog als het kan", daaronder de zonebalk met Z2 gemarkeerd. Nieuw: onder de balk staat één regel met de getallen van die zone, "145 tot 159 bpm · rond 6:20 per km", en daaronder de bestaande zin "Zone 2. Je moet nog hele zinnen kunnen praten.", met "Zone 2." in gewone inkt in plaats van mint (regel 5 in hoofdstuk 6). Dit is de enige plek op het scherm waar zone, hartslag, tempo en de praattest staan. Een tik op de balk opent het blad Zones (zie 5).

3. Waar train je: één rij chips, Buiten, Wandelen, Loopband, de gekozen als stille chip (`tone="quiet"`), zodat de knop onderaan het enige mint is. Zonder kop en zonder kaart eromheen. Details in 4.

4. De plek van de kaart, zoals de Briefing nu doet: bij Buiten de kaart met je lus en één regel met afstand, hoogtemeters en ondergrond; bij Loopband geen kaart. Ongewijzigd, alleen een plek lager dan nu.

5. Eén lijst zonder kopje, in de vorm van het blok Stand en morgen uit Je dag: links een vast woord in gedempte inkt, rechts de waarde in gewone inkt, een pijltje. Elke rij is 44 px of hoger en opent een blad of pagina.
   - Horloge: "Staat erop sinds 9 november. Vinkt zelf af." Opent het blad Je horloge.
   - Weer: "9 graden, lange mouw". Opent de weerpagina.
   - Mee: "1 liter en 2 gels". Opent het blad Eten en drinken. Geen regel, geen rij.
   - Opwarmen en rekken: "8 en 4 oefeningen". Opent één blad met beide lijsten onder elkaar.

6. De stopregels, zonder kaart (zie 4).

7. Helemaal onderaan, alleen met een horloge dat afvinkt: de tekstknop Zelf invullen.

8. De onderbalk heeft één knop. Met een lus: Route naar Garmin Connect, in mint. Zonder lus en zonder horloge dat afvinkt, op de dag zelf: Gedaan. Anders is er geen onderbalk; de terugknop sluit.

Wat van het scherm verdwijnt en waar het blijft:

- De kaart Zo doe je het. Bij één doorlopend blok herhaalt hij de hartkaart woord voor woord. Hij komt alleen terug bij een training met stappen (intervallen): dan staat het profiel van de training in de hartkaart op de plek van de zonebalk, en een tik erop opent het blad met de stappen (`StepList`).
- Het vak Wat je loopt uit de Briefing. De hartkaart zegt het al.
- "Met hoogteverschil als het kan." Staat al als "±300 m omhoog als het kan".
- De zin over rustig tempo onder de keuze waar je traint. Staat in de hartkaart.
- De knop Horloge in de onderbalk, de losse regel "Je horloge vinkt deze training af." en de regel "Verstuurd naar je horloge". Die drie worden de ene rij Horloge.
- De rij Route voorstellen. De kaart staat er zelf.
- De uitklaplijsten onder Eerst opwarmen en Daarna rekken. Dat wordt een blad.
- De labels Beste keuze en Ook goed. Zie 4.
- Het hele formulier. Zie 3.

Geteld voor deze loop: "rustig, zone 2, hele zinnen" gaat van vier keer naar één keer, 75 minuten van twee naar één, het horloge van drie naar één, en van zes kaarten blijft er één over plus de kaart met je lus.

Standen:

- Laden: de kop, de hartkaart, de chips en de lijst zijn lokaal en staan er meteen. Alleen de kaart zoekt, met de bestaande zoekstand op een vaste hoogte. Niets verspringt als de lus er is.
- Leeg: geen weer, dan zegt de rij "Nog geen weer". Geen hartslaggegevens ingesteld, dan staat onder de balk alleen de zin; geen tempo uit een test, dan alleen de hartslag. Geen stopregels, dan geen blok.
- Fout: de bestaande regels van de route (geen netwerk, te laat, Opnieuw zoeken). Mislukt versturen naar het horloge, dan krijgt de rij Horloge een amber stip en de volledige tekst "Versturen lukte niet".
- Gedaan: is de training al gelogd, dan geen kaart en geen knop, en de regel "Deze training is al gedaan." zoals nu.

Hergebruik: `SkyBand`, `Card`, `KeyNumbers`, `ZoneBar`, `IntervalProfile`, `StepList`, `Chip`, `PlaceRow`, `MapPlace`, `Eyebrow`, `InfoButton`, `PrimaryButton`, `TextButton`, `TodaySheet`, `WatchSheet`, `TrainingGuideSheet`, `StretchItems`, en `engine/briefing.ts` voor wat erop staat.

## 3. Achteraf: Hoe ging het?

Altijd een eigen moment, nooit onder de uitleg. Twee gevallen.

Je horloge heeft gelogd. Dit is het gewone geval. De losse kaart op Vandaag (`WatchAskCard`) wordt een rij bovenaan Je dag: "Lange duurloop is afgevinkt", met eronder "Hoe ging het?" en een pijltje. De rij opent het blad Hoe ging het? (regel 7 in hoofdstuk 6):

- Eén regel met wat er is: "76 min, 11,4 km, +310 m, vandaag".
- De vraag met drie knoppen: Beter, Normaal, Slechter.
- Pijn: Nee of Ja. Ja opent de bestaande velden voor de plek.
- De mint knop Opslaan, en daaronder de rij Meer en de tekstknoppen Klopt niet en Niet nu.

Meer opent de tweede stap met de zwaarte (RPE), je gewicht na, Inkorten en de tekst voor Strava. De twee alinea's uitleg (waarom de app zelf afvinkte, wat Klopt niet doet) gaan achter een i in het blad. Zo is het drie tikken: de rij, Normaal, Opslaan. De rij valt in Je dag nooit achter "Nog": de app heeft zelf iets afgevinkt en dat moet je kunnen zien en terugdraaien. De zwaarte komt van je horloge als die er staat; anders staat hij achter Meer. Dat laatste hangt af van vraag 2, en de bouwer gaat eerst na wat de belasting doet met een log zonder RPE. Dat heb ik niet nagelopen.

Niet nu laat de rij staan zolang de vraag open mag blijven (72 uur, zoals nu).

Je vult zelf in. Het blad Hoe ging het? in twee stappen, zoals het blad van een training in Week zijn stappen heeft:

- Stap 1: duur (vooraf ingevuld met 75), zwaarte 1 tot 10, pijn Nee of Ja, Beter, Normaal of Slechter. De mint knop Opslaan.
- Een rij "Afstand, hoogtemeters en notities" opent stap 2 in hetzelfde blad: de overige velden van nu (afstand, stijging, hartslag, benen bij het inlopen, Iets anders gedaan, notities, en Gedaan op bij een dag die voorbij is).

Het blad gaat door `useSheetClose` met `ref={sheetRef}` en `<SheetGrip />`, en geeft `canClose` door zolang het opslaat. De bevestiging bij een heel lange duur ("Klopt dit?") blijft. Mislukt opslaan, dan blijft het blad open met de melding en alles wat je invulde.

## 4. Waar train je, en de stopregels

Waar train je wordt de rij chips die de Briefing al heeft (`PlaceRow` met `shortPlaceLabels`): één regel hoog, nooit twee, met de korte namen. Van ongeveer 260 px naar 44 px.

De labels Beste keuze en Ook goed staan niet meer op het scherm. De beste keuze is de keuze die al gekozen staat. Kies je iets anders, dan komt er onder de chips één regel: het oordeel en wat je anders doet, bijvoorbeeld "Ook goed. Stel de band op een lichte helling in." Bij de standaard staat er geen regel. De volledige vergelijking staat waar hij al staat: Waar train je het best? in het blad achter de i.

De stopregels blijven op het scherm en volledig: de stemgids zegt dat een waarschuwing nooit wordt weggestopt. Ze verliezen alleen hun kaart en hun amber kop. De nieuwe vorm: onderaan de pagina, zonder rand, het kopje "Stop of schakel terug als" als gedempte `Eyebrow` met één amber stip ervoor, en daaronder de twee punten in gewone inkt. De amber stip is dezelfde als in het blok Stand en morgen van Je dag: amber is een stip vooraan, nooit een gekleurde kop.

## 5. Innovatief en rustig

De zonebalk als instrument. De balk toont niet alleen welke zone, maar ook wat die zone voor jou is: de hartslag uit je instellingen (`zoneBpm`) en het tempo uit je testloop. Een tik opent het blad Zones: alle vijf onder elkaar, elk met jouw hartslag, jouw tempo en de zin hoe het voelt, met de zone van vandaag gemarkeerd. Achter de i in dat blad staat waar de getallen vandaan komen. Dit vraagt een kleine uitbreiding van `ZoneBar` in `ui.tsx` (een regel eronder en een tik), geen eigen opmaak. Bij het verschijnen groeit de balk één keer van links naar rechts in 300 ms, ease-out; in Rustig en Uit staat hij meteen op de eindstand.

De balk wordt je uitslag. Open je de Briefing van een training die je horloge al logde, dan staat dezelfde hartkaart er met wat je deed: "76 minuten", "310 m omhoog", en de balk met elke zone zo breed als de tijd die je erin liep. Vooraf en achteraf zijn dan hetzelfde beeld, plan en uitslag. Dit kan alleen als het log de tijd per zone heeft; de bouwer gaat na wat `runDetail` bevat. Later spoor.

Het hoogteprofiel als lijn. Niet in de kop. De lucht is een vast vlak dat op elk scherm gelijk is, en een lijn die er pas staat als de lus gevonden is laat de kop verspringen. Wel direct onder de kaart: één strook van 32 px met de stijging over de afstand, in gedempte inkt, die bij het verschijnen één keer van links naar rechts tekent in 400 ms. Zo krijgt "±300 m omhoog" een beeld bij de lus waar het over gaat. Dit is spoor 10 uit het eerdere ontwerp.

Wisselen van plek verandert het scherm, niet alleen de chip. Bij Loopband verdwijnt de kaart en de rij Weer in 200 ms (bestaat al voor de kaart). Niets beweegt daarna nog.

Grenzen: geen lus, alles tussen 150 en 400 ms, ease-out. Eén mint accent: de knop onderaan, en de lus op de kaart die bij die knop hoort; de gekozen chip is stil. De zonekleuren zijn de bestaande `--color-effort-*`. Geen nieuwe token. Niets onder 12 px; de regel onder de balk is 12 px, de chips en rijen zijn 44 px.

Wat ik bewust niet doe: geen aftelklok of startknop (je horloge start de loop), geen kaart per feit, geen uitklapblok, geen voortgangsring, geen beloning na het invullen, en geen profiel of kaart op Vandaag.

## 6. Ontwerpregels voor de hele app

Gemaakt met de inventaris van Pathfinder (`docs/onderhoud/2026-11-12-pathfinder-totaalplaatje-ui.md`): drie koptypen, zes kaartstijlen op vier schermen, tot zes keer mint op het eerste scherm, amber als gewone markering, gekleurde woorden in zinnen, en Hoe ging het? in drie vormen. Deze regels gelden voor elk scherm, ook Je dag, Vandaag, Week en Stand. Waar een regel afwijkt van `docs/architectuur/ontwerp-en-tokens.md` staat dat erbij; zo'n afwijking vraagt een eigen besluit in `docs/beslissingen/` en gebeurt nooit als bijwerking.

### Regel 1. Elk feit één keer, en elk feit heeft één thuis

Een feit staat één keer op een scherm. Over schermen heen heeft het één thuis; andere plekken verwijzen ernaar met een rij en herhalen het niet. Benen, belasting en week wonen op Stand. Wat je vandaag doet woont op de missiekaart. Wat je vooraf regelt woont in de Briefing. Wie een regel toevoegt, zoekt eerst of het feit er al staat.

### Regel 2. Eén koptype

Er zijn drie lagen tekst die iets aankondigen, en elke laag heeft één taak:

- De paginatitel: Marcellus 28, één per scherm, in de lucht.
- De naam: Marcellus 20, voor de naam van een training of een oordeel, hoogstens één per kaart of blad.
- Het kopje: `Eyebrow`. Dit is het enige koptype boven een groep.

Mijn advies is de `Eyebrow` in hoofdletters te houden en hem streng te maken, niet hem te vervangen door zinsletters. De reden: hij draagt de kleur per tab, en dat is een harde regel van de stijl; een kop in zinsletters van 14 px lijkt op gewone tekst en wordt dan vanzelf weer vet gemaakt, het derde koptype dat nu onrust geeft. Streng betekent:

- Een `Eyebrow` staat alleen boven een groep (een lijst, een blok, het hart), nooit in een rij en nooit als label van één waarde. In een rij is het vaste woord links gewone gedempte tekst.
- Hoogstens drie kopjes op een scherm zonder scrollen. Een groep die zichzelf uitlegt krijgt er geen (het blok Stand en morgen, de lijst in de Briefing).
- In de tabkleur op een tab. Op een scherm buiten de tabs (de Briefing, een blad) is alleen het kopje in de kop gekleurd; de andere zijn gedempt, zodat er geen tweede mint bij komt.
- Vette tekst is nooit een kop. Vet is alleen nadruk op een waarde.
- Een kopje krijgt nooit amber. Let op is de stip ervoor (regel 4).

### Regel 3. Twee kaartstijlen

- De hartkaart: één per scherm, voor het ene ding waar het scherm om draait (de missie, de hartkaart van de Briefing, je doel op Ascend). Dit is `Card`; in de lucht wordt hij vanzelf de lichte kaart. Alleen de missiekaart mag de contourlijnen dragen.
- De lijst: één `Card` met rijen, gescheiden door haarlijnen. Een rij heeft één vorm: links een schijf of het vaste woord in gedempte inkt, dan de waarde in gewone inkt, en rechts hoogstens één ding. Dat ene ding is een rondje (afvinken met één tik) of een pijltje (opent een blad of pagina). Minstens 44 px hoog.

Al het andere heeft geen kaart: een tip, de stopregels, een regel uitleg staan los op de achtergrond. Een kaart in een kaart bestaat niet. Een tegel met één getal bestaat niet; een getal staat in het hart (`Stat`) of als waarde in een rij. Een blad is geen kaartstijl maar een laag, met zijn eigen vaste vorm (`SheetGrip`, kop, inhoud, knop).

### Regel 4. Amber alleen voor waarschuwing

Amber betekent: hier moet je iets mee. Het heeft twee vormen en geen andere:

- Een stip vooraan een rij of een kopje.
- De volledige regel van iets wat mislukte of niet klopt ("Versturen lukte niet", een lus die te kort is).

Nooit een amber kop, een amber rand om een kaart of een amber woord midden in een zin. Dit wijkt af van `ontwerp-en-tokens.md`, waar amber ook de beendag is. Mijn advies: de beendag in Week en op Stand krijgt de rustige tint `--color-sage`, die al bedoeld is voor een soort en geen status is. Dan is elke amber plek in de app een echte waarschuwing. Geen nieuwe token.

### Regel 5. Mint alleen voor de hoofdactie

Gevuld mint is één knop per scherm: de hoofdactie. Daarnaast blijft mint bestaan voor voortgang die af is (het vinkje, de ring, de meter), want dat is geen knop en geen keuze. Verder:

- Naast de gevulde knop staat hoogstens één omlijnde knop (`SecondaryButton`). Elke andere actie is een rij of een gedempte `TextButton`.
- Een gekozen keuze op een scherm dat al een mint knop heeft is de stille chip (`Chip` met `tone="quiet"`, bestaat al). Zo zijn de chips Waar train je in de Briefing stil en is de knop onderaan het enige mint.
- Geen mint woord in een zin. "Zone 2." in de hartkaart wordt gewone inkt, halfvet. Hetzelfde geldt voor ijsblauw: status is een pil of een stip, geen gekleurd woord.
- Mint tekst als kopje alleen via de tabkleur van Vandaag.

Dit scherpt `ontwerp-en-tokens.md` aan ("een gekozen keuze is ook mint") zonder het om te draaien: een gekozen keuze mag mint zijn als er geen mint knop op het scherm staat.

### Regel 6. Drie soorten kaarten rond de missie, elk één vorm

Alles wat op Vandaag rond de missie verschijnt is één van drie soorten. De soort bepaalt de vorm en de plek.

- Beslissing: de app stelt iets voor of weet het niet zeker (een voorstel voor je plan, een botsing, een activiteit van je horloge die niet onmiskenbaar past). Vorm: een kaart met één regel wat er verandert, de omlijnde knop Akkoord of Bekijken, en Liever niet als tekstknop. De vaste zin "Eerst een voorstel, pas na Akkoord verandert er iets." staat in het blad erachter. Plek: boven de missie, want het kan de missie veranderen.
- Melding: er is iets gebeurd en je hoeft alleen te weten dat het zo is (planning bijgesteld, een bron die stil is, back-up). Vorm: één rij zonder knoppen, met een pijltje naar het blad waar Begrepen staat; een amber stip als het let op is. Plek: boven de missie als het over vandaag gaat, anders onder Je dag.
- Tip: iets wat helpt en niets vraagt (de coachregel, het citaat, weer). Vorm: tekst zonder kaart, één of twee regels, hoogstens een gedempte tekstknop. Plek: altijd onder de missie, nooit erboven.

Nooit meer dan twee boven de missie; een derde wacht tot er een weg is. Een beslissing gaat voor een melding. Een vraag is geen vierde soort: een vraag is een taak van vandaag en dus een rij in Je dag die een blad opent (het gevoel, het gewicht, en Hoe ging het?).

### Regel 7. Hoe ging het? in één vorm

Nu zijn er drie vormen: het formulier in `ExerciseLogger`, de kaart `WatchAskCard` en `SportFeltBlock`. Er komt één blad, Hoe ging het?, met één volgorde van vragen: Beter, Normaal of Slechter; pijn Nee of Ja; zwaarte; en de rij naar de overige velden. Wat het horloge al weet staat bovenaan als één regel met feiten en wordt niet gevraagd. De drie ingangen openen hetzelfde blad:

- Zelf invullen of Gedaan: het blad met ook de duur.
- Na een loop van je horloge: een rij bovenaan Je dag, "Lange duurloop is afgevinkt", met eronder "Hoe ging het?". Geen eigen kaart meer. Klopt niet en Niet nu staan in het blad.
- Vanuit het log in het Logboek: dezelfde vragen, zolang antwoorden nog mag.

De woorden zijn overal gelijk: Beter, Normaal, Slechter; Nee, Ja; Opslaan.

### Regel 8. Eén scherm is één moment

Vooraf of achteraf, nooit allebei. Invullen is een blad na een tik en staat nooit onder de uitleg. Uitleg staat achter de i; een waarschuwing staat op het scherm.

Als toets voor Lookout op elk scherm: het hart en de ene mint knop staan op 360 bij 640 px boven de vouw, er is hoogstens één gevulde mint knop, elke amber plek is een waarschuwing, en er staan hoogstens drie kopjes in beeld.

## 7. Voor de bouwer

Sporen, in volgorde. Elk spoor is alleen weergave en heeft een eigen einde.

1. Uitzoeken waarom de Lange duurloop het oude scherm gaf, en de ingang gelijk trekken: elke training te voet opent de Briefing (`briefingEntry` gelijk aan `hasBriefing`), ook wandelen en de leesstand vooraf. Einde: Hoe je het doet bestaat niet meer voor lopen en wandelen.
2. De hartkaart in de Briefing (`KeyNumbers` en `ZoneBar` of `IntervalProfile`), het vak Wat je loopt weg. Einde: de kop en de hartkaart zijn gelijk aan de afdruk.
3. De vakken worden één lijst zonder kopje; het horloge staat één keer; de onderbalk heeft één knop; opwarmen en rekken in een blad. `engine/briefing.ts` levert de rijen, met test.
4. De stopregels zonder kaart, en de regel onder de chips bij een andere keuze.
5. Het blad Hoe ging het? voor zelf invullen: het formulier uit `ExerciseLogger.tsx` verhuist ongewijzigd naar een blad in twee stappen. Gedaan en Zelf invullen openen het blad. `ExerciseLogger` blijft voor kracht in ASCEND en de rustdag.
6. Hoe ging het? in één vorm: de kaart na een loop van je horloge (`WatchAskCard`) wordt een rij in Je dag die hetzelfde blad opent, en `SportFeltBlock` gebruikt dezelfde vragen. Na antwoord op vraag 2. Let op: dit verplaatst een kaart uit de volgorde van `engine/todayCards.ts` naar `engine/yourDay.ts`; dat is bedoeld en hoort in het besluit. Met een instelling: Vragen na je loop, Kort (advies) of Alles, in `settingsIndex.ts`, `settingsLayout.ts`, `settingsSummary.ts` en `settingsHelp.ts`.
7. De zonebalk met hartslag en tempo, en het blad Zones.
8. Het hoogteprofiel onder de kaart (eerst nagaan of elk punt van een lus een hoogte heeft).
9. De balk als uitslag.
10. De regels van hoofdstuk 6 op de rest van de app, elk als eigen spoor met eigen besluit en nooit als bijwerking: de kaarten rond de missie in drie soorten (regel 6), kopjes opschonen per tab (regel 2), kaartstijlen terug naar twee (regel 3), de beendag van amber naar `--color-sage` (regel 4), en mint tellen per scherm (regel 5). Een scan in de tests kan regel 4 en 5 bewaken: geen `--color-warning` op een `Eyebrow`, hoogstens één `PrimaryButton` per scherm.

Na spoor 4 is de klacht van de afdruk weg. Spoor 5 en 6 maken achteraf kort. Spoor 7 tot 9 zijn het innovatieve deel. Spoor 10 trekt de rest van de app gelijk.

Wat niet mag bewegen:

- Logs: wat het formulier opslaat is veld voor veld gelijk aan nu, en er wordt nooit een bestaand log herschreven. Het concept van een half ingevuld formulier blijft bewaard zoals nu, en sluiten zonder opslaan gooit het weg zoals nu.
- Afvinken door het horloge: `engine/autoTick.ts` (wanneer het mag, de 72 uur, Klopt niet, wat `applyFeedback` toevoegt). Een testloop en een wedstrijd vul je altijd zelf in.
- De regel of de knop Briefing of Gedaan heet (`missionButton`), met Gedaan als veilige kant.
- Niet fit en Verplaatsen op de missiekaart, en Verplaatsen, Ruilen, Vandaag al doen en Overslaan in het blad van Week (`engine/sessionActions.ts`).
- De keuze waar je traint: alleen voor die ene training, op het toestel (`storage/trainingPlace.ts`), en hij plant niets.
- De route: wanneer er gezocht wordt, wat er de deur uit gaat, de eerste vraag, Liever niet.
- De pijnvraag: blijft op het scherm bij elke loop en wandeling.
- `src/storage/planGolden.test.ts`. Er verandert niets aan de planning.

Testen:

- Een log uit het nieuwe blad is gelijk aan een log uit het oude formulier bij dezelfde invoer (een vaste vergelijking voor een loop buiten, een loopband en een wandeling met rugzak).
- Concept: half invullen, app sluiten, opnieuw openen. Lange duur: de bevestiging komt nog.
- De standen van de Briefing: met en zonder horloge, stille koppeling, testloop, wedstrijd, loopband, vooraf, de dag zelf, al gedaan, zonder weer, zonder hartslaggegevens, zonder testtempo, met intervallen.
- Tellen op de tekstkaart: zone en praattest één keer, de duur één keer, het horloge één keer.
- De stopregels staan er volledig, bij elke plek behalve rust.
- Klopt niet haalt het log weg; Niet nu laat de vraag staan.
- Terug sluit laag voor laag; een rij naar een pagina sluit eerst alle lagen.
- Beweging in Rustig en Uit op de eindstand.
- Op 360 en 390 px: de chips op één regel, niets afgekapt, geen tikdoel onder 44 px, de hartkaart en de knop boven de vouw.
- Vast: `npx vitest run src/engine/briefing src/engine/sessionActions src/engine/autoTick src/components/sheetDrag`, en `npm run kaart:vergelijk` met elk verschil verklaard.

## Samenvatting

Er is één scherm vooraf, de Briefing, met de kop en de hartkaart van de afdruk bovenaan. Daaronder één rij chips voor waar je traint, de kaart met je lus, één lijst met vier rijen, en de stopregels zonder kaart. Elk feit staat één keer. Invullen is overal hetzelfde blad met de naam Hoe ging het?; na een loop van je horloge zijn dat drie tikken vanuit een rij in Je dag. Hoofdstuk 6 geeft acht regels voor de hele app: elk feit één keer, één koptype, twee kaartstijlen, amber alleen als waarschuwing, mint alleen voor de hoofdactie, drie soorten kaarten rond de missie, en één vorm voor Hoe ging het?. Innovatief zit in de zonebalk: hij toont je hartslag en tempo, opent de uitleg van alle zones, en wordt na afloop je uitslag. Geen nieuwe kleur of token, en de planning en de logs bewegen niet.

## Vragen voor de eigenaar

1. Mag de Briefing het enige scherm vooraf worden voor elke loop en wandeling, en wordt Zelf invullen een blad met alleen de vragen? Mijn advies: ja. Twee schermen met dezelfde inhoud is de bron van de herhaling.
2. Na een loop van je horloge: is Beter, Normaal of Slechter plus pijn genoeg, met de zwaarte uit je horloge en anders achter Meer? Mijn advies: ja, met een instelling voor wie alles wil zien. Ik laat eerst nagaan dat de belasting klopt zonder ingevulde zwaarte.
3. De volgorde: eerst de kaart met 75 minuten en de zonebalk, dan pas de kaart met je lus? En het hoogteprofiel onder de lus in plaats van in de kop? Mijn advies: ja op allebei. De zonebalk is wat je onderweg onthoudt, en de kop blijft op elk scherm gelijk.
4. De kopjes in hoofdletters (`Eyebrow`): vervangen door zinsletters, of houden en streng maken? Mijn advies: houden en streng maken (regel 2). Ze dragen de kleur per tab, en dat is de stijl van ASCEND. De winst zit in minder kopjes, niet in andere letters. Dit botst nergens met CLAUDE.md.
5. De beendag in Week en op Stand: amber houden, of de rustige groene tint? Mijn advies: de groene tint (`--color-sage`), zodat amber overal een waarschuwing is. Dit wijzigt één zin in `docs/architectuur/ontwerp-en-tokens.md` en vraagt daarom een eigen besluit; CLAUDE.md zelf zegt alleen "amber is let op" en botst er niet mee.
6. Na een loop van je horloge: een rij in Je dag in plaats van een eigen kaart op Vandaag? Mijn advies: ja. Een vraag is een taak van vandaag, en zo is Hoe ging het? overal hetzelfde blad. De rij staat bovenaan en verdwijnt nooit achter "Nog".
