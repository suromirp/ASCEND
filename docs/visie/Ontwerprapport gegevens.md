# Ontwerprapport gegevens

Een voorstel om de gegevens op Stand, Logboek, Ascend, Run in detail, Lichaam, de weekterugblik en het jaaroverzicht rustiger en duidelijker te maken. Gemaakt door Cartographer Gegevens op 1 november 2026. Het is alleen een voorstel: er is geen code veranderd.

Bronnen: de tekstkaart in `docs/app-kaart/` (nagemaakte stand, 31 oktober 2026), de afdrukken van Lookout op 360 en 390 px in `/tmp/claude-0/-home-user-ASCEND/4d0c6aa5-8b66-58c8-800b-16eef12dac93/scratchpad/lookout-basis/shots/`, de code in `src/pages/` en `src/components/`, en wat er al stond in `docs/visie/Ontwerp en gebruik.md`, `docs/visie/Visuele upgrade en nieuwe ideeën.md` en `docs/visie/Run in detail.md`. De skill `dataviz` kon ik hier niet laden; voor de grafieken volg ik de afgesproken kern: één boodschap per grafiek, weinig inkt, labels direct bij de lijn, kleuren uit de tokens.

## 1. In het kort

1. De grafieken en de losse kaarten zijn goed. Wat knelt is dat dezelfde vraag ("doe ik wat gepland staat?") op zes plekken een eigen getal krijgt, en dat bijna elke kaart zijn uitleg bij elk bezoek opnieuw voorleest.
2. Stand: het lichte vlak met drie tellingen verdwijnt. Er komt één donkere kaart Ritme met één beeld (de laatste vier weken en deze week als stipjes) en één zin. "Op rij" komt alleen nog in beeld als er iets te vieren valt, nooit als 0.
3. Weekterugblik: eerst de week als zeven dagen met pictogrammen, dan hoogstens drie regels die ertoe doen, en de rest als rijen die een eigen blad openen. Op zondag heet hij "Je week tot nu" en noemt hij niets "blijven liggen" wat vandaag nog kan.
4. Logboek wordt puur wat je deed: geen "0 van 17" op de eerste van de maand, een eerlijke vergelijking met dezelfde dagen vorige maand, en de trainingen per week direct in beeld, met de weekterugblik als kop van elke week. De drie uitklaprijen gaan weg.
5. Ascend houdt het ene percentage. Stand toont het niet meer, en de tekst onder "Klaar voor je doel" gaat van acht getallen naar één.

## 2. Wat goed is en blijft

- De lucht bovenaan elke tab met één kaart erop, de tabkleuren en de rust van marine. Logboek en Ascend zien er bovenaan premium uit (`logboek-390.png`, `ascend-390.png`).
- De grafieken op Stand: de frisheidslijn met de marge vooruit, de beenkalender en de weekbalken met het streepje voor je gemiddelde. Dit is het beste visuele werk van de app en het blijft zoals het is.
- Op Ascend de ring met één percentage, de drie meters (snelheid, langste loop, weekvolume) en de regel met de volgende sleuteltraining. De meters zeggen in één blik waar het meeste te winnen is.
- Run in detail: het oordeel in één woord, drie getallen die elk een eigen korte uitleg hebben, de lege stand die zegt wat er mist en een knop met een tijdsgrens om de gegevens op te halen.
- Lichaam: het figuur, de open klachten eronder, wat terugkomt, en de eerlijke zin onderaan dat het geen diagnose is.
- Het jaaroverzicht als klimprofiel met de fasen als stukken van één lijn, en de huidige fase met haar weken.
- De vaste woorden en de stem: korte zinnen, het feit eerst.

## 3. Wat niet goed is

### Dubbel

- Gedaan tegen gepland staat op zes plekken met een eigen telling: de weekstrook op Vandaag, de kop van Week, "Deze week" en "Volgehouden" op Stand, "Trainingen 0 van 17" en "Gemist" in Logboek, de ring van de weekterugblik en "x van y" in de lijst van weekterugblikken. De getallen kloppen elk voor hun periode, maar naast elkaar lezen ze als zes meningen.
- Het percentage "Klaar voor je doel" staat bovenaan Stand (`Gr5ReadinessCard`) en op Ascend in de ring. Het is hetzelfde getal uit `goalReadinessFor`, maar het hoort bij één plek.
- De beenindex staat twee keer achter elkaar op Stand: groot in de kaart Beenindex ("0,1 Fris") en direct daaronder als "Vandaag: 0,1, fris" in Frisheid.
- De fase staat in het kopje van Stand ("Week 1 van 4, basisfase") en nog eens als regel Fase in het lichte vlak.
- Op Ascend staat "20 weken" in de ondertitel van de pagina en in de doelkaart, de snelheid staat in de zin en in de meter, en "Doel toevoegen" staat als plusje in de kop en als grote knop onder de kaart.
- De weekterugblik staat als kaart op Vandaag (zondag en maandag) en als uitklaplijst in Logboek; dat is goed, maar in Logboek zit hij los van de trainingen van die week.
- Run in detail toont het tempo per kilometer drie keer: in de staafjes, in de lijn over de afstand en als minibalk in elke rij van de lijst.

### Te veel

- Stand is een stapel van ongeveer vijftien kaarten, van beenindex tot les van de week. Elke kaart begint met twee tot vier regels uitleg die je na de eerste keer kent.
- Onder "Klaar voor je doel" op Ascend staan acht getallen in twee zinnen: 55:40, 45:00, 10:40, 1:04, 49:54, weer 45:00, 39 weken en 20 weken.
- De weekterugblik is een rij kopjes met losse zinnen (Advies, Blijven liggen, Wat ASCEND aanpaste, Je antwoord deze week, Volgende week), allemaal even zwaar.

### Onduidelijk of ontmoedigend

- "Op rij 0 trainingsdagen" groot in beeld.
- Logboek op 1 november: "0:00 uur", "0 van 17", "−7 uur 32 min" en "−10 tegen vorige maand". Op de eerste dag van de maand zegt dat niets en het voelt als een berisping.
- "gem. zwaarte 9" in de weekterugblik, "zwaarte ±4" en "punten" in Belasting, "Gem. cadans" zonder eenheid en zonder sport, "D+" en "D−".
- De terugblik op zondag zegt "2/5 gedaan" en "blijven liggen" terwijl er vandaag nog twee trainingen staan.
- "Wat ASCEND aanpaste" toont oude verschuivingen ("Testloop 5 km toegevoegd op do 29 oktober") die je niet meer helpen.
- In het jaaroverzicht staan bereiken als "66 tot 77 min" en "33 tot 44 min", een regel "Testloop 5 km: 14 jan en 15 jan" (twee dagen voor één test, mogelijk een fout in de gegevens) en "(met drie loopjes per week één van de twee)".

### Niet terug te vinden

- Tik je in de kalender van Logboek op een dag, dan opent "Wat speelde er?" en niet wat je die dag deed.
- De trainingen van de maand, de weekterugblikken en de extra cijfers in Logboek zitten achter drie uitklaprijen.
- Hoeveel je daalde staat in Logboek onder "Meer cijfers" en op Stand in de kaart Dalen, met elk een andere periode.

### Uitklappen die er nog zijn

`DisclosureRow` in Logboek (drie keer) en in de lijst van weekterugblikken, "Hoe werkt dit?" in de kaart Beenindex, "Opgelost" op Lichaam en de fasen in het jaaroverzicht. De afspraak is: geen uitklapblokjes, wel een eigen blad of scherm.

### Laadstand van Stand

In beide afdrukken van Stand (`stand-390.png`, `stand-360.png`, en de volle `vol-stand.png`) is de pagina helemaal leeg, zonder lucht of titel. Of dat aan het moment van de afdruk ligt of aan de pagina weet ik niet; Lookout moet het nalopen. De kwaliteitspoort zegt dat de app nooit op een leeg scherm start, en voor een tab geldt dat ook.

## 4. Eén taal voor tellen

Voor alles hieronder de basis: elke plek beantwoordt één vraag, en tellen gebeurt maar op één manier.

- Week: wat staat er deze week en wat is al gedaan. De telling van deze week staat hier.
- Stand, kaart Ritme: doe je over een paar weken wat gepland staat. Dezelfde telling als de coach (`engine/onCourse.ts#recentAdherence`), met de zin uit `adherenceSummary`.
- Logboek: wat je deed. Geen noemer met wat gepland stond en geen "Gemist".
- Weekterugblik: één week achteraf, en zolang de week loopt "tot nu".
- Ascend: je doel. Eén percentage, nergens anders.

Wat ervoor nodig is, is afgeleid uit wat er al is. Er komt geen nieuw opgeslagen veld.

## 5. Voorstellen per scherm

### 5.1 Stand, opnieuw ingericht

Dit is het grootste voorstel en het antwoord op "Dit is lelijk". De eerste stap, de kaart Ritme in plaats van het lichte vlak, kan los en als eerste gebouwd worden (zie de volgorde in hoofdstuk 7).

Opbouw van boven naar beneden:

1. De lucht (`SkyBand`), zoals op elke tab.
   - Kopje (`Eyebrow`) "Week 1 van 4, basisfase", titel "Je stand" in Marcellus.
   - In plaats van de vaste zin "Hoe je ervoor staat, naast wat je vandaag doet." één zin die de engine samenstelt uit de drie oordelen hieronder, bijvoorbeeld "Je benen zijn fris, je week is rustig en je houdt je ritme vast." In een rustweek komt erbij: "Deze week is een rustweek, zodat de weken ervoor binnenkomen." Dat vervangt de regel Fase.
   - De eerste kaart op de lucht (`LightCard`, dat mag: hij staat op de lucht, niet halverwege): drie kolommen, Benen, Belasting en Ritme. Per kolom een label in 14 px gedempt, het oordeel in Marcellus op 20 px ("Fris", "Rustig", "Op koers") en daaronder één feit in Inter tabular op 14 px gedempt ("index 0,1", "224 van 552 gewoonlijk", "18 van 23"). Elke kolom is een tikdoel van minstens 44 px en scrolt naar zijn kaart. Dit is het beeld in twee seconden.
2. Benen, één kaart (`Card`) in plaats van twee.
   - Kopje "Benen" met rechts een `InfoButton` die het bestaande `LegFatigueInfoSheet` opent. "Hoe werkt dit?" als uitklap verdwijnt.
   - Het oordeel en het getal zoals nu, met de balk fris, wat vermoeid, vermoeid.
   - Direct eronder de frisheidslijn (`FreshnessChart`), zonder zijn eigen regel "Vandaag: 0,1, fris" en met één korte zin: "Lager is frisser; rechts is een schatting uit je planning."
   - "Werkt nog door" en de regel over de volgende test blijven.
3. Beenkalender (`LegCalendar`) zoals nu, met één regel uitleg ("Feller is zwaarder, gestippeld is gepland.") en de rest achter een `InfoButton`.
4. Belasting per week (`WeeklyLoadChart`). De boodschap wordt de kop van de kaart: "In lijn met de vier weken ervoor." Daaronder de balken. De lange uitleg (minuten maal zwaarte, 45 minuten op 6 is 270 punten) gaat achter de `InfoButton`; de korte regel blijft "Punten zijn minuten maal zwaarte." De lijst per training staat al in het blad dat opent bij een tik op een week, en verdwijnt van de kaart zelf. "±4" wordt "zwaarte niet ingevuld, gerekend met 4".
5. Intensiteit (`IntensityMixCard`). Kop: het oordeel ("Goed verdeeld"). Dan de balk (`ZoneBar`) met de drie waarden direct eronder. "Goede duursporters doen ongeveer 80% rustig" gaat achter de `InfoButton`; "Naar het plan, niet naar je hartslag" blijft als bronregel.
6. Ritme, in plaats van het lichte vlak "Je stand in vier regels". Een gewone donkere `Card`.
   - Kopje "Ritme" met een `InfoButton`. Het blad zegt wat nu bij elk bezoek in beeld staat: wat je oversloeg telt als niet gedaan, ziekte en rustdagen tellen niet mee, de coach op Ascend telt hetzelfde, en wat "op rij" betekent.
   - Het oordeel in Marcellus uit `adherenceSummary` ("Op koers").
   - Eén beeld: vijf kolommen naast elkaar, de vier afgesloten weken en deze week. In elke kolom een stipje per geplande training, van onder naar boven: mint (`--color-progress`) is gedaan, `--color-track` is niet gedaan, en in de kolom van deze week een open rondje voor wat nog komt. Onder elke kolom de maandag in 12 px ("5 okt" en zo verder, de laatste "deze week"). Geen as, geen legenda; de uitleg van de kleuren staat in één regel eronder.
   - Eén zin: "Laatste vier weken: 18 van 23 gedaan." Dat is het enige getal. Deze week tel je met de stipjes, het getal ervan staat op Week.
   - "Op rij" is geen eigen blok meer. Pas vanaf drie trainingsdagen komt er een regel: "Nu 5 trainingsdagen op rij alles gedaan." Bij 0, 1 of 2 staat er niets.
7. Dalen (`DescentCard`). Alleen als er dalingen gemeten zijn, of als je doel dalen vraagt; dan met één zin wat er mist. "Nog geen dalingen gemeten" als losse kaart verdwijnt.
8. Lopen (`RunTrendsCard`, `AerobicTrendCard`) zoals nu. In de lege stand één zin in plaats van drie: "Na twee weken met rustige loopjes zie je hier je lijn."
9. Kracht (`ForgeEntryCard`, `StrengthProgressionCard`, `TrainingSplitRow`) zoals nu.
10. Wat speelde er (`InfluenceCard`) zoals nu.
11. Onderaan "Volgorde aanpassen" (`TextButton`, gedempt) met het bestaande `OrderSheet`.

Weg van Stand:

- `Gr5ReadinessCard` bovenaan: het percentage staat op Ascend.
- `IndexCheckCard` zolang er geen metingen zijn; dan staat de zin in het infoblad van Benen. Met metingen blijft hij onder Benen.
- Het blok Doel (`AdventureCard` en `LessonCard`). Het kamp hoort bij Ascend; de les van de week is geen stand. Waar hij heen gaat is een besluit (hoofdstuk 8).
- Het lichte vlak (`SkyPanel`). Stand krijgt er geen; de lucht bovenaan draagt de samenvatting al.

In `engine/cardOrder.ts` wordt het blok `vier-regels` het blok `ritme` (met `canBeFirst: true`) en verdwijnt `doel`. `resolveCardOrder` is al defensief; een bewaarde volgorde met `vier-regels` zet hij om naar `ritme`. Dat is geen schemawijziging van de export.

Nieuw in de engine, allemaal afgeleid en puur: een functie voor de zin bovenaan en de drie oordelen (benen uit `legFatigueOn` en `fatigueWord`, belasting uit `weeklyLoad`, ritme uit `recentAdherence`), en een functie die per week de stipjes levert (dezelfde telling als `recentAdherence`, per week opgesplitst).

Hergebruik: `SkyBand`, `LightCard`, `Card`, `Eyebrow`, `InfoButton`, `ZoneBar`, `TextButton`, `Num` voor een getal in een Marcellus-zin, en alle bestaande grafieken.

Eén accent: Stand heeft geen gevulde knop en geen missiekaart. Mint komt alleen als voortgang terug (de stipjes, de balken). Geen contourlijnen.

Lege stand (nieuw toestel of nog geen training): de lucht met de titel en de zin "Na je eerste training zie je hier hoe je ervoor staat." De drie kolommen tonen "nog niets" gedempt. Benen staat er met "Fris" en de lege lijn; Ritme zegt "Na twee volle weken zie je hier je ritme." De andere kaarten verschijnen pas als er iets te tonen is.

Laadstand: de lucht met kopje en titel staat er meteen, ook als de gegevens nog komen. Daaronder grijze vlakken van de hoogte van de kaarten in `--color-track`, zonder lus of glinstering. Nooit een leeg scherm.

Foutstand: lukt het rekenen voor één kaart niet, dan toont die kaart "Dit kon ik nu niet uitrekenen. De rest klopt wel." en de rest van de pagina blijft staan. Geen knop "Opnieuw" zonder tijdsgrens.

Bewust niet:

- Geen chips of tabjes binnen Stand die de helft van de pagina verbergen; de drie kolommen bovenaan zijn sprongen naar een kaart, geen schakelaars.
- Geen tweede percentage en geen "klaar voor je doel" op Stand.
- Geen groot getal voor een reeks, en nooit een 0 in beeld als iets er nog niet is.
- Geen licht vlak halverwege.
- Geen nieuwe opgeslagen velden.

### 5.2 Weekterugblik

Het blad blijft het blad (`WeekReviewSheet`), met `useSheetClose` en `sheetRef`. Het opent vanaf Vandaag op zondag of maandag (instelling `weekterugblik-dag`) en vanuit Logboek.

Opbouw van boven naar beneden:

1. Kop (`SheetHeader`): kopje "Week van 26 oktober", titel "Je week", feitregel "Week 1 van 4 · basisfase". Zolang de week loopt (zondag) is de titel "Je week tot nu".
2. Het beeld van de week in één oogopslag: de zeven dagen naast elkaar, zoals de weekstrook van Vandaag (`WeekStrip`), maar dan donker in het blad (een variant zonder `LightCard`). Per dag het pictogram van de sport in de sportkleur. Gedaan heeft het mint vinkje. Een dag die voorbij is zonder training is hetzelfde pictogram gedempt, zonder rood en zonder kruis. Vandaag heeft de letter in de ijsblauwe bol, en wat vandaag nog staat is het gewone pictogram zonder vinkje.
   - Eronder één regel in Inter tabular: "2 van 5 gedaan · 1:56 uur · hardlopen 8,6 km". Op zondag: "2 gedaan, vandaag staan er nog 2".
   - De ring (`Ring`) verdwijnt: de dagen zeggen hetzelfde, en beter.
3. Hoogstens drie regels die ertoe doen, onder het kopje "Wat telt". Twee over de week en de derde altijd de volgende week. Elk is één zin, hoogstens twee, met links een klein pictogram uit `icons.tsx`.
   - De engine kiest de twee in deze volgorde: pijn die je meldde (amber, `--color-warning`), een sleuteltraining die bleef liggen, trainingen die zwaarder of lichter voelden dan gepland, de wekelijkse lijfvraag, en anders het advies.
   - Voorbeeld voor 26 oktober: "Benen A en de testloop bleven liggen. Laat ze los: inhalen door te stapelen is geen goed idee." en "Je ene loop voelde zoals gepland."
   - Derde regel: "Volgende week: opbouw, 3:50 uur gepland, met een lange duurloop van 60 minuten."
   - "gem. zwaarte 9" komt hier niet meer. Is het van belang, dan zegt de regel het in woorden: "Je trainingen voelden zwaar, gemiddeld 9 van 10." Anders staat het in de lijst onder 4.
4. De rest achter een tik, als rijen (`SheetRows`, 52 px, de hele rij is het tikdoel, met `data-sheet-from`):
   - "Je trainingen" met als waarde het aantal. Opent een blad met de trainingen van die week; een tik opent het logblad (`LogDetailSheet`). Hier staat ook de zwaarte per training.
   - "Wat ASCEND aanpaste" met het aantal, alleen als er iets is dat nog geldt. Opent een blad met zinnen over hoe het nu staat, zonder pijlen: "De testloop staat nu op donderdag." Wat ongedaan is gemaakt, of wat buiten deze week viel, staat er niet.
   - "Je antwoord deze week", alleen als je iets schreef. Opent je antwoord met de vraag erboven.
5. Onderaan de bestaande link naar de instelling (`SettingsLinkRow`).

Op zondag, de week loopt nog:

- Niets wat vandaag gepland staat telt als "blijven liggen". Dat doet `buildWeekReview` al voor de telling (`scheduledDate < asOf`), maar de tekst en het beeld moeten het ook zeggen.
- De kaart op Vandaag verschijnt op zondag pas als de trainingen van vandaag gedaan zijn. Staat er nog iets, dan wacht hij tot maandag. Dit valt onder de bestaande instelling `weekterugblik-dag`; er komt geen nieuw veld bij.

Hergebruik: `WeekStrip` (met een donkere variant), `SheetHeader`, `SheetRows`, `LogDetailSheet`, `Icon`, `Pictogram`, `SettingsLinkRow`.

Engine: een pure functie die de hoogstens twee regels kiest uit wat `buildWeekReview` al levert, en een filter op `weekChanges` dat alleen geldende wijzigingen in deze week overhoudt en ze als huidige stand verwoordt.

Lege stand: een week zonder geplande trainingen opent niet (zoals nu). Een week waarin niets gedaan is toont de dagen gedempt en de zin "Deze week kwam het er niet van. Volgende week begint gewoon volgens plan." Geen schuldtoon.

Laadstand: het blad rekent uit wat er al in het geheugen staat; er is geen wachttijd te tonen.

Foutstand: lukt het niet om de week op te bouwen, dan opent het blad met "Deze week kon ik niet samenvatten." en de knop "Begrepen".

Bewust niet: geen ring met een half gevulde boog, geen rode kleur voor gemist, geen kopjes per onderwerp, geen oude verschuivingen in de eerste laag, geen nieuwe opgeslagen velden.

### 5.3 Logboek

Opbouw van boven naar beneden:

1. De lucht (`SkyBand`) zoals nu: kopje met de maand, titel "Logboek", de pijltjes voor vorige en volgende maand.
2. De kaart op de lucht (`LightCard`): "Getraind 7:32 uur" en "Trainingen 10". Zonder "van 17": het logboek is wat je deed.
   - De vergelijking gaat tegen dezelfde dagen van vorige maand ("1 uur meer dan 1 tot 12 oktober"), en komt pas vanaf de zevende dag van de maand. Voor een afgesloten maand gaat het tegen de hele vorige maand.
   - De pil is neutraal of mint (`StatusPill`), nooit rood.
   - Op de eerste dagen van een nieuwe maand staat er in plaats van "0:00 uur" en "−10": "Nog niets in november." en, als er vandaag iets gepland staat, "Vandaag staat je lange duurloop."
3. De kalender (`MonthCalendar`) in een `Card`.
   - Wat je deed valt op: een gedane dag krijgt een stipje in de sportkleur onder het getal (twee stipjes bij twee sporten).
   - Wat nog gepland staat is een stille rand in `--color-track`; nu zijn dat mint ringen, en daardoor lijkt het logboek een planner.
   - Vandaag in ijs.
   - De legenda wordt "Gedaan" en "Gepland".
   - Een tik op een dag opent een blad met die dag: de trainingen als rijen naar het logblad, en onderaan de rij "Wat speelde er?". Zo vind je terug wat je die dag deed.
4. Per sport, in een gewone donkere `Card` in plaats van het lichte vlak.
   - Per rij het pictogram, de sport, een regel en het grote getal, zoals nu.
   - Hoogtemeters gaan in de regel van lopen, wandelen en bergtocht ("3 tochten · 640 m omhoog").
   - Onder de rijen één regel met het totaal omhoog en omlaag in woorden: "Samen 1.240 meter omhoog en 1.180 meter omlaag." Geen "D+".
5. Je trainingen, direct in beeld en zonder uitklap, gegroepeerd per week, nieuwste bovenaan.
   - Elke week begint met een kopregel: "Week van 26 oktober", rechts "Bekijk je week". Die opent de weekterugblik (5.2). Zo staan de terugblik en de trainingen van die week bij elkaar, en verdwijnt de losse lijst "Weekterugblikken".
   - Daaronder de trainingen als rijen zoals nu (kleurstreep van de sport, datum, naam, één regel feiten, pijltje), elk 52 px.
   - De regel met feiten mag over twee regels lopen, zodat niets meer wordt afgekapt.
6. "Meer cijfers" verdwijnt.
   - Hoogtemeters staan bij de sporten (4).
   - "Gemist" hoort bij Ritme op Stand.
   - Hoogtemeters op een toestel komen in de rij van die sport.
   - Gemiddelde cadans en vermogen over alle sporten samen zeggen weinig; ze staan per training in het logblad. Of ze per maand terugkomen is een besluit (hoofdstuk 8).

Hergebruik: `SkyBand`, `LightCard`, `Stat`, `StatusPill`, `MonthCalendar`, `Card`, `Pictogram`, `LogDetailSheet`, `InfluenceSheet`, `WeekReviewSheet`, `TextButton`.

Eén accent: geen gevulde knop. Mint alleen in de pil en als voortgang.

Lege stand: een maand zonder trainingen toont de kalender met de geplande dagen en de zin "Nog niets in deze maand." Een maand voor je eerste training zegt "Hier begon je nog niet." en de pijl terug wordt gedimd.

Laadstand: de lucht en de kalender staan er meteen. De lijst is goedkoop om te tonen; de hartslagtekens bij een run (`useDeviations`) komen zodra ze klaar zijn, zonder dat de rij verspringt.

Foutstand: een training die niet goed te lezen is, staat als rij met de naam en "Gegevens niet compleet". Hij verdwijnt nooit stil uit de lijst.

Bewust niet: geen noemer met gepland, geen "Gemist", geen rode of groene getallen, geen uitklaprijen, geen tweede lijst van weekterugblikken.

### 5.4 Ascend

Klein en gericht; de opbouw van de tab blijft.

1. De lucht (`SkyBand`): kopje "Ascend", titel "Waar je naartoe werkt".
   - De ondertitel komt alleen bij twee of meer doelen ("2 doelen, het eerste over 20 weken"). Bij één doel zegt de kaart het al.
   - De seizoenstrook (`SeasonStripCard`): de naam bij een vlag dicht bij de rechterrand komt links van de vlag te staan, zodat hij niet meer wordt afgekapt ("Hardloopweds...").
2. De doelkaart (`GoalList`).
   - Ring met het percentage, naam, datum, label: zoals nu.
   - Onder "Klaar voor je doel" één zin met één nieuw getal: "Bij de groei van nu loop je rond 20 maart ongeveer 49:50."
   - De drie meters zoals nu. De meter met het meeste te winnen krijgt eronder "hier valt het meeste te winnen", en de losse zin daarover vervalt.
   - Het verschil met je doeltijd, het tempo per kilometer en "45:00 vraagt ongeveer 39 weken" staan in "Meer over dit doel" (`GoalSheet`).
   - De regel met de volgende sleuteltraining blijft.
3. "Doel toevoegen" als grote knop alleen als er nog geen doel is. Met een doel blijft het plusje in de kop.
4. Tochten, Krachtblok, Eerdere doelen: zoals nu.
5. Krijgt Ascend de avontuurkaart van Stand (het kamp), dan als rij onder de doelkaart die de ladder opent. Niet als tweede voortgangsmaat met een eigen getal naast het percentage.

Lege stand, laden, fout: zoals nu. De lege stand met de keuzechips en "Nieuw beginnen" is goed.

Bewust niet: geen tweede percentage, geen "x van y" voor het doel naast de meters, geen extra kaart.

### 5.5 Jaaroverzicht

1. Het klimprofiel met de fasen en de legenda: zoals nu.
2. De huidige fase als open kaart met haar weken als rijen (een tik opent die week): zoals nu.
3. De andere fasen als rijen in één `Card`: naam, data, aantal weken, en één zin over wat er gebeurt. Een tik opent een blad met die fase (dezelfde inhoud als nu uitgeklapt). Het uitklappen verdwijnt.
4. Bereiken worden afgerond op vijf minuten ("65 tot 75 min"); de inhoud blijft gelijk.
5. Twee regels moeten nagekeken worden voordat het ontwerp ze mooi maakt:
   - "Testloop 5 km: 14 jan en 15 jan" (twee dagen voor één test). Dat is voor Sherpa of Warden.
   - "(met drie loopjes per week één van de twee)". Die gaat in gewone taal, maar pas als duidelijk is wat ermee bedoeld wordt.

Lege stand: zonder programma geen jaaroverzicht, zoals nu. Laden en fout: zoals Week.

Bewust niet: geen echte belasting in het profiel (het is een schets en dat zegt het label al), geen nieuwe fasenamen.

### 5.6 Lichaam

1. Kop: "Lichaam", "Waar zit het?" Eronder in plaats van "Tik op de spier of het gewricht." een regel die eerst de stand geeft: "Geen open klachten. Tik op een plek om iets te melden." of "1 open klacht: knie, sinds 3 dagen." Het antwoord staat nu onder het figuur, dus onder de vouw.
2. Het figuur met de kant-keuze en de legenda: zoals nu.
3. Open klachten, deze week, wat terugkomt: zoals nu.
4. "Opgelost (n)" wordt een rij die een blad opent met de opgeloste klachten, in plaats van een uitklap.
5. De zin over diagnose onderaan blijft.

Lege stand: de regel bovenaan zegt het. Laden en fout: zoals nu.

Bewust niet: de beenindex hier herhalen. Of er een stille rij naar Benen op Stand komt, is een besluit (hoofdstuk 8).

### 5.7 Run in detail

Het scherm volgt het eigen ontwerp (`docs/visie/Run in detail.md`) en is goed. Ik zag het niet in een afdruk; dit oordeel komt uit de code.

- Het tempo per kilometer staat drie keer. De minibalk in elke rij van de lijst vervalt; de staafjes erboven doen dat werk al. De lijst houdt tempo, hartslag en de kenmerken.
- De kop herhaalt afstand en tijd, die ook in de drie getallen kunnen staan. Kies per soort run drie getallen die niet in de kop staan (dat doet `headlineStats` al voor een test).

Bewust niet: geen extra grafiek en geen vierde getal.

## 6. Grafieken: de regels die hier gelden

- Elke grafiek heeft één boodschap, en die boodschap staat als zin boven de grafiek ("In lijn met de vier weken ervoor"). De grafiek is het bewijs, niet de vraag.
- Labels staan bij de lijn of onder de kolom; een legenda alleen waar dat niet kan.
- Kleuren alleen uit de tokens:
  - mint (`--color-progress`) voor gedaan en voortgang;
  - `--color-track` voor leeg;
  - ijs (`--color-status`) alleen voor nu of vandaag;
  - amber (`--color-warning`) alleen voor let op;
  - sportkleuren alleen voor de sport.
  - Geen rood voor iets wat je niet deed.
- Niets kleiner dan 12 px, ook niet in een tekening; dagletters en data in HTML onder de svg, zoals `WeekRidge` doet.
- Getallen in Inter tabular, oordelen in Marcellus.
- Beweging alleen bij verschijnen, 150 tot 400 ms ease-out, in Rustig kort en in Uit meteen op de eindstand.

## 7. Volgorde om te bouwen

Klein en los eerst, de herinrichting van Stand als laatste.

1. Stand: de kaart Ritme in de plaats van het lichte vlak, "Op rij" alleen vanaf drie, de lange zinnen naar de `InfoButton`. Los te bouwen en direct het antwoord op "Dit is lelijk".
2. Weekterugblik op zondag: "Je week tot nu", niets "blijven liggen" wat vandaag nog staat, en de kaart op Vandaag wacht tot de trainingen van vandaag gedaan zijn.
3. Weekterugblik in drie lagen: de dagen, hoogstens drie regels, de rest als rijen.
4. De uitklappen eruit: "Hoe werkt dit?" bij Beenindex, "Opgelost" op Lichaam, de fasen in het jaaroverzicht.
5. Logboek: de kaart op de lucht zonder "van 17" en met de eerlijke vergelijking, de lege stand aan het begin van de maand, en een tik op een dag die de dag opent.
6. Logboek: de trainingen per week met de weekterugblik als kop, Per sport donker, "Meer cijfers" weg.
7. Ascend: de tekst onder "Klaar voor je doel", de dubbele knop, de naam bij de vlag.
8. Jaaroverzicht en Lichaam: bereiken afronden, de regel bovenaan Lichaam, en de twee regels in het jaaroverzicht laten nakijken.
9. Stand opnieuw ingericht: de zin en de drie kolommen op de lucht, Benen als één kaart, Belasting en Intensiteit met de boodschap als kop, de readinesskaart en het blok Doel eruit, `cardOrder` bijwerken. Lookout loopt daarnaast de lege laadstand van Stand na.

Bij elke stap: de tekstkaart (`npm run kaart`) en de invarianten in `scripts/app-kaart/invarianten.mjs`. Een controle dat het percentage van Ascend nergens anders staat, en dat de telling van Ritme gelijk is aan die van de coach, past daar goed bij.

## 8. Besluiten voor de eigenaar

1. Mag het lichte vlak van Stand helemaal weg? Mijn advies is ja: de lucht bovenaan met de drie woorden doet dat werk al.
2. Mag het percentage "Klaar voor je doel" alleen op Ascend staan, en niet meer bovenaan Stand?
3. "Op rij": alleen tonen vanaf drie trainingsdagen (mijn advies), of helemaal weg?
4. De avontuurkaart (het kamp) en de les van de week: naar Ascend, naar Vandaag op een rustdag, of weg?
5. De weekterugblik op zondag: wachten tot je trainingen van vandaag gedaan zijn (mijn advies), of meteen tonen als "Je week tot nu"?
6. Logboek: alleen wat je deed, dus zonder "van 17" en zonder "Gemist"? Die telling staat dan op Stand bij Ritme.
7. Logboek: de weekterugblikken als kop van elke week in de lijst, in plaats van een eigen lijst?
8. Gemiddelde cadans en vermogen per maand: weg, of per sport in een blad?
9. Lichaam: een stille rij naar Benen op Stand, of houden we Lichaam puur voor klachten?
