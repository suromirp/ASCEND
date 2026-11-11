# Backlog

Wat nog op de lijst staat, zodat een nieuwe sessie het niet uit het gesprek hoeft te halen. De
coördinator houdt dit bij: iets wat live staat gaat eruit, iets nieuws komt erbij met een regel uitleg.
Opnieuw opgebouwd op 11 november 2026 tegen main (2a333d5): alles wat live staat is eruit, wat eruit ging
en waarom staat in `docs/onderhoud/2026-11-11-backlog-opnieuw.md`. De geschiedenis staat in git en in
`docs/beslissingen/`.

## Inbox

Wat de eigenaar tussendoor meldt, voor het volgende bouwmoment (maandag, woensdag, vrijdag; skill `bouwmoment`).
Vast punt, elk bouwmoment: na de punten hieronder de eerstvolgende open ronde uit het rooster hieronder. Een opmerking over hetzelfde komt bij het bestaande punt. Meteen, tussendoor: iets dat nu stuk is (de app werkt niet, verkeerde getallen in je training, data die verloren kan gaan) en kleine fixes die de coördinator zelf in een paar minuten doet, zonder helper (een tekst, een regel, een getal). De rest gaat in de Inbox.

- 10 november, eigenaar (routeplanner fase 4): "het zou vet zijn als hier al gelijk een kaart wordt weergegeven met de mogelijke routes". Een kaartje met beide lussen in het paneel Route voorstellen. Klaar om te bouwen: besluit `2026-11-10-kaartje-route-bron.md` (voorgesteld) en `docs/onderzoek/Kaartje bij Route voorstellen.md`: eigen tekening (SVG) zonder tegels, instelling "Kaartje bij de lussen" standaard aan, tegels later als eigen besluit. Sonnet. Vraag aan de eigenaar staat onder Wacht op de eigenaar (startpunt als stip).
- 10 november, eigenaar, bij hetzelfde: "zelf kiezen vanaf waar, of je huidige locatie, en dat het wat interactiever wordt; nu is het nog vooral een black box". Na het kaartje: startpunt zelf kiezen (tik op de kaart of een adres) of je huidige locatie (alleen na toestemming, niets bewaren zonder dat je het vraagt), en de lus bijsturen (andere kant op, langer of korter, een stuk vermijden). De uitleg waarom de lus zo loopt staat live (besluit `2026-11-10-route-uitleg.md`); per stuk afstand en hoogtemeters nog niet.

## Rooster voor de bouwmomenten

Per bouwmoment eerst de Inbox, daarna de volgende ronde hieronder. Een ronde heeft tot drie sporen die elkaars bestanden niet raken; ze lopen tegelijk, elk met een eigen helper in een eigen worktree, en gaan samen in één keer naar main. Nooit twee Forge-sporen tegelijk (zelfde bestanden), nooit twee planner-sporen tegelijk. Afgerond: uit dit rooster en uit de groepen hieronder, met een regel onder Pas live.

1. Klein en fouten, deel 1 (teksten en dode code, zie die groep) ‖ Buiten: UV, licht tot, hoogte van je plek.
2. Voorstel squat op één been en L-sit (planner) ‖ Uitleg bij oefeningen, batch 5 (Forge-data).
3. Feestdagen als voorstel (planner) ‖ Forge herinrichting, de rest.
4. Klein en fouten, deel 2 (Forge en Calisthenics) ‖ R10, de teksten van Forge.
5. Forge: herhalingen schatten bij een ander gewicht en de volgende set bijstellen.

## Pas live

Het bouwmoment zet hier per keer één regel "Live op <datum>: ..."; de coördinator haalt die weg bij de volgende opruiming.

## Groot

- Herinrichting uit de ontwerprapporten (`docs/visie/Ontwerprapport gegevens.md`, `instellingen.md`): Stand met Ritme, de weekterugblik, het Logboek, Geavanceerd als eigen pagina, één notatie voor tijden ("13.05" bij het weer tegenover "06:11" in Instellingen). Een eigen ronde van een uur of meer met Cartographer. De keuzes uit de rapporten maakt de coördinator met het advies.
- Forge herinrichting, de rest (deel 1 live sinds 2 november, besluit `2026-11-02-forge-herinrichting.md`; uit `docs/visie/Ontwerprapport Forge.md`): de kolom Voorschrift weg, RIR-bolletje en vinkvak naar minstens 44 px (45 kleine tikdoelen in de Lookout-doorloop), Kleiner maken en Afronden niet dubbel in het menu, de naam van een oefening in Marcellus, het blad Set met lang drukken zichtbaar, de regel "per kant ..." onder elke set en het percentage van je maximum. `components/forge/`. Eén bouwer.
- Teksten stap 4: de teksten uit de code naar een vertaalbestand per taal, daarna Engels, te kiezen in Instellingen. Groot werk in alle componenten; de engine geeft ook zinnen terug. Pas na R10. Wacht: "Engels wacht" (plan van de coördinator, 9 november).
- Routeplanner na het kaartje: startpunt kiezen, huidige locatie en bijsturen (zie Inbox). `engine/route*`, `integrations/`.

## Middelgroot

- Buiten (akkoord eigenaar 7 november): UV-index als regel bij een lange loop of tocht vanaf UV 6 (de waarde zit al in `engine/weather.ts`, de regel niet), "Licht tot 17.12" als een training buiten na zonsondergang eindigt (`engine/sun.ts` bestaat), en de hoogte van je plek of vakantieadres (de hoogteaanroep staat nu in `integrations/overpass.ts`, kan naar `openMeteo.ts`). Instelbaar, alleen tekst. Sonnet.
- Feestdagen als voorstel (akkoord 7 november, bleef liggen in ronde 3): Nager.Date, Nederland en het land van een vakantie, eens per jaar ophalen, een feestdag is een voorstel met Akkoord. Raakt de planning: engine op Fable, niet tegelijk met een andere planner-sessie.
- Voorstel squat op één been en L-sit (akkoord eigenaar 9 november avond): bij Calisthenics algemeen één keer een voorstel met Akkoord dat ze in een training zet als ze nergens staan; de kaart zegt nu "Staat nog niet in je trainingen." Planner, Fable, niet tegelijk met een andere planner-sessie. De kaart onthoudt geen hoogste stap: zo laten.
- Uitleg bij oefeningen: nog 59 oefeningen zonder uitleg, in batches van twintig (Scribe schrijft, Scout toetst de techniek, bron in `docs/onderzoek/`). `src/data/exercises.ts`. Sonnet.
- R10: de teksten van de Forge-tab volgens de stemgids. Daarna de uitleg in Instellingen inkorten (nu gemiddeld ongeveer 66 woorden, doel ongeveer 40).
- Forge, wens 3 november: (1) herhalingen schatten bij een ander gewicht dat je zelf invult (uit je geschatte kracht en de gevraagde RIR, alleen een voorstel in het vak); (2) na afvinken de volgende open werkset bijstellen naar wat Forge nu verwacht, beide kanten op, instelbaar. Nu stelt `engine/forgeAdjust.ts` alleen lichter voor, met een tik; `forgeInput.ts#carryChange` schuift alleen een gelijke waarde door.
- Heuvels en de periode: de OpenStreetMap-regel op een vakantieadres of in een periode Zonder sportschool. Een periode heeft geen eigen plek; vraagt een nieuwe opgeslagen vorm met migratie (Fable).
- Health Connect, de rest: een ronde start alleen als je terugkomt in de app (niet na urenlang open staan); het blad Lichaamsgewicht toont heel even "Gewicht: staat uit" na weer aanzetten.
- Zonder doel: de vorm van de week veranderen bij een andere richting (de kaart Je week op Je stand staat er al, `components/stand/YourWeekStandCard.tsx`).

## Klein en fouten

Deel 1 (teksten en dode code):
- "Twee harde loopjes" staat nog in `engine/weekConcerns.ts` (met test) en `engine/weekValidator.ts`; "loopjes" nog in `engine/runTrends.ts` en `runInsight.ts` (R8).
- "Loopsessies" bij `long_run` in `src/data/goalKinds.ts` laat "lang" weg; nakijken in de triatlon-UI.
- `openFysio` in `engine/bodyCheck.ts` is dode code.
- De vaste voorstelzin in `engine/strengthScheduling.ts` ("Geldt vanaf over twee weken, na je Akkoord.") volgt de stemgids niet letterlijk.
- Ontbrekende tests: de tak "Geen trainingen in deze maand", de bladen Ritme en Benen en de componentteksten van Stand, een dag met vakantie én training in het vakantiepaneel, Benen B tegenover een training met een eigen plek in `leavePlanAround.test.ts`.
- In Stand toont de samenvatting "Belasting Zwaar, 0 van 475" bij een zware geplande week; lijkt een fout in de telling, eerst naspelen (skill `naspelen`).
- Een regel in Intensiteit (Stand) mist een bolletje.
- Valkuil bij inkorten: haal geen zin weg die verklaart wat een getal of regel op het scherm betekent.

Deel 2 (Forge en Calisthenics):
- Regel 4 en 5 van de afvinkregels lezen gelijk (besluit `2026-11-09-forge-review-afvinken.md`).
- Spieren voor de berg heeft in Forge geen eigen schakelaar (Forge zit op het maximum van 6 rijen).
- Toestelstanden: de formulier-`key` in `components/forge/MachineWeights.tsx`; standen in pond, plaatjesnummers en optrekhulp; het strookje "Ook tussenin en erboven schatten" breekt op 390 px; Rustig niet gezien.
- Reverse Lunge staat als dumbbell-oefening in de catalogus; een variant met eigen gewicht ontbreekt.
- De terugknop van het toestel sluit het uitlegblad ook na Lichter of Zwaarder; alleen Terug naar gaat een stap terug.
- Calisthenics: de toets van de straddle front lever is hoog; Ongedaan maken verdwijnt na Akkoord op een andere training; bij het maximum van 20 trainingen meldt Akkoord gelukt terwijl de stap niet geldt; een back-up uit een nieuwere versie met een onbekende ladder bewaart die vaardigheid verborgen; Liever niet bij een stapvoorstel staat alleen in localStorage; 17 nieuwe tekeningen niet allemaal bekeken; een stopwatch bij een houding.
- IJkset: de rij van de extra set heet nog "eigen set" (`engine/forgeRows.ts`, `ExerciseBlock.tsx`); Niet nu geldt alleen voor deze keer.
- Toevoegingen van Spieren voor de berg gaan nog niet mee in het concept van een lopende sessie; Ruilen op een toegevoegde bergspieroefening die na Uit deze training halen met afgevinkte sets blijft, doet stil niets.
- Tempo: de stippen in de tempografiek zijn niet tikbaar; het blad gebruikt 8 weken, de kaart 12.

Overig:
- De info-knop van een instellingsrij meet 20 bij 20 px (gedeeld onderdeel).
- Een helling zonder bekende hoogte telt mee in het aantal maar niet voor de hoogste (Route voorstellen).
- De kaart Let op op Vandaag verschijnt na het ophalen en kan de ochtendkaart onder de missie schuiven; mogelijk dubbel onweer met het bergweer.
- De periode Zonder sportschool geeft de 3 dagen na een tocht dezelfde lengteregel als de 72 uur rust.
- Overzicht Gewicht: met precies twee wegingen in twee weken kan het eind van de lijn een paar tienden afwijken van het grote getal.
- Nagekomen uit ronde 2b: een eigen sport telt niet in de weekcheck; "Laten staan" bij een vakantie en "laten rusten?" rond een Top-race voor vaste sporten; de waarde "Alles normaal" valt af in de rij Hoeveel per soort op 360 px; een test die alle Android-XML vooraf leest (een dubbel streepje in commentaar brak de APK-bouw).

## Nakijken

Twijfel of het af is; eerst kijken, dan schrappen of bouwen.
- Rustdag terug: een training die je zelf oversloeg of waarvan je het inhaalvoorstel afwees, kan de rustdag tot zeven dagen tegenhouden. `trainedOn` volgt nu `dayLoads` (af), maar `catchUpFits` in `engine/restDayBack.ts` kijkt niet naar een afgewezen inhaalvoorstel.
- Tempo bij zone 2, kleine rest: een oude `aerobicProgressCelebrated` na 14 dagen negeren; het dauwpunt per loop (`dewPoint` zit in `heatPace.ts` en het weer); de regel voor benen die niet uitgerust zijn (hoofdstuk 5 van het verslag). Niet in de code teruggevonden of bevestigd.
- Geavanceerd als eigen pagina in Instellingen (akkoord eigenaar 2 november): er is een Geavanceerd per groep (bijvoorbeeld Koppelingen, Geavanceerd); of dat de bedoelde pagina is, is niet nagegaan.
- Eén notatie voor tijden: niet nagegaan of "13.05" en "06:11" nog naast elkaar staan.
- Jaaroverzicht: "Testloop 5 km: 14 jan en 15 jan", twee dagen voor één test. Fout in de gegevens of in de telling?
- De vaste doorloop van Lookout gaf Stand helemaal leeg; een eigen afdruk was vol. Drukt de kit te vroeg af?
- Startvragen: standaard is "Een tocht of wedstrijd"; is "Fit blijven" logischer voor iemand zonder plan?
- Op een toestel of in een echte browser nog niet gezien: de echte Overpass- en hoogteaanroep, live Open-Meteo-waarschuwing en EAWS, opslaan in Documenten/ASCEND, een GPX als koers in Garmin Connect en op het horloge, de keuzelijst van Android, lussen boven ongeveer 18 km (de heuvelcache is 3 km), de locatievraag bij Precies, plakken in de echte Strava-app, de tempoband met 8 of meer lopen over 4 weken, het bolletje gewicht en aandeel met een echte weging, 34 van de 40 uitlegteksten van batch 3 en 4.
- Routeplanner: in de afdruk waren beide lussen korter dan de training (4,2 en 4,6 km bij 6 km); nakijken met echte lussen van de eigenaar.
- Feiten om te toetsen (Scout): de factor 0,98 voor de drempelhartslag na een 5 km; Sporten lezen echte intervals.icu-types (Swim, Padel, Soccer, Yoga) alleen met nagemaakte data getest; de drempels van vermoeidheid tussen oefeningen niet op echte trainingen getoetst.

## Wacht op de eigenaar

- Mag het startpunt als stip op het kaartje, ook bij Precies, vanaf je deur? Het besluit over het startpunt zegt dat het punt nooit op het scherm staat; zonder ondergrond is het alleen een stip naast twee lijnen. Advies: ja, zonder tegels. Open sinds 10 november.
- Nakijken op de telefoon (gevraagd 10 november): APK 158 installeren, Precies, vanaf je deur kiezen, de datavelden naast de Forerunner leggen (de ligging van de velden is een tekening van ASCEND; biedt Hiken dezelfde velden?). En de punten die het bouwmoment van 10 november live zette.
- Routeplanner: blijft de instelling in het blad Weer en kleding? De beheerder van BRouter vragen of app-verkeer goed is (advies Scout).
- Eccentric Squat: de uitleg is op twee benen, de alias Decline Squat in het onderzoek op één been op een schuin vlak. Advies: de lichte vorm laten (`docs/beslissingen/2026-11-09-uitleg-eccentric-squat.md`).
- Week: moet de band van een periode die meer dan twee weken voorbij is nog tikbaar zijn? Vraag uit de bouwer Week: periode als band (9 november); niet teruggevonden of hij beantwoord is.
- GPX van de GR5: coördinaten voor de 36 etappes (`src/data/gr5Stages.ts`), daarna de regel op je etappe en hutten via refuges.info. Eigenaar 9 november: nog geen GPX.
- Vier tekstpunten uit eerdere Lookout-rondes die zonder screenshot niet terug te vinden zijn.

## Later

- Los van MacroFactor Workouts (doel eigenaar 9 november; de voedingsapp blijft): criteria en stand in `docs/visie/Los van MacroFactor.md`, de weekbriefing meldt elke maandag hoe het ervoor staat. De MacroFactor-code pas weg als het moment er is.
- Helemaal aan het eind, als alles klaar is (toestemming eigenaar, 1 november): de vakantiedata van de eigenaar uit de geschiedenis van git halen (oude commits van `docs/onderhoud/2026-11-01-aanpak-backlog.md` en c305cb1). Herschrijft geschiedenis op main en de werkbranch; eerst alle helpers stoppen, daarna de deploy controleren.
- Gebruikerstest met vier nagemaakte personen en de herstelronde erna, in een eigen sessie (eigenaar, 2 november).
- Kansen: de bestandsroute voor FIT-bestanden als vangnet (stap 0c van het onderzoek).
- Ochtendkaart: de kaart leert van jou (hoe ging de training na "moe" of "slecht geslapen"); een melding op de telefoon met de vier keuzes, zodat je de app niet hoeft te openen.
- Oefeningendatabase wger (CC-BY-SA) als bron bij het schrijven van uitleg en vervangers; nooit letterlijk, met bron in `ATTRIBUTION.md`. Geen koppeling in de app.
- Na de Android-app, nog niet (eigenaar, 1 november): trainingen in je agenda inplannen met kaders voor ochtend, middag en avond; gesproken signalen, vergrendelen met vingerafdruk, 's nachts horlogegegevens ophalen, delen met één tik.

## Bewust niet

- Voeding naast gewicht en kracht (kans E): de eigenaar laat dit liggen (1 november).
- Hartslagband via Bluetooth (eigenaar).
- Camera en een gps-route of spoor van tochten, tenzij de eigenaar het vraagt (afgeraden om batterij en privacy).
- Spraakloggen en een getal op het icoon (afgeraden).
- Meteoalarm: niet leesbaar vanuit een webapp (geen CORS); de waarschuwingen draaien op drempels van Open-Meteo.

## Geparkeerd

- Spierindex stap 3.

## Werkwijze, voor de coördinator

- Een controle op echte data: een script dat een back-up van de eigenaar (alleen in de scratchpad, nooit in de repo) door de engine haalt en dezelfde invarianten toetst. Draaien zodra de eigenaar een back-up stuurt.
- Afspraken die nu alleen in het gesprek staan: de eigenaar stuurt elke zondag een verse back-up; de coördinator wisselt dagelijks (skill `coordinator-wissel`), de overdracht staat in `.claude/coordinator/overdracht.md`.
- Bij een opruiming als deze: een punt is pas af als de code het doet, niet omdat een tekst het zegt; twijfel gaat onder Nakijken.

## Werkwijze, overig

- Het wekelijkse onderhoud en de appscan op Sonnet laten draaien en na een paar weken kijken wat ze vinden en kosten.
