# Route voorstellen bij een looptraining (fase 1 en 2)

Datum: 2026-11-09
Status: aangenomen

## Besluit

Bij een looptraining staat de knop Route voorstellen. ASCEND stelt twee lussen voor vanaf je plaats: Simpel (dezelfde helling op en af tot de hoogtemeters er zijn) en Avontuurlijk (één lange lus langs verschillende hellingen en onverharde paden). Elke lus heeft afstand, hoogtemeters en een GPX-bestand. Het advies is aan, met Avontuurlijk bovenaan. Het plant niets en bewaart niets.

## Reden

De eigenaar wil een lus die past bij de training en die op zijn horloge kan. Het kan zonder backend, zonder sleutel en zonder account: de heuvels en paden vindt ASCEND al via OpenStreetMap, en een openbare routeplanner legt de stukken ertussen. Het onderzoek staat in `docs/onderzoek/Routeplanner voor een training.md`.

Hoe het werkt:

- De engine (`engine/routePlanner.ts`) kiest de punten en weegt de antwoorden. De routeplanner is een functie die de aanroeper meegeeft, dus zelfde invoer en zelfde antwoorden geven dezelfde lus. Geen AI.
- Simpel: de helling die het best bij de afstand past, de lijn ernaartoe, en daarop de helling van het laatste dal tot de top. Het aantal herhalingen volgt de hoogtemeters, begrensd door anderhalf keer de afstand en hoogstens twintig. Vraagt de training geen hoogtemeters (onder 20 m), dan is Simpel heen en terug over hetzelfde pad.
- Avontuurlijk: hellingen en onverharde paden binnen bereik, op volgorde van richting rond het startpunt zodat de lus zichzelf niet kruist, uitgedund tot de geschatte lengte past. Een helling weegt zwaarder dan een pad. Wijkt de echte lengte meer dan 12 procent af, dan zoekt de planner dichterbij of verder weg.
- Hoogtemeters telt ASCEND zelf, met een dode band van 5 m (advies van het onderzoek), bij beide bronnen op dezelfde manier.
- Bronnen: BRouter eerst (profiel hiking-mountain, hoogte per punt in het antwoord), en als die niet antwoordt Valhalla van FOSSGIS (te voet, hoogte om de 30 m in hetzelfde antwoord). Beide sturen een CORS-kop; dat is op 9 november met een echte aanroep gezien.
- Zuinig met de diensten van vrijwilligers: hoogstens drie aanroepen per soort lus, een voor een, met minstens een seconde ertussen, twaalf seconden per aanroep en dertig seconden voor het geheel. Geen automatische herhaling; Opnieuw zoeken is een tik van de gebruiker.
- Zonder netwerk staat er één rustige regel en gaat er geen aanroep de deur uit.
- GPX 1.1 met één spoor, hoogte per punt, geen tijd, met de naamsvermelding van OpenStreetMap. In de browser een download; in de Android-app een bestand in Documenten/ASCEND, want een download bestaat daar niet. Een bestaand bestand wordt nooit vervangen.
- Instelling: Route voorstellen (aan) en Welke lus eerst (Avontuurlijk), in het blad Weer en kleding naast Heuvels en trappen in de buurt. Optionele velden `routeProposal` en `routeStyle`, zonder migratie; een onbekende waarde in een back-up valt weg.

## Eigen keuzes buiten de opdracht

- Het startpunt is de plaats die je bij Plaats koos, afgerond op twee decimalen (ongeveer een kilometer), net als bij het weer en de heuvels. De lus begint dus bij het dichtstbijzijnde pad bij die afgeronde plek, niet bij je voordeur. Een exact startpunt naar een routeplanner sturen is een keuze over privacy en is aan de eigenaar; zie de vraag onderaan.
- De eerste keer vraagt het paneel of ASCEND mag zoeken, met wat de deur uit gaat. Een ja geldt ook voor het zoeken van heuvels (dezelfde afgeronde plek naar OpenStreetMap). Liever niet sluit het paneel en zet niets uit.
- De afstand komt uit de training zelf, anders uit de duur en je tempo: je laatste lopen van deze training, anders het rustige tempo uit je test, anders 6:30 per kilometer. Afgerond op een halve kilometer, tussen 2 en 40 km.
- Een heuveltraining zonder getal vraagt ongeveer drie meter stijgen per minuut training. Dat is een vuistregel van de bouwer, geen onderzoek.
- Vindt de kaart geen helling die past, dan haalt Simpel de helling uit de lijn van de avontuurlijke lus (het stuk tot de hoogste helling), zonder extra aanroep. De avontuurlijke lus wordt daarom eerst gezocht.
- Zonder iets op de kaart zet Avontuurlijk drie punten op een cirkel door het startpunt.
- De rij staat in het blad Weer en kleding en niet als eigen rij op de pagina: die pagina mag hoogstens twaalf rijen hebben.
- In de uitleg van een training (al een blad) klapt het paneel op zijn plek open; op Vandaag opent het een blad. Zo zijn er nooit twee lagen.
- De route wordt nergens bewaard, ook niet in het geheugen na het sluiten: opnieuw openen zoekt opnieuw.

## Alternatieven

- De totalen van BRouter overnemen (filtered ascend). Niet gekozen: Simpel stelt zijn lus zelf samen uit een stuk van de lijn, en twee bronnen moeten op dezelfde manier tellen.
- Een eigen kaart of live navigatie in ASCEND. Niet nu: fase 4, en navigeren doet het horloge of een navigatie-app.
- AHN voor de hoogte in Nederland. Later: de browser moet dan GeoTIFF lezen en CORS is niet bekend.
- Routes bewaren per training. Niet gekozen: dan is het een bewaarde vorm met een migratie, en een spoor bewaart ASCEND bewust niet.

## Nog niet gebouwd of niet gezien

- Delen naar Garmin Connect (fase 3) en een kaartje (fase 4).
- Het opslaan in Documenten/ASCEND is niet op een toestel gezien; de schrijfweg is dezelfde als die van de back-up.
- De heuvels van OpenStreetMap komen uit de cache van 3 km rond de plek. Voor een lus boven ongeveer 18 km is dat krap; dan vult de planner niet aan.
- Of de Forerunner 255 afslagen meldt op zo'n koers hangt af van Garmin Connect bij het importeren (zie het onderzoek); niet getest op een horloge.
- De kwaliteit van de lussen is met de echte diensten geprobeerd rond één openbaar punt (lussen van 6 tot 10 km, 7 tot 20 procent dubbel), niet breed.

## Vraag voor de eigenaar

Mag er een exact startpunt (bijvoorbeeld je voordeur of waar je nu staat) naar de routeplanner, als eigen instelling die standaard uit staat? Zonder dat begint de lus tot ongeveer 700 m van huis.

## Bron

`docs/onderzoek/Routeplanner voor een training.md`; de wens in de Inbox van `docs/backlog.md` (9 november, met de aanvulling Simpel en Avontuurlijk); `docs/beslissingen/2026-11-08-heuvels-osm.md`.

## Vervangt

Niets.

## Terugdraaien

De schakelaar Route voorstellen uitzetten haalt de knop weg. Helemaal weg: `RouteProposalLine` uit `TodayMissionCard` en `TrainingGuideSheet` halen en de twee rijen uit de instellingen; er is geen bewaarde vorm om op te ruimen behalve de sleutel `routeProposalAsked` op het toestel.
