# Kaart van de app

Dit is een tekstuele kaart van wat ASCEND op elk scherm laat zien: kopjes, kaarten in volgorde met hun tekst, knoppen als `[knop: Opslaan]`, getallen, meldingen en de aria-labels van iconknoppen. Zo controleer je data en teksten met een diff in plaats van met een screenshot.

De data is nagemaakt: de kaart komt uit het kracht-demoprogramma in `.claude/skills/lookout/kit/state-kracht.json` en uit vier varianten daarvan, nooit uit een back-up van een echte gebruiker. De klok staat vast op 31 oktober 2026, 08:00 (Europe/Amsterdam), de breedte is 390 px.

Schermen op de gewone stand (kracht): vandaag, week, stand, de schermen achter Je stand (stand-benen, stand-belasting, stand-ritme, stand-lopen, stand-invloed), ascend, logboek, instellingen (het overzicht op `/more`), weekterugblik, jaaroverzicht, training-blad (het blad van een geplande training in Week), gegevens (instellingen, groep Gegevens en back-up), lichaam (de pagina) en lichaam-plek (de rechterknie). Forge: `forge`, Benen A uit Week na Training starten (elke oefening met zijn rol, besluit `2026-11-11-forge-kern-zichtbaar.md`). Met een eigen klok (`klok` in `SCHERMEN`): vandaag-loop, Vandaag op zondag 1 november met de Lange duurloop als missie (zonder koppeling met je horloge: Gedaan en de routerij).

Schermen op een eigen stand, met de stand in de naam:
- horloge: `vandaag-horloge` (de ochtendkaart met slaap, rusthartslag en HRV van het horloge) en `run-in-detail` (het scherm Run in detail van een rustige duurloop van 6 km in 39 minuten).
- vakantie (9 tot en met 13 november, zonder training): `vandaag-vakantie`, `week-vakantie` en `stand-vakantie`.
- zonder-doel (geen doel, de richting Fit blijven): `vandaag-zonder-doel`, `week-zonder-doel`, `ascend-zonder-doel`, `stand-zonder-doel` en `stand-ritme-zonder-doel`.
- ziek (verkouden boven de nek, sinds vandaag): `vandaag-ziek`, `week-ziek` en `stand-ziek`.
- vaardigheid (één vaardigheid, Pull-Up, met twee stappen gehaald): `ascend-vaardigheid`.
- voorstel (naast de wedstrijd een verzonnen huttentocht, het programma gestart op 28 september): `weekterugblik-voorstel`, de weergave Voorstel in de weekterugblik met het voorstel dat de engine zelf maakt.

## De standen

De standen zijn bestanden `state-<naam>.json` in `.claude/skills/lookout/kit/`. `node scripts/app-kaart/maak-standen.mjs [naam]` maakt ze opnieuw uit de basis (kracht) met kleine, verzonnen wijzigingen, en laat daarna elke stand één planningsronde draaien op de vaste klok van de kaart en slaat hem dan op. Dat laatste heet "settle" en is nodig: de trainingsvoorschriften zijn afgeleid en staan niet in de basis, dus de eerste start repareerde ze, schreef 25 trainingen en toonde "Weekplanning bijgewerkt" over de schermen heen. Na een settle vindt een start niets meer te doen. Een nieuwe stand voeg je toe aan `STANDEN` in dat script en aan `SCHERMEN` in `kaart.mjs` (met `stand: '<naam>'`). Gebruik in Lookout een stand met `open(390, { stand: 'horloge' })`.

## Draaien

`npm run kaart` bouwt de app, start een eigen preview op een vrije poort en schrijft deze map opnieuw. Een run duurt een paar minuten. Het bouwt altijd zelf, zodat een oude build van iemand anders nooit wordt vergeleken. Alleen met `KAART_PORT` gezet hergebruikt het een draaiende server op die poort, zonder bouwen, en dat meldt het duidelijk (`maak-standen.mjs` doet hetzelfde).

`npm run kaart:vergelijk` maakt de kaart in een tijdelijke map en toont per scherm alleen de gewijzigde regels (`-` was, `+` is). Alleen voor gewijzigde schermen komt er een afdruk in de map uit `LOOKOUT_SHOTS` (anders `./shots`). Exitcode 0 is geen verschil, 1 is verschil.

Elke afdruk toont het hele scherm, ook wat onder de vouw staat: het venster groeit tijdelijk tot de scrollcontainer (de pagina of het open blad) zijn volle inhoud toont, met ruimte onder de laatste kaart voor de tabbalk en de meldingsbalk. Bij een verschil staat er een rand om de eerste gewijzigde regel.

`node scripts/app-kaart/kaart.mjs --foto <scherm>` maakt op verzoek een afdruk van één scherm, voor als je twijfelt. Met `--markeer "<regel van de kaart>"` erbij, bijvoorbeeld `--markeer "[knop: Verplaatsen]"`, komt er een rand om dat element.

## Invarianten

`scripts/app-kaart/invarianten.mjs` leest de kaart en controleert getallen die op meerdere schermen gelijk moeten zijn, zoals "x van y gedaan", het weeknummer, de fase en de voorspelde tijd. Een schending geeft exitcode 2. Nu ook: de kop, het tempo en de totaaltijd in Run in detail horen bij elkaar, een training die geen test is krijgt geen zin over een testloop (Run in detail en het trainingsblad), en een scherm heeft hoogstens één gevulde mint knop. Die laatste meet `kaart.mjs` zelf: het telt de knoppen met de vulling van `--color-action-fill` (in het open blad, anders op de pagina) en schrijft alleen bij meer dan één een regel `[gevulde mint knoppen: ...]`, zoals bij `[te breed: ...]`. Een nieuwe controle voeg je toe aan de lijst `INVARIANTEN` in dat bestand. Draai het ook los met `node scripts/app-kaart/invarianten.mjs`.

## Als de kaart verandert

Een bewuste wijziging in tekst of data: draai `npm run kaart` en neem de gewijzigde bestanden mee in je commit. Zie `docs/beslissingen/2026-10-31-app-kaart.md`.
