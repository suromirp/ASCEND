# Info-blad, richting A: de vijf antwoorden en het restant

Datum: 2026-11-14
Status: aangenomen

## Besluit

De eigenaar gaf op 14 november akkoord op alle vijf adviezen onder "Vragen voor de eigenaar" in `docs/visie/Ontwerp Info-blad.md`. Richting A is daarmee af: drie plekken, drie vragen. Het trainingsscherm (en de Briefing) zegt wat je doet, het blad Je horloge zegt wat er op je horloge komt, en het blad achter de i zegt waarom.

De vijf antwoorden:

1. Je horloge staat ook in het menu achter de drie puntjes op Vandaag; de missiekaart zelf blijft gelijk. Dat stond al sinds spoor 2 (`2026-11-11-info-blad-horloge-spoor-2.md`) en verandert niet.
2. Het blad toont eerst de datavelden van het advies, met de regel "Je hebt ook een eigen versie." als die bestaat. De knop "Deze staat op mijn horloge" komt later op de pagina Datavelden; die is nu niet gebouwd. De plek is open: de groep Datavelden in `engine/watchSheet.ts` kiest de versie op één plek.
3. Datavelden bekijken staat in de Instellingen bij Gidsen, tussen Trainingsplekken en Bronnen, in plaats van onder Koppelingen, Geavanceerd. Datavelden voor je horloge (de schakelaar) en Model blijven onder Koppelingen, Geavanceerd.
4. Het blad Je horloge toont beide wegen: vanzelf via intervals.icu en zelf in Garmin Connect. Wat je gebruikt staat bovenaan (gekoppeld: eerst de stand; niet gekoppeld: eerst zelf nabouwen). Dat stond al sinds spoor 1.
5. Weer en kleding staan ook op het trainingsscherm, altijd, ook als Vandaag ze al noemt.

## Wat er nu gebouwd is

- Het blad achter de i (`TrainingGuideSheet`) is korter: kop, Waarom, Wat het vraagt van je lichaam, en één lijst zonder groepskoppen met hoogstens vier rijen (Te zwaar? Zo pas je het aan; Waar train je het best?; Deze fase, week voor week; Achtergrond en bronnen). Weg: weer, heuvels, route en kleding, Je tempo, Zo voelt elk tempo, de rij en het onderblad De stappen, en de rij Waar kun je dit doen?. Sluiten onderaan blijft.
- Het algemene trainingsscherm (`ExerciseLogger`, voor fietsen, de trap, herstel en de leesstand) krijgt in de eerste kaart de weerregel, de heuvelregel en het kledingadvies in de korte vorm, de zin Je tempo onder de stappen als de kerngetallen het tempo nog niet noemen, en de rij "Waar kun je dit doen?" met Pagina in de lijst met opwarmen en rekken. Die rij sluit eerst het scherm (het concept blijft) en opent dan Trainingsplekken.
- De Briefing (lopen en wandelen) had weer en kleding al in de rij Weer. Hij krijgt de rij Plekken, "Waar kun je dit doen?", alleen buiten; een pagina, dus geen uitgroeien en eerst alle lagen dicht.
- De voorwaarde voor de plekken staat nu in `engine/trainingSpots.ts#showSpotsFor` (dezelfde als in het oude blad: een eigen filter, D+ of wandelen), met `spotsPageFor` voor de pagina.
- `engine/guideMenu.ts` geeft een platte lijst terug in plaats van drie groepen.

## Eigen keuzes

- De naam is "Waarom deze training", niet "Uitleg bij deze training". Het ontwerp van het Info-blad zegt Uitleg, maar het latere besluit over de Briefing (`2026-11-11-briefing.md`, `docs/visie/Ontwerp Route en trainingsscherm.md`, hoofdstuk 5) koos "Waarom deze training" en zegt dat zijn spoor 7 het Info-blad spoor 3 en 4 vervangt. Week, Vandaag en de Briefing heetten al zo; nu ook de i op het trainingsscherm en de rij in het menu van Forge. Een scan bewaakt dat "Uitleg bij deze training" en "Meer over deze training" nergens meer staan.
- De knop onderaan het algemene trainingsscherm heet nog "Uitleg" als er geen blad Je horloge is, en de onderbladen houden de eyebrow "Uitleg". De Briefing-ontwerper wil die knop weg en de eyebrow "Waarom"; dat is spoor 7 van de Briefing en hoort niet bij deze taak.
- Het oude blad was ook de plek waar je vanuit Week voor een latere dag het weer zag. Dat kan nu via de Briefing (lopen en wandelen) of Hoe je het doet (al het andere), die allebei weer en kleding tonen.
- Geen nieuwe instelling. Alles volgt de bestaande schakelaars (Weer bij de training, Kledingadvies, Heuvels in de buurt, Datavelden voor je horloge, Laten zien of het gelukt is). De samenvatting van Gidsen zegt nu "Weer, kennis, datavelden en bronnen" (hoogstens 40 tekens).

## Reden

De eigenaar vond het infomenu onoverzichtelijk en de datavelden nauwelijks te vinden (11 november). Het blad mengde drie vragen en herhaalde de helft van het trainingsscherm.

## Alternatieven

Richting B (één blad met segmenten) en C (alles op het trainingsscherm), zie het ontwerp. Weer en kleding alleen in de leesstand: de eigenaar koos altijd.

## Bron

`docs/visie/Ontwerp Info-blad.md`; de eigenaar op 14 november, akkoord op de vijf adviezen; `docs/visie/Ontwerp Route en trainingsscherm.md` voor de naam.

## Vervangt

Vult `2026-11-11-info-blad-horloge.md` en `2026-11-11-info-blad-horloge-spoor-2.md` aan. Het besluit over datavelden van 9 november blijft.

## Terugdraaien

Draai de commit terug. Datavelden bekijken staat dan weer onder Koppelingen, Geavanceerd, en het blad achter de i toont weer weer, tempo, stappen en plekken.
