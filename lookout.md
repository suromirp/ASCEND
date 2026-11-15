# Lookout Weer van de plek (I-37)

Tak: claude/weer-plek-main op 855eab0. Chromium op 360, 390 en 412 px, 4x vertraagde processor, echte touch.
Weerdienst en routediensten gemockt met page.route (de voorspelling hangt af van de breedtegraad, zodat een plek aan zijn graden te herkennen is). Nagemaakte stand: kracht-demoprogramma met drie nagemaakte plekken en een nagemaakte woonplaats; de klok op 14 november 20:30 voor De avond ervoor.

Uitslag: groen op 360, 390 en 412, geen moet-punten.

- Briefing van Lange duurloop, Start bij, Andere plek, Bergpad: de weerrij zegt "In Bergpad: 15 graden", er gaat een aanroep voor die plek uit. Groen.
- Weerrij tikken: pagina Weer, "Weer in Bergpad, de plek uit je Briefing", 15 graden, dezelfde graden als de Briefing. Groen.
- Nu verversen: aanroepen voor Bergpad 1 naar 2 (de plek wordt mee ververst), knop toont Verversen tijdens het wachten, daarna "Weer bijgewerkt". Groen.
- Terug vanaf Weer: de Briefing van Lange duurloop staat open, met Bergpad. Groen.
- De avond ervoor (14 november 20:30): "In Bergpad: 14 graden, droog" (het uur van de training, 09:00). Groen.
- Plek Bergpad gewist in Instellingen, Je plekken: De avond ervoor noemt hem niet meer en toont het weer van huis (8 graden). Groen.
- Instelling Gekozen plek onthouden (Weer en kleding) uit: De avond ervoor toont het weer van huis, de Briefing begint zonder gekozen plek; opnieuw kiezen werkt in de Briefing, maar De avond ervoor blijft bij huis. Groen.
- Audit op Briefing, blad Andere plek, Weer, Vandaag met de kaart en Je plekken: geen tikdoel onder 44 px, geen tekst onder 12 px, geen horizontale overloop, geen consolefouten (de fouten van de geblokkeerde kaarttegels en routeplanner zijn de mocks). Groen.
- Afdrukken kijken: een mint hoofdknop per scherm, knoppen in zinsletters, geen leeg scherm.

Let op, geen moet: in de Briefing van vandaag na 09:00 toont de weerrij het weer van het uur nu en De avond ervoor het uur van de training (15 tegenover 14 graden in de mock). Dat volgt uit het ontwerp, maar valt op als je ze naast elkaar legt.

Niet gecontroleerd: echte weerdienst en echte routes, een echt toestel, de avondmelding zelf (alleen in de Android-app; alleen de kaart op Vandaag bekeken), de standaardtekst van de melding.

Afdrukken: lookout-weer-afdrukken/ (a = Briefing, b = Weer, c = terug, d = De avond ervoor, e = plek gewist, f = instelling).
