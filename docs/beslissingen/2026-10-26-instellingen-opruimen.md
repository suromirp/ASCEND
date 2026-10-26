# Instellingen opruimen, ronde 1

Datum: 2026-10-26
Status: aangenomen

## Besluit

Een rij in Instellingen is een beslissing die een gewoon mens neemt. Keuzes die bij elkaar horen
staan achter één rij met een blad, wat bij een andere instelling hoort bestaat niet zolang die
uit staat, en het overzicht laat zien wat je zelf anders koos dan het advies. Alles blijft
instelbaar en zoekbaar; er verandert niets in de opslag.

## Reden

De groepen hadden 133 rijen, 38 alleen al bij Forge, en elke keuze stond even groot op de pagina
als de keuzes die je elke maand maakt. Uitgegrijsde rijen met "Werkt alleen als ... aan staat"
vroegen om uitleg in plaats van weg te zijn. En je zag nergens wat je zelf had aangeraakt.

## Wat er is gebouwd

- Afhankelijkheden staan op één plek, `SHOW_WHEN` in `src/data/settingsLayout.ts`: een lijst
  voorwaarden per rij, met de reden ("Zichtbaar zodra Garmin is gekoppeld") en de instelling die
  het oplost. De samenvatting (`hidden`), het zoekveld en de pagina's lezen daar. Zoeken toont bij
  een verborgen instelling de reden en een tik gaat naar de bovenliggende rij.
- Verbergen in plaats van uitgrijzen: de Garmin-kinderen verdwijnen als Trainingen uit staat, de
  opties voor het sturen naar het horloge als dat sturen uit staat, Programma en Na je hoofddoel
  zonder doel, Tochten zonder doel of tocht.
- Sets in MacroFactor: het workoutscherm is dan alleen om mee te kijken (`readOnly` in
  `ForgeWorkout.tsx`). Rusttimer, bijsturen, RIR vooraf, doorvoeren en schijven bij de set doen
  dan niets en verdwijnen. Scherm aan tijdens je training doet wel iets (het scherm blijft aan
  tijdens het kijken) en blijft staan.
- "Anders dan het advies" bovenaan het overzicht (`engine/settingsDiff.ts`, pure functies met
  tests): naam, waarde nu en van het advies, "Terug naar advies" per regel, en per groep onderaan
  "Alles in deze groep terug naar het advies" met een blad dat eerst laat zien wat er verandert.
  Wat de planning raakt (ambitie, lange zondag, rust na een bergtocht, na je hoofddoel, benen en
  een zware loop, op je rustdag) gaat samen in één voorstel met Akkoord, nooit stil.
- Rijen met een blad (alleen de plek verandert, geen opslagveld): Dagen en tijd, Tochten, Mijn
  sportschool, Weergave op Forge, Rusttimer, Rekenmodel, Bij het invullen, Toets tegen
  MacroFactor, Wat speelde er, Weer en kleding, Inzicht na een training, Wat ik van mijn horloge
  gebruik, Trainingen naar je horloge. Lucht bovenaan heeft Donker vanaf in het blad, Twee
  trainingen per dag heeft Benen en een zware loop in het blad. Alle oude id's blijven vindbaar
  (`sheet: true` in `MOVED`) en de ankers `instelling-<id>` blijven werken.
- Weg als rij: Forge openen (staat op Je stand), Reisplanner en Paklijst (staan op Ascend),
  Health Connect "Komt later", de dubbele Markering op Week (de schakelaar "Laten zien of het
  gelukt is" zet allebei de velden), Versie (voettekst van Gegevens en back-up). Reisplanner,
  Paklijst en Health Connect blijven in het zoekveld als verwijzing.
- Een test bewaakt het plafond: per groep hoogstens 12 rijen, hoogstens 6 onder Geavanceerd, en
  Geavanceerd alleen bij minstens 2 rijen. Onder Geavanceerd staat één regel met de titels.

## Alternatieven

Niets verbergen en alleen beter sorteren: lost de lengte niet op. Instellingen echt schrappen: in
strijd met `2026-10-22-alles-instelbaar.md`, daarom alleen verplaatsen.

## Bron

`docs/onderzoek/ASCEND voor iedereen.md`, deel 7, en het voorstel van Cartographer Instellingen.

## Vervangt

Niets. Het aantal groepen (acht) en de regel dat alles instelbaar is blijven zoals ze waren. De
nieuwe indeling in zeven groepen, de groep Sporten en schema en de profielen volgen in een latere
ronde.

## Terugdraaien

Alleen de indeling (`PAGE_ROWS`, `MOVED`, `SHOW_WHEN`) en de groepsbestanden veranderden. Geen
opgeslagen veld is aangeraakt, dus terugzetten van de commit is genoeg.
