# De avond ervoor

Datum: 2026-11-11
Status: aangenomen

## Besluit

Vanaf 20:00 (instelbaar) staat op Vandaag een rustige kaart De avond ervoor met de training van morgen en hoogstens vier regels om klaar te leggen. Het rekenen staat in `engine/eveningBefore.ts`, de kaart in `components/EveningBeforeCard.tsx` tekent alleen. Het is alleen tekst en plant niets. Een melding met dezelfde regels is een aparte keuze, standaard uit, alleen in de Android-app.

## Eigen keuzes

- Plek: onder de missie en onder de kaarten die bij vandaag horen (de vaste rij van `todayCards`), direct na de snelkoppeling naar de ochtendvraag. De missiekaart van vandaag blijft het eerste wat je ziet; de kaart telt niet mee in Kaarten boven de missie. Dit volgt de lijn van 9 november (datavelden: "Niets op Vandaag"): niets nieuws boven de missie, en een kaart erbij alleen als hij een vraag van vandaag beantwoordt. 's Avonds is dat de vraag wat morgen is.
- Geen knop en geen accent op de kaart: de mint blijft bij de missie. Geen eigen beweging, dus in Rustig en Uit staat hij meteen op zijn plek (`src/components/eveningBefore.scan.test.ts`).
- Wanneer: van de gekozen tijd tot middernacht, op de klok van het toestel. Na 00:00 is morgen vandaag en hoort het bij de missie zelf. Ook als de training van vandaag nog open staat (dan staat de missie gewoon erboven), en ook als hij gedaan is. Voor de grens niets: de kaart Vandaag zit erop zegt dan al "Morgen: ...".
- Geen kaart op een rustdag, als er morgen niets staat, bij vakantie (geen training), bij ziek (ook als de ziekte nog loopt), als de training van morgen al gelogd of overgeslagen is, en als er niets klaar te leggen valt. Nooit een lege kaart. Op een rustdag bewust ook geen rustige zin: de rij Morgen in Je dag zegt al "Rustdag, wandelen mag".
- Een tochtdag uit Vrij en vakantie: alleen "Rugzak 11 kg." als het gewicht van de tocht bekend is; anders geen kaart. Het weer op de berg staat al in de kaart Bergweer.
- Twee trainingen morgen: beide in de kop, de regels samen, dubbele regels (zoals het lampje) één keer, hoogstens vier.
- De starttijd is je gewone starttijd (`usualStartHour`, dezelfde als de weerregel): ASCEND kent geen vaste tijd per training. Bij kracht staat er geen tijd in de kop.
- Volgorde en de grens van vier: weer met de eerste kledingregel, lampje, rugzak, horloge, drinken, route. Wat er niet in past valt van onderen af.
- Weer: de regel van de missie zonder het stuk over licht, met de eerste kledingregel erachter. Zonder voorspelling (geen netwerk of geen plaats) valt hij weg en blijft de rest.
- Lampje: uit de voorspelling als die er is (dezelfde tijd als de weerregel), anders uitgerekend met `engine/sun.ts`, dus ook zonder netwerk.
- Drinken: vanaf 90 minuten buiten, "Drinken mee: je zweet ongeveer 1 liter." uit je eigen zweettempo (`sweatRateAt`, zoals water per etappe). Zonder weer geen getal: "Drinken mee voor 100 min."
- Horloge: alleen de standen die via de koppeling lopen (staat erop, wijziging nog niet, nog niet, lukte niet), en alleen als Laten zien of het gelukt is aan staat. Niet gekoppeld of later: geen regel, dat zegt het blad Je horloge.
- Route: een route wordt niet bewaard, dus "Route klaar" kan de app niet weten. De regel zegt de afstand en dat je de lus bij de training opvraagt. RoutePanel en de routebouw zijn niet aangeraakt.
- Instellingen: De avond ervoor (aan) en Avond begint om (19:00, 20:00, 21:00 of 22:00; standaard 20:00) staan in het blad Kaarten op Vandaag en meldingen, want de pagina zit op haar plafond van 12 rijen. Melding de avond ervoor staat in het blad Meldingen, alleen zichtbaar in de Android-app en als De avond ervoor aan staat. Drie nieuwe optionele sleutels (`eveningBefore`, `eveningBeforeTime`, `eveningNotice`), additief, dus geen migratiestap; een back-up houdt alleen een geldige tijd.
- Melding: via de bestaande laag `integrations/notifications.ts` met een eigen nummer (4001), vanavond op de tijd van de omslag, met wat de app wist toen je hem het laatst opende. Kanaal zoals de andere meldingen (volgt Trillen). Is het moment voorbij of valt er niets klaar te leggen, dan wordt hij geschrapt.

## Voorbeeldavond (nagemaakt)

Woensdag 20:30, 5 graden en kans op een bui, de workout staat op het horloge.

Donderdag een lange duurloop:

- Morgen 18:00, Lange duurloop, 100 min
- 5 graden, kans op een bui. Thermoshirt met lange mouwen en lange tight.
- Donker vanaf 16:53, neem een lampje mee.
- Staat op je horloge.
- Drinken mee: je zweet ongeveer 1 liter.

Vrijdagavond voor een rugzakwandeling op zaterdag:

- Morgen 10:00, Rugzakwandeling, 90 min
- 5 graden, kans op een bui. Thermoshirt met lange mouwen.
- Rugzak 10 kg.
- Staat op je horloge.
- Drinken mee: je zweet ongeveer 0,5 liter.

## Reden

De echte beslissing over kleding, lamp, rugzak en drinken valt de avond ervoor, en dat stond nu als een kale regel "Morgen: Lange duurloop". Alles wat de kaart zegt bestond al als losse rekenwerken; de kaart kiest en ordent alleen. Gekozen door de eigenaar op 11 november (Kansen, top 1).

## Alternatieven

De missiekaart zelf na 20:00 laten omslaan naar morgen (zoals de visie schetst): dan verdwijnt een open training van vandaag uit het eerste beeld, en raakt het de missie, de volgorde en de tekstkaart. Een aparte kaart eronder respecteert de missie. Een rustige zin op een rustdag: dubbel met de rij Morgen.

## Bron

`docs/visie/Kansen 11 november app.md` (De avond ervoor), `docs/beslissingen/2026-10-31-ochtendkaart-vernieuwd.md`, `docs/beslissingen/2026-11-09-datavelden-horloge.md`, `docs/beslissingen/2026-11-09-stem-van-ascend.md`.

## Vervangt

Niets.

## Terugdraaien

Zet De avond ervoor uit in Instellingen, of haal `<EveningBeforeCard />` uit `src/pages/Today.tsx` en `<EveningNoticeHost>` uit `DeviceNoticesHost.tsx`. De drie sleutels in de instellingen zijn onschadelijk.
