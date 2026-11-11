# Kansen voor de app, 11 november

Cartographer Kansen, op de vraag van de eigenaar van 11 november: "Wat missen we nog? Waar kunnen we profijt aan hebben?" Gelezen: `CLAUDE.md`, de tekstkaart in `docs/app-kaart/`, `docs/backlog.md`, de visiestukken, de werkbriefjes en de besluiten tot en met 11 november. Wat al in de backlog staat stel ik niet opnieuw voor; waar iets daar hoger moet, zeg ik dat. Alles hieronder is lokaal, zonder account en zonder server.

De app is ver. Bijna elk idee uit de eerdere visiestukken staat er (ochtendkaart met horloge, klimtempo, etappeplan, vertrekbrief, weekvraag, vroeg ziek, weekdagpatroon, routes, datavelden, Forge met ijkset en ladders). De winst zit nu minder in nieuwe meters en meer in drie dingen: het moment vóór een training (klaarleggen), de GR5-voorbereiding buiten de deur (wandelroutes, racedag, etappes), en eerlijke kleine tellingen die de vraag "wat is mijn missie vandaag" nu net niet in twee seconden beantwoorden.

## De vijf met het meeste profijt

### 1. De avond ervoor

- Wat hij merkt: is de training van vandaag gedaan, of is het na een vaste tijd ('s avonds), dan gaat de missiekaart op Vandaag over naar morgen. Bovenaan "Morgen 07.00, Lange duurloop, 60 min". Daaronder één blok Klaarleggen met hoogstens vier korte regels uit wat ASCEND al weet: het weer op het geplande moment en wat je aantrekt, "Donker tot 07.48, neem een lampje", "Rugzak 10 kg" bij een rugzaktraining, "Neem 500 ml mee" bij een lange tocht, "Staat op je horloge" of "Route klaar". Met de Android-app desgewenst één melding om 21.00 met dezelfde regels.
- Waarom het helpt: hij traint vaak vroeg of in het donker en de echte beslissing valt de avond ervoor (kleding, lamp, rugzak, eten). Nu staat "Morgen: Lange duurloop, 50 min" als een kale regel; kleding, zon, zweet en de route bestaan al als losse rekenwerken (`engine/clothing.ts`, `engine/sun.ts`, `engine/sweat.ts`, `storage/routeProposal.ts`). Het beantwoordt de missievraag ook na de training: dan is de missie morgen.
- Grootte: klein tot middel. Een pure functie `engine/eveningPrep.ts` die bestaande uitkomsten kiest en ordent; de kaart rendert alleen. Melding via de bestaande laag `integrations/notifications.ts`.
- Werkbriefje: `bediening-en-beweging.md` voor de kaart en de melding, `koppelingen-en-data.md` voor weer en zon. Hoort samen te gaan met "Licht tot 17.12" uit de ronde Buiten (backlog), want dat is dezelfde regel.
- Planning: raakt hem niet, alleen tekst. Instelbaar: aan of uit, de tijd van de omslag, de melding.

### 2. Routes voor wandelen en rugzaktraining

- Wat hij merkt: Route voorstellen werkt nu alleen voor een looptraining (`engine/routeTarget.ts#wantsRoute`). Bij een wandeldag, rugzaktraining of bergtocht in Nederland krijgt hij dezelfde twee lussen, op de afstand en de hoogtemeters van de training, met het meeste klimwerk dat binnen bereik ligt. Eerlijk als het niet kan: "Binnen 15 km van je start ligt hoogstens 120 m stijgen; voor 400 m is de Heuvelrug of Zuid-Limburg nodig." En een startpunt dat niet je deur is, bijvoorbeeld een station, zodra de kaart met tik-op-start uit de Inbox er staat.
- Waarom het helpt: de GR5 is het hoofddoel en de lange tochten met rugzak zijn de belangrijkste trainingen van het jaar, maar juist die plant hij nu in een andere app. De hele keten bestaat al: heuvels uit OpenStreetMap, BRouter met een wandelprofiel, hoogte, GPX naar Garmin Connect. Het verschil met lopen is vooral het profiel (paden in plaats van asfalt), het tempo (klimtempo uit `engine/climbPace.ts` in plaats van looptempo) en een langere afstand.
- Grootte: middel, groot met het startpunt elders. Eerst na de twee Inbox-punten over routes (kaart en verfijnen), anders bouw je op een planner die nog leert.
- Werkbriefje: `koppelingen-en-data.md` (route), `planning.md` alleen om te lezen welke trainingen een tocht zijn (rollen, nooit een id).
- Planning: raakt hem niet. Een route wordt niet bewaard en plant niets, zoals nu.

### 3. Een sleuteltraining die bij je doel past

- Wat hij merkt: op Ascend staat bij een hardloopwedstrijd met doeltijd "Volgende sleuteltraining · wo 4 nov. Benen A (zwaar), 75 minuten", terwijl de kaart erboven zegt dat snelheid het meeste te winnen heeft. Na de wijziging noemt die regel de training die het doel het meest dient: bij een race de tempoloop of de lange duurloop, bij de GR5 de lange tocht of de rugzaktraining, bij een vaardigheid de training met die ladder.
- Waarom het helpt: dit is de ene regel op Ascend die zegt wat de volgende stap is, en nu kiest `engine/goalList.ts#nextKeySession` gewoon de langste training van de komende twee weken. Daarnaast heeft het woord al een andere betekenis in `engine/adviceWeek.ts` (de lange duurloop of bergtocht die wordt ingehaald). Twee betekenissen van één woord is precies het "te vaag" dat hij eerder afwees.
- Grootte: klein. Eén functie die per soort doel de rol kiest (via `goalReadinessFor` en `hasRole`), met tests, en dezelfde functie gebruiken in het inhaalvoorstel en de weekterugblik.
- Werkbriefje: `doelen.md`, en `week.md` voor het inhalen.
- Planning: alleen als het inhalen dezelfde definitie gaat gebruiken; dat blijft een voorstel met Akkoord zoals nu. De regel op Ascend zelf is tekst.

### 4. Racedag voor de 10 km

- Wat hij merkt: in de laatste week voor de wedstrijd een blad Racedag, te openen vanaf de missiekaart en vanaf Ascend. Van boven naar beneden: start, weer op het startuur en wat je aantrekt, inlopen (hoe lang en wanneer), en een tempo per kilometer voor de doeltijd en ernaast voor de verwachte tijd, met één droge zin over de start ("De eerste kilometer 5 seconden rustiger dan je doeltempo"). Hij kiest welke van de twee hij volgt; met de schakelaar Trainingen naar je horloge gaat de wedstrijd dan als training met tempodoelen naar het horloge. De dag erna een korte terugblik: tempo per kilometer tegen het plan, uit de details van het horloge.
- Waarom het helpt: de wedstrijd van maart is het eerste harde moment op weg naar de GR5. De tempo's (`engine/racePaces.ts#raceOutlook`), het weer, de kleding en de kilometers van de run (`engine/runDetail.ts`) zijn er al, maar komen nergens samen. De wedstrijd gaat nu bewust niet naar het horloge (`2026-10-22-trainingen-naar-horloge.md`); met een gekozen tempo kan dat wel, als keuze.
- Grootte: middel.
- Werkbriefje: `lopen-en-tests.md`, `koppelingen-en-data.md` voor het horloge, `doelen.md` voor de regel "het doel blijft het doel": het blad beoordeelt de doeltijd niet, het toont beide tempo's zonder oordeel.
- Planning: raakt hem niet. Het sturen naar het horloge is geen planningswijziging, wel een nieuwe instelling (standaard uit, zoals de rest van het horloge).

### 5. Je eerste keren en je beste

- Wat hij merkt: in het Logboek een rustige lijst Momenten: je eerste 1.000 hoogtemeters op een dag, je eerste tocht met 12 kg, je langste loop, je snelste 5 km, je eerste twee dagen achter elkaar met rugzak, een hogere stap op een ladder. Per moment de datum, wat je deed en, als hij wil, één eigen zin. Daarnaast Je beste: een korte lijst van records die bij zijn doelen horen (langste loop, snelste 5 km, meeste hoogtemeters op een dag, zwaarste rugzak, geschat maximum op de hoofdoefeningen). Eind december één keer Je jaar: wat je deed, wat je voor het eerst deed, en je eigen zinnen.
- Waarom het helpt: het GR5-rapport (idee 7) wees dit aan als de motivatie die werkt bij een voorbereiding van maanden, en het is niet gebouwd. Een moment zegt wat je kunt; het is geen badge, geen punten, geen confetti. Over negen maanden leest hij zijn voorbereiding terug als verhaal. Je jaar valt over zeven weken, een goed eerste moment om het te laten zien.
- Grootte: middel. De herkenning is een pure functie over de logs (afgeleid, niets opslaan); alleen de eigen zin wordt bewaard, alleen toevoegen, met een migratiestap en in de back-up.
- Werkbriefje: `historie-en-logs.md`, `doelen.md` (geen tweede voortgangsgetal: een moment is een feit, geen percentage).
- Planning: raakt hem niet.

## Per gebied

### Vandaag

- Gat: op een dag zonder training staat "Rust of vrije dag". Week weet het wel ("Rustdag" of "Vrij"); Vandaag moet het ook zeggen, met wat erbij hoort ("Rustdag. Wandelen mag."). Klein.
- Gat: in de tekstkaart staat op Vandaag en Vandaag met horloge een lege eerste kaart. Nakijken of dat een lege huls is die op het scherm ruimte kost, of alleen het weer zonder netwerk in de kaartrun. Klein.
- Klein: na Gedaan en na de omslag van de avond (voorstel 1) is de bovenste regel altijd morgen, zodat het scherm ook om 20.00 de missie geeft.
- Klein: bij een lange tocht of rugzaktraining één regel eten onderweg ("Neem iets te eten voor elk uur na het eerste"), uit de kennistekst die er al is (`data/knowledge/voeding-water.ts`). Geen calorieën, geen voedingsadvies.
- Middel: een melding de avond ervoor, alleen bij een vroege of lange training (deel van voorstel 1).

### Week

- Gat: een losse training telt niet in "0 van 3 gedaan", en de weekterugblik zegt "0 gedaan · 56 min · hardlopen 8,6 km". Dat leest als een tegenspraak. Beter: "0 van 3 geplande, plus 1 losse" op beide plekken, uit één telling. Klein. Werkbriefje `week.md`.
- Middel: de zondagavond als één blad. Nu staan de back-upkaart, de weekvraag, de weekterugblik en de voorstellen voor volgende week op verschillende plekken. Eén blad Je zondag met vier stappen: terugblik, de vraag van de week, volgende week bekijken met openstaande voorstellen (Akkoord per voorstel, zoals nu), back-up. Elke stap overslaanbaar. Raakt de planning alleen via de bestaande voorstellen met Akkoord.
- Klein: in het blad van een geplande training één regel "Staat op je horloge" of "Nog niet op je horloge" als de schakelaar aan staat (nakijken of het blad dat al toont; het besluit Horlogestatus bij een training noemt het).
- Backlog hoger: de Week-band die tikbaar blijft (Inbox) is snel na te gaan; doen in het eerstvolgende bouwmoment.

### Ascend en doelen

- Klein: de sleuteltraining (voorstel 3).
- Middel: Racedag (voorstel 4) en daarna een race-terugblik die meteen zegt wat de volgende weken richting de GR5 betekenen.
- Klein, na de OSM-coördinaten uit de Inbox: elke GR5-etappe als koers naar het horloge, via de bestaande weg naar Garmin Connect (`storage/routeSend.ts`). De Forerunner 255 volgt een koers als lijn, ook zonder bereik. Geen navigatie in ASCEND zelf.
- Groot, voor het voorjaar van 2027: een reisstand vanaf de vertrekdag. Vandaag toont de etappe van vandaag (dat begint al met `StagePositionLine`), het water en de slaapplek; per dag één zin als reisdagboek, offline; loop je een dag achter of voor, dan een voorstel met Akkoord om etappes samen te voegen of een rustdag te schuiven. Raakt het reisplan, dus Akkoord. Nu alleen ontwerpen, in maart bouwen.
- Middel, ook voor later: na de GR5 een herstelblok als voorstel en de vraag "wat nu" met een paar richtingen (GR5-rapport idee 11). Nu nog niet nodig, wel goed om vóór juli te hebben.
- Backlog: de GR5-coördinaten (Inbox) zijn de sleutel voor de laatste twee punten; die mogen hoog blijven.

### Stand en historie

- Middel: Momenten, Je beste en Je jaar (voorstel 5).
- Klein: zoeken in het Logboek, in de namen en in je eigen notities ("knie", "regen", "rugzak"). Nu kan dat alleen door te bladeren per maand.
- Gat: de vergelijking bovenaan het Logboek ("8 meer dan 1 tot 30 september") zegt weinig als de vorige maand maar een paar dagen data had. Alleen tonen als beide maanden vol zijn, anders weglaten. Klein.
- Backlog hoger: de herinrichting van Stand (Groot, "Herinrichting uit de ontwerprapporten"). Stand heeft twaalf kaarten; de eerste zin beantwoordt de vraag, maar daarna is het lang zoeken. En de fout "Belasting Zwaar, 0 van 475" (Klein en fouten) is een verkeerd getal en hoort volgens de afspraak meteen, met `naspelen`, niet pas in deel 1.

### Forge

- Middel: "Ik heb 30 minuten". Bij de start van een sessie een keuze voor de tijd die je hebt (30, 45 of de gewone grens). Forge houdt de hoofdoefeningen en laat bijwerk vallen, zoals de tijdsgrens van 60 of 75 minuten nu al doet (`engine/forgeTimeCap.ts`). Alleen het scherm, niet de planning.
- Klein: na Afronden één regel wat er veranderde ("Squat: 2,5 kg meer dan vorige keer bij dezelfde herhalingen"). Nakijken of het afrondblad dit al zegt; zo niet, uit `engine/forgeHistory.ts`.
- Backlog hoger: de Forge-herinrichting (45 kleine tikdoelen onder 44 px in de Lookout-doorloop) gebruikt hij met bezwete handen in de sportschool, meerdere keren per week. Dat is dagelijks profijt en weegt zwaarder dan de teksten van R10. Advies: het tikdoelendeel naar voren halen in ronde 3, de rest mag volgen.
- Backlog: de stopwatch bij een houding (Calisthenics) hoort bij de afspraak "elke knop die wacht heeft een zichtbare uitkomst"; klein, kan mee met deel 2.

### Lopen en route

- Middel tot groot: wandel- en rugzakroutes (voorstel 2).
- Middel: Racedag (voorstel 4).
- Klein: bij een route één regel waar water of een toilet ligt op de lus (OpenStreetMap kent drinkwater en toiletten), alleen bij een lus boven een uur. Ook nuttig op lange tochten in Nederland.
- Backlog: de twee Inbox-punten over routes eerst; alles hierboven bouwt erop.

### Lichaam en herstel

- Middel, kandidaat voor de top vijf: een klacht volgen. Nu is een klacht open of dicht (`models/injury.ts`). Beter: bij een open pijnklacht om de twee of drie dagen één vraag op Vandaag, "Je knie: beter, gelijk of erger?", en tijdens een loop de vuistregel van het pijnmonitormodel als uitleg (pijn tot ongeveer 3 van 10 die de volgende ochtend weg is, mag; bron opzoeken en vastleggen in `docs/onderzoek/` voordat de tekst er staat). Een lijn op de plekpagina laat zien of het de goede kant op gaat. Wordt het erger, dan het bestaande voorstel met Akkoord om lichter te doen. Werkbriefje `lichaam-en-herstel.md`; de antwoorden zijn een lijst naast de klacht, alleen toevoegen, met migratie.
- Klein: na een lange tocht of een harde test één vraag de ochtend erna, alleen als er nog geen ochtendcheck is: "Hoe zijn je benen na gisteren?" Voedt de beenindex niet stil; het is dezelfde ochtendcheck, eerder gesteld. Nakijken of de bestaande kaart Hoe voelt je lijf dit al dekt.
- Backlog: "De kaart leert van jou" (Later) heeft na een paar maanden ochtendcheck genoeg data om zinvol te zijn. Advies: in januari opnieuw bekijken, niet eerder.

### Koppelingen

- Middel: het FIT-bestand als vangnet (nu onder Later). Het onderzoek noemde de afhankelijkheid van intervals.icu het grote risico, en Garmin filtert al velden voor partners. Met de Android-app en de keuzelijst van Android is een bestand uit Garmin Connect openen in ASCEND minder werk dan toen. Advies: naar Middelgroot, als verzekering, niet als dagelijkse weg.
- Klein: de wedstrijd als training naar het horloge (deel van voorstel 4).
- Klein: de etappes als koers naar het horloge (zie Ascend en doelen).
- Wat hij nu in een andere app doet: wandelroutes plannen (voorstel 2), een wedstrijdplan maken (voorstel 4), zijn eigen records opzoeken in Garmin Connect of intervals.icu (voorstel 5), krachttraining in MacroFactor Workouts (loopt al, `Los van MacroFactor.md`), voeding in MacroFactor (blijft daar, bewust).

### Instellingen en bediening

- Klein: na een nieuwe versie één keer een blad Nieuw in deze versie met hoogstens drie regels, elk met een knop naar de plek en de instelling. Hij krijgt vaak een nieuwe APK of een bijwerking zonder APK en hoort nu alleen via berichten wat er nieuw is; zo vindt hij het in de app zelf. Weg te tikken, uit te zetten. De regels komen uit een vast bestand per versie, niet uit git.
- Klein: lang drukken op een kaart op Vandaag opent de instelling die erbij hoort ("Waarom zie ik dit?" met de schakelaar). Elke keuze is instelbaar, maar de weg naar die instelling is nu het tandwiel en zoeken.
- Backlog hoger: de info-knop van een instellingsrij van 20 bij 20 px is een gedeeld onderdeel en dus op tientallen plekken te klein; dat is één wijziging met veel effect.
- Backlog: het Info-blad (Inbox) en dit kansenstuk raken elkaar: als Racedag, Klaarleggen en de klacht een eigen blad krijgen, hoort het Info-blad daarnaar te verwijzen, niet alles zelf te tonen.

## Wat ik bewust niet voorstel

- Reeksen, punten, niveaus, badges, ranglijsten of een avatar: dat is een RPG en verboden. De Momenten in voorstel 5 zijn feiten met een datum, zonder telling en zonder beloning.
- Een account, synchronisatie tussen toestellen, een eigen server of delen met vrienden in de app: ASCEND is lokaal. Delen gaat hoogstens als tekst of beeld via de deelknop van Android.
- Een AI-coach met een eigen sleutel: geen sleutel plakken of bewaren, data blijft thuis, en de deterministische engine is de enige die plant.
- Voeding naast gewicht en kracht: de eigenaar liet dit op 1 november liggen. Alleen de regel eten onderweg bij een lange tocht, als kennistekst.
- Een tweede vormgetal (CTL, ATL, de VO2max of Body Battery van het horloge) of een eigen herstelscore: verwart naast de beenindex en het ene voortgangsgetal per doel.
- Navigatie onderweg of een gps-spoor van tochten bewaren: dat doen het horloge en Garmin; afgeraden om batterij en privacy, en het staat onder Bewust niet.
- Krachttraining naar het horloge sturen: het besluit van 22 oktober zegt dat een leeg krachtschema op de pols niet helpt, en Forge op de telefoon doet het beter.
- Schoenkilometers: blijft bij Garmin, volgens het besluit over bergschoenen inlopen.
- Engels als taal: staat in de backlog en wacht op R10.
- Een nieuwe kleur of een andere indeling als bijwerking: alles hierboven gebruikt de bestaande kaarten, bladen en tokens.

## Vragen voor de eigenaar

1. De avond ervoor: vanaf hoe laat mag Vandaag naar morgen kijken als je nog niet getraind hebt (voorstel: 20.00), en wil je er een melding bij?
2. Wandelroutes: begin je een lange tocht meestal bij huis of reis je naar een startpunt, bijvoorbeeld met de trein?
3. Racedag: wil je de wedstrijd op je horloge met tempodoelen, of loop je liever op gevoel met alleen het blad vooraf?
4. Momenten: mag de app zelf een eerste keer herkennen en in het Logboek zetten, en wil je eind december een terugblik op 2026?
5. Een klacht volgen: liever een vraag om de paar dagen op Vandaag, of alleen als je zelf de plek opent?
