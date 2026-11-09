# Tempo bij zone 2, stabiele stukken

Scout Tempo zone 2, 9 november 2026. Kort onderzoek voor de backlogregel "Tempo bij zone 2 beter maken" (`docs/backlog.md`). Het bouwt voort op `Loopgegevens en vooruitgang.md` (de poort voor een eerlijke vergelijking, ruis, drift, temperatuur) en `Run in detail.md`; wat daar staat herhaal ik niet, ik verwijs ernaar.

Zekerheidsmerk bij elk getal: zeker (gemeten of uit de code), waarschijnlijk (bron die er dichtbij ligt, of een rekensom op een goede bron), gok (eigen keuze, na een paar weken te ijken op je eigen data).

## Waar we staan

- `engine/aerobicTrend.ts` neemt per geplande rustige of lange loop de gemiddelde hartslag van de hele loop, rekent het tempo evenredig om naar het midden van zone 2 en maakt per week één punt (zeker, uit de code). De eerste 10 minuten, waarin de hartslag nog oploopt, tellen gewoon mee; een loop met een stuk boven zone 2 valt helemaal weg.
- Wat er per loop bewaard wordt (`models/runDetail.ts`): per kilometer het tempo, het vlakke tempo (`gapSecKm`, alleen bij minstens 10 m op of neer), gemiddelde hartslag, stijging en daling, wind tegen; de rondes; en een lijn van ongeveer 150 punten (zeker). De volledige reeksen staan apart in `activityStreams` zolang "Volledige reeks bewaren" aan staat (`storage/activityDetail.ts`, zeker).
- Het vlakke tempo komt uit de veelterm van Minetti e.a. 2002 over stapjes van minstens 25 m (`engine/runDetail.ts#minettiCost`, zeker).
- Het weer per loop staat in `detail.conditions` (temperatuur, gevoelstemperatuur, wind), zonder dauwpunt (zeker). `engine/heatPace.ts` kent wel een dauwpunt, maar alleen voor de voorspelling vooraf.

## 1. Wat een stabiel stuk is

Het idee: niet één gemiddelde per loop, maar alle stukken waarin hart en benen in een vaste toestand zaten. Dan tellen ook de rustige delen van een loop die verder te hard ging, en valt het oplopen aan het begin weg.

Hoe snel de hartslag een verandering volgt. Bij matige en stevige inspanning op de loopband volgt de hartslag een verandering in tempo met een tijdconstante van ongeveer 58 seconden (spreiding 24 seconden; 24 mannen) ([Zakynthinaki e.a. 2015, BioMedical Engineering OnLine](https://link.springer.com/10.1186/s12938-015-0112-7)) (waarschijnlijk). In gewone woorden: na een tempowissel duurt het zo'n 3 minuten voordat de hartslag voor 95 procent bij is (drie keer de tijdconstante, mijn rekensom). Na het einde van een zware herhaling duurt het langer.

Voorstel, per stuk:

- Minimale duur 5 minuten bewegen, zonder pauze van meer dan 20 seconden (dezelfde grens als `MAX_GAP_SEC`). Waarom 5: Nuuttila e.a. 2022 maten hun hartslag-tempo-index ook over een venster van 5 minuten, minuut 5 tot 10 van een vlakke loop ([Nuuttila e.a. 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9473708/)) (waarschijnlijk dat 5 minuten genoeg is; de 15 minuten in `Loopgegevens en vooruitgang.md` was voor drift, niet voor dit).
- Pas vanaf minuut 10 van de loop (waarschijnlijk; zie hoofdstuk 4).
- Pas 3 minuten na een duidelijke tempowissel of na een stuk boven zone 2 (waarschijnlijk, uit de tijdconstante hierboven). Na een herhaling boven zone 3 blijft de hartslag nog langer hoog; daar laat je de rest van de loop weg (gok, zie hoofdstuk 5).
- Hartslag en tempo eerst gladgestreken over 30 seconden (gok; GPS-tempo per seconde springt te veel).
- Hartslag: minstens 90 procent van de 30-secondenwaarden ligt binnen 5 slagen van het midden (mediaan) van het stuk (gok). Ter vergelijking: de normale dagruis is ongeveer 3 procent, op 145 slagen 4 tot 5 slagen ([Buchheit 2014](https://pmc.ncbi.nlm.nih.gov/articles/PMC3936188/)) (waarschijnlijk).
- Tempo (het vlakke tempo, als snelheid): minstens 90 procent van de 30-secondenwaarden binnen 7 procent van het midden (gok). Op 6:00 per km is dat ongeveer 25 seconden heen en weer, ruim genoeg voor GPS-ruis en een bocht, krap genoeg om een versnelling te weren. `Loopgegevens en vooruitgang.md` stelde 8 procent voor; 7 is strakker omdat het stuk korter is.
- Zone: de gemiddelde hartslag van het stuk ligt binnen zone 2 van jouw eigen zones (`heartRateZones.ts#zoneBpm`). Met stukken is de ruimte van 15 slagen eronder (`BELOW_ZONE_BPM`) niet meer nodig: die bestond omdat één gemiddelde per loop te weinig gaf (gok dat het met stukken genoeg is; na twee weken nakijken).
- Geen loopband (zeker, uit de poort in `Loopgegevens en vooruitgang.md`).
- Een stuk dat langer is dan 5 minuten blijft één stuk; je knipt het niet in stukjes van 5, want die zouden dubbel tellen (zie hoofdstuk 6).

Uit de bewaarde kilometers kan het al grof, zonder reeks: een kilometer duurt bij een rustig tempo 5,5 tot 7 minuten, dus een kilometer die voldoet is al bijna een stuk. Twee of meer aaneengesloten kilometers met een gemiddelde hartslag in zone 2 en een tempo dat per kilometer niet meer dan 7 procent verschilt, vanaf de kilometer die na minuut 10 begint, geven een stuk (gok). Minder precies dan de reeks, want binnen een kilometer zie je geen versnelling, maar het werkt op alle lopen die nu al een `runDetail` hebben.

## 2. Helling: naar vlak tempo, en wanneer je het stuk weglaat

Wat vaststaat:

- Minetti e.a. 2002 maten de energiekost van lopen op hellingen van min 45 tot plus 45 procent (zeker); de veelterm in `minettiCost` is die van hen ([Minetti e.a. 2002](https://journals.physiology.org/doi/full/10.1152/japplphysiol.01177.2001)). Op vlak terrein 3,6 J per kg per m. Mijn rekensom op die veelterm: plus 1 procent kost ongeveer 5 procent meer, plus 2 procent ongeveer 11 procent meer, min 2 procent ongeveer 10 procent minder.
- Strava legde in 2017 een model op hartslag van ongeveer zes miljoen lopen naast Minetti: bergop kwamen ze dicht bij elkaar, bergaf geeft hartslag minder voordeel dan Minetti zegt, en het voordeel stopt rond min 10 procent ([Strava, An Improved GAP Model](https://medium.com/strava-engineering/an-improved-gap-model-8b07ae8886c3); [Strava, Improving Grade Adjusted Pace](https://medium.com/strava-engineering/improving-grade-adjusted-pace-b9a2a332a5dc)) (waarschijnlijk; een technisch blog met eigen data, geen tijdschrift). Gevolg: op een licht dalend stuk maakt Minetti je vlakke tempo te traag, en je vooruitgang lijkt kleiner dan hij is.
- Barometrische hoogte heeft ruis; onder ongeveer 5 m per km is het ruis (`Betrouwbaarheid beenvermoeidheid-index.md`, waarschijnlijk).

Voorstel:

- Vlak tempo met dezelfde `minettiCost` en dezelfde stapjes van 25 m, zodat het klopt met de kilometers in Run in detail (zeker dat dat de bestaande methode is).
- Bij weinig hoogteverschil geen correctie: minder dan 5 m op en 5 m neer per km binnen het stuk telt als vlak, en dan geldt het echte tempo. Anders voegt de correctie alleen ruis van de hoogtemeter toe (waarschijnlijk).
- Weglaten: een stuk met een gemiddelde helling van meer dan 2 procent op of neer, of met een stukje van 200 m steiler dan 4 procent (gok). Daarboven is de onzekerheid van de formule zelf, zeker bergaf, groter dan de vooruitgang van een maand (1 tot 2 procent, `Loopgegevens en vooruitgang.md`). Voor een vlak land is dat zelden een verlies.
- De bestaande grenzen per hele loop (15 m per km, 30 m met vlak tempo) vervallen voor stukken: het stuk zelf wordt getoetst.

## 3. Warmte

Wat er is:

- Twaalf getrainde lopers, 30 minuten op 70 procent van hun topsnelheid: eindhartslag 154 bij 15 graden, 161 bij 25 en 176 bij 35, met drift alleen bij 25 en 35 graden (Mbambo, proefschrift Kaapstad, via [LIDA](https://lida.sport-iat.de/ta/Record/4026225); [proefschrift](https://open.uct.ac.za/items/6e517326-67f7-4912-98b0-1bff46e6426b)) (zwak, één kleine studie). Mijn rekensom: tussen 15 en 25 graden ongeveer 0,7 slag per graad, tussen 25 en 35 ongeveer 1,5 slag per graad. De stijging versnelt dus met de warmte.
- Arngrímsson e.a. 2003 zagen bij 22 lopers bij oplopende temperatuur een eindhartslag van 107, 112, 120 en 137 slagen ([J Appl Physiol 2003](https://journals.physiology.org/doi/full/10.1152/japplphysiol.00508.2002)) (waarschijnlijk wat het patroon betreft: weinig verschil in de koelte, veel in de hitte; de precieze temperaturen heb ik niet in de volledige tekst kunnen nalezen).
- Marathons worden trager bij warm en vochtig weer, langzame lopers meer (Ely e.a. 2007, al in `heatPace.ts`) (waarschijnlijk).

Wat het betekent: onder ongeveer 20 graden gevoelstemperatuur is het effect klein vergeleken met de dagruis; daarboven loopt het snel op en verschilt het sterk per persoon en per mate van gewenning. Een formule die het precies wegrekent bestaat niet voor jou.

Voorstel:

- Gevoelstemperatuur onder 20 graden: geen correctie (waarschijnlijk dat het effect daar binnen de ruis valt).
- 20 tot 25 graden: wel meetellen, met een kleine correctie van 0,7 slag per graad boven 20 op de hartslag van het stuk, voor je het tempo omrekent (gok, uit de rekensom op Mbambo). In de uitleg staat dat het warm was.
- Boven 25 graden gevoelstemperatuur, of een dauwpunt van 18 of hoger: het stuk telt niet mee voor de trend, wel als losse stip in een andere kleur ("warm, telt niet mee") (gok; 25 sluit aan bij de sprong in de studie, 18 ligt tussen "vochtig" 16 en "benauwd" 20 in `heatPace.ts`).
- De weerdata per loop krijgt het dauwpunt erbij als dat goedkoop kan; zolang het ontbreekt alleen de gevoelstemperatuur (zeker dat het nu ontbreekt).
- Niet de band van `heatPace` (10 tot 20 seconden) van het tempo aftrekken: die is bedoeld voor een voorspelling vooraf en is te grof voor een meting (waarschijnlijk).

## 4. Hartslagdrift

Wat er is:

- Bij lange inspanning daalt het slagvolume vanaf ongeveer 10 tot 20 minuten en stijgt de hartslag bij gelijk werk ([Coyle en González-Alonso 2001, Exerc Sport Sci Rev](https://scilit.com/publications/b2c41c04695672f811b81cfb09bf4f36)) (waarschijnlijk; ik las alleen de samenvatting).
- Bij drie uur fietsen steeg de hartslag tussen minuut 30 en 180 met gemiddeld 15 slagen, met 7 tot 9 slagen verschil tussen mensen ([Matomäki e.a. 2023](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2023.1128111/full)) (matig voor lopen). Mijn rekensom: ongeveer 0,1 slag per minuut, dus na een uur zo'n 5 slagen, op 145 ruim 3 procent, en dat is op 6:00 per km ongeveer 12 seconden. Even groot als een flinke maand vooruitgang.
- De grens van 5 procent ontkoppeling is een coachrichtlijn, geen gemeten grens ([TrainingPeaks](https://www.trainingpeaks.com/coach-blog/aerobic-endurance-and-decoupling/)) (expertmening, al besproken in `Loopgegevens en vooruitgang.md`).

Voorstel:

- De eerste 10 minuten tellen nooit (waarschijnlijk: de hartslag zit dan nog in het oplopen, en Nuuttila koos om dezelfde reden een vroeg maar niet het eerste venster).
- Een stuk telt tot minuut 60 van de loop (gok). Daarna alleen als de drift van die loop tot dan klein bleef: de verhouding tempo per slag van dat stuk ligt hoogstens 3 procent onder die van het eerste stabiele stuk van dezelfde loop (gok; 3 procent is ongeveer de dagruis, dus wat binnen de ruis valt mag mee). Zo telt de lange duurloop wel, maar niet het vermoeide einde.
- Binnen één stuk van 5 tot 15 minuten is drift klein (rekensom: hoogstens 1 tot 2 slagen) en hoeft hij niet apart getoetst; de hartslagregel uit hoofdstuk 1 vangt een stuk dat wegloopt al.
- Niet corrigeren voor drift met een formule: per persoon is hij te verschillend (Matomäki). Weglaten is eerlijker dan omrekenen.

## 5. Welke lopen

- Elke buitenloop met een reeks, niet alleen geplande rustige en lange lopen: ook het in- en uitlopen van een intervaltraining en de rustige delen van een tempoloop, mits het stuk zelf voldoet (backlog, zeker als wens).
- Maar eerlijk: na een herhaling boven zone 3 blijft de hartslag minutenlang hoger bij hetzelfde tempo, dus het uitlopen meet vermoeidheid en niet je basis. Voorstel: in een loop telt na het eerste stuk boven zone 3 van meer dan 2 minuten niets meer (gok, uit de herstelkinetiek die trager is dan het oplopen, zie Zakynthinaki). In de praktijk geeft een intervaltraining dan alleen een stuk als de inloop langer dan 15 minuten is. Dat is weinig, en dat hoort zo.
- Tests en wedstrijden niet (zeker, het is geen rustige inspanning).
- "Niet meetellen voor hartslag" (`excludedLogIds`) blijft gelden (zeker).
- Benen niet uitgerust (`legFatigue` niet fris, of een zware beendag in de 48 uur ervoor): wel tonen, niet meetellen, zoals de poort in `Loopgegevens en vooruitgang.md` voorstelt (waarschijnlijk, Bontemps e.a. 2020). Als eerste versie mag dit later; noem het dan in de uitleg.

## 6. Eén meting is één loop, niet één stuk

Stukken uit dezelfde loop zijn niet onafhankelijk: ze delen dezelfde dag, slaap, warmte en hartslagband. Tien stukken uit één lange duurloop zijn dus geen tien metingen (zeker, gewone statistiek). Voorstel: per loop één meting, het gemiddelde van zijn stukken gewogen naar duur; het aantal stukken en hun minuten gaan mee als gewicht van die loop, met een plafond van 30 minuten per loop zodat de lange duurloop niet alles bepaalt (gok).

De omrekening naar één hartslag: liever via de hartslagreserve (hartslag min rusthartslag) dan evenredig, zoals `Loopgegevens en vooruitgang.md` al voorstelde (afgeleid, waarschijnlijk beter; `HeartRateSettings.restingHr` bestaat). Met stukken die allemaal in zone 2 liggen is de omrekening kleiner en het verschil tussen beide methoden ook.

## 7. Eerste schatting of een uitspraak met marge

Wat de ruis is: tempo bij vaste hartslag schommelt van dag tot dag ongeveer 3 procent ([Buchheit 2014](https://pmc.ncbi.nlm.nih.gov/articles/PMC3936188/)) (waarschijnlijk). Op 6:00 per km is dat ongeveer 10 seconden per loop. Een realistische verbetering is 1 tot 2 procent per maand, 4 tot 7 seconden (`Loopgegevens en vooruitgang.md`, waarschijnlijk). Het signaal is dus kleiner dan de ruis van één loop; alleen een gemiddelde over veel lopen ziet het.

Een rekensom die laat zien waarom 8 over 4 weken een redelijke ondergrens is: met de huidige vergelijking (twee weken tegen twee weken een maand eerder) en 4 lopen aan elke kant is de onzekerheid van het verschil ongeveer 10 maal de wortel van een half, dus 7 seconden; een band waar je 80 procent zeker van bent is dan plus of min 9 seconden. Met minder lopen wordt die band breder dan de verandering die je wilt zien (waarschijnlijk, gewone statistiek op een aangenomen ruis van 10 seconden).

Voorstel:

- "Eerste schatting" zolang er minder dan 8 lopen met minstens één stuk zijn, of die lopen minder dan 4 weken overspannen (eerste tot laatste), of er geen 3 verschillende weken in zitten (gok, sluit aan bij de backlog). Dan alleen het tempo zelf ("rond 6:10 per km bij 140 slagen"), geen verandering.
- Daarna de verandering uit één rechte lijn door de lopen van de laatste 8 weken, gewogen naar het gewicht uit hoofdstuk 6, uitgedrukt als verandering per 4 weken (gok voor de keuze van de lijn; waarschijnlijk beter dan twee vensters, omdat elke loop meetelt en een gat van een week de uitkomst niet laat vallen). Deterministisch, zonder toeval.
- De marge: een 80-procentband uit de spreiding van jouw eigen lopen rond die lijn, met als ondergrens 2 procent spreiding per loop, zodat een paar toevallig gelijke lopen geen schijnzekerheid geven (gok). 80 procent en niet 95, omdat een band van "10 tot 20 seconden" voor een gewone lezer bruikbaar moet zijn; de uitleg achter de i zegt "waarschijnlijk", niet "zeker".
- Afronden op 5 seconden ("ongeveer 10 tot 20 seconden sneller"). Ligt de band over nul: "nog geen duidelijke verandering", eventueel met de band erbij ("tussen 5 langzamer en 10 sneller"). Is de band breder dan 30 seconden: alleen "nog te veel verschil tussen je lopen om iets te zeggen" (gok).
- Getal in tekst en lijn in grafiek komen uit dezelfde functie (backlog, zeker als eis). `progressMoment` leest de ondergrens van de band (de kant het dichtst bij nul), niet het midden, en viert alleen als die minstens 5 seconden sneller is (gok; dat maakt `MEANINGFUL_CHANGE_SEC` overbodig voor dit doel).

## 8. Bouwvoorstel

Elke stap hoogstens een uur, met eigen tests met nagemaakte reeksen. Alles is afgeleid en raakt de planning niet; geen voorstel met Akkoord nodig, wel een instelling (alles instelbaar).

1. Engine, opus. `engine/zone2Pieces.ts#stablePieces(streams, opts)`: pure functie die uit een `StreamSet` de stabiele, vlakke stukken haalt (hoofdstuk 1, 2, 4 en 5), zonder zones: per stuk begin, eind, minuten, mediaan hartslag, vlak tempo, helling, minuut van de loop. Tests: vlakke loop met een versnelling midden erin geeft twee stukken; de eerste 10 minuten tellen nooit; een heuvel van 5 procent valt weg; na een herhaling boven zone 3 niets meer; een pauze van 30 seconden knipt.
2. Engine, opus. Dezelfde stukken grof uit `runDetail.kms` als er geen reeks is (hoofdstuk 1, laatste alinea), met hetzelfde resultaattype en een veld `from: 'stream' | 'km'`. Tests: zelfde loop via reeks en via kilometers geeft een tempo binnen 3 procent.
3. Opslag, opus. Bewaren als afgeleid veld op het log (bijvoorbeeld `zone2Pieces` met `version` en de vingerafdruk zoals `runDetail`), één keer toegevoegd tijdens het ophalen in `storage/activityDetail.ts`, en voor oude lopen uit de bewaarde reeks. Append-only; migratiestap en back-up meenemen. De zone-indeling gebeurt pas bij het lezen, zodat een nieuwe drempel geen herberekening vraagt.
4. Engine, opus. `aerobicTrend` op stukken: zonefilter, warmte (hoofdstuk 3), benen, één meting per loop met gewicht (hoofdstuk 6), omrekening via de hartslagreserve, lijn met 80-procentband en de staat "eerste schatting" (hoofdstuk 7). Het oude pad blijft voor lopen zonder `runDetail` en zonder reeks. De golden scenario's (`planGolden.test.ts`) mogen niet bewegen. Tests op elke grens, en dat tekst en grafiek hetzelfde getal lezen.
5. Instellingen, sonnet. "Tempo bij zone 2" in een groepspagina met de keuzes die de app maakt (bijvoorbeeld warme lopen meetellen, stukken uit intervaltrainingen), in `settingsIndex.ts`, `settingsLayout.ts` en `settingsSummary.ts`.
6. Grafiek, sonnet. Elke loop als stip (warme of niet meetellende lopen gedimd), de lijn met de band, een as met tempo's en "sneller" omhoog, hoogste en laagste week benoemd. Tokens alleen uit `index.css`.
7. Tekst, sonnet. Eén zin wat het betekent ("Eerste schatting" of "ongeveer 10 tot 20 seconden sneller dan een maand geleden"), het hoe achter de i met de bronnen in `data/researchSources.ts`; `progressMoment` op de ondergrens. Tekstkaart vergelijken.

## Wat het onderzoek zegt

Een stuk van 5 minuten met vaste hartslag en vast tempo is een gangbaar meetvenster (Nuuttila 2022). De hartslag heeft ongeveer 3 minuten nodig om een tempowissel te volgen, en drift begint na 10 tot 20 minuten en loopt dan rustig door (ongeveer 0,1 slag per minuut bij fietsen). Warmte doet weinig in de koelte en veel boven 25 graden, met grote verschillen tussen mensen. Minetti is bergop goed en geeft bergaf te veel voordeel. De dagruis van ongeveer 3 procent is groter dan een maand vooruitgang.

## Wat het betekent voor de app

Meer metingen per loop, maar tellen per loop; vanaf minuut 10 tot 60; alleen vrijwel vlak; warme lopen boven 25 graden apart; "eerste schatting" tot 8 lopen over 4 weken; daarna een verandering met een band van 80 procent, afgerond op 5 seconden, en nooit een uitspraak die sterker klinkt dan de band. Het kan al grof op de kilometers die er nu liggen; met de reeks wordt het preciezer.

## Wat nog onzeker is

- Alle drempels voor stabiel (5 slagen, 7 procent, 90 procent van de tijd), de helling- en warmtegrenzen, minuut 60 en de 3 procent drift zijn gok. Ze moeten na twee tot vier weken op echte lopen worden nagekeken: hoeveel stukken blijven er over, en hoe groot is de spreiding per loop.
- De warmtecorrectie leunt op één kleine studie. Gewenning aan warmte verandert het effect; dat meet de app niet.
- Of de spreiding van tempo bij zone 2 uit stukken kleiner is dan 3 procent weet niemand voor jou; als hij kleiner is, wordt de band vanzelf smaller.
- Bergaf: een betere correctie dan Minetti (zoals die van Strava) is niet openbaar als formule. Daarom de strenge grens van 2 procent.
- Hartslag van de pols tegen de borstband: een wissel verstoort de reeks; ASCEND weet niet welke bron er was (`Loopgegevens en vooruitgang.md`).
- Dit is geen medisch advies. Een hartslag die zonder reden veel hoger ligt dan gewoon, of klachten tijdens het lopen: ga naar een arts.
