# Steen en contour is de vaste stijl, met een nieuwe tabbalk en een tandwiel

Datum: 2026-10-22
Status: aangenomen

## Besluit

De visuele richting "steen en contour" wordt de vaste stijl van ASCEND. De
tabbalk wordt Vandaag, Week, Stand, Ascend, Logboek, met een eigen iconenset.
Meer is geen tab meer maar een tandwiel rechtsboven op elke tab. Marcellus is
er alleen voor woorden en Inter voor getallen, en niets is kleiner dan 12 px.

## Reden

Je stand had geen eigen plek en overlapte met Ascend. Week en Meer hadden
allebei drie streepjes als icoon, en het Logboek leek op de timer. Marcellus
op kleine maat laat een 1 eruitzien als een hoofdletter I ("0 van 4", "13"
als "l3"), en de app had op tientallen plekken tekst van 10 of 11 pixels.
Instellingen open je zelden, dus daar hoort geen tab voor.

## Alternatieven

- Vandaag, Week, Stand, Doel, Meer, met het Logboek binnen Stand. Houdt Meer
  als tab, maar het logboek is iets wat je vaak opent en wordt dan een tik
  dieper. Niet gekozen.
- Een iconenbibliotheek van buiten. Niet gekozen: de app blijft zonder
  externe afhankelijkheden, en eigen lijniconen passen bij de kaartstijl.
- Marcellus ook voor grote getallen blijven gebruiken. Alleen toegestaan vanaf
  40 px, en in de praktijk niet gebruikt.
- Het tandwiel vast aan het scherm laten hangen. Niet gekozen: het zou over de
  inhoud heen hangen. Het schuift nu met de pagina mee.

## Bron

`docs/visie/Visuele upgrade en nieuwe ideeën.md`, deel 2 (typografie en schaal,
iconen, kaarten, beweging) en deel 4 (de tabbalk), en de keuzes van de eigenaar
in het nachtrapport van 22 oktober 2026. Ontwerpen: `04_stand_tab` en
`05_tabbalk_iconen`.

De regels staan in `CLAUDE.md` onder Design, "Steen en contour". De code:
`src/components/icons.tsx` (iconenset), `BottomNav` en `SettingsGear` in
`src/App.tsx`, `Num` en `Eyebrow` in `src/components/ui.tsx`.

## Vervangt

Niets. De route `/more` en alle routes eronder blijven werken, dus oude links
naar Meer ook.

## Terugdraaien

Zet in `src/App.tsx` de lijst `TABS` terug naar Vandaag, Week, Ascend, Logboek,
Meer (met de route `/more`) en haal `SettingsGear` weg. De Stand blijft dan
bereikbaar via de kaart op Vandaag. De lettergrootte en de getallen in Inter
staan los van de tabbalk en zijn per bestand terug te zetten.
