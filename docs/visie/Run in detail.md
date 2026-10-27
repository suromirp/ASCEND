# Run in detail

Ontwerp voor één scherm dat laat zien wat je in één run deed: per kilometer, per ronde en daartussen. Gemaakt door Cartographer op 27 oktober 2026. Alleen een voorstel, geen code. De inhoud van de patronen en het advies komt uit het onderzoek `docs/onderzoek/Run in detail.md` (nog niet klaar); dit ontwerp maakt er plek voor en schrijft de drempels niet vast.

De schets met nagemaakte gegevens staat in `/tmp/claude-0/-home-user-ASCEND/ad6ded69-be17-5801-b543-86d3d2b5c25f/scratchpad/run-detail/schets.html`.

## 1. In het kort

1. Eén volledig scherm, "Run in detail", met een vaste kop en de terugknop via `useSheetClose`. Je komt erin vanuit het logblad, het Gedaan-scherm en de kaart "Hoe ging het?" van het horloge.
2. Bovenaan het oordeel in één zin en drie getallen, elk met een korte uitleg. Daaronder van boven naar beneden: tempo per kilometer, de grafieken over de afstand, de lijst per kilometer en per ronde, loopvorm, patronen, vergelijking, advies.
3. Een testloop is hetzelfde scherm met drie extra's: de beste 5 km gemarkeerd, de verdeling van de test (inlopen, beste 5 km, uitlopen) en de vraag "Telt mee / Telt niet mee" bovenaan zolang die openstaat.
4. Wat ontbreekt, ontbreekt rustig: elk blok dat geen gegevens heeft, verdwijnt of zegt in één zin waarom het er niet is.
5. Belangrijkste technische bevinding: ASCEND bewaart nu 48 stukjes van gelijke tijd, geen kilometers en geen ronden. Voor dit scherm is een nieuw afgeleid veld nodig (hoofdstuk 8). Zonder dat veld kan alleen het globale beeld.

## 2. Wat er al is en wat ontbreekt

Wat er nu is, en wat dit ontwerp hergebruikt:

- `ActivityDetail` op de log (`models/activityDetail.ts`): 48 stukjes van gelijke bewegingstijd met afstand, hoogtewinst en -verlies, hartslag, cadans en gemiddelde dynamica per stukje, plus klim- en dalstukken, weer en kwaliteit (dekking van de hartslag, borstband gezien). Daaruit kun je geen kilometer halen: een stukje is bij een run van 36 minuten 45 seconden, bij een lange loop meer dan vier minuten.
- `SessionLog.bestEffort` (`{ km, minutes }`) voor de beste 5 km van een test. Er staat niet waar dat stuk in de run zit.
- `TestVerdictCard` met "Telt mee", "Telt niet mee", de getallen vooraf en Akkoord. Dit blijft zoals het is en wordt hier hergebruikt.
- `RunInsightCard` en `RunInsightSheet` ("Beter" en "Let op" met een blad "Waarom"), `engine/runInsight.ts` en `engine/runComparison.ts` met de poort voor wat vergelijkbaar is, en `reasonText` voor de reden bij "Niet te vergelijken".
- Grafiekstijl: kleine eigen SVG's in tokens, viewBox 320 breed, een haarlijn als basis (`--color-card-border`), een lijn van 2 px met ronde uiteinden, een eindpunt met een rand in de kleur van de kaart, tikken om te inspecteren (`TrendLineChart`), hoogte gedempt als vlak in `--color-track` achter de lijn en wat je houdt in mint met wat je weglaat gedempt (`TrimChart`), staafjes met afgeronde top, een gekozen staaf met een streepje eronder in mint en een stippellijn voor een referentie (`WeeklyLoadChart`). Alle tekst in HTML of op 12 px, nooit kleiner.
- `SheetHeader` (kop met Eyebrow, titel in Marcellus, sluitknop van 44 px), `SheetRows`/`SheetRow`, `Segmented`, `Chip`, `InfoButton`, `TextButton`, `Meter`, `ZoneBar`, `Stat`.

Wat er niet is:

- Geen kilometer-splits, geen rondes (laps) en geen reeks over de afstand. De integratie leest wel de streams uit het horloge maar haalt nergens rondes op.
- Geen plek van de beste 5 km in de run.
- Geen uitleg per getal voor dynamica buiten de kaart "Waarom".

## 3. Waar het zit

De kortste weg is: waar je de run al ziet, staat een rij of regel die het scherm opent. Geen nieuwe tab en geen nieuw menu.

- Logblad (`LogDetailSheet`). Direct onder de kop met datum en titel komt een `SheetRow` "Run in detail" met als tweede regel een feit ("12 km in 5:48 per km, 48 punten per run"). Voor een run en een tocht met gegevens van het horloge. Dit is de vaste plek: het logblad is waar ook Week, Logboek, `TestPendingLine` en de actiesheet naartoe leiden, dus alle wegen komen er vanzelf langs.
- Gedaan-scherm (`CompletionMoment`). Onder de kaart van `RunInsightCard`, of onder de zin "Niet te vergelijken" als er geen kaart is, staat een `TextButton` "Run in detail" van 44 px. Alleen bij één run. Het scherm opent over het Gedaan-scherm; terug is het Gedaan-scherm weer. De hoofdknop van het Gedaan-scherm blijft de enige gevulde mint knop.
- "Hoe ging het?" (`WatchAskCard`, de vraag bij een run van het horloge). Een `TextButton` "Bekijk de run in detail" onder de cijfers van het horloge. Bewust een stille tekstlink en geen knop: de kaart is er om drie vragen te beantwoorden, niet om te kijken. Het invulformulier van een run met de hand (`ExerciseLogger`) krijgt geen link, want daar is nog geen log met gegevens.
- Niet op Vandaag of Week als losse kaart. Die vragen "wat is mijn missie" en de run van gisteren hoort daar niet.

Opening: een volledig scherm over de pagina (`fixed inset-0`, achtergrond `--color-bg`, `max-w-md`, z-index boven het logblad). Het gebruikt `useSheetClose`, dus de Android-terugknop sluit het scherm eerst, het logblad eronder blijft staan, en er verandert niets aan het adres. Het wordt naast het logblad gemonteerd, niet erin (zoals `TrimSheet`), zodat een tik in het ene niet het andere sluit. Reden voor een volledig scherm en geen blad: er staan grafieken in die breedte en rust nodig hebben, en de kop moet vast blijven staan bij het scrollen (nu scrolt de kop van bladen weg, zoals in `docs/visie/Ontwerp en gebruik.md` bij de warming-up staat).

Het scherm opent met de run die je zag. Zonder log (verwijderd terwijl het open stond) sluit het zichzelf.

## 4. Opbouw van boven naar beneden

Eén kolom, `max-w-md`, 16 px aan de rand, 12 px tussen kaarten. De pagina heeft geen lucht (`SkyBand`): het is een verdiepingsscherm buiten de tabs, dus de Eyebrow is mint (`--color-page` buiten de tabs). Er is geen gevulde mint knop; het enige mint accent is de tempolijn en, bij een test, de beste 5 km.

### 4.1 Vaste kop

`SheetHeader`: Eyebrow "Run in detail", rechts de sluitknop (44 bij 44 px). De kop blijft bovenaan staan (sticky, achtergrond `--color-bg`, haarlijn eronder zodra je scrolt). Titel in Marcellus: de naam van de training ("Testloop 5 km", "Duurloop"). Eronder één regel in Inter tabular: datum, afstand, tijd. Dit vervangt de losse regel van het logblad.

### 4.2 Binnen twee seconden: oordeel en drie getallen

Eerste kaart (`Card`, met `texture` voor de contourlijnen: dit is de missiekaart van dit scherm, en de enige).

- Eyebrow "Hoe de run liep".
- Het oordeel in Marcellus, één woord of korte groep: "Gelijkmatig", "Te snel begonnen", "Sterk afgesloten", "Hartslag liep op". Daaronder één zin in gewone taal, in de stem van ASCEND: "Je begon 12 seconden per kilometer te snel en gaf dat in de laatste twee kilometer terug."
- Drie getallen naast elkaar in `Stat` (Inter semibold tabular, eenheid gedempt), elk met een eigen korte uitleg eronder in 12 px gedempt. Standaard:
  - Tempo: "5:48 /km" met "gemiddeld over de hele run, zonder stilstaan".
  - Verdeling: "+8 s" (tweede helft tegen de eerste) met "de tweede helft was 8 seconden per kilometer trager dan de eerste".
  - Hartslag: "158 bpm" met "gemiddeld, 7 slagen hoger in de tweede helft", of bij een test "Beste 5 km 27:40 (5:32 /km)" met "het snelste aaneengesloten stuk van 5 km".
  Welke drie getallen het zijn kiest een pure functie in `engine/` uit wat er is (zie hoofdstuk 8); het onderzoek bepaalt de beste drie per soort run. Het ontwerp legt vast dat het er altijd drie zijn, nooit meer.
- Bij een test staat onder de drie getallen de regel uit `testBasisLine` ("Beste 5 km uit je run: 27:40" of "Hele run: 6,03 km in 36:00"), dus de lezer weet waar de test op rekent.

De oordeelzin komt uit een regelbank van feiten (hoofdstuk 5.5), nooit uit vrije tekst, en neemt de toon van `docs/beslissingen/2026-10-27-stem-van-ascend.md` over: het droge feit eerst.

### 4.3 Open vraag bij een test

Alleen bij een testloop waar `TestVerdictCard` een vraag heeft (`pending` of `held`) staat de kaart hier direct onder de eerste kaart, onopgemaakt zoals nu: de vraag, "Telt mee" en "Telt niet mee" als `SecondaryButton`, met eerst de nieuwe tempo's en Akkoord. Dit scherm laat daarmee zien waarom de test traag leek (zie 6.2) op de plek waar je het antwoord geeft. Staat er geen vraag, dan zakt dezelfde component naar de onderkant (6.5).

### 4.4 Tempo per kilometer

Kaart met Eyebrow "Tempo per kilometer" en een `InfoButton` (blad: wat je ziet, hoe de balken zijn berekend, waarom de laatste, kortere kilometer apart staat).

- Staafjes, een per kilometer, in de stijl van `WeeklyLoadChart`: afgeronde top, 2 px tussenruimte. De hoogte is de snelheid: een snellere kilometer is een hogere staaf (zo betekent hoog altijd "goed"). De basis is niet nul maar de traagste kilometer min een stuk lucht, en dat staat er in woorden bij: "De balken beginnen bij 6:30, zodat verschillen te zien zijn." Anders lijkt elke kilometer even snel.
- Kleur: mint voor de staven; de kilometers die meer dan de afwijkgrens van het gemiddelde afwijken blijven mint maar krijgen een amber puntje (`--color-warning`) boven de staaf als ze te snel of te langzaam waren volgens de patronen. Kleur is nooit het enige signaal: onder de staaf staat het kilometernummer en boven de gekozen staaf het tempo.
- Een stippellijn voor het gemiddelde (zoals `WeeklyLoadChart` voor het niveau van daarvoor), met het getal aan het eind in 12 px.
- Rondes: staat er een ronde-indeling in de bron, dan komt er onder de staven een dunne band per ronde (een haarlijn met het rondenummer), zodat je ziet welke kilometers bij welke ronde horen. Bij intervaltrainingen zijn de rondes de herhalingen en zijn de staven per ronde en niet per kilometer (hoofdstuk 5.1, "Per ronde").
- Tik op een staaf kiest die kilometer: een streepje in mint eronder en een regel erboven ("Km 4: 5:12 per km, hartslag 163"). Dezelfde keuze markeert de kilometer in de grafieken en in de lijst eronder.
- Laatste kilometer korter dan een kilometer: een smallere staaf met de werkelijke lengte erbij ("0,8 km"); het tempo wordt wel per kilometer genoemd.
- Bij een test: de staven van de beste 5 km zijn mint, de rest (inlopen, uitlopen) in `--color-ink-dim` met lage dekking. Net als `TrimChart`: wat telt is mint, wat niet telt is gedempt.

### 4.5 De grafieken over de afstand

Kaart met Eyebrow "Over de afstand" en drie lagen onder elkaar met dezelfde horizontale as (kilometers, eenmaal onder de onderste laag). Elke laag is 72 tot 88 px hoog, 320 breed in de viewBox.

- Tempo: een lijn van 2 px in mint, gladgestreken per ongeveer 100 meter. Snel is omhoog, de as staat dus omgekeerd, en de eerste regel zegt het ("Hoger is sneller").
- Hartslag: een lijn in `--color-ink`, met de zones eronder als dun gekleurd streepje van 4 px in `--color-effort-1` tot `--color-effort-5` (zoals `ZoneBar`); er staat Z1 tot Z5 in tekst bij. Niet in mint: mint is tempo.
- Hoogte: een gedempt vlak in `--color-track` met een haarlijn bovenop, zoals in `TrimChart`. Eronder in woorden de stijging en daling.
- Dezelfde tik-en-inspecteer: een verticale haarlijn door alle drie de lagen en een label met kilometer, tempo, hartslag, hoogte (bij een tik komt het label boven de lijn zoals in `TrendLineChart`). De aangetikte kilometer en de lijst eronder blijven samen.
- Bij een test: de beste 5 km is een lichte mint vlakte achter alle drie de lagen, met "Beste 5 km" als 12 px tekst boven de linkerrand en de eindpunten als verticale mint streepjes.
- Pauzes (stilstaan): een dunne verticale onderbreking met onderaan "pauze 0:40"; geen vlak, geen kleur.

De dynamica staat hier niet bij (zie 4.7); drie lagen is het maximum op een telefoon.

### 4.6 Lijst per kilometer en per ronde

Geen tabel. Een kaart met een `Segmented` bovenaan, "Per kilometer" en "Per ronde" (de tweede alleen als er rondes zijn). Daaronder rijen van 56 tot 72 px, gescheiden door een haarlijn, de hele rij is een tikdoel.

Een rij heeft twee regels en past op 360 px zonder horizontaal scrollen:

- Eerste regel: links het nummer ("4") in Inter tabular, in het midden het tempo ("5:12 /km") groot genoeg om te lezen, rechts de tijd van die kilometer ("5:12") en de hartslag ("163"), beide gedempt met een eenheid ("bpm") in 12 px.
- Tweede regel in 12 px gedempt: wat er in die kilometer gebeurde in woorden, korte stukjes: "klim 14 m", "daling 22 m", "cadans 172", "stilgestaan 12 s". De dynamica die je hebt gekozen (4.8) komt hier ook, alleen als er ruimte is, anders staat ze in het blad van de kilometer.
- Een dun staafje onder de eerste regel (4 px, mint voor tempo) geeft de verhouding tegen de snelste kilometer van deze run, zodat de lijst op zichzelf een tweede kijk op de staven is zonder te herhalen.

Tik op een rij opent een onderblad (`Sheet` met `useSheetClose`, sluit met "Begrepen") "Kilometer 4":

- Eyebrow "Kilometer 4", titel Marcellus "Iets te snel" (alleen als de regelbank daar een woord voor heeft, anders de tijd).
- Alle getallen van die kilometer in een lijst van label/waarde: tijd, tempo, hartslag, cadans, grondcontacttijd, staplengte, verticale oscillatie, hoogte aan het begin en eind, stijging, daling. Elk met zijn eenheid en, onder de groep dynamica, één zin wat het getal betekent ("Grondcontact: hoe lang je voet bij elke stap op de grond is. Korter is meestal efficiënter.").
- "Wat daartussen gebeurde" (hoofdstuk 5.3), 1 tot 3 regels: "Na 700 m begon een klim van 22 m; je tempo ging 15 seconden per kilometer omlaag en je hartslag 9 slagen omhoog."
- Twee `TextButton`s "Vorige kilometer" en "Volgende kilometer" van 44 px, zodat je door de run kunt bladeren zonder het blad te sluiten.

Per ronde heeft dezelfde rij het rondenummer in plaats van het kilometernummer, de afstand van de ronde ("1,02 km") en de tijd; het blad heet "Ronde 3". Ontbreken rondes, dan verdwijnt de keuze (geen uitgegrijsde knop).

### 4.7 Loopvorm (de dynamica)

Een eigen kaart onder de lijst, Eyebrow "Loopvorm". Geen uitklapblokje: het is een aparte kaart die er staat of niet staat.

- Een `Segmented` (of `Chip`s als er meer dan vier zijn, in twee rijen) kiest een grootheid: Cadans, Grondcontact, Staplengte, Verticale oscillatie. Balans staat standaard uit (instelling, hoofdstuk 7). Welke er staan hangt af van wat er gemeten is en van de instelling.
- Eronder een grafiek zoals 4.5 (lijn in `--color-ink`, per kilometer een punt), 88 px hoog, met de eerste en laatste waarde aan de zijkant en daaronder de uitleg: één zin die zegt wat het getal is, wat "goed" kan betekenen en dat het van jouw eigen gemiddelde afhangt, geen norm.
- Daaronder één regel met een feit uit de run: "Je cadans bleef binnen 3 stappen per minuut." of "Je grondcontact werd in de laatste twee kilometer 8 milliseconde langer." Dit is een feit, geen oordeel, en het gebruikt de drempels van het onderzoek.
- Zonder gemeten dynamica (geen pod of borstband, een Forerunner zonder dynamica): de kaart is er niet. Alleen cadans is er vaak wel (uit de pols) en dan is de kaart er met alleen die ene grootheid.

### 4.8 Patronen

Kaart, Eyebrow "Wat opvalt". Hoogstens drie regels, ieder op een rij van minstens 52 px met een `InfoButton` die het blad "Waarom" opent, hetzelfde als `RunInsightSheet` (wat vergeleken is, hoe sterk, wat het kan betekenen; de achtergrond staat daar apart). Elke regel heeft een woord als Eyebrow en één zin:

- "Tempo": "Je begon 12 seconden per kilometer te snel. De eerste kilometer was je snelste en daarna ging het gelijkmatig omlaag."
- "Hartslag": "Je hartslag liep 8 slagen op terwijl je tempo gelijk bleef. Dat past bij vermoeidheid of warmte."
- "Loopvorm": "In de laatste twee kilometer werd je pas korter en je grondcontact langer."
- "Terrein": "De klim van kilometer 6 kostte je 18 seconden per kilometer."

De lijst komt uit de regelbank (5.5), geordend op hoe sterk de afwijking is, gemaximeerd op drie. Heeft de run geen patroon: één zin, "Niets dat opvalt. Een gelijkmatige run." Die zin is ook een uitkomst.

Er staat nooit een medische of oorzakelijke bewering ("door te weinig slaap"). Er staat wat gemeten is en wat het kan zijn, in dezelfde woorden als het loopinzicht ("kan", nooit "komt door").

### 4.9 Vergelijking met vergelijkbare runs

Kaart, Eyebrow "Tegen je eerdere runs". Gebruikt `engine/runComparison.ts` en zijn poort: alleen runs van dezelfde soort, vergelijkbaar in afstand, hoogte en weer. Het scherm rekent nooit een eigen poort uit.

- Als er genoeg vergelijkbare runs zijn: een regel in woorden ("Vergeleken met je 4 laatste runs van dezelfde soort"), dan twee of drie rijen label en waarde met het verschil: tempo, hartslag bij hetzelfde tempo, verdeling. Elk verschil krijgt dezelfde woorden als het gevoel, "Beter", "Normaal", "Slechter", en een kleine uitleg wat vergeleken is.
- Eronder een kleine grafiek van het tempo per kilometer, jouw run in mint en de mediaan van de vergelijkbare runs als dunne gestippelde lijn in `--color-ink-dim`. Zo zie je meteen of de dip bij kilometer 6 een gewoonte is.
- Zijn er te weinig vergelijkbare runs of is er niets te vergelijken: één zin met de reden uit `reasonText` ("Niet te vergelijken: je vorige run had een andere hoogte"). Geen lege grafiek.

### 4.10 Advies voor de volgende keer

Kaart, Eyebrow "Voor de volgende keer". Een tot twee zinnen uit een vaste lijst van adviezen die op een patroon volgen (5.6), met een `InfoButton` voor het waarom. Het advies is een suggestie, geen opdracht, en verandert nooit de planning: wil het ooit een sessie aanpassen, dan gaat het via een voorstel met Akkoord, zoals overal. Staat de instelling "Advies tonen" uit, dan is deze kaart weg.

Onderaan geen knop "Delen". Er staat wel `StravaTextButton` in het logblad; het hoort daar.

### 4.11 Voet

Een regel in 12 px gedempt met de bron en de volledigheid: "Gegevens van je horloge via intervals.icu. Hartslag over 98% van de tijd gemeten." Dan "Begrepen" als `SecondaryButton`, zodat sluiten ook onderaan kan.

## 5. Inhoud, zodat het onderzoek erin past

Het onderzoek is nog niet klaar. Het ontwerp scheidt vorm van inhoud: de schermen hieronder lezen een lijst van regels, en elke regel is een pure functie in `engine/` met een eigen test, in de stijl van `runInsight.ts`. Het onderzoek vult alleen de lijst en de drempels.

### 5.1 Wat het scherm kan laten zien

- Per kilometer (en per ronde): tijd, tempo, gemiddelde hartslag, cadans, grondcontacttijd, staplengte, verticale oscillatie, hoogte begin en eind, stijging en daling, stilstand.
- Over de afstand: tempo, hartslag, hoogte en de vier grootheden van de loopvorm.
- Per run: de verdeling (eerste tegen tweede helft), de hartslagdrift, het aandeel in elke zone (er is al `engine/intensityMinutes.ts`), de beste stukken (snelste kilometer, snelste 1 km blok, beste 5 km bij een test).
- Een "ronde" is wat de bron als ronde meldt. Bij intervallen is het een herhaling. Is er geen ronde-indeling, dan zijn er geen rondes.

### 5.2 Het oordeel

Het oordeel is een woord uit een korte vaste lijst, met een zin met getallen. Een run krijgt een oordeel uit de eerste regel die past, in deze volgorde: iets dat niet klopt met de meting (dan "Niet goed gemeten"), een duidelijk patroon in tempo, een duidelijk patroon in hartslag, anders "Gelijkmatig". Het woord is Marcellus, de zin Inter. De lijst en drempels komen uit het onderzoek.

### 5.3 Wat er tussen de punten gebeurde

Een punt is een kilometer of een ronde. "Tussen" is wat daarin gebeurt en wat een gemiddelde verbergt. Het scherm laat zien, in volgorde van belang:

- Klim- en dalstukken die in dit stuk zitten (`TerrainStretch`, al bewaard).
- Een tempoverandering binnen het stuk (eerste en tweede helft van de kilometer, uit het nieuwe veld).
- Stilstaan.
- Een hartslagpiek of -dal.

Dit staat in woorden in de rij (4.6) en uitgebreider in het blad van de kilometer. Er is geen aparte grafiek per kilometer: dat is op een telefoon te veel en de drie lagen van 4.5 laten het al zien.

### 5.4 Patronen en trends

Met trends bedoelt het ontwerp twee dingen die al in de app zitten en dus niet opnieuw bedacht worden:

- Binnen de run: verdeling, drift, afnemende pas. Zie 4.8.
- Over meerdere runs: de vergelijking van 4.9 en, wie meer wil, de sectie "Lopen" op Je stand (`RunTrendsCard`). Een trend over weken staat daar en niet op dit scherm. Dit scherm verwijst met een `TextButton` "Je trend bekijken" onder de vergelijking naar Je stand.

### 5.5 Regelbank

Een regel is: een naam, een voorwaarde op de getallen van de run, een woord, een zin met getallen, een sterkte (hoeveel de run afwijkt van de drempel) en de bron in `docs/onderzoek/`. Alleen regels waarvoor de gegevens er zijn doen mee. De kaart "Wat opvalt" toont de drie sterkste. Een nieuwe regel toevoegen is een regel in een lijst en een test, geen nieuw scherm.

### 5.6 Adviesbank

Een advies hangt aan een patroon of aan een testsituatie. Voorbeelden van de vorm, niet van de inhoud: "Begin de eerste kilometer 10 seconden per kilometer rustiger; dan houd je de laatste twee vol." en "Warm 10 minuten in en loop de 5 km aaneen, zonder te stoppen." Het advies noemt wat te doen, nooit wat er mis was.

## 6. Testloop als bijzonder geval

Een testloop (`TEST_TEMPLATE_ID`) gebruikt hetzelfde scherm en dezelfde blokken, met deze verschillen. Het onderscheid komt van de log, niet van een apart scherm.

### 6.1 De beste 5 km gemarkeerd

In 4.4 en 4.5 zit de beste 5 km als mint vlak met de rest gedempt. Staat de beste 5 km niet vast (de log is hele run of de serie ontbreekt), dan is er niets gemarkeerd en de zin in 4.2 zegt "Hele run: 6,03 km in 36:00". Er wordt dan niets voorgespiegeld.

### 6.2 De verdeling van de test

Een kaart direct onder de eerste kaart (en onder de vraag, als die er is), Eyebrow "Zo was je test opgebouwd". Een balk van drie delen met de lengtes naar verhouding: inlopen (gedempt), beste 5 km (mint), uitlopen (gedempt). Onder de balk drie kolommen met tijd en tempo, elk met een uitleg:

- Inlopen: "2,1 km in 12:30, rustig". Hier staat ook het gewone fietsen of wandelen voor de test, als het in de run zit.
- Beste 5 km: "27:40, 5:32 per km".
- Uitlopen: "0,9 km in 6:10".

De zin eronder legt de verdeling uit in gewone woorden: "Je test telt met alleen het stuk in het midden. De rest telde niet mee, omdat het inlopen en uitlopen was." Dit is precies het probleem uit `2026-10-27-testloop-lezen.md`: een warming-up trok de test omlaag.

Binnen de beste 5 km staat de verdeling per kilometer van de test ("Eerste 2,5 km: 5:28, tweede helft: 5:36, verschil +8 s"). Dat is de belangrijkste les van een test: of je gelijk liep.

### 6.3 "Telt mee" en "Telt niet mee"

Hergebruik van `TestVerdictCard` zonder aanpassing: dezelfde teksten, dezelfde knoppen en dezelfde stap "eerst zien, dan Akkoord". Zolang er een vraag openstaat staat hij boven in (4.3) en is hij de enige plek met actieknoppen op het scherm; staat er geen vraag, dan zakt hij naar het eind van het scherm (voor de voet), zodat een afgeronde test het scherm niet domineert. Er is geen tweede eigen knop; de knoppen heten overal "Telt mee", "Telt niet mee" en "Laten meetellen".

### 6.4 Wat de twijfeltest uitlegt

Is de test trager dan de vorige, dan staat onder de vraag in de patronen (4.8) welke feiten dat verklaren, zodat je beslist met kennis: "Je eerste kilometer was 14 seconden per kilometer sneller dan de rest", "Hartslag ging omhoog terwijl je tempo daalde", "Wind van 28 km/u uit het noorden" (uit `DetailConditions`). Alleen feiten uit de run. Nooit "dit was een slechte test".

### 6.5 Advies voor de volgende test

Een kaart "Voor de volgende test" in plaats van "Voor de volgende keer". Een of twee zinnen uit de adviesbank die op testen past: gelijke verdeling, inlopen, plek en weer ("Kies dezelfde route; deze testweg had een klim van 22 m"). Hier past ook het moment: "Een test kan weer na 3 weken", alleen als de planning dat al zegt (de engine kent de testregels in `raceBlock`); het scherm verzint geen termijn.

## 7. Zonder gegevens

Elk blok kijkt zelf naar wat er is. De eerste kaart en de lijst zijn er altijd; de rest verschijnt alleen als er iets te tonen is. Eén zin zegt in woorden wat er niet is, nooit een lege grafiek of "n.v.t.".

- Geen hartslag: de laag Hartslag verdwijnt, de lijst heeft geen hartslagkolom, het derde getal wordt iets anders (de verdeling of het hoogteverschil). Eén zin onder de grafieken: "Geen hartslag gemeten bij deze run." Is de dekking onder de ondergrens (`quality.heartRateCoveragePct`), dan zegt de zin hoe veel er gemeten is en telt het bij geen enkel patroon mee.
- Geen dynamica: de kaart "Loopvorm" bestaat niet. Alleen cadans: de kaart heeft één grootheid. In de rij van een kilometer ontbreken de velden gewoon.
- Geen hoogte (loopband): de laag Hoogte verdwijnt en er staat geen stijging.
- Loopband: er is geen gps, dus afstand en tempo komen van de band. Het scherm zegt dat in de kop ("Loopband"), laat Terrein en Weer weg, en de vergelijking gebruikt alleen loopbandruns.
- Alleen totaal (een run met de hand of een log zonder serie): het scherm bestaat nog wel, maar de eerste kaart toont alleen wat er is: tijd, afstand, gemiddeld tempo. Eronder staat één zin, "Voor kilometer na kilometer heb je de gegevens van je horloge nodig" en, als de koppeling met intervals.icu er is, een `TextButton` "Gegevens ophalen" (de `ensureBestEffort`-weg, met een grens in tijd en een zichtbare uitkomst). Is er geen koppeling: alleen de zin en een verwijzing naar Koppelingen.
- Opstart / laden: de kop en de eerste kaart staan meteen met wat de log al weet (totalen), de rest toont een rustige plaatshouder van de vorm van het blok, zonder draaiende cirkel, en de eigen tekst "Gegevens ophalen". Ophalen heeft een grens van 15 seconden zoals elders; daarna volgt de foutstand.
- Fout: "Het ophalen lukte niet. Er is niets veranderd; probeer het zo nog eens." met een `TextButton` "Opnieuw proberen". Het scherm blijft bruikbaar met de totalen.
- Lege staat (een run van minder dan een kilometer, of minder dan twee punten): geen staven, de zin "Te kort voor een verdeling" en het blok met de totalen. De lijst heeft één rij.
- Schakelaar "Details van loopjes en tochten" staat uit: de rij in het logblad is er niet, het scherm is er niet; de link in het Gedaan-scherm ook niet.
- Verouderd veld (de bron is gecorrigeerd): een regel "De run is gecorrigeerd bij intervals.icu. Je cijfers zijn bijgewerkt." Hetzelfde idee als `sourceUpdateLine`.
- Lange run (meer dan 30 km): de lijst toont de eerste 12 kilometer en een `TextButton` "Alle 42 kilometer tonen"; de staven schuiven mee in groepen van 5. Het tempo blijft per kilometer in de lijst.
- Tochten en wandelingen: dezelfde opbouw maar met tempo omgezet naar "per uur" en hoogte voorop; dat is een volgende stap, nu alleen hardlopen en wandelen op de weg (de plaatsen waar `isMountainTrip` een tocht aanwijst vallen buiten dit ontwerp).

## 8. Gegevens die erbij moeten

Dit is geen code, maar de keuze bepaalt of het scherm kan. De bevinding van het begin: de 48 stukjes van `ActivityDetail` zijn te grof en lopen niet op de kilometers; beste 5 km kent geen plek. Voorstel in drie stappen, volgens het patroon van `detail` en `bestEffort` (afgeleid, append-only, alleen toegevoegd aan een log die het nog niet heeft, tijdens het ophalen van de serie, zonder de serie te bewaren).

1. Een nieuw optioneel veld op de log, `SessionLog.runDetail` (merkloos, met versie), met:
   - de kilometers: voor elke volle kilometer en de rest tijd, afstand, hartslag, cadans, de vijf dynamica-gemiddelden, hoogte begin en eind, stijging, daling, stilstand;
   - de rondes uit de bron, als die er zijn, met dezelfde velden;
   - een herschaalde reeks van ongeveer 150 punten over de afstand (tempo, hartslag, hoogte, cadans en de dynamica), ruim genoeg voor de grafieken en klein genoeg voor een back-up (enkele KB per run);
   - waar de beste 5 km begint en eindigt (in meters), naast `bestEffort`;
   - de ruwe serie blijft ongebruikt, het gps-spoor wordt nooit bewaard.
2. De afgeleide getallen (drift, verdeling, drempels) rekent het scherm uit dit veld, in pure functies in `engine/`, niet in de componenten.
3. Het schema van de back-up verandert niet (optioneel veld, zoals `detail`), met een defensieve migratie zoals `migrateActivityDetail`: een kapot veld verliest alleen zichzelf. Bestaande logs vullen zich op verzoek aan, na een tik, volgens `2026-10-22-lege-velden-aanvullen.md`.

Als dit niet gebouwd wordt: dan kan het scherm met de 48 stukjes alleen de lijnen over de tijd tonen en geen kilometers; het ontwerp zou dan zonder 4.4 en 4.6 zijn, en de eigenaar ziet precies wat hij zegt niet te willen (totaal en gemiddelde). Dit is dus de belangrijkste afhankelijkheid.

Rondes: het is niet zeker of intervals.icu ze per activiteit levert; dat onderzoekt Scout of Sherpa bij het bouwen. Het ontwerp werkt zonder: de keuze "Per ronde" verdwijnt.

## 9. Instellingen

Volgens de werkafspraak: elke keuze instelbaar met het advies als standaard en één zin uitleg; de instelling komt in `src/data/settingsIndex.ts`, `src/data/settingsLayout.ts`, `engine/settingsSummary.ts` en de groepspagina, bij de bestaande rij "Loopinzicht" (`AppSettings.runInsight` krijgt een deelobject `detail`, additief, gelezen door `resolveRunInsight` en gecleand door `cleanRunInsight`). Er is een InfoButton per rij (`src/data/settingsHelp.ts`).

- "Run in detail tonen" (standaard aan). Uit: de rij in het logblad, de link in het Gedaan-scherm en de link bij "Hoe ging het?" zijn weg. Het veld op de logs blijft.
- "Loopvorm tonen" (een keuze in een onderblad, `ChoiceSheet`): welke grootheden in de kaart staan. Standaard cadans, grondcontact, staplengte en verticale oscillatie; de balans staat uit omdat dit besluit (`2026-10-22-loopinzicht.md`) de balans niet als regel toont. Waarde in de rij: "Cadans en nog 3".
- "Advies tonen" (standaard aan). Uit: de kaart "Voor de volgende keer" en "Voor de volgende test" zijn weg. De patronen blijven.
- "Patronen tonen" (standaard aan). Uit: ook "Wat opvalt" is weg. Samen met de vorige twee heb je een scherm met alleen getallen en grafieken. (Eén schakelaar is genoeg; twee schakelaars omdat de eigenaar verschillende wensen kan hebben.)
- Vergelijking: volgt de bestaande keuze "Weer erbij zoeken" en "Mijn hartslag komt van de borstband" van het loopinzicht; er komt geen tweede schakelaar.
- Per kilometer of per mijl: niet gebouwd. Alleen kilometers. Dit is een bewuste keuze, geen vergeten onderdeel.
- De eenheid van het tempo (min per km, km/u): niet gebouwd; lopen is min per km en tochten krijgen later hun eigen keuze.

Oude back-ups zonder `detail` importeren zoals voorheen (alles aan).

## 10. Ontwerpregels, hoe ze hier gelden

- Eén mint accent: het tempo (lijn en staven) en, bij een test, de beste 5 km. Er is geen gevulde mint knop; "Begrepen" en "Telt mee" zijn `SecondaryButton`. Hartslag is `--color-ink` met `--color-effort-*` voor de zones; hoogte is `--color-track`; vergelijking is `--color-ink-dim`; amber (`--color-warning`) alleen voor "let op". IJsblauw komt niet voor, want er is geen status in dit scherm. Geen nieuwe token nodig.
- Grafieken: eigen SVG's in tokens, zonder bibliotheek, 320 breed in de viewBox, tekst in HTML of 12 px.
- Tekst nooit onder 12 px; tikdoelen 44 px (staven krijgen een onzichtbaar vak van minstens 44 px hoog en de breedte van het slot, de rijen zijn 56 px).
- Terugknop: `useSheetClose` voor het scherm en voor het blad van een kilometer; het blad "Waarom" is `RunInsightSheet`. Niets herschrijft het adres.
- Marcellus alleen voor woorden: de titel, het oordeel, de titel van een blad. Alle getallen in Inter tabular, in zinnen via `Num`.
- Beweging: de staven en lijnen verschijnen één keer kort (150 tot 400 ms, ease-out, `mx-*`) en staan in Rustig en Uit meteen op de eindstand. Geen lus.
- Nooit RPG (geen punten, niveaus, medailles, "PR!" met confetti) en nooit sportschool (geen vuur, geen "beast mode", geen vergelijking met anderen). Alleen jij tegen jezelf.
- Taal: je/jij, kort en direct, geen uitroeptekens, geen gedachtestreepjes. De vaste woorden: Beter, Normaal, Slechter; Begrepen; Annuleren; Niet nu; Telt mee.

## 11. Wat het ontwerp bewust niet doet

- Geen tabel. Rijen met twee regels.
- Geen uitklapblokjes; wel blokken die er zijn of niet, en bladen.
- Geen kaart met een gps-spoor of een hoogteprofiel op een kaart (het spoor wordt niet bewaard).
- Geen vergelijking met andere mensen of met doeltijden van anderen.
- Geen score of cijfer voor de hele run. Een woord en een zin, geen getal dat een oordeel nabootst (vergelijk de regel over één voortgangstaal in CLAUDE.md).
- Geen medisch advies en geen oorzaak ("door je slaap"). Wel feiten en "kan".
- Geen aanpassing van de planning vanuit dit scherm. Een verandering gaat altijd via een voorstel met Akkoord.
- Geen mijlen, geen km/u, geen eigen kleuren per grootheid van de loopvorm.
- Geen delen of exporteren; dat blijft bij het logblad.
- Geen trend over weken; dat is Je stand.

## 12. Bouwvolgorde

1. Gegevens: het veld `runDetail` met de kilometers en de herschaalde reeks, plus migratie en test (hoofdstuk 8). Zonder dit geen scherm.
2. Het scherm met de eerste kaart, de staven, de lijst en de drie lagen. Eerst voor een gewone run, met de lege standen.
3. De testloop: beste 5 km, verdeling, `TestVerdictCard` erin.
4. Loopvorm, patronen, vergelijking en advies, ieder als apart blok achter de regelbank, zodra het onderzoek klaar is.
5. De ingangen (logblad, Gedaan-scherm, "Hoe ging het?") en de instellingen.

Controle volgens de werkafspraak: Lookout loopt het scherm door op 360 en 390 px met een vertraagde processor, met een run zonder hartslag, zonder dynamica, een loopband, een test en een lange run.

## 13. Vragen voor de eigenaar

1. Ben je akkoord dat er een nieuw veld per run bij komt (kilometers en ronden, een paar KB per run, afgeleid uit je horloge, zonder gps-spoor)? Zonder dat kan het scherm geen kilometers tonen.
2. Wil je bestaande runs ook aanvullen met de kilometers, met een tik per run of voor alle runs tegelijk, of alleen runs vanaf nu?
3. Gebruik je rondes op je horloge (handmatig of automatisch per kilometer)? Bij intervallen wil je de staven dan per ronde zien in plaats van per kilometer?
4. Welke drie getallen wil je bovenaan als eerste, bij een gewone run en bij een testloop? Mijn voorstel: tempo, verdeling (eerste tegen tweede helft) en hartslag; bij een test: beste 5 km, verdeling en hartslag.
5. Wil je de balans (links tegen rechts) en de verticale oscillatie in de loopvorm zien, of liever alleen cadans, grondcontact en staplengte?
6. Mag het scherm een oordeel in één woord geven ("Gelijkmatig", "Te snel begonnen"), of liever alleen de zin?
7. Moet "Run in detail" ook bij wandelingen en tochten komen, of alleen bij hardlopen?
8. Staat het goed dat de link bij "Hoe ging het?" een stille tekstlink is en geen knop?
