# De app draait niet mee naar liggend

Datum: 2026-11-11
Status: aangenomen

## Besluit

ASCEND staat altijd rechtop: in de Android-app (`android:screenOrientation="portrait"` op MainActivity) en als geïnstalleerde web-app (`orientation: 'portrait'` in het manifest van vite-plugin-pwa). Er is geen instelling voor.

## Reden

Liggend stond de kolom van 448 px smal in het midden, liep de onderbalk over de hele breedte en viel de missie onder de lucht met de weekstrook. Bij het sporten houdt iedereen de telefoon staand; een liggende indeling voegt niets toe. De eigenaar: "Zorg ervoor dat de app niet liggend kan, want het voegt niks toe."

Geen instelling, hoewel elke keuze instelbaar hoort te zijn: de eigenaar vroeg dit zelf zo, en een keuze Meedraaien zou een liggende indeling vragen die er niet is.

## Alternatieven

Een liggende indeling bouwen (veel werk, geen nut tijdens het trainen). Een instelling Scherm draaien met een runtime-plugin (een extra native plugin voor een keuze die niemand gebruikt).

## Bron

Gesprek met de eigenaar in de coördinator-chat, 11 november, met een afdruk van Vandaag liggend.

## Vervangt

Niets.

## Terugdraaien

Haal de regel `android:screenOrientation` uit `android/app/src/main/AndroidManifest.xml` en `orientation` uit `vite.config.ts`. Later wens van de eigenaar: een vergrote kaart die wel liggend mag; dat vraagt een runtime-ontgrendeling alleen voor dat scherm (bijvoorbeeld `@capacitor/screen-orientation`), zie de backlog bij Route-kaart vervolg. Let op: Android 16 negeert de vergrendeling op grote schermen (tablets, uitgeklapte vouwtelefoons); op een gewone telefoon geldt hij. In de browser zonder installatie draait de pagina wel mee; dat kan een webpagina niet tegenhouden.
