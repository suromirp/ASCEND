# Verschil R9: Instellingen en de uitleg achter de i

`npm run kaart:vergelijk` gaf na deze ronde: "Geen verschil met docs/app-kaart/." voor alle 23 schermen, zonder schendingen van de invarianten. Dat klopt: de kaart toont van Instellingen het overzicht en Gegevens en back-up, met rijtitels en waarden. Die zijn niet veranderd. De uitleg achter de i, de zoekindex en de bladen staan niet op de kaart. Wat daar veranderde staat hieronder, en de uitleg zelf staat in `docs/teksten/alle-teksten.md` onder "Uitleg achter de i in de instellingen".

Regels: `docs/beslissingen/2026-11-09-stem-van-ascend.md`. Afspraken van deze ronde: `docs/beslissingen/2026-11-09-teksten-lichaam-en-instellingen.md`.

## In getallen

- 191 onderwerpen in `src/data/settingsHelp.ts`, waarvan 49 van Forge. Die 49 en Tekst voor Strava zijn niet aangeraakt.
- Van de 142 andere zijn er 96 herschreven. De rest was al kort.
- Alle onderwerpen samen gingen van 16.416 naar ongeveer 13.760 woorden. Buiten Forge is het nu gemiddeld 66 woorden per onderwerp.
- Meer dan drie punten: van 59 onderwerpen naar 17. Vijftien daarvan zijn van Forge. De andere twee zijn Vroeg ziek zien en Toestemmingen, waar een punt over gezondheid of privacy niet weg mocht.

## Wat er per soort veranderde

- Eén zin vooraf en hoogstens drie punten. Punten die hetzelfde zeiden zijn samengevoegd. Een punt "Uit: dan gebeurt het niet" is weg als het niets toevoegde.
- De vaste zin "Eerst een voorstel, pas na Akkoord verandert er iets." staat nu in Aangepaste instellingen, Minder tijd vandaag, Zones bijwerken na een test, Wijzigingen, Test verschuiven, Vroeg ziek zien, Voorstel bij een slechte ochtend, Weekbudget, Golven, Beginnersstart, Richting, Twijfeltest eerst vragen, Nieuwe test voorstellen bij stilstand, Sporten, Hoeveel per soort, Rustdag terugzetten voorstellen, Voorstel bij een probleem in de week, Trainingstijd per dag, Rustdag, Advies in Run in detail en Vrije dagen en vakanties. Niet bij Golven, Beginnersstart en Sporten: die volgen je keuze bij Wijzigingen, dus daar staat "je ziet eerst wat er verandert". Niet bij Blessures: melden verandert je planning niet, en dat staat er nu. Ook in het blad Signalen uit je gegevens, bij Alles terugzetten en in de uitleg van een voorstel na een planinstelling.
- Puntkomma's zijn zinnen geworden, in de uitleg, de zoekindex en de bladen.
- "loopjes" alleen als telling: "je eigen rustige lopen", "geen lopen waarbij de bron kan zijn gewisseld", "Details van lopen". "drie loopjes buiten" en "twee harde loopjes op een dag" blijven. "run" is "loop" geworden, behalve in de naam Run in detail.
- Zorg, gezondheid en privacy zijn volledig gebleven: "Geen diagnose" bij Vroeg ziek zien, het blessurerisico bij Groei van de lange loop, "geen officiële waarschuwing" en Meteoalarm bij Weerwaarschuwingen, "lees het hele bulletin" bij Lawinegevaar, "geen medisch advies" bij Water per etappe en "bevat dan ook gezondheidsgegevens" bij Ochtendgetallen in back-up.

## Namen gelijkgetrokken

De rij is de naam. Aangepast in de uitleg: Twee trainingen per dag (was Meerdere trainingen op één dag), Ochtendvraag (was Ochtendmelding), Beste moment tonen, Water per etappe tonen, Seizoensstrook tonen en Vaardigheidsdoelen tonen.

Aangepast in de zoekindex: Wijzigingen, Hartslag, Blessures, Programma, Hoofddoel, Ochtendvraag, Tijd van de ochtendvraag, Kledingadvies, Je kleding, Citaat na een training, Geluid, Run in detail tonen, Run in detail: patronen tonen, Run in detail: advies tonen, Details van lopen, Laten zien of het gelukt is, MacroFactor: laatste export, MacroFactor: gewicht gebruiken, Laatste back-up, Back-up: vaste map, Kopieën van voor een import, Opslag beschermd, Wat speelde er: op Je stand, Training die niet doorging: wat ASCEND doet en Training die niet doorging: na hoeveel dagen. De oude naam staat waar nodig als trefwoord.

## Zinnen die aan de code zijn aangepast

- Gewicht op Je stand: "Een tik opent het overzicht Gewicht" (was Lichaamsgewicht), zie `src/components/stand/WeightStandCard.tsx`.
- Toestemmingen: Health Connect "komt later" is weg, want het bestaat. De zoekregel zegt "en Health Connect".

## Weggelaten bij het inkorten

Voor wie iets mist, dit is bewust weg en staat elders in de app of in het voorstel zelf: de uitleg van Week opnieuw plannen bij Trainingen slepen in Week, de herkansing die niet doorging bij Nieuwe test voorstellen, "Log op een andere dag" bij Training die niet doorging (heeft een eigen rij) en Snelste 5 km bij Twijfeltest.

## Na de review van Warden

Teruggezet omdat ze een getal, het bewijs of je privacy uitleggen: "Alcohol, een warme kamer of stress geven hetzelfde beeld" (Vroeg ziek zien), het punt Widget (Toestemmingen), de sterkte van het bewijs bij Hoe sporten meetellen, "Er gaat niets naar buiten" (Automatische back-up), de richting per kilometer (Volledige reeks bewaren), het punt Toestemming (Je locatie), "Kopieën van voor een import bevatten de reeksen nooit", "Niets anders van je horloge" (Ochtendgetallen in back-up), "na een week van je eigen nachten" en Ongedaan maken (Vragen bij een korte nacht), Nielsen 2014 (Groei van de lange loop), de hint bij pijn in je benen (Hoe voelt je lijf?), het aantal harde dagen (Hoeveel per soort), en dat een beendag of lange duurloop kan vervallen (Nieuwe test voorstellen). "Ouder dan twee weken vraagt ASCEND niet meer" staat nu onder Vragen. Vijf oude namen kregen hun trefwoord: momentopnamen, ochtendmelding, citaten, klachten en versturen.

## Bewust niet aangeraakt

- Forge: de uitleg, de zoekregels en `ForgeGroup.tsx` (R10, en er loopt een andere bouwer).
- Tekst voor Strava (net herschreven).
- "Loopinzicht: ..." in de zoekindex tegenover het blad "Inzicht na een training".
- De waarden, standaarden, volgorde en indeling van de instellingen.
