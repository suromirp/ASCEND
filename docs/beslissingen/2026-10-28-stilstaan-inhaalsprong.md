# Stilstaan: de inhaalsprong en twee eerlijke kanttekeningen

Datum: 2026-10-28
Status: aangenomen

## Besluit

Dit vult `2026-10-27-stilstaan-bij-de-testloop-aanvulling.md` aan. Dat besluit blijft zoals het is.

1. **De inhaalsprong wordt gemeten tegen het tempo vlak voor de stop.** Punt 3 van de aanvulling vergeleek met de mediaansnelheid van de hele log. Bij een snelle loper met veel inlopen en uitlopen (5 km op 5 m/s na 1200 seconden inlopen op 2,6 m/s) lag die drempel te laag, zodat gewoon doorlopen na een stop als gat werd gelezen en het venster het inlopen meenam (1369 seconden in plaats van ongeveer 1000). Nu is de vergelijking 1,5 keer de hoogste van twee medianen: die van de 60 seconden voor de stop en die van de hele log. Het stukje voor de stop kan zelf gedrift zijn en mag de drempel dus niet verlagen. Daarnaast is meer dan 6,5 m/s in die 10 seconden altijd een gat, want zo snel loopt niemand.
2. **`effortFreshAllowed` betekent in de praktijk "heeft stops".** De functie laat een verse test niet meteen meetellen als de snelste 5 km stops heeft en per kilometer sneller is dan de hele run. Een lezing zonder stops is nooit sneller dan de hele run wanneer de rest gelijk is, dus het onderscheid dat de naam suggereert bestaat feitelijk alleen door de stops. Het gedrag blijft zoals het was.
3. **TARGET-TIME zwijgt zolang een kandidaat wacht.** Staat er een snelste 5 km of een nieuwe lezing te wachten op Akkoord, dan doet de regel geen voorstel over de doeltijd. Eerst het tempo, dan pas de doeltijd daarop.

## Reden

De review van 27 oktober vond de drempel te grof voor een snelle loper. De andere twee punten legden vast wat de code eigenlijk doet, zodat de naam of de aanvulling niet iets anders belooft.

## Alternatieven

- Alleen een vaste grens. Die vangt een trage loper niet, voor wie 4 m/s al een sprong is.
- Alleen het tempo voor de stop. Een horloge dat bij een stop in het inlopen een enorme sprong maakt wordt dan alleen gevangen als de sprong boven 1,5 keer dat tempo komt; de vaste grens vangt de uitschieters.

## Bron

Review van Warden op de testloop, met een nagemaakte reeks als test in `src/engine/bestEffort.test.ts`.

## Vervangt

Niets. Punt 3 van de aanvulling wordt verfijnd: de referentie is het tempo vlak voor de stop in plaats van de hele log.

## Terugdraaien

Zet in `fastestWindow` de referentie terug op alleen de mediaan van de hele log en haal de vaste grens weg.
