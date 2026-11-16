# Wandeling plannen: de route volgt de vraag

Datum: 2026-11-16
Status: aangenomen

## Besluit

De voorstellen bij Wandeling plannen (en elke andere routezoektocht) volgen de vraag nauwkeuriger: een tak in de aanloop telt niet als doodlopend stuk, Avontuurlijk kiest eerst een lus zonder echte tak, hoogte ver buiten de vraag krijgt dezelfde amber regel als afstand, en een voorstel onder 70 procent van de afstand komt alleen als er niets beters is. Er verandert niets aan planning of opslag.

## Reden

De eigenaar vroeg op 16 november 5 km Heuvelig (50 hoogtemeters) en kreeg "Lus met twee stukken heen en terug, 5 km, 160 hoogtemeters", terwijl routes sinds 15 november zonder doodlopende takken horen. Het tweede voorstel was 2,6 km, half de vraag. De start lag op een afgesloten terrein met één uitgang: het stuk naar buiten en terug is dan onvermijdelijk, en hoort niet als keuze van de lus te tellen.

Gemeten voor de wijziging, met een nagemaakte lijn (400 m naar de eerste kruising, daar een lus, een tak van 300 m op die kruising, vraag 5,2 km): de lus heette "Lus met een stuk heen en terug" en kostte drie aanroepen. Na de wijziging heet hij "Eén lus" en kost het één aanroep. Past een lus met een echte tak in de afstand en wijkt de schone lus 10 tot 15 procent af, dan won vroeger de lus met tak (afstand ging voor); nu wint de schone. Is er geen via-punt bij de tak om te laten vallen, dan blijft de lus met tak staan, met de amber regel; een andere zoekrichting proberen is niet gebouwd.

## Eigen keuzes

- Aanloop: het stuk vanaf het startpunt dat de lus aan het eind terugloopt (gemeten op de lijn zonder takken, `approachLength`). Een tak die begint binnen 25 m van het eind van de aanloop (de eerste kruising) of daarvoor, of die eindigt binnen dat stuk bij het eind van de lijn, telt niet (`loopDeadEnds`). Alleen bij Avontuurlijk; heen en terug (Simpel) telt alles zoals voorheen.
- Marge: een lus zonder tak mag 15 procent van de afstand afwijken, naar beide kanten (`SPUR_FREE_MARGIN`), en wint dan van een lus met tak. Daarbuiten geldt de oude volgorde: past de afstand eerst.
- Amber regel bij een lus met tak: "Deze lus heeft een stuk heen en terug." (bij meer: "Deze lus heeft twee stukken heen en terug."). In de rij en in de ingeklapte rij van de andere lus.
- Hoogte buiten de vraag: meer dan het dubbele van de gevraagde hoogtemeters (`ASCENT_OVER_FACTOR`), bij Vlak meer dan 100 m (`FLAT_ASCENT_NOTE_M`). Zin: "160 hoogtemeters, meer dan de 50 van je wandeling." (training: "van je training"); bij Vlak: "120 hoogtemeters, terwijl je een vlakke wandeling vroeg." Minder dan gevraagd blijft de bestaande melding (onder driekwart); "minder dan de helft" is daarmee al gedekt. Bij Geen voorkeur of een training zonder hoogtemeters geen regel.
- Ver onder de afstand: onder 70 procent van de gevraagde afstand (`FAR_OFF`) valt een voorstel weg als het andere voorstel binnen de afstand past, voor beide soorten. In het blok staat dan "Geen tweede voorstel dat bij de afstand van je wandeling past." (je training bij een training). Past het andere ook niet, dan staan beide, met hun amber regel.
- Woorden: "Per stuk" en de lijnstijl-labels (Doorgetrokken, Gestreept) blijven. Ze benoemen wat je op de kaart ziet (de getrokken en de gestreepte lijn) en een kortere vervanger is niet voor de hand liggend. Open voor de eigenaar.

## Alternatieven

Een aparte instelling voor de marge: niet nodig, het advies is de afwijking van 15 procent en de lus zegt zelf wat hij is. Het korte voorstel verbergen zonder regel: dan weet je niet waarom er één voorstel is.

## Bron

I-75 (de eigenaar, 16 november, met afdrukken); `docs/beslissingen/2026-11-14-routes-vorm.md`; `docs/beslissingen/2026-11-15-wandeling-plannen.md`.

## Vervangt

Niets. Verfijnt de keuze in `2026-11-14-routes-vorm.md` (afstand ging voor op een tak).

## Terugdraaien

Zet `SPUR_FREE_MARGIN` op 0, `FAR_OFF` op 0 en laat `ascentOverLine` en `deadEndLine` uit `proposalNotes` weg; `loopDeadEnds` terug naar `deadEnds` in `proposal`.
