# Zweetverlies en water

Korte notitie bij het meten van je eigen zweetverlies en het water per GR5-etappe. Het hitteonderzoek staat al in `Aanvullend onderzoek GR5 voorbereiding.md` (regel B3 en de sectie over hitte); dit voegt alleen de rekenregels en de twee bronnen toe die daar ontbraken. Geen medisch advies.

## Wat er zeker is

Zweetverlies tijdens een training is te schatten uit het gewicht: de lichaamsmassa die je verliest, plus wat je dronk, min wat je plaste, is ongeveer wat je aan zweet kwijtraakte. Een kilo is ruwweg een liter. Dit is de standaardmethode in de positieverklaring van het American College of Sports Medicine over beweging en vochtvervanging (Sawka e.a., 2007, Medicine & Science in Sports & Exercise 39(2): 377 tot 390). Dezelfde verklaring noemt als doel dat je minder dan ongeveer 2% van je lichaamsgewicht verliest, en adviseert om je eigen verlies te meten omdat het zo verschilt.

Hoeveel mensen zweten verschilt sterk, van ongeveer 0,5 tot 4 liter per uur, en ook bij dezelfde persoon van dag tot dag door temperatuur, tempo, kleding en conditie. Dat is de strekking van het overzicht van Baker (2017, Sports Medicine 47 (Suppl 1): 111 tot 128, "Sweating Rate and Sweat Sodium Concentration in Athletes: A Review of Methodology and Intra/Interindividual Variability"). Het bereik en het gemiddelde van 1,0 tot 1,5 liter per uur voor duursporters staan ook in de NATA-positieverklaring uit 2017 die het GR5-onderzoek al noemt.

## Wat de app ervan maakt

De formule is: verlies in ml is gewicht voor min gewicht na, maal 1000, plus gedronken ml, min geplaste ml. Per uur is dat gedeeld door de duur. Een meting korter dan 30 minuten telt niet mee, omdat een weegschaal op 100 g dan te zwaar meeweegt. Een uitkomst boven 4 liter per uur is vrijwel zeker een invoerfout en telt niet.

Zonder eigen metingen geldt een standaardlijn naar algemene cijfers. Regel B3 van het GR5-onderzoek (0,4 tot 0,8 liter per uur bij gematigd weer en 0,8 tot 1,2 bij hete klimmen) is een drinkadvies, geen zweetverlies, en is dus niet de basis. De lijn steunt op de gepubliceerde zweetcijfers die hierboven staan: de NATA-verklaring van 2017 en de ACSM-verklaring noemen voor duursporters gemiddeld ongeveer 1,0 tot 1,5 liter per uur bij inspanning in de warmte, met een breed bereik per persoon. De app zet een lijn van 500 ml per uur bij 10 graden of kouder naar 1.250 bij 30 graden of warmer (900 bij 20 graden). Dat is een eigen vertaling van die cijfers naar een temperatuur: geen gepubliceerd model, geen formule uit een bron. De ondergrens bij koud weer en de helling ertussen zijn mijn keuze. Voor jou kan het er ver naast zitten, in beide richtingen; daarom staat er altijd "nog niet gemeten, naar algemene cijfers" bij.

Eigen metingen gaan voor: bij drie of meer metingen met genoeg spreiding in temperatuur een rechte lijn, anders het gemiddelde van de metingen binnen 4 graden, anders jouw verhouding tot de standaardlijn. Lopen geeft meer zweet dan wandelen met rugzak op dezelfde temperatuur, dus metingen van dezelfde soort gaan voor. Dat is een redelijke aanname, geen uitkomst van een bron die ik las.

## Wat niet is uitgezocht

- Ik heb de oorspronkelijke artikelen van Sawka en Baker hier niet opnieuw gelezen; de verwijzingen en de strekking komen uit eerdere kennis en uit de NATA- en ACSM-samenvattingen die het GR5-onderzoek al aanhaalt. Controleer de paginanummers voor je ze elders aanhaalt.
- De temperaturen per stuk van de GR5 (20, 18, 20 en 26 graden voor de vier stukken) zijn een eigen schatting voor een zomerdag in het hoofdseizoen, geen gemeten gemiddelden en niet uit een bron. Op het scherm staan ze als aanname: "bij ongeveer 20 graden, verwacht op een zomerdag". Het weerbericht van de dag zelf gaat voor.
- Natriumverlies (zout) is niet opgenomen. Het verschilt nog meer per persoon en vraagt een andere meting.
- intervals.icu heeft in zijn OpenAPI-beschrijving (https://intervals.icu/api/v1/docs, gelezen op 25 oktober 2026) geen veld voor het zweetverlies van een activiteit. Er staan alleen `hydration` en `hydrationVolume` bij de dagwaarden (wat je dronk). Een schatting van het horloge moet je dus zelf overnemen.
