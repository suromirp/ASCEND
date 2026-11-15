# Lookout Oud trainingsscherm (I-9, I-32)

Branch claude/oud-trainingsscherm-main op 563da9c. Chromium, 360, 390 en 412 px, 4x vertraagde processor, echte touch, nagemaakt kracht-demoprogramma. Trage opslag: een schrijftransactie op sessionLogs die 16 tot 26 s openstaat, zodat elke andere schrijver wacht (de grens is 10 s).

Groen
- Oud scherm, geplande rustdag (Herstelwandeling, klok 9 november), Opslaan snel: 1 log erbij, Verder-scherm, op 360, 390 en 412.
- Trage opslag: na 1,5 s Opslaan uit ("Opslaan..."), tweede tik doet niets. Na de grens (12 s): zin "Opslaan duurt langer dan verwacht. Je invulling blijft staan.", links Sluiten (112x52), Opslaan uit. 2 regels op 390 en 412, 3 regels op 360.
- Sluiten in de wachttijd sluit het scherm; het log landt daarna toch, precies 1 log (13 naar 14), de afronding "Herstel gedaan" verschijnt dan vanzelf over Vandaag.
- Gewacht tot het log landde zonder Sluiten: wachtzin weg, Verder-scherm, 1 log.
- Afvinken Vandaag (krachtkaart, bron MacroFactor) en Week (blad, Gedaan, Opslaan), twee keer snel tikken en een keer een tik: de melding bovenin verschijnt na de grens ("Afvinken duurt langer dan verwacht. ..."), 12 px, past op 360, 390 en 412; hij verdwijnt als het log landt; steeds precies 1 log.
- Eyebrow "Je horloge" op het onderblad Zelf nabouwen, op alle drie de breedtes.
- Audit (tikdoel, tekst, overloop) in elke toestand: geen tikdoel onder 44 px, geen tekst onder 12 px, geen horizontale overloop, console zonder fouten.
- Knoppen in zinsletters, een mint hoofdknop per scherm. Geen U+2013 of U+2014, geen hexkleur of rgba in de toegevoegde regels van src en docs.

Aandachtspunten (geen moet)
- Knoppenbalk voor het formulier (Waarom deze training en Gedaan, invullen) meet 53 px op 360 en 390, 52 px op 412; het besluit zegt 52. Een halve pixel afronding, tikdoel ruim boven 44.
- De melding bij afvinken noemt na de grens "Kijk in je logboek of hij er staat. Staat hij er niet, sluit de app dan af en open hem opnieuw." (TICK_OFF_STILL_RUNNING), ook bij een enkele tik. Het besluit 2026-11-15-oud-trainingsscherm.md noemt nog de zin "Kijk zo in je logboek ... vink hem dan nog eens af". Tekst en besluit wijken af.
- Losse training (Vandaag, Losse training, kies Trap af) opent het blad Hoe ging het? met de zin "Sluit en probeer opnieuw", maar de knop links heet Annuleren (het kruis heet Sluiten). Annuleren wist volgens clearsDraft een concept, terwijl de zin "je invulling blijft bewaard" zegt. Niet verder uitgezocht of het in de wachttijd echt wist.

Niet gecontroleerd
- Een geplande training van fietsen of de trap in het oude scherm (alleen de rustdag), en de losse training in ExerciseLogger zelf (de route via Vandaag gaf het blad Hoe ging het?).
- Rustdag afvinken in de modus Actief (tickOff via QuietDayCard) en een schrijffout (mislukt) in plaats van traag.
- Het blad Hoe ging het? dat meteen "al gedaan" toont.
- Een echte telefoon; vertraging van de processor is 4x in Chromium.
