# Hitte bij je tempo: trager, kleiner bij alleen vocht, geen band bij herhalingen

Datum: 2026-11-15
Status: aangenomen

## Besluit

De regel onder het weer zegt "trager", nooit "lager". Is het alleen vochtig (dauwpunt 16 of hoger) en voelt het onder de 22 graden, dan is de band 5 tot 10 seconden per km in plaats van 10 tot 20. Bij intervallen en heuvelherhalingen (intensiteit high) staat er geen tempoband en geen raad om op hartslag te lopen, maar: "Herhalingen voelen zwaarder: neem wat meer rust ertussen en drink vooraf."

## Reden

De eigenaar zag op Heuvelintervallen bij 19 graden en dauwpunt 17: "Loop op hartslag: je tempo ligt dan zo'n 10 tot 20 seconden per km lager" en vroeg "Dit klopt niet toch?". Drie fouten: "lager" leest als sneller; in korte herhalingen loopt de hartslag achter, dus op hartslag lopen werkt daar niet; en 10 tot 20 seconden is veel voor een koele vochtige dag (het onderzoek noemt de band bij een gevoel van 27 graden en een rustige loop of tempoloop).

## Alternatieven

Bij herhalingen niets zeggen: dan mist de waarschuwing dat het zwaarder voelt. De drempel voor alleen vocht hoger leggen: kan later, als de eigen hartslag bij tempo in warme en koele loopjes een betere maat geeft (kans D, `docs/onderzoek/Kansen met gegevens.md`).

## Bron

`docs/onderzoek/Kansen met gegevens.md` (kans D, Ely e.a. 2007, bewijs matig); melding van de eigenaar, 15 november. `src/engine/heatPace.ts`.

## Vervangt

Niets; vult `2026-10-31-kansen-stap-0.md` aan.

## Terugdraaien

In `heatPace.ts` de tak `reps` en de band `onlyHumid` weghalen; `WeatherLine.tsx` roept dan weer `heatPace(w)` aan.
