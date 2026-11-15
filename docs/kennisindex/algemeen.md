# Kennisindex: algemeen

Gemaakt met `npm run kennisindex`. Het overzicht staat in [README.md](README.md).

## Begin hier

- Geen werkbriefje. Wat bij geen enkel werkbriefje hoort of over de hele app gaat.
- [architectuur/onderwerpen.md](../architectuur/onderwerpen.md): De oorspronkelijke lijst van onderwerpen met hun harde regels, woordelijk verhuisd uit CLAUDE.md.

## Besluiten die gelden

Nieuwste eerst. Bij een besluit staat welk later besluit het deels vervangt of aanvult.

- 2026-11-14 [Een fout bij het opstarten is geen hangen, en de grens van intervals.icu geldt tot het antwoord gelezen is](../beslissingen/2026-11-14-opstarten-en-intervals-grens.md): De tijdgrens van 15 seconden op een aanroep naar intervals.icu loopt nu door tot en met het lezen van het antwoord, bij lezen en bij schrijven.
- 2026-11-02 [Widget beter: pictogram, morgen en nooit afgeknipt](../beslissingen/2026-11-02-widget-beter.md): De widget Vandaag krijgt links een rond sportpictogram, rechts de tekst, en een regel over morgen.
- 2026-11-02 [Snelkoppelingen en widget in de Android-app](../beslissingen/2026-11-02-snelkoppelingen-en-widget.md): De Android-app krijgt vier snelkoppelingen onder het icoon (Vandaag, Week, Logboek, Training afvinken, gelijk aan de PWA) en een kleine widget Vandaag.
- 2026-11-01 [Een Android-app met Capacitor, naast de website](../beslissingen/2026-11-01-android-app.md): ASCEND krijgt een Android-app: dezelfde Vite-build als de website, ingepakt met Capacitor 8 en gebundeld in de app, zodat hij altijd offline werkt.
- 2026-10-26 [Kracht en berg voor iedereen, de GR5 niet meer als kern](../beslissingen/2026-10-26-kracht-en-berg-voor-iedereen.md): ASCEND draait niet meer om één tocht: het is klimmen naar wat jij wilt bereiken, welk doel dat ook is.
- 2026-10-22 [De app werkt zichzelf bij op een rustig moment](../beslissingen/2026-10-22-vanzelf-bijwerken.md): De app installeert een nieuwe versie zelf: bij een koude start, of als hij langer dan 30 minuten op de achtergrond was.
- 2026-10-22 [Toch openen neemt het openingsslot over](../beslissingen/2026-10-22-toch-openen.md): Houdt een ander ASCEND-venster het openingsslot langer dan tien seconden vast, dan staat er naast Opnieuw proberen ook Toch openen.
- 2026-10-22 [Opslag vrij bij wegleggen](../beslissingen/2026-10-22-opslag-vrij-bij-wegleggen.md): Een ASCEND die uit beeld gaat (visibilitychange naar hidden) of bevroren wordt, begint geen nieuwe transacties in IndexedDB; wie de opslag nodig heeft, wacht tot de app weer in beeld is.
- 2026-10-22 [Openen wacht niet op de planning](../beslissingen/2026-10-22-openen-wacht-niet-op-de-planning.md): De app opent na de migraties en het lezen van de gegevens, en rekent de planning daarna op de achtergrond door. Aangevuld door: 2026-10-22-opslag-vrij-bij-wegleggen, 2026-10-22-toch-openen.

## Onderzoek, ontwerpen en verslagen

- [audit/1 Bugjacht.md](../audit/1%20Bugjacht.md): QA-rapport van 3 oktober 2026 met de bugs die toen in Chromium op 390 en 360 px zijn gevonden.
- [onderzoek/Android-app.md](../onderzoek/Android-app.md): Of een Android-schil zin heeft: routes, updates zonder steeds een APK, Health Connect, kosten en gevaren.
- [visie/Kansen 11 november app.md](../visie/Kansen%2011%20november%20app.md): Wat de app op 11 november 2026 nog mist, bekeken vanuit ontwerp, naast wat al in de backlog stond.
- [visie/Kracht en berg in één plan.md](../visie/Kracht%20en%20berg%20in%20%C3%A9%C3%A9n%20plan.md): Wat ASCEND is als de GR5 niet meer de kern is en waarmee het zich onderscheidt; besloten in `docs/beslissingen/2026-10-26-kracht-en-berg-voor-iedereen.md`.

## Vervangen of verouderd

Niets.
