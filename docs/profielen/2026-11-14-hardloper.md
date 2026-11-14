# Profiel hardloper, doorloop van 14 november

Hardloper naar 10 km op 10 januari 2027, vier dagen per week. Lookout plus Pathfinder, Chromium op 412 px, processor 4x vertraagd, echte touch, klok vast met `page.clock`, nagemaakte stand vanaf een lege app. Start maandag 16 november 07:30 (Amsterdamse tijd). Dagen bekeken: ma 16, di 17, do 19 (loop gedaan), vr 20, ma 23 (gemiste loop ingehaald), do 24 november, do 10 december (testloop gedaan), vr 11 december, ma 4, wo 6, zo 10 en ma 11 januari. Weken 2 tot 3 liet ik liggen zoals een echte gebruiker die even stopt. Geen tikdoel onder 44 px, geen tekst onder 12 px en geen horizontale overloop gevonden op Vandaag, Week, Stand, Ascend, de bladen en de onboarding. Geen consolefouten. Geen gedachtestreepjes gezien in de app.

Let op bij het lezen: een deel van de tegenstrijdigheden hieronder kan komen doordat ik de klok sprong zonder de app tussendoor te openen. Per bevinding staat of ik dat vermoed. De naspeelstappen gelden voor een lege app met `page.clock.install` en een sprong met `setSystemTime` plus herladen.

## Moet

1. Vandaag, Week en de weekbalk spreken elkaar tegen (vr 11 december).
   Scherm: Vandaag tegenover Week. Wat ik zag: Week toont "Benen A (zwaar), Vandaag, 75 min" op vrijdag 11 december. Vandaag zegt "Rust of vrije dag, Vandaag staat er niets gepland" en onder Advies "Bovenlichaam A en Benen A (zwaar) vervallen". De weekbalk bovenaan Vandaag toont kracht op woensdag en niets op vrijdag, terwijl Week woensdag vrij heeft. Verwacht: één plan. Hier kan ik niet uitsluiten dat de sprong van 3 weken meespeelt, het bleef zo na herladen en na een bezoek aan Week. Naspelen: onboarding (zie onderaan), akkoord, ga naar maandag 23 november en neem het inhaaladvies aan, spring naar donderdag 10 december, log de testloop (29 min, afstand 5 km, zwaarte 9), zet de klok op vrijdag 11 december 07:30, laad Vandaag en daarna Week.

2. Na de testloop zegt de app twee dingen over de beendag van morgen (do 10 december 's avonds).
   Scherm: Vandaag na het loggen. Advies "Zwaar": "Benen A (zwaar) op vr 11 december rustig houden (RPE 3-4)". Direct daaronder in het blok Gedaan: "Morgen Benen A (zwaar). Je benen zijn dan fris." Bovenaan: "Morgen: Benen A (zwaar), 75 min". Verwacht: één zin, en geen "fris" na een test op zwaarte 9 met beenindex 3. Naspelen: stappen van bevinding 1 tot en met het loggen van de test.

3. Een gemiste loop inhalen in de racewekdag: advies is een lange duurloop zes dagen voor de race (ma 4 januari).
   Scherm: Vandaag, Advies. Wat ik zag: "Lange duurloop doe je vandaag in plaats van je rustdag, want gisteren deed je geen training." Het Weekterugblik daaronder zegt dat de tempoloop "naar een vrije dag" wordt verplaatst, in de taperweek. Verwacht: in de laatste week geen advies om iets in te halen, alleen "laat los". De Racedag-rij toont op hetzelfde moment "Over 6 dagen". Naspelen: bevinding 1, daarna klok op maandag 4 januari 2027 07:30.

4. Maandag 23 november: drie bronnen vertellen drie verhalen over dezelfde gemiste loop.
   Scherm: Vandaag. De missiekaart zegt "Rustdag". Advies zegt "Lange duurloop doe je vandaag in plaats van je rustdag". Weekterugblik zegt "Dubbel doen helpt niet. Laat los wat blijft liggen." In de Week staat de loop nergens. Na Akkoord op het advies wordt de missie "Lange duurloop 45 minuten" (goed), maar het Weekterugblik met "Dubbel doen helpt niet" blijft staan. Verwacht: één advies, en een terugblik die niet het tegendeel zegt van wat je net aannam. Naspelen: akkoord op het plan, klok op maandag 23 november 07:30 zonder iets gelogd te hebben op de weekdagen ervoor, Vandaag openen, Bekijk, Akkoord.

5. Een tempoloop beschrijft zichzelf als rustig (do 19 november en do 24 december).
   Scherm: missiekaart Vandaag. Kop "Wennen aan drempeltempo" en onderaan "Rustig en gelijkmatig. Kun je hele zinnen praten, dan zit je goed." In de Briefing van dezelfde training staat "Zone 3, korte zinnen" en "stop als je geen korte zinnen meer kunt zeggen: je loopt te hard". Dat zijn twee tegenovergestelde instructies voor dezelfde loop. Verwacht: op de kaart dezelfde zin als in de Briefing. Naspelen: akkoord op het plan, klok op donderdag 19 november 07:30, Vandaag.

6. De rij "Je dag" noemt de geplande duur, de kaart de gelogde duur.
   Scherm: Vandaag na het loggen. Tempoloop gelogd met 41 min: kaart zegt "Tempoloop gedaan, 41 min", Je dag zegt "Gedaan · 40 min". Testloop gelogd met 29 min: kaart "gedaan, 29 min", Je dag "Gedaan · 45 min". Verwacht: dezelfde gelogde tijd. Naspelen: donderdag 19 november, Gedaan, duur 41, Opslaan.

7. Verouderde "Nog open" blijft dagen en weken staan, ook op de racedag.
   Scherm: Vandaag. Op zondag 10 januari staat "Lange duurloop van zondag 27 december 2026" als "Nog open" en "Rustige duurloop van do 7 januari" onder Advies. Op donderdag 10 december stond een loop van 26 november er nog. Elke dag zonder training stapelt Advies, Nog open, Back-up en Weekterugblik onder de missie. Verwacht: wat ouder is dan een week verdwijnt vanzelf, en op een racedag staat er niets dat over het verleden gaat. Naspelen: niets loggen, klok op zondag 10 januari 2027 07:30.

## Mag

8. Een hardloper kan niet kiezen voor drie lopen en één krachtsessie. Onboarding vraagt alleen het aantal dagen (4) en of je kracht wilt. Het plan geeft twee lopen en twee krachtsessies per week (dinsdag bovenlichaam, woensdag benen, donderdag loop of tempo, zondag lange loop). Voor een 10 km in 8 weken is dat dun, en benen "zwaar" op woensdag 6 januari (45 min), vier dagen voor de race, staat er ook. Verwacht: een vraag "hoeveel lopen" of een uitleg waarom twee.

9. Het voorstel in de onboarding spreekt het plan tegen. "Je eerste week" toont tien trainingen over twee weken, begint met een "Herstelwandeling ma 16 nov, 45 min", terwijl "Wat je koos" zegt "Rustdag: maandag" en Vandaag en Week er "Rustdag" van maken. In het voorstel staat de volgorde Benen A (di) en Bovenlichaam A (wo), "Wat je koos" zegt dinsdag Bovenlichaam A en woensdag Benen A. Het voorstel zegt ook donderdag "Tempoloop", "Wat je koos" zegt "donderdag: Rustige duurloop". Naspelen: onboarding tot en met "Bekijk je plan", wedstrijd, 10 kilometer, datum 10 januari 2027, 4 dagen, alle dagen, met krachttraining.

10. De vraagteller springt: "Vraag 2 van 6" en daarna "Vraag 3 van 7". Verwacht: één aantal zodra de keuze Wedstrijd bekend is, of een teller die niet terugloopt.

11. De eerste dag begint met een back-upvraag ("Tijd voor je back-up. Je hebt nog geen back-up") en blijft elke dag staan, ook na de Racedag. Op dag 1 is er niets om te bewaren. Verwacht: pas na de eerste loggen, en na "Niet nu" een aantal dagen stil.

12. Het tempo staat alleen in de Briefing, niet op de missiekaart. Na de testloop zegt de Briefing "6:05 tot 6:20 per km, tempo uit je testloop van 10 december" (goed), maar de kaart op Vandaag toont alleen "45 minuten". De hoofdknop van de kaart is "Gedaan" voor een loop die de eigenaar met zijn Garmin logt (principe 6 van Pathfinder). Het getal waar een hardloper om komt staat daarmee één tik te diep.

13. Locatie en doeltijd worden nooit gevraagd. Elke Briefing zegt "Een lus begint bij je plaats. Die heb je nog niet gekozen" en "Weer: Nog geen weer", acht weken lang. Het Racedag-blad op woensdag 6 januari zegt "Geen weer: er is nog geen plaats voor het weer gekozen" en "Geen doeltijd. Vul er een in bij je doel voor een tempo per km". Voor een wedstrijdloper zijn dit de twee dingen die het blad nuttig maken. Verwacht: een vraag in de onboarding of bij de eerste Briefing.

14. Het Racedag-blad en de Racedag-rij staan laag. Op de racedag staat de rij onder de missie, onder "Hoe voelen je benen?" en boven Je dag. Vier schermhoogten tot "Racedag". Verwacht: direct onder de missiekaart, boven de beenvraag.

15. De RPE-regel bij de testloop is de intervalzin: "Het plan: hard (RPE 8-9) in de zware stukken, rustig ertussen." Een testloop van 5 km heeft geen rustige stukken. Naspelen: do 10 december, Gedaan, het blad.

16. "Korter dan gepland. Prima: iets doen telt." na een testloop van 29 minuten die 45 minuten plande (inlopen en uitlopen horen erbij). De test heeft de 5 km gelopen; het oordeel hoort niet over de duur te gaan.

17. De Stand-kaart Kracht zegt "Nog geen krachttrainingen ingelezen uit MacroFactor" terwijl een gebruiker zonder MacroFactor zijn kracht in Forge doet. De rij is een lege plek voor wie MacroFactor niet heeft.

18. Taal en namen. Hetzelfde heet "gemist", "blijven liggen", "vervallen", "bleef liggen" en "Niet gedaan?". Het advies "Past het huidige krachtblok nog bij je week? ... op de ASCEND-pagina" verwijst naar de tab Ascend met de merknaam. De Ascend-tab toont het label "Voortop" zonder uitleg en twee keer "Doel toevoegen" (kop en kaart). De spreuk onder aan Vandaag staat in het Engels met "Nederlandse vertaling tonen" (keuze van de stem, niet als fout gerekend). Een directe link naar `#/stand/lopen` toonde na 3,5 s een leeg scherm onder de kop; via de rij "Tempo naast je test" laadt het blad wel. Dat laatste kan een artefact van mijn directe sprong zijn.

19. Na de race gaat het plan door in fase "Bergcapaciteit, week 1 van 4" (ma 11 januari) zonder dat er een tochtdoel is, met een Terugblik "Gisteren, nog zonder log" en direct daaronder "Wedstrijd bleef liggen. Laat los wat blijft liggen". Als ik de race niet log is de terugblik logisch; de combinatie met een nieuwe fase zonder vraag naar een volgend doel voelt als doorrennen.

## Wat goed ging

- Binnen twee seconden zie je de missie op elke dag die ik opende: "Rustdag", "Benen A (zwaar)", "Tempoloop 40 minuten", "Wedstrijd". De weekbalk bovenaan helpt.
- De onboarding is kort, in zinsletters, met "De rest overslaan, het advies gebruiken". Elke vraag was een scherm, geen tikdoel te klein.
- Na het loggen komt de uitkomst direct: "Nog 8 weken tot 10 kilometer", "1 van 4 trainingen deze week gedaan", beenindex met uitleg.
- Het inhalen werkt: na Akkoord wordt de missie een lange duurloop van 45 minuten in plaats van 60, met de reden erbij en "Ongedaan maken".
- Tempo uit de testloop komt zonder oordeel in de Briefing en op "Tempo naast je test" ("een controle, geen nieuw getal"). Het Racedag-blad bevat inlopen, versnellingen en tempo zonder doeltijd te beoordelen.
- De Terugblik de dag na de race is een goede stap.

## De drie belangrijkste punten

1. Eén plan: Vandaag, Week, weekbalk en Advies moeten dezelfde training noemen (bevinding 1, 2, 4).
2. De taperweek en de racedag zijn niet beschermd tegen inhaaladviezen en oude "Nog open"-kaarten (3 en 7), en Racedag staat te laag (14).
3. Een hardloper mist het getal waar hij om komt: het tempo op de kaart, de plaats en de doeltijd in de onboarding, en drie lopen per week (5, 8, 12, 13).

## Naspelen van de basis

Lege app, `page.clock.install({time: '2026-11-16T07:30:00+01:00'})`, 412 x 860, `hasTouch`, CPU 4x. Tikken: Nieuw beginnen, Een tocht of wedstrijd, Volgende, Een hardloopwedstrijd, Volgende, 10 kilometer, Volgende, datum 2027-01-10, Volgende, 4 dagen, Volgende, Volgende (alle dagen, met krachttraining), Bekijk je plan, Akkoord. Daarna per dag `page.clock.setSystemTime(...)` en herladen.

Niet gecontroleerd: 360 en 390 px, een echt horloge of een koppeling, een log van de race zelf, Instellingen, en wat er gebeurt als ik tussendoor de app wel dagelijks open. Schermafdrukken staan in de scratchpad, niet in de repo.
