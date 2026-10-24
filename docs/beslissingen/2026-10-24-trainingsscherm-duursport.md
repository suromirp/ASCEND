# Trainingsscherm voor duursport in zee en berg

Datum: 2026-10-24
Status: aangenomen

## Besluit

Het scherm dat opent bij een duurtraining (lopen, wandelen, bergtocht) begint
met de lucht en de titel, dan de grote getallen (de duur en de herhalingen),
het verloop als één balk in de zonekleuren, de stappen kort met hun zone, de
plek als keuzelijst en opwarmen en rekken als rijen die openklappen. De knop
onderaan heet "Gedaan, invullen" en springt naar het formulier, daarna heet hij
"Opslaan". Het formulier en het opslaan zelf zijn niet veranderd.

## Reden

De eigenaar vond het scherm "echt verouderd" en vond "Gedaan" naast "Training
uitvoeren" raar. Wat je onderweg moet weten (hoe lang, hoe hard, wanneer) moet
in één oogopslag te zien zijn; de lange uitleg kan erachter.

## Alternatieven

- Alleen de kleuren omzetten naar de nieuwe stijl. Afgewezen: het probleem was
  de volgorde en de hoeveelheid tekst, niet alleen de kleur.
- Een apart scherm om mee te trainen met een klok. Bewaard voor later; het
  horloge doet dat nu al.

## Bron

Gesprek met de eigenaar, en de vaste stijl in
`docs/beslissingen/2026-10-24-thema-zee-en-berg.md`.

## Vervangt

Niets.

## Terugdraaien

`GeneralLogger` in `src/components/ExerciseLogger.tsx` terugzetten naar de
vorige versie en `src/components/duur/` weghalen. De opslag is gelijk
gebleven, dus er hoeft niets met gegevens te gebeuren.
