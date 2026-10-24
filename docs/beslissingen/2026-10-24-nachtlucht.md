# Nachtlucht: een donkere lucht bovenaan, op tijd of vast

Datum: 2026-10-24
Status: aangenomen

## Besluit

De lichte lucht bovenaan een tab (SkyBand, LightCard, `.on-light`) heeft een donkere variant. De instelling "Lucht bovenaan" (Vandaag en meldingen, bij Beweging) kent "Op tijd" (standaard), "Altijd licht" en "Altijd donker". Bij "Op tijd" is het donker vanaf een uur dat je kiest (19:00, 20:00 als standaard, 21:00 of 22:00, in de rij "Donker vanaf") en om 07:00 weer licht.

## Hoe het werkt

`data-sky="day|night"` op `<html>` (`components/sky.ts`). De tokens van de lucht en van `.on-light` staan in `src/index.css` onder `html[data-sky='night']` omgedraaid: de lucht loopt van diep marine naar nachtblauw, de bergen zijn gedempt saliegroen en donker groenblauw, de LightCard is de gewone verhoogde kaart met gewone inkt, en mint, ijs en de tabkleuren zijn hun varianten voor donker. Geen component is aangepast. Een kaart op de lucht heeft in het donker een haarlijn in plaats van een schaduw. Zes zwakke, stille sterren staan boven in de lucht. Contrast blijft AA, want de tekst is dezelfde als op de gewone kaart.

De tijdregel is puur (`engine/skySettings.ts#skyModeAt`, met test). Bij "Op tijd" kijkt één timer per minuut of de tijd is verstreken, en opnieuw bij terugkeren naar de app; bij een vaste keuze draait er geen timer. De `theme-color` in de meta volgt de lucht, zonder de service worker of het manifest aan te raken. De velden `sky` en `skyNightFrom` in `AppSettings` zijn optioneel en worden bij het lezen genormaliseerd, dus er is geen migratie.

## Reden

Het lichte vlak bovenaan is 's avonds en 's nachts te fel. Als keuze, en liefst op tijd, lost dat het op zonder dat overdag iets verandert.

## Alternatieven

"Met de zon" (zonsondergang uit de weermodule): niet gebouwd. Het vraagt een gekozen plaats en een gevulde weerstand en valt zonder die terug op een vaste tijd, dus het zou vaak niet doen wat het belooft. Kan later als extra keuze. Een volledig lichte of donkere app: de app was en blijft donker, alleen de lucht wisselt.

## Bron

Gesprek met de eigenaar, 24 oktober 2026. Stijl: `docs/beslissingen/2026-10-24-thema-zee-en-berg.md`.

## Vervangt

Niets.

## Terugdraaien

Zet "Lucht bovenaan" op "Altijd licht", of haal het blok `html[data-sky='night']` uit `src/index.css`.

## Aanvulling 24 oktober 2026: met de zon

"Donker vanaf" heeft een keuze "Met de zon", en die is nu het advies: de lucht
wordt donker na zonsondergang en weer licht bij zonsopkomst op je plek. De
tijden worden op de telefoon uitgerekend (`engine/sun.ts`, de formule van de
NOAA, op een paar minuten nauwkeurig), dus het werkt ook zonder internet en
zonder weersvoorspelling. De plek is de plaats voor het weer
(`AppSettings.homeLocation`); zonder plaats geldt het midden van Nederland. Op een
dag zonder zonsondergang, ver in het noorden, geldt weer 20:00 tot 07:00. De
vaste uren 19:00 tot 22:00 blijven kiesbaar. Een opgeslagen vast uur blijft
staan; alleen wie nooit koos krijgt het nieuwe advies.

Bron: de eigenaar vroeg om "auto, echt afhankelijk van het licht, aangezien we het
weer al ophalen". Ophalen was niet nodig: de stand van de zon is uit te rekenen.

Na review (Warden): ver in het noorden kan de zon na middernacht ondergaan; dan is
alleen het korte stuk tussen zonsondergang en zonsopkomst nacht. Op een dag
zonder zonsondergang blijft de lucht licht, op een dag zonder zonsopkomst
donker (`engine/sun.ts#sunDay`, `isNightAt`), in plaats van terug te vallen op
20:00 tot 07:00.
