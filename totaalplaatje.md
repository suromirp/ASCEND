# Pathfinder totaalplaatje, 15 november

Wekelijkse doorloop van de app als geheel, vanuit de gebruiker. Gelezen: de tekstkaart in `docs/app-kaart/` zoals hij op main staat (klok 31 oktober, 390 px, nagemaakte standen), de besluiten van 9 tot en met 15 november en de code waar de kaart iets liet vermoeden. Niets gewijzigd, geen verse kaart gedraaid.

Bij elk punt staat hoe zeker het is: zeker (staat letterlijk in de kaart of de code), waarschijnlijk (afgeleid uit de code, niet op een scherm gezien) of gok.

## Het korte antwoord

Vandaag zegt op een gewone trainingsdag in twee seconden wat je missie is: de missiekaart staat bovenaan met naam, minuten en één knop. Op drie momenten niet: als je ziek bent, 's avonds, en (al bekend) als de ochtendvraag open staat. De week zelf telt sinds vandaag eerlijk, maar wat de app over een gemiste training zegt, zegt hij op drie plekken met drie verschillende adviezen. De twee nieuwe functies van deze week met de zwakste plek zijn Zonder sportschool en kracht uit: goed gebouwd, maar je vindt ze niet op het moment dat je ze nodig hebt.

## De tien punten

1. Ziek, vanaf de derde dag. Moet. Zekerheid: waarschijnlijk.
   Scherm: Vandaag en Week terwijl je ziek bent (`vandaag-ziek-eerder`, `week-ziek-eerder`).
   Wat er mis is: de kaart Ziek zegt elke dag dezelfde vaste zin, "Je trainingen van vandaag en morgen zijn van je planning gehaald". Dat klopt alleen op de dag van melden. Op dag drie met koorts staat direct daaronder "Morgen: Lange duurloop, 50 min" en in Week staat die loop gewoon met een sleepgreep. De melding haalt alleen vandaag en morgen weg (`engine/illness.ts#planIllnessStart`); daarna groeit de ziekte niet mee met de planning. Vandaag verbergt de missie wel zolang je ziek bent, dus de app weet het, maar zegt twee dingen tegelijk.
   Voorstel: de kaart telt mee ("Dag 3 ziek") en zegt alleen wat nu waar is. Zolang je ziek bent één rustige vraag per ochtend: "Nog ziek? Dan gaat ook morgen van je planning", met Akkoord. Bij koorts of buikgriep zwijgt de regel Morgen op de rustkaart.
   Voorbehoud: de stand ziek-eerder is gemaakt zonder het voorstel te draaien, dus de dagen 29 en 30 oktober zijn in de kaart niet representatief. Dat dag drie en later blijven staan volgt uit de code.

2. Ziek, de rest van het scherm. Moet. Zekerheid: zeker.
   Scherm: Vandaag en Week terwijl je ziek bent (`vandaag-ziek`, `week-ziek`).
   Wat er mis is: onder de kaart Ziek staat een tweede kaart die hetzelfde zegt ("Rust of vrije dag. Vandaag staat er niets gepland"). Daaronder krijg je met koorts het advies "Doeltijd 10 km: 45:00 vraagt meer dan je test laat zien" en de Back-up. Week biedt "Week opnieuw plannen, je hebt 2 trainingen gemist. Zet de rest terug naar het plan" aan terwijl je in bed ligt. Geen van die drie heb je nu nodig.
   Voorstel: zolang je ziek bent is de kaart Ziek de missie en verdwijnt de rustkaart. Het doeltijdadvies en Week opnieuw plannen wachten tot Ik ben weer beter; dan komt het herplannen juist op het goede moment, in hetzelfde voorstel als de opbouw.

3. Zonder sportschool vind je niet als je voor een dichte deur staat. Moet. Zekerheid: zeker.
   Scherm: Vandaag (missiekaart van een krachttraining) en het blad van een training in Week.
   Wat er mis is: de enige ingang is Week, helemaal onderaan, de rij "Vrije dagen en vakanties", die het woord sportschool niet noemt. Op de missiekaart, onder Meer keuzes, bij Niet fit? en in het blad van een krachttraining staat niets. Het moment waarop je dit nodig hebt is een krachttraining die vandaag niet kan, of de avond voor een reis.
   Voorstel: bij een training die de sportschool nodig heeft één rij in Meer keuzes en in het blad in Week: "Geen sportschool". Die opent het bestaande blad met vandaag ingevuld en je keuze voor Eigen gewicht of laten vervallen. De rij onderaan Week heet dan "Vrij, vakantie of zonder sportschool". Geen nieuw scherm.

4. Kracht heeft twee schakelaars op twee plekken, en kracht uit laat sporen achter. Moet. Zekerheid: zeker voor de twee schakelaars, waarschijnlijk voor de sporen.
   Scherm: Instellingen, Forge ("Kracht meerekenen") en Instellingen, Planning, Sporten ("Krachttraining"); daarna Ascend en Stand.
   Wat er mis is: twee rijen die bijna hetzelfde heten doen iets heel anders. De ene zet de voorstellen van Forge uit, de andere haalt kracht uit je week. Wie kracht wil uitzetten zoekt onder Forge en vindt de verkeerde. En de nieuwe instelling wordt alleen gelezen door de planning en de instellingen zelf: het overzicht blijft "Forge, Aan" zeggen, Ascend houdt de rij "Krachtblok. Hoe kracht in je week past" en Stand houdt de tegel Kracht. Geen stand in de kaart heeft kracht uit, dus dit is uit de code gelezen.
   Voorstel: één naam per ding. "Kracht meerekenen" wordt "Voorstellen van Forge". Bovenaan de pagina Forge één regel "Krachttraining staat uit" met een ingang naar Sporten zodra dat zo is. Krachtblok op Ascend verdwijnt of zegt dat kracht uit staat. Een stand kracht-uit in de kaart, met een invariant: geen scherm biedt kracht aan als kracht uit staat.

5. Eén gemiste training, drie stemmen. Moet. Zekerheid: zeker.
   Scherm: Vandaag ("Niet gedaan?" en de adviezenkaart), Week ("Week opnieuw plannen") en Je week tot nu.
   Wat er mis is: de telling is sinds vandaag overal dezelfde, de raad niet. Vandaag vraagt "Niet gedaan? Ging hij niet door, dan komt hij op overgeslagen". Week zegt "Je hebt 2 trainingen gemist. Zet de rest terug naar het plan". De weekterugblik, één tik verder, zegt "Laat het los; dubbel doen helpt niet". Zonder doel komt er nog een advies bij ("Testloop van do 29 gemist"). Dat zijn vier plekken voor hetzelfde feit en twee tegengestelde adviezen.
   Voorstel: gemist heeft één thuis, de rij in Wat nu wacht in Week, met één zin. Vandaag stelt alleen de vraag Niet gedaan? en verwijst daarna naar die rij. De weekterugblik noemt wat gemist is zonder eigen raad, of gebruikt dezelfde zin.

6. De avond ervoor staat nog steeds onderaan. Moet. Zekerheid: zeker.
   Scherm: Vandaag om 20:30 (`vandaag-avond`).
   Wat er mis is: de kaart is de laatste op het scherm, onder Je dag, Advies en de Back-up. Om half negen 's avonds is morgen het enige wat telt, en je moet langs "Tijd voor je back-up" scrollen om het te zien. Dit stond op 11 november al op de lijst en zou met de redesign meegaan; het staat er nog.
   Voorstel: na het tijdstip van de avondkaart staat hij direct onder de missiekaart, en op een rustdag neemt hij de regel Morgen over in plaats van hem te herhalen. De Back-up staat nooit boven iets wat bij vandaag of morgen hoort.

7. Het overzicht van Instellingen spreekt Vandaag en Ascend tegen. Later. Zekerheid: zeker.
   Scherm: Instellingen (`instellingen`).
   Wat er mis is: bovenaan staat "Fase: Basisfase, week 1 van 16". Vandaag, Week en Stand zeggen "Basisfase, week 1 van 4". Het ene is de week in het programma, het andere de week in de fase, onder hetzelfde woord. Op dezelfde stand zegt het overzicht "Doel: Geen, kies een doel" terwijl Ascend zegt "1 doel, en dat is over 20 weken". Dat doel heeft het label Voortop en er is geen hoofddoel; voor wie het ziet is het gewoon tegenstrijdig.
   Voorstel: de cel zegt "Programma: week 1 van 16" of volgt de vorm van Vandaag. Is er een doel zonder hoofddoel, dan zegt de cel "Geen hoofddoel" met de ingang naar het label. Een invariant in de kaart: de fasezin is op elk scherm dezelfde.

8. "Nog geen loopjes" terwijl het Logboek er acht telt. Later. Zekerheid: zeker.
   Scherm: Stand, de kaart Tempo bij zone 2 (`stand`).
   Wat er mis is: de lege toestand zegt "Nog geen loopjes. Elke week met een loop wordt hier een stip". Op dezelfde stand toont het Logboek 8 loopjes en 51 km in oktober. De kaart bedoelt lopen met hartslag die meetellen, maar zegt iets wat niet waar is.
   Voorstel: "Nog geen loop met hartslag. Een rustige loop met je horloge wordt hier een stip." Dezelfde controle voor Ritme ("Nog niets, na twee weken") als er al weken aan logs zijn.

9. De week in twee schrijfwijzen, en minuten die bij niets horen. Later. Zekerheid: zeker.
   Scherm: Week, de rij Je week tot nu, en het blad erachter.
   Wat er mis is: de rij zegt "0 van 3 gedaan · 0:56 uur", het blad zegt "0 gedaan · 1 losse training · 56 min". Hetzelfde getal in twee vormen, één tik uit elkaar. En op de rij leest "0 van 3 gedaan" naast 56 minuten als een fout: de minuten komen van de losse loop, die de rij niet noemt. Vervallen en overgeslagen (zonder sportschool) komen in het blad niet voor, terwijl ze in Week wel een eigen woord hebben.
   Voorstel: de rij neemt de zin van het blad over, met de losse training erbij. Het blad krijgt één regel voor wat verviel of bewust is overgeslagen, zodat "van 3" na te tellen is.

10. Het blad van een training in Week: twee keer waarom, en de Briefing als bijzaak. Later. Zekerheid: zeker.
    Scherm: het blad van een geplande training (`training-blad`).
    Wat er mis is: binnen vier regels staan "Waarom deze training" (het uitlegblad) en "Waarom staat dit hier?" (de dag). Twee vragen die je pas uit elkaar houdt nadat je ze beide hebt geopend. En voor een buitenloop met je horloge is de Briefing het enige wat je hier doet, maar hij staat onder "Andere keuzes" tussen Vandaag al doen en Overslaan; de hoofdknop is Verplaatsen.
    Voorstel: de dagvraag wordt "Waarom op zondag?". Bij een buitenloop is Briefing de eerste rij boven Andere keuzes, zoals de naam op Vandaag hem opent.

## Wat goed past

- Vervallen, overgeslagen, gemist en loopt nog hebben nu elk één woord in Week, en de kaart telt wat de rijen zeggen. Dat was de klacht van vanochtend en de kaart bewaakt het.
- De Briefing per manier houdt zich aan het juiste moment: op de loopband geen weer, geen plekken en geen hoogtemeters.
- De rij Zonder sportschool boven de dagen in Week zegt in één regel wat er speelt en is de ingang om het bij te werken.
- De pil van een training die bleef liggen staat op Vandaag en Week op dezelfde plek met dezelfde naam.

## Wat ik niet kon zien

- De hitteregel: de kaart draait zonder netwerk, dus zonder weerregel. De nieuwe zin voor herhalingen is alleen in `engine/heatPace.ts` gelezen, niet op een scherm.
- Routes voor wandelen: de stand heeft geen gekozen plaats, dus de Briefing toont "Kies je plaats" en geen lus, geen looptijd en geen amber regel.
- Forge afronden met de dag van je laatste set: het blad staat niet in de kaart.
- Kracht uit en de stand na een echt ziektevoorstel: geen van beide heeft een stand. Punt 1 en 4 rusten daar deels op de code.
- De kaart op main is niet opnieuw gedraaid; ik ging ervan uit dat hij bij 49eca57 hoort.
- Alles is nagemaakte data op 390 px. Wat de eigenaar op zijn telefoon ziet, blijft de laatste toets.

## Voor de coördinator

- Dit bestand staat in de hoofdmap omdat een nieuw document in `docs/` een regel in `bronnen.json` vraagt en ik niets anders mocht wijzigen. Zijn plek is `docs/onderhoud/2026-11-15-pathfinder.md`, met de punten in de backlog onder Samenhang.
- Punt 6 is een herhaling van de lijst van 11 november. Punt 3 en 4 gaan over werk van deze week en zijn het goedkoopst nu.
