# Garmin: een koers dagen vooraf klaarzetten

Datum: 2026-11-11. Korte techniekvraag van Scout, zonder Garmin-sleutel. Bouwt voort op `docs/beslissingen/2026-11-10-route-naar-garmin-connect.md`. Niets hiervan is op een toestel geprobeerd; het is gebaseerd op handleidingen en forumberichten.

## 1. Blijft een koers dagen op het horloge staan?

Feit (Garmin-handleiding): een koers die in Garmin Connect staat, stuur je met Menu, Naar toestel sturen naar het horloge. Op een Forerunner 255 vind je hem daarna onder Navigatie, Koersen. De handleiding noemt geen houdbaarheid of vervaldatum.
Aanname, redelijk zeker: de koers staat op het horloge tot je hem er zelf afhaalt. Het horloge heeft hem na één geslaagde synchronisatie (Bluetooth met de telefoon, of wifi) en heeft daarna geen internet meer nodig. Er is geen bron gevonden die zegt dat een koers vanzelf verdwijnt. Wel melden gebruikers dat een koers niet verschijnt tot de eerstvolgende sync, en dat een mislukte overdracht stil kan blijven hangen.
Voor de gebruiker: na het sturen het horloge laten synchroniseren, en één keer op het horloge zelf in Koersen kijken. Dat is de enige zekere controle.

## 2. Aan een datum of geplande workout koppelen zonder sleutel

Garmin Connect (website) laat in de agenda een Gebeurtenis (Event) toevoegen met, onder Meer, een keuzelijst Koers. Dat staat bij gebruikers op het forum en in de Edge-handleiding ("koersen aan de agenda toevoegen en naar je toestel sturen"). Maar meerdere gebruikers melden dat de keuzelijst leeg blijft, ook bij een Forerunner 245. De mobiele app laat volgens hen alleen workouts in de agenda toe, geen koersen. Zekerheid: laag tot matig, het zijn forumberichten, geen Garmin-tekst.
Een echte koppeling van een koers aan een geplande workout (en dus zichtbaar op de trainingsdag op het horloge) kan alleen via de Training API van Garmin, en die vraagt een zakelijke aanvraag en sleutel. Dat past niet bij ASCEND.
Beste werkwijze zonder sleutel: sla de koers op in Garmin Connect met een naam waarin de datum of trainingsdag staat, bijvoorbeeld de bestaande bestandsnaam met de datum. Op de dag zelf kies je op het horloge Navigatie, Koersen en die koers. Probeer de agenda-gebeurtenis op de website als extraatje, maar bouw er niets op.

## 3. Kaarten op het horloge

Feit (forum, Garmin-specificaties): de Forerunner 255 heeft geen ingebouwde kaarten. Hij toont alleen de koerslijn met de afslagen op het scherm, en trilt als je van de lijn afwijkt. De koerslijn volstaat dus, en er is geen kaart om te downloaden. Voor het horloge van de eigenaar hoeft hij dus niets te doen met Garmin Express of wifi voor kaarten.
Geldt dit voor andere horloges? Nee. Modellen met kaarten (zoals de 955 en 965, volgens het forum) tonen de koers wel op een kaart. Voor een ander land is dan een kaartdownload nodig via Garmin Express of de Connect-app met wifi. Dat staat niet in een bron die ik voor deze modellen heb geopend; onzeker.
Wel nodig: GPS-ontvangst op de plek, en een geladen horloge. Internet is niet nodig tijdens het lopen.

## 4. Wat de app zou kunnen zeggen bij "alvast klaarzetten"

Voorstel voor de tekst, geen besluit:
"Sla de lus nu op als koers in Garmin Connect en laat je horloge synchroniseren. Controleer op het horloge onder Navigatie, Koersen of hij er staat; dan kun je hem ter plekke zonder internet lopen."
Eventueel een tweede regel voor horloges met kaarten: "Heeft je horloge kaarten, download dan ook de kaart van die streek."

## Onzeker

Of een koers echt onbeperkt blijft staan na een firmware-update of herstel van het horloge. Of de agenda-keuzelijst Koers nu werkt. Of Garmin Connect een GPX zonder kloktijd en zonder routeklassering goed als koers aanneemt (forums noemen soms dat een Route-bestand beter werkt dan een los spoor). Menunamen in het Nederlands zijn niet nagekeken.

## Bronnen

- Garmin, Een koers naar je toestel sturen: https://www8.garmin.com/manuals/webhelp/GUID-2492EDA1-1182-400B-8F43-D8B3211E4F3C/EN-GB/GUID-5613803C-5BEB-4EC8-A267-1AF59665F9A3.html
- Garmin-forum, koersen plannen in de Connect-agenda: https://forums.garmin.com/apps-software/mobile-apps-web/f/garmin-connect-web/157136/schedule-courses-in-garmin-connect-calendar
- Garmin-forum, Forerunner 245, koers aan agenda toevoegen: https://forums.garmin.com/sports-fitness/running-multisport/f/forerunner-245-series/191599/forerunner-245---add-course-to-calendar
- Garmin Edge-handleiding, agenda en koersen: https://www8.garmin.com/manuals/webhelp/edge1000/EN-US/GUID-586FDD26-F514-4DFB-AA4B-E3B07289A6FA.html
- Garmin-forum, Forerunner 255/265 navigatie zonder kaart: https://forums.garmin.com/sports-fitness/running-multisport/f/forerunner-255-series/388228/forerunner-255-265-navigation-breadcrumb-map
- Tredict, Training API van Garmin (partnerkoppeling): https://www.tredict.com/blog/garmin_training_api_integration
- Garmin-forum, GPX importeren als koers: https://forums.garmin.com/apps-software/mobile-apps-web/f/garmin-connect-web/45805/importing-gpx-file-as-course-to-705
