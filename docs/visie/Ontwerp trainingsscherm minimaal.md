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

2. De hartkaart, zoals op de afdruk: groot "75 minuten totaal" en "±300 m omhoog als het kan", daaronder de zonebalk met Z2 gemarkeerd. Nieuw: onder de balk staat één regel met de getallen van die zone, "145 tot 159 bpm · rond 6:20 per km", en daaronder de bestaande zin "Zone 2. Je moet nog hele zinnen kunnen praten." Dit is de enige plek op het scherm waar zone, hartslag, tempo en de praattest staan. Een tik op de balk opent het blad Zones (zie 5).

3. Waar train je: één rij chips, Buiten, Wandelen, Loopband, de gekozen in mint. Zonder kop en zonder kaart eromheen. Details in 4.

4. De plek van de kaart, zoals de Briefing nu doet: bij Buiten de kaart met je lus en één regel met afstand, hoogtemeters en ondergrond; bij Loopband geen kaart. Ongewijzigd, alleen een plek lager dan nu.

5. Eén lijst, Voor je gaat, in de vorm van het blok Stand en morgen uit Je dag: links een vast woord in gedempte inkt, rechts de waarde in gewone inkt, een pijltje. Elke rij is 44 px of hoger en opent een blad of pagina.
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

Je horloge heeft gelogd. Dit is het gewone geval. De kaart op Vandaag blijft de plek (`WatchAskCard`), maar korter:

- Eén regel met wat er is: "Lange duurloop is afgevinkt · 76 min, 11,4 km, +310 m".
- De vraag met drie knoppen: Beter, Normaal, Slechter.
- Pijn: Nee of Ja. Ja opent de bestaande velden voor de plek.
- De mint knop Opslaan, en daaronder twee tekstknoppen: Meer en Klopt niet.

Meer opent een blad met de zwaarte (RPE), je gewicht na, Inkorten en de tekst voor Strava. De twee alinea's uitleg (waarom de app zelf afvinkte, wat Klopt niet doet) gaan achter een i op de kaart. Zo is het in het beste geval twee tikken: Normaal, Opslaan. De zwaarte komt van je horloge als die er staat; anders staat hij achter Meer. Dat laatste hangt af van vraag 2, en de bouwer gaat eerst na wat de belasting doet met een log zonder RPE. Dat heb ik niet nagelopen.

Niet nu blijft bestaan als de vraag nog 72 uur open mag blijven; hij staat naast Klopt niet.

Je vult zelf in. Het blad Hoe ging het? in twee stappen, zoals het blad van een training in Week zijn stappen heeft:

- Stap 1: duur (vooraf ingevuld met 75), zwaarte 1 tot 10, pijn Nee of Ja, Beter, Normaal of Slechter. De mint knop Opslaan.
- Een rij "Afstand, hoogtemeters en notities" opent stap 2 in hetzelfde blad: de overige velden van nu (afstand, stijging, hartslag, benen bij het inlopen, Iets anders gedaan, notities, en Gedaan op bij een dag die voorbij is).

Het blad gaat door `useSheetClose` met `ref={sheetRef}` en `<SheetGrip />`, en geeft `canClose` door zolang het opslaat. De bevestiging bij een heel lange duur ("Klopt dit?") blijft. Mislukt opslaan, dan blijft het blad open met de melding en alles wat je invulde.

## 4. Waar train je, en de stopregels

Waar train je wordt de rij chips die de Briefing al heeft (`PlaceRow` met `shortPlaceLabels`): één regel hoog, nooit twee, met de korte namen. Van ongeveer 260 px naar 44 px.

De labels Beste keuze en Ook goed staan niet meer op het scherm. De beste keuze is de keuze die al gekozen staat. Kies je iets anders, dan komt er onder de chips één regel: het oordeel en wat je anders doet, bijvoorbeeld "Ook goed. Stel de band op een lichte helling in." Bij de standaard staat er geen regel. De volledige vergelijking staat waar hij al staat: Waar train je het best? in het blad achter de i.

De stopregels blijven op het scherm en volledig: de stemgids zegt dat een waarschuwing nooit wordt weggestopt. Ze verliezen alleen hun kaart en hun amber kop. De nieuwe vorm: onderaan de pagina, zonder rand, het kopje "Stop of schakel terug als" in gedempte inkt met één amber stip ervoor, en daaronder de twee punten in gewone inkt. De amber stip is dezelfde als in het blok Stand en morgen van Je dag: amber is een stip vooraan, nooit een gekleurde kop.

## 5. Innovatief en rustig

De zonebalk als instrument. De balk toont niet alleen welke zone, maar ook wat die zone voor jou is: de hartslag uit je instellingen (`zoneBpm`) en het tempo uit je testloop. Een tik opent het blad Zones: alle vijf onder elkaar, elk met jouw hartslag, jouw tempo en de zin hoe het voelt, met de zone van vandaag gemarkeerd. Achter de i in dat blad staat waar de getallen vandaan komen. Dit vraagt een kleine uitbreiding van `ZoneBar` in `ui.tsx` (een regel eronder en een tik), geen eigen opmaak. Bij het verschijnen groeit de balk één keer van links naar rechts in 300 ms, ease-out; in Rustig en Uit staat hij meteen op de eindstand.

De balk wordt je uitslag. Open je de Briefing van een training die je horloge al logde, dan staat dezelfde hartkaart er met wat je deed: "76 minuten", "310 m omhoog", en de balk met elke zone zo breed als de tijd die je erin liep. Vooraf en achteraf zijn dan hetzelfde beeld, plan en uitslag. Dit kan alleen als het log de tijd per zone heeft; de bouwer gaat na wat `runDetail` bevat. Later spoor.

Het hoogteprofiel als lijn. Niet in de kop. De lucht is een vast vlak dat op elk scherm gelijk is, en een lijn die er pas staat als de lus gevonden is laat de kop verspringen. Wel direct onder de kaart: één strook van 32 px met de stijging over de afstand, in gedempte inkt, die bij het verschijnen één keer van links naar rechts tekent in 400 ms. Zo krijgt "±300 m omhoog" een beeld bij de lus waar het over gaat. Dit is spoor 10 uit het eerdere ontwerp.

Wisselen van plek verandert het scherm, niet alleen de chip. Bij Loopband verdwijnt de kaart en de rij Weer in 200 ms (bestaat al voor de kaart). Niets beweegt daarna nog.

Grenzen: geen lus, alles tussen 150 en 400 ms, ease-out. Eén mint accent: de knop onderaan; de gekozen chip en de lus op de kaart zijn een gekozen keuze. De zonekleuren zijn de bestaande `--color-effort-*`. Geen nieuwe token. Niets onder 12 px; de regel onder de balk is 12 px, de chips en rijen zijn 44 px.

Wat ik bewust niet doe: geen aftelklok of startknop (je horloge start de loop), geen kaart per feit, geen uitklapblok, geen voortgangsring, geen beloning na het invullen, en geen profiel of kaart op Vandaag.

## 6. Regels voor de hele app

Deze vier gelden ook voor Je dag en Vandaag.

1. Elk feit staat één keer op een scherm. Een tweede plek mag ernaar verwijzen, niet het herhalen. Wie een regel toevoegt, zoekt eerst of het feit er al staat.
2. Eén scherm is één moment: vooraf, of achteraf. Invullen is altijd een blad na een tik en staat nooit onder de uitleg.
3. Eén kaart per scherm voor het hart; de rest is een lijst. Een rij heeft één vorm: links het vaste woord gedempt, rechts de waarde, en rechts een rondje (afvinken) of een pijltje (opent een blad). Meer soorten zijn er niet.
4. Kleur is schaars. Mint is de ene knop. Amber is een stip vooraan, nooit een kop of een woord in een zin. Uitleg staat achter de i; een waarschuwing staat op het scherm.

Een vijfde als toets voor Lookout: het hart en de ene knop staan op 360 bij 640 px boven de vouw.

## 7. Voor de bouwer

Sporen, in volgorde. Elk spoor is alleen weergave en heeft een eigen einde.

1. Uitzoeken waarom de Lange duurloop het oude scherm gaf, en de ingang gelijk trekken: elke training te voet opent de Briefing (`briefingEntry` gelijk aan `hasBriefing`), ook wandelen en de leesstand vooraf. Einde: Hoe je het doet bestaat niet meer voor lopen en wandelen.
2. De hartkaart in de Briefing (`KeyNumbers` en `ZoneBar` of `IntervalProfile`), het vak Wat je loopt weg. Einde: de kop en de hartkaart zijn gelijk aan de afdruk.
3. De vakken worden de lijst Voor je gaat; het horloge staat één keer; de onderbalk heeft één knop; opwarmen en rekken in een blad. `engine/briefing.ts` levert de rijen, met test.
4. De stopregels zonder kaart, en de regel onder de chips bij een andere keuze.
5. Het blad Hoe ging het? voor zelf invullen: het formulier uit `ExerciseLogger.tsx` verhuist ongewijzigd naar een blad in twee stappen. Gedaan en Zelf invullen openen het blad. `ExerciseLogger` blijft voor kracht in ASCEND en de rustdag.
6. De kaart na een loop van je horloge korter (`WatchAskCard`), na antwoord op vraag 2. Met een instelling: Vragen na je loop, Kort (advies) of Alles, in `settingsIndex.ts`, `settingsLayout.ts`, `settingsSummary.ts` en `settingsHelp.ts`.
7. De zonebalk met hartslag en tempo, en het blad Zones.
8. Het hoogteprofiel onder de kaart (eerst nagaan of elk punt van een lus een hoogte heeft).
9. De balk als uitslag.

Na spoor 4 is de klacht van de afdruk weg. Spoor 5 en 6 maken achteraf kort. Spoor 7 tot 9 zijn het innovatieve deel.

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

Er is één scherm vooraf, de Briefing, met de kop en de hartkaart van de afdruk bovenaan. Daaronder één rij chips voor waar je traint, de kaart met je lus, één lijst met vier rijen, en de stopregels zonder kaart. Elk feit staat één keer. Invullen is een blad met de naam Hoe ging het?; na een loop van je horloge zijn dat twee tikken. Innovatief zit in de zonebalk: hij toont je hartslag en tempo, opent de uitleg van alle zones, en wordt na afloop je uitslag. Geen nieuwe kleur of token, en de planning en de logs bewegen niet.

## Vragen voor de eigenaar

1. Mag de Briefing het enige scherm vooraf worden voor elke loop en wandeling, en wordt Zelf invullen een blad met alleen de vragen? Mijn advies: ja. Twee schermen met dezelfde inhoud is de bron van de herhaling.
2. Na een loop van je horloge: is Beter, Normaal of Slechter plus pijn genoeg, met de zwaarte uit je horloge en anders achter Meer? Mijn advies: ja, met een instelling voor wie alles wil zien. Ik laat eerst nagaan dat de belasting klopt zonder ingevulde zwaarte.
3. De volgorde: eerst de kaart met 75 minuten en de zonebalk, dan pas de kaart met je lus? En het hoogteprofiel onder de lus in plaats van in de kop? Mijn advies: ja op allebei. De zonebalk is wat je onderweg onthoudt, en de kop blijft op elk scherm gelijk.
