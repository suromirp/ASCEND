# Het rijke openingsscherm terug, met het nieuwe logo

Datum: 2026-10-25
Status: aangenomen

## Besluit

Het openingsscherm krijgt zijn oude opbouw terug, getekend met het logo "Ring en pad" en de tokens `--color-logo-*`. Volgorde: een zachte gloed (een vervaagde kopie erachter), de ring tekent zich, de kam, de berg vult zich zacht in, het S-pad loopt omhoog, een vonk licht op de mint stip, het woord ASCEND komt omhoog. Daarna, zolang het scherm in beeld is: de gloed pulseert, de ring ademt en een lichtpuntje reist langs het pad omhoog. De regel eronder is dezelfde als vroeger ("De klim wordt voorbereid...", uit `BootScreen`).

## Beweging

Normaal: de opbouw duurt 2,2 seconden, ease-out, niets stuitert. De omgevingsbeweging begint na 2 seconden. Rustig: alleen het tekenen, in 0,8 seconden, zonder gloed, adem of lichtpuntje en zonder lus. Uit en beperkte beweging van het systeem: alles staat meteen op de eindstand (en bij beperkte beweging is er geen openingsscherm).

De lus is een CSS-animatie op de elementen van het openingsscherm zelf (`.alogo-ambient`). Het scherm verdwijnt na het laden, en dan verdwijnen de elementen en dus de lus. Er blijft niets draaien. Het kleine teken (`AppMark`) en andere plekken waar het logo staat krijgen de lus niet, omdat ze `ambient` niet aanzetten.

De minimale duur van het openingsscherm hangt nu af van de stand van Beweging (`engine/motionSettings.ts#splashMinimumMs`): 2,6 seconden in Normaal (de opbouw plus een korte stilte waarin het lichtpuntje al omhoog begint), 1,2 in Rustig en 0,6 in Uit. Het is alleen een ondergrens: het laden wacht nooit op de animatie, en een trage start toont gewoon de omgevingsbeweging langer.

## Reden

De eigenaar miste zijn oude openingsscherm, dat hij heel mooi vond maar dat niet meer in de kleuren paste. Met het nieuwe logo was het een korte, stille opbouw geworden. Dit geeft de rijkdom terug in de nieuwe kleurstijl.

## Alternatieven

De stille opbouw laten staan (het besluit van `2026-10-25-logo-ring-en-pad.md`). Niet gekozen: de eigenaar wilde de oude sfeer terug.

## Bron

Gesprek met de eigenaar, 25 oktober 2026. Het oude scherm staat in commit `f1bc264` (`AscendSplashLogo`, `.ascend-splash-*`).

## Vervangt

Het deel van `2026-10-25-logo-ring-en-pad.md` onder "Beweging" over een stille opbouw zonder lus en over de minimale duur van 2 seconden. De rest van dat besluit blijft zoals het was.

## Terugdraaien

Haal `ambient` weg uit `AscendSplashLogo`, zet de oude waarden van `.alogo-*` in `src/index.css` terug en laat `splashMinimumMs` overal 2000 teruggeven.
