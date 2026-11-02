# Rand onderaan in de Android-app

Datum: 2026-11-02
Status: aangenomen

## Besluit

Eén variabele, `--rand-onder`, voor de ruimte onder de inhoud. Elk blad krijgt hem als opvulling van het paneel
(`.animate-sheet-in` in `src/index.css`); tabbalk, meldingen, pillen en knoppenbalken gebruiken hem ook. De
SystemBars van Capacitor staan expliciet op `insetsHandling: 'css'` met `initialViewportFitValueHint: 'cover'`.
Dat is een native wijziging: native niveau 7, een nieuwe APK.

## Reden

Gemeten bij de eigenaar: onderaan een blad (Vaste map) valt de knop half onder de rand van het scherm. Uit de code:
Android 15 en hoger tekent de app onder de navigatiebalk door (edge-to-edge) en `fixed inset-0` loopt dus tot de
schermrand. Bijna geen blad rekende op de onderrand: alleen een paar bladen deden dat met
`env(safe-area-inset-bottom)`, de andere hadden vaste opvulling van 16 tot 32 px. In de browser is die ruimte 0,
daarom viel het daar niet op. Capacitor zet de ruimte ook als `--safe-area-inset-bottom`, voor webviews waar `env()`
0 geeft; het grootste van beide telt. De hint 'cover' voorkomt dat de eerste afbeelding eerst met en dan zonder
opvulling staat.

## Alternatieven

- Opvulling per blad: 50 plekken, en een nieuw blad vergeet het weer. Eén regel op het paneel kan dat niet.
- Alleen `env()`: werkt niet waar de webview 0 meldt.
- De app weer onder de balk vandaan houden (geen edge-to-edge): werkt niet meer vanaf Android 16.

## Bron

Gesprek met de eigenaar; broncode van Capacitor 8 (`SystemBars.java`).

## Vervangt

Niets.

## Terugdraaien

De regel `padding-bottom: var(--rand-onder)` uit `.animate-sheet-in` halen en de variabele op 0 zetten.
