# Logo: Ring en pad

Datum: 2026-10-25
Status: aangenomen

## Besluit

Het logo van ASCEND is richting 1 "Ring en pad", in de kleurvariant "lucht": een lichte ring, een lichte kam met drie toppen die precies op de ring eindigt, een groenblauwe berg die overloopt in marine, een rustig S-pad en een stip op de top in mint. Het vervangt het gouden logo met het slingerpad.

## Waar het logo staat

Het app-icoon (`public/icon.svg`, `public/icon-maskable.svg`, de PNG's `pwa-192.png`, `pwa-512.png`, `pwa-512-maskable.png` en `apple-touch-icon.png`) is het volle icoon op een marineverloop. Het maskable icoon blijft binnen de veilige zone van 80%. Het favicon (`public/favicon.svg`) is hetzelfde icoon met dikkere lijnen, zodat het op 16 tot 32 px leest. De vier snelkoppelingen (Vandaag, Week, Logboek, Afvinken) gebruiken de lijniconen van de app in mint op hetzelfde marineverloop.

Het kleine teken linksboven op elke tab (`AppMark`) is de lijnversie, alleen de ring en de kam, in `--color-on-light`, 22 px, met het woord ASCEND.

Het openingsscherm en het bewegende logo (`AscendSplashLogo`, `AscendAnimatedLogo`) tekenen het volle teken met het woord eronder. De kleuren staan als tokens in `src/index.css`: `--color-logo-ring-top`, `--color-logo-ring-bottom`, `--color-logo-mountain-top`, `--color-logo-mountain-bottom` en `--color-logo-path`. Ze zijn vast, ook in de nachtlucht, want het teken staat op marine. Het manifest en `theme-color` blijven marine (`#0b1733`).

## Beweging

Het teken bouwt zich één keer op als het verschijnt: de ring tekent zich (400 ms), de kam (350 ms), de berg kleurt in (300 ms), het pad loopt omhoog (400 ms), dan verschijnt de stip (250 ms) en het woord (400 ms). Ease-out, niets stuitert, daarna staat het stil en er draait geen lus. In Rustig, in Uit en bij beperkte beweging van het systeem staat het meteen op de eindstand (`docs/beslissingen/2026-10-24-beweging.md`). Omdat de reeks korter is dan de vorige (1,7 in plaats van 2,3 seconden), is de minimale duur van het openingsscherm van 2,6 naar 2 seconden gegaan.

Omdat de instellingen pas laden nadat het openingsscherm staat, onthoudt de app de stand van Beweging in `localStorage` (`ascend.motionMode`) en zet hem bij de volgende start meteen op `<html>`. Zo staat het logo ook in Rustig en Uit direct op de eindstand.

## Reden

De eigenaar koos uit vier richtingen op het canvas "Logo ASCEND, nieuwe opzet" de richting Ring en pad in de kleurvariant lucht. Het is het huidige logo, opgeschoond: de ring, de toppen en het pad zeggen samen waar de app over gaat (een doel, een route, een top), in de kleuren van de rest van de app (lichte lucht, groenblauwe berg, marine, mint als enige accent). Het gouden verloop en de brons- en goudtinten pasten niet meer bij "Zee en berg".

## Alternatieven

De drie andere richtingen van het canvas, en de andere kleurvarianten van Ring en pad. Niet gekozen door de eigenaar.

## Bron

Gesprek met de eigenaar, 25 oktober 2026, over het canvas "Logo ASCEND, nieuwe opzet". Stijl: `docs/beslissingen/2026-10-24-thema-zee-en-berg.md`.

## Vervangt

Niets uitdrukkelijk. Het oude gouden logo had geen eigen besluit.

## Terugdraaien

Zet de bestanden in `public/` en de drie logocomponenten terug uit de vorige commit, en haal de `--color-logo-*` tokens en het blok `.alogo-*` uit `src/index.css`.
